-- One team per owner, held by the database (security review of 2026-10-17,
-- finding m6; decided by Jérôme on 2026-10-18, 2H.37).
--
-- `useAccount` has assumed since 2H.32 that a player owns at most one team and
-- joins others; only the screen enforced it, and a client talking to the API
-- could found ten. No consequence, but the assumption is now a constraint.
-- The index of 0001 on `owner` was not unique; this one is. Nothing in the
-- live data violates it (two teams, two owners, read on 2026-10-18).

create unique index teams_one_per_owner on teams (owner);
