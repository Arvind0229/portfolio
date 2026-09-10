import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { profile } from '@/data/profile';

/**
 * The portrait is described in data (`profile.photo`) but stored as a file in
 * `public/`, and nothing in TypeScript connects the two. That gap is exactly
 * where a recrop goes wrong: someone replaces the JPEG, the declared width and
 * height stay at the old numbers, and `next/image` reserves a box of the wrong
 * shape — which shows up as a squashed face or a layout shift, on a page whose
 * subject is the person.
 *
 * So these tests read the actual bytes and assert the data matches them.
 */

const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * Intrinsic size of a JPEG, read from its SOF marker.
 *
 * Written out rather than pulled from a dependency: this is twenty lines
 * against one more package in the tree for a single assertion, and the format
 * has not moved since 1992. A JPEG is a sequence of `FF <marker>` segments;
 * every SOFn except the four that are not frame headers (`C4` Huffman tables,
 * `C8` reserved, `CC` arithmetic coding) carries height then width as
 * big-endian 16-bit values, five bytes into its payload.
 */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new Error(`Expected a marker at byte ${offset}`);
    }
    const marker = bytes[offset + 1];
    if (marker === undefined) break;

    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isFrameHeader) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }

    // Not a frame header: skip the segment using its own declared length.
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }

  throw new Error('No SOF marker found — not a JPEG?');
}

describe('profile photo', () => {
  const { photo } = profile;
  const path = join(PUBLIC_DIR, photo.src);

  it('is a path under public/, not a remote URL', () => {
    // A remote source would need `images.remotePatterns` and would put the
    // page's LCP on someone else's uptime.
    expect(photo.src.startsWith('/')).toBe(true);
    expect(photo.src).not.toMatch(/^https?:/);
  });

  it('points at a file that actually exists', () => {
    expect(statSync(path).isFile()).toBe(true);
  });

  it('declares the intrinsic size the file really has', () => {
    const { width, height } = jpegSize(readFileSync(path));
    expect({ width, height }).toEqual({
      width: photo.width,
      height: photo.height,
    });
  });

  it('stays small enough to be a web asset', () => {
    // The source PNG was 1.9 MB. A portrait re-encoded past ~400 KB means the
    // optimisation step was skipped on a replacement.
    expect(statSync(path).size).toBeLessThan(400_000);
  });

  it('carries an inline blur placeholder the CSP allows', () => {
    // `img-src 'self' data:` in next.config.ts — a placeholder from anywhere
    // else would be blocked and the frame would be empty until the photo
    // decoded.
    expect(photo.blurDataURL).toMatch(/^data:image\/(jpeg|png|webp);base64,/);
    // Small enough to inline into the HTML without paying for it twice.
    expect(photo.blurDataURL.length).toBeLessThan(2_000);
  });

  it('names the person in its alt text', () => {
    // For a portrait the useful alt is who it is — not what they are wearing,
    // and not "photo of", which a screen reader already announces.
    expect(photo.alt).toBe(profile.name);
    expect(photo.alt.toLowerCase()).not.toMatch(/photo|image|picture|headshot/);
  });

  it('states a face position usable as a CSS object-position', () => {
    expect(photo.facePosition).toMatch(/^\d+% \d+%$/);
  });
});
