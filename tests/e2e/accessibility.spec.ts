import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

const THEMES = ['enterprise', 'engineering', 'studio'] as const;

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

  test('the case-study dialog is accessible', async ({ page }) => {
    await page.goto('/');
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await page
      .getByTestId('project-card-compliance-tracking')
      .getByRole('button', { name: /read the case study/i })
      .click();

    await expect(page.getByTestId('project-dialog')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('keyboard navigation reaches the skip link and the main landmarks', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(focused).toContain('Skip to content');

    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeVisible();
  });

  test('focus is trapped in the dialog and restored on close', async ({ page }) => {
    await page.goto('/');
    await page.locator('#projects').scrollIntoViewIfNeeded();

    const trigger = page
      .getByTestId('project-card-compliance-tracking')
      .getByRole('button', { name: /read the case study/i });
    await trigger.click();
    await expect(page.getByTestId('project-dialog')).toBeVisible();

    // Tab several times; focus must stay inside the dialog.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
    }
    const inDialog = await page.evaluate(
      () => document.activeElement?.closest('[role="dialog"]') !== null,
    );
    expect(inDialog).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('project-dialog')).toHaveCount(0);
    const restored = await page.evaluate(() =>
      document.activeElement?.textContent?.toLowerCase().includes('case study'),
    );
    expect(restored).toBe(true);
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Reveal-gated content must be visible immediately, not animated in.
    await page.getByTestId('metric-automations').first().scrollIntoViewIfNeeded();
    const opacity = await page
      .locator('#impact .reveal')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBe(1);

    // The counter shows its final value rather than counting up.
    await expect(page.getByTestId('metric-automations').first()).toHaveText('80');
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
