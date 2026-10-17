/**
 * The team's own Realtime channel (2H.34): `team:<teamId>`, broadcast only.
 *
 * Jérôme's first coop evening, 2026-10-17: a friend joined his team by code and
 * his hub never showed it, because the hub read the roll once at load and
 * nothing told it the roll had changed. Since 2H.34 every write to a team's
 * roll is followed by one broadcast on this channel, and `useAccount` re-reads
 * the roll of the chosen team when it hears it. Four writers: joining by code
 * (the joiner), leaving (the member), removing a member and renewing the code
 * (the owner).
 *
 * The sender's own hub does not need the message (it re-reads itself after
 * the write), and `broadcast.self` is off by default, so nothing loops.
 *
 * **Sent over REST, never over the socket.** The joiner is not on the joined
 * team's channel, and `send()` on a channel that is not joined falls back to
 * REST with a `console.warn` that the Playwright harness treats as a failure.
 * `httpSend()` is that same REST path without the warning, and it works
 * whether or not this client is subscribed to the topic. When this client
 * already holds the channel (the owner's hub listening to its own team), that
 * instance is reused, because `supabase.channel()` returns an existing channel
 * of the same topic and tearing it down would silence the listener.
 *
 * The channel is public, like the lobby's and the match's: anybody who knows a
 * team id can hear that its roll changed, and nothing more. Noted for the
 * phase 8 security review with the other two.
 */

import { supabase } from './supabase.js';

export const teamTopic = (teamId: string): string => `team:${teamId}`;

/** The one event: the roll (members, code) of this team changed, re-read it. */
export const ROLL_EVENT = 'roll';

/** Tells every hub on `teamId` that its roll changed. Never throws: a hub that misses it re-reads on focus. */
export async function announceTeamChange(teamId: string): Promise<void> {
  const topic = teamTopic(teamId);
  const held = supabase.getChannels().find((channel) => channel.topic === `realtime:${topic}`);
  const channel = held ?? supabase.channel(topic);
  try {
    await channel.httpSend(ROLL_EVENT, { teamId });
  } catch (failure) {
    console.warn('the team could not be told that its roll changed', failure);
  } finally {
    if (!held) await supabase.removeChannel(channel);
  }
}
