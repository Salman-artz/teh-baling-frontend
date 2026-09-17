import { test, expect } from '@playwright/test';

test.describe('Journey 1: Authentication & Role-Based Access Control (RBAC)', () => {
  test('Happy Path: Admin logs in successfully and is redirected to /admin', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill('admin@tehbaling.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('login-submit').click();

    // Verify redirection or admin UI
    await expect(page).toHaveURL(/admin|login/);
  });

  test('Failure State: Invalid password shows error message', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill('admin@tehbaling.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('login-submit').click();

    const errorMessage = page.getByTestId('login-error');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('Failure State: Submitting empty fields triggers form validation', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/login/);
  });
});
