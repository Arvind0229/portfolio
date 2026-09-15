import { describe, expect, it, vi } from 'vitest';

/**
 * The confidentiality claim, tested end to end.
 *
 * `publicDepthFor()` is the single place that decides whether a depth record
 * may be shown. Testing the function alone would prove the predicate and not
 * the wiring, and the wiring is where this fails: the page reads
 * `project.depth`, the AI reads `project.depth`, and either could have been
 * given the unfiltered store without anything looking wrong.
 *
 * So this file replaces the stored JSON with two records — one public, one
 * internal — and follows them through the real join and the real chunk
 * builder. The live store is empty on this commit, so there is no other way to
 * exercise the path at all.
 *
 * ## What this does and does not establish
 *
 * It establishes that a record marked `internal` does not appear in the
 * project data the pages render from, nor in any retrieval chunk, on this
 * commit. It does **not** establish that confidential material is safe in this
 * repository: the file is committed to git either way, and git history is
 * permanent. Credentials, PII and customer data must not be written here at
 * all, and no code in this repository can make that true.
 *
 * `vi.mock` is hoisted above the imports, so the factory cannot close over
 * anything declared below — the markers are inlined rather than referenced.
 */

vi.mock('@/data/project-depth.json', () => ({
  default: {
    projects: {
      'compliance-tracking': {
        visibility: 'public',
        overview: 'PUBLIC_MARKER_OVERVIEW',
        scale: ['PUBLIC_MARKER_SCALE'],
        failureHandling: 'PUBLIC_MARKER_FAILURE',
        faq: [{ question: 'PUBLIC_MARKER_QUESTION', answer: 'PUBLIC_MARKER_ANSWER' }],
      },
      'multi-product-mis': {
        visibility: 'internal',
        overview: 'INTERNAL_MARKER_OVERVIEW',
        businessProblem: 'INTERNAL_MARKER_PROBLEM',
        architecture: ['INTERNAL_MARKER_ARCHITECTURE'],
        workflow: ['INTERNAL_MARKER_WORKFLOW'],
        metrics: [{ value: 'INTERNAL_MARKER_VALUE', label: 'INTERNAL_MARKER_LABEL' }],
        scale: ['INTERNAL_MARKER_SCALE'],
        systems: ['INTERNAL_MARKER_SYSTEM'],
        failureHandling: 'INTERNAL_MARKER_FAILURE',
        challenges: [
          { challenge: 'INTERNAL_MARKER_CHALLENGE', resolution: 'INTERNAL_MARKER_RESOLUTION' },
        ],
        decisions: [{ decision: 'INTERNAL_MARKER_DECISION', why: 'INTERNAL_MARKER_WHY' }],
        lessonsLearned: ['INTERNAL_MARKER_LESSON'],
        futureEnhancements: ['INTERNAL_MARKER_FUTURE'],
        before: 'INTERNAL_MARKER_BEFORE',
        after: 'INTERNAL_MARKER_AFTER',
        faq: [{ question: 'INTERNAL_MARKER_QUESTION', answer: 'INTERNAL_MARKER_ANSWER' }],
      },
    },
  },
}));

const { projectDepth, publicDepthFor } = await import('@/data/project-depth');
const { projects } = await import('@/data/projects');
const { knowledgeBase } = await import('@/lib/ai/knowledge');

const PUBLIC_ID = 'compliance-tracking';
const INTERNAL_ID = 'multi-product-mis';

/** Everything the chunk builder could possibly have copied a string into. */
function allChunkText(): string {
  return knowledgeBase
    .map((chunk) => JSON.stringify(chunk))
    .join('\n')
    .toUpperCase();
}

describe('the fixture loaded', () => {
  it('replaced the stored depth, so the assertions below mean something', () => {
    // Without this, a mock that silently failed to apply would leave every
    // "internal content is absent" assertion passing for the wrong reason.
    expect(projectDepth[PUBLIC_ID]?.overview).toBe('PUBLIC_MARKER_OVERVIEW');
    expect(projectDepth[INTERNAL_ID]?.overview).toBe('INTERNAL_MARKER_OVERVIEW');

    /*
     * The canary is `scale`, not `overview`, and the difference is worth
     * recording: the chunk builder reads `scale` and does **not** yet read the
     * fields G3 added. Public overview, architecture, workflow, metrics,
     * lessons and future work render on the page and are invisible to the
     * assistant. That is a real gap, tracked for G6 — but it is not a leak,
     * and using a field the builder ignores as the canary would have made this
     * whole file pass for the wrong reason.
     */
    expect(allChunkText()).toContain('PUBLIC_MARKER_SCALE');
  });
});

describe('an internal record', () => {
  it('is still stored, so the admin panel can show it back', () => {
    expect(projectDepth[INTERNAL_ID]).toBeDefined();
    expect(projectDepth[INTERNAL_ID]?.visibility).toBe('internal');
  });

  it('is withheld by publicDepthFor', () => {
    expect(publicDepthFor(INTERNAL_ID)).toBeUndefined();
    expect(publicDepthFor(PUBLIC_ID)).toBeDefined();
  });

  it('does not reach the project data the pages render from', () => {
    const project = projects.find((entry) => entry.id === INTERNAL_ID);
    expect(project).toBeDefined();
    // The project itself is not hidden. Only the extra detail is.
    expect(project?.depth).toBeUndefined();
  });

  it('does not put a single one of its strings into any retrieval chunk', () => {
    /*
     * The assertion that matters most, and the reason the fixture sets every
     * field rather than one: the chunk builder reads a dozen fields, and a new
     * one added later that reads the store unfiltered would be caught here
     * rather than by a visitor asking the assistant a question.
     */
    expect(allChunkText()).not.toContain('INTERNAL_MARKER');
  });

  it('leaves the public record untouched', () => {
    const project = projects.find((entry) => entry.id === PUBLIC_ID);
    expect(project?.depth?.overview).toBe('PUBLIC_MARKER_OVERVIEW');

    const text = allChunkText();
    expect(text).toContain('PUBLIC_MARKER_SCALE');
    expect(text).toContain('PUBLIC_MARKER_FAILURE');
  });
});
