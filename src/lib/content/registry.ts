import { parseProfileContent } from '@/data/profile';
import { parseResumeRegistry, resumeRegistry } from '@/data/resume-registry';
import { parseSkillGroups } from '@/data/skills';
import bundledProfile from '@/data/profile.json';
import bundledSkills from '@/data/skills.json';
import type { WritableKey } from '@/lib/admin/content-writer';

/**
 * Every admin-editable content file, in one place.
 *
 * ## Why a registry rather than a route per file
 *
 * Profile, skills and whatever comes next differ only in their validator. Three
 * routes would be three copies of the same auth, rate limit, size cap, conflict
 * handling and error shapes — and the fourth copy is where one of them quietly
 * loses a check. One route driven by this table means a new content file is a
 * validator and an entry, and it inherits every protection automatically.
 *
 * ## The allow-list is the security boundary
 *
 * `key` from the URL is looked up here and never used to build a path. A key
 * that is not in this object does not resolve, so there is nothing to escape
 * — the same shape as `WRITABLE` in the writer, for the same reason.
 *
 * ## Validators run on the way in *and* on the way out
 *
 * `parse` is the same function the site uses to read the file at build time.
 * Running it before writing means the stored file can only ever contain what
 * the site can render, and unknown keys are dropped rather than accumulating.
 */
export interface ContentDefinition {
  /** Where the writer puts it. A closed key, never a path. */
  readonly target: WritableKey;
  /** Human label for the admin panel and for error messages. */
  readonly label: string;
  /**
   * Validates and normalises. Must never throw: a malformed field is dropped,
   * so one bad save can never take the public site down.
   */
  readonly parse: (value: unknown) => unknown;
  /** Wraps the parsed value in the file's on-disk shape. */
  readonly serialize: (parsed: unknown) => unknown;
  /** Commit message, so history reads as a change log rather than "update". */
  readonly message: string;
  /**
   * What shipped with this build.
   *
   * Used only when there is no writer — a deployment that can display content
   * but not save it. Without this the panel showed a signed-in admin nothing at
   * all, which is a worse answer than "here it is, saving is not configured".
   */
  readonly bundled: () => unknown;
}

const COMMENT =
  'Written by the admin panel, not by hand. Validated on read and on write — see the parser beside it.';

export const CONTENT: Record<string, ContentDefinition> = {
  profile: {
    target: 'profile',
    label: 'Profile and social links',
    parse: parseProfileContent,
    serialize: (parsed) => ({ $comment: COMMENT, ...(parsed as object) }),
    message: 'Update profile',
    bundled: () => bundledProfile,
  },
  /*
   * Readable here, but written by the resume route.
   *
   * The upload has to move a file and update the pointer as two ordered writes,
   * which is not something a generic content PUT can express. Registering it
   * anyway means the panel reads the version list through the same seam as
   * everything else — and through the *writer*, so a version uploaded five
   * minutes ago on the live site appears before the deployment that bundles it.
   */
  'resume-registry': {
    target: 'resumeRegistry',
    label: 'Resume versions',
    parse: parseResumeRegistry,
    serialize: (parsed) => parsed,
    message: 'Update resume registry',
    bundled: () => resumeRegistry,
  },
  skills: {
    target: 'skills',
    label: 'Skills',
    parse: parseSkillGroups,
    serialize: (parsed) => ({ $comment: COMMENT, groups: parsed }),
    message: 'Update skills',
    bundled: () => bundledSkills,
  },
};

export type ContentKey = keyof typeof CONTENT;

export function contentDefinition(key: string): ContentDefinition | null {
  // `Object.hasOwn` rather than a bare lookup: `CONTENT['constructor']` would
  // otherwise return a function and be treated as a definition.
  return Object.hasOwn(CONTENT, key) ? (CONTENT[key] ?? null) : null;
}
