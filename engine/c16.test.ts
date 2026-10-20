/**
 * Écart 63 (2H.14, `docs/00-reglement-v2.md` C16, Jérôme on 2026-10-14, engine
 * version 9): a Shove that took the ball leaves the shover one pass for the
 * rest of its turn, without an Action. `turn.freePass` carries it: set by
 * `applyShove` on a successful Shove of a carrier, spent by `applyPass`,
 * cleared when a turn opens, and read by `legalActions` for `pass` alone.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { ENGINE_VERSION, MOVE_SPEED_FEET } from './constants.js';
import type { MatchEvent } from './events.js';
import type { Point } from './geometry.js';
import { legalActions, onlyEndTurnLeft } from './legalActions.js';
import { openMatch, reduce, type ReduceResult } from './reduce.js';
import { createMatch } from './setup.js';
import type { Action } from './actions.js';
import type { MatchState, Unit, UnitId } from './types.js';

const arena = new Arena(KILL_SILO);
const CORNER: Point = { x: 0, y: 44 };

const SHOVER = 'A-striker-2';
const CARRIER = 'B-striker-3';
const MATE = 'A-striker-3';
const SHOVER_AT: Point = { x: 7, y: 22 };
const CARRIER_AT: Point = { x: 8, y: 22 };
const MATE_AT: Point = { x: 3, y: 22 };

// -- Fixtures (the style of c15.test.ts) -------------------------------------

/** Every unit parked in one corner, Crackers out of the way, the match open on round 1. */
function parked(seed = 7): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  return openMatch(arena, {
    ...created,
    units: created.units.map((u) => ({ ...u, ...CORNER })),
    crackers: created.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 99 })),
  }).state;
}

function put(state: MatchState, id: UnitId, at: Point, extra: Partial<Unit> = {}): MatchState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

function unit(state: MatchState, id: UnitId): Unit {
  return state.units.find((u) => u.id === id)!;
}

function cellOf(u: Point): Point {
  return { x: u.x, y: u.y };
}

function clockOn(state: MatchState, id: UnitId): MatchState {
  const at = state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === id);
  if (at < 0) throw new Error(`${id} has no slot`);
  const holder = unit(state, id);
  return {
    ...state,
    turnIndex: at,
    turn: {
      unitId: id,
      startedAt: cellOf(holder),
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      freePass: false,
      pickedBy: null,
      delegated: false,
      disengaged: false,
      placing: null,
      shot: false,
    },
  };
}

function carrying(state: MatchState, id: UnitId): MatchState {
  const holder = unit(state, id);
  return {
    ...put(state, id, holder, { holdingPayload: true }),
    payload: { carriedBy: id, x: holder.x, y: holder.y },
    lastCarrierTeam: holder.team,
  };
}

function act(state: MatchState, action: Action, unitId?: UnitId): ReduceResult {
  return reduce(arena, state, { unitId: unitId ?? state.turn!.unitId, action });
}

function must(state: MatchState, action: Action, unitId?: UnitId) {
  const result = act(state, action, unitId);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result;
}

function refusal(state: MatchState, action: Action): string {
  const result = act(state, action);
  if (result.ok) throw new Error('expected a refusal');
  return result.reason;
}

type Shoved = Extract<MatchEvent, { kind: 'shoved' }>;

interface Shoving {
  readonly before: MatchState;
  readonly after: MatchState;
  readonly events: readonly MatchEvent[];
  readonly shoved: Shoved;
}

/**
 * The shover and a team-mate in range and in sight to the west, the target
 * beside the shover to the east, the ball with the target when it is a carrier.
 * Walks the seeds until the contest goes the wanted way.
 */
function shove(opts: {
  carrier: boolean;
  success: boolean;
  shoverAt?: Point;
  targetAt?: Point;
  mateAt?: Point;
}): Shoving {
  const shoverAt = opts.shoverAt ?? SHOVER_AT;
  const targetAt = opts.targetAt ?? CARRIER_AT;
  for (let seed = 1; seed < 400; seed++) {
    let state = put(parked(), SHOVER, shoverAt);
    state = put(state, CARRIER, targetAt);
    state = put(state, MATE, opts.mateAt ?? MATE_AT);
    if (opts.carrier) state = carrying(state, CARRIER);
    const before = { ...clockOn(state, SHOVER), rngSeed: seed };
    const result = must(before, { kind: 'shove', targetId: CARRIER });
    const shoved = result.events.find((e): e is Shoved => e.kind === 'shoved')!;
    if (shoved.success === opts.success) return { before, after: result.state, events: result.events, shoved };
  }
  throw new Error('no seed in range gave the wanted contest');
}

/** The state after a successful Shove of a carrier: the position every free-pass test starts from. */
function afterTheShove(): MatchState {
  return shove({ carrier: true, success: true }).after;
}

/** The shover holding the ball on a fresh turn, mate in range to the west. */
function carryingShover(): MatchState {
  let state = put(parked(), SHOVER, SHOVER_AT);
  state = put(state, MATE, MATE_AT);
  return clockOn(carrying(state, SHOVER), SHOVER);
}

// -- Écart 63 ---------------------------------------------------------------

describe('écart 63, the free pass after a Shove that took the ball (2H.14)', () => {
  it('is granted by a successful Shove of a carrier: the shover holds the ball, nobody moved', () => {
    const { before, after, shoved } = shove({ carrier: true, success: true });

    expect(before.turn!.freePass).toBe(false);
    expect(after.turn!.freePass).toBe(true);
    expect(after.turn!.actionUsed).toBe(true);

    expect(shoved).toMatchObject({ shoverId: SHOVER, targetId: CARRIER, success: true, pushedTo: null, tookPayload: true });
    expect(unit(after, SHOVER).holdingPayload).toBe(true);
    expect(unit(after, CARRIER).holdingPayload).toBe(false);
    expect(after.payload).toEqual({ carriedBy: SHOVER, x: SHOVER_AT.x, y: SHOVER_AT.y });
    for (const u of before.units) expect(cellOf(unit(after, u.id)), u.id).toEqual(cellOf(u));
  });

  it('is not granted by a failed Shove of a carrier: the ball stays with the carrier', () => {
    const { after, shoved } = shove({ carrier: true, success: false });

    expect(shoved).toMatchObject({ success: false, tookPayload: false });
    expect(after.turn!.freePass).toBe(false);
    expect(after.turn!.actionUsed).toBe(true);
    expect(unit(after, CARRIER).holdingPayload).toBe(true);
    expect(unit(after, SHOVER).holdingPayload).toBe(false);
    expect(after.payload.carriedBy).toBe(CARRIER);
  });

  it('is not granted by a successful Shove of a unit that does not carry: it is pushed as before', () => {
    const { after, shoved } = shove({ carrier: false, success: true });

    expect(shoved).toMatchObject({ success: true, tookPayload: false, pushedTo: { x: 9, y: 22 } });
    expect(cellOf(unit(after, CARRIER))).toEqual({ x: 9, y: 22 });
    expect(after.turn!.freePass).toBe(false);
    expect(after.turn!.actionUsed).toBe(true);
  });

  it('offers the pass and nothing else of the Action to legalActions', () => {
    const after = afterTheShove();
    const legal = legalActions(arena, after)!;

    expect(legal.pass.map((p) => p.unitId)).toEqual([MATE]);
    expect(legal.shoot).toBeNull();
    expect(legal.canDash).toBe(false);
    expect(legal.canDodge).toBe(false);
    expect(legal.canDisengage).toBe(false);
    expect(legal.canBrace).toBe(false);
    expect(legal.attack).toEqual([]);
    expect(legal.shove).toEqual([]);
    expect(legal.batCracker).toEqual([]);
    expect(legal.catchSpark).toBeNull();
    expect(legal.simple.map((a) => a.kind)).not.toContain('dash');

    // A pass is on offer, so the interface must not pass the turn on by itself.
    expect(onlyEndTurnLeft(legal)).toBe(false);
  });

  it('keeps the shot out of reach even where the Furnace is in range and in sight', () => {
    // A control first: the same carrier on a fresh turn, close to the mouth it shoots at.
    const nearFurnace = { shoverAt: { x: 7, y: 40 }, targetAt: { x: 8, y: 40 }, mateAt: { x: 3, y: 40 } };
    const { before, after } = shove({ carrier: true, success: true, ...nearFurnace });

    const fresh = { ...after, turn: { ...after.turn!, actionUsed: false, freePass: false } };
    expect(legalActions(arena, fresh)!.shoot).not.toBeNull();

    expect(before.turn!.actionUsed).toBe(false);
    expect(legalActions(arena, after)!.shoot).toBeNull();
    expect(legalActions(arena, after)!.pass.length).toBeGreaterThan(0);
  });

  it('is accepted by reduce although the Action is spent, and is used up by the throw', () => {
    const after = afterTheShove();
    expect(after.turn!.actionUsed).toBe(true);

    const result = must(after, { kind: 'pass', targetId: MATE });
    expect(result.events.some((e) => e.kind === 'passed')).toBe(true);
    expect(result.state.turn!.freePass).toBe(false);
    expect(result.state.turn!.actionUsed).toBe(true);
    // Whatever became of the ball, the shover no longer holds it.
    expect(unit(result.state, SHOVER).holdingPayload).toBe(false);
  });

  it('allows one pass only: the second is refused', () => {
    const afterPass = must(afterTheShove(), { kind: 'pass', targetId: MATE }).state;

    // Whoever now holds the ball (the mate, the floor, a thief), the shover may not throw again.
    expect(refusal(afterPass, { kind: 'pass', targetId: MATE })).toContain('has already acted');
    expect(legalActions(arena, afterPass)!.pass).toEqual([]);

    // Even with the ball put back in its hands, the free pass is gone.
    const reheld = carrying(afterPass, SHOVER);
    expect(refusal(reheld, { kind: 'pass', targetId: MATE })).toContain('has already acted');
    expect(legalActions(arena, reheld)!.pass).toEqual([]);
  });

  it('lets the shover walk first with what movement is left, then pass', () => {
    const after = afterTheShove();
    const walked = must(after, {
      kind: 'move',
      path: [
        { x: 6, y: 22 },
        { x: 5, y: 22 },
      ],
    });

    expect(cellOf(unit(walked.state, SHOVER))).toEqual({ x: 5, y: 22 });
    expect(walked.state.turn!.freePass).toBe(true);
    expect(walked.state.turn!.movementFeetRemaining).toBeLessThan(MOVE_SPEED_FEET);
    expect(unit(walked.state, SHOVER).holdingPayload).toBe(true);
    expect(legalActions(arena, walked.state)!.pass.map((p) => p.unitId)).toEqual([MATE]);

    const passed = must(walked.state, { kind: 'pass', targetId: MATE });
    expect(passed.events.some((e) => e.kind === 'passed')).toBe(true);
    expect(passed.state.turn!.freePass).toBe(false);
  });

  it('does not extend to a shot: shoot after the Shove is refused', () => {
    const after = afterTheShove();
    expect(refusal(after, { kind: 'shoot' })).toContain('has already acted');
  });

  it('does not extend to the other Actions: dash, dodge, disengage, shove stay refused', () => {
    const after = afterTheShove();
    expect(act(after, { kind: 'dash' }).ok).toBe(false);
    expect(act(after, { kind: 'dodge' }).ok).toBe(false);
    expect(act(after, { kind: 'disengage' }).ok).toBe(false);
    expect(refusal(after, { kind: 'shove', targetId: CARRIER })).toContain('has already acted');
  });

  it('leaves the ordinary rule alone: a pass with the Action spent and no free pass is refused', () => {
    const base = carryingShover();
    const spent = { ...base, turn: { ...base.turn!, actionUsed: true, freePass: false } };
    expect(refusal(spent, { kind: 'pass', targetId: MATE })).toContain('has already acted');
    expect(legalActions(arena, spent)!.pass).toEqual([]);

    // The same carrier on a fresh turn throws without trouble.
    expect(legalActions(arena, base)!.pass.map((p) => p.unitId)).toEqual([MATE]);
    expect(act(base, { kind: 'pass', targetId: MATE }).ok).toBe(true);
  });

  it('is gone with the turn: the next turn opens with freePass false, the shover’s own next turn too', () => {
    const after = afterTheShove();
    expect(after.turn!.freePass).toBe(true);

    // The shover passes its turn on without throwing.
    let state = must(after, { kind: 'endTurn' }).state;
    expect(state.turn!.unitId).not.toBe(SHOVER);
    expect(state.turn!.freePass).toBe(false);

    // And when the clock comes round to the shover again, it has lost the pass.
    let backAt = false;
    for (let i = 0; i < 300 && state.phase !== 'finished'; i++) {
      if (state.turn!.unitId === SHOVER) {
        backAt = true;
        break;
      }
      state = must(state, { kind: 'endTurn' }).state;
    }
    expect(backAt).toBe(true);
    expect(state.turn!.freePass).toBe(false);
    expect(state.turn!.actionUsed).toBe(false);
    const spent = { ...state, turn: { ...state.turn!, actionUsed: true } };
    expect(refusal(spent, { kind: 'pass', targetId: MATE })).toContain('has already acted');
  });

  it('can be intercepted like any other pass', () => {
    // An opponent with its Reaction up beside the lane, and a pass of 4 cells to the west.
    const after = put(afterTheShove(), 'B-striker-2', { x: 5, y: 21 }, { reactionAvailable: true });

    let stolen = 0;
    let held = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const { events, state } = must({ ...after, rngSeed: seed }, { kind: 'pass', targetId: MATE });
      const contest = events.find(
        (e): e is Extract<MatchEvent, { kind: 'passIntercepted' }> => e.kind === 'passIntercepted',
      );
      if (!contest) throw new Error(`seed ${seed}: the lane was not contested`);
      expect(contest).toMatchObject({ interceptorId: 'B-striker-2', throwerId: SHOVER, toId: MATE });
      expect(state.turn!.freePass, `seed ${seed}`).toBe(false);
      if (contest.success) {
        stolen++;
        expect(unit(state, 'B-striker-2').holdingPayload).toBe(true);
        expect(state.payload.carriedBy).toBe('B-striker-2');
        expect(events.some((e) => e.kind === 'passed')).toBe(false);
      } else {
        held++;
      }
    }
    expect(stolen).toBeGreaterThan(0);
    expect(held).toBeGreaterThan(0);
  });

  it('is part of engine version 9', () => {
    // Engine 9 brought it; engine 10 (écart 64, 2H.25) keeps it.
    expect(ENGINE_VERSION).toBeGreaterThanOrEqual(9);
  });
});
