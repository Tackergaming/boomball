/**
 * The 2.5D board, seen and played (2H.15).
 *
 * Reaches the open match the way the smoke test does, switches the board to
 * 3D with the button a player presses, and then does the two things that
 * prove the scene is the match and not a picture of it: it asks the hook
 * where a reachable cell is on the screen, which in 3D is the camera's own
 * projection, and clicks there with the mouse, so the floor's raycast and the
 * engine's route agree; then it closes the zoom in and captures again. The
 * captures are the deliverable: they are read, not just taken.
 *
 * Since 2H.21 it also captures the living game: each effect fired on purpose
 * through the hook's development trigger (`fx`), the words that rise, the
 * turn banner, and then one round of the house watched at `slow` for a
 * banner and a verdict the dice actually produced.
 *
 *     npm run e2e:board3d
 */

import { expect, test } from '@playwright/test';

import { Shots, act, farthest, report, stamp, state, summary, unitAt, view, waitForArrival, waitForHook, waitForPlayableTurn, watch } from './harness.js';

test('the 2.5D board: scene, a click on the floor, two zooms @board3d', async ({ page }, info) => {
  // The effects and a slow round of the house come on top of the 2.5 minutes
  // the board itself takes under software GL.
  test.setTimeout(540_000);
  const shots = new Shots(page, info, stamp());
  const seen = watch(page);
  const myTurn = () => waitForPlayableTurn(page, (places) => Math.min(2, places), shots);

  // -- To the match, as the smoke does -----------------------------------------
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
  if (await resume.isVisible()) {
    await resume.click();
  } else {
    await toLobby.click();
    await expect(page.getByRole('heading', { name: 'Drop into the silo' })).toBeVisible();
    await page.getByRole('button', { name: 'Start match' }).click();
  }
  await expect(page.getByText('Opening the silo')).toBeHidden({ timeout: 30_000 });
  await waitForHook(page);
  const into = page.getByRole('button', { name: 'Into the silo' });
  if (await into.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await into.click();
  await page.getByRole('button', { name: 'instant', exact: true }).click();

  // -- Into 3D -------------------------------------------------------------------
  await page.getByTestId('view-toggle').click();
  await expect(page.locator('[data-board3d] canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => window.__boomball?.view === '3d');
  // The textures and the Giff model come over the wire, and the camera glides
  // to its first goal: give the scene a moment before it is looked at.
  await page.waitForTimeout(3_000);
  await shots.take('board3d-wide');

  expect(await myTurn()).toBe('turn');
  let at = await view(page);
  if (at.deadline !== null && at.deadline < Date.now()) {
    await act(page, { kind: 'endTurn' });
    expect(await myTurn()).toBe('turn');
    at = await view(page);
  }
  await page.waitForTimeout(800);
  await shots.take('board3d-my-turn');

  // -- A click on the floor, where the camera says the cell is -------------------
  const legal = await summary(page);
  expect(legal.destinations.length).toBeGreaterThan(0);
  const from = await unitAt(page, legal.unitId);
  const to = farthest(legal.destinations);
  const point = await page.evaluate(([x, y]) => window.__boomball!.cellToScreen(x, y), [to.x, to.y] as const);
  const box = await page.locator('[data-board3d]').boundingBox();
  expect(point, 'cellToScreen through the 3D camera').not.toBeNull();
  expect(box).not.toBeNull();
  expect(point!.x).toBeGreaterThan(box!.x);
  expect(point!.x).toBeLessThan(box!.x + box!.width);
  expect(point!.y).toBeGreaterThan(box!.y);
  expect(point!.y).toBeLessThan(box!.y + box!.height);

  await page.mouse.move(point!.x, point!.y);
  await page.waitForTimeout(300);
  await shots.take('board3d-hover-route');
  await page.mouse.click(point!.x, point!.y);
  await waitForArrival(page, legal.unitId, to);
  expect(await unitAt(page, legal.unitId)).not.toEqual(from);
  await page.waitForTimeout(500);
  await shots.take('board3d-moved');

  // -- The close zoom, following the play ----------------------------------------
  await page.getByTestId('zoom-toggle').click();
  await expect(page.locator('[data-board3d][data-zoom="close"]')).toBeVisible();
  await page.waitForTimeout(1_500);
  await shots.take('board3d-close');

  // -- The camera in hand (C18): a right-button drag turns it, the wheel zooms ----
  // The cell the unit walked to is what the close zoom follows, so its screen
  // point must move with the camera, and it must still be found through it.
  const steady = await page.evaluate(([x, y]) => window.__boomball!.cellToScreen(x, y), [to.x, to.y] as const);
  const centre = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(centre.x + 180, centre.y + 50, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(1_000);
  await shots.take('board3d-orbit');
  const turned = await page.evaluate(([x, y]) => window.__boomball!.cellToScreen(x, y), [to.x, to.y] as const);
  expect(turned, 'cellToScreen through the turned camera').not.toBeNull();
  expect(turned, 'the camera turned and zoomed').not.toEqual(steady);
  // Choosing the preset again puts the orbit back.
  await page.getByTestId('zoom-toggle').click();
  await page.getByTestId('zoom-toggle').click();
  await expect(page.locator('[data-board3d][data-zoom="close"]')).toBeVisible();
  await page.waitForTimeout(1_200);
  const back = await page.evaluate(([x, y]) => window.__boomball!.cellToScreen(x, y), [to.x, to.y] as const);
  expect(back).not.toBeNull();
  expect(Math.abs(back!.x - steady!.x) + Math.abs(back!.y - steady!.y), 'the preset frames as before').toBeLessThan(12);

  // -- Letting go of the play (C19): the arrow keys pan, the button comes back --
  await expect(page.locator('[data-board3d][data-camera="following"]')).toBeVisible();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('[data-board3d][data-camera="free"]')).toBeVisible();
  await page.waitForTimeout(800);
  await shots.take('board3d-panned');
  const panned = await page.evaluate(([x, y]) => window.__boomball!.cellToScreen(x, y), [to.x, to.y] as const);
  expect(panned, 'the cell followed slid out of the centre').not.toBeNull();
  expect(Math.abs(panned!.x - back!.x), 'the arrow key moved the camera across').toBeGreaterThan(40);
  await page.getByTestId('follow-play').click();
  await expect(page.locator('[data-board3d][data-camera="following"]')).toBeVisible();
  await page.waitForTimeout(1_200);
  const followed = await page.evaluate(([x, y]) => window.__boomball!.cellToScreen(x, y), [to.x, to.y] as const);
  expect(Math.abs(followed!.x - back!.x) + Math.abs(followed!.y - back!.y), 'back on the play').toBeLessThan(12);

  // -- The living game (2H.21): each effect fired on purpose, and captured ------
  // The hook's development trigger fires a cue on the mounted board exactly as
  // the beat would, so each effect is captured whatever the dice did. The
  // cell is the one the unit walked to, which the close framing follows.
  const fx = (request: Parameters<NonNullable<Window['__boomball']>['fx']>[0]) =>
    page.evaluate((r) => window.__boomball!.fx(r), request);
  // Under software GL the page draws about three frames a second and a
  // screenshot takes longer than a bat's sparks last, so each effect is
  // asked for `STRETCH` times slower and captured part of the way through.
  const STRETCH = 6;
  // On the middle line of the pitch's width, level with the unit the close
  // framing follows: a cell on a touchline would sit at the frame's edge and
  // the words over it above the canvas. The Giff carried off and back is the
  // active unit standing nearest that line, so it is seen whole.
  const mid = { x: 7, y: to.y };
  const board = await state(page);
  const stand = [...board.units]
    .filter((u) => u.status === 'active')
    .sort((a, b) => Math.abs(a.x - 7) + Math.abs(a.y - to.y) / 4 - (Math.abs(b.x - 7) + Math.abs(b.y - to.y) / 4))[0]!;
  const effects: { name: string; request: Parameters<typeof fx>[0]; after: number }[] = [
    { name: 'fx-hit', request: { kind: 'hit', x: mid.x, y: mid.y }, after: 120 },
    { name: 'fx-damage', request: { kind: 'damage', x: stand.x, y: stand.y, text: '\u22127', unitId: stand.id }, after: 350 },
    { name: 'fx-miss', request: { kind: 'miss', x: mid.x, y: mid.y, text: 'miss' }, after: 350 },
    { name: 'fx-push', request: { kind: 'push', x: mid.x, y: mid.y }, after: 150 },
    { name: 'fx-blast', request: { kind: 'blast', x: mid.x, y: mid.y }, after: 250 },
    { name: 'fx-spark-in', request: { kind: 'sparkIn', x: mid.x, y: mid.y }, after: 200 },
    { name: 'fx-spark-caught', request: { kind: 'sparkCaught', x: mid.x, y: mid.y }, after: 120 },
    { name: 'fx-goal', request: { kind: 'goal', x: 7, y: 44, team: 'B' }, after: 350 },
  ];
  for (const effect of effects) {
    expect(await fx({ ...effect.request, stretch: STRETCH }), `${effect.name} found a board`).toBe(true);
    // The word is in the DOM at once; checked before the capture, which under
    // software GL can take longer than the word lives.
    if (effect.request.kind === 'damage' || effect.request.kind === 'miss') {
      await expect(page.locator(`[data-floaters] [data-floater="${effect.request.text}"]`)).toBeAttached();
    }
    await page.waitForTimeout(effect.after * STRETCH);
    await shots.take(effect.name);
    // The next effect takes a slot of its own; what is left of this one may overlap.
    await page.waitForTimeout(1_500);
  }
  // A Giff carried off sinks into the floor; one coming on rises out of it.
  // The unit is active, so it stands again once each transition is over.
  expect(await fx({ kind: 'exit', x: stand.x, y: stand.y, unitId: stand.id, stretch: STRETCH })).toBe(true);
  await page.waitForTimeout(300 * STRETCH);
  await shots.take('fx-exit');
  await page.waitForTimeout(400 * STRETCH);
  expect(await fx({ kind: 'enter', x: stand.x, y: stand.y, unitId: stand.id, stretch: STRETCH })).toBe(true);
  await page.waitForTimeout(250 * STRETCH);
  await shots.take('fx-enter');
  await page.waitForTimeout(450 * STRETCH);

  // -- The house plays, watched close and slow -------------------------------------
  // At `slow` the beats are held, so a banner and a verdict the dice produced
  // can be caught: the round opening is certain within the house's round, a
  // swing nearly so. Back to `instant` once seen, so the rest stays quick.
  await page.getByRole('button', { name: 'slow', exact: true }).click();
  // Not awaited: `act` resolves once the whole reply has been replayed, and
  // the banners live inside that replay.
  const acting = act(page, { kind: 'endTurn' });
  const banner = page.locator('[data-testid="banner"]:is([data-banner="round"], [data-banner="loud"])');
  await banner.first().waitFor({ state: 'visible', timeout: 90_000 });
  await shots.take('banner');
  const verdict = page.locator('[data-testid="beat-card"] [data-verdict]');
  if (await verdict.first().waitFor({ state: 'visible', timeout: 30_000 }).then(() => true, () => false)) {
    await shots.take('beat-card-verdict');
  }
  await page.getByRole('button', { name: 'instant', exact: true }).click();
  await acting;
  // The house's round may have been the match's last: then the results sheet
  // is up, the match screen is gone, and there is nothing left to look at.
  if ((await myTurn()) === 'finished') {
    await shots.take('full-time');
    await info.attach('console-and-network', { body: report(seen), contentType: 'text/plain' });
    expect(seen.errors, 'console errors and page errors').toEqual([]);
    return;
  }
  expect((await view(page)).seq).toBeGreaterThan(at.seq);
  // The turn banner (2H.21) is up for 1.2 s from the moment the clock came
  // back to this player. Checked here and not at the first turn, which a
  // resumed match may have been standing on since before the page loaded.
  // Behind at most the banner that was up when the turn came.
  await expect(page.locator('[data-testid="banner"][data-banner="turn"]')).toBeVisible({ timeout: 6_000 });
  await page.waitForTimeout(300);
  await shots.take('board3d-house-played');
  await expect(page.locator('[data-fresh]').first()).toBeAttached();

  // -- Back to the whole silo, then back to 2D ------------------------------------
  await page.getByTestId('zoom-toggle').click();
  await page.waitForTimeout(1_500);
  await shots.take('board3d-wide-again');
  await page.getByTestId('view-toggle').click();
  await expect(page.locator('[data-board-stage]')).toBeVisible();
  await page.waitForFunction(() => window.__boomball?.view === '2d');

  await info.attach('console-and-network', { body: report(seen), contentType: 'text/plain' });
  expect(seen.errors, 'console errors and page errors').toEqual([]);
  // Two warnings are not ours to silence: fiber 9 still builds a THREE.Clock,
  // which three 0.186 calls deprecated once at start-up, and headless
  // Chromium's software GL reports a performance stall on every screenshot.
  const benign = /^THREE\.Clock: This module has been deprecated|GL Driver Message \(OpenGL, Performance/;
  expect(seen.warnings.filter((w) => !benign.test(w)), 'console warnings').toEqual([]);
  expect(seen.failed, 'failed responses').toEqual([]);
});
