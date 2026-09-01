/**
 * The terrain, and the only terrain data the engine ever reads.
 *
 * An arena is authored as ASCII art, one line per row, written **top row
 * first** because that is how you read the picture it is traced from. Three
 * characters, and no more:
 *
 *   `.`  open air
 *   `#`  structure: a girder, a catwalk deck, a furnace hatch. Solid. A unit
 *        cannot occupy it, a fall stops against it, and it anchors every cell
 *        it touches.
 *   `|`  rig: a chain or a hanging hook. A unit *can* occupy it and it anchors
 *        both itself and its neighbours. This is what lets the central chain
 *        run the height of the silo without cutting the arena in two.
 *
 * Anchoring is derived, never authored. A cell anchors if it is a rig, if it
 * touches structure or rig on any of its eight sides, or if it lies against the
 * outer boundary, which is the silo's own wall, floor and ceiling.
 */

import { ARENA_HEIGHT, ARENA_WIDTH } from './constants.js';
import { DIRECTIONS, inBounds, type Point } from './geometry.js';

export type Cell = 'open' | 'structure' | 'rig';

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
  /** Where a substitute enters, in Zone 3 beside its team's Furnace. */
  readonly substituteEntry: Readonly<Record<TeamId, Point>>;
  readonly art: Readonly<Record<number, string>>;
}

export class Arena {
  readonly spec: ArenaSpec;
  /** Indexed `[y][x]`, with y = 0 at the floor. */
  private readonly cells: Cell[][];

  constructor(spec: ArenaSpec) {
    this.spec = spec;
    this.cells = parseRows(spec.rows);
  }

  cellAt(p: Point): Cell {
    if (!inBounds(p)) return 'structure';
    return this.cells[p.y]![p.x]!;
  }

  /** Solid terrain. Nothing occupies it and a fall stops against it. */
  isSolid(p: Point): boolean {
    return this.cellAt(p) === 'structure';
  }

  /** A unit may stand here, terrain-wise. Occupancy by other units is separate. */
  isOccupiable(p: Point): boolean {
    return inBounds(p) && !this.isSolid(p);
  }

  /**
   * Whether a unit ending its turn here keeps its grip. Failing this is what
   * makes a unit fall at the start of its next turn.
   */
  isAnchorable(p: Point): boolean {
    if (!this.isOccupiable(p)) return false;
    if (this.cellAt(p) === 'rig') return true;

    // The silo's own wall, floor and ceiling.
    if (p.x === 0 || p.x === ARENA_WIDTH - 1) return true;
    if (p.y === 0 || p.y === ARENA_HEIGHT - 1) return true;

    return DIRECTIONS.some((d) => {
      const n = { x: p.x + d.x, y: p.y + d.y };
      if (!inBounds(n)) return false;
      const cell = this.cellAt(n);
      return cell === 'structure' || cell === 'rig';
    });
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

  // Authored top row first, stored with y = 0 at the floor.
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
      return 'structure';
    case '|':
      return 'rig';
    default:
      throw new Error(`unknown arena character "${char}", expected one of . # |`);
  }
}
