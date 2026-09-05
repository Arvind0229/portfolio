import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectsSection } from '@/components/sections/projects-section';
import { projects } from '@/data/projects';

describe('ProjectsSection', () => {
  it('renders every case study by default', () => {
    render(<ProjectsSection />);
    for (const project of projects) {
      expect(screen.getByTestId(`project-card-${project.id}`)).toBeInTheDocument();
    }
  });

  it('filters by category', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    await user.click(screen.getByTestId('project-filter-compliance'));

    expect(screen.getByTestId('project-card-compliance-tracking')).toBeInTheDocument();
    expect(screen.queryByTestId('project-card-hr-process-automation')).not.toBeInTheDocument();
  });

  it('searches across technologies, not just titles', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    await user.type(screen.getByTestId('project-search'), 'python');

    const grid = screen.getByTestId('project-grid');
    expect(within(grid).getByTestId('project-card-report-scheduling-mailer')).toBeInTheDocument();
  });

  it('shows a recoverable empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    await user.type(screen.getByTestId('project-search'), 'kubernetes');
    expect(screen.queryByTestId('project-grid')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getByTestId('project-grid')).toBeInTheDocument();
  });

  it('switches every card between business and technical language', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    const first = projects[0]!;
    expect(screen.getByText(first.businessView)).toBeInTheDocument();

    await user.click(screen.getByTestId('project-view-technical'));

    expect(screen.getByText(first.technicalView)).toBeInTheDocument();
    expect(screen.queryByText(first.businessView)).not.toBeInTheDocument();
  });

  it('opens an accessible case-study dialog and closes it on Escape', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    const card = screen.getByTestId('project-card-compliance-tracking');
    await user.click(within(card).getByRole('button', { name: /read the case study/i }));

    const dialog = screen.getByTestId('project-dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText(/how it was delivered/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/impact/i)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('project-dialog')).not.toBeInTheDocument();
  });

  it('announces the result count to screen readers', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    await user.click(screen.getByTestId('project-filter-compliance'));
    expect(screen.getByRole('status')).toHaveTextContent('1 project shown');
  });
});
