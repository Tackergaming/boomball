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
import { distance, type Point } from '../engine/geometry.js';
import type { LegalActions } from '../engine/legalActions.js';
import {
  blockingBulwark,
  rangeToFurnace,
  shotTarget,
  throwRangeOver,
} from '../engine/rules/payload.js';
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
 * How close a cell is to being able to **score**, which is not the same as how
 * close it is to the Furnace.
 *
 * A flat distance gradient prices the first step across the silo the same as
 * the last step into shooting range, and a carrier scored on it drifts towards
 * the goal without ever arriving. This is flat at one inside clean throwing
 * range and falls away outside it, so the pull is strongest exactly where the
 * carrier still has something to gain.
 */
export function scoringNearness(from: Point, furnace: Furnace): number {
  const range = rangeToFurnace(from, furnace);
  if (range <= PAYLOAD_RANGE_CELLS) return 1;
  return Math.max(0, 1 - (range - PAYLOAD_RANGE_CELLS) / 30);
}

/**
 * Whether a support player is somewhere the carrier could actually throw to.
 *
 * Getting open is two things and the evaluator only ever priced one of them.
 * Advancing on the goal is the half that was there; **being reachable** is the
 * half that was not, and on a fourteen-cell pitch its absence was invisible
 * because everyone was within a throw of everyone by accident.
 *
 * On a pitch that runs the height of the silo it is not invisible at all. A
 * team concedes, its goalkeeper is handed a fresh Payload in its own mouth, and
 * its Strikers price every cell by distance to the far goal, so they run away
 * from the one team-mate holding the ball. Two rounds later nothing is within
 * throwing distance of the keeper, `legal.pass` is empty, `guardFurnace` keeps
 * the keeper home, and the ball never comes out again.
 *
 * One at or inside clean throwing range, falling to zero at twice it. **That
 * makes it a no-op wherever the balance sweeps were actually run**: in the
 * regime the closed balance was measured in, every support cell scored a reach
 * of one and this multiplies by one. It only bites out past the range where the
 * old formula had never been measured and was simply wrong.
 */
export function passReach(cell: Point, carrier: Point): number {
  const beyond = Math.max(0, distance(cell, carrier) - PAYLOAD_RANGE_CELLS);
  return Math.max(0, 1 - beyond / PAYLOAD_RANGE_CELLS);
}

/**
 * The odds this player would put the ball in the Furnace from this cell, or
 * zero if it cannot shoot from there at all.
 *
 * This is what prices a pass. Ground gained is not the same as a chance
 * created: a Breaker on the edge of range is holding a shot worth one in a
 * hundred, and handing the same cell to a Striker turns it into one in three.
 * Scored on distance alone, that throw looks like it gains nothing.
 */
export function shotQuality(board: Board, unit: Unit, from: Point): number {
  const range = throwRangeOver(rangeToFurnace(from, board.targetFurnace));
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
  const { arena, state, unit, weights: w } = board;
  let value = 0;

  if (unit.holdingPayload) {
    value += w.carryToFurnace * scoringNearness(cell, board.targetFurnace);
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
    // Advancing on goal only counts from somewhere the ball can reach. See
    // `passReach`: this is the outlet half of getting open, and without it a
    // support player walks to the far end of the silo and strands its own
    // carrier with nobody to throw to.
    value += w.supportAttack * scoringNearness(cell, board.targetFurnace) * passReach(cell, board.carrier);
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

  if (!arena.isAnchorable(cell)) value -= w.keepGrip;
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
