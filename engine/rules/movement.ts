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
import { CELL_FEET } from '../constants.js';
import { distance, inBounds, stepCostFeet, type Point } from '../geometry.js';
import { activeUnits, type MatchState, type Unit } from '../types.js';
import { barredCells } from './box.js';

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

  const occupied = occupiedCells(state, unit.id);
  const barred = barredCells(arena, state, unit.team);
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
    if (occupied.has(key(step))) {
      return { ok: false, reason: `${cellName(step)} is already occupied` };
    }
    if (barred.has(key(step))) {
      return { ok: false, reason: `${cellName(step)} is inside the closed penalty box` };
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
  from: Point = { x: unit.x, y: unit.y },
): Map<string, Reachable> {
  // `from` stands in for the unit's cell: the real cell is already free,
  // since occupiedCells leaves the unit itself out.
  const blocked = closedCells(arena, state, unit);
  const start: Point = { x: from.x, y: from.y };
  const best = new Map<string, Reachable>();
  best.set(key(start), { cell: start, costFeet: 0, from: null });

  // A bucket queue: a step costs a multiple of CELL_FEET, so the bucket at
  // index costFeet / CELL_FEET is popped in increasing cost order with no
  // sorting. A step never costs less than the one before it, so a bucket only
  // ever receives entries while it is being drained or after.
  const buckets: Reachable[][] = [[{ cell: start, costFeet: 0, from: null }]];

  for (let b = 0; b < buckets.length; b++) {
    const bucket = buckets[b];
    if (!bucket) continue;
    for (let i = 0; i < bucket.length; i++) {
      const current = bucket[i]!;

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
        const index = Math.floor(costFeet / CELL_FEET);
        (buckets[index] ??= []).push(entry);
      }
    }
  }

  best.delete(key(start));
  return best;
}

/**
 * The cheapest route to a reachable cell, origin excluded, ready to be sent as
 * a `move` action. The client offers this as the default and lets the player
 * drag a different route; the AI takes it as is.
 *
 * Many cheapest routes usually exist, and the sweep's parent pointers pick one
 * arbitrarily, which drew gratuitous arcs. So the route is rebuilt from the
 * destination back, and at each step takes, among the neighbours that sit one
 * step closer in cost, the one nearest the straight line from origin to
 * destination. Ties fall to the fixed neighbour order, so it is deterministic.
 */
export function pathTo(
  reachable: ReadonlyMap<string, Reachable>,
  destination: Point,
): Point[] | null {
  const end = reachable.get(key(destination));
  if (!end) return null;

  // The origin is not in the map; walk the stored parents once to find it.
  let origin: Point = end.cell;
  for (let e: Reachable | undefined = end; e; ) {
    if (!e.from) break;
    origin = e.from;
    e = reachable.get(key(e.from));
  }

  const dx = destination.x - origin.x;
  const dy = destination.y - origin.y;
  const deviation = (p: Point): number =>
    Math.abs((p.x - origin.x) * dy - (p.y - origin.y) * dx);

  const route: Point[] = [end.cell];
  let current = end;
  while (current.from && !(current.from.x === origin.x && current.from.y === origin.y)) {
    const wanted = current.costFeet - stepCostFeet(origin, current.cell);
    let best: Reachable | null = null;
    let bestDeviation = Infinity;
    for (const n of neighbourCells(current.cell)) {
      const candidate = reachable.get(key(n));
      if (!candidate || candidate.costFeet !== wanted) continue;
      const d = deviation(candidate.cell);
      if (d < bestDeviation) {
        best = candidate;
        bestDeviation = d;
      }
    }
    // The parent always qualifies, so this only guards the type.
    current = best ?? reachable.get(key(current.from))!;
    route.unshift(current.cell);
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

/**
 * Every cell this unit may not step on: the ones other players stand on, and
 * the penalty box in front of the opposing mouth while it is closed to its
 * side (écart 53). The route search reads this one set; `validatePath` reads
 * the two parts apart so its refusal can say which rule stopped the step.
 */
function closedCells(arena: Arena, state: MatchState, unit: Unit): Set<string> {
  const cells = occupiedCells(state, unit.id);
  for (const barred of barredCells(arena, state, unit.team)) cells.add(barred);
  return cells;
}

export function key(p: Point): string {
  return `${p.x},${p.y}`;
}

function cellName(p: Point): string {
  return `(${p.x}, ${p.y})`;
}
