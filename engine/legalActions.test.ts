import { describe, expect, it } from 'vitest';

import type { Action } from './actions.js';
import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { BULWARK_BLOCK_BONUS, FURNACE_AC } from './constants.js';
import type { Point } from './geometry.js';
import { legalActions, onlyEndTurnLeft } from './legalActions.js';
import { openMatch, reduce } from './reduce.js';
import { key, pathTo } from './rules/movement.js';
import { visibleRangeToFurnace } from './rules/payload.js';
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

  it('offers the Spark to a player on its cell who is not carrying the ball', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const state: MatchState = {
      ...start,
      spark: { state: 'live', x: actor.x, y: actor.y, heading: 1 },
      units: start.units.map((u) => (u.id === actor.id ? { ...u, holdingPayload: false } : u)),
    };

    const legal = legalActions(arena, state)!;
    expect(legal.catchSpark).not.toBeNull();
    expect(legal.simple).toContainEqual({ kind: 'catchSpark' });
  });

  it('never offers the Spark to a carrier, and the engine refuses it too (écart 57)', () => {
    // A carrier standing on the Spark has the ball to deliver; trying for the
    // Spark is not a move it gets, in the menu or by hand.
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const state: MatchState = {
      ...start,
      spark: { state: 'live', x: actor.x, y: actor.y, heading: 1 },
      payload: { ...start.payload, carriedBy: actor.id, x: actor.x, y: actor.y },
      units: start.units.map((u) => (u.id === actor.id ? { ...u, holdingPayload: true } : u)),
    };

    const legal = legalActions(arena, state)!;
    expect(legal.catchSpark).toBeNull();
    expect(legal.simple).not.toContainEqual({ kind: 'catchSpark' });

    const result = reduce(arena, state, { unitId: actor.id, action: { kind: 'catchSpark' } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/holding the Payload/);
  });

  it('offers a pass only to team-mates inside sixty feet and in sight', () => {
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
        if (u.id === far.id) return { ...u, x: 7, y: 43 };
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
        if (u.id === keeper.id) return { ...u, x: 7, y: 43 };
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

  describe('a pass behind an obstacle', () => {
    /** The acting player holding the ball at (7, 14), a team-mate somewhere on purpose. */
    function throwing(mateAt: Point): { state: MatchState; mateId: string } {
      const start = base();
      const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
      const mate = start.units.find((u) => u.team === actor.team && u.id !== actor.id)!;
      return {
        mateId: mate.id,
        state: {
          ...start,
          payload: { carriedBy: actor.id, x: 7, y: 14 },
          units: start.units.map((u) => {
            if (u.id === actor.id) return { ...u, x: 7, y: 14, holdingPayload: true };
            if (u.id === mate.id) return { ...u, ...mateAt };
            return u;
          }),
        },
      };
    }

    it('leaves out a team-mate in range but behind the pillar', () => {
      // Four cells away, straight through the pillar at (7, 16).
      expect(arena.isSolid({ x: 7, y: 16 })).toBe(true);
      const { state, mateId } = throwing({ x: 7, y: 18 });
      expect(legalActions(arena, state)!.pass.map((t) => t.unitId)).not.toContain(mateId);
    });

    it('lists the same team-mate once it is in sight', () => {
      const { state, mateId } = throwing({ x: 3, y: 18 });
      expect(legalActions(arena, state)!.pass.map((t) => t.unitId)).toContain(mateId);
    });

    it('is refused by the engine for the same reason', () => {
      const { state, mateId } = throwing({ x: 7, y: 18 });
      const result = reduce(arena, state, {
        unitId: state.turn!.unitId,
        action: { kind: 'pass', targetId: mateId },
      });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toMatch(/out of sight/);
    });
  });

  describe('a shot at a hidden Furnace', () => {
    /** A team A carrier on a cell, shooting at Furnace B, which team B defends. */
    function carrierAt(at: Point): MatchState {
      const start = base();
      const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
      return {
        ...start,
        payload: { carriedBy: actor.id, ...at },
        units: start.units.map((u) =>
          u.id === actor.id ? { ...u, team: 'A' as const, ...at, holdingPayload: true } : u,
        ),
      };
    }

    it('is withdrawn within nine cells when every hatch cell is behind an obstacle', () => {
      // Eight cells from the mouth, with the post at (3..4, 38..39) in the way.
      const hidden: Point = { x: 3, y: 36 };
      expect(visibleRangeToFurnace(arena, hidden, arena.furnaceOf('B'))).toBeNull();

      expect(legalActions(arena, carrierAt(hidden))!.shoot).toBeNull();
    });

    it('is refused by the engine for the same reason', () => {
      const state = carrierAt({ x: 3, y: 36 });
      const result = reduce(arena, state, { unitId: state.turn!.unitId, action: { kind: 'shoot' } });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toMatch(/out of sight/);
    });

    it('is offered from a cell with a clear line, as close to the mouth', () => {
      const clear: Point = { x: 5, y: 36 };
      expect(visibleRangeToFurnace(arena, clear, arena.furnaceOf('B'))).toBe(8);

      const shot = legalActions(arena, carrierAt(clear))!.shoot;
      expect(shot).not.toBeNull();
      expect(shot!.mode).toBe('normal');
    });
  });

  describe('the lines a Cracker may be batted down', () => {
    /** The acting player at `actorAt`, a live Cracker at `crackerAt`. */
    function beside(actorAt: Point, crackerAt: Point): MatchState {
      const start = base();
      const actorId = start.turn!.unitId;
      return {
        ...start,
        units: start.units.map((u) => (u.id === actorId ? { ...u, ...actorAt } : u)),
        crackers: start.crackers.map((c, i) =>
          i === 0 ? { ...c, ...crackerAt, state: 'live' as const, respawnOnRound: null } : c,
        ),
      };
    }

    it('leaves out a line that runs straight into the pillar, and keeps the one away from it', () => {
      // The Cracker at (7, 15) has the pillar (7, 16) directly north of it.
      const legal = legalActions(arena, beside({ x: 6, y: 14 }, { x: 7, y: 15 }))!;
      const directions = legal.batCracker[0]!.directions;

      expect(directions).not.toContain(1);
      expect(directions).toContain(5);
      expect(directions).toHaveLength(7);
    });

    it('leaves out the three faces that point off the pitch at the west edge', () => {
      const legal = legalActions(arena, beside({ x: 1, y: 10 }, { x: 0, y: 10 }))!;

      expect(legal.batCracker[0]!.directions).toEqual([1, 2, 3, 4, 5]);
    });

    it('offers all eight in the open', () => {
      const legal = legalActions(arena, beside({ x: 6, y: 22 }, { x: 7, y: 22 }))!;

      expect(legal.batCracker[0]!.directions).toHaveLength(8);
    });
  });

  it('says when ending the turn is the only thing left, and not before', () => {
    // The interface passes the turn on by itself when this is true, so a false
    // positive skips a turn a player still had something to do in.
    const start = base();
    const unitId = start.turn!.unitId;
    expect(onlyEndTurnLeft(legalActions(arena, start)!)).toBe(false);

    // Spend the Action and every foot of movement. Dash is refused once the
    // Action is gone, so this is genuinely the end of the turn.
    const dodged = must(start, { kind: 'dodge' }).state;
    expect(onlyEndTurnLeft(legalActions(arena, dodged)!)).toBe(false);

    const spent: MatchState = {
      ...dodged,
      turn: { ...dodged.turn!, movementFeetRemaining: 0 },
    };
    expect(spent.turn!.unitId).toBe(unitId);
    expect(onlyEndTurnLeft(legalActions(arena, spent)!)).toBe(true);
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
