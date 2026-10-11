import { describe, expect, it } from 'vitest';

import { Arena } from '../arena.js';
import { KILL_SILO } from '../arenas/kill-silo.js';
import { MOVE_SPEED_FEET } from '../constants.js';
import { distance, lineTo, type Point } from '../geometry.js';
import { createMatch } from '../setup.js';
import type { MatchState, Unit } from '../types.js';
import { key, pathTo, reachableCells } from './movement.js';

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
