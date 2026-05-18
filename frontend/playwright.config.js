import { defineConfig, devices } from 'playwright/test'

const backendPort = 4050
const frontendPort = 5178
const e2eDbFile = `/private/tmp/igotothetheatre-e2e-store-${Date.now()}.json`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'on-first-retry',
  },
  reporter: [['list']],
  webServer: [
    {
      command: 'npm start',
      cwd: '../backend',
      url: `http://127.0.0.1:${backendPort}/api/health`,
      reuseExistingServer: false,
      timeout: 20_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(backendPort),
        WEB_ORIGIN: `http://127.0.0.1:${frontendPort}`,
        DATABASE_MODE: 'json',
        JSON_DB_FILE: e2eDbFile,
        JWT_SECRET: 'e2e-secret-that-is-long-enough',
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'admin',
        PUBLIC_TEXT_RATE_LIMIT_MAX: '100',
      },
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 20_000,
      env: {
        VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}/api`,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
})
