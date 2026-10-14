import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import {
  ARENA_HEIGHT,
  BENCH_SIZE,
  BULWARK_BLOCK_RANGE_CELLS,
  CELL_FEET,
  MOVE_SPEED_FEET,
  SPARK_ENTRY_ROUND,
} from './constants.js';
import { distance } from './geometry.js';
import { pathTo, reachableCells } from './rules/movement.js';
import { rangeToFurnace } from './rules/payload.js';
import { buildTurnOrder, ladderRungs } from './initiative.js';
import { crackerPost } from './rules/ordnance.js';
import { createMatch, MAX_HUMANS, type MatchSetup } from './setup.js';
import { TEAM_COMPOSITION } from './stats.js';
import { activeUnitsOf, isHuman, type MatchState } from './types.js';

const base: MatchSetup = {
  arena: KILL_SILO,
  tier: 'rookie',
  humans: [],
  seed: 1234,
};

const soloMatch = () =>
  createMatch({ ...base, humans: [{ humanId: 'jerome', role: 'striker' }] });

const fullMatch = () =>
  createMatch({
    ...base,
    humans: [
      { humanId: 'jerome', role: 'striker' },
      { humanId: 'ami-1', role: 'breaker' },
      { humanId: 'ami-2', role: 'trajector' },
    ],
  });

/**
 * The arena itself, before anybody stands on it.
 *
 * These assertions exist because the pitch is a hand-authored ASCII layout,
 * with a Furnace at each end and obstacles between them, and that is exactly
 * the kind of data that drifts one character at a time without anybody
 * noticing. What has to be fair is the route to goal.
 */
describe('the Kill-Silo as a pitch', () => {
  const arena = new Arena(KILL_SILO);

  it('is an exact mirror about the halfway line, so neither side has the better half', () => {
    // `rows` is authored top first, so index i and index 44 - i are the two
    // rows an equal distance either side of y = 22. This is the whole of what
    // makes the two approaches to goal identical.
    for (let i = 0; i < ARENA_HEIGHT; i++) {
      expect(KILL_SILO.rows[i]).toBe(KILL_SILO.rows[ARENA_HEIGHT - 1 - i]);
    }
  });

  it('puts the two Furnaces at opposite ends of the pitch', () => {
    const a = arena.furnaceOf('A');
    const b = arena.furnaceOf('B');

    expect(Math.min(...a.cells.map((c) => c.y))).toBe(0);
    expect(Math.max(...b.cells.map((c) => c.y))).toBe(ARENA_HEIGHT - 1);
    // Every cell of a mouth is solid: it is a hatch, not a place to stand.
    for (const cell of [...a.cells, ...b.cells]) expect(arena.isSolid(cell)).toBe(true);
  });

  it('starts every unit somewhere it can stand', () => {
    // A start cell that is an obstacle buries a player in a crate. It is silent:
    // `createMatch` places units without asking the terrain.
    for (const team of ['A', 'B'] as const) {
      for (const cell of KILL_SILO.starts[team]) {
        expect(arena.isOccupiable(cell)).toBe(true);
      }
      expect(arena.isOccupiable(KILL_SILO.substituteEntry[team])).toBe(true);
    }
  });

  it('lines the teams up eight cells from the ball, keeper in front of its own mouth', () => {
    const state = createMatch(base);
    const at = (team: 'A' | 'B', role: string) =>
      activeUnitsOf(state, team).find((u) => u.role === role)!;

    expect({ x: at('A', 'bulwark').x, y: at('A', 'bulwark').y }).toEqual({ x: 7, y: 1 });
    expect({ x: at('B', 'bulwark').x, y: at('B', 'bulwark').y }).toEqual({ x: 7, y: 43 });
    // Écart 38, revised 2026-10-10: y14 and y30 are eight cells from (7, 22),
    // one move without a Dash. The first draft's y4 and y40 were eighteen.
    expect(activeUnitsOf(state, 'A').filter((u) => u.y === 14)).toHaveLength(6);
    expect(activeUnitsOf(state, 'B').filter((u) => u.y === 30)).toHaveLength(6);
    for (const team of ['A', 'B'] as const) {
      for (const unit of activeUnitsOf(state, team).filter((u) => u.role !== 'bulwark')) {
        expect(distance(unit, KILL_SILO.ordnanceStart)).toBe(MOVE_SPEED_FEET / CELL_FEET);
      }
    }
  });

  /**
   * The point of the revised line. Jérôme's first game on the horizontal pitch
   * opened with nobody able to reach the ball, Dash included. The distance is
   * eight, but a distance is not a route: the pillar at (7, 16) and the covers
   * on rows 18 and 19 stand between the line and the centre, and the route is
   * what `reachableCells` walks. Checked on the real kick-off board, so the
   * team-mates on the same line count as the obstacles they are.
   */
  it('lets each of the six field players reach the ball on turn one without a Dash, both sides', () => {
    const state = createMatch(base);
    const ball = KILL_SILO.ordnanceStart;

    for (const team of ['A', 'B'] as const) {
      const field = activeUnitsOf(state, team).filter((u) => u.role !== 'bulwark');
      expect(field).toHaveLength(6);
      for (const unit of field) {
        const reach = reachableCells(arena, state, unit, MOVE_SPEED_FEET);
        const route = pathTo(reach, ball);
        expect(route, `${unit.id} from (${unit.x}, ${unit.y}) cannot reach the ball`).not.toBeNull();
        expect(route!.length).toBe(MOVE_SPEED_FEET / CELL_FEET);
        for (const step of route!) expect(arena.isOccupiable(step)).toBe(true);
      }
      // And the keeper cannot: the line is the field players' and the mouth is the keeper's.
      const keeper = activeUnitsOf(state, team).find((u) => u.role === 'bulwark')!;
      expect(pathTo(reachableCells(arena, state, keeper, MOVE_SPEED_FEET), ball)).toBeNull();
    }
  });

  it('starts each goalkeeper close enough to its own hatch to block a shot', () => {
    // The Bulwark is the first start cell by convention. If it began outside
    // `BULWARK_BLOCK_RANGE_CELLS` it would not be a goalkeeper at kick-off, and
    // `rules/reactions.ts` would also stop treating it as one for the pass
    // exception in front of goal.
    for (const team of ['A', 'B'] as const) {
      const keeper = KILL_SILO.starts[team][0]!;
      expect(rangeToFurnace(keeper, arena.furnaceOf(team))).toBeLessThanOrEqual(
        BULWARK_BLOCK_RANGE_CELLS,
      );
    }
  });

  it('drops the ordnance on the halfway line, equidistant from both goals', () => {
    const { ordnanceStart } = KILL_SILO;
    expect(arena.isOccupiable(ordnanceStart)).toBe(true);
    expect(rangeToFurnace(ordnanceStart, arena.furnaceOf('A'))).toBe(
      rangeToFurnace(ordnanceStart, arena.furnaceOf('B')),
    );
  });
});

describe('kick-off', () => {
  it('fields seven per team in the composition the sport requires', () => {
    const state = createMatch(base);
    for (const team of ['A', 'B'] as const) {
      const units = activeUnitsOf(state, team);
      expect(units).toHaveLength(TEAM_COMPOSITION.length);
      expect(units.filter((u) => u.role === 'striker')).toHaveLength(3);
      expect(units.filter((u) => u.role === 'breaker')).toHaveLength(2);
      expect(units.filter((u) => u.role === 'bulwark')).toHaveLength(1);
      expect(units.filter((u) => u.role === 'trajector')).toHaveLength(1);
    }
  });

  it('seats humans on team A only, and fills the rest with AI', () => {
    const state = soloMatch();
    expect(activeUnitsOf(state, 'A').filter(isHuman)).toHaveLength(1);
    expect(activeUnitsOf(state, 'B').filter(isHuman)).toHaveLength(0);
  });

  it('leaves solo with thirteen AI units to drive, the dimensioning case', () => {
    const state = soloMatch();
    expect(state.units.filter((u) => !isHuman(u))).toHaveLength(13);
  });

  it('still leaves eleven AI units with a full team of three humans', () => {
    expect(fullMatch().units.filter((u) => !isHuman(u))).toHaveLength(11);
  });

  it('places every unit on an open, unoccupied, unique cell', () => {
    const arena = new Arena(KILL_SILO);
    const state = fullMatch();
    const seen = new Set<string>();

    for (const unit of state.units) {
      expect(arena.isOccupiable(unit)).toBe(true);
      expect(arena.isSolid(unit)).toBe(false);
      expect('anchored' in unit).toBe(false);
      const key = `${unit.x},${unit.y}`;
      expect(seen.has(key), `two units share ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('starts every unit on full hit points for its role and Tier', () => {
    const state = createMatch({ ...base, tier: 'star' });
    for (const unit of state.units) {
      expect(unit.hp).toBe(unit.maxHp);
      expect(unit.tier).toBe('star');
    }
    const bulwark = state.units.find((u) => u.role === 'bulwark' && u.team === 'A');
    expect(bulwark?.maxHp).toBe(70);
  });

  it('drops the Payload at the centre and a Cracker beside each edge post of the halfway line', () => {
    // Écart 46. They used to start beside the ball (écart 43) and before that
    // on it; born in the kick-off scrum they went off before anyone had moved.
    // Seven cells out at the two pillars of the halfway line, they join the
    // game on round 2 instead of opening it.
    const arena = new Arena(KILL_SILO);
    const state = createMatch(base);
    const centre = KILL_SILO.ordnanceStart;
    expect(state.payload.carriedBy).toBeNull();
    expect({ x: state.payload.x, y: state.payload.y }).toEqual(centre);
    expect(state.crackers).toHaveLength(2);
    const cells = state.crackers.map((c) => `${c.x},${c.y}`);
    expect(new Set(cells).size).toBe(2);
    state.crackers.forEach((cracker, i) => {
      expect(cracker.state).toBe('live');
      expect(cracker.id).toBe(`cracker-${i + 1}`);
      expect(distance(cracker, crackerPost(arena, i))).toBe(1);
      expect(arena.isOccupiable(cracker)).toBe(true);
      expect(state.units.some((u) => u.x === cracker.x && u.y === cracker.y)).toBe(false);
    });
    // On the halfway line or a cell off it, so each one is as far from both
    // Furnaces as the ball is, give or take that cell.
    for (const cracker of state.crackers) {
      expect(
        Math.abs(
          rangeToFurnace(cracker, arena.furnaceOf('A')) - rangeToFurnace(cracker, arena.furnaceOf('B')),
        ),
      ).toBeLessThanOrEqual(2);
    }
  });

  it('keeps the Spark off the field at kick-off', () => {
    const state = createMatch(base);
    expect(state.spark.state).toBe('pending');
    expect(state.round).toBeLessThan(SPARK_ENTRY_ROUND);
  });

  it('opens at nil all with a full bench on both sides', () => {
    const state = createMatch(base);
    expect(state.score).toEqual({ A: 0, B: 0 });
    expect(state.bench).toEqual({ A: BENCH_SIZE, B: BENCH_SIZE });
    expect(state.result).toBeNull();
    expect(state.phase).toBe('playing');
  });

  it('rejects a role claimed by more humans than the team fields', () => {
    expect(() =>
      createMatch({
        ...base,
        humans: [
          { humanId: 'a', role: 'bulwark' },
          { humanId: 'b', role: 'bulwark' },
        ],
      }),
    ).toThrow(/bulwark/);
  });

  it('rejects a fourth human', () => {
    const humans = Array.from({ length: MAX_HUMANS + 1 }, (_, i) => ({
      humanId: `p${i}`,
      role: 'striker' as const,
    }));
    expect(() => createMatch({ ...base, humans })).toThrow(/at most/);
  });

  it('replays identically from the same seed and diverges from another', () => {
    const summarise = (s: MatchState) =>
      JSON.stringify(s.units.map((u) => [u.id, u.initiative]));
    expect(summarise(createMatch({ ...base, humans: [{ humanId: 'j', role: 'striker' }] })))
      .toBe(summarise(createMatch({ ...base, humans: [{ humanId: 'j', role: 'striker' }] })));
    expect(summarise(createMatch({ ...base, seed: 1, humans: [{ humanId: 'j', role: 'striker' }] })))
      .not.toBe(summarise(createMatch({ ...base, seed: 2, humans: [{ humanId: 'j', role: 'striker' }] })));
  });
});

describe('names', () => {
  it('gives every unit on the field a distinct name', () => {
    const state = fullMatch();
    const names = state.units.map((u) => u.name);
    expect(names.every((n) => n.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps the name a player typed, and never derives one from the role', () => {
    const state = createMatch({
      ...base,
      humans: [{ humanId: 'jerome', role: 'striker', name: 'Wilhelm Duarte' }],
    });
    const mine = state.units.find((u) => isHuman(u))!;
    expect(mine.name).toBe('Wilhelm Duarte');
    for (const unit of state.units) {
      expect(unit.name).not.toMatch(/striker|breaker|bulwark|trajector/i);
    }
  });

  it('keeps the pool off a name a player already took', () => {
    const state = createMatch({
      ...base,
      humans: [{ humanId: 'jerome', role: 'striker', name: 'voss ardent' }],
    });
    const lowered = state.units.map((u) => u.name.toLowerCase());
    expect(lowered.filter((n) => n === 'voss ardent')).toHaveLength(1);
  });

  it('falls back to the pool when a seat is left unnamed', () => {
    const state = createMatch({ ...base, humans: [{ humanId: 'jerome', role: 'striker' }] });
    expect(state.units.find((u) => isHuman(u))!.name.length).toBeGreaterThan(0);
  });

  it('fields the same two teams on a replay of the same seed', () => {
    const names = () => createMatch({ ...base, seed: 4242 }).units.map((u) => u.name);
    expect(names()).toEqual(names());
  });
});

describe('the initiative ladder (écart 51)', () => {
  const arena = new Arena(KILL_SILO);
  const ids = (state: MatchState) =>
    state.turnOrder.map((s) => (s.actor.kind === 'unit' ? s.actor.unitId : s.actor.kind));
  const roleOf = (state: MatchState, id: string) => state.units.find((u) => u.id === id)!.role;

  it('ranks the slots 1, 2, 3 in the order they act', () => {
    const ranks = fullMatch().turnOrder.map((s) => s.rank);
    expect(ranks).toEqual(ranks.map((_, i) => i + 1));
  });

  it('puts the side with a human before the side that is all AI', () => {
    const state = fullMatch();
    const sides = state.turnOrder.filter((s) => s.team !== null).map((s) => s.team);
    const firstB = sides.indexOf('B');
    expect(sides.slice(0, firstB).every((t) => t === 'A')).toBe(true);
    expect(sides.slice(firstB).every((t) => t === 'B')).toBe(true);
  });

  it('runs each side Trajector, Strikers, Breakers, Bulwark', () => {
    const state = fullMatch();
    for (const team of ['A', 'B'] as const) {
      const roles = ids(state)
        .filter((id) => id.startsWith(`${team}-`))
        .map((id) => roleOf(state, id));
      expect(roles).toEqual([
        'trajector',
        'striker',
        'striker',
        'striker',
        'breaker',
        'breaker',
        'bulwark',
      ]);
    }
  });

  it('plays a human last within its role (écart 55, 2H.10)', () => {
    const state = fullMatch();
    const listed = ids(state);
    for (const human of state.units.filter(isHuman)) {
      const ofRole = listed.filter((id) => id.startsWith('A-') && roleOf(state, id) === human.role);
      expect(ofRole[ofRole.length - 1]).toBe(human.id);
      if (human.role !== 'trajector') expect(ofRole.length).toBeGreaterThan(1);
      expect(human.initiative).not.toBeNull();
    }
  });

  it('puts the relaunching keeper after the Strikers and before the Breakers, even when it is the human (écart 62 over 55)', () => {
    const state = createMatch({
      ...base,
      humans: [{ humanId: 'jerome', role: 'bulwark' }],
    });
    const conceded = { ...state, relaunch: 'A' as const };
    const order = buildTurnOrder(arena, conceded);
    const roles = order
      .filter((s) => s.team === 'A')
      .map((s) => (s.actor.kind === 'unit' ? roleOf(state, s.actor.unitId) : null));
    expect(roles).toEqual([
      'trajector',
      'striker',
      'striker',
      'striker',
      'bulwark',
      'breaker',
      'breaker',
    ]);
    // The side that did not concede keeps the ordinary ladder.
    const rolesB = order
      .filter((s) => s.team === 'B')
      .map((s) => (s.actor.kind === 'unit' ? roleOf(state, s.actor.unitId) : null));
    expect(rolesB.at(-1)).toBe('bulwark');
  });

  it('orders two humans of the same role by their kick-off d20, never tied', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const state = createMatch({
        ...base,
        seed,
        humans: [
          { humanId: 'jerome', role: 'striker' },
          { humanId: 'ami-1', role: 'striker' },
          { humanId: 'ami-2', role: 'striker' },
        ],
      });
      const humans = state.units.filter(isHuman);
      const rolls = humans.map((u) => u.initiative!);
      expect(new Set(rolls).size).toBe(3);
      const listed = ids(state).filter((id) => humans.some((u) => u.id === id));
      const expected = [...humans].sort((a, b) => b.initiative! - a.initiative!).map((u) => u.id);
      expect(listed).toEqual(expected);
    }
  });

  it('leaves the Spark out of the ladder until it is in play, then puts it first', () => {
    const state = fullMatch();
    expect(state.turnOrder.some((s) => s.actor.kind === 'spark')).toBe(false);
    const live = { ...state, spark: { state: 'live' as const, x: 7, y: 22, heading: 1 } };
    expect(buildTurnOrder(arena, live)[0]!.actor.kind).toBe('spark');
  });

  it('rolls the Crackers last at kick-off, when nobody has carried yet', () => {
    const state = fullMatch();
    expect(state.lastCarrierTeam).toBeNull();
    expect(ids(state)[ids(state).length - 1]).toBe('crackers');
  });

  it('rolls the Crackers right after the side that carries, or carried last', () => {
    const state = fullMatch();
    const carrierB = state.units.find((u) => u.team === 'B' && u.role === 'striker')!;
    const carriedByB: MatchState = {
      ...state,
      units: state.units.map((u) => (u.id === carrierB.id ? { ...u, holdingPayload: true } : u)),
      payload: { carriedBy: carrierB.id, x: carrierB.x, y: carrierB.y },
    };
    const withB = ids({ ...state, turnOrder: buildTurnOrder(arena, carriedByB) });
    expect(withB.indexOf('crackers')).toBe(withB.length - 1);
    expect(withB[withB.length - 2]!.startsWith('B-')).toBe(true);

    const looseAfterA: MatchState = { ...state, lastCarrierTeam: 'A' };
    const afterA = ids({ ...state, turnOrder: buildTurnOrder(arena, looseAfterA) });
    const at = afterA.indexOf('crackers');
    expect(afterA[at - 1]!.startsWith('A-')).toBe(true);
    expect(afterA[at + 1]!.startsWith('B-')).toBe(true);
  });

  it('attacking, plays the carrier first in its role and then the rearmost first', () => {
    const state = createMatch(base);
    const strikers = state.units.filter((u) => u.team === 'A' && u.role === 'striker');
    // Spread along the pitch: s[0] furthest forward, s[2] rearmost, s[1] carries.
    const placed = state.units.map((u) => {
      if (u.id === strikers[0]!.id) return { ...u, x: 7, y: 30 };
      if (u.id === strikers[1]!.id) return { ...u, x: 5, y: 22, holdingPayload: true };
      if (u.id === strikers[2]!.id) return { ...u, x: 9, y: 14 };
      return u;
    });
    const carrying: MatchState = {
      ...state,
      units: placed,
      payload: { carriedBy: strikers[1]!.id, x: 5, y: 22 },
    };
    const order = ids({ ...state, turnOrder: buildTurnOrder(arena, carrying) }).filter((id) =>
      strikers.some((s) => s.id === id),
    );
    expect(order).toEqual([strikers[1]!.id, strikers[2]!.id, strikers[0]!.id]);
  });

  it('defending, plays the unit nearest the enemy carrier first', () => {
    const state = createMatch(base);
    const carrier = state.units.find((u) => u.team === 'B' && u.role === 'striker')!;
    const breakers = state.units.filter((u) => u.team === 'A' && u.role === 'breaker');
    const placed = state.units.map((u) => {
      if (u.id === carrier.id) return { ...u, x: 7, y: 20, holdingPayload: true };
      if (u.id === breakers[0]!.id) return { ...u, x: 7, y: 10 };
      if (u.id === breakers[1]!.id) return { ...u, x: 7, y: 17 };
      return u;
    });
    const defending: MatchState = {
      ...state,
      units: placed,
      payload: { carriedBy: carrier.id, x: 7, y: 20 },
    };
    const order = ids({ ...state, turnOrder: buildTurnOrder(arena, defending) }).filter((id) =>
      breakers.some((b) => b.id === id),
    );
    expect(order).toEqual([breakers[1]!.id, breakers[0]!.id]);
  });

  it('alternates which side opens when no human plays, round by round', () => {
    const state = createMatch(base);
    const openerOn = (round: number) =>
      buildTurnOrder(arena, { ...state, round }).find((s) => s.team !== null)!.team;

    for (let round = 1; round < 6; round++) {
      expect(openerOn(round), `round ${round} and ${round + 1} share an opener`).not.toBe(
        openerOn(round + 1),
      );
    }
  });

  it('hands the opening to the other side when the kick-off die falls the other way', () => {
    const state = createMatch(base);
    const openerWith = (initiativeNonce: number) =>
      buildTurnOrder(arena, { ...state, initiativeNonce }).find((s) => s.team !== null)!.team;

    expect(openerWith(0)).not.toBe(openerWith(1));
  });

  /**
   * The Spark enters on a fixed round and is worth two goals, so first reach at
   * it must not belong to the same side every match in a sweep.
   */
  it('opens the Spark round for each side about half the time', () => {
    let openedByA = 0;
    const runs = 200;

    for (let seed = 1; seed <= runs; seed++) {
      const state = createMatch({ ...base, seed });
      const opener = buildTurnOrder(arena, { ...state, round: SPARK_ENTRY_ROUND }).find(
        (s) => s.team !== null,
      )!.team;
      if (opener === 'A') openedByA++;
    }

    expect(openedByA).toBeGreaterThan(runs * 0.4);
    expect(openedByA).toBeLessThan(runs * 0.6);
  });

  it('lists every unit on the field exactly once', () => {
    const state = fullMatch();
    const listed = state.turnOrder
      .filter((s) => s.actor.kind === 'unit')
      .map((s) => (s.actor as { unitId: string }).unitId);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(state.units.map((u) => u.id).sort());
  });
});
