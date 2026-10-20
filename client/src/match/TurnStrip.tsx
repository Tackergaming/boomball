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
 *
 * A team played whole (écart 66, 2H.41, `00` C41 point 8) has no seven named
 * rungs, only one pick per Giff, so "la bande des tours montre l'équipe
 * entière comme un seul bloc de pastilles, les jouées éteintes": the team's
 * run of the ladder is ONE block, one rung of the strip. Inside it the Giffs
 * already played are dimmed, the one on the clock is big, the ones still to
 * play are lit, in the order the player may take them (role order). The block
 * counts as one entry for the cursor, the laptop's cap and the "+N".
 */

import { Fragment } from 'react';

import { pickableUnits } from '../../../engine/initiative.js';
import { modeOf, unitById, type MatchState, type Unit } from '../../../engine/types.js';

export const ROLE_LETTER: Record<Unit['role'], string> = { striker: 'S', breaker: 'B', bulwark: 'W', trajector: 'T' };

/** The colour of whoever has the clock: the clock corner and the chip on the clock wear it. */
export type ClockTone = 'you' | 'mate' | 'house';
export const TONE_COLOUR: Record<ClockTone, string> = { you: 'var(--brass)', mate: 'var(--team-own)', house: 'var(--team-foe)' };

export type Chip =
  | { readonly kind: 'unit'; readonly unitId: string; readonly ghost: boolean }
  | { readonly kind: 'spark' }
  | { readonly kind: 'crackers' }
  /**
   * A whole team's run of the ladder (écart 66): the Giffs already picked,
   * the one on the clock if the cursor is on one of them, and the ones still
   * to pick, in role order. Never named in advance, so never in the slots.
   */
  | {
      readonly kind: 'block';
      readonly team: 'A' | 'B';
      readonly played: readonly string[];
      readonly current: string | null;
      readonly toPlay: readonly string[];
    };

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
  // One chip per slot first, so the place preview can move a Giff inside its
  // block by slot index; a whole team's runs are folded into one chip after.
  const slotChips: Chip[] = order.map((slot): Chip => {
    const actor = slot.actor;
    if (actor.kind === 'unit') return { kind: 'unit', unitId: actor.unitId, ghost: false };
    // A pick has no name yet: the fold below turns the run it sits in into a block.
    if (actor.kind === 'pick') return { kind: 'block', team: actor.team, played: [], current: null, toPlay: [] };
    return { kind: actor.kind };
  });
  if (preview) {
    const at = order.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === preview.unitId);
    const block = at >= 0 ? order[at]!.blockId : null;
    if (block !== null) {
      const slots = order.flatMap((s, i) => (s.blockId === block && s.actor.kind === 'unit' ? [i] : []));
      const ids = slots.map((i) => (order[i]!.actor as { unitId: string }).unitId).filter((id) => id !== preview.unitId);
      ids.splice(Math.max(0, Math.min(ids.length, preview.place - 1)), 0, preview.unitId);
      slots.forEach((i, k) => {
        slotChips[i] = { kind: 'unit', unitId: ids[k]!, ghost: ids[k] === preview.unitId };
      });
    }
  }

  const chips: Chip[] = [];
  // The chip each slot ended up in, to put the cursor on the right one.
  const chipOf: number[] = [];
  for (let i = 0; i < order.length; ) {
    const team = order[i]!.team;
    let end = i + 1;
    if (team !== null) while (end < order.length && order[end]!.team === team) end++;
    const run = order.slice(i, end);
    // A run is a whole team's when a pick is still in it, or when the team is
    // played whole this round: the last pick has turned into a name, but the
    // run must not fall back to seven chips under the player's eyes.
    const whole = team !== null && (run.some((s) => s.actor.kind === 'pick') || modeOf(state, team) === 'whole');
    if (!whole) {
      chipOf.push(chips.length);
      chips.push(slotChips[i]!);
      i++;
      continue;
    }
    const named = run.flatMap((s, k) => (s.actor.kind === 'unit' ? [{ id: s.actor.unitId, at: i + k }] : []));
    const cursor = named.find((n) => n.at === state.turnIndex);
    const queued = named.filter((n) => n.at > state.turnIndex).map((n) => n.id);
    chips.push({
      kind: 'block',
      team: team!,
      played: named.filter((n) => n.at < state.turnIndex).map((n) => n.id),
      current: cursor?.id ?? null,
      // A name given ahead of the cursor (none today) would be lost to the pick list, so it leads.
      toPlay: [...queued, ...pickableUnits(state, team!).map((u) => u.id)],
    });
    for (let k = i; k < end; k++) chipOf.push(chips.length - 1);
    i = end;
  }
  return { chips, current: state.turnIndex >= order.length ? chips.length : chipOf[state.turnIndex]! };
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

  /** One Giff's chip, alone in the strip or inside a whole team's block. */
  const unitChip = (
    unitId: string,
    key: string,
    cls: 'played' | 'cur' | 'next' | 'todo' | '',
    ghost: boolean,
    inBlock: boolean,
  ) => {
    const unit = safeUnit(state, unitId);
    if (!unit) return null;
    const mine = unit.team === own;
    const first = names.get(unit.id);
    return (
      <button
        key={key}
        type="button"
        className={`bb-chip ${mine ? 'own' : 'foe'} ${cls}${ghost ? ' ghost' : ''}${unit.status !== 'active' ? ' out' : ''}${highlight === unit.id ? ' lit' : ''}`}
        style={cls === 'cur' && !ghost ? curStyle(tone) : undefined}
        data-chip={unit.id}
        {...(inBlock ? { 'data-chip-state': cls === 'cur' ? 'current' : cls === 'played' ? 'played' : 'to-play' } : {})}
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

  const render = (chip: Chip, key: string, cls: 'played' | 'cur' | 'next' | '') => {
    if (chip.kind === 'block') {
      const mine = chip.team === own;
      // The next round's preview shows the team whole again: nobody has played yet.
      const fresh = cls === 'next';
      const played = fresh ? [] : chip.played;
      const cur = fresh ? null : chip.current;
      const todo = fresh ? [...chip.played, ...(chip.current ? [chip.current] : []), ...chip.toPlay] : chip.toPlay;
      return (
        <span
          key={key}
          className={`bb-chipblock ${mine ? 'own' : 'foe'} ${cls}`}
          style={cls === 'cur' ? { borderColor: TONE_COLOUR[tone] } : undefined}
          data-testid="turn-block"
          data-team={chip.team}
          title={`${mine ? 'Your team' : 'The other team'} · ${todo.length} to play`}
        >
          {played.map((id) => unitChip(id, `${key}p${id}`, 'played', false, true))}
          {cur && unitChip(cur, `${key}c${cur}`, 'cur', false, true)}
          {todo.map((id) => unitChip(id, `${key}t${id}`, 'todo', false, true))}
        </span>
      );
    }
    if (chip.kind !== 'unit') {
      return (
        <span key={key} className={`bb-chip ${chip.kind === 'spark' ? 'spark' : 'haz'} ${cls}`} style={cls === 'cur' ? curStyle(tone) : undefined}>
          {chip.kind === 'spark' ? '✦ Spark' : '✸ Crackers'}
        </span>
      );
    }
    return unitChip(chip.unitId, key, cls, chip.ghost, false);
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
