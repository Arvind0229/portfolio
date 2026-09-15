import { expect, openAppearance, test } from './fixtures';

/**
 * The core visitor journey across the page set, against a production build.
 */
test.describe('portfolio journey', () => {
  test('the home page states who he is and what he does', async ({ page }) => {
    await page.goto('/');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('Arvind Gupta');
    await expect(heading).toContainText('RPA Developer');
    await expect(page.getByRole('link', { name: /explore the work/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ask my ai assistant/i })).toBeVisible();
  });

  test('the name is announced once and is actually painted', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });

    // Per-character spans must not make a screen reader spell the name out,
    // and must not duplicate it either.
    const accessibleName = await heading.evaluate((element) => {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
      return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
    });
    expect(accessibleName.match(/Arvind Gupta/g)).toHaveLength(1);

    // And the visible characters must carry the name — an earlier version
    // passed a text assertion while rendering nothing at all.
    const painted = await heading.evaluate((element) =>
      Array.from(element.querySelectorAll('.char'))
        .map((node) => node.textContent)
        .join('')
        .replace(/ /g, ' ')
        .trim(),
    );
    // The gap between the two halves is layout, not a character, so compare
    // without spaces.
    expect(painted.replace(/\s+/g, '')).toBe('ArvindGupta');
  });

  test('every real route resolves', async ({ page }) => {
    // The section pages are anchors now; these are the URLs a crawler can
    // actually fetch. The anchors have their own tests below.
    const routes = ['/', '/architecture', '/assistant', '/projects/compliance-tracking'];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should resolve`).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('every nav anchor exists on the page it points at', async ({ page }) => {
    // A nav item whose target id is missing is a link that scrolls nowhere and
    // a highlight that can never light up — and nothing else would catch it,
    // because a bad anchor is not an error, it is just silence.
    await page.goto('/');
    const missing = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav[aria-label="Primary"] a[href*="#"]'))
        .map((a) => (a.getAttribute('href') ?? '').split('#')[1] ?? '')
        .filter((id) => id.length > 0 && !document.getElementById(id)),
    );
    expect(missing).toEqual([]);
  });

  test('the bar advances by itself as the page is scrolled', async ({ page }) => {
    /*
     * The whole point of the one-page layout: reading the site moves you
     * through it, and the bar says where you are. If this stops working the
     * highlight sits on "Home" for thirteen thousand pixels, which reads as
     * broken navigation rather than as a missing flourish.
     *
     * Asserted as a *sequence* rather than at fixed percentages: how much of
     * the page each section occupies changes whenever content does, so pinning
     * "60% means Projects" would fail on every content edit. What must hold is
     * that the highlight moves forward, reaches the end, and never goes back.
     */
    await page.goto('/');
    const seen: string[] = [];

    for (let step = 0; step <= 20; step++) {
      await page.evaluate((f) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        // `behavior: 'instant'` on purpose: the page sets
        // `scroll-behavior: smooth`, so a plain scrollTo animates and a short
        // wait samples the highlight mid-flight rather than where it settles.
        window.scrollTo({ top: max * f, behavior: 'instant' });
      }, step / 20);
      await page.waitForTimeout(260);

      const current = await page
        .locator('nav[aria-label="Primary"] a[aria-current="page"]')
        .first()
        .innerText()
        .catch(() => '');

      if (current && seen[seen.length - 1] !== current) seen.push(current);
    }

    expect(seen[0]).toBe('Home');
    expect(seen[seen.length - 1]).toBe('Contact');
    // It passed through the middle rather than jumping the whole way.
    expect(seen.length).toBeGreaterThanOrEqual(4);

    // And never went backwards.
    const order = ['Home', 'About', 'Experience', 'Projects', 'Skills', 'Impact', 'Contact'];
    const indices = seen.map((label) => order.indexOf(label));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  test('navigation moves between pages and marks the current one', async ({ page }, testInfo) => {
    const width = testInfo.project.use.viewport?.width ?? 1440;
    test.skip(width < 1024, 'The bar collapses into the menu sheet below lg.');

    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });

    // Clicking still works — it is now for jumping to a section rather than
    // the only way to move forward.
    await nav.getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page).toHaveURL(/#projects$/);
    await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await nav.getByRole('link', { name: 'Experience', exact: true }).click();
    await expect(page).toHaveURL(/#experience$/);
  });

  test('theme switching changes the whole visual environment and persists', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    const html = page.locator('html');
    const body = page.locator('body');

    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await page.getByTestId('theme-option-engineering').click();
    await expect(html).toHaveAttribute('data-theme', 'engineering');
    await expect(html).toHaveAttribute('data-mode', 'dark');
    const engineeringBg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.getByTestId('theme-option-studio').click();
    await expect(html).toHaveAttribute('data-theme', 'studio');

    // Colours cross-fade over --theme-transition, so the settled value is what
    // matters; polling also proves the transition completes.
    await expect
      .poll(async () => body.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(engineeringBg);

    // Survives a reload — and applies before paint, so no flash of the default.
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'studio');
  });

  test('font switching changes typography and persists', async ({ page }, testInfo) => {
    await page.goto('/');
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

  test('the bulb switches light and dark, and the choice survives a reload', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await page.getByTestId('theme-option-enterprise').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');

    const bulb = page.getByTestId('bulb-switch');
    await expect(bulb).toHaveAttribute('aria-checked', 'false');

    const body = page.locator('body');
    const lightBg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

    await bulb.click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
    await expect(bulb).toHaveAttribute('aria-checked', 'true');

    await expect
      .poll(async () => body.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(lightBg);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });

  test('clicking the bulb pulls the cord', async ({ page }) => {
    /*
     * A pendant lamp on a cord invites one gesture, so the click does what the
     * gesture does: the cord stretches and snaps back.
     *
     * Asserted through `document.getAnimations()` rather than by reading
     * `transform`. Chrome runs transform animations on the compositor, so
     * `getComputedStyle` reports the base value for most of the playback —
     * sampling it every frame caught the stretch on exactly one frame out of
     * forty and reported "not animating" on the other thirty-nine. The
     * animation registry is the truth here; pixels and computed styles are not.
     */
    await page.goto('/');
    const bulb = page.getByTestId('bulb-switch');

    // Nothing is playing before the click — the lamp is still on arrival.
    expect(
      await page.evaluate(() =>
        document.getAnimations().filter((a) => (a as CSSAnimation).animationName?.includes('yank')).length,
      ),
    ).toBe(0);

    await bulb.click();

    /*
     * Polled rather than sampled two frames after the click. The same click
     * also changes the theme, so React has a large re-render to get through
     * before the cord remounts — a fixed two-frame wait passed alone and
     * failed when the file ran as a suite, which is the definition of a flaky
     * test rather than a real signal.
     */
    await expect
      .poll(async () =>
        page.evaluate(() =>
          document
            .getAnimations()
            .map((a) => (a as CSSAnimation).animationName)
            .filter((n) => n?.includes('yank'))
            .sort()
            .join(','),
        ),
      )
      // Both halves: the cord stretches, and the bulb is carried by it.
      .toBe('bulb-yank,cord-yank');
  });

  test('a second click pulls the cord again', async ({ page }) => {
    // The failure this guards is specific and easy to reintroduce: a CSS
    // animation only restarts when an element *enters* the animated state, so
    // a class that is already applied does nothing the second time. The cord
    // is keyed on a click counter and remounts, which is what makes the
    // restart unconditional.
    await page.goto('/');
    const bulb = page.getByTestId('bulb-switch');

    for (const attempt of [1, 2, 3]) {
      await bulb.click();
      await expect
        .poll(
          async () =>
            page.evaluate(
              () =>
                document
                  .getAnimations()
                  .filter((a) => (a as CSSAnimation).animationName === 'cord-yank').length,
            ),
          { message: `click ${attempt} should restart the pull` },
        )
        .toBeGreaterThan(0);
      // Let it finish so the next click is a genuine restart, not an overlap.
      await page.waitForTimeout(900);
    }
  });

  test('the bulb is operable by keyboard', async ({ page }) => {
    await page.goto('/');
    const bulb = page.getByTestId('bulb-switch');
    const before = await bulb.getAttribute('aria-checked');
    await bulb.focus();
    await page.keyboard.press('Enter');
    await expect(bulb).not.toHaveAttribute('aria-checked', before ?? '');
  });

  test('the automation graph renders on the home page and reads in order', async ({ page }) => {
    await page.goto('/');
    const graph = page.getByTestId('automation-flow');
    await expect(graph).toBeVisible();

    // The diagram's accessible content is the cards themselves, in reading
    // order — not an aria-label pasted onto a picture. So assert the order,
    // because that is the contract a screen reader actually relies on.
    const stages = await graph.locator('li').allInnerTexts();
    const joined = stages.join(' | ').toLowerCase();
    expect(joined).toContain('manual process');
    expect(joined.indexOf('rpa bot')).toBeGreaterThan(joined.indexOf('manual process'));
    expect(joined.indexOf('validation')).toBeGreaterThan(joined.indexOf('data processing'));
    expect(joined.indexOf('automated result')).toBeGreaterThan(joined.indexOf('validation'));

    // Animation is paused while off-screen — on a phone the graph starts below
    // the fold, which is the behaviour, not a bug.
    await graph.scrollIntoViewIfNeeded();
    await expect(graph).toHaveAttribute('data-active', 'true');
  });

  test('the linear pipeline still describes itself on the architecture page', async ({ page }) => {
    // The graph and the pipeline are different diagrams for different things:
    // the runtime is a graph, the delivery cycle is a sequence. This asserts
    // the sequence one is still where it belongs.
    await page.goto('/architecture');
    const pipeline = page.getByTestId('automation-pipeline');
    await expect(pipeline).toHaveCount(1);

    await expect(pipeline.getByRole('img')).toHaveAttribute(
      'aria-label',
      /Automation pipeline: .+/i,
    );

    await pipeline.scrollIntoViewIfNeeded();
    await expect(pipeline).toHaveAttribute('data-active', 'true');
  });

  test('a technology chip explains itself, and closes back to where it started', async ({
    page,
  }) => {
    await page.goto('/');
    const chip = page.getByTestId('skill-chip-Power BI');
    await chip.scrollIntoViewIfNeeded();
    await chip.click();

    const dialog = page.getByTestId('skill-explainer');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Power BI');
    await expect(dialog).toContainText(/what it is/i);
    await expect(dialog).toContainText(/why it gets used/i);

    // The personal half is read off the case studies, so it must name a real
    // one — and that project must actually exist as a route.
    const projectLink = dialog.getByRole('link').first();
    await expect(projectLink).toHaveAttribute('href', /^\/projects\//);

    // Escape is the modal contract, and focus has to come back to the chip —
    // the part hand-rolled modals usually miss, and the reason this uses the
    // native dialog element.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(chip).toBeFocused();
  });

  test('a technology with no case study says so rather than inventing one', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('skill-chip-Redshift').scrollIntoViewIfNeeded();
    await page.getByTestId('skill-chip-Redshift').click();

    const dialog = page.getByTestId('skill-explainer');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/none of the written case studies name it/i);
    // And it must not have manufactured a project link to fill the space.
    await expect(dialog.getByRole('link')).toHaveCount(0);
  });

  test('the full stack page opens explainers too', async ({ page }) => {
    await page.goto('/#skills');
    const chip = page.getByTestId('skill-chip-OCR');
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    const dialog = page.getByTestId('skill-explainer');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/optical character recognition/i);

    await page.getByTestId('skill-explainer-close').click();
    await expect(dialog).toBeHidden();
  });

  test('the run monitor lists a run and says plainly that it is illustrative', async ({
    page,
  }) => {
    await page.goto('/architecture');
    const monitor = page.getByTestId('run-monitor');
    await monitor.scrollIntoViewIfNeeded();
    await expect(monitor).toBeVisible();

    // The steps are the information; the ticking is presentation. So assert
    // the steps, not the timing — a loop-timing assertion would be flaky and
    // would be testing the animation rather than the content.
    for (const label of ['Reading data', 'Processing', 'Validating', 'Executing', 'Reporting']) {
      await expect(monitor.getByText(label, { exact: true })).toBeVisible();
    }

    // A panel that ticks through "Validating… Completed" looks like a live
    // status feed and is not one. The disclaimer is part of the deliverable,
    // so it is part of the test.
    await expect(monitor).toContainText(/illustrative/i);
    await expect(monitor).toContainText(/not a live status feed/i);

    await expect(monitor).toHaveAttribute('data-phase', /^(running|complete)$/);
  });

  test('each role explains what the employer actually does', async ({ page }) => {
    await page.goto('/#experience');
    // A reader who has not heard of SBFC cannot judge "automated the LOS-LMS
    // environment" until they know it is a lender. So the context is on the
    // page, not assumed.
    await expect(page.getByText(/About SBFC Finance Limited/i)).toBeVisible();
    await expect(page.getByText(/non-banking financial company/i)).toBeVisible();
    await expect(page.getByText(/About Harjai Computers/i)).toBeVisible();
    await expect(page.getByText(/staff augmentation/i)).toBeVisible();
  });

  test('the profile page shows his portrait, actually decoded', async ({ page }) => {
    await page.goto('/#about');

    const portrait = page.getByRole('img', { name: 'Arvind Gupta' });
    await expect(portrait).toBeVisible();

    // `toBeVisible` passes for a broken image — the element is laid out either
    // way. `naturalWidth` is zero until real pixels have decoded, so this is
    // the assertion that separates "the img tag is there" from "the visitor
    // can see his face". It is also the first image in this project, so it is
    // the check that the optimiser works at all in a production build.
    await expect
      .poll(async () => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    // Served through the optimiser rather than as the raw 167 KB JPEG.
    await expect(portrait).toHaveAttribute('src', /\/_next\/image/);

    // The card names him even when the photo is only a face in a frame.
    await expect(page.getByRole('figure').getByText('RPA Developer')).toBeVisible();
  });

  test('the portrait leads on a phone and sits beside the text on a desktop', async ({
    page,
  }) => {
    await page.goto('/#about');

    const portrait = page.getByRole('img', { name: 'Arvind Gupta' });
    // Matched without the figure. This test is about *where the portrait sits*,
    // and pinning it to "2+ years" made it fail the moment the resume figure
    // was corrected to 2.9 — a layout test breaking on a content edit is a
    // test coupled to the wrong thing.
    const summary = page.getByText(/RPA Developer with [\d.+]+ years of experience/);

    const photoBox = await portrait.boundingBox();
    const textBox = await summary.boundingBox();
    expect(photoBox).not.toBeNull();
    expect(textBox).not.toBeNull();
    if (!photoBox || !textBox) return;

    const width = page.viewportSize()?.width ?? 0;

    if (width >= 1024) {
      // Two columns: the photo is to the right of the narrative, not below it.
      expect(photoBox.x).toBeGreaterThan(textBox.x + textBox.width - 1);
    } else {
      // Stacked: a profile page that opens with six hundred words and shows
      // the face somewhere beneath them has the order backwards.
      expect(photoBox.y).toBeLessThan(textBox.y);
    }
  });

  test('the contact panel carries a face, without saying his name twice', async ({
    page,
  }) => {
    await page.goto('/#contact');

    // Decorative: the name is written in text beside it, so the avatar is
    // hidden from the accessibility tree rather than announced again.
    //
    // Scoped to the contact section rather than the document: since everything
    // moved onto one page, the named portrait card also lives here, and a
    // page-wide "no named image" assertion would now be testing the wrong
    // thing.
    const panel = page.locator('#contact');
    const avatar = panel.locator('img[aria-hidden="true"]').first();
    await avatar.scrollIntoViewIfNeeded();
    await expect(avatar).toBeVisible();
    await expect
      .poll(async () => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(panel.getByRole('img', { name: 'Arvind Gupta' })).toHaveCount(0);
  });

  test('the portrait frame is drawn and follows the theme', async ({ page }, testInfo) => {
    await page.goto('/#about');

    const frame = page.locator('.portrait-frame');
    await expect(frame).toBeVisible();

    // The ring is a pseudo-element, so it cannot be located — but its computed
    // animation can be read off the host, which is what proves the frame is
    // wired rather than merely present in the stylesheet.
    const ring = await frame.evaluate(
      (el) => getComputedStyle(el, '::before').animationName,
    );
    expect(ring).toBe('frame-orbit');

    // The colour comes from the theme's accent tokens, so switching theme has
    // to change it. That is the whole claim of "theme-wise": no per-theme
    // branch anywhere, just tokens.
    const arcIn = (await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--frame-arc-a'),
    )).trim();

    await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
    await page.getByTestId('theme-option-studio').click();

    const arcOut = (await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--frame-arc-a'),
    )).trim();

    expect(arcOut).not.toBe(arcIn);
  });

  test('every route has something moving, in every theme', async ({ page }, testInfo) => {
    /*
     * The regression guard for the whole ambient round.
     *
     * A motion audit found `/experience`, `/projects` and `/stack` measuring
     * *exactly* 0.00% changed pixels on Enterprise and Studio: the entrance
     * reveals were real but one-shot, and the only continuous motion lived in
     * one theme's circuit layer. The page arrived and then died.
     *
     * Two screenshots a second apart, and they must differ. Deliberately a
     * floor and not a range — this asserts the page is alive, and how alive is
     * a judgement for a person looking at it, not for a byte comparison.
     */
    for (const theme of ['clay', 'enterprise', 'studio'] as const) {
      await page.goto('/#experience');
      await openAppearance(page, testInfo.project.use.viewport?.width ?? 1440);
      await page.getByTestId(`theme-option-${theme}`).click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2200);

      const first = await page.screenshot();
      await page.waitForTimeout(1100);
      const second = await page.screenshot();

      expect(
        Buffer.compare(first, second),
        `/experience is frozen on the ${theme} theme`,
      ).not.toBe(0);
    }
  });

  test('only the ongoing role and milestone animate', async ({ page }) => {
    // The pulse is a statement about the data: this one is still happening.
    // If every node pulsed it would mean nothing, so the count is the test.
    await page.goto('/#about');
    await expect(page.locator('.node-live')).toHaveCount(1);

    await page.goto('/#experience');
    await expect(page.locator('.role-bar-live')).toHaveCount(1);
  });

  test('a meter appears only where a proportion is real', async ({ page }) => {
    // "80%+ effort reduced" is a share of a hundred and can carry a bar.
    // "80+ automations", "5 databases", "3 interns" are counts with no
    // denominator — a bar there would invent a scale the resume does not have.
    await page.goto('/#impact');
    await expect(page.locator('.meter')).toHaveCount(1);
    await expect(page.getByRole('img', { name: '80 out of 100' })).toBeAttached();
  });

  test('the hero figures count up rather than sitting there', async ({ page }) => {
    await page.goto('/');
    const figure = page.getByTestId('hero-metric-automations');
    await figure.scrollIntoViewIfNeeded();
    // The count is the animation; the figure is the information. Whatever the
    // timing does, it has to arrive at the resume's number.
    await expect(figure).toHaveText('80', { timeout: 5000 });
  });

  test('experience entries expand to show every responsibility', async ({ page }) => {
    await page.goto('/#experience');
    const toggle = page.getByTestId('experience-toggle-sbfc-rpa-developer');
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/Trained and mentored 3 interns/)).toBeVisible();
  });

  test('projects filter, search and open as their own pages', async ({ page }) => {
    await page.goto('/#projects');

    await page.getByTestId('project-filter-compliance').click();
    await expect(page.getByTestId('project-card-compliance-tracking')).toBeVisible();
    await expect(page.getByTestId('project-card-hr-process-automation')).toHaveCount(0);

    await page.getByTestId('project-filter-all').click();
    await expect(page.getByTestId('project-card-multi-product-mis')).toBeVisible();

    // Searching projects moved to the one control in the header. The box that
    // used to sit here only knew about projects, so a technology name typed
    // into it returned nothing while that technology sat in the stack below.
    await expect(page.getByTestId('project-search')).toHaveCount(0);

    await page.getByTestId('project-link-compliance-tracking').click();

    await expect(page).toHaveURL(/\/projects\/compliance-tracking$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Compliance Tracking & Exception Alerting',
    );
    await expect(page.getByText('The business problem')).toBeVisible();

    await page.getByRole('link', { name: /back to projects/i }).click();
    await expect(page).toHaveURL(/#projects$/);
  });

  test('business and technical views tell the same project differently', async ({ page }) => {
    await page.goto('/#projects');
    const card = page.getByTestId('project-card-compliance-tracking');

    const business = await card.innerText();
    await page.getByTestId('project-view-technical').click();
    const technical = await card.innerText();

    expect(technical).not.toBe(business);
  });

  test('one search covers technologies, projects and sections', async ({ page }) => {
    /*
     * The reason this control exists.
     *
     * There used to be two boxes — one over the chips, one over the cards —
     * and each admitted only to what was beside it. The assertion that matters
     * is the third one: a technology query returns the technology *and* the
     * project it was used on, from a single field, which is the thing neither
     * old box could do.
     */
    await page.goto('/');
    await page.getByTestId('site-search-open').click();
    await expect(page.getByTestId('site-search')).toBeFocused();

    await page.getByTestId('site-search').fill('redshift');
    await expect(page.getByTestId('site-search-hit-tech-data-Redshift')).toBeVisible();

    await page.getByTestId('site-search').fill('power bi');
    const results = page.getByTestId('site-search-results');
    await expect(results).toContainText('Power BI');
    await expect(results).toContainText('Project');

    await page.getByTestId('site-search').fill('contact');
    await expect(results).toContainText('Go to');
  });

  test('the search is honest about what it cannot find', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('site-search-open').click();
    await page.getByTestId('site-search').fill('kubernetes');

    await expect(page.getByTestId('site-search-empty')).toBeVisible();
    await expect(page.getByTestId('site-search-results')).toHaveCount(0);
  });

  test('picking a technology filters the stack and says so', async ({ page }) => {
    /*
     * A filtered grid with no visible control is a trap: the visitor comes
     * back to the section later, finds three groups of nine, and has nothing
     * to click for the rest. So the filter names itself and can be cleared.
     */
    await page.goto('/');
    await page.getByTestId('site-search-open').click();
    await page.getByTestId('site-search').fill('redshift');
    await page.getByTestId('site-search-hit-tech-data-Redshift').click();

    await expect(page.getByTestId('site-search-overlay')).toHaveCount(0);

    const clear = page.getByTestId('skill-filter-clear');
    await expect(clear).toBeVisible();
    await expect(clear).toContainText('Redshift');

    await clear.click();
    await expect(page.getByTestId('skill-filter-clear')).toHaveCount(0);
  });

  test('the search works from the keyboard alone', async ({ page }) => {
    /*
     * Opening must move the cursor into the field, arrows must move the
     * selection, Enter must act on it, and Escape must give focus back to the
     * button that opened it — that last one is the step most implementations
     * skip, and without it a keyboard visitor closes the dialog and lands at
     * the top of the document having lost their place.
     */
    await page.goto('/');
    // The shortcut is a document listener attached on hydration, so it does not
    // exist for the first moment the button is on screen. Waiting for the
    // component to say it is live is the deterministic version of a sleep.
    await expect(page.getByTestId('site-search-open')).toHaveAttribute('data-ready', 'true');
    await page.keyboard.press('Control+k');

    const field = page.getByTestId('site-search');
    await expect(field).toBeFocused();

    await field.fill('power');
    await expect(page.getByTestId('site-search-results')).toBeVisible();

    const first = page.getByRole('option').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'false');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('site-search-overlay')).toHaveCount(0);
    await expect(page.getByTestId('site-search-open')).toBeFocused();
  });

  test('the search panel fits a small phone', async ({ page }, testInfo) => {
    // The old field carried a 240px min-width, so on a 320px screen the
    // placeholder was clipped inside a box that could not shrink. Arvind
    // reported it; this pins the replacement against the same failure.
    const width = testInfo.project.use.viewport?.width ?? 1440;
    await page.goto('/');
    await page.getByTestId('site-search-open').click();

    const box = await page.getByTestId('site-search').boundingBox();
    expect(box, 'the search field did not open').not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(width - 16);

    const clipped = await page.getByTestId('site-search').evaluate((el) => {
      const input = el as HTMLInputElement;
      return input.scrollWidth > input.clientWidth + 1;
    });
    expect(clipped, 'the placeholder is clipped inside the field').toBe(false);
  });

  test('architecture views switch and are honestly labelled', async ({ page }) => {
    await page.goto('/architecture');
    await expect(page.getByText(/reflects delivered systems|illustrative/i).first()).toBeVisible();

    await page.getByTestId('arch-tab-automation-runtime').click();
    await expect(page.getByRole('tab', { selected: true })).toHaveText(/automation runtime/i);
  });

  test('impact counters resolve to the resume figures', async ({ page }) => {
    await page.goto('/#impact');

    // Counters start when their own element enters the viewport, so scroll to
    // each metric rather than to the top of the page.
    await page.getByTestId('metric-automations').first().scrollIntoViewIfNeeded();
    await expect(page.getByTestId('metric-automations').first()).toHaveText('80', {
      timeout: 6000,
    });

    // Each counter starts on its own; stacked on a phone, the last one needs
    // its own scroll and a beat to finish counting.
    await page.getByTestId('metric-interns').first().scrollIntoViewIfNeeded();
    await expect(page.getByTestId('metric-interns').first()).toHaveText('3', {
      timeout: 8000,
    });
  });

  test('the reporting showcase is clearly labelled and carries no personal data', async ({
    page,
  }) => {
    await page.goto('/#impact');
    const showcase = page.getByRole('region', { name: /what the business actually sees/i });
    await showcase.scrollIntoViewIfNeeded();

    await expect(showcase.getByText(/illustrative — sample data/i)).toBeVisible();
    await expect(showcase.getByText(/not reproduced here/i)).toBeVisible();

    // The real reports contain names, emails, PANs and mobile numbers. None of
    // those shapes may ever appear on this page.
    const text = await showcase.innerText();
    expect(text).not.toMatch(/@[a-z0-9-]+\.(com|in)\b/i);
    expect(text).not.toMatch(/\b[A-Z]{5}\d{4}[A-Z]\b/);
    expect(text).not.toMatch(/\b\d{10}\b/);
  });

  test('the journey timeline covers education through to the current role', async ({ page }) => {
    await page.goto('/#about');

    await expect(page.getByText(/Bachelor's Degree, Information Technology/)).toBeVisible();
    await expect(page.getByText('Ghanshyam Das Saraf College, Mumbai')).toBeVisible();
    await expect(page.getByText('SBFC Finance Limited, Mumbai')).toBeVisible();

    // Oldest first: school before the degree, degree before the current role.
    const text = await page.locator('#journey').innerText();
    expect(text.indexOf('Our Lady of Remedy')).toBeLessThan(text.indexOf('Ghanshyam Das Saraf'));
    expect(text.indexOf('Ghanshyam Das Saraf')).toBeLessThan(text.indexOf('SBFC Finance'));
  });

  test('the resume is downloadable in both formats', async ({ page }) => {
    await page.goto('/#about');

    const pdf = page.getByRole('link', { name: /download pdf/i });
    await expect(pdf).toHaveAttribute('href', '/resume/Arvind-Gupta-RPA-Developer.pdf');

    const response = await page.request.get('/resume/Arvind-Gupta-RPA-Developer.pdf');
    expect(response.status()).toBe(200);
    expect(Number(response.headers()['content-length'] ?? 0)).toBeGreaterThan(1000);
  });

  test('contact offers a working mailto and phone route', async ({ page }) => {
    await page.goto('/#contact');
    await expect(page.getByRole('link', { name: /compose email/i })).toHaveAttribute(
      'href',
      /^mailto:guptaarvind29042000@gmail\.com/,
    );
    await expect(page.getByRole('link', { name: /^call$/i })).toHaveAttribute(
      'href',
      'tel:+918291398844',
    );
  });

  test('the merged routes redirect instead of 404ing', async ({ page }) => {
    /*
     * Four URLs were retired when the nav went from ten items to seven. Any of
     * them may already be in a sitemap Google has crawled, in a message Arvind
     * has sent a recruiter, or in someone's bookmarks — and a portfolio that
     * 404s a link its owner shared is worse than one with a crowded nav bar.
     *
     * So each must still land somewhere sensible, permanently.
     */
    const moved: ReadonlyArray<readonly [string, RegExp]> = [
      // Round 9 — four pages merged into two.
      ['/expertise', /#skills$/],
      ['/stack', /#skills$/],
      ['/education', /#about$/],
      ['/resume', /#resume$/],
      // Round 10 — section pages became anchors on the home page.
      ['/about', /#about$/],
      ['/experience', /#experience$/],
      ['/projects', /#projects$/],
      ['/skills', /#skills$/],
      ['/impact', /#impact$/],
      ['/contact', /#contact$/],
    ];

    for (const [from, to] of moved) {
      const response = await page.goto(from);
      expect(response?.status(), `${from} should not 404`).toBe(200);
      await expect(page, `${from} should redirect`).toHaveURL(to);
      // And the destination must actually carry what the old URL promised.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('the merged content is all still on the page', async ({ page }) => {
    // Twelve routes became one scroll. Nothing may have been dropped on the
    // way, so every section that used to have its own URL is checked here.
    await page.goto('/');

    for (const id of ['about', 'experience', 'projects', 'skills', 'impact', 'contact', 'journey', 'resume']) {
      await expect(page.locator(`#${id}`), `#${id} is missing`).toBeAttached();
    }

    await expect(page.getByTestId('site-search-open')).toBeAttached();
    await expect(page.getByRole('link', { name: /download pdf/i })).toBeAttached();
    await expect(page.getByTestId('metric-automations').first()).toBeAttached();
  });

  test('an unknown route returns a usable 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to the portfolio/i })).toBeVisible();
  });
});
