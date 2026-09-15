'use client';

import { useEffect, useRef, useState } from 'react';
import { RobotFigure } from '@/components/visuals/robot-figure';
import { useAppearance } from '@/hooks/use-appearance';

/**
 * The robot's state machine.
 *
 * ## What changed and why
 *
 * The robot used to be a single 22-second CSS cycle that leaned in from the
 * corner and withdrew, and — a real defect — it rendered in **every theme**,
 * because `hero.tsx` mounted it with no theme check at all. It now lives
 * here, it is mounted only on Midnight, and the lean-in is one state of six
 * rather than the whole performance.
 *
 * ## Why a ref and an attribute rather than React state per step
 *
 * A `setState` per animation step re-renders the hero — the name, the CTAs,
 * the automation graph — to move a decorative SVG. So the machine holds its
 * state in a ref, writes `data-state` on one wrapper element, and CSS does
 * the rest. React renders this component twice in its life: once to mount,
 * once to unmount. The only state that reaches React is `mounted`, which
 * flips once.
 *
 * ## One timer, always cleared
 *
 * Exactly one `setTimeout` is outstanding at any moment. It is stored in a
 * ref and cleared in the effect's cleanup, which runs on unmount **and** on a
 * theme change (the component is unmounted by `hero.tsx` when the theme is no
 * longer Midnight) **and** on a route change. There is no interval, no
 * animation frame, and no listener, so there is nothing else that could
 * outlive the component.
 *
 * ## Safe zone
 *
 * `--robot-x` is bounded to the right-hand gutter, which is empty at `xl:` and
 * above — that is why the figure does not render below 1280px, where there is
 * no gutter to walk in. The wrapper is `aria-hidden` and `pointer-events:none`
 * in every state, so it can never take a click from a control or be announced
 * to a screen reader.
 */

/*
 * Which themes get the robot: Midnight, and only Midnight.
 *
 * Clay was tried, because the reference for that theme shows a robot beside
 * the workflow, and it was reverted after looking at it. The reference places
 * a 3D rendered mascot in a gap between the text column and the workflow
 * panel — a slot this hero does not have. Its right column *is* the workflow,
 * so the existing SVG lands on top of the panel and reads as a translucent
 * smudge over the diagram. The fix is a layout change to the hero or a real
 * mascot asset, not a transform, and neither is in scope here.
 */
const THEMES_WITH_ROBOT = new Set<string>(['engineering']);

type RobotState = 'hidden' | 'peeking' | 'observing' | 'walking' | 'idle' | 'hiding';

/**
 * How long each state lasts, in milliseconds, as `[min, max]`.
 *
 * Ranges rather than fixed values: a machine with fixed durations produces a
 * loop a viewer can predict after two cycles, and predictability is what makes
 * decoration start reading as a progress bar.
 */
const DURATION: Record<RobotState, readonly [number, number]> = {
  hidden: [22000, 46000],
  peeking: [1800, 2400],
  observing: [3000, 6000],
  walking: [4000, 8000],
  idle: [6000, 12000],
  hiding: [1100, 1400],
};

/** Where each state can go next, and how often. Sums are not normalised. */
const NEXT: Record<RobotState, readonly (readonly [RobotState, number])[]> = {
  hidden: [['peeking', 3], ['walking', 1]],
  peeking: [['observing', 3], ['hiding', 1]],
  observing: [['walking', 2], ['idle', 2], ['hiding', 2]],
  walking: [['observing', 2], ['idle', 1], ['hiding', 1]],
  idle: [['walking', 2], ['observing', 1], ['hiding', 1]],
  hiding: [['hidden', 1]],
};

function pick(range: readonly [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

function nextState(from: RobotState): RobotState {
  const options = NEXT[from];
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [state, weight] of options) {
    roll -= weight;
    if (roll <= 0) return state;
  }
  // Unreachable while every table above is non-empty, but the compiler cannot
  // know that and a cast would be a lie about it.
  return options[0]?.[0] ?? 'hidden';
}

export function RobotStage() {
  const { theme } = useAppearance();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<RobotState>('hidden');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !THEMES_WITH_ROBOT.has(theme)) return;

    /*
     * Reduced motion is the two-part check this project uses everywhere: the
     * OS preference AND the absence of an explicit opt back in. When it is
     * on, the machine never starts — the robot stays in one still state. It
     * is not slowed down, because a delayed animation still fires.
     */
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = query.matches && document.documentElement.dataset.motion !== 'full';

    const host = hostRef.current;
    if (!host) return;

    if (reduced) {
      host.dataset.state = 'observing';
      host.style.setProperty('--robot-x', '0px');
      return;
    }

    const step = () => {
      const from = stateRef.current;
      const to = nextState(from);
      stateRef.current = to;
      host.dataset.state = to;

      /*
       * The walk destination, chosen once per walk rather than per frame.
       * Bounded to the gutter: negative values move the figure left, away
       * from the page edge. Never positive — moving right is what made an
       * earlier version add 9px of document overflow at 1440, and the
       * keyframes in globals.css carry the width table that explains it.
       */
      if (to === 'walking') {
        host.style.setProperty('--robot-x', `${-40 - Math.random() * 90}px`);
      } else if (to === 'hidden' || to === 'hiding') {
        host.style.setProperty('--robot-x', '0px');
      }

      timerRef.current = setTimeout(step, pick(DURATION[to]));
    };

    timerRef.current = setTimeout(step, pick(DURATION.hidden));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      stateRef.current = 'hidden';
    };
  }, [mounted, theme]);

  // Studio and Crimson never get the robot. Isolation is a mount condition
  // rather than a CSS rule, so the figure cannot be revealed by a stray
  // selector or caught by a screenshot on a theme that should not have it.
  if (!THEMES_WITH_ROBOT.has(theme)) return null;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-testid="hero-robot"
      data-state="hidden"
      className="robot-stage pointer-events-none absolute -bottom-2 -right-6 hidden h-[19rem] w-[12.5rem] xl:block 2xl:-bottom-12 2xl:-right-24 2xl:h-[22rem] 2xl:w-[14.5rem]"
      style={{
        maskImage: 'linear-gradient(to left, #000 0%, #000 42%, transparent 88%)',
        WebkitMaskImage: 'linear-gradient(to left, #000 0%, #000 42%, transparent 88%)',
      }}
    >
      <RobotFigure className="robot-stage-body h-full w-full" />
    </div>
  );
}
