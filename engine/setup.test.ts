import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { BENCH_SIZE, SPARK_ENTRY_ROUND } from './constants.js';
import { buildTurnOrder, ladderRungs } from './initiative.js';
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

  it('places every unit on free, anchored, unoccupied terrain', () => {
    const arena = new Arena(KILL_SILO);
    const state = fullMatch();
    const seen = new Set<string>();

    for (const unit of state.units) {
      expect(arena.isOccupiable(unit)).toBe(true);
      expect(unit.anchored).toBe(true);
      expect(arena.isAnchorable(unit)).toBe(true);
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

  it('drops the Payload and both Crackers on the same centre cell', () => {
    const state = createMatch(base);
    expect(state.payload.carriedBy).toBeNull();
    expect({ x: state.payload.x, y: state.payload.y }).toEqual(KILL_SILO.ordnanceStart);
    expect(state.crackers).toHaveLength(2);
    for (const cracker of state.crackers) {
      expect(cracker.state).toBe('live');
      expect({ x: cracker.x, y: cracker.y }).toEqual(KILL_SILO.ordnanceStart);
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

  it('lists every unit on the field exactly once', () => {
    const state = fullMatch();
    const listed = state.turnOrder
      .filter((s) => s.actor.kind === 'unit')
      .map((s) => (s.actor as { unitId: string }).unitId);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(state.units.map((u) => u.id).sort());
  });
});
