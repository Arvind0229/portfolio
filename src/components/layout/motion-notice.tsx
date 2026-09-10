'use client';

import { useEffect, useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils/cn';

/**
 * "Nothing on this page moves" — answered on the page itself.
 *
 * ## The problem this exists to close
 *
 * The site honours `prefers-reduced-motion` completely: under it, a
 * frame-by-frame comparison of two screenshots seconds apart is byte-identical.
 * That is the right default and it is not up for negotiation.
 *
 * What was wrong was everything *around* it. Windows turns that preference on
 * for reasons that have nothing to do with websites — "Adjust for best
 * performance" sets it wholesale — so a visitor can be handed a frozen page
 * having never asked for one. The site's answer to that was a toggle inside the
 * appearance popover, which is correct and invisible: Arvind reported a dead
 * page three separate times without ever finding it, and he had been told where
 * it was. A control nobody finds is a control that does not exist.
 *
 * So the page now says it out loud, once, where the stillness is happening.
 *
 * ## Why this is not a dark pattern
 *
 * It changes nothing on its own. Motion stays off until the visitor presses the
 * button, so someone who genuinely wants a still page gets one and can dismiss
 * the notice. It is not a cookie banner asking for a concession — it is the
 * page explaining a state the visitor may not have chosen, and offering the
 * undo. Somebody who set the preference deliberately reads one line and closes
 * it; somebody whose laptop set it for them gets their answer.
 *
 * ## Why it is not rendered for everybody
 *
 * `systemReducedMotion` is false unless the OS is actually asking. For every
 * other visitor this component returns `null` and no markup exists — a banner
 * explaining a setting you do not have is noise.
 *
 * ## Dismissal
 *
 * Kept in `sessionStorage`, not `localStorage`. If someone dismisses it and
 * then comes back a week later still wondering why the page is still, the
 * answer should be on screen again. Within one visit, once is enough.
 *
 * ## Why it is pinned to the bottom
 *
 * The first version sat in the document flow between the header and `main`,
 * which put it underneath the `fixed` header: Playwright reported the header's
 * own markup intercepting every click on the "turn animation on" button at
 * 1440 and 768, and a visitor would have hit exactly the same wall. Clearing
 * the header from inside the flow means either duplicating its height as
 * padding — a number that then has to stay in step with the header's own
 * `py-3.5` forever — or pushing the hero down by a header's worth of dead
 * space for reduced-motion visitors only.
 *
 * The bottom edge has neither problem. Nothing is fixed down there, so the
 * notice cannot be covered at any width, and it needs no knowledge of the
 * header's height. The wrapper is `pointer-events-none` so the strip of page
 * either side of the bar stays clickable; only the bar itself takes the
 * pointer.
 */

const DISMISS_KEY = 'ag-motion-notice-dismissed';

export function MotionNotice() {
  const { systemReducedMotion, fullMotion, setFullMotion } = useAppearance();
  // Starts closed and opens in an effect. Rendering it during SSR would put it
  // in the HTML for every visitor and then remove it on hydration — a flash of
  // a banner that does not apply to you is worse than a beat's delay.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      // Private mode, or storage blocked by policy. Showing the notice is the
      // safe failure here: the worst case is one extra line the visitor closes.
      setDismissed(false);
    }
  }, []);

  if (!systemReducedMotion || fullMotion || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Nothing to do — the notice simply reappears on the next page load.
    }
  };

  return (
    <div
      // `status`, not `alert`. This is information about the page's state, and
      // an assertive live region would interrupt a screen reader mid-sentence
      // to announce a setting about animation, which is precisely the wrong
      // priority for the visitor most likely to have set it on purpose.
      role="status"
      data-testid="motion-notice"
      className={cn(
        /*
          `z-30` puts it below the mobile menu sheet (`z-40`) and the header
          (`z-50`), which is the layering the content demands rather than a
          number picked to make something fit. The sheet is where the appearance
          panel — and its own motion toggle — lives on a phone, and at `z-40`
          this bar sat on top of that toggle and swallowed the click. Two
          controls for one setting, with the informal one covering the real one,
          is worse than having neither.
        */
        'no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full',
        'max-w-[46rem] justify-center px-4 pb-4',
      )}
    >
      <div className="pointer-events-auto flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-2.5 shadow-[var(--panel-shadow)]">
        <p className="flex-1 text-[0.78rem] leading-relaxed text-[var(--text-secondary)]">
          <span className="text-[var(--text-primary)]">This page is holding still.</span>{' '}
          Your system is set to reduce animation — on Windows that is often
          &ldquo;Adjust for best performance&rdquo; rather than a choice you made.
        </p>
        <button
          type="button"
          onClick={() => setFullMotion(true)}
          data-testid="motion-notice-enable"
          className="rounded-[var(--radius-sm)] border border-[var(--accent-primary)] px-3 py-1.5 text-[0.78rem] font-medium text-[var(--accent-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]"
        >
          Turn animation on
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss the animation notice"
          data-testid="motion-notice-dismiss"
          className="rounded-[var(--radius-sm)] px-2 py-1.5 text-[0.78rem] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
        >
          Keep it still
        </button>
      </div>
    </div>
  );
}
