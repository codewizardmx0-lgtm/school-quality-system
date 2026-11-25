import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';

function resolveSeedPassword(): string {
  if (process.env.E2E_PASSWORD) {
    return process.env.E2E_PASSWORD;
  }
  const envPath = resolve(process.cwd(), '../school-eval-api/.env');
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, 'utf8').match(/^SEED_DEFAULT_PASSWORD=(.+)$/m);
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return 'ChangeMeDevPassword@2026';
}

const E2E_PASSWORD = resolveSeedPassword();

function attachErrorListeners(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  return { consoleErrors, pageErrors };
}

async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /دخول إلى النظام/ }).click();
}

test.describe('School Quality System Smoke E2E', () => {
  test('renders Arabic RTL login screen and validates empty submission', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorListeners(page);

    await page.goto('/');

    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir === 'rtl' || htmlDir === null).toBeTruthy();

    await expect(page.getByRole('button', { name: /دخول إلى النظام/ })).toBeVisible();
    await page.getByRole('button', { name: /دخول إلى النظام/ }).click();

    await expect(page.getByRole('button', { name: /دخول إلى النظام/ })).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('admin logs in and navigates across admin portal screens without console errors', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorListeners(page);

    await loginAs(page, 'admin', E2E_PASSWORD);

    await expect(page.getByText('لوحة التحكم الرئيسية').first()).toBeVisible({ timeout: 15_000 });
    await page.getByText('المستخدمين والصلاحيات').first().click();
    await expect(page.getByText('دليل المدارس والمديريات').first()).toBeVisible();

    await page.getByText('دليل المدارس والمديريات').first().click();
    await page.waitForTimeout(500);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('school evaluator (quality_farouq) logs in and navigates portal screens without console errors', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorListeners(page);

    await loginAs(page, 'quality_farouq', E2E_PASSWORD);

    await expect(page.getByText('دليل وتقييم المعايير').first()).toBeVisible({ timeout: 15_000 });
    await page.getByText('دليل وتقييم المعايير').first().click();
    await expect(page.getByText('مستودع الشواهد').first()).toBeVisible();

    await page.getByText('مستودع الشواهد').first().click();
    await page.waitForTimeout(500);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('ministry supervisor (supervisor_ministry) logs in and navigates portal screens without console errors', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorListeners(page);

    await loginAs(page, 'supervisor_ministry', E2E_PASSWORD);

    await expect(page.getByText('لوحة المتابعة').first()).toBeVisible({ timeout: 15_000 });
    await page.getByText('إدارة الدورات التقييمية').first().click();
    await expect(page.getByText('التقارير والتحليل').first()).toBeVisible();

    await page.getByText('التقارير والتحليل').first().click();
    await page.waitForTimeout(500);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
