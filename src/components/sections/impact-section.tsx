'use client';

import { Icon, IconTile, type IconName } from '@/components/icons';
import { Reveal } from '@/components/ui';
import { achievements, impactMetrics, impactNarrative } from '@/data/impact';
import { useCountUp } from '@/hooks/use-count-up';
import { useInView } from '@/hooks/use-in-view';

/**
 * Which icon fronts which metric.
 *
 * This map lives here and not in `src/data/impact.ts` on purpose. The data
 * module is the single source of truth for what is *true about Arvind* — every
 * value in it is traceable to the resume. An icon is a presentation choice
 * about how to draw a number, so it belongs to the component that draws it.
 * Keeping them apart means restyling never risks touching the facts, and the
 * data-integrity tests stay a check on content rather than on styling.
 */
const METRIC_ICONS: Record<string, IconName> = {
  automations: 'bot',
  effort: 'bolt',
  databases: 'database',
  interns: 'users',
};

/**
 * Business impact.
 *
 * Only figures that appear in the resume are shown. "Hundreds of operational
 * hours a year" is a range in the source, so it is presented as a sentence
 * rather than dressed up as a precise counter.
 */
export function ImpactSection() {
  // No `id` on the section here: the page's Section wrapper owns the anchor.
  // Two elements sharing one id is invalid HTML, and it makes
  // `document.getElementById` — which the scroll spy relies on — return
  // whichever came first rather than the section.
  return (
    <section className="scroll-mt-24">
      {/* Four separate panels rather than four columns inside one: the design
          reads each number as its own object, and on a phone the panels stack
          into four legible cards instead of one very tall strip. */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {impactMetrics.map((metric, index) => (
          <Metric key={metric.id} metric={metric} delay={index * 90} />
        ))}
      </div>

      <Reveal delay={120}>
        <p className="mt-8 max-w-3xl text-[1.02rem] leading-relaxed text-[var(--text-secondary)]">
          {impactNarrative}
        </p>
      </Reveal>

      <ul className="mt-10 grid gap-3 md:grid-cols-2">
        {achievements.map((achievement, index) => (
          <Reveal as="li" key={achievement} delay={index * 60}>
            <div className="surface-card flex h-full gap-3 p-5">
              <Icon
                name="check"
                size={16}
                className="mt-1 shrink-0 text-[var(--accent-secondary)]"
              />

              <p className="text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
                {achievement}
              </p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function Metric({
  metric,
  delay,
}: {
  metric: (typeof impactMetrics)[number];
  delay: number;
}) {
  // 0.4 was too demanding on a narrow screen: stacked in a tall panel, the
  // last metric could sit mostly below the fold at rest and never start
  // counting, leaving a visitor looking at a zero.
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.15,
    rootMargin: '0px',
  });
  const value = useCountUp(metric.value, inView, delay);

  const icon = METRIC_ICONS[metric.id];

  return (
    <div ref={ref} className="surface-card h-full p-6">
      {icon ? <IconTile name={icon} /> : null}
      <p className="mt-5 font-display text-[clamp(2.2rem,5.4vw,3rem)] leading-none text-[var(--text-primary)]">
        {metric.prefix}
        <span data-testid={`metric-${metric.id}`}>{value}</span>
        <span className="text-[var(--accent-primary)]">{metric.suffix}</span>
      </p>
      {/*
        A meter, but only where a proportion is real. `outOf` is present on the
        percentage metric and absent on the three counts, so the bar appears
        exactly where a fill level carries information and nowhere else — see
        the note on `ImpactMetric`. The width comes from the data through a
        custom property, so no figure is ever written into the CSS.
      */}
      {metric.outOf ? (
        <div
          className="meter mt-4"
          data-filled={inView ? 'true' : 'false'}
          role="img"
          aria-label={`${metric.value} out of ${metric.outOf}`}
        >
          <span
            className="meter-fill"
            style={{ ['--meter-value' as string]: `${(metric.value / metric.outOf) * 100}%` }}
          />
        </div>
      ) : null}

      <p className="mt-3 text-[0.86rem] font-medium text-[var(--text-primary)]">
        {metric.label}
      </p>
      <p className="mt-1 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
        {metric.detail}
      </p>
    </div>
  );
}
