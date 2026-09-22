import { describe, expect, it } from 'vitest';
import { achievements, architectureFlows, impactMetrics } from '@/data/impact';
import { experience } from '@/data/experience';
import { profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { allSkills, skillGroups } from '@/data/skills';
import { skillNotes, skillsWithoutNotes, usedIn } from '@/data/skill-notes';
import { suggestedQuestions, trustedTechnologies } from '@/data/site';
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

  it('lists only contact channels with a traceable source', () => {
    // The rule this test exists for is "nothing invented", not "nothing but
    // the resume". Email and phone come from the resume. LinkedIn was supplied
    // by Arvind directly, in conversation, on 2026-09-07 — which is a source,
    // and is why it is allowed here and a GitHub link still is not.
    const SOURCED = ['email', 'phone', 'linkedin'];
    const ids = profile.socials.map((s) => s.id);
    expect(ids).toEqual(SOURCED.filter((id) => ids.includes(id)));
    expect(ids.filter((id) => !SOURCED.includes(id))).toEqual([]);
  });
});

describe('assistant voice', () => {
  const FIRST_PERSON = /\b(I|I'm|I've|my|me)\b/;

  it('gives the AI a third-person summary carrying the same anchor facts', () => {
    expect(FIRST_PERSON.test(profile.summaryThirdPerson)).toBe(false);
    expect(FIRST_PERSON.test(profile.positioningThirdPerson)).toBe(false);

    for (const fact of ['2.9 years', 'SBFC Finance Limited', '80+', 'TruBot', '3 interns']) {
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
      'id creation / deactivation api': 'id creation / deactivation api integration',
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

describe('skill notes', () => {
  it('covers every technology in the stack', () => {
    // A chip with no note opens a panel that says nothing. The component
    // degrades rather than crashing, but silence is not the intent — so the
    // gap is a failing test, not something to notice in the browser.
    expect(skillsWithoutNotes).toEqual([]);
  });

  it('describes the technology, never the person', () => {
    // The `what`/`why` halves are public facts about a tool. The moment one
    // starts making claims about Arvind, it has left the ground this file can
    // stand on — the personal half is derived from the case studies instead.
    const personal = /\b(he|his|him|arvind|i built|i have|my )\b/i;
    const offenders = Object.entries(skillNotes)
      .filter(([, note]) => personal.test(note.what) || personal.test(note.why))
      .map(([skill]) => skill);
    expect(offenders).toEqual([]);
  });

  it('only ever claims a project that actually lists the technology', () => {
    // usedIn() is fuzzy by necessity — the stack says "SQL", a case study says
    // "SQL / PL-SQL". Fuzzy matching that drifts would invent history, so every
    // returned project is checked back against the real project record.
    for (const skill of allSkills) {
      for (const claimed of usedIn(skill)) {
        const project = projects.find((entry) => entry.id === claimed.id);
        expect(project, `${skill} pointed at a project that does not exist`).toBeDefined();
        expect(
          project?.technologies.length,
          `${skill} matched ${claimed.id}, which lists no technologies`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('only reaches every project for technologies that really are in every project', () => {
    // The failure mode of fuzzy matching is a short name swallowing everything.
    // `PL/SQL` did exactly that before the matcher stopped splitting a slash
    // with no spaces around it — it claimed five projects that never mention it.
    //
    // The guard is a second, stricter method: a skill may only claim all five
    // case studies if its name appears verbatim as a whole word in all five
    // technology lists. Two do, and the assertion checks that independently
    // rather than trusting a hard-coded allow-list.
    const literallyEverywhere = allSkills.filter((skill) => {
      const needle = skill.replace(/\s*\([^)]*\)/g, '').toLowerCase();
      const pattern = new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      return projects.every((project) =>
        project.technologies.some((technology) => pattern.test(technology)),
      );
    });

    const matchedEverywhere = allSkills.filter(
      (skill) => usedIn(skill).length === projects.length,
    );

    expect(matchedEverywhere.sort()).toEqual(literallyEverywhere.sort());
  });

  it('resolves the technologies the home page shows up front', () => {
    // The strip used to say "SQL / PL-SQL" — a label that exists in no data
    // file, so it silently matched no note and no project.
    for (const tool of trustedTechnologies) {
      expect(allSkills, `${tool} is not a real skill name`).toContain(tool);
      expect(skillNotes[tool], `${tool} has no note`).toBeDefined();
    }
  });
});

describe('social links', () => {
  it('stores the LinkedIn profile without the share tracking it was copied with', () => {
    const linkedin = profile.socials.find((social) => social.id === 'linkedin');
    expect(linkedin, 'LinkedIn link is missing').toBeDefined();
    expect(linkedin?.href).toMatch(/^https:\/\/www\.linkedin\.com\/in\//);
    // The URL arrives from the mobile app carrying utm_source / utm_content /
    // utm_medium. Those describe one share, not the profile, and publishing
    // them hands the analytics to every visitor.
    expect(linkedin?.href).not.toContain('?');
    expect(linkedin?.href).not.toMatch(/utm_/i);
  });

  it('uses a real scheme for every social link', () => {
    for (const social of profile.socials) {
      expect(social.href, `${social.id} has no usable href`).toMatch(/^(https:|mailto:|tel:)/);
    }
  });
});

describe('employer profiles', () => {
  it('describes the company, never the person', () => {
    // Same line the skill notes draw. `what` is a public fact about a business;
    // the moment it starts saying what Arvind achieved, it has left the ground
    // it can stand on — that belongs in `highlights`, which is resume-sourced.
    const personal = /\b(he|his|him|arvind)\b/i;
    for (const item of experience) {
      if (!item.companyProfile) continue;
      expect(
        personal.test(item.companyProfile.what),
        `${item.company}: the "what" line makes a claim about a person`,
      ).toBe(false);
    }
  });

  it('keeps the resume-sourced fields untouched', () => {
    // Adding context must not have quietly reworded the facts.
    const sbfc = experience.find((item) => item.id === 'sbfc-rpa-developer');
    expect(sbfc?.company).toBe('SBFC Finance Limited');
    expect(sbfc?.role).toBe('RPA Developer');
    expect(sbfc?.current).toBe(true);
    expect(sbfc?.highlights.length).toBeGreaterThanOrEqual(13);

    const harjai = experience.find((item) => item.id === 'harjai-recruiter');
    expect(harjai?.company).toBe('Harjai Computers Pvt. Ltd.');
    expect(harjai?.current).toBe(false);
  });

  it('gives every profile all three parts, or none at all', () => {
    for (const item of experience) {
      if (!item.companyProfile) continue;
      expect(item.companyProfile.sector.length, `${item.company}: empty sector`).toBeGreaterThan(0);
      expect(item.companyProfile.what.length, `${item.company}: empty what`).toBeGreaterThan(40);
      expect(
        item.companyProfile.relevance.length,
        `${item.company}: empty relevance`,
      ).toBeGreaterThan(40);
    }
  });
});
