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
 *     npm run e2e:board3d
 */

import { expect, test } from '@playwright/test';

import { Shots, act, farthest, report, stamp, summary, unitAt, view, waitForArrival, waitForHook, waitForPlayableTurn, watch } from './harness.js';

test('the 2.5D board: scene, a click on the floor, two zooms @board3d', async ({ page }, info) => {
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

  // -- The house plays, watched close ---------------------------------------------
  await act(page, { kind: 'endTurn' });
  expect(await myTurn()).toBe('turn');
  expect((await view(page)).seq).toBeGreaterThan(at.seq);
  await page.waitForTimeout(800);
  await shots.take('board3d-house-played');

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
