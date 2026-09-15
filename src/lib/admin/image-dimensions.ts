/**
 * Read an image's pixel dimensions from its header, without decoding it.
 *
 * ## Why parse rather than decode
 *
 * `next/image` needs `width` and `height` or the page reflows when the photo
 * lands. The obvious way to get them is to decode the image with a library —
 * and decoding is precisely what we do not want to do to a file a browser just
 * uploaded. Image decoders are one of the classic memory-corruption surfaces;
 * the safest way to handle a hostile JPEG is never to decode it.
 *
 * A header parse reads a few dozen bytes of length-prefixed structure and does
 * arithmetic on them. There is no pixel buffer, no allocation proportional to
 * the declared size, and nothing to overflow. It is ~80 lines against a native
 * dependency with its own CVE history.
 *
 * ## Why not trust the client
 *
 * The browser resizes the photo before upload and therefore knows its size. It
 * could simply tell us. It must not: those numbers end up as the `width` and
 * `height` attributes of a public `<img>`, and a client that lies produces a
 * page that reflows or a layout that is wrong for every visitor. The bytes are
 * the only thing the server received that it can actually check, so the server
 * derives the dimensions from the bytes.
 *
 * Precedent: TOTP in `totp.ts` is hand-rolled against the RFC test vectors for
 * the same reason — a small, well-specified, verifiable piece of parsing is
 * cheaper to own than a dependency.
 */

export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

const JPEG_SOI = 0xd8;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Start-of-frame markers, which are the ones carrying the size.
 *
 * `0xC0`–`0xCF` are SOF*n*, with three exceptions that share the range and mean
 * something else entirely: `C4` is a Huffman table, `C8` is reserved, and `CC`
 * is an arithmetic-coding table. Treating one of those as a frame header reads
 * the size out of the middle of a table, which is how a parser ends up
 * confidently reporting nonsense.
 */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

export function jpegDimensions(content: Buffer): ImageDimensions | null {
  if (content.length < 4 || content[0] !== 0xff || content[1] !== JPEG_SOI) return null;

  let offset = 2;
  // Bounded by the buffer at every step: each read is checked before it happens,
  // and the offset only ever moves forward, so a malformed file ends the walk
  // rather than looping.
  while (offset + 3 < content.length) {
    if (content[offset] !== 0xff) {
      // Not at a marker. A valid stream is marker-aligned here, so anything else
      // means the file is malformed or truncated — stop rather than hunt.
      return null;
    }

    let marker = content[offset + 1] as number;
    // `FF` is also the padding byte between segments, so a run of them is legal
    // and the real marker is the first byte after the run.
    let cursor = offset + 1;
    while (marker === 0xff && cursor + 1 < content.length) {
      cursor += 1;
      marker = content[cursor] as number;
    }

    // Standalone markers: no length, no payload.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset = cursor + 1;
      continue;
    }
    // Start of scan — the compressed data begins and there is no header left to
    // find. If the size has not appeared by now it is not going to.
    if (marker === 0xda) return null;

    if (cursor + 3 >= content.length) return null;
    const length = content.readUInt16BE(cursor + 1);
    // A segment length below 2 would not advance the cursor, which is the shape
    // of an infinite loop in a parser fed a hostile file.
    if (length < 2) return null;

    if (isStartOfFrame(marker)) {
      // SOF payload: precision (1 byte), height (2), width (2).
      if (cursor + 7 >= content.length) return null;
      const height = content.readUInt16BE(cursor + 4);
      const width = content.readUInt16BE(cursor + 6);
      return width > 0 && height > 0 ? { width, height } : null;
    }

    offset = cursor + 1 + length;
  }

  return null;
}

export function pngDimensions(content: Buffer): ImageDimensions | null {
  // Signature, then the IHDR chunk: length (4), type (4), width (4), height (4).
  if (content.length < 24) return null;
  if (!content.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (content.subarray(12, 16).toString('ascii') !== 'IHDR') return null;

  const width = content.readUInt32BE(16);
  const height = content.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

/** Dimensions of a JPEG or PNG, or `null` if the header does not yield them. */
export function imageDimensions(content: Buffer): ImageDimensions | null {
  return jpegDimensions(content) ?? pngDimensions(content);
}
