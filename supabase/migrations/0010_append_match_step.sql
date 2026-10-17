-- Appending a step to a match in one transaction (audit line A10, 2H.31).
--
-- `resolve-action` used to write a step as three requests in a row: insert the
-- events, upsert the snapshot, update the match row, with no transaction, no
-- check that `seq` was still where it had been read, and the result of the
-- insert never looked at. Invisible in solo, where one client writes. In the
-- co-op (phase 7) two clients can send at once: both load the same `seq`, the
-- second insert violates the primary key of `match_events` without anybody
-- knowing, and the snapshot is overwritten by whichever write lands last.
--
-- This function is the one write of a step. It locks the match's `match_state`
-- row (`for update`), so two callers queue instead of racing; the second then
-- reads the `seq` the first left and is refused with "the board moved on",
-- which the function turns into a 409 and the client treats as any refusal:
-- it reads the board again and the player plays from it. The three writes are
-- inside the same transaction, so a failure anywhere leaves nothing behind.
-- It also folds three round trips into one, which matters when the function
-- runs an ocean away from the database (`00` C31 point 1).
--
-- `p_columns` carries the `matches` columns the step settles, as the Edge
-- Function computed them (`server/persist.ts`, `matchColumns`): phase, round,
-- score_a, score_b, turn_deadline, winner, is_draw, finished_at, orders. The
-- function casts and writes them; it decides nothing about the sport.
--
-- **Not callable by a client**, like `record_team_win`: a signed-in player who
-- could append a step could write a goal. Only the service role holds it,
-- which is only ever the Edge Function.

create or replace function append_match_step(
  p_match uuid,
  p_expected_seq integer,
  p_events jsonb,
  p_snapshot jsonb,
  p_columns jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_seq integer;
  new_seq integer;
begin
  -- The lock. A second caller waits here until the first commits, then reads
  -- the seq the first wrote, and the check below refuses it.
  select seq into current_seq from match_state where match_id = p_match for update;
  if current_seq is null then
    raise exception 'no such match' using errcode = 'P0002';
  end if;
  if current_seq <> p_expected_seq then
    raise exception 'the board moved on: expected seq %, found %', p_expected_seq, current_seq
      using errcode = 'P0001';
  end if;

  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'events must be a JSON array' using errcode = '22023';
  end if;
  new_seq := p_expected_seq + jsonb_array_length(p_events);

  -- The events first, numbered from the seq after the one the snapshot held,
  -- in the order the engine produced them. `match_events` is the truth and
  -- `match_state` only a cache, as the first migration says.
  insert into match_events (match_id, seq, kind, payload)
  select p_match, p_expected_seq + e.ordinality, e.value->>'kind', e.value
  from jsonb_array_elements(p_events) with ordinality as e(value, ordinality);

  update match_state
    set seq = new_seq,
        snapshot = p_snapshot,
        updated_at = now()
    where match_id = p_match;

  update matches set
    phase = (p_columns->>'phase')::boomball_match_phase,
    round = (p_columns->>'round')::integer,
    score_a = (p_columns->>'score_a')::integer,
    score_b = (p_columns->>'score_b')::integer,
    turn_deadline = (p_columns->>'turn_deadline')::timestamptz,
    winner = (p_columns->>'winner')::boomball_team,
    is_draw = coalesce((p_columns->>'is_draw')::boolean, false),
    finished_at = (p_columns->>'finished_at')::timestamptz,
    orders = coalesce(p_columns->'orders', '[]'::jsonb)
  where id = p_match;

  return new_seq;
end;
$$;

revoke all on function append_match_step(uuid, integer, jsonb, jsonb, jsonb) from public;
revoke all on function append_match_step(uuid, integer, jsonb, jsonb, jsonb) from anon;
revoke all on function append_match_step(uuid, integer, jsonb, jsonb, jsonb) from authenticated;
grant execute on function append_match_step(uuid, integer, jsonb, jsonb, jsonb) to service_role;
