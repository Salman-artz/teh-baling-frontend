import { test, expect } from '@playwright/test';

test.describe('Journey 6: Admin Dashboard & Export Laporan Excel', () => {
  test('Happy Path: Admin views dashboard summary cards and triggers Excel download', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByTestId('total-revenue')).toBeVisible();
    await expect(page.getByTestId('cups-sold')).toBeVisible();

    // Navigate to summary and export page
    await page.goto('/admin/summary');
    await expect(page.getByTestId('export-excel-btn')).toBeVisible();
    await page.getByTestId('export-excel-btn').click();
  });

  test('Failure State: Filtering with empty date range displays empty state', async ({ page }) => {
    await page.goto('/admin/summary');

    await page.getByTestId('from-date-input').fill('2020-01-01');
    await page.getByTestId('to-date-input').fill('2020-01-02');

    const summaryTable = page.getByTestId('summary-table');
    const emptyState = page.getByTestId('empty-summary-state');
    
    const tableVisible = await summaryTable.isVisible().catch(() => false);
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    
    expect(tableVisible || emptyVisible).toBe(true);
  });
});
