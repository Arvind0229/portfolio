'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { Badge, Reveal } from '@/components/ui';
import { experience } from '@/data/experience';
import { cn } from '@/lib/utils/cn';

/**
 * Experience timeline.
 *
 * The current role has thirteen responsibilities in the resume. Rendering all
 * of them as a wall of bullets is the single fastest way to lose a recruiter,
 * so the first four are shown and the rest are one click away — progressive
 * disclosure, with the full text always present in the DOM for search and for
 * assistive technology once expanded.
 */
export function ExperienceSection() {
  // No `id` on the section here: the page's Section wrapper owns the anchor.
  // Two elements sharing one id is invalid HTML, and it makes
  // `document.getElementById` — which the scroll spy relies on — return
  // whichever came first rather than the section.
  return (
    <section className="scroll-mt-24">

      <ol className="mt-14 space-y-4">
        {experience.map((item, index) => (
          <Reveal as="li" key={item.id} delay={index * 90}>
            <ExperienceCard item={item} />
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function ExperienceCard({ item }: { item: (typeof experience)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleHighlights = expanded ? item.highlights : item.highlights.slice(0, 4);
  const hasMore = item.highlights.length > 4;
  const panelId = `experience-panel-${item.id}`;

  return (
    <article className="surface-card relative overflow-hidden p-6 sm:p-8">
      {/*
        The edge bar. On the role he still holds, a charge runs down it — the
        same vocabulary as the hero's connectors, and the animation is a
        statement about the data rather than decoration spread evenly over a
        list: the finished role keeps a flat bar, because it is finished.
      */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-0 h-full w-[3px]',
          item.current && 'role-bar-live',
        )}
        style={
          item.current
            ? { backgroundColor: 'color-mix(in srgb, var(--accent-primary) 30%, transparent)' }
            : { background: 'var(--border)' }
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[1.15rem]">{item.role}</h3>
            {item.current ? <Badge tone="accent">Current</Badge> : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem] text-[var(--text-secondary)]">
            <span>
              {item.company} · {item.location}
            </span>
            {item.companyProfile ? (
              <Badge tone="muted" className="border border-[var(--border-subtle)]">
                {item.companyProfile.sector}
              </Badge>
            ) : null}
          </p>
        </div>
        <p className="font-mono text-[0.78rem] text-[var(--text-muted)]">{item.period}</p>
      </div>

      {/* What the employer does. A reader who has not heard of SBFC cannot
          judge "automated the LOS–LMS environment" until they know it is a
          lender — so the context comes before the responsibilities, not
          after them. */}
      {item.companyProfile ? (
        <div className="surface-elevated mt-5 flex gap-3.5 p-4 sm:p-5">
          <Icon
            name="layers"
            size={17}
            className="mt-0.5 shrink-0 text-[var(--accent-secondary)]"
          />
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
              About {item.company}
            </p>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--text-secondary)]">
              {item.companyProfile.what}
            </p>
            <p className="mt-2.5 text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
              {item.companyProfile.relevance}
            </p>
          </div>
        </div>
      ) : null}

      <p className="mt-5 max-w-3xl text-[0.93rem] leading-relaxed text-[var(--text-secondary)]">
        {item.summary}
      </p>

      <ul id={panelId} className="mt-6 space-y-2.5">
        {visibleHighlights.map((highlight) => (
          <li key={highlight} className="flex gap-3 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
            <span
              aria-hidden="true"
              className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-[var(--accent-primary)]"
            />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
          data-testid={`experience-toggle-${item.id}`}
          className="mt-5 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] text-[0.82rem] font-medium text-[var(--accent-primary)] transition-opacity duration-[var(--motion-fast)] hover:opacity-80"
        >
          {expanded
            ? 'Show less'
            : `Show all ${item.highlights.length} responsibilities`}
          <span
            aria-hidden="true"
            className={cn(
              'inline-block transition-transform duration-[var(--motion-base)]',
              expanded && 'rotate-180',
            )}
          >
            ↓
          </span>
        </button>
      ) : null}

      <div className="hairline my-6" />

      <ul className="flex flex-wrap gap-1.5" aria-label={`Technologies used at ${item.company}`}>
        {item.technologies.map((tech) => (
          <li
            key={tech}
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-1 font-mono text-[0.7rem] text-[var(--text-muted)]"
          >
            {tech}
          </li>
        ))}
      </ul>
    </article>
  );
}
