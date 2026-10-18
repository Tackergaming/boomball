/**
 * Deploys the built client to Vercel through the REST API, and nothing else.
 *
 * **The repository is never linked to Vercel, and must never be.** It holds
 * the campaign vault, the context files and the root CLAUDE.md; a Git
 * integration would hand Vercel read access to all of it. So this script does
 * what the integration would do, by hand: it walks `client/dist/`, uploads
 * every file by its SHA-1 (`POST /v2/files`), then creates a deployment that
 * references those files (`POST /v13/deployments`), with no framework and no
 * build step: Vercel serves the files as they are. The project is created on
 * the first run (`POST /v10/projects`) and is a plain project with no `link`.
 *
 * Preview by default, production on `--production`. A preview deployment has
 * its own URL and changes nothing for anyone; production is what the
 * `<project>.vercel.app` alias points at, which is the game people play.
 * **Production only with Jérôme's go**, like the Edge Functions.
 *
 *     node scripts/deploy-vercel.mjs                 # preview
 *     node scripts/deploy-vercel.mjs --production    # the live game
 *     node scripts/deploy-vercel.mjs --project boomball --dist client/dist
 *
 * Reads `VERCEL_TOKEN` and `VERCEL_TEAM_ID` from the environment, or from the
 * workspace `.env` on its own, like `apply-migration.mjs`. Never prints them.
 *
 * `client/dist/` must be fresh: run `npm run build` in `client/` first. The
 * build bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
 * `client/.env.local` into the bundle; the anon key is public by design, the
 * service key never comes near the client.
 */

import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// -- Arguments and environment ----------------------------------------------

function argValue(flag, fallback) {
  const at = process.argv.indexOf(flag);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}
const PRODUCTION = process.argv.includes('--production');
const PROJECT = argValue('--project', 'boomball');
const DIST = resolve(root, argValue('--dist', 'client/dist'));

if (!process.env.VERCEL_TOKEN) {
  const envFile = resolve(root, '.env');
  const text = await readFile(envFile, 'utf8').catch(() => '');
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}
const TOKEN = process.env.VERCEL_TOKEN;
const TEAM = process.env.VERCEL_TEAM_ID ?? '';
if (!TOKEN) {
  console.error('VERCEL_TOKEN is missing, in the environment or in the workspace .env.');
  process.exit(1);
}

// -- The API -----------------------------------------------------------------

const API = 'https://api.vercel.com';

function withTeam(path) {
  if (!TEAM) return API + path;
  return `${API}${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(TEAM)}`;
}

async function api(method, path, body, headers = {}) {
  const response = await fetch(withTeam(path), {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body !== undefined && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: body instanceof Uint8Array ? body : JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text.trim() ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 300) };
  }
  return { status: response.status, body: parsed };
}

function fail(what, reply) {
  console.error(`${what}: ${reply.status} ${JSON.stringify(reply.body).slice(0, 600)}`);
  process.exit(1);
}

// -- The files ---------------------------------------------------------------

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const index = await stat(join(DIST, 'index.html')).catch(() => null);
if (!index) {
  console.error(`${DIST} has no index.html. Build the client first: npm run build in client/.`);
  process.exit(1);
}

const paths = await walk(DIST);
const files = [];
for (const full of paths) {
  const data = await readFile(full);
  const sha = createHash('sha1').update(data).digest('hex');
  // Forward slashes whatever the platform: the path is a URL on the other side.
  const file = relative(DIST, full).split('\\').join('/');
  files.push({ file, sha, size: data.length, data });
}

// A rewrite so a reload on any path lands on the app, and immutable caching
// for Vite's hashed assets. Static files still win over the rewrite.
const vercelJson = Buffer.from(
  JSON.stringify(
    {
      rewrites: [{ source: '/(.*)', destination: '/index.html' }],
      headers: [
        {
          source: '/assets/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        },
      ],
    },
    null,
    2,
  ),
);
files.push({
  file: 'vercel.json',
  sha: createHash('sha1').update(vercelJson).digest('hex'),
  size: vercelJson.length,
  data: vercelJson,
});

const total = files.reduce((sum, f) => sum + f.size, 0);
console.log(`project   ${PROJECT}${TEAM ? ' (team)' : ''}`);
console.log(`target    ${PRODUCTION ? 'PRODUCTION' : 'preview'}`);
console.log(`files     ${files.length} from ${relative(root, DIST)}, ${(total / 1024 / 1024).toFixed(1)} MB`);

// -- The project, created once, never linked ---------------------------------

let project = await api('GET', `/v9/projects/${encodeURIComponent(PROJECT)}`);
if (project.status === 404) {
  console.log('project   not found, creating it');
  project = await api('POST', '/v10/projects', { name: PROJECT, framework: null });
  if (project.status >= 300) fail('could not create the project', project);
} else if (project.status >= 300) {
  fail('could not read the project', project);
}
if (project.body?.link) {
  console.error('the project is linked to a Git repository. That must never happen here; stopping.');
  process.exit(1);
}

// -- Upload by SHA -----------------------------------------------------------

const started = Date.now();
let uploaded = 0;
const queue = [...files];
async function worker() {
  for (let next = queue.shift(); next; next = queue.shift()) {
    const reply = await api('POST', '/v2/files', new Uint8Array(next.data), {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(next.size),
      'x-vercel-digest': next.sha,
    });
    if (reply.status >= 300) fail(`could not upload ${next.file}`, reply);
    uploaded += 1;
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`uploaded  ${uploaded} files in ${((Date.now() - started) / 1000).toFixed(1)} s`);

// -- The deployment ----------------------------------------------------------

const created = await api('POST', '/v13/deployments?skipAutoDetectionConfirmation=1', {
  name: PROJECT,
  project: project.body.id,
  ...(PRODUCTION ? { target: 'production' } : {}),
  files: files.map(({ file, sha, size }) => ({ file, sha, size })),
  // No framework, no build: the files are the site. Saved on the first
  // deployment, repeated after so a changed dashboard setting cannot creep in.
  projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
  meta: { source: 'scripts/deploy-vercel.mjs', builtAt: new Date().toISOString() },
});
if (created.status >= 300) fail('could not create the deployment', created);

const id = created.body.id;
console.log(`deployment ${id}`);
console.log(`url       https://${created.body.url}`);

// -- Wait for READY ----------------------------------------------------------

let state = created.body.readyState;
const deadline = Date.now() + 5 * 60 * 1000;
while (state !== 'READY' && state !== 'ERROR' && state !== 'CANCELED' && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 3000));
  const poll = await api('GET', `/v13/deployments/${id}`);
  if (poll.status >= 300) fail('could not read the deployment', poll);
  state = poll.body.readyState;
  if (state === 'ERROR') console.error(JSON.stringify(poll.body.errorMessage ?? poll.body).slice(0, 600));
  if (state === 'READY') {
    const aliases = poll.body.alias ?? [];
    console.log(`state     READY in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    for (const alias of aliases) console.log(`alias     https://${alias}`);
  }
}
if (state !== 'READY') {
  console.error(`state     ${state}`);
  process.exit(1);
}
