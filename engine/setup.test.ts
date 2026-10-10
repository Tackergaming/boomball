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

describe('the initiative ladder', () => {
  it('descends from the highest count to the lowest', () => {
    const counts = fullMatch().turnOrder.map((s) => s.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('moves the Crackers on count 20, above every unit that did not beat it', () => {
    const state = fullMatch();
    const crackers = state.turnOrder.find((s) => s.actor.kind === 'crackers');
    expect(crackers?.count).toBe(20);

    // A human rolling d20 plus its agility bonus can pass 20 and get the drop
    // on the Crackers. That is what individual initiative is for, and it is the
    // reward a Trajector's agility buys.
    const above = state.turnOrder.slice(0, state.turnOrder.indexOf(crackers!));
    for (const slot of above) {
      expect(slot.actor.kind).toBe('unit');
      expect(slot.count).toBeGreaterThan(20);
    }
  });

  it('leaves the Spark out of the ladder until it is in play', () => {
    const state = fullMatch();
    expect(state.turnOrder.some((s) => s.actor.kind === 'spark')).toBe(false);
  });

  it('gives every human its own slot and rolls it initiative', () => {
    const state = fullMatch();
    const humans = state.units.filter(isHuman);
    for (const human of humans) {
      expect(human.initiative).not.toBeNull();
      const slot = state.turnOrder.find(
        (s) => s.actor.kind === 'unit' && s.actor.unitId === human.id,
      );
      expect(slot, `${human.id} has no slot of its own`).toBeDefined();
      expect(slot?.count).toBe(human.initiative);
    }
  });

  it('resolves the AI team-mates as one rung just after the last human', () => {
    const state = fullMatch();
    const humans = state.units.filter(isHuman);
    const lastHuman = Math.min(...humans.map((u) => u.initiative ?? 0));

    const allyRungs = ladderRungs(state.turnOrder).filter((r) => r.blockId === 'A-allies');
    expect(allyRungs).toHaveLength(1);
    expect(allyRungs[0]!.count).toBe(Math.max(0, lastHuman - 1));
    expect(allyRungs[0]!.unitIds).toHaveLength(4);
  });

  it('runs the enemy in two rungs, fast on 15 and slow on 10', () => {
    const state = fullMatch();
    const enemy = ladderRungs(state.turnOrder).filter((r) => r.blockId?.startsWith('B-'));
    expect(enemy.map((r) => r.count).sort((a, b) => b - a)).toEqual([15, 10]);

    const fast = enemy.find((r) => r.count === 15)!;
    const fastRoles = fast.unitIds.map((id) => state.units.find((u) => u.id === id)!.role);
    expect(new Set(fastRoles)).toEqual(new Set(['striker', 'trajector']));
  });

  it('darts the Spark before the slow block that shares its count', () => {
    const state = { ...fullMatch(), spark: { state: 'live' as const, x: 7, y: 22, heading: 1 } };
    const tens = buildTurnOrder(state).filter((s) => s.count === 10);
    expect(tens[0]?.actor.kind).toBe('spark');
  });

  it('mirrors both teams when no human plays, so balance runs are unbiased', () => {
    const rungs = ladderRungs(createMatch(base).turnOrder);
    for (const team of ['A', 'B'] as const) {
      const counts = rungs
        .filter((r) => r.blockId?.startsWith(`${team}-`))
        .map((r) => r.count)
        .sort((a, b) => b - a);
      expect(counts).toEqual([15, 10]);
    }
  });

  it('alternates which side wins an initiative tie, round by round', () => {
    const state = createMatch(base);
    const openerOn = (round: number) =>
      buildTurnOrder({ ...state, round }).find((s) => s.count === 15)!.team;

    for (let round = 1; round < 6; round++) {
      expect(openerOn(round), `round ${round} and ${round + 1} share an opener`).not.toBe(
        openerOn(round + 1),
      );
    }
  });

  it('hands the tie to the other side when the kick-off die falls the other way', () => {
    const state = createMatch(base);
    const openerWith = (initiativeNonce: number) =>
      buildTurnOrder({ ...state, initiativeNonce }).find((s) => s.count === 15)!.team;

    expect(openerWith(0)).not.toBe(openerWith(1));
  });

  /**
   * The Spark enters on a fixed round and is worth several goals, so first
   * reach at it must not belong to the same side every match. Before the
   * kick-off die, the tie fell to a stable key beginning with the team letter
   * and A opened round 6 two hundred times out of two hundred.
   */
  it('opens the Spark round for each side about half the time', () => {
    let openedByA = 0;
    const runs = 200;

    for (let seed = 1; seed <= runs; seed++) {
      const state = createMatch({ ...base, seed });
      const opener = buildTurnOrder({ ...state, round: SPARK_ENTRY_ROUND }).find(
        (s) => s.count === 15,
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
