/**
 * `create-match`, the door that opens a match.
 *
 * The second Edge Function, and the architecture said there would be one. The
 * reason there are two is the same reason there are no write policies on the
 * match tables: opening a match writes to `matches`, `match_participants`,
 * `match_events` and `match_state`, and a browser can write to none of them and
 * should not be able to. `scripts/live-match.ts` gets away with the service
 * role key because it is a script on a trusted machine; a lobby in a browser
 * never sees that key, so it needs a door.
 *
 * Like `resolve-action`, it decides nothing. `server/lobby.ts` refuses the
 * malformed parties and plays the kick-off; this file loads, writes, and
 * answers. If you are about to add an `if` about the sport here, it belongs
 * there.
 *
 *   POST { teamId, seats: [{ profileId, role, characterName? }], arenaId? }
 *     -> { accepted: true, matchId, fromSeq, events, serverNow }
 *      | { accepted: false, reason }
 *
 * **Two fields the client does not get to send.** The Tier is read off the
 * team's generated column, and the seed is made here. Both are stated at length
 * in `server/lobby.ts`; the short version is that a client choosing either one
 * is a client cheating.
 *
 * Deno, not Node, and deployed as the esbuild bundle rather than as this file:
 * see `scripts/build-edge-function.mjs` for why. Editing this file changes
 * nothing until `npm run deploy:function` runs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

import { CORS_HEADERS, preflight } from '../_shared/cors.ts';
import { ENGINE_VERSION } from '../../../engine/constants.ts';
import { Rng } from '../../../engine/rng.ts';
import { drawRoster, type Roster } from '../../../engine/setup.ts';
import { isTier, tierAllowed, type Tier } from '../../../engine/stats.ts';
import { toArenaSpec } from '../../../server/arenaRow.ts';
import { openLobbyMatch, type SeatRequest } from '../../../server/lobby.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

function refuse(reason: string, status = 400): Response {
  return reply({ accepted: false, reason }, status);
}

/** A uint32, which is exactly what `Rng` narrows anything to anyway. */
function freshSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

Deno.serve(async (request: Request): Promise<Response> => {
  // Before anything, including the method check: an OPTIONS here is a browser
  // asking permission, not a caller using the wrong verb.
  const preflighted = preflight(request);
  if (preflighted) return preflighted;

  if (request.method !== 'POST') return refuse('POST only', 405);

  // Identity from the JWT, never from the body. Same rule as `resolve-action`:
  // a client that could name itself could open matches for other people.
  const authorization = request.headers.get('Authorization') ?? '';
  const asUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: auth } = await asUser.auth.getUser();
  const callerId = auth?.user?.id;
  if (!callerId) return refuse('not signed in', 401);

  let body: { teamId?: string; seats?: unknown; arenaId?: string; tier?: unknown };
  try {
    body = await request.json();
  } catch {
    return refuse('the body is not JSON');
  }

  const { teamId, arenaId = 'kill-silo' } = body;
  if (!teamId) return refuse('teamId is required');
  if (!Array.isArray(body.seats)) return refuse('seats must be an array');
  const seats = body.seats as SeatRequest[];

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // The battery's Tier comes from here and nowhere else. Since 2H.27 (`00`
  // C28) the client may ask to play at it or below it, never above: a Rookie
  // battery still cannot field Star in its first match. Absent, the match is
  // played at the battery's Tier, as it always was.
  const { data: team } = await db
    .from('teams')
    .select('id, owner, tier, roster')
    .eq('id', teamId)
    .single();
  if (!team) return refuse('no such team', 404);
  const reached = team.tier as Tier;
  if (body.tier !== undefined && !isTier(body.tier)) return refuse('there is no such league');
  const tier: Tier = body.tier === undefined ? reached : body.tier;
  if (!tierAllowed(tier, reached)) return refuse(`your battery has not reached ${tier}`, 403);

  // Everyone taking a seat must belong to the team, the caller included. Read
  // the membership once and answer both questions from it.
  const { data: membership } = await db
    .from('team_members')
    .select('profile_id')
    .eq('team_id', teamId);
  const members = new Set<string>((membership ?? []).map((row) => row.profile_id as string));
  members.add(team.owner as string);

  if (!members.has(callerId)) return refuse('you are not on this team', 403);
  for (const seat of seats) {
    if (!seat || !members.has(seat.profileId)) {
      return refuse(`${seat?.profileId ?? 'that player'} is not on this team`, 403);
    }
  }

  // One live match per team. Without this a double-clicked lobby button opens
  // two matches, and the second silently becomes the one the client watches
  // while the first sits unfinished forever. A match left open by an earlier
  // engine does not count: it is archived, nobody can play it, and it must not
  // lock the team out of the game (audit line A11). Nor does an abandoned one
  // (2H.28, `00` C29): leaving a match is exactly how a new one gets opened.
  const { data: running } = await db
    .from('matches')
    .select('id')
    .eq('team_id', teamId)
    .neq('phase', 'finished')
    .is('abandoned_at', null)
    .eq('engine_version', ENGINE_VERSION)
    .limit(1);
  if (running && running.length > 0) {
    return refuse('this team already has a match running', 409);
  }

  const { data: arenaRow } = await db.from('arenas').select('*').eq('id', arenaId).single();
  if (!arenaRow) return refuse(`there is no arena called ${arenaId}`, 404);

  const seed = freshSeed();

  // The battery's standing names (2H.29, `00` C30 point 3): drawn once, at
  // its first match, off this match's seed and away from the humans' own
  // names, then written and never touched again. A write that fails is not
  // fatal: the match is still fielded with these names, the next match draws
  // again, and the roster settles the first time the write goes through.
  let roster = (team.roster as Roster | null) ?? null;
  if (!roster) {
    roster = drawRoster(new Rng(seed), seats.map((seat) => seat.characterName ?? ''));
    const { error: rosterError } = await db.from('teams').update({ roster }).eq('id', teamId).is('roster', null);
    if (rosterError) console.warn('the roster was not saved', rosterError);
  }

  const opened = openLobbyMatch(toArenaSpec(arenaRow), {
    callerId,
    tier,
    seats,
    seed,
    now: Date.now(),
    roster,
  });
  if (!opened.ok) return refuse(opened.reason);

  const { session, events, seats: assigned, kickoff } = opened.opening;
  const state = session.state;

  const { data: created, error: createError } = await db
    .from('matches')
    .insert({
      team_id: teamId,
      arena_id: arenaId,
      // The Tier played, which `resolve-action` compares to the battery's at
      // full time: a win below it is a win, not a rung (C28 point 2).
      tier,
      phase: state.phase,
      round: state.round,
      rng_seed: seed,
      turn_deadline: session.turnDeadline ? new Date(session.turnDeadline).toISOString() : null,
      // Stamped at birth, so `resolve-action` can refuse this match the day the
      // engine moves on, instead of replaying a snapshot it cannot read.
      engine_version: ENGINE_VERSION,
      // The board before the house played its opening, and the sequence number
      // the opening ends on, so a client loading the match fresh can watch the
      // house get into place instead of finding it there (migration 0007).
      kickoff: { state: kickoff, lastSeq: events.length - 1 },
    })
    .select('id')
    .single();
  if (createError || !created) return refuse('could not open the match', 500);

  const matchId = created.id as string;

  // Everything after this point has a half-written match behind it, so a
  // failure tears the match down rather than leaving one the client can find
  // but `resolve-action` cannot load. The delete cascades to all three tables.
  const written = await Promise.all([
    db.from('match_participants').insert(
      assigned.map((seat) => ({
        match_id: matchId,
        unit_id: seat.unitId,
        profile_id: seat.profileId,
        role: seat.role,
        character_name: seat.characterName,
      })),
    ),
    db.from('match_events').insert(
      events.map((event, i) => ({
        match_id: matchId,
        seq: i,
        kind: event.kind,
        payload: event,
      })),
    ),
    db.from('match_state').insert({
      match_id: matchId,
      seq: events.length - 1,
      snapshot: state,
    }),
  ]);

  const failed = written.find((result) => result.error);
  if (failed) {
    await db.from('matches').delete().eq('id', matchId);
    return refuse(`could not open the match: ${failed.error!.message}`, 500);
  }

  // The same batch the caller gets back, so a team-mate already watching the
  // lobby sees the kick-off without polling.
  await db.channel(`match:${matchId}`).send({
    type: 'broadcast',
    event: 'events',
    payload: { matchId, fromSeq: 0, events },
  });

  // `serverNow` rides along for the same reason it does on `resolve-action`:
  // the turn deadline is the server's clock, and a browser has to know how far
  // its own is out before it can count anything down against it.
  return reply({ accepted: true, matchId, fromSeq: 0, events, serverNow: Date.now() });
});
