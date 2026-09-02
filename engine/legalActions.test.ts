import { describe, expect, it } from 'vitest';

import type { Action } from './actions.js';
import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { BULWARK_BLOCK_BONUS, FURNACE_AC } from './constants.js';
import { legalActions } from './legalActions.js';
import { openMatch, reduce } from './reduce.js';
import { key, pathTo } from './rules/movement.js';
import { createMatch } from './setup.js';
import type { MatchState, Unit } from './types.js';

const arena = new Arena(KILL_SILO);

function base(seed = 5): MatchState {
  return openMatch(arena, createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed })).state;
}

function place(changes: (actor: Unit, state: MatchState) => Partial<Record<string, Partial<Unit>>>): MatchState {
  const start = base();
  const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
  const patch = changes(actor, start);
  return {
    ...start,
    units: start.units.map((u) => (patch[u.id] ? { ...u, ...patch[u.id] } : u)),
  };
}

function must(state: MatchState, action: Action) {
  const result = reduce(arena, state, { unitId: state.turn!.unitId, action });
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result;
}

describe('the one generator', () => {
  it('offers nothing once the match is over', () => {
    let state = base();
    for (let i = 0; i < 5000 && state.phase !== 'finished'; i++) {
      state = must(state, { kind: 'endTurn' }).state;
    }
    expect(legalActions(arena, state)).toBeNull();
  });

  it('always offers a way to end the turn', () => {
    const legal = legalActions(arena, base())!;
    expect(legal.simple).toContainEqual({ kind: 'endTurn' });
  });

  it('agrees with the engine: everything it offers is accepted', () => {
    const state = base();
    const legal = legalActions(arena, state)!;
    for (const action of legal.simple) {
      const result = reduce(arena, state, { unitId: legal.unitId, action });
      expect(result.ok, `${action.kind} was offered but refused`).toBe(true);
    }
  });

  it('agrees with the engine: every destination it offers is walkable', () => {
    const state = base();
    const legal = legalActions(arena, state)!;
    expect(legal.destinations.size).toBeGreaterThan(0);

    for (const { cell } of legal.destinations.values()) {
      const path = pathTo(legal.destinations, cell);
      expect(path, `no route to ${key(cell)}`).not.toBeNull();
      const result = reduce(arena, state, {
        unitId: legal.unitId,
        action: { kind: 'move', path: path! },
      });
      expect(result.ok, `${key(cell)} was offered but refused`).toBe(true);
    }
  });

  it('withdraws every Action once one has been spent', () => {
    const after = must(base(), { kind: 'dodge' }).state;
    const legal = legalActions(arena, after)!;
    expect(legal.canDash).toBe(false);
    expect(legal.canDodge).toBe(false);
    expect(legal.attack).toHaveLength(0);
    expect(legal.shove).toHaveLength(0);
    expect(legal.simple).toEqual([{ kind: 'endTurn' }]);
  });

  it('shrinks the reachable set as movement is spent', () => {
    const state = base();
    const before = legalActions(arena, state)!.destinations.size;
    const unit = state.units.find((u) => u.id === state.turn!.unitId)!;
    const after = must(state, { kind: 'move', path: [{ x: unit.x, y: unit.y + 1 }] }).state;
    expect(legalActions(arena, after)!.destinations.size).toBeLessThan(before);
  });
});

describe('what it offers against whom', () => {
  it('offers the bat only against an adjacent opponent, never a team-mate', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const enemy = start.units.find((u) => u.team !== actor.team)!;
    const mate = start.units.find((u) => u.team === actor.team && u.id !== actor.id)!;

    const state: MatchState = {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, x: 7, y: 22 };
        if (u.id === enemy.id) return { ...u, x: 8, y: 22 };
        if (u.id === mate.id) return { ...u, x: 6, y: 22 };
        return u;
      }),
    };

    const legal = legalActions(arena, state)!;
    expect(legal.attack.map((t) => t.unitId)).toEqual([enemy.id]);
  });

  it('publishes the number a swing has to beat, before it is thrown', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const enemy = start.units.find((u) => u.team !== actor.team && u.role === 'trajector')!;
    const state: MatchState = {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, x: 7, y: 22 };
        if (u.id === enemy.id) return { ...u, x: 8, y: 22, dodging: true };
        return u;
      }),
    };

    const option = legalActions(arena, state)!.attack.find((t) => t.unitId === enemy.id)!;
    expect(option.against).toBe(14); // Rookie Trajector AC
    expect(option.mode).toBe('disadvantage');
    expect(option.name).toBe(enemy.name);
  });

  it('keeps the Shove available to a player carrying the ball, unlike the bat', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const enemy = start.units.find((u) => u.team !== actor.team)!;
    const state: MatchState = {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, x: 7, y: 22, holdingPayload: true };
        if (u.id === enemy.id) return { ...u, x: 8, y: 22 };
        return u;
      }),
    };

    const legal = legalActions(arena, state)!;
    expect(legal.attack).toHaveLength(0);
    expect(legal.shove.map((t) => t.unitId)).toEqual([enemy.id]);
  });

  it('offers a pass only to team-mates inside sixty feet', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const near = start.units.find((u) => u.team === actor.team && u.id !== actor.id)!;
    const far = start.units.find(
      (u) => u.team === actor.team && u.id !== actor.id && u.id !== near.id,
    )!;

    const state: MatchState = {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, x: 7, y: 22, holdingPayload: true };
        if (u.id === near.id) return { ...u, x: 9, y: 22 };
        if (u.id === far.id) return { ...u, x: 7, y: 44 };
        return u;
      }),
    };

    const ids = legalActions(arena, state)!.pass.map((t) => t.unitId);
    expect(ids).toContain(near.id);
    expect(ids).not.toContain(far.id);
  });

  it('warns that a shot will be met by the goalkeeper, and by which one', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const keeper = start.units.find((u) => u.team === 'B' && u.role === 'bulwark')!;

    const state: MatchState = {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, team: 'A' as const, x: 9, y: 38, holdingPayload: true };
        if (u.id === keeper.id) return { ...u, x: 13, y: 38 };
        return u;
      }),
    };

    const shot = legalActions(arena, state)!.shoot!;
    expect(shot.blockedBy).toBe(keeper.id);
    // The hatch plus what the keeper's Reaction is worth at this Tier.
    expect(shot.against).toBe(FURNACE_AC + BULWARK_BLOCK_BONUS.rookie);

    const spent: MatchState = {
      ...state,
      units: state.units.map((u) =>
        u.id === keeper.id ? { ...u, reactionAvailable: false } : u,
      ),
    };
    const second = legalActions(arena, spent)!.shoot!;
    expect(second.blockedBy).toBeNull();
    expect(second.against).toBe(FURNACE_AC);
  });

  it('offers no shot from beyond sixty feet of the Furnace', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const state: MatchState = {
      ...start,
      units: start.units.map((u) =>
        u.id === actor.id ? { ...u, team: 'A' as const, x: 0, y: 2, holdingPayload: true } : u,
      ),
    };
    expect(legalActions(arena, state)!.shoot).toBeNull();
  });

  it('offers the loose ball only to a player standing on it', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;

    const onIt: MatchState = {
      ...start,
      payload: { carriedBy: null, x: actor.x, y: actor.y },
    };
    expect(legalActions(arena, onIt)!.canGrabPayload).toBe(true);

    const beside: MatchState = {
      ...start,
      payload: { carriedBy: null, x: actor.x + 1, y: actor.y },
    };
    expect(legalActions(arena, beside)!.canGrabPayload).toBe(false);
  });
});
