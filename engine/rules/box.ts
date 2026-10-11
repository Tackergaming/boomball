/**
 * The penalty box (écart 53, 2H.8).
 *
 * Decided by Jérôme on 2026-10-11 after his game on engine 4: a goal went in,
 * the side that had just scored settled round the conceding goalkeeper, and
 * the restart died on the spot. So, from the moment a goal is scored, the
 * cells within `PENALTY_BOX_CELLS` of any hatch cell of the mouth that just
 * conceded, in grid range with diagonals, are closed to the **scoring** side
 * for the round of the goal and the whole round after it. Anybody of that
 * side already inside is put out at once, on the nearest free cell outside
 * (`relocated`), and afterwards no step, push or recoil takes one of them in:
 * the box edge stops forced movement exactly as a crate does.
 *
 * The ball, the Spark and the Crackers are not bound by it. The defending
 * side is never bound by its own box. Humans and AI read the same rule, which
 * is why it lives here and in `movement.ts` and nowhere near the interface.
 *
 * The box is keyed by the team that **defends** the mouth: `state.penaltyBox.A`
 * is the last round through which team B is barred from the cells in front of
 * Furnace A, or null when it is open.
 */

import type { Arena, Furnace } from '../arena.js';
import { PENALTY_BOX_CELLS } from '../constants.js';
import { distance, type Point } from '../geometry.js';
import { opposingTeam, type MatchState, type TeamId } from '../types.js';
import { cellKey } from './placement.js';

const boxTables = new WeakMap<Arena, Map<TeamId, readonly Point[]>>();

/**
 * The occupiable cells of the box in front of a mouth: pure terrain, computed
 * once per arena and Furnace. On the accepted layout that is 33 cells, `x` 3
 * to 11 and four rows deep, which hold the keeper's cell and its block range.
 */
export function penaltyBoxCells(arena: Arena, furnace: Furnace): readonly Point[] {
  let table = boxTables.get(arena);
  if (!table) {
    table = new Map();
    boxTables.set(arena, table);
  }
  const known = table.get(furnace.defendedBy);
  if (known) return known;

  const cells: Point[] = [];
  for (const cell of arena.occupiableCells()) {
    if (furnace.cells.some((hatch) => distance(cell, hatch) <= PENALTY_BOX_CELLS)) cells.push(cell);
  }
  table.set(furnace.defendedBy, cells);
  return cells;
}

/** Whether the box in front of `defender`'s mouth is closed this round. */
export function boxClosed(state: MatchState, defender: TeamId): boolean {
  // Read defensively: the client may draw a state written by an earlier
  // engine, before the field existed, while the harness runs against the
  // functions in production with the version pinned back.
  const until = state.penaltyBox?.[defender] ?? null;
  return until !== null && state.round <= until;
}

/**
 * The cells a unit of `team` may not stand on right now: the closed box in
 * front of the opposing mouth, or nothing. Keyed like `occupiedCells`, so a
 * route search adds it to its blocked set and nothing else changes.
 */
export function barredCells(arena: Arena, state: MatchState, team: TeamId): ReadonlySet<string> {
  const defender = opposingTeam(team);
  if (!boxClosed(state, defender)) return EMPTY;
  const out = new Set<string>();
  for (const cell of penaltyBoxCells(arena, arena.furnaceOf(defender))) out.add(cellKey(cell));
  return out;
}

const EMPTY: ReadonlySet<string> = new Set();

/** Whether `cell` is closed to a unit of `team` right now. */
export function isBarred(arena: Arena, state: MatchState, team: TeamId, cell: Point): boolean {
  return barredCells(arena, state, team).has(cellKey(cell));
}
