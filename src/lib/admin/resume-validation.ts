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

/*
 * DOCX is a ZIP container, so it begins with the ZIP local-file-header
 * signature `PK\x03\x04`. That is as far as magic bytes can take us: every
 * .docx is a zip, but not every zip is a .docx, and the difference is a
 * directory entry several kilobytes in.
 *
 * So the second check looks for the one member every OOXML package must
 * contain — `[Content_Types].xml`, named in the spec, present in the first
 * local header of every file Word writes. Searching for that name in the first
 * few hundred bytes distinguishes a Word document from a renamed zip of
 * something else without unpacking anything or adding a zip dependency.
 *
 * It is not proof. A crafted archive could satisfy it. What it does is stop the
 * plausible accidents — a .zip renamed, a .pages, an .odt — from being served
 * from a public URL under his name as though they were his resume.
 */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OOXML_MARKER = Buffer.from('[Content_Types].xml', 'ascii');
const OOXML_SEARCH_WINDOW = 512;

export type ResumeFormat = 'pdf' | 'docx';

export type ResumeCheck =
  | { ok: true }
  | { ok: false; status: 400 | 413 | 415; error: string };

/** Which formats the upload endpoint accepts, and how each is recognised. */
export const RESUME_FORMATS: readonly ResumeFormat[] = ['pdf', 'docx'];

export function isResumeFormat(value: unknown): value is ResumeFormat {
  return value === 'pdf' || value === 'docx';
}

/**
 * Dispatches on the declared format. The format comes from the admin form, not
 * from the filename — a person choosing "PDF" in the UI and attaching a .docx
 * should be told so, rather than having the site guess and be wrong quietly.
 */
export function checkResumeFile(content: Buffer, format: ResumeFormat): ResumeCheck {
  return format === 'pdf' ? checkResumePdf(content) : checkResumeDocx(content);
}

export function checkResumeDocx(content: Buffer): ResumeCheck {
  const size = checkSize(content, 'DOCX');
  if (size) return size;

  if (!content.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC)) {
    return {
      ok: false,
      status: 415,
      error:
        'That does not look like a Word document. Save it as .docx from Word and upload that.',
    };
  }

  if (content.subarray(0, OOXML_SEARCH_WINDOW).indexOf(OOXML_MARKER) === -1) {
    return {
      ok: false,
      status: 415,
      error:
        'That is a zip file, but not a Word document. Save it as .docx from Word and upload that.',
    };
  }

  return { ok: true };
}

function checkSize(content: Buffer, label: string): ResumeCheck | null {
  if (content.length === 0) {
    return { ok: false, status: 400, error: 'That file is empty.' };
  }
  if (content.length > MAX_RESUME_BYTES) {
    return {
      ok: false,
      status: 413,
      error: `That ${label} is over 8 MB. Compress it and try again.`,
    };
  }
  return null;
}

export function checkResumePdf(content: Buffer): ResumeCheck {
  const size = checkSize(content, 'PDF');
  if (size) return size;

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
