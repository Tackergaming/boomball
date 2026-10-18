-- The insert policy of 0013, corrected for the lobby's upsert (2H.37, M1).
--
-- 0013 reserved the insert on `team_members` to the owner, for their own row.
-- `rls-check.py` then showed 37/38 on the live project: a member's seat save
-- failed with "new row violates row-level security policy". The reason is a
-- Postgres fact 0013's comment got wrong: on `insert ... on conflict do
-- update`, the INSERT policy's `with check` is evaluated on the proposed row
-- **before** the conflict is looked up, so it runs on the update path too. A
-- member's upsert of their own, existing row was refused by a policy meant for
-- newcomers.
--
-- The condition becomes "one's own row, on a team one already belongs to":
-- `is_team_member(team_id)` is true for the owner and for every member, false
-- for a stranger and for a member the owner removed. A member can therefore
-- "insert" only the row they already have, which conflicts on the primary key
-- and either updates it (the upsert) or fails (a plain insert): nothing new is
-- gained. A newcomer still enters through `join_team` and no other way. The
-- trigger of 0013 keeps pinning `team_id` and `profile_id`.

drop policy team_members_insert_owner on team_members;

create policy team_members_insert_self on team_members
  for insert
  with check (profile_id = auth.uid() and is_team_member(team_id));
