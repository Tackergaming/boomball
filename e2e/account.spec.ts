/**
 * The Account menu (phase 8, `00` C35 point 2): change the e2e account's
 * password, sign out, sign back in with the new one, and put it back.
 *
 * Tagged `@account` and left out of `npm run e2e`, because it signs out and
 * changes a credential that `global-setup.ts` needs on the next run. It puts
 * the original back before it ends, in a `finally`, through the same menu;
 * if even that fails, the message says which password the account is left
 * with, in words, never the value.
 *
 * `npm run e2e:account` runs it, about twenty seconds.
 */

import { expect, test, type Page } from '@playwright/test';

import { Shots, report, stamp, watch } from './harness.js';

const email = process.env.BOOMBALL_E2E_EMAIL ?? '';
const original = process.env.BOOMBALL_E2E_PASSWORD ?? '';
const temporary = `${original}-tmp`;

async function expectHub(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: /^(Enter the lobby|Back to the silo|Raise it)$/ }).first(),
  ).toBeVisible({ timeout: 30_000 });
}

async function expectSignedOut(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible({ timeout: 15_000 });
}

/** From the hub: opens the menu, types the new password twice, saves. */
async function changePassword(page: Page, next: string): Promise<void> {
  await page.getByTestId('account-open').click();
  await page.getByTestId('change-password').click();
  await page.getByTestId('new-password').fill(next);
  await page.getByTestId('new-password-again').fill(next);
  await page.getByTestId('save-password').click();
  await expect(page.getByTestId('password-changed')).toBeVisible();
}

async function signOut(page: Page): Promise<void> {
  // The menu may still be open from the password change.
  if (!(await page.getByTestId('sign-out').isVisible())) await page.getByTestId('account-open').click();
  await page.getByTestId('sign-out').click();
  await expectSignedOut(page);
}

async function signIn(page: Page, password: string): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expectHub(page);
}

test('@account changes the password, signs out and back in, and restores it', async ({ page }, info) => {
  test.setTimeout(3 * 60_000);
  test.skip(!email || !original, 'BOOMBALL_E2E_EMAIL and BOOMBALL_E2E_PASSWORD are needed');
  const shots = new Shots(page, info, `${stamp()}-account`);
  const seen = watch(page);

  await page.goto('/');
  await expectHub(page);

  // Which password the account holds right now, for the `finally`.
  let holds = original;
  try {
    // -- The menu, the mismatch guard, then the change ----------------------
    await page.getByTestId('account-open').click();
    await expect(page.getByTestId('account-menu')).toContainText('Signed in as');
    await page.getByTestId('change-password').click();
    await page.getByTestId('new-password').fill(temporary);
    await page.getByTestId('new-password-again').fill(`${temporary}x`);
    await expect(page.getByTestId('password-mismatch')).toBeVisible();
    await expect(page.getByTestId('save-password')).toBeDisabled();
    await shots.take('menu-mismatch');
    await page.getByTestId('new-password-again').fill(temporary);
    await expect(page.getByTestId('save-password')).toBeEnabled();
    await page.getByTestId('save-password').click();
    await expect(page.getByTestId('password-changed')).toBeVisible();
    holds = temporary;
    await shots.take('password-changed');

    // -- Sign out: the sign-in screen, with the forgotten-password line -----
    await signOut(page);
    await expect(page.getByTestId('forgot-note')).toContainText('Ask Jérôme');
    await shots.take('signed-out');

    // -- The old password is refused, the new one is accepted ---------------
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(original);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.error')).toBeVisible();
    await signIn(page, temporary);
    await shots.take('signed-in-with-new');

    // -- Put the original back, and prove it ----------------------------------
    await changePassword(page, original);
    holds = original;
    await signOut(page);
    await signIn(page, original);
    await shots.take('restored');
  } finally {
    if (holds !== original) {
      // Something failed in between: try once more to leave the account as
      // it was found, from wherever the page is.
      try {
        if (await page.getByRole('button', { name: 'Sign in', exact: true }).isVisible()) {
          await signIn(page, holds);
        }
        await changePassword(page, original);
        holds = original;
      } catch (failure) {
        console.error(
          'the e2e account is LEFT WITH THE TEMPORARY PASSWORD (the original followed by "-tmp"): ' +
            'fix it by hand before the next run.',
          failure,
        );
      }
    }
  }

  await info.attach('console-and-network', { body: report(seen), contentType: 'text/plain' });
  // The refused sign-in with the old password is the one 400 this spec expects.
  const unexpected = seen.failed.filter((line) => !/400 POST .*\/auth\/v1\/token/.test(line));
  // Chromium also writes that refusal to the console as a failed resource.
  const errors = seen.errors.filter((line) => !/Failed to load resource.*400/.test(line));
  expect(errors, 'page errors and console errors').toEqual([]);
  expect(seen.warnings, 'console warnings').toEqual([]);
  expect(unexpected, 'responses of 400 and above, other than the refused old password').toEqual([]);
});
