/**
 * The two neutral hazards: the Crackers and the Spark.
 *
 * Neither belongs to a team, and that is the whole of their design. A Cracker
 * homes in on whoever is nearest, friend or foe, and the Spark is worth three
 * goals to whichever side gets a hand on it. They are the reason the sport is
 * not a positional stalemate.
 *
 * This file works out **where they go**. It never changes a match: it returns a
 * run, and `reduce` decides what the run costs. That split is what lets the
 * homing rule be tested on a hand-placed board without building a whole turn.
 */

import type { Arena } from '../arena.js';
import {
  CRACKER_BAT_RANGE_CELLS,
  CRACKER_MOVE_CELLS,
  SPARK_MOVE_CELLS,
  SPARK_SPAWN_MIN_DISTANCE,
  SPARK_SPAWN_ZONE,
} from '../constants.js';
import {
  d8FromDirection,
  directionFromD8,
  distance,
  lineTo,
  reflectedRun,
  straightPath,
  zoneOf,
  type Point,
} from '../geometry.js';
import type { Rng } from '../rng.js';
import { activeUnits, type MatchState, type Unit } from '../types.js';

/** A hazard's travel: the cells it crossed, where it stopped, and who it met. */
export interface HazardRun {
  readonly path: readonly Point[];
  readonly landing: Point;
  /** The first player whose cell it crossed. That is the one it goes off on. */
  readonly struck: Unit | null;
}

/**
 * Whoever is nearest, on either team and in any zone.
 *
 * Ties are broken by the dice rather than by unit id. An id-ordered tie-break
 * would always resolve the same way, and since ids carry the team letter it
 * would aim the Crackers systematically at one side. That is invisible in a
 * single match and it poisons a thousand-run balance sweep, which is exactly
 * what the sweeps exist to detect.
 */
export function nearestUnit(state: MatchState, from: Point, rng: Rng): Unit | null {
  const units = activeUnits(state);
  if (units.length === 0) return null;

  const closest = Math.min(...units.map((u) => distance(from, u)));
  return rng.pick(units.filter((u) => distance(from, u) === closest));
}

/**
 * Count 20. Six cells straight at the nearest player, terrain ignored: the
 * thing floats through girders, which is what makes it impossible to hide from
 * behind a catwalk.
 */
export function crackerRun(state: MatchState, from: Point, rng: Rng): HazardRun {
  const target = nearestUnit(state, from, rng);
  if (!target) return { path: [], landing: from, struck: null };

  // Someone standing on the Cracker is already inside its blast. Without this
  // the homing line has nowhere to travel, and parking a Breaker on top of one
  // would defuse it for the rest of the match.
  if (distance(from, target) === 0) return { path: [], landing: from, struck: target };

  return stopAtFirstUnit(state, from, lineTo(from, target, CRACKER_MOVE_CELLS));
}

/**
 * A Cracker sent down a chosen line by a bat. Twelve cells, no bounce: it stops
 * against the shell of the silo if it meets nobody, and stays live there.
 */
export function battedCrackerRun(state: MatchState, from: Point, direction: number): HazardRun {
  const path = straightPath(from, directionFromD8(direction), CRACKER_BAT_RANGE_CELLS);
  return stopAtFirstUnit(state, from, path);
}

/** Walks a path in travel order and stops on the first player standing in it. */
function stopAtFirstUnit(state: MatchState, from: Point, path: readonly Point[]): HazardRun {
  const units = activeUnits(state);
  const walked: Point[] = [];

  for (const cell of path) {
    walked.push(cell);
    const struck = units.find((u) => u.x === cell.x && u.y === cell.y);
    if (struck) return { path: walked, landing: cell, struck };
  }

  return { path: walked, landing: walked[walked.length - 1] ?? from, struck: null };
}

/**
 * Where the Spark drops in at the start of round 6.
 *
 * A random cell of The Scramble, four cells clear of everyone, so that nobody
 * simply happens to be standing on the prize. The fallback
 * matters more than it looks: written as a hard constraint the rule could find
 * no cell in a crowded Scramble and stall the round, so it gives ground and
 * takes the emptiest cell there is.
 *
 * Only occupiable cells are candidates. The Spark ignores terrain once it is
 * moving, but it is caught by standing in its cell, and a Spark born inside a
 * girder would be uncatchable until it drifted out.
 */
export function sparkEntryCell(arena: Arena, state: MatchState, rng: Rng): Point {
  const units = activeUnits(state);
  const cells = [...arena.occupiableCells()].filter((c) => zoneOf(c) === SPARK_SPAWN_ZONE);
  if (cells.length === 0) throw new Error('the arena has no open cell in the Spark\'s zone');

  const clearance = (c: Point): number =>
    units.length === 0 ? Infinity : Math.min(...units.map((u) => distance(c, u)));

  const clear = cells.filter((c) => clearance(c) >= SPARK_SPAWN_MIN_DISTANCE);
  if (clear.length > 0) return rng.pick(clear);

  const emptiest = Math.max(...cells.map(clearance));
  return rng.pick(cells.filter((c) => clearance(c) === emptiest));
}

/**
 * Count 10. Six cells along the heading it already had, reflecting off the
 * walls, the floor and the ceiling, and spending the rest of the move on the
 * new heading.
 *
 * No dice. The d8 is rolled once, when it drops in; after that the Spark is a
 * ball on a table and the only thing that turns it is a wall. That is what a
 * player is meant to read off the board and cut across, and it is why this
 * function no longer takes an rng.
 *
 * Nothing it crosses matters. The Spark is not a projectile and hits nobody:
 * the only thing that ever happens to it is being caught.
 */
export function sparkRun(from: Point, heading: number): {
  /** The face it travelled on this round. */
  readonly direction: number;
  readonly path: readonly Point[];
  readonly landing: Point;
  /** The face it will travel on next round, turned by any bounce. */
  readonly heading: number;
} {
  const run = reflectedRun(from, directionFromD8(heading), SPARK_MOVE_CELLS);
  return {
    direction: heading,
    path: run.path,
    landing: run.path[run.path.length - 1] ?? from,
    heading: d8FromDirection(run.heading),
  };
}
