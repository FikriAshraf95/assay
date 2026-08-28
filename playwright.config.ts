import { defineConfig, devices } from '@playwright/test';

/**
 * Both the variant under test and the directory the specs are read from are environment-driven.
 * That is what lets the harness run the *same* spec against v0, a mutated build and a defect build,
 * and run a *patched* copy of that spec out of a scratch directory without touching tests/.
 */
const variant = process.env.ASSAY_VARIANT ?? 'v0';
const port = Number(process.env.ASSAY_PORT ?? 4321);

export default defineConfig({
  testDir: process.env.ASSAY_TEST_DIR ?? './tests',
  timeout: 15_000,
  expect: { timeout: 4_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: process.env.ASSAY_JSON_REPORT
    ? [['json', { outputFile: process.env.ASSAY_JSON_REPORT }], ['list']]
    : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices['Desktop Chrome'],
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  },
  webServer: {
    command: 'tsx src/fixtures/serve.ts',
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 20_000,
    env: { ASSAY_VARIANT: variant, ASSAY_PORT: String(port) }
  }
});
