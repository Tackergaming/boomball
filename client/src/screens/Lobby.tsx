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

import { useState } from 'react';

import { TEAM_COMPOSITION, type Role } from '../../../engine/stats.js';
import { createMatch } from '../lib/supabase.js';
import type { Team } from '../lib/useAccount.js';

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
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const reply = await createMatch(team.id, [
        { profileId: userId, role, characterName: name.trim() },
      ]);
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
          <p className="label" style={{ margin: '3px 0 0' }}>
            {team.tier} · 1 named seat · 13 house Giff
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
            One Bulwark, one Trajector, ever. The other twelve Giff on the field are the house.
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
