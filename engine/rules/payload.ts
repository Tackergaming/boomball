/**
 * The ball.
 *
 * Passing and shooting are the same throw with a different target number, so
 * they share their range rule here. The one piece of real design in this file
 * is the Bulwark's block.
 *
 * The table fiche says a blocked shot resolves against the Bulwark's AC. At
 * Tier 3 that is AC 25 against a Furnace's 18, with the best Striker at +4:
 * scoring would need a 21 on a d20, which is to say never. Arbitrage 2 keeps
 * the number and makes the block a **Reaction, once a round**. The first shot
 * of the round draws it, the second one goes in. The counter to a great
 * goalkeeper stops being a better die roll and becomes a second shooter.
 */

import type { Arena, Furnace } from '../arena.js';
import {
  BULWARK_BLOCK_BONUS,
  BULWARK_BLOCK_RANGE_CELLS,
  FURNACE_AC,
  PAYLOAD_LONG_RANGE_CELLS,
  PAYLOAD_RANGE_CELLS,
  SCATTER_DIE,
} from '../constants.js';
import { directionFromD8, distance, inBounds, type Point } from '../geometry.js';
import type { Rng } from '../rng.js';
import { activeUnitsOf, type MatchState, type TeamId, type Unit } from '../types.js';

export type ThrowRange =
  | { readonly ok: true; readonly mode: 'normal' | 'disadvantage'; readonly cells: number }
  | { readonly ok: false; readonly reason: string };

/** Thirty feet clean, sixty at a penalty, and never further. */
export function throwRange(from: Point, to: Point): ThrowRange {
  return throwRangeOver(distance(from, to));
}

/** The same rule stated in cells, for a throw at a Furnace rather than a player. */
export function throwRangeOver(cells: number): ThrowRange {
  if (cells === 0) return { ok: false, reason: 'the throw needs somewhere to go' };
  if (cells <= PAYLOAD_RANGE_CELLS) return { ok: true, mode: 'normal', cells };
  if (cells <= PAYLOAD_LONG_RANGE_CELLS) return { ok: true, mode: 'disadvantage', cells };
  return {
    ok: false,
    reason: `${cells * 5} feet is beyond the ${PAYLOAD_LONG_RANGE_CELLS * 5} foot limit`,
  };
}

/** The distance from a cell to the nearest hatch of a Furnace. */
export function rangeToFurnace(from: Point, furnace: Furnace): number {
  return Math.min(...furnace.cells.map((cell) => distance(from, cell)));
}

/**
 * The goalkeeper who interposes, if there is one. It must be the Furnace's own
 * defender, still on the field, still holding its Reaction, and close enough to
 * throw itself across.
 *
 * Interposing is always the right play, since every Bulwark's AC beats the
 * Furnace's 18, so the engine takes it automatically rather than asking. That
 * spares the MVP a whole reaction-prompt system for a decision with one answer.
 */
export function blockingBulwark(
  state: MatchState,
  furnace: Furnace,
  defender: TeamId,
): Unit | null {
  const bulwark = activeUnitsOf(state, defender).find((u) => u.role === 'bulwark');
  if (!bulwark || !bulwark.reactionAvailable) return null;
  return rangeToFurnace(bulwark, furnace) <= BULWARK_BLOCK_RANGE_CELLS ? bulwark : null;
}

/**
 * What a shot at the Furnace is thrown against: the hatch, plus whatever the
 * goalkeeper's Reaction is worth if one is interposing. Lives here so the
 * engine and the action generator cannot drift on the one number a player reads
 * before committing the ball.
 */
export function shotTarget(keeper: Unit | null): number {
  return FURNACE_AC + (keeper ? BULWARK_BLOCK_BONUS[keeper.tier] : 0);
}

/**
 * Where a missed pass ends up: 1d4 cells in a direction rolled on a d8. It
 * stops at the last cell it can legally occupy rather than vanishing into a
 * girder, so a fumbled ball is always somewhere a player can go and fetch it.
 */
export function scatter(arena: Arena, from: Point, rng: Rng): { landing: Point; cells: number; direction: number } {
  const cells = rng.die(SCATTER_DIE);
  const roll = rng.die(8);
  const step = directionFromD8(roll);

  let landing = from;
  for (let i = 0; i < cells; i++) {
    const next = { x: landing.x + step.x, y: landing.y + step.y };
    if (!inBounds(next) || arena.isSolid(next)) break;
    landing = next;
  }

  return { landing, cells, direction: roll };
}
