/**
 * The terrain, and the only terrain data the engine ever reads.
 *
 * An arena is authored as ASCII art, one line per row, written **top row
 * first** because that is how you read the picture it is traced from. Two
 * characters, and no more:
 *
 *   `.`  open floor
 *   `#`  obstacle: a crate, a pillar, a Furnace hatch. Solid. A unit cannot
 *        occupy it, a path has to go round it, a struck Cracker or a drifting
 *        Spark bounces off it, and it **cuts the line of sight** (écart 28).
 *
 * That is all there is since D11. The vertical silo had a third character for
 * the chain and the hooks, and a derived notion of which cells "anchored" a
 * unit; both went with the falls. A cell is either floor or it is not.
 */

import { ARENA_HEIGHT, ARENA_WIDTH } from './constants.js';
import { inBounds, type Point } from './geometry.js';

export type Cell = 'open' | 'obstacle';

export type TeamId = 'A' | 'B';

export interface Furnace {
  /** The team that defends this Furnace. Its opponent scores in it. */
  readonly defendedBy: TeamId;
  /** The solid hatch cells. A shot resolves against the region, not one cell. */
  readonly cells: readonly Point[];
}

export interface ArenaSpec {
  readonly id: string;
  readonly name: string;
  /** Top row first, `ARENA_HEIGHT` rows of `ARENA_WIDTH` characters. */
  readonly rows: readonly string[];
  readonly furnaces: readonly Furnace[];
  /** Where the Payload and both Crackers drop at kick-off. */
  readonly ordnanceStart: Point;
  /** Starting cells, in the order the seven starters are assigned. */
  readonly starts: Readonly<Record<TeamId, readonly Point[]>>;
  /** Where a substitute enters, beside its team's own Furnace mouth. */
  readonly substituteEntry: Readonly<Record<TeamId, Point>>;
  /**
   * Pictures the 2D client lays under the grid, keyed by third. Scenery only:
   * never read as terrain. Slated for removal with the 2.5D board (J5).
   */
  readonly art: Readonly<Record<number, string>>;
}

export class Arena {
  readonly spec: ArenaSpec;
  /** Indexed `[y][x]`, with y = 0 at Furnace A's end. */
  private readonly cells: Cell[][];
  private readonly solid: readonly Point[];

  constructor(spec: ArenaSpec) {
    this.spec = spec;
    this.cells = parseRows(spec.rows);

    const solid: Point[] = [];
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === 'obstacle') solid.push({ x, y });
      }),
    );
    this.solid = solid;
  }

  /** Outside the pitch reads as obstacle, which is what the edge is. */
  cellAt(p: Point): Cell {
    if (!inBounds(p)) return 'obstacle';
    return this.cells[p.y]![p.x]!;
  }

  /** Solid terrain, or the edge of the pitch. Nothing occupies it and nothing passes it. */
  isSolid(p: Point): boolean {
    return this.cellAt(p) === 'obstacle';
  }

  /** A unit may stand here, terrain-wise. Occupancy by other units is separate. */
  isOccupiable(p: Point): boolean {
    return inBounds(p) && !this.isSolid(p);
  }

  /**
   * Whether this cell cuts a line of sight drawn across it (écart 34). Today
   * that is every obstacle and nothing else; units never block sight. It is a
   * separate question from `isSolid` so that a terrain that blocks movement
   * without blocking sight, or the reverse, has one method to change.
   */
  blocksSight(p: Point): boolean {
    return this.isSolid(p);
  }

  /** Every obstacle cell inside the pitch, for the sight and pathing rules. */
  obstacles(): readonly Point[] {
    return this.solid;
  }

  furnaceOf(team: TeamId): Furnace {
    const furnace = this.spec.furnaces.find((f) => f.defendedBy === team);
    if (!furnace) throw new Error(`no Furnace defended by team ${team}`);
    return furnace;
  }

  /** The Furnace a team shoots at, which is the one it does not defend. */
  targetFurnaceOf(team: TeamId): Furnace {
    return this.furnaceOf(team === 'A' ? 'B' : 'A');
  }

  /** Every occupiable cell, for spawn searches and AI position scoring. */
  *occupiableCells(): Generator<Point> {
    for (let y = 0; y < ARENA_HEIGHT; y++) {
      for (let x = 0; x < ARENA_WIDTH; x++) {
        const p = { x, y };
        if (this.isOccupiable(p)) yield p;
      }
    }
  }
}

function parseRows(rows: readonly string[]): Cell[][] {
  if (rows.length !== ARENA_HEIGHT) {
    throw new Error(`arena needs ${ARENA_HEIGHT} rows, got ${rows.length}`);
  }

  // Authored top row first, stored with y = 0 at Furnace A's end.
  const grid: Cell[][] = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (row.length !== ARENA_WIDTH) {
      throw new Error(
        `arena row "${row}" is ${row.length} wide, expected ${ARENA_WIDTH} (top-first index ${i})`,
      );
    }
    grid.push([...row].map(parseCell));
  }
  return grid;
}

function parseCell(char: string): Cell {
  switch (char) {
    case '.':
      return 'open';
    case '#':
      return 'obstacle';
    default:
      throw new Error(`unknown arena character "${char}", expected one of . #`);
  }
}
