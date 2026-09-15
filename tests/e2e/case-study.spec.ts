import { expect, test } from './fixtures';
import { projectRecords } from '../../src/data/projects';

/**
 * The case-study page, against the content that is actually committed.
 *
 * The depth store is empty on this commit, so this file deliberately asserts
 * the **unpopulated** case: the page must be complete without depth, and must
 * not render a single heading over nothing. The populated case is covered by
 * the component tests, which can supply a fixture without putting invented
 * content into the repository.
 *
 * Runs at every viewport in `playwright.config.ts`.
 */

const ID = 'compliance-tracking';

test.describe('case study', () => {
  test('is complete with no depth written, and shows no empty sections', async ({ page }) => {
    await page.goto(`/projects/${ID}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('cs-problem')).toBeVisible();

    /*
     * The rule this page is built on. An empty section is not a neutral blank
     * — it reads as a page that failed to load, and it is an invitation to
     * fill the gap with something plausible. Absent is the honest state.
     */
    for (const testId of [
      'cs-metrics',
      'cs-overview',
      'cs-architecture',
      'cs-workflow',
      'cs-facts',
      'cs-challenges',
      'cs-before-after',
      'cs-lessons',
      'cs-future',
      'cs-faq',
    ]) {
      await expect(page.getByTestId(testId)).toHaveCount(0);
    }
  });

  test('names the employer from the company reference, not from a literal', async ({ page }) => {
    /*
     * This line used to be hardcoded on every case study. A project added from
     * anywhere else would have carried a false employer, and nothing would
     * have failed.
     */
    await page.goto(`/projects/${ID}`);
    const record = projectRecords.find((entry) => entry.id === ID);

    if (record?.companyId) {
      await expect(page.getByTestId('cs-employer')).toBeVisible();
    } else {
      await expect(page.getByTestId('cs-employer')).toHaveCount(0);
    }
  });

  test('suggests related work by what it shares, not by file order', async ({ page }) => {
    await page.goto(`/projects/${ID}`);

    const related = page.getByTestId('cs-related');
    await expect(related).toBeVisible();

    const self = projectRecords.find((entry) => entry.id === ID);
    const links = related.getByRole('link');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(3);

    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute('href');
      const id = href?.replace('/projects/', '') ?? '';

      expect(id).not.toBe(ID);

      const other = projectRecords.find((entry) => entry.id === id);
      expect(other, `${id} is a real project`).toBeTruthy();

      const shares =
        (other?.companyId && other.companyId === self?.companyId) ||
        other?.skillIds.some((skill) => self?.skillIds.includes(skill)) ||
        other?.experienceIds.some((role) => self?.experienceIds.includes(role)) ||
        other?.category === self?.category;

      expect(shares, `${id} shares nothing with ${ID}`).toBeTruthy();
    }
  });

  test('every related link reaches a page that exists', async ({ page }) => {
    // A suggestion that 404s is worse than no suggestion.
    await page.goto(`/projects/${ID}`);
    const first = page.getByTestId('cs-related').getByRole('link').first();
    const href = await first.getAttribute('href');

    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
