-- Who sits on a team is decided by the team (security review of 2026-10-17,
-- `docs/10-revue-securite-2026-10-17.md`, findings M1 and m1; 2H.37).
--
-- M1. `team_members_write` of 0001 was one `for all` policy that accepted any
-- row whose `profile_id` is the caller, without ever looking at `team_id`. So
-- any signed-in player who knew a team's UUID could insert themselves into it
-- with a single REST call, and a member removed by the owner came back the
-- same way; a member could also move their own row to another team by
-- updating `team_id`. Nothing forced the door `join_team` was built to be.
--
-- Three policies replace it, one per verb:
--
--   * insert: the owner, for their own row only. A friend enters through
--     `join_team` (security definer, checks the code) and no other way.
--   * update: one's own row. The keys are pinned by a trigger, see below.
--   * delete: one's own row, or any row of one's team for the owner. This is
--     the one verb that does not change: leaving and removing stay as 0011
--     wrote them.
--
-- Why a trigger and not column privileges to pin `team_id`: the lobby saves a
-- seat with an upsert (`saveSeatPreference`), and supabase-js generates
-- `on conflict do update set` over every column it was sent, keys included.
-- Postgres checks the privilege on an assigned column even when the value
-- does not move, so `grant update (preferred_role, character_name)` would
-- have refused every seat save. The trigger only refuses a key that actually
-- changes, and the upsert passes untouched. Decided by Jérôme on 2026-10-18
-- (option A).
--
-- m1. `teams_update_owner` let the owner write `wins`, hence their own Tier,
-- and `teams_insert_own` let them supply `wins`, `roster` and `invite_code`
-- at creation; `0003_record_win.sql` meant `wins` to be written by the
-- server alone. Column privileges do that here, and they do not bite: the
-- client inserts `owner` and `name` only (`TeamHub.tsx`) and never updates
-- `teams` directly (the code is renewed by `rotate_invite_code`, the roster
-- is written by `create-match` with the service role, wins by
-- `record_team_win`). The table privilege has to go before the column grant
-- means anything: in Postgres a column grant adds to the table grant, it
-- never narrows it.
--
-- `rls-check.py` proves all of it live: bob cannot seat himself on alice's
-- team, the owner cannot press-gang a player, bob cannot move his row, the
-- lobby's upsert still passes, alice cannot bump her wins.
--
-- Applied on 2026-10-18 and found 37/38: the insert policy below was too
-- narrow for the lobby's upsert, because Postgres evaluates the INSERT
-- `with check` on the proposed row before looking for the conflict. 0014
-- replaces `team_members_insert_owner` with `team_members_insert_self`; the
-- rest of this file stands.

-- -- M1: team_members -----------------------------------------------------------

drop policy team_members_write on team_members;

create policy team_members_insert_owner on team_members
  for insert
  with check (
    profile_id = auth.uid()
    and exists (select 1 from teams t where t.id = team_id and t.owner = auth.uid())
  );

create policy team_members_update_self on team_members
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy team_members_delete on team_members
  for delete
  using (
    profile_id = auth.uid()
    or exists (select 1 from teams t where t.id = team_id and t.owner = auth.uid())
  );

-- A membership is never moved: not to another team, not to another player.
create or replace function public.pin_team_member_keys()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.team_id is distinct from old.team_id
     or new.profile_id is distinct from old.profile_id then
    raise exception 'a membership cannot be moved to another team or player'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger team_members_pin_keys
  before update on team_members
  for each row execute function public.pin_team_member_keys();

-- -- m1: teams --------------------------------------------------------------------

revoke insert, update on table teams from authenticated;
grant insert (owner, name) on table teams to authenticated;
grant update (name) on table teams to authenticated;
