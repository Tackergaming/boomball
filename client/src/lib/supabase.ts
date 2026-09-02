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

import type { Action } from '../../../engine/actions.js';
import type { MatchEvent } from '../../../engine/events.js';
import type { Role } from '../../../engine/stats.js';

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

export type Refused = { accepted: false; reason: string };

export type CreateMatchReply =
  | { accepted: true; matchId: string; fromSeq: number; events: MatchEvent[] }
  | Refused;

export type ResolveActionReply =
  | { accepted: true; fromSeq: number; events: MatchEvent[] }
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
 */
async function callFunction<T>(name: string, body: unknown): Promise<T | Refused> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { accepted: false, reason: 'you are signed out' };

  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  try {
    return (await response.json()) as T;
  } catch {
    return { accepted: false, reason: `the server answered ${response.status} with nothing` };
  }
}

export function createMatch(
  teamId: string,
  seats: readonly SeatRequest[],
): Promise<CreateMatchReply> {
  return callFunction<CreateMatchReply>('create-match', { teamId, seats });
}

export function submitAction(
  matchId: string,
  unitId: string,
  action: Action,
): Promise<ResolveActionReply> {
  return callFunction<ResolveActionReply>('resolve-action', { matchId, unitId, action });
}
