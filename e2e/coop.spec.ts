/**
 * Two players in the same lobby, then the same match (2H.32, `00` C32).
 *
 * Tagged `@coop` and left out of `npm run e2e`: it abandons the e2e account's
 * running match to reach the lobby, and abandons the co-op match it opens at
 * the end, so the solo specs find a clean battery. `npm run e2e:coop` runs it.
 *
 * The owner is the e2e account, signed in by `global-setup.ts`. The second
 * player is the second e2e account (`BOOMBALL_E2E2_EMAIL` and
 * `BOOMBALL_E2E2_PASSWORD` in the workspace `.env`, never logged), which joined
 * "E2E Battery" with its invite code on 2026-10-17 and signs in here through
 * the screen, in a second browser context: two tabs, two sessions, one lobby.
 */

import { expect, test, type Page } from '@playwright/test';

import {
  Shots,
  act,
  farthest,
  prefer2D,
  report,
  stamp,
  summary,
  view,
  waitForArrival,
  waitForHook,
  waitForPlayableTurn,
  watch,
} from './harness.js';

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
}

test('@coop two players meet in the lobby, open one match, and one hands over', async ({ page, browser }, info) => {
  test.setTimeout(4 * 60_000);
  const run = `${stamp()}-coop`;
  const owner = new Shots(page, info, run);
  const seenOwner = watch(page);

  const context = await browser.newContext({ viewport, storageState: { cookies: [], origins: [] } });
  const second = await context.newPage();
  const guest = new Shots(second, info, `${run}-second`);
  const seenGuest = watch(second);

  try {
    // -- The owner reaches the lobby, abandoning a running match if any ------
    await prefer2D(page);
    await page.goto('/');
    const toLobby = page.getByRole('button', { name: 'To the lobby' });
    const resume = page.getByRole('button', { name: 'Back to the silo' });
    await expect(resume.or(toLobby).first()).toBeVisible({ timeout: 30_000 });
    if (await resume.isVisible()) {
      await page.getByTestId('abandon-match').click();
      await page.getByTestId('abandon-yes').click();
      await expect(toLobby).toBeVisible({ timeout: 30_000 });
    }
    await expect(page.getByTestId('invite-code')).toBeVisible();
    await expect(page.getByTestId('member-row')).toHaveCount(2);
    await owner.take('hub-owner');
    await toLobby.click();
    await expect(page.getByRole('heading', { name: 'Drop into the silo' })).toBeVisible();
    await expect(page.getByTestId('seat-row')).toHaveCount(1);

    // -- The second player signs in, lands on the joined battery, enters ------
    await prefer2D(second);
    await signInSecond(second);
    await expect(second.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
    await expect(second.getByTestId('invite-code')).toHaveCount(0);
    await expect(second.getByTestId('leave-battery')).toBeVisible();
    await expect(second.getByTestId('member-row')).toHaveCount(2);
    await guest.take('hub-second');
    await second.getByRole('button', { name: 'To the lobby' }).click();
    await expect(second.getByRole('heading', { name: 'Drop into the silo' })).toBeVisible();

    // -- Both see both ---------------------------------------------------------
    await expect(page.getByTestId('seat-row')).toHaveCount(2);
    await expect(second.getByTestId('seat-row')).toHaveCount(2);
    await expect(page.getByTestId('start-match')).toBeDisabled();
    await expect(page.getByTestId('waiting-on')).toContainText('E2E Second');
    await expect(second.getByTestId('owner-starts')).toBeVisible();
    await expect(second.getByTestId('start-match')).toHaveCount(0);

    // The second player takes the Breaker seat, names their Giff, says ready.
    await second.locator('[data-role="breaker"]').click();
    await second.getByTestId('seat-name').fill('Second Giff');
    await second.getByTestId('ready').click();
    await expect(second.getByTestId('ready')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('[data-testid="seat-row"][data-ready="true"]')).toHaveCount(2);
    await expect(page.getByTestId('waiting-on')).toHaveCount(0);
    await expect(page.getByTestId('start-match')).toBeEnabled();
    await expect(page.getByTestId('lobby-tier-line')).toContainText('2 named seats');
    await owner.take('lobby-owner-both-ready');
    await guest.take('lobby-second-ready');

    // -- The owner starts; both land on the board -----------------------------
    await page.getByTestId('start-match').click();
    await waitForHook(page);
    await waitForHook(second);
    for (const one of [page, second]) {
      // The briefing, shown to a fresh context; `isVisible` does not wait,
      // `waitFor` does, and the hook reads `yours` false behind the briefing.
      const into = one.getByRole('button', { name: 'Into the silo' });
      const briefed = await into.waitFor({ state: 'visible', timeout: 5_000 }).then(
        () => true,
        () => false,
      );
      if (briefed) await into.click();
      await one.getByRole('button', { name: 'instant', exact: true }).click();
    }
    // Each client drives its own Giff: two human units on side A. The board
    // is read once the hook holds it: the opening replays from the kick-off.
    for (const one of [page, second]) {
      await one.waitForFunction(() => !!window.__boomball?.state, null, { timeout: 30_000 });
    }
    const humans = await page.evaluate(
      () => window.__boomball!.state!.units.filter((u) => u.controller.kind === 'human').map((u) => u.name).sort(),
    );
    expect(humans).toHaveLength(2);
    expect(humans).toContain('Second Giff');
    const mine = await second.evaluate(
      () => window.__boomball!.state!.units.find((u) => u.controller.kind === 'human' && u.name === 'Second Giff')?.id ?? null,
    );
    expect(mine).not.toBeNull();
    await owner.take('match-owner');
    await guest.take('match-second');

    // -- The owner's turn: the second client sees it land (2H.33) -------------
    // Side A plays first (it has humans): the Trajector, then the Strikers,
    // where the owner is asked its place. First place, then one step and
    // the end of the turn, through the hook.
    expect(await waitForPlayableTurn(page, () => 1, owner)).toBe('turn');
    const seenBySecond = (await view(second)).seq;
    const legal = await summary(page);
    if (legal.destinations.length > 0) {
      const to = farthest(legal.destinations);
      await page.evaluate(([x, y]) => window.__boomball!.clickCell(x, y), [to.x, to.y] as const);
      await waitForArrival(page, legal.unitId, to);
    }
    await act(page, { kind: 'endTurn' });
    // The batch the owner produced reaches the second client by the match
    // channel and is walked there, without the second client asking.
    await second.waitForFunction(
      (before) => (window.__boomball?.seq ?? -1) > before && !window.__boomball?.replaying,
      seenBySecond,
      { timeout: 60_000 },
    );
    await guest.take('second-saw-owner-turn');

    // -- The second player's turn: the owner waits, the second hands over ------
    expect(await waitForPlayableTurn(second, () => 1, guest)).toBe('turn');
    await expect(page.getByTestId('waiting-for')).toContainText('Second Giff', { timeout: 30_000 });
    await owner.take('owner-waiting-for-second');
    await expect(second.getByTestId('hand-over')).toBeVisible();
    await second.getByTestId('hand-over').click();
    await expect(second.getByTestId('yield-prompt')).toBeVisible();
    await guest.take('hand-over-prompt');
    await second.getByTestId('yield-yes').click();
    // The seat is the house's now: the second client watches, the owner's
    // board reads the unit as the AI's once the batch lands.
    await expect(second.getByTestId('watching')).toBeVisible({ timeout: 30_000 });
    await expect(second.getByTestId('hand-over')).toHaveCount(0);
    await expect(second.getByTestId('watch-leave')).toBeVisible();
    await page.waitForFunction(
      (id) => window.__boomball?.state?.units.find((u) => u.id === id)?.controller.kind === 'ai' && !window.__boomball?.replaying,
      mine,
      { timeout: 60_000 },
    );
    await guest.take('second-watching');
    await owner.take('owner-after-hand-over');

    // -- The owner leaves; the second client is told and lands on its hub -----
    await page.getByTestId('leave-match').click();
    await page.getByTestId('abandon-yes').click();
    await expect(page.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
    await expect(second.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
    await owner.take('hub-after-leave');
    await guest.take('second-hub-after-owner-left');
  } finally {
    await context.close();
  }

  await info.attach('console-and-network-owner', { body: report(seenOwner), contentType: 'text/plain' });
  await info.attach('console-and-network-second', { body: report(seenGuest), contentType: 'text/plain' });
  for (const seen of [seenOwner, seenGuest]) {
    expect(seen.errors, 'page errors and console errors').toEqual([]);
    expect(seen.warnings, 'console warnings').toEqual([]);
    expect(seen.failed, 'responses of 400 and above').toEqual([]);
  }
});
