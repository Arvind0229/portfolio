import { test as base, type APIRequestContext, type BrowserContext } from '@playwright/test';

/**
 * Per-test client identity.
 *
 * The AI endpoint rate limits by client IP, and every browser in this suite
 * arrives from 127.0.0.1 — so one test's deliberate burst would throttle every
 * test running beside it. Each test therefore gets a distinct X-Forwarded-For.
 *
 * This is not a bypass: the header is exactly what a real deployment sits
 * behind (Vercel, or nginx with proxy_set_header), and the production code path
 * is unchanged. The limiter is still fully exercised — see security.spec.ts,
 * which asserts that a burst from a single client is rejected.
 */
function clientIpFor(titlePath: string[], project: string): string {
  let hash = 0;
  for (const char of `${project}::${titlePath.join('>')}`) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const a = 10;
  const b = (hash >> 16) & 0xff;
  const c = (hash >> 8) & 0xff;
  const d = (hash & 0xff) || 1;
  return `${a}.${b}.${c}.${d}`;
}

export const test = base.extend<{
  context: BrowserContext;
  request: APIRequestContext;
}>({
  context: async ({ browser }, use, testInfo) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-for': clientIpFor(testInfo.titlePath, testInfo.project.name),
      },
    });
    await use(context);
    await context.close();
  },

  request: async ({ playwright, baseURL }, use, testInfo) => {
    const context = await playwright.request.newContext({
      ...(baseURL ? { baseURL } : {}),
      extraHTTPHeaders: {
        'x-forwarded-for': clientIpFor(testInfo.titlePath, testInfo.project.name),
      },
    });
    await use(context);
    await context.dispose();
  },
});

export { expect, type Page } from '@playwright/test';

/**
 * Opens the appearance controls wherever they live at this viewport: a header
 * popover on wide screens, inside the menu sheet on a phone.
 */
export async function openAppearance(
  page: import('@playwright/test').Page,
  viewportWidth: number,
): Promise<void> {
  if (viewportWidth < 640) {
    await page.getByTestId('menu-toggle').click();
    await page.getByTestId('appearance-inline').waitFor();
    return;
  }
  await page.getByTestId('appearance-trigger').first().click();
  await page.getByTestId('appearance-panel').waitFor();
}
