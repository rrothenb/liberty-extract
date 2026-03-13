import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.ts',
  timeout: 900_000,
  use: {
    baseURL: 'http://lil-langues.pro.dns-orange.fr:8080'
  }
});
