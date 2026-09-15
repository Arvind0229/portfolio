import { expect, test } from './fixtures';

/**
 * Visual capture.
 *
 * These deliberately CAPTURE rather than COMPARE. Playwright's screenshot
 * baselines are platform-specific — font rasterisation differs between Linux,
 * macOS and Windows — so committing baselines generated here would fail on
 * anyone else's machine and teach the team to ignore the suite.
 *
 * The captures land in test-results/ and playwright-report/ for human review
 * on every run. To turn this into true visual regression testing, generate
 * baselines in CI on a fixed image and swap the assertion for:
 *
 *     await expect(page).toHaveScreenshot('hero-engineering.png', { maxDiffPixelRatio: 0.01 });
 */
const STATES = [
  { theme: 'clay', mode: 'light' },
  { theme: 'clay', mode: 'dark' },
  { theme: 'engineering', mode: 'dark' },
  { theme: 'engineering', mode: 'light' },
  { theme: 'enterprise', mode: 'light' },
  { theme: 'enterprise', mode: 'dark' },
  { theme: 'studio', mode: 'light' },
  { theme: 'studio', mode: 'dark' },
] as const;

const ROUTES = ['/', '/projects', '/architecture', '/impact', '/assistant', '/contact'] as const;

test.describe('visual capture', () => {
  for (const state of STATES) {
    test(`captures ${state.theme}/${state.mode}`, async ({ page }, testInfo) => {
      await page.goto('/');
      await page.evaluate(
        ([theme, mode]) => {
          document.documentElement.setAttribute('data-theme', theme as string);
          document.documentElement.setAttribute('data-mode', mode as string);
        },
        [state.theme, state.mode],
      );
      await page.waitForTimeout(400);

      for (const route of ROUTES) {
        await page.goto(route);
        await page.evaluate(
          ([theme, mode]) => {
            document.documentElement.setAttribute('data-theme', theme as string);
            document.documentElement.setAttribute('data-mode', mode as string);
          },
          [state.theme, state.mode],
        );
        await page.waitForTimeout(400);
        const shot = await page.screenshot({ fullPage: false });
        expect(shot.byteLength).toBeGreaterThan(1000);
        await testInfo.attach(`${state.theme}-${state.mode}-${route.replace(/\//g, '_') || 'home'}`, {
          body: shot,
          contentType: 'image/png',
        });
      }
    });
  }
});
