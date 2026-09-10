/**
 * Rate limiting.
 *
 * A sliding-window counter behind a small store interface. The default store
 * is in-process, which is correct for a single-instance deployment (Vercel
 * serverless or one container) and honest about its limits: with N instances
 * behind a load balancer each instance enforces its own window, so the
 * effective ceiling is N x limit.
 *
 * That is a deliberate trade-off, not an oversight. A portfolio does not
 * justify running Redis. When it does, implement `RateLimitStore` against
 * Redis/Upstash and pass it to `createRateLimiter` — no other code changes.
 */

export interface RateLimitStore {
  /** Returns the hit timestamps recorded for a key. */
  get(key: string): number[] | undefined;
  set(key: string, hits: number[]): void;
  delete(key: string): void;
  /** Number of tracked keys — used to bound memory. */
  size(): number;
  keys(): IterableIterator<string>;
}

export function createMemoryStore(): RateLimitStore {
  const map = new Map<string, number[]>();
  return {
    get: (key) => map.get(key),
    set: (key, hits) => {
      map.set(key, hits);
    },
    delete: (key) => {
      map.delete(key);
    },
    size: () => map.size,
    keys: () => map.keys(),
  };
}

export interface RateLimitConfig {
  /** Requests allowed within the window. */
  limit: number;
  windowMs: number;
  /** Short burst ceiling, checked over the last `burstWindowMs`. */
  burstLimit: number;
  burstWindowMs: number;
  /** Upper bound on tracked keys, to keep memory bounded under abuse. */
  maxKeys: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowMs: 60_000 * 5,
  burstLimit: 5,
  burstWindowMs: 15_000,
  maxKeys: 5_000,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function createRateLimiter(
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
  store: RateLimitStore = createMemoryStore(),
) {
  function prune(now: number): void {
    if (store.size() <= config.maxKeys) return;
    for (const key of Array.from(store.keys())) {
      const hits = store.get(key);
      if (!hits || hits.length === 0 || now - (hits[hits.length - 1] ?? 0) > config.windowMs) {
        store.delete(key);
      }
      if (store.size() <= config.maxKeys) break;
    }
  }

  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      prune(now);

      const existing = store.get(key) ?? [];
      const hits = existing.filter((timestamp) => now - timestamp < config.windowMs);

      const burstHits = hits.filter((timestamp) => now - timestamp < config.burstWindowMs);
      if (burstHits.length >= config.burstLimit) {
        const oldestBurst = burstHits[0] ?? now;
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((config.burstWindowMs - (now - oldestBurst)) / 1000),
          ),
        };
      }

      if (hits.length >= config.limit) {
        const oldest = hits[0] ?? now;
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((config.windowMs - (now - oldest)) / 1000)),
        };
      }

      hits.push(now);
      store.set(key, hits);

      return {
        allowed: true,
        remaining: Math.max(0, config.limit - hits.length),
        retryAfterSeconds: 0,
      };
    },
  };
}

/**
 * Derives a rate-limit key from request headers.
 *
 * Only the left-most entry of x-forwarded-for is used, and only because the
 * app is expected to run behind a trusted proxy (Vercel, or nginx configured
 * to set it). The header is attacker-controlled in a bare deployment, so the
 * value is length-capped and normalised, and the limiter is treated as abuse
 * mitigation rather than as an authorisation control.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const candidate = forwarded?.split(',')[0]?.trim() || realIp?.trim() || 'unknown';
  return candidate.slice(0, 64).replace(/[^\w.:%-]/g, '');
}
