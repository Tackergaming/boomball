/**
 * What just happened, said over the board rather than buried in the log.
 *
 * Jérôme's report was the whole brief for this file: results of rolls only
 * appeared in the log pane, so he could not tell whether an action had been
 * taken into account, let alone whether it had worked, and he only found out
 * his team had scored by scrolling back through the feed. A log is an archive.
 * This is the commentary, and it sits where the eyes already are.
 *
 * **The dice are shown as dice.** `18 vs 12` reads as a thing that was earned
 * or not; `SUCCESS` alone reads as a decree. The engine already carries the
 * whole roll on the event, so there is nothing to compute here, only to show.
 */

import type { DiceRoll } from '../../../engine/events.js';
import type { Beat, BeatLine } from './replay.js';

const MODE_MARK: Record<DiceRoll['mode'], string> = {
  normal: '',
  advantage: ' ▲',
  disadvantage: ' ▼',
};

export function Announce({
  beat,
  actorName,
  progress,
  onSkip,
  onDismiss,
}: {
  beat: Beat;
  /** Whose beat it is, already resolved to a name by the caller. */
  actorName: string | null;
  progress: { at: number; of: number } | null;
  onSkip: () => void;
  onDismiss: () => void;
}) {
  if (beat.lines.length === 0) return null;

  const loud = beat.weight === 'loud';

  return (
    <div style={{ ...S.card, ...(loud ? S.loud : null) }}>
      <div style={S.head}>
        <span className="label" style={{ color: loud ? 'var(--brass)' : 'var(--text-dim)' }}>
          {actorName ?? 'The silo'}
        </span>
        {progress && progress.of > 1 && (
          <span style={S.progress}>
            {progress.at} / {progress.of}
          </span>
        )}
        {progress && progress.of > 1 ? (
          <button className="ghost" style={S.skip} onClick={onSkip}>
            Skip ▸▸
          </button>
        ) : (
          // The replay is over and this card is the record of it, so it stays
          // until it is in the way. It covers the foot of the board, which is
          // cells a player may want to click.
          <button className="ghost" style={{ ...S.skip, marginLeft: 'auto' }} onClick={onDismiss}>
            ✕
          </button>
        )}
      </div>

      {beat.lines.map((line, i) => (
        <Line key={i} line={line} />
      ))}
    </div>
  );
}

function Line({ line }: { line: BeatLine }) {
  const colour =
    line.outcome === 'good'
      ? 'var(--team-own)'
      : line.outcome === 'bad'
        ? '#ff8fa0'
        : 'var(--text)';

  return (
    <p style={{ ...S.line, color: colour }}>
      {line.text}
      {line.roll && (
        <span style={S.roll}>
          d{line.roll.die} {line.roll.rolled}
          {line.roll.bonus >= 0 ? '+' : ''}
          {line.roll.bonus} = <strong style={S.total}>{line.roll.total}</strong>
          {line.roll.against !== null && ` vs ${line.roll.against}`}
          {MODE_MARK[line.roll.mode]}
        </span>
      )}
    </p>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    position: 'absolute',
    left: '50%',
    bottom: 14,
    transform: 'translateX(-50%)',
    minWidth: 320,
    maxWidth: '80%',
    padding: '10px 14px',
    background: 'rgba(7,8,10,.92)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--line)',
    boxShadow: '0 6px 24px rgba(0,0,0,.55)',
    pointerEvents: 'auto',
    zIndex: 3,
  },
  loud: { borderColor: 'var(--brass)', boxShadow: '0 0 0 1px rgba(201,180,137,.35), 0 8px 30px rgba(0,0,0,.6)' },
  head: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  progress: {
    marginLeft: 'auto',
    fontFamily: 'var(--mono)',
    fontSize: 10,
    letterSpacing: '.08em',
    color: 'var(--text-faint)',
  },
  skip: { fontSize: 10, padding: '3px 8px' },
  line: { margin: '3px 0', fontSize: 13, lineHeight: 1.45 },
  roll: {
    marginLeft: 8,
    fontFamily: 'var(--mono)',
    fontSize: 11,
    letterSpacing: '.04em',
    color: 'var(--text-faint)',
  },
  total: { color: 'var(--text)' },
};
