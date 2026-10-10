import { describe, expect, it } from 'vitest';
import { Arena } from '../arena.js';
import { KILL_SILO } from '../arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../constants.js';
import { DIRECTIONS, type Point } from '../geometry.js';
import { hasLineOfSight, lineOfSight } from './sight.js';

const arena = new Arena(KILL_SILO);
const see = (a: Point, b: Point) => hasLineOfSight(arena, a, b);

describe('line of sight: neighbours', () => {
  it('a cell sees itself and every adjacent cell', () => {
    const from = { x: 7, y: 15 }; // next to the pillar at (7, 16)
    expect(see(from, from)).toBe(true);
    for (const d of DIRECTIONS) {
      expect(see(from, { x: from.x + d.x, y: from.y + d.y })).toBe(true);
    }
  });

  it('an obstacle adjacent to the viewer is an endpoint, never a blocker', () => {
    expect(see({ x: 7, y: 15 }, { x: 7, y: 16 })).toBe(true);
  });
});

describe('line of sight: obstacles on the pitch', () => {
  it('a column through a pillar is cut, the column beside it is clear', () => {
    expect(see({ x: 7, y: 14 }, { x: 7, y: 18 })).toBe(false); // (7, 16)
    expect(see({ x: 6, y: 14 }, { x: 6, y: 18 })).toBe(true);
  });

  it('a row through the crate at y = 9 is cut', () => {
    expect(see({ x: 4, y: 9 }, { x: 10, y: 9 })).toBe(false);
  });

  it('a diagonal through the centre of an obstacle is cut', () => {
    expect(see({ x: 6, y: 15 }, { x: 8, y: 17 })).toBe(false); // centre of (7, 16)
  });

  it('a corner graze does not block', () => {
    // The segment (6.5, 16.5) to (8.5, 18.5) meets (7, 16) only at its corner (7, 17).
    expect(see({ x: 6, y: 16 }, { x: 8, y: 18 })).toBe(true);
  });

  it('a long clear line along an open column, and a cut one', () => {
    expect(see({ x: 1, y: 1 }, { x: 1, y: 11 })).toBe(true);
    expect(see({ x: 1, y: 1 }, { x: 1, y: 14 })).toBe(false); // (1, 12) and (1, 13)
  });
});

describe('line of sight: symmetry', () => {
  it('gives the same answer in both directions over a fixed sample of pairs', () => {
    // Deterministic pseudo-random sample, so a failure is reproducible.
    let seed = 12345;
    const next = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed >> 8) % n;
    };
    for (let i = 0; i < 500; i++) {
      const a = { x: next(ARENA_WIDTH), y: next(ARENA_HEIGHT) };
      const b = { x: next(ARENA_WIDTH), y: next(ARENA_HEIGHT) };
      expect(see(a, b), `${a.x},${a.y} <-> ${b.x},${b.y}`).toBe(see(b, a));
    }
  });
});

describe('line of sight: the predicate', () => {
  it('a predicate that blocks nothing sees everything', () => {
    const none = () => false;
    expect(lineOfSight(none, { x: 0, y: 0 }, { x: 14, y: 44 })).toBe(true);
    expect(lineOfSight(none, { x: 3, y: 9 }, { x: 11, y: 2 })).toBe(true);
  });

  it('a predicate that blocks everything but the endpoints cuts two cells 3 apart', () => {
    const from = { x: 3, y: 3 };
    const to = { x: 6, y: 3 };
    const all = (p: Point) =>
      !(p.x === from.x && p.y === from.y) && !(p.x === to.x && p.y === to.y);
    expect(lineOfSight(all, from, to)).toBe(false);
  });

  it('only the predicate decides, the rule knows nothing else', () => {
    expect(lineOfSight((p) => p.x === 5 && p.y === 3, { x: 3, y: 3 }, { x: 7, y: 3 })).toBe(false);
  });
});

describe('line of sight: a Furnace mouth', () => {
  const mouthOpen = (p: Point) => arena.blocksSight(p) && !(p.y === 0 && p.x >= 6 && p.x <= 8);
  const hatch = { x: 7, y: 0 };

  it('the diagonal from (2, 5) only grazes the neighbouring hatch cell, so it sees the hatch either way', () => {
    // y = 8 - x meets (6, 0) only at its corner (7, 1), so it does not cross it.
    expect(lineOfSight(mouthOpen, { x: 2, y: 5 }, hatch)).toBe(true);
    expect(see({ x: 2, y: 5 }, hatch)).toBe(true);
  });

  it('a shallow line from (0, 2) crosses (6, 0): cut by the plain arena, seen once the mouth is open', () => {
    // At x = 6 the segment is at y = 0.93, inside (6, 0). (2, 5) does not cross it,
    // so this start stands in for the one the brief asked for.
    expect(see({ x: 0, y: 2 }, hatch)).toBe(false);
    expect(lineOfSight(mouthOpen, { x: 0, y: 2 }, hatch)).toBe(true);
  });
});
