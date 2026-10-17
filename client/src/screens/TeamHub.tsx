/**
 * The team hub (2H.34, the team interface), rebuilt on the mockup Jérôme
 * validated: one screen, one call to action, the crowd at the silo gate
 * behind glass panels.
 *
 * Top to bottom: the team's name and its ladder (the Tier is climbed by
 * winning, never chosen, and the three rungs say how far along); the band
 * that is the screen's one action, "Enter the lobby", which names who is
 * already waiting there, or becomes the running match with "Back to the
 * silo"; two columns, the players with the invite card for the owner, and the
 * seven Giff the team fields; a grey footer to join another team with a code
 * and the record of archived and abandoned matches.
 *
 * Who is in the lobby comes from the lobby channel `App` holds (`lobby`); the
 * hub only listens and never takes a seat. Every write to the roll (joining,
 * leaving, removing, a new code) is followed by `announceTeamChange`, so the
 * other hubs on the team re-read it.
 *
 * Two honest reductions, kept from the earlier sheet: no career figures,
 * because nothing counts them between matches, and no bench, which is match
 * state. The stat line is the real one, read from `role_stats`.
 *
 * Only the owner may abandon the running match, the SQL function refuses
 * anybody else, so the button is not drawn for a member.
 */

import { useEffect, useId, useState, type FormEvent } from 'react';

import { MATCH_ROUNDS, TIER_WINS_STAR, TIER_WINS_VETERAN } from '../../../engine/constants.js';
import { TEAM_COMPOSITION, type Role, type Tier } from '../../../engine/stats.js';
import { joinTeam, removeMembership, rotateInviteCode, supabase } from '../lib/supabase.js';
import { announceTeamChange } from '../lib/teamChannel.js';
import type { LiveMatch, Member, Team } from '../lib/useAccount.js';
import { AbandonPrompt } from '../match/AbandonPrompt.js';
import { AccountMenu } from './AccountMenu.js';
import { alreadyInLobby, cleanCode, formatCode, ladderOf, tierName, type Seat } from './lobbySeats.js';
import { RoleGlyph } from './RoleGlyph.js';
import { CopyCode, Shell } from './Shell.js';

interface StatRow {
  role: Role;
  tier: Tier;
  hp: number;
  ac: number;
  might: number;
  aim: number;
  agility: number;
}

export function TeamHub({
  userId,
  team,
  teams,
  members,
  displayName,
  live,
  archived,
  abandoned,
  lobby,
  onResume,
  onSignedOut,
  onAbandoned,
  onCreated,
  onJoined,
  onEnterLobby,
  onChooseTeam,
  onRollChanged,
}: {
  userId: string;
  /** The chosen team, null when the player is on none. */
  team: Team | null;
  /** Every team the player is on, the owned one first. */
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
  /** Who sits in the lobby of the chosen team, from the shared channel; null until the first sync. */
  lobby: Seat[] | null;
  onResume: () => void;
  /** After "Sign out" in the Account menu: the app forgets where it was. */
  onSignedOut: () => void;
  /** The running match was abandoned from here: the account is re-read. */
  onAbandoned: () => void | Promise<void>;
  /** After raising a team: the account is re-read. */
  onCreated: () => void;
  /** After joining a team by code: the account is re-read and the joined team chosen. */
  onJoined: (teamId: string) => void | Promise<void>;
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

  if (!team) {
    return (
      <FoundTeam
        userId={userId}
        displayName={displayName}
        onCreated={onCreated}
        onJoined={onJoined}
        onSignedOut={onSignedOut}
      />
    );
  }

  const isOwner = team.owner === userId;
  const ladder = ladderOf(team.wins);
  const lineFor = (role: Role) => stats.find((s) => s.role === role && s.tier === team.tier);
  const present = new Set((lobby ?? []).map((seat) => seat.profileId));
  const waiting = alreadyInLobby(
    (lobby ?? []).filter((seat) => seat.profileId !== userId).map((seat) => seat.displayName),
  );

  return (
    <Shell>
      <header className="bb-top">
        <div className="plate bb-plate bb-plate-own" style={{ width: 64, height: 64, fontSize: 22 }} aria-hidden="true">
          {initials(team.name)}
        </div>
        <div>
          <p className="label" style={{ margin: 0 }}>
            Team{!isOwner && ' · you joined with a code'}
          </p>
          <h1 className="display">{team.name}</h1>
        </div>

        <div className="bb-tierblock">
          <p className="label" style={{ margin: 0 }}>
            {tierName(team.tier)} ·{' '}
            {ladder.next
              ? `${team.wins} of ${ladder.next.at} wins to ${tierName(ladder.next.tier)}`
              : 'Top of the ladder'}
          </p>
          <p className="display bb-tier">{tierName(team.tier)}</p>
          <span
            className="bb-rungs"
            role="img"
            aria-label={ladder.next ? `${team.wins} wins of ${ladder.next.at}` : 'Top of the ladder'}
          >
            {ladder.rungs.map((won, i) => (
              <span key={i} className={won ? 'bb-rung won' : 'bb-rung'} />
            ))}
          </span>
        </div>

        {teams.length > 1 && <TeamSwitch team={team} teams={teams} onChooseTeam={onChooseTeam} />}
        <AccountMenu displayName={displayName} onSignedOut={onSignedOut} />
      </header>

      {live ? (
        <div className="bb-cta live">
          <div>
            <p className="label" style={{ margin: 0, color: 'var(--brass)' }}>
              A match is running
            </p>
            <h2 className="display">
              Round {live.round} of {MATCH_ROUNDS} · {live.score_a} to {live.score_b}
            </h2>
            <p className="bb-who">A team plays one match at a time: this one has to finish before the next kicks off.</p>
          </div>
          <div className="bb-cta-actions">
            {isOwner && (
              <button
                className="ghost bb-small"
                onClick={() => setLeaving(true)}
                disabled={leaving}
                data-testid="abandon-match"
                title="End this match with no result and open the lobby again"
              >
                Abandon this match
              </button>
            )}
            <button className="ghost bb-small" disabled title="A team plays one match at a time">
              Enter the lobby
            </button>
            <button className="bb-big" onClick={onResume}>
              Back to the silo
            </button>
          </div>
        </div>
      ) : (
        <div className="bb-cta">
          <div>
            <p className="label" style={{ margin: 0, color: 'var(--team-own)' }}>
              The silo is open
            </p>
            <h2 className="display">Ready to play</h2>
            <p className="bb-who">
              {waiting ? (
                <>
                  <span className="bb-dot" /> {waiting}
                </>
              ) : (
                'Nobody is in the lobby yet. The house fills the other seats.'
              )}
            </p>
          </div>
          <div className="bb-cta-actions">
            <button className="bb-big" onClick={onEnterLobby}>
              Enter the lobby
            </button>
          </div>
        </div>
      )}
      {live && leaving && isOwner && (
        <div style={{ marginTop: 14 }}>
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

      <div className="bb-cols">
        <ThePlayers team={team} userId={userId} isOwner={isOwner} members={members} present={present} onRollChanged={onRollChanged} />

        <section className="bb-block">
          <h3 className="display">
            Your Giff <span className="label">the seven who take the field</span>
          </h3>
          <div className="bb-giff">
            {TEAM_COMPOSITION.map((role, i) => {
              const line = lineFor(role);
              // The slot's standing name (2H.29, `00` C30 point 3): the k-th of
              // this role in composition order, as `engine/setup.ts` keys it.
              const k = TEAM_COMPOSITION.slice(0, i + 1).filter((r) => r === role).length;
              const standing = team.roster?.[`${role}-${k}`];
              return (
                <div
                  key={`${role}-${i}`}
                  className="bb-giffrow"
                  data-roster-slot={`${role}-${k}`}
                  title={line ? `MELEE +${line.might} · THROW +${line.aim} · DEX +${line.agility}` : undefined}
                >
                  <RoleGlyph role={role} />
                  <div style={{ minWidth: 0 }}>
                    <div className={standing ? 'n' : 'n unnamed'} data-roster-name>
                      {standing ?? 'Named at your first match'}
                    </div>
                    <div className="s">{line ? `${role} · HP ${line.hp} · AC ${line.ac}` : `${role} · reading the sheet…`}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="bb-caption">
            Named once at your first match, the same every match after. The seat you take in the lobby wears the name
            you give it.
          </p>
        </section>
      </div>

      <footer className="bb-foot">
        <JoinWithCode label="Join a team" onJoined={onJoined} inline />
        {(archived > 0 || abandoned > 0) && (
          <span className="bb-right">
            {archived > 0 && (
              <span title="Played on an earlier version of the game: the record is kept, they cannot be resumed">
                {archived} archived
              </span>
            )}
            {archived > 0 && abandoned > 0 && ' · '}
            {abandoned > 0 && (
              <span data-testid="abandoned-note" title="No result, kept, never resumed">
                {abandoned} abandoned
              </span>
            )}
          </span>
        )}
      </footer>
    </Shell>
  );
}

/** The switcher between the teams the player is on, top right of the header. */
function TeamSwitch({
  team,
  teams,
  onChooseTeam,
}: {
  team: Team;
  teams: Team[];
  onChooseTeam: (teamId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const others = teams.filter((one) => one.id !== team.id);

  // Another team chosen: the menu has done its job.
  useEffect(() => setOpen(false), [team.id]);

  return (
    <div className="bb-switch">
      <button
        className="ghost bb-small"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        data-testid="team-switch-open"
      >
        Switch team{others.length === 1 ? ` · ${others[0]!.name}` : ''} ▾
      </button>
      {open && (
        <div className="bb-switch-menu" role="menu">
          {teams.map((one) => (
            <button
              key={one.id}
              role="menuitem"
              className={one.id === team.id ? 'bb-small' : 'ghost bb-small'}
              onClick={() => {
                setOpen(false);
                void onChooseTeam(one.id);
              }}
              data-testid="team-switch"
              data-team-id={one.id}
              data-selected={one.id === team.id ? 'true' : 'false'}
            >
              {one.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The players of the chosen team and, for the owner, the invite card: the
 * code and its renewal. The owner removes a member, a member leaves; both ask
 * twice before the delete goes out.
 */
function ThePlayers({
  team,
  userId,
  isOwner,
  members,
  present,
  onRollChanged,
}: {
  team: Team;
  userId: string;
  isOwner: boolean;
  members: Member[];
  /** The profiles sitting in the lobby right now. */
  present: ReadonlySet<string>;
  onRollChanged: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The profile whose removal (or the player's own leaving) awaits its second click.
  const [confirming, setConfirming] = useState<string | null>(null);

  // Another team chosen: nothing of the last one's pending question carries over.
  useEffect(() => {
    setConfirming(null);
    setError(null);
  }, [team.id]);

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
      await announceTeamChange(team.id);
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
      await announceTeamChange(team.id);
      await onRollChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bb-block">
      <h3 className="display">
        Players <span className="label">{members.length > 0 && `${members.length} on the team`}</span>
      </h3>

      {members.length === 0 ? (
        <p className="bb-caption" style={{ marginTop: 0 }}>
          reading the roll…
        </p>
      ) : (
        members.map((member) => {
          const mine = member.profile_id === userId;
          const detail = [member.preferred_role, member.character_name].filter(Boolean).join(' · ');
          const asking = confirming === member.profile_id;
          return (
            <div key={member.profile_id} className="bb-player" data-testid="member-row" data-profile-id={member.profile_id}>
              <div
                className={mine ? 'plate bb-plate bb-plate-own' : 'plate bb-plate bb-plate-brass'}
                style={{ width: 40, height: 40, fontSize: 14 }}
                aria-hidden="true"
              >
                {initials(member.display_name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="bb-player-name">
                  {member.display_name}
                  {mine && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (you)</span>}
                </div>
                <div className="bb-meta">
                  {member.is_owner && <span className="bb-tag brass">Owner</span>}
                  {detail && <span className="bb-tag">{detail}</span>}
                  {present.has(member.profile_id) && (
                    <span className="bb-tag live" data-testid="in-lobby">
                      <span className="bb-dot" />
                      In the lobby
                    </span>
                  )}
                </div>
              </div>

              {isOwner && !member.is_owner && (
                <span className="bb-player-actions">
                  {asking && (
                    <button className="ghost bb-small" onClick={() => setConfirming(null)} disabled={busy}>
                      Keep
                    </button>
                  )}
                  <button
                    className={asking ? 'ghost bb-small' : 'bb-x'}
                    data-testid="remove-member"
                    disabled={busy}
                    title={`Remove ${member.display_name} from the team`}
                    aria-label={asking ? undefined : `Remove ${member.display_name}`}
                    onClick={() => (asking ? void drop(member.profile_id) : setConfirming(member.profile_id))}
                  >
                    {asking ? 'Remove for sure?' : '✕'}
                  </button>
                </span>
              )}
            </div>
          );
        })
      )}

      {isOwner && (
        <div className="bb-invite">
          <div>
            <p className="label" style={{ margin: '0 0 4px' }}>
              Invite a friend
            </p>
            <div className="display bb-code" data-testid="invite-code" data-code={team.invite_code}>
              {formatCode(team.invite_code)}
            </div>
          </div>
          <CopyCode code={team.invite_code} onError={setError} />
          <button className="ghost bb-small" onClick={() => void renew()} disabled={busy} data-testid="new-code">
            New code
          </button>
          <p className="bb-how">
            A friend types this code under Join a team, on their own hub. The moment they do, they appear in this list.
          </p>
        </div>
      )}

      {!isOwner && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          {confirming === userId && (
            <button className="ghost bb-small" onClick={() => setConfirming(null)} disabled={busy}>
              Keep
            </button>
          )}
          <button
            className="ghost bb-small"
            data-testid="leave-team"
            disabled={busy}
            onClick={() => (confirming === userId ? void drop(userId) : setConfirming(userId))}
          >
            {confirming === userId ? 'Leave for sure?' : 'Leave this team'}
          </button>
        </div>
      )}

      {error && (
        <p className="error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * Joins a team with the code a friend gave. Inline in the hub's footer,
 * stacked on the first screen. The joined team is announced to its other hubs,
 * then chosen.
 */
function JoinWithCode({
  label,
  onJoined,
  inline = false,
}: {
  label: string;
  onJoined: (teamId: string) => void | Promise<void>;
  inline?: boolean;
}) {
  const inputId = useId();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleaned = cleanCode(code);

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
      const joined = result.value;
      setCode('');
      await announceTeamChange(joined);
      await onJoined(joined);
    } catch (failure) {
      console.error('the team could not be joined', failure);
      setError('could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const field = (
    <input
      id={inputId}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      maxLength={9}
      placeholder="KX7M-4Q2A"
      autoComplete="off"
      data-testid="join-code"
      style={inline ? undefined : { fontFamily: 'var(--mono)', letterSpacing: '.1em' }}
    />
  );
  const button = (
    <button
      type="submit"
      className={inline ? 'ghost bb-small' : 'ghost'}
      disabled={busy || cleaned.length < 8}
      data-testid="join-button"
      style={inline ? { flex: 'none' } : { marginTop: 14 }}
    >
      Join
    </button>
  );

  if (inline) {
    return (
      <>
        <form onSubmit={submit}>
          <label className="label" htmlFor={inputId}>
            {label}
          </label>
          {field}
          {button}
        </form>
        {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
      </>
    );
  }

  return (
    <form onSubmit={submit}>
      <label className="label" htmlFor={inputId} style={{ display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {field}
      {error && (
        <p className="error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      {button}
    </form>
  );
}

/** The very first screen a new player sees after signing in. */
function FoundTeam({
  userId,
  displayName,
  onCreated,
  onJoined,
  onSignedOut,
}: {
  userId: string;
  displayName: string;
  onCreated: () => void;
  onJoined: (teamId: string) => void | Promise<void>;
  onSignedOut: () => void;
}) {
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
      console.error('the team could not be raised', failure);
      setError('could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell center>
      <div className="bb-found-top">
        <AccountMenu displayName={displayName} onSignedOut={onSignedOut} />
      </div>
      <div className="bb-glass bb-found">
        <form onSubmit={submit}>
          <p className="label" style={{ margin: 0, color: 'var(--team-own)' }}>
            The silo is open
          </p>
          <h1 className="display" style={{ margin: '4px 0 0', fontSize: 34 }}>
            Raise a team
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
            A team starts at Rookie and climbs by winning. {TIER_WINS_VETERAN} wins make Veteran, {TIER_WINS_STAR} make
            Star, and the house fields the league you play at against you. Once a level is reached, the lobby lets you
            play it again; only wins at your own level climb the ladder.
          </p>

          <label className="label" htmlFor="team" style={{ display: 'block', marginTop: 20, marginBottom: 6 }}>
            Team name
          </label>
          <input
            id="team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
            placeholder="Ironmaw Giff"
          />

          {error && (
            <p className="error" style={{ marginTop: 14 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !name.trim()} style={{ marginTop: 18, width: '100%' }}>
            {busy ? 'Signing the roll' : 'Raise it'}
          </button>
        </form>

        <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <JoinWithCode label="Or join a team with a code" onJoined={onJoined} />
        </div>
      </div>
    </Shell>
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
