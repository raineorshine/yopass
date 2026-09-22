import { test, expect } from '@playwright/test';

// A 1x1 transparent SVG, so the test does not depend on any bundled logo.
const LOGO =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22/%3E';

async function mockConfig(
  page: import('@playwright/test').Page,
  extra: Record<string, unknown>,
) {
  await page.route('**/config', async route => {
    await route.fulfill({
      status: 200,
      json: {
        DISABLE_UPLOAD: false,
        PREFETCH_SECRET: true,
        DISABLE_FEATURES: false,
        NO_LANGUAGE_SWITCHER: false,
        ...extra,
      },
    });
  });
}

test.describe('Header branding', () => {
  test('shows no brand link when neither APP_NAME nor LOGO_URL is set', async ({
    page,
  }) => {
    await mockConfig(page, {});
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('header a[href="/"]')).toHaveCount(0);
    await expect(page.locator('header img')).toHaveCount(0);
  });

  test('shows the configured app name', async ({ page }) => {
    await mockConfig(page, { APP_NAME: 'Acme Secrets' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const brand = page.locator('header a[href="/"]');
    await expect(brand).toHaveText('Acme Secrets');
    await expect(page.locator('header img')).toHaveCount(0);
  });

  test('shows the configured logo alongside the app name', async ({ page }) => {
    await mockConfig(page, { APP_NAME: 'Acme Secrets', LOGO_URL: LOGO });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const logo = page.locator('header img');
    await expect(logo).toHaveAttribute('src', LOGO);
    await expect(logo).toHaveAttribute('alt', 'Acme Secrets');
    await expect(page.locator('header a[href="/"]')).toContainText(
      'Acme Secrets',
    );
  });

  test('falls back to a Home label when only a logo is configured', async ({
    page,
  }) => {
    await mockConfig(page, { LOGO_URL: LOGO });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('header img')).toHaveAttribute('alt', 'Home');
    await expect(page.locator('header a[href="/"]')).toBeVisible();
  });
});
