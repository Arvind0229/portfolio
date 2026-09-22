import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

/**
 * The storyboard plays one real workflow, read from the depth layer.
 *
 * The rule it shares with the case-study page: **it renders nothing unless the
 * content exists.** A storyboard with no steps would be a stage set, and a
 * made-up one would be a claim Arvind never made. So the depth JSON is mocked
 * here with marker values — nothing in this file is about a real project — and
 * the interesting assertions are the ones about when it must stay silent.
 */

const depthState: { projects: Record<string, unknown> } = { projects: {} };
vi.mock('@/data/project-depth.json', () => ({ default: depthState }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

async function load(projects: Record<string, unknown>) {
  depthState.projects = projects;
  vi.resetModules();
  const mod = await import('@/components/sections/run-storyboard');
  return mod.RunStoryboard;
}

const STEPS = ['MARKER step one', 'MARKER step two', 'MARKER step three', 'MARKER step four'];

describe('RunStoryboard', () => {
  it('plays every step, in order, with a label that names the project', async () => {
    const RunStoryboard = await load({
      'hr-process-automation': { visibility: 'public', workflow: STEPS },
    });
    render(<RunStoryboard />);

    const list = screen.getByRole('list', { name: /step by step/i });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(
      STEPS.map((step, index) => `STEP ${String(index + 1).padStart(2, '0')}${step}`),
    );
    expect(screen.getByRole('link', { name: /full case study/i })).toHaveAttribute(
      'href',
      '/projects/hr-process-automation',
    );
  });

  it('renders nothing when the project has no workflow', async () => {
    const RunStoryboard = await load({
      'hr-process-automation': { visibility: 'public', overview: 'MARKER overview only.' },
    });
    const { container } = render(<RunStoryboard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the depth record is internal', async () => {
    const RunStoryboard = await load({
      'hr-process-automation': { visibility: 'internal', workflow: STEPS },
    });
    const { container } = render(<RunStoryboard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a workflow too short to be a story', async () => {
    const RunStoryboard = await load({
      'hr-process-automation': { visibility: 'public', workflow: STEPS.slice(0, 2) },
    });
    const { container } = render(<RunStoryboard />);
    expect(container).toBeEmptyDOMElement();
  });
});
