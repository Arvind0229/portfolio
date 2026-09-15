import { PNG } from 'pngjs';
import { expect, test } from './fixtures';

/**
 * Nothing in the header flickers, on any theme.
 *
 * ## Why this test exists
 *
 * Flicker has come back four times on this project. Three were a 1px line
 * centred in an even-width box landing on a half-pixel (architecture.md §8,
 * rule 5). The fourth was different and is the one this test pins: the bulb
 * hangs on a 3px cord over a translucent header, and when decoration drifts
 * *behind* them it shows through — a moving ground read through a thin
 * foreground element looks exactly like that element shimmering.
 *
 * It was reported as "the bulb handle is flickering again", and the first
 * instinct was to go and look at the cord. The cord was fine: clipped to the
 * bulb with the backdrop hidden, every theme measured 0 changed pixels. With
 * the backdrop visible, Midnight measured 838 in the same box. The fault was
 * never in the thing that appeared to be at fault.
 *
 * ## How it measures
 *
 * Eight frames, 130ms apart, on a page nobody is touching, clipped to the
 * region. Any pixel whose summed RGB delta exceeds a small threshold counts
 * as changed. A still region must be *still* — the expectation is zero, not
 * "small", because a threshold invites the number to creep.
 *
 * Runs at 1440 only: the bulb is a desktop control, and the comparison is
 * over raw pixels, which is slow enough that four viewports would not earn
 * their time.
 */

const THEMES = ['clay', 'engineering', 'studio', 'enterprise'] as const;

/** Pixels differing by more than a small threshold between two PNG buffers. */
function changedPixels(a: Buffer, b: Buffer): number {
  const first = PNG.sync.read(a);
  const second = PNG.sync.read(b);
  let changed = 0;

  for (let i = 0; i < first.data.length; i += 4) {
    const delta =
      Math.abs((first.data[i] ?? 0) - (second.data[i] ?? 0)) +
      Math.abs((first.data[i + 1] ?? 0) - (second.data[i + 1] ?? 0)) +
      Math.abs((first.data[i + 2] ?? 0) - (second.data[i + 2] ?? 0));
    // 12 across three channels tolerates nothing a person could see and
    // absorbs the odd encoder rounding difference.
    if (delta > 12) changed += 1;
  }

  return changed;
}

test.describe('header flicker', () => {
  // `viewport` is a fixture, so it is available to the conditional directly.
  // The `(fixtures, testInfo)` form does not receive testInfo here.
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) !== 1440,
    'Desktop control; pixel comparison is too slow to repeat per viewport.',
  );

  for (const theme of THEMES) {
    test(`nothing moves behind the header on ${theme}`, async ({ page }) => {
      await page.addInitScript((id) => {
        try {
          localStorage.setItem('ag.theme', id);
        } catch {
          /* private mode — the default theme is fine for this test */
        }
      }, theme);

      await page.goto('/');
      // Long enough for the entrance animations to finish. What is being
      // asserted is the *resting* page, not the arrival.
      await page.waitForTimeout(2600);

      const band = { x: 0, y: 0, width: 1440, height: 150 };
      let worst = 0;
      let previous = await page.screenshot({ clip: band });

      for (let frame = 0; frame < 8; frame += 1) {
        await page.waitForTimeout(130);
        const current = await page.screenshot({ clip: band });
        worst = Math.max(worst, changedPixels(previous, current));
        previous = current;
      }

      expect(worst, `${theme}: the header band is not still`).toBe(0);
    });
  }
});
