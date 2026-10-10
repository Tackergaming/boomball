/**
 * Who is signed in, what team they own, and whether a match is waiting.
 *
 * One hook rather than a store, because the whole shape is four rows and the
 * screens that need them are never mounted at the same time. Everything it
 * reads goes through RLS as the player: a query that returns nothing here
 * because a policy hid it is the same nothing the player would see, which is
 * exactly the behaviour worth testing in the browser.
 *
 * **Every read reports its failure** (audit line A12). It used to ignore
 * `error` on all four, so a project in pause or a network down landed a signed
 * player on "Raise a battery" as if they were new, and the button then failed
 * without a word. That is the screen Jérôme's friends would have seen in
 * September. A failed read now stops the load and names itself in `failure`,
 * and `App` shows it with a way to try again.
 *
 * **A match is only live on the engine that wrote it** (audit line A11). The
 * `matches` row carries `engine_version`; a match opened on an earlier engine
 * cannot be replayed by this one, so it is neither resumed nor counted as the
 * team's running match. It is archived, not lost: its events stay in the
 * database, and the hub says how many such matches the team has.
 */

import { useCallback, useEffect, useState } from 'react';

import { ENGINE_VERSION } from '../../../engine/constants.js';
import { supabase } from './supabase.js';

export interface Profile {
  id: string;
  display_name: string;
}

export interface Team {
  id: string;
  name: string;
  wins: number;
  tier: 'rookie' | 'veteran' | 'star';
  owner: string;
}

export interface LiveMatch {
  id: string;
  phase: 'playing' | 'suddenDeath' | 'finished';
  round: number;
  score_a: number;
  score_b: number;
  winner: 'A' | 'B' | null;
  is_draw: boolean;
  /** Which engine wrote it. Only a match on `ENGINE_VERSION` can be played. */
  engine_version: number;
}

export interface Account {
  loading: boolean;
  userId: string | null;
  /**
   * `undefined` until the row has been read for the current user, `null` once
   * the read came back empty. The two used to be one value, and `App` inserted
   * a profile for every player who signed in: the row was simply not read yet.
   */
  profile: Profile | null | undefined;
  team: Team | null;
  /** The unfinished match on the current engine, which there is at most one of. */
  live: LiveMatch | null;
  /** The last finished match, so the results screen has something to show. */
  lastFinished: LiveMatch | null;
  /** Unfinished matches written by an earlier engine: archived, never resumed. */
  archived: number;
  /**
   * Why the account could not be read, in words a player can act on, or null.
   * Set by the first read that fails; the rest of the load is abandoned.
   */
  failure: string | null;
  refresh: () => Promise<void>;
}

/** The one line a player gets, with the server's own words after it. */
function explain(what: string, error: { message: string }): string {
  return `the server did not answer when reading ${what}: ${error.message}`;
}

export function useAccount(): Account {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [team, setTeam] = useState<Team | null>(null);
  const [live, setLive] = useState<LiveMatch | null>(null);
  const [lastFinished, setLastFinished] = useState<LiveMatch | null>(null);
  const [archived, setArchived] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(async (id: string | null) => {
    setFailure(null);

    if (!id) {
      setProfile(null);
      setTeam(null);
      setLive(null);
      setLastFinished(null);
      setArchived(0);
      setLoading(false);
      return;
    }

    // Forgotten before the first await, so the render that learns the user id
    // never sees it beside a `null` profile left over from the signed-out
    // state. That pairing is what sent `App` to insert a profile that existed,
    // and the 409 it got back was the unexplained failure on every sign-in.
    setProfile(undefined);

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', id)
      .maybeSingle();
    if (profileError) {
      setFailure(explain('your profile', profileError));
      setLoading(false);
      return;
    }
    setProfile((profileRow as Profile | null) ?? null);

    // The owner's team. Playing on somebody else's team is a lobby invitation
    // and there is no invitation flow at the MVP, so one team per player.
    const { data: teamRow, error: teamError } = await supabase
      .from('teams')
      .select('id, name, wins, tier, owner')
      .eq('owner', id)
      .maybeSingle();
    if (teamError) {
      setFailure(explain('your battery', teamError));
      setLoading(false);
      return;
    }
    const mine = (teamRow as Team | null) ?? null;
    setTeam(mine);

    if (!mine) {
      setLive(null);
      setLastFinished(null);
      setArchived(0);
      setLoading(false);
      return;
    }

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, phase, round, score_a, score_b, winner, is_draw, engine_version')
      .eq('team_id', mine.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (matchesError) {
      setFailure(explain('your matches', matchesError));
      setLoading(false);
      return;
    }

    const rows = (matches ?? []) as LiveMatch[];
    const unfinished = rows.filter((row) => row.phase !== 'finished');
    setLive(unfinished.find((row) => row.engine_version === ENGINE_VERSION) ?? null);
    setArchived(unfinished.filter((row) => row.engine_version !== ENGINE_VERSION).length);
    setLastFinished(rows.find((row) => row.phase === 'finished') ?? null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id ?? null;
    setUserId(id);
    await load(id);
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const id = data.session?.user.id ?? null;
      setUserId(id);
      void load(id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setUserId(id);
      void load(id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  return { loading, userId, profile, team, live, lastFinished, archived, failure, refresh };
}
