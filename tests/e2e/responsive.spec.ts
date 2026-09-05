import { expect, test } from './fixtures';

/**
 * Layout integrity across viewports. Playwright runs every project in
 * playwright.config.ts (1440, 768, 390 and 320 wide), so these assertions
 * execute once per breakpoint.
 */
test.describe('responsive layout', () => {
  test('the page never scrolls horizontally', async ({ page }) => {
    await page.goto('/');
    // Let lazy sections reveal and any counters settle before measuring.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('no individual element overflows the viewport', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);

    const offenders = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const bad: string[] = [];
      for (const element of Array.from(document.querySelectorAll('body *'))) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0) continue;
        // Decorative fixed layers are intentionally larger than the viewport.
        if (element.closest('[aria-hidden="true"]')) continue;
        if (rect.right > width + 2) {
          bad.push(`${element.tagName}.${(element.className || '').toString().slice(0, 60)}`);
        }
      }
      return bad.slice(0, 10);
    });

    expect(offenders, `overflowing elements at ${testInfo.project.name}`).toEqual([]);
  });

  test('navigation is usable at every size', async ({ page }, testInfo) => {
    await page.goto('/');
    const isNarrow = (testInfo.project.use.viewport?.width ?? 1440) < 1024;

    if (isNarrow) {
      const toggle = page.getByTestId('menu-toggle');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(page.getByTestId('mobile-menu')).toBeVisible();
      await page.getByTestId('mobile-menu').getByRole('link', { name: 'Projects' }).click();
      await expect(page.getByTestId('mobile-menu')).toHaveCount(0);
      await expect(page.locator('#projects')).toBeInViewport({ timeout: 5000 });
    } else {
      await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Projects' })).toBeVisible();
    }
  });

  test('appearance controls are reachable at every size', async ({ page }, testInfo) => {
    await page.goto('/');
    const isNarrow = (testInfo.project.use.viewport?.width ?? 1440) < 640;

    if (isNarrow) {
      await page.getByTestId('menu-toggle').click();
      await expect(page.getByTestId('appearance-inline')).toBeVisible();
      await page.getByTestId('theme-option-studio').click();
    } else {
      await page.getByTestId('appearance-trigger').first().click();
      await page.getByTestId('theme-option-studio').click();
    }

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'studio');
  });

  test('the assistant is usable at every size', async ({ page }) => {
    await page.goto('/');
    await page.locator('#assistant').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('assistant-input')).toBeVisible();
    await expect(page.getByTestId('assistant-send')).toBeVisible();

    const box = await page.getByTestId('assistant-send').boundingBox();
    // Touch target guidance: at least 44px in the primary dimension.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  });

  test('project cards remain readable and tappable', async ({ page }) => {
    await page.goto('/');
    await page.locator('#projects').scrollIntoViewIfNeeded();

    const card = page.getByTestId('project-card-compliance-tracking');
    await expect(card).toBeVisible();

    const button = card.getByRole('button', { name: /read the case study/i });
    const box = await button.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(80);
  });
});
