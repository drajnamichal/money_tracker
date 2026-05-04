import { test, expect } from '@playwright/test';

// In dev mode the first request to a route triggers a full compile,
// which can easily take longer than Playwright's default 5s expect
// timeout. Use a generous timeout for the first visible assertion on
// each route to avoid flakes that have nothing to do with product code.
const FIRST_PAINT_TIMEOUT = 30_000;

test.describe('Family Money Tracker', () => {
  test('should load the dashboard and show welcome message', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Ahoj! 👋')).toBeVisible({
      timeout: FIRST_PAINT_TIMEOUT,
    });
  });

  test('should navigate to Assets page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Majetok' }).click();
    await expect(page).toHaveURL('/assets');
    await expect(
      page.getByText('Detailný prehľad tvojich finančných aktív')
    ).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT });
  });

  test('should load Income page', async ({ page }) => {
    await page.goto('/income');
    await expect(
      page.getByText('Sleduj svoje mesačné prítoky financií')
    ).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT });
  });

  test('should load Calculator page', async ({ page }) => {
    await page.goto('/calculator');
    await expect(
      page.getByText('Koľko investovať z príjmu a simulácia rastu portfólia')
    ).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT });
  });

  test('should load Expenses page and show add button', async ({ page }) => {
    await page.goto('/expenses');

    // Wait for the page to fully load and hydrate
    const addButton = page.getByRole('button', { name: 'Pridať výdavok' });
    await expect(addButton).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT });

    // Click add button to open form
    await addButton.click();

    // Verify form appeared
    await expect(page.locator('#expense-description')).toBeVisible();
    await expect(page.locator('#expense-amount')).toBeVisible();
  });
});
