import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ConflictError,
  createGitHubWriter,
  createLocalWriter,
} from '@/lib/admin/content-writer';

/**
 * The lost-update defect, and the fix.
 *
 * `createGitHubWriter` had no test at all before this — the live save path had
 * never been executed by anything. These run it against a stubbed `fetch`,
 * which is enough to pin the behaviour that matters: which `sha` is sent, and
 * what happens when GitHub refuses.
 */

const config = {
  repository: 'someone/portfolio',
  token: 'not-a-real-token',
  branch: 'main',
  authorName: 'Arvind Gupta',
  authorEmail: 'arvind@users.noreply.github.com',
};

function githubResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('the GitHub writer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the version the caller read, not a freshly fetched one', async () => {
    /*
     * This is the whole bug.
     *
     * The writer used to fetch the current sha immediately before writing and
     * send that. It reads like a concurrency check and is the opposite of one:
     * the sha is current by construction, so GitHub's compare-and-swap always
     * succeeds and a second admin's save overwrites the first cleanly. The
     * conflict could not occur, so nothing ever reported a lost edit.
     */
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return githubResponse({ content: { sha: 'sha-after-write' } });
    });

    const writer = createGitHubWriter(config);
    await writer.write('projectDepth', Buffer.from('{}'), 'msg', 'sha-the-caller-read');

    // Exactly one request: no pre-write GET to discover a sha.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('PUT');
    expect((calls[0]?.body as { sha?: string }).sha).toBe('sha-the-caller-read');
  });

  it('turns a 409 into a conflict the route can report', async () => {
    vi.stubGlobal('fetch', async () => githubResponse({ message: 'conflict' }, 409));
    const writer = createGitHubWriter(config);
    await expect(
      writer.write('projectDepth', Buffer.from('{}'), 'msg', 'stale-sha'),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('treats 422 as a conflict too', async () => {
    // GitHub answers 422 when the sha does not match the file it names — the
    // same "somebody wrote since you read" in a different costume.
    vi.stubGlobal('fetch', async () => githubResponse({ message: 'sha mismatch' }, 422));
    const writer = createGitHubWriter(config);
    await expect(
      writer.write('projectDepth', Buffer.from('{}'), 'msg', 'stale-sha'),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('does not disguise a real failure as a conflict', async () => {
    // A bad token is not a lost update, and telling the person to reload would
    // send them round a loop that cannot resolve.
    vi.stubGlobal('fetch', async () => githubResponse({ message: 'bad credentials' }, 401));
    const writer = createGitHubWriter(config);
    const failure = writer.write('projectDepth', Buffer.from('{}'), 'msg', 'sha');
    await expect(failure).rejects.toThrow(/401/);
    await expect(failure).rejects.not.toBeInstanceOf(ConflictError);
  });

  it('never puts the token in the error it throws', async () => {
    // Error bodies can echo the request, and this string reaches a log.
    vi.stubGlobal('fetch', async () =>
      githubResponse({ message: `denied for ${config.token}` }, 500),
    );
    const writer = createGitHubWriter(config);
    await expect(
      writer.write('projectDepth', Buffer.from('{}'), 'msg', 'sha'),
    ).rejects.toThrow(/^(?!.*not-a-real-token).*$/s);
  });

  it('returns the new version so the next save is not a self-conflict', async () => {
    vi.stubGlobal('fetch', async () => githubResponse({ content: { sha: 'brand-new-sha' } }));
    const writer = createGitHubWriter(config);
    const version = await writer.write('projectDepth', Buffer.from('{}'), 'msg', 'old');
    expect(version).toBe('brand-new-sha');
  });

  it('reads content together with the version it is valid against', async () => {
    vi.stubGlobal('fetch', async () =>
      githubResponse({ content: Buffer.from('{"a":1}').toString('base64'), sha: 'v1' }),
    );
    const writer = createGitHubWriter(config);
    const read = await writer.read('projectDepth');
    expect(read?.content.toString('utf8')).toBe('{"a":1}');
    expect(read?.version).toBe('v1');
  });
});

describe('the local writer', () => {
  let dir: string;
  let cwd: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'writer-'));
    cwd = process.cwd();
    vi.spyOn(process, 'cwd').mockReturnValue(dir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    expect(process.cwd()).toBe(cwd);
  });

  it('round-trips content and version', async () => {
    const writer = createLocalWriter();
    const version = await writer.write('projectDepth', Buffer.from('{"x":1}'), 'msg');
    const read = await writer.read('projectDepth');
    expect(read?.content.toString('utf8')).toBe('{"x":1}');
    expect(read?.version).toBe(version);
  });

  it('refuses a write whose version has been superseded', async () => {
    const writer = createLocalWriter();
    await writer.write('projectDepth', Buffer.from('{"first":1}'), 'first');
    const stale = await writer.read('projectDepth');

    // Somebody else writes.
    await writer.write('projectDepth', Buffer.from('{"second":1}'), 'second');

    await expect(
      writer.write('projectDepth', Buffer.from('{"third":1}'), 'third', stale?.version),
    ).rejects.toBeInstanceOf(ConflictError);

    // And the second write survived — the point of refusing.
    const current = await writer.read('projectDepth');
    expect(current?.content.toString('utf8')).toBe('{"second":1}');
  });

  it('allows a write that quotes the current version', async () => {
    const writer = createLocalWriter();
    await writer.write('projectDepth', Buffer.from('{"a":1}'), 'first');
    const read = await writer.read('projectDepth');
    await expect(
      writer.write('projectDepth', Buffer.from('{"b":2}'), 'second', read?.version),
    ).resolves.toBeTypeOf('string');
  });

  it('treats a missing file as a create rather than a conflict', async () => {
    const writer = createLocalWriter();
    await expect(
      writer.write('projectDepth', Buffer.from('{}'), 'create', 'a-version-of-nothing'),
    ).resolves.toBeTypeOf('string');
  });

  it('creates the folder a resume file needs', async () => {
    // public/resume/ exists in the repo but need not in a fresh clone, and a
    // write failing on a missing directory reads to the admin as "upload
    // failed" with no clue why.
    const { resumeFileTarget } = await import('@/lib/admin/content-writer');
    const writer = createLocalWriter();
    await writer.write(resumeFileTarget('20260914-test', 'pdf'), Buffer.from('%PDF-'), 'msg');
    const written = await readFile(path.join(dir, 'public/resume/20260914-test.pdf'), 'utf8');
    expect(written).toBe('%PDF-');
  });

  it('detects a change made outside the writer', async () => {
    // The conflict check re-reads the file rather than trusting an in-memory
    // record, so an edit from an editor is caught too.
    const writer = createLocalWriter();
    await writer.write('projectDepth', Buffer.from('{"a":1}'), 'first');
    const read = await writer.read('projectDepth');

    await writeFile(path.join(dir, 'src/data/project-depth.json'), '{"edited":true}');

    await expect(
      writer.write('projectDepth', Buffer.from('{"c":3}'), 'third', read?.version),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
