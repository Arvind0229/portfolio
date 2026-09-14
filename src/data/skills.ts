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
  const source = isRecord(value) ? value.groups : null;
  if (!Array.isArray(source)) return [];

  const out: SkillGroup[] = [];
  const seen = new Set<string>();

  for (const entry of source) {
    if (!isRecord(entry)) continue;

    const groupId = id(entry.id);
    const name = str(entry.name, 80);
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
