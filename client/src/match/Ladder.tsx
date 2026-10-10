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
  const when = whenIPlay(state, own, rungs, current);

  return (
    <div style={S.panel}>
      <div style={S.head}>
        <span className="label">Initiative</span>
        <span className="label" style={{ color: 'var(--brass)' }}>
          Round {state.round}
          {state.phase === 'suddenDeath' ? ' · sudden death' : ''}
        </span>
        {when && (
          <span className="label" style={{ color: 'var(--team-own)', width: '100%' }}>
            {when}
          </span>
        )}
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

/**
 * Where the player's own Giff sits relative to the clock. In solo the first
 * human unit of the own side is the player. Wrapping to the next round counts
 * the rungs left in this one plus the rungs before the player's, which is the
 * same as the modular distance along the ladder.
 */
function whenIPlay(
  state: MatchState,
  own: 'A' | 'B',
  rungs: ReturnType<typeof ladderRungs>,
  current: string | null,
): string | null {
  const me = state.units.find((u) => u.team === own && u.controller.kind === 'human');
  if (!me) return null;
  if (current === me.id) return 'You are up';
  const mineAt = rungs.findIndex((r) => r.unitIds.includes(me.id));
  if (mineAt < 0) return null;
  const nowAt = Math.max(0, rungs.findIndex((r) => r.unitIds.includes(current ?? '')));
  const gap = (mineAt - nowAt + rungs.length) % rungs.length;
  return gap === 0 ? 'You play in this block' : `You play in ${gap}`;
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
  // Compact on purpose: up to 14 unit rungs plus 2 hazard rungs have to fit in
  // about 260 px at 1440 x 900, so a rung is one short line.
  head: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 2,
    padding: '6px 8px',
    borderBottom: '1px solid var(--line)',
  },
  list: { overflowY: 'auto', padding: 4, display: 'flex', flexDirection: 'column', gap: 1 },
  rung: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    padding: '1px 4px',
    minHeight: 16,
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
  },
  liveRung: { borderLeftColor: 'var(--team-own)', background: 'rgba(60,224,240,.06)' },
  hazardRung: { borderLeftColor: 'var(--danger)', background: 'rgba(216,161,42,.07)' },
  rungUnits: { display: 'flex', flexWrap: 'wrap', gap: 3, minWidth: 0 },
  chip: {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    lineHeight: 1.2,
    letterSpacing: '.04em',
    textTransform: 'none',
    padding: '1px 5px',
    whiteSpace: 'nowrap',
  },
  count: { fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)' },
};
