/**
 * The lobby's presence channel, held by `App` for as long as a team is chosen
 * (2H.34). Until 2H.33 `Lobby.tsx` opened `lobby:<teamId>` itself and closed
 * it with the screen, so the hub could not know who was waiting in the lobby,
 * and a team-mate sitting on the hub never heard that the match had opened.
 *
 * One channel per chosen team, two uses:
 *
 *   * **Presence**, keyed by user id. The lobby screen `track()`s the player's
 *     seat while it is open and withdraws it when it closes; the hub only
 *     listens, so it can say "Marc is already in the lobby" without sitting
 *     down. A reload replaces the seat rather than doubling it, because the
 *     key is the user id.
 *   * **The `started` broadcast**, sent by the owner's lobby when the match
 *     opens. Whoever hears it re-reads their account: the lobby lands on the
 *     board, the hub shows the running match.
 *
 * The seat shape is `Seat` from `screens/lobbySeats.ts`, pure and shared with
 * the lobby. `seats` is `null` until the first presence sync, then every
 * tracked seat including the player's own when they track one.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Seat } from '../screens/lobbySeats.js';
import { supabase } from './supabase.js';

export const lobbyTopic = (teamId: string): string => `lobby:${teamId}`;

export interface LobbyLink {
  /** Everybody with a seat tracked on the channel, null until the first sync. */
  seats: Seat[] | null;
  /** Tells the others my seat, or withdraws it with null. Re-sent on every change. */
  track: (seat: Seat | null) => void;
  /** Tells the others the match opened; they re-read their account. */
  announceStarted: (matchId: string) => Promise<void>;
}

/** The presence payloads of a channel, one seat per key, the last meta of a key being its current seat. */
export function seatsOf(channel: RealtimeChannel): Seat[] {
  const all = new Map<string, Seat>();
  for (const entries of Object.values(channel.presenceState<Seat>())) {
    for (const entry of entries) {
      if (typeof entry.profileId !== 'string') continue;
      const { profileId, displayName, name, role, ready, owner, tier } = entry;
      all.set(profileId, { profileId, displayName, name, role, ready, owner, ...(tier ? { tier } : {}) });
    }
  }
  return [...all.values()];
}

export function useLobbyChannel(
  teamId: string | null,
  userId: string | null,
  onStarted: (matchId: string) => void,
): LobbyLink {
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  /** The seat to (re)track whenever the channel is joined. */
  const seatRef = useRef<Seat | null>(null);
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;

  useEffect(() => {
    setSeats(null);
    if (!teamId || !userId) {
      channelRef.current = null;
      return;
    }
    const channel = supabase.channel(lobbyTopic(teamId), {
      config: { presence: { key: userId, enabled: true } },
    });
    channelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => setSeats(seatsOf(channel)))
      .on('broadcast', { event: 'started' }, ({ payload }) => {
        const matchId = (payload as { matchId?: unknown } | undefined)?.matchId;
        onStartedRef.current(typeof matchId === 'string' ? matchId : '');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && seatRef.current) void channel.track(seatRef.current);
      });
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [teamId, userId]);

  const track = useCallback((seat: Seat | null) => {
    seatRef.current = seat;
    const channel = channelRef.current;
    if (!channel || channel.state !== 'joined') return;
    if (seat) void channel.track(seat);
    else void channel.untrack();
  }, []);

  const announceStarted = useCallback(async (matchId: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    // Joined, so over the socket; otherwise the REST path, which never warns.
    if (channel.state === 'joined') await channel.send({ type: 'broadcast', event: 'started', payload: { matchId } });
    else await channel.httpSend('started', { matchId });
  }, []);

  return { seats, track, announceStarted };
}
