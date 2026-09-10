import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

/**
 * The masthead every route shares.
 *
 * One component owns the page header so the numbering, eyebrow, title scale
 * and spacing stay identical across ten routes — the thing that most often
 * drifts once pages are built one at a time.
 */
export function PageIntro({
  index,
  eyebrow,
  title,
  description,
  aside,
}: {
  /** Two-digit section number, e.g. "02". Purely a wayfinding cue. */
  index?: string;
  eyebrow: string;
  title: ReactNode;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="relative">
      {/* The eyebrow is a pill, not a line of text: it is the one element that
          repeats on every route, so it carries the design's signature — a lit
          dot, a hairline border and the same frosted fill as the panels. */}
      <Reveal>
        <p className="surface-card inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[var(--accent-primary)]">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary)]"
            style={{ boxShadow: '0 0 8px 1px var(--accent-glow)' }}
          />
          {index ? <span className="text-[var(--text-subtle)]">{index}</span> : null}
          {eyebrow}
        </p>
      </Reveal>

      <div
        className={cn(
          'mt-4 gap-10',
          aside ? 'lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-end' : '',
        )}
      >
        <div>
          <Reveal delay={70}>
            <h1 className="font-display text-[clamp(2rem,5.4vw,3.4rem)] leading-[1.05]">
              {title}
            </h1>
          </Reveal>
          {description ? (
            <Reveal delay={140}>
              <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[var(--text-secondary)]">
                {description}
              </p>
            </Reveal>
          ) : null}
        </div>
        {aside ? (
          <Reveal delay={200} className="mt-6 lg:mt-0">
            {aside}
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}

/** Standard page shell: max width, gutters and vertical rhythm. */
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[76rem] px-5 pb-24 pt-28 sm:px-8 md:pt-32',
        className,
      )}
    >
      {children}
    </div>
  );
}
