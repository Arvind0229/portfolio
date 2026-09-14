import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAdminAccess, isLocalAdmin, isSameOrigin } from '@/lib/admin/guard';

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://arvindsportfolio.vercel.app/api/admin/depth', { headers });
}

describe('the local bypass', () => {
  it('is off unless it is asked for explicitly', () => {
    /*
     * The hole this closes.
     *
     * The bypass used to be `NODE_ENV !== 'production'` alone, so a build run
     * with NODE_ENV=test — CI, a staging box, a misconfigured container —
     * served a fully unauthenticated admin panel. Nothing said so and no test
     * would have caught it.
     */
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ADMIN_LOCAL_BYPASS', '');
    expect(isLocalAdmin()).toBe(false);

    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ADMIN_LOCAL_BYPASS', '');
    expect(isLocalAdmin()).toBe(false);
  });

  it('is on only with both conditions', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ADMIN_LOCAL_BYPASS', '1');
    expect(isLocalAdmin()).toBe(true);
  });

  it('can never be turned on in production', () => {
    // The value is deliberately meaningless there — production has no bypass.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_LOCAL_BYPASS', '1');
    expect(isLocalAdmin()).toBe(false);
  });

  it('rejects near-misses rather than anything truthy', () => {
    vi.stubEnv('NODE_ENV', 'development');
    for (const value of ['true', 'yes', '0', 'on', ' 1', '1 ']) {
      vi.stubEnv('ADMIN_LOCAL_BYPASS', value);
      expect(isLocalAdmin(), `${JSON.stringify(value)} enabled the bypass`).toBe(false);
    }
  });
});

describe('cross-origin writes', () => {
  it('allows a request from the same host', () => {
    expect(
      isSameOrigin(
        request({
          origin: 'https://arvindsportfolio.vercel.app',
          host: 'arvindsportfolio.vercel.app',
        }),
      ),
    ).toBe(true);
  });

  it('rejects another site posting to us', () => {
    expect(
      isSameOrigin(
        request({ origin: 'https://evil.example', host: 'arvindsportfolio.vercel.app' }),
      ),
    ).toBe(false);
  });

  it('is not fooled by a host that merely starts the same', () => {
    // `arvindsportfolio.vercel.app.evil.example` is a different site.
    expect(
      isSameOrigin(
        request({
          origin: 'https://arvindsportfolio.vercel.app.evil.example',
          host: 'arvindsportfolio.vercel.app',
        }),
      ),
    ).toBe(false);
  });

  it('allows a request with no Origin at all', () => {
    /*
     * Deliberate. CSRF is a browser being told to act by another site, and a
     * browser always sends Origin on a cross-origin write. No Origin means a
     * same-origin navigation, curl, or a server — none of which is the attack.
     * Refusing these would break the admin panel's own first load.
     */
    expect(isSameOrigin(request({ host: 'arvindsportfolio.vercel.app' }))).toBe(true);
  });

  it('rejects an unparseable Origin', () => {
    expect(isSameOrigin(request({ origin: 'not a url', host: 'x.test' }))).toBe(false);
  });

  it('blocks a cross-origin caller even when the local bypass is on', () => {
    /*
     * The order matters: a development server is exactly where a page on
     * another origin might reach localhost, and the bypass means there is no
     * session cookie standing in the way.
     */
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ADMIN_LOCAL_BYPASS', '1');
    const access = checkAdminAccess(
      request({ origin: 'https://evil.example', host: 'localhost:3000' }),
    );
    expect(access.allowed).toBe(false);
    expect(access.allowed === false && access.reason).toBe('cross_origin');
  });
});

describe('admin access', () => {
  it('denies an unauthenticated request in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'a-secret-that-is-at-least-32-characters');
    const access = checkAdminAccess(request({ host: 'arvindsportfolio.vercel.app' }));
    expect(access.allowed).toBe(false);
    expect(access.allowed === false && access.reason).toBe('unauthenticated');
  });

  it('reports a missing session secret as misconfiguration, not as a failed login', () => {
    // A server that cannot verify a session must not assume it was good.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_SESSION_SECRET', '');
    const access = checkAdminAccess(
      request({ host: 'arvindsportfolio.vercel.app', cookie: 'ag_admin=whatever' }),
    );
    expect(access.allowed).toBe(false);
    expect(access.allowed === false && access.reason).toBe('misconfigured');
  });
});

describe('secrets stay on the server', () => {
  const SECRET_NAMES = [
    'ADMIN_GITHUB_TOKEN',
    'ADMIN_SESSION_SECRET',
    'ADMIN_TOTP_SECRET',
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
  ];

  async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await walk(full)));
      else out.push(full);
    }
    return out;
  }

  it('never reads a secret from a client component', async () => {
    /*
     * The check that matters, and it is structural rather than a review habit.
     * A `'use client'` module reading `process.env.SECRET` does not fail to
     * build — the value is inlined into the bundle and shipped to every
     * visitor. This asserts no such module exists.
     */
    const files = (await walk(path.join(process.cwd(), 'src'))).filter((file) =>
      /\.(ts|tsx)$/.test(file),
    );

    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const isClient = /^\s*['"]use client['"]/.test(source);
      if (!isClient) continue;
      if (SECRET_NAMES.some((name) => source.includes(name))) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }

    expect(offenders, 'client components referencing a secret').toEqual([]);
  });

  it('marks no secret for the browser with NEXT_PUBLIC_', async () => {
    // The prefix is the one thing that deliberately ships a value to the client.
    const files = (await walk(path.join(process.cwd(), 'src'))).filter((file) =>
      /\.(ts|tsx)$/.test(file),
    );
    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(/NEXT_PUBLIC_([A-Z0-9_]+)/g)) {
        const name = match[1] ?? '';
        if (/SECRET|TOKEN|KEY|PASSWORD/.test(name)) {
          offenders.push(`${path.relative(process.cwd(), file)}: NEXT_PUBLIC_${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('leaves no secret name in the built client bundle', async () => {
    /*
     * The end-to-end version of the two checks above: whatever the source says,
     * this looks at what actually ships. Skipped when there is no build output
     * rather than silently passing on nothing.
     */
    const staticDir = path.join(process.cwd(), '.next', 'static');
    const exists = await stat(staticDir).then(
      () => true,
      () => false,
    );
    if (!exists) {
      // eslint-disable-next-line no-console
      console.warn('no .next/static — run `next build` for the bundle check to mean anything');
      return;
    }

    const files = await walk(staticDir);
    const offenders: string[] = [];
    for (const file of files) {
      if (!/\.(js|css|json)$/.test(file)) continue;
      const source = await readFile(file, 'utf8');
      if (SECRET_NAMES.some((name) => source.includes(name))) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }
    expect(offenders, 'built client files containing a secret name').toEqual([]);
  });
});
