/**
 * The Kill-Silo is a single vertical plane seen in side elevation.
 *
 * x runs 0..14 left to right. y runs 0..44 with **0 at the floor**, so y grows
 * upward exactly as it does on screen. Zones are horizontal bands of that one
 * plane, not separate spaces: zone 0 is The Trench, 1 is The Scramble, 2 is
 * The Summit. They are numbered 1..3 for display only.
 */

import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  CELL_FEET,
  ZONE_CROSSING_FEET,
  ZONE_HEIGHT,
} from './constants.js';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function inBounds(p: Point): boolean {
  return p.x >= 0 && p.x < ARENA_WIDTH && p.y >= 0 && p.y < ARENA_HEIGHT;
}

/** 0, 1 or 2. Add one to display it as Zone 1, 2 or 3. */
export function zoneOf(p: Point): number {
  return Math.floor(p.y / ZONE_HEIGHT);
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
 * neighbouring cells. Crossing a zone boundary adds the ventilation grating's
 * toll on top of the cell's own cost.
 */
export function stepCostFeet(from: Point, to: Point): number {
  const crossing = zoneOf(from) !== zoneOf(to) ? ZONE_CROSSING_FEET : 0;
  return CELL_FEET + crossing;
}

// -- Directions -------------------------------------------------------------

/**
 * The eight compass directions in d8 order, so a roll of 1..8 indexes straight
 * into this array. North is up the screen, which is up the silo.
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

/** The eight neighbours of a cell that lie inside the arena. */
export function neighbours(p: Point): Point[] {
  return DIRECTIONS.map((d) => ({ x: p.x + d.x, y: p.y + d.y })).filter(inBounds);
}

// -- Straight lines ---------------------------------------------------------

/**
 * The cells a projectile crosses travelling `steps` cells in a fixed direction,
 * bouncing off the walls, the floor and the ceiling. A bounce inverts the axis
 * that would have left the arena and consumes the remaining movement, which is
 * how the Spark behaves on initiative count 10.
 *
 * The starting cell is not included. The path is returned in travel order so a
 * caller can stop at the first unit it meets.
 */
export function reflectedPath(from: Point, direction: Point, steps: number): Point[] {
  const path: Point[] = [];
  let { x, y } = from;
  let dx = direction.x;
  let dy = direction.y;

  for (let i = 0; i < steps; i++) {
    if (x + dx < 0 || x + dx >= ARENA_WIDTH) dx = -dx;
    if (y + dy < 0 || y + dy >= ARENA_HEIGHT) dy = -dy;

    // A corner inverts both axes, which can leave the step going nowhere.
    if (dx === 0 && dy === 0) break;

    x += dx;
    y += dy;
    path.push({ x, y });
  }

  return path;
}

/**
 * The cells between two points, walked one cell at a time under Chebyshev
 * movement, excluding the origin and including the destination. Used by the
 * Crackers, which home in on the nearest unit, and by a batted Cracker.
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

/**
 * The cells crossed travelling in a fixed direction until the arena wall stops
 * the projectile. Unlike the Spark, a batted Cracker does not bounce: it stops
 * at the wall.
 */
export function straightPath(from: Point, direction: Point, maxSteps: number): Point[] {
  const path: Point[] = [];
  let { x, y } = from;

  for (let i = 0; i < maxSteps; i++) {
    const next = { x: x + direction.x, y: y + direction.y };
    if (!inBounds(next)) break;
    x = next.x;
    y = next.y;
    path.push({ x, y });
  }

  return path;
}
