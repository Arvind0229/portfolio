import { expect, test } from '@playwright/test';

/* CHANGE-013 — Lenis smooth wheel scrolling on desktop only. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ag.motion', 'full'));
});

test('desktop: Lenis runs, the wheel still scrolls, and anchors land on their section', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 1024, 'Desktop only');
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);

  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Skills' }).first().click();
  await expect
    .poll(() => page.evaluate(() => Math.round(document.getElementById('skills')!.getBoundingClientRect().top)), { timeout: 8000 })
    .toBeLessThanOrEqual(220); // where the native anchor jump lands too (200px)
});

test('phones keep native scrolling', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForTimeout(800);
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await context.close();
});

test('reduced motion keeps native scrolling', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 1024, 'Desktop only');
  await page.addInitScript(() => localStorage.removeItem('ag.motion'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(800);
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
});

test('the admin page keeps native scrolling', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 1024, 'Desktop only');
  await page.goto('/admin');
  await page.waitForTimeout(800);
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
});
