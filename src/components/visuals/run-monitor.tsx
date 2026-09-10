'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { runSteps } from '@/data/automation-flow';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils/cn';

/**
 * A run, happening.
 *
 * The pipeline beside this shows the *shape* of an automation. This shows one
 * going through it: each step lights, works, and ticks off, then the run
 * completes and starts again.
 *
 * ## It is labelled illustrative, and that is not decoration
 *
 * A panel that ticks through "Reading data… Validating… Completed" on a
 * portfolio looks exactly like a status feed from a live system, and it is
 * not one. So it says so, on the panel, in text a visitor reads before they
 * read the steps — not in a tooltip and not in a comment. The steps
 * themselves are the real shape of the work described in the resume; the
 * *timing* is a demonstration.
 *
 * ## Why a timer and not fifteen CSS animations
 *
 * The pure-CSS version is three stacked spans per row cross-faded by staggered
 * keyframes — off the main thread, but fifteen animations to keep in sync by
 * hand, and the "which step is running" state exists only as a visual
 * coincidence of their offsets. One interval at 1.4s holds that state
 * explicitly, costs one tick a second and a half, and can be read by a test.
 * Compositor purity is worth a lot; it is not worth encoding a state machine
 * in animation-delay.
 *
 * The timer is only running while the panel is on screen, and never starts at
 * all under `prefers-reduced-motion` — which gets the finished run instead,
 * because the information is the steps, not the ticking.
 */

const STEP_MS = 1400;
/** How long the finished run is held before it starts over. */
const HOLD_MS = 2600;

type Phase = 'running' | 'complete';

export function RunMonitor({ className }: { className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('running');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduced) {
      // The finished run, immediately. Nothing to watch, everything to read.
      setIndex(runSteps.length);
      setPhase('complete');
      return;
    }
    if (!inView) return;

    const delay = phase === 'complete' ? HOLD_MS : STEP_MS;
    const timer = setTimeout(() => {
      if (phase === 'complete') {
        setIndex(0);
        setPhase('running');
        return;
      }
      const next = index + 1;
      setIndex(next);
      if (next >= runSteps.length) setPhase('complete');
    }, delay);

    return () => clearTimeout(timer);
  }, [inView, index, phase, reduced]);

  const done = phase === 'complete';
  const progress = done ? 1 : index / runSteps.length;

  return (
    <div
      ref={ref}
      className={cn('surface-card overflow-hidden p-5 sm:p-6', className)}
      data-testid="run-monitor"
      data-phase={phase}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          {done ? 'Run complete' : 'Automation in progress'}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-medium',
            done
              ? 'border-[color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]'
              : 'border-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] text-[var(--accent-primary)]',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              done ? 'bg-[var(--success)]' : 'run-pip bg-[var(--accent-primary)]',
            )}
          />
          {done ? 'Completed' : `Step ${Math.min(index + 1, runSteps.length)} of ${runSteps.length}`}
        </span>
      </div>

      {/*
        `aria-live="off"`, deliberately.

        This loops forever. Announcing every step change would make a screen
        reader talk over the page indefinitely, which is worse than useless —
        so the list is a static, readable description of what a run does, and
        the animation is presentation on top of it. The states are conveyed by
        text as well as colour, so nothing depends on seeing the tint.
      */}
      <ol className="mt-5 space-y-2.5" aria-live="off">
        {runSteps.map((step, position) => {
          const state = done || position < index ? 'done' : position === index ? 'active' : 'pending';
          return (
            <li key={step.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-[color,border-color,background-color] duration-[var(--motion-base)]',
                  state === 'done' &&
                    'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]',
                  state === 'active' &&
                    'run-step-active border-[var(--accent-primary)] text-[var(--accent-primary)]',
                  state === 'pending' && 'border-[var(--border)] text-transparent',
                )}
              >
                {state === 'done' ? <Icon name="check" size={11} /> : null}
                {state === 'active' ? (
                  <span className="block h-1.5 w-1.5 rounded-full bg-current" />
                ) : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={cn(
                      'text-[0.9rem] font-medium transition-colors duration-[var(--motion-base)]',
                      state === 'pending'
                        ? 'text-[var(--text-muted)]'
                        : 'text-[var(--text-primary)]',
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    {state === 'done' ? 'done' : state === 'active' ? 'running' : 'queued'}
                  </span>
                </span>
                <span className="mt-0.5 block text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                  {step.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div
        className="mt-5 h-1 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]"
        role="presentation"
      >
        <span
          className="block h-full rounded-full transition-[width] duration-[var(--motion-slow)] ease-[var(--ease-out)]"
          style={{
            width: `${progress * 100}%`,
            background: 'var(--gradient-signature)',
          }}
        />
      </div>

      <p className="mt-3 text-[0.74rem] leading-relaxed text-[var(--text-subtle)]">
        Illustrative — the steps are how these automations actually run; the timing here is a
        demonstration, not a live status feed.
      </p>
    </div>
  );
}
