import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { base32Decode, generateTotpSecret, hotp } from '@/lib/admin/totp';
import { createAdminSession } from '@/lib/admin/session';

/**
 * Route-level tests for the admin surface.
 *
 * These call the exported handlers directly — the same code path Next invokes,
 * with no server and no port. The important consequence is that every request
 * here arrives the way an attacker's would: straight at the handler, without
 * having loaded the page first. That is the shape of the mistake these tests
 * exist to catch, because a guard that only runs when the page renders is not a
 * guard at all.
 *
 * `NODE_ENV` decides which mode the routes are in, and it is read at call time
 * rather than at import time, so each test sets it for the behaviour it is
 * checking. Production is the interesting case: it is the one with a lock on
 * the door.
 */

const SECRET = generateTotpSecret();
const SESSION_SECRET = 'a-test-session-secret-at-least-32-characters';
let ipCounter = 0;

/*
 * `process.env` is a host object in Node, not a plain one: `defineProperty`
 * with a full descriptor throws on it. `vi.stubEnv` is the supported route and
 * unwinds cleanly in `afterEach`, which matters because NODE_ENV decides
 * whether these routes are locked.
 */
function setNodeEnv(value: string): void {
  vi.stubEnv('NODE_ENV', value);
}

function currentCode(): string {
  return hotp(base32Decode(SECRET), Math.floor(Date.now() / 1000 / 30));
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  ipCounter += 1;
  return {
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${ipCounter % 250}`,
    ...extra,
  };
}

beforeEach(() => {
  vi.resetModules();
  process.env.ADMIN_TOTP_SECRET = SECRET;
  process.env.ADMIN_SESSION_SECRET = SESSION_SECRET;
  delete process.env.ADMIN_GITHUB_REPO;
  delete process.env.ADMIN_GITHUB_TOKEN;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* Sign-in                                                             */
/* ------------------------------------------------------------------ */

describe('POST /api/admin/login', () => {
  it('accepts a valid code and sets a hardened cookie', async () => {
    setNodeEnv('production');
    const { POST } = await import('@/app/api/admin/login/route');

    const response = await POST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ code: currentCode() }),
      }),
    );

    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('ag_admin=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
  });

  it('rejects a wrong code without issuing a cookie', async () => {
    setNodeEnv('production');
    const { POST } = await import('@/app/api/admin/login/route');

    const response = await POST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ code: '000000' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('gives the same message for a wrong code as for a malformed one', async () => {
    // Telling the two apart tells an attacker which half of their guess was
    // right, and tells the honest user nothing they can act on.
    setNodeEnv('production');
    const { POST } = await import('@/app/api/admin/login/route');

    const bodies = await Promise.all(
      [{ code: '000000' }, { code: 'abcdef' }, { code: '' }, {}].map(async (payload) => {
        const response = await POST(
          new Request('http://localhost/api/admin/login', {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(payload),
          }),
        );
        return (await response.json()) as { error?: string };
      }),
    );

    expect(new Set(bodies.map((body) => body.error)).size).toBe(1);
  });

  it('refuses to authenticate at all when no secret is configured', async () => {
    setNodeEnv('production');
    delete process.env.ADMIN_TOTP_SECRET;
    const { POST } = await import('@/app/api/admin/login/route');

    const response = await POST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ code: currentCode() }),
      }),
    );

    // 503, not 200: a server that cannot verify must not let anyone in.
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('throttles repeated attempts from one client', async () => {
    setNodeEnv('production');
    const { POST } = await import('@/app/api/admin/login/route');

    const ip = '198.51.100.77';
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await POST(
        new Request('http://localhost/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: JSON.stringify({ code: '000000' }),
        }),
      );
      statuses.push(response.status);
    }

    // Without a limit, a million codes is an afternoon's work.
    expect(statuses).toContain(429);
    const blocked = statuses.filter((status) => status === 429).length;
    expect(blocked).toBeGreaterThan(5);
  });
});

/* ------------------------------------------------------------------ */
/* Authorisation on the data routes                                    */
/* ------------------------------------------------------------------ */

describe('admin data routes require a session in production', () => {
  const cases = [
    {
      name: 'GET /api/admin/depth',
      run: async (cookie?: string) => {
        const { GET } = await import('@/app/api/admin/depth/route');
        return GET(
          new Request('http://localhost/api/admin/depth', {
            headers: cookie ? { cookie } : {},
          }),
        );
      },
    },
    {
      name: 'PUT /api/admin/depth',
      run: async (cookie?: string) => {
        const { PUT } = await import('@/app/api/admin/depth/route');
        return PUT(
          new Request('http://localhost/api/admin/depth', {
            method: 'PUT',
            headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
            body: JSON.stringify({ projects: {} }),
          }),
        );
      },
    },
    {
      name: 'POST /api/admin/resume',
      run: async (cookie?: string) => {
        const { POST } = await import('@/app/api/admin/resume/route');
        const form = new FormData();
        form.append('resume', new File([new Uint8Array(Buffer.from('%PDF-1.7'))], 'r.pdf'));
        return POST(
          new Request('http://localhost/api/admin/resume', {
            method: 'POST',
            headers: cookie ? { cookie } : {},
            body: form,
          }),
        );
      },
    },
  ];

  it.each(cases)('$name rejects an unauthenticated request', async ({ run }) => {
    setNodeEnv('production');
    const response = await run();
    expect(response.status).toBe(401);
  });

  it.each(cases)('$name rejects a forged cookie', async ({ run }) => {
    setNodeEnv('production');
    const forged = createAdminSession(Date.now(), 'a-different-secret-of-sufficient-length!!');
    const response = await run(`ag_admin=${forged}`);
    expect(response.status).toBe(401);
  });

  it.each(cases)('$name rejects an expired cookie', async ({ run }) => {
    setNodeEnv('production');
    const stale = createAdminSession(Date.now() - 4 * 60 * 60 * 1000, SESSION_SECRET);
    const response = await run(`ag_admin=${stale}`);
    expect(response.status).toBe(401);
  });
});

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

describe('PUT /api/admin/depth validation', () => {
  it('refuses a project id that does not exist', async () => {
    // A typo here would write detail no project ever reads, and the only
    // symptom would be an answer that never appears.
    setNodeEnv('development');
    const { PUT } = await import('@/app/api/admin/depth/route');

    const response = await PUT(
      new Request('http://localhost/api/admin/depth', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projects: { 'not-a-real-project': { timeline: '2 weeks' } } }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it('refuses a body that is not an object of projects', async () => {
    setNodeEnv('development');
    const { PUT } = await import('@/app/api/admin/depth/route');

    for (const body of ['null', '{"projects":"nope"}', '{"projects":123}', '[]']) {
      const response = await PUT(
        new Request('http://localhost/api/admin/depth', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body,
        }),
      );
      expect(response.status).toBe(400);
    }
  });
});

describe('POST /api/admin/resume', () => {
  /*
   * Only the wiring is tested here. What counts as a valid PDF is checked
   * exhaustively in `tests/unit/resume-validation.test.ts`, on real buffers —
   * this environment's `FormData` truncates a multi-megabyte body, so a size
   * assertion made through the handler would be measuring the test runner.
   */
  it('rejects a request with no file attached', async () => {
    setNodeEnv('development');
    const { POST } = await import('@/app/api/admin/resume/route');
    const response = await POST(
      new Request('http://localhost/api/admin/resume', {
        method: 'POST',
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('refuses an oversized body from the declared length, before reading it', async () => {
    // The cheap defence: a 40 MB upload should never be buffered to find out
    // it is 40 MB. This is header-driven, so it is deterministic here.
    setNodeEnv('development');
    const { POST } = await import('@/app/api/admin/resume/route');
    const response = await POST(
      new Request('http://localhost/api/admin/resume', {
        method: 'POST',
        headers: { 'content-length': String(40 * 1024 * 1024) },
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(413);
  });

  it('rejects a body that is not a form at all', async () => {
    setNodeEnv('development');
    const { POST } = await import('@/app/api/admin/resume/route');
    const response = await POST(
      new Request('http://localhost/api/admin/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"resume":"nice try"}',
      }),
    );
    expect(response.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/* Local mode                                                          */
/* ------------------------------------------------------------------ */

describe('local development mode', () => {
  it('allows reads without a session, because the port is not reachable', async () => {
    setNodeEnv('development');
    const { GET } = await import('@/app/api/admin/depth/route');
    const response = await GET(new Request('http://localhost/api/admin/depth'));
    expect(response.status).toBe(200);
  });

  it('never writes to GitHub from a dev server, even with credentials present', async () => {
    /*
     * The mistake this prevents is quiet and expensive: a developer with real
     * credentials in `.env.local` experiments on their laptop and commits a
     * half-finished edit to the live repository. Development writes to disk,
     * always.
     */
    setNodeEnv('development');
    process.env.ADMIN_GITHUB_REPO = 'someone/portfolio';
    process.env.ADMIN_GITHUB_TOKEN = 'ghp_not_a_real_token';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { getContentWriter } = await import('@/lib/admin/content-writer');

    expect(getContentWriter().writer?.mode).toBe('local');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports a clear reason when the live site has no GitHub credentials', async () => {
    setNodeEnv('production');
    const { getContentWriter } = await import('@/lib/admin/content-writer');
    const selection = getContentWriter();

    expect(selection.writer).toBeNull();
    expect(selection.reason).toMatch(/ADMIN_GITHUB_REPO/);
  });
});
