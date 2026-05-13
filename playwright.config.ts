import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'https://anafood.vip',
    headless: true,
  },
  timeout: 30000,
});
