/**
 * `resolve-action`, the one write door of a live match.
 *
 * Deno, not Node: this file runs on Supabase Edge and is typechecked by the
 * Supabase CLI, not by the project's `tsc`. That is why it is the only place in
 * the repo with URL imports.
 *
 * **NOT YET RUN ANYWHERE.** It is written, it is not deployed, and one known
 * obstacle stands between the two. The engine imports its own modules as
 * `./types.js` while the files on disk are `.ts`, which is the TypeScript
 * convention the rest of the repo is built on and which **Deno does not
 * resolve**. Before this deploys, `engine`, `ai` and `server` have to be
 * bundled into one ESM file by esbuild and imported here as that bundle. That
 * is a build step to add, not a rewrite: nothing about the code below changes.
 *
 * It holds no logic of its own. Everything that decides anything lives in
 * `server/session.ts`, which is pure and tested; this file loads, calls, writes
 * and broadcasts. If you find yourself about to add an `if` about the game
 * here, it belongs in the session layer or in the engine.
 *
 * The shape of a request and a reply is fixed by docs/02-architecture.md:
 *
 *   POST { matchId, unitId, action }
 *     -> { accepted: true, fromSeq, events }
 *      | { accepted: false, reason }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

import { Arena, type ArenaSpec } from '../../../engine/arena.ts';
import type { Action } from '../../../engine/actions.ts';
import type { MatchState } from '../../../engine/types.ts';
import {
  expireIfDue,
  submitAction,
  type Session,
  type SessionStep,
} from '../../../server/session.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function refuse(reason: string, status = 400): Response {
  return reply({ accepted: false, reason }, status);
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refuse('POST only', 405);

  // The caller's own token, so `auth.getUser` tells us who they really are.
  // Identity comes from the JWT and never from the request body: a client that
  // could name itself could play somebody else's Giff.
  const authorization = request.headers.get('Authorization') ?? '';
  const asUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: auth } = await asUser.auth.getUser();
  const humanId = auth?.user?.id;
  if (!humanId) return refuse('not signed in', 401);

  let body: { matchId?: string; unitId?: string; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return refuse('the body is not JSON');
  }

  const { matchId, unitId, action } = body;
  if (!matchId || !unitId || !action) return refuse('matchId, unitId and action are required');

  // The service role client does the writing. RLS has no write policy on the
  // match tables at all, so this function is the only path that can append an
  // event, which is the point of it existing.
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const [{ data: snapshot, error: snapshotError }, { data: match }] = await Promise.all([
    db.from('match_state').select('seq, snapshot').eq('match_id', matchId).single(),
    db.from('matches').select('arena_id, turn_deadline').eq('id', matchId).single(),
  ]);
  if (snapshotError || !snapshot || !match) return refuse('no such match', 404);

  // The caller must be in this match. Read through `match_participants` rather
  // than trusting the unit id in the body.
  const { data: seat } = await db
    .from('match_participants')
    .select('unit_id')
    .eq('match_id', matchId)
    .eq('profile_id', humanId)
    .single();
  if (!seat) return refuse('you are not in this match', 403);

  const { data: arenaRow } = await db
    .from('arenas')
    .select('*')
    .eq('id', match.arena_id)
    .single();
  if (!arenaRow) return refuse('the match names an arena that is not loaded', 500);

  const arena = new Arena(toArenaSpec(arenaRow));
  const session: Session = {
    state: snapshot.snapshot as MatchState,
    turnDeadline: match.turn_deadline ? Date.parse(match.turn_deadline) : null,
  };

  const now = Date.now();

  // A turn that ran out while nobody was looking is settled by whoever knocks
  // next, which is what stops a sleeping laptop freezing the other two players.
  const overdue = expireIfDue(arena, session, now);
  const current = overdue ? overdue.session : session;
  const carried = overdue ? [...overdue.events] : [];

  const result = submitAction(
    arena,
    current,
    { humanId, unitId, action: action as Action },
    now,
  );
  if (!result.ok) {
    // The expiry still happened and still has to be persisted, or the match
    // would replay it on the next request and drift from its own event log.
    if (overdue) await persist(db, matchId, snapshot.seq, overdue, carried);
    return refuse(result.reason);
  }

  const step: SessionStep = {
    session: result.step.session,
    events: [...carried, ...result.step.events],
  };

  const fromSeq = snapshot.seq + 1;
  await persist(db, matchId, snapshot.seq, step, step.events);

  // Realtime carries the same batch the caller gets back, so the other two
  // clients and the acting one converge on one sequence of events.
  await db.channel(`match:${matchId}`).send({
    type: 'broadcast',
    event: 'events',
    payload: { fromSeq, events: step.events },
  });

  return reply({ accepted: true, fromSeq, events: step.events });
});

/**
 * Appends the batch and refreshes the cache.
 *
 * `match_events` is the truth and `match_state` is only a cache, so the events
 * go in first: a crash between the two leaves a snapshot that is merely behind,
 * which the next read rebuilds, rather than a snapshot ahead of its own history.
 */
async function persist(
  db: ReturnType<typeof createClient>,
  matchId: string,
  lastSeq: number,
  step: SessionStep,
  events: readonly unknown[],
): Promise<void> {
  const rows = events.map((event, i) => ({
    match_id: matchId,
    seq: lastSeq + 1 + i,
    kind: (event as { kind: string }).kind,
    payload: event,
  }));

  if (rows.length > 0) await db.from('match_events').insert(rows);

  const state = step.session.state;
  await db.from('match_state').upsert({
    match_id: matchId,
    seq: lastSeq + rows.length,
    snapshot: state,
    updated_at: new Date().toISOString(),
  });

  await db
    .from('matches')
    .update({
      phase: state.phase,
      round: state.round,
      score_a: state.score.A,
      score_b: state.score.B,
      turn_deadline: step.session.turnDeadline
        ? new Date(step.session.turnDeadline).toISOString()
        : null,
      winner: state.result && state.result.winner !== 'draw' ? state.result.winner : null,
      is_draw: state.result?.winner === 'draw',
      finished_at: state.phase === 'finished' ? new Date().toISOString() : null,
    })
    .eq('id', matchId);
}

/** The arena row back into the engine's own shape. */
function toArenaSpec(row: Record<string, unknown>): ArenaSpec {
  return {
    id: row.id as string,
    name: row.name as string,
    rows: row.layout as string[],
    furnaces: row.furnaces as ArenaSpec['furnaces'],
    ordnanceStart: row.ordnance_start as ArenaSpec['ordnanceStart'],
    starts: row.starts as ArenaSpec['starts'],
    substituteEntry: row.substitute_entry as ArenaSpec['substituteEntry'],
    art: row.art as ArenaSpec['art'],
  };
}
