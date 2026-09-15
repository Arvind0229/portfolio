import raw from '@/data/experience.json';
import { type Company, companyById } from '@/data/companies';
import { id as safeId, isRecord, str, strList } from '@/lib/content/validate';
import type { ExperienceItem } from '@/types';

/**
 * Roles, each referencing an employer rather than repeating it.
 *
 * ## The shape of the change
 *
 * This file used to be a TypeScript literal holding both the role and a profile
 * of the company it was at. The company half moved to `companies.json` and what
 * is left here is the role, plus a `companyId`. Why, in full, is in
 * `companies.ts` and ADR-002; the short version is that a career has more roles
 * than employers, and duplicated facts drift.
 *
 * ## Nothing downstream changed
 *
 * `experience` below is still a `readonly ExperienceItem[]` with exactly the
 * fields it always had. The join happens here, once, and the public sections
 * and the whole AI knowledge layer read the same shape they did before — which
 * is the only reason a change this structural could be made without touching
 * the retrieval code that is the most carefully built part of the repository.
 *
 * `highlights` is the interesting one: responsibilities and achievements are
 * separate fields now, because a form that asks for both gets better answers
 * than one box labelled "highlights". They are concatenated back into a single
 * `highlights` array for consumers, responsibilities first, so the ordering a
 * reader sees is unchanged.
 */
export interface ExperienceRecord {
  readonly id: string;
  readonly companyId: string;
  readonly designation: string;
  /** Falls back to the company's location when the role does not state one. */
  readonly location: string;
  readonly employmentType: string;
  readonly start: string;
  /** Empty when `current` — the display reads "Present". */
  readonly end: string;
  readonly current: boolean;
  readonly summary: string;
  readonly responsibilities: readonly string[];
  readonly achievements: readonly string[];
  readonly technologies: readonly string[];
  /** Project ids this role produced. Unresolved ids are simply not linked. */
  readonly projectIds: readonly string[];
  /** Lower sorts first. Ties fall back to the order in the file. */
  readonly order: number;
  /** Hidden roles stay in the file and off the site — a draft, not a delete. */
  readonly visible: boolean;
}

function parseRecord(value: unknown): ExperienceRecord | null {
  if (!isRecord(value)) return null;

  const id = safeId(value.id);
  const companyId = safeId(value.companyId);
  const designation = str(value.designation, 160);
  // Without any one of these there is nothing to render: no id means no React
  // key, no company means a blank employer, no designation means a card with no
  // job title on it.
  if (!id || !companyId || !designation) return null;

  const order = typeof value.order === 'number' && Number.isFinite(value.order)
    ? Math.trunc(value.order)
    : Number.MAX_SAFE_INTEGER;

  return {
    id,
    companyId,
    designation,
    location: str(value.location, 120) ?? '',
    employmentType: str(value.employmentType, 60) ?? '',
    start: str(value.start, 40) ?? '',
    end: str(value.end, 40) ?? '',
    current: value.current === true,
    summary: str(value.summary, 2_000) ?? '',
    responsibilities: strList(value.responsibilities, 1_000, 40),
    achievements: strList(value.achievements, 1_000, 40),
    technologies: strList(value.technologies, 80, 40),
    projectIds: strList(value.projectIds, 64, 20),
    order,
    // Absent means visible. A role that disappears because someone forgot to
    // write `"visible": true` is a worse default than one that has to be hidden
    // deliberately.
    visible: value.visible !== false,
  };
}

export function parseExperienceRecords(value: unknown): readonly ExperienceRecord[] {
  /*
   * `{ roles: [...] }` on disk, a bare array coming back from the admin panel
   * — the route returns the parsed value and the panel PUTs it unchanged, so
   * the parser must accept its own output. Checking the array case *first*
   * matters: an `isRecord` guard ahead of it rejects arrays outright, which is
   * how the same mistake silently disabled saving for skills.
   */
  const source = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.roles)
      ? value.roles
      : [];

  const out: ExperienceRecord[] = [];
  const seen = new Set<string>();
  for (const entry of source) {
    const record = parseRecord(entry);
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    out.push(record);
  }
  return out;
}

export const experienceRecords: readonly ExperienceRecord[] = parseExperienceRecords(raw);

/** "Oct 2023 – Present", or "Jul 2021 – Feb 2023". */
function formatPeriod(record: ExperienceRecord): string {
  const end = record.current ? 'Present' : record.end;
  if (!record.start) return end;
  return end ? `${record.start} – ${end}` : record.start;
}

/**
 * Join a role to its employer, producing the shape every consumer already reads.
 *
 * Returns `null` for a dangling `companyId`. That is the deliberate behaviour:
 * a role whose employer is missing would otherwise render with a blank company
 * name in the headline and a card that reads as broken. Dropping it is visible
 * in the admin panel — the role is there, it simply is not on the site — which
 * is a better failure than shipping the blank.
 */
function join(record: ExperienceRecord, company: Company | null): ExperienceItem | null {
  if (!company) return null;

  return {
    id: record.id,
    company: company.name,
    companyProfile: company.description
      ? {
          sector: company.industry,
          what: company.description,
          relevance: company.relevance,
        }
      : undefined,
    role: record.designation,
    location: record.location || company.location,
    start: record.start,
    end: record.current ? 'Present' : record.end,
    period: formatPeriod(record),
    current: record.current,
    summary: record.summary,
    /*
     * Achievements first.
     *
     * Splitting one `highlights` list into two fields necessarily reorders it,
     * and the first arrangement tried — responsibilities then achievements —
     * pushed "Delivered 80+ production automations single-handedly" from second
     * in the list to last. That is his strongest line and a recruiter reads the
     * first two bullets.
     *
     * So outcomes lead and duties follow, which is the ordering a résumé would
     * use anyway. Nothing is added or dropped: a test asserts the joined list is
     * the same set of lines it was before the split.
     */
    highlights: [...record.achievements, ...record.responsibilities],
    technologies: record.technologies,
  };
}

/**
 * What the site and the assistant read. Unchanged in shape from before the
 * company split, which is the whole point.
 */
export const experience: readonly ExperienceItem[] = experienceRecords
  .filter((record) => record.visible)
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((record) => join(record, companyById(record.companyId)))
  .filter((item): item is ExperienceItem => item !== null);
