'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Count a number up to its target once it is worth watching.
 *
 * This was written twice — once inside the impact section and once, nearly,
 * for the hero — which is the point at which it becomes a hook. Both callers
 * now share one implementation, so a fix to the easing or the reduced-motion
 * behaviour lands in both.
 *
 * Three things it does deliberately:
 *
 *   - **requestAnimationFrame, not setInterval.** The count is tied to frames
 *     rather than to timer drift, and it pauses with the tab instead of
 *     burning through a hundred updates in a background tab.
 *   - **Reduced motion gets the number, immediately — and without waiting to
 *     be scrolled to.** The information is the figure; the counting is
 *     decoration. Gating the value on visibility left a figure below the fold
 *     reading "0" for someone who had asked for less motion.
 *   - **It only runs when `start` is true.** Callers pass their in-view state,
 *     so a counter below the fold does not finish before anyone sees it —
 *     which is the failure that makes these look broken rather than absent.
 */
export function useCountUp(target: number, start: boolean, delayMs = 0): number {
  /*
   * Starts at the REAL figure, not 0.
   *
   * It used to start at 0, which is what the server rendered — so the HTML
   * that search engines, link previews and every visitor before JavaScript
   * runs see said "0+ production automations" and "0%+ manual effort
   * reduced". Arvind saw exactly that on the live site. Now the server
   * renders the true value, and only a client that is going to animate drops
   * it to 0 (below) so it can count up when it scrolls into view.
   */
  const [value, setValue] = useState(target);
  const frameRef = useRef<number | null>(null);

  // Arm the count-up: motion allowed and not yet started → hold at 0 until
  // `start`. Reduced motion (without the site's opt-back-in) keeps the value.
  useEffect(() => {
    if (start) return;
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      document.documentElement.dataset.motion !== 'full';
    if (!reduced) setValue(0);
    // Only on mount: once armed, the effect below takes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Reduced motion resolves immediately, and — this is the part that was
   * wrong — *without waiting for `start`*.
   *
   * Gating on `start` is correct for the animation: a counter that finishes
   * before anyone scrolls to it looks broken. But when there is no animation,
   * `start` is gating the **value**, so a figure below the fold sat at zero
   * for someone who had asked for less motion. An E2E check at 768px caught
   * it reading "0" where the resume says 80.
   *
   * So the two concerns are separated: this effect owns the no-motion case
   * and ignores visibility entirely; the one below owns the animation and
   * still waits to be seen.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (query.matches) setValue(target);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [target]);

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
      // easeOutCubic — fast at first, settling into the final figure, which
      // reads as a value arriving rather than a slot machine stopping.
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
