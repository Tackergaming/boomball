/**
 * The initiative chain, one line above the board.
 *
 * The side Ladder lists the order top to bottom, which answers "where am I in
 * the round" but not "who plays next, then next". This strip answers that one
 * only: it is the same `ladderRungs` the Ladder reads, rotated so the rung on
 * the clock comes first (the order itself is the engine's, écart 51: the Spark
 * first when on the field, then the side with a human, then the Crackers right
 * after the side that carries the ball, then the other side; inside a side
 * Trajector, Strikers, Breakers, Bulwark), so the chain reads left to right as the order the
 * turns will actually happen in. Past the last rung the round wraps, and those
 * chips are drawn dashed behind a `round N+1` separator, because the next
 * round is the same order but not yet fixed (a Giff can fall, a rung can go).
 *
 * One line at 1440 px with 16 rungs is a hard constraint, so chips shrink with
 * distance from the clock and the row scrolls sideways as a fallback rather
 * than ever wrapping.
 */

import { Fragment } from 'react';

import { ladderRungs } from '../../../engine/initiative.js';
import { unitById, type MatchState } from '../../../engine/types.js';

type Rung = ReturnType<typeof ladderRungs>[number];

const TAGS = ['NOW', 'NEXT', 'THEN'];

export function TurnStrip({
  state,
  own,
  yoursId,
  onSelect,
}: {
  state: MatchState;
  own: 'A' | 'B';
  yoursId: string | null;
  onSelect: (unitId: string) => void;
}) {
  const rungs = ladderRungs(state.turnOrder);
  const current = state.turn?.unitId ?? null;
  const found = rungs.findIndex((r) => r.unitIds.includes(current ?? ''));
  const start = found < 0 ? 0 : found;
  const rotated = rungs.map((_, k) => ({ rung: rungs[(start + k) % rungs.length]!, k }));

  return (
    <div data-turn-strip style={S.root} aria-label="Turn order">
      {rotated.map(({ rung, k }) => {
        // Chips from index (rungs.length - start) on are back at the top of the
        // ladder, which is the next round.
        const wrapped = start + k >= rungs.length;
        const firstWrapped = wrapped && start + k - 1 < rungs.length;
        const size = k === 0 ? 'now' : k === 1 ? 'next' : k === 2 ? 'then' : 'far';
        // Progressive dimming past THEN, floored so the far end stays legible.
        const dim = k < 3 ? 1 : Math.max(0.45, 0.85 - (k - 3) * 0.06);
        return (
          <Fragment key={k}>
            {k > 0 && !firstWrapped && <span style={S.arrow}>→</span>}
            {firstWrapped && (
              <span className="label" style={S.round}>
                → round {state.round + 1}
              </span>
            )}
            <Chip
              state={state}
              own={own}
              yoursId={yoursId}
              rung={rung}
              tag={TAGS[k] ?? null}
              size={size}
              dim={dim}
              wrapped={wrapped}
              onSelect={onSelect}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

function Chip({
  state,
  own,
  yoursId,
  rung,
  tag,
  size,
  dim,
  wrapped,
  onSelect,
}: {
  state: MatchState;
  own: 'A' | 'B';
  yoursId: string | null;
  rung: Rung;
  tag: string | null;
  size: 'now' | 'next' | 'then' | 'far';
  dim: number;
  wrapped: boolean;
  onSelect: (unitId: string) => void;
}) {
  const big = size === 'now';
  const base: React.CSSProperties = {
    ...S.chip,
    ...(big ? S.chipNow : size === 'far' ? S.chipFar : null),
    borderStyle: wrapped ? 'dashed' : 'solid',
    opacity: dim,
  };

  if (rung.hazard) {
    return (
      <div
        style={{ ...base, borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(216,161,42,.1)' }}
        title={rung.hazard === 'crackers' ? 'The Crackers go off here' : 'The Spark moves here'}
      >
        {tag && <span style={S.tag}>{tag}</span>}
        <span>
          {rung.hazard === 'crackers' ? 'Crackers' : 'Spark'}
        </span>
      </div>
    );
  }

  const block = rung.unitIds.length > 1;
  return (
    <div
      style={{
        ...base,
        gap: block ? 3 : 4,
        ...(block ? { borderColor: 'var(--brass)' } : null),
      }}
    >
      {tag && <span style={S.tag}>{tag}</span>}
      {block && <span style={S.bracket}>[</span>}
      {rung.unitIds.map((id) => {
        const unit = safeUnit(state, id);
        if (!unit) return null;
        const mine = unit.team === own;
        const you = id === yoursId;
        const colour = mine ? 'var(--team-own)' : 'var(--team-foe)';
        return (
          <button
            key={id}
            className="ghost"
            onClick={() => onSelect(id)}
            title={`${unit.name} · ${unit.role} · ${unit.hp}/${unit.maxHp}`}
            style={{
              ...S.unit,
              color: colour,
              borderColor: colour,
              borderWidth: you ? 3 : 1,
              opacity: unit.status === 'active' ? 1 : 0.35,
              fontSize: big ? 13 : 11,
            }}
          >
            {unit.name.slice(0, 4)}
            {you && <span style={S.you}>YOU</span>}
          </button>
        );
      })}
      {block && <span style={S.bracket}>]</span>}
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
  root: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 4,
    height: 44,
    boxSizing: 'border-box',
    padding: '0 8px',
    overflowX: 'auto',
    overflowY: 'hidden',
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    fontFamily: 'var(--mono)',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    flex: '0 0 auto',
    gap: 4,
    height: 26,
    padding: '0 6px',
    borderWidth: 1,
    borderColor: 'var(--line)',
    color: 'var(--text-faint)',
    fontSize: 11,
    whiteSpace: 'nowrap',
  },
  chipNow: { height: 36, padding: '0 10px', fontSize: 13, borderColor: 'var(--brass)', borderWidth: 2 },
  chipFar: { height: 22, padding: '0 4px', fontSize: 10 },
  tag: { fontSize: 9, letterSpacing: '.08em', color: 'var(--brass)', fontWeight: 600 },
  unit: {
    fontFamily: 'var(--mono)',
    letterSpacing: '.04em',
    textTransform: 'none',
    background: 'transparent',
    borderStyle: 'solid',
    padding: '1px 5px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  you: { fontSize: 8, letterSpacing: '.08em', color: 'var(--brass)' },
  bracket: { color: 'var(--brass)', fontSize: 16, lineHeight: 1 },
  arrow: { flex: '0 0 auto', color: 'var(--text-faint)', fontSize: 11 },
  round: { flex: '0 0 auto', color: 'var(--text-faint)', whiteSpace: 'nowrap', padding: '0 4px' },
};
