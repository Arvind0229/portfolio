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
 * The phone number lives in `src/data/profile.json` and nowhere else. This
 * script reads that file rather than being handed a second copy to drift from.
 *
 * It used to regex it out of `profile.ts`, which worked until the profile
 * became admin-editable and the number moved into JSON — the test below caught
 * that the same day. Parsing JSON is exact where a regex against TypeScript was
 * a guess that happened to be right.
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
  const source = await readFile(path.join(root, 'src', 'data', 'profile.json'), 'utf8');
  const phone = JSON.parse(source).phone;
  if (typeof phone !== 'string' || phone.trim().length === 0) {
    throw new Error('No `phone` in src/data/profile.json — has the field been renamed?');
  }
  return phone.trim();
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

  /*
   * What the picture encodes, recorded beside it.
   *
   * The phone number is editable from the admin panel now, and this SVG is a
   * committed file that only regenerates when someone runs this script. So the
   * admin can change the number and leave a QR pointing at the old one — which
   * scans perfectly and opens a chat with whoever holds it. Nothing visible
   * would be wrong.
   *
   * The contact section compares this value with the current number and hides
   * the QR when they disagree. No QR is plainly better than a QR to the wrong
   * person, and the admin panel says so rather than leaving it to be noticed.
   */
  await writeFile(
    path.join(process.cwd(), 'src', 'data', 'whatsapp-qr.json'),
    `${JSON.stringify({ $comment: 'Written by scripts/whatsapp-qr.mjs. Do not edit.', encodes: phone.replace(/\D/g, '') }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote ${out}\n  number:  ${phone}\n  encodes: ${target}\n  ${svg.length} bytes`);
}
