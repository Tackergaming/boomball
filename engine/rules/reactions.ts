/**
 * Reactions: what a player does on somebody else's turn.
 *
 * Three exist. The Bulwark's block lives in `payload.ts` because it belongs to
 * the shot it answers. The other two are here: the opportunity attack, and
 * snatching a pass out of the air.
 *
 * **They are taken automatically, and that is a deliberate MVP decision.**
 * Asking a player mid-way through someone else's turn means a suspended turn, a
 * second clock and a modal, in a game whose dimensioning mode is one human
 * against thirteen AI units. So the engine decides, under a policy stated here
 * rather than buried in a handler:
 *
 *   - A pass crossing a defended lane is **always** contested. Taking the ball
 *     off an opponent is worth more than any use the Reaction has later.
 *   - An opportunity attack is **always** taken (écart 33). The vertical silo
 *     held it back when the bat's recoil would have cost the swinger its grip;
 *     there is no grip to lose on a floor, so there is nothing to weigh.
 *   - The goalkeeper never chases a pass. Its Reaction is worth ten points at
 *     its own Furnace, and without that exception a pass across the goalmouth
 *     would be the cheapest way to strip the block before shooting.
 *
 * This file works out **who may react**. It rolls no dice and changes no state:
 * `reduce` does that.
 */

import type { Arena } from '../arena.js';
import { BULWARK_BLOCK_RANGE_CELLS } from '../constants.js';
import { distance, type Point } from '../geometry.js';
import { rangeToFurnace } from './payload.js';
import { activeUnits, type MatchState, type Unit } from '../types.js';

/**
 * The opponents whose reach `mover` leaves by stepping from one cell to the
 * next. Entering a reach costs nothing; only walking out of one does.
 *
 * Ordered by unit id, which is safe here in a way it is not for the Crackers:
 * every candidate is on the same team, so a stable order carries no bias.
 */
export function opportunityAttackers(
  state: MatchState,
  mover: Unit,
  from: Point,
  to: Point,
): Unit[] {
  return activeUnits(state)
    .filter((u) => u.team !== mover.team && u.reactionAvailable)
    .filter((u) => distance(u, from) === 1 && distance(u, to) > 1)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Every opponent a whole route would provoke, for an interface that wants to
 * warn before the player commits and for an AI that wants to price a detour.
 *
 * A preview, not a resolution: it reads the board as it stands, so it cannot
 * know that the first swing will shove its own attacker out of the next one.
 */
export function provokedAlong(state: MatchState, mover: Unit, path: readonly Point[]): Unit[] {
  const found: Unit[] = [];
  const seen = new Set<string>();
  let from: Point = { x: mover.x, y: mover.y };

  for (const step of path) {
    for (const watcher of opportunityAttackers(state, mover, from, step)) {
      if (seen.has(watcher.id)) continue;
      seen.add(watcher.id);
      found.push(watcher);
    }
    from = step;
  }

  return found;
}

/**
 * The opponents in position to snatch a pass, in the order the ball reaches
 * them. The fiche says a pass crossing an adjacent cell can be stolen; a player
 * the ball flies straight through is read as covered by the same rule, since
 * being on the line is not less of an opportunity than being beside it.
 *
 * Écart 34 puts a line of sight on the interception too. Between two adjacent
 * cells nothing can stand, so for a defender beside the flight it is always
 * clear and the rule bites on the flight itself: the pass needs a line of sight
 * to be thrown at all (`reduce` and `legalActions` check it), and a cell of the
 * flight that is an obstacle is not a cell the ball passes through. `lineTo`
 * walks Chebyshev steps and may clip the corner of a crate the real line
 * misses, so those cells are skipped rather than counted.
 *
 * Écart 48 (2026-10-10): the first cell of the flight does not count. A pass
 * that has just left the hands cannot be snatched by a neighbour of the
 * thrower, which in play read as a theft of a ball nobody had yet seen fly. An
 * opponent has to be on the trajectory, or within one cell of it, counting from
 * the second cell onward. A pass to an adjacent team-mate, a flight of one
 * cell, can therefore never be intercepted. A defender standing on or beside
 * the first cell still counts when he is also within one cell of the second,
 * because that follows from the rule as written and not from a special case.
 *
 * Each of them gets one attempt, and the first to win it takes the ball, which
 * is what makes a long throw across the middle third a real gamble.
 */
export function passInterceptors(
  arena: Arena,
  state: MatchState,
  thrower: Unit,
  flight: readonly Point[],
): Unit[] {
  const enemies = activeUnits(state).filter(
    (u) => u.team !== thrower.team && u.reactionAvailable && !guardsItsFurnace(arena, u),
  );

  const found: Unit[] = [];
  const seen = new Set<string>();

  for (const cell of flight.slice(1)) {
    if (arena.isSolid(cell)) continue;
    for (const enemy of enemies) {
      if (seen.has(enemy.id)) continue;
      if (distance(enemy, cell) > 1) continue;
      seen.add(enemy.id);
      found.push(enemy);
    }
  }

  return found;
}

/** A Bulwark close enough to its own Furnace to be holding its Reaction for a shot. */
function guardsItsFurnace(arena: Arena, unit: Unit): boolean {
  if (unit.role !== 'bulwark') return false;
  return rangeToFurnace(unit, arena.furnaceOf(unit.team)) <= BULWARK_BLOCK_RANGE_CELLS;
}
