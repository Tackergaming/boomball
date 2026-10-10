-- The kick-off board, kept beside the match so the opening can be watched.
--
-- Sub-phase 2H.7, Jérôme's retour 2 on the engine 3 game (2026-10-10): when
-- the house wins the initiative, `create-match` plays its opening turns before
-- anybody is asked for anything, and the snapshot it writes is the board
-- *after* those turns. A client loading a fresh match therefore found the
-- house already in place and never saw it move. The client never resolves a
-- rule, so it cannot rewind the snapshot itself: the function now stores the
-- board as it stood before the opening events, plus the sequence number the
-- opening ends on, and the client replays `match_events` 0..lastSeq from it
-- exactly once, when the snapshot's `seq` is still that number.
--
-- Shape: `{ "state": <MatchState>, "lastSeq": <int> }`. Null on every match
-- opened before this migration, which the client reads as "nothing to replay".
--
-- Readable through the existing `matches_read` policy (team members), like
-- `turn_deadline`. No write policy: only the function writes it.
--
-- Idempotent, safe to run twice. Engine version moves to 4 in the same
-- sub-phase for other reasons (écarts 49 and 50); this column is not one of
-- them, an older client simply never reads it.

alter table matches
  add column if not exists kickoff jsonb;

comment on column matches.kickoff is
  'The board before the opening events and the seq the opening ends on, replayed once by a fresh client (2H.7).';
