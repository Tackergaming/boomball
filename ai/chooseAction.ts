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
import { CRACKER_AC, PAYLOAD_PASS_AC } from '../engine/constants.js';
import { lineTo, type Point } from '../engine/geometry.js';
import { legalActions } from '../engine/legalActions.js';
import { battedCrackerRun } from '../engine/rules/ordnance.js';
import { pathTo } from '../engine/rules/movement.js';
import { rangeToFurnace } from '../engine/rules/payload.js';
import { keepsGripAfterRecoil, passInterceptors, provokedAlong } from '../engine/rules/reactions.js';
import { statsFor } from '../engine/stats.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import {
  buildBoard,
  chance,
  contestChance,
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
    out.push({
      action: { kind: 'grabPayload' },
      score: w.grabPayload,
      why: 'the Payload is loose in this cell',
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

  for (const option of legal.pass) {
    const mate = unitOf(state, option.unitId);
    const odds = chance(aim, PAYLOAD_PASS_AC, option.mode);

    // A pass is worth the ground it gains and nothing else. Priced with a floor
    // instead, the ball goes round the team sideways all match: every throw
    // looks like progress because it is a throw.
    const gained =
      rangeToFurnace(unit, board.targetFurnace) - rangeToFurnace(mate, board.targetFurnace);
    let progress = Math.min(1.5, Math.max(0, gained / 8));

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

    const risk = passInterceptors(arena, state, unit, lineTo(unit, mate)).length;
    const ordered = called?.receiverId === mate.id ? ORDER_PULL : 0;

    out.push({
      action: { kind: 'pass', targetId: mate.id },
      score: w.pass * odds * (progress + opening * 3) + ordered - risk * w.avoidOpportunity,
      why: `pass to ${mate.name}, ${gained} cells on, shot ${Math.round(mine * 100)} to ${Math.round(theirs * 100)}`,
    });
  }

  return out;
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

  for (const option of legal.attack) {
    const target = unitOf(state, option.unitId);
    const odds = chance(stats.might, option.against, option.mode);

    // A swing does not make anyone drop the ball, so a carrier is only worth
    // half of the appetite for stripping one. The Shove below is the real tool.
    let value = w.attack + (target.holdingPayload ? w.stripCarrier * 0.5 : 0);
    if (marked?.targetId === target.id) value += ORDER_PULL;
    if (target.hp <= 4.5 + stats.might) value *= 1.4;

    const grip = keepsGripAfterRecoil(arena, state, unit, target);
    out.push({
      action: { kind: 'attack', targetId: target.id },
      score: value * odds - (grip ? 0 : w.keepGrip),
      why: `swing at ${target.name}${grip ? '' : ', which costs the grip'}`,
    });
  }

  for (const option of legal.shove) {
    const target = unitOf(state, option.unitId);
    const odds = contestChance(stats.might, option.against);

    // A successful Shove takes the ball, which is the only way to get it off
    // somebody without waiting for a pass.
    let value = w.shove + (target.holdingPayload ? w.stripCarrier : 0);
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
  const { state, unit, legal, weights: w } = board;
  const out: Candidate[] = [];
  const odds = chance(statsFor(unit.role, unit.tier).might, CRACKER_AC);

  for (const option of legal.batCracker) {
    const cracker = state.crackers.find((c) => c.id === option.crackerId);
    if (!cracker) continue;

    for (const direction of option.directions) {
      const run = battedCrackerRun(state, cracker, direction);
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
      why: 'the Spark is in this cell and it ends the match',
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

    const exposed = provokedAlong(state, unit, route).length;
    const gain = clean - exposed * w.avoidOpportunity;
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

  if (legal.canDodge) {
    const hurt = 1 - unit.hp / unit.maxHp;
    out.push({
      action: { kind: 'dodge' },
      score: w.dodgeWhenHurt * hurt,
      why: `dodge on ${unit.hp} of ${unit.maxHp}`,
    });
  }

  if (legal.canDash) {
    // Worth buying more movement in proportion to how much the movement it
    // already has is buying. Nothing to gain by walking, nothing to gain by
    // walking twice as far. It stays under a shot or a strip on purpose: the
    // Action is worth more than the ground almost every time it is a choice.
    out.push({
      action: { kind: 'dash' },
      score: w.dash * Math.min(1, bestMove / 12),
      why: 'buy a second helping of movement',
    });
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
