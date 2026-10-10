/**
 * What a cell is worth, and how likely a roll is to land.
 *
 * The AI never simulates a future state. It scores what is in front of it, and
 * the whole of its positional judgement lives in `positionValue`: one number
 * for one cell, from the point of view of one player. A move is then worth the
 * difference between where the unit would be and where it is, which is why a
 * well-placed unit stands still instead of shuffling because it has movement
 * left over.
 *
 * Everything here is a pure function of the board. The AI rolls no dice: the
 * same state gives the same decision, so a match replays whether the shirts
 * were driven by people or by this file.
 */

import type { Arena, Furnace } from '../engine/arena.js';
import {
  ARENA_HEIGHT,
  CRACKER_MOVE_CELLS,
  PAYLOAD_RANGE_CELLS,
  SPARK_CATCH_DC,
} from '../engine/constants.js';
import { distance, lineTo, type Point } from '../engine/geometry.js';
import type { LegalActions } from '../engine/legalActions.js';
import {
  blockingBulwark,
  rangeToFurnace,
  shotTarget,
  throwRangeOver,
  visibleRangeToFurnace,
} from '../engine/rules/payload.js';
import { passInterceptors } from '../engine/rules/reactions.js';
import { hasLineOfSight } from '../engine/rules/sight.js';
import { statsFor } from '../engine/stats.js';
import {
  activeUnits,
  sparkIsLive,
  type MatchState,
  type Unit,
  type UnitId,
} from '../engine/types.js';
import { findOrder, type AllyOrder } from './orders.js';
import type { RoleWeights } from './roles/index.js';

/**
 * How hard an order pulls, on the same scale as the role weights. High enough
 * that an ordered unit visibly changes what it does, low enough that it still
 * grabs a loose Payload at its feet on the way.
 */
export const ORDER_PULL = 60;

/** Everything one decision reads, gathered once. */
export interface Board {
  readonly arena: Arena;
  readonly state: MatchState;
  readonly unit: Unit;
  readonly legal: LegalActions;
  readonly weights: RoleWeights;
  /** Only the orders addressed to this unit. */
  readonly orders: readonly AllyOrder[];
  readonly ownFurnace: Furnace;
  readonly targetFurnace: Furnace;
  /** Whoever is holding the Payload right now, either team, or null if loose. */
  readonly carrier: Unit | null;
  readonly mates: readonly Unit[];
  readonly enemies: readonly Unit[];
}

export function buildBoard(
  arena: Arena,
  state: MatchState,
  unit: Unit,
  legal: LegalActions,
  weights: RoleWeights,
  orders: readonly AllyOrder[],
): Board {
  const carried = state.payload.carriedBy;
  const others = activeUnits(state).filter((u) => u.id !== unit.id);

  return {
    arena,
    state,
    unit,
    legal,
    weights,
    orders,
    ownFurnace: arena.furnaceOf(unit.team),
    targetFurnace: arena.targetFurnaceOf(unit.team),
    carrier: carried ? (state.units.find((u) => u.id === carried) ?? null) : null,
    mates: others.filter((u) => u.team === unit.team),
    enemies: others.filter((u) => u.team !== unit.team),
  };
}

// -- Odds -------------------------------------------------------------------

/**
 * The odds a d20 plus a flat bonus meets a target number. A natural 1 always
 * misses and a natural 20 always lands, hence the clamp, and advantage is the
 * chance of not failing twice.
 */
export function chance(
  bonus: number,
  against: number,
  mode: 'normal' | 'advantage' | 'disadvantage' = 'normal',
): number {
  const flat = Math.min(0.95, Math.max(0.05, (21 - (against - bonus)) / 20));
  if (mode === 'advantage') return 1 - (1 - flat) ** 2;
  if (mode === 'disadvantage') return flat ** 2;
  return flat;
}

/** The odds of winning a contested d20, from the gap between the two bonuses. */
export function contestChance(bonus: number, defence: number): number {
  return Math.min(0.9, Math.max(0.1, 0.475 + (bonus - defence) * 0.045));
}

// -- Distance ---------------------------------------------------------------

/** 1 on the spot, 0 at the far end of the silo. Never negative. */
export function nearness(a: Point, b: Point): number {
  return Math.max(0, 1 - distance(a, b) / ARENA_HEIGHT);
}

export function furnaceNearness(from: Point, furnace: Furnace): number {
  return Math.max(0, 1 - rangeToFurnace(from, furnace) / ARENA_HEIGHT);
}

/**
 * What a cell is worth when the mouth cannot be seen from it.
 *
 * Since D11 a shot needs a line of sight (écart 34), and the layout is built so
 * that no straight line runs from the halfway line to a mouth. A carrier priced
 * on distance alone walks up to the crate in front of the goal and stands
 * there, in clean range, holding a shot the door will never offer it. The first
 * sweep of engine 2 read exactly that: three matches in four without a goal.
 *
 * So a blind cell is worth a fraction of the same cell with the mouth in view.
 * Not zero: the gradient still has to pull a carrier across the pitch from its
 * own end, where nothing is visible and nothing is in range. High enough that a
 * step around the crate into the open is always worth taking, which is the
 * lesson of `positionValue` applied to the shot: the cell that makes the action
 * legal carries the action's worth.
 */
export const BLIND_DISCOUNT = 0.8;

/**
 * The distance from a cell to the nearest hatch cell it can see, or null when
 * the whole mouth is hidden. Pure terrain, so it is computed once per arena and
 * Furnace and read from a table afterwards: `positionValue` asks this for every
 * reachable cell of every decision, and a line of sight across half the pitch
 * is not free.
 */
const visibleRangeTables = new WeakMap<Arena, Map<string, number | null>>();

export function visibleRange(arena: Arena, from: Point, furnace: Furnace): number | null {
  let table = visibleRangeTables.get(arena);
  if (!table) {
    table = new Map();
    visibleRangeTables.set(arena, table);
  }
  const key = `${furnace.defendedBy}:${from.x},${from.y}`;
  const known = table.get(key);
  if (known !== undefined) return known;

  const range = visibleRangeToFurnace(arena, from, furnace);
  table.set(key, range);
  return range;
}

/**
 * How close a cell is to being able to **score**, which is not the same as how
 * close it is to the Furnace.
 *
 * A flat distance gradient prices the first step across the pitch the same as
 * the last step into shooting range, and a carrier scored on it drifts towards
 * the goal without ever arriving. This is flat at one from any cell that has
 * the mouth **in view** and in clean throwing range, and falls away outside it
 * all the way to the far end, so the pull is strongest exactly where the
 * carrier still has something to gain and never flat where it has nothing.
 *
 * A cell the mouth cannot be seen from is discounted, whatever its distance:
 * see `BLIND_DISCOUNT`. Inside clean range that is the whole difference between
 * standing behind the crate and standing beside it.
 */
export function scoringNearness(arena: Arena, from: Point, furnace: Furnace): number {
  const seen = visibleRange(arena, from, furnace);
  if (seen !== null && seen <= PAYLOAD_RANGE_CELLS) return 1;

  const range = rangeToFurnace(from, furnace);
  const gradient = Math.min(
    1,
    Math.max(0, 1 - (range - PAYLOAD_RANGE_CELLS) / (ARENA_HEIGHT - PAYLOAD_RANGE_CELLS)),
  );
  return seen === null ? gradient * BLIND_DISCOUNT : gradient;
}

/**
 * Whether a support player is somewhere the carrier could actually throw to,
 * **on distance alone**. One at or inside clean throwing range, falling to zero
 * at twice it. The line of sight a throw also needs is `outlet` below, because
 * reach is a number and sight is a yes or no.
 *
 * Getting open is two things and the evaluator only ever priced one of them.
 * Advancing on the goal is the half that was there; being reachable is the
 * half that was not, and on a fourteen-cell pitch its absence was invisible
 * because everyone was within a throw of everyone by accident. On a pitch that
 * runs forty-five cells it is not invisible at all: a team concedes, its keeper
 * is handed a fresh Payload in its own mouth, and nobody is within a throw.
 */
export function passReach(cell: Point, carrier: Point): number {
  const beyond = Math.max(0, distance(cell, carrier) - PAYLOAD_RANGE_CELLS);
  return Math.max(0, 1 - beyond / PAYLOAD_RANGE_CELLS);
}

/**
 * How good an outlet a cell makes for a team-mate of the carrier: zero to a
 * little over one.
 *
 * Three things have to be true at once, and the product is zero if any fails.
 * The ball can reach the cell (`passReach`); the carrier can see it (écart 34,
 * a crate between them and there is no pass); and the throw would gain ground,
 * measured as the range to the Furnace the carrier gives up by throwing here,
 * one at a full clean throw's worth. A cell with a clean shot on the mouth is
 * worth its shot on top, because a receiver who can score is the second
 * shooter the goalkeeper's Reaction cannot cover.
 *
 * This is the A31 fix. Before it, a support player's only pull in its own half
 * was the gradient towards its carrier, because the old nearness-to-goal term
 * read zero that far from the Furnace. After a goal the conceding team's six
 * field players therefore drifted onto their goalkeeper, who now held the ball,
 * and stayed: nothing anywhere else was worth a step, and a keeper ringed by
 * team-mates has nobody a throw's length up the pitch to pass to. An outlet is
 * worth most **nine cells ahead** of the carrier, in its sight, which is where
 * a team that wants the ball to come out has to stand.
 */
export function outlet(board: Board, cell: Point): number {
  const carrier = board.carrier;
  if (!carrier) return 0;

  const reach = passReach(cell, carrier);
  if (reach === 0) return 0;
  if (!hasLineOfSight(board.arena, carrier, cell)) return 0;

  const gained =
    rangeToFurnace(carrier, board.targetFurnace) - rangeToFurnace(cell, board.targetFurnace);
  const progress = Math.min(1, Math.max(0, gained / PAYLOAD_RANGE_CELLS));

  return reach * (progress + shotQuality(board, board.unit, cell));
}

/**
 * Cover: how safely a throw to this cell would arrive, zero to one.
 *
 * This is what took the place of the anchoring value of the vertical silo. A
 * floor has no cell to fall from, but it has crates, and the use of a crate in
 * this sport is to stand where the ball can reach you and the opposition
 * cannot touch it on the way. A cell the carrier cannot see is not covered, it
 * is hidden, and reads zero; so does a cell out of reach. In reach and in
 * sight, every opponent standing beside the flight (`passInterceptors`) takes
 * half of it away, so a lane with two defenders on it is worth nothing and a
 * clean lane is worth the whole weight.
 *
 * Only a team-mate of the carrier reads it. The carrier itself has no ranged
 * threat to hide from: nothing in the rules can reach it but a bat, and a bat
 * is priced by `avoidOpportunity`.
 */
export function laneCover(board: Board, cell: Point): number {
  const carrier = board.carrier;
  if (!carrier) return 0;

  const reach = passReach(cell, carrier);
  if (reach === 0 || distance(cell, carrier) === 0) return 0;
  if (!hasLineOfSight(board.arena, carrier, cell)) return 0;

  const defenders = passInterceptors(
    board.arena,
    board.state,
    carrier,
    lineTo(carrier, cell),
  ).length;
  return reach * Math.max(0, 1 - defenders * 0.5);
}

/**
 * The odds this player would put the ball in the Furnace from this cell, or
 * zero if it cannot shoot from there at all, which since écart 34 includes a
 * cell from which no hatch is in view.
 *
 * This is what prices a pass. Ground gained is not the same as a chance
 * created: a Breaker on the edge of range is holding a shot worth one in a
 * hundred, and handing the same cell to a Striker turns it into one in three.
 * Scored on distance alone, that throw looks like it gains nothing.
 */
export function shotQuality(board: Board, unit: Unit, from: Point): number {
  const seen = visibleRange(board.arena, from, board.targetFurnace);
  if (seen === null) return 0;
  const range = throwRangeOver(seen);
  if (!range.ok) return 0;

  const keeper = blockingBulwark(board.state, board.targetFurnace, board.targetFurnace.defendedBy);
  return chance(statsFor(unit.role, unit.tier).aim, shotTarget(keeper), range.mode);
}

// -- The value of standing somewhere ----------------------------------------

/**
 * What one cell is worth to one player, right now.
 *
 * The ball terms are exclusive on purpose: a unit is doing exactly one of
 * carrying, fetching, screening its own carrier or hunting the other side's.
 * Everything after that adds up, because guarding, chasing the Spark and
 * staying off a Cracker are all true at once.
 */
export function positionValue(board: Board, cell: Point): number {
  const { state, unit, weights: w } = board;
  let value = 0;

  if (unit.holdingPayload) {
    value += w.carryToFurnace * scoringNearness(board.arena, cell, board.targetFurnace);
  } else if (state.payload.carriedBy === null) {
    value += w.chaseLoosePayload * nearness(cell, state.payload);
    // The cell the ball is actually lying in is worth the pickup, not one more
    // step of gradient. Without this the last cell gains `chaseLoosePayload/45`,
    // about one point, and a unit will stand beside a loose Payload for the
    // whole match rather than step onto it. A proximity term cannot express
    // "and then I may have the ball": only the value of the action it unlocks
    // can, and `grabPayload` is free, so nothing is being double counted.
    if (cell.x === state.payload.x && cell.y === state.payload.y) value += w.grabPayload;
  } else if (board.carrier && board.carrier.team === unit.team) {
    value += w.screenCarrier * nearness(cell, board.carrier);
    // Getting open: reachable, in the carrier's sight, ahead of it, and ideally
    // with a shot. See `outlet`. Without the sight and the ground gained, a
    // support player either walks to the far end and strands its carrier, or,
    // after a goal, stands on its goalkeeper's shoulder for the rest of the
    // match (A31).
    value += w.supportAttack * outlet(board, cell);
    // And unmarked: a lane nobody is standing beside. See `laneCover`.
    value += w.cover * laneCover(board, cell);
  } else if (board.carrier) {
    value += w.pressCarrier * nearness(cell, board.carrier);
  }

  // `chaseSpark` is the switch for the whole Spark hunt, and it is zero for
  // every role but the Trajector. A Striker that finds itself in the Spark's
  // cell still catches it, because that is free; it just never walks there.
  if (sparkIsLive(state.spark) && w.chaseSpark > 0) {
    value += w.chaseSpark * nearness(cell, state.spark);
    // Same defect as the loose Payload, same cure: standing in the Spark's cell
    // is what makes the catch legal, so the cell has to carry the catch's worth
    // rather than one more step of gradient.
    if (cell.x === state.spark.x && cell.y === state.spark.y) {
      value += w.catchSpark * chance(statsFor(unit.role, unit.tier).agility, SPARK_CATCH_DC);
    }
  }

  value += w.guardFurnace * furnaceNearness(cell, board.ownFurnace);

  value -= w.avoidCrackers * crackerPressure(state, cell);

  const hold = findOrder(board.orders, 'holdZone');
  if (hold) value += ORDER_PULL * nearness(cell, hold.at);

  return value;
}

/**
 * How exposed a cell is to a Cracker on the next count 20. Zero out of reach,
 * one on top of the thing. It is a proximity reading and not a prediction:
 * a Cracker goes for whoever is nearest, so standing close to one is a bet on
 * somebody else being closer.
 */
export function crackerPressure(state: MatchState, cell: Point): number {
  let worst = 0;
  for (const cracker of state.crackers) {
    if (cracker.state !== 'live') continue;
    const gap = distance(cell, cracker);
    if (gap > CRACKER_MOVE_CELLS) continue;
    worst = Math.max(worst, 1 - gap / (CRACKER_MOVE_CELLS + 1));
  }
  return worst;
}

export function unitOf(state: MatchState, id: UnitId): Unit {
  const unit = state.units.find((u) => u.id === id);
  if (!unit) throw new Error(`no unit with id ${id}`);
  return unit;
}
