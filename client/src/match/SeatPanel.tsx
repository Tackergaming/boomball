/**
 * The sheet of whoever is selected (2H.38, `00` C37 point 6).
 *
 * It used to sit in the right column all match long, on the unit on the clock
 * when nothing was picked. The column is gone: the sheet **opens on a click,
 * never on hover** (Jérôme: "j'ai peur que ce soit trop"), in a fixed corner,
 * top left under the clock, so it never stacks on the labels beside a target.
 * A click on the floor or Escape closes it.
 *
 * The stat line is read from the engine's own table (`statsFor`) and the HP
 * from the snapshot, as before: a second copy of either could only disagree.
 */

import { CRACKER_AC, CRACKER_DAMAGE_DICE, CRACKER_DAMAGE_DIE } from '../../../engine/constants.js';
import { statsFor } from '../../../engine/stats.js';
import type { MatchState } from '../../../engine/types.js';
import { ROLE_LETTER } from './TurnStrip.js';

const ROLE_NAME = { striker: 'Striker', breaker: 'Breaker', bulwark: 'Bulwark', trajector: 'Trajector' } as const;

export function SeatPanel({
  state,
  selectedId,
  own,
  yoursId,
  names,
}: {
  state: MatchState;
  /** A unit's id, or a Cracker's. */
  selectedId: string;
  own: 'A' | 'B';
  yoursId: string | null;
  names: ReadonlyMap<string, string>;
}) {
  const cracker = state.crackers.find((c) => c.id === selectedId);
  if (cracker) {
    return (
      <div className="bb-card" style={{ borderTopColor: 'var(--danger)' }} data-testid="unit-card">
        <div className="h">
          <span className="nm">Cracker</span>
          <span className="tm">Hazard</span>
        </div>
        <div className="st">
          <span>
            AC <b>{CRACKER_AC}</b>
          </span>
          <span>
            Blast{' '}
            <b>
              {CRACKER_DAMAGE_DICE}d{CRACKER_DAMAGE_DIE}
            </b>
          </span>
        </div>
        <div className="state">Rolls toward the ball at count 20</div>
        <div className="x">Esc or a click on the floor closes</div>
      </div>
    );
  }

  const unit = state.units.find((u) => u.id === selectedId);
  if (!unit) return null;
  const stats = statsFor(unit.role, unit.tier);
  const mine = unit.team === own;
  const who = unit.id === yoursId ? ' · You' : names.get(unit.id) ? ` · ${names.get(unit.id)}` : '';
  const flags = [
    state.payload.carriedBy === unit.id ? 'Carrying the Payload' : null,
    unit.dodging ? 'Dodging' : null,
    unit.braced ? 'Dug in' : null,
    unit.status !== 'active' ? `Off the field · ${unit.status}` : unit.reactionAvailable ? 'Reaction ready' : 'Reaction spent',
  ].filter(Boolean);

  return (
    <div className="bb-card" style={{ borderTopColor: mine ? 'var(--team-own)' : 'var(--team-foe)' }} data-testid="unit-card">
      <div className="h">
        <span className="nm">
          {ROLE_LETTER[unit.role]} · {unit.name}
        </span>
        <span className="tm">
          {ROLE_NAME[unit.role]}
          {who}
        </span>
      </div>
      <div className="st">
        <span>
          HP{' '}
          <b style={unit.hp / unit.maxHp <= 0.34 ? { color: '#ff8fa0' } : undefined}>
            {unit.hp}/{unit.maxHp}
          </b>
        </span>
        <span>
          AC <b>{stats.ac}</b>
        </span>
        <span>
          Melee <b>+{stats.might}</b>
        </span>
        <span>
          Throw <b>+{stats.aim}</b>
        </span>
        <span>
          Dex <b>+{stats.agility}</b>
        </span>
      </div>
      <div className="state">{flags.join(' · ')}</div>
      <div className="x">Esc or a click on the floor closes</div>
    </div>
  );
}
