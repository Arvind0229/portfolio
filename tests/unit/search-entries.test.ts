import { describe, expect, it } from 'vitest';
import { searchAll, searchEntries, scoreEntry } from '@/lib/search/entries';
import { projects } from '@/data/projects';
import { skillGroups } from '@/data/skills';
import { navigation } from '@/data/site';

const titles = (query: string) => searchAll(query).map((hit) => hit.entry.title);
const kinds = (query: string) => searchAll(query).map((hit) => hit.entry.kind);

describe('the search index', () => {
  it('covers every project, every technology and every section', () => {
    /*
     * The guard that matters.
     *
     * Two section-level search boxes were replaced by one. If the index misses
     * a group, nothing breaks visibly — the search simply never returns those
     * technologies, and a recruiter checking a word from their job description
     * concludes he has not used it. A false negative about a man's experience
     * is the worst failure this site has, and it is completely silent.
     */
    for (const project of projects) {
      expect(
        searchEntries.some((entry) => entry.title === project.title),
        `${project.title} is not searchable`,
      ).toBe(true);
    }

    for (const group of skillGroups) {
      for (const skill of group.skills) {
        expect(
          searchEntries.some((entry) => entry.kind === 'technology' && entry.title === skill),
          `${skill} is not searchable`,
        ).toBe(true);
      }
    }

    for (const item of navigation) {
      expect(
        searchEntries.some((entry) => entry.kind === 'section' && entry.title === item.label),
        `${item.label} is not searchable`,
      ).toBe(true);
    }
  });

  it('gives every entry a unique id', () => {
    // Duplicated ids collide as React keys and as the option ids the combobox
    // points `aria-activedescendant` at — the second of which fails silently
    // for everyone except a screen-reader user.
    const ids = searchEntries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ranking', () => {
  it('puts an exact title above a body mention', () => {
    const hits = searchAll('python');
    expect(hits[0]?.entry.title).toBe('Python');
    expect(hits[0]?.entry.kind).toBe('technology');
  });

  it('finds a project by a technology that is not in its title', () => {
    // The old project search did this and it had to survive the move.
    const found = searchAll('power bi').filter((hit) => hit.entry.kind === 'project');
    expect(found.length).toBeGreaterThan(0);
  });

  it('answers a technology query with the technology and the project both', () => {
    const result = kinds('power bi');
    expect(result).toContain('technology');
    expect(result).toContain('project');
  });

  it('does not match loosely', () => {
    /*
     * "Oracle" must not return "OCR" and "SQL" must not return "Squall". With
     * tens of entries rather than millions, a fuzzy matcher buys nothing and
     * costs the visitor their trust in the first wrong answer they see.
     */
    expect(titles('oracle')).toContain('Oracle');
    expect(titles('oracle')).not.toContain('OCR');
  });

  it('returns nothing for a technology he has not used', () => {
    // The honesty case. An empty result is the correct answer here, and the
    // palette renders it as one rather than falling back to everything.
    expect(searchAll('kubernetes')).toEqual([]);
    expect(searchAll('terraform')).toEqual([]);
  });

  it('treats an empty or whitespace query as no query', () => {
    expect(searchAll('')).toEqual([]);
    expect(searchAll('   ')).toEqual([]);
  });

  it('is stable: the same query always produces the same order', () => {
    const once = titles('automation');
    const twice = titles('automation');
    expect(twice).toEqual(once);
  });

  it('caps the list', () => {
    // "a" matches a great many entries. A palette that renders all of them is
    // a scroll container nobody reads to the bottom of.
    expect(searchAll('a').length).toBeLessThanOrEqual(12);
    expect(searchAll('a', 4).length).toBe(4);
  });
});

describe('scoreEntry', () => {
  const entry = {
    id: 'x',
    kind: 'technology' as const,
    title: 'Power BI',
    detail: 'Reporting & BI',
    body: 'reporting & bi',
    href: '/#skills',
  };

  it('separates no match from a weak match', () => {
    // `null` and `0` are different answers, and collapsing them is how "no
    // results" quietly becomes "every result".
    expect(scoreEntry(entry, 'kubernetes')).toBeNull();
    expect(scoreEntry(entry, 'reporting')).toBeGreaterThan(0);
  });

  it('ranks exact above prefix above contains above body', () => {
    const exact = scoreEntry(entry, 'power bi')!;
    const prefix = scoreEntry(entry, 'power')!;
    const contains = scoreEntry(entry, 'bi')!;
    const body = scoreEntry(entry, 'reporting')!;

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(contains);
    expect(contains).toBeGreaterThan(body);
  });
});

describe('where a result goes', () => {
  it('sends a project to its own case-study page', () => {
    for (const entry of searchEntries.filter((item) => item.kind === 'project')) {
      expect(entry.href).toMatch(/^\/projects\/[a-z0-9-]+$/);
    }
  });

  it('sends every technology to the stack', () => {
    for (const entry of searchEntries.filter((item) => item.kind === 'technology')) {
      expect(entry.href).toBe('/#skills');
    }
  });

  it('keeps the highlight out of the URL', () => {
    // A query string on a one-page site survives in history and in shared
    // links long after it meant anything, and makes one page look like many
    // to a crawler — which is the mistake `sitemapRoutes` exists to avoid.
    for (const entry of searchEntries) {
      expect(entry.href).not.toContain('?');
    }
  });
});
