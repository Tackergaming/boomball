/**
 * Migration 0005 rewrote the `kill-silo` arena row for the horizontal pitch
 * (decision D11). Since 2026-10-10 (2H.5) migration 0006 superseded the row, so
 * 0005 is kept as history: this checks it still says what it said when it was
 * applied (the old kick-off line, y4 and y40), and no longer that it equals the
 * seed. The live row is held equal to the engine in `migration0006.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { KILL_SILO } from '../engine/arenas/kill-silo.js';

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
  new URL('../supabase/migrations/0005_horizontal.sql', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

describe('migration 0005, the horizontal arena row', () => {
  // From 2026-10-10 the live row is the one in 0006 and in the seed; 0005 is
  // kept as history, so it still carries the OLD kick-off line.
  it('still carries the old kick-off line, y4 and y40 (history, superseded by 0006)', () => {
    const startsLine = arenasBlock(migration)
      .split('\n')
      .find((l) => l.includes('"A":[{"x":7,"y":1}'));
    expect(startsLine).toBeDefined();
    expect(startsLine).toContain('"y":4');
    expect(startsLine).toContain('"y":40');
  });

  it('carries every row of terrain literally', () => {
    for (const row of KILL_SILO.rows) expect(migration).toContain(row);
  });

  it('is about the kill-silo arena', () => {
    expect(migration).toContain('kill-silo');
  });

  it('adds the engine version to matches, earlier rows reading as version 1 (A11)', () => {
    expect(migration).toContain('add column if not exists engine_version');
    expect(migration).toContain('default 1');
  });
});
