import { profile } from '@/data/profile';
import qrMeta from '@/data/whatsapp-qr.json';

/**
 * The WhatsApp link, derived from the one phone number in `profile.ts`.
 *
 * ## Why there is no API here
 *
 * Arvind asked about a free WhatsApp API. There is one — Meta's Cloud API —
 * and it is the wrong tool twice over. It is built for a *business* messaging
 * its customers, which is the opposite direction to what a portfolio needs;
 * and it stopped being free in any useful sense, with every template message
 * charged and, since 1 October 2026, in-window replies charged too. It also
 * wants a Meta Business account and verification.
 *
 * The unofficial libraries that automate a real WhatsApp account
 * (whatsapp-web.js, Baileys) are worse: they break WhatsApp's terms and the
 * account they can get banned is his personal number.
 *
 * None of that is needed. A `wa.me` link is click-to-chat, not an API: it opens
 * the *visitor's* WhatsApp with a conversation to this number already started.
 * The message is sent by them, from their account, so there is nothing to
 * authenticate, nothing to pay for, no server, and no dependency. It works on a
 * phone and falls back to WhatsApp Web on a desktop.
 *
 * ## The number
 *
 * Taken from `profile.phone` rather than repeated, because a second copy is a
 * second thing to forget. `wa.me` wants digits only with a country code and no
 * `+`, so the formatting people read is stripped here rather than stored twice.
 */

/** Digits only, country code included, no `+` — the shape `wa.me` expects. */
export function whatsappNumber(phone: string = profile.phone): string {
  return phone.replace(/\D/g, '');
}

/**
 * The opening message.
 *
 * Pre-filled on purpose. A blank chat asks the visitor to compose an
 * introduction to a stranger, which is the point most people close the app —
 * and it arrives with no clue where they came from. This says both in one line
 * and leaves the sentence unfinished, so it reads as a starting point rather
 * than a form letter the visitor is expected to send verbatim.
 */
export const WHATSAPP_GREETING = `Hi ${profile.shortName}, I saw your portfolio and wanted to connect about `;

export function whatsappLink(
  message: string = WHATSAPP_GREETING,
  phone: string = profile.phone,
): string {
  const number = whatsappNumber(phone);
  // `encodeURIComponent`, not a hand-rolled replace: the greeting is ordinary
  // prose today and will eventually contain an apostrophe or an ampersand.
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The link the QR code carries.
 *
 * Deliberately the same URL, so a scan and a tap land in the same place. It
 * carries no message text: a QR is scanned from someone else's screen — a
 * laptop at a desk, a slide, a printed card — and a pre-filled sentence about
 * "your portfolio" is wrong for half of those. The chat opens; they write.
 */
export function whatsappQrTarget(phone: string = profile.phone): string {
  return `https://wa.me/${whatsappNumber(phone)}`;
}

/**
 * Whether the committed QR still encodes the number the profile now carries.
 *
 * The phone number became admin-editable; the QR is a committed SVG that only
 * changes when `npm run qr` is run. So a save can leave a code that scans
 * perfectly and opens a chat with whoever holds the old number — a failure with
 * no visible symptom, which is the kind this project has been bitten by before.
 *
 * The contact section hides the QR when this is false. No QR is better than a
 * QR to the wrong person, and the link beside it still works.
 */
export function qrMatchesProfile(): boolean {
  return qrMeta.encodes === whatsappNumber(profile.phone);
}
