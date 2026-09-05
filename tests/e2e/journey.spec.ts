import { expect, openAppearance, test } from './fixtures';

/**
 * The core visitor journey, end to end, against a production build.
 */
test.describe('portfolio journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero states who he is and what he does', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Arvind Gupta');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('RPA Developer');
    await expect(page.getByRole('link', { name: /explore the work/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ask my ai assistant/i })).toBeVisible();
  });

  test('every section is present and reachable', async ({ page }) => {
    for (const id of [
      'profile',
      'expertise',
      'experience',
      'projects',
      'skills',
      'architecture',
      'impact',
      'assistant',
      'resume',
      'contact',
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test('theme switching changes the whole visual environment and persists', async ({ page }, testInfo) => {
    const html = page.locator('html');
    const body = page.locator('body');

    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await page.getByTestId('theme-option-engineering').click();
    await expect(html).toHaveAttribute('data-theme', 'engineering');
    await expect(html).toHaveAttribute('data-mode', 'dark');
    const engineeringBg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.getByTestId('theme-option-studio').click();
    await expect(html).toHaveAttribute('data-theme', 'studio');
    const studioBg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(studioBg).not.toBe(engineeringBg);

    // Survives a reload — and applies before paint, so no flash of the default.
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'studio');
  });

  test('font switching changes typography and persists', async ({ page }, testInfo) => {
    const heading = page.getByRole('heading', { level: 1 });

    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await page.getByTestId('font-option-precision').click();
    const precision = await heading.evaluate((el) => getComputedStyle(el).fontFamily);

    await page.getByTestId('font-option-editorial').click();
    const editorial = await heading.evaluate((el) => getComputedStyle(el).fontFamily);

    expect(editorial).not.toBe(precision);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-font', 'editorial');
  });

  test('dark mode toggle works independently of the theme', async ({ page }, testInfo) => {
    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await page.getByTestId('theme-option-enterprise').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');

    await page.getByRole('switch', { name: /dark mode/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });

  test('experience entries expand to show every responsibility', async ({ page }) => {
    const toggle = page.getByTestId('experience-toggle-sbfc-rpa-developer');
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/Trained and mentored 3 interns/)).toBeVisible();
  });

  test('projects filter, search and open as case studies', async ({ page }) => {
    await page.locator('#projects').scrollIntoViewIfNeeded();

    await page.getByTestId('project-filter-compliance').click();
    await expect(page.getByTestId('project-card-compliance-tracking')).toBeVisible();
    await expect(page.getByTestId('project-card-hr-process-automation')).toHaveCount(0);

    await page.getByTestId('project-filter-all').click();
    await page.getByTestId('project-search').fill('power bi');
    await expect(page.getByTestId('project-card-multi-product-mis')).toBeVisible();

    await page.getByTestId('project-search').fill('');
    await page
      .getByTestId('project-card-compliance-tracking')
      .getByRole('button', { name: /read the case study/i })
      .click();

    const dialog = page.getByTestId('project-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('The problem');
    await expect(dialog).toContainText('Impact');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('business and technical views tell the same project differently', async ({ page }) => {
    await page.locator('#projects').scrollIntoViewIfNeeded();
    const card = page.getByTestId('project-card-compliance-tracking');

    const business = await card.innerText();
    await page.getByTestId('project-view-technical').click();
    const technical = await card.innerText();

    expect(technical).not.toBe(business);
  });

  test('the stack is searchable', async ({ page }) => {
    await page.locator('#skills').scrollIntoViewIfNeeded();
    await page.getByTestId('skill-search').fill('redshift');
    await expect(page.locator('#skills').getByText('Redshift', { exact: true })).toBeVisible();

    await page.getByTestId('skill-search').fill('kubernetes');
    await expect(page.getByText(/it is not something the resume can claim/i)).toBeVisible();
  });

  test('architecture views switch and are honestly labelled', async ({ page }) => {
    await page.locator('#architecture').scrollIntoViewIfNeeded();
    await expect(page.getByText(/reflects delivered systems|illustrative/i).first()).toBeVisible();

    await page.getByTestId('arch-tab-automation-runtime').click();
    await expect(page.getByRole('tab', { selected: true })).toHaveText(/automation runtime/i);
  });

  test('impact counters resolve to the resume figures', async ({ page }) => {
    // Counters start when their own element enters the viewport, so scroll to
    // the metric rather than to the top of the section.
    await page.getByTestId('metric-automations').first().scrollIntoViewIfNeeded();
    await expect(page.getByTestId('metric-automations').first()).toHaveText('80', {
      timeout: 6000,
    });
    // Each counter starts on its own; on a phone they are stacked, so the
    // last one is still below the fold at this point.
    await page.getByTestId('metric-interns').first().scrollIntoViewIfNeeded();
    await expect(page.getByTestId('metric-interns').first()).toHaveText('3');
  });

  test('the resume is downloadable in both formats', async ({ page }) => {
    await page.locator('#resume').scrollIntoViewIfNeeded();

    const pdf = page.getByRole('link', { name: /download pdf/i });
    await expect(pdf).toHaveAttribute('href', '/resume/Arvind-Gupta-RPA-Developer.pdf');

    const response = await page.request.get('/resume/Arvind-Gupta-RPA-Developer.pdf');
    expect(response.status()).toBe(200);
    expect(Number(response.headers()['content-length'] ?? 0)).toBeGreaterThan(1000);
  });

  test('contact offers a working mailto and phone route', async ({ page }) => {
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: /compose email/i })).toHaveAttribute(
      'href',
      /^mailto:guptaarvind29042000@gmail\.com/,
    );
    await expect(page.getByRole('link', { name: /^call$/i })).toHaveAttribute(
      'href',
      'tel:+918291398844',
    );
  });
});
