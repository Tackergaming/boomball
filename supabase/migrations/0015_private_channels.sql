-- Private Realtime channels (security review of 2026-10-17, M3 and m4; 2H.37).
--
-- Three families of topics: `lobby:<team uuid>`, `team:<team uuid>` and
-- `match:<match uuid>`. Until now all three were public: anyone with the UUID
-- could listen, and worse, write. A forged `abandoned` on `match:*` threw every
-- player out of a running match; a forged `events` batch with the right
-- `fromSeq` replayed invented goals on everybody's board and stole that
-- sequence number from the real batch; a forged presence on `lobby:*` blocked
-- the owner from starting. UUIDs are shown nowhere public, so the reach was
-- members and former members; with 0013 and 0014 a former member no longer
-- gets back in, and this file closes the channels to them too.
--
-- The rules, as policies on `realtime.messages`:
--
--   * **Hearing** (broadcast and presence): the members of the team, which
--     `is_team_member` already defines (owner included). A match channel is
--     heard by the members of the team that plays it.
--   * **Writing from a client**: the lobby only, because presence needs the
--     client to speak and the owner's lobby tells the others the match opened.
--     `team:*` and `match:*` are written by the database (`realtime.send`,
--     below) and by the two Edge Functions (service role, outside RLS). The
--     client code that used to write on them is removed in the same lot.
--
-- Realtime evaluates these policies as the signed-in user, with `auth.uid()`
-- set from the token the client hands the socket, which supabase-js does on
-- every auth change. The Edge Functions send over REST with the service key,
-- which bypasses RLS: no policy is needed for them.
--
-- `realtime.send(payload jsonb, event text, topic text, private boolean)` was
-- checked present on the project on 2026-10-18 before this was written.

-- -- Who hears what -------------------------------------------------------------

create or replace function public.channel_uuid(topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(topic, ':', 2)::uuid
  end;
$$;

create or replace function public.can_hear_channel(topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case split_part(topic, ':', 1)
      when 'lobby' then is_team_member(channel_uuid(topic))
      when 'team'  then is_team_member(channel_uuid(topic))
      when 'match' then exists (
        select 1 from matches m
        where m.id = channel_uuid(topic) and is_team_member(m.team_id)
      )
      else false
    end,
    false
  );
$$;

revoke all on function public.channel_uuid(text) from public, anon;
grant execute on function public.channel_uuid(text) to authenticated, service_role;
revoke all on function public.can_hear_channel(text) from public, anon;
grant execute on function public.can_hear_channel(text) to authenticated, service_role;

create policy boomball_channels_read on realtime.messages
  for select to authenticated
  using (public.can_hear_channel(realtime.topic()));

create policy boomball_lobby_write on realtime.messages
  for insert to authenticated
  with check (
    split_part(realtime.topic(), ':', 1) = 'lobby'
    and realtime.messages.extension in ('presence', 'broadcast')
    and public.can_hear_channel(realtime.topic())
  );

-- -- The roll changed: the database says so --------------------------------------
--
-- Replaces `announceTeamChange` of the client (2H.34), which cannot work on a
-- private channel for the two writers who are not members at the moment they
-- would speak: the joiner, not yet on the team's channel, and the member who
-- just left. A trigger after the write speaks for all four writers (joining,
-- leaving, removing, renewing the code), and the hubs re-read as before.

create or replace function public.announce_team_roll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t uuid;
begin
  if tg_table_name = 'teams' then
    t := new.id;
  elsif tg_op = 'DELETE' then
    t := old.team_id;
  else
    t := new.team_id;
  end if;
  perform realtime.send(jsonb_build_object('teamId', t), 'roll', 'team:' || t::text, true);
  return null;
end;
$$;

create trigger team_members_roll
  after insert or update or delete on team_members
  for each row execute function public.announce_team_roll();

create trigger teams_code_roll
  after update of invite_code on teams
  for each row execute function public.announce_team_roll();

-- -- The abandon is told by the database -------------------------------------------
--
-- Same body as 0008, the word team instead of battery (2H.34), and one line
-- before the return: the match channel hears `abandoned` from here, not from
-- the owner's client, which no longer writes on `match:*`.

create or replace function abandon_match(match uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  current_phase boomball_match_phase;
  already timestamptz;
  stamp timestamptz;
begin
  select t.owner, m.phase, m.abandoned_at
    into owner_id, current_phase, already
    from matches m
    join teams t on t.id = m.team_id
    where m.id = match;

  if owner_id is null then
    raise exception 'no such match' using errcode = 'P0002';
  end if;
  if owner_id <> auth.uid() then
    raise exception 'only the owner of the team can abandon its match' using errcode = '42501';
  end if;
  if current_phase = 'finished' then
    raise exception 'this match is already finished' using errcode = 'P0001';
  end if;
  if already is not null then
    raise exception 'this match was already abandoned' using errcode = 'P0001';
  end if;

  update matches set abandoned_at = now() where id = match returning abandoned_at into stamp;
  perform realtime.send(jsonb_build_object('matchId', match), 'abandoned', 'match:' || match::text, true);
  return stamp;
end;
$$;

revoke all on function abandon_match(uuid) from public;
revoke all on function abandon_match(uuid) from anon;
grant execute on function abandon_match(uuid) to authenticated;
grant execute on function abandon_match(uuid) to service_role;
