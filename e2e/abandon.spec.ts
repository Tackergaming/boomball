/**
 * Abandons the e2e account's match from the board, through the screen (2H.28,
 * `00` C29).
 *
 * Tagged `@abandon` and left out of `npm run e2e`: the smoke leaves a match
 * open on purpose, so the playthrough has something to play, and this spec
 * would take it away. `npm run e2e:abandon` runs it. It opens a match through
 * the lobby when none is running, clicks "Leave the match", captures the
 * confirmation, confirms, and expects the hub back without a running match
 * and with the abandoned count up by one.
 */

import { expect, test } from '@playwright/test';

import { Shots, report, stamp, waitForHook, watch, prefer2D } from './harness.js';

test('@abandon leaves the running match with no result', async ({ page }, info) => {
  test.setTimeout(3 * 60_000);
  const shots = new Shots(page, info, `${stamp()}-abandon`);
  const seen = watch(page);

  await prefer2D(page);
  await page.goto('/');
  const toLobby = page.getByRole('button', { name: 'To the lobby' });
  const resume = page.getByRole('button', { name: 'Back to the silo' });
  await expect(resume.or(toLobby).first()).toBeVisible({ timeout: 30_000 });

  // How many were abandoned before, read off the hub's note (absent means none).
  const note = page.getByTestId('abandoned-note');
  const before = (await note.isVisible()) ? Number.parseInt((await note.innerText()).trim(), 10) : 0;

  if (await resume.isVisible()) {
    await resume.click();
  } else {
    await toLobby.click();
    await page.getByRole('button', { name: 'Start match' }).click();
  }
  await waitForHook(page);

  // -- Leave, then keep playing: the prompt closes and the match stays -------
  await page.getByTestId('leave-match').click();
  await expect(page.getByTestId('abandon-prompt')).toBeVisible();
  await expect(page.getByTestId('abandon-prompt')).toContainText('no win, no loss, and the ladder does not move');
  await shots.take('leave-prompt');
  await page.getByTestId('abandon-no').click();
  await expect(page.getByTestId('abandon-prompt')).toHaveCount(0);
  await expect(page.getByTestId('leave-match')).toBeEnabled();

  // -- Leave for good --------------------------------------------------------
  await page.getByTestId('leave-match').click();
  await page.getByTestId('abandon-yes').click();
  await expect(page.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
  await expect(resume).toHaveCount(0);
  await expect(toLobby).toBeVisible();
  await expect(note).toBeVisible();
  expect(Number.parseInt((await note.innerText()).trim(), 10)).toBe(before + 1);
  await shots.take('hub-after-abandon');

  await info.attach('console-and-network', { body: report(seen), contentType: 'text/plain' });
  expect(seen.errors, 'page errors and console errors').toEqual([]);
  expect(seen.warnings, 'console warnings').toEqual([]);
  expect(seen.failed, 'responses of 400 and above').toEqual([]);
});
