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
 * the one person who is already sitting in front of it. This mode is decided by
 * `NODE_ENV`, which is set by the framework, never by a request — so no header,
 * cookie or query string can talk the deployed site into believing it is local.
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
  | { allowed: false; reason: 'unauthenticated' | 'misconfigured' };

/** True when the process is a local development server. */
export function isLocalAdmin(): boolean {
  return process.env.NODE_ENV !== 'production';
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
