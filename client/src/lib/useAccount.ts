/**
 * Who is signed in, which teams they are on, and whether a match is waiting.
 *
 * One hook rather than a store, because the whole shape is a handful of rows
 * and the screens that need them are never mounted at the same time.
 * Everything it reads goes through RLS as the player: a query that returns
 * nothing here because a policy hid it is the same nothing the player would
 * see, which is exactly the behaviour worth testing in the browser.
 *
 * **Every read reports its failure** (audit line A12). It used to ignore
 * `error` on all four, so a project in pause or a network down landed a signed
 * player on "Raise a team" as if they were new, and the button then failed
 * without a word. That is the screen Jérôme's friends would have seen in
 * September. A failed read now stops the load and names itself in `failure`,
 * and `App` shows it with a way to try again.
 *
 * **Several teams per player since 2H.32** (`00` C32 point 1, Jérôme's
 * "a"): a player owns at most one team and may have joined others through
 * an invite code. `teams` is read with no filter, RLS (`teams_read_member`)
 * returns exactly the ones the player is on, and `team` is the one chosen for
 * the evening, kept in `localStorage`, the owned one by default. The match
 * rows and the member list belong to that team.
 *
 * **A match is only live on the engine that wrote it** (audit line A11). The
 * `matches` row carries `engine_version`; a match opened on an earlier engine
 * cannot be replayed by this one, so it is neither resumed nor counted as the
 * team's running match. It is archived, not lost: its events stay in the
 * database, and the hub says how many such matches the team has.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ENGINE_VERSION } from '../../../engine/constants.js';
import type { Role } from '../../../engine/stats.js';
import { mergeRoll, pickTeam } from './roll.js';
import { supabase } from './supabase.js';
import { ROLL_EVENT, teamTopic } from './teamChannel.js';

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
  /** The standing names by slot (2H.29), null until the team's first match draws them. */
  roster: Record<string, string> | null;
  /** Eight characters a friend types to join (2H.32). Shown to the owner. */
  invite_code: string;
}

/** One line of the team's roll, the owner first (2H.32, `battery_members`). */
export interface Member {
  profile_id: string;
  display_name: string;
  /** Null for the owner, whose seat is set in the lobby. */
  preferred_role: Role | null;
  character_name: string | null;
  is_owner: boolean;
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
  /** When the owner abandoned it (2H.28, `00` C29): no result, never resumed. Null otherwise. */
  abandoned_at: string | null;
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
  /** Every team the player is on, the owned one first. */
  teams: Team[];
  /** The team chosen for the evening, or null when the player is on none. */
  team: Team | null;
  /** Picks another of `teams`; kept in `localStorage`, re-reads its matches and members. */
  chooseTeam: (teamId: string) => Promise<void>;
  /** The roll of `team`, the owner first. Empty until read. */
  members: Member[];
  /** The unfinished match on the current engine, which there is at most one of. */
  live: LiveMatch | null;
  /** The last finished match, so the results screen has something to show. */
  lastFinished: LiveMatch | null;
  /** Unfinished matches written by an earlier engine: archived, never resumed. */
  archived: number;
  /** Matches the owner abandoned (2H.28): no result, kept, never resumed. */
  abandoned: number;
  /**
   * Why the account could not be read, in words a player can act on, or null.
   * Set by the first read that fails; the rest of the load is abandoned.
   */
  failure: string | null;
  /**
   * Re-reads everything. With `preferTeamId`, that team becomes the chosen one
   * (2H.34): joining by code lands on the joined team, not on the old one.
   */
  refresh: (preferTeamId?: string) => Promise<void>;
}

const TEAM_KEY = 'boomball.team';

/** The one line a player gets, with the server's own words after it. */
function explain(what: string, error: { message: string }): string {
  return `the server did not answer when reading ${what}: ${error.message}`;
}

function rememberedTeam(): string | null {
  try {
    return localStorage.getItem(TEAM_KEY);
  } catch {
    return null;
  }
}

function rememberTeam(id: string): void {
  try {
    localStorage.setItem(TEAM_KEY, id);
  } catch {
    // A browser with site data blocked still gets to play, just not to remember.
  }
}

export function useAccount(): Account {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [live, setLive] = useState<LiveMatch | null>(null);
  const [lastFinished, setLastFinished] = useState<LiveMatch | null>(null);
  const [archived, setArchived] = useState(0);
  const [abandoned, setAbandoned] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  /** The team id the player last chose, so a refresh keeps it. */
  const chosenRef = useRef<string | null>(rememberedTeam());
  /** The user whose profile was last read, so a refresh of the same one keeps it on screen. */
  const loadedForRef = useRef<string | null>(null);

  /** The matches and the roll of one team. Returns false when a read failed. */
  const loadTeam = useCallback(async (mine: Team): Promise<boolean> => {
    const [{ data: matches, error: matchesError }, { data: roll, error: rollError }] = await Promise.all([
      supabase
        .from('matches')
        .select('id, phase, round, score_a, score_b, winner, is_draw, engine_version, abandoned_at')
        .eq('team_id', mine.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.rpc('battery_members', { team: mine.id }),
    ]);
    if (matchesError) {
      setFailure(explain('your matches', matchesError));
      return false;
    }
    if (rollError) {
      setFailure(explain("your team's roll", rollError));
      return false;
    }

    const rows = (matches ?? []) as LiveMatch[];
    // An abandoned match (2H.28) is neither live nor archived: it has no
    // result and is only counted, so the hub can say it is kept.
    const unfinished = rows.filter((row) => row.phase !== 'finished' && !row.abandoned_at);
    setLive(unfinished.find((row) => row.engine_version === ENGINE_VERSION) ?? null);
    setArchived(unfinished.filter((row) => row.engine_version !== ENGINE_VERSION).length);
    setAbandoned(rows.filter((row) => row.abandoned_at).length);
    setLastFinished(rows.find((row) => row.phase === 'finished') ?? null);
    setMembers(mergeRoll((roll ?? []) as Member[]));
    return true;
  }, []);

  const clearTeam = useCallback(() => {
    setLive(null);
    setLastFinished(null);
    setArchived(0);
    setAbandoned(0);
    setMembers([]);
  }, []);

  const load = useCallback(
    async (id: string | null) => {
      setFailure(null);

      if (!id) {
        // Signed out: the next sign-in on this browser, even of the same
        // player, must read the profile afresh, or the render that learns the
        // user id sees it beside this `null` and `App` inserts a profile that
        // exists (a 409, seen the first time "Sign out" existed, phase 8).
        loadedForRef.current = null;
        setProfile(null);
        setTeams([]);
        setTeam(null);
        clearTeam();
        setLoading(false);
        return;
      }

      // Forgotten before the first await, so the render that learns the user id
      // never sees it beside a `null` profile left over from the signed-out
      // state. That pairing is what sent `App` to insert a profile that existed,
      // and the 409 it got back was the unexplained failure on every sign-in.
      // Only for a user the hook has not read yet: on a refresh of the same
      // player the profile stays, or the display name flickers to "" for a
      // render, the lobby tracks the seat twice in a row, and the presence
      // rate limit closes the channel (2H.35, `00` C34).
      if (loadedForRef.current !== id) setProfile(undefined);
      loadedForRef.current = id;

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

      // Every team the player is on: no filter, RLS answers with the owned
      // one and the joined ones (2H.32). The owned one is listed first.
      const { data: teamRows, error: teamError } = await supabase
        .from('teams')
        .select('id, name, wins, tier, owner, roster, invite_code')
        .order('created_at', { ascending: true });
      if (teamError) {
        setFailure(explain('your teams', teamError));
        setLoading(false);
        return;
      }
      const all = ((teamRows ?? []) as Team[]).sort((a, b) =>
        Number(b.owner === id) - Number(a.owner === id),
      );
      setTeams(all);

      const mine = pickTeam(all, id, chosenRef.current);
      setTeam(mine);
      if (!mine) {
        clearTeam();
        setLoading(false);
        return;
      }
      chosenRef.current = mine.id;
      rememberTeam(mine.id);

      await loadTeam(mine);
      setLoading(false);
    },
    [clearTeam, loadTeam],
  );

  const refresh = useCallback(
    async (preferTeamId?: string) => {
      if (preferTeamId) {
        chosenRef.current = preferTeamId;
        rememberTeam(preferTeamId);
      }
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setUserId(id);
      await load(id);
    },
    [load],
  );

  /**
   * The hub stays true without a reload (2H.34). Two signals re-read the
   * chosen team's matches and roll: the team's channel saying its roll
   * changed (a friend joined, left, was removed, the code was renewed), and
   * the tab coming back into view, for everything a message could have missed.
   */
  const teamRef = useRef<Team | null>(null);
  teamRef.current = team;
  const teamId = team?.id ?? null;
  useEffect(() => {
    if (!teamId) return;
    const again = () => {
      const current = teamRef.current;
      if (current && current.id === teamId) void loadTeam(current);
    };
    const channel = supabase.channel(teamTopic(teamId));
    channel.on('broadcast', { event: ROLL_EVENT }, again).subscribe();
    const onVisible = () => {
      if (document.visibilityState === 'visible') again();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [teamId, loadTeam]);

  const chooseTeam = useCallback(
    async (teamId: string) => {
      const next = teams.find((one) => one.id === teamId);
      if (!next) return;
      chosenRef.current = next.id;
      rememberTeam(next.id);
      setTeam(next);
      setFailure(null);
      await loadTeam(next);
    },
    [teams, loadTeam],
  );

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

  return {
    loading,
    userId,
    profile,
    teams,
    team,
    chooseTeam,
    members,
    live,
    lastFinished,
    archived,
    abandoned,
    failure,
    refresh,
  };
}
