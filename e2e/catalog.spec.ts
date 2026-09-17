import { test, expect } from '@playwright/test';

test.describe('Journey 2: Catalog & Master Data Management (Admin)', () => {
  test('Happy Path: Admin adds a new Tea Series and it appears in the table', async ({ page }) => {
    await page.goto('/admin/series');

    await page.getByTestId('add-series-btn').click();
    await page.getByTestId('series-name-input').fill('Special Reserve Series');
    await page.getByTestId('series-desc-input').fill('Teh pilihan kualitas tertinggi');
    await page.getByTestId('series-save-btn').click();

    const table = page.getByTestId('series-table');
    await expect(table).toContainText('Special Reserve Series');
  });

  test('Failure State: Submitting empty series name shows error message', async ({ page }) => {
    await page.goto('/admin/series');

    await page.getByTestId('add-series-btn').click();
    await page.getByTestId('series-name-input').fill('');
    await page.getByTestId('series-save-btn').click();

    const errorMsg = page.getByTestId('series-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/wajib diisi/i);
  });

  test('Happy Path: Admin edits booth location with GMaps shortlink and saves new coordinates', async ({ page }) => {
    await page.goto('/admin/booths');
    await page.waitForSelector('[data-testid="booths-table"]');

    // Click edit on the first booth
    const editBtn = page.locator('button:has-text("Edit Peta")').first();
    await editBtn.click();
    await page.waitForSelector('[data-testid="booth-lat-input"]');

    const latInput = page.locator('[data-testid="booth-lat-input"]');
    const lngInput = page.locator('[data-testid="booth-lng-input"]');

    // Paste GMaps link
    const gmapsInput = page.locator('input[placeholder*="Tempel link share"]');
    await gmapsInput.fill('https://maps.app.goo.gl/5eMVeH3paMnv6YUf8');

    // Click Terapkan Titik
    await page.locator('button:has-text("Terapkan Titik")').click();

    // Verify coordinates updated to Kediri (-7.9538516, 111.9623726)
    await expect(latInput).toHaveValue('-7.9538516', { timeout: 10000 });
    await expect(lngInput).toHaveValue('111.9623726', { timeout: 10000 });

    // Save changes
    await page.locator('[data-testid="booth-save-btn"]').click();
    await page.waitForSelector('[data-testid="booths-table"]');

    // Verify table updated with new coordinate
    const table = page.getByTestId('booths-table');
    await expect(table).toContainText('-7.9538516');
  });
});
