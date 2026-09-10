/**
 * Where an admin edit actually lands.
 *
 * ## One artifact, two transports
 *
 * Arvind edits from two places and they must not drift. On his laptop the site
 * runs from the working tree, so a save is a file write and the dev server
 * reloads. On the deployed site there is no working tree to write to — a
 * serverless filesystem is read-only and thrown away — so a save is a commit to
 * the repository, and the deployment that follows rebuilds with it.
 *
 * Both paths produce *the same file at the same path*. That is what keeps the
 * two modes honest: there is no database holding a second copy of the truth,
 * no sync step, and no state where the live site knows something the repo does
 * not. `src/data` remains the single source of truth exactly as it was.
 *
 * The cost of the commit path is that a live edit takes a minute or two to
 * appear, because a deployment has to run. That is stated in the admin UI
 * rather than hidden behind a spinner that implies otherwise.
 *
 * ## Paths are not accepted from the client
 *
 * `WRITABLE` is the complete list of files this system can touch, and callers
 * choose by key, never by path. Path traversal is not filtered here — it is
 * unreachable, because no string from a request is ever used to build a
 * filesystem path or an API URL.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const WRITABLE = {
  projectDepth: 'src/data/project-depth.json',
  resume: 'public/resume.pdf',
} as const;

export type WritableKey = keyof typeof WRITABLE;

export interface ContentWriter {
  readonly mode: 'local' | 'github';
  read(key: WritableKey): Promise<Buffer | null>;
  write(key: WritableKey, content: Buffer, message: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Local                                                               */
/* ------------------------------------------------------------------ */

function localPath(key: WritableKey): string {
  // `process.cwd()` is the project root under `next dev`. This writer is only
  // ever constructed in development (see `getContentWriter`), where that holds.
  return path.join(process.cwd(), WRITABLE[key]);
}

export function createLocalWriter(): ContentWriter {
  return {
    mode: 'local',
    async read(key) {
      try {
        return await readFile(localPath(key));
      } catch {
        // Absent is a legitimate state — no resume uploaded yet, no depth file
        // on a fresh clone. The caller decides what that means.
        return null;
      }
    },
    async write(key, content) {
      await writeFile(localPath(key), content);
    },
  };
}

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */

export interface GitHubConfig {
  /** "owner/repo". */
  repository: string;
  branch: string;
  token: string;
  /** Shown as the commit author. */
  authorName: string;
  authorEmail: string;
}

export function gitHubConfigFromEnv(): GitHubConfig | null {
  const repository = process.env.ADMIN_GITHUB_REPO;
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!repository || !token) return null;

  return {
    repository,
    token,
    branch: process.env.ADMIN_GITHUB_BRANCH ?? 'main',
    authorName: process.env.ADMIN_GITHUB_AUTHOR_NAME ?? 'Arvind Gupta',
    authorEmail: process.env.ADMIN_GITHUB_AUTHOR_EMAIL ?? 'arvind@users.noreply.github.com',
  };
}

interface ContentsResponse {
  sha?: string;
  content?: string;
  encoding?: string;
}

export function createGitHubWriter(config: GitHubConfig): ContentWriter {
  const base = `https://api.github.com/repos/${config.repository}/contents`;

  const headers = {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'arvind-portfolio-admin',
  };

  async function fetchMeta(key: WritableKey): Promise<ContentsResponse | null> {
    const url = `${base}/${WRITABLE[key]}?ref=${encodeURIComponent(config.branch)}`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GitHub read failed (${response.status})`);
    }
    return (await response.json()) as ContentsResponse;
  }

  return {
    mode: 'github',

    async read(key) {
      const meta = await fetchMeta(key);
      if (!meta?.content) return null;
      return Buffer.from(meta.content, (meta.encoding as BufferEncoding) ?? 'base64');
    },

    async write(key, content, message) {
      /*
       * The `sha` of the current file is required by the Contents API for an
       * update and must be omitted for a create. It is also the concurrency
       * check: if the file changed between this read and this write, GitHub
       * rejects the request with 409 rather than silently overwriting. For a
       * single user that is rare, but "rare" and "cannot happen" are different,
       * and the difference here is a lost edit.
       */
      const existing = await fetchMeta(key);

      const response = await fetch(`${base}/${WRITABLE[key]}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          content: content.toString('base64'),
          branch: config.branch,
          committer: { name: config.authorName, email: config.authorEmail },
          ...(existing?.sha ? { sha: existing.sha } : {}),
        }),
      });

      if (!response.ok) {
        // The body can carry the token in an echoed request under some error
        // shapes, so only the status is surfaced. The route turns this into a
        // user-facing message that says what to do, not what broke internally.
        throw new Error(`GitHub write failed (${response.status})`);
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Selection                                                           */
/* ------------------------------------------------------------------ */

export interface WriterSelection {
  writer: ContentWriter | null;
  /** Why there is no writer, for a message the user can act on. */
  reason?: string;
}

/**
 * Picks the writer for the current environment.
 *
 * Development always writes to disk, even when GitHub credentials happen to be
 * present. Otherwise a local experiment would commit to the real repository,
 * and the first time that surprises anyone it will be with a half-finished
 * edit.
 */
export function getContentWriter(): WriterSelection {
  if (process.env.NODE_ENV !== 'production') {
    return { writer: createLocalWriter() };
  }

  const config = gitHubConfigFromEnv();
  if (!config) {
    return {
      writer: null,
      reason:
        'Saving from the live site needs ADMIN_GITHUB_REPO and ADMIN_GITHUB_TOKEN to be set. Until then, edit from the admin page on your laptop.',
    };
  }

  return { writer: createGitHubWriter(config) };
}
