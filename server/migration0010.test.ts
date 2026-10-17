/**
 * Migration 0010 writes a step of a match in one transaction (audit line A10,
 * 2H.31). The SQL is not run here, there is no Postgres in the test suite; what
 * is held is the contract `resolve-action` and `server/persist.ts` rely on:
 * the function's name and parameters, the lock, the refusal on a moved seq,
 * the three writes, every column `matchColumns` produces, and the grants that
 * keep it out of a client's reach.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../supabase/migrations/0010_append_match_step.sql', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

const COLUMNS = ['phase', 'round', 'score_a', 'score_b', 'turn_deadline', 'winner', 'is_draw', 'finished_at', 'orders'];

describe('migration 0010, one transaction per step', () => {
  it('defines append_match_step with the five parameters the function sends', () => {
    expect(migration).toMatch(/create or replace function append_match_step\(/);
    for (const param of ['p_match uuid', 'p_expected_seq integer', 'p_events jsonb', 'p_snapshot jsonb', 'p_columns jsonb']) {
      expect(migration).toContain(param);
    }
    expect(migration).toContain('returns integer');
  });

  it('locks the match_state row and refuses a seq that moved', () => {
    expect(migration).toMatch(/from match_state where match_id = p_match for update/);
    expect(migration).toMatch(/if current_seq <> p_expected_seq then/);
    expect(migration).toContain("'the board moved on: expected seq %, found %'");
  });

  it('writes the events, the snapshot and the match row', () => {
    expect(migration).toContain('insert into match_events (match_id, seq, kind, payload)');
    expect(migration).toContain('p_expected_seq + e.ordinality');
    expect(migration).toMatch(/update match_state\s+set seq = new_seq,\s+snapshot = p_snapshot/);
    for (const column of COLUMNS) {
      expect(migration).toMatch(new RegExp(`\\n\\s+${column} = `));
    }
  });

  it('is held by the service role only', () => {
    const signature = 'append_match_step(uuid, integer, jsonb, jsonb, jsonb)';
    expect(migration).toContain(`revoke all on function ${signature} from public;`);
    expect(migration).toContain(`revoke all on function ${signature} from anon;`);
    expect(migration).toContain(`revoke all on function ${signature} from authenticated;`);
    expect(migration).toContain(`grant execute on function ${signature} to service_role;`);
    expect(migration).toContain('security definer');
  });

  it('does not touch the engine version, which did not move', () => {
    expect(migration).not.toContain('engine_version');
  });
});
