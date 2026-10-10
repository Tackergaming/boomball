/**
 * Artboards 1d and 2e: the identity sheet of whoever is selected.
 *
 * The stat line is read from the engine's own table rather than from
 * `role_stats`, because this client already imports the engine for
 * `legalActions` and a second copy fetched over the network could only ever
 * disagree with the first. The database mirror is for consumers that cannot
 * import the engine.
 *
 * **Current HP comes from the snapshot and nothing else.** It is the one number
 * on this panel that changes during a match, and reading it from anywhere but
 * the live board would show a figure that was true a round ago.
 */

import { statsFor } from '../../../engine/stats.js';
import { unitById, type MatchState } from '../../../engine/types.js';
import { thirdName } from './replay.js';

export function SeatPanel({
  state,
  unitId,
  own,
}: {
  state: MatchState;
  unitId: string | null;
  own: 'A' | 'B';
}) {
  const unit = unitId ? state.units.find((u) => u.id === unitId) ?? null : null;

  if (!unit) {
    return (
      <div style={S.panel}>
        <span className="label">Pick a Giff</span>
        <p style={S.blank}>
          Click anyone on the field or in the ladder to read their sheet.
        </p>
      </div>
    );
  }

  const stats = statsFor(unit.role, unit.tier);
  const mine = unit.team === own;
  const colour = mine ? 'var(--team-own)' : 'var(--team-foe)';
  const carrying = state.payload.carriedBy === unit.id;

  return (
    <div style={S.panel}>
      <div style={S.head}>
        <div className="plate" style={{ ...S.plate, border: `2px solid ${colour}` }}>
          <span style={{ ...S.plateText, color: colour }}>{unit.role[0]!.toUpperCase()}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="display" style={{ margin: 0, fontSize: 21 }}>
            {unit.name}
          </p>
          <p className="label" style={{ margin: '2px 0 0', color: colour }}>
            {unit.role} · {unit.tier} · {mine ? 'yours' : 'the house'}
          </p>
        </div>
      </div>

      <div style={S.hpTrack}>
        <div
          style={{
            ...S.hpFill,
            width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%`,
            background: colour,
          }}
        />
      </div>
      <p className="label" style={{ margin: '5px 0 0' }}>
        {unit.hp} / {unit.maxHp} hp
      </p>

      <dl style={S.stats}>
        <Stat term="AC" value={stats.ac} />
        {/* The same three names as the team sheet, for the same reason: Bat,
            Aim and Agility name nothing a D&D player has ever rolled. Melee and
            Throw name the roll the number is added to. The third is Dex and not
            Dodge, because it is never added to the Dodge action: it carries
            initiative, Dexterity saves, Acrobatics, an interception and a shove
            resisted on agility. That is a whole ability score, not one move. */}
        <Stat term="Melee" value={`+${stats.might}`} />
        <Stat term="Throw" value={`+${stats.aim}`} />
        <Stat term="Dex" value={`+${stats.agility}`} />
      </dl>

      <div style={S.flags}>
        <Flag on={carrying} label="Carrying the Payload" tone="var(--brass)" />
        <Flag on={unit.dodging} label="Dodging" tone="var(--team-own)" />
        <Flag on={unit.braced} label="Dug in" tone="var(--team-own)" />
        <Flag on={!unit.reactionAvailable} label="Reaction spent" tone="var(--text-faint)" />
        <Flag on={unit.status !== 'active'} label={`Off the field · ${unit.status}`} tone="var(--team-foe)" />
      </div>

      <p className="label" style={{ marginTop: 12, color: 'var(--text-faint)' }}>
        {thirdLabel(thirdName(unit, own))} · {unit.x},{unit.y}
      </p>
    </div>
  );
}

/** The third in words, capitalised for a label: "Own end", "Midfield", "Their end". */
function thirdLabel(name: string): string {
  return name[0]!.toUpperCase() + name.slice(1);
}

function Stat({ term, value }: { term: string; value: string | number }) {
  return (
    <div style={S.stat}>
      <dt className="label" style={{ margin: 0 }}>
        {term}
      </dt>
      <dd style={S.statValue}>{value}</dd>
    </div>
  );
}

function Flag({ on, label, tone }: { on: boolean; label: string; tone: string }) {
  if (!on) return null;
  return (
    <span style={{ ...S.flag, borderColor: tone, color: tone }} className="label">
      {label}
    </span>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: { padding: 14, background: 'var(--panel)', border: '1px solid var(--line)' },
  blank: { marginTop: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--text-faint)' },
  head: { display: 'flex', alignItems: 'center', gap: 11 },
  plate: { width: 44, height: 44, flex: 'none' },
  plateText: { fontFamily: 'var(--display)', fontWeight: 800, fontSize: 19 },
  hpTrack: {
    marginTop: 14,
    height: 7,
    background: 'var(--void)',
    border: '1px solid var(--line)',
  },
  hpFill: { height: '100%' },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 0 0' },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '6px 8px',
    background: 'var(--panel-deep)',
  },
  statValue: {
    margin: 0,
    fontFamily: 'var(--display)',
    fontSize: 18,
    color: 'var(--text)',
  },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  flag: { padding: '3px 6px', borderWidth: 1, borderStyle: 'solid' },
};
