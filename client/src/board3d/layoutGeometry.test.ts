/**
 * The 3D board's geometry must agree with the engine's terrain: the boxes it
 * draws cover exactly the solid cells, and the world mapping round-trips.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from '../../../engine/arena.js';
import { KILL_SILO } from '../../../engine/arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import {
  boxCentre,
  cellAt,
  cellCentre,
  furnaceMouths,
  obstacleBoxes,
} from './layoutGeometry.js';

const arena = new Arena(KILL_SILO);
const boxes = obstacleBoxes(KILL_SILO);
const hatch = new Set(KILL_SILO.furnaces.flatMap((f) => f.cells.map((c) => `${c.x},${c.y}`)));

function coverage(): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of boxes) {
    for (let dy = 0; dy < b.h; dy++) {
      for (let dx = 0; dx < b.w; dx++) {
        const k = `${b.x + dx},${b.y + dy}`;
        map.set(k, (map.get(k) ?? 0) + 1);
      }
    }
  }
  return map;
}

describe('obstacleBoxes', () => {
  it('covers every solid non-furnace cell exactly once and nothing else', () => {
    const map = coverage();
    for (let y = 0; y < ARENA_HEIGHT; y++) {
      for (let x = 0; x < ARENA_WIDTH; x++) {
        const k = `${x},${y}`;
        const expected = arena.isSolid({ x, y }) && !hatch.has(k) ? 1 : 0;
        expect(map.get(k) ?? 0, `cell ${k}`).toBe(expected);
      }
    }
  });

  it('stays inside the pitch', () => {
    for (const b of boxes) {
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(ARENA_WIDTH);
      expect(b.y + b.h).toBeLessThanOrEqual(ARENA_HEIGHT);
    }
  });

  it('is mirror-symmetric around y = 22', () => {
    const map = coverage();
    for (let y = 0; y < ARENA_HEIGHT; y++) {
      for (let x = 0; x < ARENA_WIDTH; x++) {
        expect(map.has(`${x},${y}`), `cell ${x},${y}`).toBe(map.has(`${x},${44 - y}`));
      }
    }
  });

  it('is deterministic and sorted by (y, x)', () => {
    expect(obstacleBoxes(KILL_SILO)).toEqual(boxes);
    for (let i = 1; i < boxes.length; i++) {
      const a = boxes[i - 1]!;
      const b = boxes[i]!;
      expect(a.y < b.y || (a.y === b.y && a.x < b.x)).toBe(true);
    }
  });

  it('gives a box its world centre and sizes', () => {
    const c = boxCentre({ x: 6, y: 9, w: 3, h: 1 });
    expect(c.x).toBeCloseTo(9 - 22);
    expect(c.z).toBeCloseTo(0);
    expect(c.sx).toBe(1);
    expect(c.sz).toBe(3);
  });
});

describe('cell mapping', () => {
  it('puts the centre cell at the origin', () => {
    const c = cellCentre({ x: 7, y: 22 });
    expect(c.x).toBeCloseTo(0);
    expect(c.z).toBeCloseTo(0);
  });

  it('round-trips every cell', () => {
    for (let y = 0; y < ARENA_HEIGHT; y++) {
      for (let x = 0; x < ARENA_WIDTH; x++) {
        const c = cellCentre({ x, y });
        expect(cellAt(c.x, c.z)).toEqual({ x, y });
      }
    }
  });

  it('returns null one cell outside each edge', () => {
    const lo = cellCentre({ x: 0, y: 0 });
    const hi = cellCentre({ x: ARENA_WIDTH - 1, y: ARENA_HEIGHT - 1 });
    expect(cellAt(lo.x - 1, 0)).toBeNull();
    expect(cellAt(hi.x + 1, 0)).toBeNull();
    expect(cellAt(0, lo.z - 1)).toBeNull();
    expect(cellAt(0, hi.z + 1)).toBeNull();
  });
});

describe('furnaceMouths', () => {
  it('finds both mouths, three cells wide, at the two ends', () => {
    const mouths = furnaceMouths(KILL_SILO);
    expect(mouths.map((m) => m.defendedBy)).toEqual(['A', 'B']);
    const [a, b] = mouths;
    expect(a!.width).toBe(3);
    expect(b!.width).toBe(3);
    expect(a!.centre.x).toBeCloseTo(-22);
    expect(a!.centre.z).toBeCloseTo(0);
    expect(b!.centre.x).toBeCloseTo(22);
    expect(b!.centre.z).toBeCloseTo(0);
  });
});
