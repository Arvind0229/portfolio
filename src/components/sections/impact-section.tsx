'use client';

import { useEffect, useRef, useState } from 'react';
import { Reveal, Section, SectionHeading } from '@/components/ui';
import { achievements, impactMetrics, impactNarrative } from '@/data/impact';
import { useInView } from '@/hooks/use-in-view';

/**
 * Business impact.
 *
 * Only figures that appear in the resume are shown. "Hundreds of operational
 * hours a year" is a range in the source, so it is presented as a sentence
 * rather than dressed up as a precise counter.
 */
export function ImpactSection() {
  return (
    <Section id="impact" ariaLabel="Business impact">
      <SectionHeading
        eyebrow="Impact"
        title="What the automation actually changed"
        description="Every number below appears in the resume. Nothing here is estimated or extrapolated."
      />

      <div className="glass mt-12 grid gap-8 p-7 sm:grid-cols-2 sm:p-9 lg:grid-cols-4">
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
              <span aria-hidden="true" className="mt-0.5 text-[var(--accent-primary)]">
                ▸
              </span>
              <p className="text-[0.92rem] leading-relaxed text-[var(--text-secondary)]">
                {achievement}
              </p>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

function Metric({
  metric,
  delay,
}: {
  metric: (typeof impactMetrics)[number];
  delay: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  const value = useCountUp(metric.value, inView, delay);

  return (
    <div ref={ref}>
      <p className="font-display text-[clamp(2.4rem,6vw,3.4rem)] leading-none text-[var(--text-primary)]">
        {metric.prefix}
        <span data-testid={`metric-${metric.id}`}>{value}</span>
        <span className="text-[var(--accent-primary)]">{metric.suffix}</span>
      </p>
      <p className="mt-3 text-[0.86rem] font-medium text-[var(--text-primary)]">{metric.label}</p>
      <p className="mt-1 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">{metric.detail}</p>
    </div>
  );
}

/**
 * Counter animation.
 *
 * requestAnimationFrame rather than setInterval so the count is tied to frames
 * rather than to timer drift, and it pauses with the tab. Visitors who prefer
 * reduced motion get the final number immediately — the information matters,
 * the animation does not.
 */
function useCountUp(target: number, start: boolean, delayMs: number): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    const duration = 1100;
    let startTime: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function step(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min(1, (timestamp - startTime) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    }

    timeoutId = setTimeout(() => {
      frameRef.current = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [start, target, delayMs]);

  return value;
}
