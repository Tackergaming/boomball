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
 * Action in the pocket. So a candidate is now a **plan**: Dash or not, the
 * cell to walk to, the action taken from that cell, and the cell to fall back
 * to with the movement left. The board at the end of the plan is read by the
 * same role weights as before (`positionValue`), the action by the same
 * appetites, and the four tables in `ai/roles/` stay the data Jérôme dictates.
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
  CRACKER_AC,
  MOVE_SPEED_FEET,
  PAYLOAD_PASS_AC,
} from '../engine/constants.js';
import { sparkIsLive } from '../engine/types.js';
import { pathTo, reachableCells, type Reachable } from '../engine/rules/movement.js';
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
  buildBoard,
  chance,
  contestChance,
  hasPlayedThisRound,
  isLastLink,
  keenerMateNear,
  nextToPlay,
  ORDER_PULL,
  positionValue,
  shotQuality,
  unitOf,
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
  /** `positionValue` once per cell, indexed by cell: a decision reads a cell many times over. */
  private readonly values = new Float64Array(ARENA_WIDTH * ARENA_HEIGHT).fill(NaN);
  private readonly pvHere: number;
  /** Whether a swing, a shove or a Cracker is in reach from where the unit stands. */
  private readonly violence: boolean;

  constructor(private readonly board: Board) {
    const { unit } = board;
    this.here = { x: unit.x, y: unit.y };
    this.pvHere = this.pv(this.here);
    const { legal } = board;
    this.violence = legal.attack.length + legal.shove.length + legal.batCracker.length > 0;
  }

  plans(): Plan[] {
    const { legal, unit, weights: w } = this.board;
    const out: Plan[] = [
      // The baseline every appetite has to beat.
      { steps: [], score: 0, why: 'nothing on the board is worth a move' },
    ];

    const hasAction = legal.canDash;

    // -- Acting from here, then falling back.
    if (hasAction) {
      let retreat: Retreat | null | undefined;
      for (const priced of this.actionsAt(this.here, legal, null)) {
        if (isThrow(priced.action)) {
          out.push({ steps: [priced.action], score: priced.value, why: priced.why });
          continue;
        }
        retreat ??= this.retreatFrom(this.here, legal.destinations, unit.braced);
        out.push(this.withRetreat([priced.action], priced.value, priced.why, retreat));
      }
      if (legal.canBrace && !unit.braced) {
        out.push({ steps: [{ kind: 'brace' }], score: w.brace, why: 'dig in' });
      }
    }

    // The pickup is free and the plan is rebuilt once the ball is in hand.
    if (legal.canGrabPayload) {
      const share = keenerMateNear(this.board) ? 1 - w.yieldToKeener : 1;
      out.push({
        steps: [{ kind: 'grabPayload' }],
        score: w.grabPayload * share,
        why: share === 1 ? 'the Payload is loose in this cell' : 'the Payload is loose here, but a mate wants it more',
      });
    }

    // -- Walking somewhere, acting there, falling back.
    const canBrace = legal.canBrace && !unit.braced;
    for (const reachable of legal.destinations.values()) {
      const cell = reachable.cell;
      // A cell worth less than this one, with nothing to do from it, is no
      // plan at all: the route is not even drawn.
      const ground = this.pv(cell) - this.pvHere;
      const acts = hasAction && (unit.holdingPayload || this.somethingBeside(cell));
      if (ground <= 0 && !canBrace && !acts) continue;
      const route = pathTo(legal.destinations, cell);
      if (!route) continue;
      const walked = route.length;
      const exposed = this.exposure(unit, route);
      const gain = ground - exposed - (unit.braced ? w.brace : 0);
      const move: Action = { kind: 'move', path: route };
      const to = `(${cell.x}, ${cell.y})`;

      if (gain > 0) out.push({ steps: [move], score: gain, why: `walk to ${to}` });
      if (!hasAction) continue;

      // Go home, then dig in (2H.9): the keeper's plan has two steps now.
      if (canBrace) {
        out.push({ steps: [move, { kind: 'brace' }], score: gain + w.brace, why: `walk to ${to}, then dig in` });
      }

      // Nothing to swing at from a cell with nobody beside it, and nothing to
      // throw without the ball: the door is only asked where it could open.
      if (!acts) continue;

      const options = actionOptionsAt(this.board.arena, this.board.state, unit, cell);
      for (const priced of this.actionsAt(cell, options, this.here)) {
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
            score: priced.value - exposed - walked * WALK_BEFORE_THROW,
            why: `walk to ${to}, then ${priced.why}`,
          });
          continue;
        }
        const left = this.board.state.turn!.movementFeetRemaining - reachable.costFeet;
        const retreat =
          left > 0
            ? this.retreatFrom(cell, reachableCells(this.board.arena, this.board.state, unit, left, cell), false)
            : null;
        out.push(
          this.withRetreat([move, priced.action], gain + priced.value, `walk to ${to}, then ${priced.why}`, retreat),
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
        const retreat = this.retreatFrom(this.here, legal.destinations, unit.braced);
        out.push(
          this.withRetreat(
            [{ kind: 'dodge' }],
            w.dodgeWhenHurt * (hurt - 0.5) * 2,
            `dodge on ${unit.hp} of ${unit.maxHp}, nothing else to do`,
            retreat,
          ),
        );
      }
    }

    // Pressed, carrying, and with ground to gain if the swings could be bought
    // off. That is the whole case for Disengage, and it has to be read against
    // the unpenalised ground or the action never fires when it is most needed.
    if (hasAction && legal.canDisengage && unit.holdingPayload && legal.shove.length > 0) {
      let best: Reachable | null = null;
      let bestClean = 0;
      for (const reachable of legal.destinations.values()) {
        const clean = this.pv(reachable.cell) - this.pvHere;
        if (clean > bestClean) {
          bestClean = clean;
          best = reachable;
        }
      }
      const route = best ? pathTo(legal.destinations, best.cell) : null;
      if (best && route) {
        out.push({
          steps: [{ kind: 'disengage' }, { kind: 'move', path: route }],
          score: w.disengage * Math.min(1, bestClean / 12) + bestClean,
          why: `walk the ball out clean past ${legal.shove.length} to (${best.cell.x}, ${best.cell.y})`,
        });
      }
    }

    return out;
  }

  // -- Cells ------------------------------------------------------------------

  /** `positionValue`, once per cell per decision. */
  private pv(cell: Point): number {
    const k = cell.y * ARENA_WIDTH + cell.x;
    let v = this.values[k]!;
    if (Number.isNaN(v)) {
      v = positionValue(this.board, cell);
      this.values[k] = v;
    }
    return v;
  }

  /**
   * The same with the Action spent: what a cell is worth at the end of a
   * Dash. Only the hunter on the Spark's cell reads anything different.
   */
  private pvAfterDash(cell: Point): number {
    const { state } = this.board;
    if (this.board.hunter && sparkIsLive(state.spark) && cell.x === state.spark.x && cell.y === state.spark.y) {
      return positionValue(this.board, cell, false);
    }
    return this.pv(cell);
  }

  /** Whether an opponent or a live Cracker stands within a bat's reach of `cell`. */
  private somethingBeside(cell: Point): boolean {
    for (const enemy of this.board.enemies) if (distance(enemy, cell) <= 1) return true;
    for (const cracker of this.board.state.crackers) {
      if (cracker.state === 'live' && distance(cracker, cell) <= 1) return true;
    }
    return false;
  }

  /** What a route would be swung at for. The Spark hunter takes it and goes (2H.8). */
  private exposure(mover: Unit, route: readonly Point[]): number {
    if (this.board.hunter) return 0;
    return provokedAlong(this.board.state, mover, route).length * this.board.weights.avoidOpportunity;
  }

  /**
   * The best cell to fall back to from `from` with the movement left, or null
   * when staying put is as good as anything. Read against `from`, so a plan's
   * score adds up to the value of the cell it ends on.
   */
  private retreatFrom(
    from: Point,
    reach: ReadonlyMap<string, Reachable>,
    losesBrace: boolean,
  ): Retreat | null {
    const { unit, weights: w } = this.board;
    const base = this.pv(from) + (losesBrace ? w.brace : 0);
    const mover: Unit = from === this.here ? unit : { ...unit, x: from.x, y: from.y };

    // Worth checking in order of the ground alone: once that is under the
    // best found, no route can bring it back over, since a route only costs.
    const cells: { reachable: Reachable; clean: number }[] = [];
    for (const reachable of reach.values()) {
      const clean = this.pv(reachable.cell) - base;
      if (clean > 0) cells.push({ reachable, clean });
    }
    cells.sort((a, b) => b.clean - a.clean);
    let best: Retreat | null = null;
    for (const { reachable, clean } of cells) {
      if (clean <= (best?.gain ?? 0)) break;
      const path = pathTo(reach, reachable.cell);
      if (!path) continue;
      const gain = clean - this.exposure(mover, path);
      if (gain > (best?.gain ?? 0)) best = { path, gain };
    }
    return best;
  }

  private withRetreat(steps: Action[], score: number, why: string, retreat: Retreat | null): Plan {
    if (!retreat) return { steps, score, why };
    const end = retreat.path[retreat.path.length - 1]!;
    return {
      steps: [...steps, { kind: 'move', path: retreat.path }],
      score: score + retreat.gain,
      why: `${why}, then walk to (${end.x}, ${end.y})`,
    };
  }

  // -- The Dash ---------------------------------------------------------------

  /**
   * Dash (2H.8, Jérôme's second pass; 2H.9, his third). One reason never to,
   * and the price otherwise.
   *
   * Never: a target in reach. "Une cible à portée se frappe ou se bouscule,
   * jamais un déplacement de trois cases à la place": with a swing, a shove or
   * a Cracker on offer, the Dash is not, except to **press** or to **wall**.
   * The hunter is exempt, since it swings at nobody.
   *
   * The price: the ground it buys, which is the end cell read with the Action
   * spent, less what the route is swung at for. Compared with every plan that
   * does use the Action, and with the plain walk, which it only beats when the
   * extra cells are worth something: a Dash to nowhere is not offered.
   *
   * The press: the other side's carrier is out of reach of a plain move but a
   * Dash gets this unit adjacent to it. Worth at least the press itself, so a
   * Striker twelve cells from the carrier dashes to finish on it and holds the
   * opportunity attack when it leaves, rather than swinging at whoever is
   * nearer. The wall: our own carrier is more than a move away from a
   * Breaker. Worth at least `block`, so it runs to be beside the carrier next
   * round rather than hit a straggler.
   */
  private dashPlans(): Plan[] {
    const { arena, state, unit, legal, weights: w } = this.board;
    const out: Plan[] = [];
    const carrier = this.board.carrier;

    const free = carrier !== null && !unit.holdingPayload && !this.board.hunter;
    // The other side's carrier, when this role presses it.
    const foe = free && carrier.team !== unit.team && w.pressCarrier > 0 ? carrier : null;
    // Our own carrier, when this role walls for it and it wants a wall.
    const ward =
      free && carrier.team === unit.team && carrier.id !== unit.id && w.block > 0 && weightsFor(carrier.role).wantsEscort > 0
        ? carrier
        : null;
    const within = (cells: Iterable<Reachable>, target: Point, gap: number): boolean => {
      for (const { cell } of cells) if (distance(cell, target) <= gap) return true;
      return false;
    };
    const pressNeeded = foe !== null && distance(unit, foe) > 1 && !within(legal.destinations.values(), foe, 1);
    const wallNeeded = ward !== null && distance(unit, ward) > 2 && !within(legal.destinations.values(), ward, 2);

    const barred = this.violence && !this.board.hunter;
    const far = reachableCells(arena, state, unit, state.turn!.movementFeetRemaining + MOVE_SPEED_FEET);

    for (const reachable of far.values()) {
      const cell = reachable.cell;
      const press = foe !== null && distance(cell, foe) <= 1;
      const wall = ward !== null && distance(cell, ward) <= 2;
      if (barred && !press && !wall) continue;

      const route = pathTo(far, cell);
      if (!route) continue;
      const exposed = this.exposure(unit, route);
      let gain = this.pvAfterDash(cell) - this.pvHere - exposed - (unit.braced ? w.brace : 0);
      let why = `dash, then walk to (${cell.x}, ${cell.y})`;
      if (press && pressNeeded && w.pressCarrier - exposed > gain) {
        gain = w.pressCarrier - exposed;
        why = `dash to get on ${foe.name}`;
      } else if (wall && wallNeeded && w.block - exposed > gain) {
        gain = w.block - exposed;
        why = `dash to get beside ${ward.name}`;
      }
      if (gain <= 0) continue;
      out.push({ steps: [{ kind: 'dash' }, { kind: 'move', path: route }], score: gain, why });
    }
    return out;
  }

  // -- Actions at a cell ------------------------------------------------------

  /**
   * Every Action-spending action available from `at`, priced. `from` is null
   * when `at` is where the unit stands; otherwise it is the cell it would
   * walk from, and a target already in reach from there is left out: walking
   * first can never make the same swing better, and the plan that swings
   * first and walks after is already on the list.
   */
  private actionsAt(at: Point, options: ActionOptions, from: Point | null): Priced[] {
    const out: Priced[] = [];
    out.push(...this.throwsAt(at, options));
    if (!this.board.hunter) out.push(...this.violenceAt(at, options, from));
    if (from === null && options.catchSpark) {
      const { unit, weights: w } = this.board;
      const odds = chance(statsFor(unit.role, unit.tier).agility, options.catchSpark.against);
      out.push({
        action: { kind: 'catchSpark' },
        value: w.catchSpark * odds,
        why: 'the Spark is in this cell and it is worth two goals',
      });
    }
    return out;
  }

  // -- The Payload --------------------------------------------------------------

  private throwsAt(at: Point, options: ActionOptions): Priced[] {
    const { arena, state, unit, weights: w } = this.board;
    const out: Priced[] = [];
    const aim = statsFor(unit.role, unit.tier).aim;

    // Every cell walked before the throw is read against the keeper's mouth
    // (Jérôme, 2026-10-11): it steps out as far as a line needs, no further.
    const home = w.relaunch > 0 ? rangeToFurnace(at, this.board.ownFurnace) * RELAUNCH_STEP : 0;

    if (options.shoot) {
      const odds = chance(aim, options.shoot.against, options.shoot.mode);
      out.push({
        action: { kind: 'shoot' },
        value: w.shoot * odds - home,
        why: `a shot worth ${Math.round(odds * 100)} in a hundred`,
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
    const thrower: Unit = at === this.here ? unit : { ...unit, x: at.x, y: at.y };
    const mine = shotQuality(this.board, unit, at);

    for (const option of options.pass) {
      const mate = unitOf(state, option.unitId);
      const odds = chance(aim, PAYLOAD_PASS_AC, option.mode);

      const played = hasPlayedThisRound(state, mate.id);
      if (played && !lastLink && !unload) continue;

      // The ground the ball gains is read from where the turn started, so a
      // step forward before the throw is not counted as a longer throw.
      const gained =
        rangeToFurnace(this.here, this.board.targetFurnace) - rangeToFurnace(mate, this.board.targetFurnace);
      if (gained < 0 && !lastLink && !unload && (next?.id !== mate.id || -gained > 3)) continue;

      // Worth the ground the ball will have gained once the receiver has moved
      // too: a receiver still to play adds its whole run. Capped so a chain of
      // three does not price one throw at the whole pitch.
      const potential = Math.min(2, Math.max(0, gained + (played ? 0 : moveCells)) / moveCells);
      let progress = potential;

      // Except as a way out. Handing the ball to somebody nobody is standing on
      // is worth a throw even when it gains no ground at all.
      if (pressed && !crowded(this.board, mate)) progress += 0.35;

      // And above all, worth the shot it creates. A Breaker on the edge of range
      // holds a chance of one in a hundred; the same cell in a Striker's hands is
      // one in three. Measured against distance alone that throw gains nothing,
      // which is how the ball ended up spending most of the match in the hands of
      // the one role that cannot use it.
      const theirs = shotQuality(this.board, mate, { x: mate.x, y: mate.y });
      const opening = Math.max(0, theirs - mine);

      // Every defender beside the flight halves what the throw is worth: safe
      // first, far second, as Jérôme ordered the keeper's choice. It never
      // reaches zero, so a risky throw still beats holding the ball for ever.
      const risk = passInterceptors(arena, state, thrower, lineTo(at, mate)).length;
      const safety = 1 / (1 + risk);
      const ordered = called?.receiverId === mate.id ? ORDER_PULL : 0;

      // `handOff` is the flat appetite of a role that should not be carrying at
      // all: for a Breaker a throw that gains nothing still beats walking.
      // `unloadBonus` is flat and outside `safety` on purpose: the keeper
      // throws into two interceptors rather than hold or dig in, and the safety
      // term still ranks the receivers, safe first, far second.
      out.push({
        action: { kind: 'pass', targetId: mate.id },
        value:
          (w.pass * odds * (progress + opening * 3) + w.handOff * odds) * safety +
          unloadBonus * odds +
          ordered -
          risk * w.avoidOpportunity -
          home,
        why: `pass to ${mate.name}, ${gained} cells on${played ? ', last link' : ''}, shot ${Math.round(mine * 100)} to ${Math.round(theirs * 100)}, ${risk} in the lane`,
      });
    }

    return out;
  }

  // -- Violence -----------------------------------------------------------------

  private violenceAt(at: Point, options: ActionOptions, from: Point | null): Priced[] {
    const { state, unit, weights: w } = this.board;
    const out: Priced[] = [];
    const stats = statsFor(unit.role, unit.tier);
    const marked = findOrder(this.board.orders, 'markTarget');

    // Already in reach from where the unit stands: see `actionsAt`.
    const fresh = (option: TargetOption): boolean =>
      from === null || distance(from, unitOf(state, option.unitId)) > 1;

    // The bodyguard's target: an opponent standing on our own carrier. Zero for
    // every role but the Breaker, whose charge is the carrier (2H.7).
    const ownCarrier = this.board.carrier && this.board.carrier.team === unit.team ? this.board.carrier : null;
    const onOurCarrier = (target: Unit): boolean =>
      ownCarrier !== null && ownCarrier.id !== unit.id && distance(target, ownCarrier) <= 1;

    for (const option of options.attack) {
      if (!fresh(option)) continue;
      const target = unitOf(state, option.unitId);
      const odds = chance(stats.might, option.against, option.mode);

      // A swing does not make anyone drop the ball, so a carrier is only worth
      // half of the appetite for stripping one. The Shove below is the real tool.
      // Everybody else is worth what this role makes of its shirt (`prey`):
      // the Breaker's Strikers first, Breakers, then the Trajector.
      let value =
        w.attack * (target.holdingPayload ? 1 : w.prey[target.role]) +
        (target.holdingPayload ? w.stripCarrier * 0.5 : 0);
      if (onOurCarrier(target)) value += w.guardStrike;
      if (marked?.targetId === target.id) value += ORDER_PULL;
      if (target.hp <= 4.5 + stats.might) value *= 1.4;

      out.push({
        action: { kind: 'attack', targetId: target.id },
        value: value * odds,
        why: `swing at ${target.name}`,
      });
    }

    for (const option of options.shove) {
      if (!fresh(option)) continue;
      const target = unitOf(state, option.unitId);
      const odds = contestChance(stats.might, option.against);

      // A successful Shove takes the ball, which is the only way to get it off
      // somebody without waiting for a pass.
      let value = w.shove + (target.holdingPayload ? w.stripCarrier : 0);
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
      });
    }

    out.push(...this.crackersAt(at, options, from));
    return out;
  }

  /**
   * Aiming a Cracker. Every line is tried, the ones that would go off on a
   * team-mate are never offered, and a line that hits nobody is still worth a
   * little when it clears the thing away from the swinger.
   */
  private crackersAt(at: Point, options: ActionOptions, from: Point | null): Priced[] {
    const { arena, state, unit, weights: w } = this.board;
    const out: Priced[] = [];
    const odds = chance(statsFor(unit.role, unit.tier).might, CRACKER_AC);

    for (const option of options.batCracker) {
      const cracker = state.crackers.find((c) => c.id === option.crackerId);
      if (!cracker) continue;
      if (from !== null && distance(from, cracker) <= 1) continue;

      for (const direction of option.directions) {
        const run = battedCrackerRun(arena, state, cracker, direction);
        const struck = run.struck;

        if (struck?.team === unit.team) continue;

        if (struck) {
          const value = w.batCracker + (struck.holdingPayload ? w.stripCarrier * 0.5 : 0);
          out.push({
            action: { kind: 'batCracker', crackerId: cracker.id, direction },
            value: value * odds,
            why: `send the Cracker into ${struck.name}`,
          });
          continue;
        }

        // Nobody down that line, but getting it away from here still buys the
        // unit a round of not being the nearest thing to a live charge.
        out.push({
          action: { kind: 'batCracker', crackerId: cracker.id, direction },
          value: w.batCracker * 0.2 * odds * clearance(at, run.landing),
          why: 'clear the Cracker away',
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

/** The actions that do something to the board, as opposed to the stances. */
const SPENDS_ON_THE_BOARD: ReadonlySet<Action['kind']> = new Set([
  'attack',
  'shove',
  'batCracker',
  'pass',
  'shoot',
]);

function isThrow(action: Action): boolean {
  return action.kind === 'pass' || action.kind === 'shoot';
}

/** Whether anybody is standing on this player, which is what makes a pass a way out. */
function crowded(board: Board, unit: Unit): boolean {
  return board.enemies.some((e) => Math.max(Math.abs(e.x - unit.x), Math.abs(e.y - unit.y)) <= 1);
}

function clearance(from: Point, landing: Point): number {
  const gap = Math.max(Math.abs(from.x - landing.x), Math.abs(from.y - landing.y));
  return Math.min(1, gap / 8);
}

// -- Ranking ----------------------------------------------------------------

/**
 * Best first. The AI rolls no dice, so two plans worth the same have to
 * resolve the same way every time or a match stops replaying: the shorter
 * plan first, so a Dash to nowhere never beats the plain walk; then the one
 * that acts before it walks; then the steps themselves.
 */
function rank(plans: readonly Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
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
