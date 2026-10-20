/**
 * Two humans sharing the picks of a whole team (2H.41, `00` C41 point 4).
 *
 * Tagged `@coop` like `coop.spec.ts`, so `npm run e2e:coop` runs it, and for
 * the same reasons left out of `npm run e2e`: it abandons the e2e account's
 * running match to reach the lobby and abandons the one it opens. It needs
 * the functions deployed at engine 12.
 *
 * The owner ticks "We play the whole team"; the second player reads it off
 * the owner's seat. On the board, the second's Giff is only in the second's
 * row, never in the owner's; the owner picks a Giff of the house and the
 * second sees the wait row; the second picks its own Giff and the owner
 * waits for it; then the owner hands the rest of the round to the AI and
 * both land on round 2's pick.
 */

import { expect, test, type Page } from '@playwright/test';

import { Shots, act, pickFromRow, prefer2D, report, setReplay, settingsClick, stamp, state, view, waitForHook, waitForMoment, watch } from './harness.js';

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

async function enter(page: Page): Promise<void> {
  await waitForHook(page);
  const into = page.getByRole('button', { name: 'Into the silo' });
  const briefed = await into.waitFor({ state: 'visible', timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  if (briefed) await into.click();
  await setReplay(page, 'instant');
  await page.waitForFunction(() => !!window.__boomball?.state, null, { timeout: 30_000 });
}

test('@coop two humans share the picks of a whole team', async ({ page, browser }, info) => {
  test.setTimeout(5 * 60_000);
  const run = `${stamp()}-coop-whole`;
  const owner = new Shots(page, info, run);
  const seenOwner = watch(page);

  const context = await browser.newContext({ viewport, storageState: { cookies: [], origins: [] } });
  const second = await context.newPage();
  const guest = new Shots(second, info, `${run}-second`);
  const seenGuest = watch(second);

  try {
    // -- The owner reaches the lobby and ticks the box -----------------------
    await prefer2D(page);
    await page.goto('/');
    const toLobby = page.getByRole('button', { name: 'Enter the lobby' });
    const resume = page.getByRole('button', { name: 'Back to the silo' });
    await expect(resume.or(toLobby).first()).toBeVisible({ timeout: 30_000 });
    if (await resume.isVisible()) {
      await page.getByTestId('abandon-match').click();
      await page.getByTestId('abandon-yes').click();
      await expect(toLobby).toBeVisible({ timeout: 30_000 });
    }
    await toLobby.click();
    await expect(page.getByRole('heading', { name: 'The bench' })).toBeVisible();
    await page.getByTestId('whole-team').check();

    // -- The second player signs in and reads the box off the owner's seat ---
    await prefer2D(second);
    await signInSecond(second);
    await expect(second.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
    if (!(await second.getByRole('heading', { name: 'E2E Battery' }).isVisible())) {
      await second.getByTestId('team-switch-open').click();
      await second.getByRole('menuitem', { name: 'E2E Battery' }).click();
    }
    await expect(second.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
    await second.getByRole('button', { name: 'Enter the lobby' }).click();
    await expect(second.getByRole('heading', { name: 'The bench' })).toBeVisible();
    await expect(second.getByTestId('whole-team-note')).toBeVisible({ timeout: 15_000 });
    await expect(second.getByTestId('whole-team')).toHaveCount(0);
    await guest.take('lobby-second-whole-note');

    await second.locator('[data-role="breaker"]').click();
    await second.getByTestId('seat-name').fill('Second Giff');
    await second.getByTestId('ready').click();
    await expect(page.getByTestId('start-match')).toBeEnabled();
    await page.getByTestId('start-match').click();
    await enter(page);
    await enter(second);

    // -- The first pick: each row shows what its human may send in -----------
    expect(await waitForMoment(page)).toBe('pick');
    expect(await waitForMoment(second)).toBe('pick');
    const board = await state(page);
    expect(board.teamMode.A).toBe('whole');
    const mine = board.units.find((u) => u.controller.kind === 'human' && u.name === 'Second Giff')!.id;
    const owners = board.units.find((u) => u.controller.kind === 'human' && u.name !== 'Second Giff')!.id;
    const ownerView = await view(page);
    const secondView = await view(second);
    expect(ownerView.pickable).toHaveLength(6);
    expect(ownerView.pickable).not.toContain(mine);
    expect(ownerView.pickable).toContain(owners);
    expect(secondView.pickable).toHaveLength(6);
    expect(secondView.pickable).not.toContain(owners);
    expect(secondView.pickable).toContain(mine);
    await owner.take('pick-owner');
    await guest.take('pick-second');

    // -- The owner picks a Giff of the house; the second waits ---------------
    const houseGiff = ownerView.pickable.find((id) => id !== owners)!;
    await pickFromRow(page, houseGiff);
    expect(await waitForMoment(page)).toBe('turn');
    await expect(second.getByTestId('wait-row')).toBeVisible({ timeout: 30_000 });
    await expect(second.getByTestId('waiting-for')).toBeVisible();
    await guest.take('second-waits-on-owner-pick');
    await act(page, { kind: 'endTurn' });

    // -- The second picks its own Giff; the owner waits ---------------------
    expect(await waitForMoment(second)).toBe('pick');
    await pickFromRow(second, mine);
    expect(await waitForMoment(second)).toBe('turn');
    expect((await view(second)).turnUnitId).toBe(mine);
    await expect(page.getByTestId('waiting-for')).toContainText('Second Giff', { timeout: 30_000 });
    await owner.take('owner-waits-on-second');
    await act(second, { kind: 'endTurn' });

    // -- The owner hands the rest of the round to the AI; round 2 for both ---
    expect(await waitForMoment(page)).toBe('pick');
    const roundBefore = (await view(page)).round;
    await page.getByTestId('pick-row').getByTestId('ai-round').click();
    expect(await waitForMoment(page)).toBe('pick');
    expect((await view(page)).round).toBe(roundBefore + 1);
    await second.waitForFunction(
      (round) => (window.__boomball?.state?.round ?? 0) === round && !window.__boomball?.replaying,
      roundBefore + 1,
      { timeout: 60_000 },
    );
    expect(await waitForMoment(second)).toBe('pick');

    // -- The owner leaves --------------------------------------------------------
    await settingsClick(page, 'leave-match');
    await page.getByTestId('abandon-yes').click();
    await expect(page.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
    await expect(second.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });
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
