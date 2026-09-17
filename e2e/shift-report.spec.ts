import { test, expect } from '@playwright/test';

test.describe('Journey 4: Laporan Shift Booth Attendant (Start Shift & GPS)', () => {
  test('Happy Path: Attendant inputs cash modal, captures GPS, and submits start shift', async ({ page }) => {
    await page.goto('/attendant/start-shift');

    await page.getByTestId('cash-modal-input').fill('50000');
    await page.getByTestId('stock-initial-kecil').fill('40');

    // Geolocation capture
    await page.getByTestId('gps-capture-btn').click();
    await expect(page.getByTestId('gps-status')).toBeVisible();
    await expect(page.getByTestId('gps-status')).toContainText(/Lokasi Terdeteksi/i);

    await page.getByTestId('start-shift-submit-btn').click();
    await expect(page).toHaveURL(/\/attendant/);
  });

  test('Failure State: Submitting negative cash modal shows validation error', async ({ page }) => {
    await page.goto('/attendant/start-shift');

    await page.getByTestId('cash-modal-input').fill('-500');
    await page.getByTestId('start-shift-submit-btn').click();

    const errorMsg = page.getByTestId('start-shift-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/wajib diisi angka valid/i);
  });
});
