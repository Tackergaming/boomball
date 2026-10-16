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
import { DIRECTIONS, directionFromD8, distance, inBounds, type Point } from '../geometry.js';
import type { Rng } from '../rng.js';
import { lineOfSight } from './sight.js';
import { activeUnitsOf, unitAt, type MatchState, type TeamId, type Unit } from '../types.js';

export type ThrowRange =
  | { readonly ok: true; readonly mode: 'normal' | 'disadvantage'; readonly cells: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Forty-five feet clean, sixty at a penalty, and never further. Distance only:
 * the line of sight a throw also needs (écart 34) is `hasLineOfSight` in
 * `sight.ts`, checked by the caller, because a range reads two points and a
 * sight reads the terrain between them.
 */
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

/** The distance from a cell to the nearest hatch of a Furnace, sight ignored. */
export function rangeToFurnace(from: Point, furnace: Furnace): number {
  return Math.min(...furnace.cells.map((cell) => distance(from, cell)));
}

/**
 * The distance to the nearest hatch cell of a Furnace **that can be seen** from
 * `from`, or null when the whole mouth is hidden behind an obstacle. This is
 * the number a shot is measured on (écart 34).
 *
 * The hatch cells are obstacles in the layout, so the Furnace's own cells are
 * left out of the blocking test: a mouth three cells wide must not hide its
 * centre behind its own edges when a shot comes in from the side.
 */
export function visibleRangeToFurnace(arena: Arena, from: Point, furnace: Furnace): number | null {
  const hatch = new Set(furnace.cells.map((c) => `${c.x},${c.y}`));
  const blocks = (p: Point): boolean => arena.blocksSight(p) && !hatch.has(`${p.x},${p.y}`);

  let best: number | null = null;
  for (const cell of furnace.cells) {
    if (!lineOfSight(blocks, from, cell)) continue;
    const range = distance(from, cell);
    if (best === null || range < best) best = range;
  }
  return best;
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

/**
 * Where a ball its carrier has just lost comes to rest (écart 42): on one of
 * the eight cells around the carrier, rolled on a d8 like a missed pass.
 *
 * On the vertical silo the ball stayed on the carrier's own cell, kept by the
 * arbitrage of 2026-09-01 so that a Shove took the ball without undoing the
 * carrier's climb. On a floor where two players never share a cell that left
 * the ball under the feet of the only player who could pick it up again, which
 * Jérôme's first game found absurd. So it rolls one cell.
 *
 * **The fallback, written here because the d8 alone does not finish the rule.**
 * The rolled cell may be an obstacle, off the pitch, or under another player;
 * the ball is not lost in a crate and it does not land on somebody's boots. From
 * the rolled face, turn one d8 face clockwise at a time (N, NE, E, and so round)
 * and take the first free cell. Only when all eight are taken does the ball
 * stay where it was lost, which no board of fourteen players produces but a
 * rule has to say. The shover's own cell is taken, so a Shove never drops the
 * ball straight into the shover's hands: it still has to step onto it.
 *
 * Pure in `dropLanding` so the eight faces and the fallback are tested without
 * a die; `dropCell` is the same rule with the die rolled and the board read.
 */
export function dropLanding(
  free: (p: Point) => boolean,
  from: Point,
  roll: number,
): { landing: Point; direction: number } {
  for (let turn = 0; turn < DIRECTIONS.length; turn++) {
    const face = DIRECTIONS[(roll - 1 + turn) % DIRECTIONS.length]!;
    const to = { x: from.x + face.x, y: from.y + face.y };
    if (free(to)) return { landing: to, direction: roll };
  }
  return { landing: from, direction: roll };
}

/**
 * Where a missed shot comes to rest (écart 64, 2H.25, Jérôme on 2026-10-16: "la
 * balle ne devrait jamais revenir directement dans les mains de celui qui a
 * tiré"). Until engine 9 the ball scattered from the shooter's own cell, and
 * when the first step was blocked it stayed under the shooter's feet: a miss
 * that handed the ball straight back. The comment said "rebounds off the
 * hatch"; now the code does. From the hatch cell the shot was aimed at, the
 * ball rolls `cells` (a d4) in a direction rolled on a d8, and stops at the
 * last cell it can lie on: open floor with nobody standing on it. When it
 * cannot leave the hatch that way at all (the first cell is the edge, a crate
 * or a player), the eight faces are tried clockwise from the rolled one, as a
 * dropped ball does (écart 42), and the first free cell takes it. The shooter
 * stands on its cell, so the ball never lands there. Null only when every
 * cell around the hatch is taken, which no board of fourteen players
 * produces; the caller then falls back to the old scatter.
 *
 * Pure in `reboundLanding` so the faces and the fallback are tested without a
 * die; `reboundCell` rolls and reads the board.
 */
export function reboundLanding(
  free: (p: Point) => boolean,
  hatch: Point,
  roll: number,
  cells: number,
): { landing: Point; direction: number } | null {
  const step = directionFromD8(roll);
  let landing: Point | null = null;
  for (let i = 0; i < cells; i++) {
    const from: Point = landing ?? hatch;
    const next: Point = { x: from.x + step.x, y: from.y + step.y };
    if (!free(next)) break;
    landing = next;
  }
  if (landing) return { landing, direction: roll };
  const around = dropLanding(free, hatch, roll);
  return around.landing.x === hatch.x && around.landing.y === hatch.y ? null : around;
}

/** `reboundLanding` on a live board, the dice rolled in the order `scatter` rolls them. */
export function reboundCell(
  arena: Arena,
  state: MatchState,
  hatch: Point,
  rng: Rng,
): { landing: Point; cells: number; direction: number } | null {
  const cells = rng.die(SCATTER_DIE);
  const roll = rng.die(8);
  const free = (p: Point): boolean => inBounds(p) && arena.isOccupiable(p) && !unitAt(state, p.x, p.y);
  const landed = reboundLanding(free, hatch, roll, cells);
  return landed ? { ...landed, cells } : null;
}

/** The hatch cell of `furnace` nearest to `from`: the one a shot from there is aimed at. */
export function nearestHatch(furnace: Furnace, from: Point): Point {
  let best = furnace.cells[0]!;
  for (const cell of furnace.cells) if (distance(from, cell) < distance(from, best)) best = cell;
  return best;
}

/** `dropLanding` on a live board: a cell is free when it is open floor with nobody standing on it. */
export function dropCell(
  arena: Arena,
  state: MatchState,
  from: Point,
  rng: Rng,
): { landing: Point; direction: number } {
  const roll = rng.die(8);
  const free = (p: Point): boolean => arena.isOccupiable(p) && !unitAt(state, p.x, p.y);
  return dropLanding(free, from, roll);
}
