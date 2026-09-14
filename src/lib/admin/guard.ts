import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin/session';

/**
 * Who is allowed to change the profile, and from where.
 *
 * Two modes, and the difference between them is not a convenience — it is the
 * whole security model.
 *
 * **On his laptop**, the admin page is served by `next dev` bound to localhost.
 * Nothing outside the machine can reach it, so there is nobody to authenticate
 * against and a login screen would be theatre: it would protect the page from
 * the one person who is already sitting in front of it.
 *
 * That bypass used to be keyed off `NODE_ENV !== 'production'` alone, and that
 * was too wide. `NODE_ENV` has three conventional values, not two: a build run
 * with `NODE_ENV=test` — a CI job, a staging box, a container someone forgot to
 * configure — served a **fully unauthenticated admin panel** to whatever could
 * reach it. Nothing in the code said so and no test would have caught it.
 *
 * It now takes two conditions: not production, **and** `ADMIN_LOCAL_BYPASS=1`
 * set deliberately. Both come from the environment, never from a request, so no
 * header, cookie or query string can talk a deployed site into believing it is
 * local — and the second one has to be typed by a person who meant it.
 *
 * **On the deployed site**, a valid TOTP session cookie is required for every
 * read and every write. There is no other door: the page itself renders nothing
 * useful without one, and each API route re-checks independently rather than
 * trusting that the page would not have rendered.
 *
 * That last point is the one worth keeping. Route handlers are directly
 * addressable — a client can POST to `/api/admin/depth` without ever loading
 * `/admin` — so authorisation checked only at the page is authorisation not
 * checked at all.
 */

export type AdminAccess =
  | { allowed: true; mode: 'local' }
  | { allowed: true; mode: 'session' }
  | { allowed: false; reason: 'unauthenticated' | 'misconfigured' | 'cross_origin' };

/**
 * True only for a development server whose operator has explicitly opted out of
 * the login. Two conditions, deliberately: see the note above for the
 * `NODE_ENV=test` hole this closes.
 */
export function isLocalAdmin(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ADMIN_LOCAL_BYPASS === '1';
}

/**
 * Cross-origin write protection.
 *
 * The session cookie is `SameSite=Strict`, which is already a strong defence —
 * a cross-site form post does not carry it. This is the second layer, because
 * `SameSite` is a browser behaviour and this check is ours: it does not depend
 * on the visitor's browser being recent, or on the cookie being the only way a
 * request could ever be authorised.
 *
 * Only `Origin` is trusted. `Referer` is omitted by privacy settings and by
 * some proxies often enough that requiring it would break real requests, and
 * accepting it when `Origin` is absent would hand an attacker the weaker header
 * to forge.
 *
 * A request with **no** `Origin` is allowed: that is a same-origin navigation, a
 * server-to-server call, or `curl`. None of those is a CSRF vector, because CSRF
 * is specifically a browser being told to act by another site — and a browser
 * always sends `Origin` on a cross-origin write.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('host');
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    // An unparseable Origin is not a same-origin request by any reading.
    return false;
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

export function checkAdminAccess(request: Request): AdminAccess {
  /*
   * Checked before the bypass, not after. A local development server is exactly
   * the place where a page on another origin might try to reach `localhost:3000`
   * — and the bypass means there is no session cookie standing in the way.
   */
  if (!isSameOrigin(request)) return { allowed: false, reason: 'cross_origin' };

  if (isLocalAdmin()) return { allowed: true, mode: 'local' };

  try {
    const cookie = readCookie(request, ADMIN_COOKIE_NAME);
    return verifyAdminSession(cookie)
      ? { allowed: true, mode: 'session' }
      : { allowed: false, reason: 'unauthenticated' };
  } catch {
    /*
     * `verifyAdminSession` throws only when `ADMIN_SESSION_SECRET` is missing
     * in production — a configuration fault, not a failed login. It is
     * reported as its own reason so the deployment can be fixed, and it still
     * denies access: a server that cannot verify a session must not assume the
     * session was good.
     */
    return { allowed: false, reason: 'misconfigured' };
  }
}
