import { expect, test } from './fixtures';

/**
 * The mission journey: five image chapters pinned and cross-faded on scroll.
 *
 * What only a browser can prove: that the chapters actually hand over from
 * one to the next as the page scrolls, that the section costs the other
 * themes nothing (not even an image request), and that the fallbacks —
 * reduced motion and narrow screens — leave every chapter readable.
 */

test.describe('mission journey', () => {
  test('chapters hand over one to the next as the page scrolls', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'engineering'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const section = page.locator('#mission');
    await expect(section).toBeVisible();

    // Measured fresh at every step — the hero settles after load, which moves
    // the section — and scrolled with `instant`, because the page sets
    // `scroll-behavior: smooth` and a smooth scroll is still travelling when
    // the opacities are read.
    const visibleAt = async (fraction: number) => {
      await section.evaluate((el, f) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const travel = (el as HTMLElement).offsetHeight - window.innerHeight;
        window.scrollTo({ top: Math.round(top + f * travel), behavior: 'instant' });
      }, fraction);
      // Two animation frames: a scroll-driven animation is sampled on the
      // frame after the scroll, and an instant scroll can be read before it.
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
      await page.waitForTimeout(300);
      return page
        .locator('.cinema-chapter')
        .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity) > 0.9));
    };
    expect(await visibleAt(0)).toEqual([true, false, false, false, false]);
    expect(await visibleAt(0.5)).toEqual([false, false, true, false, false]);
    expect(await visibleAt(1)).toEqual([false, false, false, false, true]);
  });

  test('it shows on every theme, as its own dark band', async ({ page }) => {
    for (const theme of ['clay', 'studio', 'enterprise', 'engineering']) {
      await page.addInitScript((t) => localStorage.setItem('ag.theme', t), theme);
      await page.goto('/');
      await expect(page.locator('#mission'), theme).toBeVisible();
      await expect(page.locator('#build'), theme).toBeVisible();
      await expect(page.locator('#human'), theme).toBeVisible();
    }
  });

  test('under reduced motion every chapter is laid out and readable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'engineering'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const chapters = page.locator('.cinema-chapter');
    await expect(chapters).toHaveCount(5);
    const states = await chapters.evaluateAll((els) =>
      els.map((el) => ({ opacity: getComputedStyle(el).opacity, position: getComputedStyle(el).position })),
    );
    for (const state of states) expect(state).toEqual({ opacity: '1', position: 'relative' });
    await expect(page.getByRole('heading', { name: 'It starts wherever the data lives' })).toBeVisible();
  });

  test('on a phone it plays as a pinned scene, picture above words, no sideways scroll', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'engineering'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    // Pinned since 2026-09-21: the phone gets the scroll scene, not a stack.
    const layout = await page.locator('.cinema-chapter').first().evaluate((el) => ({
      position: getComputedStyle(el).position,
      direction: getComputedStyle(el).flexDirection,
    }));
    expect(layout).toEqual({ position: 'absolute', direction: 'column' });
    const build = await page.locator('.assembly-stage').evaluate((el) => getComputedStyle(el).position);
    expect(build).toBe('sticky');
    // Scroll to the middle of the mission: exactly one chapter is showing.
    await page.evaluate(() => {
      const m = document.getElementById('mission')!;
      window.scrollTo(0, m.offsetTop + (m.offsetHeight - window.innerHeight) * 0.5);
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shown = await page
      .locator('.cinema-chapter')
      .evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) > 0.9).length);
    expect(shown).toBe(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test.describe('landing frame', () => {
  test('opens the page on Midnight, and hands over to the hero on scroll', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'engineering'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const landing = page.locator('#landing');
    await expect(landing).toBeVisible();
    // At the very top once the page's entrance transition has settled.
    await expect
      .poll(() => landing.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBe(0);
    await expect(page.locator('.landing-tagline')).toBeVisible();

    // The cue goes to the hero, which still carries the page's only <h1>.
    await page.locator('#landing .landing-cue').click();
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('it opens the page on every theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'studio'));
    await page.goto('/');
    await expect(page.locator('#landing')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
});

test.describe('build sequence', () => {
  test('the five stages hand over as the page scrolls, and the rail lights up', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'engineering'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const section = page.locator('#build');
    await expect(section).toBeVisible();
    const at = async (fraction: number) => {
      await section.evaluate((el, f) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.round(top + f * ((el as HTMLElement).offsetHeight - window.innerHeight)), behavior: 'instant' });
      }, fraction);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      await page.waitForTimeout(300);
      return page.locator('.assembly-item').evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity) > 0.9));
    };
    expect(await at(0)).toEqual([true, false, false, false, false]);
    expect(await at(0.5)).toEqual([false, false, true, false, false]);
    expect(await at(1)).toEqual([false, false, false, false, true]);
    // No baked-in claim from the source images reaches the page.
    // No baked-in claim from the source images reaches this section. (The
    // resume's own "reduced manual effort" line lives in Impact, not here.)
    await expect(section.getByText(/better accuracy|reduced manual effort|faster processes/i)).toHaveCount(0);
  });

  test('under reduced motion all five stages and the learning note are readable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'engineering'));
    await page.goto('/');
    const opacities = await page.locator('.assembly-item').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities).toEqual(['1', '1', '1', '1', '1']);
    await expect(page.getByRole('heading', { name: 'Same vision. Bigger possibilities.' })).toBeAttached();
    await expect(page.getByText(/What I am learning now/)).toBeAttached();
  });
});

test.describe('human + automation', () => {
  test('the portrait is labelled, never scaled, and the section reads without motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const image = page.getByRole('img', { name: /Arvind Gupta at his desk/ });
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect(page.getByRole('heading', { name: /judgement stays human/ })).toBeVisible();
    // Parallax may translate the scene, but the face must never be scaled.
    const transform = await page.locator('.human-scene').evaluate((el) => getComputedStyle(el).transform);
    expect(transform === 'none' || /^matrix\(1, 0, 0, 1,/.test(transform)).toBe(true);
  });
});

test.describe('figures in the delivered HTML', () => {
  test('the server renders the real figures, not 0 — what crawlers and link previews see', async ({
    request,
  }) => {
    const html = await (await request.get('/')).text();
    // The count-up used to start at 0, so the HTML itself said "0+" and "0%+".
    expect(html).toMatch(/data-testid="metric-[a-z-]+">[1-9]\d*</);
    expect(html).not.toMatch(/data-testid="metric-[a-z-]+">0</);
  });
});

test.describe('studio mandalas', () => {
  test('light and dark each load only their own set', async ({ page }) => {
    for (const mode of ['light', 'dark'] as const) {
      const requests: string[] = [];
      page.on('request', (r) => {
        if (r.url().includes('/mandala/')) requests.push(r.url().split('/').pop() ?? '');
      });
      await page.addInitScript((m) => {
        localStorage.setItem('ag.theme', 'studio');
        localStorage.setItem('ag.mode.studio', m);
        localStorage.setItem('ag.mode', m);
      }, mode);
      await page.goto('/');
      await expect(page.locator('.studio-mandala-slot')).toHaveCount(7);
      await page.waitForLoadState('networkidle');
      expect(requests.length, mode).toBeGreaterThan(0);
      expect(requests.every((f) => f.startsWith(mode)), `${mode}: ${requests.join(',')}`).toBe(true);
      page.removeAllListeners('request');
    }
  });
});

test.describe('theme backgrounds', () => {
  test('Light Clay: mint background in light mode only; marbles float in both', async ({ page }) => {
    for (const mode of ['light', 'dark'] as const) {
      await page.addInitScript((m) => {
        localStorage.setItem('ag.theme', 'clay');
        localStorage.setItem('ag.mode.clay', m);
        localStorage.setItem('ag.mode', m);
      }, mode);
      await page.goto('/');
      await expect(page.locator('.clay-marble')).toHaveCount(12);
      const bgShown = await page.locator('.clay-bg-a').evaluate((el) => getComputedStyle(el).display !== 'none');
      expect(bgShown, mode).toBe(mode === 'light');
    }
  });

  test('Crimson: its own background and mandala; other themes have neither', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'enterprise'));
    await page.goto('/');
    await expect(page.locator('.crimson-bg')).toHaveCount(1);
    await expect(page.locator('.crimson-mandala')).toHaveCount(2);
    await page.addInitScript(() => localStorage.setItem('ag.theme', 'studio'));
    await page.goto('/');
    await expect(page.locator('.crimson-bg')).toHaveCount(0);
    await expect(page.locator('.clay-marble')).toHaveCount(0);
  });
});

test.describe('change 009 — themed landing, reactive backdrop, WhatsApp mark', () => {
  test('the landing follows the theme outside Midnight dark', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ag.theme', 'studio');
      localStorage.setItem('ag.mode', 'light');
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const image = page.locator('.landing-image');
    const style = await image.evaluate((el) => ({ radius: getComputedStyle(el).borderTopLeftRadius, width: el.getBoundingClientRect().width }));
    expect(style.radius).toBe('24px');
    expect(style.width).toBeLessThan(900); // a framed window, never past the 1672px source
    const shade = await page.locator('.landing-shade').evaluate((el) => getComputedStyle(el).display);
    expect(shade).toBe('none');
  });

  test('Midnight dark keeps the full-bleed night frame', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ag.theme', 'engineering');
      localStorage.setItem('ag.mode', 'dark');
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const width = await page.locator('.landing-image').evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBe(1440);
  });

  test('the backdrop answers the mouse', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ag.theme', 'studio');
      localStorage.setItem('ag.mode', 'light');
      localStorage.setItem('ag.motion', 'full');
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('[data-react="near"]').first().waitFor({ state: 'attached' });
    const centre = await page.evaluate(() => {
      const r = document.querySelector('[data-react="near"]')!.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    await page.mouse.move(centre[0]! + 20, centre[1]! + 20, { steps: 4 });
    await expect
      .poll(() => page.evaluate(() => (document.querySelector('[data-react="near"]') as HTMLElement).style.getPropertyValue('--near')))
      .not.toBe('');
  });

  test('WhatsApp shows its own mark in WhatsApp green', async ({ page }) => {
    // Since CHANGE-011 this is WhatsApp's real mark (Simple Icons, CC0), not
    // a white glyph on a green disc.
    await page.goto('/');
    const mark = page.getByTestId('hero-whatsapp').locator('.wa-mark svg');
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute('fill', '#25D366');
  });

  test('the lamp glows without filters', async ({ page }) => {
    await page.goto('/');
    const filtered = await page
      .getByTestId('bulb-switch')
      .evaluate((el) => [...el.querySelectorAll('*')].filter((n) => getComputedStyle(n).filter !== 'none').length);
    expect(filtered).toBe(0);
  });
});
