import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { companies, companyById, parseCompanies } from '@/data/companies';
import { experience, experienceRecords, parseExperienceRecords } from '@/data/experience';
import rawCompanies from '@/data/companies.json';
import rawExperience from '@/data/experience.json';

/**
 * The literal this data came from, as it was on the commit before the split.
 * Read from git rather than retyped, so "nothing was lost" is checked against
 * the real thing instead of against a copy that could drift with it.
 */
const BEFORE = JSON.parse(
  readFileSync(path.join(process.cwd(), 'tests/fixtures/experience-before-split.json'), 'utf8'),
) as Array<{ id: string; company: string; role: string; highlights: string[]; technologies: string[] }>;

describe('the split lost nothing', () => {
  it('still has every role, under the same ids', () => {
    expect(experience.map((item) => item.id)).toEqual(BEFORE.map((item) => item.id));
  });

  it('still names the same employer for each role', () => {
    for (const before of BEFORE) {
      const after = experience.find((item) => item.id === before.id);
      expect(after?.company, `${before.id} lost its employer`).toBe(before.company);
      expect(after?.role).toBe(before.role);
    }
  });

  it('still carries every highlight, with none added', () => {
    /*
     * The check that matters. One `highlights` list became two fields, so the
     * order changed deliberately — achievements lead now — but the *set* must
     * be identical. A line quietly dropped during the split would never fail
     * anything else: the page still renders, it just says less about him.
     */
    for (const before of BEFORE) {
      const after = experience.find((item) => item.id === before.id);
      expect([...(after?.highlights ?? [])].sort()).toEqual([...before.highlights].sort());
      expect(after?.technologies).toEqual(before.technologies);
    }
  });

  it('leads with the achievement a recruiter should read first', () => {
    const sbfc = experience.find((item) => item.id === 'sbfc-rpa-developer');
    expect(sbfc?.highlights[0]).toContain('80+ production automations');
  });
});

describe('company as a referenced entity', () => {
  it('holds each employer once, however many roles point at it', () => {
    const ids = companies.map((company) => company.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('sbfc');
  });

  it('keeps company facts out of the role records', () => {
    // The duplication this whole change exists to prevent.
    for (const record of experienceRecords) {
      expect(Object.keys(record)).not.toContain('company');
      expect(Object.keys(record)).not.toContain('companyProfile');
    }
  });

  it('supports several roles under one company without repeating it', () => {
    const parsed = parseExperienceRecords({
      roles: [
        { id: 'senior', companyId: 'acme', designation: 'Senior RPA Developer', order: 1, current: true },
        { id: 'junior', companyId: 'acme', designation: 'RPA Developer', order: 2 },
      ],
    });
    expect(parsed).toHaveLength(2);
    expect(new Set(parsed.map((record) => record.companyId))).toEqual(new Set(['acme']));
  });

  it('refuses a website that is not a safe URL', () => {
    const parsed = parseCompanies({
      companies: {
        bad: { name: 'Bad', website: 'javascript:alert(1)' },
        insecure: { name: 'Insecure', website: 'http://example.com' },
        fine: { name: 'Fine', website: 'https://example.com' },
      },
    });
    expect(parsed.find((company) => company.id === 'bad')?.website).toBe('');
    expect(parsed.find((company) => company.id === 'insecure')?.website).toBe('');
    expect(parsed.find((company) => company.id === 'fine')?.website).toBe('https://example.com');
  });

  it('refuses a logo that is not a site-relative image path', () => {
    // A logo is rendered into an `<img src>`, so an off-site URL would let a
    // saved value make the public page fetch from somewhere else.
    const parsed = parseCompanies({
      companies: {
        a: { name: 'A', logo: 'https://evil.test/x.svg' },
        b: { name: 'B', logo: '../../secret.png' },
        c: { name: 'C', logo: 'javascript:alert(1)' },
        d: { name: 'D', logo: '/companies/d.svg' },
      },
    });
    expect(parsed.find((company) => company.id === 'a')?.logo).toBe('');
    expect(parsed.find((company) => company.id === 'b')?.logo).toBe('');
    expect(parsed.find((company) => company.id === 'c')?.logo).toBe('');
    expect(parsed.find((company) => company.id === 'd')?.logo).toBe('/companies/d.svg');
  });

  it('refuses a company id that is unsafe as a key', () => {
    const parsed = parseCompanies({
      companies: {
        __proto__: { name: 'Polluted' },
        'has space': { name: 'Spaced' },
        UPPER: { name: 'Upper' },
        good: { name: 'Good' },
      },
    });
    expect(parsed.map((company) => company.id)).toEqual(['good']);
  });

  it('survives complete rubbish', () => {
    for (const rubbish of [null, undefined, 42, 'text', []]) {
      expect(() => parseCompanies(rubbish)).not.toThrow();
      expect(parseCompanies(rubbish)).toEqual([]);
    }
  });
});

describe('dangling references', () => {
  it('drops a role whose company does not exist, rather than rendering a blank employer', () => {
    /*
     * The first relational failure mode this content model has. A role joined
     * to nothing would render a card with an empty company name in the
     * headline, which reads as broken; not rendering it is the honest failure,
     * and the role is still visible in the admin panel to be fixed.
     */
    const parsed = parseExperienceRecords({
      roles: [{ id: 'orphan', companyId: 'does-not-exist', designation: 'Something' }],
    });
    expect(parsed).toHaveLength(1);
    expect(companyById('does-not-exist')).toBeNull();
    expect(experience.some((item) => item.id === 'orphan')).toBe(false);
  });

  it('every shipped role resolves to a company', () => {
    // The check that would have caught a typo in either file.
    for (const record of experienceRecords) {
      expect(companyById(record.companyId), `${record.id} → ${record.companyId}`).not.toBeNull();
    }
    expect(experience).toHaveLength(experienceRecords.filter((r) => r.visible).length);
  });
});

describe('ordering and visibility', () => {
  it('sorts by order, not by position in the file', () => {
    const parsed = parseExperienceRecords({
      roles: [
        { id: 'third', companyId: 'x', designation: 'C', order: 3 },
        { id: 'first', companyId: 'x', designation: 'A', order: 1 },
      ],
    });
    expect(parsed.map((r) => r.id)).toEqual(['third', 'first']);
    expect([...parsed].sort((a, b) => a.order - b.order).map((r) => r.id)).toEqual([
      'first',
      'third',
    ]);
  });

  it('treats a missing order as last rather than first', () => {
    const parsed = parseExperienceRecords({
      roles: [{ id: 'a', companyId: 'x', designation: 'A' }],
    });
    expect(parsed[0]?.order).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('hides a role marked not visible, and keeps it in the file', () => {
    const parsed = parseExperienceRecords({
      roles: [{ id: 'draft', companyId: 'x', designation: 'Draft', visible: false }],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.visible).toBe(false);
    expect(experience.some((item) => item.id === 'draft')).toBe(false);
  });

  it('treats a missing visible flag as visible', () => {
    // A role that vanishes because nobody wrote `"visible": true` is a worse
    // default than one that has to be hidden on purpose.
    const parsed = parseExperienceRecords({
      roles: [{ id: 'a', companyId: 'x', designation: 'A' }],
    });
    expect(parsed[0]?.visible).toBe(true);
  });
});

describe('the period string', () => {
  it('says Present for a current role', () => {
    const current = experience.find((item) => item.current);
    expect(current?.period).toMatch(/– Present$/);
    expect(current?.end).toBe('Present');
  });

  it('uses the end date for a finished role', () => {
    const past = experience.find((item) => !item.current);
    expect(past?.period).toContain('–');
    expect(past?.period).not.toContain('Present');
  });
});

describe('the files themselves', () => {
  it('declares a company for every role it ships', () => {
    const declared = Object.keys(
      (rawCompanies as { companies: Record<string, unknown> }).companies,
    );
    for (const role of (rawExperience as { roles: Array<{ companyId: string }> }).roles) {
      expect(declared, `${role.companyId} is not declared`).toContain(role.companyId);
    }
  });
});
