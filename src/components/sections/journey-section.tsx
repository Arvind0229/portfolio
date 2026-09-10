'use client';

import { Badge, Reveal } from '@/components/ui';
import { experience } from '@/data/experience';
import { education } from '@/data/profile';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils/cn';

/**
 * The journey.
 *
 * Education used to be four lines in a sidebar card, which undersold a real
 * progression: school, then an IT degree, then recruitment, then the move into
 * automation and the promotion to on-role RPA Developer. Laid out as one
 * chronology it answers the question a hiring manager actually asks — how did
 * this person get here — in a single glance.
 *
 * Built entirely from existing data (`education` and `experience`); nothing is
 * added, no date is invented. The rail draws itself as the section scrolls
 * into view via a transform on one element.
 */

type Milestone = {
  id: string;
  period: string;
  title: string;
  subtitle: string;
  kind: 'education' | 'career';
  note?: string;
  current?: boolean;
};

function buildMilestones(): Milestone[] {
  const educationMilestones: Milestone[] = education.map((item) => ({
    id: `edu-${item.id}`,
    period: item.period,
    title: item.qualification,
    subtitle: item.institution,
    kind: 'education',
  }));

  const careerMilestones: Milestone[] = experience.map((item) => ({
    id: `career-${item.id}`,
    period: item.period,
    title: item.role,
    subtitle: `${item.company}, ${item.location}`,
    kind: 'career',
    note: item.summary,
    current: item.current,
  }));

  // Oldest first: a journey reads forwards. Education entries are already in
  // reverse-chronological order in the data, so they are flipped here rather
  // than duplicated in a second order elsewhere.
  return [...educationMilestones.slice().reverse(), ...careerMilestones];
}

export function JourneySection() {
  const milestones = buildMilestones();
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.08 });

  return (
    <div id="journey" className="scroll-mt-24">

      <div ref={ref} className="relative mt-14 pl-8 sm:pl-10">
        {/* The rail. One element, one transform, drawn on entry. */}
        <span
          aria-hidden="true"
          className="absolute left-[0.4375rem] top-1 w-px origin-top sm:left-[0.6875rem]"
          style={{
            height: 'calc(100% - 0.5rem)',
            background:
              'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary) 55%, transparent)',
            transform: `scaleY(${inView ? 1 : 0})`,
            transition: 'transform 1200ms var(--ease-out)',
          }}
        />

        <ol className="space-y-4">
          {milestones.map((milestone, index) => (
            <Reveal as="li" key={milestone.id} delay={index * 80} className="relative">
              {/* Node */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -left-8 top-5 grid h-4 w-4 place-items-center rounded-full border sm:-left-10',
                  milestone.current
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                    : 'border-[var(--border)] bg-[var(--surface)]',
                  // Only the milestone that is still happening pulses. Every
                  // other node on this timeline is a finished event and sits
                  // still, which is what makes the one that moves mean
                  // "ongoing" rather than "decorated".
                  milestone.current && 'node-live',
                )}
                style={
                  milestone.current
                    ? { boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent-primary) 18%, transparent)' }
                    : undefined
                }
              >
                {!milestone.current ? (
                  <span
                    className={cn(
                      'block h-1.5 w-1.5 rounded-full',
                      milestone.kind === 'career'
                        ? 'bg-[var(--accent-secondary)]'
                        : 'bg-[var(--text-subtle)]',
                    )}
                  />
                ) : null}
              </span>

              <article className="surface-card p-5 transition-[border-color,transform] duration-[var(--motion-base)] hover:-translate-y-0.5 hover:border-[var(--accent-primary)]">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <p className="font-mono text-[0.72rem] tracking-wide text-[var(--text-muted)]">
                    {milestone.period}
                  </p>
                  <Badge tone={milestone.current ? 'accent' : 'muted'}>
                    {milestone.current
                      ? 'Current'
                      : milestone.kind === 'education'
                        ? 'Education'
                        : 'Career'}
                  </Badge>
                </div>

                <h3 className="mt-2 font-display text-[1.02rem]">{milestone.title}</h3>
                <p className="mt-1 text-[0.88rem] text-[var(--text-secondary)]">
                  {milestone.subtitle}
                </p>
                {milestone.note ? (
                  <p className="mt-3 text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
                    {milestone.note}
                  </p>
                ) : null}
              </article>
            </Reveal>
          ))}
        </ol>
      </div>
    </div>
  );
}
