import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/guard';
import {
  ConflictError,
  type ContentWriter,
  getContentWriter,
  resumeFileTarget,
  resumeFileUrl,
} from '@/lib/admin/content-writer';
import {
  MAX_RESUME_BYTES,
  type ResumeFormat,
  checkResumeFile,
  isResumeFormat,
} from '@/lib/admin/resume-validation';
import { parseResumeRegistry } from '@/data/resume-registry';
import { applyUpload, mintId } from '@/lib/admin/resume-upload';
import { clientKeyFromHeaders, createRateLimiter } from '@/lib/security/rate-limit';
import type { ResumeRegistry, ResumeVersion } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Replace the downloadable resume.
 *
 * ## The file is checked, not trusted
 *
 * The uploader is the site's owner, which is a reason to be careful rather than
 * relaxed: the one account that can write here is the one worth stealing, and
 * a file that lands at a public URL under his name is served to every visitor.
 *
 * The declared `content-length` is refused first, so an oversized body is never
 * buffered at all. What then counts as an acceptable file lives in
 * `resume-validation.ts` — see the note there for why the policy is a pure
 * function rather than inline in this handler.
 *
 * ## Where it goes, and why nothing is overwritten
 *
 * Each upload lands at `/resume/<id>.<ext>` with a **server-minted** id — from
 * the clock, never from the uploaded filename, which is an attacker-controlled
 * string that would otherwise end up in a path. `resumeFileTarget` revalidates
 * it regardless.
 *
 * Stated precisely: **no request-supplied string reaches a path in any code
 * path reviewed here**, and every id is checked against `/^[a-z0-9][a-z0-9-]{0,63}$/`
 * at both minting and resolution. That is a verified property of this code
 * today, tested in `tests/unit/resume-registry.test.ts`, not a guarantee about
 * code that has not been written yet — a future caller that builds a target
 * some other way is exactly what the second check exists to catch.
 *
 * Nothing is ever overwritten, which is what makes rolling back possible: the
 * previous file is still there and `active` in the registry is the only thing
 * that decides what visitors download.
 *
 * ## The bug this replaces
 *
 * This route used to write `public/resume.pdf` while every download button on
 * the site pointed at `/resume/Arvind-Gupta-RPA-Developer.pdf`. The upload
 * succeeded, reported success, and changed nothing anyone could see. DOCX could
 * not be replaced at all. Both are fixed by there now being one registry that
 * the uploader writes and the site reads.
 */

/*
 * A valid session could otherwise hammer the GitHub API, and in local mode
 * there is no session at all. Tighter than the chat limiter because a resume
 * upload is something a person does a handful of times a year.
 */
const UPLOAD_RATE_LIMIT = {
  limit: 20,
  windowMs: 3_600_000,
  burstLimit: 4,
  burstWindowMs: 60_000,
  maxKeys: 1_000,
} as const;

const uploadLimiter = createRateLimiter(UPLOAD_RATE_LIMIT);

/** Reads through the writer so a live edit is never stale against the bundle. */
async function readRegistry(
  writer: ContentWriter,
): Promise<{ registry: ResumeRegistry; version?: string }> {
  try {
    const raw = await writer.read('resumeRegistry');
    if (!raw) return { registry: { active: null, versions: [] } };
    return {
      registry: parseResumeRegistry(JSON.parse(raw.content.toString('utf8'))),
      version: raw.version,
    };
  } catch {
    // Unreadable or unparseable. Starting from empty would silently discard his
    // history, so refuse instead — the caller turns this into a 502.
    throw new Error('registry unreadable');
  }
}

function writeFailure(mode: 'local' | 'github'): string {
  return mode === 'github'
    ? 'Could not save to GitHub. Check that the token is still valid and has contents write access.'
    : 'Could not write the file. Check that the project folder is not read-only.';
}

interface UploadResponse {
  ok: boolean;
  error?: string;
  mode?: 'local' | 'github';
  bytes?: number;
  pendingDeploy?: boolean;
  active?: string | null;
  versions?: readonly ResumeVersion[];
  retryAfterSeconds?: number;
}

function json(body: UploadResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<NextResponse<UploadResponse>> {
  const access = checkAdminAccess(request);
  if (!access.allowed) {
    if (access.reason === 'misconfigured') {
      return json({ ok: false, error: 'Admin sign-in is not configured on this deployment.' }, 503);
    }
    if (access.reason === 'cross_origin') {
      return json({ ok: false, error: 'Request rejected.' }, 403);
    }
    return json({ ok: false, error: 'Sign in first.' }, 401);
  }

  const limit = uploadLimiter.check(clientKeyFromHeaders(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Too many uploads in a short time. Wait a moment and try again.',
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESUME_BYTES) {
    return json({ ok: false, error: 'That file is over 8 MB. Compress it and try again.' }, 413);
  }

  /*
   * Duck-typed rather than `entry instanceof File`.
   *
   * `instanceof` compares against the `File` constructor visible in *this*
   * module's realm, and the object comes back from the body parser's realm.
   * When those differ — a test runner with its own DOM globals, a runtime that
   * swaps in undici's implementation — the check silently returns false and a
   * perfectly good upload is rejected as "no file attached". A test caught this
   * before Arvind could, and the honest reading is that the check was asking
   * about the object's ancestry when what it needed to know was whether it can
   * produce bytes.
   */
  let file: Blob | null = null;
  let format: ResumeFormat = 'pdf';
  let label = 'Arvind Gupta — RPA Developer';
  try {
    const form = await request.formData();
    const entry = form.get('resume');
    file =
      entry !== null && typeof entry !== 'string' && typeof entry.arrayBuffer === 'function'
        ? (entry as Blob)
        : null;

    // The format is declared by the form, not sniffed from the filename — so
    // choosing "PDF" and attaching a .docx is reported as a mismatch rather
    // than guessed at. Absent means PDF, which is what every existing caller
    // sends and what keeps the old admin panel working unchanged.
    const declared = form.get('format');
    if (typeof declared === 'string' && declared.length > 0) {
      if (!isResumeFormat(declared)) {
        return json({ ok: false, error: 'Choose either PDF or DOCX.' }, 400);
      }
      format = declared;
    }

    const declaredLabel = form.get('label');
    if (typeof declaredLabel === 'string' && declaredLabel.trim().length > 0) {
      label = declaredLabel.trim().slice(0, 80);
    }
  } catch {
    return json({ ok: false, error: 'Expected a file upload.' }, 400);
  }

  if (!file) return json({ ok: false, error: 'No file was attached.' }, 400);

  const content = Buffer.from(await file.arrayBuffer());
  const check = checkResumeFile(content, format);
  if (!check.ok) return json({ ok: false, error: check.error }, check.status);

  const { writer, reason } = getContentWriter();
  if (!writer) return json({ ok: false, error: reason }, 503);

  /*
   * The id is minted here, from the clock — never from the uploaded filename.
   *
   * Two reasons. A filename is an attacker-controlled string and this one ends
   * up in a path; and a stable name would mean each upload overwrote the last,
   * which is precisely the behaviour that made rollback impossible and let a
   * cached copy serve the wrong resume.
   */
  let registry: ResumeRegistry;
  let registryVersion: string | undefined;
  try {
    const read = await readRegistry(writer);
    registry = read.registry;
    registryVersion = read.version;
  } catch {
    return json(
      {
        ok: false,
        error: 'Could not read the saved resume list, so nothing was changed. Try again.',
      },
      502,
    );
  }

  const id = mintId(label, registry);
  const target = resumeFileTarget(id, format);

  /*
   * Order matters, and it is the whole reliability story of this endpoint.
   *
   * The two writes are separate commits — there is no transaction across the
   * GitHub API. So the file goes first and the registry second:
   *
   *   file ok, registry fails  → an orphan file nothing points at. Harmless.
   *   registry ok, file fails  → the site advertises a download that 404s.
   *
   * The second is the one that reaches a recruiter, so it is the one the
   * ordering rules out.
   */
  try {
    await writer.write(target, content, `Upload resume ${id}.${format}`);
  } catch {
    return json({ ok: false, error: writeFailure(writer.mode) }, 502);
  }

  const next = applyUpload(registry, { id, label, format, url: resumeFileUrl(target), bytes: content.length });

  try {
    /*
     * Conditional on the version read a moment ago. Two uploads racing would
     * otherwise leave one file committed and unreferenced while the other's
     * pointer won — the second upload's registry write built on a snapshot
     * that no longer existed.
     */
    await writer.write(
      'resumeRegistry',
      Buffer.from(`${JSON.stringify(next, null, 2)}\n`, 'utf8'),
      `Set active resume to ${id}`,
      registryVersion,
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return json(
        {
          ok: false,
          error:
            'Another resume was uploaded while this one was saving. The file was kept but not activated — reload and try again.',
        },
        409,
      );
    }
    /*
     * The file is committed but the pointer is not, so the site still serves
     * the previous resume — the safe direction. Say so precisely rather than
     * reporting a generic failure the person cannot act on.
     */
    return json(
      {
        ok: false,
        error:
          'The file was saved but the site was not switched to it. Nothing changed for visitors — try uploading again.',
      },
      502,
    );
  }

  return json(
    {
      ok: true,
      mode: writer.mode,
      bytes: content.length,
      pendingDeploy: writer.mode === 'github',
      active: next.active,
      versions: next.versions,
    },
    200,
  );
}
