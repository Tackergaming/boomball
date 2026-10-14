import { describe, expect, it } from 'vitest';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { MATCH_ROUNDS, MOVE_SPEED_FEET } from '../engine/constants.js';
import { distance, type Point } from '../engine/geometry.js';
import type { Action } from '../engine/actions.js';
import type { MatchEvent } from '../engine/events.js';
import { legalActions } from '../engine/legalActions.js';
import { openMatch, reduce } from '../engine/reduce.js';
import { rangeToFurnace } from '../engine/rules/payload.js';
import { createMatch } from '../engine/setup.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import { chooseAction, rankPlans, type Plan } from './chooseAction.js';



const arena = new Arena(KILL_SILO);

const CORNER: Point = { x: 0, y: 44 };

/**
 * A match opened with everyone parked away, so a test places what it means to.
 * The Crackers are parked too (spent until a round no test reaches); a test
 * about the Crackers puts one back where it wants it.
 */
function board(seed = 5): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  const opened = openMatch(arena, {
    ...created,
    units: created.units.map((u) => ({ ...u, ...CORNER })),
    crackers: created.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 99 })),
  }).state;
  // The clock is handed to OPENER, cursor and all, so the chain's reading of
  // who has played (écart 51) is the one a real round would give: everybody
  // before OPENER on the ladder has, everybody after has not.
  const at = opened.turnOrder.findIndex(
    (s) => s.actor.kind === 'unit' && s.actor.unitId === OPENER,
  );
  return giveTurnTo({ ...opened, turnIndex: at }, OPENER);
}

function put(state: MatchState, id: UnitId, at: Point, extra: Partial<Unit> = {}): MatchState {
  // A unit moved while on the clock starts its turn there (écart 56).
  const turn = state.turn && state.turn.unitId === id ? { ...state.turn, startedAt: { x: at.x, y: at.y } } : state.turn;
  return { ...state, turn, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

/** Hands the clock to a unit, cursor and all, so the ladder reads as a real round would. */
function clockOn(state: MatchState, unitId: UnitId): MatchState {
  const at = state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === unitId);
  if (at < 0) throw new Error(`${unitId} has no slot`);
  return giveTurnTo({ ...state, turnIndex: at }, unitId);
}

/** Hands the turn to a named unit, cursor untouched. */
function giveTurnTo(state: MatchState, unitId: UnitId): MatchState {
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
    },
  };
}

function unit(state: MatchState, id: UnitId): Unit {
  return state.units.find((u) => u.id === id)!;
}

/** Drives one unit's whole turn the way `selfPlay` does, and hands back the log. */
function playOutTurn(start: MatchState, unitId: UnitId): MatchEvent[] {
  const events: MatchEvent[] = [];
  let state = start;

  for (let i = 0; i < 60; i++) {
    const action = chooseAction(arena, state, unitId);
    if (action.kind === 'endTurn') break;
    const result = reduce(arena, state, { unitId, action });
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    events.push(...result.events);
    state = result.state;
    if (!state.turn || state.turn.unitId !== unitId) break;
  }

  return events;
}

/** One unit's turn with the real ladder set aside, handing back the board it leaves. */
function playTurnOf(start: MatchState, unitId: UnitId): MatchState {
  let state = giveTurnTo(start, unitId);
  for (let i = 0; i < 60; i++) {
    const action = chooseAction(arena, state, unitId);
    if (action.kind === 'endTurn') break;
    const result = reduce(arena, state, { unitId, action });
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    state = result.state;
    if (!state.turn || state.turn.unitId !== unitId) break;
  }
  return state;
}

function carrying(state: MatchState, id: UnitId): MatchState {
  const holder = unit(state, id);
  return {
    ...put(state, id, { x: holder.x, y: holder.y }, { holdingPayload: true }),
    payload: { carriedBy: id, x: holder.x, y: holder.y },
  };
}

// The shirt `board()` hands the clock to: team A's first Striker, second on
// its side's ladder behind the Trajector (écart 51).
const OPENER = 'A-striker-2';

describe("Jérôme's sixth pass, 2H.12: the Breaker picks up first", () => {
  const breaker = 'A-breaker-5';

  function parkB(state: MatchState, at: Point = { x: 7, y: 2 }): MatchState {
    return { ...state, units: state.units.map((u) => (u.team === 'B' ? { ...u, ...at } : u)) };
  }

  function sparkAt(state: MatchState, at: Point, heading: number): MatchState {
    return { ...state, spark: { state: 'live', x: at.x, y: at.y, heading } };
  }

  const kinds = (plan: Plan) => plan.steps.map((s) => s.kind);

  function show(plans: Plan[]) {
    return plans.slice(0, 6).map((p) => [p.score.toFixed(1), kinds(p).join('>'), p.why]);
  }

  /** The Breaker at (7,22), the ball loose at `ball`, the B shirts parked away, the clock on `who`. */
  function scene(ball: Point, who: UnitId = breaker, opponent: Point | null = null): MatchState {
    let s = parkB(board(), { x: 7, y: 2 });
    s = { ...s, payload: { carriedBy: null, x: ball.x, y: ball.y }, lastCarrierTeam: 'A' };
    s = put(s, who, { x: 7, y: 22 });
    if (opponent) s = put(s, 'B-striker-2', opponent);
    return clockOn(s, who);
  }

  const near: Point = { x: 7, y: 26 }; // 4 cells
  const dashed: Point = { x: 7, y: 34 }; // 12 cells
  const far: Point = { x: 7, y: 42 }; // 20 cells

  it('goes for a ball 4 cells away rather than hit the opponent beside it', () => {
    const state = scene(near, breaker, { x: 8, y: 22 });
    const plans = rankPlans(arena, state, breaker);
    const best = plans[0]!;
    expect(kinds(best), JSON.stringify(show(plans))).toContain('grabPayload');
    expect(['move', 'grabPayload']).toContain(best.steps[0]!.kind);
  });

  it('dashes for a ball 12 cells away: [dash, move, grabPayload]', () => {
    const state = scene(dashed);
    const plans = rankPlans(arena, state, breaker);
    expect(kinds(plans[0]!), JSON.stringify(show(plans))).toEqual(['dash', 'move', 'grabPayload']);

    const events = playOutTurn(state, breaker);
    expect(events.some((e) => e.kind === 'dashed')).toBe(true);
    const moved = events.filter((e) => e.kind === 'moved');
    expect(moved.length).toBeGreaterThan(0);
    expect((moved[0] as { to: Point }).to).toEqual(dashed);
    expect(events.some((e) => e.kind === 'payloadGrabbed')).toBe(true);
    expect(events.some((e) => e.kind === 'passed' || e.kind === 'shotAtFurnace')).toBe(false);
  });

  it('still dashes for the ball when an opponent stands in reach', () => {
    const state = scene(dashed, breaker, { x: 8, y: 22 });
    const plans = rankPlans(arena, state, breaker);
    expect(kinds(plans[0]!), JSON.stringify(show(plans))).toEqual(['dash', 'move', 'grabPayload']);
  });

  it('does not chase a ball 20 cells away, beyond a Dash', () => {
    const state = scene(far);
    const plans = rankPlans(arena, state, breaker);
    expect(plans.some((p) => kinds(p).includes('grabPayload'))).toBe(false);
    expect(plans.some((p) => p.why.startsWith('the ball first'))).toBe(false);
  });

  it('picks up even with a Striker of its own, yet to play, next to the ball', () => {
    let state = scene({ x: 7, y: 25 });
    state = put(state, 'A-striker-3', { x: 7, y: 26 });
    const events = playOutTurn(state, breaker);
    expect(events.some((e) => e.kind === 'payloadGrabbed')).toBe(true);
  });

  it('catches the Spark it stands on before going for the ball', () => {
    const state = sparkAt(scene({ x: 7, y: 25 }), { x: 7, y: 22 }, 1);
    const plans = rankPlans(arena, state, breaker);
    expect(plans[0]!.steps[0]?.kind, JSON.stringify(show(plans))).toBe('catchSpark');
    // And the ball after it, the walk reaching it (fil principal, from the
    // subagent's finding that the plain pickup outranked the catch).
    expect(plans[0]!.steps.map((s) => s.kind)).toEqual(['catchSpark', 'move', 'grabPayload']);
  });

  it('control: a Striker at the same spot is not told the ball comes first', () => {
    const state = scene(dashed, 'A-striker-2');
    const plans = rankPlans(arena, state, 'A-striker-2');
    expect(plans.some((p) => p.why.startsWith('the ball first'))).toBe(false);
  });

  it('ranks the plans fast', () => {
    const state = scene(dashed);
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      rankPlans(arena, state, breaker);
      best = Math.min(best, performance.now() - t);
    }
    expect(best).toBeLessThan(50);
  });
});
