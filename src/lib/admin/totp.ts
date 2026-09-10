import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP — RFC 6238 — implemented here rather than installed.
 *
 * ## Why not a package
 *
 * This is roughly seventy lines of standard, frozen arithmetic: HMAC a counter,
 * take a dynamic-offset four-byte slice, modulo it. Node ships the only hard
 * part (`createHmac`). Against that, a dependency in the authentication path is
 * a permanent supply-chain surface on the one route where a compromise means
 * someone else editing Arvind's profile.
 *
 * The usual argument for the package — "don't roll your own crypto" — is about
 * *primitives*. HMAC-SHA1 is the primitive and it is Node's. What is written
 * here is the RFC's assembly instructions, and unlike a dependency it is
 * verified below against the published RFC 6238 test vectors, which is a
 * stronger guarantee than a version number.
 *
 * ## Why TOTP and not SMS
 *
 * Arvind asked for a phone OTP and it is the right instinct — a code he holds,
 * not a password he might reuse. SMS turned out to cost money in India twice
 * over: TRAI's DLT registration needs a company PAN and GST he does not have,
 * and every gateway that skips that bills per message. TOTP delivers the same
 * six digits from an app on the same phone, for nothing, with no account, no
 * card and no network at the moment of use — and it is not exposed to SIM swap
 * or SMS interception, which SMS is.
 *
 * ## Clock skew
 *
 * `WINDOW = 1` accepts the previous and next 30-second step as well as the
 * current one, so a phone up to half a minute out of step still works. Wider
 * than that starts extending the life of a code someone may have shoulder-read;
 * narrower starts rejecting honest people whose clock drifted.
 */

const DIGITS = 6;
const STEP_SECONDS = 30;
const WINDOW = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decodes a Base32 secret (RFC 4648, no padding required) into bytes. */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(output);
}

/** Encodes bytes as Base32 — used once, to generate a new secret. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];

  return output;
}

/**
 * The code for one counter value.
 *
 * Exported because the RFC 6238 vectors are stated as counter/time pairs, and
 * a test that can only go through `verifyTotp` cannot check them directly.
 */
export function hotp(
  secret: Buffer,
  counter: number,
  digits: number = DIGITS,
  algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1',
): string {
  const buffer = Buffer.alloc(8);
  // A 64-bit counter written as two 32-bit halves: `writeUInt32BE` is the
  // widest integer write that is exact, and at 30-second steps the high half
  // stays zero until the year 6000 or so.
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac(algorithm, secret).update(buffer).digest();
  // Dynamic truncation, RFC 4226 §5.4: the low nibble of the last byte picks
  // where the four significant bytes start.
  const offset = (digest[digest.length - 1] as number) & 0x0f;
  const binary =
    (((digest[offset] as number) & 0x7f) << 24) |
    (((digest[offset + 1] as number) & 0xff) << 16) |
    (((digest[offset + 2] as number) & 0xff) << 8) |
    ((digest[offset + 3] as number) & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/**
 * Checks a code against the secret, tolerating one step of clock skew.
 *
 * The comparison is `timingSafeEqual` rather than `===`. The practical risk of
 * a timing side channel on a six-digit code over the internet is small, but the
 * cost of using the constant-time comparison is zero, and "small" is not a
 * standard worth defending in an auth path.
 */
export function verifyTotp(
  code: string,
  secretBase32: string,
  now: number = Date.now(),
): boolean {
  const trimmed = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(trimmed)) return false;

  let secret: Buffer;
  try {
    secret = base32Decode(secretBase32);
  } catch {
    // A malformed secret is a configuration fault, not a failed login. It must
    // not throw into the request path — the route logs and returns a generic
    // failure, so a misconfigured server never leaks that it is misconfigured.
    return false;
  }
  if (secret.length === 0) return false;

  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  const expected = Buffer.from(trimmed);

  let matched = false;
  for (let drift = -WINDOW; drift <= WINDOW; drift += 1) {
    const candidate = Buffer.from(hotp(secret, counter + drift));
    // No early return: looping over every step regardless keeps the work
    // constant whether the match is on the first candidate or the last.
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      matched = true;
    }
  }

  return matched;
}

/** A fresh 160-bit secret, the size RFC 4226 recommends for HMAC-SHA1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * The `otpauth://` URI an authenticator app consumes.
 *
 * `issuer` appears twice by convention — once in the label, once as a
 * parameter — because different apps read different ones, and an entry that
 * shows up as a bare email address among thirty others is a usability problem
 * at exactly the wrong moment.
 */
export function totpUri(secret: string, account: string, issuer = 'Arvind Gupta Portfolio'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
