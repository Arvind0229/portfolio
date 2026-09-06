import { describe, expect, it } from 'vitest';
import { achievements, architectureFlows, impactMetrics } from '@/data/impact';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { allSkills, skillGroups } from '@/data/skills';
import { suggestedQuestions } from '@/data/site';
import { filterProjects } from '@/lib/utils/filter-projects';
import { knowledgeBase } from '@/lib/ai/knowledge';

/**
 * Content integrity.
 *
 * The hard rule for this build is that nothing may be claimed that the resume
 * does not support. These tests encode that rule so a future edit cannot
 * quietly break it — including the AI's starter questions, which must never
 * ask about a technology Arvind has not worked with.
 */

const RESUME_FACTS = {
  name: 'Arvind Gupta',
  email: 'guptaarvind29042000@gmail.com',
  phone: '+91 82913 98844',
  employers: ['SBFC Finance Limited', 'Harjai Computers Pvt. Ltd.'],
  automations: 80,
  effortReduction: 80,
  interns: 3,
  databases: 5,
};

describe('profile matches the resume', () => {
  it('carries the correct identity and contact details', () => {
    expect(profile.name).toBe(RESUME_FACTS.name);
    expect(profile.email).toBe(RESUME_FACTS.email);
    expect(profile.phone).toBe(RESUME_FACTS.phone);
    expect(profile.title).toBe('RPA Developer');
  });

  it('lists only contact channels that exist in the resume', () => {
    // No LinkedIn or GitHub in the source document, so none may be invented.
    const ids = profile.socials.map((s) => s.id);
    expect(ids).toEqual(['email', 'phone']);
  });
});

describe('assistant voice', () => {
  const FIRST_PERSON = /\b(I|I'm|I've|my|me)\b/;

  it('gives the AI a third-person summary carrying the same anchor facts', () => {
    expect(FIRST_PERSON.test(profile.summaryThirdPerson)).toBe(false);
    expect(FIRST_PERSON.test(profile.positioningThirdPerson)).toBe(false);

    for (const fact of ['2+ years', 'SBFC Finance Limited', '80+', 'TruBot', '3 interns']) {
      expect(profile.summaryThirdPerson, `missing anchor fact: ${fact}`).toContain(fact);
      expect(profile.summary, `missing anchor fact: ${fact}`).toContain(fact);
    }
  });

  it('never lets first-person page copy reach the AI knowledge base', () => {
    // The assistant speaks ABOUT Arvind. A chunk written in his voice makes it
    // say "I started as an IT Executive" under an assistant byline.
    const offenders = knowledgeBase
      .filter((chunk) => /(^|[\s"(])(I|I'm|I've|I'd|my|My|mine|Mine)([\s.,;:!?")]|$)/.test(chunk.text))
      .map((chunk) => chunk.id);
    expect(offenders).toEqual([]);
  });

  it('keeps the page copy in his own voice', () => {
    // The site is his; the assistant is not. Both voices are intentional.
    expect(FIRST_PERSON.test(profile.summary)).toBe(true);
    expect(FIRST_PERSON.test(profile.positioning)).toBe(true);
  });
});

describe('experience matches the resume', () => {
  it('contains exactly the two employers listed', () => {
    expect(experience.map((e) => e.company)).toEqual(RESUME_FACTS.employers);
  });

  it('marks only the current role as current', () => {
    expect(experience.filter((e) => e.current)).toHaveLength(1);
    expect(experience[0]?.current).toBe(true);
  });

  it('gives every role a period, summary and at least one highlight', () => {
    for (const item of experience) {
      expect(item.period.length).toBeGreaterThan(0);
      expect(item.summary.length).toBeGreaterThan(20);
      expect(item.highlights.length).toBeGreaterThan(0);
    }
  });
});

describe('metrics are the resume figures, not estimates', () => {
  it('uses only figures stated in the resume', () => {
    const byId = Object.fromEntries(impactMetrics.map((m) => [m.id, m.value]));
    expect(byId.automations).toBe(RESUME_FACTS.automations);
    expect(byId.effort).toBe(RESUME_FACTS.effortReduction);
    expect(byId.interns).toBe(RESUME_FACTS.interns);
    expect(byId.databases).toBe(RESUME_FACTS.databases);
  });

  it('states four achievements, all traceable to the resume', () => {
    expect(achievements.length).toBe(4);
    expect(achievements.join(' ')).toContain('80+');
  });
});

describe('projects are complete and grounded', () => {
  it('gives every case study both audience views and full narrative fields', () => {
    for (const project of projects) {
      expect(project.businessView.length).toBeGreaterThan(30);
      expect(project.technicalView.length).toBeGreaterThan(30);
      expect(project.problem.length).toBeGreaterThan(30);
      expect(project.solution.length).toBeGreaterThan(30);
      expect(project.role.length).toBeGreaterThan(10);
      expect(project.process.length).toBeGreaterThanOrEqual(3);
      expect(project.impact.length).toBeGreaterThanOrEqual(2);
      expect(project.technologies.length).toBeGreaterThan(0);
    }
  });

  it('only uses technologies that appear in the skills data', () => {
    const known = new Set(allSkills.map((s) => s.toLowerCase()));
    // A handful of composite labels are described in the skills groups under a
    // slightly different phrasing; map them explicitly rather than loosening
    // the check, so an unknown technology still fails the test.
    const aliases: Record<string, string> = {
      'front-end / recorder automation': 'ui / recorder-based front-end automation',
      'mailer automation': 'html mail-body / mailer automation',
      'html mail-body automation': 'html mail-body / mailer automation',
      'sms api': 'sms api integration',
      'whatsapp api': 'whatsapp api integration',
    };

    for (const project of projects) {
      for (const tech of project.technologies) {
        const key = tech.toLowerCase();
        const resolved = aliases[key] ?? key;
        expect(
          known.has(resolved),
          `Project "${project.title}" claims unknown technology "${tech}"`,
        ).toBe(true);
      }
    }
  });

  it('does not claim per-project numbers the resume does not contain', () => {
    // The resume gives aggregate figures only. Any digit-led percentage or
    // hour count inside a single case study would be fabricated.
    const forbidden = /\b\d+\s*(%|percent|hours|hrs|lakh|crore|users|clients)\b/i;
    for (const project of projects) {
      const text = [project.problem, project.solution, ...project.impact].join(' ');
      expect(forbidden.test(text), `Fabricated metric in "${project.title}"`).toBe(false);
    }
  });

  it('marks at least one project as featured', () => {
    expect(projects.some((p) => p.featured)).toBe(true);
  });
});

describe('architecture flows are honestly labelled', () => {
  it('marks every flow as verified or illustrative explicitly', () => {
    for (const flow of architectureFlows) {
      expect(typeof flow.verified).toBe('boolean');
      expect(flow.steps.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('skills', () => {
  it('has no duplicate entries across groups', () => {
    const all = skillGroups.flatMap((g) => g.skills);
    expect(new Set(all).size).toBe(all.length);
  });

  it('never assigns a proficiency percentage', () => {
    const serialised = JSON.stringify(skillGroups);
    expect(serialised).not.toMatch(/\d+\s*%/);
    expect(serialised).not.toMatch(/proficiency|level"?\s*:\s*\d/i);
  });
});

describe('assistant starter questions', () => {
  it('never asks about a technology outside the resume', () => {
    const offLimits = ['kubernetes', 'docker', 'java', 'salesforce', 'blue prism', 'aws lambda'];
    const all = Object.values(suggestedQuestions).flat().join(' ').toLowerCase();
    for (const term of offLimits) {
      expect(all).not.toContain(term);
    }
  });

  it('covers every assistant mode', () => {
    for (const mode of ['recruiter', 'technical', 'business', 'general']) {
      expect(suggestedQuestions[mode]?.length).toBeGreaterThan(0);
    }
  });
});

describe('project filtering', () => {
  it('returns everything with no filters applied', () => {
    expect(filterProjects(projects, { category: 'All', query: '' })).toHaveLength(projects.length);
  });

  it('filters by category', () => {
    const result = filterProjects(projects, { category: 'Compliance', query: '' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.category === 'Compliance')).toBe(true);
  });

  it('searches the technology list, not just the title', () => {
    const result = filterProjects(projects, { category: 'All', query: 'python' });
    expect(result.length).toBeGreaterThan(0);
  });

  it('is case-insensitive and trims the query', () => {
    expect(filterProjects(projects, { category: 'All', query: '  POWER BI ' })).toEqual(
      filterProjects(projects, { category: 'All', query: 'power bi' }),
    );
  });

  it('returns nothing for a term that appears nowhere', () => {
    expect(filterProjects(projects, { category: 'All', query: 'kubernetes' })).toHaveLength(0);
  });
});
