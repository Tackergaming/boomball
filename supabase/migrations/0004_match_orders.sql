-- Standing orders to AI team-mates, which had nowhere to live.
--
-- `ai/orders.ts` says it plainly: in solo a human pilots one player out of
-- fourteen, so the orders channel is most of what the player actually does.
-- It was written, it is read by `chooseAction`, and **nothing ever put an order
-- into it**. The client had no button and the Edge Function passed an empty
-- array every time, so six of the seven shirts on the player's own side took no
-- instruction at all. Jérôme's report was that he never got the ball.
--
-- Orders stand until replaced, so they outlive the request that sets them and
-- need a column. They go on `matches` rather than in the snapshot because they
-- are not part of the game state: the engine has no idea they exist, `reduce`
-- never reads them, and a match replayed from its events is the same match with
-- or without them. They only bias what the AI chooses to send through the door.
--
-- No write policy, like every other match column: orders are validated and
-- written by `resolve-action`, which is the only thing holding the service key.
-- A client that could write here could order the enemy team.

alter table matches
  add column orders jsonb not null default '[]'::jsonb;

comment on column matches.orders is
  'Standing AllyOrder list, validated by resolve-action. Never part of MatchState.';
