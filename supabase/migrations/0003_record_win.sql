-- Recording a win, which nothing did.
--
-- `teams.wins` existed from the first migration, the Tier is a generated column
-- reading it, the hub draws a ladder from it, and **no code ever wrote it**.
-- So every battery was Rookie for ever and the whole progression the product
-- decisions describe was inert. Jérôme found it the only way it could be found:
-- he won a match and the counter stayed at zero.
--
-- It is a function rather than an update from the Edge Function for one reason:
-- `wins = wins + 1` cannot be expressed through PostgREST, and read-then-write
-- from the function would be a race the day two matches ever finish at once.
--
-- **It is not callable by a client**, which is the whole point of the grants at
-- the bottom. A signed-in player who could call this could award themselves
-- Star in six requests, and the Tier a team plays at is the difficulty the
-- house is fielded at. Only the service role holds it, which is only ever the
-- Edge Function.

create or replace function record_team_win(team uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update teams set wins = wins + 1 where id = team returning wins;
$$;

revoke all on function record_team_win(uuid) from public;
revoke all on function record_team_win(uuid) from anon;
revoke all on function record_team_win(uuid) from authenticated;
grant execute on function record_team_win(uuid) to service_role;
