import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  GitHubWriteError,
  createGitHubWriter,
  describeWriteFailure,
} from '@/lib/admin/content-writer';

/*
 * CHANGE-014 — a refused save says why. Before this, every 409/422 from
 * GitHub read as "changed somewhere else, reload", including refusals that
 * no reload can fix.
 */
const config = {
  repository: 'someone/portfolio',
  token: 'github_pat_not_a_real_token',
  branch: 'main',
  authorName: 'Arvind Gupta',
  authorEmail: 'arvind@users.noreply.github.com',
};

function answer(message: string, status: number) {
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(JSON.stringify({ message }), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  );
}

async function failure(): Promise<unknown> {
  return createGitHubWriter(config)
    .write('projectDepth', Buffer.from('{}'), 'msg', 'sha')
    .catch((error: unknown) => error);
}

describe('GitHub refusals', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a sha mismatch is still a conflict', async () => {
    answer('src/data/project-depth.json does not match abc123', 409);
    expect(await failure()).toBeInstanceOf(ConflictError);
  });

  it('a branch rule is not a conflict', async () => {
    answer('Repository rule violations found', 409);
    const error = await failure();
    expect(error).toBeInstanceOf(GitHubWriteError);
    expect((error as GitHubWriteError).kind).toBe('rule');
    expect(describeWriteFailure(error, 'github')).toMatch(/rule on the branch/);
  });

  it('a missing branch is not a conflict', async () => {
    answer('Branch mian not found', 422);
    const error = await failure();
    expect((error as GitHubWriteError).kind).toBe('not-found');
    expect(describeWriteFailure(error, 'github')).toMatch(/ADMIN_GITHUB_BRANCH/);
  });

  it.each([
    [401, 'Bad credentials', /401/],
    [403, 'Resource not accessible by personal access token', /Contents: Read and write/],
    [404, 'Not Found', /ADMIN_GITHUB_REPO/],
  ])('%i says what to fix', async (status, message, expected) => {
    answer(message, status);
    const error = await failure();
    expect(error).toBeInstanceOf(GitHubWriteError);
    expect(describeWriteFailure(error, 'github')).toMatch(expected);
  });

  it('an unexplained 422 is reported with its reason, not as a conflict', async () => {
    answer('Invalid request. committer.email is invalid', 422);
    const error = await failure();
    expect(error).toBeInstanceOf(GitHubWriteError);
    expect(describeWriteFailure(error, 'github')).toMatch(/422: Invalid request\. committer\.email is invalid/);
  });

  it('never repeats the token or GitHub’s own text', async () => {
    answer(`denied for ${config.token}`, 403);
    const error = await failure();
    const text = `${String(error)} ${describeWriteFailure(error, 'github')}`;
    expect(text).not.toContain(config.token);
  });
});

describe('the GitHub configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('forgives a pasted URL, a .git suffix and stray whitespace', async () => {
    const { gitHubConfigFromEnv } = await import('@/lib/admin/content-writer');
    vi.stubEnv('ADMIN_GITHUB_REPO', ' https://github.com/Arvind0229/portfolio.git\n');
    vi.stubEnv('ADMIN_GITHUB_TOKEN', 'tok\n');
    vi.stubEnv('ADMIN_GITHUB_BRANCH', 'main ');
    const config = gitHubConfigFromEnv();
    expect(config?.repository).toBe('Arvind0229/portfolio');
    expect(config?.token).toBe('tok');
    expect(config?.branch).toBe('main');
  });

  it('lets GitHub credit the token owner unless an email is configured', async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      return new Response(JSON.stringify({ content: { sha: 'new' } }), { status: 200 });
    });
    const { authorEmail: _unused, ...withoutEmail } = { ...config, authorEmail: undefined };
    await createGitHubWriter(withoutEmail).write('projectDepth', Buffer.from('{}'), 'msg', 'sha');
    expect(body.committer).toBeUndefined();

    await createGitHubWriter({ ...config, authorEmail: 'me@example.com' }).write(
      'projectDepth',
      Buffer.from('{}'),
      'msg',
      'sha',
    );
    expect(body.committer).toEqual({ name: 'Arvind Gupta', email: 'me@example.com' });
  });
});
