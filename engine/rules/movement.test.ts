import { describe, expect, it } from 'vitest';

import { Arena } from '../arena.js';
import { KILL_SILO } from '../arenas/kill-silo.js';
import { MOVE_SPEED_FEET } from '../constants.js';
import { distance, lineTo, type Point } from '../geometry.js';
import { createMatch } from '../setup.js';
import type { MatchState, Unit } from '../types.js';
import {
  key,
  pathCostFeet,
  pathTo,
  reachableCells,
  safePathTo,
  safeReachableCells,
  validatePath,
} from './movement.js';
import { opportunityAttackers, provokedAlong } from './reactions.js';

const WIDTH = 15;
const HEIGHT = 45;

/** An empty pitch, with obstacles at the listed cells. */
function arenaWith(obstacles: readonly Point[] = []): Arena {
  const grid = Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill('.'));
  for (const o of obstacles) grid[o.y]![o.x] = '#';
  // Rows are authored top first, y = 0 being the last row.
  const rows = grid.reverse().map((r) => r.join(''));
  return new Arena({ ...KILL_SILO, rows });
}

const base = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed: 7 });
const unitAt = (x: number, y: number): Unit => ({ ...base.units[0]!, id: 'test-unit', x, y });
const lone = (unit: Unit): MatchState => ({ ...base, units: [unit] });

function route(arena: Arena, from: Point, to: Point): Point[] {
  const unit = unitAt(from.x, from.y);
  const reach = reachableCells(arena, lone(unit), unit, MOVE_SPEED_FEET);
  const r = pathTo(reach, to);
  expect(r).not.toBeNull();
  return r!;
}

describe('proposed route', () => {
  it('is the straight line on an empty pitch', () => {
    const from = { x: 2, y: 2 };
    const to = { x: 6, y: 4 };
    const r = route(arenaWith(), from, to);
    const line = lineTo(from, to);
    // Same length as the Chebyshev distance, ending on the goal.
    expect(r).toHaveLength(distance(from, to));
    expect(r[r.length - 1]).toEqual(to);
    // lineTo goes diagonal first; the route may go straight first, but no cell
    // strays more than one cell from the line at the same step.
    r.forEach((cell, i) => {
      expect(Math.abs(cell.x - line[i]!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(cell.y - line[i]!.y)).toBeLessThanOrEqual(1);
      // And it never leaves the 2-row band between origin and goal.
      expect(cell.y).toBeGreaterThanOrEqual(2);
      expect(cell.y).toBeLessThanOrEqual(4);
    });
  });

  it('keeps the Chebyshev length whenever nothing blocks', () => {
    const arena = arenaWith();
    for (const to of [
      { x: 2, y: 9 },
      { x: 9, y: 9 },
      { x: 0, y: 5 },
      { x: 7, y: 3 },
      { x: 5, y: 7 },
    ]) {
      const from = { x: 4, y: 5 };
      expect(route(arena, from, to)).toHaveLength(distance(from, to));
    }
  });

  it('is deterministic', () => {
    const a = route(arenaWith(), { x: 2, y: 2 }, { x: 7, y: 5 });
    const b = route(arenaWith(), { x: 2, y: 2 }, { x: 7, y: 5 });
    expect(a).toEqual(b);
  });

  it('goes round an obstacle on the line as tightly as it can, still shortest', () => {
    const from = { x: 2, y: 2 };
    const to = { x: 6, y: 4 };
    const block = [{ x: 4, y: 3 }];
    const arena = arenaWith(block);
    const r = route(arena, from, to);
    expect(r.map(key)).not.toContain(key(block[0]!));
    // A single obstacle costs no extra step here: a shortest path survives.
    expect(r).toHaveLength(distance(from, to));
    let prev = from;
    for (const step of r) {
      expect(distance(prev, step)).toBe(1);
      expect(arena.isSolid(step)).toBe(false);
      prev = step;
    }
    // Hugging the line: nothing leaves the band y in [2, 4].
    for (const c of r) {
      expect(c.y).toBeGreaterThanOrEqual(2);
      expect(c.y).toBeLessThanOrEqual(4);
    }
  });

  it('detours only as far as a wall forces', () => {
    // A three-cell wall at y = 4, goal straight above the start.
    const wall = [3, 4, 5].map((x) => ({ x, y: 4 }));
    const arena = arenaWith(wall);
    const r = route(arena, { x: 4, y: 2 }, { x: 4, y: 6 });
    expect(r).toHaveLength(4); // diagonals slip round the wall at no extra cost
    for (const c of r) expect(arena.isSolid(c)).toBe(false);
  });
});

describe('reachable cells from a hypothetical origin', () => {
  const arena = arenaWith([
    { x: 5, y: 5 },
    { x: 6, y: 5 },
  ]);
  const other: Unit = { ...base.units[0]!, id: 'other-unit', x: 7, y: 7 };

  it('costs the same as the unit actually standing there', () => {
    const real = unitAt(3, 3);
    const hypothetical = reachableCells(
      arena,
      { ...base, units: [real, other] },
      real,
      MOVE_SPEED_FEET,
      { x: 6, y: 6 },
    );
    const moved = unitAt(6, 6);
    const placed = reachableCells(
      arena,
      { ...base, units: [moved, other] },
      moved,
      MOVE_SPEED_FEET,
    );
    // The real cell (3, 3) is free from the hypothetical origin, whereas the
    // placed unit has left it too, so both sweeps see the same free cells.
    for (const [k, r] of hypothetical) expect(placed.get(k)?.costFeet).toBe(r.costFeet);
    for (const [k, r] of placed) expect(hypothetical.get(k)?.costFeet).toBe(r.costFeet);
  });

  it('frees the unit\'s real cell and keeps other units\' cells blocked', () => {
    const real = unitAt(3, 3);
    const reach = reachableCells(
      arena,
      { ...base, units: [real, other] },
      real,
      MOVE_SPEED_FEET,
      { x: 4, y: 4 },
    );
    expect(reach.has(key({ x: 3, y: 3 }))).toBe(true);
    expect(reach.has(key({ x: 7, y: 7 }))).toBe(false);
    expect(reach.has(key({ x: 4, y: 4 }))).toBe(false);
  });

  it('gives the same cells and costs with or without `from` set to the unit cell', () => {
    const real = unitAt(3, 3);
    const state = { ...base, units: [real, other] };
    const four = reachableCells(arena, state, real, MOVE_SPEED_FEET);
    const five = reachableCells(arena, state, real, MOVE_SPEED_FEET, { x: 3, y: 3 });
    expect([...five.keys()].sort()).toEqual([...four.keys()].sort());
    for (const [k, r] of four) expect(five.get(k)?.costFeet).toBe(r.costFeet);
  });
});

describe('safe routes, 2H.10', () => {
  const KILL_SILO_ARENA = new Arena(KILL_SILO);

  /** An opposing unit, ready to swing at whoever walks out of its reach. */
  const foeOf = (unit: Unit, id: string, x: number, y: number): Unit => ({
    ...base.units[0]!,
    id,
    team: unit.team === 'A' ? 'B' : 'A',
    x,
    y,
    reactionAvailable: true,
    status: 'active',
  });
  const withFoes = (unit: Unit, foes: readonly Unit[]): MatchState => ({
    ...base,
    units: [unit, ...foes],
  });
  /** Opportunity attacks a route provokes, one per attacker per step. */
  const provocationsAlong = (
    state: MatchState,
    mover: Unit,
    path: readonly Point[],
    origin: Point = { x: mover.x, y: mover.y },
  ): number => {
    let total = 0;
    let at = origin;
    for (const step of path) {
      total += opportunityAttackers(state, { ...mover, x: at.x, y: at.y }, at, step).length;
      at = step;
    }
    return total;
  };

  it("walks round an enemy's reach when the budget leaves room", () => {
    const arena = arenaWith();
    const unit = unitAt(5, 5);
    const state = withFoes(unit, [foeOf(unit, 'foe-1', 6, 9)]);
    const to = { x: 5, y: 11 };

    const short = pathTo(reachableCells(arena, state, unit, MOVE_SPEED_FEET), to)!;
    expect(provokedAlong(state, unit, short)).toHaveLength(1);

    const reach = safeReachableCells(arena, state, unit, MOVE_SPEED_FEET);
    const safe = safePathTo(state, unit, reach, to)!;
    expect(provokedAlong(state, unit, safe)).toHaveLength(0);
    expect(reach.get(key(to))!.provocations).toBe(0);
    expect(safe[safe.length - 1]).toEqual(to);
    // The detour is no longer than the margin the budget leaves.
    expect(safe.length).toBeGreaterThanOrEqual(short.length);
    expect(pathCostFeet(unit, safe)).toBeLessThanOrEqual(MOVE_SPEED_FEET);
    expect(pathCostFeet(unit, safe)).toBe(reach.get(key(to))!.costFeet);
    expect(validatePath(arena, state, unit, safe, MOVE_SPEED_FEET).ok).toBe(true);
  });

  it('costs extra feet when the enemy sits on the line itself', () => {
    const arena = arenaWith();
    const unit = unitAt(5, 5);
    const state = withFoes(unit, [foeOf(unit, 'foe-1', 5, 9)]);
    const to = { x: 5, y: 11 };

    const short = pathTo(reachableCells(arena, state, unit, MOVE_SPEED_FEET), to)!;
    expect(provocationsAlong(state, unit, short)).toBeGreaterThan(0);

    const reach = safeReachableCells(arena, state, unit, MOVE_SPEED_FEET);
    const safe = safePathTo(state, unit, reach, to)!;
    expect(provocationsAlong(state, unit, safe)).toBe(0);
    expect(safe.length).toBeGreaterThan(short.length);
    expect(safe.length).toBeLessThanOrEqual(MOVE_SPEED_FEET / 5);
  });

  describe('in a corridor the enemies close', () => {
    // Walls at x = 3 and x = 7, capped at both ends: the corridor is x 4..6,
    // y 3..12, and the only gap between the foes at (4, 8) and (6, 8) is (5, 8).
    const walls: Point[] = [];
    for (let y = 2; y <= 13; y++) walls.push({ x: 3, y }, { x: 7, y });
    for (let x = 3; x <= 7; x++) walls.push({ x, y: 2 }, { x, y: 13 });
    const arena = arenaWith(walls);
    const unit = unitAt(5, 4);
    const state = withFoes(unit, [foeOf(unit, 'foe-1', 4, 8), foeOf(unit, 'foe-2', 6, 8)]);
    const budget = 30;

    /** Every simple route within the budget, scored by brute force. */
    function bruteForce(): Map<string, { provocations: number; costFeet: number }> {
      const best = new Map<string, { provocations: number; costFeet: number }>();
      const visited = new Set<string>([key(unit)]);
      const walk = (at: Point, provocations: number, costFeet: number): void => {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const next = { x: at.x + dx, y: at.y + dy };
            const k = key(next);
            if (visited.has(k) || arena.isSolid(next)) continue;
            if (state.units.some((u) => u.id !== unit.id && u.x === next.x && u.y === next.y)) {
              continue;
            }
            const cost = costFeet + 5;
            if (cost > budget) continue;
            const hits = provocations + provocationsAlong(state, unit, [next], at);
            const held = best.get(k);
            if (
              !held ||
              hits < held.provocations ||
              (hits === held.provocations && cost < held.costFeet)
            ) {
              best.set(k, { provocations: hits, costFeet: cost });
            }
            visited.add(k);
            walk(next, hits, cost);
            visited.delete(k);
          }
        }
      };
      walk(unit, 0, 0);
      return best;
    }

    it('provokes the least any route can, and no more than the short one', () => {
      const reach = safeReachableCells(arena, state, unit, budget);
      const plain = reachableCells(arena, state, unit, budget);
      const expected = bruteForce();

      // The only way up the corridor is the gap, so the far cells cost both foes.
      const far = { x: 5, y: 10 };
      expect(reach.get(key(far))!.provocations).toBe(2);
      const short = pathTo(plain, far)!;
      expect(reach.get(key(far))!.provocations).toBeLessThanOrEqual(
        provocationsAlong(state, unit, short),
      );

      expect([...reach.keys()].sort()).toEqual([...expected.keys()].sort());
      for (const [k, want] of expected) {
        expect(reach.get(k)!.provocations).toBe(want.provocations);
        expect(reach.get(k)!.costFeet).toBe(want.costFeet);
      }
    });

    it('rebuilds a route that really provokes that minimum', () => {
      const reach = safeReachableCells(arena, state, unit, budget);
      for (const [k, entry] of reach) {
        const r = safePathTo(state, unit, reach, entry.cell)!;
        expect(r, k).not.toBeNull();
        expect(r[r.length - 1]).toEqual(entry.cell);
        expect(pathCostFeet(unit, r)).toBe(entry.costFeet);
        expect(provocationsAlong(state, unit, r)).toBe(entry.provocations);
        expect(validatePath(arena, state, unit, r, budget).ok).toBe(true);
      }
    });
  });

  describe('on the real pitch', () => {
    it('reaches exactly the cells reachableCells does, from every starting position', () => {
      for (const unit of base.units) {
        const plain = reachableCells(KILL_SILO_ARENA, base, unit, MOVE_SPEED_FEET);
        const safe = safeReachableCells(KILL_SILO_ARENA, base, unit, MOVE_SPEED_FEET);
        expect([...safe.keys()].sort(), unit.id).toEqual([...plain.keys()].sort());
      }
    });

    it('never costs fewer feet and never provokes more than the short route', () => {
      // A mid-pitch scrum: the first unit walks into three foes' reach.
      const mover = { ...base.units[0]!, x: 7, y: 22 };
      const foes = [
        foeOf(mover, 'foe-1', 8, 25),
        foeOf(mover, 'foe-2', 6, 25),
        foeOf(mover, 'foe-3', 9, 23),
      ];
      const state: MatchState = { ...base, units: [mover, ...foes] };

      const plain = reachableCells(KILL_SILO_ARENA, state, mover, MOVE_SPEED_FEET);
      const safe = safeReachableCells(KILL_SILO_ARENA, state, mover, MOVE_SPEED_FEET);
      expect([...safe.keys()].sort()).toEqual([...plain.keys()].sort());

      let strictlySafer = 0;
      for (const [k, entry] of safe) {
        const short = plain.get(k)!;
        expect(entry.costFeet, k).toBeGreaterThanOrEqual(short.costFeet);
        const shortHits = provocationsAlong(state, mover, pathTo(plain, short.cell)!);
        expect(entry.provocations, k).toBeLessThanOrEqual(shortHits);
        if (entry.provocations < shortHits) strictlySafer++;
        const r = safePathTo(state, mover, safe, entry.cell)!;
        expect(provocationsAlong(state, mover, r), k).toBe(entry.provocations);
        expect(pathCostFeet(mover, r), k).toBe(entry.costFeet);
      }
      // The scenario is built so that the safe sweep has something to win.
      expect(strictlySafer).toBeGreaterThan(0);
    });
  });

  it('is the straight line, as pathTo draws it, when no enemy is near', () => {
    const arena = arenaWith([{ x: 4, y: 3 }]);
    const unit = unitAt(2, 2);
    const state = lone(unit);
    const plain = reachableCells(arena, state, unit, MOVE_SPEED_FEET);
    const safe = safeReachableCells(arena, state, unit, MOVE_SPEED_FEET);
    for (const to of [
      { x: 6, y: 4 },
      { x: 2, y: 9 },
      { x: 9, y: 2 },
      { x: 7, y: 7 },
      { x: 0, y: 5 },
    ]) {
      expect(safePathTo(state, unit, safe, to)).toEqual(pathTo(plain, to));
      expect(safe.get(key(to))!.provocations).toBe(0);
      expect(safe.get(key(to))!.costFeet).toBe(plain.get(key(to))!.costFeet);
    }
  });

  it('is deterministic', () => {
    const arena = arenaWith([{ x: 6, y: 8 }]);
    const unit = unitAt(5, 5);
    const state = withFoes(unit, [foeOf(unit, 'foe-1', 6, 9), foeOf(unit, 'foe-2', 3, 8)]);
    const a = safeReachableCells(arena, state, unit, MOVE_SPEED_FEET);
    const b = safeReachableCells(arena, state, unit, MOVE_SPEED_FEET);
    expect([...b.entries()]).toEqual([...a.entries()]);
    const to = { x: 5, y: 12 };
    expect(safePathTo(state, unit, a, to)).toEqual(safePathTo(state, unit, b, to));
  });

  it('answers null for a cell it did not reach', () => {
    const unit = unitAt(5, 5);
    const state = lone(unit);
    const safe = safeReachableCells(arenaWith(), state, unit, MOVE_SPEED_FEET);
    expect(safePathTo(state, unit, safe, { x: 5, y: 30 })).toBeNull();
    expect(safePathTo(state, unit, safe, { x: 5, y: 5 })).toBeNull();
  });

  describe('from a hypothetical origin', () => {
    const arena = arenaWith();
    const real = unitAt(3, 3);
    // Beside (6, 6) but nowhere near the unit's real cell.
    const state = withFoes(real, [foeOf(real, 'foe-1', 7, 7)]);

    it('reads the mover on `from`, so walking out of a reach there is provoked', () => {
      const reach = safeReachableCells(arena, state, real, MOVE_SPEED_FEET, { x: 6, y: 6 });
      // (5, 5) is outside the foe's reach, so stepping there leaves it.
      expect(reach.get(key({ x: 5, y: 5 }))!.provocations).toBe(1);
      // (6, 7) is still inside it.
      expect(reach.get(key({ x: 6, y: 7 }))!.provocations).toBe(0);
      expect(reach.get(key({ x: 6, y: 7 }))!.from).toEqual({ x: 6, y: 6 });
      // Every cell outside the foe's reach costs at least that one swing.
      for (const entry of reach.values()) {
        if (distance(entry.cell, { x: 7, y: 7 }) > 1) {
          expect(entry.provocations).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('does not provoke the same walk from the real cell', () => {
      const reach = safeReachableCells(arena, state, real, MOVE_SPEED_FEET);
      expect(reach.get(key({ x: 5, y: 5 }))!.provocations).toBe(0);
    });

    it('has the same cells as reachableCells from that origin', () => {
      const from = { x: 6, y: 6 };
      const plain = reachableCells(arena, state, real, MOVE_SPEED_FEET, from);
      const safe = safeReachableCells(arena, state, real, MOVE_SPEED_FEET, from);
      expect([...safe.keys()].sort()).toEqual([...plain.keys()].sort());
      const to = { x: 4, y: 4 };
      const r = safePathTo(state, real, safe, to)!;
      expect(provocationsAlong(state, real, r, from)).toBe(safe.get(key(to))!.provocations);
    });
  });
});
