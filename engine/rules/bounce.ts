/**
 * The bounce (écart 36b), for a struck Cracker and for the drifting Spark.
 *
 * Something moving on a fixed heading goes one cell at a time. When the next
 * cell is blocked, whether by an obstacle or by the edge of the pitch, it turns
 * and tries again from where it stands. **A bounce costs no step**: the cell it
 * turns away from is not entered and not counted, so a run of n steps is n cells
 * unless the mover is boxed in.
 */

import { d8FromDirection, DIRECTIONS, type Point } from '../geometry.js';

/** Must return true outside the pitch as well as on an obstacle. `arena.isSolid` already does. */
export type Blocked = (p: Point) => boolean;

export interface BounceRun {
  readonly path: Point[];
  readonly heading: Point;
}

/** Turns tried by the written rule in one step, before the fallback takes over. */
const MAX_ATTEMPTS = 4;

/** One step from `at` heading `dir`, bouncing until a free cell is found. Null only when all eight neighbours are blocked. */
export function bounceStep(
  blocked: Blocked,
  at: Point,
  dir: Point,
): { readonly to: Point; readonly dir: Point } | null {
  let heading = dir;
  const tried = new Set<string>();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const to = { x: at.x + heading.x, y: at.y + heading.y };
    if (!blocked(to)) return { to, dir: heading };
    tried.add(`${heading.x},${heading.y}`);

    let next = bounced(blocked, at, heading);
    // In a concave pocket (a wall on one side, a pillar on the other) the
    // component rule hands back a heading already refused, and two diagonals
    // would trade places until the attempts ran out. Turn right round instead.
    if (tried.has(`${next.x},${next.y}`)) next = { x: 0 - heading.x, y: 0 - heading.y };
    heading = next;
  }

  // Engineering addition, not part of écart 36b: it fires only where the
  // written rule would stall, and arbitrage J6 says a Cracker or the Spark never
  // loses its movement to an obstacle. On the Kill-Silo that is two shapes: an
  // edge cell beside a side cover with an orthogonal heading (cover one side,
  // pitch edge the other, and a reversal only ever swaps them), and a cell
  // between a central pillar and a cover that touch at corners with a diagonal
  // heading (the lone-corner reversal sends it straight back into the wall).
  // From the heading it arrived with, turn one d8 face clockwise at a time and
  // take the first free neighbour, continuing on that heading. Null only when
  // all eight neighbours are blocked.
  const arrived = d8FromDirection(dir) - 1;
  for (let turn = 1; turn < DIRECTIONS.length; turn++) {
    const face = DIRECTIONS[(arrived + turn) % DIRECTIONS.length]!;
    const to = { x: at.x + face.x, y: at.y + face.y };
    if (!blocked(to)) return { to, dir: face };
  }
  return null;
}

/**
 * `steps` cells of travel from `from` (origin excluded from the path), bouncing
 * as needed. `heading` is the direction it travels on after the last step.
 */
export function bouncingRun(blocked: Blocked, from: Point, dir: Point, steps: number): BounceRun {
  const path: Point[] = [];
  let at = from;
  let heading = dir;

  for (let i = 0; i < steps; i++) {
    const step = bounceStep(blocked, at, heading);
    if (!step) break;
    path.push(step.to);
    at = step.to;
    heading = step.dir;
  }
  return { path, heading };
}

/**
 * The new heading after running into a blocked target. Orthogonal: straight
 * back. Diagonal: only the component that was actually stopped reverses, read
 * from the two orthogonal neighbours on the way; a lone corner or an inside
 * corner has no single wall, so both reverse.
 */
function bounced(blocked: Blocked, at: Point, dir: Point): Point {
  if (dir.x === 0 || dir.y === 0) return { x: 0 - dir.x, y: 0 - dir.y };

  const xBlocked = blocked({ x: at.x + dir.x, y: at.y });
  const yBlocked = blocked({ x: at.x, y: at.y + dir.y });
  if (xBlocked && !yBlocked) return { x: 0 - dir.x, y: dir.y };
  if (yBlocked && !xBlocked) return { x: dir.x, y: 0 - dir.y };
  return { x: 0 - dir.x, y: 0 - dir.y };
}
