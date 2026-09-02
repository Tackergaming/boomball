/**
 * The boundary between the `arenas` row and the engine.
 *
 * The claim worth making is the round trip: what the seed writes into the
 * database, read back and mapped, is the arena the engine started from. That is
 * what makes it safe for the Edge Functions to load the arena from Postgres
 * instead of importing `KILL_SILO`, which they cannot do without dragging the
 * whole engine into a place that has no reason to hold it.
 */

import { describe, expect, it } from 'vitest';

import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../engine/constants.js';
import { toArenaSpec, type ArenaRow } from './arenaRow.js';

/** The row the seed produces, in PostgREST's own snake_case shape. */
function rowFor(arena = KILL_SILO): ArenaRow {
  return {
    id: arena.id,
    name: arena.name,
    layout: [...arena.rows],
    furnaces: JSON.parse(JSON.stringify(arena.furnaces)),
    ordnance_start: JSON.parse(JSON.stringify(arena.ordnanceStart)),
    starts: JSON.parse(JSON.stringify(arena.starts)),
    substitute_entry: JSON.parse(JSON.stringify(arena.substituteEntry)),
    art: JSON.parse(JSON.stringify(arena.art)),
  };
}

describe('the arena row', () => {
  it('round-trips the Kill-Silo through the database shape', () => {
    expect(toArenaSpec(rowFor())).toEqual(KILL_SILO);
  });

  it('accepts a row with no art, which the column defaults to', () => {
    const { art: _art, ...withoutArt } = rowFor();
    expect(toArenaSpec(withoutArt).art).toEqual({});
  });
});

describe('a row that no longer matches the engine', () => {
  it('names the missing field', () => {
    expect(() => toArenaSpec({ ...rowFor(), name: null })).toThrow(/no name/);
    expect(() => toArenaSpec({ ...rowFor(), furnaces: null })).toThrow(/no furnaces/);
    expect(() => toArenaSpec({ ...rowFor(), starts: undefined })).toThrow(/no starts/);
  });

  it('refuses a layout that is not lines of text', () => {
    expect(() => toArenaSpec({ ...rowFor(), layout: 'one long string' })).toThrow(/layout/);
    expect(() => toArenaSpec({ ...rowFor(), layout: [1, 2, 3] })).toThrow(/layout/);
  });

  it('counts the rows, and says both numbers', () => {
    const short = rowFor().layout as string[];
    expect(() => toArenaSpec({ ...rowFor(), layout: short.slice(0, 10) })).toThrow(
      new RegExp(`10 rows.*${ARENA_HEIGHT}`),
    );
  });

  it('measures the rows, and says which one is wrong', () => {
    const rows = [...(rowFor().layout as string[])];
    rows[7] = '#'.repeat(ARENA_WIDTH - 1);
    expect(() => toArenaSpec({ ...rowFor(), layout: rows })).toThrow(
      new RegExp(`row 7 is ${ARENA_WIDTH - 1} cells wide`),
    );
  });
});
