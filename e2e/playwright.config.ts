/**
 * The screen harness: Playwright against the real client and the real project.
 *
 * Run from the workspace root:
 *
 *     npm run e2e               # smoke: sign in, hub, lobby, a match, three turns, captures
 *     npm run e2e:playthrough   # plays the open match to the final whistle
 *
 * It starts Vite itself, with the two development switches the scripts rely on
 * (`VITE_BOOMBALL_HOOK`, `VITE_BOOMBALL_PATIENT`, see `client/src/lib/flags.ts`),
 * unless something already answers on 5173. **A dev server started by hand
 * without those switches is reused as it is**, and the smoke test then fails on
 * the missing hook with a message that says so.
 *
 * Signing in happens once per run in `global-setup.ts`, with the e2e account
 * whose credentials live in the workspace `.env`. The session lands in
 * `.auth/`, which git ignores. Captures land in `out/<run>/`, also ignored.
 *
 * `BASE_URL=https://...` points the same tests at a deployed client instead.
 */

import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// The workspace .env, one level above e2e/. Anything already exported
// wins, so a variable set in the shell still overrides the file.
const envFile = resolve(here, '../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

// `localhost`, not `127.0.0.1`: on this machine Vite binds the IPv6 loopback
// only (`[::1]:5173`), so the IPv4 address never answers and the server check
// times out. Node and Chromium both resolve `localhost` to `::1` first.
const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';
const viewport = { width: 1440, height: 900 };

export default defineConfig({
  testDir: here,
  outputDir: resolve(here, 'test-results'),
  globalSetup: resolve(here, 'global-setup.ts'),
  // A solo turn is one request and a house round that takes a few seconds; a
  // whole match is a hundred of them. Generous on purpose, the harness waits
  // on a live server.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: resolve(here, 'playwright-report'), open: 'never' }],
  ],
  use: {
    baseURL,
    storageState: resolve(here, '.auth/e2e.json'),
    viewport,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } }],
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          cwd: resolve(here, '../client'),
          url: baseURL,
          reuseExistingServer: true,
          timeout: 60_000,
          env: { ...process.env, VITE_BOOMBALL_HOOK: '1', VITE_BOOMBALL_PATIENT: '1' },
        },
      }),
});
