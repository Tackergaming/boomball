-- Joining a battery (2H.32, `00` C32 points 1, 7 and 8).
--
-- `team_members` has existed since the first migration and nothing ever wrote
-- to it but the lobby, for the owner's own row. Jérôme wants friends on his
-- battery: a friend gets a code, types it in their hub, and is on the roll.
-- Decided by him on 2026-10-17: a player may own one battery and join others;
-- the code is shown to the owner and renewable; the owner may remove a member
-- and a member may leave; no approval step.
--
-- Three things live here and none of them is a rule of the sport:
--
--   * `teams.invite_code`, eight hexadecimal characters, unique, drawn at the
--     creation of the battery. Existing batteries get one as the column is
--     added: a volatile default is evaluated per row. Readable through
--     `teams_read_member` like every other team column; the hub shows it to
--     the owner only, which is a screen rule and not a policy.
--   * `join_team(code)`: the joiner is not a member yet, so RLS hides the team
--     from them and a plain insert cannot find it. `security definer`, bounded:
--     `auth.uid()` and never an argument, the owner cannot join their own
--     battery, joining twice is a no-op.
--   * `battery_members(team)`: `profiles_read_self` hides every profile but
--     one's own, so a member list needs a door that checks membership first.
--     `rotate_invite_code(team)` renews the code, owner only.
--
-- Leaving and removing need no function: `team_members_write` already lets a
-- player delete their own row and the owner delete any row of their battery.

alter table teams
  add column invite_code text not null unique
  default upper(substr(md5(gen_random_uuid()::text), 1, 8));

comment on column teams.invite_code is
  'Eight hex characters a friend types to join (2H.32). Renewed by rotate_invite_code.';

create or replace function join_team(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text := replace(upper(trim(code)), '-', '');
  t_id uuid;
  t_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select id, owner into t_id, t_owner from teams where invite_code = wanted;
  if t_id is null then
    raise exception 'no battery has this code' using errcode = 'P0002';
  end if;
  if t_owner = auth.uid() then
    raise exception 'this is your own battery' using errcode = 'P0001';
  end if;
  insert into team_members (team_id, profile_id, preferred_role)
    values (t_id, auth.uid(), 'striker')
    on conflict (team_id, profile_id) do nothing;
  return t_id;
end;
$$;

create or replace function rotate_invite_code(team uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  fresh text;
begin
  if not exists (select 1 from teams t where t.id = team and t.owner = auth.uid()) then
    raise exception 'only the owner of the battery can renew its code' using errcode = '42501';
  end if;
  update teams
    set invite_code = upper(substr(md5(gen_random_uuid()::text), 1, 8))
    where id = team
    returning invite_code into fresh;
  return fresh;
end;
$$;

create or replace function battery_members(team uuid)
returns table (
  profile_id uuid,
  display_name text,
  preferred_role boomball_role,
  character_name text,
  is_owner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, null::boomball_role, null::text, true
    from teams t join profiles p on p.id = t.owner
    where t.id = team and is_team_member(team)
  union all
  select p.id, p.display_name, m.preferred_role, m.character_name, false
    from team_members m join profiles p on p.id = m.profile_id
    where m.team_id = team and is_team_member(team)
  order by 5 desc, 2;
$$;

revoke all on function join_team(text) from public;
revoke all on function join_team(text) from anon;
grant execute on function join_team(text) to authenticated;
grant execute on function join_team(text) to service_role;

revoke all on function rotate_invite_code(uuid) from public;
revoke all on function rotate_invite_code(uuid) from anon;
grant execute on function rotate_invite_code(uuid) to authenticated;
grant execute on function rotate_invite_code(uuid) to service_role;

revoke all on function battery_members(uuid) from public;
revoke all on function battery_members(uuid) from anon;
grant execute on function battery_members(uuid) to authenticated;
grant execute on function battery_members(uuid) to service_role;
