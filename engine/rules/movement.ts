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
import { ARENA_HEIGHT, ARENA_WIDTH, CELL_FEET } from '../constants.js';
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

/**
 * A reachable cell together with the opportunity attacks the safest route to it
 * provokes. `costFeet` and `from` describe that safest route, not the shortest.
 */
export interface SafeReachable extends Reachable {
  readonly provocations: number;
}

/**
 * What a sweep remembers beyond the map it hands out: the origin, and the exact
 * best route to every cell. The map keeps one entry per cell, but the best route
 * to a far cell can pass through a nearer cell by a way that is not that cell's
 * own best (a longer, safer way to the nearer cell can bust the budget further
 * on). `safePathTo` reads this only when the entries alone cannot rebuild the
 * route, which is rare.
 */
interface SafeSweep {
  readonly origin: Point;
  readonly routes: ReadonlyMap<string, readonly Point[]>;
}

const safeSweeps = new WeakMap<object, SafeSweep>();

/**
 * Every cell a unit can reach on the budget it has left, like `reachableCells`,
 * but each reached by the route that provokes the fewest opportunity attacks,
 * and among those the one that costs the fewest feet (2H.10: a route that
 * needlessly walks out of an enemy's reach is a bad route). The set of cells is
 * exactly `reachableCells`' at the same budget: a safe route always respects the
 * feet budget, so safety never shrinks what can be reached.
 *
 * A provocation is priced per step with `opportunityAttackers`, the mover being
 * the unit standing on the cell the step leaves, so a hypothetical `from` is
 * read correctly. It is a sum over steps, not a count of distinct enemies: the
 * same enemy provoked twice is two swings, as `reduce` resolves it.
 *
 * Because the budget caps feet and not provocations, the safest way to a cell
 * is not always a prefix of the safest way to the cells beyond it. So the sweep
 * runs over (cell, feet spent) states, which keeps both, and picks the best
 * state of each cell at the end. A bucket queue on feet orders it, as in
 * `reachableCells`.
 */
export function safeReachableCells(
  arena: Arena,
  state: MatchState,
  unit: Unit,
  budgetFeet: number,
  from: Point = { x: unit.x, y: unit.y },
): Map<string, SafeReachable> {
  const start: Point = { x: from.x, y: from.y };
  const cells = ARENA_WIDTH * ARENA_HEIGHT;
  const levels = Math.floor(budgetFeet / CELL_FEET) + 1;

  // Cells that cannot be entered, as a mask: solid, occupied or barred.
  const closed = closedMask(arena, state, unit);
  const watchers = reactionWatchers(state, unit);

  // One node per (cell, feet spent): fewest provocations kept, parent on that way.
  const nodeCell: number[] = [start.y * ARENA_WIDTH + start.x];
  const nodeFeet: number[] = [0];
  const nodeProv: number[] = [0];
  const nodeParent: number[] = [-1];
  const nodeAt = new Int32Array(cells * levels).fill(-1);
  nodeAt[nodeCell[0]! * levels] = 0;
  const buckets: number[][] = [[0]];

  for (let b = 0; b < buckets.length; b++) {
    const bucket = buckets[b];
    if (!bucket) continue;
    for (let i = 0; i < bucket.length; i++) {
      const index = bucket[i]!;
      const ci = nodeCell[index]!;
      const cx = ci % ARENA_WIDTH;
      const cy = (ci - cx) / ARENA_WIDTH;
      const feet = nodeFeet[index]!;
      const prov = nodeProv[index]!;
      const costFeet = feet + CELL_FEET;
      if (costFeet > budgetFeet) continue;
      const level = costFeet / CELL_FEET;

      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        if (nx < 0 || nx >= ARENA_WIDTH) continue;
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const ny = cy + dy;
          if (ny < 0 || ny >= ARENA_HEIGHT) continue;
          const ni = ny * ARENA_WIDTH + nx;
          if (closed[ni]) continue;

          const provocations = prov + stepProvocations(watchers, cx, cy, nx, ny);
          const slot = ni * levels + level;
          const known = nodeAt[slot]!;
          if (known >= 0) {
            // Same cell at the same feet: keep the fewer provocations. The node
            // sits in a bucket not yet drained, so editing it in place is safe.
            if (provocations < nodeProv[known]!) {
              nodeProv[known] = provocations;
              nodeParent[known] = index;
            }
            continue;
          }
          const created = nodeCell.length;
          nodeAt[slot] = created;
          nodeCell.push(ni);
          nodeFeet.push(costFeet);
          nodeProv.push(provocations);
          nodeParent.push(index);
          (buckets[level] ??= []).push(created);
        }
      }
    }
  }

  // The best node of each cell: fewest provocations, then fewest feet. Nodes
  // were created in increasing feet, so the first of a tie is the cheaper one.
  const bestNode = new Int32Array(cells).fill(-1);
  const startIndex = nodeCell[0]!;
  for (let index = 1; index < nodeCell.length; index++) {
    const ci = nodeCell[index]!;
    if (ci === startIndex) continue;
    const held = bestNode[ci]!;
    if (held < 0 || nodeProv[index]! < nodeProv[held]!) bestNode[ci] = index;
  }

  const routes = new Map<string, readonly Point[]>();
  const result = new Map<string, SafeReachable>();
  const pointOf = (ci: number): Point => ({ x: ci % ARENA_WIDTH, y: Math.floor(ci / ARENA_WIDTH) });
  for (let ci = 0; ci < cells; ci++) {
    const index = bestNode[ci]!;
    if (index < 0) continue;
    const cell = pointOf(ci);
    const k = key(cell);
    result.set(k, {
      cell,
      costFeet: nodeFeet[index]!,
      from: pointOf(nodeCell[nodeParent[index]!]!),
      provocations: nodeProv[index]!,
    });
    const route: Point[] = [];
    for (let n = index; n > 0; n = nodeParent[n]!) route.push(pointOf(nodeCell[n]!));
    routes.set(k, route.reverse());
  }

  safeSweeps.set(result, { origin: start, routes });
  return result;
}

/** `closedCells` plus the solid cells, as a mask over the grid. */
function closedMask(arena: Arena, state: MatchState, unit: Unit): Uint8Array {
  const mask = new Uint8Array(ARENA_WIDTH * ARENA_HEIGHT);
  for (const k of closedCells(arena, state, unit)) {
    const comma = k.indexOf(',');
    const x = Number(k.slice(0, comma));
    const y = Number(k.slice(comma + 1));
    mask[y * ARENA_WIDTH + x] = 1;
  }
  for (let y = 0; y < ARENA_HEIGHT; y++) {
    for (let x = 0; x < ARENA_WIDTH; x++) {
      if (arena.isSolid({ x, y })) mask[y * ARENA_WIDTH + x] = 1;
    }
  }
  return mask;
}

/** The opponents whose Reaction is still up, the ones a step can provoke. */
function reactionWatchers(state: MatchState, mover: Unit): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const u of activeUnits(state)) {
    if (u.team !== mover.team && u.reactionAvailable) out.push({ x: u.x, y: u.y });
  }
  return out;
}

/**
 * How many watchers a step from (ax, ay) to (bx, by) walks out of the reach
 * of: `opportunityAttackers` as a count, on coordinates, for the sweep's inner
 * loop.
 */
function stepProvocations(
  watchers: readonly { x: number; y: number }[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  let n = 0;
  for (const w of watchers) {
    if (Math.max(Math.abs(w.x - ax), Math.abs(w.y - ay)) !== 1) continue;
    if (Math.max(Math.abs(w.x - bx), Math.abs(w.y - by)) > 1) n++;
  }
  return n;
}

/**
 * The safest route to a cell `safeReachableCells` reached, origin excluded,
 * ready to be sent as a `move` action. Same idea as `pathTo`: rebuilt from the
 * destination back, preferring at each step the neighbour nearest the straight
 * line from origin to destination. A neighbour is only taken when it is
 * consistent on both costs, in feet and in provocations, so the route keeps the
 * promise the destination's entry made.
 *
 * `state` and `unit` price the provocations again; `unit` is read for its team.
 */
export function safePathTo(
  state: MatchState,
  unit: Unit,
  reach: ReadonlyMap<string, SafeReachable>,
  destination: Point,
): Point[] | null {
  const end = reach.get(key(destination));
  if (!end) return null;

  const sweep = safeSweeps.get(reach);

  // Walk the stored parents, with a cap in case a hand-made map loops. Only
  // used for a map the sweep did not build.
  const walkParents = (): { origin: Point; route: Point[] } => {
    const walked: Point[] = [end.cell];
    let entry: SafeReachable = end;
    let origin: Point = end.cell;
    for (let guard = 0; guard < reach.size && entry.from; guard++) {
      origin = entry.from;
      const parent = reach.get(key(entry.from));
      if (!parent) break;
      walked.unshift(parent.cell);
      entry = parent;
    }
    return { origin, route: walked };
  };

  const origin = sweep?.origin ?? walkParents().origin;
  const stored = (): Point[] => {
    const exact = sweep?.routes.get(key(destination));
    return exact ? exact.map((p) => ({ x: p.x, y: p.y })) : walkParents().route;
  };

  const dx = destination.x - origin.x;
  const dy = destination.y - origin.y;
  const deviation = (p: Point): number =>
    Math.abs((p.x - origin.x) * dy - (p.y - origin.y) * dx);
  const watchers = reactionWatchers(state, unit);

  const route: Point[] = [end.cell];
  let current = end;
  while (current.from && !(current.from.x === origin.x && current.from.y === origin.y)) {
    let best: SafeReachable | null = null;
    let bestDeviation = Infinity;
    for (const n of neighbourCells(current.cell)) {
      const candidate = reach.get(key(n));
      if (!candidate) continue;
      if (candidate.costFeet !== current.costFeet - stepCostFeet(candidate.cell, current.cell)) {
        continue;
      }
      const price = stepProvocations(watchers, candidate.cell.x, candidate.cell.y, current.cell.x, current.cell.y);
      if (candidate.provocations + price !== current.provocations) continue;
      const d = deviation(candidate.cell);
      if (d < bestDeviation) {
        best = candidate;
        bestDeviation = d;
      }
    }
    // The safest route to a far cell may pass through a near cell by a way
    // that is not the near cell's own best, and then no entry is consistent.
    // The sweep kept the exact route for that case.
    if (!best) return stored();
    current = best;
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
