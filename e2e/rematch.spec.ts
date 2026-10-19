/**
 * Two players play a match to the whistle, then play again (2H.35, `00` C34).
 *
 * Jérôme's second coop evening, 2026-10-17: after a finished match, "Play
 * again" on both screens led to a lobby where the owner did not see the
 * team-mate who was waiting there, and the next match opened with one seat
 * (`86df1770`, after `7cfc5976` which had two). This spec is that evening: the
 * same lobby, a full match driven by the house's own brain on both seats, the
 * results sheet on both screens, "Play again" on both, and the lobby that must
 * show both seats again before the owner can start the rematch with two.
 *
 * Tagged `@coop` like `coop.spec.ts`, left out of `npm run e2e`, run by
 * `npm run e2e:coop`. It abandons the e2e account's running match to reach the
 * lobby and the rematch it opens at the end, so the solo specs find a clean
 * team.
 */

import { expect, test, type Page } from '@playwright/test';

import { chooseAction } from '../ai/chooseAction.js';
import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { Shots, act, prefer2D, report, stamp, state, view, waitForHook, waitForPlayableTurn, watch, setReplay, settingsClick } from './harness.js';

const arena = new Arena(KILL_SILO);
const viewport = { width: 1440, height: 900 };

async function signInSecond(page: Page): Promise<void> {
  const email = process.env.BOOMBALL_E2E2_EMAIL;
  const password = process.env.BOOMBALL_E2E2_PASSWORD;
  if (!email || !password) {
    throw new Error('BOOMBALL_E2E2_EMAIL and BOOMBALL_E2E2_PASSWORD are missing from the workspace .env');
  }
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  if (!(await page.getByRole('heading', { name: 'E2E Battery' }).isVisible())) {
    await page.getByTestId('team-switch-open').click();
    await page.getByRole('menuitem', { name: 'E2E Battery' }).click();
  }
  await expect(page.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
}

/** Past the briefing and into instant replay, so a turn is readable at once. */
async function intoTheSilo(page: Page): Promise<void> {
  await waitForHook(page);
  const into = page.getByRole('button', { name: 'Into the silo' });
  if (await into.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await into.click();
  await setReplay(page, 'instant');
}

/** Plays this seat with the house's brain until the whistle. Returns the requests sent. */
async function playToTheWhistle(page: Page, shots: Shots): Promise<number> {
  let turns = 0;
  let refusals = 0;
  for (let i = 0; i < 300; i++) {
    if ((await waitForPlayableTurn(page, (places, round) => ((round - 1) % places) + 1, shots, 180_000)) === 'finished') break;
    const board = await state(page);
    if (!board.turn) throw new Error('no turn is open and the match is not finished');
    const action = chooseAction(arena, board, board.turn.unitId);
    const before = await view(page);
    await act(page, action);
    turns += 1;
    if (!(await page.evaluate(() => !!window.__boomball))) break;
    const after = await view(page);
    if (after.refusal) {
      refusals += 1;
      await page.evaluate(() => window.__boomball?.dismissBeat());
      if (refusals > 5) throw new Error('too many refusals, the brain and the server disagree');
      continue;
    }
    if (after.seq === before.seq && action.kind !== 'endTurn') continue;
  }
  return turns;
}

test('@coop two players finish a match and play again with two seats', async ({ page, browser }, info) => {
  test.setTimeout(30 * 60_000);
  const run = stamp();
  const owner = new Shots(page, info, `${run}-rematch`);
  const seenOwner = watch(page);

  const context = await browser.newContext({ viewport, storageState: { cookies: [], origins: [] } });
  const second = await context.newPage();
  const guest = new Shots(second, info, `${run}-rematch-second`);
  const seenGuest = watch(second);

  try {
    // -- The owner reaches the lobby, abandoning a running match if any ------
    await prefer2D(page);
    await page.goto('/');
    const toLobby = page.getByRole('button', { name: 'Enter the lobby' });
    const resume = page.getByRole('button', { name: 'Back to the silo' });
    await expect(resume.or(toLobby).first()).toBeVisible({ timeout: 30_000 });
    if (await resume.isVisible()) {
      await page.getByTestId('abandon-match').click();
      await page.getByTestId('abandon-yes').click();
    }
    await toLobby.click();
    await expect(page.getByRole('heading', { name: 'The bench' })).toBeVisible();

    // -- The second player joins the lobby, takes a seat, says ready ---------
    await prefer2D(second);
    await signInSecond(second);
    await second.getByRole('button', { name: 'Enter the lobby' }).click();
    await expect(second.getByRole('heading', { name: 'The bench' })).toBeVisible();
    await expect(page.getByTestId('seat-row')).toHaveCount(2);
    await second.locator('[data-role="breaker"]').click();
    await second.getByTestId('seat-name').fill('Second Giff');
    await second.getByTestId('ready').click();
    await expect(page.getByTestId('start-match')).toBeEnabled();

    // -- The first match, to the whistle, both seats driven by the brain ------
    await page.getByTestId('start-match').click();
    await intoTheSilo(page);
    try {
      await intoTheSilo(second);
    } catch (failure) {
      await guest.take('second-did-not-reach-the-board');
      throw failure;
    }
    const [ownerTurns, secondTurns] = await Promise.all([playToTheWhistle(page, owner), playToTheWhistle(second, guest)]);
    console.log(`first match: ${ownerTurns} owner requests, ${secondTurns} second requests`);
    await expect(page.getByText('full time')).toBeVisible({ timeout: 60_000 });
    await expect(second.getByText('full time')).toBeVisible({ timeout: 60_000 });
    await owner.take('results-owner');
    await guest.take('results-second');

    // -- Play again, on both screens: the lobby must show both again ----------
    await page.getByRole('button', { name: 'Play again' }).click();
    await second.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('heading', { name: 'The bench' })).toBeVisible();
    await expect(second.getByRole('heading', { name: 'The bench' })).toBeVisible();
    await expect(page.getByTestId('seat-row')).toHaveCount(2, { timeout: 20_000 });
    await expect(second.getByTestId('seat-row')).toHaveCount(2, { timeout: 20_000 });
    await owner.take('rematch-lobby-owner');
    await guest.take('rematch-lobby-second');

    // -- The second says ready again; the rematch opens with two seats --------
    await second.getByTestId('ready').click();
    await expect(page.getByTestId('start-match')).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId('start-match').click();
    await intoTheSilo(page);
    await intoTheSilo(second);
    for (const one of [page, second]) {
      await one.waitForFunction(() => !!window.__boomball?.state, null, { timeout: 30_000 });
    }
    const humans = await page.evaluate(
      () => window.__boomball!.state!.units.filter((u) => u.controller.kind === 'human').map((u) => u.name).sort(),
    );
    expect(humans).toHaveLength(2);
    expect(humans).toContain('Second Giff');
    await owner.take('rematch-board-owner');

    // -- Clean up: the owner abandons the rematch -----------------------------
    await settingsClick(page, 'leave-match');
    await page.getByTestId('abandon-yes').click();
    await expect(page.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
    await expect(second.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
  } finally {
    await info.attach('console-and-network-owner', { body: report(seenOwner), contentType: 'text/plain' });
    await info.attach('console-and-network-second', { body: report(seenGuest), contentType: 'text/plain' });
    await context.close();
  }
  expect(seenOwner.errors, 'owner: page errors and console errors').toEqual([]);
  expect(seenGuest.errors, 'second: page errors and console errors').toEqual([]);
});
