/**
 * The Kill-Silo is a single horizontal plane seen from above.
 *
 * x runs 0..14 across the pitch. y runs 0..44 along it, with **0 at Furnace
 * A's mouth** and 44 at Furnace B's. The three "thirds" are bands of that one
 * plane, named for the feed and for the Spark's entry and carrying no rule:
 * third 0 is Furnace A's end, 1 the middle, 2 Furnace B's end.
 *
 * The coordinates predate D11 and are unchanged: a y that used to be a height
 * is now a length along the pitch, and that is the whole of the difference.
 */

import { ARENA_HEIGHT, ARENA_WIDTH, CELL_FEET, THIRD_LENGTH } from './constants.js';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function inBounds(p: Point): boolean {
  return p.x >= 0 && p.x < ARENA_WIDTH && p.y >= 0 && p.y < ARENA_HEIGHT;
}

/**
 * 0, 1 or 2, from Furnace A's end to Furnace B's. A reading for the feed and
 * for where the Spark drops in, never a rule: nothing costs more or less for
 * being in one third rather than another.
 */
export function thirdOf(p: Point): number {
  return Math.floor(p.y / THIRD_LENGTH);
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Chebyshev distance, which is what makes a diagonal step cost the same as an
 * orthogonal one. That is the 5e 2024 rule and it applies to every distance in
 * the game: ranges, adjacency, "the nearest unit", spawn clearance.
 */
export function distance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function isAdjacent(a: Point, b: Point): boolean {
  return distance(a, b) === 1;
}

/**
 * Movement cost of one step, in feet. A step is always to one of the eight
 * neighbouring cells and always costs the same: the zone toll of the vertical
 * silo went with D11 (écart 30). The two arguments are kept so a future terrain
 * cost has somewhere to live without every caller changing shape.
 */
export function stepCostFeet(_from: Point, _to: Point): number {
  return CELL_FEET;
}

// -- Directions -------------------------------------------------------------

/**
 * The eight compass directions in d8 order, so a roll of 1..8 indexes straight
 * into this array. North is towards Furnace B, which is up the drawing.
 */
export const DIRECTIONS: readonly Point[] = [
  { x: 0, y: 1 }, // 1 N
  { x: 1, y: 1 }, // 2 NE
  { x: 1, y: 0 }, // 3 E
  { x: 1, y: -1 }, // 4 SE
  { x: 0, y: -1 }, // 5 S
  { x: -1, y: -1 }, // 6 SW
  { x: -1, y: 0 }, // 7 W
  { x: -1, y: 1 }, // 8 NW
];

export function directionFromD8(roll: number): Point {
  const dir = DIRECTIONS[roll - 1];
  if (!dir) throw new Error(`d8 roll out of range: ${roll}`);
  return dir;
}

/**
 * The inverse: the d8 face a unit step corresponds to. The Spark keeps its
 * heading from one round to the next, so a bounce has to be written back as a
 * face rather than a vector.
 */
export function d8FromDirection(dir: Point): number {
  const face = DIRECTIONS.findIndex((d) => d.x === dir.x && d.y === dir.y);
  if (face < 0) throw new Error(`not one of the eight directions: ${dir.x},${dir.y}`);
  return face + 1;
}

/** The eight neighbours of a cell that lie inside the arena. */
export function neighbours(p: Point): Point[] {
  return DIRECTIONS.map((d) => ({ x: p.x + d.x, y: p.y + d.y })).filter(inBounds);
}

// -- Straight lines ---------------------------------------------------------

/**
 * The cells between two points, walked one cell at a time under Chebyshev
 * movement, excluding the origin and including the destination. This is the
 * flight of a thrown Payload, which is what the interception rule reads.
 *
 * The Crackers and the Spark no longer use it: a Cracker in drift takes the
 * shortest path around the obstacles (`rules/ordnance.ts`) and anything struck
 * or drifting on a fixed heading bounces (`rules/bounce.ts`).
 */
export function lineTo(from: Point, to: Point, maxSteps = Infinity): Point[] {
  const path: Point[] = [];
  let { x, y } = from;

  while ((x !== to.x || y !== to.y) && path.length < maxSteps) {
    x += Math.sign(to.x - x);
    y += Math.sign(to.y - y);
    path.push({ x, y });
  }

  return path;
}
