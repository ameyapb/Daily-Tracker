import { defineConfig, devices } from '@playwright/test'

const DEV_SERVER_PORT = 5183
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './e2e/global-setup.js',
  use: {
    baseURL: DEV_SERVER_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx vite --mode test --port ${DEV_SERVER_PORT} --strictPort`,
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
})
