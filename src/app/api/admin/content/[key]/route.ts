import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/guard';
import { ConflictError, getContentWriter } from '@/lib/admin/content-writer';
import { contentDefinition } from '@/lib/content/registry';
import { clientKeyFromHeaders, createRateLimiter } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read and write one admin-editable content file.
 *
 * One route for every content key, driven by `src/lib/content/registry.ts`.
 * Three near-identical routes would be three copies of the auth, the rate
 * limit, the size cap and the conflict handling — and the copy that quietly
 * loses one of those is how a content system grows a hole.
 *
 * ## The whole file is replaced, not patched
 *
 * Same reasoning as the depth route: on the GitHub path every write is a
 * commit, so a field-level PATCH would turn one form into a dozen commits and a
 * dozen deployments. Replacing the file also makes a save atomic — it landed or
 * it did not.
 *
 * ## Writes are conditional
 *
 * `GET` returns a `version`; `PUT` sends it back and the write applies only if
 * nothing landed in between. Skip that and the write is an unconditional
 * overwrite — which is what the system silently did before CHANGE-002.
 */

/** Generous for prose, small enough that no field can bloat the bundle. */
const MAX_BODY_BYTES = 256 * 1024;

const CONTENT_RATE_LIMIT = {
  limit: 60,
  windowMs: 3_600_000,
  burstLimit: 10,
  burstWindowMs: 60_000,
  maxKeys: 1_000,
} as const;

const limiter = createRateLimiter(CONTENT_RATE_LIMIT);

interface ContentResponse {
  ok: boolean;
  error?: string;
  mode?: 'local' | 'github';
  data?: unknown;
  version?: string;
  /** True when this deployment can show content but not save it. */
  readOnly?: boolean;
  pendingDeploy?: boolean;
  code?: 'conflict';
  retryAfterSeconds?: number;
}

function json(body: ContentResponse, status: number) {
  return NextResponse.json(body, { status });
}

function denied(reason: 'unauthenticated' | 'misconfigured' | 'cross_origin') {
  if (reason === 'misconfigured') {
    return json({ ok: false, error: 'Admin sign-in is not configured on this deployment.' }, 503);
  }
  // Terse on purpose: a cross-origin caller is not someone who mistyped, and an
  // explanation of the check is a hint about how to pass it.
  if (reason === 'cross_origin') return json({ ok: false, error: 'Request rejected.' }, 403);
  return json({ ok: false, error: 'Sign in first.' }, 401);
}

function guard(request: Request) {
  const access = checkAdminAccess(request);
  if (!access.allowed) return denied(access.reason);

  const limit = limiter.check(clientKeyFromHeaders(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Too many saves in a short time. Wait a moment and try again.',
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }
  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<NextResponse<ContentResponse>> {
  const blocked = guard(request);
  if (blocked) return blocked;

  const { key } = await context.params;
  const definition = contentDefinition(key);
  // The key is looked up in a closed table and never used to build a path, so
  // an unknown one simply does not resolve.
  if (!definition) return json({ ok: false, error: 'Unknown content.' }, 404);

  /*
   * Reading does not require a writer, and tying the two together was a defect.
   *
   * Found in UAT: on a deployment with no `ADMIN_GITHUB_TOKEN`, a signed-in
   * admin got 503 on every read, so the panel showed nothing at all — not the
   * content, not an explanation. Being unable to *save* is a real limitation
   * worth stating plainly; it is not a reason to refuse to *show* someone their
   * own profile.
   *
   * So a missing writer falls back to the content bundled with this build, and
   * the response says `readOnly` so the panel can explain why Save is
   * unavailable rather than letting a person type into a form that cannot
   * accept it.
   */
  const { writer, reason } = getContentWriter();

  if (!writer) {
    return json(
      {
        ok: true,
        data: definition.parse(definition.bundled()),
        readOnly: true,
        error: reason,
      },
      200,
    );
  }

  try {
    /*
     * Read through the writer, not from the bundled module: the module holds
     * what was bundled at build time, and on the live site an edit saved five
     * minutes ago is in the repository but not yet in this bundle. Serving the
     * stale copy into the form is how one save silently reverts the previous.
     */
    const raw = await writer.read(definition.target);
    const parsed = definition.parse(raw ? JSON.parse(raw.content.toString('utf8')) : null);

    return json(
      {
        ok: true,
        mode: writer.mode,
        data: parsed,
        ...(raw ? { version: raw.version } : {}),
      },
      200,
    );
  } catch {
    return json({ ok: false, error: `Could not read the saved ${definition.label}.` }, 502);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<NextResponse<ContentResponse>> {
  const blocked = guard(request);
  if (blocked) return blocked;

  const { key } = await context.params;
  const definition = contentDefinition(key);
  if (!definition) return json({ ok: false, error: 'Unknown content.' }, 404);

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'That is more text than this form accepts.' }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Expected JSON.' }, 400);
  }

  const envelope = (body ?? {}) as { data?: unknown; version?: unknown };

  /*
   * Validated with the same parser the site reads it back through, so the
   * stored file can only ever contain something the site can render, and
   * unknown keys are dropped rather than accumulating in a file nobody reads.
   */
  const parsed = definition.parse(envelope.data);

  const { writer, reason } = getContentWriter();
  if (!writer) return json({ ok: false, error: reason }, 503);

  const file = `${JSON.stringify(definition.serialize(parsed), null, 2)}\n`;
  const expectedVersion = typeof envelope.version === 'string' ? envelope.version : undefined;

  let newVersion: string;
  try {
    newVersion = await writer.write(
      definition.target,
      Buffer.from(file, 'utf8'),
      definition.message,
      expectedVersion,
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return json(
        {
          ok: false,
          code: 'conflict',
          error: `This ${definition.label.toLowerCase()} was changed somewhere else after this form was opened. Reload to see the current version — saving now would overwrite that change.`,
        },
        409,
      );
    }
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
      data: parsed,
      pendingDeploy: writer.mode === 'github',
      ...(newVersion ? { version: newVersion } : {}),
    },
    200,
  );
}
