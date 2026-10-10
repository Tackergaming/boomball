import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import {
  BENCH_SIZE,
  BULWARK_BLOCK_BONUS,
  FURNACE_AC,
  GOAL_POINTS,
  SUBSTITUTE_DELAY_ROUNDS,
} from './constants.js';
import type { MatchEvent } from './events.js';
import type { Point } from './geometry.js';
import { openMatch, reduce, type ReduceResult } from './reduce.js';
import { createMatch } from './setup.js';
import type { MatchState, Unit, UnitId } from './types.js';
import type { Action } from './actions.js';
import { statsFor } from './stats.js';

const arena = new Arena(KILL_SILO);

function base(seed = 5): MatchState {
  return openMatch(arena, createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed })).state;
}

/** Puts the acting unit and one victim exactly where a test needs them. */
function staged(options: {
  seed?: number;
  actor?: Partial<Unit>;
  victim?: Partial<Unit>;
  state?: Partial<MatchState>;
}): { state: MatchState; actorId: UnitId; victimId: UnitId } {
  const start = base(options.seed ?? 5);
  const actorId = start.turn!.unitId;
  const actor = start.units.find((u) => u.id === actorId)!;
  const victim = start.units.find((u) => u.team !== actor.team)!;

  const state: MatchState = {
    ...start,
    ...options.state,
    units: start.units.map((u) => {
      if (u.id === actorId) return { ...u, ...options.actor };
      if (u.id === victim.id) return { ...u, ...options.victim };
      return u;
    }),
  };

  return { state, actorId, victimId: victim.id };
}

function run(state: MatchState, action: Action, unitId?: UnitId): ReduceResult {
  return reduce(arena, state, { unitId: unitId ?? state.turn!.unitId, action });
}

function must(state: MatchState, action: Action, unitId?: UnitId) {
  const result = run(state, action, unitId);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result;
}

/**
 * Rolls seeds until the dice cooperate. Dice tests need a known outcome, and
 * hunting a seed keeps the test deterministic without stubbing the generator.
 */
function seedWhere(
  build: (seed: number) => MatchState,
  action: (state: MatchState) => Action,
  wanted: (events: readonly MatchEvent[]) => boolean,
): { state: MatchState; events: readonly MatchEvent[] } {
  for (let seed = 1; seed < 400; seed++) {
    const state = build(seed);
    const result = run(state, action(state));
    if (result.ok && wanted(result.events)) return { state: result.state, events: result.events };
  }
  throw new Error('no seed in range produced the wanted outcome');
}

describe('swinging the bat', () => {
  it('refuses a target out of reach', () => {
    const { state, victimId } = staged({ actor: { x: 7, y: 22 }, victim: { x: 7, y: 26 } });
    const result = run(state, { kind: 'attack', targetId: victimId });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/out of reach/);
  });

  it('refuses to hit a team-mate, because the blood-truce holds', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const mate = start.units.find((u) => u.team === actor.team && u.id !== actor.id)!;
    const state: MatchState = {
      ...start,
      units: start.units.map((u) =>
        u.id === mate.id ? { ...u, x: actor.x + 1, y: actor.y } : u,
      ),
    };
    const result = run(state, { kind: 'attack', targetId: mate.id });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/blood-truce/);
  });

  it('refuses to swing while holding the Payload', () => {
    const { state, victimId } = staged({
      actor: { x: 7, y: 22, holdingPayload: true },
      victim: { x: 8, y: 22 },
    });
    const result = run(state, { kind: 'attack', targetId: victimId });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/Payload/);
  });

  it('records the roll and measures it against the target own armour', () => {
    const { state, victimId } = staged({ actor: { x: 7, y: 22 }, victim: { x: 8, y: 22 } });
    const victim = state.units.find((u) => u.id === victimId)!;
    const { events } = must(state, { kind: 'attack', targetId: victimId });

    const attack = events.find((e) => e.kind === 'attacked')!;
    expect(attack).toMatchObject({ targetId: victimId });
    expect(attack.kind === 'attacked' && attack.roll.die).toBe(20);
    // Read from the table rather than written down here: a rebalance of
    // stats.ts must not silently invalidate this test.
    expect(attack.kind === 'attacked' && attack.roll.against).toBe(
      statsFor(victim.role, victim.tier).ac,
    );
  });

  it('takes hit points off on a hit', () => {
    const { events } = seedWhere(
      (seed) => staged({ seed, actor: { x: 7, y: 22 }, victim: { x: 8, y: 22 } }).state,
      (state) => ({
        kind: 'attack',
        targetId: state.units.find((u) => u.x === 8 && u.y === 22)!.id,
      }),
      (e) => e.some((x) => x.kind === 'attacked' && x.hit),
    );
    const damage = events.find((e) => e.kind === 'damaged');
    expect(damage).toBeDefined();
    expect(damage!.kind === 'damaged' && damage!.source).toBe('bat');
  });

  it('rolls at disadvantage against a player in the Dodge stance', () => {
    const { state, victimId } = staged({
      actor: { x: 7, y: 22 },
      victim: { x: 8, y: 22, dodging: true },
    });
    const { events } = must(state, { kind: 'attack', targetId: victimId });
    const attack = events.find((e) => e.kind === 'attacked')!;
    expect(attack.kind === 'attacked' && attack.roll.mode).toBe('disadvantage');
  });

  it('throws the attacker back on the recoil, hit or miss', () => {
    const { state, actorId, victimId } = staged({
      actor: { x: 7, y: 22 },
      victim: { x: 8, y: 22 },
    });
    const { state: after, events } = must(state, { kind: 'attack', targetId: victimId });
    expect(events.some((e) => e.kind === 'recoiled')).toBe(true);
    // Ten feet directly away from what it hit.
    expect(after.units.find((u) => u.id === actorId)!.x).toBe(5);
  });

  it('stops the recoil against an obstacle rather than pushing through it', () => {
    // Row 18 has a cover at x = 4,5, so a swing eastward from (6, 18) would
    // recoil straight into it. The attacker simply does not move.
    expect(arena.isSolid({ x: 5, y: 18 })).toBe(true);
    const { state, actorId, victimId } = staged({
      actor: { x: 6, y: 18 },
      victim: { x: 7, y: 18 },
    });
    const { state: after, events } = must(state, { kind: 'attack', targetId: victimId });
    const swinger = after.units.find((u) => u.id === actorId)!;
    expect({ x: swinger.x, y: swinger.y }).toEqual({ x: 6, y: 18 });
    expect(events.some((e) => e.kind === 'recoiled')).toBe(false);
  });

  it('cuts the recoil short when the obstacle is the second cell', () => {
    // From (7, 18) the first cell west, (6, 18), is open and the second, (5, 18),
    // is the cover: one cell of the two is all it gets.
    const { state, actorId, victimId } = staged({
      actor: { x: 7, y: 18 },
      victim: { x: 8, y: 18 },
    });
    const { state: after } = must(state, { kind: 'attack', targetId: victimId });
    const swinger = after.units.find((u) => u.id === actorId)!;
    expect({ x: swinger.x, y: swinger.y }).toEqual({ x: 6, y: 18 });
  });

  it('stops the recoil against the edge of the pitch', () => {
    const { state, actorId, victimId } = staged({
      actor: { x: 1, y: 20 },
      victim: { x: 2, y: 20 },
    });
    const { state: after } = must(state, { kind: 'attack', targetId: victimId });
    const swinger = after.units.find((u) => u.id === actorId)!;
    expect({ x: swinger.x, y: swinger.y }).toEqual({ x: 0, y: 20 });
  });
});

describe('shoving', () => {
  /** A Shove hunted over the seeds until the contest goes the shover's way. */
  function shoveWon(options: {
    shover: Point;
    victim: Point;
    victimExtra?: Partial<Unit>;
    /** A third player put somewhere on purpose, behind the victim for instance. */
    bystander?: Point;
  }): { state: MatchState; events: readonly MatchEvent[]; victimId: UnitId } {
    let victimId: UnitId = '';
    const { state, events } = seedWhere(
      (seed) => {
        const built = staged({
          seed,
          actor: { ...options.shover, role: 'breaker' },
          victim: { ...options.victim, ...options.victimExtra },
        });
        victimId = built.victimId;
        if (!options.bystander) return built.state;
        const other = built.state.units.find(
          (u) => u.id !== built.actorId && u.id !== built.victimId,
        )!;
        return {
          ...built.state,
          units: built.state.units.map((u) =>
            u.id === other.id ? { ...u, ...options.bystander } : u,
          ),
        };
      },
      (s) => ({
        kind: 'shove',
        targetId: s.units.find((u) => u.x === options.victim.x && u.y === options.victim.y)!.id,
      }),
      (e) => e.some((x) => x.kind === 'shoved' && x.success),
    );
    return { state, events, victimId };
  }

  function shoveEvent(events: readonly MatchEvent[]) {
    return events.find((e): e is Extract<MatchEvent, { kind: 'shoved' }> => e.kind === 'shoved')!;
  }

  it('takes the ball off a carrier and leaves it standing there', () => {
    const { state, events, victimId } = shoveWon({
      shover: { x: 7, y: 22 },
      victim: { x: 8, y: 22 },
      victimExtra: { holdingPayload: true },
    });

    // Stripping the carrier and moving it in the same action undid the whole
    // trip towards a Furnace and made scoring impossible. Only the strip is left.
    expect(events.some((e) => e.kind === 'payloadDropped')).toBe(true);
    expect(shoveEvent(events).pushedTo).toBeNull();
    expect(state.payload.carriedBy).toBeNull();
    expect(state.payload).toMatchObject({ x: 8, y: 22 });

    const stripped = state.units.find((u) => u.id === victimId)!;
    expect({ x: stripped.x, y: stripped.y }).toEqual({ x: 8, y: 22 });
    expect(stripped.holdingPayload).toBe(false);
  });

  it('pushes anyone who is not carrying one cell straight away', () => {
    const { state, events, victimId } = shoveWon({
      shover: { x: 7, y: 22 },
      victim: { x: 8, y: 22 },
    });

    expect(shoveEvent(events).pushedTo).toEqual({ x: 9, y: 22 });
    const pushed = state.units.find((u) => u.id === victimId)!;
    expect({ x: pushed.x, y: pushed.y }).toEqual({ x: 9, y: 22 });
  });

  it('pushes along the diagonal when the shover stands on one', () => {
    const { state, events, victimId } = shoveWon({
      shover: { x: 7, y: 21 },
      victim: { x: 8, y: 22 },
    });

    expect(shoveEvent(events).pushedTo).toEqual({ x: 9, y: 23 });
    const pushed = state.units.find((u) => u.id === victimId)!;
    expect({ x: pushed.x, y: pushed.y }).toEqual({ x: 9, y: 23 });
  });

  it('does not move a target with its back to an obstacle', () => {
    // The pillar at (7, 16) is behind a victim at (7, 15) shoved from (7, 14).
    expect(arena.isSolid({ x: 7, y: 16 })).toBe(true);
    const { state, events, victimId } = shoveWon({
      shover: { x: 7, y: 14 },
      victim: { x: 7, y: 15 },
    });

    expect(shoveEvent(events).success).toBe(true);
    expect(shoveEvent(events).pushedTo).toBeNull();
    const held = state.units.find((u) => u.id === victimId)!;
    expect({ x: held.x, y: held.y }).toEqual({ x: 7, y: 15 });
  });

  it('does not move a target with another player behind it', () => {
    const { state, events, victimId } = shoveWon({
      shover: { x: 7, y: 22 },
      victim: { x: 8, y: 22 },
      bystander: { x: 9, y: 22 },
    });

    expect(shoveEvent(events).pushedTo).toBeNull();
    const held = state.units.find((u) => u.id === victimId)!;
    expect({ x: held.x, y: held.y }).toEqual({ x: 8, y: 22 });
    expect(state.units.filter((u) => u.x === 9 && u.y === 22)).toHaveLength(1);
  });

  it('does not move a target with the edge of the pitch behind it', () => {
    const { state, events, victimId } = shoveWon({
      shover: { x: 1, y: 20 },
      victim: { x: 0, y: 20 },
    });

    expect(shoveEvent(events).pushedTo).toBeNull();
    const held = state.units.find((u) => u.id === victimId)!;
    expect({ x: held.x, y: held.y }).toEqual({ x: 0, y: 20 });
  });

  it('leaves both players where they stand when the contest is lost', () => {
    let victimId: UnitId = '';
    let actorId: UnitId = '';
    const { state, events } = seedWhere(
      (seed) => {
        const built = staged({ seed, actor: { x: 7, y: 22 }, victim: { x: 8, y: 22 } });
        victimId = built.victimId;
        actorId = built.actorId;
        return built.state;
      },
      (s) => ({ kind: 'shove', targetId: s.units.find((u) => u.x === 8 && u.y === 22)!.id }),
      (e) => e.some((x) => x.kind === 'shoved' && !x.success),
    );

    expect(shoveEvent(events).pushedTo).toBeNull();
    const victim = state.units.find((u) => u.id === victimId)!;
    const shover = state.units.find((u) => u.id === actorId)!;
    expect({ x: victim.x, y: victim.y }).toEqual({ x: 8, y: 22 });
    expect({ x: shover.x, y: shover.y }).toEqual({ x: 7, y: 22 });
  });

  it('reports both sides of the contested roll', () => {
    const { state, victimId } = staged({ actor: { x: 7, y: 22 }, victim: { x: 8, y: 22 } });
    const { events } = must(state, { kind: 'shove', targetId: victimId });
    const shove = events.find((e) => e.kind === 'shoved')!;
    expect(shove.kind === 'shoved' && shove.shoverRoll.against).toBe(shove.targetRoll.total);
    expect(shove.kind === 'shoved' && shove.targetRoll.against).toBe(shove.shoverRoll.total);
  });
});

describe('the Payload', () => {
  it('is picked up for free by standing on it', () => {
    const { state, actorId } = staged({
      actor: { x: 7, y: 22 },
      state: { payload: { carriedBy: null, x: 7, y: 22 } },
    });
    const { state: after } = must(state, { kind: 'grabPayload' });
    expect(after.payload.carriedBy).toBe(actorId);
    expect(after.turn!.objectInteractionUsed).toBe(true);
    expect(after.turn!.actionUsed).toBe(false);
  });

  it('cannot be picked up from another cell', () => {
    const { state } = staged({
      actor: { x: 7, y: 22 },
      state: { payload: { carriedBy: null, x: 7, y: 24 } },
    });
    const result = run(state, { kind: 'grabPayload' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not in this cell/);
  });

  it('refuses a pass beyond sixty feet', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const mate = start.units.find((u) => u.team === actor.team && u.id !== actor.id)!;
    const state: MatchState = {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, x: 1, y: 2, holdingPayload: true };
        if (u.id === mate.id) return { ...u, x: 13, y: 40 };
        return u;
      }),
    };
    const result = run(state, { kind: 'pass', targetId: mate.id });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/beyond/);
  });

  it('throws at a penalty past thirty feet', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const mate = start.units.find((u) => u.team === actor.team && u.id !== actor.id)!;
    const state: MatchState = {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, x: 2, y: 22, holdingPayload: true };
        if (u.id === mate.id) return { ...u, x: 12, y: 22 };
        return u;
      }),
    };
    const { events } = must(state, { kind: 'pass', targetId: mate.id });
    const pass = events.find((e) => e.kind === 'passed')!;
    expect(pass.kind === 'passed' && pass.roll.mode).toBe('disadvantage');
  });

  it('scatters a fumbled pass onto a cell a player can reach', () => {
    const start = base();
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    const mate = start.units.find((u) => u.team === actor.team && u.id !== actor.id)!;

    const { state, events } = seedWhere(
      (seed) => {
        const s = base(seed);
        return {
          ...s,
          units: s.units.map((u) => {
            if (u.id === actor.id) return { ...u, x: 6, y: 22, holdingPayload: true };
            if (u.id === mate.id) return { ...u, x: 8, y: 22 };
            return u;
          }),
        };
      },
      () => ({ kind: 'pass', targetId: mate.id }),
      (e) => e.some((x) => x.kind === 'passed' && !x.caught),
    );

    expect(events.some((e) => e.kind === 'payloadScattered')).toBe(true);
    expect(state.payload.carriedBy).toBeNull();
    expect(arena.isOccupiable({ x: state.payload.x, y: state.payload.y })).toBe(true);
  });
});

describe('shooting at the Furnace', () => {
  /** A shooter with the ball, in range of Furnace 2, which team B defends. */
  function shootingState(seed: number, keeper?: Partial<Unit>): MatchState {
    const start = base(seed);
    const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
    return {
      ...start,
      units: start.units.map((u) => {
        if (u.id === actor.id) return { ...u, team: 'A' as const, x: 9, y: 38, holdingPayload: true };
        if (u.team === 'B' && u.role === 'bulwark') return { ...u, x: 7, y: 43, ...keeper };
        return u;
      }),
    };
  }

  it('draws the goalkeeper Reaction, which adds to the hatch rather than replacing it', () => {
    const state = shootingState(5);
    const { events, state: after } = must(state, { kind: 'shoot' });
    const shot = events.find((e) => e.kind === 'shotAtFurnace')!;

    expect(shot.kind === 'shotAtFurnace' && shot.blockedBy).not.toBeNull();
    // The keeper's own AC is not the number: it was written for surviving a bat,
    // and at Star it shut the goal arithmetically.
    expect(shot.kind === 'shotAtFurnace' && shot.roll.against).toBe(
      FURNACE_AC + BULWARK_BLOCK_BONUS.rookie,
    );
    expect(after.units.find((u) => u.team === 'B' && u.role === 'bulwark')!.reactionAvailable).toBe(
      false,
    );
  });

  it('lets the second shot of the round through at the Furnace itself', () => {
    const state = shootingState(5, { reactionAvailable: false });
    const { events } = must(state, { kind: 'shoot' });
    const shot = events.find((e) => e.kind === 'shotAtFurnace')!;
    expect(shot.kind === 'shotAtFurnace' && shot.blockedBy).toBeNull();
    expect(shot.kind === 'shotAtFurnace' && shot.roll.against).toBe(FURNACE_AC);
  });

  it('is not blocked by a goalkeeper who has wandered away from its Furnace', () => {
    const state = shootingState(5, { x: 7, y: 30 });
    const { events } = must(state, { kind: 'shoot' });
    const shot = events.find((e) => e.kind === 'shotAtFurnace')!;
    expect(shot.kind === 'shotAtFurnace' && shot.blockedBy).toBeNull();
  });

  it('scores ten and hands a fresh ball to the beaten goalkeeper', () => {
    const { state, events } = seedWhere(
      (seed) => shootingState(seed, { reactionAvailable: false }),
      () => ({ kind: 'shoot' }),
      (e) => e.some((x) => x.kind === 'scored'),
    );

    expect(state.score.A).toBe(GOAL_POINTS);
    const keeper = state.units.find((u) => u.team === 'B' && u.role === 'bulwark')!;
    expect(state.payload.carriedBy).toBe(keeper.id);
    expect(keeper.holdingPayload).toBe(true);
    expect(events.some((e) => e.kind === 'scored')).toBe(true);
  });

  it('keeps a saved shot in play rather than swallowing the ball', () => {
    const { state } = seedWhere(
      (seed) => shootingState(seed),
      () => ({ kind: 'shoot' }),
      (e) => e.some((x) => x.kind === 'shotAtFurnace' && !x.scored),
    );
    expect(state.payload.carriedBy).toBeNull();
    expect(arena.isOccupiable({ x: state.payload.x, y: state.payload.y })).toBe(true);
  });
});

describe('going down and coming back', () => {
  it('evacuates a player at nil hit points, and drops what it was carrying', () => {
    const { state, victimId } = staged({
      actor: { x: 7, y: 22, role: 'breaker' },
      victim: { x: 8, y: 22, hp: 1, holdingPayload: true },
    });

    const { state: after } = seedWhere(
      (seed) =>
        staged({
          seed,
          actor: { x: 7, y: 22, role: 'breaker' },
          victim: { x: 8, y: 22, hp: 1, holdingPayload: true },
        }).state,
      () => ({ kind: 'attack', targetId: victimId }),
      (e) => e.some((x) => x.kind === 'evacuated'),
    );

    const downed = after.units.find((u) => u.id === victimId)!;
    expect(downed.status).toBe('evacuated');
    // The medics drag it off where it lies: x and y stay in place.
    expect({ x: downed.x, y: downed.y }).toEqual({ x: 8, y: 22 });
    expect(after.payload.carriedBy).toBeNull();
    expect(state.units.find((u) => u.id === victimId)!.status).toBe('active');
  });

  it('brings a substitute back after two rounds and spends one from the bench', () => {
    const start = base();
    const victim = start.units.find((u) => u.team === 'B')!;
    let state: MatchState = {
      ...start,
      units: start.units.map((u) =>
        u.id === victim.id
          ? { ...u, hp: 0, status: 'evacuated' as const, evacuatedOnRound: 1, y: 0 }
          : u,
      ),
    };

    const targetRound = 1 + SUBSTITUTE_DELAY_ROUNDS;
    for (let i = 0; i < 400 && state.round < targetRound; i++) {
      state = must(state, { kind: 'endTurn' }).state;
    }

    const back = state.units.find((u) => u.id === victim.id)!;
    expect(back.status).toBe('active');
    expect(back.hp).toBe(back.maxHp);
    expect({ x: back.x, y: back.y }).toEqual(KILL_SILO.substituteEntry.B);
    expect(state.bench.B).toBe(BENCH_SIZE - 1);
  });

  it('leaves a team short once its bench is empty', () => {
    const start = base();
    const victim = start.units.find((u) => u.team === 'B')!;
    let state: MatchState = {
      ...start,
      bench: { ...start.bench, B: 0 },
      units: start.units.map((u) =>
        u.id === victim.id
          ? { ...u, hp: 0, status: 'evacuated' as const, evacuatedOnRound: 1, y: 0 }
          : u,
      ),
    };

    for (let i = 0; i < 400 && state.round < 1 + SUBSTITUTE_DELAY_ROUNDS + 1; i++) {
      state = must(state, { kind: 'endTurn' }).state;
    }

    expect(state.units.find((u) => u.id === victim.id)!.status).toBe('evacuated');
    expect(state.bench.B).toBe(0);
  });
});
