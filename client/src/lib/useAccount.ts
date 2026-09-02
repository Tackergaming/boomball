/**
 * Who is signed in, what team they own, and whether a match is waiting.
 *
 * One hook rather than a store, because the whole shape is four rows and the
 * screens that need them are never mounted at the same time. Everything it
 * reads goes through RLS as the player: a query that returns nothing here
 * because a policy hid it is the same nothing the player would see, which is
 * exactly the behaviour worth testing in the browser.
 */

import { useCallback, useEffect, useState } from 'react';

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
}

export interface Account {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  team: Team | null;
  live: LiveMatch | null;
  /** The last finished match, so the results screen has something to show. */
  lastFinished: LiveMatch | null;
  refresh: () => Promise<void>;
}

export function useAccount(): Account {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [live, setLive] = useState<LiveMatch | null>(null);
  const [lastFinished, setLastFinished] = useState<LiveMatch | null>(null);

  const load = useCallback(async (id: string | null) => {
    if (!id) {
      setProfile(null);
      setTeam(null);
      setLive(null);
      setLastFinished(null);
      setLoading(false);
      return;
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', id)
      .maybeSingle();
    setProfile((profileRow as Profile | null) ?? null);

    // The owner's team. Playing on somebody else's team is a lobby invitation
    // and there is no invitation flow at the MVP, so one team per player.
    const { data: teamRow } = await supabase
      .from('teams')
      .select('id, name, wins, tier, owner')
      .eq('owner', id)
      .maybeSingle();
    const mine = (teamRow as Team | null) ?? null;
    setTeam(mine);

    if (!mine) {
      setLive(null);
      setLastFinished(null);
      setLoading(false);
      return;
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('id, phase, round, score_a, score_b, winner, is_draw')
      .eq('team_id', mine.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const rows = (matches ?? []) as LiveMatch[];
    setLive(rows.find((row) => row.phase !== 'finished') ?? null);
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

  return { loading, userId, profile, team, live, lastFinished, refresh };
}
