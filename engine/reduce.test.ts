import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { MOVE_SPEED_FEET, MATCH_ROUNDS, SUDDEN_DEATH_ROUNDS } from './constants.js';
import type { MatchEvent } from './events.js';
import { distance } from './geometry.js';
import { openMatch, reduce } from './reduce.js';
import { pathTo, reachableCells } from './rules/movement.js';
import { createMatch } from './setup.js';
import { unitAt, type MatchState, type Unit } from './types.js';

const arena = new Arena(KILL_SILO);

function opened(seed = 11): MatchState {
  return openMatch(arena, createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed })).state;
}

function acting(state: MatchState): Unit {
  return state.units.find((u) => u.id === state.turn!.unitId)!;
}

/**
 * One free cell a unit can step onto, taken vertically. Which way is open
 * depends on the side: the layout mirrors around y=22, so a kick-off row sits
 * above its catwalk for one team and below it for the other. Asking the arena
 * keeps these tests about the movement budget and not about who won the
 * initiative tie.
 */
function oneStepFrom(unit: Unit): { x: number; y: number } {
  const step = [
    { x: unit.x, y: unit.y + 1 },
    { x: unit.x, y: unit.y - 1 },
  ].find((cell) => arena.isOccupiable(cell));
  if (!step) throw new Error(`${unit.id} is walled in at (${unit.x}, ${unit.y})`);
  return step;
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
    expect(state.turn!.movementFeetRemaining).toBe(MOVE_SPEED_FEET);
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
    const step = oneStepFrom(unit);

    const after = must(state, { kind: 'move', path: [step] }).state;
    const moved = after.units.find((u) => u.id === unit.id)!;

    expect({ x: moved.x, y: moved.y }).toEqual(step);
    expect(after.turn!.movementFeetRemaining).toBe(MOVE_SPEED_FEET - 5);
  });

  it('leaves the Action untouched when a unit only moves', () => {
    const state = opened();
    const unit = acting(state);
    const after = must(state, { kind: 'move', path: [oneStepFrom(unit)] }).state;
    expect(after.turn!.actionUsed).toBe(false);
  });

  it('buys a second helping of movement with Dash, and spends the Action', () => {
    const after = must(opened(), { kind: 'dash' }).state;
    expect(after.turn!.movementFeetRemaining).toBe(MOVE_SPEED_FEET * 2);
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

describe('ending a turn', () => {
  it('records the end of a turn with the unit and nothing about a grip', () => {
    // There is no anchoring any more: standing where you stand is always safe,
    // so the event carries the kind and the unit and no flag.
    const state = opened();
    const unit = acting(state);
    const { events } = must(state, { kind: 'endTurn' });
    const ended = events.find((e) => e.kind === 'turnEnded');

    expect(ended).toEqual({ kind: 'turnEnded', unitId: unit.id });
    expect(ended).not.toHaveProperty('anchored');
  });

  it('leaves a unit exactly where it stopped, wherever that is', () => {
    const state = opened();
    const unit = acting(state);
    const after = must(state, { kind: 'endTurn' }).state;
    const same = after.units.find((u) => u.id === unit.id)!;
    expect({ x: same.x, y: same.y }).toEqual({ x: unit.x, y: unit.y });
  });
});

describe('evacuation on the spot', () => {
  /** The acting unit, an enemy at 1 hp beside it, and a seed where the bat lands. */
  function felled(carrying = false): { before: MatchState; after: MatchState; events: readonly MatchEvent[]; victim: Unit } {
    for (let seed = 1; seed < 400; seed++) {
      const start = opened(seed);
      const actor = acting(start);
      const enemy = start.units.find((u) => u.team !== actor.team && u.role !== 'bulwark')!;
      const spot = { x: actor.x + 1, y: actor.y };
      if (!arena.isOccupiable(spot) || unitAt(start, spot.x, spot.y)) continue;

      const before: MatchState = {
        ...start,
        units: start.units.map((u) =>
          u.id === enemy.id ? { ...u, ...spot, hp: 1, holdingPayload: carrying } : u,
        ),
        payload: carrying ? { carriedBy: enemy.id, x: spot.x, y: spot.y } : start.payload,
      };
      const result = reduce(arena, before, {
        unitId: actor.id,
        action: { kind: 'attack', targetId: enemy.id },
      });
      if (!result.ok) continue;
      if (result.events.some((e) => e.kind === 'evacuated' && e.unitId === enemy.id)) {
        return { before, after: result.state, events: result.events, victim: before.units.find((u) => u.id === enemy.id)! };
      }
    }
    throw new Error('no seed in range landed the killing blow');
  }

  it('leaves a carried ball on a free cell beside where the carrier fell (écart 42)', () => {
    const { after, events, victim } = felled(true);
    const fell = { x: victim.x, y: victim.y };

    expect(after.payload.carriedBy).toBeNull();
    const ball = { x: after.payload.x, y: after.payload.y };
    expect(ball).not.toEqual(fell);
    expect(distance(ball, fell)).toBe(1);
    expect(arena.isOccupiable(ball)).toBe(true);
    expect(unitAt(after, ball.x, ball.y)).toBeUndefined();

    const dropped = events.findIndex((e) => e.kind === 'payloadDropped');
    const rolled = events.findIndex((e) => e.kind === 'payloadScattered');
    const off = events.findIndex((e) => e.kind === 'evacuated');
    expect(dropped).toBeGreaterThan(-1);
    expect(rolled).toBeGreaterThan(dropped);
    expect(off).toBeGreaterThan(rolled);
    expect(events[rolled]).toMatchObject({ to: ball, cells: 1 });
  });

  it('keeps the evacuated unit where it fell, with its status changed', () => {
    const { after, victim } = felled();
    const down = after.units.find((u) => u.id === victim.id)!;

    expect(down.status).toBe('evacuated');
    expect(down.hp).toBe(0);
    expect({ x: down.x, y: down.y }).toEqual({ x: victim.x, y: victim.y });
  });

  it('frees the cell for everybody else the moment the unit is down', () => {
    const { before, after, victim } = felled();
    expect(unitAt(before, victim.x, victim.y)?.id).toBe(victim.id);
    expect(unitAt(after, victim.x, victim.y)).toBeUndefined();
  });

  it('lets another unit walk onto that cell', () => {
    // The bat's recoil has pushed the attacker two cells back, so the route to
    // the vacated cell is found rather than assumed adjacent.
    const { after, victim } = felled();
    const actor = acting(after);
    const reachable = reachableCells(arena, after, actor, after.turn!.movementFeetRemaining);
    const path = pathTo(reachable, { x: victim.x, y: victim.y });

    expect(path).not.toBeNull();
    const stepOn = reduce(arena, after, { unitId: actor.id, action: { kind: 'move', path: path! } });
    expect(stepOn.ok).toBe(true);
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
