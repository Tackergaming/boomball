/**
 * The seed is a mirror of the engine, and this is what stops it drifting.
 *
 * If this test fails after a rebalance, that is it working: rerun it with
 * `npx vitest run server/seed.test.ts -u` to rewrite `supabase/seed.sql` from
 * the engine, then apply the seed to the database.
 */

import { describe, expect, it } from 'vitest';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../engine/constants.js';
import { ROLES, ROLE_STATS, TIERS } from '../engine/stats.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { buildSeedSql } from './seed.js';

describe('the database seed', () => {
  it('matches the engine, or the checked-in file is stale', async () => {
    await expect(buildSeedSql()).toMatchFileSnapshot('../supabase/seed.sql');
  });

  it('carries every role and Tier the engine defines', () => {
    const sql = buildSeedSql();

    for (const role of ROLES) {
      for (const tier of TIERS) {
        const s = ROLE_STATS[role][tier];
        expect(sql).toContain(
          `('${role}', '${tier}', ${s.hp}, ${s.ac}, ${s.might}, ${s.aim}, ${s.agility})`,
        );
      }
    }
  });

  it('carries the arena at the size the engine expects', () => {
    const sql = buildSeedSql();

    expect(KILL_SILO.rows).toHaveLength(ARENA_HEIGHT);
    for (const row of KILL_SILO.rows) expect(row).toHaveLength(ARENA_WIDTH);
    // Every row of terrain has to survive into the seed, or the client would
    // draw a grid the engine does not agree with.
    for (const row of KILL_SILO.rows) expect(sql).toContain(row);
  });

  it('escapes a quote in the data instead of trusting there never is one', () => {
    // No arena is called this today. The next one might be, and an unescaped
    // apostrophe in a seed is a syntax error at best and an injection at worst.
    const sql = buildSeedSql({ ...KILL_SILO, id: "l'enclume", name: "L'Enclume" });

    expect(sql).toContain("'l''enclume'");
    expect(sql).toContain("'L''Enclume'");
    expect(sql).not.toContain("'L'Enclume'");
  });
});
