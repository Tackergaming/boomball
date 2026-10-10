/**
 * Putting something back on the pitch where there is room for it.
 *
 * Three things drop onto the board mid-match and need a free cell: a Cracker
 * at kick-off or on its return (écart 46), and a substitute coming off the
 * bench (écart 37 bis). All three want the same thing, the free cell nearest
 * to some anchor, and all three used to carry their own copy of the search.
 * One rule, one file, one test.
 *
 * A cell is **taken** when a player stands on it, when the loose ball lies on
 * it, or when a live Cracker sits on it. Nothing is ever placed on the ball,
 * because standing on a loose ball is how it is picked up and a Cracker born
 * on it would make the ball unreachable; nothing is placed on a Cracker,
 * because two charges on one cell were drawn as one in Jérôme's first game.
 *
 * Equidistant candidates are split by the dice rather than by scan order. A
 * fixed order would favour one corner of the ring, which is invisible in a
 * match and poisons a balance sweep.
 */

import type { Arena } from '../arena.js';
import { distance, type Point } from '../geometry.js';
import type { Rng } from '../rng.js';
import { activeUnits, type Cracker, type MatchState, type Payload, type Unit } from '../types.js';

export function cellKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/** The cells nothing may be placed on, read off the pieces as they stand. */
export function takenCells(
  units: readonly Unit[],
  payload: Payload,
  crackers: readonly Cracker[],
): Set<string> {
  const taken = new Set<string>();
  for (const unit of units) if (unit.status === 'active') taken.add(cellKey(unit));
  for (const cracker of crackers) if (cracker.state === 'live') taken.add(cellKey(cracker));
  if (payload.carriedBy === null) taken.add(cellKey(payload));
  return taken;
}

/** `takenCells` on a live board. */
export function takenOn(state: MatchState): Set<string> {
  return takenCells(activeUnits(state), state.payload, state.crackers);
}

/**
 * The free, occupiable cell nearest to `anchor`, the anchor itself when it is
 * free and `minDistance` allows it. `minDistance` is 1 for a Cracker going to
 * its post, which is a pillar and so never a candidate anyway, and 0 for a
 * substitute coming back to the centre, which may take the centre cell.
 *
 * Throws only when the whole pitch is taken, which fourteen players and two
 * Crackers cannot do to 617 open cells.
 */
export function nearestFreeCell(
  arena: Arena,
  taken: ReadonlySet<string>,
  anchor: Point,
  rng: Rng,
  minDistance = 0,
): Point {
  let best: Point[] = [];
  let bestDistance = Infinity;
  for (const cell of arena.occupiableCells()) {
    if (taken.has(cellKey(cell))) continue;
    const d = distance(cell, anchor);
    if (d < minDistance) continue;
    if (d < bestDistance) {
      bestDistance = d;
      best = [cell];
    } else if (d === bestDistance) {
      best.push(cell);
    }
  }
  if (best.length === 0) throw new Error('the arena has no free cell left to place anything on');
  return rng.pick(best);
}
