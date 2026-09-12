'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Button, Reveal } from '@/components/ui';
import { projectCategories, projects } from '@/data/projects';
import { filterProjects } from '@/lib/utils/filter-projects';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils/cn';
import type { ProjectCaseStudy } from '@/types';

type View = 'business' | 'technical';

/**
 * Projects.
 *
 * Every case study carries both a business view and a technical view, and the
 * toggle is at section level so a recruiter can put the whole page into plain
 * language in one click and an engineer can do the opposite — the same
 * requirement the assistant's modes serve.
 *
 * Each card links to its own route rather than opening a dialog. A case study
 * is a page someone forwards; a modal is a state nobody can share.
 */
export function ProjectsSection() {
  const [category, setCategory] = useState<string>('All');
  const [view, setView] = useState<View>('business');

  /*
   * `filterProjects` still takes a query and is still unit tested with one —
   * it is the function behind the header search's project results. This
   * section only ever narrows by category now, so it passes an empty one
   * rather than the function growing a second shape for one caller.
   */
  const visible = useMemo(
    () => filterProjects(projects, { category, query: '' }),
    [category],
  );

  return (
    <>
      <div className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by category">
          {['All', ...projectCategories].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              data-testid={`project-filter-${item.replace(/\s+/g, '-').toLowerCase()}`}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[0.78rem] transition-[color,border-color,background-color] duration-[var(--motion-fast)]',
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
          {/*
            The text field that used to sit here is gone. It searched only
            projects, which meant typing a technology name into the box next to
            the project cards could return nothing while that same technology
            sat in the stack two sections down — a false negative about a man's
            actual experience, which is the worst kind of bug this site can have.

            Search is now one control in the header, covering projects,
            technologies and sections together. What stays here is filtering:
            the category chips and the audience toggle, which narrow a list
            someone is already looking at rather than finding things.
          */}
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
            No projects in {category}.
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => setCategory('All')}>
            Show every project
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
              <ProjectCard project={project} view={view} wide={project.featured && index === 0} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * A project card that reveals in stages.
 *
 * When the card enters the viewport the pieces arrive in the order a person
 * wants them: the card, the title, what it does, the technologies, then the
 * result. Each step is a CSS delay on an element already in the DOM — no
 * measurement, no layout thrash, and the sequence collapses to "everything
 * visible" under reduced motion.
 *
 * The edge reacts to the pointer through two custom properties, which repaint
 * this element only and never invalidate layout.
 */
function ProjectCard({
  project,
  view,
  wide,
}: {
  project: ProjectCaseStudy;
  view: View;
  wide: boolean;
}) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.25 });

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const box = target.getBoundingClientRect();
    target.style.setProperty('--pointer-x', `${event.clientX - box.left}px`);
    target.style.setProperty('--pointer-y', `${event.clientY - box.top}px`);
  };

  const stage = (index: number) => ({ ['--reveal-delay' as string]: `${index * 90}ms` });

  return (
    <article
      ref={ref}
      onPointerMove={onPointerMove}
      data-testid={`project-card-${project.id}`}
      data-revealed={inView ? 'true' : 'false'}
      className={cn(
        'card-reactive group relative flex h-full flex-col p-6 transition-[transform,border-color,box-shadow] duration-[var(--motion-base)] hover:-translate-y-1',
        wide
          ? 'glass-elevated sm:p-8'
          : 'surface-card hover:border-[var(--accent-primary)] hover:shadow-[var(--glow-soft)]',
      )}
    >
      <div
        className="reveal flex items-start justify-between gap-4"
        data-visible={inView}
        style={stage(0)}
      >
        <Badge tone={project.featured ? 'accent' : 'neutral'}>{project.category}</Badge>
        {project.featured ? (
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
            Featured
          </span>
        ) : null}
      </div>

      <h2
        className={cn('reveal mt-4 font-display', wide ? 'text-[1.6rem]' : 'text-[1.18rem]')}
        data-visible={inView}
        style={stage(1)}
      >
        {/* The whole card is the target: the link stretches over it so the hit
            area matches what a person perceives as clickable, while the
            accessible name stays just the project title. */}
        <Link
          href={`/projects/${project.id}`}
          data-testid={`project-link-${project.id}`}
          className="after:absolute after:inset-0 after:content-['']"
        >
          {project.title}
        </Link>
      </h2>

      <p
        className="reveal mt-3 flex-1 text-[0.92rem] leading-relaxed text-[var(--text-secondary)]"
        data-visible={inView}
        style={stage(2)}
      >
        {view === 'business' ? project.businessView : project.technicalView}
      </p>

      <ul className="reveal mt-5 flex flex-wrap gap-1.5" data-visible={inView} style={stage(3)}>
        {project.technologies.map((tech) => (
          <li
            key={tech}
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 font-mono text-[0.68rem] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] group-hover:border-[var(--border)]"
          >
            {tech}
          </li>
        ))}
      </ul>

      {project.impact[0] ? (
        <p
          className="reveal mt-4 flex gap-2 border-t border-[var(--border-subtle)] pt-4 text-[0.84rem] leading-relaxed text-[var(--text-muted)]"
          data-visible={inView}
          style={stage(4)}
        >
          <span aria-hidden="true" className="text-[var(--success)]">
            ✓
          </span>
          {project.impact[0]}
        </p>
      ) : null}

      <p className="mt-4 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--accent-primary)]">
        Read the case study
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
        >
          →
        </span>
      </p>
    </article>
  );
}
