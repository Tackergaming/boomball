/**
 * Artboard 2b, the regimental roster sheet.
 *
 * Two honest reductions from the artboard, both because the data does not exist
 * yet rather than because the screen was hard:
 *
 * - **No career figures.** The drawing shows GOALS 9, SAVES 14, CRACKERS 21 per
 *   player. Nothing counts those between matches, and inventing a column that
 *   always reads zero is worse than not drawing it. The stat line shown instead
 *   is the real one, read from `role_stats`, which is the mirror the seed exists
 *   for and the first thing in this client that proves it round-trips
 * - **No bench between matches.** The bench is match state, spent and restored
 *   at kick-off, so it belongs on the match screen and not here
 *
 * What the artboard gets exactly right and is kept whole: the Tier is a ladder
 * you climb by winning, it is never chosen, and the sheet says how far along it
 * you are.
 *
 * **Shared batteries (2H.32, `00` C32).** A player owns at most one battery and
 * joins others with an invite code, so the hub gained a switcher between the
 * batteries the player is on, the roll of the chosen one (code and renewal for
 * the owner, removal for the owner, leaving for everybody else) and a form to
 * join with a code. Only the owner may abandon the running match, the SQL
 * function refuses anybody else, so the button is not drawn for a member.
 */

import { useEffect, useId, useState, type FormEvent } from 'react';

import { MATCH_ROUNDS, TIER_WINS_STAR, TIER_WINS_VETERAN } from '../../../engine/constants.js';
import { ROLES, TEAM_COMPOSITION, type Role, type Tier } from '../../../engine/stats.js';
import { joinTeam, removeMembership, rotateInviteCode, supabase } from '../lib/supabase.js';
import type { LiveMatch, Member, Team } from '../lib/useAccount.js';
import { AbandonPrompt } from '../match/AbandonPrompt.js';

interface StatRow {
  role: Role;
  tier: Tier;
  hp: number;
  ac: number;
  might: number;
  aim: number;
  agility: number;
}

/** Where each Tier starts, mirroring the generated column on `teams`. */
const LADDER: { tier: Tier; at: number }[] = [
  { tier: 'rookie', at: 0 },
  { tier: 'veteran', at: TIER_WINS_VETERAN },
  { tier: 'star', at: TIER_WINS_STAR },
];

export function TeamHub({
  userId,
  team,
  teams,
  members,
  displayName,
  live,
  archived,
  abandoned,
  onResume,
  onAbandoned,
  onCreated,
  onEnterLobby,
  onChooseTeam,
  onRollChanged,
}: {
  userId: string;
  /** The chosen battery, null when the player is on none. */
  team: Team | null;
  /** Every battery the player is on, the owned one first. */
  teams: Team[];
  /** The roll of `team`, the owner first (may be empty while loading). */
  members: Member[];
  displayName: string;
  /** An unfinished match, which there is at most one of. */
  live: LiveMatch | null;
  /** Matches from an earlier engine version: kept as a record, never resumable. */
  archived: number;
  /** Matches the owner abandoned (2H.28): counted, kept, never resumed. */
  abandoned: number;
  onResume: () => void;
  /** The running match was abandoned from here: the account is re-read. */
  onAbandoned: () => void | Promise<void>;
  /** After raising a battery or joining one: the account is re-read. */
  onCreated: () => void;
  onEnterLobby: () => void;
  onChooseTeam: (teamId: string) => void | Promise<void>;
  /** After renewing the code, removing a member or leaving: the account is re-read. */
  onRollChanged: () => void | Promise<void>;
}) {
  const [stats, setStats] = useState<StatRow[]>([]);
  // The confirmation before abandoning the running match (2H.28, `00` C29).
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    void supabase
      .from('role_stats')
      .select('role, tier, hp, ac, might, aim, agility')
      .then(({ data }) => setStats((data ?? []) as StatRow[]));
  }, []);

  if (!team) return <FoundTeam userId={userId} onCreated={onCreated} />;

  const isOwner = team.owner === userId;
  const next = LADDER.find((step) => step.at > team.wins);
  const lineFor = (role: Role) => stats.find((s) => s.role === role && s.tier === team.tier);

  return (
    <div style={S.screen}>
      <div className="hazard" />

      {teams.length > 1 && (
        <div style={S.switcher}>
          <p className="label" style={{ margin: 0 }}>
            Your batteries
          </p>
          {teams.map((one) => (
            <button
              key={one.id}
              className={one.id === team.id ? undefined : 'ghost'}
              onClick={() => void onChooseTeam(one.id)}
              data-testid="battery-switch"
              data-team-id={one.id}
              data-selected={one.id === team.id ? 'true' : 'false'}
            >
              {one.name}
            </button>
          ))}
        </div>
      )}

      <header style={S.header}>
        <div className="plate" style={S.crest}>
          <span style={S.crestText}>{initials(team.name)}</span>
        </div>
        <div>
          <p className="label" style={{ margin: 0 }}>
            3rd Silo Regiment · Home Breech
          </p>
          <h1 className="display" style={{ margin: '4px 0 0', fontSize: 40 }}>
            {team.name}
          </h1>
        </div>

        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <p className="label" style={{ margin: 0 }}>
            Current tier
          </p>
          <p className="display" style={{ margin: '2px 0 0', fontSize: 30, color: 'var(--brass)' }}>
            {team.tier}
          </p>
        </div>
      </header>

      {live && (
        <div style={S.resume}>
          <div>
            <p className="label" style={{ margin: 0, color: 'var(--brass)' }}>
              A match is running
            </p>
            <p style={S.resumeLine}>
              Round {live.round} of {MATCH_ROUNDS} · {live.score_a} to {live.score_b}. A battery plays one match
              at a time, so this one has to finish before the next kicks off.
            </p>
          </div>
          <button onClick={onResume} style={{ marginLeft: 'auto', flex: 'none' }}>
            Back to the silo
          </button>
          {isOwner && (
            <button
              className="ghost"
              onClick={() => setLeaving(true)}
              disabled={leaving}
              style={{ flex: 'none' }}
              data-testid="abandon-match"
              title="End this match with no result and open the lobby again"
            >
              Abandon this match
            </button>
          )}
        </div>
      )}
      {live && leaving && isOwner && (
        <div style={{ margin: '0 32px 22px' }}>
          <AbandonPrompt
            matchId={live.id}
            onAbandoned={async () => {
              await onAbandoned();
              setLeaving(false);
            }}
            onKeep={() => setLeaving(false)}
          />
        </div>
      )}

      {archived > 0 && (
        <p style={S.archivedNote}>
          {archived} {archived === 1 ? 'match' : 'matches'} from the old silo{' '}
          {archived === 1 ? 'is' : 'are'} archived: they were played on an earlier version of the
          game and cannot be resumed, their record is kept.
        </p>
      )}
      {abandoned > 0 && (
        <p style={S.archivedNote} data-testid="abandoned-note">
          {abandoned} {abandoned === 1 ? 'match' : 'matches'} abandoned: no result, kept, never
          resumed.
        </p>
      )}

      <section style={S.ladderBlock}>
        <p className="label" style={{ margin: 0 }}>
          {next ? `Matches to win to level up to ${next.tier}` : 'Top of the ladder'}
        </p>
        <p style={{ margin: '4px 0 12px' }}>
          <span className="display" style={{ fontSize: 34 }}>
            {team.wins}
          </span>
          {next && <span style={{ color: 'var(--text-faint)', fontSize: 18 }}> / {next.at}</span>}
        </p>
        <div style={S.ladder}>
          {LADDER.map((step) => {
            const reached = team.wins >= step.at;
            return (
              <div key={step.tier} style={{ ...S.rung, borderColor: reached ? 'var(--brass)' : 'var(--line)' }}>
                <span className="label" style={{ color: reached ? 'var(--brass)' : 'var(--text-faint)' }}>
                  {step.tier} · {step.at} {reached ? '✓' : ''}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.7, color: 'var(--text-faint)' }}>
          Once a level is reached, the lobby lets you play it again. Only wins at your own level
          climb the ladder.
        </p>
      </section>

      <TheRoll team={team} userId={userId} isOwner={isOwner} members={members} onRollChanged={onRollChanged} />

      <section style={{ padding: '0 32px' }}>
        <div style={S.sectionHead}>
          <h2 className="display" style={{ margin: 0, fontSize: 24 }}>
            Composition of the team
          </h2>
        </div>

        <div style={S.roster}>
          {TEAM_COMPOSITION.map((role, i) => {
            const line = lineFor(role);
            // The slot's standing name (2H.29, `00` C30 point 3): the k-th of
            // this role in composition order, as `engine/setup.ts` keys it.
            const k = TEAM_COMPOSITION.slice(0, i + 1).filter((r) => r === role).length;
            const standing = team.roster?.[`${role}-${k}`];
            return (
              <div key={`${role}-${i}`} style={S.card} data-roster-slot={`${role}-${k}`}>
                <p className="label" style={{ margin: 0, color: 'var(--team-own)' }}>
                  {role}
                </p>
                <p className="display" style={{ margin: '6px 0 0', fontSize: 18 }} data-roster-name>
                  {standing ?? 'Named at your first match'}
                </p>
                {line ? (
                  <p style={S.statLine}>
                    HP {line.hp} · AC {line.ac} · MELEE +{line.might} · THROW +{line.aim} · DEX +
                    {line.agility}
                  </p>
                ) : (
                  <p style={S.statLine}>reading the sheet…</p>
                )}
              </div>
            );
          })}
        </div>

        <p style={S.footnote}>
          These are your Giff, named once at your first match and the same every match after. The
          seat you take wears your own name for that match; the other side never shares a name
          with your battery. One Bulwark and one Trajector, ever.
        </p>

        <button style={{ marginTop: 22 }} onClick={onEnterLobby} disabled={!!live}>
          To the lobby
        </button>
      </section>

      <section style={{ padding: '0 32px 40px' }}>
        <div style={{ ...S.sectionHead, marginTop: 26 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 24 }}>
            Join another battery
          </h2>
        </div>
        <JoinWithCode onJoined={onCreated} />
      </section>
    </div>
  );
}

/** The four-and-four reading of an invite code: `KX7M4Q2A` shows as `KX7M · 4Q2A`. */
function formatCode(code: string): string {
  return `${code.slice(0, 4)} · ${code.slice(4)}`;
}

/**
 * The roll of the chosen battery (2H.32): the invite code and its renewal for
 * the owner, the members for everybody, removal for the owner and leaving for
 * the rest. Both removal and leaving ask twice before the delete goes out.
 */
function TheRoll({
  team,
  userId,
  isOwner,
  members,
  onRollChanged,
}: {
  team: Team;
  userId: string;
  isOwner: boolean;
  members: Member[];
  onRollChanged: () => void | Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The profile whose removal (or the player's own leaving) awaits its second click.
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // Another battery chosen: nothing of the last one's pending question carries over.
  useEffect(() => {
    setConfirming(null);
    setError(null);
  }, [team.id]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
    } catch (failure) {
      console.error('the invite code could not be copied', failure);
      setError('could not copy the code. Select it and copy it by hand.');
    }
  }

  // Same discipline as the forms: locked while it runs, every path unlocks.
  async function renew() {
    setBusy(true);
    setError(null);
    try {
      const result = await rotateInviteCode(team.id);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      await onRollChanged();
    } finally {
      setBusy(false);
    }
  }

  async function drop(profileId: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await removeMembership(team.id, profileId);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setConfirming(null);
      await onRollChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ padding: '0 32px 26px' }}>
      <div style={S.sectionHead}>
        <h2 className="display" style={{ margin: 0, fontSize: 24 }}>
          The roll
        </h2>
      </div>

      {isOwner && (
        <div style={{ marginBottom: 18 }}>
          <p className="label" style={{ margin: 0 }}>
            Invite code
          </p>
          <div style={S.codeRow}>
            <span
              className="display"
              style={{ fontSize: 34, letterSpacing: '.08em' }}
              data-testid="invite-code"
              data-code={team.invite_code}
            >
              {formatCode(team.invite_code)}
            </span>
            <button className="ghost" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="ghost" onClick={() => void renew()} disabled={busy} data-testid="new-code">
              New code
            </button>
          </div>
          <p style={S.small}>A friend types this code in their hub to join your battery. Renew it if it leaked.</p>
        </div>
      )}

      {members.length === 0 ? (
        <p style={S.small}>reading the roll…</p>
      ) : (
        <div style={S.memberList}>
          {members.map((member) => {
            const mine = member.profile_id === userId;
            const detail = [member.preferred_role, member.character_name].filter(Boolean).join(' · ');
            const asking = confirming === member.profile_id;
            return (
              <div key={member.profile_id} style={S.memberRow} data-testid="member-row" data-profile-id={member.profile_id}>
                <span style={{ fontWeight: 600 }}>
                  {member.display_name}
                  {mine && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (you)</span>}
                </span>
                {member.is_owner ? (
                  <span className="label" style={{ color: 'var(--brass)' }}>
                    owner
                  </span>
                ) : (
                  detail && <span style={S.statLine}>{detail}</span>
                )}

                {isOwner && !member.is_owner && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {asking && (
                      <button className="ghost" onClick={() => setConfirming(null)} disabled={busy}>
                        Keep
                      </button>
                    )}
                    <button
                      className="ghost"
                      data-testid="remove-member"
                      disabled={busy}
                      onClick={() => (asking ? void drop(member.profile_id) : setConfirming(member.profile_id))}
                    >
                      {asking ? 'Remove for sure?' : 'Remove'}
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isOwner && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          {confirming === userId && (
            <button className="ghost" onClick={() => setConfirming(null)} disabled={busy}>
              Keep
            </button>
          )}
          <button
            className="ghost"
            data-testid="leave-battery"
            disabled={busy}
            onClick={() => (confirming === userId ? void drop(userId) : setConfirming(userId))}
          >
            {confirming === userId ? 'Leave for sure?' : 'Leave this battery'}
          </button>
        </div>
      )}

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

      <p style={S.footnote}>Everyone on the roll meets in the lobby and takes a seat. The owner starts the match.</p>
    </section>
  );
}

/** Joins a battery with the code a friend gave. Used on the hub and on the first screen. */
function JoinWithCode({ onJoined }: { onJoined: () => void }) {
  const inputId = useId();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleaned = code.replace(/[-\s]/g, '').toUpperCase();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // The button is locked while this runs, so no path may leave without unlocking it.
    try {
      const result = await joinTeam(cleaned);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setCode('');
      onJoined();
    } catch (failure) {
      console.error('the battery could not be joined', failure);
      setError('could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 360 }}>
      <label className="label" htmlFor={inputId} style={{ display: 'block' }}>
        Invite code
      </label>
      <input
        id={inputId}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={9}
        placeholder="KX7M-4Q2A"
        autoComplete="off"
        data-testid="join-code"
      />
      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      <button
        type="submit"
        disabled={busy || cleaned.length < 8}
        style={{ marginTop: 14 }}
        data-testid="join-button"
      >
        Join
      </button>
    </form>
  );
}

/** The very first screen a new player sees after signing in. */
function FoundTeam({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // Same discipline as the lobby and the sign-in form: the button is locked
    // while this runs, so no path may leave without unlocking it.
    try {
      // `.insert().select()` is the shape migration 0002 exists for: before it,
      // the row went in and reading it back was refused by the select policy.
      const { error: failure } = await supabase
        .from('teams')
        .insert({ owner: userId, name: name.trim() })
        .select('id')
        .single();
      if (failure) {
        setError(failure.message);
        return;
      }
      onCreated();
    } catch (failure) {
      console.error('the battery could not be raised', failure);
      setError('could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...S.screen, display: 'grid', placeItems: 'center' }}>
      <div style={S.foundForm}>
      <form onSubmit={submit}>
        <h1 className="display" style={{ margin: 0, fontSize: 34 }}>
          Raise a battery
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
          A battery starts at Rookie and climbs by winning. {TIER_WINS_VETERAN} wins make Veteran, {TIER_WINS_STAR} make Star,
          and the house fields the league you play at against you. Once a level is reached, the
          lobby lets you play it again; only wins at your own level climb the ladder.
        </p>

        <label className="label" htmlFor="team" style={{ display: 'block', marginTop: 20 }}>
          Battery name
        </label>
        <input
          id="team"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
          placeholder="Ironmaw Battery"
        />

        {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}

        <button type="submit" disabled={busy || !name.trim()} style={{ marginTop: 18, width: '100%' }}>
          {busy ? 'Signing the roll' : 'Raise it'}
        </button>
      </form>

      <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
        <p className="label" style={{ margin: '0 0 12px' }}>
          Or join a battery with a code
        </p>
        <JoinWithCode onJoined={onCreated} />
      </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

const S: Record<string, React.CSSProperties> = {
  screen: { height: '100%', overflowY: 'auto', background: 'var(--page)' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '26px 32px 18px',
  },
  crest: { width: 64, height: 64, border: '2px solid var(--team-own)', flex: 'none' },
  crestText: {
    fontFamily: 'var(--display)',
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: '.08em',
    color: 'var(--team-own)',
  },
  ladderBlock: { padding: '0 32px 26px' },
  resume: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    margin: '0 32px 22px',
    padding: '14px 18px',
    background: 'var(--panel-deep)',
    border: '1px solid var(--brass-dim)',
  },
  resumeLine: {
    margin: '5px 0 0',
    fontSize: 12,
    lineHeight: 1.6,
    color: 'var(--text-dim)',
    maxWidth: 620,
  },
  archivedNote: {
    margin: '0 32px 22px',
    fontSize: 12,
    lineHeight: 1.6,
    color: 'var(--text-faint)',
    maxWidth: 720,
  },
  ladder: { display: 'flex', gap: 10 },
  rung: { padding: '8px 14px', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line)', background: 'var(--panel-deep)' },
  sectionHead: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 14,
    borderTop: '1px solid var(--line)',
    paddingTop: 18,
    marginBottom: 14,
  },
  roster: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  card: { padding: 14, background: 'var(--panel)', border: '1px solid var(--line)' },
  statLine: {
    margin: '8px 0 0',
    fontFamily: 'var(--mono)',
    fontSize: 11,
    letterSpacing: '.06em',
    color: 'var(--text-dim)',
  },
  footnote: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 1.7,
    color: 'var(--text-faint)',
    maxWidth: 720,
  },
  switcher: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: '16px 32px 0',
  },
  codeRow: { display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 0' },
  small: { margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--text-faint)' },
  memberList: { display: 'grid', gap: 8, maxWidth: 720 },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '10px 14px',
    background: 'var(--panel)',
    border: '1px solid var(--line)',
  },
  foundForm: {
    width: 440,
    padding: 30,
    background: 'var(--panel)',
    border: '1px solid var(--line)',
  },
};

export { ROLES };
