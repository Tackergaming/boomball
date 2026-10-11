import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { MOVE_SPEED_FEET, PENALTY_BOX_CELLS, PENALTY_BOX_ROUNDS } from './constants.js';
import type { MatchEvent } from './events.js';
import { distance, type Point } from './geometry.js';
import { openMatch, reduce } from './reduce.js';
import { barredCells, boxClosed, penaltyBoxCells } from './rules/box.js';
import { pushDestination } from './rules/combat.js';
import { reachableCells, validatePath } from './rules/movement.js';
import { createMatch } from './setup.js';
import { type MatchState, type Unit, type UnitId } from './types.js';

const arena = new Arena(KILL_SILO);
const CORNER: Point = { x: 0, y: 44 };

/** The mouth of Furnace A, the one team B scores in. */
const MOUTH_A = { x: 7, y: 1 };

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

/** Hands the clock to a unit, cursor and all, so the ladder reads as a real round would. */
function clockOn(state: MatchState, id: UnitId): MatchState {
  const at = state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === id);
  if (at < 0) throw new Error(`${id} has no slot`);
  return {
    ...state,
    turnIndex: at,
    turn: {
      unitId: id,
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      disengaged: false,
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

/**
 * A goal by team B into Furnace A, staged: the shooter stands in clean sight
 * of the mouth, A's keeper is at home, and the seed is walked until the shot
 * goes in, so the test reads the goal and not the dice.
 */
function goalByB(stage: (s: MatchState) => MatchState = (s) => s): {
  before: MatchState;
  after: MatchState;
  events: readonly MatchEvent[];
} {
  const shooter = 'B-striker-2';
  let base = put(parked(), 'A-bulwark-1', MOUTH_A);
  base = carrying(put(base, shooter, { x: 7, y: 6 }), shooter);
  base = clockOn(stage(base), shooter);

  for (let seed = 1; seed < 500; seed++) {
    const before = { ...base, rngSeed: seed };
    const result = reduce(arena, before, { unitId: shooter, action: { kind: 'shoot' } });
    if (!result.ok) throw new Error(result.reason);
    if (result.events.some((e) => e.kind === 'scored')) {
      return { before, after: result.state, events: result.events };
    }
  }
  throw new Error('no seed scored');
}

describe('the penalty box, écart 53', () => {
  it('is the 33 cells within three of a hatch cell, four rows deep', () => {
    const cells = penaltyBoxCells(arena, arena.furnaceOf('A'));
    expect(cells).toHaveLength(33);
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(7 - PENALTY_BOX_CELLS - 1);
      expect(cell.x).toBeLessThanOrEqual(7 + PENALTY_BOX_CELLS + 1);
      expect(cell.y).toBeLessThanOrEqual(PENALTY_BOX_CELLS);
      expect(arena.isOccupiable(cell)).toBe(true);
    }
    expect(cells).toContainEqual(MOUTH_A);
    // The mirror holds for the other mouth.
    expect(penaltyBoxCells(arena, arena.furnaceOf('B'))).toHaveLength(33);
  });

  it('is open until a goal closes it, through the round after the goal', () => {
    const { before, after } = goalByB();
    expect(boxClosed(before, 'A')).toBe(false);
    expect(barredCells(arena, before, 'B').size).toBe(0);

    expect(after.penaltyBox.A).toBe(before.round + PENALTY_BOX_ROUNDS);
    expect(after.penaltyBox.B).toBeNull();
    expect(boxClosed(after, 'A')).toBe(true);
    expect(barredCells(arena, after, 'B').size).toBe(33);
    // The defending side is never barred from its own box.
    expect(barredCells(arena, after, 'A').size).toBe(0);
  });

  it('puts the scorers already inside out on the nearest free cell beyond the edge', () => {
    const inside: readonly [UnitId, Point][] = [
      ['B-striker-3', { x: 5, y: 2 }],
      ['B-breaker-5', { x: 9, y: 3 }],
    ];
    const { after, events } = goalByB((s) => {
      let staged = s;
      for (const [id, at] of inside) staged = put(staged, id, at);
      return staged;
    });

    const relocated = events.filter((e) => e.kind === 'relocated');
    // The shooter at (7, 6) is outside and stays; the two inside are moved.
    expect(relocated.map((e) => e.kind === 'relocated' && e.unitId).sort()).toEqual([
      'B-breaker-5',
      'B-striker-3',
    ]);
    const barred = barredCells(arena, after, 'B');
    for (const [id, from] of inside) {
      const now = unit(after, id);
      expect(barred.has(`${now.x},${now.y}`)).toBe(false);
      expect(now.y).toBeLessThanOrEqual(5);
      // Nearest free cell outside: never further than a cell or two from the edge.
      expect(distance(now, from)).toBeLessThanOrEqual(3);
    }
    expect(unit(after, 'B-striker-2').y).toBe(6);
    // The two land on distinct cells, and on nobody.
    const moved = inside.map(([id]) => unit(after, id));
    expect(`${moved[0]!.x},${moved[0]!.y}`).not.toBe(`${moved[1]!.x},${moved[1]!.y}`);
    for (const m of moved) {
      expect(after.units.filter((u) => u.status === 'active' && u.x === m.x && u.y === m.y)).toHaveLength(1);
    }
  });

  it('closes the box to the scorers’ routes and not to the defenders’', () => {
    const { after } = goalByB();
    const intruder = put(after, 'B-striker-3', { x: 7, y: 5 });
    const scorer = unit(intruder, 'B-striker-3');
    const reach = reachableCells(arena, intruder, scorer, MOVE_SPEED_FEET);
    const barred = barredCells(arena, intruder, 'B');
    expect(reach.size).toBeGreaterThan(0);
    for (const r of reach.values()) expect(barred.has(`${r.cell.x},${r.cell.y}`)).toBe(false);
    expect(validatePath(arena, intruder, scorer, [{ x: 7, y: 4 }, { x: 7, y: 3 }], 40).ok).toBe(
      false,
    );

    const defender = put(intruder, 'A-striker-2', { x: 7, y: 5 });
    const home = unit(defender, 'A-striker-2');
    const ours = reachableCells(arena, defender, home, MOVE_SPEED_FEET);
    expect([...ours.values()].some((r) => r.cell.y <= 3)).toBe(true);
  });

  it('stops a push at the edge of the box like a crate', () => {
    const { after } = goalByB();
    // A scorer just outside the box, shoved by a defender standing behind it.
    const staged = put(put(after, 'B-striker-3', { x: 7, y: 4 }), 'A-striker-2', { x: 7, y: 5 });
    const target = unit(staged, 'B-striker-3');
    const landing = pushDestination(arena, staged, target, unit(staged, 'A-striker-2'));
    expect(landing).toEqual({ x: 7, y: 4 });

    // The same shove on a defender goes through.
    const mirrored = put(put(after, 'A-striker-3', { x: 7, y: 4 }), 'B-striker-4', { x: 7, y: 5 });
    const ally = unit(mirrored, 'A-striker-3');
    expect(pushDestination(arena, mirrored, ally, unit(mirrored, 'B-striker-4'))).toEqual({
      x: 7,
      y: 3,
    });
  });

  it('opens again at the top of the second round after the goal', () => {
    const { after } = goalByB();
    const goalRound = after.round;
    let state = after;
    let guard = 0;
    while (state.round <= goalRound + PENALTY_BOX_ROUNDS && guard++ < 400) {
      expect(boxClosed(state, 'A')).toBe(true);
      const result = reduce(arena, state, { unitId: state.turn!.unitId, action: { kind: 'endTurn' } });
      if (!result.ok) throw new Error(result.reason);
      state = result.state;
    }
    expect(state.round).toBe(goalRound + PENALTY_BOX_ROUNDS + 1);
    expect(boxClosed(state, 'A')).toBe(false);
    expect(state.penaltyBox.A).toBeNull();
  });
});

describe('the keeper’s relaunch, écart 54', () => {
  function sideSlots(state: MatchState, team: 'A' | 'B'): UnitId[] {
    return state.turnOrder
      .filter((s) => s.actor.kind === 'unit' && s.team === team)
      .map((s) => (s.actor as { unitId: UnitId }).unitId);
  }

  function firstIndexOf(state: MatchState, team: 'A' | 'B'): number {
    return state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.team === team);
  }

  it('moves the conceding keeper to the head of its block when that block is still ahead', () => {
    // Pick a seed on which B's block comes before A's, so A is still to play.
    for (let seed = 1; seed < 40; seed++) {
      const probe = parked(seed);
      if (firstIndexOf(probe, 'B') > firstIndexOf(probe, 'A')) continue;

      const { before, after } = goalByB(() => {
        let s = put(parked(seed), 'A-bulwark-1', MOUTH_A);
        s = carrying(put(s, 'B-striker-2', { x: 7, y: 6 }), 'B-striker-2');
        return s;
      });
      expect(firstIndexOf(before, 'A')).toBeGreaterThan(before.turnIndex);
      expect(sideSlots(before, 'A')[0]).not.toBe('A-bulwark-1');

      expect(sideSlots(after, 'A')[0]).toBe('A-bulwark-1');
      expect(sideSlots(after, 'A').slice(1)).toEqual(
        sideSlots(before, 'A').filter((id) => id !== 'A-bulwark-1'),
      );
      // B's own block and the cursor are untouched, ranks renumbered.
      expect(sideSlots(after, 'B')).toEqual(sideSlots(before, 'B'));
      expect(after.turnIndex).toBe(before.turnIndex);
      expect(after.turnOrder.map((s) => s.rank)).toEqual(after.turnOrder.map((_, i) => i + 1));
      expect(after.relaunch).toBeNull();
      return;
    }
    throw new Error('no seed put B before A');
  });

  it('opens the next round with the keeper when the conceding side has already played', () => {
    for (let seed = 1; seed < 40; seed++) {
      const probe = parked(seed);
      if (firstIndexOf(probe, 'A') > firstIndexOf(probe, 'B')) continue;

      const { before, after } = goalByB(() => {
        let s = put(parked(seed), 'A-bulwark-1', MOUTH_A);
        s = carrying(put(s, 'B-striker-2', { x: 7, y: 6 }), 'B-striker-2');
        return s;
      });
      expect(firstIndexOf(before, 'A')).toBeLessThan(before.turnIndex);

      // This round's ladder is left alone, the flag is set for the next one.
      expect(sideSlots(after, 'A')).toEqual(sideSlots(before, 'A'));
      expect(after.relaunch).toBe('A');

      let state = after;
      let guard = 0;
      while (state.round === after.round && guard++ < 100) {
        const r = reduce(arena, state, { unitId: state.turn!.unitId, action: { kind: 'endTurn' } });
        if (!r.ok) throw new Error(r.reason);
        state = r.state;
      }
      expect(state.round).toBe(after.round + 1);
      expect(sideSlots(state, 'A')[0]).toBe('A-bulwark-1');
      expect(state.relaunch).toBeNull();

      // And only that once: the round after, the keeper is back at the tail.
      while (state.round === after.round + 1 && guard++ < 200) {
        const r = reduce(arena, state, { unitId: state.turn!.unitId, action: { kind: 'endTurn' } });
        if (!r.ok) throw new Error(r.reason);
        state = r.state;
      }
      expect(sideSlots(state, 'A')[sideSlots(state, 'A').length - 1]).toBe('A-bulwark-1');
      return;
    }
    throw new Error('no seed put A before B');
  });
});

describe('the box opens on the keeper’s throw, écart 53 bis', () => {
  type Outcome = 'caught' | 'missed' | 'intercepted';

  /** The keeper, ball in hands and clock in hand, throws from the mouth to (7, 7). */
  function keeperThrow(outcome: Outcome) {
    const { after } = goalByB();
    expect(boxClosed(after, 'A')).toBe(true);
    expect(after.penaltyBox.A).not.toBeNull();
    expect(unit(after, 'A-bulwark-1').holdingPayload).toBe(true);

    let base = put(after, 'A-striker-3', { x: 7, y: 7 });
    if (outcome === 'intercepted') {
      base = put(base, 'B-striker-3', { x: 8, y: 4 }, { reactionAvailable: true });
    }
    base = clockOn(base, 'A-bulwark-1');

    for (let seed = 1; seed < 2000; seed++) {
      const staged = { ...base, rngSeed: seed };
      const result = reduce(arena, staged, {
        unitId: 'A-bulwark-1',
        action: { kind: 'pass', targetId: 'A-striker-3' },
      });
      if (!result.ok) throw new Error(result.reason);
      const passed = result.events.find((e) => e.kind === 'passed');
      const stolen = result.events.some((e) => e.kind === 'passIntercepted' && e.success);
      if (outcome === 'intercepted' ? stolen : !stolen && passed && passed.caught === (outcome === 'caught')) {
        return { staged, result, events: result.events };
      }
    }
    throw new Error(`no seed gave a ${outcome} pass`);
  }

  function expectOpen(state: MatchState): void {
    expect(state.penaltyBox.A).toBeNull();
    expect(boxClosed(state, 'A')).toBe(false);
    expect(barredCells(arena, state, 'B').size).toBe(0);
  }

  it('opens when the pass is caught', () => {
    const { result } = keeperThrow('caught');
    expectOpen(result.state);
  });

  it('opens when the pass is missed and the ball scatters', () => {
    const { result, events } = keeperThrow('missed');
    expect(events.some((e) => e.kind === 'payloadScattered')).toBe(true);
    expectOpen(result.state);
  });

  it('opens when the pass is intercepted', () => {
    const { result, events } = keeperThrow('intercepted');
    const steal = events.find((e) => e.kind === 'passIntercepted' && e.success);
    if (steal?.kind !== 'passIntercepted') throw new Error('no interception');
    expect(unit(result.state, steal.interceptorId).holdingPayload).toBe(true);
    expect(result.state.payload.carriedBy).toBe(steal.interceptorId);
    expectOpen(result.state);
  });

  it('stays closed when a field player throws', () => {
    const { after } = goalByB();
    const round = after.penaltyBox.A;
    expect(round).not.toBeNull();
    let staged = put(after, 'A-bulwark-1', MOUTH_A, { holdingPayload: false });
    staged = carrying(put(staged, 'A-striker-2', { x: 7, y: 5 }), 'A-striker-2');
    staged = put(staged, 'A-striker-3', { x: 7, y: 8 });
    staged = clockOn(staged, 'A-striker-2');

    const result = reduce(arena, { ...staged, rngSeed: 3 }, {
      unitId: 'A-striker-2',
      action: { kind: 'pass', targetId: 'A-striker-3' },
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.events.some((e) => e.kind === 'passed')).toBe(true);
    expect(result.state.penaltyBox.A).toBe(round);
    expect(boxClosed(result.state, 'A')).toBe(true);
  });
});
