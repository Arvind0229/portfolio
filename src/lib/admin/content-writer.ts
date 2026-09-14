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
 * choose a target, never a path. Path traversal is not filtered here — it is
 * unreachable, because no string from a request is ever used to build a
 * filesystem path or an API URL.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const WRITABLE = {
  projectDepth: 'src/data/project-depth.json',
  resumeRegistry: 'src/data/resume-registry.json',
} as const;

export type WritableKey = keyof typeof WRITABLE;

/**
 * Resume files are the one target whose path is not fixed, because keeping
 * every uploaded version is what makes rollback possible: a single fixed path
 * would mean each upload destroyed the one before it.
 *
 * So the path is parameterised — and that is exactly the shape the docblock
 * above says is dangerous. The guarantee is preserved a different way:
 *
 *   - the id is **generated on the server** from a timestamp, never taken from
 *     the request, and never derived from the uploaded filename;
 *   - `resumeFileTarget` re-validates it against `RESUME_ID` anyway, so a
 *     future caller that forgets the first rule is rejected here rather than
 *     relied upon to have been careful;
 *   - the extension comes from a two-value union, not from a string.
 *
 * Belt and braces, because the cost of being wrong here is writing an arbitrary
 * file into the repository that then gets served from his domain.
 */
const RESUME_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RESUME_DIR = 'public/resume';

export interface ResumeFileTarget {
  readonly family: 'resumeFile';
  readonly id: string;
  readonly format: 'pdf' | 'docx';
}

export function resumeFileTarget(id: string, format: 'pdf' | 'docx'): ResumeFileTarget {
  if (!RESUME_ID.test(id)) {
    throw new Error(`Refusing to build a resume path from ${JSON.stringify(id)}`);
  }
  return { family: 'resumeFile', id, format };
}

/** The public URL a committed resume file is served from. */
export function resumeFileUrl(target: ResumeFileTarget): string {
  return `/resume/${target.id}.${target.format}`;
}

export type WriteTarget = WritableKey | ResumeFileTarget;

/** The single place a target becomes a path, for both writers. */
export function targetPath(target: WriteTarget): string {
  if (typeof target === 'string') return WRITABLE[target];
  // Re-validated rather than trusted: this function is the last gate before a
  // string becomes a filesystem path or an API URL.
  if (!RESUME_ID.test(target.id)) {
    throw new Error('Invalid resume file id');
  }
  return `${RESUME_DIR}/${target.id}.${target.format}`;
}

export interface ContentWriter {
  readonly mode: 'local' | 'github';
  read(target: WriteTarget): Promise<Buffer | null>;
  write(target: WriteTarget, content: Buffer, message: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Local                                                               */
/* ------------------------------------------------------------------ */

function localPath(target: WriteTarget): string {
  // `process.cwd()` is the project root under `next dev`. This writer is only
  // ever constructed in development (see `getContentWriter`), where that holds.
  return path.join(process.cwd(), targetPath(target));
}

export function createLocalWriter(): ContentWriter {
  return {
    mode: 'local',
    async read(target) {
      try {
        return await readFile(localPath(target));
      } catch {
        // Absent is a legitimate state — no resume uploaded yet, no depth file
        // on a fresh clone. The caller decides what that means.
        return null;
      }
    },
    async write(target, content) {
      const file = localPath(target);
      // Resume files live in a folder that exists today but need not exist in a
      // fresh clone, and a write that fails on a missing directory reads to the
      // admin as "upload failed" with no clue why.
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
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

  async function fetchMeta(target: WriteTarget): Promise<ContentsResponse | null> {
    const url = `${base}/${targetPath(target)}?ref=${encodeURIComponent(config.branch)}`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GitHub read failed (${response.status})`);
    }
    return (await response.json()) as ContentsResponse;
  }

  return {
    mode: 'github',

    async read(target) {
      const meta = await fetchMeta(target);
      if (!meta?.content) return null;
      return Buffer.from(meta.content, (meta.encoding as BufferEncoding) ?? 'base64');
    },

    async write(target, content, message) {
      /*
       * The `sha` of the current file is required by the Contents API for an
       * update and must be omitted for a create. It is also the concurrency
       * check: if the file changed between this read and this write, GitHub
       * rejects the request with 409 rather than silently overwriting. For a
       * single user that is rare, but "rare" and "cannot happen" are different,
       * and the difference here is a lost edit.
       */
      const existing = await fetchMeta(target);

      const response = await fetch(`${base}/${targetPath(target)}`, {
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
