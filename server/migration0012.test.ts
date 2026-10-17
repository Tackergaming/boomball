/**
 * Migration 0012 says team where 0011 said battery, and lists the owner once
 * (2H.34). No Postgres in the suite; what is held is the contract the client
 * relies on: the three functions keep their signatures and bounds, the words a
 * player can read have changed, the owner's row is folded into their line, and
 * the grants still open the doors to a signed-in player and to nobody else.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../supabase/migrations/0012_team_wording.sql', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

describe('migration 0012, the team wording and the owner once', () => {
  it('keeps the three signatures of 0011', () => {
    expect(migration).toMatch(/create or replace function join_team\(code text\)/);
    expect(migration).toMatch(/create or replace function rotate_invite_code\(team uuid\)/);
    expect(migration).toMatch(/create or replace function battery_members\(team uuid\)/);
    expect(migration.split('\n').filter((line) => line === 'security definer')).toHaveLength(3);
  });

  it('says team in every message a player can read, and battery in none', () => {
    expect(migration).toContain("'no team has this code'");
    expect(migration).toContain("'this is your own team'");
    expect(migration).toContain("'only the owner of the team can renew its code'");
    const raised = [...migration.matchAll(/raise exception '([^']*)'/g)].map((m) => m[1]);
    expect(raised).toHaveLength(4);
    for (const message of raised) expect(message).not.toMatch(/batter/i);
  });

  it('keeps the bounds of join_team: auth.uid(), the cleaned code, the owner refused, idempotent', () => {
    expect(migration).toContain("replace(upper(trim(code)), '-', '')");
    expect(migration).toContain('if t_owner = auth.uid() then');
    expect(migration).toContain('on conflict (team_id, profile_id) do nothing');
    expect(migration).not.toMatch(/join_team\([^)]*uuid/);
  });

  it('lists the owner once, with their own row folded in, and skips that row below', () => {
    expect(migration).toMatch(/left join team_members m on m\.team_id = t\.id and m\.profile_id = t\.owner/);
    expect(migration).toContain('where m.team_id = team and m.profile_id <> t.owner and is_team_member(team)');
    expect(migration).toContain('order by 5 desc, 2;');
  });

  it('restates the grants: authenticated and service_role in, anon and public out', () => {
    for (const signature of ['join_team(text)', 'rotate_invite_code(uuid)', 'battery_members(uuid)']) {
      expect(migration).toContain(`revoke all on function ${signature} from public;`);
      expect(migration).toContain(`revoke all on function ${signature} from anon;`);
      expect(migration).toContain(`grant execute on function ${signature} to authenticated;`);
      expect(migration).toContain(`grant execute on function ${signature} to service_role;`);
    }
  });

  it('does not touch the schema, the engine version nor the match tables', () => {
    expect(migration).not.toMatch(/\b(alter table|create table|drop)\b/);
    expect(migration).not.toContain('engine_version');
    expect(migration).not.toMatch(/\b(match_events|match_state|match_participants)\b/);
  });
});
