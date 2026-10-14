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
  BAT_DAMAGE_DIE,
  CRACKER_DAMAGE_DICE,
  CRACKER_DAMAGE_DIE,
  CRACKER_MOVE_CELLS,
  CRACKER_SAVE_DC,
  MATCH_ROUNDS,
  MOVE_SPEED_FEET,
  PAYLOAD_RANGE_CELLS,
  SPARK_CATCH_DC,
} from '../engine/constants.js';
import { DIRECTIONS, distance, inBounds, lineTo, type Point } from '../engine/geometry.js';
import type { LegalActions } from '../engine/legalActions.js';
import {
  blockingBulwark,
  rangeToFurnace,
  shotTarget,
  throwRange,
  throwRangeOver,
  visibleRangeToFurnace,
} from '../engine/rules/payload.js';
import { hasPlayedThisRound, sideOrder } from '../engine/initiative.js';
import { key, reachableCells } from '../engine/rules/movement.js';
import { crackerRun } from '../engine/rules/ordnance.js';
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
   * Who each of those lines ends on (2H.11, `00` C13 point 23): the player
   * the Cracker would go off on if this unit does not step into its way, or
   * null when it would reach nobody. Read by `parryPost`, which is worth the
   * blast it spares a team-mate and nothing when the line ends on an opponent.
   */
  readonly crackerStrikes: readonly (Unit | null)[];
  /**
   * Whether this unit is hunting the Spark right now: the Spark is on the
   * field and this role chases it (`chaseSpark` above zero, the Trajector).
   * Jérôme, 2026-10-11: while it is on the field the hunter chases it and
   * nothing else, drops out of attack and defence, and takes the opportunity
   * attack if it starts its turn in a melee.
   */
  readonly hunter: boolean;
  /**
   * Whether this unit, having shot this turn and missed, leaves the rebound
   * alone (2H.13, `00` C15 point 3, Jérôme): true when the ball lies loose
   * and a team-mate still to play this round reaches its cell with a move,
   * sixteen cells for a Breaker, which dashes to it. Then the ball's cell is
   * worth nothing to the shooter and the pickup is not offered, so the next
   * shot is somebody else's. With nobody to take it, the shooter takes it
   * back: safer in hand than on the floor.
   */
  readonly shooterYields: boolean;
  /**
   * The threats to this unit as a carrier (2H.10, `carrierSafety`): every
   * opponent who plays again before this unit's next turn, with the cells it
   * can finish a plain move on and its odds of shoving the ball loose. Built
   * when this unit carries, and since 2H.11 also when the ball lies loose,
   * because the cell the ball lies in is priced as a carrier's end of turn
   * once the Action is spent (`00` C13 point 10). Empty when its role reads
   * no safety.
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
  /**
   * The last round of the match, or sudden death (2H.11, `00` C13 point 17):
   * the one time the AI reads the clock and the score.
   */
  readonly lastRound: boolean;
  /**
   * Whether this unit's side plays the possession (2H.11, point 17): the last
   * round, the ball in our hands, and the score level or in our favour. The
   * carrier walks away from everybody, throws only to somebody less exposed
   * than itself, shoots only in clean range.
   */
  readonly possession: boolean;
  /**
   * Whether this unit's side is chasing a ball it cannot have before the
   * whistle (2H.11, point 17): the last round and the other side carrying. No
   * running after a carrier out of reach; swing and shove what is in reach.
   */
  readonly whistle: boolean;
  /**
   * The other side's probable receivers while its keeper relaunches (2H.11,
   * `00` C13 point 22): every opponent the carrying keeper could throw to
   * after a plain move of its own, in sight and in range. They count double
   * as prey, and the Breaker ends its turn beside one with its Action spent.
   * Empty unless the other side's Bulwark holds the ball.
   */
  readonly relaunchReceivers: ReadonlySet<UnitId>;
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
  const crackerRuns = state.crackers.filter((c) => c.state === 'live').map((c) => crackerRun(arena, without, c));
  const crackerLines = crackerRuns.map((run) => run.path);
  const crackerStrikes = crackerRuns.map((run) => run.struck);

  const carrier = carried ? (state.units.find((u) => u.id === carried) ?? null) : null;
  const mates = others.filter((u) => u.team === unit.team);
  const enemies = others.filter((u) => u.team !== unit.team);
  const targetFurnace = arena.targetFurnaceOf(unit.team);

  // The shooter leaves its rebound to a team-mate still to play (2H.13).
  const shooterYields =
    state.turn !== null &&
    state.turn.unitId === unit.id &&
    state.turn.shot &&
    carried === null &&
    mates.some(
      (mate) =>
        !hasPlayedThisRound(state, mate.id) &&
        // Reach, not distance: a crate or a wall of opponents between the
        // mate and the ball is a ball the mate cannot take. A Breaker dashes
        // to it (`pickupFirst`), so its reach is two moves.
        reachableCells(arena, state, mate, (weightsFor(mate.role).pickupFirst > 0 ? 2 : 1) * MOVE_SPEED_FEET).has(
          key(state.payload),
        ),
    );

  const threats =
    (unit.holdingPayload || carried === null) && weights.carrierSafety > 0 && weights.relaunch === 0
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
  if (ward) {
    // A keeper carrying the ball stays on its leash and never runs the line
    // to the far mouth: its team-mates read it where it stands (2H.13, `00`
    // C15 point 5), which is what brings them back within a throw of the
    // relaunch (écart 62).
    const played = hasPlayedThisRound(state, ward.id) || ward.role === 'bulwark';
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
  }

  // The clock and the score (2H.11, point 17): read on the last round only.
  const lastRound = state.round >= MATCH_ROUNDS || state.phase === 'suddenDeath';
  const ours = carrier !== null && carrier.team === unit.team;
  const theirs = carrier !== null && carrier.team !== unit.team;
  const other = unit.team === 'A' ? 'B' : 'A';
  const possession = lastRound && ours && state.score[unit.team] >= state.score[other];
  const whistle = lastRound && theirs;

  const relaunchReceivers =
    foe && foe.role === 'bulwark' && weights.hunt > 0 ? relaunchTargets(arena, state, foe) : new Set<UnitId>();

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
    crackerStrikes,
    hunter: sparkIsLive(state.spark) && weights.chaseSpark > 0,
    shooterYields,
    threats,
    carrierReachable,
    carrierCanServe,
    wardLine,
    lastRound,
    possession,
    whistle,
    relaunchReceivers,
  };
}

/**
 * The opponents a relaunching keeper could serve after a plain move of its
 * own (2H.11, point 22): for each, some cell the keeper can walk to has it in
 * throwing range and in sight. The keeper's reach is read off the engine, so
 * a cell it cannot enter is not a cell it throws from.
 */
function relaunchTargets(arena: Arena, state: MatchState, keeper: Unit): Set<UnitId> {
  const cells: Point[] = [{ x: keeper.x, y: keeper.y }];
  for (const r of reachableCells(arena, state, keeper, MOVE_SPEED_FEET).values()) cells.push(r.cell);
  const out = new Set<UnitId>();
  for (const mate of activeUnits(state)) {
    if (mate.team !== keeper.team || mate.id === keeper.id) continue;
    if (cells.some((c) => throwRange(c, mate).ok && hasLineOfSight(arena, c, mate))) out.add(mate.id);
  }
  return out;
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
    // The other side's keeper is on a leash (2H.11, point 16): it threatens
    // nothing further from its mouth than its role lets it go.
    const leash = weightsFor(enemy.role).leash;
    const home = arena.furnaceOf(enemy.team);
    for (const [k, r] of reachableCells(arena, state, enemy, MOVE_SPEED_FEET)) {
      if (rangeToFurnace(r.cell, home) > leash) continue;
      reach.add(k);
    }
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
export function carrierExposure(
  board: Board,
  cell: Point,
  threats: readonly CarrierThreat[] = board.threats,
  mates: readonly Unit[] = board.mates,
): number {
  if (threats.length === 0) return 0;
  const { arena } = board;
  let free = 0;
  const around: string[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const p = { x: cell.x + dx, y: cell.y + dy };
      if (p.x < 0 || p.y < 0 || p.x >= ARENA_WIDTH || p.y >= ARENA_HEIGHT || arena.isSolid(p)) continue;
      const mateThere = mates.some((m) => m.x === p.x && m.y === p.y);
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
  for (const threat of threats) {
    if (counted >= free) break;
    const canArrive = around.some((k) => threat.reach.has(k));
    if (!canArrive) continue;
    exposure += threat.odds;
    counted++;
  }
  return exposure;
}

/**
 * How exposed a team-mate would be holding the ball where it stands (2H.11,
 * `00` C13 point 14): the same count as `carrierExposure`, read for the
 * receiver of a pass. A receiver still to play this round moves before any
 * opponent can come at it, so it reads zero; one that has played holds the
 * ball through every opponent's turn until its own comes round, and its cell
 * is priced on the threats that get there first, the thrower standing where
 * it throws from counting as a team-mate beside it.
 */
export function receiverExposure(board: Board, mate: Unit, throwerAt: Point): number {
  const { arena, state, unit } = board;
  if (!hasPlayedThisRound(state, mate.id)) return 0;
  let perBoard = receiverThreats.get(board);
  if (!perBoard) {
    perBoard = new Map();
    receiverThreats.set(board, perBoard);
  }
  let threats = perBoard.get(mate.id);
  if (!threats) {
    threats = carrierThreats(arena, state, mate, board.enemies);
    perBoard.set(mate.id, threats);
  }
  const mates = [...board.mates.filter((m) => m.id !== mate.id), { ...unit, x: throwerAt.x, y: throwerAt.y }];
  return carrierExposure(board, { x: mate.x, y: mate.y }, threats, mates);
}

/** The threats to each receiver, once per board: seven sweeps a receiver are not free. */
const receiverThreats = new WeakMap<Board, Map<UnitId, CarrierThreat[]>>();

// -- Prey ---------------------------------------------------------------------

/** The average of a bat that lands: a d8 plus the swinger's might. */
function batAverage(might: number): number {
  return (BAT_DAMAGE_DIE + 1) / 2 + might;
}

/**
 * What a swing at `target` is worth to this unit as a share of `attack`
 * (2H.11, `00` C13 point 21, replacing the fixed table of C10 Breaker 4 and
 * C12 Breaker 9): the expected damage of the bat over the target's hit
 * points left, which is its chance of being evacuated, read against the same
 * share for a fresh Striker of the swinger's tier so that a swing at a full
 * Striker is still worth `attack` and the table keeps its scale. A Trajector
 * on twenty-five hit points reads above a Striker on thirty, a Breaker on
 * fifty under both, and anybody one bat from the tunnel reads three or four
 * Strikers. One for a role that weighs every shirt the same (`preyByHp` 0).
 */
export function prey(board: Board, target: Unit): number {
  const { unit, weights: w } = board;
  if (w.preyByHp === 0) return 1;
  const stats = statsFor(unit.role, unit.tier);
  const share = Math.min(1, batAverage(stats.might) / Math.max(1, target.hp));
  const baseline = Math.min(1, batAverage(stats.might) / statsFor('striker', unit.tier).hp);
  return share / baseline;
}

/**
 * What a Cracker is expected to take off a player it goes off on: 3d6, or
 * half on a made save against the player's agility.
 */
export function crackerAverage(target: Unit): number {
  const saves = chance(statsFor(target.role, target.tier).agility, CRACKER_SAVE_DC);
  const full = CRACKER_DAMAGE_DICE * ((CRACKER_DAMAGE_DIE + 1) / 2);
  return (1 - saves) * full + saves * Math.floor(full / 2);
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
/**
 * How far into clean shooting range a cell is, zero at the edge of range or
 * outside it or out of sight, one at the mouth itself (2H.13, point 2).
 */
export function depthInRange(arena: Arena, from: Point, furnace: Furnace): number {
  const seen = visibleRange(arena, from, furnace);
  if (seen === null || seen > PAYLOAD_RANGE_CELLS) return 0;
  return (PAYLOAD_RANGE_CELLS - seen) / PAYLOAD_RANGE_CELLS;
}

/** The share of `carryToFurnace` the depth inside clean range adds at the mouth (2H.13, point 2). */
export const DEEP_STEP = 0.15;

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

  // Read against where the carrier will be (2H.11, `00` C13 point 3): its
  // cell once it has played, otherwise every cell of its way to the mouth,
  // the best of them. A relay priced against a carrier still to run was worth
  // nothing as soon as the relay had to run ahead of it.
  let best = 0;
  for (const at of carrierStands(board)) {
    const reach = passReach(cell, at);
    if (reach === 0) continue;
    if (!hasLineOfSight(board.arena, at, cell)) continue;

    const gained = rangeToFurnace(at, board.targetFurnace) - rangeToFurnace(cell, board.targetFurnace);
    const progress = Math.min(1, Math.max(0, gained / PAYLOAD_RANGE_CELLS));

    best = Math.max(best, reach * (progress + shotQuality(board, board.unit, cell)));
  }
  return best;
}

/**
 * The cells our own carrier is read from by its team-mates (2H.11, point 3):
 * `wardLine` without the cells a crate fills, or the carrier's own cell when
 * the line is empty.
 */
export function carrierStands(board: Board): readonly Point[] {
  const open = board.wardLine.filter((p) => !board.arena.isSolid(p));
  if (open.length > 0) return open;
  return board.carrier ? [{ x: board.carrier.x, y: board.carrier.y }] : [];
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

  let best = 0;
  for (const at of carrierStands(board)) {
    const reach = passReach(cell, at);
    if (reach === 0 || distance(cell, at) === 0) continue;
    if (!hasLineOfSight(board.arena, at, cell)) continue;

    const defenders = passInterceptors(
      board.arena,
      board.state,
      { ...carrier, x: at.x, y: at.y },
      lineTo(at, cell),
    ).length;
    best = Math.max(best, reach * Math.max(0, 1 - defenders * 0.5));
  }
  return best;
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
  // the pitch still walks over. No side, no lane. Worth the same whether or
  // not an opponent can reach the carrier (2H.11, point 19). A carrier still
  // to play will have moved: the place is on its way to the mouth, and worth
  // more the further along that way it is (`wardLine`). On a tie, the place
  // between the carrier and the nearest opponent (2H.11, point 18): a
  // tie-break and nothing more.
  const threat = nearestTo(board.enemies, carrier);
  const line = board.wardLine;
  let best = 0;
  for (let i = 0; i < line.length; i++) {
    const along = line.length === 1 ? 1 : 0.5 + (0.5 * i) / (line.length - 1);
    let place = along * shoulder(cell, line[i]!, null);
    if (threat && distance(cell, threat) < distance(line[i]!, threat)) place *= 1 + TIE_BREAK;
    best = Math.max(best, place);
  }
  return wanted * best;
}

/** What settles a tie and nothing else: a thousandth of the place. */
const TIE_BREAK = 0.001;

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
    best = Math.max(best, preyOf(board, enemy));
  }
  return best;
}

/**
 * The prey an opponent makes, the probable receiver of a relaunch counting
 * double (2H.11, point 22).
 */
export function preyOf(board: Board, enemy: Unit): number {
  return prey(board, enemy) * (board.relaunchReceivers.has(enemy.id) ? 2 : 1);
}

/** One beside a probable receiver of the other side's relaunch, scaled by its prey. */
function receiverAdjacency(board: Board, cell: Point): number {
  if (board.relaunchReceivers.size === 0) return 0;
  let best = 0;
  for (const enemy of board.enemies) {
    if (!board.relaunchReceivers.has(enemy.id) || distance(enemy, cell) !== 1) continue;
    best = Math.max(best, preyOf(board, enemy));
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
 * What standing on a cell a Cracker will roll through at the next count 20
 * spares (2H.11, `00` C13 point 23): the blast it would take off the
 * team-mate the line ends on, over that team-mate's hit points, which is the
 * currency a route's opportunity attacks are priced in. Zero when the line
 * ends on an opponent, on nobody, or on the loose ball, and zero for a unit
 * that cannot parry there: a carrier does not swing (écart 47). The Breaker's
 * positive reading of the Cracker line; see `crackerPressure` for everybody
 * else's.
 */
export function parryPost(board: Board, cell: Point): number {
  if (board.unit.holdingPayload) return 0;
  // Never a Cracker line before a loose ball within a move (2H.10): the
  // Breaker that walked off to a line and left the ball three cells away
  // handed it to the other side. Unless the ball is a keener team-mate's to
  // take (C12 commune 6), in which case the line is where it is useful.
  const { state, unit } = board;
  const loose = state.payload.carriedBy === null;
  if (loose && distance(unit, state.payload) <= MOVE_SPEED_FEET / 5 && loosePayloadShare(board) > 0) return 0;
  let best = 0;
  board.crackerLines.forEach((line, i) => {
    if (!line.some((p) => p.x === cell.x && p.y === cell.y)) return;
    let spared = board.crackerStrikes[i];
    // A line that ends on the loose ball ends on whoever takes it next: the
    // nearest team-mate still to play within a move of it, if any.
    if (!spared && loose) {
      const end = line[line.length - 1]!;
      if (end.x === state.payload.x && end.y === state.payload.y) spared = nextTaker(board);
    }
    if (!spared || spared.team !== unit.team || spared.id === unit.id) return;
    best = Math.max(best, crackerAverage(spared) / Math.max(1, spared.hp));
  });
  return best;
}

/** The team-mate likeliest to take a loose ball next: nearest to it, still to play, within a move. */
function nextTaker(board: Board): Unit | null {
  const { state } = board;
  let best: Unit | null = null;
  for (const mate of board.mates) {
    if (hasPlayedThisRound(state, mate.id) || distance(mate, state.payload) > MOVE_SPEED_FEET / 5) continue;
    if (!best || distance(mate, state.payload) < distance(best, state.payload)) best = mate;
  }
  return best;
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
    // The hunter aims at the cell the Spark is in. It used to aim at where
    // the drift would carry it (2H.10), the heading being known; since écart
    // 59 (2H.13) the drift rolls a fresh face every round away from the
    // Trajectors, so there is nothing to anticipate. The cell it is in now is
    // worth the catch while the Action is there, and a little less than
    // nothing without it, since the Spark skips away from under a minder
    // (écart 49).
    const goal = { x: state.spark.x, y: state.spark.y };
    let hunt = w.chaseSpark * nearness(cell, goal);
    if (onSpark) {
      // A carrier cannot try (écart 57): with the ball in hand the cell is
      // only the one the Spark skips away from.
      hunt +=
        actionLeft && !unit.holdingPayload
          ? w.catchSpark * chance(statsFor(unit.role, unit.tier).agility, SPARK_CATCH_DC)
          : -w.chaseSpark * 0.2;
    }
    return hunt - w.avoidCrackers * crackerPressure(board, cell);
  }

  if (unit.holdingPayload) {
    value += carrierEnd(board, cell, true);
    // A Breaker that carries does not parry (écart 47): it fears the Cracker
    // line like everybody else. The line is read towards the cell, since the
    // ball goes where the carrier goes (2H.11, point 27).
    if (w.avoidCrackers < CARRIER_CRACKER_FEAR) {
      value -= (CARRIER_CRACKER_FEAR - w.avoidCrackers) * carrierCrackerPressure(board, cell);
    }
  } else if (state.payload.carriedBy === null) {
    // A Breaker leaves the ball to a Striker standing beside it: see
    // `keenerMateNear`. Everybody else reads a share of one. A keeper only
    // goes for a ball lying within its reach (`looseBallReach`). And the
    // kick-off ball, which nobody has carried yet, is a Striker's to take:
    // the Trajector reads `chaseKickoff` zero and keeps itself for the throw.
    const kickoff = state.lastCarrierTeam === null ? w.chaseKickoff : 1;
    // The shooter leaves its rebound to a team-mate still to play (2H.13,
    // `00` C15 point 3): nothing about the ball pulls it, not even the cell.
    const share =
      distance(unit, state.payload) > w.looseBallReach || board.shooterYields ? 0 : loosePayloadShare(board) * kickoff;
    value += w.chaseLoosePayload * share * nearness(cell, state.payload);
    // The cell the ball is actually lying in is worth the pickup, not one more
    // step of gradient. Without this the last cell gains `chaseLoosePayload/45`,
    // about one point, and a unit will stand beside a loose Payload for the
    // whole match rather than step onto it. A proximity term cannot express
    // "and then I may have the ball": only the value of the action it unlocks
    // can, and `grabPayload` is free, so nothing is being double counted.
    // With the Action spent (2H.11, `00` C13 point 10) the cell is worth a
    // carrier's end of turn, ground and safety, never the pickup: falling
    // back onto the ball after a swing is not a way of fetching it.
    if (cell.x === state.payload.x && cell.y === state.payload.y) {
      value += actionLeft ? w.grabPayload * share : share * carrierEnd(board, cell, false);
    }
  } else if (board.carrier && board.carrier.team === unit.team) {
    // Towards where the carrier will be (2H.11, point 3), see `carrierStands`.
    const stands = carrierStands(board);
    let closeness = 0;
    for (const at of stands) closeness = Math.max(closeness, nearness(cell, at));
    value += w.screenCarrier * closeness;
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
    if (stands.every((at) => passReach(unit, at) === 0)) value += w.rejoin * closeness;
  } else if (board.carrier) {
    // On the last round, a carrier out of reach is not run after (2H.11,
    // point 17): only the contact is worth anything, and the swings are
    // priced as actions.
    if (!board.whistle) value += w.pressCarrier * nearness(cell, board.carrier);
    // The cell beside the carrier is the one that makes the Shove legal and
    // holds the opportunity attack when the carrier leaves: it is worth the
    // press itself, not one more step of gradient. Jérôme, 2H.8: a Striker
    // presses the carrier "coûte que coûte", and finishes adjacent.
    if (distance(cell, board.carrier) === 1) value += w.pressCarrier;
    // The carrier out of reach of a plain move, the Breaker swings at whoever
    // is in reach, the likeliest to evacuate first (`hunt`, `prey`); within
    // reach, the carrier comes first (C10 Breaker 3 before 4). Beside a prey
    // without an Action left is worth nothing (2H.10), except beside the
    // probable receiver of a relaunch, where the Breaker ends its turn
    // (2H.11, point 22).
    if (w.hunt > 0 && actionLeft && !board.carrierReachable) value += w.hunt * preyAdjacency(board, cell);
    if (w.hunt > 0 && !actionLeft) value += w.hunt * receiverAdjacency(board, cell);
  }

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
  // The parry post is worth the blast it spares, in the currency of the
  // opportunity attack (2H.11, point 23).
  if (w.parryPost > 0) value += w.parryPost * w.avoidOpportunity * parryPost(board, cell);

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
 * What a cell is worth as the end of a carrier's turn: the ground towards the
 * mouth, less the opponents that can come and shove the ball loose before the
 * carrier plays again (2H.10), plus the clean shot held for next turn when
 * none can. On the last round with the score in hand (2H.11, point 17) the
 * ground is read the other way: away from every opponent, the possession and
 * nothing else. `held` says whether the unit holds the ball now; with it loose
 * under the cell (point 10) the shot held for next turn is not counted, the
 * pickup not having been priced either.
 */
export function carrierEnd(board: Board, cell: Point, held: boolean): number {
  const { unit, weights: w } = board;
  let value = 0;
  if (board.possession) {
    let nearest = ARENA_HEIGHT;
    for (const enemy of board.enemies) nearest = Math.min(nearest, distance(cell, enemy));
    value += w.carryToFurnace * Math.min(1, nearest / ARENA_HEIGHT);
  } else {
    value += w.carryToFurnace * scoringNearness(board.arena, cell, board.targetFurnace);
    // Inside clean range every cell used to read the same ground, so a
    // carrier dashed to the first cell with a clean shot and stopped twelve
    // cells into sixteen (2H.13, `00` C15 point 2, Jérôme: "un Dash consomme
    // toutes les cases"). The ground keeps counting to the mouth, a little
    // per cell: less than one opponent's worth of exposure, so a cell that
    // is more exposed or out of sight still loses.
    value += w.carryToFurnace * DEEP_STEP * depthInRange(board.arena, cell, board.targetFurnace);
  }
  // The ball is lost between two turns (2H.10): what the end cell is worth
  // is less by every opponent that can come and shove on it first, and
  // more by the clean shot held for next turn when none can.
  if (w.carrierSafety > 0) {
    const exposure = carrierExposure(board, cell);
    value -= w.carrierSafety * exposure;
    if (held && !board.possession && exposure === 0 && w.shoot > 0) {
      value += w.shoot * HOLD_FOR_CLEAN * bestShotNextTurn(board, unit, cell);
    }
  }
  return value;
}

/**
 * `crackerPressure` for a carrier (2H.11, `00` C13 point 27): the line a
 * Cracker rolls down goes to the ball, and the ball goes where the carrier
 * goes, so the line is read towards the cell the carrier would end on, not
 * towards where it stands now. Two cells that read the same on the standing
 * line were eight cells of roll apart.
 */
export function carrierCrackerPressure(board: Board, cell: Point): number {
  let worst = 0;
  for (const field of crackerFields(board)) {
    // The Cracker rolls `CRACKER_MOVE_CELLS` cells of the shortest way to the
    // ball: on the carrier's cell when that is within its roll, a cell short
    // of it when the roll ends beside it. Read off a distance field from the
    // Cracker, one sweep per Cracker and per decision, instead of a path per
    // candidate cell: the path cost a whole match three times over.
    const steps = field[cell.y * ARENA_WIDTH + cell.x]!;
    if (steps < 0) continue;
    if (steps <= CRACKER_MOVE_CELLS) return 1;
    if (steps === CRACKER_MOVE_CELLS + 1) worst = 0.5;
  }
  return worst;
}

const crackerFieldCache = new WeakMap<Board, Int16Array[]>();

/**
 * For each live Cracker, how many cells of rolling it takes to reach every
 * cell of the pitch round the obstacles, -1 for a cell it cannot reach, this
 * unit taken off the board like everybody else: the Cracker goes off on the
 * first player it meets, and that is the other side's problem to price.
 */
function crackerFields(board: Board): Int16Array[] {
  let fields = crackerFieldCache.get(board);
  if (fields) return fields;
  const { arena, state } = board;
  fields = [];
  for (const cracker of state.crackers) {
    if (cracker.state !== 'live') continue;
    const field = new Int16Array(ARENA_WIDTH * ARENA_HEIGHT).fill(-1);
    const queue: Point[] = [{ x: cracker.x, y: cracker.y }];
    field[cracker.y * ARENA_WIDTH + cracker.x] = 0;
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head]!;
      const steps = field[at.y * ARENA_WIDTH + at.x]!;
      if (steps > CRACKER_MOVE_CELLS) continue;
      for (const d of DIRECTIONS) {
        const next = { x: at.x + d.x, y: at.y + d.y };
        if (!inBounds(next) || arena.isSolid(next)) continue;
        const k = next.y * ARENA_WIDTH + next.x;
        if (field[k]! >= 0) continue;
        field[k] = steps + 1;
        queue.push(next);
      }
    }
    fields.push(field);
  }
  crackerFieldCache.set(board, fields);
  return fields;
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
