import { test, expect } from '@playwright/test';

test.describe('Family Money Tracker', () => {
  test('should load the dashboard and show welcome message', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Ahoj! 👋')).toBeVisible();
  });

  test('should navigate to Assets page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Majetok' }).click();
    await expect(page).toHaveURL('/assets');
    await expect(
      page.getByText('Detailný prehľad tvojich finančných aktív')
    ).toBeVisible();
  });

  test('should load Income page', async ({ page }) => {
    await page.goto('/income');
    await expect(
      page.getByText('Sleduj svoje mesačné prítoky financií')
    ).toBeVisible();
  });

  test('should load Calculator page', async ({ page }) => {
    await page.goto('/calculator');
    await expect(
      page.getByText('Koľko investovať z príjmu a simulácia rastu portfólia')
    ).toBeVisible();
  });

  test('should add a new expense', async ({ page }) => {
    // Intercept Supabase request to mock successful insertion
    await page.route('**/rest/v1/expense_records*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-id' }]),
      });
    });

    await page.goto('/expenses');

    // Wait for hydration to complete before interacting
    await page.waitForLoadState('networkidle');

    // Click add button
    await page.getByRole('button', { name: 'Pridať výdavok' }).click();

    // Fill form
    await page.locator('#expense-description').fill('Testovací výdavok');
    await page.locator('#expense-amount').fill('10');

    // Select category
    await page.locator('#expense-category').selectOption({ index: 1 });

    // Submit
    await page.getByTestId('expense-submit-button').click();

    // Verify success toast
    await expect(page.getByText('Výdavok úspešne pridaný')).toBeVisible({ timeout: 10000 });
  });
});
