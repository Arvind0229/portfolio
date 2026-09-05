'use client';

import { useState } from 'react';
import { Badge, Reveal, Section, SectionHeading } from '@/components/ui';
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
  return (
    <Section id="experience" ariaLabel="Professional experience">
      <SectionHeading
        eyebrow="Experience"
        title="Where the work happened"
        description="From IT Executive to on-role RPA Developer — and, before that, the recruitment years that taught the stakeholder side of delivery."
      />

      <ol className="mt-14 space-y-4">
        {experience.map((item, index) => (
          <Reveal as="li" key={item.id} delay={index * 90}>
            <ExperienceCard item={item} />
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

function ExperienceCard({ item }: { item: (typeof experience)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleHighlights = expanded ? item.highlights : item.highlights.slice(0, 4);
  const hasMore = item.highlights.length > 4;
  const panelId = `experience-panel-${item.id}`;

  return (
    <article className="surface-card relative overflow-hidden p-6 sm:p-8">
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{
          background: item.current
            ? 'linear-gradient(180deg, var(--accent-primary), transparent)'
            : 'var(--border)',
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[1.15rem]">{item.role}</h3>
            {item.current ? <Badge tone="accent">Current</Badge> : null}
          </div>
          <p className="mt-1 text-[0.95rem] text-[var(--text-secondary)]">
            {item.company} · {item.location}
          </p>
        </div>
        <p className="font-mono text-[0.78rem] text-[var(--text-muted)]">{item.period}</p>
      </div>

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
