/**
 * The decision.
 *
 * **It decides, it never resolves.** The AI asks `legalActions` what it may do,
 * scores every one of those candidates, and hands the winner to `reduce` the
 * way a human client does. It cannot cheat even by accident, and a match plays
 * back identically whoever was driving.
 *
 * One call returns **one** action, not a whole turn. A turn is a walk, a swing
 * and another walk, so the caller loops until it gets `endTurn` back, exactly
 * as an interface loops on clicks.
 *
 * `endTurn` is scored at zero and every appetite is positive, so the unit stops
 * as soon as nothing on the board beats doing nothing.
 */

import type { Action } from '../engine/actions.js';
import type { Arena } from '../engine/arena.js';
import { CRACKER_AC, MOVE_SPEED_FEET, PAYLOAD_PASS_AC } from '../engine/constants.js';
import { reachableCells } from '../engine/rules/movement.js';
import { distance, lineTo, type Point } from '../engine/geometry.js';
import { legalActions } from '../engine/legalActions.js';
import { battedCrackerRun } from '../engine/rules/ordnance.js';
import { pathTo } from '../engine/rules/movement.js';
import { rangeToFurnace, throwRange } from '../engine/rules/payload.js';
import { passInterceptors, provokedAlong } from '../engine/rules/reactions.js';
import { hasLineOfSight } from '../engine/rules/sight.js';
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

/** One thing the unit could do, what it is worth, and why. */
export interface Candidate {
  readonly action: Action;
  readonly score: number;
  /** Plain words, for a debug overlay and for reading a failing test. */
  readonly why: string;
}

/**
 * Every candidate, best first. Exported because an AI you cannot look inside is
 * an AI you cannot tune: a test asserts on why it chose, not only on what.
 */
export function rankActions(
  arena: Arena,
  state: MatchState,
  unitId: UnitId,
  orders: readonly AllyOrder[] = [],
): Candidate[] {
  const legal = legalActions(arena, state);
  if (!legal || legal.unitId !== unitId) return [];

  const unit = unitOf(state, unitId);
  const board = buildBoard(arena, state, unit, legal, weightsFor(unit.role), ordersFor(orders, unitId));

  return rank(candidatesFor(board));
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
  return rankActions(arena, state, unitId, orders)[0]?.action ?? { kind: 'endTurn' };
}

// -- Candidates -------------------------------------------------------------

function candidatesFor(board: Board): Candidate[] {
  const out: Candidate[] = [
    // The baseline every appetite has to beat.
    { action: { kind: 'endTurn' }, score: 0, why: 'nothing on the board is worth a move' },
  ];

  out.push(...ballCandidates(board));
  out.push(...relaunchCandidates(board));
  out.push(...violenceCandidates(board));
  out.push(...sparkCandidates(board));

  const walking = moveCandidates(board);
  out.push(...walking.candidates);
  out.push(...stanceCandidates(board, walking));

  return out;
}

// -- The Payload ------------------------------------------------------------

function ballCandidates(board: Board): Candidate[] {
  const { arena, state, unit, legal, weights: w } = board;
  const out: Candidate[] = [];
  const aim = statsFor(unit.role, unit.tier).aim;

  if (legal.canGrabPayload) {
    // A Breaker standing on the ball with a Striker beside it leaves it there
    // (`yieldToKeener`); every other role takes what is at its feet.
    const share = keenerMateNear(board) ? 1 - w.yieldToKeener : 1;
    out.push({
      action: { kind: 'grabPayload' },
      score: w.grabPayload * share,
      why: share === 1 ? 'the Payload is loose in this cell' : 'the Payload is loose here, but a mate wants it more',
    });
  }

  if (legal.shoot) {
    const odds = chance(aim, legal.shoot.against, legal.shoot.mode);
    out.push({
      action: { kind: 'shoot' },
      score: w.shoot * odds,
      why: `a shot worth ${Math.round(odds * 100)} in a hundred`,
    });
  }

  const called = findOrder(board.orders, 'callForPass');

  // The chain (2H.7, Jérôme's rule). A throw goes to a team-mate who has not
  // played yet this round, so that its own move carries the ball further: the
  // ball climbs the ladder within the round. Never to somebody who has played,
  // except from the **last link**, the last of our side to act (the keeper
  // after a goal, typically), who throws to the best-placed receiver so the
  // ball starts next round in good hands. The receiver is ahead, or on the
  // same line, or at most three cells behind when it is the very next to play,
  // because its eight cells of movement will still carry the ball past us.
  const lastLink = isLastLink(board);
  const next = nextToPlay(board);
  const moveCells = MOVE_SPEED_FEET / 5;

  // Two players throw no matter who has played or where they stand: the
  // keeper relaunching after a goal (écart 54, `relaunch`), and the Spark
  // hunter, which has to get rid of the ball to go and hunt (2H.8).
  const unload = w.relaunch > 0 || board.hunter;
  const unloadBonus = w.relaunch + (board.hunter ? w.chaseSpark : 0);

  for (const option of legal.pass) {
    const mate = unitOf(state, option.unitId);
    const odds = chance(aim, PAYLOAD_PASS_AC, option.mode);

    const played = hasPlayedThisRound(state, mate.id);
    if (played && !lastLink && !unload) continue;

    const gained =
      rangeToFurnace(unit, board.targetFurnace) - rangeToFurnace(mate, board.targetFurnace);
    if (gained < 0 && !lastLink && !unload && (next?.id !== mate.id || -gained > 3)) continue;

    // Worth the ground the ball will have gained once the receiver has moved
    // too: a receiver still to play adds its whole run. Capped so a chain of
    // three does not price one throw at the whole pitch.
    const potential = Math.min(2, Math.max(0, gained + (played ? 0 : moveCells)) / moveCells);
    let progress = potential;

    // Except as a way out. Handing the ball to somebody nobody is standing on
    // is worth a throw even when it gains no ground at all.
    if (board.legal.shove.length > 0 && !crowded(board, mate)) progress += 0.35;

    // And above all, worth the shot it creates. A Breaker on the edge of range
    // holds a chance of one in a hundred; the same cell in a Striker's hands is
    // one in three. Measured against distance alone that throw gains nothing,
    // which is how the ball ended up spending most of the match in the hands of
    // the one role that cannot use it.
    const mine = shotQuality(board, unit, { x: unit.x, y: unit.y });
    const theirs = shotQuality(board, mate, { x: mate.x, y: mate.y });
    const opening = Math.max(0, theirs - mine);

    // Every defender beside the flight halves what the throw is worth: safe
    // first, far second, as Jérôme ordered the keeper's choice. It never
    // reaches zero, so a risky throw still beats holding the ball for ever.
    const risk = passInterceptors(arena, state, unit, lineTo(unit, mate)).length;
    const safety = 1 / (1 + risk);
    const ordered = called?.receiverId === mate.id ? ORDER_PULL : 0;

    // `handOff` is the flat appetite of a role that should not be carrying at
    // all: for a Breaker a throw that gains nothing still beats walking.
    // `unloadBonus` is flat and outside `safety` on purpose: the keeper
    // throws into two interceptors rather than hold or dig in, and the safety
    // term still ranks the receivers, safe first, far second.
    out.push({
      action: { kind: 'pass', targetId: mate.id },
      score:
        (w.pass * odds * (progress + opening * 3) + w.handOff * odds) * safety +
        unloadBonus * odds +
        ordered -
        risk * w.avoidOpportunity,
      why: `pass to ${mate.name}, ${gained} cells on${played ? ', last link' : ''}, shot ${Math.round(mine * 100)} to ${Math.round(theirs * 100)}, ${risk} in the lane`,
    });
  }

  return out;
}

/**
 * The relaunch with nobody to throw to (Jérôme, 2026-10-11, after reading the
 * engine 5 match: the conceding keeper dug in on both goals because none of
 * its six were within a throw and in sight). For a carrier whose role has
 * `relaunch` and no legal pass: every reachable cell from which a team-mate
 * would be in throwing range **and** in line of sight is worth the relaunch,
 * the nearest to its own mouth first, whatever the leash says, less what the
 * route would be swung at for. Once there, `ballCandidates` prices the throw
 * and it goes the same turn. No such cell, nothing is offered, and the keeper
 * digs in as it would anyway; next turn the same rule reads the board again.
 * Never a Dash for this: that would spend the Action the throw needs.
 */
function relaunchCandidates(board: Board): Candidate[] {
  const { arena, state, unit, legal, weights: w } = board;
  if (w.relaunch <= 0 || !unit.holdingPayload || legal.pass.length > 0) return [];

  const out: Candidate[] = [];
  for (const reachable of legal.destinations.values()) {
    const cell = reachable.cell;
    const outlet = board.mates.find(
      (mate) => throwRange(cell, mate).ok && hasLineOfSight(arena, cell, mate),
    );
    if (!outlet) continue;
    const route = pathTo(legal.destinations, cell);
    if (!route) continue;
    const exposed = provokedAlong(state, unit, route).length;
    out.push({
      action: { kind: 'move', path: route },
      score:
        w.relaunch - rangeToFurnace(cell, board.ownFurnace) * 0.5 - exposed * w.avoidOpportunity,
      why: `step out to (${cell.x}, ${cell.y}) for a line to ${outlet.name}`,
    });
  }
  return rank(out).slice(0, 2);
}

/** Whether anybody is standing on this player, which is what makes a pass a way out. */
function crowded(board: Board, unit: Unit): boolean {
  return board.enemies.some((e) => Math.max(Math.abs(e.x - unit.x), Math.abs(e.y - unit.y)) <= 1);
}

// -- Violence ---------------------------------------------------------------

function violenceCandidates(board: Board): Candidate[] {
  const { arena, state, unit, legal, weights: w } = board;
  const out: Candidate[] = [];
  const stats = statsFor(unit.role, unit.tier);
  const marked = findOrder(board.orders, 'markTarget');

  // The Spark hunter swings at nobody: its Action is for the catch (2H.8).
  if (board.hunter) return out;

  // The bodyguard's target: an opponent standing on our own carrier. Zero for
  // every role but the Breaker, whose charge is the carrier (2H.7).
  const ownCarrier = board.carrier && board.carrier.team === unit.team ? board.carrier : null;
  const onOurCarrier = (target: Unit): boolean =>
    ownCarrier !== null && ownCarrier.id !== unit.id && distance(target, ownCarrier) <= 1;

  for (const option of legal.attack) {
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
      score: value * odds,
      why: `swing at ${target.name}`,
    });
  }

  for (const option of legal.shove) {
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
      score: value * odds,
      why: `shove ${target.name}${target.holdingPayload ? ' off the ball' : ''}`,
    });
  }

  out.push(...crackerCandidates(board));
  return out;
}

/**
 * Aiming a Cracker. Every line is tried, the ones that would go off on a
 * team-mate are never offered, and a line that hits nobody is still worth a
 * little when it clears the thing away from the swinger.
 */
function crackerCandidates(board: Board): Candidate[] {
  const { arena, state, unit, legal, weights: w } = board;
  const out: Candidate[] = [];
  const odds = chance(statsFor(unit.role, unit.tier).might, CRACKER_AC);

  for (const option of legal.batCracker) {
    const cracker = state.crackers.find((c) => c.id === option.crackerId);
    if (!cracker) continue;

    for (const direction of option.directions) {
      const run = battedCrackerRun(arena, state, cracker, direction);
      const struck = run.struck;

      if (struck?.team === unit.team) continue;

      if (struck) {
        const value = w.batCracker + (struck.holdingPayload ? w.stripCarrier * 0.5 : 0);
        out.push({
          action: { kind: 'batCracker', crackerId: cracker.id, direction },
          score: value * odds,
          why: `send the Cracker into ${struck.name}`,
        });
        continue;
      }

      // Nobody down that line, but getting it away from here still buys the
      // unit a round of not being the nearest thing to a live charge.
      out.push({
        action: { kind: 'batCracker', crackerId: cracker.id, direction },
        score: w.batCracker * 0.2 * odds * clearance(unit, run.landing),
        why: 'clear the Cracker away',
      });
    }
  }

  return out;
}

function clearance(unit: Unit, landing: Point): number {
  const gap = Math.max(Math.abs(unit.x - landing.x), Math.abs(unit.y - landing.y));
  return Math.min(1, gap / 8);
}

// -- The Spark --------------------------------------------------------------

function sparkCandidates(board: Board): Candidate[] {
  const { unit, legal, weights: w } = board;
  if (!legal.catchSpark) return [];

  const odds = chance(statsFor(unit.role, unit.tier).agility, legal.catchSpark.against);
  return [
    {
      action: { kind: 'catchSpark' },
      score: w.catchSpark * odds,
      why: 'the Spark is in this cell and it is worth two goals',
    },
  ];
}

// -- Walking ----------------------------------------------------------------

/**
 * Every reachable cell, priced as the ground it gains minus what the walk
 * costs on the way. The route matters as much as the destination, which is why
 * the opportunity attacks it would draw are counted here and not in
 * `positionValue`.
 */
interface Walking {
  readonly candidates: readonly Candidate[];
  /**
   * The best ground available **ignoring** what the walk would be swung at for.
   * Kept apart because Disengage exists precisely to buy that penalty off: a
   * unit that only ever sees the penalised figure decides it has nowhere to go,
   * so it never disengages, so it still has nowhere to go.
   */
  readonly bestClean: number;
}

function moveCandidates(board: Board): Walking {
  const { state, unit, legal, weights: w } = board;
  const here = positionValue(board, { x: unit.x, y: unit.y });
  const out: Candidate[] = [];
  let bestClean = 0;

  for (const reachable of legal.destinations.values()) {
    const route = pathTo(legal.destinations, reachable.cell);
    if (!route) continue;

    const clean = positionValue(board, reachable.cell) - here;
    if (clean > bestClean) bestClean = clean;

    // The Spark hunter takes the opportunity attack and goes (2H.8); a braced
    // keeper that walks loses its footing, which is worth what digging in was.
    const exposed = board.hunter ? 0 : provokedAlong(state, unit, route).length;
    const gain = clean - exposed * w.avoidOpportunity - (unit.braced ? w.brace : 0);
    if (gain <= 0) continue;

    out.push({
      action: { kind: 'move', path: route },
      score: gain,
      why: `walk to (${reachable.cell.x}, ${reachable.cell.y})`,
    });
  }

  // Only the best route is ever taken, and a hundred losing candidates make a
  // ranking hard to read in a failing test.
  return { candidates: rank(out).slice(0, 4), bestClean };
}

/**
 * Dash, Dodge and Disengage. None of them does anything on its own, so each is
 * priced against what the rest of the turn wants.
 */
function stanceCandidates(board: Board, walking: Walking): Candidate[] {
  const { unit, legal, weights: w } = board;
  const out: Candidate[] = [];
  const bestMove = walking.candidates[0]?.score ?? 0;

  // Dodge is the last resort, not a default (Jérôme, 2H.7: too many Dodges
  // where a Dash or a Shove was there). Only when badly hurt, and only when
  // there is nothing to swing at, shove, throw or shoot.
  const nothingToDo =
    legal.attack.length === 0 &&
    legal.shove.length === 0 &&
    legal.pass.length === 0 &&
    legal.shoot === null &&
    legal.batCracker.length === 0;
  if (legal.canDodge && nothingToDo) {
    const hurt = 1 - unit.hp / unit.maxHp;
    if (hurt >= 0.5) {
      out.push({
        action: { kind: 'dodge' },
        score: w.dodgeWhenHurt * (hurt - 0.5) * 2,
        why: `dodge on ${unit.hp} of ${unit.maxHp}, nothing else to do`,
      });
    }
  }

  // Dig in (écart 52): the keeper's default, Jérôme's second pass (2H.8). It
  // does not wait for anybody to come: with nothing better on, a throw, a
  // ball within reach or a carrier to shove, it digs in. Not if already
  // braced; those three score higher when they are on.
  if (legal.canBrace && !unit.braced) {
    out.push({ action: { kind: 'brace' }, score: w.brace, why: 'dig in' });
  }

  if (legal.canDash) {
    out.push(...dashCandidates(board, bestMove));
  }

  // Pressed, carrying, and with ground to gain if the swings could be bought
  // off. That is the whole case for Disengage, and it has to be read against
  // the unpenalised figure or the action never fires when it is most needed.
  if (legal.canDisengage && unit.holdingPayload && legal.shove.length > 0) {
    out.push({
      action: { kind: 'disengage' },
      score: w.disengage * Math.min(1, walking.bestClean / 12),
      why: `walk the ball out clean past ${legal.shove.length}`,
    });
  }

  return out;
}

/**
 * Dash (2H.8, Jérôme's second pass). Three reasons to spend the Action on
 * movement, and one reason never to.
 *
 * Never: a target in reach. "Une cible à portée se frappe ou se bouscule,
 * jamais un déplacement de trois cases à la place": with a swing, a shove or
 * a Cracker on offer, the plain Dash is not, and the Action goes to one of
 * them or to nothing. The hunter is exempt, since it swings at nobody.
 *
 * The plain Dash, otherwise, is worth a share of what the walk is already
 * buying, and stays under a shot or a strip on purpose.
 *
 * The press: the other side's carrier is out of reach of a plain move but a
 * Dash gets this unit adjacent to it. Worth the press itself, so a Striker
 * twelve cells from the carrier dashes to finish on it and holds the
 * opportunity attack when it leaves, rather than swinging at whoever is
 * nearer.
 *
 * The wall: our own carrier is more than a move away from a Breaker. Worth
 * `block`, so it runs to be beside the carrier next round rather than hit a
 * straggler.
 */
function dashCandidates(board: Board, bestMove: number): Candidate[] {
  const { arena, state, unit, legal, weights: w } = board;
  const violence = legal.attack.length + legal.shove.length + legal.batCracker.length > 0;

  let score = violence && !board.hunter ? 0 : w.dash * Math.min(1, bestMove / 12);
  let why = 'buy a second helping of movement';

  const carrier = board.carrier;
  const withDash = (): ReadonlyMap<string, { cell: Point }> =>
    reachableCells(arena, state, unit, state.turn!.movementFeetRemaining + MOVE_SPEED_FEET);
  const within = (cells: Iterable<{ cell: Point }>, target: Point, gap: number): boolean => {
    for (const { cell } of cells) {
      if (distance(cell, target) <= gap && rangeToFurnace(cell, board.ownFurnace) <= w.leash) {
        return true;
      }
    }
    return false;
  };

  if (carrier && !board.hunter && !unit.holdingPayload) {
    if (carrier.team !== unit.team && w.pressCarrier > 0) {
      const now = distance(unit, carrier) <= 1 || within(legal.destinations.values(), carrier, 1);
      if (!now && within(withDash().values(), carrier, 1) && w.pressCarrier > score) {
        score = w.pressCarrier;
        why = `dash to get on ${carrier.name}`;
      }
    } else if (carrier.team === unit.team && w.block > 0 && weightsFor(carrier.role).wantsEscort > 0) {
      const now = distance(unit, carrier) <= 2 || within(legal.destinations.values(), carrier, 2);
      if (!now && within(withDash().values(), carrier, 2) && w.block > score) {
        score = w.block;
        why = `dash to get beside ${carrier.name}`;
      }
    }
  }

  if (score <= 0) return [];
  return [{ action: { kind: 'dash' }, score, why }];
}

// -- Ranking ----------------------------------------------------------------

/**
 * Best first, ties broken on the action itself. The AI rolls no dice, so two
 * candidates worth the same have to resolve the same way every time or a match
 * stops replaying.
 */
function rank(candidates: readonly Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return actionKey(a.action).localeCompare(actionKey(b.action));
  });
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
