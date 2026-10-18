/**
 * Exports the Boomball tables to JSON files, through the Management API.
 *
 * Why this exists: the free Supabase plan has no automatic backup (audit A23),
 * so this export is the only backup there is. It reads with `select *`, so the
 * columns added by later migrations (`abandoned_at`, `roster`, `invite_code`)
 * come along without this script knowing about them. It never writes to the
 * database.
 *
 * Output goes to `backups/<YYYY-MM-DD-HHMM>/<table>.json`, one file
 * per table, plus a `manifest.json` (row counts, ISO timestamp, project ref).
 * That folder is ignored by git: the dump holds player data and invite codes,
 * and it must stay on this machine, so copy it somewhere safe yourself.
 * **Restoring is manual.** There is no import script; the files are the raw
 * rows, to be replayed by hand (SQL insert or a throwaway script) if ever needed.
 *
 * By default `match_events` and `match_state` are left out: about 99,000 rows
 * of moves played, which is not what matters. `--events` adds them, read in
 * pages of 5,000 rows ordered by `(match_id, seq)` until a page comes back empty.
 *
 *     node scripts/export-db.mjs            # from the workspace root
 *     node scripts/export-db.mjs --events
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Same loading as apply-migration.mjs: the workspace .env, only when the
// variables are not already exported.
if (!process.env.SUPABASE_API_KEY_BOOMBALL || !process.env.SUPABASE_BOOMBALL_REF) {
  const envFile = resolve(import.meta.dirname, '../.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const PAT = process.env.SUPABASE_API_KEY_BOOMBALL;
const REF = process.env.SUPABASE_BOOMBALL_REF;
if (!PAT || !REF) {
  console.error('SUPABASE_API_KEY_BOOMBALL and SUPABASE_BOOMBALL_REF must be in the environment,');
  console.error('or in the workspace .env, which this script loads on its own.');
  process.exit(1);
}

const withEvents = process.argv.includes('--events');
const PAGE = 5000;

async function run(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`${query}: failed, ${response.status}`);
    console.error(body);
    process.exit(1);
  }
  return JSON.parse(body);
}

// Each table: a plain query, or a paged one for the two big tables.
const tables = [
  { name: 'profiles', order: 'id' },
  { name: 'teams', order: 'id' },
  { name: 'team_members', order: 'team_id, profile_id' },
  { name: 'matches', order: 'id' },
  { name: 'match_participants', order: 'match_id, unit_id' },
  { name: 'arenas', order: 'id' },
  { name: 'role_stats', order: 'role, tier' },
];
if (withEvents) {
  tables.push({ name: 'match_events', order: 'match_id, seq', paged: true });
  tables.push({ name: 'match_state', order: 'match_id', paged: true });
}

const now = new Date();
const p = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
const dir = resolve(import.meta.dirname, '../backups', stamp);
await mkdir(dir, { recursive: true });

const counts = {};
for (const { name, order, paged } of tables) {
  let rows = [];
  if (paged) {
    for (let offset = 0; ; offset += PAGE) {
      const page = await run(`select * from ${name} order by ${order} limit ${PAGE} offset ${offset}`);
      if (page.length === 0) break;
      rows = rows.concat(page);
    }
  } else {
    rows = await run(`select * from ${name} order by ${order}`);
  }
  await writeFile(resolve(dir, `${name}.json`), JSON.stringify(rows, null, 2));
  counts[name] = rows.length;
  console.log(`${name}: ${rows.length} rows`);
}

const manifest = { exportedAt: now.toISOString(), projectRef: REF, withEvents, tables: counts };
await writeFile(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(dir);
