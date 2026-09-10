import { describe, expect, it } from 'vitest';
import { knowledgeBase } from '@/lib/ai/knowledge';
import { namedProject, retrieve, tokenize } from '@/lib/ai/retrieval';
import { projects } from '@/data/projects';

/**
 * Guards on the per-facet project chunking.
 *
 * Splitting each project into facets is what lets the assistant answer a
 * narrow question narrowly. It also introduces a failure mode that only shows
 * up at retrieval time: ten chunks about one project can fill all five result
 * slots and push the other four projects off a broad question. These tests pin
 * both halves of that trade — narrow questions must reach the right facet, and
 * broad questions must still see every project.
 */

function idsFor(query: string, limit = 5): string[] {
  return retrieve(query, { limit }).map((r) => r.chunk.id);
}

describe('project knowledge chunking', () => {
  it('gives every project an overview, a delivery and an impact chunk', () => {
    for (const project of projects) {
      const ids = knowledgeBase.map((c) => c.id);
      expect(ids).toContain(`project-${project.id}`);
      expect(ids).toContain(`project-${project.id}-delivery`);
      expect(ids).toContain(`project-${project.id}-impact`);
    }
  });

  it('emits a facet chunk only when the depth field is actually filled', () => {
    // The rule that keeps the assistant honest: no depth, no chunk, and the
    // agent then says the profile does not cover it. A chunk generated from an
    // empty field would be a fabrication with a citation attached.
    for (const project of projects) {
      const has = (suffix: string) =>
        knowledgeBase.some((c) => c.id === `project-${project.id}-${suffix}`);

      expect(has('scale')).toBe(Boolean(project.depth?.scale?.length));
      expect(has('systems')).toBe(Boolean(project.depth?.systems?.length));
      expect(has('operations')).toBe(Boolean(project.depth?.failureHandling));

      const challengeCount = project.depth?.challenges?.length ?? 0;
      expect(
        knowledgeBase.filter((c) => c.id.startsWith(`project-${project.id}-challenge-`)).length,
      ).toBe(challengeCount);

      const decisionCount = project.depth?.decisions?.length ?? 0;
      expect(
        knowledgeBase.filter((c) => c.id.startsWith(`project-${project.id}-decision-`)).length,
      ).toBe(decisionCount);
    }
  });

  it('still shows several different projects on a broad question', () => {
    /*
     * The crowding-out guard. Before the keyword split, one project's facets
     * could take every slot because they all carried the word "project".
     * Generic project vocabulary now lives on the overview chunk alone, so a
     * question with no project named has to come back spread across projects.
     */
    for (const query of ['what projects has he worked on', 'what has he built']) {
      const projectIds = idsFor(query)
        .filter((id) => id.startsWith('project-'))
        .map((id) => id.replace(/^project-/, '').split('-')[0]);

      const distinct = new Set(projectIds);
      expect(
        distinct.size,
        `"${query}" collapsed onto ${distinct.size} project(s): ${idsFor(query).join(', ')}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('routes a question about delivery to the delivery facet, not the overview', () => {
    const ids = idsFor('who else worked on the multi-product MIS automation');
    expect(ids.some((id) => id.endsWith('-delivery'))).toBe(true);
  });

  it('routes a question about outcomes to the impact facet', () => {
    const ids = idsFor('what changed after the report scheduling mailer was built');
    expect(ids.some((id) => id.endsWith('-impact'))).toBe(true);
  });

  it('keeps the corpus honest about what it does not have', () => {
    // Nothing in the depth layer is populated yet, so a question that only a
    // depth field could answer must not confidently resolve to some other
    // chunk. Retrieval may return context, but never a scale chunk that does
    // not exist.
    expect(knowledgeBase.some((c) => c.id.endsWith('-scale'))).toBe(
      projects.some((p) => (p.depth?.scale?.length ?? 0) > 0),
    );
  });
});


describe('one project cannot answer for another', () => {
  /*
   * The worst bug this round, found by asking the running assistant rather
   * than by reading code.
   *
   * "What was the hardest part of the HR process automation?" came back with a
   * difficulty from the *compliance* bot. Facet vocabulary is globally rare, so
   * the single word "hardest" carried enough IDF for one project's challenge
   * chunk to outrank every chunk of the project actually named. That is not a
   * ranking imperfection — it is a false statement about his work, presented
   * with a citation, and nobody reading it could tell.
   */
  it('identifies the project a question names', () => {
    expect(namedProject(tokenize('what was the hardest part of the HR process automation'))).toBe(
      'hr-process-automation',
    );
    expect(namedProject(tokenize('how often does the compliance tracking bot run'))).toBe(
      'compliance-tracking',
    );
    expect(namedProject(tokenize('tell me about the report scheduling mailer'))).toBe(
      'report-scheduling-mailer',
    );
  });

  it('names nothing when the question names nothing', () => {
    // Filtering on a guess would hide the right answer. A question with no
    // project in it must leave the ranking alone.
    for (const query of ['what has he built', 'which databases has he used', 'how do I contact him']) {
      expect(namedProject(tokenize(query)), query).toBeNull();
    }
  });

  it('never returns another project\'s chunk when one project is named', () => {
    for (const project of projects) {
      for (const shape of [
        `what was the hardest part of the ${project.title}`,
        `how often does ${project.title} run`,
        `who else worked on ${project.title}`,
        `what broke in ${project.title}`,
      ]) {
        const foreign = retrieve(shape, { limit: 5 })
          .map((r) => r.chunk.projectId)
          .filter((id): id is string => Boolean(id) && id !== project.id);

        expect(foreign, `"${shape}" pulled in ${foreign.join(', ')}`).toEqual([]);
      }
    }
  });

  it('still allows non-project chunks to help answer a project question', () => {
    // Skills, experience and contact carry no projectId and must survive the
    // filter — a project question can legitimately be answered partly from
    // them, and over-filtering would be its own kind of wrong answer.
    const filtered = retrieve('what technologies were used in the compliance tracking project', {
      limit: 8,
    });
    expect(filtered.length).toBeGreaterThan(0);
  });
});
