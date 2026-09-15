import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { activePhoto, parsePhotoRegistry, photoRegistry } from '@/data/photo';
import { profile } from '@/data/profile';
import { imageDimensions, jpegDimensions, pngDimensions } from '@/lib/admin/image-dimensions';
import {
  MAX_PHOTO_BYTES,
  MIN_PHOTO_EDGE,
  checkPhoto,
  validateBlurDataUrl,
  validateFacePosition,
} from '@/lib/admin/photo-validation';
import { photoFileTarget, photoFileUrl, targetPath } from '@/lib/admin/content-writer';

const realPhoto = readFileSync(path.join(process.cwd(), 'public/profile/arvind-gupta.jpg'));

describe('reading the dimensions out of the header', () => {
  /*
   * The whole reason this parser exists is to avoid decoding an image, so the
   * test that matters is that it agrees with reality on a real file. The
   * committed portrait is 1081×1351 — a separate test in profile-photo.test.ts
   * has asserted that against the file since before this feature existed.
   */
  it('reads the real portrait correctly', () => {
    expect(jpegDimensions(realPhoto)).toEqual({ width: 1081, height: 1351 });
    expect(imageDimensions(realPhoto)).toEqual({ width: 1081, height: 1351 });
  });

  it('reads a PNG header', () => {
    // Signature, then IHDR declaring 800×600.
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from([0, 0, 0, 13]),
      Buffer.from('IHDR', 'ascii'),
      (() => {
        const dims = Buffer.alloc(8);
        dims.writeUInt32BE(800, 0);
        dims.writeUInt32BE(600, 4);
        return dims;
      })(),
    ]);
    expect(pngDimensions(png)).toEqual({ width: 800, height: 600 });
  });

  it('returns null rather than throwing on rubbish', () => {
    /*
     * A parser fed hostile input must fail, not crash and not spin. Each of
     * these is a shape that a naive marker walk gets wrong: an empty buffer, a
     * valid start with nothing after it, a segment length of zero (which would
     * not advance the cursor — an infinite loop), and a truncated frame header.
     */
    for (const bad of [
      Buffer.alloc(0),
      Buffer.from([0xff, 0xd8]),
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00]),
      Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]),
      Buffer.from('not an image at all', 'ascii'),
    ]) {
      expect(() => imageDimensions(bad)).not.toThrow();
      expect(imageDimensions(bad)).toBeNull();
    }
  });

  it('terminates on a file that is all marker bytes', () => {
    // `FF` is legal padding, so a file made entirely of it is the input that
    // separates a bounded walk from a hang. Vitest would time out rather than
    // fail informatively if this regressed, which is why it is called out.
    const start = Date.now();
    expect(imageDimensions(Buffer.alloc(4096, 0xff))).toBeNull();
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('does not mistake a Huffman table for a frame header', () => {
    // C4 sits inside the SOF range and is not one. Reading a size out of it
    // yields confident nonsense, which is worse than returning null.
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.from([0xff, 0xc4, 0x00, 0x06, 0x00, 0x01, 0x02, 0x03]),
      Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08]),
      (() => {
        // SOF order is height then width, which is the opposite of how everyone
        // says it out loud. The first version of this fixture had them the
        // other way round and the parser was right.
        const dims = Buffer.alloc(4);
        dims.writeUInt16BE(300, 0); // height
        dims.writeUInt16BE(400, 2); // width
        return dims;
      })(),
      Buffer.from([0x03]),
    ]);
    expect(jpegDimensions(jpeg)).toEqual({ width: 400, height: 300 });
  });
});

describe('what the server will accept', () => {
  it('accepts the real portrait', () => {
    const check = checkPhoto(realPhoto);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.dimensions).toEqual({ width: 1081, height: 1351 });
  });

  it('refuses an empty file', () => {
    const check = checkPhoto(Buffer.alloc(0));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.status).toBe(422);
  });

  it('refuses anything that is not a JPEG, whatever it claims', () => {
    // A PNG is a perfectly good image and is still refused: the browser
    // converts before uploading, so a PNG arriving means the conversion did not
    // run, and guessing at that is how a 12 MB screenshot becomes the portrait.
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    for (const bad of [png, Buffer.from('%PDF-1.7', 'ascii'), Buffer.from('<script>', 'ascii')]) {
      const check = checkPhoto(bad);
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.status).toBe(415);
    }
  });

  it('refuses a file over the size cap', () => {
    const huge = Buffer.alloc(MAX_PHOTO_BYTES + 1);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    const check = checkPhoto(huge);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.status).toBe(413);
  });

  it('refuses a JPEG whose header cannot be read', () => {
    // Correct magic bytes, malformed structure — the shape that would sail past
    // a magic-byte-only check and then be stored with no usable dimensions.
    const check = checkPhoto(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00]));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.status).toBe(422);
  });

  it('refuses an image too small to be a portrait', () => {
    const tiny = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08]),
      (() => {
        const dims = Buffer.alloc(4);
        dims.writeUInt16BE(MIN_PHOTO_EDGE - 1, 0);
        dims.writeUInt16BE(MIN_PHOTO_EDGE - 1, 2);
        return dims;
      })(),
      Buffer.from([0x03]),
    ]);
    const check = checkPhoto(tiny);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.status).toBe(422);
  });
});

describe('the values that come from the client', () => {
  it('accepts only a bounded base64 jpeg data URI as a blur placeholder', () => {
    const good = `data:image/jpeg;base64,${'A'.repeat(64)}`;
    expect(validateBlurDataUrl(good)).toBe(good);

    for (const bad of [
      'data:text/html;base64,PHNjcmlwdD4=',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'javascript:alert(1)',
      'https://example.com/x.jpg',
      'data:image/jpeg;base64,<script>',
      `data:image/jpeg;base64,${'A'.repeat(20_000)}`,
      42,
      null,
    ]) {
      expect(validateBlurDataUrl(bad), `${String(bad).slice(0, 30)} was accepted`).toBeNull();
    }
  });

  it('accepts only two percentages as a face position', () => {
    expect(validateFacePosition('50% 8%')).toBe('50% 8%');
    for (const bad of ['50%', 'top left', '50% 8', 'expression(alert(1))', '50%;color:red', '']) {
      expect(validateFacePosition(bad), `${bad} was accepted`).toBeNull();
    }
  });
});

describe('the photo file target', () => {
  it('builds a path only from an id that matches the pattern', () => {
    expect(targetPath(photoFileTarget('abc123'))).toBe('public/profile/abc123.jpg');
    expect(photoFileUrl(photoFileTarget('abc123'))).toBe('/profile/abc123.jpg');
  });

  it('refuses an id that would escape the directory', () => {
    // The id is a content hash today. This check exists so it does not matter
    // if a future caller ever passes something else.
    for (const bad of ['../../etc/passwd', 'a/b', 'UPPER', '', '.', 'x'.repeat(200)]) {
      expect(() => photoFileTarget(bad), `${bad} was accepted`).toThrow();
    }
  });
});

describe('the registry', () => {
  it('serves the committed portrait unchanged', () => {
    // The compatibility guarantee: moving the photo behind a registry must not
    // change a single value any component reads.
    expect(profile.photo.src).toBe('/profile/arvind-gupta.jpg');
    expect(profile.photo.width).toBe(1081);
    expect(profile.photo.height).toBe(1351);
    expect(profile.photo.alt).toBe('Arvind Gupta');
    expect(profile.photo.facePosition).toBe('50% 8%');
    expect(profile.photo.blurDataURL.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('has exactly one version to begin with, and it is the active one', () => {
    expect(photoRegistry.versions).toHaveLength(1);
    expect(photoRegistry.active).toBe(photoRegistry.versions[0]?.id);
  });

  it('drops a version missing anything the page needs', () => {
    /*
     * Not pedantry. Without dimensions the page reflows when the photo lands;
     * without alt it is inaccessible; with a src outside the committed
     * directory it is not ours to serve. Each of those is worse than the
     * version simply not being offered.
     */
    const parsed = parsePhotoRegistry({
      active: 'a',
      versions: [
        { id: 'a', src: '/profile/a.jpg', width: 0, height: 100, alt: 'x' },
        { id: 'b', src: '/profile/b.jpg', width: 100, height: 100, alt: '' },
        { id: 'c', src: 'https://evil.test/x.jpg', width: 100, height: 100, alt: 'x' },
        { id: 'd', src: '/profile/../../etc/passwd', width: 100, height: 100, alt: 'x' },
        { id: 'e', src: '/profile/e.jpg', width: 100, height: 100, alt: 'Fine' },
      ],
    });
    expect(parsed.versions.map((version) => version.id)).toEqual(['e']);
  });

  it('refuses a duplicate id', () => {
    const parsed = parsePhotoRegistry({
      active: 'dup',
      versions: [
        { id: 'dup', src: '/profile/one.jpg', width: 10_00, height: 1000, alt: 'First' },
        { id: 'dup', src: '/profile/two.jpg', width: 1000, height: 1000, alt: 'Second' },
      ],
    });
    expect(parsed.versions).toHaveLength(1);
    expect(parsed.versions[0]?.alt).toBe('First');
  });

  it('falls back to the newest when active names nothing', () => {
    // The one failure that must never blank the portrait.
    const parsed = parsePhotoRegistry({
      active: 'gone',
      versions: [{ id: 'here', src: '/profile/here.jpg', width: 900, height: 1100, alt: 'x' }],
    });
    expect(parsed.active).toBe('here');
  });

  it('survives complete rubbish without throwing', () => {
    for (const rubbish of [null, undefined, 42, 'text', [], { versions: 'no' }]) {
      expect(() => parsePhotoRegistry(rubbish)).not.toThrow();
      expect(parsePhotoRegistry(rubbish).versions).toEqual([]);
    }
  });

  it('still renders a portrait when the registry is empty', () => {
    // `activePhoto` is called at build time. Throwing here would fail the build
    // rather than degrade the page, which is the wrong trade for a photograph.
    expect(() => activePhoto()).not.toThrow();
    expect(activePhoto().src.startsWith('/profile/')).toBe(true);
  });
});
