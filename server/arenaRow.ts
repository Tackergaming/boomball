/**
 * The `arenas` row, back into the shape the engine speaks.
 *
 * The database stores the arena in snake_case because that is the database's
 * convention, and the engine reads camelCase because that is TypeScript's. One
 * of the two has to bend at the boundary, and it is this file, so that neither
 * side has to know the other exists.
 *
 * It lived inside `resolve-action` until `create-match` needed the same
 * mapping. Two copies of a boundary is how a boundary drifts, and neither copy
 * was reachable by `tsc` or by a test, which is exactly the property that let
 * the Edge Function sit unrun for a week. Here it is checked and tested.
 *
 * The row is trusted content: `supabase/seed.sql` writes it, generated from the
 * engine by `server/seed.ts`. The validation below is therefore not a defence
 * against an attacker but against a **silent** mismatch, the seed and the
 * engine having drifted apart. A wrong row must say so by name rather than
 * surface later as a unit standing in a wall.
 */

import type { ArenaSpec } from '../engine/arena.js';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../engine/constants.js';

/** The `arenas` row as PostgREST hands it over. */
export interface ArenaRow {
  readonly id: unknown;
  readonly name: unknown;
  readonly layout: unknown;
  readonly furnaces: unknown;
  readonly ordnance_start: unknown;
  readonly starts: unknown;
  readonly substitute_entry: unknown;
  readonly art?: unknown;
}

function text(row: ArenaRow, field: 'id' | 'name'): string {
  const value = row[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`the arena row has no ${field}`);
  }
  return value;
}

function present(value: unknown, field: string): void {
  if (value === null || value === undefined) {
    throw new Error(`the arena row has no ${field}`);
  }
}

/**
 * Throws rather than returning a reason: a malformed arena is not a request
 * that can be refused politely, it is a database that no longer matches the
 * code, and every caller would turn a reason into a 500 anyway.
 */
export function toArenaSpec(row: ArenaRow): ArenaSpec {
  const id = text(row, 'id');
  const name = text(row, 'name');

  const layout = row.layout;
  if (!Array.isArray(layout) || layout.some((line) => typeof line !== 'string')) {
    throw new Error(`arena ${id} has no layout, or one that is not an array of lines`);
  }
  if (layout.length !== ARENA_HEIGHT) {
    throw new Error(`arena ${id} has ${layout.length} rows, the engine wants ${ARENA_HEIGHT}`);
  }
  const wrong = (layout as string[]).findIndex((line) => line.length !== ARENA_WIDTH);
  if (wrong !== -1) {
    throw new Error(
      `arena ${id} row ${wrong} is ${(layout as string[])[wrong]!.length} cells wide, ` +
        `the engine wants ${ARENA_WIDTH}`,
    );
  }

  present(row.furnaces, 'furnaces');
  present(row.ordnance_start, 'ordnance_start');
  present(row.starts, 'starts');
  present(row.substitute_entry, 'substitute_entry');

  return {
    id,
    name,
    rows: layout as readonly string[],
    furnaces: row.furnaces as ArenaSpec['furnaces'],
    ordnanceStart: row.ordnance_start as ArenaSpec['ordnanceStart'],
    starts: row.starts as ArenaSpec['starts'],
    substituteEntry: row.substitute_entry as ArenaSpec['substituteEntry'],
    art: (row.art ?? {}) as ArenaSpec['art'],
  };
}
