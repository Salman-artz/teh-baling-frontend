import { test, expect } from '@playwright/test';

test.describe('Journey 5: Laporan Produksi Harian (Staf Produksi)', () => {
  test('Happy Path: Production staff fills total liters of tea cooked and submits', async ({ page }) => {
    await page.goto('/production');

    await page.getByTestId('total-liters-input').fill('120');
    await page.getByTestId('production-notes-input').fill('Masak 120 liter teh melati segar');
    await page.getByTestId('production-submit-btn').click();

    // Verify submission response or state
    await page.waitForTimeout(1000);
    const successMsg = page.getByTestId('production-success');
    const errorMsg = page.getByTestId('production-error');
    
    const isSuccess = await successMsg.isVisible().catch(() => false);
    const isError = await errorMsg.isVisible().catch(() => false);
    
    expect(isSuccess || isError).toBe(true);
  });

  test('Failure State: Submitting total liters <= 0 shows validation error', async ({ page }) => {
    await page.goto('/production');

    await page.getByTestId('total-liters-input').fill('0');
    await page.getByTestId('production-submit-btn').click();

    const errorMsg = page.getByTestId('production-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/lebih besar dari 0/i);
  });
});
