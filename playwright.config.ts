import { defineConfig } from '@playwright/test';

// Pick up .env.local (Mongo URI, DNS workaround, ...) the same way `next` does.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* no .env.local: rely on the real environment (CI) */
}

const PORT = 3200;
export const TEST_DB = 'tptt-admin-e2e';

// Everything the app server needs for tests. The database name is forced so tests can never touch real data.
const serverEnv = {
  MONGODB_DB: TEST_DB,
  ADMIN_SEED_NAME: 'Test Owner',
  ADMIN_SEED_EMAIL: 'owner@example.com',
  ADMIN_SEED_PASSWORD: 'devpassword123',
  INTAKE_API_KEY: 'test-intake-key-0123456789',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '2525',
  SMTP_USER: 'admin@example.com',
  SMTP_PASS: 'test',
  APP_URL: `http://localhost:${PORT}`,
};

export default defineConfig({
  testDir: './e2e',
  // Tests share one database and build on each other's data, so run them in order.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  // The first request after startup connects to Atlas and builds indexes; remote round trips are slow.
  expect: { timeout: 20_000 },
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome', // the installed Chrome; no browser download needed
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: serverEnv as unknown as Record<string, string>,
  },
});
