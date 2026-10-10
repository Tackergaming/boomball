/**
 * The two neutral hazards: the Crackers and the Spark.
 *
 * Neither belongs to a team, and that is the whole of their design. A Cracker
 * rolls at the ball, wherever it lies or whoever carries it, and goes off on
 * the first player it crosses, friend or foe; the Spark is worth two goals to
 * whichever side gets a hand on it. They are the reason the sport is not a
 * positional stalemate.
 *
 * This file works out **where they go**. It never changes a match: it returns a
 * run, and `reduce` decides what the run costs. That split is what lets the
 * homing rule be tested on a hand-placed board without building a whole turn.
 *
 * Since D11 both hazards know the terrain (écarts 35 and 36, arbitrage J6):
 * a Cracker in drift takes the shortest path round the obstacles, a struck
 * Cracker and the drifting Spark bounce off them. **Their movement never falls
 * to zero because of an obstacle.**
 *
 * Since 2H.6 (écarts 45, 46 and 47, decided by Jérôme on 2026-10-10 soir) the
 * Crackers chase the ball rather than the nearest player, are born at the edge
 * posts of the halfway line rather than beside the ball, and a Breaker they
 * roll onto gets to bat them back before they go off.
 */

import type { Arena } from '../arena.js';
import {
  ARENA_WIDTH,
  CRACKER_BAT_RANGE_CELLS,
  CRACKER_MOVE_CELLS,
  CRACKER_PARRY_ARC_HALF_WIDTH,
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
import {
  activeUnits,
  type Cracker,
  type MatchState,
  type Payload,
  type Unit,
} from '../types.js';
import { bouncingRun } from './bounce.js';
import { cellKey, nearestFreeCell, takenCells, takenOn } from './placement.js';

// -- Where the Crackers stand ------------------------------------------------

/**
 * Each Cracker has a home post (écart 46): one of the two edge cells of the
 * halfway line, `(0, 22)` and `(14, 22)` on the Kill-Silo, the pillars at the
 * north and the south of the screen. `cracker-1` belongs to the first, the
 * west edge, `cracker-2` to the second. It is derived from the arena's
 * ordnance start rather than stored, so the `arenas` row did not change.
 *
 * Born beside the ball (écart 43) the Crackers were in the kick-off scrum
 * before anyone had moved; seven cells out they enter the game on round 2
 * instead of starting it. The post itself is a pillar and never a candidate.
 */
export function crackerPost(arena: Arena, index: number): Point {
  const centre = arena.spec.ordnanceStart;
  return { x: index === 0 ? 0 : ARENA_WIDTH - 1, y: centre.y };
}

/**
 * Where a Cracker drops in, at kick-off as on its return: the free cell nearest
 * its post, so one of the cells beside the pillar when any is free. Never the
 * loose ball, never a player, never the other Cracker; equidistant cells are
 * split by the dice. `taken` is what already stands on the board, and the
 * caller adds the first Cracker to it before placing the second.
 */
export function crackerHomeCell(
  arena: Arena,
  index: number,
  taken: ReadonlySet<string>,
  rng: Rng,
): Point {
  return nearestFreeCell(arena, taken, crackerPost(arena, index), rng, 1);
}

/**
 * The two cells the Crackers start on (écart 46), one after the other so the
 * second sees where the first went. The board is the kick-off board: the
 * players on their lines and the ball at the centre.
 */
export function crackerKickoffCells(
  arena: Arena,
  units: readonly Unit[],
  payload: Payload,
  rng: Rng,
): [Point, Point] {
  const taken = takenCells(units, payload, []);
  const first = crackerHomeCell(arena, 0, taken, rng);
  taken.add(cellKey(first));
  const second = crackerHomeCell(arena, 1, taken, rng);
  return [first, second];
}

/** Where a spent Cracker comes back (écart 46): beside its own post, on a free cell. */
export function crackerRespawnCell(
  arena: Arena,
  state: MatchState,
  index: number,
  rng: Rng,
): Point {
  return crackerHomeCell(arena, index, takenOn(state), rng);
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
 * Where the ball is right now: under its carrier, or on the floor. The
 * engine stamps `payload.x/y` when the ball changes hands and lets them age
 * while somebody holds it, so a carried ball is read off the carrier.
 */
export function ballCell(state: MatchState): Point {
  if (state.payload.carriedBy !== null) {
    const carrier = state.units.find((u) => u.id === state.payload.carriedBy);
    if (carrier) return { x: carrier.x, y: carrier.y };
  }
  return { x: state.payload.x, y: state.payload.y };
}

/**
 * Count 20 (écart 45). `CRACKER_MOVE_CELLS` cells **towards the ball**, posed
 * or carried, along the shortest path that goes round the obstacles, and it
 * goes off on the first player it rolls into, carrier included, which need not
 * be anyone near the ball.
 *
 * It used to roll at the nearest player, which the rule books all said and
 * which Jérôme's second game found unreadable: a Cracker that picks the
 * nearest of fourteen moving players has no trajectory anyone can read, and
 * ties between equidistant players had to be split by the dice. The ball is
 * one thing, everybody knows where it is, and a Cracker that chases it
 * harasses the carrier, which is the pressure the sport wanted. No dice.
 *
 * Three things stop it short of the ball. A player on the way, which is the
 * blast. The other Cracker: it stops on the last free cell before it rather
 * than rolling through it, so two charges never share a cell. And the ball
 * itself when it lies on the floor with nobody on it: the Cracker rolls onto
 * the ball's cell and sits there, armed, and **nothing happens**. To take that
 * ball somebody bats the Cracker away first, or steps on and takes the blast
 * at the next count 20. A player already standing on the Cracker is inside its
 * blast and it goes off where it lies, as before.
 */
export function crackerRun(arena: Arena, state: MatchState, cracker: Cracker): HazardRun {
  const from: Point = { x: cracker.x, y: cracker.y };
  const units = activeUnits(state);

  const underneath = units.find((u) => u.x === from.x && u.y === from.y);
  if (underneath) return { path: [], landing: from, struck: underneath };

  const target = ballCell(state);
  if (distance(from, target) === 0) return { path: [], landing: from, struck: null };

  const twins = state.crackers.filter((c) => c.id !== cracker.id && c.state === 'live');
  const route = shortestPath(arena, from, target, CRACKER_MOVE_CELLS);

  const walked: Point[] = [];
  for (const cell of route) {
    if (twins.some((c) => c.x === cell.x && c.y === cell.y)) break;
    walked.push(cell);
    const struck = units.find((u) => u.x === cell.x && u.y === cell.y);
    if (struck) return { path: walked, landing: cell, struck };
  }
  return { path: walked, landing: walked[walked.length - 1] ?? from, struck: null };
}

/**
 * The first `maxSteps` cells of a shortest route from `from` to `to` that
 * never enters an obstacle, eight directions, one cell per step. Units are not
 * in the way: a Cracker detonates on the first one it meets rather than
 * routing round it. Empty when `to` cannot be reached at all, which the layout
 * never produces but a hand-built arena might.
 *
 * Breadth-first, because every step costs one. Ties between equally short
 * routes are many on a grid with diagonals: from three cells east of the ball
 * a step south-east, then two north-west, is as short as three steps west.
 * The first version broke ties by the fixed order of `DIRECTIONS` and rolled
 * exactly that zigzag, which is unreadable and, under écart 45, lands on the
 * wrong cell for everything it was meant to pass. So each cell's neighbours
 * are tried **nearest the goal first**, as the crow flies, and the first
 * discovery wins: a straight line to the ball when there is one, the gentlest
 * bend round a crate when there is not. Still fixed, so the run is the same
 * for the same board and the match replays.
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

    const next = DIRECTIONS.map((d) => ({ x: current.x + d.x, y: current.y + d.y })).sort(
      (a, b) => straightness(a, goal) - straightness(b, goal),
    );
    for (const cell of next) {
      if (!inBounds(cell) || arena.isSolid(cell) || cameFrom.has(key(cell))) continue;
      cameFrom.set(key(cell), current);
      queue.push(cell);
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

/** Squared Euclidean distance: the tie-break that keeps a route straight. */
function straightness(cell: Point, goal: Point): number {
  return (cell.x - goal.x) ** 2 + (cell.y - goal.y) ** 2;
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

/**
 * The face a drifting Cracker came in through: the d8 face pointing from the
 * cell it stopped on **back** towards the cell before it, which is the way a
 * Breaker facing the incoming charge bats it. Null when the run did not
 * travel: a Cracker that was already under the Breaker's feet arrived from
 * nowhere, and a run of a single cell came straight off its resting place,
 * which is read the same way as any other step.
 */
export function arrivalFace(from: Point, run: HazardRun): number | null {
  if (run.path.length === 0) return null;
  const last = run.path[run.path.length - 1]!;
  const before = run.path.length >= 2 ? run.path[run.path.length - 2]! : from;
  const back = { x: Math.sign(before.x - last.x), y: Math.sign(before.y - last.y) };
  if (back.x === 0 && back.y === 0) return null;
  return d8FromDirection(back);
}

/**
 * The faces of the Breaker's arc (écart 47): the arrival face and
 * `CRACKER_PARRY_ARC_HALF_WIDTH` faces either side of it, 120 degrees on a
 * d8, the arrival face first.
 */
export function parryFaces(arrival: number): number[] {
  const faces = [arrival];
  for (let turn = 1; turn <= CRACKER_PARRY_ARC_HALF_WIDTH; turn++) {
    faces.push(((arrival - 1 - turn + 8) % 8) + 1);
    faces.push(((arrival - 1 + turn) % 8) + 1);
  }
  return faces;
}

/**
 * Which face the parry sends the Cracker down. Automatic for the AI and, for
 * now, for a human Breaker too: the game has no way yet to ask a player a
 * question in the middle of a hazard's rung, and the Bulwark's block is
 * automatic for the same reason. Jérôme accepted this on 2026-10-10 soir.
 *
 * The rule he accepted: the face of the arc whose run meets an opponent of the
 * Breaker soonest, otherwise the arrival face. One refinement, so that
 * "otherwise" is never a blast on a team-mate when a quiet line exists: when
 * no face reaches an opponent, the arrival face is kept unless it would go off
 * on one of the Breaker's own, in which case the first neighbouring face that
 * strikes nobody is taken, and failing that the arrival face after all. The
 * runs are read off the board as it stands, with the Breaker on the cell the
 * Cracker is sent from, which the run never crosses.
 */
export function parryDirection(
  arena: Arena,
  state: MatchState,
  breaker: Unit,
  arrival: number,
): number {
  const from: Point = { x: breaker.x, y: breaker.y };
  const faces = parryFaces(arrival);
  const runs = faces.map((face) => ({ face, run: battedCrackerRun(arena, state, from, face) }));

  let best: { face: number; steps: number } | null = null;
  for (const { face, run } of runs) {
    if (!run.struck || run.struck.team === breaker.team) continue;
    if (best === null || run.path.length < best.steps) best = { face, steps: run.path.length };
  }
  if (best) return best.face;

  const straight = runs[0]!;
  if (!straight.run.struck) return straight.face;
  const quiet = runs.find(({ run }) => run.struck === null);
  return quiet ? quiet.face : straight.face;
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
