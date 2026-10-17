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

export type { SeatRequest } from './supabase-types.js';
import type { SeatRequest } from './supabase-types.js';

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
 * `00` C28): the team's own Tier or one below it, the server refuses above.
 */
export function createMatch(
  teamId: string,
  seats: readonly SeatRequest[],
  tier: Tier,
): Promise<CreateMatchReply> {
  return callFunction<CreateMatchReply>('create-match', { teamId, seats, tier });
}

/**
 * Abandons a match (2H.28, `00` C29): the SQL function `abandon_match` checks
 * that the caller owns the team and that the match is neither finished nor
 * already abandoned, then stamps `abandoned_at`. No result is written, the
 * ladder does not move. The reason comes back in the server's own words.
 */
export async function abandonMatch(matchId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const { error } = await supabase.rpc('abandon_match', { match: matchId });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (failure) {
    console.error('the match could not be abandoned', failure);
    return { ok: false, reason: 'could not reach the server. Check your connection and try again.' };
  }
}

/** A refusal of a team write, in the server's own words. */
export type BatteryResult<T> = { ok: true; value: T } | { ok: false; reason: string };

async function rpcResult<T>(name: string, args: Record<string, unknown>, what: string): Promise<BatteryResult<T>> {
  try {
    const { data, error } = await supabase.rpc(name, args);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, value: data as T };
  } catch (failure) {
    console.error(`${what} failed`, failure);
    return { ok: false, reason: 'could not reach the server. Check your connection and try again.' };
  }
}

/**
 * Joins the team whose invite code this is (2H.32, `00` C32 point 7). The
 * SQL function `join_team` finds the team, refuses an unknown code and the
 * owner's own team, and inserts the membership; joining twice is a no-op.
 * Returns the team's id.
 */
export function joinTeam(code: string): Promise<BatteryResult<string>> {
  return rpcResult<string>('join_team', { code }, 'joining the team');
}

/** Renews the invite code of a team the caller owns. Returns the new code. */
export function rotateInviteCode(teamId: string): Promise<BatteryResult<string>> {
  return rpcResult<string>('rotate_invite_code', { team: teamId }, 'renewing the code');
}

/**
 * Leaves a team (the caller's own row) or removes a member (the owner's
 * right): one delete, allowed by the `team_members_write` policy for both.
 */
export async function removeMembership(teamId: string, profileId: string): Promise<BatteryResult<null>> {
  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('profile_id', profileId);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, value: null };
  } catch (failure) {
    console.error('the membership could not be removed', failure);
    return { ok: false, reason: 'could not reach the server. Check your connection and try again.' };
  }
}

/**
 * Remembers the seat a member takes: role and character name, on their own
 * `team_members` row (policy `team_members_write`). The owner has no row of
 * their own on their team and is not written here.
 */
export async function saveSeatPreference(
  teamId: string,
  profileId: string,
  role: Role,
  characterName: string,
): Promise<void> {
  try {
    const { error } = await supabase.from('team_members').upsert(
      { team_id: teamId, profile_id: profileId, preferred_role: role, character_name: characterName.trim() || null },
      { onConflict: 'team_id,profile_id' },
    );
    if (error) console.warn('the seat preference was not saved', error);
  } catch (failure) {
    console.warn('the seat preference was not saved', failure);
  }
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
