import { test, expect } from '@playwright/test';

test.describe('Family Money Tracker', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'skip_auth',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

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
      page.getByText('Rozdelenie príjmu podľa nastavených percent')
    ).toBeVisible();
  });
});
