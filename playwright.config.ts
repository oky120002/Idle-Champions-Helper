import { defineConfig, devices } from '@playwright/test'

const port = 4173
const isCI = process.env.CI === 'true'

// Playwright injects FORCE_COLOR into worker and webServer children.
// The parent Codex shell exports NO_COLOR, and Node warns when both are inherited together.
delete process.env.NO_COLOR

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}/Idle-Champions-Helper/`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run preview:pages -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/Idle-Champions-Helper/`,
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
