import { describe, expect, it } from 'vitest';
import { MAX_RESUME_BYTES, checkResumePdf } from '@/lib/admin/resume-validation';

/**
 * The upload rules, tested on real buffers at the real boundaries.
 *
 * These assertions were originally written against the route handler and could
 * not be trusted there: pushing 9 MB through `FormData` in the test environment
 * produced a 9-byte body, so the size test passed for the wrong reason and then
 * failed for another wrong reason. Testing the policy where the policy lives
 * removes the transport from the question entirely.
 */

function pdf(size: number): Buffer {
  const header = Buffer.from('%PDF-1.7\n', 'ascii');
  return size <= header.length
    ? header.subarray(0, size)
    : Buffer.concat([header, Buffer.alloc(size - header.length, 0x20)]);
}

describe('checkResumePdf', () => {
  it('accepts an ordinary PDF', () => {
    expect(checkResumePdf(pdf(120_000))).toEqual({ ok: true });
  });

  it('rejects an empty file', () => {
    const result = checkResumePdf(Buffer.alloc(0));
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('accepts a file exactly on the size limit and rejects one byte more', () => {
    // The boundary itself, which is the only part of a limit worth testing:
    // an off-by-one here rejects a file the message says is allowed.
    expect(checkResumePdf(pdf(MAX_RESUME_BYTES))).toEqual({ ok: true });
    expect(checkResumePdf(pdf(MAX_RESUME_BYTES + 1))).toMatchObject({ ok: false, status: 413 });
  });

  it('rejects a file that is not a PDF however it is labelled', () => {
    for (const impostor of [
      Buffer.from('PK a zip, or a .docx'),
      Buffer.from('%!PS-Adobe- postscript'),
      Buffer.from('<html><body>not a pdf'),
      Buffer.from('PNG\r\n\n'),
      Buffer.from('  %PDF- with leading spaces'),
    ]) {
      expect(checkResumePdf(impostor), impostor.subarray(0, 12).toString()).toMatchObject({
        ok: false,
        status: 415,
      });
    }
  });

  it('rejects a file shorter than the signature it claims', () => {
    expect(checkResumePdf(Buffer.from('%PD'))).toMatchObject({ ok: false, status: 415 });
  });

  it('checks size before content, so a huge non-PDF is refused as too large', () => {
    // Order matters for a reason that is not cosmetic: reporting "not a PDF"
    // for a 40 MB file sends the person off to re-export a file whose real
    // problem is its size.
    const huge = Buffer.alloc(MAX_RESUME_BYTES + 1000, 0x50);
    expect(checkResumePdf(huge)).toMatchObject({ ok: false, status: 413 });
  });

  it('never throws, whatever it is handed', () => {
    for (const input of [Buffer.alloc(0), Buffer.alloc(1), pdf(6), Buffer.from([0xff, 0xfe])]) {
      expect(() => checkResumePdf(input)).not.toThrow();
    }
  });
});
