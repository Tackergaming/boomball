/**
 * Plays a whole match against the deployed functions, over the network.
 *
 * Deliberately end to end: a real auth user, a real JWT, a real project, the
 * match opened through `create-match` and every human turn sent to
 * `resolve-action` as an HTTP request. Everything the client will do except
 * draw. It is the closest thing the project has to the phase 5 playtest until
 * there is an interface to play it in.
 *
 * **It takes no shortcut it would not be allowed in a browser.** The script
 * holds the service role key and could write the four match tables itself, but
 * a browser never will, so it uses it for exactly two things: creating the
 * throwaway auth user, which is an admin act by nature, and deleting it
 * afterwards. Everything between those two goes through RLS or through a
 * function.
 *
 * The seed is made server-side by `create-match`, so **two runs are two
 * different matches**. That is the correct behaviour and it costs this script
 * its determinism check; the byte-for-byte claim is covered where it belongs,
 * in `ai.test.ts` and `session.test.ts`, at a fixed seed.
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
import { isHuman, type MatchState } from '../engine/types.js';
import { chooseAction } from '../ai/chooseAction.js';

// The one thing the script still holds locally. `chooseAction` needs an arena
// to reason about, and it is the same terrain the database serves: the seed is
// generated from `KILL_SILO`, and `server/arenaRow.test.ts` holds the round
// trip. Reading it back over HTTP every turn would prove nothing extra.
const arena = new Arena(KILL_SILO);

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

// The roster row the lobby writes. Not needed for the owner, who is a member by
// definition, but it is the row a real lobby keeps the chosen role in.
const enrolled = await asPlayer('POST', '/rest/v1/team_members', {
  team_id: teamId,
  profile_id: humanId,
  preferred_role: 'striker',
  character_name: 'Bombast',
});
if (enrolled.status !== 201) fail('could not join the team', enrolled);

// -- Opening the match, through the door ------------------------------------
//
// Everything below goes through `create-match`. The script holds the service
// role key and could write these four tables itself, but a browser cannot and
// never will, so a script that took the shortcut would be proving the wrong
// thing.

const createUrl = `${URL_BASE}/functions/v1/create-match`;

async function createMatchAs(token: string, payload: unknown): Promise<Reply> {
  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  return { status: response.status, body: text.trim() ? JSON.parse(text) : null };
}

const opened = await createMatchAs(jwt, {
  teamId,
  seats: [{ profileId: humanId, role: 'striker', characterName: 'Bombast' }],
});
if (!opened.body?.accepted) fail('create-match refused the party', opened);

const matchId: string = opened.body.matchId;
const openingEvents: number = opened.body.events.length;

// The seat the engine handed out, read back the way the client will read it.
const seatRow = await asPlayer(
  'GET',
  `/rest/v1/match_participants?match_id=eq.${matchId}&select=unit_id,role,character_name`,
);
if (seatRow.status !== 200 || !seatRow.body?.[0]) fail('the player cannot read their seat', seatRow);
const seat = seatRow.body[0];

console.log(`player   ${humanId}`);
console.log(`team     ${teamId}`);
console.log(`match    ${matchId}`);
console.log(`seat     ${seat.unit_id}, ${seat.character_name} the ${seat.role}`);
console.log(`opening  ${openingEvents} events, kick-off through to the first human decision`);
console.log('');

// -- What the door refuses ---------------------------------------------------
//
// The unit tests in `server/lobby.test.ts` cover the refusals as logic. These
// three cover them as a deployed function, which is a different claim: they
// prove the guards survived the bundle and that the ones the lobby layer does
// not know about, team membership and the one-match rule, are wired up.

const second = await createMatchAs(jwt, {
  teamId,
  seats: [{ profileId: humanId, role: 'striker', characterName: 'Bombast' }],
});
console.log(`second match while one runs   ${second.status} ${second.body?.reason ?? 'ACCEPTED'}`);

const stranger = await createMatchAs(jwt, {
  teamId,
  seats: [{ profileId: '00000000-0000-0000-0000-000000000000', role: 'breaker' }],
});
console.log(`a seat for a non-member       ${stranger.status} ${stranger.body?.reason ?? 'ACCEPTED'}`);

const unsigned = await createMatchAs(ANON, { teamId, seats: [] });
console.log(`no player token               ${unsigned.status} ${unsigned.body?.reason ?? 'ACCEPTED'}`);
console.log('');

const doorHolds =
  second.status === 409 && stranger.status === 403 && unsigned.status === 401;

// -- The match ---------------------------------------------------------------

const functionUrl = `${URL_BASE}/functions/v1/resolve-action`;
let requests = 0;
let eventsFromFunction = 0;
let refusals = 0;
// `scored` is the only event that moves the scoreboard, and it carries its own
// points: 10 for a goal, 50 for the Spark. `sparkCaught` fires on every attempt,
// hit or miss, so counting it as a score reads two misses as two captures.
const scored: { team: string; points: number }[] = [];
let sparkAttempts = 0;
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
  for (const event of reply.events as { kind: string; team?: string; points?: number }[]) {
    if (event.kind === 'scored') scored.push({ team: event.team!, points: event.points! });
    if (event.kind === 'sparkCaught') sparkAttempts += 1;
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
const goalsOf = (team: string) => scored.filter((s) => s.team === team && s.points === 10).length;
const sparksOf = (team: string) => scored.filter((s) => s.team === team && s.points === 50).length;
console.log(
  `goals                      A ${goalsOf('A')}, B ${goalsOf('B')}`,
);
console.log(
  `Sparks                     ${sparkAttempts} attempt${sparkAttempts === 1 ? '' : 's'}, ` +
    `caught A ${sparksOf('A')}, B ${sparksOf('B')}`,
);

const complaints: string[] = [];
if (row?.phase !== 'finished') complaints.push('the match did not finish');
if (gaps.length > 0) complaints.push('the event sequence has gaps');
if (seqs.length !== openingEvents + eventsFromFunction) {
  complaints.push(
    `the table holds ${seqs.length} events but ${openingEvents + eventsFromFunction} were produced`,
  );
}
if (!doorHolds) complaints.push('create-match let through something it should have refused');
if (finalState.body?.[0]?.seq !== seqs.length - 1) {
  complaints.push('the snapshot does not point at the last event');
}
if (row?.turn_deadline !== null) complaints.push('a finished match still has a turn clock running');
for (const team of ['A', 'B'] as const) {
  const fromEvents = scored
    .filter((entry) => entry.team === team)
    .reduce((total, entry) => total + entry.points, 0);
  const onTheRow = team === 'A' ? row?.score_a : row?.score_b;
  if (fromEvents !== onTheRow) {
    complaints.push(`team ${team} scored ${fromEvents} by the events but the row says ${onTheRow}`);
  }
}

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
