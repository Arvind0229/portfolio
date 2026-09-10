import { describe, expect, it } from 'vitest';
import {
  ADMIN_SESSION_TTL_MS,
  clearSessionCookie,
  createAdminSession,
  sessionCookie,
  verifyAdminSession,
} from '@/lib/admin/session';

const SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
const NOW = 1_700_000_000_000;

describe('admin session token', () => {
  it('accepts a token it just issued', () => {
    const token = createAdminSession(NOW, SECRET);
    expect(verifyAdminSession(token, NOW, SECRET)).toBe(true);
  });

  it('expires after the stated lifetime', () => {
    const token = createAdminSession(NOW, SECRET);
    expect(verifyAdminSession(token, NOW + ADMIN_SESSION_TTL_MS - 1000, SECRET)).toBe(true);
    expect(verifyAdminSession(token, NOW + ADMIN_SESSION_TTL_MS + 1000, SECRET)).toBe(false);
  });

  it('rejects a token signed with a different secret', () => {
    // This is what makes rotating ADMIN_SESSION_SECRET a working "log everyone
    // out" button — the only revocation a stateless session has.
    const token = createAdminSession(NOW, SECRET);
    expect(verifyAdminSession(token, NOW, `${SECRET}-rotated`)).toBe(false);
  });

  it('rejects a tampered payload', () => {
    const token = createAdminSession(NOW, SECRET);
    const [encoded, signature] = token.split('.');
    const forged = JSON.parse(
      Buffer.from(encoded as string, 'base64').toString('utf8'),
    ) as Record<string, unknown>;
    forged.exp = NOW + 10 * 365 * 24 * 60 * 60 * 1000;

    const reEncoded = Buffer.from(JSON.stringify(forged))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // The old signature cannot cover the new payload.
    expect(verifyAdminSession(`${reEncoded}.${signature}`, NOW, SECRET)).toBe(false);
  });

  it('rejects a token that claims to be issued in the future', () => {
    const token = createAdminSession(NOW + 60 * 60 * 1000, SECRET);
    expect(verifyAdminSession(token, NOW, SECRET)).toBe(false);
  });

  it('rejects malformed values without throwing', () => {
    for (const bad of [
      undefined,
      null,
      '',
      '.',
      'nodot',
      '.onlysignature',
      'payload.',
      'not-base64!!.signature',
      'a'.repeat(5000),
    ]) {
      expect(() => verifyAdminSession(bad as string | undefined, NOW, SECRET)).not.toThrow();
      expect(verifyAdminSession(bad as string | undefined, NOW, SECRET)).toBe(false);
    }
  });

  it('issues a different token each time', () => {
    const tokens = new Set(Array.from({ length: 10 }, () => createAdminSession(NOW, SECRET)));
    expect(tokens.size).toBe(10);
  });
});

describe('cookie attributes', () => {
  it('is HttpOnly, SameSite=Strict and Secure in production', () => {
    const cookie = sessionCookie('abc.def', true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/');
  });

  it('drops Secure off https so a local dev login actually works', () => {
    // Not a weakening: a Secure cookie is never stored over plain http, so
    // keeping it in development would make the admin page impossible to use on
    // localhost while looking, from the browser's side, like a broken login.
    expect(sessionCookie('abc.def', false)).not.toContain('Secure');
  });

  it('clears with Max-Age=0 and an empty value', () => {
    const cookie = clearSessionCookie(true);
    expect(cookie).toContain('Max-Age=0');
    expect(cookie.startsWith('ag_admin=;')).toBe(true);
  });
});
