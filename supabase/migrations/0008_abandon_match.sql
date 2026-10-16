-- Abandoning a match (2H.28, `00` C29).
--
-- Jérôme wants to be able to leave a match he is in and open another. He chose
-- that an abandoned match has **no result**: no win, no loss, the ladder does
-- not move, the events stay, the match is never resumed.
--
-- It is a column and not a fourth value of `boomball_match_phase` on purpose:
-- `alter type ... add value` cannot be used in the same transaction that adds
-- it, and `apply-migration.mjs` posts a file as one transaction through the
-- management API. A nullable timestamp says the same thing and is usable at
-- once. A match is "live" when `phase <> 'finished' and abandoned_at is null`,
-- which is what `useAccount` and `create-match` now read.
--
-- `abandon_match` is the one write a signed-in client may make on the match
-- tables, and it is bounded inside: the caller must own the battery the match
-- belongs to, read off `auth.uid()` and never off an argument; a finished or
-- already abandoned match is refused. `resolve-action` refuses to act on an
-- abandoned match (409), so an action in flight after the abandon writes nothing.

alter table matches add column abandoned_at timestamptz;

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
    raise exception 'only the owner of the battery can abandon its match' using errcode = '42501';
  end if;
  if current_phase = 'finished' then
    raise exception 'this match is already finished' using errcode = 'P0001';
  end if;
  if already is not null then
    raise exception 'this match was already abandoned' using errcode = 'P0001';
  end if;

  update matches set abandoned_at = now() where id = match returning abandoned_at into stamp;
  return stamp;
end;
$$;

revoke all on function abandon_match(uuid) from public;
revoke all on function abandon_match(uuid) from anon;
grant execute on function abandon_match(uuid) to authenticated;
grant execute on function abandon_match(uuid) to service_role;
