'use client';

import { useEffect } from 'react';

/**
 * A slight pull towards the cursor for the few controls marked `data-magnetic`.
 *
 * ## One listener, not one per button
 *
 * A hook on every button would mean a listener, a ref and a React tree per
 * control, all to move a few pixels. This is one `pointermove` on the
 * document, throttled to one write per frame, that writes two custom
 * properties on whichever marked element the pointer is over. CSS does the
 * movement through the `translate` property — separate from `transform`, so it
 * composes with the hover lift and press compression the buttons already have
 * instead of overriding them.
 *
 * React renders this component once and it returns `null`.
 *
 * ## When it does nothing
 *
 * - **Touch and pen.** There is no hover to be pulled by, and a translate left
 *   behind by a tap is a button that looks stuck.
 * - **Reduced motion.** The same two-part check the rest of the site uses: the
 *   OS preference, unless the visitor opted back in with `data-motion="full"`.
 *   Checked on every move rather than once, so switching the preference takes
 *   effect without a reload.
 * - **Keyboard.** Focus never moves anything; the effect is pointer-only.
 *
 * The pull is bounded to a few pixels whatever the button's size, so it can
 * never carry a control out from under the pointer that is trying to click it.
 */

const MAX_PULL_PX = 6;

export function MagneticField() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches) return;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let frame = 0;
    let active: HTMLElement | null = null;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;
    /* What has been applied to each element, so the pull is measured from
       where the button *is* rather than from where the pull has moved it —
       measuring the translated rect feeds the pull back into itself and the
       button shivers. */
    const applied = new WeakMap<HTMLElement, { x: number; y: number }>();

    const release = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.removeProperty('--mag-x');
      el.style.removeProperty('--mag-y');
      applied.delete(el);
    };

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      pending = null;
      // The pointer left this element between the move and the frame.
      if (el !== active) return;
      el.style.setProperty('--mag-x', `${x.toFixed(2)}px`);
      el.style.setProperty('--mag-y', `${y.toFixed(2)}px`);
      applied.set(el, { x, y });
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const reduced =
        reducedQuery.matches && document.documentElement.dataset.motion !== 'full';
      const target =
        !reduced && event.target instanceof Element
          ? (event.target.closest('[data-magnetic]') as HTMLElement | null)
          : null;

      if (target !== active) {
        release(active);
        active = target;
      }
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const offset = applied.get(target) ?? { x: 0, y: 0 };
      const cx = rect.left - offset.x + rect.width / 2;
      const cy = rect.top - offset.y + rect.height / 2;
      const dx = (event.clientX - cx) / (rect.width / 2);
      const dy = (event.clientY - cy) / (rect.height / 2);
      pending = {
        el: target,
        x: Math.max(-1, Math.min(1, dx)) * MAX_PULL_PX,
        y: Math.max(-1, Math.min(1, dy)) * MAX_PULL_PX * 0.6,
      };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onLeave = () => {
      release(active);
      active = null;
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
      release(active);
    };
  }, []);

  return null;
}
