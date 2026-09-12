import { navigation, secondaryNavigation } from '@/data/site';
import { projects } from '@/data/projects';
import { skillGroups } from '@/data/skills';

/**
 * What one search searches.
 *
 * ## Why this exists as a module rather than inside the palette
 *
 * The site used to carry two search boxes — one filtering the technology chips,
 * one filtering the project cards — sitting in two different sections, each
 * finding only what happened to be next to it. Someone looking for "Redshift"
 * had to already know which of the two to type it into, which is the opposite
 * of what a search is for.
 *
 * One index, three kinds of result. Building it here rather than inside the
 * component means the ranking can be unit tested without rendering anything,
 * and the component keeps no knowledge of the data shapes.
 *
 * ## Ranking
 *
 * Deliberately simple, and the simplicity is the point. Three signals, checked
 * in order: an exact match on the title, a title that starts with the query, a
 * title that contains it — then, last, a match that was only found in the body
 * text. A portfolio has tens of entries, not millions; fuzzy matching here
 * would mean "Oracle" quietly returning "OCR" and a visitor wondering whether
 * the search works.
 */
export type SearchKind = 'section' | 'project' | 'technology';

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  /** What the visitor reads in the result row. */
  title: string;
  /** The line under it — a group name, a category, a short description. */
  detail: string;
  /**
   * Everything matchable that is not the title. Kept lowercase at build time:
   * this is fixed data, so the work belongs here rather than on every keystroke.
   */
  body: string;
  /**
   * Where picking it goes.
   *
   * A project goes to its own case study page. A section and a technology are
   * both anchors on the home page — a technology carries the extra step of
   * highlighting the chip once you arrive, which the palette does through the
   * highlight store rather than through the URL. A query string on a one-page
   * site would survive in someone's history and in their shared links long
   * after it meant anything.
   */
  href: string;
}

const SECTION_ENTRIES: readonly SearchEntry[] = [
  ...navigation.map((item) => ({
    id: `section-${item.id}`,
    kind: 'section' as const,
    title: item.label,
    detail: 'Section',
    body: '',
    href: item.href,
  })),
  ...secondaryNavigation.map((item) => ({
    id: `section-${item.id}`,
    kind: 'section' as const,
    title: item.label,
    detail: 'Page',
    body: '',
    href: item.href,
  })),
];

const PROJECT_ENTRIES: readonly SearchEntry[] = projects.map((project) => ({
  id: `project-${project.id}`,
  kind: 'project' as const,
  title: project.title,
  detail: project.category,
  // The same fields the old project search covered, so nothing that used to be
  // findable stopped being findable when that box was removed.
  body: [
    project.category,
    project.businessView,
    project.technicalView,
    project.problem,
    project.solution,
    ...project.technologies,
  ]
    .join(' ')
    .toLowerCase(),
  href: `/projects/${project.id}`,
}));

const TECHNOLOGY_ENTRIES: readonly SearchEntry[] = skillGroups.flatMap((group) =>
  group.skills.map((skill) => ({
    id: `tech-${group.id}-${skill}`,
    kind: 'technology' as const,
    title: skill,
    detail: group.name,
    body: group.name.toLowerCase(),
    href: '/#skills',
  })),
);

export const searchEntries: readonly SearchEntry[] = [
  ...SECTION_ENTRIES,
  ...PROJECT_ENTRIES,
  ...TECHNOLOGY_ENTRIES,
];

/**
 * Higher is better. `null` means no match at all — distinct from zero, which
 * is a real (weak) match, and collapsing the two is how "no results" turns
 * into "every result".
 */
export function scoreEntry(entry: SearchEntry, needle: string): number | null {
  const title = entry.title.toLowerCase();
  if (title === needle) return 100;
  if (title.startsWith(needle)) return 80;
  if (title.includes(needle)) return 60;
  if (entry.body.includes(needle)) return 30;
  return null;
}

/**
 * Kind decides ties, and the order is a judgement about what someone typing
 * into a portfolio's search actually wants.
 *
 * A technology first: the query is nearly always a word from a job
 * description, and the honest answer to "do you know Redshift" is the stack.
 * Then the project it was used on, which is the evidence. A section last —
 * "Contact" is reachable from the nav bar without searching for it.
 */
const KIND_WEIGHT: Record<SearchKind, number> = {
  technology: 3,
  project: 2,
  section: 1,
};

export interface SearchHit {
  entry: SearchEntry;
  score: number;
}

export function searchAll(query: string, limit = 12): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const entry of searchEntries) {
    const score = scoreEntry(entry, needle);
    if (score !== null) hits.push({ entry, score });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const kind = KIND_WEIGHT[b.entry.kind] - KIND_WEIGHT[a.entry.kind];
    if (kind !== 0) return kind;
    // Alphabetical last, so the same query always produces the same list.
    // Without it the order depends on index construction, which is stable
    // today and would quietly stop being stable the day a group is reordered.
    return a.entry.title.localeCompare(b.entry.title);
  });

  return hits.slice(0, limit);
}
