import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const localChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const useLocalChrome = !process.env.CI && process.platform === 'win32' && existsSync(localChromePath);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    locale: 'ar-YE',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(useLocalChrome ? { launchOptions: { executablePath: localChromePath } } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
