import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.DEV_E2E_PORT ?? 3210);

/**
 * The development-mode checks.
 *
 * Separate from `playwright.config.ts` because the two need opposite servers.
 * The main suite runs against a production build, deliberately: dev-only
 * behaviour is where a passing test hides a broken deployment. But React
 * strips its development warnings from production, so the one thing a
 * production run structurally cannot see is a React warning — which is how a
 * duplicate `key` reached Arvind's screen with 341 tests passing.
 *
 * One browser, one viewport: this is checking the console, not the layout.
 */
export default defineConfig({
  testDir: './tests/dev',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'off',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
  },

  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // A cold dev server compiles on first request, which is slower than a
    // production start by a wide margin.
    timeout: 180_000,
  },
});
