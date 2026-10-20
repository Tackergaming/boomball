/**
 * The whole team, played by one human (2H.41, `00` C41, écart 66).
 *
 * Tagged `@whole` and left out of `npm run e2e`: it abandons the e2e account's
 * running match to reach the lobby, ticks "We play the whole team", and
 * abandons the match it opens at the end, so the solo specs find a clean
 * team. `npm run e2e:whole` runs it. It needs the functions deployed at
 * engine 12: on engine 11 `create-match` ignores `wholeTeam` and the spec
 * fails on the first pick, which is the right thing for it to do.
 *
 * One round, as a player plays it: the first pick from the row's button, the
 * turn ended by hand; the second pick from "Take the turn" beside the Giff on
 * the board, then "Let the AI play"; the third pick from the row, then "Let
 * the AI finish the round", which carries the match to round 2's first pick.
 * Then the switch in the gear, and the leave.
 */

import { expect, test } from '@playwright/test';

import { Shots, act, closeSettings, openSettings, pickFromRow, prefer2D, report, settingsClick, setReplay, stamp, state, view, waitForHook, waitForMoment, watch } from './harness.js';

test('@whole one human picks the order of the whole team for a round', async ({ page }, info) => {
  test.setTimeout(5 * 60_000);
  const shots = new Shots(page, info, `${stamp()}-whole`);
  const seen = watch(page);

  // -- The lobby, the box ticked, the start ----------------------------------
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
  const box = page.getByTestId('whole-team');
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(box).toBeChecked();
  await shots.take('lobby-whole-team');
  await page.getByRole('button', { name: 'Start match' }).click();

  // -- The match opens on a pick ---------------------------------------------
  await expect(page.getByText('Opening the silo')).toBeHidden({ timeout: 30_000 });
  await waitForHook(page);
  const into = page.getByRole('button', { name: 'Into the silo' });
  const briefed = await into.waitFor({ state: 'visible', timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  if (briefed) await into.click();
  await setReplay(page, 'instant');

  expect(await waitForMoment(page)).toBe('pick');
  let at = await view(page);
  expect(at.picking).toBe(true);
  expect(at.pickable).toHaveLength(7);
  const board = await state(page);
  expect(board.teamMode.A).toBe('whole');
  expect(board.turn).toBeNull();
  // The screen of the pick: the row, one button per Giff; the rings on the
  // board; the clock corner; the block in the strip.
  const row = page.getByTestId('pick-row');
  await expect(row).toBeVisible();
  await expect(row.getByTestId('pick-unit')).toHaveCount(7);
  await expect(row.getByTestId('ai-round')).toBeVisible();
  await expect(page.locator('[data-unit][data-pickable="true"]')).toHaveCount(7);
  await expect(page.getByTestId('clock-pick')).toBeVisible();
  await expect(page.getByTestId('turn-block')).toBeVisible();
  await expect(page.getByTestId('turn-block').locator('[data-chip-state="to-play"]')).toHaveCount(7);
  await shots.take('pick-row');

  // -- Pick 1, from the row: the keeper, last in role order, first to play --
  const keeper = at.pickable[6]!;
  expect(board.units.find((u) => u.id === keeper)?.role).toBe('bulwark');
  await pickFromRow(page, keeper);
  expect(await waitForMoment(page)).toBe('turn');
  at = await view(page);
  expect(at.turnUnitId).toBe(keeper);
  expect(at.yours).toBe(true);
  await expect(page.getByTestId('action-row')).toBeVisible();
  await expect(page.getByTestId('ai-play')).toBeVisible();
  await expect(page.getByTestId('ai-round')).toBeVisible();
  await expect(page.getByTestId('turn-block').locator('[data-chip-state="current"]')).toHaveCount(1);
  await shots.take('picked-turn-ai-buttons');
  await act(page, { kind: 'endTurn' });

  // -- Pick 2, from "Take the turn" beside a Giff, then "Let the AI play" ----
  expect(await waitForMoment(page)).toBe('pick');
  at = await view(page);
  expect(at.pickable).toHaveLength(6);
  expect(at.pickable).not.toContain(keeper);
  await expect(page.locator(`[data-unit="${keeper}"][data-played="true"]`)).toHaveCount(1);
  await expect(page.getByTestId('turn-block').locator('[data-chip-state="played"]')).toHaveCount(1);
  const second = at.pickable[0]!;
  await page.locator(`[data-unit="${second}"]`).hover();
  const take = page.locator('[data-tag="take"]');
  await expect(take).toBeVisible();
  await shots.take('take-the-turn');
  const seqBefore = at.seq;
  await take.click();
  await page.waitForFunction((before) => (window.__boomball?.seq ?? before) !== before, seqBefore, { timeout: 30_000 });
  expect(await waitForMoment(page)).toBe('turn');
  at = await view(page);
  expect(at.turnUnitId).toBe(second);
  await page.getByTestId('ai-play').click();

  // -- Pick 3, from the row, then "Let the AI finish the round" --------------
  expect(await waitForMoment(page)).toBe('pick');
  at = await view(page);
  expect(at.pickable).toHaveLength(5);
  const roundBefore = at.round;
  await pickFromRow(page, at.pickable[0]!);
  expect(await waitForMoment(page)).toBe('turn');
  await page.getByTestId('ai-round').click();
  // The AI plays the rest of the side, the house plays, round 2 opens on a pick.
  expect(await waitForMoment(page)).toBe('pick');
  at = await view(page);
  expect(at.round).toBe(roundBefore + 1);
  expect(at.pickable).toHaveLength(7);
  await shots.take('round-two-pick');

  // -- The switch in the gear: the owner's, for the next round ---------------
  const panel = await openSettings(page);
  await expect(panel.getByTestId('team-whole')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByTestId('team-seat')).toBeEnabled();
  const seqSwitch = (await view(page)).seq;
  await panel.getByTestId('team-seat').click();
  await page.waitForFunction((before) => (window.__boomball?.seq ?? before) !== before, seqSwitch, { timeout: 30_000 });
  await expect(panel.getByTestId('team-mode-note')).toContainText('My Giff only from next round');
  await shots.take('settings-switch');
  await closeSettings(page);
  const asked = await state(page);
  expect(asked.requestedMode.A).toBe('seat');
  expect(asked.teamMode.A).toBe('whole');
  // The pick is still on: the round in progress finishes as it began.
  expect((await view(page)).picking).toBe(true);

  // -- Leave ------------------------------------------------------------------
  await settingsClick(page, 'leave-match');
  await page.getByTestId('abandon-yes').click();
  await expect(page.getByRole('heading', { name: 'E2E Battery' })).toBeVisible({ timeout: 30_000 });

  await info.attach('console-and-network', { body: report(seen), contentType: 'text/plain' });
  expect(seen.errors, 'page errors and console errors').toEqual([]);
  expect(seen.warnings, 'console warnings').toEqual([]);
  expect(seen.failed, 'responses of 400 and above').toEqual([]);
});
