/**
 * The smoke test: the path a player takes, played by a script, with captures.
 *
 * Sign in is done by `global-setup.ts`. From there: the hub, the lobby or the
 * running match, the briefing, replay set to instant, then three turns: a move
 * through the hook, an action and an end of turn through the real buttons, and
 * a move by clicking the cell on the board itself. Each step leaves a capture
 * in `out/<run>/` for a human, or Claude, to read.
 *
 * The console and the network are watched the whole way. The test fails on any
 * page error, any React warning, and any response of 400 or above: the 401 at
 * load and the two style warnings found on 2026-10-09 are what this guards.
 */

import { expect, test } from '@playwright/test';

import {
  Shots,
  act,
  farthest,
  report,
  roundMarkers,
  stamp,
  summary,
  unitAt,
  view,
  waitForArrival,
  waitForHook,
  waitForMyTurn,
  watch,
} from './harness.js';

test('sign in, hub, lobby, a match, three turns', async ({ page }, info) => {
  const shots = new Shots(page, info, stamp());
  const seen = watch(page);

  // -- Hub ------------------------------------------------------------------

  await page.goto('/');
  const raise = page.getByRole('heading', { name: 'Raise a battery' });
  const toLobby = page.getByRole('button', { name: 'To the lobby' });
  const resume = page.getByRole('button', { name: 'Back to the silo' });
  await expect(raise.or(toLobby).first()).toBeVisible({ timeout: 30_000 });

  if (await raise.isVisible()) {
    await page.getByLabel('Battery name').fill('E2E Battery');
    await page.getByRole('button', { name: 'Raise it' }).click();
    await expect(toLobby).toBeVisible({ timeout: 30_000 });
  }
  await expect(page.getByRole('heading', { name: 'E2E Battery' })).toBeVisible();
  await shots.take('hub');

  // -- Lobby, or straight back into the running match -----------------------

  if (await resume.isVisible()) {
    await resume.click();
  } else {
    await toLobby.click();
    await expect(page.getByRole('heading', { name: 'Drop into the silo' })).toBeVisible();
    await shots.take('lobby');
    await page.getByRole('button', { name: 'Start match' }).click();
  }

  // -- Match ----------------------------------------------------------------

  await expect(page.getByText('Opening the silo')).toBeHidden({ timeout: 30_000 });
  await waitForHook(page);

  const into = page.getByRole('button', { name: 'Into the silo' });
  const briefed = await into.waitFor({ state: 'visible', timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  if (briefed) {
    await shots.take('briefing');
    await into.click();
  }

  await page.getByRole('button', { name: 'instant', exact: true }).click();
  expect(await waitForMyTurn(page)).toBe('turn');
  await shots.take('match-open');

  // A resumed match can carry a deadline long gone: the server spends that turn
  // in Dodge on the next request and says `expired`. One request clears it.
  let at = await view(page);
  if (at.deadline !== null && at.deadline < Date.now()) {
    await act(page, { kind: 'endTurn' });
    expect(await waitForMyTurn(page)).toBe('turn');
    await shots.take('after-expired-turn');
    at = await view(page);
  }

  // -- Turn 1: a move, through the hook -------------------------------------

  const legal1 = await summary(page);
  expect(legal1.destinations.length).toBeGreaterThan(0);
  const from1 = await unitAt(page, legal1.unitId);
  const to1 = farthest(legal1.destinations);
  expect(
    await page.evaluate(([x, y]) => window.__boomball!.clickCell(x, y), [to1.x, to1.y] as const),
  ).toBe(true);
  await waitForArrival(page, legal1.unitId, to1);
  expect(await unitAt(page, legal1.unitId)).not.toEqual(from1);
  await shots.take('turn-1-moved');

  await act(page, { kind: 'endTurn' });
  expect(await waitForMyTurn(page)).toBe('turn');
  const afterOne = await view(page);
  expect(afterOne.seq).toBeGreaterThan(at.seq);
  await shots.take('turn-1-house-played');

  // -- Turn 2: an action and the end of turn, through the real buttons -------

  await page.evaluate(() => window.__boomball!.dismissBeat());
  await page.getByRole('button', { name: 'Dodge', exact: true }).click();
  await page.waitForFunction(
    () => window.__boomball?.state?.turn?.actionUsed === true && !window.__boomball.busy,
    null,
    { timeout: 30_000 },
  );
  await shots.take('turn-2-dodged');

  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  expect(await waitForMyTurn(page)).toBe('turn');
  const afterTwo = await view(page);
  expect(afterTwo.seq).toBeGreaterThan(afterOne.seq);
  await shots.take('turn-2-house-played');

  // -- Turn 3: a move by clicking the cell on the board ----------------------

  await page.evaluate(() => window.__boomball!.dismissBeat());
  const legal3 = await summary(page);
  const to3 = farthest(legal3.destinations);
  // The hook and the board must agree on the geometry: a reachable cell's
  // screen point lies inside the stage's bounding box.
  const point = await page.evaluate(([x, y]) => window.__boomball!.cellToScreen(x, y), [to3.x, to3.y] as const);
  const box = await page.locator('[data-board-stage]').boundingBox();
  expect(point, 'cellToScreen on a reachable cell').not.toBeNull();
  expect(box, 'the board stage is on screen').not.toBeNull();
  expect(point!.x).toBeGreaterThanOrEqual(box!.x);
  expect(point!.x).toBeLessThanOrEqual(box!.x + box!.width);
  expect(point!.y).toBeGreaterThanOrEqual(box!.y);
  expect(point!.y).toBeLessThanOrEqual(box!.y + box!.height);
  await page.locator(`[data-cell="${to3.x},${to3.y}"]`).click();
  await waitForArrival(page, legal3.unitId, to3);
  await shots.take('turn-3-moved');

  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  expect(await waitForMyTurn(page)).toBe('turn');
  const afterThree = await view(page);
  expect(afterThree.seq).toBeGreaterThan(afterTwo.seq);
  await shots.take('turn-3-house-played');

  // -- A9: no round marker twice in the feed --------------------------------

  const markers = await roundMarkers(page);
  expect(Object.keys(markers).length, 'the feed shows at least one round marker').toBeGreaterThan(0);
  for (const [round, count] of Object.entries(markers)) {
    expect(count, `the marker "— Round ${round} —" appears once in the feed`).toBe(1);
  }

  // -- What the console and the network said --------------------------------

  await info.attach('console-and-network', { body: report(seen), contentType: 'text/plain' });
  expect(seen.errors, 'page errors and console errors').toEqual([]);
  expect(seen.warnings, 'console warnings').toEqual([]);
  expect(seen.failed, 'responses of 400 and above').toEqual([]);
});
