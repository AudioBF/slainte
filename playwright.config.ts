import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.QA_PORT || 4180);
const baseURL = process.env.QA_BASE_URL || `http://127.0.0.1:${port}`;
const artifactsRoot = process.env.QA_ARTIFACTS || 'artifacts/qa-sprint-1';

/**
 * QA local (Sprint 1 / 2B) — Chromium only, sem cloud.
 * Servidor e builds são preparados pelos scripts qa-sprint*-e2e.mjs.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: `${artifactsRoot}/playwright-report` }]],
  outputDir: `${artifactsRoot}/test-results`,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'pt-BR',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
