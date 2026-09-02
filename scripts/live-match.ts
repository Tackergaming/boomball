/**
 * Plays a whole match against the deployed `resolve-action`, over the network.
 *
 * This is the first thing that has ever exercised the Edge Function, and it is
 * deliberately end to end: a real auth user, a real JWT, a real project, and
 * every human turn sent as an HTTP request. Everything the client will do
 * except draw.
 *
 * The human seat is driven by `chooseAction`, the same brain the AI uses. Two
 * reasons rather than laziness. It sends every kind of action a player can send
 * instead of a stream of `endTurn`, so the function meets moves, passes, shots
 * and swings; and a match played by one brain on both sides is the same match
 * the balance sweeps play, so an outcome that looks wrong here is comparable to
 * something.
 *
 * The board is never held in this script between turns. Each iteration reads
 * `match_state` back **through RLS as the player**, which is the read path the
 * React client will use, so a policy that hides a snapshot from its own player
 * fails here rather than in the browser.
 *
 *     set -a && . ./.env && set +a          # from the workspace root
 *     node scripts/run-ts.mjs scripts/live-match.ts [--keep]
 *
 * Deletes the throwaway user and everything cascading off it when it is done.
 * `--keep` leaves the match in the database to be looked at, along with the
 * user it belongs to; the ids are printed either way.
 */

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { createMatch } from '../engine/setup.js';
import { isHuman, type MatchState } from '../engine/types.js';
import { chooseAction } from '../ai/chooseAction.js';
import { openSession } from '../server/session.js';

const URL_BASE = need('SUPABASE_BOOMBALL_URL');
const ANON = need('SUPABASE_BOOMBALL_ANON_KEY');
const SERVICE = need('SUPABASE_BOOMBALL_SERVICE_ROLE_KEY');
const KEEP = process.argv.includes('--keep');

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is missing. From the workspace root: set -a && . ./.env && set +a`);
    process.exit(1);
  }
  return value;
}

interface Reply {
  status: number;
  body: any;
}

async function call(
  method: string,
  path: string,
  token: string,
  options: { body?: unknown; key?: string; headers?: Record<string, string> } = {},
): Promise<Reply> {
  const response = await fetch(URL_BASE + path, {
    method,
    headers: {
      apikey: options.key ?? ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Spread rather than `body: undefined`, which `exactOptionalPropertyTypes`
    // refuses: an absent body and a body that is undefined are not the same.
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text.trim() ? JSON.parse(text) : null };
}

const service = (method: string, path: string, body?: unknown, headers?: Record<string, string>) =>
  call(method, path, SERVICE, { body, key: SERVICE, ...(headers ? { headers } : {}) });

function fail(what: string, reply: Reply): never {
  console.error(`${what}: ${reply.status} ${JSON.stringify(reply.body)}`);
  process.exit(1);
}

// -- A player, a team, a match ----------------------------------------------

const password = `boomball-live-${Math.random().toString(36).slice(2)}`;
const email = `live.${Math.random().toString(36).slice(2, 10)}@example.invalid`;

const created = await service('POST', '/auth/v1/admin/users', {
  email,
  password,
  email_confirm: true,
});
if (created.status >= 300) fail('could not create the player', created);
const humanId: string = created.body.id;

const signedIn = await call('POST', '/auth/v1/token?grant_type=password', ANON, {
  body: { email, password },
});
if (signedIn.status !== 200) fail('could not sign the player in', signedIn);
const jwt: string = signedIn.body.access_token;

const asPlayer = (method: string, path: string, body?: unknown, headers?: Record<string, string>) =>
  call(method, path, jwt, { ...(body === undefined ? {} : { body }), ...(headers ? { headers } : {}) });

const profile = await asPlayer('POST', '/rest/v1/profiles', {
  id: humanId,
  display_name: 'Bombast',
});
if (profile.status !== 201) fail('could not write the profile', profile);

const team = await asPlayer(
  'POST',
  '/rest/v1/teams',
  { owner: humanId, name: 'The Powder Kegs' },
  { Prefer: 'return=representation' },
);
if (team.status !== 201) fail('could not create the team', team);
const teamId: string = team.body[0].id;

// The engine builds the opening position; the database only ever stores what it
// produced. Nothing here decides anything about the game.
const arena = new Arena(KILL_SILO);
const seed = 5;
const fresh = createMatch({
  arena: KILL_SILO,
  tier: 'rookie',
  humans: [{ humanId, role: 'striker', name: 'Bombast' }],
  seed,
});
const opening = openSession(arena, fresh, Date.now());

const seat = opening.session.state.units.find(
  (unit) => unit.controller.kind === 'human' && unit.controller.humanId === humanId,
);
if (!seat) {
  console.error('the engine seated no human, which should be impossible');
  process.exit(1);
}

const match = await service(
  'POST',
  '/rest/v1/matches',
  {
    team_id: teamId,
    arena_id: KILL_SILO.id,
    tier: 'rookie',
    rng_seed: seed,
    phase: opening.session.state.phase,
    round: opening.session.state.round,
    turn_deadline: opening.session.turnDeadline
      ? new Date(opening.session.turnDeadline).toISOString()
      : null,
  },
  { Prefer: 'return=representation' },
);
if (match.status !== 201) fail('could not open the match', match);
const matchId: string = match.body[0].id;

const seated = await service('POST', '/rest/v1/match_participants', {
  match_id: matchId,
  unit_id: seat.id,
  profile_id: humanId,
  role: seat.role,
  character_name: seat.name,
});
if (seated.status !== 201) fail('could not seat the player', seated);

const openingRows = opening.events.map((event, i) => ({
  match_id: matchId,
  seq: i,
  kind: event.kind,
  payload: event,
}));
if (openingRows.length > 0) {
  const written = await service('POST', '/rest/v1/match_events', openingRows);
  if (written.status !== 201) fail('could not write the opening events', written);
}

const snapshot = await service('POST', '/rest/v1/match_state', {
  match_id: matchId,
  seq: openingRows.length - 1,
  snapshot: opening.session.state,
});
if (snapshot.status !== 201) fail('could not write the opening snapshot', snapshot);

console.log(`player   ${humanId}`);
console.log(`team     ${teamId}`);
console.log(`match    ${matchId}`);
console.log(`seat     ${seat.id}, ${seat.name} the ${seat.role}`);
console.log(`opening  ${openingRows.length} events, kick-off through to the first human decision`);
console.log('');

// -- The match ---------------------------------------------------------------

const functionUrl = `${URL_BASE}/functions/v1/resolve-action`;
let requests = 0;
let eventsFromFunction = 0;
let refusals = 0;
const goals: string[] = [];
const started = Date.now();

for (let turn = 0; turn < 400; turn += 1) {
  // Read the board back as the player. Not held in memory on purpose: this is
  // the client's own read path, through RLS.
  const read = await asPlayer(
    'GET',
    `/rest/v1/match_state?match_id=eq.${matchId}&select=seq,snapshot`,
  );
  if (read.status !== 200 || !read.body?.[0]) fail('the player cannot read the board', read);
  const state = read.body[0].snapshot as MatchState;

  if (state.phase === 'finished') break;
  if (!state.turn) {
    console.error('no turn is open and the match is not finished, which the engine should prevent');
    process.exit(1);
  }

  const onClock = state.units.find((unit) => unit.id === state.turn!.unitId);
  if (!onClock || !isHuman(onClock)) {
    console.error(
      `the board is waiting on ${state.turn.unitId}, which is not a human. ` +
        'The function should never hand back a board that is not on a human.',
    );
    process.exit(1);
  }

  const action = chooseAction(arena, state, onClock.id);

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ matchId, unitId: onClock.id, action }),
  });
  requests += 1;
  const reply = await response.json().catch(() => null);

  if (!reply?.accepted) {
    refusals += 1;
    console.error(`refused at request ${requests}: ${response.status} ${JSON.stringify(reply)}`);
    console.error(`the action was ${JSON.stringify(action)}`);
    process.exit(1);
  }

  eventsFromFunction += reply.events.length;
  for (const event of reply.events as { kind: string; team?: string }[]) {
    if (event.kind === 'goal' || event.kind === 'scored' || event.kind === 'sparkCaught') {
      goals.push(`${event.kind} ${event.team ?? ''}`.trim());
    }
  }
}

// -- What the database ended up holding --------------------------------------

const finalMatch = await asPlayer(
  'GET',
  `/rest/v1/matches?id=eq.${matchId}&select=phase,round,score_a,score_b,winner,is_draw,turn_deadline,finished_at`,
);
const finalState = await asPlayer(
  'GET',
  `/rest/v1/match_state?match_id=eq.${matchId}&select=seq`,
);
const events = await asPlayer(
  'GET',
  `/rest/v1/match_events?match_id=eq.${matchId}&select=seq&order=seq.asc`,
);

const row = finalMatch.body?.[0];
const seqs = (events.body ?? []).map((e: { seq: number }) => e.seq);
const gaps = seqs.filter((seq: number, i: number) => seq !== i);

console.log(`requests to the function   ${requests}`);
console.log(`events it handed back      ${eventsFromFunction}`);
console.log(`refusals                   ${refusals}`);
console.log(`elapsed                    ${((Date.now() - started) / 1000).toFixed(1)} s`);
console.log('');
console.log(`phase                      ${row?.phase}`);
console.log(`round                      ${row?.round}`);
console.log(`score                      A ${row?.score_a} - B ${row?.score_b}`);
console.log(`winner                     ${row?.winner ?? (row?.is_draw ? 'draw' : 'none')}`);
console.log(`finished_at                ${row?.finished_at ?? 'null'}`);
console.log(`turn_deadline              ${row?.turn_deadline ?? 'null'}`);
console.log('');
console.log(`events in the table        ${seqs.length}`);
console.log(`snapshot seq               ${finalState.body?.[0]?.seq}`);
console.log(`gaps in the sequence       ${gaps.length === 0 ? 'none' : gaps.join(', ')}`);
if (goals.length > 0) console.log(`scoring events             ${goals.join(', ')}`);

const complaints: string[] = [];
if (row?.phase !== 'finished') complaints.push('the match did not finish');
if (gaps.length > 0) complaints.push('the event sequence has gaps');
if (seqs.length !== openingRows.length + eventsFromFunction) {
  complaints.push(
    `the table holds ${seqs.length} events but ${openingRows.length + eventsFromFunction} were produced`,
  );
}
if (finalState.body?.[0]?.seq !== seqs.length - 1) {
  complaints.push('the snapshot does not point at the last event');
}
if (row?.turn_deadline !== null) complaints.push('a finished match still has a turn clock running');

if (!KEEP) {
  await service('DELETE', `/auth/v1/admin/users/${humanId}`);
  console.log('');
  console.log('cleaned up. Pass --keep to leave the match in the database.');
} else {
  console.log('');
  console.log(`kept. Remove it with: DELETE /auth/v1/admin/users/${humanId} (everything cascades)`);
}

console.log('');
if (complaints.length === 0) {
  console.log('A full match played through the deployed function, and the database agrees with it.');
} else {
  for (const complaint of complaints) console.log(`PROBLEM: ${complaint}`);
  process.exit(1);
}
