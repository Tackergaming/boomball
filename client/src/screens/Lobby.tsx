/**
 * Artboard 2c, the shared lobby (2H.32, `00` C32 points 2 and 3).
 *
 * The drawing showed three seats, an invite link and a per-seat ready state,
 * and only seat one was built because nobody could join a battery. Since 2H.32
 * a friend joins with a code (`TeamHub`), and this screen is where the members
 * meet before a match: **everyone present has a seat**, picks their own name
 * and role, and says they are ready; **the owner alone starts**, when every
 * other present member is ready, and picks the league. Jérôme chose this over
 * the owner composing the party alone: "chacun choisisse son rôle dans un lobby
 * partagé où tout le monde se voit".
 *
 * Who is here is **Realtime presence** on `lobby:<teamId>`, keyed by user id so
 * a reload replaces rather than duplicates. Nothing is written to the database
 * until the owner starts: `create-match` receives the seats as this screen
 * shows them at that instant. Closing the tab removes you from the list. When
 * the match opens, the owner broadcasts `started` on the same channel and every
 * other client re-reads its account and lands on the board.
 *
 * Solo is unchanged: the owner alone in the lobby sees their own seat and
 * "Start match", exactly as before. The owner never has to tick "Ready": their
 * click on "Start match" is their ready.
 *
 * The positions-left panel is kept and is real, computed from `TEAM_COMPOSITION`
 * minus the roles the present members hold. It is what tells a player that one
 * Bulwark and one Trajector is the whole allowance, ever.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { TEAM_SIZE, TIER_WINS_STAR, TIER_WINS_VETERAN } from '../../../engine/constants.js';
import { TIERS, tierAllowed, type Role, type Tier } from '../../../engine/stats.js';
import { createMatch, saveSeatPreference, supabase } from '../lib/supabase.js';
import type { Member, Team } from '../lib/useAccount.js';
import { ROLES, canStart, fielded, openRoles, seatRequests, type Seat } from './lobbySeats.js';

/** The wins that open each league, mirroring the generated column on `teams`. */
const WINS_FOR: Record<Tier, number> = { rookie: 0, veteran: TIER_WINS_VETERAN, star: TIER_WINS_STAR };

/** The league's name as the buttons wear it. */
const cap = (tier: Tier) => tier[0]!.toUpperCase() + tier.slice(1);

const ROLE_BLURB: Record<Role, string> = {
  striker: 'Takes the shot. Best arm on the field and the thinnest hide of the three that matter.',
  breaker: 'Carries and clears. Heavy bat, heavy legs, no aim worth the name.',
  bulwark: 'Stands in the Furnace mouth. One per side, ever, and the only one who can block a shot.',
  trajector: 'Reads the arc. The only Giff who will chase the Spark when it drops in round six.',
};

export function Lobby({
  userId,
  team,
  members,
  displayName,
  onOpened,
  onBack,
}: {
  userId: string;
  team: Team;
  /** The roll, for the saved role and name of this player. */
  members: Member[];
  displayName: string;
  onOpened: () => Promise<void>;
  onBack: () => void;
}) {
  const isOwner = team.owner === userId;
  const saved = members.find((member) => member.profile_id === userId) ?? null;

  const [role, setRole] = useState<Role>(saved?.preferred_role ?? 'striker');
  const [name, setName] = useState(saved?.character_name ?? displayName);
  const [ready, setReady] = useState(false);
  // The league the match is played at (2H.27, `00` C28): the battery's own
  // Tier by default, any league below it on a click, never one above. The
  // server checks the same rule; the greyed buttons are so the player sees
  // from the first match that the league will be theirs to choose. The owner
  // chooses; the others read it off the owner's seat.
  const [tier, setTier] = useState<Tier>(team.tier);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Everybody on the channel, this player included, once the first sync came. */
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const openedRef = useRef(false);

  // The owner's name is kept in their own `team_members` row like a member's
  // (policy `team_members_write` lets the owner write any row of the battery);
  // `battery_members` lists the owner without a row, so it is read here once.
  useEffect(() => {
    if (!isOwner) return;
    let live = true;
    void supabase
      .from('team_members')
      .select('preferred_role, character_name')
      .eq('team_id', team.id)
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { preferred_role: Role | null; character_name: string | null } | null;
        if (!live || !row) return;
        if (row.character_name) setName(row.character_name);
        if (row.preferred_role) setRole(row.preferred_role);
      });
    return () => {
      live = false;
    };
  }, [isOwner, team.id, userId]);

  /** My seat as the others see it. */
  const mine: Seat = useMemo(
    () => ({
      profileId: userId,
      displayName,
      name,
      role,
      ready: isOwner || ready,
      owner: isOwner,
      ...(isOwner ? { tier } : {}),
    }),
    [userId, displayName, name, role, ready, isOwner, tier],
  );

  /**
   * Opened once for this battery, closed with the screen. The `started`
   * broadcast is how a team-mate learns the owner opened the match: their
   * account is re-read and `App` puts the board on screen.
   */
  useEffect(() => {
    const channel = supabase.channel(`lobby:${team.id}`, {
      config: { presence: { key: userId, enabled: true } },
    });
    channelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        // A presence entry is the tracked payload plus a `presence_ref` the
        // library adds; only the payload is kept.
        // One seat per player: a key may carry two metas for a moment while a
        // client re-tracks its seat, and the last one is the current one.
        const all = new Map<string, Seat>();
        for (const entries of Object.values(channel.presenceState<Seat>())) {
          for (const entry of entries) {
            if (typeof entry.profileId !== 'string') continue;
            const { profileId, displayName, name, role, ready, owner, tier } = entry;
            all.set(profileId, { profileId, displayName, name, role, ready, owner, ...(tier ? { tier } : {}) });
          }
        }
        setSeats([...all.values()]);
      })
      .on('broadcast', { event: 'started' }, () => {
        if (openedRef.current) return;
        openedRef.current = true;
        void onOpened();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track(mine);
      });
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // The seat is tracked again by the effect below whenever it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, userId]);

  /** Every change of my seat is told to the others. */
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || channel.state !== 'joined') return;
    void channel.track(mine);
  }, [mine]);

  const others = useMemo(() => (seats ?? []).filter((seat) => seat.profileId !== userId), [seats, userId]);
  const everyone = useMemo(() => {
    const list = seats ?? [];
    return list.some((seat) => seat.profileId === userId) ? list : [...list, mine];
  }, [seats, userId, mine]);
  const open = useMemo(() => openRoles(others), [others]);
  const ownerSeat = everyone.find((seat) => seat.owner) ?? null;
  const shownTier: Tier = isOwner ? tier : ownerSeat?.tier ?? team.tier;

  // A role the others filled while I held it: fall back to the first open one,
  // so a seat never names a role the server would refuse.
  useEffect(() => {
    if (open.length > 0 && !open.includes(role)) setRole(open[0]!);
  }, [open, role]);

  const toggleReady = useCallback(() => {
    const next = !ready;
    setReady(next);
    // Remember the seat for next time, on my own row. A failure must not keep
    // me out of the match; the function only warns.
    if (next) void saveSeatPreference(team.id, userId, role, name);
  }, [ready, team.id, userId, role, name]);

  /**
   * Opening a match is the one place this screen leaves the browser, and every
   * way out of it has to end with the button usable again or say why not.
   * It did not, and a lobby button that reads "Loading the silo" forever is
   * indistinguishable from a game that is broken.
   */
  async function start() {
    setBusy(true);
    setError(null);
    try {
      // Remember the name for next time. Policy `team_members_write` lets the
      // owner write their own row; `preferred_role` is NOT NULL so it goes too.
      await saveSeatPreference(team.id, userId, role, name);
      const reply = await createMatch(team.id, seatRequests(everyone), tier);
      if (!reply.accepted) {
        setError(reply.reason);
        return;
      }
      // Tell the others before leaving the channel: their hub shows the board
      // on its next read. `removeChannel` in the cleanup would otherwise take
      // the message with it.
      openedRef.current = true;
      await channelRef.current?.send({ type: 'broadcast', event: 'started', payload: { matchId: reply.matchId } });
      // The match exists now. `onOpened` re-reads the account, and App puts the
      // match on screen the moment it sees an unfinished one, which unmounts
      // this component. Still being here afterwards means the row was written
      // but not read back, and the player deserves to be told rather than left
      // watching a button.
      await onOpened();
      setError('the match opened but did not come back. Reload the page and you will be in it.');
    } catch (failure) {
      console.error('the match could not be opened', failure);
      setError('the match could not be opened. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const startable = isOwner && seats !== null && canStart(everyone, userId) && !busy;
  const waitingOn = others.filter((seat) => !seat.ready).map((seat) => seat.displayName);

  return (
    <div style={S.screen}>
      <div className="hazard" />

      <header style={S.header}>
        <div>
          <p className="label" style={{ margin: 0 }}>
            {everyone.length > 1 ? 'Shared lobby · house fields the rest' : 'No waiting room · house fields both sides'}
          </p>
          <h1 className="display" style={{ margin: '4px 0 0', fontSize: 40 }}>
            Drop into the silo
          </h1>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <p className="display" style={{ margin: 0, fontSize: 22 }}>
            {team.name}
          </p>
          <p className="label" style={{ margin: '3px 0 0' }} data-testid="lobby-tier-line">
            {cap(team.tier)} battery{shownTier !== team.tier ? ` · playing ${cap(shownTier)}` : ''} ·{' '}
            {everyone.length} named {everyone.length === 1 ? 'seat' : 'seats'} · {TEAM_SIZE * 2 - everyone.length} house Giff
          </p>
        </div>
      </header>

      <div style={S.body}>
        <section style={S.seat}>
          <p className="label" style={{ margin: 0, color: 'var(--team-own)' }}>
            Your seat · name your Giff
          </p>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            disabled={ready && !isOwner}
            placeholder="Leave it blank and the house names you"
            data-testid="seat-name"
            style={{ marginTop: 10, fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '.04em' }}
          />

          <p className="label" style={{ marginTop: 22 }}>
            Position
          </p>
          <div style={S.roles}>
            {ROLES.map((r) => {
              const free = open.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={!free || (ready && !isOwner)}
                  className={r === role ? undefined : 'ghost'}
                  style={{ ...S.roleButton, opacity: free ? 1 : 0.45 }}
                  data-role={r}
                  data-taken={free ? 'false' : 'true'}
                  title={free ? ROLE_BLURB[r] : `Every ${r} seat is taken`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <p style={S.blurb}>{ROLE_BLURB[role]}</p>

          <p className="label" style={{ marginTop: 22 }}>
            League · your battery is {cap(team.tier)}
          </p>
          <div style={S.roles}>
            {TIERS.map((t) => {
              const allowed = tierAllowed(t, team.tier);
              const clickable = isOwner && allowed;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  disabled={!clickable}
                  className={t === shownTier ? undefined : 'ghost'}
                  style={{ ...S.roleButton, opacity: allowed ? 1 : 0.45 }}
                  data-league={t}
                  data-selected={t === shownTier ? 'true' : 'false'}
                  data-locked={allowed ? 'false' : 'true'}
                  title={
                    !allowed ? `${WINS_FOR[t]} wins to reach ${cap(t)}` : isOwner ? `Play at ${cap(t)}` : 'The owner picks the league'
                  }
                >
                  {cap(t)}
                  {!allowed && ` · ${WINS_FOR[t]} wins`}
                </button>
              );
            })}
          </div>
          <p style={S.blurb} data-testid="league-blurb">
            {shownTier === team.tier
              ? `${cap(shownTier)} is where your wins count: the house fields ${cap(shownTier)} against you, and a win here climbs the ladder.`
              : `A lighter match: the house fields ${cap(shownTier)} against you. A win at ${cap(shownTier)} is a win, not a rung on the ladder.`}
            {!isOwner && ' The owner picks the league.'}
          </p>

          {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 24, alignItems: 'center' }}>
            {isOwner ? (
              <button onClick={start} disabled={!startable} data-testid="start-match">
                {busy ? 'Loading the silo' : 'Start match'}
              </button>
            ) : (
              <button onClick={toggleReady} className={ready ? undefined : 'ghost'} data-testid="ready" data-ready={ready ? 'true' : 'false'}>
                {ready ? 'Ready · waiting for the owner' : 'Ready'}
              </button>
            )}
            <button className="ghost" onClick={onBack} disabled={busy}>
              Back to the hub
            </button>
            {isOwner && seats !== null && waitingOn.length > 0 && (
              <span className="label" data-testid="waiting-on">
                Waiting on {waitingOn.join(', ')}
              </span>
            )}
            {!isOwner && ownerSeat && (
              <span className="label" data-testid="owner-starts">
                {ownerSeat.displayName} starts the match
              </span>
            )}
            {!isOwner && !ownerSeat && seats !== null && (
              <span className="label" data-testid="owner-starts">
                The owner is not in the lobby yet
              </span>
            )}
          </div>
        </section>

        <aside style={S.aside}>
          <p className="label" style={{ margin: 0 }}>
            In the lobby
          </p>
          <div style={{ marginTop: 12 }} data-testid="seats">
            {everyone.map((seat) => (
              <div key={seat.profileId} style={S.seatRow} data-testid="seat-row" data-profile-id={seat.profileId} data-ready={seat.ready ? 'true' : 'false'}>
                <div>
                  <p className="display" style={{ margin: 0, fontSize: 16, color: seat.profileId === userId ? 'var(--team-own)' : undefined }}>
                    {seat.name.trim() || seat.displayName}
                    {seat.profileId === userId && <span className="label" style={{ marginLeft: 8 }}>you</span>}
                    {seat.owner && <span className="label" style={{ marginLeft: 8, color: 'var(--brass)' }}>owner</span>}
                  </p>
                  <p className="label" style={{ margin: '3px 0 0' }}>
                    {seat.displayName} · {seat.role}
                  </p>
                </div>
                <span className="label" style={{ color: seat.ready ? 'var(--team-own)' : 'var(--text-faint)' }}>
                  {seat.owner ? 'starts' : seat.ready ? 'ready' : 'not ready'}
                </span>
              </div>
            ))}
            {seats === null && (
              <p className="label" style={{ margin: '8px 0 0', animation: 'bb-tick 1.4s infinite' }}>
                Joining the lobby
              </p>
            )}
          </div>

          <p className="label" style={{ margin: '20px 0 0' }}>
            Positions a side fields
          </p>
          <div style={{ marginTop: 12 }}>
            {ROLES.map((r) => {
              const taken = everyone.filter((seat) => seat.role === r).length;
              return (
                <div key={r} style={S.countRow}>
                  <span className="label" style={{ color: r === role ? 'var(--team-own)' : undefined }}>
                    {r}
                  </span>
                  <span style={S.count}>
                    {taken > 0 && <span className="label" style={{ marginRight: 8 }}>{taken} taken ·</span>}
                    {fielded(r)}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ ...S.blurb, marginTop: 16 }}>
            One Bulwark, one Trajector, ever. The {TEAM_SIZE * 2 - everyone.length} other Giff on the field are the house.
          </p>

          <div style={S.notice}>
            <p className="label" style={{ margin: 0 }}>
              Bringing friends
            </p>
            <p style={{ ...S.blurb, marginTop: 8 }}>
              Everyone on your battery who opens this lobby takes a seat. Give them the invite code from
              the hub. Up to three named seats; the house fields the rest.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  screen: { height: '100%', overflowY: 'auto', background: 'var(--page)' },
  header: { display: 'flex', alignItems: 'center', gap: 16, padding: '26px 32px 20px' },
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(520px, 1fr) 340px',
    gap: 20,
    padding: '0 32px 32px',
    alignItems: 'start',
  },
  seat: { padding: 24, background: 'var(--panel)', border: '1px solid var(--line)' },
  roles: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  roleButton: { fontSize: 14, padding: '10px 18px' },
  blurb: { marginTop: 14, fontSize: 12, lineHeight: 1.7, color: 'var(--text-faint)' },
  aside: { padding: 20, background: 'var(--panel-deep)', border: '1px solid var(--line)' },
  seatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid rgba(43,52,57,.6)',
  },
  countRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 0',
    borderBottom: '1px solid rgba(43,52,57,.6)',
  },
  count: { fontFamily: 'var(--display)', fontSize: 19, color: 'var(--brass)' },
  notice: { marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' },
};
