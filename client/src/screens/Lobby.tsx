/**
 * Artboard 2c, cut down to the seat that exists.
 *
 * The drawing shows three seats, an invite link, and a per-seat ready state.
 * **Only seat one is built**, and that is not a shortcut: there is no way to
 * invite anybody yet. `create-match` will happily seat three players, and
 * `server/lobby.ts` refuses a fourth or a second Bulwark, so the door is ready;
 * what is missing is a way for a second person to join a team, which is a whole
 * flow of its own. The artboard's own primary action is **Play a solo match
 * now**, and solo is the dimensioning mode: thirteen AI units against one human.
 *
 * The positions-left panel is kept and is real, computed from
 * `TEAM_COMPOSITION`. It is what tells a player that one Bulwark and one
 * Trajector is the whole allowance, ever.
 */

import { useEffect, useState } from 'react';

import { TEAM_SIZE, TIER_WINS_STAR, TIER_WINS_VETERAN } from '../../../engine/constants.js';
import { TEAM_COMPOSITION, TIERS, tierAllowed, type Role, type Tier } from '../../../engine/stats.js';
import { createMatch, supabase } from '../lib/supabase.js';
import type { Team } from '../lib/useAccount.js';

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
  displayName,
  onOpened,
  onBack,
}: {
  userId: string;
  team: Team;
  displayName: string;
  onOpened: () => Promise<void>;
  onBack: () => void;
}) {
  const [role, setRole] = useState<Role>('striker');
  // The league the match is played at (2H.27, `00` C28): the battery's own
  // Tier by default, any league below it on a click, never one above. The
  // server checks the same rule; the greyed buttons are so the player sees
  // from the first match that the league will be theirs to choose.
  const [tier, setTier] = useState<Tier>(team.tier);
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The name is kept between matches in `team_members.character_name`. A read
  // that fails or finds nothing leaves the display name in place.
  useEffect(() => {
    let live = true;
    void supabase
      .from('team_members')
      .select('character_name')
      .eq('team_id', team.id)
      .eq('profile_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const saved = (data as { character_name: string | null } | null)?.character_name;
        if (live && saved) setName(saved);
      });
    return () => {
      live = false;
    };
  }, [team.id, userId]);

  const fielded = (r: Role) => TEAM_COMPOSITION.filter((x) => x === r).length;

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
      // Remember the name for next time. Policy `team_members_write` lets a
      // player write their own row; `preferred_role` is NOT NULL so it goes too.
      // A failure here must not keep the player out of the match.
      try {
        const { error: saveFailure } = await supabase.from('team_members').upsert(
          {
            team_id: team.id,
            profile_id: userId,
            preferred_role: role,
            character_name: name.trim() || null,
          },
          { onConflict: 'team_id,profile_id' },
        );
        if (saveFailure) console.warn('the character name was not saved', saveFailure);
      } catch (saveFailure) {
        console.warn('the character name was not saved', saveFailure);
      }
      const reply = await createMatch(
        team.id,
        [{ profileId: userId, role, characterName: name.trim() }],
        tier,
      );
      if (!reply.accepted) {
        setError(reply.reason);
        return;
      }
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

  return (
    <div style={S.screen}>
      <div className="hazard" />

      <header style={S.header}>
        <div>
          <p className="label" style={{ margin: 0 }}>
            No waiting room · house fields both sides
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
            {cap(team.tier)} battery{tier !== team.tier ? ` · playing ${cap(tier)}` : ''} · 1 named seat ·{' '}
            {TEAM_SIZE * 2 - 1} house Giff
          </p>
        </div>
      </header>

      <div style={S.body}>
        <section style={S.seat}>
          <p className="label" style={{ margin: 0, color: 'var(--team-own)' }}>
            Seat 1 · you · name your Giff
          </p>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Leave it blank and the house names you"
            style={{ marginTop: 10, fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '.04em' }}
          />

          <p className="label" style={{ marginTop: 22 }}>
            Position
          </p>
          <div style={S.roles}>
            {(Object.keys(ROLE_BLURB) as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={r === role ? undefined : 'ghost'}
                style={S.roleButton}
              >
                {r}
              </button>
            ))}
          </div>
          <p style={S.blurb}>{ROLE_BLURB[role]}</p>

          <p className="label" style={{ marginTop: 22 }}>
            League · your battery is {cap(team.tier)}
          </p>
          <div style={S.roles}>
            {TIERS.map((t) => {
              const open = tierAllowed(t, team.tier);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  disabled={!open}
                  className={t === tier ? undefined : 'ghost'}
                  style={{ ...S.roleButton, opacity: open ? 1 : 0.45 }}
                  data-league={t}
                  data-selected={t === tier ? 'true' : 'false'}
                  data-locked={open ? 'false' : 'true'}
                  title={open ? `Play at ${cap(t)}` : `${WINS_FOR[t]} wins to reach ${cap(t)}`}
                >
                  {cap(t)}
                  {!open && ` · ${WINS_FOR[t]} wins`}
                </button>
              );
            })}
          </div>
          <p style={S.blurb} data-testid="league-blurb">
            {tier === team.tier
              ? `${cap(tier)} is where your wins count: the house fields ${cap(tier)} against you, and a win here climbs the ladder.`
              : `A lighter match: the house fields ${cap(tier)} against you. A win at ${cap(tier)} is a win, not a rung on the ladder.`}
          </p>

          {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={start} disabled={busy}>
              {busy ? 'Loading the silo' : 'Start match'}
            </button>
            <button className="ghost" onClick={onBack} disabled={busy}>
              Back to the hub
            </button>
          </div>
        </section>

        <aside style={S.aside}>
          <p className="label" style={{ margin: 0 }}>
            Positions a side fields
          </p>
          <div style={{ marginTop: 12 }}>
            {(Object.keys(ROLE_BLURB) as Role[]).map((r) => (
              <div key={r} style={S.countRow}>
                <span className="label" style={{ color: r === role ? 'var(--team-own)' : undefined }}>
                  {r}
                </span>
                <span style={S.count}>{fielded(r)}</span>
              </div>
            ))}
          </div>
          <p style={{ ...S.blurb, marginTop: 16 }}>
            One Bulwark, one Trajector, ever. The other {TEAM_SIZE * 2 - 2} Giff on the field are the house.
          </p>

          <div style={S.notice}>
            <p className="label" style={{ margin: 0 }}>
              Seats 2 and 3
            </p>
            <p style={{ ...S.blurb, marginTop: 8 }}>
              Bringing friends needs a way to join a battery, which does not exist yet. The door
              accepts three seats the day it does.
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
