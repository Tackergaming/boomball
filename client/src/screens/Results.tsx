/**
 * Artboard 2d, the full-time sheet.
 *
 * The artboard's highlight columns (goals by player, Crackers redirected, units
 * evacuated) are all derivable from `match_events`, which is the source of
 * truth and holds every one of those events. They are not read here yet: the
 * screen that matters first is the one that says who won and lets you play
 * again, and a highlights panel that reads six hundred events is worth doing
 * once there is a match worth reviewing.
 *
 * What is real: the score, the winner, the rounds played, and the promotion. A
 * win writes `teams.wins`, and the Tier is a generated column, so crossing the
 * threshold is something the database says rather than something this screen
 * decides.
 */

import { useEffect, useState } from 'react';

import { TIER_WINS_STAR, TIER_WINS_VETERAN } from '../../../engine/constants.js';
import { supabase } from '../lib/supabase.js';
import type { LiveMatch } from '../lib/useAccount.js';
import type { Team } from '../lib/useAccount.js';

const NEXT_AT: Record<string, number | null> = {
  rookie: TIER_WINS_VETERAN,
  veteran: TIER_WINS_STAR,
  star: null,
};

/**
 * True when the Spark decided the match: the result on Payload goals alone
 * differs from the actual one. Until the events are read it is false, so the
 * verdict shows the Payload wording rather than a blank.
 */
function useSparkDecided(match: LiveMatch): boolean {
  const [spark, setSpark] = useState(false);
  useEffect(() => {
    let live = true;
    void supabase
      .from('match_events')
      .select('payload')
      .eq('match_id', match.id)
      .eq('kind', 'scored')
      .then(({ data, error }) => {
        if (!live || error || !data) return;
        let a = 0;
        let b = 0;
        for (const row of data as { payload: { team: 'A' | 'B'; points: number; source: string } }[]) {
          const e = row.payload;
          if (e.source !== 'payload') continue;
          if (e.team === 'A') a += e.points;
          else b += e.points;
        }
        const goalsWinner = a === b ? null : a > b ? 'A' : 'B';
        setSpark(!match.is_draw && goalsWinner !== match.winner);
      });
    return () => {
      live = false;
    };
  }, [match.id, match.winner, match.is_draw]);
  return spark;
}

export function Results({
  match,
  team,
  onPlayAgain,
  onHub,
}: {
  match: LiveMatch;
  team: Team;
  onPlayAgain: () => void;
  onHub: () => void;
}) {
  const won = match.winner === 'A';
  const drawn = match.is_draw;
  const target = NEXT_AT[team.tier] ?? null;
  const how = useSparkDecided(match) ? 'Spark' : 'Payload';

  return (
    <div style={S.screen}>
      <div className="hazard" />

      <div style={S.body}>
        <p className="label" style={{ margin: 0 }}>
          {match.round} rounds played · full time
        </p>
        <h1 className="display" style={S.verdict}>
          {drawn ? 'Drawn on the whistle' : won ? `Won on the ${how}` : `Lost on the ${how}`}
        </h1>

        <div style={S.scoreboard}>
          <div style={{ ...S.side, borderColor: 'var(--team-own)' }}>
            <p className="label" style={{ margin: 0, color: 'var(--team-own)' }}>
              {drawn ? 'Drawn' : won ? 'Winners' : 'Defeated'}
            </p>
            <p className="display" style={{ margin: '6px 0 0', fontSize: 28 }}>
              {team.name}
            </p>
            <p className="display" style={{ margin: '6px 0 0', fontSize: 64, color: 'var(--team-own)' }}>
              {match.score_a}
            </p>
          </div>

          <span className="display" style={{ fontSize: 26, color: 'var(--text-faint)' }}>
            vs
          </span>

          <div style={{ ...S.side, borderColor: 'var(--team-foe)' }}>
            <p className="label" style={{ margin: 0, color: 'var(--team-foe)' }}>
              {drawn ? 'Drawn' : won ? 'Defeated' : 'Winners'}
            </p>
            <p className="display" style={{ margin: '6px 0 0', fontSize: 28 }}>
              The House
            </p>
            <p className="display" style={{ margin: '6px 0 0', fontSize: 64, color: 'var(--team-foe)' }}>
              {match.score_b}
            </p>
          </div>
        </div>

        <div style={S.season}>
          <p className="label" style={{ margin: 0 }}>
            Season wins
          </p>
          <p style={{ margin: '6px 0 0' }}>
            <span className="display" style={{ fontSize: 34 }}>
              {team.wins}
            </span>
            {target !== null && (
              <span style={{ color: 'var(--text-faint)', fontSize: 17 }}> / {target} to next tier</span>
            )}
          </p>
          <p className="label" style={{ marginTop: 8, color: 'var(--brass)' }}>
            Current tier · {team.tier}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
          <button onClick={onPlayAgain}>Play again</button>
          <button className="ghost" onClick={onHub}>
            Back to the hub
          </button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  screen: { height: '100%', overflowY: 'auto', background: 'var(--page)' },
  body: { maxWidth: 900, margin: '0 auto', padding: '48px 32px' },
  verdict: { margin: '8px 0 30px', fontSize: 52 },
  scoreboard: { display: 'flex', alignItems: 'center', gap: 22 },
  side: {
    flex: 1,
    padding: 22,
    background: 'var(--panel)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderLeftWidth: 3,
  },
  season: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: '1px solid var(--line)',
  },
};
