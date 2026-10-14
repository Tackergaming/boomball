import { describe, expect, it } from 'vitest';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { MOVE_SPEED_FEET, PAYLOAD_LONG_RANGE_CELLS } from '../engine/constants.js';
import { distance, type Point } from '../engine/geometry.js';
import { openMatch } from '../engine/reduce.js';
import { createMatch } from '../engine/setup.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import { rankPlans, type Plan } from './chooseAction.js';

const arena = new Arena(KILL_SILO);

const TRAJECTOR_A = 'A-trajector-7';
const TRAJECTOR_B = 'B-trajector-7';
const STRIKER_A = 'A-striker-2';
const MATE = 'A-striker-3';
const CORNER: Point = { x: 0, y: 44 };

type Turn = NonNullable<MatchState['turn']>;

function unit(state: MatchState, id: UnitId): Unit {
  return state.units.find((u) => u.id === id)!;
}

/** The turn of a named unit, the Action in hand unless the test says otherwise. */
function giveTurnTo(state: MatchState, unitId: UnitId, extra: Partial<Turn> = {}): MatchState {
  return {
    ...state,
    turn: {
      unitId,
      startedAt: { x: unit(state, unitId).x, y: unit(state, unitId).y },
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      freePass: false,
      disengaged: false,
      placing: null,
      shot: false,
      ...extra,
    },
  };
}

/** Hands the clock to a unit, cursor and all, so the ladder reads as a real round would. */
function clockOn(state: MatchState, unitId: UnitId, extra: Partial<Turn> = {}): MatchState {
  const at = state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === unitId);
  if (at < 0) throw new Error(`${unitId} has no slot`);
  return giveTurnTo({ ...state, turnIndex: at }, unitId, extra);
}

function put(state: MatchState, id: UnitId, at: Point, extra: Partial<Unit> = {}): MatchState {
  const turn = state.turn && state.turn.unitId === id ? { ...state.turn, startedAt: { x: at.x, y: at.y } } : state.turn;
  return { ...state, turn, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

/** A match opened on the real start cells, round 1, the Crackers spent, nobody carrying. */
function kickoffBoard(seed = 5): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  return openMatch(arena, {
    ...created,
    crackers: created.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 99 })),
  }).state;
}

/** A match with everybody parked in a corner so a scene places what it means to. */
function emptyBoard(seed = 5): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  return openMatch(arena, {
    ...created,
    units: created.units.map((u) => ({ ...u, ...CORNER })),
    crackers: created.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 99 })),
  }).state;
}

const kinds = (plan: Plan) => plan.steps.map((s) => s.kind);

/** Where a plan's walk ends: the last cell of its last `move`, or null when it never walks. */
function endOf(plan: Plan): Point | null {
  const moves = plan.steps.filter((s) => s.kind === 'move') as { kind: 'move'; path: Point[] }[];
  const last = moves[moves.length - 1];
  return last ? last.path[last.path.length - 1]! : null;
}

/** The first plans of a ranking, as a line a failing assertion can print. */
function show(plans: Plan[], n = 6) {
  return plans.slice(0, n).map((p) => [p.score.toFixed(1), kinds(p).join('>'), JSON.stringify(endOf(p)), p.why]);
}

const picksUp = (plan: Plan) => plan.steps.some((s) => s.kind === 'grabPayload');
const passesTo = (plan: Plan, id: UnitId) => plan.steps.some((s) => s.kind === 'pass' && s.targetId === id);
const passes = (plan: Plan) => plan.steps.some((s) => s.kind === 'pass');
const shoots = (plan: Plan) => plan.steps.some((s) => s.kind === 'shoot');

describe('the kick-off relay, 2H.14 (C16 point 1)', () => {
  const START: Point = { x: 12, y: 14 };
  const BALL: Point = { x: 7, y: 22 };

  /** Round 1, A's Trajector on the clock at its start cell, the ball loose and never carried. */
  function openingRound(): MatchState {
    const s = kickoffBoard();
    expect(s.payload).toMatchObject({ carriedBy: null, x: BALL.x, y: BALL.y });
    expect(s.lastCarrierTeam).toBeNull();
    return clockOn(s, TRAJECTOR_A);
  }

  it('the Trajector best plan never ends nearer its own mouth than its start, and not at (5, 1)', () => {
    const state = openingRound();
    expect(state.turn!.startedAt).toEqual(START);
    const plans = rankPlans(arena, state, TRAJECTOR_A);
    expect(plans.length).toBeGreaterThan(0);
    const end = endOf(plans[0]!) ?? START;
    expect(end.y, JSON.stringify(show(plans))).toBeGreaterThanOrEqual(START.y);
    expect(end).not.toEqual({ x: 5, y: 1 });
  });

  it('no plan of the ranking, Dash and retreat included, ends nearer its own mouth than the start cell', () => {
    const plans = rankPlans(arena, openingRound(), TRAJECTOR_A);
    for (const plan of plans) {
      const end = endOf(plan) ?? START;
      expect(end.y, JSON.stringify([kinds(plan), plan.why, end])).toBeGreaterThanOrEqual(START.y);
    }
  });

  it('the best plan ends ahead of the ball or level with it, within a pass of the ball cell', () => {
    const plans = rankPlans(arena, openingRound(), TRAJECTOR_A);
    const end = endOf(plans[0]!);
    expect(end, JSON.stringify(show(plans))).not.toBeNull();
    expect(end!.y, JSON.stringify(show(plans))).toBeGreaterThanOrEqual(20);
    expect(distance(end!, BALL), JSON.stringify(show(plans))).toBeLessThanOrEqual(PAYLOAD_LONG_RANGE_CELLS);
  });

  it('after a carry (lastCarrierTeam A, a Striker holding the ball) the relay does not apply and B plans normally', () => {
    let s = kickoffBoard();
    s = put(s, STRIKER_A, { x: 7, y: 26 }, { holdingPayload: true });
    s = { ...s, payload: { carriedBy: STRIKER_A, x: 7, y: 26 }, lastCarrierTeam: 'A' };
    s = clockOn(s, TRAJECTOR_B);
    const plans = rankPlans(arena, s, TRAJECTOR_B);
    expect(plans.length, JSON.stringify(show(plans))).toBeGreaterThan(0);
    expect(plans.some(passes)).toBe(false);
  });

  it('a Striker at the kick-off is not held back: its best plan walks to the ball and picks it up', () => {
    // A-striker-2 plays second, the Trajector having played before it.
    const state = clockOn(kickoffBoard(), STRIKER_A);
    const plans = rankPlans(arena, state, STRIKER_A);
    expect(plans.some(picksUp), JSON.stringify(show(plans))).toBe(true);
    expect(kinds(plans[0]!), JSON.stringify(show(plans))).toContain('grabPayload');
  });

  it('no plan of the Trajector at the kick-off contains a grabPayload step', () => {
    const plans = rankPlans(arena, openingRound(), TRAJECTOR_A);
    expect(plans.some(picksUp), JSON.stringify(show(plans))).toBe(false);
  });
});

describe('the free pass after a Shove, écart 63 (C16 point 2)', () => {
  /**
   * A-striker-2 holds the ball at (7, 20), its Action spent by a Shove, the
   * free pass in hand. The opponents stay in the corner (0, 44): nobody can
   * reach it or the lane. The mate has played when its slot sits before the
   * clock's cursor, so the mate's slot is moved to the head of the ladder.
   */
  function thrower(
    mate: Point,
    opts: { played: boolean; freePass?: boolean; movementFeetRemaining?: number; actionUsed?: boolean; from?: Point },
  ): MatchState {
    const from: Point = opts.from ?? { x: 7, y: 20 };
    let s = emptyBoard();
    s = put(s, STRIKER_A, from, { holdingPayload: true });
    s = put(s, MATE, mate);
    s = { ...s, payload: { carriedBy: STRIKER_A, x: from.x, y: from.y }, lastCarrierTeam: 'A' };
    if (opts.played) {
      const order = [...s.turnOrder];
      const i = order.findIndex((o) => o.actor.kind === 'unit' && o.actor.unitId === MATE);
      const [slot] = order.splice(i, 1);
      order.unshift(slot!);
      s = { ...s, turnOrder: order };
    }
    return clockOn(s, STRIKER_A, {
      actionUsed: opts.actionUsed ?? true,
      freePass: opts.freePass ?? true,
      movementFeetRemaining: opts.movementFeetRemaining ?? 20,
    });
  }

  it('a mate six cells ahead who has not played is offered the pass, and no plan shoots', () => {
    const state = thrower({ x: 7, y: 26 }, { played: false });
    const plans = rankPlans(arena, state, STRIKER_A);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.some(shoots), JSON.stringify(show(plans))).toBe(false);
    expect(plans[0]!.steps.some((s) => s.kind === 'pass' && s.targetId === MATE), JSON.stringify(show(plans))).toBe(true);
  });

  it('a mate that has already played this round is still offered the pass', () => {
    const state = thrower({ x: 7, y: 26 }, { played: true });
    const plans = rankPlans(arena, state, STRIKER_A);
    expect(plans.some((p) => passesTo(p, MATE)), JSON.stringify(show(plans))).toBe(true);
    expect(plans.some(shoots)).toBe(false);
  });

  it('a mate five cells behind the thrower, who has played, is still offered the pass', () => {
    // A-striker-2 attacks y = 44: the mate at y = 16 is behind it. (Column 7
    // is blocked at y = 15 and below, so the thrower stands on (7, 21).)
    const state = thrower({ x: 7, y: 16 }, { played: true, from: { x: 7, y: 21 } });
    const plans = rankPlans(arena, state, STRIKER_A);
    expect(plans.some((p) => passesTo(p, MATE)), JSON.stringify(show(plans))).toBe(true);
  });

  it('control: the same mate behind and played is not offered the pass with the Action in hand and no free pass', () => {
    // The chain keeps its two filters when the pass is an ordinary one.
    const state = thrower({ x: 7, y: 16 }, { played: true, actionUsed: false, freePass: false, from: { x: 7, y: 21 } });
    const plans = rankPlans(arena, state, STRIKER_A);
    expect(plans.some((p) => passesTo(p, MATE)), JSON.stringify(show(plans))).toBe(false);
  });

  it('with freePass false and the Action spent, no plan contains a pass', () => {
    const state = thrower({ x: 7, y: 26 }, { played: false, freePass: false });
    const plans = rankPlans(arena, state, STRIKER_A);
    expect(plans.some(passes), JSON.stringify(show(plans))).toBe(false);
    expect(plans.some(shoots)).toBe(false);
  });

  it('a [move, pass] plan exists when the mate is out of range from here but in range after the walk', () => {
    // Fourteen cells ahead: beyond the 12 of the long band. 40 ft is 8 cells.
    const state = thrower({ x: 7, y: 34 }, { played: false, movementFeetRemaining: MOVE_SPEED_FEET });
    expect(distance({ x: 7, y: 20 }, { x: 7, y: 34 })).toBeGreaterThan(PAYLOAD_LONG_RANGE_CELLS);
    const plans = rankPlans(arena, state, STRIKER_A);
    const walkThenPass = plans.filter((p) => kinds(p).join('>') === 'move>pass' && passesTo(p, MATE));
    expect(walkThenPass.length, JSON.stringify(show(plans))).toBeGreaterThan(0);
    // And no single pass reaches the mate from the thrower's own cell.
    expect(plans.some((p) => kinds(p).join('>') === 'pass' && passesTo(p, MATE))).toBe(false);
    for (const plan of walkThenPass) {
      expect(distance(endOf(plan)!, { x: 7, y: 34 })).toBeLessThanOrEqual(PAYLOAD_LONG_RANGE_CELLS);
    }
  });
});
