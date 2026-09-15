import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  CaseStudyMechanics,
  CaseStudyOutcome,
  CaseStudyOverview,
  ProjectMetrics,
  RelatedProjects,
} from '@/components/sections/case-study';
import { projects } from '@/data/projects';
import type { ProjectDepth } from '@/types';

/**
 * The rule the case-study page is built on: **nothing renders unless it has
 * content.**
 *
 * A heading with nothing under it reads as a page that failed to load, and —
 * worse on this particular site — it is a standing invitation to fill the gap
 * with something plausible. So the interesting assertions here are the
 * negative ones.
 *
 * The depth store is empty on this commit, so this fixture is the only depth
 * that exists anywhere. It is test data and it is not about any real project:
 * every value is a marker, so nothing here can be mistaken for content or
 * copied onto the site.
 */

const FULL: ProjectDepth = {
  visibility: 'public',
  overview: 'MARKER overview.',
  businessProblem: 'MARKER business problem.',
  architecture: ['MARKER component one', 'MARKER component two'],
  workflow: ['MARKER step one', 'MARKER step two'],
  metrics: [
    { value: 'MARKER value', label: 'MARKER label', note: 'MARKER note' },
    { value: 'MARKER value two', label: 'MARKER label two' },
  ],
  scale: ['MARKER scale'],
  systems: ['MARKER system'],
  timeline: 'MARKER timeline',
  team: 'MARKER team',
  failureHandling: 'MARKER failure handling',
  challenges: [{ challenge: 'MARKER challenge', resolution: 'MARKER resolution' }],
  decisions: [
    { decision: 'MARKER decision', why: 'MARKER why', alternatives: 'MARKER alternatives' },
  ],
  before: 'MARKER before',
  after: 'MARKER after',
  lessonsLearned: ['MARKER lesson'],
  futureEnhancements: ['MARKER future'],
  faq: [{ question: 'MARKER question', answer: 'MARKER answer' }],
};

function renderAll(depth?: ProjectDepth) {
  return render(
    <>
      <ProjectMetrics metrics={depth?.metrics} />
      <CaseStudyOverview depth={depth} />
      <CaseStudyMechanics depth={depth} />
      <CaseStudyOutcome depth={depth} />
    </>,
  );
}

describe('a fully populated case study', () => {
  it('renders every section', () => {
    renderAll(FULL);

    for (const testId of [
      'cs-metrics',
      'cs-overview',
      'cs-architecture',
      'cs-workflow',
      'cs-facts',
      'cs-challenges',
      'cs-before-after',
      'cs-lessons',
      'cs-future',
      'cs-faq',
    ]) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  });

  it('shows the figure and what it measures together', () => {
    // A number on its own is not a claim anyone can check.
    renderAll(FULL);
    const metrics = screen.getByTestId('cs-metrics');
    expect(metrics).toHaveTextContent('MARKER value');
    expect(metrics).toHaveTextContent('MARKER label');
    expect(metrics).toHaveTextContent('MARKER note');
  });

  it('puts the metrics before the prose in document order', () => {
    /*
     * Mobile is the case that matters: the columns stack, so document order
     * *is* reading order, and prose above the numbers means the numbers are
     * below the fold. This asserts the order rather than a breakpoint, because
     * jsdom has no layout — the CSS is checked in the browser UAT.
     */
    const { container } = renderAll(FULL);
    const metrics = screen.getByTestId('cs-metrics');
    const overview = screen.getByTestId('cs-overview');

    expect(container.contains(metrics)).toBe(true);
    expect(metrics.compareDocumentPosition(overview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps a decision and its reasoning in one place', () => {
    renderAll(FULL);
    const decision = screen.getByTestId('cs-decision');
    expect(decision).toHaveTextContent('MARKER decision');
    expect(decision).toHaveTextContent('MARKER why');
    expect(decision).toHaveTextContent('MARKER alternatives');
  });
});

describe('an absent or partial case study', () => {
  it('renders nothing at all when there is no depth', () => {
    const { container } = renderAll(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the depth record holds only a visibility choice', () => {
    const { container } = renderAll({ visibility: 'public' });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one section for one field, and no empty headings around it', () => {
    renderAll({ visibility: 'public', overview: 'MARKER overview.' });

    expect(screen.getByTestId('cs-overview')).toBeInTheDocument();
    expect(screen.queryByTestId('cs-metrics')).toBeNull();
    expect(screen.queryByTestId('cs-architecture')).toBeNull();
    expect(screen.queryByTestId('cs-facts')).toBeNull();
    expect(screen.queryByTestId('cs-before-after')).toBeNull();
    expect(screen.queryByTestId('cs-faq')).toBeNull();
  });

  it('shows "what changed" with only one half filled', () => {
    // "How it was done before" is worth reading on its own; waiting for both
    // halves would hide it until someone writes the other one.
    renderAll({ visibility: 'public', before: 'MARKER before' });
    const section = screen.getByTestId('cs-before-after');
    expect(section).toHaveTextContent('MARKER before');
    expect(section).not.toHaveTextContent('After');
  });

  it('drops an empty list rather than rendering a bare heading', () => {
    renderAll({ visibility: 'public', architecture: [], lessonsLearned: [] });
    expect(screen.queryByTestId('cs-architecture')).toBeNull();
    expect(screen.queryByTestId('cs-lessons')).toBeNull();
  });
});

describe('related work', () => {
  it('renders nothing when nothing is related', () => {
    // One arbitrary card under a "Related work" heading is worse than no
    // heading — it asserts a relationship that does not exist.
    const { container } = render(<RelatedProjects projects={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links each related project to its own page', () => {
    const sample = projects.slice(0, 2);
    render(<RelatedProjects projects={sample} />);

    for (const project of sample) {
      const link = screen.getByTestId(`cs-related-${project.id}`);
      expect(link).toHaveAttribute('href', `/projects/${project.id}`);
      expect(link).toHaveTextContent(project.title);
    }
  });
});
