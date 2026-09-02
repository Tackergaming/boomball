/**
 * Artboard 1b, the initiative ladder.
 *
 * The order is a flat queue, one unit per entry, and units that share a
 * `blockId` act as one rung. `ladderRungs` does that grouping in the engine, so
 * the display cannot invent a grouping the resolution does not use.
 *
 * The two hazard rungs are the point of showing this at all. A player who can
 * see that the Crackers count down two rungs from now can decide to spend the
 * turn moving out of the blast instead of swinging, and that is a decision the
 * rules give them only if the interface tells them.
 */

import { ladderRungs } from '../../../engine/initiative.js';
import { unitById, type MatchState } from '../../../engine/types.js';

export function Ladder({
  state,
  own,
  onSelect,
}: {
  state: MatchState;
  own: 'A' | 'B';
  onSelect: (unitId: string) => void;
}) {
  const rungs = ladderRungs(state.turnOrder);
  const current = state.turn?.unitId ?? null;

  return (
    <div style={S.panel}>
      <div style={S.head}>
        <span className="label">Initiative</span>
        <span className="label" style={{ color: 'var(--brass)' }}>
          Round {state.round}
          {state.phase === 'suddenDeath' ? ' · sudden death' : ''}
        </span>
      </div>

      <div style={S.list}>
        {rungs.map((rung, i) => {
          if (rung.hazard) {
            return (
              <div key={`h${i}`} style={{ ...S.rung, ...S.hazardRung }}>
                <span className="label" style={{ color: 'var(--danger)' }}>
                  {rung.hazard === 'crackers' ? 'The Crackers' : 'The Spark'}
                </span>
                <span style={S.count}>{rung.count}</span>
              </div>
            );
          }

          const live = rung.unitIds.includes(current ?? '');
          return (
            <div key={`u${i}`} style={{ ...S.rung, ...(live ? S.liveRung : null) }}>
              <div style={S.rungUnits}>
                {rung.unitIds.map((id) => {
                  const unit = safeUnit(state, id);
                  if (!unit) return null;
                  const mine = unit.team === own;
                  const onClock = current === id;
                  return (
                    <button
                      key={id}
                      className="ghost"
                      onClick={() => onSelect(id)}
                      style={{
                        ...S.chip,
                        borderColor: mine ? 'var(--team-own)' : 'var(--team-foe)',
                        color: mine ? 'var(--team-own)' : 'var(--team-foe)',
                        opacity: unit.status === 'active' ? 1 : 0.35,
                        background: onClock ? 'rgba(60,224,240,.12)' : 'transparent',
                      }}
                      title={`${unit.name} · ${unit.role} · ${unit.hp}/${unit.maxHp}`}
                    >
                      {unit.name}
                    </button>
                  );
                })}
              </div>
              {rung.unitIds.length > 1 && (
                <span className="label" style={{ color: 'var(--text-faint)' }}>
                  block
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A rung can name a unit that has left the field; the ladder outlives them. */
function safeUnit(state: MatchState, id: string) {
  try {
    return unitById(state, id);
  } catch {
    return null;
  }
}

const S: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    background: 'var(--panel)',
    border: '1px solid var(--line)',
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid var(--line)',
  },
  list: { overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  rung: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: '5px 6px',
    borderLeft: '2px solid transparent',
  },
  liveRung: { borderLeftColor: 'var(--team-own)', background: 'rgba(60,224,240,.06)' },
  hazardRung: { borderLeftColor: 'var(--danger)', background: 'rgba(216,161,42,.07)' },
  rungUnits: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  chip: {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    letterSpacing: '.06em',
    textTransform: 'none',
    padding: '4px 7px',
  },
  count: { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)' },
};
