-- The owner reads their own team without going through `is_team_member`.
--
-- Found by running the RLS suite against the real project on 2026-09-02, not by
-- reading the policies. It is worth writing down because the failure is silent
-- in SQL and only appears through the client library.
--
-- `teams_read_member` was `using (is_team_member(id))`, and `is_team_member`
-- answers by querying `teams`. A sub-query inside a policy sees the snapshot as
-- of the start of the statement, so **the row being inserted is not visible to
-- it**. `insert into teams ...` therefore passed and
-- `insert into teams ... returning id` was refused, which in PostgREST terms
-- means a bare insert works and `.insert().select()` fails with 42501 and the
-- misleading message "new row violates row-level security policy". The insert
-- check was never the problem; the select policy on RETURNING was.
--
-- The fix reads `owner` off the row under evaluation instead of looking it up.
-- It is also cheaper on every read of the table. `is_team_member` keeps its
-- `teams` branch, which the match policies still need for an owner who has no
-- `team_members` row.

drop policy teams_read_member on teams;

create policy teams_read_member on teams
  for select using (owner = auth.uid() or is_team_member(id));
