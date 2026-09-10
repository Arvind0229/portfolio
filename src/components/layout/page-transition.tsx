'use client';

import { usePathname } from 'next/navigation';

/**
 * A short entrance on every route change.
 *
 * Client-side navigation in an app router is instant, and instant with no
 * visual acknowledgement reads as *nothing happened* — people click the link
 * again. A 320ms fade-and-rise says the page changed, which is the entire job.
 *
 * ## Why a `key`, and not a transition library
 *
 * Changing the `key` on the wrapper makes React tear down the old subtree and
 * mount a new one, which restarts the CSS animation. That is the whole
 * mechanism: no library, no exit animation to coordinate, no state machine
 * that can get stuck showing a half-faded page if a navigation is interrupted.
 *
 * The trade is that there is no exit animation — the outgoing page vanishes
 * rather than fading out. That is the right trade here: an exit animation
 * means *delaying* the new page to play it, so every navigation gets slower to
 * look smoother. Enter-only keeps the site feeling fast, which is the point.
 *
 * ## What it deliberately does not do
 *
 * It animates `opacity` and `transform` only, so the compositor handles it and
 * layout never runs. It does not touch scroll position — Next already restores
 * that, and fighting it is how "the page jumps when I go back" happens. And it
 * is gone entirely under `prefers-reduced-motion`, where an unannounced
 * instant change is exactly what was asked for.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
