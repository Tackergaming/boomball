/**
 * The one Supabase client, and the two functions the client is allowed to call.
 *
 * The anon key travels to the browser, which is what it is for: every table is
 * behind Row Level Security and the match tables have no write policy at all,
 * so a key in a bundle grants a reader exactly what a signed-in player is
 * meant to see. The service role key exists only inside the Edge Functions.
 *
 * Nothing in this file decides anything about the sport. `createMatch` and
 * `submitAction` post an intention and hand back what the server says; if a
 * refusal needs interpreting, it is interpreted where it is displayed.
 */

import { createClient } from '@supabase/supabase-js';

import type { AllyOrder } from '../../../ai/orders.js';
import type { Action } from '../../../engine/actions.js';
import type { MatchEvent } from '../../../engine/events.js';
import type { Role, Tier } from '../../../engine/stats.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Copy .env.example to .env.local.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/**
 * A refusal. `unreachable` marks the one kind that is not an answer at all:
 * the browser rejected the request before any reply, so the server may or
 * may not have seen it (C21).
 */
export type Refused = { accepted: false; reason: string; unreachable?: true };

export type CreateMatchReply =
  | {
      accepted: true;
      matchId: string;
      fromSeq: number;
      events: MatchEvent[];
      /** The server's own clock, for working out how far this browser's is out. */
      serverNow?: number;
    }
  | Refused;

export type ResolveActionReply =
  | {
      accepted: true;
      fromSeq: number;
      events: MatchEvent[];
      /**
       * Set when the turn clock ran out before this action arrived. The server
       * spent the turn in Dodge and moved play on, so the action was late
       * rather than illegal, and the events are the expiry it settled.
       */
      expired?: boolean;
      /** The server's own clock, for working out how far this browser's is out. */
      serverNow?: number;
    }
  | Refused;

export interface SeatRequest {
  profileId: string;
  role: Role;
  characterName?: string;
}

/**
 * `functions.invoke` swallows the body of a non-2xx reply, and a refusal *is*
 * the reply here: "it is not your turn" arrives as a 400 with the reason in it.
 * So these post directly and read the body whatever the status says.
 *
 * **Every failure comes back as a `Refused`, none of them throws.** The one
 * that taught us to care was a CORS preflight the functions did not answer:
 * `fetch` rejected with a bare `TypeError`, nothing on the screen caught it,
 * and the lobby button sat on "Loading the silo" for good. A network that is
 * down, a function that is not deployed and a project that has moved all fail
 * the same way, and none of them should be able to hang a screen.
 */
async function callFunction<T>(name: string, body: unknown): Promise<T | Refused> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { accepted: false, reason: 'you are signed out' };

  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (failure) {
    // A rejected `fetch` says nothing useful on purpose, the browser keeps the
    // reason to itself. The console line is where the real one is.
    console.error(`${name} could not be reached`, failure);
    return { accepted: false, reason: `could not reach the ${name} server. Check your connection.`, unreachable: true };
  }

  try {
    return (await response.json()) as T;
  } catch {
    return { accepted: false, reason: `the server answered ${response.status} with nothing` };
  }
}

/**
 * Opens a match. `tier` is the league the player chose in the lobby (2H.27,
 * `00` C28): the battery's own Tier or one below it, the server refuses above.
 */
export function createMatch(
  teamId: string,
  seats: readonly SeatRequest[],
  tier: Tier,
): Promise<CreateMatchReply> {
  return callFunction<CreateMatchReply>('create-match', { teamId, seats, tier });
}

export function submitAction(
  matchId: string,
  unitId: string,
  action: Action,
): Promise<ResolveActionReply> {
  return callFunction<ResolveActionReply>('resolve-action', { matchId, unitId, action });
}

/**
 * The sequence number of the match's last event, or null when it cannot be
 * read. Asked before sending an action again after the browser rejected the
 * request (C21): if the head has moved on, the action got through and only
 * the reply was lost.
 */
export async function headSeq(matchId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('match_events')
    .select('seq')
    .eq('match_id', matchId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { seq: number }).seq;
}

/**
 * Standing orders to AI team-mates, and nothing else.
 *
 * **It spends no turn and plays nothing.** Calling for the ball must not cost
 * the turn you were calling for it with, so this goes through the same door
 * carrying orders and no action; the server writes them and answers. They stand
 * until they are replaced.
 */
export function sendOrders(
  matchId: string,
  orders: readonly AllyOrder[],
): Promise<ResolveActionReply> {
  return callFunction<ResolveActionReply>('resolve-action', { matchId, orders });
}
