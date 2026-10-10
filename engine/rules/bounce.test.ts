import { describe, expect, it } from 'vitest';
import { Arena } from '../arena.js';
import { KILL_SILO } from '../arenas/kill-silo.js';
import { d8FromDirection, DIRECTIONS, inBounds, type Point } from '../geometry.js';
import { bounceStep, bouncingRun } from './bounce.js';

const arena = new Arena(KILL_SILO);
const edgesOnly = (p: Point) => !inBounds(p);
const solid = (p: Point) => arena.isSolid(p);
/** The edge of the pitch, plus the listed cells. */
const walls =
  (...cells: [number, number][]) =>
  (p: Point) =>
    !inBounds(p) || cells.some(([x, y]) => p.x === x && p.y === y);

describe('bounce: orthogonal', () => {
  it('bounces off the end of an open corridor and comes back', () => {
    const run = bouncingRun(edgesOnly, { x: 7, y: 40 }, { x: 0, y: 1 }, 6);
    expect(run.path).toEqual([
      { x: 7, y: 41 },
      { x: 7, y: 42 },
      { x: 7, y: 43 },
      { x: 7, y: 44 },
      { x: 7, y: 43 },
      { x: 7, y: 42 },
    ]);
    expect(run.heading).toEqual({ x: 0, y: -1 });
  });

  it('bounces off an obstacle of the Kill-Silo', () => {
    const run = bouncingRun(solid, { x: 7, y: 13 }, { x: 0, y: 1 }, 6);
    expect(run.path).toEqual([
      { x: 7, y: 14 },
      { x: 7, y: 15 },
      { x: 7, y: 14 },
      { x: 7, y: 13 },
      { x: 7, y: 12 },
      { x: 7, y: 11 },
    ]);
    expect(run.heading).toEqual({ x: 0, y: -1 });
  });

  it('bounces off the side of the pitch', () => {
    const run = bouncingRun(edgesOnly, { x: 13, y: 20 }, { x: 1, y: 0 }, 3);
    expect(run.path).toEqual([
      { x: 14, y: 20 },
      { x: 13, y: 20 },
      { x: 12, y: 20 },
    ]);
    expect(run.heading).toEqual({ x: -1, y: 0 });
  });
});

describe('bounce: diagonal', () => {
  const at = { x: 5, y: 5 };
  const ne = { x: 1, y: 1 };

  it('a wall on the x side turns only x: NE becomes NW', () => {
    const step = bounceStep(walls([6, 6], [6, 5]), at, ne);
    expect(step).toEqual({ to: { x: 4, y: 6 }, dir: { x: -1, y: 1 } });
  });

  it('a wall on the y side turns only y: NE becomes SE', () => {
    const step = bounceStep(walls([6, 6], [5, 6]), at, ne);
    expect(step).toEqual({ to: { x: 6, y: 4 }, dir: { x: 1, y: -1 } });
  });

  it('a lone diagonal corner reverses both: NE becomes SW', () => {
    const step = bounceStep(walls([6, 6]), at, ne);
    expect(step).toEqual({ to: { x: 4, y: 4 }, dir: { x: -1, y: -1 } });
  });

  it('an inside corner reverses both: NE becomes SW', () => {
    const step = bounceStep(walls([6, 6], [6, 5], [5, 6]), at, ne);
    expect(step).toEqual({ to: { x: 4, y: 4 }, dir: { x: -1, y: -1 } });
  });

  it('a free target is a plain step with the heading unchanged', () => {
    expect(bounceStep(edgesOnly, at, ne)).toEqual({ to: { x: 6, y: 6 }, dir: ne });
  });
});

describe('bounce: a bounce consumes no step', () => {
  it('six cells exactly, all free and on the pitch, from every open cell in every direction', () => {
    for (const cell of arena.occupiableCells()) {
      for (const dir of DIRECTIONS) {
        const run = bouncingRun(solid, cell, dir, 6);
        const where = `from ${cell.x},${cell.y} heading ${dir.x},${dir.y}`;
        expect(run.path, where).toHaveLength(6);
        for (const p of run.path) {
          expect(inBounds(p), where).toBe(true);
          expect(arena.isSolid(p), where).toBe(false);
        }
        expect(() => d8FromDirection(run.heading), where).not.toThrow();
      }
    }
  });
});

describe('bounce: the fallback where the written rule stalls', () => {
  // Two shapes on the Kill-Silo, 24 start/heading pairs. (1) A side-edge cell
  // beside a side cover, heading E or W. (2) The cell between a central pillar
  // and a cover that touch at corners, on the diagonal through both.
  it('turns clockwise to the first free neighbour from an edge cell beside a cover', () => {
    // (0,12) heading E: the cover at (1,12) and the edge at (-1,12) trade places.
    // Clockwise from E: SE (1,11) is free.
    expect(bounceStep(solid, { x: 0, y: 12 }, { x: 1, y: 0 })).toEqual({
      to: { x: 1, y: 11 },
      dir: { x: 1, y: -1 },
    });
    // (14,12) heading W: NW (13,13) is a cover, so N (14,13) is the first free.
    expect(bounceStep(solid, { x: 14, y: 12 }, { x: -1, y: 0 })).toEqual({
      to: { x: 14, y: 13 },
      dir: { x: 0, y: 1 },
    });
  });

  it('turns clockwise to the first free neighbour between a pillar and a cover', () => {
    // (6,17) heading SE: S (6,16) is the first free face after SE.
    expect(bounceStep(solid, { x: 6, y: 17 }, { x: 1, y: -1 })).toEqual({
      to: { x: 6, y: 16 },
      dir: { x: 0, y: -1 },
    });
    // (8,27) heading SE, the mirror pocket: it must still come out on a free cell.
    const step = bounceStep(solid, { x: 8, y: 27 }, { x: 1, y: -1 });
    expect(step).not.toBeNull();
    expect(solid(step!.to)).toBe(false);
  });

  it('does not fire where the written rule finds a cell: that bounce is untouched', () => {
    expect(bounceStep(solid, { x: 7, y: 15 }, { x: 0, y: 1 })).toEqual({
      to: { x: 7, y: 14 },
      dir: { x: 0, y: -1 },
    });
  });
});

describe('bounce: boxed in', () => {
  const from = { x: 7, y: 7 };
  const boxed = (p: Point) => !(p.x === from.x && p.y === from.y);

  it('bounceStep gives up with null', () => {
    for (const dir of DIRECTIONS) expect(bounceStep(boxed, from, dir)).toBeNull();
  });

  it('bouncingRun stops early with an empty path and the original heading', () => {
    const dir = { x: 1, y: 1 };
    const run = bouncingRun(boxed, from, dir, 6);
    expect(run.path).toEqual([]);
    expect(run.heading).toEqual(dir);
  });

  it('a run in a two-cell pocket keeps bouncing between them', () => {
    const pocket = (p: Point) => !(p.x === 7 && (p.y === 7 || p.y === 8));
    const run = bouncingRun(pocket, from, { x: 0, y: 1 }, 4);
    expect(run.path).toEqual([
      { x: 7, y: 8 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 7, y: 7 },
    ]);
  });
});
