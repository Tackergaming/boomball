/**
 * The board, as the client holds it.
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
 * Realtime is here for the day two or three humans share a match: the Edge
 * Functions broadcast every batch on `match:<id>`, and a batch whose `fromSeq`
 * is ahead of ours triggers the same re-read. **Nothing depends on it.** In
 * solo, the only mode built, every event this client needs comes back in the
 * reply to its own request, so a broadcast that never arrives costs nothing.
 * The reconnection story the plan asks for is the same code path: on waking up,
 * compare `seq` and re-read if it moved.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Action } from '../../../engine/actions.js';
import type { MatchEvent } from '../../../engine/events.js';
import type { MatchState } from '../../../engine/types.js';
import { submitAction, supabase } from '../lib/supabase.js';

export interface MatchView {
  state: MatchState | null;
  /** The seq of the last event the snapshot includes. */
  seq: number;
  /** Newest last, capped: the feed is a running commentary, not the archive. */
  feed: MatchEvent[];
  deadline: number | null;
  busy: boolean;
  refusal: string | null;
  send: (action: Action) => Promise<void>;
  dismissRefusal: () => void;
}

const FEED_LIMIT = 120;

export function useMatch(matchId: string): MatchView {
  const [state, setState] = useState<MatchState | null>(null);
  const [seq, setSeq] = useState(-1);
  const [feed, setFeed] = useState<MatchEvent[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const seqRef = useRef(-1);

  const load = useCallback(async () => {
    const [{ data: snapshot }, { data: row }] = await Promise.all([
      supabase.from('match_state').select('seq, snapshot').eq('match_id', matchId).maybeSingle(),
      supabase.from('matches').select('turn_deadline').eq('id', matchId).maybeSingle(),
    ]);

    if (snapshot) {
      setState(snapshot.snapshot as MatchState);
      setSeq(snapshot.seq as number);
      seqRef.current = snapshot.seq as number;
    }
    const at = (row?.turn_deadline as string | null) ?? null;
    setDeadline(at ? Date.parse(at) : null);
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        // Our own batch comes back in the HTTP reply as well; only a batch that
        // is ahead of what we already hold is worth a re-read.
        if (from <= seqRef.current) return;
        if (payload.events) {
          setFeed((old) => [...old, ...payload.events!].slice(-FEED_LIMIT));
        }
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, load]);

  const send = useCallback(
    async (action: Action) => {
      const unitId = state?.turn?.unitId;
      if (!unitId || busy) return;

      setBusy(true);
      setRefusal(null);
      const reply = await submitAction(matchId, unitId, action);

      if (!reply.accepted) {
        setRefusal(reply.reason);
        setBusy(false);
        // A refusal usually means a stale board, so read it again rather than
        // leaving the player looking at the position that produced it.
        await load();
        return;
      }

      setFeed((old) => [...old, ...reply.events].slice(-FEED_LIMIT));
      await load();
      setBusy(false);
    },
    [matchId, state, busy, load],
  );

  return {
    state,
    seq,
    feed,
    deadline,
    busy,
    refusal,
    send,
    dismissRefusal: () => setRefusal(null),
  };
}
