import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 25000,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    permissions: ['geolocation'],
    geolocation: { latitude: -7.250445, longitude: 112.768845 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /(auth|catalog|dashboard-export)\.spec\.ts/,
    },
    {
      name: 'mobile-attendant',
      use: {
        ...devices['Pixel 5'],
        storageState: '.auth/attendant.json',
      },
      dependencies: ['setup'],
      testMatch: /shift-report\.spec\.ts/,
    },
    {
      name: 'mobile-production',
      use: {
        ...devices['Pixel 5'],
        storageState: '.auth/production.json',
      },
      dependencies: ['setup'],
      testMatch: /production\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
