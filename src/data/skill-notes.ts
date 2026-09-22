import rawNotes from '@/data/skill-notes.json';
import { projects } from '@/data/projects';
import { allSkills, skillGroups } from '@/data/skills';

/**
 * What each technology in the stack is, and why it earns a place in this kind
 * of work.
 *
 * ## The line this file does not cross
 *
 * Every note here describes the **technology**, not Arvind. "Power BI is
 * Microsoft's BI tool" is a public fact anyone can check. "He built fourteen
 * Power BI dashboards" is a claim about a person, and it would have to come
 * from the resume or not be said at all.
 *
 * So the personal half is never written here — it is **derived** at the bottom
 * of this file from `projects`, which is itself transcribed from the resume's
 * Key Projects section. `usedIn()` returns the case studies that actually list
 * the technology. If a skill appears in none of them, the panel says so rather
 * than reaching for a plausible sentence. That is the whole design: the half
 * that could be embellished is computed, so it cannot be.
 *
 * `why` answers "why would you pick this?" in the context of automating
 * lending operations — again a general statement about the tool, not a claim
 * about what was built with it.
 */

export interface SkillNote {
  /** What the technology is. Public, checkable, and about the tool only. */
  what: string;
  /** Why it is reached for in automation work. Also about the tool only. */
  why: string;
}

/**
 * The notes themselves live in `skill-notes.json` since CHANGE-011, so the
 * admin panel can edit them (Skill notes tab). This parser keeps only
 * complete notes: a skill with an empty `what` or `why` has no note, and the
 * explainer then says so plainly rather than showing half a card.
 */
export function parseSkillNotes(value: unknown): Record<string, SkillNote> {
  const root = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  // Two shapes, like every parser here: the file is `{ notes: {...} }`, and
  // the admin panel saves back the parsed record itself.
  const notes =
    typeof root.notes === 'object' && root.notes !== null
      ? (root.notes as Record<string, unknown>)
      : root;
  const out: Record<string, SkillNote> = {};
  for (const [skill, note] of Object.entries(notes)) {
    if (skill.startsWith('$')) continue;
    const n = typeof note === 'object' && note !== null ? (note as Record<string, unknown>) : {};
    const what = typeof n.what === 'string' ? n.what.trim().slice(0, 800) : '';
    const why = typeof n.why === 'string' ? n.why.trim().slice(0, 800) : '';
    const name = skill.trim().slice(0, 120);
    if (name && what && why) out[name] = { what, why };
  }
  return out;
}

export const skillNotes: Readonly<Record<string, SkillNote>> = parseSkillNotes(rawNotes);

/* ------------------------------------------------------------------ */
/* Derived — never authored                                            */
/* ------------------------------------------------------------------ */

/**
 * Names drift between files: the stack calls it `SQL`, a case study says
 * `Front-End / Recorder Automation` where the stack says
 * `UI / Recorder-based Front-End Automation`, and one project writes
 * `SMS API` for the stack's `SMS API Integration`. Rather than maintain a
 * synonym table that silently rots, both sides are reduced to comparable
 * token sets.
 *
 * Two details in here are the difference between this working and this
 * inventing history:
 *
 *   1. **A slash with spaces separates alternatives; a slash without them does
 *      not.** `SFTP / FTP` is two things, `PL/SQL` is one. Splitting on every
 *      slash turned `PL/SQL` into `{pl, sql}`, which then matched every case
 *      study that lists plain `SQL` — claiming PL/SQL work in five projects
 *      that never mention it.
 *   2. **A subset only counts when it has two or more tokens.** Otherwise any
 *      one-word technology would be swallowed by any longer name containing
 *      that word.
 *
 * Both were caught by the integrity tests, not by reading the output.
 */
const FILLER = new Set(['integration', 'automation', 'based', 'the', 'and', 'of']);

function alternatives(name: string): string[][] {
  return name
    .split(/\s+\/\s+|,/)
    .map((part) =>
      part
        .toLowerCase()
        .replace(/\([^)]*\)/g, '')
        // Join a slash that has no spaces around it, so `pl/sql` stays one word.
        .replace(/\//g, '')
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 0 && !FILLER.has(token)),
    )
    .filter((tokens) => tokens.length > 0);
}

function sameThing(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === setB.size && a.every((token) => setB.has(token))) return true;
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  // A one-token subset is almost always a coincidence, not a synonym.
  if (small.size < 2) return false;
  return [...small].every((token) => large.has(token));
}

function matches(skill: string, technology: string): boolean {
  const left = alternatives(skill);
  const right = alternatives(technology);
  return left.some((a) => right.some((b) => sameThing(a, b)));
}

/** Case studies whose technology list includes this skill. Computed, so it
 *  cannot claim more than `src/data/projects.ts` does. */
export function usedIn(skill: string): ReadonlyArray<{ id: string; title: string }> {
  return projects
    .filter((project) =>
      project.technologies.some((technology) => matches(skill, technology)),
    )
    .map((project) => ({ id: project.id, title: project.title }));
}

/** The stack group a skill belongs to, for context in the panel. */
export function groupOf(skill: string): string | undefined {
  return skillGroups.find((group) => group.skills.includes(skill))?.name;
}

/** Every skill in the stack has a note. Asserted by a test, not by hope. */
export const skillsWithoutNotes: readonly string[] = allSkills.filter(
  (skill) => !(skill in skillNotes),
);
