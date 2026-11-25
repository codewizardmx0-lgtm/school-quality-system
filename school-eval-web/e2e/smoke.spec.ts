import { test, expect } from '@playwright/test';

test.describe('School Quality System Smoke E2E', () => {
  test('renders Arabic RTL login screen and validates empty submission', async ({ page }) => {
    await page.goto('/');

    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir === 'rtl' || htmlDir === null).toBeTruthy();

    await expect(page.getByRole('button', { name: /دخول إلى النظام/ })).toBeVisible();
    await page.getByRole('button', { name: /دخول إلى النظام/ }).click();

    // Remains on login screen without crashing on empty credentials
    await expect(page.getByRole('button', { name: /دخول إلى النظام/ })).toBeVisible();
  });
});
