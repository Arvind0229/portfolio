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

  it('never repeats the token or GitHub’s own text', async () => {
    answer(`denied for ${config.token}`, 403);
    const error = await failure();
    const text = `${String(error)} ${describeWriteFailure(error, 'github')}`;
    expect(text).not.toContain(config.token);
    expect(text).not.toContain('denied for');
  });
});
