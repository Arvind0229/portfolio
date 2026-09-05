import { describe, expect, it } from 'vitest';
import {
  clientKeyFromHeaders,
  createMemoryStore,
  createRateLimiter,
} from '@/lib/security/rate-limit';

const config = {
  limit: 5,
  windowMs: 60_000,
  burstLimit: 3,
  burstWindowMs: 10_000,
  maxKeys: 100,
};

describe('createRateLimiter', () => {
  it('allows requests up to the burst limit', () => {
    const limiter = createRateLimiter(config, createMemoryStore());
    const now = Date.now();
    expect(limiter.check('a', now).allowed).toBe(true);
    expect(limiter.check('a', now + 1).allowed).toBe(true);
    expect(limiter.check('a', now + 2).allowed).toBe(true);
  });

  it('blocks a burst and reports when to retry', () => {
    const limiter = createRateLimiter(config, createMemoryStore());
    const now = Date.now();
    limiter.check('a', now);
    limiter.check('a', now + 1);
    limiter.check('a', now + 2);
    const blocked = limiter.check('a', now + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('lets a visitor through again once the burst window passes', () => {
    const limiter = createRateLimiter(config, createMemoryStore());
    const now = Date.now();
    limiter.check('a', now);
    limiter.check('a', now + 1);
    limiter.check('a', now + 2);
    expect(limiter.check('a', now + 11_000).allowed).toBe(true);
  });

  it('enforces the longer window limit too', () => {
    const limiter = createRateLimiter(config, createMemoryStore());
    const now = Date.now();
    // Spread across the window so the burst rule never fires.
    for (let i = 0; i < 5; i += 1) {
      expect(limiter.check('a', now + i * 11_000).allowed).toBe(true);
    }
    expect(limiter.check('a', now + 5 * 11_000).allowed).toBe(false);
  });

  it('tracks visitors independently', () => {
    const limiter = createRateLimiter(config, createMemoryStore());
    const now = Date.now();
    limiter.check('a', now);
    limiter.check('a', now + 1);
    limiter.check('a', now + 2);
    expect(limiter.check('a', now + 3).allowed).toBe(false);
    expect(limiter.check('b', now + 3).allowed).toBe(true);
  });
});

describe('clientKeyFromHeaders', () => {
  it('prefers the left-most forwarded address', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
    expect(clientKeyFromHeaders(headers)).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip and then to a constant', () => {
    expect(clientKeyFromHeaders(new Headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
    expect(clientKeyFromHeaders(new Headers())).toBe('unknown');
  });

  it('strips characters that could poison a key and caps its length', () => {
    const headers = new Headers({ 'x-forwarded-for': `${'9'.repeat(200)}<script>` });
    const key = clientKeyFromHeaders(headers);
    expect(key.length).toBeLessThanOrEqual(64);
    expect(key).not.toContain('<');
  });
});
