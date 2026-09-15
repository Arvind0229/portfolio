import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  deriveProjectId,
  parseProjects,
  projectRecords,
  projects,
  projectsForCompany,
  relationsFor,
  uniqueProjectId,
} from '@/data/projects';
import { CONTENT } from '@/lib/content/registry';
import { WRITABLE } from '@/lib/admin/content-writer';
import rawProjects from '@/data/projects.json';

/**
 * The state of `src/data/projects.ts` on the commit before the migration,
 * captured rather than retyped. "Nothing was lost" has to be checked against
 * the real thing, not against a copy that can drift with it.
 */
const BEFORE = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests/fixtures/projects-before-migration.json'), 'utf8'),
) as Array<Record<string, unknown>>;

describe('the migration lost nothing', () => {
  it('produces exactly the array the literal produced', () => {
    /*
     * The assertion that matters. Every consumer — the sections, the project
     * page, and the whole AI knowledge layer — reads `projects`, and a field
     * quietly dropped during the move to JSON would not fail anything else:
     * the page still renders, it just says less about the work.
     */
    expect(JSON.parse(JSON.stringify(projects))).toEqual(BEFORE);
  });

  it('keeps every project id, which is every live URL', () => {
    expect(projects.map((project) => project.id)).toEqual(BEFORE.map((project) => project.id));
  });
});

describe('id derivation', () => {
  it('is deterministic and URL-safe', () => {
    expect(deriveProjectId('Compliance Tracking & Exception Alerting')).toBe(
      'compliance-tracking-exception-alerting',
    );
    expect(deriveProjectId('  Multi-Product   MIS  ')).toBe('multi-product-mis');
    expect(deriveProjectId('HR / IT Process Automation')).toBe('hr-it-process-automation');
  });

  it('never produces a leading, trailing or doubled hyphen', () => {
    for (const title of ['--- weird ---', '!!!', 'a  b', 'Ünïcode Tïtle', '   ']) {
      const derived = deriveProjectId(title);
      expect(derived.startsWith('-'), title).toBe(false);
      expect(derived.endsWith('-'), title).toBe(false);
      expect(derived.includes('--'), title).toBe(false);
    }
  });

  it('is bounded, so a very long title cannot produce an unusable URL', () => {
    expect(deriveProjectId('x '.repeat(200)).length).toBeLessThanOrEqual(64);
  });

  it('suffixes rather than collides', () => {
    const taken = ['report-mailer'];
    expect(uniqueProjectId('Report Mailer', taken)).toBe('report-mailer-2');
    expect(uniqueProjectId('Report Mailer', [...taken, 'report-mailer-2'])).toBe('report-mailer-3');
  });

  it('falls back rather than producing an empty id', () => {
    // A title of only punctuation would otherwise yield '', which is not a URL.
    expect(uniqueProjectId('!!!', [])).toBe('project');
  });
});

describe('parsing', () => {
  it('drops a record with no id or no title', () => {
    // Without an id there is no URL and no React key; without a title there is
    // nothing to render. Everything else may be blank.
    const parsed = parseProjects({
      projects: [
        { id: '', title: 'No id' },
        { id: 'no-title', title: '' },
        { title: 'No id at all' },
        { id: 'fine', title: 'Fine' },
      ],
    });
    expect(parsed.map((project) => project.id)).toEqual(['fine']);
  });

  it('refuses an id that is unsafe as a URL segment or an object key', () => {
    for (const bad of ['../secret', 'has space', 'UPPER', '__proto__', '-leading']) {
      const parsed = parseProjects({ projects: [{ id: bad, title: 'X' }] });
      expect(parsed, `${bad} survived`).toEqual([]);
    }
  });

  it('refuses a duplicate id, which would collide as a URL', () => {
    const parsed = parseProjects({
      projects: [
        { id: 'dup', title: 'First' },
        { id: 'dup', title: 'Second' },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.title).toBe('First');
  });

  it('falls back to a known category rather than rendering an unknown one', () => {
    const parsed = parseProjects({
      projects: [{ id: 'a', title: 'A', category: 'Something Invented' }],
    });
    expect(parsed[0]?.category).toBe('Operations Automation');
  });

  it('accepts only the declared statuses', () => {
    expect(parseProjects({ projects: [{ id: 'a', title: 'A', status: 'ongoing' }] })[0]?.status).toBe(
      'ongoing',
    );
    expect(parseProjects({ projects: [{ id: 'a', title: 'A', status: 'shipped' }] })[0]?.status).toBe(
      '',
    );
  });

  it('refuses a link that is not a safe URL', () => {
    /*
     * These end up in an `href` on a public page, so `javascript:` is not
     * hypothetical. Plain http is refused too — same rule as social links.
     */
    const parsed = parseProjects({
      projects: [
        {
          id: 'a',
          title: 'A',
          links: {
            live: 'javascript:alert(1)',
            github: 'http://example.com',
            caseStudy: 'https://example.com/x',
          },
        },
      ],
    });
    expect(parsed[0]?.links.live).toBeUndefined();
    expect(parsed[0]?.links.github).toBeUndefined();
    expect(parsed[0]?.links.caseStudy).toBe('https://example.com/x');
  });

  it('treats a missing visible flag as visible', () => {
    // A project that vanishes because nobody wrote `"visible": true` is a worse
    // default than one hidden on purpose.
    expect(parseProjects({ projects: [{ id: 'a', title: 'A' }] })[0]?.visible).toBe(true);
  });

  it('survives complete rubbish without throwing', () => {
    for (const rubbish of [null, undefined, 42, 'text', [], { projects: 'no' }]) {
      expect(() => parseProjects(rubbish)).not.toThrow();
      expect(parseProjects(rubbish)).toEqual([]);
    }
  });

  it('accepts its own output, because that is what a save sends back', () => {
    // The bug that shipped once already, in `parseSkillGroups`.
    const fromGet = parseProjects(rawProjects);
    expect(parseProjects(fromGet)).toEqual(fromGet);
  });
});

describe('publishing and ordering', () => {
  it('hides a project marked not visible, and keeps it in the store', () => {
    const parsed = parseProjects({
      projects: [{ id: 'draft', title: 'Draft', visible: false }],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.visible).toBe(false);
    expect(projects.some((project) => project.id === 'draft')).toBe(false);
  });

  it('orders by `order`, not by position in the file', () => {
    const ids = projectRecords
      .filter((record) => record.visible)
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((record) => record.id);
    expect(projects.map((project) => project.id)).toEqual(ids);
  });

  it('treats a missing order as last rather than first', () => {
    expect(parseProjects({ projects: [{ id: 'a', title: 'A' }] })[0]?.order).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
});

describe('relationships', () => {
  it('resolves the company, roles and skills a project declares', () => {
    const relations = relationsFor('compliance-tracking');
    expect(relations.company?.id).toBe('sbfc');
    expect(relations.roles.map((role) => role.id)).toContain('sbfc-rpa-developer');
  });

  it('keeps the project when its company is missing', () => {
    /*
     * Deliberately the opposite of the rule for roles (ADR-002), and recorded
     * in ADR-004 §4. A role without an employer is meaningless; a project
     * without one is still a project, so losing the context beats hiding
     * the work.
     */
    const parsed = parseProjects({
      projects: [{ id: 'orphan', title: 'Orphan', companyId: 'no-such-company' }],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.companyId).toBe('no-such-company');
    expect(relationsFor('no-such-project').company).toBeNull();
  });

  it('skips a reference that does not resolve rather than substituting one', () => {
    // Nothing invents a placeholder. A placeholder on this site would be a
    // fact that is not true.
    const relations = relationsFor('does-not-exist');
    expect(relations.company).toBeNull();
    expect(relations.roles).toEqual([]);
    expect(relations.skills).toEqual([]);
  });

  it('every shipped project resolves to a company that exists', () => {
    for (const record of projectRecords) {
      if (!record.companyId) continue;
      expect(relationsFor(record.id).company, `${record.id} → ${record.companyId}`).not.toBeNull();
    }
  });

  it('lists the projects belonging to one company', () => {
    expect(projectsForCompany('sbfc').length).toBeGreaterThan(0);
    expect(projectsForCompany('no-such-company')).toEqual([]);
  });

  it('does not copy any company, role or skill label into a project record', () => {
    // The duplication this model exists to prevent.
    for (const record of projectRecords) {
      expect(Object.keys(record)).not.toContain('company');
      expect(Object.keys(record)).not.toContain('companyName');
      expect(Object.keys(record)).not.toContain('designation');
    }
  });
});

describe('the registry wiring', () => {
  it('registers projects against a declared writable target', () => {
    expect(CONTENT.projects).toBeDefined();
    expect(Object.keys(WRITABLE)).toContain(CONTENT.projects?.target);
  });

  it('round-trips through serialize and parse without loss', () => {
    const definition = CONTENT.projects;
    const parsed = definition?.parse(rawProjects);
    expect(definition?.parse(definition.serialize(parsed))).toEqual(parsed);
  });

  it('never throws, whatever it is given', () => {
    for (const rubbish of [null, undefined, 42, 'text', [], { a: 1 }]) {
      expect(() => CONTENT.projects?.parse(rubbish)).not.toThrow();
    }
  });
});
