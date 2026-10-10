-- The kick-off line moves up: the Kill-Silo `starts` column, rewritten.
--
-- Sub-phase 2H.5, audit gap 38 revised. At the gate of 2H.4, after Jérôme's
-- first game on the horizontal pitch, the six field players of each team stood
-- at y4 and y40, eighteen cells from the ball at (7, 22). That was more than a
-- Dash, so nobody could reach the ball on turn one. The engine now starts team A
-- at y14 and team B at y30, same x (2, 4, 6, 8, 10, 12); the Bulwarks stay at
-- (7, 1) and (7, 43). The `arenas` row for `kill-silo` is only a mirror of the
-- engine (`engine/arenas/kill-silo.ts`), so it is rewritten here.
--
-- Idempotent, safe to run twice. It only moves `starts`: the layout rows and
-- every other column are unchanged, and the engine version does not move
-- (ENGINE_VERSION stays 2, the state and event shapes did not change).
--
-- Open matches are not affected: positions live in the match state, and new
-- matches read this row through `create-match`.
--
-- The block below is the one `supabase/seed.sql` carries, and it stays held
-- equal to the engine by `server/migration0006.test.ts`.

insert into arenas (
  id, name, width, height, layout, furnaces, ordnance_start, starts, substitute_entry, art
) values (
  'kill-silo',
  'The Kill-Silo',
  15,
  45,
  array[
    '......###......',
    '...............',
    '...............',
    '...............',
    '...............',
    '...##.....##...',
    '...##.....##...',
    '...............',
    '...............',
    '......###......',
    '...............',
    '...............',
    '.##.........##.',
    '.##.........##.',
    '...............',
    '...............',
    '.......#.......',
    '...............',
    '....##...##....',
    '....##...##....',
    '...............',
    '...............',
    '#.............#',
    '...............',
    '...............',
    '....##...##....',
    '....##...##....',
    '...............',
    '.......#.......',
    '...............',
    '...............',
    '.##.........##.',
    '.##.........##.',
    '...............',
    '...............',
    '......###......',
    '...............',
    '...............',
    '...##.....##...',
    '...##.....##...',
    '...............',
    '...............',
    '...............',
    '...............',
    '......###......'
  ],
  '[{"defendedBy":"A","cells":[{"x":6,"y":0},{"x":7,"y":0},{"x":8,"y":0}]},{"defendedBy":"B","cells":[{"x":6,"y":44},{"x":7,"y":44},{"x":8,"y":44}]}]'::jsonb,
  '{"x":7,"y":22}'::jsonb,
  '{"A":[{"x":7,"y":1},{"x":2,"y":14},{"x":4,"y":14},{"x":6,"y":14},{"x":8,"y":14},{"x":10,"y":14},{"x":12,"y":14}],"B":[{"x":7,"y":43},{"x":2,"y":30},{"x":4,"y":30},{"x":6,"y":30},{"x":8,"y":30},{"x":10,"y":30},{"x":12,"y":30}]}'::jsonb,
  '{"A":{"x":5,"y":1},"B":{"x":5,"y":43}}'::jsonb,
  '{"0":"assets/arena/zone-1-trench.jpeg","1":"assets/arena/zone-2-scramble.jpeg","2":"assets/arena/zone-3-summit.jpeg"}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  width = excluded.width,
  height = excluded.height,
  layout = excluded.layout,
  furnaces = excluded.furnaces,
  ordnance_start = excluded.ordnance_start,
  starts = excluded.starts,
  substitute_entry = excluded.substitute_entry,
  art = excluded.art;
