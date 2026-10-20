/**
 * The bench, the shared lobby (2H.32, rebuilt in 2H.34 on the mockup Jérôme
 * validated).
 *
 * Up to three seat cards side by side: mine first, where I name my Giff and
 * pick my role from four tiles that say how many places are left; then the
 * team-mates present, with their Giff, their role and whether they are ready;
 * then empty cards, the first of which carries the invite code for the owner.
 * A team-mate who sits down arrives with a short animation, once. Below the
 * cards, what the house fields; at the bottom, a bar with the league, what the
 * match waits on, and the owner's "Start match".
 *
 * **Everyone present has a seat**, picks their own name and role, and says
 * they are ready; **the owner alone starts**, when every other present member
 * is ready, and picks the league. Jérôme chose this over the owner composing
 * the party alone: "chacun choisisse son rôle dans un lobby partagé où tout le
 * monde se voit". The owner never ticks "Ready": their click on "Start match"
 * is their ready, so their seat carries `ready: true` by construction.
 *
 * **The channel is `App`'s since 2H.34** (`useLobbyChannel`): this screen only
 * tracks my seat on it while it is open, withdraws it when it closes, reads
 * everybody's seats from it, and tells the others when the match opened. The
 * hub listens to the same channel, which is how it says who is waiting here.
 * Nothing is written to the database until the owner starts: `create-match`
 * receives the seats as this screen shows them at that instant.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { TEAM_SIZE, TIER_WINS_STAR, TIER_WINS_VETERAN } from '../../../engine/constants.js';
import { TIERS, tierAllowed, type Role, type Tier } from '../../../engine/stats.js';
import { createMatch, saveSeatPreference, supabase } from '../lib/supabase.js';
import type { Member, Team } from '../lib/useAccount.js';
import type { LobbyLink } from '../lib/useLobbyChannel.js';
import {
  ROLES,
  benchOrder,
  canStart,
  formatCode,
  namedSeats,
  openCount,
  openRoles,
  seatRequests,
  tierName,
  wholeTeamOf,
  type Seat,
} from './lobbySeats.js';
import { RoleGlyph } from './RoleGlyph.js';
import { CopyCode, Shell } from './Shell.js';

/** The wins that open each league, mirroring the generated column on `teams`. */
const WINS_FOR: Record<Tier, number> = { rookie: 0, veteran: TIER_WINS_VETERAN, star: TIER_WINS_STAR };

/** Named seats a bench holds; the house fields the rest. */
const BENCH_SEATS = 3;

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
  link,
  onOpened,
  onBack,
}: {
  userId: string;
  team: Team;
  /** The roll, for the saved role and name of this player. */
  members: Member[];
  displayName: string;
  /** The lobby channel `App` holds for the chosen team. */
  link: LobbyLink;
  onOpened: () => Promise<void>;
  onBack: () => void;
}) {
  const isOwner = team.owner === userId;
  const saved = members.find((member) => member.profile_id === userId) ?? null;
  const { track, seats } = link;

  const [role, setRole] = useState<Role>(saved?.preferred_role ?? 'striker');
  const [name, setName] = useState(saved?.character_name ?? displayName);
  const [ready, setReady] = useState(false);
  // The league the match is played at (2H.27, `00` C28): the team's own Tier
  // by default, any league below it on a click, never one above. The server
  // checks the same rule; the greyed buttons are so the player sees from the
  // first match that the league will be theirs to choose. The owner chooses;
  // the others read it off the owner's seat.
  const [tier, setTier] = useState<Tier>(team.tier);
  // "We play the whole team" (2H.41, `00` C41 point 8): the mode the owner's
  // side starts in, one human sending in any Giff of the team at each turn.
  // Like the league it is the owner's box, told on their seat and read by all.
  const [wholeTeam, setWholeTeam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Becomes true once the first seats were drawn: a card that mounts after
  // that is a team-mate arriving, and animates in.
  const [settled, setSettled] = useState(false);

  // The owner's name is kept in their own `team_members` row like a member's
  // (policy `team_members_write` lets the owner write any row of the team);
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
      ...(isOwner ? { tier, ...(wholeTeam ? { wholeTeam: true } : {}) } : {}),
    }),
    [userId, displayName, name, role, ready, isOwner, tier, wholeTeam],
  );

  /** Every change of my seat is told to the others. */
  useEffect(() => {
    track(mine);
  }, [track, mine]);

  /** Leaving the screen withdraws the seat; the hub keeps listening. */
  useEffect(() => () => track(null), [track]);

  useEffect(() => {
    if (seats !== null && !settled) setSettled(true);
  }, [seats, settled]);

  const others = useMemo(() => (seats ?? []).filter((seat) => seat.profileId !== userId), [seats, userId]);
  const everyone = useMemo(() => {
    const list = seats ?? [];
    return list.some((seat) => seat.profileId === userId) ? list : [...list, mine];
  }, [seats, userId, mine]);
  const open = useMemo(() => openRoles(others), [others]);
  const ownerSeat = everyone.find((seat) => seat.owner) ?? null;
  const ownerName =
    ownerSeat?.displayName ?? members.find((member) => member.is_owner)?.display_name ?? 'the owner';
  const shownTier: Tier = isOwner ? tier : ownerSeat?.tier ?? team.tier;
  // A member reads the box off the owner's seat, which is what the server will start with.
  const shownWholeTeam = isOwner ? wholeTeam : wholeTeamOf(everyone);

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
      const reply = await createMatch(team.id, seatRequests(everyone), tier, wholeTeam);
      if (!reply.accepted) {
        setError(reply.reason);
        return;
      }
      // Tell the others: their account is re-read and the board comes up.
      await link.announceStarted(reply.matchId);
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
  const frozen = ready && !isOwner;
  const bench = benchOrder(everyone, mine);
  const empties = Math.max(0, BENCH_SEATS - bench.length);

  return (
    <Shell>
      <header className="bb-top">
        <div>
          <p className="label" style={{ margin: 0 }}>
            {team.name} ·{' '}
            <span data-testid="lobby-tier-line">
              {tierName(team.tier)}
              {shownTier !== team.tier ? ` · playing ${tierName(shownTier)}` : ''} · {namedSeats(everyone.length)}
            </span>
          </p>
          <h1 className="display">The bench</h1>
        </div>
        <button className="ghost bb-small" style={{ marginLeft: 'auto' }} onClick={onBack} disabled={busy}>
          Back to the hub
        </button>
      </header>

      <div className="bb-bench">
        {bench.map((seat, i) =>
          seat.profileId === userId ? (
            <article
              key={seat.profileId}
              className="bb-seat mine"
              aria-label="Your seat"
              data-testid="seat-row"
              data-profile-id={seat.profileId}
              data-ready={mine.ready ? 'true' : 'false'}
            >
              <div className="bb-seat-head">
                <div className="plate bb-plate bb-plate-own" style={{ width: 46, height: 46, fontSize: 15 }} aria-hidden="true">
                  {initials(displayName)}
                </div>
                <div>
                  <p className="label" style={{ margin: 0 }}>
                    Seat 1 · you
                  </p>
                  <div className="display bb-seat-who">{displayName}</div>
                </div>
              </div>

              <label className="label" htmlFor="seat-name" style={{ marginBottom: -8 }}>
                Your Giff's name
              </label>
              <input
                id="seat-name"
                className="bb-giffname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                disabled={frozen}
                placeholder="Leave it blank and the house names you"
                data-testid="seat-name"
              />

              <p className="label" style={{ margin: '0 0 -8px' }}>
                Position
              </p>
              <div className="bb-roles">
                {ROLES.map((r) => {
                  const free = open.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      className="bb-role"
                      onClick={() => setRole(r)}
                      disabled={!free || frozen}
                      aria-pressed={r === role}
                      data-role={r}
                      data-taken={free ? 'false' : 'true'}
                      title={free ? ROLE_BLURB[r] : `Every ${r} seat is taken`}
                    >
                      <RoleGlyph role={r} size={18} />
                      {r}
                      <span className="bb-open">{openCount(r, others)} open</span>
                    </button>
                  );
                })}
              </div>

              <div className="bb-status">
                {isOwner ? (
                  <span className="bb-badge owner">You start the match</span>
                ) : (
                  <button
                    className={ready ? 'ghost bb-small' : 'bb-ready-call'}
                    onClick={toggleReady}
                    aria-pressed={ready}
                    data-testid="ready"
                    data-ready={ready ? 'true' : 'false'}
                    title={ready ? 'Click again to change your seat' : 'The owner starts once everyone has clicked'}
                  >
                    {ready ? `Ready · waiting for ${ownerName}` : "Click here when you're ready"}
                  </button>
                )}
              </div>
            </article>
          ) : (
            <OtherSeat key={seat.profileId} seat={seat} index={i + 1} arrive={settled} />
          ),
        )}

        {Array.from({ length: empties }, (_, k) => {
          const index = bench.length + k + 1;
          const first = k === 0;
          return (
            <article key={`empty-${index}`} className="bb-seat empty" aria-label="Empty seat" data-testid="seat-empty">
              <p className="label" style={{ margin: 0 }}>
                Seat {index} · empty
              </p>
              {first ? (
                <>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, maxWidth: '26ch' }}>
                    A team-mate who opens the lobby sits here.{isOwner && ' Give them the code:'}
                  </p>
                  {isOwner && (
                    <>
                      <div className="display" style={{ fontSize: 26, letterSpacing: '.1em', color: 'var(--brass)' }}>
                        {formatCode(team.invite_code)}
                      </div>
                      <CopyCode code={team.invite_code} onError={setError} />
                    </>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, maxWidth: '26ch' }}>
                  Three named seats at most. The house fields the rest.
                </p>
              )}
            </article>
          );
        })}
      </div>

      <p className="bb-house">
        The house fields the other {Math.max(0, TEAM_SIZE - everyone.length)} Giff on your side, and all seven of the
        Scourge.
      </p>

      {error && (
        <p className="error" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className="bb-bar">
        <div className="bb-league">
          <span className="label">League</span>
          <div className="bb-seg" role="group" aria-label="League">
            {TIERS.map((t) => {
              const allowed = tierAllowed(t, team.tier);
              const clickable = isOwner && allowed;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  disabled={!clickable}
                  aria-pressed={t === shownTier}
                  data-league={t}
                  data-selected={t === shownTier ? 'true' : 'false'}
                  data-locked={allowed ? 'false' : 'true'}
                  title={
                    !allowed
                      ? `${WINS_FOR[t]} wins to reach ${tierName(t)}`
                      : isOwner
                        ? t === team.tier
                          ? `Play at ${tierName(t)}: a win here climbs the ladder`
                          : `Play at ${tierName(t)}: a lighter match, a win here is not a rung on the ladder`
                        : `${ownerName} picks the league`
                  }
                >
                  {tierName(t)}
                  {!allowed && ` · ${WINS_FOR[t]} wins`}
                </button>
              );
            })}
          </div>
          {!isOwner && <span className="bb-note">{ownerName} picks the league</span>}
          {isOwner ? (
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}
              title="At every turn of your team you pick which Giff plays. Your team-mates' Giffs stay theirs; the rest is yours to send in any order."
            >
              <input
                type="checkbox"
                data-testid="whole-team"
                checked={wholeTeam}
                onChange={(e) => setWholeTeam(e.target.checked)}
                disabled={busy}
              />
              We play the whole team
            </label>
          ) : (
            shownWholeTeam && (
              <span className="bb-note" data-testid="whole-team-note">
                {ownerName} plays the whole team
              </span>
            )
          )}
        </div>

        {isOwner ? (
          seats === null ? (
            <span className="bb-note wait">Joining the lobby</span>
          ) : waitingOn.length > 0 ? (
            <span className="bb-note" data-testid="waiting-on">
              Waiting on {waitingOn.join(', ')}
            </span>
          ) : everyone.length === 1 ? (
            <span className="bb-note">Alone in the lobby · the house fills the other seats</span>
          ) : (
            <span className="bb-note">Everyone is ready</span>
          )
        ) : seats === null ? (
          <span className="bb-note wait">Joining the lobby</span>
        ) : ownerSeat ? (
          <span className="bb-note" data-testid="owner-starts">
            {ownerSeat.displayName} starts the match
          </span>
        ) : (
          <span className="bb-note" data-testid="owner-starts">
            The owner is not in the lobby yet
          </span>
        )}

        {isOwner && (
          <button className="bb-start" onClick={() => void start()} disabled={!startable} data-testid="start-match">
            {busy ? 'Loading the silo' : 'Start match'}
          </button>
        )}
      </div>
    </Shell>
  );
}

/**
 * A team-mate's card: who they are, their Giff, their role, and where they
 * stand. `arrive` is read once, when the card mounts: a card that appears
 * after the first seats were drawn is somebody sitting down.
 */
function OtherSeat({ seat, index, arrive }: { seat: Seat; index: number; arrive: boolean }) {
  const [arrived] = useState(arrive);
  return (
    <article
      className={arrived ? 'bb-seat arrive' : 'bb-seat'}
      aria-label={`${seat.displayName}'s seat`}
      data-testid="seat-row"
      data-profile-id={seat.profileId}
      data-ready={seat.ready ? 'true' : 'false'}
    >
      <div className="bb-seat-head">
        <div className="plate bb-plate bb-plate-brass" style={{ width: 46, height: 46, fontSize: 15 }} aria-hidden="true">
          {initials(seat.displayName)}
        </div>
        <div>
          <p className="label" style={{ margin: 0 }}>
            Seat {index} · {seat.displayName}
            {seat.owner && ' · owner'}
          </p>
          <div className="display bb-seat-who">{seat.displayName}</div>
        </div>
      </div>
      <p className="bb-giffname">{seat.name.trim() || seat.displayName}</p>
      <div className="bb-rolepick">
        <RoleGlyph role={seat.role} size={20} />
        {seat.role}
      </div>
      <div className="bb-status">
        {seat.owner ? (
          <span className="bb-badge owner">Starts the match</span>
        ) : seat.ready ? (
          <span className="bb-badge ready">Ready</span>
        ) : (
          <span className="bb-badge wait">Choosing…</span>
        )}
      </div>
    </article>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('') || '?'
  );
}
