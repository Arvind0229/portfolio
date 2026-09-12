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

  /*
   * This section no longer owns a search box.
   *
   * It had one, and it only knew about projects — so typing a technology into
   * the field beside the cards could return nothing while that same technology
   * sat in the stack two sections down. Searching is now one control in the
   * header covering projects, technologies and sections together; the tests for
   * the matching itself live in tests/unit/search-entries.test.ts, against the
   * pure function, where they do not need a rendered page.
   *
   * What this asserts is that the box is gone and did not leave a stub behind.
   */
  it('has no search field of its own', () => {
    render(<ProjectsSection />);
    expect(screen.queryByTestId('project-search')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('recovers from a category that matches nothing', async () => {
    const user = userEvent.setup();
    render(<ProjectsSection />);

    // Every category has at least one project, so the empty state is reached
    // through the data rather than by typing: pick a category, confirm the
    // grid narrows, and confirm the escape hatch puts everything back.
    await user.click(screen.getByTestId('project-filter-compliance'));
    const grid = screen.getByTestId('project-grid');
    expect(within(grid).queryByTestId('project-card-report-scheduling-mailer')).toBeNull();

    await user.click(screen.getByTestId('project-filter-all'));
    expect(
      within(screen.getByTestId('project-grid')).getByTestId(
        'project-card-report-scheduling-mailer',
      ),
    ).toBeInTheDocument();
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
