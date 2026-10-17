-- The team's words and the owner listed once (2H.34).
--
-- Jérôme's first coop evening, 2026-10-17: "enlève le mot Battery et dis
-- partout Team". The client says team everywhere since 2H.34; three messages
-- players can read come from here and said battery, so the three functions of
-- 0011 are replaced with the same bodies and the new words. Nothing else in
-- their contracts moves: same signatures, same bounds on `auth.uid()`, same
-- grants (restated, so this file reads whole).
--
-- One known defect of 0011 is fixed on the way: `battery_members` listed the
-- owner twice as soon as the lobby had saved their seat on their own
-- `team_members` row, and the client merged the two lines (`mergeRoll`). The
-- owner now comes once, first, carrying the role and name of their own row
-- when it exists, and the second select skips the owner's row. The function
-- keeps its name: it is an internal door, no player reads it.

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
    raise exception 'no team has this code' using errcode = 'P0002';
  end if;
  if t_owner = auth.uid() then
    raise exception 'this is your own team' using errcode = 'P0001';
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
    raise exception 'only the owner of the team can renew its code' using errcode = '42501';
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
  select p.id, p.display_name, m.preferred_role, m.character_name, true
    from teams t
    join profiles p on p.id = t.owner
    left join team_members m on m.team_id = t.id and m.profile_id = t.owner
    where t.id = team and is_team_member(team)
  union all
  select p.id, p.display_name, m.preferred_role, m.character_name, false
    from team_members m
    join teams t on t.id = m.team_id
    join profiles p on p.id = m.profile_id
    where m.team_id = team and m.profile_id <> t.owner and is_team_member(team)
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
