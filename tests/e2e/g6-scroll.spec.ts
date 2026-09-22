import { expect, test } from './fixtures';

/**
 * G6-scroll, checked in a real browser.
 *
 * The unit and component tests prove the storyboard renders the right steps
 * and stays silent without content. What only a browser can prove is the part
 * that is CSS: that the scroll-linked pieces land on a readable finished state
 * under reduced motion, that the spine only appears where there is a gutter
 * for it, and that none of it pushes the page sideways.
 *
 * Viewports are set per test rather than taken from the project, because
 * these assertions are about specific widths.
 */

test.describe('G6 scroll journey', () => {
  test('the storyboard plays the manpower workflow, every step readable under reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const list = page.getByRole('list', { name: /step by step/i });
    await list.scrollIntoViewIfNeeded();
    const steps = list.getByRole('listitem');
    await expect(steps).toHaveCount(11);

    // Every step at full opacity and untransformed: the finished state, not a
    // frame of an animation that reduced motion froze halfway.
    const states = await steps.evaluateAll((items) =>
      items.map((item) => {
        const style = getComputedStyle(item);
        return { opacity: style.opacity, transform: style.transform };
      }),
    );
    for (const state of states) {
      expect(state.opacity).toBe('1');
      expect(state.transform).toBe('none');
    }
  });

  test('the spine is drawn only where there is a gutter for it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.journey-spine')).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.locator('.journey-spine')).toBeHidden();
  });

  test('the primary calls to action are magnetic, and nothing else is', async ({ page }) => {
    await page.goto('/');
    const magnetic = page.locator('[data-magnetic]');
    await expect(magnetic).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Explore the work' })).toHaveAttribute('data-magnetic', '');
  });

  for (const width of [320, 390, 768, 1280, 1440]) {
    test(`no horizontal overflow with the journey layer at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.locator('.storyboard').scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }
});
