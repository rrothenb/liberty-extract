import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.ts',
  timeout: 9_000_000,
  use: {
    baseURL: 'http://lil-langues.pro.dns-orange.fr:8080'
  }
});
