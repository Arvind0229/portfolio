import raw from '@/data/projects.json';
import { publicDepthFor } from '@/data/project-depth';
import { companyById } from '@/data/companies';
import { experienceRecords } from '@/data/experience';
import { skillGroups } from '@/data/skills';
import { id as safeId, isRecord, safeUrl, str, strList } from '@/lib/content/validate';
import type { ProjectCaseStudy, ProjectCategory, ProjectRecord } from '@/types';

/**
 * The case studies, and the relationships that place them.
 *
 * ## What changed, and what deliberately did not
 *
 * This file used to be a hand-written TypeScript literal. It is now a validator
 * and a join over `projects.json`, which the admin panel writes — the same
 * shape as `experience.ts`, for the same reasons (ADR-001, ADR-004).
 *
 * **`projects` still exports `readonly ProjectCaseStudy[]` with exactly the
 * fields it always had.** The public sections, the project page and the whole
 * AI knowledge layer read that export and were not touched. `ProjectRecord` —
 * the stored shape, with the references and the publishing flags — is a
 * separate export for the admin panel and for anything that genuinely needs
 * the relationships.
 *
 * ## Where each fact lives
 *
 * Nothing here copies a company name, a designation or a skill label. A project
 * stores `companyId`, `experienceIds[]` and `skillIds[]`; the accessors below
 * resolve them at build time. That is ADR-002's rule, applied again.
 *
 * ## The one rule that differs from ADR-002
 *
 * A role whose company is missing is **dropped** — a role with a blank employer
 * reads as broken. A project whose company is missing **still renders**, just
 * without the employer line. A project is a thing he built; the employer is
 * context, and losing the context is a smaller harm than hiding the work.
 *
 * That asymmetry is intentional and is recorded in ADR-004 §4, because it is
 * exactly the kind of thing a later reader would otherwise "fix" into
 * consistency.
 */

const CATEGORIES = [
  'Operations Automation',
  'Reporting & BI',
  'Compliance',
  'IT & Access Management',
] as const satisfies readonly ProjectCategory[];

/** The fallback when a stored category is not one we know. */
const DEFAULT_CATEGORY: ProjectCategory = 'Operations Automation';

export const projectCategories = CATEGORIES;

const STATUSES = ['completed', 'ongoing', 'maintained'] as const;
export type ProjectStatus = (typeof STATUSES)[number];

/**
 * Derive an id from a title.
 *
 * Deterministic, URL-safe, and the same function the admin panel uses so that
 * what it previews is what gets stored. The id **is** the URL (ADR-004 §2), so
 * once a project exists this is never run against it again.
 */
export function deriveProjectId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

/** `deriveProjectId`, plus a numeric suffix if that id is already taken. */
export function uniqueProjectId(title: string, taken: Iterable<string>): string {
  const base = deriveProjectId(title) || 'project';
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`.slice(0, 64);
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 64);
}

function parseLinks(value: unknown): ProjectRecord['links'] {
  if (!isRecord(value)) return {};
  const links: Record<string, string> = {};
  for (const key of ['live', 'github', 'caseStudy'] as const) {
    // `safeUrl` refuses `javascript:` and plain http. A link that does not
    // survive it is dropped rather than rendered as a broken or unsafe anchor.
    const url = safeUrl(value[key]);
    if (url) links[key] = url;
  }
  return links;
}

function parseRecord(value: unknown): ProjectRecord | null {
  if (!isRecord(value)) return null;

  const id = safeId(value.id);
  const title = str(value.title, 160);
  // Without an id there is no URL and no React key; without a title there is
  // nothing to show. Everything else can be absent and the page still reads.
  if (!id || !title) return null;

  const declaredCategory = str(value.category, 60);
  const category: ProjectCategory =
    CATEGORIES.find((entry) => entry === declaredCategory) ?? DEFAULT_CATEGORY;

  const declaredStatus = str(value.status, 20);
  const status: ProjectRecord['status'] =
    STATUSES.find((entry) => entry === declaredStatus) ?? '';

  const order =
    typeof value.order === 'number' && Number.isFinite(value.order)
      ? Math.trunc(value.order)
      : Number.MAX_SAFE_INTEGER;

  return {
    id,
    title,
    category,
    businessView: str(value.businessView, 600) ?? '',
    technicalView: str(value.technicalView, 600) ?? '',
    problem: str(value.problem, 2_000) ?? '',
    solution: str(value.solution, 2_000) ?? '',
    role: str(value.role, 600) ?? '',
    process: strList(value.process, 400, 20),
    impact: strList(value.impact, 400, 20),
    technologies: strList(value.technologies, 80, 40),
    companyId: safeId(value.companyId) ?? '',
    experienceIds: strList(value.experienceIds, 64, 10).filter((entry) => safeId(entry)),
    skillIds: strList(value.skillIds, 64, 20).filter((entry) => safeId(entry)),
    year: str(value.year, 20) ?? '',
    status,
    links: parseLinks(value.links),
    featured: value.featured === true,
    // Absent means visible. A project that vanishes because nobody wrote
    // `"visible": true` is a worse default than one hidden on purpose.
    visible: value.visible !== false,
    order,
  };
}

/**
 * Validate and drop, like every parser here: a malformed project is ignored and
 * rubbish yields an empty list rather than throwing. One bad save must never be
 * able to take the site down.
 *
 * Accepts both the file shape (`{ projects: [...] }`) and a bare array, because
 * the admin route hands the *parsed* value straight back on a save and a parser
 * that cannot read its own output silently discards every edit. That mistake
 * shipped once already — see the note in `skills.ts`.
 */
export function parseProjects(value: unknown): readonly ProjectRecord[] {
  const source = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.projects)
      ? value.projects
      : [];

  const out: ProjectRecord[] = [];
  const seen = new Set<string>();
  for (const entry of source) {
    const record = parseRecord(entry);
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    out.push(record);
  }
  return out;
}

export const projectRecords: readonly ProjectRecord[] = parseProjects(raw);

/** Visible projects in display order. The order the site and the admin agree on. */
const ordered: readonly ProjectRecord[] = projectRecords
  .filter((record) => record.visible)
  .slice()
  .sort((a, b) => a.order - b.order);

/**
 * What every existing consumer reads. Shape unchanged from before the
 * migration, which is the entire point of doing it this way.
 */
export const projects: readonly ProjectCaseStudy[] = ordered.map((record) => {
  const { companyId, experienceIds, skillIds, year, status, links, visible, order, ...study } =
    record;
  void companyId;
  void experienceIds;
  void skillIds;
  void year;
  void status;
  void links;
  void visible;
  void order;

  /*
   * `publicDepthFor`, not `depthFor`.
   *
   * This one line is the visibility boundary for the whole site. `projects` is
   * what the public sections, the case-study page and the AI knowledge layer
   * all read, so filtering here filters every consumer at once — rather than
   * asking each of them to remember, which is how one of them eventually
   * forgets and the failure is silent.
   *
   * The admin panel does not read this export; it reads the stored record
   * through its own route, because it has to show Arvind what he wrote in
   * order for him to change it.
   */
  const depth = publicDepthFor(record.id);
  return depth ? { ...study, depth } : study;
});

/* ------------------------------------------------------------------ */
/* Relationship accessors                                              */
/* ------------------------------------------------------------------ */

export interface ProjectRelations {
  /** `null` when the company was removed. The project still renders. */
  readonly company: ReturnType<typeof companyById>;
  readonly roles: readonly { id: string; designation: string }[];
  readonly skills: readonly { id: string; name: string }[];
}

/**
 * Resolve a project's references.
 *
 * Every lookup that misses is **skipped**, never substituted. A removed skill
 * loses its chip; a removed role loses its line; a removed company loses the
 * employer line and nothing else. Nothing invents a placeholder, because a
 * placeholder on this site would be a fact that is not true.
 */
export function relationsFor(id: string): ProjectRelations {
  const record = projectRecords.find((entry) => entry.id === id);
  if (!record) return { company: null, roles: [], skills: [] };

  return {
    company: record.companyId ? companyById(record.companyId) : null,
    roles: record.experienceIds
      .map((roleId) => experienceRecords.find((role) => role.id === roleId))
      .filter((role): role is NonNullable<typeof role> => Boolean(role))
      .map((role) => ({ id: role.id, designation: role.designation })),
    skills: record.skillIds
      .map((skillId) => skillGroups.find((group) => group.id === skillId))
      .filter((group): group is NonNullable<typeof group> => Boolean(group))
      .map((group) => ({ id: group.id, name: group.name })),
  };
}

/** The projects belonging to one company, in display order. */
export function projectsForCompany(companyId: string): readonly ProjectCaseStudy[] {
  const ids = new Set(
    ordered.filter((record) => record.companyId === companyId).map((record) => record.id),
  );
  return projects.filter((project) => ids.has(project.id));
}

/**
 * Projects related to this one, by what they actually share.
 *
 * The page used to link "the next one in the array", which is adjacency
 * dressed up as relevance — it would happily send a reader from a compliance
 * bot to an HR automation because of where they sat in a file.
 *
 * Scored instead: a shared skill area is worth more than a shared employer,
 * because at a single-employer portfolio the company is shared by everything
 * and therefore distinguishes nothing. Ties fall back to display order so the
 * result is stable rather than incidental.
 */
export function relatedProjects(id: string, limit = 3): readonly ProjectCaseStudy[] {
  const self = projectRecords.find((record) => record.id === id);
  if (!self) return [];

  const scored = ordered
    .filter((record) => record.id !== id)
    .map((record) => {
      const sharedSkills = record.skillIds.filter((skill) => self.skillIds.includes(skill)).length;
      const sharedRoles = record.experienceIds.filter((role) =>
        self.experienceIds.includes(role),
      ).length;
      const sameCompany = record.companyId && record.companyId === self.companyId ? 1 : 0;
      const sameCategory = record.category === self.category ? 1 : 0;
      return { record, score: sharedSkills * 4 + sharedRoles * 2 + sameCategory * 2 + sameCompany };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.record.order - b.record.order)
    .slice(0, limit);

  /*
   * Score order, not display order.
   *
   * The obvious spelling — `projects.filter(project => ids.has(project.id))` —
   * picks the right set and then throws the ranking away, so the closest match
   * turns up third whenever it happens to sit last in the file. `scored` is
   * already sorted; this keeps that order and looks each one up.
   */
  return scored
    .map((entry) => projects.find((project) => project.id === entry.record.id))
    .filter((project): project is ProjectCaseStudy => Boolean(project));
}
