import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH, CELL_FEET, ZONE_CROSSING_FEET } from './constants.js';
import {
  directionFromD8,
  distance,
  d8FromDirection,
  lineTo,
  reflectedRun,
  stepCostFeet,
  straightPath,
  zoneOf,
} from './geometry.js';
import { Rng } from './rng.js';
import { ROLE_STATS, TEAM_COMPOSITION, statsFor } from './stats.js';

describe('geometry', () => {
  it('measures distance in Chebyshev, so a diagonal costs the same as a straight step', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(3);
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(distance({ x: 7, y: 22 }, { x: 7, y: 22 })).toBe(0);
  });

  it('splits the plane into three zones of equal height', () => {
    expect(zoneOf({ x: 7, y: 0 })).toBe(0);
    expect(zoneOf({ x: 7, y: 14 })).toBe(0);
    expect(zoneOf({ x: 7, y: 15 })).toBe(1);
    expect(zoneOf({ x: 7, y: 29 })).toBe(1);
    expect(zoneOf({ x: 7, y: 30 })).toBe(2);
    expect(zoneOf({ x: 7, y: 44 })).toBe(2);
  });

  it('tolls a step that crosses a zone boundary and nothing else', () => {
    expect(stepCostFeet({ x: 7, y: 10 }, { x: 7, y: 11 })).toBe(CELL_FEET);
    expect(stepCostFeet({ x: 7, y: 14 }, { x: 7, y: 15 })).toBe(CELL_FEET + ZONE_CROSSING_FEET);
    expect(stepCostFeet({ x: 7, y: 29 }, { x: 8, y: 30 })).toBe(CELL_FEET + ZONE_CROSSING_FEET);
  });

  it('reads a d8 as the eight compass directions with north up the silo', () => {
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

  it('bounces the Spark off a wall instead of letting it leave the arena', () => {
    const run = reflectedRun({ x: 13, y: 22 }, { x: 1, y: 0 }, 4);
    expect(run.path).toEqual([
      { x: 14, y: 22 },
      { x: 13, y: 22 },
      { x: 12, y: 22 },
      { x: 11, y: 22 },
    ]);
    expect(run.path.every((p) => p.x >= 0 && p.x < ARENA_WIDTH)).toBe(true);
  });

  it('hands back the heading the bounce left it on, so the Spark can keep it', () => {
    // Due east into the east wall comes back due west, and stays west.
    expect(reflectedRun({ x: 13, y: 22 }, { x: 1, y: 0 }, 4).heading).toEqual({ x: -1, y: 0 });
    // Nothing in the way, nothing turned.
    expect(reflectedRun({ x: 7, y: 22 }, { x: 0, y: 1 }, 4).heading).toEqual({ x: 0, y: 1 });
    // A corner turns both axes at once.
    expect(reflectedRun({ x: 1, y: 1 }, { x: -1, y: -1 }, 3).heading).toEqual({ x: 1, y: 1 });
  });

  it('keeps a bounced Spark inside the arena over a long move', () => {
    const run = reflectedRun({ x: 2, y: 2 }, { x: -1, y: -1 }, 12);
    expect(run.path).toHaveLength(12);
    for (const p of run.path) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(ARENA_WIDTH);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(ARENA_HEIGHT);
    }
    expect(() => d8FromDirection(run.heading)).not.toThrow();
  });

  it('walks a Cracker toward its target one cell at a time, destination included', () => {
    expect(lineTo({ x: 0, y: 0 }, { x: 3, y: 1 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
  });

  it('stops a batted Cracker at the wall rather than bouncing it', () => {
    const path = straightPath({ x: 12, y: 22 }, { x: 1, y: 0 }, 12);
    expect(path).toEqual([
      { x: 13, y: 22 },
      { x: 14, y: 22 },
    ]);
  });
});

describe('the Kill-Silo', () => {
  const arena = new Arena(KILL_SILO);

  it('parses to the declared dimensions', () => {
    expect(KILL_SILO.rows).toHaveLength(ARENA_HEIGHT);
    for (const row of KILL_SILO.rows) expect(row).toHaveLength(ARENA_WIDTH);
  });

  it('stores the floor at y = 0 and the ceiling at the top', () => {
    // Row 37 is the broad catwalk under each Furnace, five cells from each wall.
    expect(arena.isSolid({ x: 0, y: 37 })).toBe(true);
    expect(arena.isSolid({ x: 4, y: 37 })).toBe(true);
    expect(arena.isSolid({ x: 7, y: 37 })).toBe(false);
  });

  it('runs the central chain unbroken between the two Furnace mouths', () => {
    // The images show one chain falling the whole height of the silo without a
    // break. Nothing may sever it, suspended platforms included: they hang to
    // either side of it. A player who can see the chain must be able to climb it.
    //
    // It stops one cell short at each end because that is where it goes: the
    // mouths are dead centre in the deck and in the roof, and the Zone 1 art
    // draws the chain descending into the collar of the pit. So the run is
    // y = 1 to y = 43, and the two cells that close it are the goals.
    for (let y = 1; y < ARENA_HEIGHT - 1; y++) {
      expect(arena.cellAt({ x: 7, y }), `the chain is cut at y=${y}`).toBe('rig');
      expect(arena.isOccupiable({ x: 7, y })).toBe(true);
      expect(arena.isAnchorable({ x: 7, y })).toBe(true);
    }

    for (const y of [0, ARENA_HEIGHT - 1]) {
      expect(arena.cellAt({ x: 7, y }), `the mouth at y=${y} is not solid`).toBe('structure');
    }
  });

  it('anchors against the silo wall, so the outer columns are always holdable', () => {
    expect(arena.isAnchorable({ x: 0, y: 21 })).toBe(true);
    expect(arena.isAnchorable({ x: 14, y: 21 })).toBe(true);
  });

  it('leaves real dead air where a unit cannot end its turn', () => {
    const dead = [...arena.occupiableCells()].filter((p) => !arena.isAnchorable(p));
    expect(dead.length).toBeGreaterThan(0);
  });

  it('drops the ordnance on a cell a unit can reach and hold', () => {
    expect(arena.isOccupiable(KILL_SILO.ordnanceStart)).toBe(true);
    expect(arena.isAnchorable(KILL_SILO.ordnanceStart)).toBe(true);
  });

  it('gives every starter a cell that is free, anchored and unique', () => {
    for (const team of ['A', 'B'] as const) {
      const starts = KILL_SILO.starts[team];
      expect(starts).toHaveLength(TEAM_COMPOSITION.length);

      const seen = new Set<string>();
      for (const p of starts) {
        expect(arena.isOccupiable(p), `${team} start ${p.x},${p.y} is solid`).toBe(true);
        expect(arena.isAnchorable(p), `${team} start ${p.x},${p.y} has no grip`).toBe(true);
        seen.add(`${p.x},${p.y}`);
      }
      expect(seen.size).toBe(starts.length);
    }
  });

  it('starts each Bulwark within blocking range of the Furnace it defends', () => {
    for (const team of ['A', 'B'] as const) {
      const bulwark = KILL_SILO.starts[team][0]!;
      const furnace = arena.furnaceOf(team);
      const reach = Math.min(...furnace.cells.map((c) => distance(bulwark, c)));
      expect(reach).toBeLessThanOrEqual(2);
    }
  });

  it('lets a substitute enter on solid footing beside its own Furnace', () => {
    for (const team of ['A', 'B'] as const) {
      const entry = KILL_SILO.substituteEntry[team];
      expect(arena.isOccupiable(entry)).toBe(true);
      expect(arena.isAnchorable(entry)).toBe(true);
      // Beside its own goal, wherever that is. It used to assert Zone 3 for
      // both teams, which was true only while both Furnaces were up there.
      expect(zoneOf(entry)).toBe(zoneOf(arena.furnaceOf(team).cells[0]!));
    }
  });

  it('makes a team shoot at the Furnace it does not defend', () => {
    expect(arena.targetFurnaceOf('A').defendedBy).toBe('B');
    expect(arena.targetFurnaceOf('B').defendedBy).toBe('A');
  });

  it('is mirror-symmetrical, so neither team gets the better terrain', () => {
    for (let y = 0; y < ARENA_HEIGHT; y++) {
      for (let x = 0; x < ARENA_WIDTH; x++) {
        const mirrored = { x: ARENA_WIDTH - 1 - x, y };
        expect(arena.cellAt({ x, y }), `row ${y} is not mirrored at x=${x}`).toBe(
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
