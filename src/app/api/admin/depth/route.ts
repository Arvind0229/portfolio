import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/guard';
import { ConflictError, describeWriteFailure, getContentWriter } from '@/lib/admin/content-writer';
import { clientKeyFromHeaders, createRateLimiter } from '@/lib/security/rate-limit';
import { parseDepth } from '@/data/project-depth';
import { projects } from '@/data/projects';
import type { ProjectDepth } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read and write the project depth layer.
 *
 * ## Why the whole file is written, not a patch
 *
 * The payload is every project's depth at once, and a save replaces the file.
 * A per-field PATCH would be smaller on the wire and worse in every way that
 * matters here: on the GitHub path each write is a commit, so a form with
 * fifteen fields would become fifteen commits and fifteen deployments; and a
 * partial write that fails halfway leaves the file in a state no one authored.
 * Replacing the file makes a save atomic — it either landed or it did not.
 *
 * The file is small enough that this is free. Five projects of prose is a few
 * kilobytes.
 */

/** Generous for prose, small enough that no single field can bloat the bundle. */
const MAX_BODY_BYTES = 256 * 1024;

interface DepthResponse {
  ok: boolean;
  error?: string;
  mode?: 'local' | 'github';
  projects?: Record<string, ProjectDepth>;
  /** True when the save needs a deployment before it is visible. */
  pendingDeploy?: boolean;
  /**
   * Opaque. The client sends it back on save so the write can be refused if
   * anything landed in between. Never interpreted on either side.
   */
  version?: string;
  /** Distinguishes a lost-update refusal from a transport failure. */
  code?: 'conflict';
  retryAfterSeconds?: number;
}

/*
 * The route had none. In production a session gates it, but a valid session
 * could still drive the GitHub API hard, and with ADMIN_LOCAL_BYPASS set there
 * is no session at all. Looser than the upload limiter because saving a form
 * repeatedly while editing is normal behaviour, not abuse.
 */
const DEPTH_RATE_LIMIT = {
  limit: 60,
  windowMs: 3_600_000,
  burstLimit: 10,
  burstWindowMs: 60_000,
  maxKeys: 1_000,
} as const;

const depthLimiter = createRateLimiter(DEPTH_RATE_LIMIT);

function rateLimited(request: Request): NextResponse<DepthResponse> | null {
  const limit = depthLimiter.check(clientKeyFromHeaders(request.headers));
  if (limit.allowed) return null;
  return NextResponse.json(
    {
      ok: false,
      error: 'Too many saves in a short time. Wait a moment and try again.',
      retryAfterSeconds: limit.retryAfterSeconds,
    },
    { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
  );
}

function json(body: DepthResponse, status: number) {
  return NextResponse.json(body, { status });
}

function denied(reason: 'unauthenticated' | 'misconfigured' | 'cross_origin') {
  if (reason === 'misconfigured') {
    return json({ ok: false, error: 'Admin sign-in is not configured on this deployment.' }, 503);
  }
  if (reason === 'cross_origin') {
    // Deliberately terse. A cross-origin caller is not a person who mistyped
    // something, and an explanation of the check is a hint about how to pass it.
    return json({ ok: false, error: 'Request rejected.' }, 403);
  }
  return json({ ok: false, error: 'Sign in first.' }, 401);
}

export async function GET(request: Request): Promise<NextResponse<DepthResponse>> {
  const access = checkAdminAccess(request);
  if (!access.allowed) return denied(access.reason);

  const limited = rateLimited(request);
  if (limited) return limited;

  // Read through the writer rather than from the imported module: the module
  // holds whatever was bundled at build time, and on the live site an edit
  // saved five minutes ago is in the repository but not yet in this bundle.
  // Serving the stale copy into the form is how a save silently reverts the
  // previous one.
  const { writer, reason } = getContentWriter();
  if (!writer) return json({ ok: false, error: reason }, 503);

  try {
    const raw = await writer.read('projectDepth');
    const parsed: unknown = raw ? JSON.parse(raw.content.toString('utf8')) : { projects: {} };
    const source = (parsed as { projects?: unknown }).projects;

    const result: Record<string, ProjectDepth> = {};
    if (typeof source === 'object' && source !== null) {
      for (const [id, value] of Object.entries(source as Record<string, unknown>)) {
        const depth = parseDepth(value);
        if (depth) result[id] = depth;
      }
    }

    /*
     * The version travels with the data. The client holds it and sends it back
     * on save, which is what turns two tabs silently clobbering each other into
     * a refusal the second one can see.
     */
    return json(
      { ok: true, mode: writer.mode, projects: result, ...(raw ? { version: raw.version } : {}) },
      200,
    );
  } catch {
    return json({ ok: false, error: 'Could not read the saved details.' }, 502);
  }
}

export async function PUT(request: Request): Promise<NextResponse<DepthResponse>> {
  const access = checkAdminAccess(request);
  if (!access.allowed) return denied(access.reason);

  const limited = rateLimited(request);
  if (limited) return limited;

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

  const incoming = (body as { projects?: unknown } | null)?.projects;
  if (typeof incoming !== 'object' || incoming === null) {
    return json({ ok: false, error: 'Expected a "projects" object.' }, 400);
  }

  /*
   * Validate and normalise before writing, using the same parser the site uses
   * on load. Two things follow from that. Unknown keys are dropped rather than
   * stored, so the file can never accumulate fields nothing reads. And a
   * project id that does not exist is rejected outright — a typo would
   * otherwise write a block of detail that no project would ever pick up, and
   * the only symptom would be an answer that never appears.
   */
  const known = new Set(projects.map((project) => project.id));
  const cleaned: Record<string, ProjectDepth> = {};

  for (const [id, value] of Object.entries(incoming as Record<string, unknown>)) {
    if (!known.has(id)) {
      return json({ ok: false, error: `Unknown project id: ${id}` }, 400);
    }
    const depth = parseDepth(value);
    // Absent rather than empty: a project the form cleared should lose its
    // entry, not gain an empty one.
    if (depth) cleaned[id] = depth;
  }

  const { writer, reason } = getContentWriter();
  if (!writer) return json({ ok: false, error: reason }, 503);

  const file = `${JSON.stringify(
    {
      $comment:
        'Written by the admin panel, not by hand. See src/data/project-depth.ts for the shape.',
      projects: cleaned,
    },
    null,
    2,
  )}\n`;

  /*
   * The version the client read. Absent means an unconditional overwrite, which
   * is kept only so an older client is not broken by this change — the panel
   * sends it, and a save without one is the behaviour that lost edits.
   */
  const expectedVersion =
    typeof (body as { version?: unknown }).version === 'string'
      ? ((body as { version: string }).version)
      : undefined;

  let newVersion: string;
  try {
    newVersion = await writer.write(
      'projectDepth',
      Buffer.from(file, 'utf8'),
      'Update project details',
      expectedVersion,
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      /*
       * Somebody else saved between this form being opened and this click. The
       * reply says so and refuses; it does not merge, because a merge of two
       * people's prose is a guess about which sentence was meant.
       */
      return json(
        {
          ok: false,
          code: 'conflict',
          error:
            'These details were changed somewhere else after this form was opened. Reload to see the current version — saving now would overwrite that change.',
        },
        409,
      );
    }
    return json(
      {
        ok: false,
        error:
          describeWriteFailure(error, writer.mode),
      },
      502,
    );
  }

  return json(
    {
      ok: true,
      mode: writer.mode,
      projects: cleaned,
      // Honest about the delay rather than implying the live site changed the
      // instant the request returned. It has not — a deployment has to run.
      pendingDeploy: writer.mode === 'github',
      // So the open form can save again without quoting a version the first
      // save already superseded.
      ...(newVersion ? { version: newVersion } : {}),
    },
    200,
  );
}
