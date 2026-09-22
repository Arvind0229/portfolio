import type { SkillGroup } from '@/types';
import raw from '@/data/skills.json';
import { id, isRecord, str, strList } from '@/lib/content/validate';

/**
 * Grouped exactly as the resume groups them. No proficiency percentages —
 * invented numbers are worse than no numbers, and the projects section already
 * shows where each technology was actually used.
 */
/**
 * The stack, grouped as the resume groups it.
 *
 * Read from `skills.json`, which the admin panel writes. The shape is unchanged
 * — `skillGroups` is what the skills section, the search index and the AI
 * knowledge layer all consume, so moving the source behind a validator changed
 * no consumer.
 */
export const skillGroups: readonly SkillGroup[] = parseSkillGroups(raw);

export const allSkills: readonly string[] = Array.from(
  new Set(skillGroups.flatMap((group) => group.skills)),
);

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validate and drop, never throw — the contract every content file follows.
 *
 * A group with no skills in it is dropped rather than rendered: an empty card
 * with a heading and nothing under it reads as a loading state that never
 * finished, which is worse than the group being absent.
 *
 * Duplicate ids are refused because the id is a React key and a test handle,
 * and two cards sharing one is a rendering bug that only shows up when the
 * list reorders.
 */
export function parseSkillGroups(value: unknown): readonly SkillGroup[] {
  /*
   * Two shapes, and both are real.
   *
   * On disk this is `{ groups: [...] }`. But the admin route hands the *parsed*
   * value straight back on a save — the panel loads `data` (an array), edits it
   * and PUTs it — so the parser has to accept its own output as well as the
   * file it came from.
   *
   * It did not, and the effect was invisible: a bare array failed `isRecord`,
   * parsing produced `[]`, and saving skills quietly did nothing. Nothing
   * errored, nothing logged, and the round-trip test that existed only checked
   * the *file* shape, which was never the broken one. Found by the company
   * editor hitting the same wall.
   */
  const source = Array.isArray(value) ? value : isRecord(value) ? value.groups : null;
  if (!Array.isArray(source)) return [];

  const out: SkillGroup[] = [];
  const seen = new Set<string>();

  for (const entry of source) {
    if (!isRecord(entry)) continue;

    const name = str(entry.name, 80);
    // A group added in the admin panel arrives without an id; it gets one
    // from its name (CHANGE-011).
    const groupId =
      entry.id !== undefined
        ? id(entry.id)
        : id(
        (name ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      );
    if (!groupId || !name || seen.has(groupId)) continue;

    const skills = strList(entry.skills, 80, 40);
    if (skills.length === 0) continue;

    seen.add(groupId);
    out.push({
      id: groupId,
      name,
      description: str(entry.description, 300) ?? '',
      skills,
    });

    if (out.length >= 20) break;
  }

  return out;
}
