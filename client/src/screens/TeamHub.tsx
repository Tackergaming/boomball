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
 */

import { useEffect, useState, type FormEvent } from 'react';

import { ROLES, TEAM_COMPOSITION, type Role, type Tier } from '../../../engine/stats.js';
import { supabase } from '../lib/supabase.js';
import type { Team } from '../lib/useAccount.js';

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
  { tier: 'veteran', at: 3 },
  { tier: 'star', at: 6 },
];

export function TeamHub({
  userId,
  team,
  displayName,
  onCreated,
  onEnterLobby,
}: {
  userId: string;
  team: Team | null;
  displayName: string;
  onCreated: () => void;
  onEnterLobby: () => void;
}) {
  const [stats, setStats] = useState<StatRow[]>([]);

  useEffect(() => {
    void supabase
      .from('role_stats')
      .select('role, tier, hp, ac, might, aim, agility')
      .then(({ data }) => setStats((data ?? []) as StatRow[]));
  }, []);

  if (!team) return <FoundTeam userId={userId} onCreated={onCreated} />;

  const next = LADDER.find((step) => step.at > team.wins);
  const lineFor = (role: Role) => stats.find((s) => s.role === role && s.tier === team.tier);

  return (
    <div style={S.screen}>
      <div className="hazard" />

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

      <section style={S.ladderBlock}>
        <p className="label" style={{ margin: 0 }}>
          {next ? `Wins toward ${next.tier}` : 'Top of the ladder'}
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
      </section>

      <section style={{ padding: '0 32px' }}>
        <div style={S.sectionHead}>
          <h2 className="display" style={{ margin: 0, fontSize: 24 }}>
            Starting seven
          </h2>
          <span className="label">Seven of seven fielded · {team.tier}</span>
        </div>

        <div style={S.roster}>
          {TEAM_COMPOSITION.map((role, i) => {
            const line = lineFor(role);
            return (
              <div key={`${role}-${i}`} style={S.card}>
                <p className="label" style={{ margin: 0, color: 'var(--team-own)' }}>
                  {role}
                </p>
                {line ? (
                  <p style={S.statLine}>
                    HP {line.hp} · AC {line.ac} · BAT {line.might} · AIM {line.aim} · AGI{' '}
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
          Names are typed at the lobby, one per human seat. Every other Giff on the field is drawn
          from the house pool. One Bulwark and one Trajector, ever.
        </p>

        <button style={{ marginTop: 22 }} onClick={onEnterLobby}>
          To the lobby
        </button>
      </section>
    </div>
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
    // `.insert().select()` is the shape migration 0002 exists for: before it,
    // the row went in and reading it back was refused by the select policy.
    const { error: failure } = await supabase
      .from('teams')
      .insert({ owner: userId, name: name.trim() })
      .select('id')
      .single();
    if (failure) {
      setError(failure.message);
      setBusy(false);
      return;
    }
    onCreated();
  }

  return (
    <div style={{ ...S.screen, display: 'grid', placeItems: 'center' }}>
      <form onSubmit={submit} style={S.foundForm}>
        <h1 className="display" style={{ margin: 0, fontSize: 34 }}>
          Raise a battery
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
          A battery starts at Rookie and climbs by winning. Three wins make Veteran, six make Star,
          and the house always fields your own Tier against you.
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
  ladder: { display: 'flex', gap: 10 },
  rung: { padding: '8px 14px', border: '1px solid var(--line)', background: 'var(--panel-deep)' },
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
  foundForm: {
    width: 440,
    padding: 30,
    background: 'var(--panel)',
    border: '1px solid var(--line)',
  },
};

export { ROLES };
