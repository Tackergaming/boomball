/**
 * The two neutral hazards: the Crackers and the Spark.
 *
 * Neither belongs to a team, and that is the whole of their design. A Cracker
 * homes in on whoever is nearest, friend or foe, and the Spark is worth two
 * goals to whichever side gets a hand on it. They are the reason the sport is
 * not a positional stalemate.
 *
 * This file works out **where they go**. It never changes a match: it returns a
 * run, and `reduce` decides what the run costs. That split is what lets the
 * homing rule be tested on a hand-placed board without building a whole turn.
 *
 * Since D11 both hazards know the terrain (écarts 35 and 36, arbitrage J6):
 * a Cracker in drift takes the shortest path round the obstacles, a struck
 * Cracker and the drifting Spark bounce off them. **Their movement never falls
 * to zero because of an obstacle.**
 */

import type { Arena } from '../arena.js';
import {
  CRACKER_BAT_RANGE_CELLS,
  CRACKER_MOVE_CELLS,
  SPARK_MOVE_CELLS,
  SPARK_SPAWN_MIN_DISTANCE,
  SPARK_SPAWN_THIRD,
} from '../constants.js';
import {
  DIRECTIONS,
  d8FromDirection,
  directionFromD8,
  distance,
  inBounds,
  thirdOf,
  type Point,
} from '../geometry.js';
import type { Rng } from '../rng.js';
import { activeUnits, type MatchState, type Unit } from '../types.js';
import { bouncingRun } from './bounce.js';

// -- Where the Crackers stand ------------------------------------------------

/**
 * The two cells the Crackers start on (écart 43): one either side of the
 * ball, across the width of the pitch, on the halfway line. They used to share
 * the ball's own cell and were drawn under it, so Jérôme's first game showed one
 * Cracker where there were two. Either side across the width rather than along
 * the length, so that each one stays exactly as far from both Furnaces as the
 * ball is and neither side has a Cracker a cell nearer its own goal.
 *
 * Throws on an arena where those cells are not floor, because a Cracker born
 * in a crate is a Cracker that never moves.
 */
export function crackerKickoffCells(arena: Arena, centre: Point): [Point, Point] {
  const cells: [Point, Point] = [
    { x: centre.x - 1, y: centre.y },
    { x: centre.x + 1, y: centre.y },
  ];
  for (const cell of cells) {
    if (!arena.isOccupiable(cell)) {
      throw new Error(`arena ${arena.spec.id} has no floor beside its centre for a Cracker`);
    }
  }
  return cells;
}

/**
 * Where a spent Cracker comes back (écart 43): the free cell nearest the
 * centre, the centre itself when it is free. A cell is taken by a loose ball,
 * by a player, or by the other Cracker when it is live; a returning Cracker
 * never lands on the ball, on anybody, or on its twin. Equidistant candidates
 * are split by the dice, as `nearestUnit` does, so no direction is favoured.
 */
export function crackerRespawnCell(arena: Arena, state: MatchState, rng: Rng): Point {
  const centre = arena.spec.ordnanceStart;
  const taken = new Set<string>();
  const key = (p: Point): string => `${p.x},${p.y}`;
  for (const unit of activeUnits(state)) taken.add(key(unit));
  for (const cracker of state.crackers) if (cracker.state === 'live') taken.add(key(cracker));
  if (state.payload.carriedBy === null) taken.add(key(state.payload));

  let best: Point[] = [];
  let bestDistance = Infinity;
  for (const cell of arena.occupiableCells()) {
    if (taken.has(key(cell))) continue;
    const d = distance(cell, centre);
    if (d < bestDistance) {
      bestDistance = d;
      best = [cell];
    } else if (d === bestDistance) {
      best.push(cell);
    }
  }
  if (best.length === 0) throw new Error('the arena has no free cell for a Cracker to return to');
  return rng.pick(best);
}

// -- Runs --------------------------------------------------------------------

/** A hazard's travel: the cells it crossed, where it stopped, and who it met. */
export interface HazardRun {
  readonly path: readonly Point[];
  readonly landing: Point;
  /** The first player whose cell it crossed. That is the one it goes off on. */
  readonly struck: Unit | null;
}

/**
 * Whoever is nearest, on either team and in any third.
 *
 * Ties are broken by the dice rather than by unit id. An id-ordered tie-break
 * would always resolve the same way, and since ids carry the team letter it
 * would aim the Crackers systematically at one side. That is invisible in a
 * single match and it poisons a thousand-run balance sweep, which is exactly
 * what the sweeps exist to detect.
 *
 * Nearest as the crow flies, not as the Cracker rolls: a unit two cells away
 * behind a crate is still the nearest, and the Cracker goes round the crate to
 * get to it. Measuring by path length instead would make a Cracker switch
 * targets as the field moves, which is harder to read and no fairer.
 */
export function nearestUnit(state: MatchState, from: Point, rng: Rng): Unit | null {
  const units = activeUnits(state);
  if (units.length === 0) return null;

  const closest = Math.min(...units.map((u) => distance(from, u)));
  return rng.pick(units.filter((u) => distance(from, u) === closest));
}

/**
 * Count 20. Six cells towards the nearest player along the **shortest path
 * that goes round the obstacles** (écart 35), and it goes off on the first
 * player it rolls into, which need not be the one it was aiming at.
 */
export function crackerRun(arena: Arena, state: MatchState, from: Point, rng: Rng): HazardRun {
  const target = nearestUnit(state, from, rng);
  if (!target) return { path: [], landing: from, struck: null };

  // Someone standing on the Cracker is already inside its blast. Without this
  // the homing line has nowhere to travel, and parking a Breaker on top of one
  // would defuse it for the rest of the match.
  if (distance(from, target) === 0) return { path: [], landing: from, struck: target };

  const route = shortestPath(arena, from, target, CRACKER_MOVE_CELLS);
  return stopAtFirstUnit(state, from, route);
}

/**
 * The first `maxSteps` cells of a shortest route from `from` to `to` that
 * never enters an obstacle, eight directions, one cell per step. Units are not
 * in the way: a Cracker detonates on the first one it meets rather than
 * routing round it. Empty when `to` cannot be reached at all, which the layout
 * never produces but a hand-built arena might.
 *
 * Breadth-first, because every step costs one. Ties between equally short
 * routes fall to the order of `DIRECTIONS`, which is fixed, so the run is the
 * same for the same board and the match replays.
 */
export function shortestPath(arena: Arena, from: Point, to: Point, maxSteps: number): Point[] {
  const key = (p: Point): string => `${p.x},${p.y}`;
  // Callers hand over a Unit as the destination. The route is logged into the
  // event stream, so it has to carry a bare cell there, not a player record.
  const goal: Point = { x: to.x, y: to.y };
  if (key(from) === key(goal)) return [];

  const cameFrom = new Map<string, Point | null>();
  cameFrom.set(key(from), null);
  const queue: Point[] = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (key(current) === key(goal)) break;

    for (const d of DIRECTIONS) {
      const next = { x: current.x + d.x, y: current.y + d.y };
      if (!inBounds(next) || arena.isSolid(next) || cameFrom.has(key(next))) continue;
      cameFrom.set(key(next), current);
      queue.push(next);
    }
  }

  if (!cameFrom.has(key(goal))) return [];

  const route: Point[] = [];
  let step: Point | null = goal;
  while (step && key(step) !== key(from)) {
    route.unshift(step);
    step = cameFrom.get(key(step)) ?? null;
  }
  return route.slice(0, maxSteps);
}

/**
 * A Cracker sent down a chosen line by a bat. Twelve cells on the d8 heading,
 * **bouncing** off obstacles and the edge of the pitch (écarts 35 and 36b) and
 * carrying on with whatever cells it has left. It goes off on the first player
 * it meets, and comes to rest, still live, where its run ends.
 */
export function battedCrackerRun(
  arena: Arena,
  state: MatchState,
  from: Point,
  direction: number,
): HazardRun {
  const run = bouncingRun(
    (p) => arena.isSolid(p),
    from,
    directionFromD8(direction),
    CRACKER_BAT_RANGE_CELLS,
  );
  return stopAtFirstUnit(state, from, run.path);
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
 * A random open cell of the middle third, four cells clear of everyone, so
 * that nobody simply happens to be standing on the prize (écart 36). The
 * fallback matters more than it looks: written as a hard constraint the rule
 * could find no cell in a crowded middle and stall the round, so it gives
 * ground and takes the emptiest cell there is.
 *
 * Only occupiable cells are candidates: it is caught by standing in its cell,
 * and a Spark born inside a crate would be uncatchable until it drifted out.
 */
export function sparkEntryCell(arena: Arena, state: MatchState, rng: Rng): Point {
  const units = activeUnits(state);
  const cells = [...arena.occupiableCells()].filter((c) => thirdOf(c) === SPARK_SPAWN_THIRD);
  if (cells.length === 0) throw new Error('the arena has no open cell in the middle third');

  const clearance = (c: Point): number =>
    units.length === 0 ? Infinity : Math.min(...units.map((u) => distance(c, u)));

  const clear = cells.filter((c) => clearance(c) >= SPARK_SPAWN_MIN_DISTANCE);
  if (clear.length > 0) return rng.pick(clear);

  const emptiest = Math.max(...cells.map(clearance));
  return rng.pick(cells.filter((c) => clearance(c) === emptiest));
}

/**
 * Count 10. Six cells along the heading it already had, in the plane of the
 * pitch, **bouncing** off obstacles and the edge and spending the rest of the
 * move on the new heading (écart 36).
 *
 * No dice. The d8 is rolled once, when it drops in; after that the Spark is a
 * ball on a table and the only thing that turns it is something solid. That is
 * what a player is meant to read off the board and cut across, and it is why
 * this function takes no rng.
 *
 * Nothing it crosses matters. The Spark is not a projectile and hits nobody:
 * the only thing that ever happens to it is being caught.
 */
export function sparkRun(
  arena: Arena,
  from: Point,
  heading: number,
): {
  /** The face it travelled on this round. */
  readonly direction: number;
  readonly path: readonly Point[];
  readonly landing: Point;
  /** The face it will travel on next round, turned by any bounce. */
  readonly heading: number;
} {
  const run = bouncingRun((p) => arena.isSolid(p), from, directionFromD8(heading), SPARK_MOVE_CELLS);
  return {
    direction: heading,
    path: run.path,
    landing: run.path[run.path.length - 1] ?? from,
    heading: d8FromDirection(run.heading),
  };
}
