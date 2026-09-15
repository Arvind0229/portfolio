import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/guard';
import {
  ConflictError,
  type ContentWriter,
  getContentWriter,
  photoFileTarget,
  photoFileUrl,
} from '@/lib/admin/content-writer';
import {
  MAX_PHOTO_BYTES,
  checkPhoto,
  validateBlurDataUrl,
  validateFacePosition,
} from '@/lib/admin/photo-validation';
import {
  MAX_PHOTO_VERSIONS,
  type PhotoRegistry,
  type PhotoVersion,
  parsePhotoRegistry,
  photoRegistry as bundledRegistry,
} from '@/data/photo';
import { clientKeyFromHeaders, createRateLimiter } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Replace the portrait the site shows.
 *
 * Structurally the resume route's twin — same guard, same limiter, same
 * file-then-pointer ordering, same rollback by `PATCH`. That is deliberate: the
 * two endpoints solve the same problem (a public binary that must be
 * replaceable without breaking what currently works), and two endpoints that
 * solve the same problem differently is how one of them ends up missing a step.
 *
 * Three things differ, each for a reason.
 *
 * **The id is a content hash, not a timestamp.** A portrait is requested on
 * every page; a resume is requested when someone clicks a button. Naming the
 * file after its bytes lets it be cached hard and still change instantly, and
 * re-uploading the same photo twice is then a no-op rather than a second copy.
 *
 * **The dimensions come from the file, not from the form.** They become the
 * `width`/`height` of a public `<img>`, so a client that gets them wrong
 * reflows the page for every visitor. The server reads them out of the JPEG's
 * own header — see `image-dimensions.ts` for why that is a parse and not a
 * decode.
 *
 * **The blur placeholder does come from the client**, because deriving it
 * server-side would mean decoding the image, which is the one thing this design
 * avoids (ADR-003). It is bounded and pattern-checked rather than trusted; the
 * worst a bad one can do is look wrong for a few hundred milliseconds.
 */

/*
 * The same budget the resume upload uses, for the same reason: a valid session
 * could otherwise hammer the GitHub API, and in local mode there is no session
 * at all. Replacing a portrait is something a person does a handful of times a
 * year, so this is generous rather than restrictive.
 */
const uploadLimiter = createRateLimiter({
  limit: 20,
  windowMs: 3_600_000,
  burstLimit: 4,
  burstWindowMs: 60_000,
  maxKeys: 1_000,
});

interface PhotoResponse {
  ok: boolean;
  error?: string;
  mode?: ContentWriter['mode'];
  pendingDeploy?: boolean;
  bytes?: number;
  active?: string;
  versions?: readonly PhotoVersion[];
}

function json(body: PhotoResponse, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers });
}

function writeFailure(mode: ContentWriter['mode']): string {
  return mode === 'github'
    ? 'The photo could not be saved to the repository. Nothing changed — try again.'
    : 'The photo could not be written to your project files. Nothing changed — try again.';
}

/**
 * Read through the writer, not from the bundle.
 *
 * A photo uploaded five minutes ago is in the repository but not in this
 * deployment's bundle. Reading the bundle would show a stale list and, worse,
 * write it back — quietly deleting versions that exist.
 */
async function readRegistry(
  writer: ContentWriter,
): Promise<{ registry: PhotoRegistry; version: string | undefined }> {
  const stored = await writer.read('photoRegistry');
  if (!stored) return { registry: bundledRegistry, version: undefined };
  return {
    registry: parsePhotoRegistry(JSON.parse(stored.content.toString('utf8'))),
    version: stored.version,
  };
}

function deny(reason: string | undefined) {
  if (reason === 'misconfigured') {
    return json({ ok: false, error: 'Admin sign-in is not configured on this deployment.' }, 503);
  }
  if (reason === 'cross_origin') return json({ ok: false, error: 'Request rejected.' }, 403);
  return json({ ok: false, error: 'Sign in first.' }, 401);
}

/**
 * Keep the live version and the two before it.
 *
 * The active one is never dropped, whatever its position — the same rule the
 * resume registry uses, and for the same reason: pruning the version the site
 * is currently serving would blank the portrait.
 */
function prune(versions: readonly PhotoVersion[], active: string): readonly PhotoVersion[] {
  const kept = versions.slice(0, MAX_PHOTO_VERSIONS);
  if (kept.some((version) => version.id === active)) return kept;

  // Only reachable if the active version has been pushed past the limit, which
  // the caller's ordering makes impossible today. Kept anyway: the cost of
  // being wrong is a blank portrait on the public page, and the cost of the
  // check is one comparison.
  const activeVersion = versions.find((version) => version.id === active);
  return activeVersion ? [activeVersion, ...kept.slice(0, MAX_PHOTO_VERSIONS - 1)] : kept;
}

export async function POST(request: Request): Promise<NextResponse<PhotoResponse>> {
  const access = checkAdminAccess(request);
  if (!access.allowed) return deny(access.reason);

  const limit = uploadLimiter.check(clientKeyFromHeaders(request.headers));
  if (!limit.allowed) {
    return json(
      {
        ok: false,
        error: 'Too many uploads in a short time. Wait a moment and try again.',
      },
      429,
      { 'retry-after': String(limit.retryAfterSeconds) },
    );
  }

  // Refused before the body is buffered at all.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PHOTO_BYTES * 1.2) {
    return json({ ok: false, error: 'That image is over 4 MB. Choose a smaller one.' }, 413);
  }

  let file: Blob | null = null;
  let alt = '';
  let facePosition = '50% 50%';
  let blurDataURL = '';
  let label = 'Portrait';
  try {
    const form = await request.formData();
    const entry = form.get('photo');
    // Duck-typed rather than `instanceof File`, for the realm reason documented
    // at length in the resume route.
    file =
      entry !== null && typeof entry !== 'string' && typeof entry.arrayBuffer === 'function'
        ? (entry as Blob)
        : null;

    const declaredAlt = form.get('alt');
    if (typeof declaredAlt === 'string') alt = declaredAlt.trim().slice(0, 200);

    const declaredFace = validateFacePosition(form.get('facePosition'));
    if (declaredFace) facePosition = declaredFace;

    const declaredBlur = validateBlurDataUrl(form.get('blurDataURL'));
    if (declaredBlur) blurDataURL = declaredBlur;

    const declaredLabel = form.get('label');
    if (typeof declaredLabel === 'string' && declaredLabel.trim()) {
      label = declaredLabel.trim().slice(0, 80);
    }
  } catch {
    return json({ ok: false, error: 'Expected an image upload.' }, 400);
  }

  if (!file) return json({ ok: false, error: 'No image was attached.' }, 400);
  if (!alt) {
    // Not a nicety. This string is what a screen reader announces in place of
    // his face, and an empty one is a silent accessibility regression that no
    // automated check on the public page would attribute to this upload.
    return json({ ok: false, error: 'Describe the photo so screen readers can announce it.' }, 400);
  }

  const content = Buffer.from(await file.arrayBuffer());
  const check = checkPhoto(content);
  if (!check.ok) return json({ ok: false, error: check.error }, check.status);

  const { writer, reason } = getContentWriter();
  if (!writer) return json({ ok: false, error: reason }, 503);

  let registry: PhotoRegistry;
  let registryVersion: string | undefined;
  try {
    const read = await readRegistry(writer);
    registry = read.registry;
    registryVersion = read.version;
  } catch {
    return json(
      { ok: false, error: 'Could not read the saved photo list, so nothing was changed.' },
      502,
    );
  }

  const id = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const target = photoFileTarget(id);

  /*
   * File first, pointer second — the same ordering as the resume, and the same
   * reasoning. A committed file nothing points at is invisible; a pointer at a
   * file that was never committed is a broken portrait on the public page.
   *
   * Re-uploading identical bytes produces the same id, so this write is a
   * no-op and the version list does not grow. That falls out of hashing rather
   * than being special-cased.
   */
  try {
    await writer.write(target, content, `Upload portrait ${id}.jpg`);
  } catch {
    return json({ ok: false, error: writeFailure(writer.mode) }, 502);
  }

  const version: PhotoVersion = {
    id,
    label,
    uploadedAt: new Date().toISOString(),
    src: photoFileUrl(target),
    width: check.dimensions.width,
    height: check.dimensions.height,
    alt,
    blurDataURL,
    facePosition,
  };

  const versions = [version, ...registry.versions.filter((entry) => entry.id !== id)];
  const next: PhotoRegistry = { active: id, versions: prune(versions, id) };

  try {
    await writer.write(
      'photoRegistry',
      Buffer.from(`${JSON.stringify(next, null, 2)}\n`, 'utf8'),
      `Set portrait to ${id}`,
      registryVersion,
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return json(
        {
          ok: false,
          error:
            'Another photo was uploaded while this one was saving. The file was kept but not made live — reload and try again.',
        },
        409,
      );
    }
    return json(
      {
        ok: false,
        error:
          'The image was saved but the site was not switched to it. Nothing changed for visitors — try again.',
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

/**
 * Go back to a previous portrait.
 *
 * Nothing was overwritten on upload, so the older file is still there byte for
 * byte and switching to it is repointing `active`. No restore procedure to
 * write, and none to forget to test.
 */
export async function PATCH(request: Request): Promise<NextResponse<PhotoResponse>> {
  const access = checkAdminAccess(request);
  if (!access.allowed) return deny(access.reason);

  const limit = uploadLimiter.check(clientKeyFromHeaders(request.headers));
  if (!limit.allowed) {
    return json({ ok: false, error: 'Too many changes in a short time.' }, 429, {
      'retry-after': String(limit.retryAfterSeconds),
    });
  }

  let wanted = '';
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body.id === 'string') wanted = body.id;
  } catch {
    return json({ ok: false, error: 'Expected a version id.' }, 400);
  }
  if (!wanted) return json({ ok: false, error: 'Expected a version id.' }, 400);

  const { writer, reason } = getContentWriter();
  if (!writer) return json({ ok: false, error: reason }, 503);

  let registry: PhotoRegistry;
  let registryVersion: string | undefined;
  try {
    const read = await readRegistry(writer);
    registry = read.registry;
    registryVersion = read.version;
  } catch {
    return json({ ok: false, error: 'Could not read the saved photo list.' }, 502);
  }

  // Checked against the stored list rather than pattern-matched: activating a
  // well-formed id for a version that does not exist would blank the portrait.
  if (!registry.versions.some((entry) => entry.id === wanted)) {
    return json({ ok: false, error: 'That version is no longer available.' }, 404);
  }

  const next: PhotoRegistry = { active: wanted, versions: registry.versions };
  try {
    await writer.write(
      'photoRegistry',
      Buffer.from(`${JSON.stringify(next, null, 2)}\n`, 'utf8'),
      `Switch portrait to ${wanted}`,
      registryVersion,
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return json(
        { ok: false, error: 'The photo list changed while you were switching. Reload and retry.' },
        409,
      );
    }
    return json({ ok: false, error: writeFailure(writer.mode) }, 502);
  }

  return json(
    {
      ok: true,
      mode: writer.mode,
      pendingDeploy: writer.mode === 'github',
      active: next.active,
      versions: next.versions,
    },
    200,
  );
}
