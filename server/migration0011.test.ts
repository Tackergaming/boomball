/**
 * Migration 0011 lets a friend join a battery (2H.32, `00` C32). No Postgres in
 * the suite; what is held is the contract the client relies on: the column and
 * its default, the three functions and their bounds, and the grants that open
 * them to a signed-in player and to nobody else.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../supabase/migrations/0011_invites.sql', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

describe('migration 0011, joining a battery', () => {
  it('adds a unique, not null invite code with a default for existing batteries', () => {
    expect(migration).toMatch(/alter table teams\s+add column invite_code text not null unique\s+default/);
    expect(migration).toContain('md5(gen_random_uuid()::text), 1, 8)');
  });

  it('joins by code off auth.uid(), refuses the owner and an unknown code, and is idempotent', () => {
    expect(migration).toMatch(/create or replace function join_team\(code text\)/);
    expect(migration).toContain("replace(upper(trim(code)), '-', '')");
    expect(migration).toContain("'no battery has this code'");
    expect(migration).toContain("'this is your own battery'");
    expect(migration).toContain('on conflict (team_id, profile_id) do nothing');
    expect(migration).not.toMatch(/join_team\([^)]*uuid/);
  });

  it('renews the code for the owner only', () => {
    expect(migration).toMatch(/create or replace function rotate_invite_code\(team uuid\)/);
    expect(migration).toContain("'only the owner of the battery can renew its code'");
  });

  it('lists the members behind a membership check', () => {
    expect(migration).toMatch(/create or replace function battery_members\(team uuid\)/);
    expect(migration.match(/is_team_member\(team\)/g)?.length).toBe(2);
    for (const column of ['profile_id uuid', 'display_name text', 'preferred_role boomball_role', 'character_name text', 'is_owner boolean']) {
      expect(migration).toContain(column);
    }
  });

  it('opens the three functions to authenticated and closes them to anon', () => {
    for (const signature of ['join_team(text)', 'rotate_invite_code(uuid)', 'battery_members(uuid)']) {
      expect(migration).toContain(`revoke all on function ${signature} from anon;`);
      expect(migration).toContain(`grant execute on function ${signature} to authenticated;`);
    }
    // Three function bodies, each on its own `security definer` line; the comment at the top names it once more.
    expect(migration.split('\n').filter((line) => line === 'security definer')).toHaveLength(3);
  });

  it('does not touch the engine version nor the match tables', () => {
    expect(migration).not.toContain('engine_version');
    expect(migration).not.toMatch(/\b(match_events|match_state|match_participants)\b/);
  });
});
