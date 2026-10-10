-- The pitch lies down: the Kill-Silo arena row, rewritten for version 2.
--
-- Decision D11 of 2026-10-10 laid the pitch horizontal. The layout is the one
-- in docs/08-plan-terrain-horizontal.md section 3, accepted by Jérôme. The
-- engine moved first (`engine/arenas/kill-silo.ts`, ENGINE_VERSION = 2 in
-- `engine/constants.ts`), and the `arenas` row for `kill-silo` is only a mirror
-- of it, so a database still holding the vertical silo would serve the client a
-- grid the engine no longer agrees with.
--
-- This migration does that and nothing else: it rewrites the arena row. The
-- `matches.engine_version` column and the archiving of the matches still open
-- (audit line A11) come in a later migration, in sub-phase 2H.4.
--
-- The block below is the one `supabase/seed.sql` carries, and it stays held
-- equal to the engine by `server/arenaRow.test.ts` and by
-- `server/migration0005.test.ts`. Idempotent: safe to run twice.

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
  '{"A":[{"x":7,"y":1},{"x":2,"y":4},{"x":4,"y":4},{"x":6,"y":4},{"x":8,"y":4},{"x":10,"y":4},{"x":12,"y":4}],"B":[{"x":7,"y":43},{"x":2,"y":40},{"x":4,"y":40},{"x":6,"y":40},{"x":8,"y":40},{"x":10,"y":40},{"x":12,"y":40}]}'::jsonb,
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
