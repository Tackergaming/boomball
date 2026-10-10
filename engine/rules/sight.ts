/**
 * Line of sight (écart 34).
 *
 * A pure rule over a predicate: it knows which cells cut the view and nothing
 * about units, which never do. The segment is drawn between the two cell
 * centres, and a cell blocks when that segment crosses its **open** interior.
 * Touching a corner or running exactly along an edge is not crossing, so a
 * diagonal that grazes the corner of a pillar sees past it.
 */

import type { Arena } from '../arena.js';
import { distance, type Point } from '../geometry.js';

/** True for a cell that cuts a line drawn across it. */
export type SightBlocker = (p: Point) => boolean;

/** Absorbs floating point, so a segment that only grazes a corner stays a graze. */
const EPSILON = 1e-9;

/**
 * Pure. True when no cell for which `blocks` is true lies strictly between
 * `from` and `to`. The two endpoint cells themselves are never tested.
 */
export function lineOfSight(blocks: SightBlocker, from: Point, to: Point): boolean {
  if (distance(from, to) <= 1) return true;

  const x0 = from.x + 0.5;
  const y0 = from.y + 0.5;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if ((x === from.x && y === from.y) || (x === to.x && y === to.y)) continue;
      if (crossesInterior(x0, y0, dx, dy, x, y) && blocks({ x, y })) return false;
    }
  }
  return true;
}

/** The arena's own obstacles: `lineOfSight(p => arena.blocksSight(p), from, to)`. */
export function hasLineOfSight(arena: Arena, from: Point, to: Point): boolean {
  return lineOfSight((p) => arena.blocksSight(p), from, to);
}

/**
 * Liang-Barsky against the open square (x, x+1) by (y, y+1). The segment is
 * (x0, y0) + t (dx, dy) for t in [0, 1]; it crosses when the stretch of t spent
 * strictly inside the box has positive length.
 */
function crossesInterior(
  x0: number,
  y0: number,
  dx: number,
  dy: number,
  x: number,
  y: number,
): boolean {
  let tMin = 0;
  let tMax = 1;

  for (const [origin, delta, lo] of [
    [x0, dx, x],
    [y0, dy, y],
  ] as const) {
    if (delta === 0) {
      // Parallel to this axis: inside only if strictly between the two edges.
      if (origin <= lo || origin >= lo + 1) return false;
      continue;
    }
    const a = (lo - origin) / delta;
    const b = (lo + 1 - origin) / delta;
    tMin = Math.max(tMin, Math.min(a, b));
    tMax = Math.min(tMax, Math.max(a, b));
    if (tMax - tMin <= EPSILON) return false;
  }
  return tMax - tMin > EPSILON;
}
