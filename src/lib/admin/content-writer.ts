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
import { createHash } from 'node:crypto';
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

/**
 * What a read saw, so a later write can prove it has not been overtaken.
 *
 * `version` is opaque on purpose — a GitHub blob sha in the deployed case, a
 * content hash locally. Callers pass it back, they never interpret it.
 */
export interface ContentRead {
  content: Buffer;
  version: string;
}

/**
 * Raised when the stored content changed between a read and the write that
 * quoted it. Its own class so a route can answer 409 rather than folding a lost
 * edit into a generic 502.
 */
export class ConflictError extends Error {
  constructor(message = 'The saved content changed since it was read.') {
    super(message);
    this.name = 'ConflictError';
  }
}

export interface ContentWriter {
  readonly mode: 'local' | 'github';
  read(target: WriteTarget): Promise<ContentRead | null>;
  /**
   * `expectedVersion` is the `version` from the read this write is based on.
   *
   * Passing it makes the write conditional: it applies only if nothing else has
   * written since, and raises `ConflictError` otherwise. Omitting it is an
   * unconditional overwrite, which is correct only for content this process
   * just created and nobody else could be holding.
   */
  /**
   * Returns the version of what was just written, so the caller can hand it
   * straight back to the client. Without that, a second save from the same open
   * form would quote the version from *before* the first save and be refused as
   * a conflict with itself — the failure mode that makes optimistic concurrency
   * feel broken rather than protective.
   */
  write(
    target: WriteTarget,
    content: Buffer,
    message: string,
    expectedVersion?: string,
  ): Promise<string>;
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
        const content = await readFile(localPath(target));
        return { content, version: hashVersion(content) };
      } catch {
        // Absent is a legitimate state — no resume uploaded yet, no depth file
        // on a fresh clone. The caller decides what that means.
        return null;
      }
    },
    async write(target, content, _message, expectedVersion) {
      const file = localPath(target);

      /*
       * Locally there is no compare-and-swap, so this re-reads and compares.
       * That leaves a window between the check and the write — acceptable here
       * and nowhere else: this writer only ever runs on one developer's machine
       * against their own filesystem. The deployed path uses GitHub's atomic
       * sha check and does not rely on this.
       */
      if (expectedVersion !== undefined) {
        try {
          const current = await readFile(file);
          if (hashVersion(current) !== expectedVersion) throw new ConflictError();
        } catch (error) {
          if (error instanceof ConflictError) throw error;
          // Not there yet: a create, and nothing to conflict with.
        }
      }

      // Resume files live in a folder that exists today but need not exist in a
      // fresh clone, and a write that fails on a missing directory reads to the
      // admin as "upload failed" with no clue why.
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
      return hashVersion(content);
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
      // Content without a sha would be a read we cannot safely write back
      // against, so it is treated as absent rather than as unversioned.
      if (!meta?.content || !meta.sha) return null;
      return {
        content: Buffer.from(meta.content, (meta.encoding as BufferEncoding) ?? 'base64'),
        version: meta.sha,
      };
    },

    async write(target, content, message, expectedVersion) {
      /*
       * The `sha` is what makes this a compare-and-swap, and which sha is sent
       * decides whether there is any concurrency control at all.
       *
       * This used to fetch the current sha immediately before writing and send
       * that. It reads like a concurrency check and is the opposite of one: the
       * sha is always current by construction, so GitHub's comparison always
       * succeeds and a second admin's save overwrote the first cleanly. The 409
       * the old comment described could not occur. The failure was silent, and
       * the only evidence was a commit history where one person's edit
       * disappeared.
       *
       * Now the **caller's** sha is sent — the one from the read their edit was
       * based on. GitHub compares atomically and answers 409 if anything landed
       * in between, which is a real lost-update check rather than the appearance
       * of one.
       *
       * `expectedVersion === undefined` is still an unconditional write, and the
       * fallback fetch below exists only for that case: the Contents API
       * requires a sha to update an existing file and forbids one on create.
       */
      const existing = expectedVersion === undefined ? await fetchMeta(target) : null;
      const sha = expectedVersion ?? existing?.sha;

      const response = await fetch(`${base}/${targetPath(target)}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          content: content.toString('base64'),
          branch: config.branch,
          committer: { name: config.authorName, email: config.authorEmail },
          ...(sha ? { sha } : {}),
        }),
      });

      /*
       * 409 is a lost update, 422 is GitHub's answer when the sha does not match
       * the file it names. Both mean "somebody else wrote since you read", and
       * both must reach the person as that rather than as a generic failure —
       * the whole point of the change above.
       */
      if (response.status === 409 || response.status === 422) {
        throw new ConflictError();
      }

      if (!response.ok) {
        // The body can carry the token in an echoed request under some error
        // shapes, so only the status is surfaced. The route turns this into a
        // user-facing message that says what to do, not what broke internally.
        throw new Error(`GitHub write failed (${response.status})`);
      }

      /*
       * The commit response carries the new blob sha. Reading it here avoids a
       * second round trip, and a missing one is not an error worth failing a
       * successful write over — the caller's next read will supply it.
       */
      const written = (await response.json().catch(() => null)) as {
        content?: { sha?: string };
      } | null;
      return written?.content?.sha ?? '';
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

/**
 * An opaque version for the local writer.
 *
 * Content-derived rather than mtime-derived: two saves in the same millisecond
 * are indistinguishable by mtime on some filesystems, and a version that can
 * collide is a conflict check that sometimes does not fire.
 */
function hashVersion(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 40);
}
