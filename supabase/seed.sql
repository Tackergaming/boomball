-- GENERATED FILE, do not edit by hand.
--
-- Produced by `server/seed.ts` from the engine's own tables and held against
-- this file by `server/seed.test.ts`. To change anything here, change
-- `engine/stats.ts` or `engine/arenas/kill-silo.ts` and regenerate.
--
-- Idempotent: safe to run against a database that already has these rows.

-- -- Role and Tier statistics, mirroring engine/stats.ts ----------------------

insert into role_stats (role, tier, hp, ac, might, aim, agility) values
  ('striker', 'rookie', 30, 13, 2, 7, 4),
  ('striker', 'veteran', 40, 14, 3, 9, 6),
  ('striker', 'star', 50, 15, 4, 11, 8),
  ('breaker', 'rookie', 50, 12, 4, 3, 1),
  ('breaker', 'veteran', 65, 13, 6, 4, 2),
  ('breaker', 'star', 85, 14, 8, 5, 3),
  ('bulwark', 'rookie', 40, 19, 3, 2, 2),
  ('bulwark', 'veteran', 55, 21, 4, 3, 3),
  ('bulwark', 'star', 70, 25, 5, 4, 4),
  ('trajector', 'rookie', 25, 14, 0, 7, 5),
  ('trajector', 'veteran', 35, 15, 1, 9, 7),
  ('trajector', 'star', 45, 16, 2, 11, 10)
on conflict (role, tier) do update set
  hp = excluded.hp,
  ac = excluded.ac,
  might = excluded.might,
  aim = excluded.aim,
  agility = excluded.agility;

-- -- The Kill-Silo, mirroring engine/arenas/kill-silo.ts ----------------------
-- `layout` is the playable terrain, top row first, y = 44 down to y = 0.
-- The art is finished pictures laid under it and is never read as terrain.

insert into arenas (
  id, name, width, height, layout, furnaces, ordnance_start, starts, substitute_entry, art
) values (
  'kill-silo',
  'The Kill-Silo',
  15,
  45,
  array[
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '#....##|##....#',
    '#......|......#',
    '#####..|..#####',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.....##|##.....',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '####...|...####',
    '.......|.......',
    '...|.|.|.|.|...',
    '.......|.......',
    '#####..|..#####',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '#####..|..#####',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '####...|...####',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '#####..|..#####',
    '.......|.......',
    '.......|.......',
    '####...|...####',
    '.......|.......',
    '.......|.......',
    '.......|.......',
    '.......|.......'
  ],
  '[{"defendedBy":"A","cells":[{"x":0,"y":39},{"x":0,"y":38}]},{"defendedBy":"B","cells":[{"x":14,"y":39},{"x":14,"y":38}]}]'::jsonb,
  '{"x":7,"y":22}'::jsonb,
  '{"A":[{"x":1,"y":38},{"x":1,"y":20},{"x":2,"y":20},{"x":3,"y":20},{"x":1,"y":24},{"x":2,"y":24},{"x":3,"y":24}],"B":[{"x":13,"y":38},{"x":13,"y":20},{"x":12,"y":20},{"x":11,"y":20},{"x":13,"y":24},{"x":12,"y":24},{"x":11,"y":24}]}'::jsonb,
  '{"A":{"x":1,"y":36},"B":{"x":13,"y":36}}'::jsonb,
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
