/**
 * Deploys the bundled `resolve-action` through the Supabase Management API.
 *
 * Neither the `supabase` CLI nor `psql` is installed on this machine, and the
 * Personal Access Token in the workspace `.env` can do the whole job, so this
 * goes straight at `POST /v1/projects/{ref}/functions/deploy`. If the CLI ever
 * gets installed, `supabase functions deploy resolve-action` does the same
 * thing and this script can go.
 *
 * `verify_jwt` is on. The function reads the caller's identity from the JWT and
 * refuses anyone it cannot name, so an unsigned request has nothing to do here
 * and is better stopped at the gateway than in our code.
 *
 * Expects, from the workspace `.env`:
 *   SUPABASE_API_KEY_BOOMBALL   the Personal Access Token (sbp_...)
 *   SUPABASE_BOOMBALL_REF       the project ref
 *
 *     npm run deploy:function        # builds, then deploys
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const bundle = join(root, 'supabase', 'functions', 'resolve-action', 'dist', 'index.js');

const PAT = process.env.SUPABASE_API_KEY_BOOMBALL;
const REF = process.env.SUPABASE_BOOMBALL_REF;
if (!PAT || !REF) {
  console.error('SUPABASE_API_KEY_BOOMBALL and SUPABASE_BOOMBALL_REF must be in the environment.');
  console.error('From the workspace root:  set -a && . ./.env && set +a');
  process.exit(1);
}

const code = await readFile(bundle);

const form = new FormData();
// The upload is named `index.js` and the entrypoint names the same file. The
// bundle is self-contained apart from the Supabase client, which Deno fetches
// from its URL, so one file is the whole function.
form.append('file', new Blob([code], { type: 'text/javascript' }), 'index.js');
form.append(
  'metadata',
  new Blob(
    [JSON.stringify({ entrypoint_path: 'index.js', name: 'resolve-action', verify_jwt: true })],
    { type: 'application/json' },
  ),
);

const response = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=resolve-action`,
  { method: 'POST', headers: { Authorization: `Bearer ${PAT}` }, body: form },
);

const body = await response.text();
if (!response.ok) {
  console.error(`deploy failed: ${response.status}`);
  console.error(body);
  process.exit(1);
}

const deployed = JSON.parse(body);
console.log(
  `resolve-action deployed: version ${deployed.version}, status ${deployed.status}, ` +
    `verify_jwt ${deployed.verify_jwt}`,
);
