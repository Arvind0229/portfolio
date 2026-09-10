import raw from '@/data/project-depth.json';
import type { ProjectChallenge, ProjectDecision, ProjectDepth, ProjectFaq } from '@/types';

/**
 * The depth layer, loaded and validated.
 *
 * ## Why this is JSON and everything else in `src/data` is TypeScript
 *
 * Every other data file is written by a person and reviewed as code. This one
 * is written by the admin panel — a form Arvind fills in, on his laptop or on
 * the deployed site. Generating TypeScript from a form means generating source
 * code from user input, and a single unescaped backtick in a project
 * description would stop the site from compiling. JSON has no such edge: it is
 * data going in and data coming out, and `JSON.stringify` is exhaustive about
 * escaping in a way hand-rolled code generation never is.
 *
 * The trade is that the compiler cannot vouch for the file's shape, which is
 * why everything below is validated rather than cast. A `as ProjectDepth` here
 * would be a lie told to the type system about a file that an HTTP route
 * writes.
 *
 * ## Why validation drops bad fields instead of throwing
 *
 * This module is imported by the page and by the AI knowledge layer, so
 * throwing would take the whole site down over one malformed entry. A field
 * that does not validate is dropped, and a dropped field is a question the
 * assistant answers with "that is not in the profile" — which is the same
 * honest answer it gives for a field that was never filled in. The failure
 * mode degrades to silence rather than to a broken build or, worse, to
 * rendering whatever was in the file.
 */

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map(asString).filter((item): item is string => Boolean(item));
  return items.length > 0 ? items : undefined;
}

function asChallenges(value: unknown): readonly ProjectChallenge[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return undefined;
      const record = entry as Record<string, unknown>;
      const challenge = asString(record.challenge);
      const resolution = asString(record.resolution);
      // Both halves or neither: a challenge with no resolution reads as an
      // unsolved problem on his own portfolio, and a resolution with no
      // challenge is an answer to a question nobody asked.
      return challenge && resolution ? { challenge, resolution } : undefined;
    })
    .filter((item): item is ProjectChallenge => Boolean(item));
  return items.length > 0 ? items : undefined;
}

function asDecisions(value: unknown): readonly ProjectDecision[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return undefined;
      const record = entry as Record<string, unknown>;
      const decision = asString(record.decision);
      const why = asString(record.why);
      if (!decision || !why) return undefined;
      const alternatives = asString(record.alternatives);
      return alternatives ? { decision, why, alternatives } : { decision, why };
    })
    .filter((item): item is ProjectDecision => Boolean(item));
  return items.length > 0 ? items : undefined;
}

function asFaq(value: unknown): readonly ProjectFaq[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return undefined;
      const record = entry as Record<string, unknown>;
      const question = asString(record.question);
      const answer = asString(record.answer);
      return question && answer ? { question, answer } : undefined;
    })
    .filter((item): item is ProjectFaq => Boolean(item));
  return items.length > 0 ? items : undefined;
}

export function parseDepth(value: unknown): ProjectDepth | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;

  const depth: ProjectDepth = {
    scale: asStringArray(record.scale),
    systems: asStringArray(record.systems),
    challenges: asChallenges(record.challenges),
    decisions: asDecisions(record.decisions),
    timeline: asString(record.timeline),
    team: asString(record.team),
    failureHandling: asString(record.failureHandling),
    before: asString(record.before),
    after: asString(record.after),
    faq: asFaq(record.faq),
  };

  // An object whose every field validated away is indistinguishable from no
  // depth at all, and returning `{}` would make `project.depth` truthy while
  // carrying nothing — every "has he told us about X" check downstream would
  // then have to test the fields individually.
  const hasAnything = Object.values(depth).some((field) => field !== undefined);
  return hasAnything ? depth : undefined;
}

function loadAll(): Readonly<Record<string, ProjectDepth>> {
  const source = (raw as { projects?: unknown }).projects;
  if (typeof source !== 'object' || source === null) return {};

  const result: Record<string, ProjectDepth> = {};
  for (const [id, value] of Object.entries(source as Record<string, unknown>)) {
    const depth = parseDepth(value);
    if (depth) result[id] = depth;
  }
  return result;
}

/** Keyed by project id. Missing id means the resume-derived baseline only. */
export const projectDepth: Readonly<Record<string, ProjectDepth>> = loadAll();

export function depthFor(projectId: string): ProjectDepth | undefined {
  return projectDepth[projectId];
}
