/**
 * Plays the e2e account's match to the final whistle, through the screen.
 *
 * Tagged `@playthrough` and left out of `npm run e2e`: it is a tool, not a
 * check. `npm run e2e:playthrough` runs it. It exists to close a match the
 * smoke test leaves open, and to put a finished match in front of the results
 * screen on demand.
 *
 * The human seat is driven by `chooseAction`, the same brain the house uses
 * and the one `scripts/live-match.ts` plays with. Every action still goes
 * through the hook, so what is exercised is the client, not a shortcut.
 */

import { expect, test } from '@playwright/test';

import { chooseAction } from '../ai/chooseAction.js';
import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { Shots, act, report, roundMarkers, stamp, state, view, waitForHook, waitForPlayableTurn, watch, prefer2D } from './harness.js';

const arena = new Arena(KILL_SILO);

test('@playthrough plays the open match to the final whistle', async ({ page }, info) => {
  test.setTimeout(25 * 60_000);
  const shots = new Shots(page, info, `${stamp()}-playthrough`);
  const seen = watch(page);

  await prefer2D(page);
  await page.goto('/');
  const toLobby = page.getByRole('button', { name: 'Enter the lobby' });
  const resume = page.getByRole('button', { name: 'Back to the silo' });
  // `.first()`: both buttons are on the hub while a match runs, one of them disabled.
  await expect(resume.or(toLobby).first()).toBeVisible({ timeout: 30_000 });

  if (await resume.isVisible()) {
    await resume.click();
  } else {
    await toLobby.click();
    await page.getByRole('button', { name: 'Start match' }).click();
  }

  await expect(page.getByText('Opening the silo')).toBeHidden({ timeout: 30_000 });
  await waitForHook(page);
  const into = page.getByRole('button', { name: 'Into the silo' });
  if (await into.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
    await into.click();
  }
  await page.getByRole('button', { name: 'instant', exact: true }).click();

  let turns = 0;
  let refusals = 0;
  for (let i = 0; i < 200; i++) {
    // Écart 58 (2H.12): the place prompt is answered on screen, a different
    // place each round, so every place is played across a match.
    if ((await waitForPlayableTurn(page, (places, round) => ((round - 1) % places) + 1, shots, 120_000)) === 'finished') break;

    const board = await state(page);
    if (!board.turn) throw new Error('no turn is open and the match is not finished');
    const action = chooseAction(arena, board, board.turn.unitId);
    const before = await view(page);

    await act(page, action);
    turns += 1;

    // The last action of a match unmounts the screen: `App` swaps in the
    // results sheet the moment the phase reads finished, and the hook goes
    // with it. Nothing is left to read, the whistle check below takes over.
    if (!(await page.evaluate(() => !!window.__boomball))) break;

    const after = await view(page);
    if (after.refusal) {
      refusals += 1;
      console.log(`refused: ${after.refusal} on ${JSON.stringify(action)}`);
      await page.evaluate(() => window.__boomball?.dismissBeat());
      if (refusals > 5) throw new Error('too many refusals, the brain and the server disagree');
      continue;
    }
    if (after.seq === before.seq && action.kind !== 'endTurn') {
      // The board did not move. The next read will say why, or the match is
      // simply over and the hook is about to go.
      continue;
    }
    if (turns % 5 === 0) await shots.take(`round-${after.round}-turn-${turns}`);
  }

  await expect(page.getByText('full time')).toBeVisible({ timeout: 60_000 });
  await shots.take('results');
  console.log(`played ${turns} human requests, ${refusals} refused`);

  // Audit line A9: no round marker twice in the feed (the results sheet may have taken the screen).
  if (await page.getByText('The call', { exact: true }).count()) {
    for (const [round, count] of Object.entries(await roundMarkers(page))) {
      expect(count, `round ${round} marker appears once in the feed`).toBe(1);
    }
  }

  await info.attach('console-and-network', { body: report(seen), contentType: 'text/plain' });
  expect(seen.errors, 'page errors and console errors').toEqual([]);
});
