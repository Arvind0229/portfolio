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

  it('links each card to its own case-study route', () => {
    render(<ProjectsSection />);

    for (const project of projects) {
      const link = screen.getByTestId(`project-link-${project.id}`);
      expect(link).toHaveAttribute('href', `/projects/${project.id}`);
      // The accessible name is the project title, not "read more".
      expect(link).toHaveAccessibleName(project.title);
    }
  });

  it('announces the result count to screen readers', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    await user.click(screen.getByTestId('project-filter-compliance'));
    expect(screen.getByRole('status')).toHaveTextContent('1 project shown');
  });
});
