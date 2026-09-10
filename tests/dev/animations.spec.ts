import { expect, test } from '@playwright/test';

/**
 * The animation census.
 *
 * ## Why this test exists
 *
 * Arvind reported three times running that "nothing moves", and each round the
 * record answered with a *derived* measurement — a frame-difference percentage,
 * a computed `transform` — rather than with the list of animations the browser
 * says it is playing. Both of those can be right about pixels and still be
 * blind to a named animation that never started: `getComputedStyle().transform`
 * reads the compositor's last committed value, and a frame diff cannot tell a
 * paused graph apart from a slow one.
 *
 * `document.getAnimations()` is the only source that answers the question he
 * actually asked. It returns every animation the document currently owns, with
 * its name and its play state, and it cannot be fooled by a class that exists
 * in the stylesheet but never attached to an element.
 *
 * ## Why it lives in the dev suite
 *
 * Nothing here needs a dev build — but the production E2E projects run under
 * `reducedMotion: 'reduce'` in several files, and animation coverage belongs in
 * a place where "motion is on" is the whole premise rather than an exception a
 * future edit could quietly flip.
 *
 * ## What "running" means here
 *
 * A CSS animation is `running` from the moment it is attached, including during
 * its `animation-delay`. That is the correct assertion: a delayed animation is
 * scheduled and will play. `paused` is the failure — that is the state
 * `animation-play-state: paused` produces when a viewport observer never fired.
 */

/** Every animation that must be alive on the home page once it is scrolled. */
const REQUIRED_ON_HOME = [
  // The moving ground Arvind asked for after the reference video.
  'grid-drift',
  'grid-drift-far',
  // The current running through the hero graph — the one he named directly.
  'flow-charge',
  'flow-bead',
  'flow-node-active',
  // The robot.
  'robot-float',
];

type Census = { name: string; state: string }[];

async function census(page: import('@playwright/test').Page): Promise<Census> {
  return page.evaluate(() =>
    document.getAnimations().map((a) => ({
      name: (a as CSSAnimation).animationName ?? a.constructor.name,
      state: a.playState,
    })),
  );
}

test.describe('animations actually run', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the named animations are all playing on the home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll the whole page once. Several of these are gated on an
    // IntersectionObserver by design — a graph animating below the fold is
    // work nobody sees — so a census taken without scrolling would report
    // absences that are correct behaviour.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    const found = await census(page);
    const names = new Set(found.map((a) => a.name));

    const missing = REQUIRED_ON_HOME.filter((n) => !names.has(n));
    expect(missing, `these animations never attached: ${missing.join(', ')}`).toEqual([]);

    const paused = found.filter(
      (a) => REQUIRED_ON_HOME.includes(a.name) && a.state !== 'running',
    );
    expect(
      paused.map((a) => `${a.name} is ${a.state}`),
      'attached but not playing',
    ).toEqual([]);
  });

  test('the hero graph is running before the visitor scrolls at all', async ({ page }) => {
    /*
     * The specific failure Arvind would see and could not diagnose. The graph
     * pauses itself out of view via `animation-play-state`, driven by an
     * IntersectionObserver with a 0.15 threshold. On a short laptop window the
     * graph can sit far enough down the hero that under 15% of it is on
     * screen — so the page loads with the current visibly frozen, and the only
     * way to start it is to scroll, which is not something a visitor knows to
     * do to make a picture move.
     *
     * 1366x768 is the size that exposes it. It is also, by a wide margin, the
     * most common Windows laptop resolution.
     */
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(900);

    const flow = (await census(page)).filter((a) => a.name.startsWith('flow-'));
    expect(flow.length, 'the hero graph has no animations attached at all').toBeGreaterThan(0);
    expect(
      flow.filter((a) => a.state !== 'running').map((a) => `${a.name} is ${a.state}`),
      'the hero graph is paused on first paint at 1366x768',
    ).toEqual([]);
  });

  test('clicking the bulb starts the cord pull from frame zero', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('bulb-switch').click();

    // Sampled immediately. The bug this replaced started the animation ~440ms
    // after the click, which is late enough that the eye reads it as unrelated
    // to the click that caused it.
    const yank = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => (a as CSSAnimation).animationName?.includes('yank'))
        .map((a) => ({
          name: (a as CSSAnimation).animationName,
          state: a.playState,
          elapsed: Number(a.currentTime ?? -1),
        })),
    );

    expect(yank.map((y) => y.name).sort()).toEqual(['bulb-yank', 'cord-yank']);
    expect(yank.every((y) => y.state === 'running')).toBe(true);
    // Frame zero, not mid-flight: anything past a couple of hundred ms means
    // the animation was attached late rather than on the click.
    expect(Math.max(...yank.map((y) => y.elapsed))).toBeLessThan(200);
  });

  test('a second click plays the pull again', async ({ page }) => {
    // The regression that the duplicate `key` caused. A CSS animation only
    // restarts when an element *enters* the animated state, so without the
    // remount the second click was silent — which is precisely what Arvind
    // reported.
    await page.goto('/');
    const bulb = page.getByTestId('bulb-switch');

    for (const attempt of [1, 2, 3]) {
      await bulb.click();
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter(
            (a) =>
              (a as CSSAnimation).animationName?.includes('yank') && a.playState === 'running',
          ).length,
      );
      expect(running, `click ${attempt} did not restart the pull`).toBe(2);
      await page.waitForTimeout(700);
    }
  });
});
