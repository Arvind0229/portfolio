'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@/components/icons';
import { Badge, Reveal } from '@/components/ui';
import { architectureFlows } from '@/data/impact';
import { AutomationPipeline } from '@/components/visuals/automation-pipeline';
import { RunMonitor } from '@/components/visuals/run-monitor';
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
    <section id="architecture" className="scroll-mt-24">

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

        {/* The same pipeline component as the hero, fed by whichever flow is
            selected — one implementation, two contexts. */}
        <div className="glass mt-8 p-5 sm:p-7">
          <AutomationPipeline
            stages={active.steps.map((step) => ({ id: step.id, label: step.label }))}
          />
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

        {/* The pipeline above shows the shape of an automation. This shows one
            going through it — which is the part a business reader actually
            pictures when they hear "the bot runs overnight". */}
        <div className="mt-16 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start">
          <Reveal>
            <RunMonitor />
          </Reveal>
          <Reveal delay={90}>
            <div className="surface-card h-full p-5 sm:p-7">
              <h3 className="font-display text-[1.15rem]">What a run leaves behind</h3>
              <p className="mt-2.5 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                Every one of these finishes somewhere a person can check. That is the difference
                between an automation that survives its first exception and one that quietly stops
                and nobody notices for a week.
              </p>
              <ul className="mt-5 space-y-3">
                {RUN_OUTPUTS.map((output) => (
                  <li key={output.label} className="flex items-start gap-3">
                    <Icon
                      name={output.icon}
                      size={16}
                      className="mt-1 shrink-0 text-[var(--accent-secondary)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.88rem] font-medium text-[var(--text-primary)]">
                        {output.label}
                      </span>
                      <span className="block text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                        {output.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* Presentation-side list: what the runtime produces, which is the half of
   "monitored" that a diagram cannot show. Each of these is described in the
   resume — updated systems, MIS, alerts and an audit trail. */
const RUN_OUTPUTS: ReadonlyArray<{ icon: IconName; label: string; detail: string }> = [
  {
    icon: 'layers',
    label: 'Updated systems',
    detail: 'LOS, LMS and downstream records written back, not just read.',
  },
  {
    icon: 'chart',
    label: 'MIS and dashboards',
    detail: 'Product-wise reports out on schedule, formatted and ready to read.',
  },
  {
    icon: 'shield',
    label: 'Exceptions raised',
    detail: 'Anything that fails a rule reaches the right team while it can still be fixed.',
  },
  {
    icon: 'document',
    label: 'An audit trail',
    detail: 'Logs that answer what ran, when, and what it touched.',
  },
];
