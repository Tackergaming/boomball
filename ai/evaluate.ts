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
  ARENA_WIDTH,
  MOVE_SPEED_FEET,
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
import { hasPlayedThisRound, sideOrder } from '../engine/initiative.js';
import { key, reachableCells } from '../engine/rules/movement.js';
import { crackerRun, sparkRun } from '../engine/rules/ordnance.js';
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
import { weightsFor, type RoleWeights } from './roles/index.js';

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
  /**
   * The keeper's resting cell (2H.9, `00` C11): its starting cell, the centre
   * of the floor in front of its own mouth, `(7, 1)` for A and `(7, 43)` for
   * B, read off the arena. Only a role with `rest` above zero measures its
   * `guardFurnace` against it.
   */
  readonly restCell: Point;
  /** Whoever is holding the Payload right now, either team, or null if loose. */
  readonly carrier: Unit | null;
  readonly mates: readonly Unit[];
  readonly enemies: readonly Unit[];
  /**
   * The cells each live Cracker will roll through at the next count 20, on
   * its way to the ball (écart 45), worked out with **this unit taken off the
   * board** so the line is the one it would be stepping onto rather than one
   * cut short by where it happens to stand now. Everybody else still stops a
   * line where they stand, because they would take the blast first. One
   * array per live Cracker, empty when it would not move.
   */
  readonly crackerLines: readonly (readonly Point[])[];
  /**
   * Whether this unit is hunting the Spark right now: the Spark is on the
   * field and this role chases it (`chaseSpark` above zero, the Trajector).
   * Jérôme, 2026-10-11: while it is on the field the hunter chases it and
   * nothing else, drops out of attack and defence, and takes the opportunity
   * attack if it starts its turn in a melee.
   */
  readonly hunter: boolean;
  /**
   * Where the Spark will land at the top of the next round (2H.10): its drift
   * is six cells on a known heading, bounces included, and rolls no die, so
   * the hunter aims at the cell it is going to, not the cell it is leaving.
   * Null when the Spark is not on the field.
   */
  readonly sparkNext: Point | null;
  /**
   * The threats to this unit as a carrier (2H.10, `carrierSafety`): every
   * opponent who plays again before this unit's next turn, with the cells it
   * can finish a plain move on and its odds of shoving the ball loose. Empty
   * when this unit does not carry or its role reads no safety.
   */
  readonly threats: readonly CarrierThreat[];
  /**
   * Whether this unit can finish a plain move beside the other side's
   * carrier this turn. The Breaker only hunts a Striker when it cannot
   * (C10 Breaker 3 before 4, re-read in 2H.10).
   */
  readonly carrierReachable: boolean;
  /**
   * Whether our own carrier could still throw to this unit this round once it
   * has moved (2H.10): yes when the carrier has already played, since the next
   * throw is next round's anyway and everybody is fresh; yes when the carrier
   * will be the last link; yes for a Striker ahead of a Breaker carrier (the
   * Breaker's exception). Otherwise this unit will have played when the
   * carrier's turn comes and the chain forbids the throw, so an outlet is
   * worth a fraction: the Striker that ran twenty-two hit points into a cell
   * nobody could serve was the lesson.
   */
  readonly carrierCanServe: boolean;
  /**
   * Where our own carrier will be when it matters for a place beside it: its
   * cell alone once it has played this round, or, while it has not, its cell
   * and every cell of the straight way from there to eight cells towards the
   * mouth it attacks (2H.10: "le mur se pose là où sera le porteur, sur sa
   * route vers la bouche"). Empty without an own carrier to stand by.
   */
  readonly wardLine: readonly Point[];
  /** Whether an opponent can reach our own carrier at all this round or next, a Dash away. */
  readonly wardThreatened: boolean;
}

/** One opponent that could come and shove this carrier before it plays again. */
export interface CarrierThreat {
  readonly unit: Unit;
  /** Its odds of winning the shove contest against this carrier. */
  readonly odds: number;
  /** The cells it can end a plain move on, plus the one it stands on. */
  readonly reach: ReadonlySet<string>;
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

  const without: MatchState = { ...state, units: state.units.filter((u) => u.id !== unit.id) };
  const crackerLines = state.crackers
    .filter((c) => c.state === 'live')
    .map((c) => crackerRun(arena, without, c).path);

  const carrier = carried ? (state.units.find((u) => u.id === carried) ?? null) : null;
  const mates = others.filter((u) => u.team === unit.team);
  const enemies = others.filter((u) => u.team !== unit.team);
  const targetFurnace = arena.targetFurnaceOf(unit.team);

  const sparkNext =
    sparkIsLive(state.spark) && state.spark.heading !== null
      ? sparkRun(arena, { x: state.spark.x, y: state.spark.y }, state.spark.heading).landing
      : null;

  const threats =
    unit.holdingPayload && weights.carrierSafety > 0 && weights.relaunch === 0
      ? carrierThreats(arena, state, unit, enemies)
      : [];

  const foe = carrier && carrier.team !== unit.team ? carrier : null;
  let carrierReachable = false;
  if (foe) {
    if (distance(unit, foe) <= 1) carrierReachable = true;
    else {
      for (const { cell } of legal.destinations.values()) {
        if (distance(cell, foe) <= 1) {
          carrierReachable = true;
          break;
        }
      }
    }
  }

  const ward = carrier && carrier.team === unit.team && carrier.id !== unit.id ? carrier : null;
  let wardLine: Point[] = [];
  let carrierCanServe = false;
  let wardThreatened = false;
  if (ward) {
    const played = hasPlayedThisRound(state, ward.id);
    const at = { x: ward.x, y: ward.y };
    wardLine = played ? [at] : [at, ...lineTo(at, carriedForward(ward, targetFurnace))];
    const afterUs = state.turnOrder.some(
      (slot, i) =>
        i > state.turnIndex &&
        slot.actor.kind === 'unit' &&
        slot.team === unit.team &&
        slot.actor.unitId !== ward.id &&
        slot.actor.unitId !== unit.id &&
        state.units.some((u) => u.id === (slot.actor as { unitId: UnitId }).unitId && u.status === 'active'),
    );
    const lastLink = !played && !afterUs;
    const exception =
      weightsFor(ward.role).chainException > 0 &&
      unit.role === 'striker' &&
      rangeToFurnace(unit, targetFurnace) < rangeToFurnace(ward, targetFurnace);
    carrierCanServe = played || lastLink || exception;
    const dashReach = 2 * (MOVE_SPEED_FEET / 5) + 1;
    wardThreatened = enemies.some((e) => wardLine.some((p) => distance(e, p) <= dashReach));
  }

  return {
    arena,
    state,
    unit,
    legal,
    weights,
    orders,
    ownFurnace: arena.furnaceOf(unit.team),
    targetFurnace,
    restCell: arena.spec.starts[unit.team][0]!,
    carrier,
    mates,
    enemies,
    crackerLines,
    hunter: sparkIsLive(state.spark) && weights.chaseSpark > 0,
    sparkNext,
    threats,
    carrierReachable,
    carrierCanServe,
    wardLine,
    wardThreatened,
  };
}

/** A carrier's cell carried a move's length towards the mouth it attacks, on the pitch. */
function carriedForward(carrier: Unit, furnace: Furnace): Point {
  const cells = MOVE_SPEED_FEET / 5;
  const towards = furnace.cells[0]!.y > carrier.y ? 1 : -1;
  const y = Math.max(0, Math.min(ARENA_HEIGHT - 1, carrier.y + towards * cells));
  return { x: carrier.x, y };
}

/**
 * The opponents who will play again before this carrier does, and where each
 * can walk to. An opponent who has not played this round gets a whole turn
 * first; one who has gets one too when its side opens the next round.
 */
function carrierThreats(arena: Arena, state: MatchState, carrier: Unit, enemies: readonly Unit[]): CarrierThreat[] {
  const nextRound = sideOrder({ ...state, round: state.round + 1 });
  const stats = statsFor(carrier.role, carrier.tier);
  const defence = Math.max(stats.might, stats.agility);
  const out: CarrierThreat[] = [];
  for (const enemy of enemies) {
    const playsFirst = !hasPlayedThisRound(state, enemy.id) || nextRound[0] === enemy.team;
    if (!playsFirst) continue;
    const reach = new Set<string>([key(enemy)]);
    for (const k of reachableCells(arena, state, enemy, MOVE_SPEED_FEET).keys()) reach.add(k);
    out.push({
      unit: enemy,
      odds: contestChance(statsFor(enemy.role, enemy.tier).might, defence),
      reach,
    });
  }
  return out.sort((a, b) => b.odds - a.odds);
}

/**
 * How exposed a carrier is on a cell (2H.10, Jérôme's lesson of round 1): the
 * threats that can finish a plain move beside it before it plays again, each
 * worth its odds of shoving the ball loose, but no more of them than there are
 * free cells around it, a team-mate standing beside it taking a place away.
 * Zero to about the number of free cells.
 */
export function carrierExposure(board: Board, cell: Point): number {
  if (board.threats.length === 0) return 0;
  const { arena, state } = board;
  let free = 0;
  const around: string[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const p = { x: cell.x + dx, y: cell.y + dy };
      if (p.x < 0 || p.y < 0 || p.x >= ARENA_WIDTH || p.y >= ARENA_HEIGHT || arena.isSolid(p)) continue;
      const mateThere = board.mates.some((m) => m.x === p.x && m.y === p.y);
      if (mateThere) continue;
      // A cell our own unit stands on now but will have left is still a place:
      // only the cells beside the *end* cell count, and the unit itself is not
      // beside itself. The ball's cell is free like any other.
      free++;
      around.push(key(p));
    }
  }
  if (free === 0) return 0;
  let exposure = 0;
  let counted = 0;
  for (const threat of board.threats) {
    if (counted >= free) break;
    const canArrive = around.some((k) => threat.reach.has(k));
    if (!canArrive) continue;
    exposure += threat.odds;
    counted++;
  }
  void state;
  return exposure;
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
 * The keeper's reading of the same thing (2H.9, Jérôme after his engine 5
 * game): the distance to its **resting cell**, the centre of the floor in
 * front of its mouth, plus the distance to the nearest hatch. Measured on the
 * hatch alone, `(9, 1)` was worth exactly as much as `(7, 1)`, both a cell
 * from a hatch, and the keeper dug in off-centre for five rounds. The two
 * distances are summed and read over twice the pitch so the gradient stays
 * the one `guardFurnace` was tuned on, about two points a cell, and so that
 * every cell on the pitch still reads above zero.
 */
export function restNearness(from: Point, rest: Point, furnace: Furnace): number {
  const away = distance(from, rest) + rangeToFurnace(from, furnace);
  return Math.max(0, 1 - away / (2 * ARENA_HEIGHT));
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
 * What a shot held for next turn is worth against one taken now, as a share
 * of its odds (2H.10): a carrier nobody can reach keeps the ball for a clean
 * shot rather than throw at disadvantage, and a clean shot now still beats
 * holding it.
 */
export const HOLD_FOR_CLEAN = 0.8;

/** The fraction of an outlet's worth when the carrier has no right to throw to it this round. */
export const UNSERVED_OUTLET = 0.3;

/** What a carrier of any role fears the Cracker line at, at least (2H.10). */
export const CARRIER_CRACKER_FEAR = 14;

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

/**
 * The best shot this carrier could take **next turn** from a cell: the best
 * `shotQuality` over every cell within a plain move of it, obstacles and units
 * ignored (2H.10). This is what a carrier that cannot be reached is holding
 * when it keeps the ball instead of throwing at disadvantage now: "il garde la
 * balle pour un tir propre au tour suivant". Read from a per-arena table of
 * visible ranges so a carrier's decision stays cheap.
 */
export function bestShotNextTurn(board: Board, unit: Unit, from: Point): number {
  const table = visibleRangeTable(board.arena, board.targetFurnace);
  const keeper = blockingBulwark(board.state, board.targetFurnace, board.targetFurnace.defendedBy);
  const target = shotTarget(keeper);
  const aim = statsFor(unit.role, unit.tier).aim;
  const reach = MOVE_SPEED_FEET / 5;
  let best = 0;
  for (let y = Math.max(0, from.y - reach); y <= Math.min(ARENA_HEIGHT - 1, from.y + reach); y++) {
    for (let x = Math.max(0, from.x - reach); x <= Math.min(ARENA_WIDTH - 1, from.x + reach); x++) {
      const seen = table[y * ARENA_WIDTH + x]!;
      if (seen < 0) continue;
      const range = throwRangeOver(seen);
      if (!range.ok) continue;
      const odds = chance(aim, target, range.mode);
      if (odds > best) best = odds;
    }
  }
  return best;
}

const visibleRangeTables2 = new WeakMap<Arena, Map<string, Int16Array>>();

/** Every cell's visible range to a Furnace, -1 when the mouth is hidden, computed once per arena. */
function visibleRangeTable(arena: Arena, furnace: Furnace): Int16Array {
  let perFurnace = visibleRangeTables2.get(arena);
  if (!perFurnace) {
    perFurnace = new Map();
    visibleRangeTables2.set(arena, perFurnace);
  }
  const known = perFurnace.get(furnace.defendedBy);
  if (known) return known;
  const table = new Int16Array(ARENA_WIDTH * ARENA_HEIGHT);
  for (let y = 0; y < ARENA_HEIGHT; y++) {
    for (let x = 0; x < ARENA_WIDTH; x++) {
      const p = { x, y };
      table[y * ARENA_WIDTH + x] = arena.isSolid(p) ? -1 : (visibleRange(arena, p, furnace) ?? -1);
    }
  }
  perFurnace.set(furnace.defendedBy, table);
  return table;
}

// -- The bodyguard ------------------------------------------------------------

/**
 * The wall: how good a cell is for being an obstacle between our own carrier
 * and the opponents coming at it, zero to one. Jérôme's wording of
 * 2026-10-11, replacing the shoulder of 2H.7: the point is that they spend
 * more movement, or cannot finish adjacent to the carrier at all.
 *
 * Read against the two nearest threats. For each, the cell is worth its
 * closeness to the carrier (one a cell off, a little less two cells off, a
 * thin gradient beyond so a Breaker across the pitch still walks over), on
 * the threat's side of the carrier (half on the far side), and on or beside
 * the straight line the threat would take (half off it). With no opponent on
 * the field, beside the carrier is as good as anywhere.
 *
 * It is the carrier and never a Striker by name, by Jérôme's arbitration of
 * 2026-10-10: the thing to protect is whoever has the ball, and when the
 * ball is loose or on the other side there is nobody to wall off and the
 * Breaker is a hunter (`pressCarrier`, `hunt`) or a parry post instead.
 */
export function block(board: Board, cell: Point): number {
  const carrier = board.carrier;
  if (!carrier || carrier.team !== board.unit.team || carrier.id === board.unit.id) return 0;
  // A goalkeeper at home wants outlets, not a wall: see `wantsEscort`.
  const wanted = weightsFor(carrier.role).wantsEscort;
  if (wanted === 0) return 0;

  // A place taken beside the carrier (2H.10, Jérôme): one a cell off where it
  // will be, half two cells off, a thin gradient beyond so a Breaker across
  // the pitch still walks over. No side, no lane. Worth little when no
  // opponent can reach the carrier anyway. A carrier still to play will have
  // moved: the place is on its way to the mouth, and worth more the further
  // along that way it is (`wardLine`).
  const urgency = board.wardThreatened ? 1 : 0.3;
  const line = board.wardLine;
  let best = 0;
  for (let i = 0; i < line.length; i++) {
    const along = line.length === 1 ? 1 : 0.5 + (0.5 * i) / (line.length - 1);
    best = Math.max(best, along * shoulder(cell, line[i]!, null));
  }
  return wanted * urgency * best;
}

/** Adjacent team-mates who are not the carrier: the Striker's crowding (C10 Striker 5). */
export function crowding(board: Board, cell: Point): number {
  let n = 0;
  for (const mate of board.mates) {
    if (mate.holdingPayload) continue;
    if (distance(mate, cell) === 1) n++;
  }
  return n;
}

/**
 * The swing within reach when the carrier is not (2H.8): one on a cell beside
 * an opponent, scaled by what this role makes of that opponent (`prey`), zero
 * elsewhere and zero for the carrier, whose cell is priced by `pressCarrier`.
 * Only read when the other side has the ball.
 */
export function preyAdjacency(board: Board, cell: Point): number {
  let best = 0;
  for (const enemy of board.enemies) {
    if (enemy.holdingPayload || distance(enemy, cell) !== 1) continue;
    best = Math.max(best, board.weights.prey[enemy.role]);
  }
  return best;
}

/** The `n` units nearest to a point, nearest first. */
function nearestN(units: readonly Unit[], to: Point, n: number): Unit[] {
  return [...units].sort((a, b) => distance(a, to) - distance(b, to)).slice(0, n);
}

/**
 * How good `cell` is as a shoulder of `protectee` against `threat`: one beside
 * it on the threat's side, half on the far side, fading with distance.
 */
function shoulder(cell: Point, protectee: Point, threat: Unit | null): number {
  const gap = distance(cell, protectee);
  const close = gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 0.6 : 0.3 * nearness(cell, protectee);
  const side = threat === null ? 1 : distance(cell, threat) < distance(protectee, threat) ? 1 : 0.5;
  return close * side;
}

/**
 * The bodyguard in defence (2H.7): when the other side has the ball, or
 * nobody does, stand between the nearest opponent and whichever team-mate
 * handles the ball (`wantsEscort`, which is everybody but the keeper), so
 * that opponent cannot finish its move beside them. The best shoulder over
 * all such team-mates, with a threat more than twelve cells off counting for
 * little: there is nothing to block yet.
 */
export function screen(board: Board, cell: Point): number {
  if (board.carrier && board.carrier.team === board.unit.team) return 0;
  let best = 0;
  for (const mate of board.mates) {
    if (weightsFor(mate.role).wantsEscort === 0) continue;
    const threat = nearestTo(board.enemies, mate);
    if (threat === null) continue;
    const urgency = distance(threat, mate) <= 12 ? 1 : 0.3;
    best = Math.max(best, urgency * shoulder(cell, mate, threat));
  }
  return best;
}

/**
 * The chain reads the ladder (écart 51). The next own unit still to play this
 * round, after this one, or null when this unit is the last of its side to
 * act: then it is the **last link**, and the rule about not throwing to
 * somebody who has played is lifted, because everybody has.
 */
export function nextToPlay(board: Board): Unit | null {
  const { state, unit } = board;
  for (let i = state.turnIndex + 1; i < state.turnOrder.length; i++) {
    const slot = state.turnOrder[i]!;
    if (slot.actor.kind !== 'unit' || slot.team !== unit.team) continue;
    const next = state.units.find((u) => u.id === (slot.actor as { unitId: UnitId }).unitId);
    if (next && next.status === 'active' && next.id !== unit.id) return next;
  }
  return null;
}

export function isLastLink(board: Board): boolean {
  return nextToPlay(board) === null;
}

export { hasPlayedThisRound };

function nearestTo(units: readonly Unit[], to: Point): Unit | null {
  let best: Unit | null = null;
  let bestGap = Infinity;
  for (const unit of units) {
    const gap = distance(unit, to);
    if (gap < bestGap) {
      best = unit;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * Whether a team-mate who wants a loose ball more is already within two cells
 * of it. Read through the weights so the table stays data: a Breaker yields
 * to a Striker because 55 is more than 45, not because of the word Striker.
 */
export function keenerMateNear(board: Board): boolean {
  const { state, unit, weights: w } = board;
  if (state.payload.carriedBy !== null) return false;
  // A mate who has played this round will not pick the ball up before the
  // other side plays (2H.10): a ball left to it is a ball left to them.
  return board.mates.some(
    (mate) =>
      distance(mate, state.payload) <= 2 &&
      !hasPlayedThisRound(state, mate.id) &&
      weightsFor(mate.role).chaseLoosePayload > w.chaseLoosePayload,
  );
}

/** The share of a loose ball this unit still wants, once a keener mate is near. */
function loosePayloadShare(board: Board): number {
  return keenerMateNear(board) ? 1 - board.weights.yieldToKeener : 1;
}

/**
 * One on a cell a Cracker will roll through at the next count 20, zero
 * elsewhere, for a unit that can parry it there: not holding the ball (a
 * carrier does not swing, écart 47). The Breaker's positive reading of the
 * Cracker line; see `crackerPressure` for everybody else's.
 */
export function parryPost(board: Board, cell: Point): number {
  if (board.unit.holdingPayload) return 0;
  // Never a Cracker line before a loose ball within a move (2H.10): the
  // Breaker that walked off to a line and left the ball three cells away
  // handed it to the other side.
  const { state, unit } = board;
  if (state.payload.carriedBy === null && distance(unit, state.payload) <= MOVE_SPEED_FEET / 5) return 0;
  return onCrackerLine(board, cell) ? 1 : 0;
}

function onCrackerLine(board: Board, cell: Point): boolean {
  return board.crackerLines.some((line) => line.some((p) => p.x === cell.x && p.y === cell.y));
}

// -- The value of standing somewhere ----------------------------------------

/**
 * What one cell is worth to one player, right now.
 *
 * The ball terms are exclusive on purpose: a unit is doing exactly one of
 * carrying, fetching, screening its own carrier or hunting the other side's.
 * Everything after that adds up, because guarding, chasing the Spark and
 * staying off a Cracker are all true at once.
 *
 * `actionLeft` says whether the unit will still have its Action when it
 * stands there (2H.9). A cell is worth the action it unlocks only if that
 * action can still be taken: the turn plan prices a Dash with it false, so
 * dashing onto the Spark's cell is not worth the catch the Dash just spent.
 * The pickup is free and the press is a stance, so those two stay.
 */
export function positionValue(board: Board, cell: Point, actionLeft = true): number {
  const { state, unit, weights: w } = board;
  let value = 0;

  // The Spark hunter reads nothing but the Spark (2H.8, Jérôme): the whole
  // ball game and the stances below are off while it is on the field. The
  // cell the Spark is in carries the catch's worth, for the usual reason: it
  // is the cell that makes the action legal. The Crackers are still a danger.
  if (board.hunter) {
    const onSpark = cell.x === state.spark.x && cell.y === state.spark.y;
    // The hunter aims at where the Spark is going (2H.10): the drift plays at
    // the top of the next round before anybody moves, so a cell beside the
    // Spark now is seven cells from it then. The cell it is in now is worth
    // the catch while the Action is there, and a little less than nothing
    // without it, since the Spark skips away from under a minder (écart 49).
    const goal = board.sparkNext ?? { x: state.spark.x, y: state.spark.y };
    let hunt = w.chaseSpark * nearness(cell, goal);
    if (onSpark) {
      hunt += actionLeft
        ? w.catchSpark * chance(statsFor(unit.role, unit.tier).agility, SPARK_CATCH_DC)
        : -w.chaseSpark * 0.2;
    }
    return hunt - w.avoidCrackers * crackerPressure(board, cell);
  }

  if (unit.holdingPayload) {
    value += w.carryToFurnace * scoringNearness(board.arena, cell, board.targetFurnace);
    // The ball is lost between two turns (2H.10): what the end cell is worth
    // is less by every opponent that can come and shove on it first, and
    // more by the clean shot held for next turn when none can.
    if (w.carrierSafety > 0) {
      const exposure = carrierExposure(board, cell);
      value -= w.carrierSafety * exposure;
      if (exposure === 0 && w.shoot > 0) value += w.shoot * HOLD_FOR_CLEAN * bestShotNextTurn(board, unit, cell);
    }
    // A Breaker that carries does not parry (écart 47): it fears the Cracker
    // line like everybody else.
    if (w.avoidCrackers < CARRIER_CRACKER_FEAR) {
      value -= (CARRIER_CRACKER_FEAR - w.avoidCrackers) * crackerPressure(board, cell);
    }
  } else if (state.payload.carriedBy === null) {
    // A Breaker leaves the ball to a Striker standing beside it: see
    // `keenerMateNear`. Everybody else reads a share of one. A keeper only
    // goes for a ball lying within its reach (`looseBallReach`). And the
    // kick-off ball, which nobody has carried yet, is a Striker's to take:
    // the Trajector reads `chaseKickoff` zero and keeps itself for the throw.
    const kickoff = state.lastCarrierTeam === null ? w.chaseKickoff : 1;
    const share =
      distance(unit, state.payload) > w.looseBallReach ? 0 : loosePayloadShare(board) * kickoff;
    value += w.chaseLoosePayload * share * nearness(cell, state.payload);
    // The cell the ball is actually lying in is worth the pickup, not one more
    // step of gradient. Without this the last cell gains `chaseLoosePayload/45`,
    // about one point, and a unit will stand beside a loose Payload for the
    // whole match rather than step onto it. A proximity term cannot express
    // "and then I may have the ball": only the value of the action it unlocks
    // can, and `grabPayload` is free, so nothing is being double counted.
    if (cell.x === state.payload.x && cell.y === state.payload.y) value += w.grabPayload * share;
  } else if (board.carrier && board.carrier.team === unit.team) {
    value += w.screenCarrier * nearness(cell, board.carrier);
    // A place taken beside our carrier (2H.10). See `block`.
    if (w.block > 0) value += w.block * block(board, cell);
    // Getting open: reachable, in the carrier's sight, ahead of it, and ideally
    // with a shot. See `outlet`. Without the sight and the ground gained, a
    // support player either walks to the far end and strands its carrier, or,
    // after a goal, stands on its goalkeeper's shoulder for the rest of the
    // match (A31). An outlet the carrier will have no right to throw to this
    // round is worth a fraction (2H.10): see `carrierCanServe`.
    const serve = board.carrierCanServe ? 1 : UNSERVED_OUTLET;
    if (w.supportAttack > 0) value += w.supportAttack * serve * outlet(board, cell);
    // And unmarked: a lane nobody is standing beside. See `laneCover`.
    if (w.cover > 0) value += w.cover * serve * laneCover(board, cell);
    // Spread out, never on a team-mate (C10 Striker 5, coded in 2H.10).
    if (w.spread > 0) value -= w.spread * crowding(board, cell);
    // Out of the carrier's reach altogether, every term above is zero and a
    // Striker up the pitch had nothing to come back for. See `rejoin`.
    if (passReach(unit, board.carrier) === 0) value += w.rejoin * nearness(cell, board.carrier);
  } else if (board.carrier) {
    value += w.pressCarrier * nearness(cell, board.carrier);
    // The cell beside the carrier is the one that makes the Shove legal and
    // holds the opportunity attack when the carrier leaves: it is worth the
    // press itself, not one more step of gradient. Jérôme, 2H.8: a Striker
    // presses the carrier "coûte que coûte", and finishes adjacent.
    if (distance(cell, board.carrier) === 1) value += w.pressCarrier;
    // The carrier out of reach of a plain move, the Breaker swings at whoever
    // is in reach, Strikers first (`hunt`, `prey`); within reach, the carrier
    // comes first (C10 Breaker 3 before 4). Beside a prey without an Action
    // left is worth nothing (2H.10).
    if (w.hunt > 0 && actionLeft && !board.carrierReachable) value += w.hunt * preyAdjacency(board, cell);
  }

  // The bodyguard's stance when the ball is not ours. See `screen`.
  if (w.screen > 0) value += w.screen * screen(board, cell);

  // `chaseSpark` is the switch for the whole Spark hunt, and it is zero for
  // every role but the Trajector, which is handled as `hunter` at the top. A
  // Striker that finds itself in the Spark's cell still catches it, because
  // that is free; it just never walks there.

  // Home: the mouth for a field player, the resting cell in front of it for
  // the keeper (`rest`, 2H.9). See `restNearness`.
  value +=
    w.guardFurnace *
    (w.rest > 0
      ? restNearness(cell, board.restCell, board.ownFurnace)
      : furnaceNearness(cell, board.ownFurnace));

  value -= w.avoidCrackers * crackerPressure(board, cell);
  if (w.parryPost > 0) value += w.parryPost * parryPost(board, cell);

  // The keeper's tether (`leash`): a cell further from its own mouth than the
  // role allows is not a place it goes, whatever else is out there. Lifted
  // while it holds the ball with a relaunch to make (Jérôme, 2026-10-11): it
  // steps out as far as a line to a team-mate needs, throws, and only then
  // is the tether read again and walks it home.
  const relaunching = unit.holdingPayload && w.relaunch > 0;
  if (!relaunching && rangeToFurnace(cell, board.ownFurnace) > w.leash) value -= 500;

  const hold = findOrder(board.orders, 'holdZone');
  if (hold) value += ORDER_PULL * nearness(cell, hold.at);

  return value;
}

/**
 * How exposed a cell is to a Cracker on the next count 20: one on a cell it
 * will roll through, half a cell beside that line, zero two cells off it.
 *
 * Until 2H.7 this read the distance to the Cracker, which was right when a
 * Cracker went for whoever was nearest (B8) and wrong from écart 45 on: a
 * Cracker rolls at the ball, so the danger is on the line between the two and
 * nowhere else, and a unit six cells from a Cracker but on its way to the
 * carrier was reading itself safe. The line is `Board.crackerLines`, the
 * engine's own run with this unit taken off the board, so it is the line as
 * it would be with this unit standing on the cell. The cell beside the line
 * still reads something because the ball moves before the count comes.
 */
export function crackerPressure(board: Board, cell: Point): number {
  let worst = 0;
  for (const line of board.crackerLines) {
    for (const p of line) {
      const gap = distance(cell, p);
      if (gap >= 2) continue;
      worst = Math.max(worst, gap === 0 ? 1 : 0.5);
      if (worst === 1) return 1;
    }
  }
  return worst;
}

export function unitOf(state: MatchState, id: UnitId): Unit {
  const unit = state.units.find((u) => u.id === id);
  if (!unit) throw new Error(`no unit with id ${id}`);
  return unit;
}
