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
  boardOf,
  farthest,
  firstChangedBoard,
  glideSeen,
  judgeSend,
  report,
  roundMarkers,
  stamp,
  startSendWatch,
  state,
  stopSendWatch,
  summary,
  unitAt,
  view,
  waitForArrival,
  waitForHook,
  waitForPlayableTurn,
  watch,
prefer2D } from './harness.js';

test('sign in, hub, lobby, a match, three turns', async ({ page }, info) => {
  const shots = new Shots(page, info, stamp());
  // Écart 58 (2H.12): a human Striker is asked its place in its role every
  // round. The smoke answers on screen, first place, then the close button
  // (last, the default), then second, so all three paths are clicked.
  const picks: (number | 'close')[] = [1, 'close', 2];
  let asked = 0;
  const myTurn = () =>
    waitForPlayableTurn(page, (places) => {
      const pick = picks[asked++ % picks.length]!;
      return pick === 'close' ? pick : Math.min(pick, places);
    }, shots);
  const seen = watch(page);

  // -- Hub ------------------------------------------------------------------

  await prefer2D(page);
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
    // The league (2H.27, `00` C28): three buttons, exactly one selected, and
    // it is the battery's own Tier; every league above it is locked. The
    // battery's Tier is read off the header line, which names it first.
    const leagues = page.locator('[data-league]');
    await expect(leagues).toHaveCount(3);
    await expect(page.locator('[data-league][data-selected="true"]')).toHaveCount(1);
    const tierLine = await page.getByTestId('lobby-tier-line').innerText();
    const reached = tierLine.split(' ')[0]!.toLowerCase();
    await expect(page.locator(`[data-league="${reached}"]`)).toHaveAttribute('data-selected', 'true');
    await expect(page.locator(`[data-league="${reached}"]`)).toHaveAttribute('data-locked', 'false');
    for (const locked of await page.locator('[data-league][data-locked="true"]').all()) {
      await expect(locked).toBeDisabled();
    }
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
  expect(await myTurn()).toBe('turn');
  await shots.take('match-open');

  // A resumed match can carry a deadline long gone: the server spends that turn
  // in Dodge on the next request and says `expired`. One request clears it.
  let at = await view(page);
  if (at.deadline !== null && at.deadline < Date.now()) {
    await act(page, { kind: 'endTurn' });
    expect(await myTurn()).toBe('turn');
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
  expect(await myTurn()).toBe('turn');
  const afterOne = await view(page);
  expect(afterOne.seq).toBeGreaterThan(at.seq);
  await shots.take('turn-1-house-played');

  // -- Turn 2: a click on a pawn, then an action and the end of turn --------

  await page.evaluate(() => window.__boomball!.dismissBeat());

  // A pawn is clickable since 2H.7: a target of a Swing, Shove or Pass gets a
  // tray of those options under the bar, any other pawn is merely selected
  // and its sheet shows. Prefer a target when the board offers one, otherwise
  // the first opposing pawn, then put the selection back on our own Giff.
  const legalTwo = await summary(page);
  const boardTwo = await state(page);
  const me = boardTwo.units.find((u) => u.id === legalTwo.unitId)!;
  const targetId = legalTwo.attack[0] ?? legalTwo.shove[0] ?? legalTwo.pass[0] ?? null;
  const pawnId = targetId ?? boardTwo.units.find((u) => u.team !== me.team && u.hp > 0)!.id;
  const pawn = boardTwo.units.find((u) => u.id === pawnId)!;
  await page.locator(`[data-unit="${pawnId}"]`).click();
  await expect(page.getByText(pawn.name, { exact: true }).first()).toBeVisible();
  if (targetId) {
    // An adjacent opponent is both a Swing and a Shove, so the tray holds two
    // buttons: first seen at the harness on 2026-10-11, once the house pressed
    // Giff at round 2 (2H.9), and the bare locator tripped on the pair.
    await expect(page.getByRole('button', { name: /^(Swing at|Shove|Pass to) / }).first()).toBeVisible();
  }
  await shots.take(targetId ? 'pawn-clicked-target' : 'pawn-clicked');
  await page.locator(`[data-unit="${me.id}"]`).click();

  await page.getByRole('button', { name: 'Dodge', exact: true }).click();
  await page.waitForFunction(
    () => window.__boomball?.state?.turn?.actionUsed === true && !window.__boomball.busy,
    null,
    { timeout: 30_000 },
  );
  await shots.take('turn-2-dodged');

  // A Dodge with no movement left empties the turn, and an empty turn passes
  // itself on after a beat (`Match.tsx`): the button may already be gone,
  // and the next round's place popup up in its stead. Click it if it is
  // still there; either way the turn ends.
  const endTwo = page.getByRole('button', { name: 'End turn', exact: true });
  if (await endTwo.isVisible({ timeout: 2_000 }).catch(() => false)) await endTwo.click();
  expect(await myTurn()).toBe('turn');
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
  // The Dash held (2H.30, `00` C31 point 3): pressing Dash sends nothing and
  // the board offers the cells the Dash's feet reach on top of the plain
  // ones; a second press takes them back; and a click on a cell past the
  // plain feet sends the Dash and the walk as two requests. The plain cells
  // are the hook's (the server's board), the held ones are the rects.
  const cellsOn = async () =>
    new Set(await page.locator('[data-cell]').evaluateAll((rects) => rects.map((r) => r.getAttribute('data-cell'))));
  const plain = await cellsOn();
  const dash = page.getByTestId('dash');
  await dash.click();
  await expect(page.getByTestId('feet-left')).toHaveAttribute('data-dash-held', 'yes');
  await expect(page.getByTestId('feet-left')).toContainText('Dash held');
  await expect(dash).toHaveAttribute('data-on', 'yes');
  const held = await cellsOn();
  const beyond = [...held].filter((cell) => !plain.has(cell));
  expect(beyond.length, 'cells only the held Dash reaches').toBeGreaterThan(0);
  await shots.take('turn-3-dash-held');
  await dash.click();
  await expect(page.getByTestId('feet-left')).toHaveAttribute('data-dash-held', 'no');
  expect((await cellsOn()).size).toBe(plain.size);
  expect(await page.evaluate(() => window.__boomball!.state!.turn!.actionUsed)).toBe(false);
  // Held again, and spent by a walk only the Dash reaches: the first such
  // cell, the nearest in the sweep's order, so feet are left and the turn
  // stays open for the "End turn" the glide below is watched on (a walk to
  // the farthest cell emptied the turn, which passed itself on).
  await dash.click();
  const [bx, by] = beyond[0]!.split(',').map(Number) as [number, number];
  await page.locator(`[data-cell="${bx},${by}"]`).click();
  await waitForArrival(page, legal3.unitId, { x: bx, y: by });
  expect(await page.evaluate(() => window.__boomball!.state!.turn!.actionUsed)).toBe(true);
  // The bar may already read "The house is playing": a walk that spent every
  // foot and the Action empties the turn, which passes itself on after a beat.
  await shots.take('turn-3-moved');

  // -- Turn 3, the house's reply at slow: the pieces glide (2H.5) -----------
  //
  // An animation is judged on two captures at different instants of the same
  // beat. The replay is switched to slow, the turn is ended, and the tokens'
  // screen boxes are sampled every tenth of a second until one of them has
  // moved between two samples: that is a glide, not a jump. Both instants are
  // captured for a human, or Claude, to read.
  //
  // The same click is watched for audit line "retour 1 de 2H.5": between the
  // click and the first beat, the board and `seq` must still be the ones the
  // player was looking at. The sampler runs in the page, the captures here.
  await page.getByRole('button', { name: 'slow', exact: true }).click();
  const seqBeforeSend = (await view(page)).seq;
  const boardBeforeSend = await boardOf(page);
  await startSendWatch(page);
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  await firstChangedBoard(page, boardBeforeSend);
  await shots.take('first-board-after-send');
  await page.waitForFunction(() => window.__boomball?.replaying === true, null, { timeout: 30_000 });
  const glide = await glideSeen(page, shots);
  expect(glide.moved, 'at least one token moved between two samples during the replay').toBe(true);
  // A glide is a token between two cells: at some sample its box is not on
  // the cell grid the instant layout would have put it on.
  expect(glide.largestShift).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'instant', exact: true }).click();
  await page.evaluate(() => window.__boomball?.skipReplay());

  expect(await myTurn()).toBe('turn');
  const samplesOfSend = await stopSendWatch(page);
  const boardAfterSend = await boardOf(page);
  await shots.take('final-board');
  const verdict = judgeSend(samplesOfSend, seqBeforeSend, boardBeforeSend, boardAfterSend);
  expect(verdict.seqJump, 'seq stays put until the replay starts').toBeNull();
  expect(verdict.firstBoard, 'the first board after the send is a beat, not the final board').toBeNull();
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
