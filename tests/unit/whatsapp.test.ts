import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  WHATSAPP_GREETING,
  whatsappLink,
  whatsappNumber,
  whatsappQrTarget,
} from '@/lib/contact/whatsapp';
import { profile } from '@/data/profile';

// @ts-expect-error — plain ESM script, no types, and none worth writing for it.
import { buildQrSvg, phoneFromProfile, qrTarget } from '../../scripts/whatsapp-qr.mjs';

describe('the WhatsApp link', () => {
  it('strips formatting down to the digits wa.me expects', () => {
    expect(whatsappNumber('+91 82913 98844')).toBe('918291398844');
    expect(whatsappNumber('+91-82913-98844')).toBe('918291398844');
    expect(whatsappNumber('(+91) 82913 98844')).toBe('918291398844');
  });

  it('keeps the country code, because wa.me fails silently without one', () => {
    // A number without a country code does not error — it opens a chat with
    // the wrong person, or with nobody. There is no failure to notice.
    expect(whatsappNumber(profile.phone).startsWith('91')).toBe(true);
    expect(whatsappNumber(profile.phone).length).toBeGreaterThanOrEqual(12);
  });

  it('escapes the greeting rather than pasting it into the URL', () => {
    const link = whatsappLink("Hi — it's about R&D + automation?");
    expect(link).toContain('%26'); // &
    expect(link).toContain('%3F'); // ?
    expect(link).not.toMatch(/text=.*[&?].*[&?]/);
  });

  it('opens with his name and leaves the sentence unfinished', () => {
    // The trailing space is deliberate: the visitor's cursor lands mid-sentence,
    // which reads as a starting point rather than a message to send as-is.
    expect(WHATSAPP_GREETING).toContain(profile.shortName);
    expect(WHATSAPP_GREETING.endsWith(' ')).toBe(true);
  });

  it('carries no message text on the QR target', () => {
    // A QR is scanned off someone else's screen, a slide or a printed card, and
    // "I saw your portfolio" is wrong for most of those.
    expect(whatsappQrTarget()).not.toContain('text=');
    expect(whatsappQrTarget()).toBe(`https://wa.me/${whatsappNumber(profile.phone)}`);
  });
});

describe('the committed QR code', () => {
  const svgPath = path.join(process.cwd(), 'public', 'whatsapp-qr.svg');

  it('encodes the number that is in the profile right now', async () => {
    /*
     * The guard that matters.
     *
     * A stale QR does not break anything visibly — it renders, it scans, and it
     * opens a chat with whoever holds the old number. Nobody would notice until
     * someone complained about messages they never expected. So the file is
     * regenerated here in memory and compared byte for byte with the committed
     * copy: change the number in `profile.ts` and this fails until `npm run qr`
     * has been run.
     */
    const phone = await phoneFromProfile(process.cwd());
    expect(phone, 'the script and the app disagree about the number').toBe(profile.phone);

    const expected = await buildQrSvg(qrTarget(phone));
    const committed = await readFile(svgPath, 'utf8');

    expect(
      committed,
      'public/whatsapp-qr.svg is out of date — run `npm run qr` and commit the result',
    ).toBe(expected);
  });

  it('agrees with the link the buttons use', async () => {
    const phone = await phoneFromProfile(process.cwd());
    expect(qrTarget(phone)).toBe(whatsappQrTarget());
  });

  it('inherits the theme instead of hard-coding a colour', async () => {
    // One file for three themes in light and dark. A QR needs contrast, not a
    // particular colour, and a black code on a midnight background does not
    // scan.
    const svg = await readFile(svgPath, 'utf8');
    expect(svg).toContain('currentColor');
    expect(svg).not.toContain('#000000');
  });

  it('is described for anyone who cannot see it', async () => {
    const svg = await readFile(svgPath, 'utf8');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label');
  });

  it('does not answer to his name, which the portrait already uses', async () => {
    // Two images with the same accessible name on one panel is a repetition
    // for a screen reader and an ambiguity for anything selecting by name — an
    // end-to-end test caught it as a strict-mode violation before a person
    // would have caught it as an annoyance.
    const svg = await readFile(svgPath, 'utf8');
    expect(svg).not.toContain(profile.name);
  });
});
