/**
 * `resolve-action`, the one write door of a live match.
 *
 * Deno, not Node: this file runs on Supabase Edge, which is why it is one of
 * the two places in the repo with URL imports.
 *
 * **It is not this file that gets deployed.** The engine imports its own
 * modules as `./types.js` while the files on disk are `.ts`, and Deno does not
 * resolve that; esbuild does. So `npm run deploy:function` bundles this into
 * `dist/index.js` and deploys the bundle. Editing here changes nothing until
 * that runs. See `scripts/build-edge-function.mjs` for the whole of it.
 *
 * It holds no logic of its own. Everything that decides anything lives in
 * `server/session.ts`, which is pure and tested; this file loads, calls, writes
 * and broadcasts. If you find yourself about to add an `if` about the game
 * here, it belongs in the session layer or in the engine.
 *
 * The shape of a request and a reply is fixed by docs/02-architecture.md:
 *
 *   POST { matchId, unitId, action, orders? }
 *   POST { matchId, orders }                    // orders only, nothing played
 *     -> { accepted: true, fromSeq, events, serverNow, expired? }
 *      | { accepted: false, reason }
 *
 * **Orders are not actions and cost nothing.** They are standing instructions
 * to AI team-mates, validated here and kept on the match row; they bias what
 * the AI chooses to send through the door and the engine never sees them. A
 * request may carry only orders, in which case nothing is played and no turn is
 * spent: calling for the ball must not cost the turn you were calling for it
 * with.
 *
 * `serverNow` goes back on every reply so a browser can tell how far its own
 * clock is out, because a turn deadline is the server's number and comparing it
 * to a local `Date.now()` costs a player their turn on any machine that drifts.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.113.0';

import { CORS_HEADERS, preflight } from '../_shared/cors.ts';
import type { AllyOrder } from '../../../ai/orders.ts';
import { Arena } from '../../../engine/arena.ts';
import { isActionShaped, type Action } from '../../../engine/actions.ts';
import type { MatchState } from '../../../engine/types.ts';
import { toArenaSpec } from '../../../server/arenaRow.ts';
import { isMovedOn, matchColumns, MOVED_ON } from '../../../server/persist.ts';
import {
  engineVersionRefusal,
  serveAction,
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
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

function refuse(reason: string, status = 400): Response {
  return reply({ accepted: false, reason }, status);
}

Deno.serve(async (request: Request): Promise<Response> => {
  // Before anything, including the method check: an OPTIONS here is a browser
  // asking permission, not a caller using the wrong verb.
  const preflighted = preflight(request);
  if (preflighted) return preflighted;

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

  let body: { matchId?: string; unitId?: string; action?: unknown; orders?: unknown };
  try {
    body = await request.json();
  } catch {
    return refuse('the body is not JSON');
  }

  const { matchId, unitId, action } = body;
  const ordersOnly = !action && Array.isArray(body.orders);
  if (!matchId) return refuse('matchId is required');
  if (!ordersOnly && (!unitId || !action)) {
    return refuse('matchId, unitId and action are required');
  }
  // The shape of the action is checked here, at the door, and its content by
  // the engine (2H.37, security review M2). Before this an unknown `kind` fell
  // through `reduce` to a 500, and the engine took the fields as typed: a
  // half-cell path walked through walls (see `validatePath`).
  if (!ordersOnly && !isActionShaped(action)) {
    return refuse('action must be an object with a known kind');
  }

  // The service role client does the writing. RLS has no write policy on the
  // match tables at all, so this function is the only path that can append an
  // event, which is the point of it existing.
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const [{ data: snapshot, error: snapshotError }, { data: match }] = await Promise.all([
    db.from('match_state').select('seq, snapshot').eq('match_id', matchId).single(),
    db
      .from('matches')
      .select('arena_id, turn_deadline, team_id, orders, engine_version, tier, abandoned_at')
      .eq('id', matchId)
      .single(),
  ]);
  if (snapshotError || !snapshot || !match) return refuse('no such match', 404);

  // Before anything is loaded into the engine: a snapshot written by another
  // engine is not a board this one can read (audit line A11).
  const archived = engineVersionRefusal(match.engine_version as number | null);
  if (archived) return refuse(archived, 409);
  // An abandoned match (2H.28, `00` C29) is over without a result: nothing
  // may be written to it, including an action that was in flight when the
  // owner left.
  if (match.abandoned_at) return refuse('this match was abandoned', 409);

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
  const state = snapshot.snapshot as MatchState;
  const session: Session = {
    state,
    turnDeadline: match.turn_deadline ? Date.parse(match.turn_deadline) : null,
  };

  const now = Date.now();

  // Standing orders, plus whatever this request adds. Validated against the
  // board rather than trusted: a client that could order any unit could order
  // the house's Bulwark out of its own Furnace mouth.
  const standing = (match.orders ?? []) as AllyOrder[];
  const incoming = Array.isArray(body.orders) ? body.orders : [];
  const added: AllyOrder[] = [];
  for (const raw of incoming) {
    const one = validOrder(raw, state, seat.unit_id as string);
    if (!one) return refuse('that order is not yours to give');
    added.push(one);
  }
  const addressed = new Set(added.map((one) => one.to));
  const orders = [...standing.filter((existing) => !addressed.has(existing.to)), ...added];

  // Orders on their own change no board and spend no turn. Written, echoed
  // back, and that is the whole request.
  if (ordersOnly) {
    await db.from('matches').update({ orders }).eq('id', matchId);
    return reply({ accepted: true, fromSeq: snapshot.seq + 1, events: [], serverNow: Date.now() });
  }

  // A turn that ran out while nobody was looking is settled by whoever knocks
  // next, which is what stops a sleeping laptop freezing the other two players.
  // **When it was overdue, the action is not played** (audit line A28): the
  // expiry is what happened, and the player sees it marked `expired` rather
  // than finding their late click applied to a turn they had never seen. An
  // action that arrives after the clock is late, not illegal, so the reply is
  // still `accepted`: answering a refusal here would put "it is not your turn"
  // on screen for a turn the server itself just took away. This is also the
  // reply to a client knocking on purpose to have its own expiry settled.
  const served = serveAction(
    arena,
    session,
    { humanId, unitId, action: action as Action },
    now,
    orders,
  );
  if (!served.ok) return refuse(served.reason);

  const step: SessionStep = served.step;
  const fromSeq = snapshot.seq + 1;
  // A call for the ball lasts until the caller's next turn opens (2H.13,
  // `00` C15 point 6, Jérôme on 2026-10-14). It stood for the whole match
  // before, pulling throws towards a player who had called in round 2. The
  // AI that just played read it; what is written back drops every call whose
  // receiver's turn started in this batch, except one given in this very
  // request, which is meant for the turns to come.
  const opened = new Set(
    step.events
      .filter((event) => (event as { kind: string }).kind === 'turnStarted')
      .map((event) => (event as { unitId: string }).unitId),
  );
  const standingOrders = orders.filter(
    (order) => !(order.kind === 'callForPass' && opened.has(order.receiverId) && !added.includes(order)),
  );
  // One transaction, one round trip (2H.31, audit line A10). A step that lost
  // the race to another client's step is refused here, before anything else
  // is written or broadcast: the loser reads the board again and plays from it.
  const written = await persist(db, matchId, snapshot.seq, step, standingOrders, now);
  if (!written.ok) return refuse(written.reason, written.status);
  await recordResult(db, match.team_id as string, match.tier as string, state, step.session.state);

  // Realtime carries the same batch the caller gets back, so the other two
  // clients and the acting one converge on one sequence of events. Private
  // channel since 2H.37 (migration 0015): REST with the service key, which
  // RLS does not read; a failed broadcast never fails a step already written.
  try {
    await db.channel(`match:${matchId}`, { config: { private: true } }).httpSend('events', {
      fromSeq,
      events: step.events,
    });
  } catch (failure) {
    console.error('the step could not be broadcast', failure);
  }

  return reply({
    accepted: true,
    fromSeq,
    events: step.events,
    ...(served.expired ? { expired: true } : {}),
    serverNow: now,
  });
});

/**
 * An order is only an order if it is yours to give.
 *
 * Three checks and none of them is a rule of the sport: the shape is one this
 * client knows, the addressee is a team-mate on the caller's own side, and it
 * is not the caller's own unit, which takes no orders because a human drives it.
 * Anything else comes back null and the request is refused rather than quietly
 * ignored, because an order silently dropped looks exactly like an AI that will
 * not pass.
 */
function validOrder(raw: unknown, state: MatchState, ownUnitId: string): AllyOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const order = raw as { kind?: string; to?: string; receiverId?: string; targetId?: string };
  if (typeof order.to !== 'string') return null;

  const mine = state.units.find((unit) => unit.id === ownUnitId);
  const addressee = state.units.find((unit) => unit.id === order.to);
  if (!mine || !addressee) return null;
  if (addressee.team !== mine.team) return null;
  if (addressee.id === mine.id) return null;

  if (order.kind === 'callForPass') {
    const receiver = state.units.find((unit) => unit.id === order.receiverId);
    if (!receiver || receiver.team !== mine.team) return null;
    return { kind: 'callForPass', to: addressee.id, receiverId: receiver.id };
  }
  if (order.kind === 'markTarget') {
    const target = state.units.find((unit) => unit.id === order.targetId);
    if (!target || target.team === mine.team) return null;
    return { kind: 'markTarget', to: addressee.id, targetId: target.id };
  }
  return null;
}

/**
 * A finished match that was won moves the team up the ladder.
 *
 * **Nothing did this**, which is how Jérôme won a match and watched his win
 * counter stay at zero: `teams.wins` was written by no code anywhere, and the
 * Tier is generated from it, so no battery could ever leave Rookie.
 *
 * Only on the transition. `before` is the board as it was loaded and `after` is
 * the board this request produced, so a match that was already finished when
 * the request arrived records nothing, however many requests arrive.
 */
async function recordResult(
  db: ReturnType<typeof createClient>,
  teamId: string,
  matchTier: string,
  before: MatchState,
  after: MatchState,
): Promise<void> {
  if (before.phase === 'finished' || after.phase !== 'finished') return;
  // The human side is always A: `create-match` seats every human there.
  if (after.result?.winner !== 'A') return;
  // A win counts only at the battery's own Tier (2H.27, `00` C28 point 2,
  // Jérôme: a win below it is a win, not a rung). The battery's Tier is read
  // now, not at kick-off: it is what the ladder stands at when the whistle
  // blows that matters. One read, at full time only.
  const { data: team } = await db.from('teams').select('tier').eq('id', teamId).single();
  if (team && team.tier !== matchTier) return;
  await db.rpc('record_team_win', { team: teamId });
}

/**
 * Appends the batch and refreshes the cache, in one transaction.
 *
 * Until 2H.31 this was three requests in a row with no transaction and no
 * check on `seq` (audit line A10): fine while one client wrote, wrong the day
 * two did. The SQL function `append_match_step` (migration 0010) locks the
 * `match_state` row, refuses when `seq` is no longer `lastSeq`, then writes
 * the events, the snapshot and the match row together. The events still go in
 * first inside it, for the reason that always held: `match_events` is the
 * truth and `match_state` only a cache.
 *
 * A refusal for the race comes back as a 409 the client reads like any
 * refusal; any other failure is a 500 with the database's own words.
 */
async function persist(
  db: ReturnType<typeof createClient>,
  matchId: string,
  lastSeq: number,
  step: SessionStep,
  orders: readonly AllyOrder[],
  now: number,
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const { error } = await db.rpc('append_match_step', {
    p_match: matchId,
    p_expected_seq: lastSeq,
    p_events: step.events,
    p_snapshot: step.session.state,
    p_columns: matchColumns(step, orders, now),
  });
  if (!error) return { ok: true };
  if (isMovedOn(error.message)) return { ok: false, reason: MOVED_ON, status: 409 };
  return { ok: false, reason: `the step could not be written: ${error.message}`, status: 500 };
}
