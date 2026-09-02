-- Boomball, initial schema.
--
-- The shape is fixed by docs/02-architecture.md. Two things in it carry the
-- weight and are worth reading before changing anything:
--
--   * `match_events` is the source of truth, not a log. A match is replayable
--     from it, a disconnected client catches up from it, and the balance sweeps
--     read it. `match_state` is only a cache and may be dropped and rebuilt.
--   * Row Level Security is on from the first migration. Retrofitting it costs
--     more than writing it now, every time.
--
-- Naming: snake_case in the database, camelCase in TypeScript. The snapshot and
-- the event payloads are the engine's own JSON and are stored verbatim, so they
-- keep their camelCase inside the jsonb. That boundary is deliberate: nothing
-- rewrites the engine's shapes on the way in or out.

-- -- Enumerations ------------------------------------------------------------
-- Mirrors of engine/stats.ts and engine/types.ts. They are enumerations rather
-- than free text so a typo in a client is a write that fails rather than a row
-- nobody can interpret.

create type boomball_role as enum ('striker', 'breaker', 'bulwark', 'trajector');
create type boomball_tier as enum ('rookie', 'veteran', 'star');
create type boomball_team as enum ('A', 'B');
create type boomball_match_phase as enum ('playing', 'suddenDeath', 'finished');

-- -- People and teams --------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

-- Wins are the only thing written. The Tier is derived from them and can never
-- be set by hand, which is the locked product decision stated as a constraint
-- rather than as a convention somebody has to remember.
create table teams (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  wins integer not null default 0 check (wins >= 0),
  tier boomball_tier not null generated always as (
    case
      when wins >= 6 then 'star'::boomball_tier
      when wins >= 3 then 'veteran'::boomball_tier
      else 'rookie'::boomball_tier
    end
  ) stored,
  created_at timestamptz not null default now()
);

create index teams_owner_idx on teams (owner);

-- The character name a player typed at the lobby lives here, so it survives
-- between matches instead of being retyped every time.
create table team_members (
  team_id uuid not null references teams (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  preferred_role boomball_role not null,
  character_name text check (length(trim(character_name)) between 1 and 40),
  primary key (team_id, profile_id)
);

-- -- Reference data ----------------------------------------------------------

-- `layout` is the engine's own ASCII terrain, top row first. The images are
-- finished art; the playable terrain is this column and never the picture.
create table arenas (
  id text primary key,
  name text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  layout text[] not null,
  furnaces jsonb not null,
  ordnance_start jsonb not null,
  starts jsonb not null,
  substitute_entry jsonb not null,
  art jsonb not null default '{}'::jsonb,
  constraint arenas_layout_height check (array_length(layout, 1) = height)
);

-- A mirror of engine/stats.ts so the interface can show a stat line without
-- importing the engine. `server/seed.test.ts` fails if the two ever disagree.
create table role_stats (
  role boomball_role not null,
  tier boomball_tier not null,
  hp integer not null,
  ac integer not null,
  might integer not null,
  aim integer not null,
  agility integer not null,
  primary key (role, tier)
);

-- -- Matches -----------------------------------------------------------------

create table matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  arena_id text not null references arenas (id),
  tier boomball_tier not null,
  phase boomball_match_phase not null default 'playing',
  round integer not null default 1 check (round >= 1),
  score_a integer not null default 0,
  score_b integer not null default 0,
  rng_seed bigint not null,
  -- Null whenever no human is on the clock. The engine has no clock, so this
  -- is the server's column and not a mirror of anything in MatchState.
  turn_deadline timestamptz,
  winner boomball_team,
  is_draw boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint matches_winner_only_when_finished
    check (phase = 'finished' or (winner is null and is_draw = false))
);

create index matches_team_idx on matches (team_id, created_at desc);

-- Who controls what. A unit with no row here is played by the AI.
create table match_participants (
  match_id uuid not null references matches (id) on delete cascade,
  unit_id text not null,
  profile_id uuid not null references profiles (id) on delete cascade,
  role boomball_role not null,
  character_name text not null,
  primary key (match_id, unit_id),
  -- One seat each: a player never drives two shirts in the same match.
  unique (match_id, profile_id)
);

create index match_participants_profile_idx on match_participants (profile_id);

-- The source of truth. `seq` is strictly increasing per match, which is what
-- lets a client say "I am at 47, send me the rest" after a dropped connection
-- instead of reloading the whole match.
create table match_events (
  match_id uuid not null references matches (id) on delete cascade,
  seq integer not null check (seq >= 0),
  kind text not null,
  -- The engine's MatchEvent, verbatim. Kept whole rather than shredded into
  -- columns: the engine owns this shape and the database must not fight it.
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, seq)
);

create index match_events_kind_idx on match_events (match_id, kind);

-- A cache, reconstructible by replaying events from the start. `seq` says which
-- event this snapshot includes up to, so a client can tell whether it is behind.
create table match_state (
  match_id uuid primary key references matches (id) on delete cascade,
  seq integer not null check (seq >= 0),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

-- -- Row Level Security -------------------------------------------------------
-- The rule in one line: you see your own profile, the teams you belong to, and
-- the matches those teams played. Everything about a match is read through
-- membership of its team, never through the match row alone.

alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table arenas enable row level security;
alter table role_stats enable row level security;
alter table matches enable row level security;
alter table match_participants enable row level security;
alter table match_events enable row level security;
alter table match_state enable row level security;

-- Membership, as a function, so the policies below read as sentences and the
-- recursion between `teams` and `team_members` has exactly one place to live.
-- SECURITY DEFINER because a member must be able to see a team through this
-- check without already having a policy that lets them read the row.
create or replace function is_team_member(team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members m
    where m.team_id = team and m.profile_id = auth.uid()
  ) or exists (
    select 1 from teams t
    where t.id = team and t.owner = auth.uid()
  );
$$;

create policy profiles_read_self on profiles
  for select using (id = auth.uid());
create policy profiles_write_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy teams_read_member on teams
  for select using (is_team_member(id));
create policy teams_insert_own on teams
  for insert with check (owner = auth.uid());
create policy teams_update_owner on teams
  for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy teams_delete_owner on teams
  for delete using (owner = auth.uid());

create policy team_members_read on team_members
  for select using (is_team_member(team_id));
-- A player edits their own row; the owner manages the roster.
create policy team_members_write on team_members
  for all
  using (profile_id = auth.uid() or exists (
    select 1 from teams t where t.id = team_id and t.owner = auth.uid()
  ))
  with check (profile_id = auth.uid() or exists (
    select 1 from teams t where t.id = team_id and t.owner = auth.uid()
  ));

-- Reference data is readable by anyone signed in and written only by the
-- service role, which every policy below implicitly allows by not matching.
create policy arenas_read on arenas for select using (auth.uid() is not null);
create policy role_stats_read on role_stats for select using (auth.uid() is not null);

create policy matches_read on matches
  for select using (is_team_member(team_id));
create policy match_participants_read on match_participants
  for select using (exists (
    select 1 from matches m where m.id = match_id and is_team_member(m.team_id)
  ));
create policy match_events_read on match_events
  for select using (exists (
    select 1 from matches m where m.id = match_id and is_team_member(m.team_id)
  ));
create policy match_state_read on match_state
  for select using (exists (
    select 1 from matches m where m.id = match_id and is_team_member(m.team_id)
  ));

-- No write policy on matches, match_participants, match_events or match_state.
-- That is the design, not an omission: **every write to a live match goes
-- through the `resolve-action` Edge Function**, which holds the service role
-- key and bypasses RLS. A client that could append an event directly could
-- write a goal, and the one door that exists in the engine would have been
-- given a second one in the database.
