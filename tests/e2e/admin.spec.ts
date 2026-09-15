import { createHmac } from 'node:crypto';
import { expect, test } from './fixtures';

/**
 * The admin surface, against a real production build.
 *
 * This is the only place the deployed configuration is exercised end to end.
 * The unit tests call the handlers directly with `NODE_ENV` stubbed, which
 * proves the logic; this proves the thing that actually ships — that
 * `next start` really does treat these routes as production, that the cookie
 * survives a round trip through a real browser, and that a stranger who types
 * `/admin` into the address bar gets a locked door.
 */

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * TOTP, reimplemented in six lines rather than imported from `src`.
 *
 * Not an oversight and not laziness. Importing the app's own implementation
 * would make this test check that the code agrees with itself — if the
 * generator and the verifier drifted in the same direction, both would move
 * together and the test would stay green while every real authenticator app
 * stopped working. Computed independently here, the test is an outside
 * observer, which is the only useful kind.
 */
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

test.describe('admin', () => {
  test('a stranger reaching /admin gets a sign-in box and nothing else', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByTestId('admin-code')).toBeVisible();
    // The editor must not be in the DOM at all — not merely hidden. A form
    // rendered and covered still ships its contents to whoever opened the page.
    await expect(page.getByTestId('admin-panel')).toHaveCount(0);
    await expect(page.getByTestId('admin-save')).toHaveCount(0);
  });

  test('the API refuses without a session, even called directly', async ({ request }) => {
    // Route handlers are addressable without ever loading the page, so this is
    // the check that matters. A guard that only runs when the page renders is
    // not a guard.
    expect((await request.get('/api/admin/depth')).status()).toBe(401);
    expect(
      (await request.put('/api/admin/depth', { data: { projects: {} } })).status(),
    ).toBe(401);
    expect((await request.post('/api/admin/resume')).status()).toBe(401);
  });

  test('a forged cookie does not get in', async ({ request }) => {
    const forged = Buffer.from(JSON.stringify({ iat: Date.now(), exp: Date.now() + 9e9 }))
      .toString('base64url');
    const response = await request.get('/api/admin/depth', {
      headers: { cookie: `ag_admin=${forged}.not-a-real-signature` },
    });
    expect(response.status()).toBe(401);
  });

  test('a wrong code is rejected and issues no cookie', async ({ request }) => {
    const response = await request.post('/api/admin/login', { data: { code: '000000' } });
    expect(response.status()).toBe(401);
    expect(response.headers()['set-cookie'] ?? '').not.toContain('ag_admin=');
  });

  test('the right code opens the editor and the session survives a reload', async ({ page }) => {
    await page.goto('/admin');
    await page.getByTestId('admin-code').fill(currentCode());
    await page.getByTestId('admin-signin').click();

    await expect(page.getByTestId('admin-panel')).toBeVisible();

    /*
     * The panel opens on Profile now, so reaching a project tab is a click
     * rather than a given. Kept rather than dropped: the point of the
     * assertion is that real content loaded behind the sign-in, and a project
     * tab is still the cheapest proof of that.
     */
    await page.getByTestId('admin-section-projects').click();
    await expect(page.getByTestId('admin-tab-compliance-tracking')).toBeVisible();

    // The cookie, not client state, is what holds the session. A reload is the
    // difference between the two, and the first version of this component
    // failed exactly here: valid cookie, code box back on screen.
    await page.reload();
    await expect(page.getByTestId('admin-panel')).toBeVisible();
    await expect(page.getByTestId('admin-code')).toHaveCount(0);
  });

  test('every section is reachable, and sign out is reachable from all of them', async ({
    page,
  }) => {
    /*
     * Added after the save bar became section-scoped and took the sign-out
     * button with it — three of the four sections were left with no way to end
     * the session, and nothing failed.
     */
    await page.goto('/admin');
    await page.getByTestId('admin-code').fill(currentCode());
    await page.getByTestId('admin-signin').click();
    await expect(page.getByTestId('admin-panel')).toBeVisible();

    for (const section of ['profile', 'skills', 'resume', 'projects']) {
      await page.getByTestId(`admin-section-${section}`).click();
      await expect(
        page.getByTestId('admin-signout'),
        `no way to sign out from the ${section} section`,
      ).toBeVisible();
    }

    // And the save button belongs to projects alone — it saves project depth
    // and nothing else, so offering it over the bio form is a lie.
    await page.getByTestId('admin-section-profile').click();
    await expect(page.getByTestId('admin-save')).toBeHidden();
    await page.getByTestId('admin-section-projects').click();
    await expect(page.getByTestId('admin-save')).toBeVisible();
  });

  test('signing out really ends the session', async ({ page }) => {
    await page.goto('/admin');
    await page.getByTestId('admin-code').fill(currentCode());
    await page.getByTestId('admin-signin').click();
    await expect(page.getByTestId('admin-panel')).toBeVisible();

    await page.getByTestId('admin-signout').click();
    await expect(page.getByTestId('admin-code')).toBeVisible();

    // And it is gone on the server, not just hidden in the browser.
    await page.reload();
    await expect(page.getByTestId('admin-code')).toBeVisible();
  });

  test('says what is missing when the live site has no repository configured', async ({ page }) => {
    /*
     * The test server has sign-in secrets but no GitHub token, which is exactly
     * the state Arvind's deployment is in before he creates one. The panel must
     * name the missing variables rather than showing an empty form that
     * silently fails to save — a form that looks ready and is not is worse than
     * a clear refusal.
     *
     * Asserted at panel level rather than on the projects save bar, because the
     * fact is true of every section: the panel opens on Profile, and a warning
     * that only appears on the projects tab is one the person never sees.
     */
    await page.goto('/admin');
    await page.getByTestId('admin-code').fill(currentCode());
    await page.getByTestId('admin-signin').click();

    await expect(page.getByTestId('admin-panel')).toBeVisible();
    await expect(page.getByTestId('admin-config-warning')).toContainText(/ADMIN_GITHUB_REPO/);

    // Still visible after moving away from the section it was raised on.
    await page.getByTestId('admin-section-skills').click();
    await expect(page.getByTestId('admin-config-warning')).toContainText(/ADMIN_GITHUB_REPO/);
  });

  test('is kept out of search results and out of the sitemap', async ({ page, request }) => {
    await page.goto('/admin');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');

    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toContain('/admin');
  });

  test('the footer offers a quiet way in, and it is not a security boundary', async ({ page }) => {
    await page.goto('/');
    const entry = page.getByTestId('admin-entry');
    await expect(entry).toBeVisible();
    await expect(entry).toHaveAttribute('rel', /nofollow/);

    /*
     * Quiet is the requirement, so it is measured rather than asserted by
     * eyeballing: the link must not be larger or heavier than the sentence it
     * sits in. A recruiter should read past it.
     */
    const weight = await entry.evaluate((element) => {
      const style = getComputedStyle(element);
      const parent = getComputedStyle(element.parentElement as HTMLElement);
      return {
        size: style.fontSize,
        parentSize: parent.fontSize,
        weight: Number(style.fontWeight),
        parentWeight: Number(parent.fontWeight),
      };
    });
    expect(weight.size).toBe(weight.parentSize);
    expect(weight.weight).toBeLessThanOrEqual(weight.parentWeight);

    // And it goes where it says, landing on the sign-in box rather than the
    // panel — the link changes discoverability, never access.
    await entry.click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('admin-code')).toBeVisible();
    await expect(page.getByTestId('admin-panel')).toHaveCount(0);
  });
});
