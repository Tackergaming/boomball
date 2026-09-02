/**
 * Runs a migration file against the project, through the Management API.
 *
 * Neither the `supabase` CLI nor `psql` is installed on this machine, and the
 * Personal Access Token can execute SQL, so this posts the file to
 * `/v1/projects/{ref}/database/query`. Migrations 0001 and 0002 were applied
 * the same way by hand; this exists because 0003 and 0004 made that the second
 * time, and a step done twice by hand is a step that will be got wrong.
 *
 * **It is not a migration runner.** There is no ledger of what has been applied
 * and no ordering: it runs the file it is given, once, and says what came back.
 * The files are written to be safe to run twice where that is cheap
 * (`create or replace`), and to fail loudly where it is not (`add column`),
 * which is the honest behaviour for a project with one database and one person
 * pointing at it. If Boomball ever grows a second environment, replace this
 * with the CLI rather than growing a ledger here.
 *
 *     set -a && . ../.env && set +a          # from boomball/
 *     node scripts/apply-migration.mjs supabase/migrations/0003_record_win.sql
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load the workspace .env when the variables are not already there, so this
// runs the same way in PowerShell and in bash. Sourcing a .env by hand is a
// bash-ism, and getting it wrong looks exactly like a missing key: the script
// fails before touching the network and the message blames the environment.
// Anything already exported wins, so an explicit override still works.
if (!process.env.SUPABASE_API_KEY_BOOMBALL || !process.env.SUPABASE_BOOMBALL_REF) {
  const envFile = resolve(import.meta.dirname, '../../.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const PAT = process.env.SUPABASE_API_KEY_BOOMBALL;
const REF = process.env.SUPABASE_BOOMBALL_REF;
if (!PAT || !REF) {
  console.error('SUPABASE_API_KEY_BOOMBALL and SUPABASE_BOOMBALL_REF must be in the environment,');
  console.error('or in the workspace .env, which this script loads on its own.');
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/apply-migration.mjs <file.sql> [more.sql ...]');
  process.exit(1);
}

for (const file of files) {
  const query = await readFile(file, 'utf8');

  const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`${file}: failed, ${response.status}`);
    console.error(body);
    process.exit(1);
  }
  console.log(`${file}: applied. ${body.slice(0, 200)}`);
}
