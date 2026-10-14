/**
 * Pure geometry for the 3D board: where an engine cell sits in the world, and
 * the obstacle layout merged into a few boxes to draw.
 *
 * World frame, Y up: world X runs along the pitch length (engine y), world Z
 * along the width (engine x), one cell is one world unit, the pitch is centred
 * on the origin. No three.js and no React here, so it stays testable.
 */

import { Arena, type ArenaSpec, type TeamId } from '../../../engine/arena.js';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import type { Point } from '../../../engine/geometry.js';

export const CELL = 1;
export const PITCH_LENGTH = ARENA_HEIGHT;
export const PITCH_WIDTH = ARENA_WIDTH;

const HALF_LENGTH = (ARENA_HEIGHT - 1) / 2;
const HALF_WIDTH = (ARENA_WIDTH - 1) / 2;

/** World position of the centre of an engine cell. */
export function cellCentre(p: Point): { x: number; z: number } {
  return { x: (p.y - HALF_LENGTH) * CELL, z: (p.x - HALF_WIDTH) * CELL };
}

/** The engine cell under a world position, or null when it is off the pitch. */
export function cellAt(worldX: number, worldZ: number): Point | null {
  const y = Math.round(worldX / CELL + HALF_LENGTH);
  const x = Math.round(worldZ / CELL + HALF_WIDTH);
  if (x < 0 || x >= ARENA_WIDTH || y < 0 || y >= ARENA_HEIGHT) return null;
  return { x, y };
}

/** A rectangle of engine cells: top-left (x, y), w cells along x, h along y. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Every solid cell outside the Furnace hatches, merged greedily into
 * rectangles. Scans by (y, x); each uncovered cell grows along x, then along y.
 */
export function obstacleBoxes(spec: ArenaSpec): Box[] {
  const arena = new Arena(spec);
  const hatch = new Set<string>();
  for (const f of spec.furnaces) for (const c of f.cells) hatch.add(`${c.x},${c.y}`);

  const covered = new Set<string>();
  const free = (x: number, y: number): boolean =>
    x >= 0 &&
    x < ARENA_WIDTH &&
    y >= 0 &&
    y < ARENA_HEIGHT &&
    arena.isSolid({ x, y }) &&
    !hatch.has(`${x},${y}`) &&
    !covered.has(`${x},${y}`);

  const boxes: Box[] = [];
  for (let y = 0; y < ARENA_HEIGHT; y++) {
    for (let x = 0; x < ARENA_WIDTH; x++) {
      if (!free(x, y)) continue;
      let w = 1;
      while (free(x + w, y)) w++;
      const rowFree = (yy: number): boolean => {
        for (let i = 0; i < w; i++) if (!free(x + i, yy)) return false;
        return true;
      };
      let h = 1;
      while (rowFree(y + h)) h++;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) covered.add(`${x + dx},${y + dy}`);
      }
      boxes.push({ x, y, w, h });
    }
  }
  return boxes;
}

/** World centre of a box, and its sizes: sx along world X (h cells), sz along Z (w cells). */
export function boxCentre(box: Box): { x: number; z: number; sx: number; sz: number } {
  const c = cellCentre({ x: box.x + (box.w - 1) / 2, y: box.y + (box.h - 1) / 2 });
  return { x: c.x, z: c.z, sx: box.h * CELL, sz: box.w * CELL };
}

/** One entry per Furnace: its cells, the mean of their centres, and its width in cells. */
export function furnaceMouths(spec: ArenaSpec): {
  defendedBy: TeamId;
  cells: readonly Point[];
  centre: { x: number; z: number };
  width: number;
}[] {
  return spec.furnaces.map((f) => {
    const centres = f.cells.map(cellCentre);
    const n = centres.length;
    return {
      defendedBy: f.defendedBy,
      cells: f.cells,
      centre: {
        x: centres.reduce((s, c) => s + c.x, 0) / n,
        z: centres.reduce((s, c) => s + c.z, 0) / n,
      },
      width: n,
    };
  });
}
