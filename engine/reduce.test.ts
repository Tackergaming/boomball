import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { FLY_SPEED_FEET, MATCH_ROUNDS, SUDDEN_DEATH_ROUNDS } from './constants.js';
import type { MatchEvent } from './events.js';
import { openMatch, reduce } from './reduce.js';
import { createMatch } from './setup.js';
import type { MatchState, Unit } from './types.js';

const arena = new Arena(KILL_SILO);

function opened(seed = 11): MatchState {
  return openMatch(arena, createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed })).state;
}

function acting(state: MatchState): Unit {
  return state.units.find((u) => u.id === state.turn!.unitId)!;
}

/** Applies a command and fails the test loudly if the engine refused it. */
function must(state: MatchState, action: Parameters<typeof reduce>[2]['action']): {
  state: MatchState;
  events: readonly MatchEvent[];
} {
  const result = reduce(arena, state, { unitId: state.turn!.unitId, action });
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return { state: result.state, events: result.events };
}

/** Runs the whole match on nothing but end-of-turn, which is legal and dull. */
function playOut(start: MatchState, maxTurns = 5000): MatchState {
  let state = start;
  for (let i = 0; i < maxTurns && state.phase !== 'finished'; i++) {
    state = must(state, { kind: 'endTurn' }).state;
  }
  return state;
}

describe('opening a match', () => {
  it('starts the first turn and hands out a full move', () => {
    const state = opened();
    expect(state.turn).not.toBeNull();
    expect(state.turn!.movementFeetRemaining).toBe(FLY_SPEED_FEET);
    expect(state.turn!.actionUsed).toBe(false);
    expect(state.round).toBe(1);
  });

  it('announces the round and the first turn in its events', () => {
    const { events } = openMatch(arena, createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed: 3 }));
    expect(events[0]).toEqual({ kind: 'roundStarted', round: 1 });
    expect(events.some((e) => e.kind === 'turnStarted')).toBe(true);
  });
});

describe('the single door', () => {
  it('refuses a command from a unit whose turn it is not', () => {
    const state = opened();
    const other = state.units.find((u) => u.id !== state.turn!.unitId)!;
    const result = reduce(arena, state, { unitId: other.id, action: { kind: 'endTurn' } });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/turn/);
  });

  it('refuses everything once the match is over', () => {
    const finished = playOut(opened());
    const result = reduce(arena, finished, { unitId: 'anyone', action: { kind: 'endTurn' } });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/over/);
  });

  it('never mutates the state it was given', () => {
    const before = opened();
    const snapshot = JSON.stringify(before);
    must(before, { kind: 'dodge' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('the turn economy', () => {
  it('bills movement against the budget and moves the unit', () => {
    const state = opened();
    const unit = acting(state);
    const step = { x: unit.x, y: unit.y + 1 };

    const after = must(state, { kind: 'move', path: [step] }).state;
    const moved = after.units.find((u) => u.id === unit.id)!;

    expect({ x: moved.x, y: moved.y }).toEqual(step);
    expect(after.turn!.movementFeetRemaining).toBe(FLY_SPEED_FEET - 5);
  });

  it('leaves the Action untouched when a unit only moves', () => {
    const state = opened();
    const unit = acting(state);
    const after = must(state, { kind: 'move', path: [{ x: unit.x, y: unit.y + 1 }] }).state;
    expect(after.turn!.actionUsed).toBe(false);
  });

  it('buys a second helping of movement with Dash, and spends the Action', () => {
    const after = must(opened(), { kind: 'dash' }).state;
    expect(after.turn!.movementFeetRemaining).toBe(FLY_SPEED_FEET * 2);
    expect(after.turn!.actionUsed).toBe(true);
  });

  it('allows only one Action a turn', () => {
    const once = must(opened(), { kind: 'dodge' }).state;
    const twice = reduce(arena, once, { unitId: once.turn!.unitId, action: { kind: 'dash' } });
    expect(twice.ok).toBe(false);
    expect(twice.ok === false && twice.reason).toMatch(/already acted/);
  });

  it('refuses a move the budget cannot pay for', () => {
    const state = opened();
    const unit = acting(state);
    const path = Array.from({ length: 9 }, (_, i) => ({ x: unit.x, y: unit.y + i + 1 }));
    const result = reduce(arena, state, { unitId: unit.id, action: { kind: 'move', path } });
    expect(result.ok).toBe(false);
  });
});

describe('Dodge and Disengage do not last the same time', () => {
  it('carries Dodge on the unit, so it holds past the end of the turn', () => {
    const state = must(opened(), { kind: 'dodge' }).state;
    const unitId = state.turn!.unitId;
    const next = must(state, { kind: 'endTurn' }).state;
    expect(next.units.find((u) => u.id === unitId)!.dodging).toBe(true);
  });

  it('clears Dodge when that unit next acts, and not before', () => {
    let state = must(opened(), { kind: 'dodge' }).state;
    const unitId = state.turn!.unitId;

    for (let i = 0; i < 400 && !(state.turn?.unitId === unitId && state.round > 1); i++) {
      state = must(state, { kind: 'endTurn' }).state;
    }
    expect(state.turn?.unitId).toBe(unitId);
    expect(state.units.find((u) => u.id === unitId)!.dodging).toBe(false);
  });

  it('carries Disengage on the turn, so it dies with the turn', () => {
    const state = must(opened(), { kind: 'disengage' }).state;
    expect(state.turn!.disengaged).toBe(true);
    const next = must(state, { kind: 'endTurn' }).state;
    expect(next.turn!.disengaged).toBe(false);
  });
});

describe('anchoring and the fall it causes', () => {
  /** An open cell with nothing to grapple, and open air under it. */
  function deadAir(): { x: number; y: number } {
    for (const cell of arena.occupiableCells()) {
      if (arena.isAnchorable(cell)) continue;
      if (cell.y < 20 || cell.y > 28) continue;
      return cell;
    }
    throw new Error('the arena has no unanchorable cell to test with');
  }

  it('records a lost grip when a turn ends in open air', () => {
    const state = opened();
    const unit = acting(state);
    const target = deadAir();
    const placed: MatchState = {
      ...state,
      units: state.units.map((u) => (u.id === unit.id ? { ...u, x: target.x, y: target.y } : u)),
    };

    const { events } = must(placed, { kind: 'endTurn' });
    const ended = events.find((e) => e.kind === 'turnEnded');
    expect(ended).toMatchObject({ unitId: unit.id, anchored: false });
  });

  it('drops the unit at the start of its next turn, not immediately', () => {
    const state = opened();
    const unit = acting(state);
    const target = deadAir();

    let current: MatchState = {
      ...state,
      units: state.units.map((u) => (u.id === unit.id ? { ...u, x: target.x, y: target.y } : u)),
    };

    // Still up there the moment the turn ends.
    current = must(current, { kind: 'endTurn' }).state;
    const afterEnd = current.units.find((u) => u.id === unit.id)!;
    expect(afterEnd.y).toBe(target.y);
    expect(afterEnd.anchored).toBe(false);

    // And falls when its turn comes round again.
    let fell: MatchEvent | undefined;
    for (let i = 0; i < 400 && !fell; i++) {
      const step = must(current, { kind: 'endTurn' });
      current = step.state;
      fell = step.events.find((e) => e.kind === 'fell' && e.unitId === unit.id);
    }

    expect(fell).toBeDefined();
    const landed = current.units.find((u) => u.id === unit.id)!;
    expect(landed.y).toBeLessThan(target.y);
    expect(landed.anchored).toBe(true);
  });
});

describe('rounds and the end of the match', () => {
  it('rolls into the next round once the ladder is spent', () => {
    let state = opened();
    const first = state.round;
    for (let i = 0; i < 100 && state.round === first; i++) {
      state = must(state, { kind: 'endTurn' }).state;
    }
    expect(state.round).toBe(first + 1);
    expect(state.turnIndex).toBeLessThan(state.turnOrder.length);
  });

  it('gives every unit its reaction back at the top of a round', () => {
    let state = opened();
    for (let i = 0; i < 100 && state.round === 1; i++) {
      state = must(state, { kind: 'endTurn' }).state;
    }
    expect(state.units.every((u) => u.reactionAvailable)).toBe(true);
  });

  it('plays ten rounds, then sudden death, then calls a draw at nil all', () => {
    const finished = playOut(opened());
    expect(finished.phase).toBe('finished');
    expect(finished.result).toEqual({ winner: 'draw' });
    expect(finished.round).toBe(MATCH_ROUNDS + SUDDEN_DEATH_ROUNDS);
    expect(finished.turn).toBeNull();
  });

  it('replays byte for byte from the same seed, and differs from another', () => {
    const a = JSON.stringify(playOut(opened(99)));
    const b = JSON.stringify(playOut(opened(99)));
    const c = JSON.stringify(playOut(opened(100)));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
