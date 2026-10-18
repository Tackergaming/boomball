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
 *
 * **Presence is rate-limited by the server, and the penalty is the channel
 * (2H.35, `00` C34).** Three `track` messages inside fifty milliseconds (a role,
 * a name, a Ready, or the display name flickering through a refresh) made
 * Realtime answer "Client presence rate limit exceeded" and **close the
 * channel for good**: the seat left the others' lobbies, the client heard no
 * more broadcasts, and since this hook lives for the whole evening the next
 * lobby of that player was silent. That is how Jérôme's rematch of 2026-10-17
 * opened with one seat while his team-mate waited in the lobby. Two answers
 * here: `track()` sends at most one presence message every `TRACK_GAP_MS`,
 * the latest state, nothing twice; and a channel the server closes is opened
 * again a second later, seat re-tracked.
 *
 * **Private since 2H.37** (security review M3): the members of the team hear
 * it and speak on it, nobody else, by policies on `realtime.messages`
 * (migration 0015). A presence forged by an outsider used to be a seat that
 * blocked the start. And the reopening is bounded (m4, `channelReopen.ts`):
 * a player the owner removed is refused the join and must not knock every
 * second all evening; any other closure is retried a handful of times.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Seat } from '../screens/lobbySeats.js';
import { shouldReopen } from './channelReopen.js';
import { supabase } from './supabase.js';

export const lobbyTopic = (teamId: string): string => `lobby:${teamId}`;

/** The least time between two presence messages from this client. Typing a name is one message per gap, not per key. */
export const TRACK_GAP_MS = 500;

/** How long after the server closed the channel before it is opened again. */
const REOPEN_DELAY_MS = 1000;

export interface LobbyLink {
  /** Everybody with a seat tracked on the channel, null until the first sync. */
  seats: Seat[] | null;
  /** Tells the others my seat, or withdraws it with null. Coalesced: the latest state goes, at most one message per gap. */
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
  /** Bumped when the server closed the channel: the effect opens a new one. */
  const [epoch, setEpoch] = useState(0);
  /** How many times this lobby's channel was opened again after the server closed it (m4). */
  const reopensRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  /** The seat to (re)track whenever the channel is joined, null when withdrawn. */
  const seatRef = useRef<Seat | null>(null);
  /** What the current channel was last told, as JSON; null when it was told nothing yet. */
  const sentRef = useRef<string | null>(null);
  const sentAtRef = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;

  /** Sends the current seat if it differs from what the channel was last told. */
  const flush = useCallback(() => {
    pendingRef.current = null;
    const channel = channelRef.current;
    if (!channel || channel.state !== 'joined') return;
    const seat = seatRef.current;
    const key = seat ? JSON.stringify(seat) : null;
    if (key === sentRef.current) return;
    // Nothing to withdraw on a channel that was never told a seat.
    if (!seat && sentRef.current === null) return;
    sentRef.current = key;
    sentAtRef.current = Date.now();
    if (seat) void channel.track(seat);
    else void channel.untrack();
  }, []);

  // A new lobby (another team, another player) starts its count of reopenings afresh.
  useEffect(() => {
    reopensRef.current = 0;
  }, [teamId, userId]);

  useEffect(() => {
    setSeats(null);
    sentRef.current = null;
    if (pendingRef.current) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
    if (!teamId || !userId) {
      channelRef.current = null;
      return;
    }
    let disposed = false;
    let reopen: ReturnType<typeof setTimeout> | null = null;
    const topic = lobbyTopic(teamId);

    const open = () => {
      if (disposed) return;
      const channel = supabase.channel(topic, {
        config: { private: true, presence: { key: userId, enabled: true } },
      });
      channelRef.current = channel;
      channel
        .on('presence', { event: 'sync' }, () => setSeats(seatsOf(channel)))
        .on('broadcast', { event: 'started' }, ({ payload }) => {
          const matchId = (payload as { matchId?: unknown } | undefined)?.matchId;
          onStartedRef.current(typeof matchId === 'string' ? matchId : '');
        })
        .subscribe((status, error) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') {
            // A fresh join, or a rejoin after the socket came back: the
            // channel knows nothing of this client yet, the seat is told again.
            sentRef.current = null;
            flush();
            return;
          }
          // CLOSED by the server (the presence rate limit), CHANNEL_ERROR or
          // TIMED_OUT: the channel is dead and the library will not revive a
          // closed one. Open another, once, after a breath, unless the server
          // refused the join or this lobby has had its share (m4).
          if (reopen) return;
          if (!shouldReopen(reopensRef.current, error)) return;
          reopen = setTimeout(() => {
            reopen = null;
            if (disposed) return;
            reopensRef.current += 1;
            setEpoch((was) => was + 1);
          }, REOPEN_DELAY_MS);
        });
    };

    // A channel of this topic may linger, closed, from the epoch before: the
    // library hands back an existing instance of a topic rather than a new
    // one, and its handlers would stack on ours. Tear it down first.
    const stale = supabase.getChannels().find((channel) => channel.topic === `realtime:${topic}`);
    if (stale) void supabase.removeChannel(stale).then(open, open);
    else open();

    return () => {
      disposed = true;
      if (reopen) clearTimeout(reopen);
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [teamId, userId, epoch, flush]);

  const track = useCallback(
    (seat: Seat | null) => {
      seatRef.current = seat;
      // A flush is already due: it will read the latest seat when it fires.
      if (pendingRef.current) return;
      const since = Date.now() - sentAtRef.current;
      if (since >= TRACK_GAP_MS) flush();
      else pendingRef.current = setTimeout(flush, TRACK_GAP_MS - since);
    },
    [flush],
  );

  const announceStarted = useCallback(async (matchId: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    // Joined, so over the socket; otherwise the REST path, which never warns.
    if (channel.state === 'joined') await channel.send({ type: 'broadcast', event: 'started', payload: { matchId } });
    else await channel.httpSend('started', { matchId });
  }, []);

  return { seats, track, announceStarted };
}
