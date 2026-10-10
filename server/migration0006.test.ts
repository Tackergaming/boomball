/**
 * Migration 0006 moves the six field players' kick-off cells of the `kill-silo`
 * arena row to y14 (team A) and y30 (team B), sub-phase 2H.5. The row is a
 * mirror of the engine, so this holds the block in the migration character for
 * character against the one `buildSeedSql()` generates from
 * `engine/arenas/kill-silo.ts`.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { buildSeedSql } from './seed.js';

const START = 'insert into arenas (';
const END = '  art = excluded.art;';

/** From the `insert into arenas (` line to `  art = excluded.art;`, inclusive. */
function arenasBlock(sql: string): string {
  const lines = sql.split('\n');
  const from = lines.findIndex((l) => l.startsWith(START));
  const to = lines.findIndex((l, i) => i >= from && l === END);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return lines.slice(from, to + 1).join('\n');
}

const migration = readFileSync(
  new URL('../supabase/migrations/0006_kickoff_line.sql', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

describe('migration 0006, the kick-off line', () => {
  it('carries the same arenas block as the seed generated from the engine', () => {
    expect(arenasBlock(migration)).toBe(arenasBlock(buildSeedSql()));
  });

  it('carries every row of terrain literally', () => {
    for (const row of KILL_SILO.rows) expect(migration).toContain(row);
  });

  it('is about the kill-silo arena', () => {
    expect(migration).toContain('kill-silo');
  });

  it('puts team A on y14 and team B on y30, the Bulwarks unmoved', () => {
    const startsLine = arenasBlock(migration)
      .split('\n')
      .find((l) => l.includes('"A":[{"x":7,"y":1}'));
    expect(startsLine).toBeDefined();
    expect(startsLine).toContain('"y":14');
    expect(startsLine).toContain('"y":30');
    expect(startsLine).not.toContain('"y":4}');
    expect(startsLine).not.toContain('"y":40}');
    expect(startsLine).toContain('{"x":7,"y":1}');
    expect(startsLine).toContain('{"x":7,"y":43}');
  });

  it('does not touch the engine version, which did not move', () => {
    expect(migration).not.toContain('engine_version');
  });
});
