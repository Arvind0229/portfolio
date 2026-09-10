/**
 * What counts as an acceptable resume upload.
 *
 * ## Why this is not inside the route
 *
 * It started there, and a test could not reach it. Exercising an 8 MB rejection
 * through a route handler means round-tripping 8 MB through `FormData`, and the
 * test environment's parser truncated the body — so the size assertion passed
 * or failed for reasons that had nothing to do with the rule being tested. The
 * rule is a pure function of some bytes; the transport is a separate concern
 * and a far less interesting one.
 *
 * Separated, the policy is tested directly with real buffers at the real
 * boundaries, and the route is left doing what a route should: read the
 * request, call this, translate the answer into a status code.
 */

/** 8 MB. A text resume is under 500 KB; anything near this is scanned images. */
export const MAX_RESUME_BYTES = 8 * 1024 * 1024;

const PDF_MAGIC = Buffer.from('%PDF-', 'ascii');

export type ResumeCheck =
  | { ok: true }
  | { ok: false; status: 400 | 413 | 415; error: string };

export function checkResumePdf(content: Buffer): ResumeCheck {
  if (content.length === 0) {
    return { ok: false, status: 400, error: 'That file is empty.' };
  }

  if (content.length > MAX_RESUME_BYTES) {
    return {
      ok: false,
      status: 413,
      error: 'That PDF is over 8 MB. Compress it and try again.',
    };
  }

  /*
   * The filename and the browser-supplied MIME type are both attacker-
   * controlled strings and neither is evidence of anything. The first five
   * bytes are the only claim the file makes about itself that it cannot
   * retract while remaining a PDF.
   *
   * This is not paranoia about Arvind. It is that whatever lands here is served
   * from a public URL under his name, so the one account worth stealing is the
   * one that can write it — and a check that trusts the extension is a check
   * that trusts the attacker.
   */
  if (!content.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return {
      ok: false,
      status: 415,
      error:
        'That does not look like a PDF. Export the resume as PDF and upload that — a renamed .docx will not work.',
    };
  }

  return { ok: true };
}
