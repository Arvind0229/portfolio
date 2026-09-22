'use client';

import { useEffect } from 'react';

/**
 * Click feedback for every button, with a special effect for some.
 *
 * Arvind asked for each button to answer a click with its own animation:
 * download, WhatsApp, "Get in touch" and mail each get something different,
 * and every other button gets something too.
 *
 * ## How
 *
 * There is one `click` listener on the document, not one per button. When a
 * click lands on a `.fx-btn` or on an element with `[data-fx]`, the listener:
 *
 * - writes where the click landed as `--fx-x` / `--fx-y`, so the ripple
 *   starts under the finger;
 * - sets `data-fx-play` to the kind of effect, which restarts it if the button
 *   is clicked again;
 * - clears the attribute once the effect has finished.
 *
 * CSS does all the drawing (see CLICK EFFECTS in globals.css):
 *
 * - `ripple` (the default): a ring spreading from the click point.
 * - `download`: a progress bar fills and the arrow drops.
 * - `whatsapp`: a green "typing…" bubble floats up and the button pulses.
 * - `mail`: a paper plane takes off.
 * - `hello` ("Get in touch"): a burst of sparks and a pop.
 * - `call`: the button rings (shakes).
 * - `browser` (opens in a new tab): the arrow flies up and out.
 *
 * The click itself is never delayed or stopped. Downloads, mail and new tabs
 * go ahead at once; the effect plays alongside.
 *
 * Nothing runs under reduced motion, using the same two-part check as the rest
 * of the site. Keyboard activation (a click with no pointer position) starts
 * the ripple from the centre.
 */

const DURATION: Record<string, number> = {
  ripple: 650,
  download: 1300,
  whatsapp: 1500,
  mail: 1300,
  hello: 1000,
  call: 800,
  browser: 900,
};

export function ClickEffects() {
  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

    const onClick = (event: MouseEvent) => {
      if (reducedQuery.matches && document.documentElement.dataset.motion !== 'full') return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-fx], .fx-btn')
          : null;
      if (!target) return;

      const kind = target.dataset.fx ?? 'ripple';
      const rect = target.getBoundingClientRect();
      const fromPointer = event.detail > 0 && (event.clientX !== 0 || event.clientY !== 0);
      target.style.setProperty('--fx-x', `${fromPointer ? event.clientX - rect.left : rect.width / 2}px`);
      target.style.setProperty('--fx-y', `${fromPointer ? event.clientY - rect.top : rect.height / 2}px`);

      // Restart: remove, force a style flush, set again.
      target.removeAttribute('data-fx-play');
      void target.offsetWidth;
      target.setAttribute('data-fx-play', kind);

      const previous = timers.get(target);
      if (previous) clearTimeout(previous);
      timers.set(
        target,
        setTimeout(() => target.removeAttribute('data-fx-play'), DURATION[kind] ?? 700),
      );
    };

    document.addEventListener('click', onClick, { passive: true });
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
