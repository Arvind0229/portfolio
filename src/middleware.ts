import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * One gate in front of everything admin, at the edge.
 *
 * ## Why this exists when every route already checks
 *
 * It is not a replacement for those checks and must never become one. Route
 * handlers are directly addressable, so authorisation checked only here would
 * be authorisation that a new route silently opts out of by existing.
 *
 * What it adds is that a route which **forgets** to check is no longer open.
 * Today every handler calls `checkAdminAccess`; the risk is the handler written
 * six months from now by someone who did not read this file. Defence in depth,
 * with the cheap layer first.
 *
 * ## Why it is deliberately thin
 *
 * Middleware runs on the Edge runtime, where `node:crypto` is unavailable — so
 * the HMAC that actually verifies a session cannot run here. This checks only
 * that a session cookie is *present*, and the route then proves it is *valid*.
 *
 * That split is the honest one: this layer turns "no credential at all" into a
 * 401 without waking a Node function, and makes no claim about authenticity.
 * A forged cookie gets past this and is rejected a few milliseconds later by
 * `verifyAdminSession`, which is the only thing that can tell.
 *
 * ## The local bypass
 *
 * `ADMIN_LOCAL_BYPASS` is read here too, so a development server behaves the
 * same at both layers. It is read from the environment, never from the request.
 */
const COOKIE = 'ag_admin';

function bypassed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ADMIN_LOCAL_BYPASS === '1';
}

export function middleware(request: NextRequest) {
  if (bypassed()) return NextResponse.next();

  // The login endpoint is how a session is obtained, so it cannot require one.
  // It carries its own rate limit and its own TOTP check.
  if (request.nextUrl.pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }

  if (request.cookies.has(COOKIE)) return NextResponse.next();

  /*
   * An API caller gets JSON, a browser gets the page.
   *
   * `/admin` is allowed through without a cookie on purpose: the page renders
   * the sign-in form and nothing else until `GET /api/admin/depth` answers, so
   * redirecting it would leave nowhere to sign in from. The data behind it is
   * what is protected, and that is an API path.
   */
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
