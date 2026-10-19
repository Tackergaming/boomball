/**
 * The order of the turns, as chips on the second line of the top bar (2H.38,
 * `00` C37 point 2).
 *
 * It used to be a strip of its own above the board, next to a ladder in the
 * right column that said the same thing top to bottom. Jérôme wanted it "dans
 * la barre tout en haut", "plus lisible et visible", and the column gone. One
 * chip per turn, in the order the engine will play them (`state.turnOrder`,
 * écart 51, `ladderRungs` stays the reading of the blocks): **the role's
 * letter** (S Striker, B Breaker, **W Bulwark**, since "B" was the Breaker's
 * too, T Trajector), the short name, "YOU" on the player's Giff and the
 * player's first name on a team-mate's. No HP bar (his explicit cut).
 *
 * The chip on the clock is twice the size and wears the clock corner's colour
 * (brass for you, cyan for a team-mate, magenta for the house); the turns
 * already played are dimmed; a Giff off the field is struck through; the Spark
 * and the Crackers have their chips; the next round follows a separator,
 * dashed. On the laptop the played turns are hidden and the strip stops eight
 * chips after the clock with "+N"; on the 27 inch the whole round shows and
 * the next one begins.
 *
 * While the player chooses its place (écart 58), hovering 1st, 2nd or 3rd in
 * the row shows here where the Giff would slot in: `preview` moves it inside
 * its block.
 */

import { Fragment } from 'react';

import { unitById, type MatchState, type Unit } from '../../../engine/types.js';

export const ROLE_LETTER: Record<Unit['role'], string> = { striker: 'S', breaker: 'B', bulwark: 'W', trajector: 'T' };

/** The colour of whoever has the clock: the clock corner and the chip on the clock wear it. */
export type ClockTone = 'you' | 'mate' | 'house';
export const TONE_COLOUR: Record<ClockTone, string> = { you: 'var(--brass)', mate: 'var(--team-own)', house: 'var(--team-foe)' };

type Chip =
  | { readonly kind: 'unit'; readonly unitId: string; readonly ghost: boolean }
  | { readonly kind: 'spark' }
  | { readonly kind: 'crackers' };

/**
 * The round's chips in playing order, and the index of the one on the clock.
 * With `preview`, the player's Giff is moved to that place (1 first) inside
 * its block, as the place question would put it. Pure, so it is tested.
 */
export function roundChips(
  state: MatchState,
  preview: { readonly unitId: string; readonly place: number } | null = null,
): { chips: Chip[]; current: number } {
  const order = state.turnOrder;
  const chips: Chip[] = order.map((slot) =>
    slot.actor.kind === 'unit' ? { kind: 'unit', unitId: slot.actor.unitId, ghost: false } : { kind: slot.actor.kind },
  );
  if (preview) {
    const at = order.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === preview.unitId);
    const block = at >= 0 ? order[at]!.blockId : null;
    if (block !== null) {
      const slots = order.flatMap((s, i) => (s.blockId === block && s.actor.kind === 'unit' ? [i] : []));
      const ids = slots.map((i) => (order[i]!.actor as { unitId: string }).unitId).filter((id) => id !== preview.unitId);
      ids.splice(Math.max(0, Math.min(ids.length, preview.place - 1)), 0, preview.unitId);
      slots.forEach((i, k) => {
        chips[i] = { kind: 'unit', unitId: ids[k]!, ghost: ids[k] === preview.unitId };
      });
    }
  }
  return { chips, current: Math.min(state.turnIndex, chips.length) };
}

export function TurnStrip({
  state,
  own,
  yoursId,
  names,
  compact,
  tone,
  preview,
  highlight,
  onHover,
  onPick,
}: {
  state: MatchState;
  own: 'A' | 'B';
  yoursId: string | null;
  /** Players' first names by unit id, for the human team-mates' chips. */
  names: ReadonlyMap<string, string>;
  /** The laptop's strip: played turns hidden, eight chips after the clock, then "+N". */
  compact: boolean;
  tone: ClockTone;
  preview: { readonly unitId: string; readonly place: number } | null;
  /** The unit hovered on the board, whose chip lights up too. */
  highlight: string | null;
  onHover: (unitId: string | null) => void;
  /** A click on a unit's chip: the board puts it in the middle of the frame. */
  onPick: (unitId: string) => void;
}) {
  const { chips, current } = roundChips(state, preview);
  const shown = chips.map((chip, i) => ({ chip, i })).filter(({ i }) => !compact || i >= current);
  const cap = compact ? 8 : shown.length;
  const rest = Math.max(0, shown.length - cap);
  const next = !compact || rest === 0 ? chips.slice(0, compact ? 2 : 5) : [];

  const render = (chip: Chip, key: string, cls: 'played' | 'cur' | 'next' | '') => {
    if (chip.kind !== 'unit') {
      return (
        <span key={key} className={`bb-chip ${chip.kind === 'spark' ? 'spark' : 'haz'} ${cls}`} style={cls === 'cur' ? curStyle(tone) : undefined}>
          {chip.kind === 'spark' ? '✦ Spark' : '✸ Crackers'}
        </span>
      );
    }
    const unit = safeUnit(state, chip.unitId);
    if (!unit) return null;
    const mine = unit.team === own;
    const first = names.get(unit.id);
    return (
      <button
        key={key}
        type="button"
        className={`bb-chip ${mine ? 'own' : 'foe'} ${cls}${chip.ghost ? ' ghost' : ''}${unit.status !== 'active' ? ' out' : ''}${highlight === unit.id ? ' lit' : ''}`}
        style={cls === 'cur' && !chip.ghost ? curStyle(tone) : undefined}
        data-chip={unit.id}
        title={`${unit.name} · ${unit.role}${unit.status !== 'active' ? ' · off the field' : ''}`}
        onMouseEnter={() => onHover(unit.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onPick(unit.id)}
      >
        <span className="rl">{ROLE_LETTER[unit.role]}</span>
        {unit.name.split(' ')[0]}
        {unit.id === yoursId && <span className="you">YOU</span>}
        {unit.id !== yoursId && first && <span className="who">{first}</span>}
      </button>
    );
  };

  return (
    <div className="bb-chips" data-turn-strip aria-label="Turn order">
      {shown.slice(0, cap).map(({ chip, i }, k) => (
        <Fragment key={`r${i}`}>
          {k > 0 && <span className="bb-chip-arrow">›</span>}
          {render(chip, `c${i}`, i < current ? 'played' : i === current ? 'cur' : '')}
        </Fragment>
      ))}
      {rest > 0 && (
        <>
          <span className="bb-chip-arrow">›</span>
          <span className="bb-chip more">+{rest}</span>
        </>
      )}
      {next.length > 0 && <span className="bb-chip-sep">ROUND {state.round + 1}</span>}
      {next.map((chip, k) => (
        <Fragment key={`n${k}`}>
          {k > 0 && <span className="bb-chip-arrow">›</span>}
          {render(chip.kind === 'unit' ? { ...chip, ghost: false } : chip, `n${k}`, 'next')}
        </Fragment>
      ))}
    </div>
  );
}

function curStyle(tone: ClockTone): React.CSSProperties {
  const colour = TONE_COLOUR[tone];
  return { borderColor: colour, boxShadow: `0 0 calc(12px * var(--u)) color-mix(in srgb, ${colour} 40%, transparent)` };
}

/** A slot can name a unit that has left the field; the order outlives them. */
function safeUnit(state: MatchState, id: string) {
  try {
    return unitById(state, id);
  } catch {
    return null;
  }
}
