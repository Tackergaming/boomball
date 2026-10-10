/**
 * Signs the e2e account in once per run and keeps the session for the tests.
 *
 * The credentials come from `BOOMBALL_E2E_EMAIL` and `BOOMBALL_E2E_PASSWORD`,
 * loaded from the workspace `.env` by the config. **They are never logged**,
 * and the saved session, which holds a Supabase token, goes to `.auth/`, which
 * git ignores.
 *
 * A fresh sign-in every run rather than a reused session: Supabase rotates the
 * refresh token, and a session file that two runs share goes stale the moment
 * one of them refreshes. Three seconds a run is cheaper than that failure.
 */

import { chromium, type FullConfig } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export default async function globalSetup(config: FullConfig): Promise<void> {
  const email = process.env.BOOMBALL_E2E_EMAIL;
  const password = process.env.BOOMBALL_E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'BOOMBALL_E2E_EMAIL and BOOMBALL_E2E_PASSWORD are missing. They live in the workspace .env, ' +
        'which e2e/playwright.config.ts loads on its own.',
    );
  }

  const project = config.projects[0];
  if (!project) throw new Error('no Playwright project configured');
  const baseURL = project.use.baseURL;
  const storageState = project.use.storageState;
  if (!baseURL || typeof storageState !== 'string') {
    throw new Error('baseURL and a storageState path must be set in the config');
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // The sign-in path is the one the smoke test never sees, so it is watched
    // here: a response of 400 or above fails the run before any test starts.
    const failed: string[] = [];
    const pending: Promise<void>[] = [];
    page.on('response', (response) => {
      if (response.status() < 400) return;
      const url = new URL(response.url());
      const line = `${response.status()} ${response.request().method()} ${url.pathname}`;
      // The body says why, which the status alone never does: a 401 from
      // PostgREST names the JWT fault, and that is what gets read.
      pending.push(
        response.text().then(
          (body) => void failed.push(`${line} · ${body.slice(0, 200)}`),
          () => void failed.push(line),
        ),
      );
    });

    await page.goto(baseURL);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    // Signed in means the hub showed: either the team sheet or, on an account
    // with no team yet, the form that founds one.
    await page
      .getByRole('button', { name: /^(To the lobby|Raise it|Back to the silo)$/ })
      .first()
      .waitFor({ timeout: 30_000 });

    await Promise.all(pending);
    if (failed.length > 0) {
      throw new Error(`the sign-in path answered with failures: ${failed.join(', ')}`);
    }

    await mkdir(dirname(storageState), { recursive: true });
    await page.context().storageState({ path: storageState });
  } finally {
    await browser.close();
  }
}
