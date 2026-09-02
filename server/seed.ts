/**
 * The reference rows, built from the engine rather than typed out beside it.
 *
 * `role_stats` and `arenas.layout` exist in the database so the interface can
 * read a stat line and draw a grid without importing the engine. That is a
 * mirror, and a mirror drifts: the day somebody rebalances `engine/stats.ts`,
 * a hand-written INSERT keeps serving the old numbers and nothing complains.
 *
 * So the seed is generated from the engine's own data, and `seed.test.ts` holds
 * the generated text against the checked-in `supabase/seed.sql`. Change a stat
 * and the test fails until the seed is regenerated, which is the whole point.
 */

import type { ArenaSpec } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../engine/constants.js';
import { ROLES, ROLE_STATS, TIERS } from '../engine/stats.js';

/** Postgres string literal. Doubling the quote is the whole of the escaping. */
function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function jsonLit(value: unknown): string {
  return `${lit(JSON.stringify(value))}::jsonb`;
}

/**
 * The arena is a parameter because the plan calls for an arena loader and only
 * ships one arena at the MVP. It also lets the escaping be tested with a name
 * that actually has an apostrophe in it, which no arena has yet.
 */
export function buildSeedSql(arena: ArenaSpec = KILL_SILO): string {
  const stats = ROLES.flatMap((role) =>
    TIERS.map((tier) => {
      const s = ROLE_STATS[role][tier];
      return `  (${lit(role)}, ${lit(tier)}, ${s.hp}, ${s.ac}, ${s.might}, ${s.aim}, ${s.agility})`;
    }),
  ).join(',\n');

  const layout = arena.rows.map((row) => `    ${lit(row)}`).join(',\n');

  return `-- GENERATED FILE, do not edit by hand.
--
-- Produced by \`server/seed.ts\` from the engine's own tables and held against
-- this file by \`server/seed.test.ts\`. To change anything here, change
-- \`engine/stats.ts\` or \`engine/arenas/kill-silo.ts\` and regenerate.
--
-- Idempotent: safe to run against a database that already has these rows.

-- -- Role and Tier statistics, mirroring engine/stats.ts ----------------------

insert into role_stats (role, tier, hp, ac, might, aim, agility) values
${stats}
on conflict (role, tier) do update set
  hp = excluded.hp,
  ac = excluded.ac,
  might = excluded.might,
  aim = excluded.aim,
  agility = excluded.agility;

-- -- The Kill-Silo, mirroring engine/arenas/kill-silo.ts ----------------------
-- \`layout\` is the playable terrain, top row first, y = ${ARENA_HEIGHT - 1} down to y = 0.
-- The art is finished pictures laid under it and is never read as terrain.

insert into arenas (
  id, name, width, height, layout, furnaces, ordnance_start, starts, substitute_entry, art
) values (
  ${lit(arena.id)},
  ${lit(arena.name)},
  ${ARENA_WIDTH},
  ${ARENA_HEIGHT},
  array[
${layout}
  ],
  ${jsonLit(arena.furnaces)},
  ${jsonLit(arena.ordnanceStart)},
  ${jsonLit(arena.starts)},
  ${jsonLit(arena.substituteEntry)},
  ${jsonLit(arena.art)}
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
`;
}
