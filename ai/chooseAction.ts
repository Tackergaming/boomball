/**
 * The decision.
 *
 * **It decides, it never resolves.** The AI asks `legalActions` what it may do,
 * scores every one of those candidates, and hands the winner to `reduce` the
 * way a human client does. It cannot cheat even by accident, and a match plays
 * back identically whoever was driving.
 *
 * **It scores turns, not actions** (2H.9, `00` C11, Jérôme's third pass).
 * Until 2H.8 it priced one action at a time and started over until the turn
 * was spent, which made it blind to any sequence: the Dash was priced on the
 * movement left over, so it was worth nothing after the walk; "go home, then
 * dig in" did not exist; "walk, then swing" was never weighed against "swing,
 * then walk". Thirty-two turns in a hundred and thirty-six ended with the
 * Action in the pocket. So a candidate is a **plan**: Dash or not, the cell to
 * walk to, the action taken from that cell, and the cell to fall back to with
 * the movement left. The board at the end of the plan is read by the same role
 * weights as before (`positionValue`), the action by the same appetites, and
 * the four tables in `ai/roles/` stay the data Jérôme dictates.
 *
 * **A plan is read at its end, Action spent** (2H.10, `00` C12, Jérôme's
 * fourth pass, after the engine 5 game). Every end cell is priced with the
 * Action gone, so a cell is worth the action it unlocks only through the plan
 * that takes it: "walk onto the Spark, then catch" is a plan, "Dodge, then
 * walk onto the Spark" is not worth the catch, and finishing beside a prey
 * without a swing left is worth nothing. A swing moves the swinger back two
 * cells (écart 33) and the plan knows it. Every route is the safe one,
 * crossing no opponent's reach when the movement allows a way round, and the
 * opportunity attacks a route still provokes are priced at what they cost in
 * hit points. The ball is picked up and thrown in the one plan. A carrier
 * ends its turn where the fewest opponents can come and shove it.
 *
 * **The fifth pass** (2H.11, `00` C13, Jérôme's reading of the engine 6 game
 * round by round). Only the Spark hunter walks onto the Spark; the three field
 * roles dash towards the other side's carrier for the ground it closes, and
 * the wall and the approach are priced the same before and after the walk;
 * after a Dash the walk goes to the end of what the Dash bought; Disengage is
 * open to anybody pressed; a receiver still to play may be a whole move
 * behind; the cell the ball lies in is a carrier's end of turn once the
 * Action is spent; a carrier never walks backwards unless nothing ahead is
 * safer; a shot is relieved like a pass and a pass never outprices the clean
 * shot a Striker has itself; a pass is priced on the receiver's exposure; an
 * opportunity attack costs five points at the least; the last round reads
 * the score.
 *
 * One call still returns **one** action: the first step of the best plan. The
 * caller loops until it gets `endTurn` back, exactly as an interface loops on
 * clicks, and the plan is rebuilt from scratch after every step, because the
 * dice have spoken in between.
 *
 * Doing nothing scores zero, so a unit ends its turn as soon as nothing on the
 * board beats it. But the Action is never left in the pocket on purpose: when
 * no plan uses it, the Dash is the fallback, worth the ground it buys, and
 * Dodge stays the last resort of C10, hurt to half and nothing to do.
 */

import type { Action } from '../engine/actions.js';
import type { Arena } from '../engine/arena.js';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BAT_DAMAGE_DIE,
  CRACKER_AC,
  CRACKER_DAMAGE_DICE,
  CRACKER_DAMAGE_DIE,
  CRACKER_SAVE_DC,
  MOVE_SPEED_FEET,
  PAYLOAD_PASS_AC,
  PAYLOAD_RANGE_CELLS,
} from '../engine/constants.js';
import { sparkIsLive } from '../engine/types.js';
import { recoilDestination } from '../engine/rules/combat.js';
import {
  safePathTo,
  safeReachableCells,
  type SafeReachable,
} from '../engine/rules/movement.js';
import { distance, lineTo, type Point } from '../engine/geometry.js';
import {
  actionOptionsAt,
  legalActions,
  type ActionOptions,
  type TargetOption,
} from '../engine/legalActions.js';
import { battedCrackerRun } from '../engine/rules/ordnance.js';
import { rangeToFurnace } from '../engine/rules/payload.js';
import { passInterceptors, provokedAlong } from '../engine/rules/reactions.js';
import { statsFor } from '../engine/stats.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import {
  bestShotNextTurn,
  buildBoard,
  carrierExposure,
  chance,
  contestChance,
  hasPlayedThisRound,
  isLastLink,
  keenerMateNear,
  nextToPlay,
  ORDER_PULL,
  positionValue,
  preyOf,
  receiverExposure,
  shotQuality,
  unitOf,
  visibleRange,
  type Board,
} from './evaluate.js';
import { findOrder, ordersFor, type AllyOrder } from './orders.js';
import { weightsFor } from './roles/index.js';

/** One thing the unit could do next, what the turn built on it is worth, and why. */
export interface Candidate {
  readonly action: Action;
  readonly score: number;
  /** Plain words, for a debug overlay and for reading a failing test. */
  readonly why: string;
}

/** A whole turn as the AI means to play it, best first step first. */
export interface Plan {
  /** Played in order; the plan is rebuilt after each, so only the first is sent. */
  readonly steps: readonly Action[];
  readonly score: number;
  readonly why: string;
  /**
   * The opportunity attacks its routes provoke (2H.11, `00` C13 point 15):
   * on a tie, the plan that provokes fewer wins.
   */
  readonly provocations?: number;
}

/**
 * Every plan, best first. Exported because an AI you cannot look inside is an
 * AI you cannot tune: a test asserts on why it chose, not only on what.
 */
export function rankPlans(
  arena: Arena,
  state: MatchState,
  unitId: UnitId,
  orders: readonly AllyOrder[] = [],
): Plan[] {
  const legal = legalActions(arena, state);
  if (!legal || legal.unitId !== unitId) return [];

  const unit = unitOf(state, unitId);
  const board = buildBoard(arena, state, unit, legal, weightsFor(unit.role), ordersFor(orders, unitId));

  return rank(new Planner(board).plans());
}

/**
 * Every candidate next step, best first: the plans of `rankPlans` folded on
 * their first step, each step keeping the best plan that starts with it.
 */
export function rankActions(
  arena: Arena,
  state: MatchState,
  unitId: UnitId,
  orders: readonly AllyOrder[] = [],
): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const plan of rankPlans(arena, state, unitId, orders)) {
    const action = plan.steps[0] ?? END_TURN;
    const key = actionKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ action, score: plan.score, why: plan.why });
  }
  return out;
}

/**
 * The one action to send next. Falls back to ending the turn, which is always
 * legal, so this never returns nothing and never stalls a match.
 */
export function chooseAction(
  arena: Arena,
  state: MatchState,
  unitId: UnitId,
  orders: readonly AllyOrder[] = [],
): Action {
  return rankPlans(arena, state, unitId, orders)[0]?.steps[0] ?? END_TURN;
}

const END_TURN: Action = { kind: 'endTurn' };

// -- The planner --------------------------------------------------------------

/** An action priced at a cell, before any walking is added. */
interface Priced {
  readonly action: Action;
  readonly value: number;
  readonly why: string;
  /** Where the unit stands once the action is done: two cells back after a swing (écart 33). */
  readonly landing: Point;
}

/** Where a plan falls back to once it has acted, and what that is worth. */
interface Retreat {
  readonly path: readonly Point[];
  readonly gain: number;
}

/**
 * The plans of one decision. Everything is a pure function of the board, so
 * the same state gives the same plan and a match replays whoever was driving.
 */
class Planner {
  private readonly here: Point;
  /** `positionValue` with the Action spent, once per cell: every plan ends with it spent. */
  private readonly values = new Float64Array(ARENA_WIDTH * ARENA_HEIGHT).fill(NaN);
  private readonly pvHere: number;
  /** Whether a legitimate target for this role is in reach from where the unit stands. */
  private readonly violence: boolean;
  /** The safe routes of a plain move: fewest opportunity attacks first, fewest feet second. */
  private readonly reach: Map<string, SafeReachable>;
  /** The board with this unit moved to a cell, built once per cell asked. */
  private readonly moved = new Map<string, MatchState>();
  /**
   * What a throw relieves this carrier of (2H.10): the exposure priced into
   * the cell it stands on is a carrier's, and once the ball has left its hands
   * it is nobody's. Zero when the unit does not carry. The shot is relieved
   * exactly as the pass (2H.11, point 13).
   */
  private readonly relief: number;
  /** The exposure of the cell the unit stands on, for the carrier's rules below. */
  private readonly exposureHere: number;
  /**
   * The best shot this unit would have from any cell of its plain move, and
   * the best clean one (2H.11, point 13): a pass is priced against the shot
   * the thrower has itself after its walk, never against the cell it throws
   * from, and a Striker's pass never outprices its own clean shot.
   */
  private readonly ownShot: number;
  private readonly ownCleanShot: number;
  /**
   * Whether this unit has dashed this turn (2H.11, point 7): the Action is
   * gone and the movement left is more than a plain move. The walk then goes
   * to the end of what the Dash bought, priced by the same floors as the Dash.
   */
  private readonly dashed: boolean;
  /** The other side's carrier, when this role dashes or walks towards it. */
  private readonly foe: Unit | null;
  /** Where our own carrier will be, when this role walls for it. */
  private readonly wardAt: Point | null;
  private readonly ward: Unit | null;
  /** The nearest a plain move gets to the foe, and to the ward's place. */
  private readonly foeGap: number;
  private readonly wardGap: number;
  /** Whether no cell ahead of a carrier is safer than where it stands (2H.11, point 12). */
  private noSaferAhead: boolean | null = null;

  constructor(private readonly board: Board) {
    const { unit, state, arena, legal, weights: w } = board;
    this.here = { x: unit.x, y: unit.y };
    this.reach = safeReachableCells(arena, state, unit, state.turn!.movementFeetRemaining);
    this.pvHere = this.pv(this.here);
    this.exposureHere = unit.holdingPayload ? carrierExposure(board, this.here) : 0;
    this.relief = unit.holdingPayload ? w.carrierSafety * this.exposureHere : 0;
    this.dashed = !legal.canDash && state.turn!.movementFeetRemaining > MOVE_SPEED_FEET;

    let own = 0;
    let clean = 0;
    const cleanAt = (cell: Point): boolean => {
      const seen = visibleRange(arena, cell, board.targetFurnace);
      return seen !== null && seen <= PAYLOAD_RANGE_CELLS;
    };
    for (const cell of [this.here, ...[...this.reach.values()].map((r) => r.cell)]) {
      const q = shotQuality(board, unit, cell);
      own = Math.max(own, q);
      if (cleanAt(cell)) clean = Math.max(clean, q);
    }
    this.ownShot = own;
    this.ownCleanShot = clean;

    // The approach and the wall (2H.11, point 4; C10 Breaker 6). Read once:
    // the gap a plain move leaves, or the gap from here after a Dash.
    const carrier = board.carrier;
    const free = carrier !== null && !unit.holdingPayload && !board.hunter;
    // A hunter role (the Breaker) swings at an opponent it can reach before it
    // runs at the carrier (C10 Breaker 4, C13 point 20): no approach while a
    // prey is within a move's swing.
    const preyNear =
      w.hunt > 0 &&
      board.enemies.some((e) => distance(e, unit) <= 1 || [...this.reach.values()].some((r) => distance(e, r.cell) <= 1));
    this.foe =
      free && carrier.team !== unit.team && w.approachDash > 0 && w.pressCarrier > 0 && !board.whistle && !preyNear
        ? carrier
        : null;
    this.ward =
      free && carrier.team === unit.team && carrier.id !== unit.id && w.block > 0 && weightsFor(carrier.role).wantsEscort > 0
        ? carrier
        : null;
    this.wardAt = this.ward ? board.wardLine[board.wardLine.length - 1]! : null;
    const nearest = (target: Point): number => {
      let best = distance(unit, target);
      if (this.dashed) return best;
      for (const { cell } of this.reach.values()) best = Math.min(best, distance(cell, target));
      return best;
    };
    this.foeGap = this.foe ? nearest(this.foe) : Infinity;
    this.wardGap = this.wardAt ? nearest(this.wardAt) : Infinity;

    // A target is legitimate for every role when it carries the ball; for the
    // Breaker, which hunts, whoever is in reach and any Cracker (C10 commune
    // 3, read in 2H.10: "une cible légitime pour son rôle"). A Striker beside
    // a bystander still dashes if it has somewhere to be.
    const foe = board.carrier && board.carrier.team !== unit.team ? board.carrier : null;
    const carrierBeside = foe !== null && distance(unit, foe) <= 1;
    const anyone = w.hunt > 0 && legal.attack.length + legal.shove.length + legal.batCracker.length > 0;
    this.violence = carrierBeside || anyone;
  }

  plans(): Plan[] {
    const { legal, unit, weights: w, state, arena } = this.board;
    const out: Plan[] = [
      // The baseline every appetite has to beat.
      { steps: [], score: 0, why: 'nothing on the board is worth a move' },
    ];

    const hasAction = legal.canDash;

    // -- Acting from here, then falling back.
    if (hasAction) {
      for (const priced of this.actionsAt(this.here, legal, null, state)) {
        if (isThrow(priced.action)) {
          // A throw, shot or pass, is a relief (2H.11, point 13).
          out.push({ steps: [priced.action], score: priced.value + this.relief, why: priced.why });
          continue;
        }
        const left = state.turn!.movementFeetRemaining;
        const moved = this.pv(priced.landing) - this.pvHere;
        const retreat = this.retreatFrom(priced.landing, left, unit.braced);
        out.push(this.withRetreat([priced.action], priced.value + moved, priced.why, retreat));
      }
      if (legal.canBrace && !unit.braced) {
        out.push({ steps: [{ kind: 'brace' }], score: w.brace, why: 'dig in' });
      }
    }

    // The pickup is free and the plan is rebuilt once the ball is in hand.
    // Left to a keener team-mate who has not played, it is not picked up at
    // all, nor picked up and thrown (C12 commune 6).
    const share = keenerMateNear(this.board) ? 1 - w.yieldToKeener : 1;
    if (legal.canGrabPayload && share > 0) {
      out.push({
        steps: [{ kind: 'grabPayload' }],
        score: w.grabPayload * share,
        why: share === 1 ? 'the Payload is loose in this cell' : 'the Payload is loose here, but a mate wants it more',
      });
      // Picked up and thrown in the one turn (2H.10).
      if (hasAction) {
        for (const priced of this.throwsAfterPickup(this.here)) {
          out.push({
            steps: [{ kind: 'grabPayload' }, priced.action],
            score: w.grabPayload * share + priced.value,
            why: `pick the Payload up, then ${priced.why}`,
          });
        }
      }
    }

    // -- Walking somewhere, acting there, falling back.
    const canBrace = legal.canBrace && !unit.braced;
    const loose = state.payload.carriedBy === null;
    for (const reachable of this.reach.values()) {
      const cell = reachable.cell;
      const onBall = loose && cell.x === state.payload.x && cell.y === state.payload.y;
      // Only the Spark hunter walks onto the Spark (2H.11, point 1): for
      // every other role the catch is a thing that happens where it stands.
      const onSpark =
        w.chaseSpark > 0 && sparkIsLive(state.spark) && cell.x === state.spark.x && cell.y === state.spark.y;
      // A carrier never walks backwards unless nothing ahead is safer (2H.11, point 12).
      if (!this.carrierMayEnd(cell)) continue;
      // A cell worth less than this one, with nothing to do from it, is no
      // plan at all: the route is not even drawn.
      const ground = this.pv(cell) - this.pvHere;
      const acts = hasAction && (unit.holdingPayload || onBall || onSpark || this.somethingBeside(cell));
      // After a Dash the walk is priced by the Dash's own floors (2H.11, point 7).
      const chased = this.dashed ? this.chaseFloor(cell, reachable.provocations, 0) : null;
      if (ground <= 0 && !canBrace && !acts && !chased && !(onBall && hasAction)) continue;
      const route = safePathTo(state, unit, this.reach, cell);
      if (!route) continue;
      const walked = route.length;
      const exposed = reachable.provocations === 0 ? 0 : this.exposure(unit, route);
      let gain = ground - exposed - (unit.braced ? w.brace : 0);
      let why = `walk to ${to(cell)}`;
      if (chased && chased.gain - exposed > gain) {
        gain = chased.gain - exposed;
        why = chased.why;
      }
      const move: Action = { kind: 'move', path: route };
      const provocations = reachable.provocations;

      if (gain > 0) out.push({ steps: [move], score: gain, why, provocations });
      if (!hasAction) continue;

      // Go home, then dig in (2H.9): the keeper's plan has two steps now.
      if (canBrace) {
        out.push({ steps: [move, { kind: 'brace' }], score: gain + w.brace, why: `walk to ${to(cell)}, then dig in`, provocations });
      }

      // Nothing to swing at from a cell with nobody beside it, and nothing to
      // throw without the ball: the door is only asked where it could open.
      if (!acts) continue;

      // Walk onto the loose ball, pick it up, throw it (2H.10): the pickup is
      // free, so the Action is still there for the throw, which is the one
      // thing that gets a ball out of a scrum within the round. With the
      // Action in hand the pickup keeps its weight (2H.11, point 10): the
      // plan that walks onto the ball and takes it is priced on the pickup,
      // the carrier's turn being rebuilt once the ball is in hand.
      if (onBall && share > 0) {
        const taken = positionValue(this.board, cell, true) - this.pvHere - exposed - (unit.braced ? w.brace : 0);
        if (taken > 0) {
          out.push({ steps: [move, { kind: 'grabPayload' }], score: taken, why: `walk to ${to(cell)} and pick the Payload up`, provocations });
        }
        for (const priced of this.throwsAfterPickup(cell)) {
          out.push({
            steps: [move, { kind: 'grabPayload' }, priced.action],
            score: w.grabPayload * share + priced.value - exposed - walked * WALK_BEFORE_THROW,
            why: `walk to ${to(cell)}, pick the Payload up, then ${priced.why}`,
            provocations,
          });
        }
      }

      const there = this.stateWithUnitAt(cell);
      const options = actionOptionsAt(arena, there, unitAt(unit, cell), cell);
      const left = state.turn!.movementFeetRemaining - reachable.costFeet;
      for (const priced of this.actionsAt(cell, options, this.here, there)) {
        if (isThrow(priced.action)) {
          // The keeper throws at once, interceptors or not (écart 54): it only
          // steps out when no line exists from where it stands.
          if (w.relaunch > 0 && (legal.pass.length > 0 || legal.shoot)) continue;
          // A throw is priced on the throw: the ground it gains is read from
          // where the turn started, so walking first only pays when the
          // throw itself gets better, and every cell walked costs a little,
          // being movement the thrower will not have afterwards.
          out.push({
            steps: [move, priced.action],
            score: priced.value + this.relief - exposed - walked * WALK_BEFORE_THROW,
            why: `walk to ${to(cell)}, then ${priced.why}`,
            provocations,
          });
          continue;
        }
        const moved = this.pv(priced.landing) - this.pvHere;
        const retreat = left > 0 ? this.retreatFrom(priced.landing, left, false) : null;
        out.push(
          this.withRetreat(
            [move, priced.action],
            moved - exposed + priced.value,
            `walk to ${to(cell)}, then ${priced.why}`,
            retreat,
            provocations,
          ),
        );
      }
    }

    // -- The Dash: worth the ground it buys, never offered past a target in reach.
    if (hasAction && legal.canDash) out.push(...this.dashPlans());

    // -- The last resorts.
    if (hasAction && legal.canDodge) {
      const hurt = 1 - unit.hp / unit.maxHp;
      const nothingToDo = !out.some((p) => p.steps.some((s) => SPENDS_ON_THE_BOARD.has(s.kind)));
      if (nothingToDo && hurt >= 0.5) {
        const retreat = this.retreatFrom(this.here, state.turn!.movementFeetRemaining, unit.braced);
        out.push(
          this.withRetreat(
            [{ kind: 'dodge' }],
            w.dodgeWhenHurt * (hurt - 0.5) * 2,
            `dodge on ${unit.hp} of ${unit.maxHp}, nothing else to do`,
            retreat,
          ),
        );
      }
      // The possession (2H.11, point 17): on the last round with the score
      // in hand, the carrier may Dodge to keep the ball, worth half of what
      // it is exposed to where it stands, the walk away counted on top.
      if (this.board.possession && unit.holdingPayload) {
        const retreat = this.retreatFrom(this.here, state.turn!.movementFeetRemaining, unit.braced);
        out.push(
          this.withRetreat(
            [{ kind: 'dodge' }],
            w.carrierSafety * this.exposureHere * DODGE_RELIEF,
            'dodge to keep the ball to the whistle',
            retreat,
          ),
        );
      }
    }

    // Pressed, with ground to gain if the swings could be bought off. That is
    // the whole case for Disengage, open to any role since 2H.11 (point 8):
    // "disengage, then walk" exists as soon as the unit starts its turn
    // beside an opponent and the cell it wants cannot be reached by a route
    // that provokes nobody. It has to be read against the unpenalised ground
    // or the action never fires when it is most needed.
    if (hasAction && legal.canDisengage && legal.shove.length > 0 && !this.board.hunter) {
      let best: SafeReachable | null = null;
      let bestClean = 0;
      let bestSafe = 0;
      for (const reachable of this.reach.values()) {
        if (!this.carrierMayEnd(reachable.cell)) continue;
        const clean = this.pv(reachable.cell) - this.pvHere;
        if (reachable.provocations === 0) {
          bestSafe = Math.max(bestSafe, clean);
          continue;
        }
        if (clean > bestClean) {
          bestClean = clean;
          best = reachable;
        }
      }
      const route = best && bestClean > bestSafe ? safePathTo(state, unit, this.reach, best.cell) : null;
      if (best && route) {
        out.push({
          steps: [{ kind: 'disengage' }, { kind: 'move', path: route }],
          score: w.disengage * Math.min(1, bestClean / 12) + bestClean,
          why: `${unit.holdingPayload ? 'walk the ball out' : 'walk out'} clean past ${legal.shove.length} to (${best.cell.x}, ${best.cell.y})`,
        });
      }
    }

    return out;
  }

  // -- The carrier's rules ------------------------------------------------------

  /**
   * Whether a carrier may end its turn on a cell (2H.11, `00` C13 point 12):
   * never further from the mouth it attacks than where it stands, unless no
   * cell ahead, this one included, is less exposed than where it stands. The
   * keeper relaunching is exempt: it steps out for a line and walks home.
   * Everybody else may go anywhere.
   */
  private carrierMayEnd(cell: Point): boolean {
    const { unit, weights: w } = this.board;
    if (!unit.holdingPayload || w.relaunch > 0) return true;
    const target = this.board.targetFurnace;
    if (rangeToFurnace(cell, target) <= rangeToFurnace(this.here, target)) return true;
    // Nothing threatens where it stands: nothing behind can be safer.
    if (this.exposureHere === 0) return false;
    if (this.noSaferAhead === null) {
      let safer = false;
      const hereRange = rangeToFurnace(this.here, target);
      for (const { cell: c } of this.reach.values()) {
        if (rangeToFurnace(c, target) > hereRange) continue;
        if (carrierExposure(this.board, c) < this.exposureHere) {
          safer = true;
          break;
        }
      }
      this.noSaferAhead = !safer;
    }
    return this.noSaferAhead;
  }

  /**
   * The floors a cell is worth for closing on the other side's carrier
   * (2H.11, point 4) or on our own (C10 Breaker 6), before the route's
   * swings. Read by the Dash, and by the walk after a Dash (point 7), with
   * the same formula, so a plan holds from one step to the next (point 6).
   * Null when the cell closes nothing.
   */
  private chaseFloor(cell: Point, provocations: number, exposed: number): { gain: number; why: string; press: boolean; closer: boolean } | null {
    const { weights: w } = this.board;
    // A unit told where to stand is not running after anybody.
    if (findOrder(this.board.orders, 'holdZone')) return null;
    const cells = MOVE_SPEED_FEET / 5;
    let best: { gain: number; why: string; press: boolean; closer: boolean } | null = null;

    if (this.foe && this.foeGap > 1) {
      const gap = distance(cell, this.foe);
      if (gap < this.foeGap) {
        // Adjacent by a route that provokes nobody is the press itself (C10
        // Striker 6, 2H.10); otherwise the share of a move's length closed.
        const press = gap <= 1 && provocations === 0;
        const closed = Math.min(1, (this.foeGap - gap) / cells);
        const gain = (press ? w.pressCarrier : w.pressCarrier * closed) - exposed;
        best = { gain, why: press ? `get on ${this.foe.name}` : `close on ${this.foe.name}`, press, closer: false };
      }
    }
    if (this.ward && this.wardAt && this.wardGap > 2) {
      const gap = distance(cell, this.wardAt);
      if (gap < this.wardGap) {
        // Beside the carrier, or a move's worth of the gap closed, is worth
        // the whole place: far from its carrier the Breaker runs.
        const closed = Math.min(1, (this.wardGap - gap) / cells);
        const gain = (gap <= 2 ? w.block : w.block * closed) - exposed;
        if (!best || gain > best.gain) best = { gain, why: `get beside ${this.ward.name}`, press: false, closer: true };
        else best = { ...best, closer: true };
      }
    }
    return best;
  }

  // -- Cells ------------------------------------------------------------------

  /** `positionValue` with the Action spent, once per cell per decision. */
  private pv(cell: Point): number {
    const k = cell.y * ARENA_WIDTH + cell.x;
    let v = this.values[k]!;
    if (Number.isNaN(v)) {
      v = positionValue(this.board, cell, false);
      this.values[k] = v;
    }
    return v;
  }

  /** The state with this unit standing on `cell`, for the engine's own rules to read. */
  private stateWithUnitAt(cell: Point): MatchState {
    const k = `${cell.x},${cell.y}`;
    let s = this.moved.get(k);
    if (!s) {
      const { state, unit } = this.board;
      s = { ...state, units: state.units.map((u) => (u.id === unit.id ? unitAt(unit, cell) : u)) };
      this.moved.set(k, s);
    }
    return s;
  }

  /** Whether an opponent or a live Cracker stands within a bat's reach of `cell`. */
  private somethingBeside(cell: Point): boolean {
    for (const enemy of this.board.enemies) if (distance(enemy, cell) <= 1) return true;
    for (const cracker of this.board.state.crackers) {
      if (cracker.state === 'live' && distance(cracker, cell) <= 1) return true;
    }
    return false;
  }

  /**
   * What a route would be swung at for (2H.10): each opportunity attack it
   * provokes counts its chance to hit times its average damage, over the hit
   * points this unit has left, so the price is a share of its life, scaled by
   * `avoidOpportunity`. A route likely to get it evacuated is priced out on
   * top. The Spark hunter takes it and goes (2H.8).
   */
  private exposure(mover: Unit, route: readonly Point[]): number {
    if (this.board.hunter) return 0;
    const provoked = provokedAlong(this.board.state, mover, route);
    if (provoked.length === 0) return 0;
    const ac = statsFor(mover.role, mover.tier).ac;
    let share = 0;
    for (const swinger of provoked) {
      const might = statsFor(swinger.role, swinger.tier).might;
      share += (chance(might, ac) * ((BAT_DAMAGE_DIE + 1) / 2 + might)) / Math.max(1, mover.hp);
    }
    // Five points a swing at the least (2H.11, point 15): a Trajector's bat
    // on a Breaker read 1.4 points and the Breaker walked through it.
    const priced = Math.max(share * this.board.weights.avoidOpportunity, provoked.length * OPPORTUNITY_FLOOR);
    return priced + (share >= 1 ? LETHAL_ROUTE : 0);
  }

  /**
   * The best cell to fall back to from `from` with the movement left, or null
   * when staying put is as good as anything. Read against `from`, so a plan's
   * score adds up to the value of the cell it ends on.
   */
  private retreatFrom(from: Point, leftFeet: number, losesBrace: boolean): Retreat | null {
    const { unit, weights: w, arena, state } = this.board;
    if (leftFeet <= 0) return null;
    const base = this.pv(from) + (losesBrace ? w.brace : 0);
    const mover: Unit = from === this.here ? unit : unitAt(unit, from);
    const reach = safeReachableCells(arena, state, unit, leftFeet, from);

    // Worth checking in order of the ground alone: once that is under the
    // best found, no route can bring it back over, since a route only costs.
    const cells: { reachable: SafeReachable; clean: number }[] = [];
    for (const reachable of reach.values()) {
      if (!this.carrierMayEnd(reachable.cell)) continue;
      const clean = this.pv(reachable.cell) - base;
      if (clean > 0) cells.push({ reachable, clean });
    }
    cells.sort((a, b) => b.clean - a.clean || a.reachable.costFeet - b.reachable.costFeet);
    let best: Retreat | null = null;
    for (const { reachable, clean } of cells) {
      if (clean <= (best?.gain ?? 0)) break;
      const path = safePathTo(state, mover, reach, reachable.cell);
      if (!path) continue;
      const gain = clean - this.exposure(mover, path);
      if (gain > (best?.gain ?? 0)) best = { path, gain };
    }
    return best;
  }

  private withRetreat(steps: Action[], score: number, why: string, retreat: Retreat | null, provocations = 0): Plan {
    if (!retreat) return { steps, score, why, provocations };
    const end = retreat.path[retreat.path.length - 1]!;
    return {
      steps: [...steps, { kind: 'move', path: retreat.path }],
      score: score + retreat.gain,
      why: `${why}, then walk to (${end.x}, ${end.y})`,
      provocations,
    };
  }

  // -- The Dash ---------------------------------------------------------------

  /**
   * Dash (2H.8, Jérôme's second pass; 2H.9, his third; 2H.10, his fourth;
   * 2H.11, his fifth). One reason never to, and the price otherwise.
   *
   * Never: a legitimate target in reach. "Une cible à portée se frappe ou se
   * bouscule, jamais un déplacement de trois cases à la place": with the
   * carrier beside, or anybody beside a Breaker, the Dash is not, except to
   * **close on the other side's carrier** or to **wall** for our own. The
   * hunter is exempt, since it swings at nobody.
   *
   * The price: the ground it buys, which is the end cell read with the Action
   * spent, less what the route is swung at for. Compared with every plan that
   * does use the Action, and with the plain walk, which it only beats when the
   * extra cells are worth something: a Dash to nowhere is not offered.
   *
   * The approach (2H.11, `00` C13 point 4, replacing C12 Trajector 3 and
   * Breaker 3): for the three field roles (`approachDash`), a Dash towards
   * the other side's carrier is worth `pressCarrier` times the share of a
   * move's length it closes, the whole press when it lands adjacent **by a
   * route that crosses no opponent's reach**, and it competes on value with
   * the bat and the Cracker. Never beyond the leash, never on the last round
   * when the carrier cannot be had before the whistle (point 17). The wall:
   * our own carrier is more than a move away from a Breaker. Worth at least
   * `block` when the Dash gets it beside the carrier, and the share of the
   * gap it closes otherwise, so it runs towards the carrier rather than hit a
   * straggler (C10 Breaker 6). Both floors are `chaseFloor`, read the same
   * by the walk that follows the Dash (point 7).
   */
  private dashPlans(): Plan[] {
    const { arena, state, unit, weights: w } = this.board;
    const out: Plan[] = [];
    const relaunching = unit.holdingPayload && w.relaunch > 0;

    const barred = this.violence && !this.board.hunter;
    const far = safeReachableCells(arena, state, unit, state.turn!.movementFeetRemaining + MOVE_SPEED_FEET);

    for (const reachable of far.values()) {
      const cell = reachable.cell;
      const leashed = !relaunching && rangeToFurnace(cell, this.board.ownFurnace) > w.leash;
      if (leashed) continue;
      if (!this.carrierMayEnd(cell)) continue;
      const chased = this.chaseFloor(cell, reachable.provocations, 0);
      if (barred && !chased?.closer) continue;

      // The route is only drawn for a cell that could be worth it: the ground
      // alone, before the swings on the way, bounds the gain from above.
      const bound = this.pv(cell) - this.pvHere - (unit.braced ? w.brace : 0);
      if (bound <= 0 && !chased) continue;

      const route = safePathTo(state, unit, far, cell);
      if (!route) continue;
      const exposed = reachable.provocations === 0 ? 0 : this.exposure(unit, route);
      let gain = bound - exposed;
      let why = `dash, then walk to (${cell.x}, ${cell.y})`;
      if (chased && chased.gain - exposed > gain) {
        gain = chased.gain - exposed;
        why = `dash to ${chased.why}`;
      }
      if (gain <= 0) continue;
      out.push({ steps: [{ kind: 'dash' }, { kind: 'move', path: route }], score: gain, why, provocations: reachable.provocations });
    }
    return out;
  }

  // -- Actions at a cell ------------------------------------------------------

  /**
   * Every Action-spending action available from `at`, priced. `from` is null
   * when `at` is where the unit stands; otherwise it is the cell it would
   * walk from, and a target already in reach from there is left out: walking
   * first can never make the same swing better, and the plan that swings
   * first and walks after is already on the list. `there` is the board with
   * the unit standing on `at`, which the recoil and a batted Cracker read.
   */
  private actionsAt(at: Point, options: ActionOptions, from: Point | null, there: MatchState): Priced[] {
    const out: Priced[] = [];
    out.push(...this.throwsAt(at, options));
    if (!this.board.hunter) out.push(...this.violenceAt(at, options, from, there));
    // The catch is a plan from a walked cell only for the role that hunts the
    // Spark (2H.11, point 1); where the unit stands, anybody tries it.
    if (options.catchSpark && (from === null || this.board.weights.chaseSpark > 0)) {
      const { unit, weights: w } = this.board;
      const odds = chance(statsFor(unit.role, unit.tier).agility, options.catchSpark.against);
      out.push({
        action: { kind: 'catchSpark' },
        value: w.catchSpark * odds,
        why: 'the Spark is in this cell and it is worth two goals',
        landing: at,
      });
    }
    return out;
  }

  // -- The Payload --------------------------------------------------------------

  /** The throws this unit would have from `at` once it has picked the loose ball up there. */
  private throwsAfterPickup(at: Point): Priced[] {
    const { arena, state, unit } = this.board;
    const holder = { ...unitAt(unit, at), holdingPayload: true };
    const carrying: MatchState = {
      ...state,
      units: state.units.map((u) => (u.id === unit.id ? holder : u)),
      payload: { ...state.payload, x: at.x, y: at.y, carriedBy: unit.id },
    };
    const options = actionOptionsAt(arena, carrying, holder, at);
    return this.throwsAt(at, options, carrying);
  }

  private throwsAt(at: Point, options: ActionOptions, state: MatchState = this.board.state): Priced[] {
    const { arena, unit, weights: w } = this.board;
    const out: Priced[] = [];
    const aim = statsFor(unit.role, unit.tier).aim;

    // Every cell walked before the throw is read against the keeper's mouth
    // (Jérôme, 2026-10-11): it steps out as far as a line needs, no further.
    const home = w.relaunch > 0 ? rangeToFurnace(at, this.board.ownFurnace) * RELAUNCH_STEP : 0;

    // The possession (2H.11, point 17): on the last round with the score in
    // hand, only a clean shot is taken.
    if (options.shoot && !(this.board.possession && options.shoot.mode !== 'normal')) {
      const odds = chance(aim, options.shoot.against, options.shoot.mode);
      out.push({
        action: { kind: 'shoot' },
        value: w.shoot * odds - home,
        why: `a shot worth ${Math.round(odds * 100)} in a hundred`,
        landing: at,
      });
    }

    const called = findOrder(this.board.orders, 'callForPass');

    // The chain (2H.7, Jérôme's rule). A throw goes to a team-mate who has not
    // played yet this round, so that its own move carries the ball further: the
    // ball climbs the ladder within the round. Never to somebody who has played,
    // except from the **last link**, the last of our side to act (the keeper
    // after a goal, typically), who throws to the best-placed receiver so the
    // ball starts next round in good hands. The receiver is ahead, or on the
    // same line, or at most three cells behind when it is the very next to play,
    // because its eight cells of movement will still carry the ball past us.
    // And the Breaker's exception (2H.10, Jérôme): a Breaker holding the ball
    // throws to a Striker nearer the mouth than itself even when that Striker
    // has played, provided nobody can intercept.
    const lastLink = isLastLink(this.board);
    const next = nextToPlay(this.board);
    const moveCells = MOVE_SPEED_FEET / 5;

    // Two players throw no matter who has played or where they stand: the
    // keeper relaunching after a goal (écart 54, `relaunch`), and the Spark
    // hunter, which has to get rid of the ball to go and hunt (2H.8).
    const unload = w.relaunch > 0 || this.board.hunter;
    const unloadBonus = w.relaunch + (this.board.hunter ? w.chaseSpark : 0);

    // Pressed where the throw is made: a hand-off is a way out of it.
    const pressed = options.shove.length > 0;
    const thrower: Unit = at === this.here ? unit : unitAt(unit, at);
    // The shot the thrower has itself after its walk (2H.11, point 13), not
    // the one from the cell it throws from: read from the cell alone, a pass
    // to a team-mate holding the same shot as the thrower read as a whole
    // opening and outpriced the thrower's own shot three times over.
    const mine = Math.max(shotQuality(this.board, unit, at), this.ownShot);
    // And a role that would rather shoot than pass never prices a pass above
    // the clean shot it has itself (point 13). Not the keeper relaunching,
    // nor the hunter unloading, whose throw is the point.
    const cap = !unload && w.shoot > w.pass && this.ownCleanShot > 0 ? w.shoot * this.ownCleanShot : Infinity;

    // The ground the ball gains is read from where the turn started (écart
    // 56), so a step forward before the throw is not counted as a longer
    // throw, and the plan reads the same before and after the step. Ahead
    // and behind are read from there too (2H.11, point 11): a carrier never
    // walks backwards to make a pass legal.
    const origin = state.turn?.startedAt ?? this.here;

    for (const option of options.pass) {
      const mate = unitOf(state, option.unitId);
      const odds = chance(aim, PAYLOAD_PASS_AC, option.mode);

      const played = hasPlayedThisRound(state, mate.id);
      const risk = passInterceptors(arena, state, thrower, lineTo(at, mate)).length;
      const ahead = rangeToFurnace(mate, this.board.targetFurnace) < rangeToFurnace(origin, this.board.targetFurnace);
      const exception = w.chainException > 0 && mate.role === 'striker' && ahead && risk === 0;
      if (played && !lastLink && !unload && !exception) continue;

      // A receiver still to play may be a whole move behind (2H.11, point
      // 9), whether or not it is the next to play: its own run carries the
      // ball back past the thrower. Further than that the ball goes backwards
      // even after the run, and a receiver that has played carries nothing.
      const gained =
        rangeToFurnace(origin, this.board.targetFurnace) - rangeToFurnace(mate, this.board.targetFurnace);
      if (gained < 0 && !lastLink && !unload && !exception && (played || -gained > moveCells)) continue;

      // The receiver's exposure where the ball arrives (2H.11, point 14), and
      // the possession (point 17): only to somebody less exposed than the
      // thrower is.
      const arrival = w.carrierSafety > 0 ? this.arrivalExposure(mate, at) : 0;
      if (this.board.possession && arrival >= this.exposureHere) continue;

      // Worth the ground the ball will have gained once the receiver has moved
      // too: a receiver still to play adds its whole run. Capped so a chain of
      // three does not price one throw at the whole pitch. Scaled by what the
      // receiver's role makes of the ball (2H.10): a Striker before a Breaker.
      const potential = Math.min(2, Math.max(0, gained + (played ? 0 : moveCells)) / moveCells);
      let progress = potential * weightsFor(mate.role).receiver;

      // Except as a way out. Handing the ball to somebody nobody is standing on
      // is worth a throw even when it gains no ground at all.
      if (pressed && !crowded(this.board, mate)) progress += 0.35;

      // And above all, worth the shot it creates. A Breaker on the edge of range
      // holds a chance of one in a hundred; the same cell in a Striker's hands is
      // one in three. Measured against distance alone that throw gains nothing,
      // which is how the ball ended up spending most of the match in the hands of
      // the one role that cannot use it.
      // A receiver still to play will run before it shoots: the shot it
      // creates is the best one a move away from where it stands (2H.10).
      const standing = shotQuality(this.board, mate, { x: mate.x, y: mate.y });
      const theirs = played ? standing : Math.max(standing, bestShotNextTurn(this.board, mate, mate));
      const opening = Math.max(0, theirs - mine);

      // Every defender beside the flight halves what the throw is worth: safe
      // first, far second, as Jérôme ordered the keeper's choice. It never
      // reaches zero, so a risky throw still beats holding the ball for ever.
      const safety = 1 / (1 + risk);
      const ordered = called?.receiverId === mate.id ? ORDER_PULL : 0;

      // A throw backwards costs a little per cell, for every thrower (2H.11,
      // point 11; the last link alone since 2H.10): the ground gained decides
      // before the unit id ever does.
      const backwards = !unload && gained < 0 ? -gained * BACKWARD_STEP : 0;

      // `handOff` is the flat appetite of a role that should not be carrying at
      // all: for a Breaker a throw that gains nothing still beats walking.
      // `unloadBonus` is flat and outside `safety` on purpose: the keeper
      // throws into two interceptors rather than hold or dig in, and the safety
      // term still ranks the receivers, safe first, far second.
      const value = Math.min(
        cap,
        (w.pass * odds * (progress + opening * 3) + w.handOff * odds) * safety +
          unloadBonus * odds +
          ordered -
          risk * INTERCEPT_CAUTION -
          backwards -
          home,
      );
      out.push({
        action: { kind: 'pass', targetId: mate.id },
        value: value - w.carrierSafety * arrival,
        why: `pass to ${mate.name}, ${gained} cells on${played ? (exception ? ', ahead and clear' : ', last link') : ''}, shot ${Math.round(mine * 100)} to ${Math.round(theirs * 100)}, ${risk} in the lane${arrival > 0 ? `, ${arrival.toFixed(1)} on arrival` : ''}`,
        landing: at,
      });
    }

    return out;
  }

  /** `receiverExposure`, once per receiver and throwing cell. */
  private arrivalExposure(mate: Unit, at: Point): number {
    const k = `${mate.id}:${at.x},${at.y}`;
    let v = this.arrivals.get(k);
    if (v === undefined) {
      v = receiverExposure(this.board, mate, at);
      this.arrivals.set(k, v);
    }
    return v;
  }
  private readonly arrivals = new Map<string, number>();

  // -- Violence -----------------------------------------------------------------

  private violenceAt(at: Point, options: ActionOptions, from: Point | null, there: MatchState): Priced[] {
    const { state, unit, weights: w, arena } = this.board;
    const out: Priced[] = [];
    const stats = statsFor(unit.role, unit.tier);
    const marked = findOrder(this.board.orders, 'markTarget');
    const swinger = unitAt(unit, at);

    // Already in reach from where the unit stands: see `actionsAt`.
    const fresh = (option: TargetOption): boolean =>
      from === null || distance(from, unitOf(state, option.unitId)) > 1;

    // The bodyguard's target: an opponent standing on our own carrier. Zero for
    // every role but the Breaker, whose charge is the carrier (2H.7).
    const ownCarrier = this.board.carrier && this.board.carrier.team === unit.team ? this.board.carrier : null;
    const onOurCarrier = (target: Unit): boolean =>
      ownCarrier !== null && ownCarrier.id !== unit.id && distance(target, ownCarrier) <= 1;
    // In attack without the ball, a swing at a bystander is worth a share of
    // itself (2H.11, point 5, `idleSwing`): a Striker or a Trajector swings
    // only for want of anything better. Not at somebody on our carrier.
    const idle = (target: Unit): number => (ownCarrier !== null && !onOurCarrier(target) ? w.idleSwing : 1);

    for (const option of options.attack) {
      if (!fresh(option)) continue;
      const target = unitOf(state, option.unitId);
      const odds = chance(stats.might, option.against, option.mode);

      // A swing does not make anyone drop the ball: a carrier is only worth
      // the strip when the swing can evacuate it (2H.10, "contre le porteur on
      // bouscule"). Everybody else is worth what this role makes of its shirt
      // (`prey`, 2H.11: the likeliest to evacuate first).
      let value =
        w.attack * (target.holdingPayload ? 1 : preyOf(this.board, target)) * idle(target) +
        (target.holdingPayload ? w.stripCarrier * batEvacuates(stats.might, target.hp) : 0);
      if (onOurCarrier(target)) value += w.guardStrike;
      if (marked?.targetId === target.id) value += ORDER_PULL;
      if (w.preyByHp === 0 && target.hp <= 4.5 + stats.might) value *= 1.4;

      out.push({
        action: { kind: 'attack', targetId: target.id },
        value: value * odds,
        why: `swing at ${target.name}`,
        landing: recoilDestination(arena, there, swinger, target),
      });
    }

    for (const option of options.shove) {
      if (!fresh(option)) continue;
      const target = unitOf(state, option.unitId);
      const odds = contestChance(stats.might, option.against);

      // A successful Shove takes the ball, which is the only way to get it off
      // somebody without waiting for a pass. On anybody else it is a cell of
      // push, worth what this role makes of that (`shoveBystander`, 2H.10).
      let value = target.holdingPayload ? w.shove + w.stripCarrier : w.shove * w.shoveBystander * idle(target);
      if (onOurCarrier(target)) value += w.guardStrike;
      if (marked?.targetId === target.id) value += ORDER_PULL * 0.5;

      // A player holding the Payload is not a defender. Its Action is the shot or
      // the throw, and a carrier that spends it brawling is possession thrown
      // away: the Breaker was doing exactly that on two turns in five.
      if (unit.holdingPayload) value *= 0.2;

      out.push({
        action: { kind: 'shove', targetId: target.id },
        value: value * odds,
        why: `shove ${target.name}${target.holdingPayload ? ' off the ball' : ''}`,
        landing: at,
      });
    }

    out.push(...this.crackersAt(at, options, from, there, idle));
    return out;
  }

  /**
   * Aiming a Cracker. Every line is tried on the board with the unit standing
   * where it would swing from (2H.10: a Breaker walked eight cells to a bat it
   * blocked with its own body once there), the ones that would go off on a
   * team-mate are never offered, and a line that hits nobody is still worth a
   * little when it clears the thing away from the swinger.
   */
  private crackersAt(
    at: Point,
    options: ActionOptions,
    from: Point | null,
    there: MatchState,
    idle: (target: Unit) => number,
  ): Priced[] {
    const { arena, unit, weights: w } = this.board;
    const out: Priced[] = [];
    const odds = chance(statsFor(unit.role, unit.tier).might, CRACKER_AC);
    const swinger = unitAt(unit, at);

    for (const option of options.batCracker) {
      const cracker = there.crackers.find((c) => c.id === option.crackerId);
      if (!cracker) continue;
      if (from !== null && distance(from, cracker) <= 1) continue;
      const landing = recoilDestination(arena, there, swinger, cracker);

      for (const direction of option.directions) {
        const run = battedCrackerRun(arena, there, cracker, direction);
        const struck = run.struck;

        if (struck?.team === unit.team) continue;

        if (struck) {
          // A blast does not make anyone drop the ball either: the strip is
          // worth the chance it evacuates the carrier. The likeliest to
          // evacuate first, for the Cracker as for the bat (2H.11, point 21),
          // and a share of itself in attack (point 5).
          const value =
            (w.batCracker * idle(struck) + (struck.holdingPayload ? w.stripCarrier * crackerEvacuates(struck) : 0)) *
            preyOf(this.board, struck);
          out.push({
            action: { kind: 'batCracker', crackerId: cracker.id, direction },
            value: value * odds,
            why: `send the Cracker into ${struck.name}`,
            landing,
          });
          continue;
        }

        // Nobody down that line, but getting it away from here still buys the
        // unit a round of not being the nearest thing to a live charge.
        out.push({
          action: { kind: 'batCracker', crackerId: cracker.id, direction },
          value: w.batCracker * 0.2 * odds * clearance(at, run.landing),
          why: 'clear the Cracker away',
          landing,
        });
      }
    }

    return out;
  }
}

/** A cell walked before a throw costs this much: movement the thrower will not have after. */
const WALK_BEFORE_THROW = 0.25;
/** The keeper's relaunch reads every cell of range to its mouth at this much (Jérôme, 2026-10-11). */
const RELAUNCH_STEP = 0.5;
/** What a last link's throw loses per cell it goes backwards (2H.10). */
const BACKWARD_STEP = 0.5;
/** A flat caution per defender beside a pass, on top of the halving. */
const INTERCEPT_CAUTION = 4;
/** Added to the price of a route whose opportunity attacks are expected to take every hit point left. */
const LETHAL_ROUTE = 100;
/** What one opportunity attack costs at the least, whoever swings and whatever is left (2H.11, point 15). */
const OPPORTUNITY_FLOOR = 5;
/** The share of a carrier's exposure a Dodge buys off, for the possession of the last round (2H.11, point 17). */
const DODGE_RELIEF = 0.5;

/** A cell, in the words of a plan. */
function to(cell: Point): string {
  return `(${cell.x}, ${cell.y})`;
}

/** The actions that do something to the board, as opposed to the stances. */
const SPENDS_ON_THE_BOARD: ReadonlySet<Action['kind']> = new Set([
  'attack',
  'shove',
  'batCracker',
  'pass',
  'shoot',
  'catchSpark',
]);

function isThrow(action: Action): boolean {
  return action.kind === 'pass' || action.kind === 'shoot';
}

/** The unit as it would stand on `cell`. */
function unitAt(unit: Unit, cell: Point): Unit {
  return unit.x === cell.x && unit.y === cell.y ? unit : { ...unit, x: cell.x, y: cell.y };
}

/** Whether anybody is standing on this player, which is what makes a pass a way out. */
function crowded(board: Board, unit: Unit): boolean {
  return board.enemies.some((e) => Math.max(Math.abs(e.x - unit.x), Math.abs(e.y - unit.y)) <= 1);
}

function clearance(from: Point, landing: Point): number {
  const gap = Math.max(Math.abs(from.x - landing.x), Math.abs(from.y - landing.y));
  return Math.min(1, gap / 8);
}

// -- Odds of an evacuation -----------------------------------------------------

/** The odds a bat that lands (a d8 plus the swinger's might) takes every hit point left. */
export function batEvacuates(might: number, hp: number): number {
  const faces = BAT_DAMAGE_DIE;
  const needed = hp - might;
  if (needed <= 1) return 1;
  if (needed > faces) return 0;
  return (faces - needed + 1) / faces;
}

/** How often `dice` d`faces` total at least `n`. */
function diceAtLeast(dice: number, faces: number, n: number): number {
  let counts = new Map<number, number>([[0, 1]]);
  for (let d = 0; d < dice; d++) {
    const next = new Map<number, number>();
    for (const [sum, ways] of counts) {
      for (let f = 1; f <= faces; f++) next.set(sum + f, (next.get(sum + f) ?? 0) + ways);
    }
    counts = next;
  }
  let hits = 0;
  let total = 0;
  for (const [sum, ways] of counts) {
    total += ways;
    if (sum >= n) hits += ways;
  }
  return hits / total;
}

/**
 * The odds a Cracker blast takes every hit point a target has left: 3d6, or
 * half of it on a successful save against the target's agility.
 */
export function crackerEvacuates(target: Unit): number {
  const saves = chance(statsFor(target.role, target.tier).agility, CRACKER_SAVE_DC);
  const full = diceAtLeast(CRACKER_DAMAGE_DICE, CRACKER_DAMAGE_DIE, target.hp);
  const halved = diceAtLeast(CRACKER_DAMAGE_DICE, CRACKER_DAMAGE_DIE, target.hp * 2);
  return (1 - saves) * full + saves * halved;
}

// -- Ranking ----------------------------------------------------------------

/**
 * Best first. The AI rolls no dice, so two plans worth the same have to
 * resolve the same way every time or a match stops replaying: the plan that
 * provokes fewer opportunity attacks first (2H.11, point 15); then the
 * shorter plan, so a Dash to nowhere never beats the plain walk; then the
 * one that acts before it walks; then the steps themselves.
 */
function rank(plans: readonly Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((a.provocations ?? 0) !== (b.provocations ?? 0)) return (a.provocations ?? 0) - (b.provocations ?? 0);
    if (a.steps.length !== b.steps.length) return a.steps.length - b.steps.length;
    const aWalks = a.steps[0]?.kind === 'move' ? 1 : 0;
    const bWalks = b.steps[0]?.kind === 'move' ? 1 : 0;
    if (aWalks !== bWalks) return aWalks - bWalks;
    return planKey(a).localeCompare(planKey(b));
  });
}

function planKey(plan: Plan): string {
  return plan.steps.map(actionKey).join(' ');
}

function actionKey(action: Action): string {
  switch (action.kind) {
    case 'move':
      return `move:${action.path.map((p) => `${p.x},${p.y}`).join('>')}`;
    case 'attack':
    case 'shove':
    case 'pass':
      return `${action.kind}:${action.targetId}`;
    case 'batCracker':
      return `batCracker:${action.crackerId}:${action.direction}`;
    default:
      return action.kind;
  }
}
