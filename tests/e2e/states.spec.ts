import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';

/*
 * CHANGE-011 — error pages, status states, loaders, admin verification,
 * download states and the admin content that moved out of code.
 */
const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function currentCode(secret = SECRET, now = Date.now()): string {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of secret) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  const counter = Math.floor(now / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  message.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac('sha1', Buffer.from(bytes)).update(message).digest();
  const offset = (digest[digest.length - 1] as number) & 0x0f;
  const binary =
    (((digest[offset] as number) & 0x7f) << 24) |
    (((digest[offset + 1] as number) & 0xff) << 16) |
    (((digest[offset + 2] as number) & 0xff) << 8) |
    ((digest[offset + 3] as number) & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}


test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ag.motion', 'full'));
});

test('404 is a real 404 with a way home', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Page not found');
  await expect(page.locator('.err-scene').getByRole('link', { name: /Back to the portfolio/ })).toHaveAttribute('href', '/');
});

for (const [code, words, retry] of [
  ['401', 'Sign-in needed', false],
  ['403', 'Access denied', false],
  ['500', 'Something broke on our side', true],
  ['503', 'Service unavailable', true],
  ['offline', 'You are offline', true],
  ['maintenance', 'Down for maintenance', false],
] as const) {
  test(`status page ${code}`, async ({ page }) => {
    await page.goto(`/status/${code}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(words);
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(retry ? 1 : 0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
}

test('an unknown status code is a 404, not an empty page', async ({ page }) => {
  const response = await page.goto('/status/999');
  expect(response?.status()).toBe(404);
});

test('admin sign-in shows Verified only when the code is accepted', async ({ page }) => {
  await page.goto('/admin');
  await page.getByTestId('admin-code').fill('12a');
  await expect(page.getByTestId('admin-code-invalid')).toBeVisible();
  await expect(page.getByTestId('admin-signin')).toBeDisabled();

  await page.getByTestId('admin-code').fill('000000');
  await page.getByTestId('admin-signin').click();
  await expect(page.getByTestId('admin-verify')).toHaveAttribute('data-phase', 'failed');
  await expect(page.getByTestId('admin-verify')).toContainText('Verification failed');

  await page.getByTestId('admin-code').fill(currentCode());
  await page.getByTestId('admin-signin').click();
  await expect(page.getByTestId('admin-verify')).toHaveAttribute('data-phase', 'verified');
  await expect(page.getByTestId('admin-verify')).toContainText('Verified successfully');
  await expect(page.getByTestId('admin-panel')).toBeVisible();
});

test('the resume downloads with a real completed state', async ({ page }) => {
  await page.goto('/');
  const button = page.getByTestId('resume-downloads').locator('.dl-btn').first();
  await button.scrollIntoViewIfNeeded();
  const download = page.waitForEvent('download');
  await button.click();
  await download;
  await expect(button).toHaveAttribute('data-state', 'done');
  await expect(button).toContainText('Downloaded!');
});

test('a failed download says so and offers a retry — never a success', async ({ page }) => {
  await page.route(/\.pdf$/, (route) => route.fulfill({ status: 500, body: 'no' }));
  await page.goto('/');
  const button = page.getByTestId('resume-downloads').locator('.dl-btn').first();
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(button).toHaveAttribute('data-state', 'failed');
  await expect(button).toContainText('Download failed');
  const status = page.getByTestId('resume-downloads').locator('.dl-status').first();
  await expect(status).toContainText('could not be reached');
  await expect(status).not.toContainText('500');
  await expect(status.getByRole('button', { name: 'try again' })).toBeVisible();
});

test('View in browser has its own glyph and arrow', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /View in browser/ });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('data-fx', 'browser');
  await expect(link.locator('.browser-arrow')).toHaveCount(1);
});

test('going offline shows a notice, coming back clears it', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByTestId('network-notice')).toContainText('offline');
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByTestId('network-notice')).toContainText('Back online');
});

test('a broken image shows a calm placeholder, not a broken icon', async ({ page }) => {
  await page.route(/\/journey\/.*\.webp$/, (route) => route.abort());
  await page.goto('/');
  await page.locator('#mission').scrollIntoViewIfNeeded();
  await expect(page.locator('img[data-failed="true"]').first()).toBeAttached();
  await expect(page.locator('[data-img-failed="true"]').first()).toBeAttached();
});

test('brand marks: WhatsApp and Python show their real logos', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero-whatsapp').locator('svg path')).toHaveCount(1);
  await expect(page.locator('[data-testid="skill-chip-Python"] .skill-mark')).toHaveCount(1);
});

test('admin: impact figures, skill notes and new skill groups are editable', async ({ page }) => {
  await page.goto('/admin');
  await page.getByTestId('admin-code').fill(currentCode());
  await page.getByTestId('admin-signin').click();
  await expect(page.getByTestId('admin-panel')).toBeVisible();

  await page.getByTestId('admin-section-impact').click();
  await expect(page.getByTestId('impact-metric-label-0')).toHaveValue('Production automations');
  await page.getByTestId('impact-add-metric').click();
  await expect(page.getByTestId('impact-metric-label-4')).toHaveValue('New figure');

  await page.getByTestId('admin-section-notes').click();
  await expect(page.getByTestId('admin-skill-notes')).toContainText('TruBot (Datamatics)');

  await page.getByTestId('admin-section-skills').click();
  await page.getByTestId('skills-add-group').click();
  await expect(page.getByTestId('admin-skills')).toContainText('Remove');

  await page.getByTestId('admin-section-site').click();
  await expect(page.getByTestId('settings-maintenance')).not.toBeChecked();
});
