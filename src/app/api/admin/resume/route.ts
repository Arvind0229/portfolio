import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/guard';
import { getContentWriter } from '@/lib/admin/content-writer';
import { MAX_RESUME_BYTES, checkResumePdf } from '@/lib/admin/resume-validation';

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
 * **The destination** is fixed — `public/resume.pdf`, chosen by key, never by a
 * path from the request. There is no filename to sanitise because no filename
 * is used, so path traversal is not filtered here: it is unreachable.
 */

interface UploadResponse {
  ok: boolean;
  error?: string;
  mode?: 'local' | 'github';
  bytes?: number;
  pendingDeploy?: boolean;
}

function json(body: UploadResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<NextResponse<UploadResponse>> {
  const access = checkAdminAccess(request);
  if (!access.allowed) {
    return access.reason === 'misconfigured'
      ? json({ ok: false, error: 'Admin sign-in is not configured on this deployment.' }, 503)
      : json({ ok: false, error: 'Sign in first.' }, 401);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESUME_BYTES) {
    return json({ ok: false, error: 'That PDF is over 8 MB. Compress it and try again.' }, 413);
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
  try {
    const form = await request.formData();
    const entry = form.get('resume');
    file =
      entry !== null && typeof entry !== 'string' && typeof entry.arrayBuffer === 'function'
        ? (entry as Blob)
        : null;
  } catch {
    return json({ ok: false, error: 'Expected a file upload.' }, 400);
  }

  if (!file) return json({ ok: false, error: 'No file was attached.' }, 400);

  const content = Buffer.from(await file.arrayBuffer());
  const check = checkResumePdf(content);
  if (!check.ok) return json({ ok: false, error: check.error }, check.status);

  const { writer, reason } = getContentWriter();
  if (!writer) return json({ ok: false, error: reason }, 503);

  try {
    await writer.write('resume', content, 'Update resume PDF');
  } catch {
    return json(
      {
        ok: false,
        error:
          writer.mode === 'github'
            ? 'Could not save to GitHub. Check that the token is still valid and has contents write access.'
            : 'Could not write the file. Check that the project folder is not read-only.',
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
    },
    200,
  );
}
