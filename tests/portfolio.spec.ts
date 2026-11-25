import { test, expect, type Page } from '@playwright/test';

const SECTIONS = ['about', 'experience', 'work', 'labs', 'skills', 'contact'];

/** Collects console errors and failed page requests while a test runs. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    // External profile links are not loaded by the page itself, so any failure here is ours.
    errors.push(`requestfailed: ${req.url()}`);
  });
  return errors;
}

test.describe('Portfolio — smoke', () => {
  test('loads with the right title and no console errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/Mohaimen Abid Mahadi/);
    await expect(page.getByTestId('hero-title')).toBeVisible();
    await expect(page.getByTestId('profile-photo')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('profile photo actually loads', async ({ page }) => {
    await page.goto('/');
    const loaded = await page
      .getByTestId('profile-photo')
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    expect(loaded).toBe(true);
  });

  test('profile photo stays square on phones', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const box = await page.getByTestId('profile-photo').boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(1);
  });

  test('has a meta description for search engines', async ({ page }) => {
    await page.goto('/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThan(50);
  });
});

test.describe('Portfolio — navigation', () => {
  test('every in-page link points to a section that exists', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href^="#"]').evaluateAll((links) =>
      links.map((a) => a.getAttribute('href')!).filter((h) => h.length > 1),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of new Set(hrefs)) {
      await expect(page.locator(href), `missing target for ${href}`).toHaveCount(1);
    }
  });

  for (const id of SECTIONS) {
    test(`nav link scrolls to #${id}`, async ({ page, isMobile }) => {
      test.skip(!!isMobile, 'Covered by the mobile menu test');
      await page.goto('/');
      await page.getByTestId('nav-links').locator(`a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    });
  }

  test('external links open safely in a new tab', async ({ page }) => {
    await page.goto('/');
    const external = page.locator('a[target="_blank"]');
    const count = await external.count();
    for (let i = 0; i < count; i++) {
      await expect(external.nth(i)).toHaveAttribute('rel', /noopener/);
    }
  });

  test('CV download link points to a real PDF', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.getByTestId('cv-download').getAttribute('href');
    expect(href).toBeTruthy();
    const res = await request.get(href!);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('pdf');
  });

  test('email link is a valid mailto', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('email-link')).toHaveAttribute('href', /^mailto:.+@.+\..+/);
  });
});

test.describe('Portfolio — interactions', () => {
  test('theme toggle switches and remembers the theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-theme', 'light');

    await page.getByTestId('theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('mobile menu opens, navigates and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const menuBtn = page.getByTestId('menu-btn');
    const links = page.getByTestId('nav-links');

    await expect(links).toBeHidden();
    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(links).toBeVisible();

    await links.getByRole('link', { name: 'Skills' }).click();
    await expect(links).toBeHidden();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#skills')).toBeInViewport();
  });

  test('Escape closes the mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('menu-btn').click();
    await expect(page.getByTestId('nav-links')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('nav-links')).toBeHidden();
  });

  test('skip link is the first thing keyboard users reach', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips links on Tab by default');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
  });
});

test.describe('Portfolio — layout', () => {
  for (const width of [360, 768, 1280]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('content sections are all present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('role')).toHaveCount(1);
    await expect(page.getByTestId('case')).toHaveCount(3);
    await expect(page.getByTestId('lab')).toHaveCount(4);
  });
});

test.describe('Portfolio — accessibility', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`no serious axe violations in ${theme} theme`, async ({ page }) => {
      let AxeBuilder: any;
      try {
        AxeBuilder = (await import('@axe-core/playwright')).default;
      } catch {
        test.skip(true, '@axe-core/playwright is not installed');
      }
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const serious = results.violations.filter((v: any) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      );
      expect(
        serious,
        serious.map((v: any) => `${v.id}: ${v.help} (${v.nodes.length})`).join('\n'),
      ).toEqual([]);
    });
  }
});
