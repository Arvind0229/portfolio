import AxeBuilder from '@axe-core/playwright';
import { expect, openAppearance, test } from './fixtures';

const THEMES = ['clay', 'engineering', 'studio', 'enterprise'] as const;

/**
 * The audit runs with reduced motion enabled.
 *
 * Not to make the suite pass: entrance animations interpolate opacity, so a
 * scan fired mid-animation measures a half-faded element and reports contrast
 * failures that do not exist a few hundred milliseconds later. Reduced motion
 * is both a settled state and a real user configuration, so it is the correct
 * state to audit. Transient animation frames are covered by the dedicated
 * reduced-motion test below.
 */
test.use({ reducedMotion: 'reduce' });

test.describe('accessibility', () => {
  test('has no WCAG A/AA violations in any theme', async ({ page }) => {
    await page.goto('/');

    for (const theme of THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        await page.evaluate(
          ([t, m]) => {
            document.documentElement.setAttribute('data-theme', t as string);
            document.documentElement.setAttribute('data-mode', m as string);
          },
          [theme, mode],
        );

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        expect(
          results.violations.map((v) => `${theme}/${mode}: ${v.id} — ${v.nodes.length} node(s)`),
        ).toEqual([]);
      }
    }
  });

  test('every route is free of WCAG A/AA violations', async ({ page }) => {
    for (const route of ['/', '/projects/compliance-tracking', '/assistant', '/architecture']) {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(
        results.violations.map((v) => `${route}: ${v.id} — ${v.nodes.length} node(s)`),
      ).toEqual([]);
    }
  });

  test('keyboard navigation reaches the skip link and the main landmarks', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(focused).toContain('Skip to content');

    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeVisible();
  });

  test('the bulb is reachable and labelled for assistive technology', async ({ page }) => {
    await page.goto('/');
    const bulb = page.getByTestId('bulb-switch');
    await expect(bulb).toHaveRole('switch');
    await expect(bulb).toHaveAccessibleName(/dark and light/i);
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Reveal-gated content must be visible immediately, not animated in.
    await page.goto('/#impact');
    await page.getByTestId('metric-automations').first().scrollIntoViewIfNeeded();
    const opacity = await page
      .locator('.reveal')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBe(1);

    // The counter shows its final value rather than counting up.
    await expect(page.getByTestId('metric-automations').first()).toHaveText('80');

    // And the split name must be painted, not stuck at opacity 0.
    await page.goto('/');
    const charOpacity = await page
      .locator('h1 .char')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(charOpacity)).toBe(1);
  });

  test('the skill explainer is clean while it is actually open', async ({ page }) => {
    // A modal is only auditable in the state that matters. Scanning the page
    // with it closed proves nothing about the dialog's contrast, heading order
    // or labelling — which is the state a visitor is in when they read it.
    await page.goto('/');
    const chip = page.getByTestId('skill-chip-Power BI');
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    await expect(page.getByTestId('skill-explainer')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations.map((v) => `${v.id} — ${v.nodes.length} node(s)`)).toEqual([]);
  });

  test('reduced motion gets the page instantly, not a faded one', async ({ page }) => {
    // The route entrance animates opacity. If the reduced-motion override ever
    // stops applying, every page would be stuck mid-fade for someone who asked
    // for no motion — invisible content, not just a missing flourish.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects');
    const opacity = await page
      .locator('.page-enter')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBe(1);

    // And the hero figure shows its value with no counting.
    await page.goto('/');
    await expect(page.getByTestId('hero-metric-automations')).toHaveText('80');
  });

  test('reduced motion actually stops every moving pixel', async ({ page }) => {
    /*
     * The assertion the other reduced-motion tests could not make.
     *
     * Those check named elements resolve to a visible resting state, which is
     * necessary but blind to anything they do not name — and that is exactly
     * how the hero graph's `.flow-*` classes ran unnoticed for two rounds
     * while the build record claimed zero. The global `*` override caps
     * duration and iterations, but a *delayed* animation still fires when its
     * delay elapses and lands on its final keyframe, so the page keeps
     * changing seconds after load.
     *
     * So this measures the page itself: two screenshots, seconds apart, and
     * every channel of every pixel has to match. It cannot be fooled by a
     * class nobody remembered to list.
     */
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const route of ['/', '/assistant', '/architecture']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      // Long enough for any staggered `animation-delay` to have elapsed.
      await page.waitForTimeout(2500);

      const first = await page.screenshot();
      await page.waitForTimeout(2500);
      const second = await page.screenshot();

      expect(
        Buffer.compare(first, second),
        `${route} is still animating under prefers-reduced-motion`,
      ).toBe(0);
    }
  });

  test('a visitor can opt back into motion without touching their OS', async ({
    page,
  }, testInfo) => {
    /*
     * Reduced motion stays the default and stays complete — the test above
     * proves that byte for byte. This covers the case the OS switch gets
     * wrong: Windows turns animation off wholesale under "adjust for best
     * performance", so someone can be handed a frozen site without ever having
     * asked for one. Arvind reported exactly that, on a graph a measurement
     * showed running at 4.88% of its pixels per second.
     *
     * The control is deliberately one-way. There is no "reduce" option here,
     * because anyone who wants less motion already has the system setting, and
     * a second place to express the same preference is a second place for the
     * two to disagree.
     */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Opened through the fixture: below 640px the appearance controls live
    // inside the menu sheet rather than in a header popover, and a test that
    // clicks the header trigger directly passes on a desktop and hangs on a
    // phone.
    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    const toggle = page.getByTestId('motion-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
    await page.keyboard.press('Escape');

    // And the page is now genuinely moving again, not merely re-labelled.
    await page.waitForTimeout(1200);
    const before = await page.screenshot();
    await page.waitForTimeout(1200);
    const after = await page.screenshot();
    expect(
      Buffer.compare(before, after),
      'opting into motion did not actually restart any animation',
    ).not.toBe(0);

    // The choice survives a reload, applied before paint by the bootstrap
    // script rather than after hydration — otherwise the page would flash
    // frozen on every navigation.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  });

  test('a still page explains itself instead of just being still', async ({ page }) => {
    /*
     * The gap the appearance-panel toggle left open, and the reason Arvind
     * reported a dead page three times running.
     *
     * The reduced-motion default is correct and stays; what was missing was
     * anything on screen saying *why* nothing moves. A control that only
     * exists two clicks inside a popover is, for the visitor who does not know
     * to look there, indistinguishable from a broken site.
     */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const notice = page.getByTestId('motion-notice');
    await expect(notice).toBeVisible();
    // It must name the cause. "Animation is off" without "your system is
    // asking for it" sends the visitor looking for a bug in the page.
    await expect(notice).toContainText(/system is set to reduce animation/i);

    await page.getByTestId('motion-notice-enable').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
    // Having done its job it gets out of the way, rather than sitting there
    // offering to do a thing that is already done.
    await expect(notice).toHaveCount(0);

    // And the page is genuinely moving now, not merely re-labelled.
    await page.waitForTimeout(1000);
    const before = await page.screenshot();
    await page.waitForTimeout(1000);
    expect(Buffer.compare(before, await page.screenshot())).not.toBe(0);
  });

  test('"keep it still" is honoured, and keeps the page still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await page.getByTestId('motion-notice-dismiss').click();
    await expect(page.getByTestId('motion-notice')).toHaveCount(0);
    // Dismissing is not a way of opting into motion by the back door.
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'full');

    // It stays gone for the rest of the visit — same tab, new page.
    await page.goto('/assistant');
    await expect(page.getByTestId('motion-notice')).toHaveCount(0);
  });

  test('the notice never appears for a visitor who asked for nothing', async ({ page }) => {
    // Every visitor without the OS preference — which is most of them — must
    // see no markup at all. A banner about a setting you do not have is noise.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.waitForTimeout(400);
    await expect(page.getByTestId('motion-notice')).toHaveCount(0);
  });

  test('the motion control is absent when the OS has not asked for less', async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await expect(page.getByTestId('motion-toggle')).toHaveCount(0);
  });

  test('the cord pull is off when the OS asks for less motion', async ({ page }) => {
    // The pull is feedback for a click, and the click already has feedback
    // that cannot be switched off: the whole page changes mode. So under
    // reduced motion the animation goes and nothing is lost.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await page.getByTestId('bulb-switch').click();
    // Generous, and deliberately so: this asserts an absence, and an absence
    // measured too early is not evidence of anything.
    await page.waitForTimeout(600);

    const playing = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => (a as CSSAnimation).animationName?.includes('yank')).length,
    );

    expect(playing).toBe(0);
  });

  test('the cord pull works once the visitor opts back into motion', async ({
    page,
  }, testInfo) => {
    /*
     * The gap between "the CSS allows it" and "anything starts it".
     *
     * The reduced-motion block is nested under
     * `:root:not([data-motion='full'])`, so opting in releases the cord pull at
     * the CSS level — and the click handler still read
     * `matchMedia('(prefers-reduced-motion: reduce)')` on its own and refused
     * to bump the key. Nothing started, so there was nothing for the CSS to
     * allow. Arvind reported the pull working on his phone and dead on his
     * desktop; Windows had reduced motion on, and pressing "Turn animation on"
     * did not reach the one control the button is attached to.
     *
     * The test above proves the pull stays off when the OS asks and the visitor
     * has not overridden. This proves the override actually arrives.
     */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await page.getByTestId('motion-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
    await page.keyboard.press('Escape');

    await page.getByTestId('bulb-switch').click();

    const playing = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => (a as CSSAnimation).animationName?.includes('yank')).length,
    );

    expect(playing, 'opting into motion did not reach the bulb').toBeGreaterThan(0);
  });

  test('every image and icon-only control has an accessible name', async ({ page }) => {
    await page.goto('/');

    const unnamed = await page.evaluate(() => {
      const problems: string[] = [];
      for (const button of Array.from(document.querySelectorAll('button, a[href]'))) {
        const text = (button.textContent ?? '').trim();
        const label = button.getAttribute('aria-label');
        const labelledBy = button.getAttribute('aria-labelledby');
        if (!text && !label && !labelledBy) problems.push(button.outerHTML.slice(0, 80));
      }
      for (const img of Array.from(document.querySelectorAll('img'))) {
        if (!img.hasAttribute('alt')) problems.push(img.outerHTML.slice(0, 80));
      }
      return problems;
    });

    expect(unnamed).toEqual([]);
  });
});
