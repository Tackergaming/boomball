/**
 * Movement on the pitch.
 *
 * Every unit runs at forty feet, eight cells, in any of the eight directions
 * (écart 29). A step costs five feet wherever it is taken: the zone toll of the
 * vertical silo went with D11. An obstacle cell cannot be entered and a cell
 * with a unit on it cannot either, so a route goes round both.
 *
 * The client sends the **whole path**, not a destination. Two reasons: a player
 * routing around an enemy's reach to dodge an opportunity attack is making a
 * real decision, and the AI needs the same freedom to be worth playing against.
 * An engine that picked the cheapest route would silently overrule both.
 */

import type { Arena } from '../arena.js';
import { distance, inBounds, stepCostFeet, type Point } from '../geometry.js';
import { activeUnits, type MatchState, type Unit } from '../types.js';

export interface PathAccepted {
  readonly ok: true;
  readonly costFeet: number;
}

export interface PathRejected {
  readonly ok: false;
  readonly reason: string;
}

export type PathVerdict = PathAccepted | PathRejected;

/** Cost in feet of a path leaving `from`. The origin is not part of the path. */
export function pathCostFeet(from: Point, path: readonly Point[]): number {
  let cost = 0;
  let current = from;
  for (const step of path) {
    cost += stepCostFeet(current, step);
    current = step;
  }
  return cost;
}

/**
 * Whether a unit may walk this path with the budget it has left. Every rule
 * that could refuse a move lives here and nowhere else, so the interface and
 * the AI agree on what is legal by asking rather than by reimplementing.
 */
export function validatePath(
  arena: Arena,
  state: MatchState,
  unit: Unit,
  path: readonly Point[],
  budgetFeet: number,
): PathVerdict {
  if (path.length === 0) return { ok: false, reason: 'the path is empty' };

  const blocked = occupiedCells(state, unit.id);
  let current: Point = { x: unit.x, y: unit.y };
  let cost = 0;

  for (const step of path) {
    if (!inBounds(step)) {
      return { ok: false, reason: `${cellName(step)} is off the pitch` };
    }
    if (distance(current, step) !== 1) {
      return { ok: false, reason: `${cellName(current)} and ${cellName(step)} are not adjacent` };
    }
    if (arena.isSolid(step)) {
      return { ok: false, reason: `${cellName(step)} is an obstacle` };
    }
    if (blocked.has(key(step))) {
      return { ok: false, reason: `${cellName(step)} is already occupied` };
    }

    cost += stepCostFeet(current, step);
    if (cost > budgetFeet) {
      return { ok: false, reason: `the path costs ${cost} feet, ${budgetFeet} remain` };
    }
    current = step;
  }

  return { ok: true, costFeet: cost };
}

/**
 * Every cell a unit can reach on the budget it has left, with what each costs.
 * Dijkstra, kept from the days when a step could cost more than another; with
 * every step at five feet it degenerates into a breadth-first sweep, and it
 * stays Dijkstra so a terrain cost can come back without rewriting it.
 *
 * Feeds the interface's move highlight and the AI's repositioning candidates
 * from the same code, which is the point.
 */
export interface Reachable {
  readonly cell: Point;
  readonly costFeet: number;
  /** The cell stepped from, so a route can be walked back. Null at the start. */
  readonly from: Point | null;
}

export function reachableCells(
  arena: Arena,
  state: MatchState,
  unit: Unit,
  budgetFeet: number,
): Map<string, Reachable> {
  const blocked = occupiedCells(state, unit.id);
  const start: Point = { x: unit.x, y: unit.y };
  const best = new Map<string, Reachable>();
  best.set(key(start), { cell: start, costFeet: 0, from: null });

  // A frontier this small does not justify a heap: the arena is 675 cells and
  // a forty foot budget reaches a few dozen of them.
  const frontier: Reachable[] = [{ cell: start, costFeet: 0, from: null }];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.costFeet - b.costFeet);
    const current = frontier.shift()!;

    const known = best.get(key(current.cell));
    if (known && known.costFeet < current.costFeet) continue;

    for (const next of neighbourCells(current.cell)) {
      if (arena.isSolid(next) || blocked.has(key(next))) continue;

      const costFeet = current.costFeet + stepCostFeet(current.cell, next);
      if (costFeet > budgetFeet) continue;

      const seen = best.get(key(next));
      if (seen && seen.costFeet <= costFeet) continue;

      const entry: Reachable = { cell: next, costFeet, from: current.cell };
      best.set(key(next), entry);
      frontier.push(entry);
    }
  }

  best.delete(key(start));
  return best;
}

/**
 * The cheapest route to a reachable cell, origin excluded, ready to be sent as
 * a `move` action. The client offers this as the default and lets the player
 * drag a different route; the AI takes it as is.
 */
export function pathTo(
  reachable: ReadonlyMap<string, Reachable>,
  destination: Point,
): Point[] | null {
  const route: Point[] = [];
  let step = reachable.get(key(destination));
  if (!step) return null;

  while (step) {
    route.unshift(step.cell);
    step = step.from ? reachable.get(key(step.from)) : undefined;
  }

  return route;
}

function neighbourCells(p: Point): Point[] {
  const out: Point[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const cell = { x: p.x + dx, y: p.y + dy };
      if (inBounds(cell)) out.push(cell);
    }
  }
  return out;
}

function occupiedCells(state: MatchState, exceptUnitId: string): Set<string> {
  const cells = new Set<string>();
  for (const unit of activeUnits(state)) {
    if (unit.id === exceptUnitId) continue;
    cells.add(key(unit));
  }
  return cells;
}

export function key(p: Point): string {
  return `${p.x},${p.y}`;
}

function cellName(p: Point): string {
  return `(${p.x}, ${p.y})`;
}
