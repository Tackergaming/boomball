import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH, CELL_FEET } from './constants.js';
import {
  directionFromD8,
  distance,
  d8FromDirection,
  inBounds,
  lineTo,
  neighbours,
  stepCostFeet,
  thirdOf,
} from './geometry.js';
import { Rng } from './rng.js';
import { ROLE_STATS, TEAM_COMPOSITION, statsFor } from './stats.js';

describe('geometry', () => {
  it('measures distance in Chebyshev, so a diagonal costs the same as a straight step', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(3);
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(distance({ x: 7, y: 22 }, { x: 7, y: 22 })).toBe(0);
  });

  it('splits the pitch into three thirds of fifteen cells along its length', () => {
    expect(thirdOf({ x: 7, y: 0 })).toBe(0);
    expect(thirdOf({ x: 7, y: 14 })).toBe(0);
    expect(thirdOf({ x: 7, y: 15 })).toBe(1);
    expect(thirdOf({ x: 7, y: 29 })).toBe(1);
    expect(thirdOf({ x: 7, y: 30 })).toBe(2);
    expect(thirdOf({ x: 7, y: 44 })).toBe(2);
  });

  it('charges every step the same, across a third boundary too', () => {
    // A third is a name for the feed and for the Spark's entry. Crossing from
    // one to the next is a step like any other.
    expect(stepCostFeet({ x: 7, y: 10 }, { x: 7, y: 11 })).toBe(CELL_FEET);
    expect(stepCostFeet({ x: 7, y: 14 }, { x: 7, y: 15 })).toBe(CELL_FEET);
    expect(stepCostFeet({ x: 7, y: 29 }, { x: 8, y: 30 })).toBe(CELL_FEET);
  });

  it('reads a d8 as the eight compass directions with north towards Furnace B', () => {
    expect(directionFromD8(1)).toEqual({ x: 0, y: 1 });
    expect(directionFromD8(5)).toEqual({ x: 0, y: -1 });
    expect(directionFromD8(3)).toEqual({ x: 1, y: 0 });
  });

  it('reads a direction back as the d8 face that produced it', () => {
    for (let face = 1; face <= 8; face++) {
      expect(d8FromDirection(directionFromD8(face))).toBe(face);
    }
    expect(() => d8FromDirection({ x: 0, y: 0 })).toThrow();
  });

  it('keeps the neighbours of an edge cell inside the pitch', () => {
    const corner = neighbours({ x: 0, y: 0 });
    expect(corner).toHaveLength(3);
    expect(corner.every(inBounds)).toBe(true);
    expect(neighbours({ x: 7, y: 22 })).toHaveLength(8);
  });

  it('walks a Cracker toward its target one cell at a time, destination included', () => {
    expect(lineTo({ x: 0, y: 0 }, { x: 3, y: 1 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
  });
});

describe('the Kill-Silo', () => {
  const arena = new Arena(KILL_SILO);

  const isMouth = (p: { x: number; y: number }) =>
    arena.spec.furnaces.some((f) => f.cells.some((c) => c.x === p.x && c.y === p.y));

  it('parses to the declared dimensions', () => {
    expect(KILL_SILO.rows).toHaveLength(ARENA_HEIGHT);
    for (const row of KILL_SILO.rows) expect(row).toHaveLength(ARENA_WIDTH);
    expect(ARENA_WIDTH).toBe(15);
    expect(ARENA_HEIGHT).toBe(45);
  });

  it('reads the pitch off the page as an obstacle or as open floor, nothing else', () => {
    for (let y = 0; y < ARENA_HEIGHT; y++) {
      for (let x = 0; x < ARENA_WIDTH; x++) {
        expect(['open', 'obstacle']).toContain(arena.cellAt({ x, y }));
      }
    }
    // Outside the pitch is the edge, and the edge is solid.
    expect(arena.cellAt({ x: -1, y: 10 })).toBe('obstacle');
    expect(arena.cellAt({ x: 7, y: ARENA_HEIGHT })).toBe('obstacle');
  });

  it('refuses the old rig character, which no longer means anything', () => {
    const rows = [...KILL_SILO.rows];
    rows[10] = '.......|.......';
    expect(() => new Arena({ ...KILL_SILO, rows })).toThrow(/unknown arena character/);
  });

  it('closes each Furnace mouth with solid hatch cells at both ends', () => {
    for (const y of [0, ARENA_HEIGHT - 1]) {
      for (const x of [6, 7, 8]) {
        expect(arena.isSolid({ x, y }), `the mouth at (${x}, ${y}) is not solid`).toBe(true);
      }
    }
    // The wall either side of the mouth is floor.
    expect(arena.isSolid({ x: 5, y: 0 })).toBe(false);
    expect(arena.isSolid({ x: 9, y: ARENA_HEIGHT - 1 })).toBe(false);
  });

  it('puts crates and pillars on the floor, and leaves the cells beside them open', () => {
    const solid = [
      { x: 7, y: 16 }, // central pillar, A's half
      { x: 7, y: 28 }, // central pillar, B's half
      { x: 6, y: 9 }, // the crate in front of A's shooting line
      { x: 7, y: 9 },
      { x: 8, y: 9 },
      { x: 3, y: 5 }, // the posts
      { x: 4, y: 6 },
    ];
    for (const p of solid) expect(arena.isSolid(p), `(${p.x}, ${p.y}) should be solid`).toBe(true);

    const open = [
      { x: 6, y: 16 },
      { x: 8, y: 16 },
      { x: 7, y: 15 },
      { x: 7, y: 17 },
      { x: 5, y: 9 },
      { x: 9, y: 9 },
      { x: 7, y: 8 },
      { x: 2, y: 5 },
      { x: 5, y: 6 },
    ];
    for (const p of open) expect(arena.isSolid(p), `(${p.x}, ${p.y}) should be open`).toBe(false);
  });

  it('lists fifty-eight obstacle cells outside the mouths, sixty-four in all', () => {
    const all = arena.obstacles();
    expect(all).toHaveLength(64);
    expect(all.filter((p) => !isMouth(p))).toHaveLength(58);
    for (const p of all) expect(arena.isSolid(p)).toBe(true);
  });

  it('leaves no dead end: every open cell has at least three open neighbours', () => {
    for (const cell of arena.occupiableCells()) {
      const free = neighbours(cell).filter((n) => arena.isOccupiable(n));
      expect(free.length, `(${cell.x}, ${cell.y}) is a dead end`).toBeGreaterThanOrEqual(3);
    }
  });

  it('has no straight open column from the halfway line to a mouth', () => {
    // A shot has to be set up, not taken from distance down an empty lane. For
    // each column of a mouth there is an obstacle somewhere on each half.
    for (const x of [6, 7, 8]) {
      const onA = Array.from({ length: 21 }, (_, i) => i + 1).some((y) => arena.isSolid({ x, y }));
      const onB = Array.from({ length: 21 }, (_, i) => i + 23).some((y) => arena.isSolid({ x, y }));
      expect(onA, `column ${x} is open from y=22 down to Furnace A`).toBe(true);
      expect(onB, `column ${x} is open from y=22 up to Furnace B`).toBe(true);
    }
  });

  it('drops the ordnance on a cell a unit can stand on', () => {
    expect(arena.isOccupiable(KILL_SILO.ordnanceStart)).toBe(true);
  });

  it('gives every starter a cell that is open and unique', () => {
    const seen = new Set<string>();
    for (const team of ['A', 'B'] as const) {
      const starts = KILL_SILO.starts[team];
      expect(starts).toHaveLength(TEAM_COMPOSITION.length);

      for (const p of starts) {
        expect(arena.isOccupiable(p), `${team} start ${p.x},${p.y} is solid`).toBe(true);
        const k = `${p.x},${p.y}`;
        expect(seen.has(k), `two starts share ${k}`).toBe(false);
        seen.add(k);
      }
    }
    expect(seen.size).toBe(TEAM_COMPOSITION.length * 2);
  });

  it('starts each Bulwark within blocking range of the Furnace it defends', () => {
    for (const team of ['A', 'B'] as const) {
      const bulwark = KILL_SILO.starts[team][0]!;
      const furnace = arena.furnaceOf(team);
      const reach = Math.min(...furnace.cells.map((c) => distance(bulwark, c)));
      expect(reach).toBeLessThanOrEqual(2);
    }
  });

  it('lets a substitute enter on open floor in the third of its own Furnace', () => {
    for (const team of ['A', 'B'] as const) {
      const entry = KILL_SILO.substituteEntry[team];
      expect(arena.isOccupiable(entry)).toBe(true);
      expect(thirdOf(entry)).toBe(thirdOf(arena.furnaceOf(team).cells[0]!));
    }
  });

  it('makes a team shoot at the Furnace it does not defend', () => {
    expect(arena.targetFurnaceOf('A').defendedBy).toBe('B');
    expect(arena.targetFurnaceOf('B').defendedBy).toBe('A');
  });

  it('cuts the line of sight on an obstacle and on nothing else', () => {
    for (const p of arena.obstacles()) expect(arena.blocksSight(p)).toBe(true);
    for (const p of arena.occupiableCells()) expect(arena.blocksSight(p)).toBe(false);
  });

  it('is mirror-symmetrical about y = 22, so neither team gets the better terrain', () => {
    for (let y = 0; y < ARENA_HEIGHT; y++) {
      for (let x = 0; x < ARENA_WIDTH; x++) {
        const mirrored = { x, y: ARENA_HEIGHT - 1 - y };
        expect(arena.cellAt({ x, y }), `cell (${x}, ${y}) is not mirrored`).toBe(
          arena.cellAt(mirrored),
        );
      }
    }
  });
});

describe('role statistics', () => {
  it('fields three Strikers, two Breakers, one Bulwark and one Trajector', () => {
    expect(TEAM_COMPOSITION).toHaveLength(7);
    expect(TEAM_COMPOSITION.filter((r) => r === 'striker')).toHaveLength(3);
    expect(TEAM_COMPOSITION.filter((r) => r === 'breaker')).toHaveLength(2);
    expect(TEAM_COMPOSITION.filter((r) => r === 'bulwark')).toHaveLength(1);
    expect(TEAM_COMPOSITION.filter((r) => r === 'trajector')).toHaveLength(1);
  });

  it('improves every role monotonically across the three Tiers', () => {
    for (const role of Object.keys(ROLE_STATS) as (keyof typeof ROLE_STATS)[]) {
      const rookie = statsFor(role, 'rookie');
      const veteran = statsFor(role, 'veteran');
      const star = statsFor(role, 'star');
      expect(veteran.hp).toBeGreaterThan(rookie.hp);
      expect(star.hp).toBeGreaterThan(veteran.hp);
      expect(veteran.ac).toBeGreaterThanOrEqual(rookie.ac);
      expect(star.ac).toBeGreaterThanOrEqual(veteran.ac);
    }
  });

  it('keeps the Star Bulwark at AC 25, the number that forces the block Reaction', () => {
    expect(statsFor('bulwark', 'star').ac).toBe(25);
  });
});

describe('seeded dice', () => {
  it('replays identically from the same seed', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const rollsA = Array.from({ length: 50 }, () => a.d20());
    const rollsB = Array.from({ length: 50 }, () => b.d20());
    expect(rollsA).toEqual(rollsB);
    expect(a.seed).toBe(b.seed);
  });

  it('diverges from a different seed', () => {
    const a = Array.from({ length: 50 }, (() => { const r = new Rng(1); return () => r.d20(); })());
    const b = Array.from({ length: 50 }, (() => { const r = new Rng(2); return () => r.d20(); })());
    expect(a).not.toEqual(b);
  });

  it('stays inside the faces of the die', () => {
    const rng = new Rng(99);
    for (let i = 0; i < 2000; i++) {
      const d20 = rng.d20();
      expect(d20).toBeGreaterThanOrEqual(1);
      expect(d20).toBeLessThanOrEqual(20);
    }
  });

  it('takes the better roll on advantage and the worse on disadvantage', () => {
    const advantage = new Rng(7);
    const disadvantage = new Rng(7);
    let advantageTotal = 0;
    let disadvantageTotal = 0;
    for (let i = 0; i < 500; i++) {
      advantageTotal += advantage.d20With('advantage');
      disadvantageTotal += disadvantage.d20With('disadvantage');
    }
    expect(advantageTotal).toBeGreaterThan(disadvantageTotal);
  });
});
