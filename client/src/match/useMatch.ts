/**
 * The board, as the client holds it, and the replay that makes it watchable.
 *
 * **The snapshot is never computed here.** The client does not call `reduce`,
 * does not roll, and does not decide legality; it posts an intention and reads
 * back what the server wrote. So the refresh after every accepted action is a
 * re-read of `match_state` rather than a local replay, and the two can never
 * drift because there is only ever one of them.
 *
 * That costs one extra round trip per action, about a tenth of a second on a
 * turn that already took a human several seconds to decide. Replaying the
 * returned events locally to save it would put a second implementation of the
 * rules in the browser, which is the one thing the architecture forbids.
 *
 * **What was added is playback, not resolution.** One click in solo resolves
 * thirteen AI turns and comes back as sixty events, and applying them in one
 * frame made the whole field teleport: Jérôme's own words were that he had to
 * scroll the log to discover his team had scored. So the batch is now walked
 * through beat by beat by `replay.ts`, which only ever transcribes what the
 * events already state, and the server's snapshot is re-read at the end and
 * replaces the projection wholesale. The authority never moved.
 *
 * Realtime is here for the day two or three humans share a match: the Edge
 * Functions broadcast every batch on `match:<id>`, and a batch whose `fromSeq`
 * is ahead of ours triggers the same re-read. **Nothing depends on it.** In
 * solo, the only mode built, every event this client needs comes back in the
 * reply to its own request, so a broadcast that never arrives costs nothing.
 * The reconnection story the plan asks for is the same code path: on waking up,
 * compare `seq` and re-read if it moved.
 *
 * **The broadcast of our own batch lands before our own reply**, and that is
 * the one place the two paths fought. Audit line A9 stopped the echo from
 * putting every line in the feed twice; it did not stop its handler re-reading
 * the snapshot, which put the final board on screen a few hundred milliseconds
 * before the replay started walking from the old one (Jérôme's retour 1 at
 * the gate of 2H.5: "at the start of each house round I already see where
 * everybody ends up"). So while a request of this client is in flight, the
 * broadcast handler takes the feed and leaves the board alone: the reply
 * replays the batch and re-reads the snapshot itself, in that order. In solo
 * nobody else writes, so nothing is missed; in co-op a batch somebody else
 * produced while ours is in flight is caught by the re-read that ends our own
 * replay, since `load()` reads whatever the server holds by then.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AllyOrder } from '../../../ai/orders.js';
import type { Action } from '../../../engine/actions.js';
import type { MatchEvent } from '../../../engine/events.js';
import type { MatchState, TeamId } from '../../../engine/types.js';
import { sendOrders, submitAction, supabase } from '../lib/supabase.js';
import { timeMotion, type Motion } from './motion.js';
import { toBeats, type Beat } from './replay.js';

export type Speed = 'slow' | 'normal' | 'instant';

export interface MatchView {
  /** What to draw. The server's snapshot, or the beat being replayed. */
  state: MatchState | null;
  /** The seq of the last event the snapshot includes. */
  seq: number;
  /** Newest last, capped: the feed is a running commentary, not the archive. */
  feed: MatchEvent[];
  deadline: number | null;
  /**
   * How far this browser's clock is behind the server's, in milliseconds.
   *
   * The deadline is stamped by the server, and a machine whose clock is a few
   * minutes fast would read every turn as already expired and hand it straight
   * back. That is not hypothetical: Jérôme played four or five turns and the
   * match reported ten rounds gone.
   */
  skew: number;
  /** True while a request is in flight or a replay is running. */
  busy: boolean;
  /** True only while the replay is walking beats: the board is a past moment. */
  replaying: boolean;
  /**
   * The card on screen. It **outlives the replay on purpose**: the last thing
   * that happened stays up until the player acts again, which is how they get
   * to read their own roll instead of watching it flash past.
   */
  beat: Beat | null;
  /**
   * What is travelling on the board right now, timed at the chosen speed, or
   * null when the board is simply the server's snapshot. Set with each beat
   * and cleared with the re-read that ends the replay, so the board never
   * animates towards a position that is no longer the one on screen.
   */
  motion: Motion | null;
  /** How far through the batch the replay is, for the progress pips. */
  progress: { at: number; of: number } | null;
  refusal: string | null;
  /** Set when the turn clock, not the player, ended the turn. */
  expired: boolean;
  speed: Speed;
  setSpeed: (speed: Speed) => void;
  /** Drops the rest of the replay and jumps to the server's board. */
  skip: () => void;
  send: (action: Action) => Promise<void>;
  /** Posts standing orders to AI team-mates. Spends no turn. */
  order: (orders: readonly AllyOrder[]) => Promise<void>;
  dismissRefusal: () => void;
  /** Clears the card left standing after a replay. */
  dismissBeat: () => void;
}

const FEED_LIMIT = 120;

/**
 * How long one beat sits on screen.
 *
 * Third time up, and the third report is the same one: the card in the middle
 * of the board goes before it has been read. Seven tenths, then a second and a
 * half, now two and a half at normal and four at slow. A goal or a knockout is
 * held twice as long, because those are the moments that were being missed
 * entirely, and a beat with nothing to read goes by in a blink.
 *
 * Costing this in turn time is what the timer going to a hundred and twenty
 * seconds pays for, and the clock does not start against the player until the
 * replay is over anyway. See `Match.tsx`.
 */
const BEAT_MS: Record<Speed, number> = { slow: 4000, normal: 2500, instant: 0 };

/**
 * A target for the whole batch, so a pathological round does not lock a player
 * out for a minute. Past it the replay speeds up rather than dropping beats:
 * seeing all of it fast beats seeing a third of it at the right pace.
 */
const REPLAY_BUDGET_MS = 45_000;

/**
 * The floor the budget may not compress a beat below, and the reason the last
 * rise did not land.
 *
 * A solo round is thirteen AI turns, so a batch of fifteen to twenty beats was
 * routine and the nominal cost went straight past the old thirty second
 * ceiling. The scale factor then quietly took every card back under a second,
 * which is exactly the speed that was reported as unreadable **after** the
 * per-beat number had been raised to fix it. So the ceiling now gives way
 * before the floor does: a long batch simply runs long, and the Skip button,
 * which is on the card itself, is the way out of one. A player who wants the
 * whole round in a blink already has the instant setting.
 */
const MIN_BEAT_MS = 1600;

/**
 * Rest after the last thing in a beat has stopped moving, before the next beat
 * starts, so an arrival is seen as an arrival and not as the start of the next
 * departure. Only applies when the beat's motion outlasts its card.
 */
const SETTLE_MS = 180;

/**
 * How long a card wants on screen at the current speed.
 *
 * Exported because `Match.tsx` waits before auto-passing an empty turn, and
 * that wait exists only to let the card that emptied it be read. Two numbers
 * for one purpose drift the moment one of them is tuned, which is what a fixed
 * one-second wait had already done against a two-and-a-half second card.
 */
export function beatHoldMs(speed: Speed): number {
  return BEAT_MS[speed];
}

const SPEED_KEY = 'boomball.replaySpeed';

function storedSpeed(): Speed {
  try {
    const saved = localStorage.getItem(SPEED_KEY);
    if (saved === 'slow' || saved === 'normal' || saved === 'instant') return saved;
  } catch {
    // A browser with site data blocked still gets to play, just not to
    // remember. Nothing here is worth failing a match over.
  }
  return 'normal';
}

/** The house's opening, to be watched from the kick-off board. */
interface Opening {
  readonly from: MatchState;
  readonly events: readonly MatchEvent[];
}

export function useMatch(matchId: string, own: TeamId): MatchView {
  const [state, setState] = useState<MatchState | null>(null);
  const [seq, setSeq] = useState(-1);
  const [feed, setFeed] = useState<MatchEvent[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [progress, setProgress] = useState<{ at: number; of: number } | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [skew, setSkew] = useState(0);
  const [speed, setSpeedState] = useState<Speed>(storedSpeed);
  const seqRef = useRef(-1);
  /**
   * Every `fromSeq` this client has already put in the feed, from either
   * direction. A batch reaches the browser twice, in the HTTP reply and on the
   * match channel, and **the broadcast can land first**: the function sends it
   * before it returns. So neither "is it ahead of what I hold" nor "did my
   * request claim it" is enough on its own; the sequence number is the one
   * thing both copies share (audit line A9).
   */
  const seenRef = useRef(new Set<number>());
  /**
   * How many requests of this client are in flight, replay included. While
   * it is above zero the broadcast handler must not re-read the snapshot: the
   * reply is about to replay this very batch from the board on screen, and a
   * re-read in between shows the end of the round before its beginning.
   */
  const inFlightRef = useRef(0);
  const speedRef = useRef(speed);
  const skipRef = useRef(false);
  const liveRef = useRef(true);

  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
    };
  }, []);

  const setSpeed = useCallback((next: Speed) => {
    speedRef.current = next;
    setSpeedState(next);
    try {
      localStorage.setItem(SPEED_KEY, next);
    } catch {
      // See `storedSpeed`.
    }
  }, []);

  /**
   * Whether the opening has been shown. `create-match` plays the house up to
   * the first human before the snapshot is written, so a fresh match loads
   * with the house already in place and the player never sees it get there
   * (Jérôme's retour 2 on the engine 3 game). The function keeps the board
   * before the opening in `matches.kickoff` with the seq the opening ends on
   * (migration 0007); the first `load()` of a match still standing on that
   * seq hands the opening back instead of drawing the snapshot, and the
   * effect below replays it. Once, by this ref: a reload mid-opening replays
   * it again, which is harmless, a reload after the first action does not.
   */
  const openingRef = useRef(false);

  const load = useCallback(async (): Promise<Opening | null> => {
    const [{ data: snapshot }, { data: row }] = await Promise.all([
      supabase.from('match_state').select('seq, snapshot').eq('match_id', matchId).maybeSingle(),
      supabase.from('matches').select('turn_deadline, kickoff').eq('id', matchId).maybeSingle(),
    ]);

    const at = (row?.turn_deadline as string | null) ?? null;
    setDeadline(at ? Date.parse(at) : null);
    if (!snapshot) return null;

    const kickoff = (row?.kickoff as { state: MatchState; lastSeq: number } | null) ?? null;
    const seqNow = snapshot.seq as number;
    let opening: Opening | null = null;
    if (kickoff && !openingRef.current && seqNow === kickoff.lastSeq) {
      openingRef.current = true;
      const { data: rows } = await supabase
        .from('match_events')
        .select('seq, payload')
        .eq('match_id', matchId)
        .lte('seq', kickoff.lastSeq)
        .order('seq', { ascending: true });
      const events = ((rows ?? []) as { payload: MatchEvent }[]).map((r) => r.payload);
      // The opening batch starts at 0; the feed effect loads it on its own.
      seenRef.current.add(0);
      if (events.length > 0) opening = { from: kickoff.state, events };
    }

    // The server's board is drawn as it is: whatever was gliding stops there.
    // With an opening to replay, the board drawn is the kick-off and the
    // replay walks from it to the snapshot, which `play` re-reads at the end.
    setMotion(null);
    setState(opening ? opening.from : (snapshot.snapshot as MatchState));
    setSeq(seqNow);
    seqRef.current = seqNow;
    return opening;
  }, [matchId]);

  /** The opening events, so the feed does not start blank on a fresh match. */
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('match_events')
      .select('seq, payload')
      .eq('match_id', matchId)
      .order('seq', { ascending: false })
      .limit(FEED_LIMIT)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setFeed(
          (data as { payload: MatchEvent }[]).map((row) => row.payload).reverse(),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('broadcast', { event: 'events' }, (message) => {
        const payload = message.payload as { fromSeq?: number; events?: MatchEvent[] };
        const from = payload.fromSeq ?? 0;
        // Our own batch comes back in the HTTP reply as well, possibly after
        // this. A batch already in the feed, or behind what we hold, is nothing.
        if (seenRef.current.has(from) || from <= seqRef.current) return;
        seenRef.current.add(from);
        if (payload.events) {
          setFeed((old) => [...old, ...payload.events!].slice(-FEED_LIMIT));
        }
        // Our own batch, echoed ahead of our reply: the reply replays it and
        // re-reads the board at the end. Re-reading here instead showed the
        // final positions before the replay had begun (retour 1 de 2H.5).
        if (inFlightRef.current > 0) return;
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, load]);

  const skip = useCallback(() => {
    skipRef.current = true;
  }, []);

  /**
   * Walks the batch beat by beat, then hands the board back to the server.
   *
   * The projection is only ever what is on screen. Whatever happens in here,
   * including a skip halfway through, ends at `load()`, so the board a player
   * acts from is always the one the server holds.
   */
  const play = useCallback(
    async (from: MatchState, events: readonly MatchEvent[]) => {
      const beats = toBeats(from, events, own);
      if (beats.length === 0) return;

      // Fit the whole batch inside the budget rather than cutting it short,
      // but never below the floor: an unreadable card is not a faster replay,
      // it is a replay that did not happen.
      const nominal = beats.reduce((total, one, i) => total + holdFor(one, i === 0), 0);
      const perBeat = BEAT_MS[speedRef.current];
      const scale =
        perBeat > 0 && nominal * perBeat > REPLAY_BUDGET_MS
          ? Math.max(REPLAY_BUDGET_MS / (nominal * perBeat), MIN_BEAT_MS / perBeat)
          : 1;

      skipRef.current = false;
      setReplaying(true);
      for (let i = 0; i < beats.length; i++) {
        if (skipRef.current || !liveRef.current) break;
        const one = beats[i]!;
        // The beat's travel, timed now rather than in `toBeats`, because the
        // player may change the speed between two batches. The board glides
        // through it on its way to `one.state`; at `instant` it is all zero
        // and the board simply draws the state.
        const travel = timeMotion(i, one.motion, speedRef.current);
        setBeat(one);
        setMotion(travel);
        setState(one.state);
        setProgress({ at: i + 1, of: beats.length });
        // Held for the card, or for the glide, whichever is longer. The card's
        // hold is still zero for the player's own uneventful first beat, but
        // the walk they clicked for is now watched rather than skipped.
        // Read again per beat, so switching to `instant` mid-replay takes
        // effect at the next beat instead of at the next batch.
        const card = holdFor(one, i === 0) * scale * BEAT_MS[speedRef.current];
        const glide = travel.totalMs > 0 ? travel.totalMs + SETTLE_MS : 0;
        const hold = Math.max(card, glide);
        if (hold > 0) await wait(hold);
      }

      setProgress(null);
      setReplaying(false);
      // The card is deliberately left up. `load()` puts the server's board back
      // underneath it, and the next action clears it.
      await load();
    },
    [load, own],
  );

  /**
   * The first read of the match, and the opening replay when there is one.
   * Counted as in flight so the broadcast handler leaves the board alone
   * while the house's opening is being walked, as for any replay.
   */
  useEffect(() => {
    let cancelled = false;
    inFlightRef.current += 1;
    void load()
      .then(async (opening) => {
        if (opening && !cancelled) await play(opening.from, opening.events);
      })
      .finally(() => {
        inFlightRef.current -= 1;
      });
    return () => {
      cancelled = true;
    };
  }, [load, play]);

  const send = useCallback(
    async (action: Action) => {
      const unitId = state?.turn?.unitId;
      if (!unitId || busy) return;

      setBusy(true);
      setRefusal(null);
      setExpired(false);
      setBeat(null);
      inFlightRef.current += 1;
      // `busy` locks the action bar, so every path out of here has to clear it.
      // One that did not is what left the lobby button stuck forever, and in a
      // match the same mistake costs a player the rest of the game.
      try {
        const before = state;
        const sentAt = Date.now();
        const reply = await submitAction(matchId, unitId, action);

        // Every reply carries the server's clock. Half the round trip is a
        // rough enough correction: what matters is catching a machine minutes
        // out, not milliseconds.
        if ('serverNow' in reply && typeof reply.serverNow === 'number') {
          setSkew(reply.serverNow - (sentAt + Date.now()) / 2);
        }

        if (!reply.accepted) {
          setRefusal(reply.reason);
          // A refusal usually means a stale board, so read it again rather than
          // leaving the player looking at the position that produced it.
          await load();
          return;
        }

        // **Our own batch comes back twice**: in this reply, and as the
        // broadcast the function sends on the match channel, which lands
        // either just before this line or while the replay below is walking
        // the beats. Unclaimed, the echo appended every line to the feed a
        // second time and re-read the snapshot in the middle of the replay,
        // which snapped the board to the final position (audit line A9). The
        // feed takes the batch once, whichever copy came first, and `seqRef`
        // is moved here rather than at the end of the replay so a late echo
        // reads as behind.
        if (!seenRef.current.has(reply.fromSeq)) {
          seenRef.current.add(reply.fromSeq);
          setFeed((old) => [...old, ...reply.events].slice(-FEED_LIMIT));
        }
        seqRef.current = Math.max(seqRef.current, reply.fromSeq + reply.events.length - 1);
        // The server answers `expired` when the clock, not the player, spent
        // the turn. It is news, not an error, and the screen says so.
        if ('expired' in reply && reply.expired) setExpired(true);
        await play(before, reply.events);
      } catch (failure) {
        console.error('the turn could not be sent', failure);
        setRefusal('the turn could not be sent. Check your connection and try again.');
      } finally {
        inFlightRef.current -= 1;
        setBusy(false);
      }
    },
    [matchId, state, busy, load, play],
  );

  /**
   * Orders go through the same door and come back with nothing to replay, so
   * this is deliberately not `send`: no beats, no board change, no turn spent.
   * The only thing worth surfacing is a refusal.
   */
  const order = useCallback(
    async (orders: readonly AllyOrder[]) => {
      if (orders.length === 0) return;
      try {
        const reply = await sendOrders(matchId, orders);
        if (!reply.accepted) setRefusal(reply.reason);
      } catch (failure) {
        console.error('the order could not be sent', failure);
        setRefusal('the order could not be sent. Check your connection and try again.');
      }
    },
    [matchId],
  );

  return {
    state,
    seq,
    feed,
    deadline,
    skew,
    busy,
    replaying,
    beat,
    motion,
    progress,
    refusal,
    expired,
    speed,
    setSpeed,
    skip,
    send,
    order,
    dismissRefusal: () => setRefusal(null),
    dismissBeat: () => setBeat(null),
  };
}

/**
 * How long to hold a beat, in multiples of `BEAT_MS`.
 *
 * The rule is: **stop for a result, never for an instruction.** A goal or a
 * knockout is held twice as long, because those are the two things Jérôme
 * missed entirely. Anything with dice in it is held once, because the roll is
 * the whole reason the card exists. And the first beat of a batch, when it is
 * the player's own turn carrying on, is not held at all: they clicked to move
 * eight cells and watching a card say "moves 8 cells" is a toll, not feedback.
 */
function holdFor(beat: Beat, isFirst: boolean): number {
  if (beat.lines.length === 0) return 0;
  if (beat.weight === 'loud') return 2;
  const hasDice = beat.lines.some((line) => line.roll);
  if (isFirst && !hasDice && beat.unitId === null) return 0;
  return 1;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
