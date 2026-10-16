/**
 * Measures what a `resolve-action` request costs, from the caller's side,
 * against the deployed functions. Written for `00` C31 point 1 (2026-10-16):
 * Jérôme clicked a place in the round's initiative, the prompt stayed, and the
 * match only went on "quelques longues secondes" later. Three suspects, to be
 * told apart by numbers and never by a guess: the function's cold boot after
 * a minute without a request, the two Strikers' turn plans under Deno, the
 * batch write.
 *
 * Same scaffolding as `live-match.ts`: a throwaway player, a real JWT, the
 * match opened through `create-match`, every human turn through
 * `resolve-action`. The human seat is a Striker so that every round opens
 * with a place prompt, and the place is always the last one offered (3 when
 * three Strikers stand), which is the request that plays the two AI Strikers
 * before the human: the request Jérôme was waiting on.
 *
 * What is measured, per request: the round trip in milliseconds, the kind of
 * action, the events handed back, the AI turns among them, and the idle time
 * that preceded it. The protocol alternates, round by round, so that the boot
 * and the work can be read apart in one run:
 *
 *   odd rounds   idle IDLE_S seconds, then the place request       (boot + work)
 *   even rounds  idle IDLE_S seconds, then an orders-only request  (boot, no work)
 *                then the place request at once                    (work, warm)
 *
 * Every other action of the human's turn is sent at once, which gives the
 * warm cost of an ordinary request. Before the match, each stage the function
 * goes through is timed once from here as a proxy: the Auth lookup, the four
 * reads, a Realtime broadcast over HTTP. And for each place request the same
 * `serveAction` is run locally in Node on the same board, so the Deno time can
 * be read against the Node time for identical work.
 *
 *     set -a && . ../.env && set +a          # from boomball/
 *     node scripts/run-ts.mjs scripts/measure-latency.ts [--idle 60] [--rounds 10] [--keep]
 *
 * Deletes the throwaway player and everything cascading off it when done,
 * like `live-match.ts`; `--keep` leaves the match for `dump-match.ts`.
 */

import { performance } from 'node:perf_hooks';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { isHuman, type MatchState } from '../engine/types.js';
import type { Action } from '../engine/actions.js';
import { chooseAction } from '../ai/chooseAction.js';
import { serveAction } from '../server/session.js';

const arena = new Arena(KILL_SILO);

const URL_BASE = need('SUPABASE_BOOMBALL_URL');
const ANON = need('SUPABASE_BOOMBALL_ANON_KEY');
const SERVICE = need('SUPABASE_BOOMBALL_SERVICE_ROLE_KEY');
const KEEP = process.argv.includes('--keep');
const IDLE_S = Number(argValue('--idle') ?? '60');
const MAX_ROUNDS = Number(argValue('--rounds') ?? '10');
// `--region eu-west-3` pins the function to that region through the
// `x-region` header Supabase reads. Without it the function runs in the
// region nearest the caller, which on 2026-10-16 was us-east-1 for this
// machine while the database sits in eu-west-3: every one of the function's
// reads and writes then crossed the Atlantic.
const REGION = argValue('--region');

function argValue(flag: string): string | undefined {
  const at = process.argv.indexOf(flag);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is missing. From boomball/: set -a && . ../.env && set +a`);
    process.exit(1);
  }
  return value;
}

interface Reply {
  status: number;
  body: any;
  ms: number;
  bytes: number;
  /** `x-sb-edge-region`: where the function actually ran. */
  region: string | null;
}

async function call(
  method: string,
  path: string,
  token: string,
  options: { body?: unknown; key?: string; headers?: Record<string, string> } = {},
): Promise<Reply> {
  const t0 = performance.now();
  const response = await fetch(URL_BASE + path, {
    method,
    headers: {
      apikey: options.key ?? ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(REGION && path.startsWith('/functions/') ? { 'x-region': REGION } : {}),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  const ms = performance.now() - t0;
  return {
    status: response.status,
    body: text.trim() ? JSON.parse(text) : null,
    ms,
    bytes: text.length,
    region: response.headers.get('x-sb-edge-region'),
  };
}

const service = (method: string, path: string, body?: unknown, headers?: Record<string, string>) =>
  call(method, path, SERVICE, { body, key: SERVICE, ...(headers ? { headers } : {}) });

function fail(what: string, reply: Reply): never {
  console.error(`${what}: ${reply.status} ${JSON.stringify(reply.body)}`);
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fmt = (ms: number) => `${ms.toFixed(0).padStart(6)} ms`;

// -- A player, a team, a match ----------------------------------------------

const password = `boomball-lat-${Math.random().toString(36).slice(2)}`;
const email = `latency.${Math.random().toString(36).slice(2, 10)}@example.invalid`;

const created = await service('POST', '/auth/v1/admin/users', { email, password, email_confirm: true });
if (created.status >= 300) fail('could not create the player', created);
const humanId: string = created.body.id;

const signedIn = await call('POST', '/auth/v1/token?grant_type=password', ANON, { body: { email, password } });
if (signedIn.status !== 200) fail('could not sign the player in', signedIn);
const jwt: string = signedIn.body.access_token;

const asPlayer = (method: string, path: string, body?: unknown, headers?: Record<string, string>) =>
  call(method, path, jwt, { ...(body === undefined ? {} : { body }), ...(headers ? { headers } : {}) });

const profile = await asPlayer('POST', '/rest/v1/profiles', { id: humanId, display_name: 'Stopwatch' });
if (profile.status !== 201) fail('could not write the profile', profile);

const team = await asPlayer(
  'POST',
  '/rest/v1/teams',
  { owner: humanId, name: 'The Stopwatches' },
  { Prefer: 'return=representation' },
);
if (team.status !== 201) fail('could not create the team', team);
const teamId: string = team.body[0].id;

const enrolled = await asPlayer('POST', '/rest/v1/team_members', {
  team_id: teamId,
  profile_id: humanId,
  preferred_role: 'striker',
  character_name: 'Stopwatch',
});
if (enrolled.status !== 201) fail('could not join the team', enrolled);

const opened = await call('POST', '/functions/v1/create-match', jwt, {
  body: { teamId, seats: [{ profileId: humanId, role: 'striker', characterName: 'Stopwatch' }] },
});
if (!opened.body?.accepted) fail('create-match refused the party', opened);
const matchId: string = opened.body.matchId;
const matchRow = await asPlayer('GET', `/rest/v1/matches?id=eq.${matchId}&select=arena_id`);
const arenaId: string = matchRow.body?.[0]?.arena_id;

console.log(`player   ${humanId}`);
console.log(`match    ${matchId}`);
console.log(`create-match               ${fmt(opened.ms)}  (${opened.body.events.length} events)`);
console.log(`function ran in            ${opened.region ?? 'unknown'}${REGION ? ` (pinned by x-region: ${REGION})` : ' (nearest to the caller)'}`);
console.log('');

// -- The stages of one request, timed from here as proxies -------------------
//
// The function does, in order: `auth.getUser` (one call to the Auth server),
// `match_state` and `matches` in parallel, `match_participants`, `arenas`,
// then the engine, then three writes, then a Realtime broadcast over HTTP. The
// writes cannot be proxied without writing, so they are not; the rest is.

console.log('stage proxies, warm, three times each (ms):');
const stages: [string, () => Promise<Reply>][] = [
  ['auth.getUser              ', () => asPlayer('GET', '/auth/v1/user')],
  ['read match_state          ', () => service('GET', `/rest/v1/match_state?match_id=eq.${matchId}&select=seq,snapshot`)],
  ['read matches              ', () => service('GET', `/rest/v1/matches?id=eq.${matchId}&select=arena_id,turn_deadline,team_id,orders,engine_version,tier,abandoned_at`)],
  ['read match_participants   ', () => service('GET', `/rest/v1/match_participants?match_id=eq.${matchId}&profile_id=eq.${humanId}&select=unit_id`)],
  ['read arenas               ', () => service('GET', `/rest/v1/arenas?id=eq.${arenaId}&select=*`)],
  [
    'broadcast over HTTP       ',
    () =>
      service('POST', '/realtime/v1/api/broadcast', {
        messages: [{ topic: `probe:${matchId}`, event: 'events', payload: { fromSeq: 0, events: [] } }],
      }),
  ],
];
for (const [name, run] of stages) {
  const times: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const reply = await run();
    times.push(reply.ms);
    if (reply.status >= 300) console.log(`  ${name} status ${reply.status} ${JSON.stringify(reply.body).slice(0, 120)}`);
  }
  console.log(`  ${name} ${times.map((t) => t.toFixed(0).padStart(5)).join(' ')}`);
}
console.log('');

// -- The match ---------------------------------------------------------------

interface Row {
  round: number;
  what: string;
  idleS: number;
  ms: number;
  events: number;
  aiTurns: number;
  bytes: number;
  nodeMs: number | null;
  nodeEvents: number | null;
  status: number;
}
const rows: Row[] = [];

async function sendAction(action: Action, unitId: string): Promise<Reply> {
  return call('POST', '/functions/v1/resolve-action', jwt, { body: { matchId, unitId, action } });
}

async function sendOrdersOnly(): Promise<Reply> {
  return call('POST', '/functions/v1/resolve-action', jwt, { body: { matchId, orders: [] } });
}

function aiTurnsIn(events: { kind: string; unitId?: string }[], humanUnit: string): number {
  return events.filter((e) => e.kind === 'turnStarted' && e.unitId !== humanUnit).length;
}

let lastRequestAt = performance.now();
let humanUnit = '';

for (let i = 0; i < 400; i += 1) {
  const read = await asPlayer('GET', `/rest/v1/match_state?match_id=eq.${matchId}&select=seq,snapshot`);
  if (read.status !== 200 || !read.body?.[0]) fail('the player cannot read the board', read);
  const state = read.body[0].snapshot as MatchState;
  if (state.phase === 'finished' || state.round > MAX_ROUNDS) break;
  if (!state.turn) fail('no turn open', read);

  const onClock = state.units.find((unit) => unit.id === state.turn!.unitId);
  if (!onClock || !isHuman(onClock)) fail(`the board waits on ${state.turn.unitId}, not a human`, read);
  humanUnit = onClock.id;

  const placing = state.turn.placing;
  let action: Action;
  let what: string;
  let idleS = 0;

  if (placing != null) {
    const place = Math.min(3, placing);
    action = { kind: 'choosePlace', place };
    what = `choosePlace ${place}/${placing}`;
    if (IDLE_S > 0) {
      process.stdout.write(`round ${state.round}: idle ${IDLE_S} s before the place request... `);
      await sleep(IDLE_S * 1000);
      idleS = IDLE_S;
      if (state.round % 2 === 0) {
        // Even round: a request with no work first, so the boot (if any) is
        // paid here and the place request that follows is measured warm.
        const probe = await sendOrdersOnly();
        rows.push({ round: state.round, what: 'orders-only (after idle)', idleS, ms: probe.ms, events: 0, aiTurns: 0, bytes: probe.bytes, nodeMs: null, nodeEvents: null, status: probe.status });
        process.stdout.write(`probe ${fmt(probe.ms)}, `);
        idleS = 0;
      }
    }
  } else {
    action = chooseAction(arena, state, onClock.id);
    what = action.kind;
  }

  // The same work in Node, on the same board, before the request so the
  // function's reply can be checked against it.
  let nodeMs: number | null = null;
  let nodeEvents: number | null = null;
  if (placing != null) {
    const t0 = performance.now();
    const served = serveAction(arena, { state, turnDeadline: null }, { humanId, unitId: onClock.id, action }, Date.now(), []);
    nodeMs = performance.now() - t0;
    nodeEvents = served.ok ? served.step.events.length : -1;
  }

  const reply = await sendAction(action, onClock.id);
  lastRequestAt = performance.now();
  if (!reply.body?.accepted) {
    console.error(`refused at round ${state.round}: ${reply.status} ${JSON.stringify(reply.body)} for ${JSON.stringify(action)}`);
    break;
  }
  const events = reply.body.events as { kind: string; unitId?: string }[];
  const row: Row = {
    round: state.round,
    what,
    idleS,
    ms: reply.ms,
    events: events.length,
    aiTurns: aiTurnsIn(events, humanUnit),
    bytes: reply.bytes,
    nodeMs,
    nodeEvents,
    status: reply.status,
  };
  rows.push(row);
  if (placing != null) {
    console.log(`${what}: ${fmt(reply.ms)} for ${events.length} events, ${row.aiTurns} AI turns; Node ${nodeMs!.toFixed(1)} ms for ${nodeEvents} events`);
  }
}
void lastRequestAt;

// -- The table ---------------------------------------------------------------

console.log('');
console.log(`${'round'.padStart(5)}  ${'request'.padEnd(26)} ${'idle'.padStart(5)} ${'ms'.padStart(7)} ${'events'.padStart(6)} ${'AI'.padStart(3)} ${'bytes'.padStart(7)} ${'Node ms'.padStart(8)}`);
for (const r of rows) {
  console.log(
    `${String(r.round).padStart(5)}  ${r.what.padEnd(26)} ${(r.idleS ? `${r.idleS}s` : '-').padStart(5)} ${r.ms.toFixed(0).padStart(7)} ${String(r.events).padStart(6)} ${String(r.aiTurns).padStart(3)} ${String(r.bytes).padStart(7)} ${r.nodeMs === null ? '' : r.nodeMs.toFixed(1).padStart(8)}`,
  );
}

const summary = (label: string, pick: (r: Row) => boolean) => {
  const xs = rows.filter(pick).map((r) => r.ms).sort((a, b) => a - b);
  if (xs.length === 0) return;
  const med = xs[Math.floor(xs.length / 2)]!;
  console.log(`${label.padEnd(44)} n=${String(xs.length).padStart(2)}  min ${xs[0]!.toFixed(0).padStart(5)}  median ${med.toFixed(0).padStart(5)}  max ${xs[xs.length - 1]!.toFixed(0).padStart(5)} ms`);
};
console.log('');
summary('place request after idle (boot + work)', (r) => r.what.startsWith('choosePlace') && r.idleS > 0);
summary('orders-only after idle (boot, no work)', (r) => r.what.startsWith('orders-only'));
summary('place request warm (work only)', (r) => r.what.startsWith('choosePlace') && r.idleS === 0);
summary('other actions, warm', (r) => !r.what.startsWith('choosePlace') && !r.what.startsWith('orders-only'));

if (!KEEP) {
  await service('DELETE', `/auth/v1/admin/users/${humanId}`);
  console.log('');
  console.log('cleaned up. Pass --keep to leave the match in the database.');
} else {
  console.log('');
  console.log(`kept. Remove it with: DELETE /auth/v1/admin/users/${humanId} (everything cascades)`);
}
