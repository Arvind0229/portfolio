#!/usr/bin/env node
/**
 * Regenerates the WhatsApp QR code.
 *
 *     npm run qr
 *
 * ## Why the QR is generated here and committed, not drawn at runtime
 *
 * The code encodes one short URL that changes roughly never. Generating it in
 * the browser would mean shipping a QR encoder — Reed-Solomon error correction
 * and all — to every visitor so they can compute a picture that is identical
 * every time. Committed as an SVG it costs about a kilobyte, renders instantly,
 * needs no JavaScript, and works on a printed page.
 *
 * `qrcode` is therefore a devDependency: it runs here and never reaches the
 * bundle.
 *
 * ## The number is read, not repeated
 *
 * The phone number lives in `src/data/profile.ts` and nowhere else. This script
 * is plain ESM and cannot import TypeScript, so it reads the file and pulls the
 * number out rather than being handed a second copy to drift from.
 *
 * ## What keeps it honest
 *
 * A stale QR is worse than no QR: it silently sends people to a number that is
 * not his. `tests/unit/whatsapp.test.ts` regenerates this file in memory and
 * fails if the committed copy differs — which is what happens the moment the
 * number changes and nobody remembers this script exists.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

export const QR_OPTIONS = {
  type: 'svg',
  // 'M' recovers about 15% — enough for a phone camera at an angle, or a
  // printed card with a scuff, without the denser grid 'Q' or 'H' would bring.
  errorCorrectionLevel: 'M',
  margin: 1,
  // Transparent background; the foreground is rewritten to `currentColor`
  // below, so one file works on every theme in both light and dark.
  color: { dark: '#000000', light: '#0000' },
};

/** Reads the single source of truth rather than taking a second copy. */
export async function phoneFromProfile(root = process.cwd()) {
  const source = await readFile(path.join(root, 'src', 'data', 'profile.ts'), 'utf8');
  const match = source.match(/phone:\s*'([^']+)'/);
  if (!match?.[1]) {
    throw new Error("Could not find `phone:` in src/data/profile.ts — has the field been renamed?");
  }
  return match[1];
}

/** Same shape as `whatsappQrTarget()` in src/lib/contact/whatsapp.ts. */
export function qrTarget(phone) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

export async function buildQrSvg(target) {
  const raw = await QRCode.toString(target, QR_OPTIONS);
  /*
   * The generator hard-codes the foreground. Swapping it for `currentColor`
   * means the code takes the colour of the text around it, so it stays legible
   * when the visitor switches theme — a QR needs contrast, not a colour.
   */
  return raw
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(/stroke="#000000"/g, 'stroke="currentColor"')
    /*
       No name in the label. The portrait on the same panel already has the
       accessible name "Arvind Gupta", and two images answering to one name is
       a strict-mode violation for a test and a repetition for a screen reader.
    */
    .replace('<svg ', '<svg role="img" aria-label="WhatsApp chat QR code" ');
}

// Only when run directly, so the test can import the helpers without writing.
if (import.meta.url === `file://${process.argv[1]}`) {
  const phone = await phoneFromProfile();
  const target = qrTarget(phone);
  const svg = await buildQrSvg(target);
  const out = path.join(process.cwd(), 'public', 'whatsapp-qr.svg');
  await writeFile(out, svg, 'utf8');
  console.log(`Wrote ${out}\n  number:  ${phone}\n  encodes: ${target}\n  ${svg.length} bytes`);
}
