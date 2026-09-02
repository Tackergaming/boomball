/**
 * Builds and deploys the Edge Functions through the Supabase Management API.
 *
 * Neither the `supabase` CLI nor `psql` is installed on this machine, and the
 * Personal Access Token in the workspace `.env` can do the whole job, so this
 * goes straight at `POST /v1/projects/{ref}/functions/deploy`. If the CLI ever
 * gets installed, `supabase functions deploy <slug>` does the same thing and
 * this script can go.
 *
 * `verify_jwt` is on. Both functions read the caller's identity from the JWT
 * and refuse anyone they cannot name, so an unsigned request has nothing to do
 * here and is better stopped at the gateway than in our code.
 *
 * Expects, from the workspace `.env`:
 *   SUPABASE_API_KEY_BOOMBALL   the Personal Access Token (sbp_...)
 *   SUPABASE_BOOMBALL_REF       the project ref
 *
 *     npm run deploy:function                       # both
 *     node scripts/deploy-edge-function.mjs create-match
 */

import { readFile } from 'node:fs/promises';

import { bundle, bundlePathFor, FUNCTIONS } from './build-edge-function.mjs';

const PAT = process.env.SUPABASE_API_KEY_BOOMBALL;
const REF = process.env.SUPABASE_BOOMBALL_REF;
if (!PAT || !REF) {
  console.error('SUPABASE_API_KEY_BOOMBALL and SUPABASE_BOOMBALL_REF must be in the environment.');
  console.error('From the workspace root:  set -a && . ./.env && set +a');
  process.exit(1);
}

const wanted = process.argv.slice(2);
const slugs = wanted.length > 0 ? wanted : FUNCTIONS;
for (const slug of slugs) {
  if (!FUNCTIONS.includes(slug)) {
    console.error(`no such function: ${slug}. Known: ${FUNCTIONS.join(', ')}`);
    process.exit(1);
  }
}

for (const slug of slugs) {
  const { size } = await bundle(slug);
  const code = await readFile(bundlePathFor(slug));

  const form = new FormData();
  // The upload is named `index.js` and the entrypoint names the same file. The
  // bundle is self-contained apart from the Supabase client, which Deno fetches
  // from its URL, so one file is the whole function.
  form.append('file', new Blob([code], { type: 'text/javascript' }), 'index.js');
  form.append(
    'metadata',
    new Blob([JSON.stringify({ entrypoint_path: 'index.js', name: slug, verify_jwt: true })], {
      type: 'application/json',
    }),
  );

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${slug}`,
    { method: 'POST', headers: { Authorization: `Bearer ${PAT}` }, body: form },
  );

  const body = await response.text();
  if (!response.ok) {
    console.error(`${slug}: deploy failed, ${response.status}`);
    console.error(body);
    process.exit(1);
  }

  const deployed = JSON.parse(body);
  console.log(
    `${slug}: ${(size / 1024).toFixed(1)} kb deployed, version ${deployed.version}, ` +
      `status ${deployed.status}, verify_jwt ${deployed.verify_jwt}`,
  );
}
