'use client';

import { useState } from 'react';
import { Badge, Reveal, Section, SectionHeading } from '@/components/ui';
import { architectureFlows } from '@/data/impact';
import { cn } from '@/lib/utils/cn';

/**
 * Architecture.
 *
 * Both flows shown here are marked `verified` in the data layer because both
 * describe how the delivered automations actually work, per the resume. If a
 * conceptual diagram is ever added, it carries `verified: false` and renders
 * with an explicit "Illustrative" label — a diagram that implies production
 * architecture it does not have is a lie told in pictures.
 */
export function ArchitectureSection() {
  const [activeId, setActiveId] = useState(architectureFlows[0]?.id ?? '');
  const active = architectureFlows.find((flow) => flow.id === activeId) ?? architectureFlows[0];

  if (!active) return null;

  return (
    <Section id="architecture" ariaLabel="Engineering approach">
      <SectionHeading
        eyebrow="Architecture"
        title="How an automation gets from a conversation to production"
        description="Two views of the same discipline: the delivery cycle around every bot, and the runtime shape of the bots themselves."
      />

      <div
        className="mt-10 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Architecture views"
      >
        {architectureFlows.map((flow) => (
          <button
            key={flow.id}
            type="button"
            role="tab"
            id={`arch-tab-${flow.id}`}
            aria-selected={flow.id === active.id}
            aria-controls={`arch-panel-${flow.id}`}
            onClick={() => setActiveId(flow.id)}
            data-testid={`arch-tab-${flow.id}`}
            className={cn(
              'rounded-full border px-4 py-2 text-[0.82rem] transition-colors duration-[var(--motion-fast)]',
              flow.id === active.id
                ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] text-[var(--accent-primary)]'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            {flow.name}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`arch-panel-${active.id}`}
        aria-labelledby={`arch-tab-${active.id}`}
        className="mt-8"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={active.verified ? 'success' : 'neutral'}>
            {active.verified ? 'Reflects delivered systems' : 'Illustrative'}
          </Badge>
          <p className="text-[0.88rem] text-[var(--text-muted)]">{active.caption}</p>
        </div>

        <ol className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {active.steps.map((step, index) => (
            <Reveal as="li" key={step.id} delay={index * 70} className="surface-card relative h-full p-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] font-mono text-[0.7rem] text-[var(--accent-primary)]"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[0.95rem]">{step.label}</h3>
                </div>
                <p className="mt-3 text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
                  {step.detail}
                </p>
                {index < active.steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-3 left-8 hidden h-3 w-px md:block"
                    style={{ background: 'var(--border)' }}
                  />
                ) : null}
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
