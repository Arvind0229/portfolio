import { NextResponse } from 'next/server';
import { clearSessionCookie, createAdminSession, sessionCookie } from '@/lib/admin/session';
import { isLocalAdmin } from '@/lib/admin/guard';
import { verifyTotp } from '@/lib/admin/totp';
import { clientKeyFromHeaders, createRateLimiter } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 512;

/**
 * Deliberately far tighter than the assistant's limit.
 *
 * A six-digit code is a million possibilities, which sounds like plenty until
 * you notice an unthrottled attacker can try them all in an afternoon, and that
 * each code stays valid for ninety seconds across the skew window. Ten attempts
 * an hour turns "an afternoon" into a number of years, and it costs the one
 * legitimate user nothing: he opens the app, reads the code, types it once.
 *
 * The burst ceiling is separate and small, so a script cannot spend the whole
 * hourly budget in one second and then wait.
 */
const LOGIN_RATE_LIMIT = {
  limit: 10,
  windowMs: 60 * 60 * 1000,
  burstLimit: 3,
  burstWindowMs: 30 * 1000,
  maxKeys: 5_000,
} as const;

const limiter = createRateLimiter(LOGIN_RATE_LIMIT);

interface LoginBody {
  ok: boolean;
  error?: string;
}

function json(body: LoginBody, status: number, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: Request): Promise<NextResponse<LoginBody>> {
  if (isLocalAdmin()) {
    // Nothing to sign in to: the local page never asks. Returning success
    // rather than 404 keeps one client for both modes.
    return json({ ok: true }, 200);
  }

  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) {
    // No secret means sign-in is not configured, and a server that cannot
    // verify must refuse. The message says which variable is missing because
    // this can only be read by whoever deployed it — an attacker gets the same
    // 503 whether or not they know what it means.
    return json(
      { ok: false, error: 'Sign-in is not configured on this deployment (ADMIN_TOTP_SECRET).' },
      503,
    );
  }

  const rate = limiter.check(clientKeyFromHeaders(request.headers));
  if (!rate.allowed) {
    return json({ ok: false, error: 'Too many attempts. Try again later.' }, 429, {
      'Retry-After': String(rate.retryAfterSeconds),
    });
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'Request body is too large.' }, 413);
  }

  let code: unknown;
  try {
    const body: unknown = await request.json();
    code = (body as Record<string, unknown> | null)?.code;
  } catch {
    return json({ ok: false, error: 'Expected JSON.' }, 400);
  }

  if (typeof code !== 'string' || !verifyTotp(code, secret)) {
    // One message for every failure. Distinguishing "wrong code" from "expired
    // code" from "malformed" would tell an attacker which of their assumptions
    // was correct, and tells the honest user nothing they can act on.
    return json({ ok: false, error: 'That code did not work. Check the app and try again.' }, 401);
  }

  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(createAdminSession()) });
}

export async function DELETE(): Promise<NextResponse<LoginBody>> {
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
