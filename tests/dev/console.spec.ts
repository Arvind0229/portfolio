import { expect, test } from '@playwright/test';

/**
 * The console must be clean in development.
 *
 * ## Why this file exists, and why it needs its own config
 *
 * A duplicate React `key` shipped and broke the bulb's cord-pull animation:
 * two sibling elements were given the same key, React reported "children may
 * be duplicated and/or omitted", and the remount that restarts the animation
 * stopped being guaranteed. It was visible on Arvind's screen as five console
 * errors on load and two more per click.
 *
 * The suite had 341 tests and not one of them could have caught it — for a
 * structural reason worth writing down: **React strips its development
 * warnings from production builds**, and the main Playwright config runs
 * against `next start` on a production build, on purpose (dev-only behaviour
 * is exactly where a passing test hides a broken deployment).
 *
 * So the correctness checks belong on the production build and the *console*
 * checks belong on a dev server, and they cannot share a config. This file is
 * the second half, run by `playwright.dev.config.ts` against `next dev`.
 *
 * ## What counts as a failure
 *
 * Any `console.error`, any uncaught page error, and the React warnings that
 * arrive as `console.warn` and mean something is actually wrong — key
 * collisions, hydration mismatches, invalid DOM nesting, unknown props. Not
 * every warning: Next's own dev-server chatter is noise, and a check that
 * cries wolf gets muted.
 */

/*
 * `/admin` is in this list even though nobody but Arvind will ever open it —
 * and partly because of that. It is the one page with no visitors to notice
 * when it breaks, so if a console error there is not caught by a test it is
 * not caught at all. On a dev server it renders the editor with no sign-in,
 * which is exactly the state he uses on his laptop.
 */
const ROUTES = [
  '/',
  '/assistant',
  '/architecture',
  '/projects/compliance-tracking',
  '/admin',
];

/** Warnings that mean a real defect, as opposed to dev-server chatter. */
const SERIOUS = [
  'same key',
  'Each child in a list',
  'hydrat',
  'validateDOMNesting',
  'cannot appear as a descendant',
  'Warning: Received',
  'unique "key"',
  'Maximum update depth',
];

/** Known-noisy lines that are not defects in this app. */
const IGNORE = [
  'Download the React DevTools',
  'Fast Refresh',
  '[Fast Refresh]',
];

function collect(page: import('@playwright/test').Page, sink: string[]) {
  page.on('console', (message) => {
    const text = message.text();
    if (IGNORE.some((n) => text.includes(n))) return;
    if (message.type() === 'error') sink.push(`console.error — ${text}`);
    else if (message.type() === 'warning' && SERIOUS.some((n) => text.includes(n))) {
      sink.push(`console.warn — ${text}`);
    }
  });
  page.on('pageerror', (error) => sink.push(`uncaught — ${error.message}`));
}

test.describe('development console', () => {
  for (const route of ROUTES) {
    test(`${route} loads with a clean console`, async ({ page }) => {
      const problems: string[] = [];
      collect(page, problems);

      await page.goto(route);
      await page.waitForLoadState('networkidle');
      // Long enough for hydration and for any effect-driven render to settle.
      await page.waitForTimeout(2500);

      expect(problems).toEqual([]);
    });
  }

  test('the interactive controls stay clean when used', async ({ page }) => {
    /*
     * Load-time cleanliness is not enough. The duplicate key that started this
     * fired again on *every click*, because the click is what changes the key
     * — so a check that only ever loads the page would have reported five
     * errors and then missed the seven that followed.
     */
    const problems: string[] = [];
    collect(page, problems);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The bulb, three times: the pull is keyed on a click counter, so each
    // click is a fresh remount and a fresh chance to collide.
    const bulb = page.getByTestId('bulb-switch');
    for (let i = 0; i < 3; i++) {
      await bulb.click();
      await page.waitForTimeout(400);
    }

    // A technology chip opens the shared dialog.
    const chip = page.getByTestId('skill-chip-Power BI');
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');

    // And a scroll through the whole page, which mounts every section's
    // observers and reveals.
    await page.evaluate(async () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      for (let y = 0; y <= max; y += 600) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(800);

    expect(problems).toEqual([]);
  });
});
