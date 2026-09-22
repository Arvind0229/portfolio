import { expect, test } from '@playwright/test';

/*
 * CHANGE-010 — one skills list, card hover, click effects, footer, robot
 * buddies. Motion is opted in with `ag.motion = full`, so these tests do not
 * depend on the machine's reduced-motion setting.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ag.theme', 'clay');
    localStorage.setItem('ag.mode', 'light');
    localStorage.setItem('ag.motion', 'full');
  });
});

test('the stack is listed once, and every tool opens its explainer', async ({ page }) => {
  await page.goto('/');
  const groups = page.locator('#skills .skill-group');
  await expect(groups).toHaveCount(6);
  // No second, non-clickable copy of the same groups.
  await expect(page.locator('#skills article:has-text("RPA & Automation")')).toHaveCount(1);
  // The coloured grid is the clickable one.
  await expect(page.locator('#skills .clay-rotate .skill-group').first()).toBeVisible();
  await groups.first().locator('button').first().click();
  await expect(page.getByTestId('skill-explainer')).toBeVisible();
});

test('buttons answer a click with their own effect', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() =>
    document.addEventListener('click', (event) => event.preventDefault(), { capture: true }),
  );
  const cases: [string, string][] = [
    ['[data-testid="hero-whatsapp"]', 'whatsapp'],
    // The resume download has its own real progress states since CHANGE-011
    // (states.spec.ts); the footer link keeps the click effect.
    ['footer a[download]', 'download'],
    ['#contact a:has-text("Get in touch")', 'hello'],
    ['#contact a:has-text("Compose email")', 'mail'],
    ['#contact a:has-text("Call")', 'call'],
  ];
  for (const [selector, kind] of cases) {
    const button = page.locator(selector).first();
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect(button).toHaveAttribute('data-fx-play', kind);
  }
});

test('the footer has its status, a way back up, and the moving line', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByText('Open to new opportunities', { exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: /Back to top/ })).toHaveAttribute('href', '#main');
  await expect(footer.locator('.footer-flow span')).toHaveCount(3);
});

test('section titles keep their plain name for assistive technology', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Tools, technologies and the judgement behind them' }),
  ).toBeVisible();
});

test('robot buddies: hello on a click, dizzy then a mood on a double click', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const peeker = page.getByTestId('robot-peeker');
  await expect(peeker).toBeAttached();
  await expect(page.getByTestId('robot-chaser-a')).toBeAttached();
  await expect(page.getByTestId('robot-chaser-b')).toBeAttached();

  const body = peeker.locator('.bb-tilt');
  await body.dispatchEvent('pointerup');
  await page.clock.runFor(400);
  await expect(peeker).toHaveAttribute('data-face', 'hello');
  await expect(peeker.locator('.bb-say')).not.toHaveText('');

  await page.clock.runFor(2500);
  await body.dispatchEvent('pointerup');
  await body.dispatchEvent('pointerup');
  await page.clock.runFor(200);
  await expect(peeker).toHaveAttribute('data-face', 'dizzy');
  await page.clock.runFor(2000);
  await expect(peeker).toHaveAttribute('data-face', /happy|sad/);
});

test('the peeker comes out from a corner and goes back', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const peeker = page.getByTestId('robot-peeker');
  await expect(peeker).toHaveAttribute('data-shown', 'false');
  // First appearance is 5–9 s after load; step until it is out.
  for (let i = 0; i < 48 && (await peeker.getAttribute('data-shown')) !== 'true'; i += 1) {
    await page.clock.runFor(250);
  }
  await expect(peeker).toHaveAttribute('data-shown', 'true');
  await expect(peeker).toHaveAttribute('data-spot', /bl|br|left|right/);
  await page.clock.runFor(7000);
  await expect(peeker).toHaveAttribute('data-shown', 'false');
});

test('no robots under reduced motion', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('ag.motion'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(500);
  await expect(page.getByTestId('robot-peeker')).toHaveCount(0);
});

test('no sideways scroll with the robots on stage', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.runFor(16000);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
