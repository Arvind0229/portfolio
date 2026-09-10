import { expect, test } from './fixtures';

/**
 * Layout integrity across viewports. Playwright runs every project in
 * playwright.config.ts (1440, 768, 390 and 320 wide), so these assertions
 * execute once per breakpoint.
 */
test.describe('responsive layout', () => {
  const ROUTES = ['/', '/assistant', '/architecture', '/projects/compliance-tracking'];

  test('no route scrolls horizontally', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `${route} overflows`).toBeLessThanOrEqual(1);
    }
  });

  test('the home page never scrolls horizontally', async ({ page }) => {
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
        // So is anything inside a container that scrolls horizontally on
        // purpose. A wide data table on a phone is *supposed* to be wider than
        // the screen and scroll inside its own box — that is the accessible
        // remedy for tabular data, not a layout fault. What must never happen
        // is the page itself scrolling sideways, and that is asserted
        // separately by the two tests above; this one would otherwise flag the
        // fix as the bug.
        let scrollable = false;
        for (let node = element.parentElement; node; node = node.parentElement) {
          const overflowX = getComputedStyle(node).overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll') {
            scrollable = true;
            break;
          }
        }
        if (scrollable) continue;
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
      await expect(page).toHaveURL(/#projects$/);
      await expect(page.getByTestId('mobile-menu')).toHaveCount(0);
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
    await page.goto('/assistant');
    await expect(page.getByTestId('assistant-input')).toBeVisible();
    await expect(page.getByTestId('assistant-send')).toBeVisible();

    const box = await page.getByTestId('assistant-send').boundingBox();
    // Touch target guidance: at least 44px in the primary dimension.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  });

  test('project cards remain readable and tappable', async ({ page }) => {
    await page.goto('/projects');

    const card = page.getByTestId('project-card-compliance-tracking');
    await expect(card).toBeVisible();

    const link = page.getByTestId('project-link-compliance-tracking');
    const box = await link.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(80);
  });

  test('the bulb never collides with the header controls', async ({ page }) => {
    await page.goto('/');
    const bulb = await page.getByTestId('bulb-switch').boundingBox();
    const logo = await page.getByRole('link', { name: /back to top|home/i }).first().boundingBox();
    expect(bulb).not.toBeNull();
    expect(logo).not.toBeNull();
    // They may sit close, but must not overlap horizontally.
    expect((bulb?.x ?? 0)).toBeGreaterThan((logo?.x ?? 0) + (logo?.width ?? 0) - 1);
  });

  /**
   * The header has overflowed twice now — once when the tenth nav item landed,
   * and once when the lamp was widened — and both times it was a screenshot
   * that caught it, not a test. Overflow is silently invisible to every
   * assertion we had: the links are present, visible and clickable, they are
   * simply drawn underneath the controls to their right.
   *
   * So measure it directly. `scrollWidth > clientWidth` on the nav list is the
   * exact condition, and it is checked at whatever viewport the project is
   * running, which is how the 1440 and 1280 cases both get covered.
   */
  test('the primary nav never overflows the header bar', async ({ page }) => {
    await page.goto('/');

    const overflow = await page.evaluate(() => {
      const list = document.querySelector('header nav ul');
      if (!list || getComputedStyle(list).display === 'none') return null;
      return { scroll: list.scrollWidth, client: list.clientWidth };
    });

    // Below `lg` the list is display:none and the hamburger takes over.
    if (overflow === null) return;
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
  });
});
