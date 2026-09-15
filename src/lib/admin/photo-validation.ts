import { imageDimensions, type ImageDimensions } from '@/lib/admin/image-dimensions';

/**
 * What the server will accept as a profile photograph.
 *
 * Same shape as `resume-validation.ts`, and for the same reason: every check
 * that decides whether bytes are allowed into the repository lives in one file
 * that a test can exercise directly, rather than being spread through a route
 * handler where the next edit can quietly drop one.
 *
 * The browser resizes and re-encodes before uploading (see ADR-003), so by the
 * time bytes arrive they should already be a modest JPEG. None of that is
 * assumed here. The client is a convenience; this file is the rule.
 */

/**
 * 4 MB.
 *
 * Deliberately half the resume cap. A portrait leaving the browser's resize
 * step is 100–300 KB; anything near this ceiling did not come from that step,
 * which is exactly when a limit should still hold.
 */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * Dimension bounds.
 *
 * The floor keeps a thumbnail from being promoted to a hero portrait — it would
 * render, blurrily, and nothing would say why. The ceiling is a denial-of-
 * service bound as much as a quality one: `next/image` will be asked to
 * generate responsive variants of whatever is stored, and the cost of that is
 * proportional to the pixel count.
 */
export const MIN_PHOTO_EDGE = 200;
export const MAX_PHOTO_EDGE = 5000;

/** JPEG only. The browser converts whatever was chosen, so one format is enough. */
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

/**
 * A blur placeholder is a `data:` URI produced by the client's canvas.
 *
 * This is the one value that genuinely comes from the browser and cannot be
 * re-derived server-side without decoding the image — which is the thing we are
 * not doing. So it is bounded rather than trusted: the prefix is fixed, the
 * payload must be base64, and the whole thing must stay small.
 *
 * The blast radius if a client sends something odd that passes all three is a
 * bad placeholder behind the photo for a few hundred milliseconds. The CSP
 * already allows `data:` images, so nothing new is being opened up.
 */
const BLUR_PREFIX = 'data:image/jpeg;base64,';
const MAX_BLUR_CHARS = 8_192;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function validateBlurDataUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith(BLUR_PREFIX)) return null;
  if (value.length > MAX_BLUR_CHARS) return null;
  const payload = value.slice(BLUR_PREFIX.length);
  if (payload.length < 16 || !BASE64.test(payload)) return null;
  return value;
}

/**
 * `object-position`, typed by hand in the admin form to centre the face.
 *
 * Restricted to two percentages rather than accepting the full grammar. The
 * value is interpolated into an inline `style`, and the narrow form is both
 * everything the control needs and trivially safe.
 */
const FACE_POSITION = /^\d{1,3}% \d{1,3}%$/;

export function validateFacePosition(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return FACE_POSITION.test(text) ? text : null;
}

export type PhotoCheck =
  | { readonly ok: true; readonly dimensions: ImageDimensions }
  | { readonly ok: false; readonly status: 413 | 415 | 422; readonly error: string };

/**
 * The complete server-side gate.
 *
 * Order matters and is not alphabetical: size first, because it is the check
 * that can be made before looking at content at all; then the magic bytes,
 * because a file that is not a JPEG should be refused before we walk its
 * structure; then the header parse, which is the only step that reads anything
 * the file itself chose.
 */
export function checkPhoto(content: Buffer): PhotoCheck {
  if (content.length === 0) {
    return { ok: false, status: 422, error: 'That file is empty.' };
  }
  if (content.length > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      status: 413,
      error: 'That image is over 4 MB. Choose a smaller one and try again.',
    };
  }
  if (!content.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
    return {
      ok: false,
      status: 415,
      error: 'That is not a JPEG. Choose a photo file — the page converts it for you.',
    };
  }

  const dimensions = imageDimensions(content);
  if (!dimensions) {
    return {
      ok: false,
      status: 422,
      error: 'That image looks damaged — its size could not be read. Try exporting it again.',
    };
  }

  const shortest = Math.min(dimensions.width, dimensions.height);
  const longest = Math.max(dimensions.width, dimensions.height);
  if (shortest < MIN_PHOTO_EDGE) {
    return {
      ok: false,
      status: 422,
      error: `That image is only ${dimensions.width}×${dimensions.height}. It needs to be at least ${MIN_PHOTO_EDGE} pixels on the short side.`,
    };
  }
  if (longest > MAX_PHOTO_EDGE) {
    return {
      ok: false,
      status: 422,
      error: `That image is ${dimensions.width}×${dimensions.height}, which is larger than ${MAX_PHOTO_EDGE} pixels.`,
    };
  }

  return { ok: true, dimensions };
}
