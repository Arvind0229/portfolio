'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge, Button, Reveal, Section, SectionHeading } from '@/components/ui';
import { projectCategories, projects } from '@/data/projects';
import { filterProjects } from '@/lib/utils/filter-projects';
import { cn } from '@/lib/utils/cn';
import type { ProjectCaseStudy } from '@/types';

type View = 'business' | 'technical';

/**
 * Projects.
 *
 * Every case study carries both a business view and a technical view. The
 * toggle is at section level rather than per card so a recruiter can put the
 * whole section into plain language in one click, and an engineer can do the
 * opposite — the same requirement the AI assistant's modes serve.
 */
export function ProjectsSection() {
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('business');
  const [openProject, setOpenProject] = useState<ProjectCaseStudy | null>(null);
  const searchId = useId();

  const visible = useMemo(
    () => filterProjects(projects, { category, query }),
    [category, query],
  );

  return (
    <Section id="projects" ariaLabel="Projects and case studies">
      <SectionHeading
        eyebrow="Projects"
        title="Case studies, not screenshots"
        description="Each one starts from the business problem, states what was built, and ends with what actually changed. Every detail here comes from work delivered at SBFC Finance Limited."
      />

      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by category">
          {['All', ...projectCategories].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              data-testid={`project-filter-${item.replace(/\s+/g, '-').toLowerCase()}`}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[0.78rem] transition-colors duration-[var(--motion-fast)]',
                category === item
                  ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] text-[var(--accent-primary)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              Search projects
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects or tech…"
              data-testid="project-search"
              className="w-full min-w-[13rem] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[0.82rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--accent-primary)]"
            />
          </div>

          <div
            className="flex rounded-[var(--radius-md)] border border-[var(--border)] p-0.5"
            role="group"
            aria-label="Switch between business and technical descriptions"
          >
            {(['business', 'technical'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                aria-pressed={view === item}
                data-testid={`project-view-${item}`}
                className={cn(
                  'rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-[0.76rem] capitalize transition-colors duration-[var(--motion-fast)]',
                  view === item
                    ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} project{visible.length === 1 ? '' : 's'} shown
      </p>

      {visible.length === 0 ? (
        <div className="surface-card mt-8 p-10 text-center">
          <p className="text-[0.95rem] text-[var(--text-secondary)]">
            No projects match “{query}”{category !== 'All' ? ` in ${category}` : ''}.
          </p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              setQuery('');
              setCategory('All');
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2" data-testid="project-grid">
          {visible.map((project, index) => (
            <Reveal
              key={project.id}
              delay={index * 60}
              className={cn(project.featured && index === 0 && 'md:col-span-2')}
            >
              <ProjectCard
                project={project}
                view={view}
                wide={project.featured && index === 0}
                onOpen={() => setOpenProject(project)}
              />
            </Reveal>
          ))}
        </div>
      )}

      {openProject ? (
        <ProjectDialog project={openProject} onClose={() => setOpenProject(null)} />
      ) : null}
    </Section>
  );
}

function ProjectCard({
  project,
  view,
  wide,
  onOpen,
}: {
  project: ProjectCaseStudy;
  view: View;
  wide: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      data-testid={`project-card-${project.id}`}
      className={cn(
        'group flex h-full flex-col p-6 transition-[transform,border-color] duration-[var(--motion-base)] hover:-translate-y-1',
        wide ? 'glass' : 'surface-card hover:border-[var(--accent-primary)]',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <Badge tone={project.featured ? 'accent' : 'neutral'}>{project.category}</Badge>
        {project.featured ? (
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
            Featured
          </span>
        ) : null}
      </div>

      <h3 className={cn('mt-4', wide ? 'text-[1.5rem]' : 'text-[1.15rem]')}>{project.title}</h3>

      <p className="mt-3 flex-1 text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
        {view === 'business' ? project.businessView : project.technicalView}
      </p>

      <ul className="mt-5 flex flex-wrap gap-1.5">
        {project.technologies.map((tech) => (
          <li
            key={tech}
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 font-mono text-[0.68rem] text-[var(--text-muted)]"
          >
            {tech}
          </li>
        ))}
      </ul>

      <Button variant="quiet" size="sm" className="mt-5 self-start px-0" onClick={onOpen}>
        Read the case study
        <span
          aria-hidden="true"
          className="ml-1 inline-block transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
        >
          →
        </span>
      </Button>
    </article>
  );
}

/**
 * Accessible dialog: focus is moved in on open and restored on close, Escape
 * closes, Tab is trapped, and the backdrop is inert to screen readers.
 */
function ProjectDialog({
  project,
  onClose,
}: {
  project: ProjectCaseStudy;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="project-dialog"
        className="animate-fade-in max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-xl)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="accent">{project.category}</Badge>
            <h3 id={titleId} className="mt-3 text-[1.5rem]">
              {project.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close case study"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <Block title="For a non-technical reader" body={project.businessView} accent />
          <Block title="The problem" body={project.problem} />
          <Block title="What was built" body={project.solution} />
          <Block title="Technically" body={project.technicalView} />
          <Block title="My role" body={project.role} />

          <div>
            <h4 className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              How it was delivered
            </h4>
            <ol className="mt-3 space-y-2.5">
              {project.process.map((step, index) => (
                <li key={step} className="flex gap-3 text-[0.88rem] text-[var(--text-secondary)]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--border)] font-mono text-[0.65rem] text-[var(--accent-primary)]">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h4 className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Impact
            </h4>
            <ul className="mt-3 space-y-2">
              {project.impact.map((entry) => (
                <li key={entry} className="flex gap-2.5 text-[0.88rem] text-[var(--text-secondary)]">
                  <span aria-hidden="true" className="text-[var(--success)]">
                    ✓
                  </span>
                  {entry}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Technologies
            </h4>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {project.technologies.map((tech) => (
                <li
                  key={tech}
                  className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-1 font-mono text-[0.7rem] text-[var(--text-muted)]"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, body, accent }: { title: string; body: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        accent &&
          'rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4',
      )}
    >
      <h4 className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {title}
      </h4>
      <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
