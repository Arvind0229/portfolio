import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * The admin session cookie.
 *
 * ## Stateless, and why that is the right call here
 *
 * The cookie carries its own expiry and an HMAC over it, so no server-side
 * session table is needed. On Vercel that is not a preference but a
 * requirement: instances are ephemeral and there is more than one, so an
 * in-process session map would log Arvind out whenever a request happened to
 * land somewhere else.
 *
 * The known cost of stateless sessions is that they cannot be revoked
 * individually — a stolen cookie stays valid until it expires. Two things make
 * that acceptable: the lifetime is two hours, and rotating
 * `ADMIN_SESSION_SECRET` invalidates every outstanding session at once. With a
 * single user, "log everyone out" and "log the attacker out" are the same
 * operation.
 *
 * ## Why not JWT
 *
 * A JWT library would bring an algorithm field that has to be pinned, a header
 * nobody reads, and a history of `alg: none` and confusion bugs. What is needed
 * is "sign this small object and check the signature", which is one HMAC. The
 * algorithm here is not negotiable because it is not in the token.
 */

const COOKIE_NAME = 'ag_admin';
const TTL_MS = 2 * 60 * 60 * 1000;

interface SessionPayload {
  /** Issued at, epoch ms. */
  iat: number;
  /** Expires at, epoch ms. */
  exp: number;
  /** Random, so two sessions issued in the same millisecond differ. */
  nonce: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payload: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(payload).digest());
}

/**
 * The signing secret.
 *
 * Throws when unset in production. That is deliberate: a development fallback
 * silently reached in production would mean every deployment shares one
 * publicly-known key, which is worse than the site refusing to start, because
 * it fails without anyone noticing. In development a fixed string is fine and
 * saves a setup step on a machine nobody can reach.
 */
export function sessionSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_SESSION_SECRET is missing or shorter than 32 characters. Admin sign-in is disabled.',
    );
  }
  return 'development-only-admin-session-secret-not-for-production';
}

export function createAdminSession(now: number = Date.now(), secret = sessionSecret()): string {
  const payload: SessionPayload = {
    iat: now,
    exp: now + TTL_MS,
    nonce: randomBytes(9).toString('hex'),
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Verifies a cookie value.
 *
 * The signature is checked *before* the payload is parsed. Parsing first would
 * mean running JSON.parse on unauthenticated attacker-controlled input, and
 * deciding anything — even how to fail — from a payload nobody has vouched for.
 */
export function verifyAdminSession(
  value: string | undefined | null,
  now: number = Date.now(),
  secret = sessionSecret(),
): boolean {
  if (!value) return false;

  const separator = value.lastIndexOf('.');
  if (separator <= 0) return false;

  const encoded = value.slice(0, separator);
  const provided = value.slice(separator + 1);
  const expected = sign(encoded, secret);

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return false;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromBase64url(encoded).toString('utf8')) as SessionPayload;
  } catch {
    return false;
  }

  if (typeof payload?.exp !== 'number' || typeof payload?.iat !== 'number') return false;
  // A cookie claiming to be issued in the future is either a clock problem or a
  // forgery attempt against a rotated secret. Neither deserves a session.
  if (payload.iat > now + 60_000) return false;
  return payload.exp > now;
}

/** `Set-Cookie` for a fresh session. */
export function sessionCookie(value: string, secure = process.env.NODE_ENV === 'production'): string {
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    // Strict, not Lax: nothing on this site links into /admin from elsewhere,
    // so there is no navigation the stricter setting breaks — and it removes
    // cross-site request forgery as a category rather than mitigating it.
    'SameSite=Strict',
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

/** `Set-Cookie` that clears the session. */
export function clearSessionCookie(secure = process.env.NODE_ENV === 'production'): string {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME, TTL_MS as ADMIN_SESSION_TTL_MS };
