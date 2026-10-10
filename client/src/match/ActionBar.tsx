/**
 * Artboard 1c. Every button on it comes from `legalActions` and none of it is
 * decided here.
 *
 * This is the component the one-generator rule exists to protect. The moment a
 * React file works out for itself that a shot is possible, the interface and
 * the AI hold two copies of the rules and they drift the first time one of them
 * is edited. So: no `if` about the sport below. A button appears because the
 * engine listed it, it carries the number the roll has to beat because the
 * engine worked that out, and pressing it posts an intention.
 *
 * The numbers are shown before committing on purpose. A Giff who can see that
 * the Bulwark lifts the shot from 15 to 18 is a Giff who can decide to pass
 * instead, and that decision is the game.
 *
 * **Every action keeps its place, whether or not it is available.** Buttons
 * used to appear and vanish with the position, so the bar changed shape between
 * turns and a player only learned that Shove existed by happening to stand next
 * to somebody. A dead button that says why is a rule taught; a missing button
 * is a rule hidden. This does not weaken the one-generator rule: what is
 * *possible* still comes from `legalActions` alone, and a greyed button cannot
 * be pressed. Only the sentence explaining the absence is written here.
 */

import { useEffect, useState } from 'react';

import type { Action } from '../../../engine/actions.js';
import type { LegalActions, TargetOption } from '../../../engine/legalActions.js';
import { DIRECTIONS } from '../../../engine/geometry.js';

/**
 * What the player has started and not finished. Lifted out of this component
 * into `Match.tsx` so the board can read it too: with a Swing pending, the
 * enemies on the board wear a target ring and a click on one is the answer, so
 * the tray below and the tokens above are two ways of giving one choice.
 */
export type Pending = 'attack' | 'shove' | 'pass' | 'cracker' | null;

const MODE_MARK: Record<TargetOption['mode'], string> = {
  normal: '',
  advantage: ' ▲',
  disadvantage: ' ▼',
};

export function ActionBar({
  legal,
  yours,
  busy,
  movementFeet,
  onAct,
  pending,
  onPending,
  selectedId,
  plotting,
  plotLength,
  onTogglePlot,
  onGo,
  onClearPlot,
}: {
  legal: LegalActions | null;
  /** False while the house is playing, which is most of a solo round. */
  yours: boolean;
  busy: boolean;
  movementFeet: number;
  onAct: (action: Action) => void;
  /** Owned by the match screen, so the board can answer it with a click on a token. */
  pending: Pending;
  onPending: (pending: Pending) => void;
  /** The unit picked on the board or the ladder, whose own options get a tray. */
  selectedId: string | null;
  /** Whether a click on a cell adds a waypoint instead of moving. */
  plotting: boolean;
  /** Cells in the plotted route so far; zero means nothing to send. */
  plotLength: number;
  onTogglePlot: () => void;
  onGo: () => void;
  onClearPlot: () => void;
}) {
  const setPending = onPending;
  const [cracker, setCracker] = useState<string | null>(null);

  // The Cracker choice is half of a two-step pick that lives here. Whoever
  // clears `pending` from outside (a new turn, a click on a token) must not
  // leave the first half behind for the next time Bat a Cracker is pressed.
  useEffect(() => {
    if (pending !== 'cracker') setCracker(null);
  }, [pending]);

  if (!legal || !yours) {
    return (
      <div style={S.bar}>
        <span className="label" style={{ animation: busy ? 'bb-tick 1.2s infinite' : undefined }}>
          {busy ? 'The house is playing' : 'Waiting on the house'}
        </span>
      </div>
    );
  }

  const act = (action: Action) => {
    setPending(null);
    setCracker(null);
    onAct(action);
  };

  const targets =
    pending === 'attack'
      ? legal.attack
      : pending === 'shove'
        ? legal.shove
        : pending === 'pass'
          ? legal.pass
          : [];

  // The options the selected unit offers, read from the same lists the tray
  // below reads. Only what `legal` carries is offered, so a unit that is not a
  // target of anything gets nothing here and is just selected, as before.
  const picked =
    !pending && selectedId
      ? ([
          ['attack', 'Swing at', legal.attack.find((t) => t.unitId === selectedId)],
          ['shove', 'Shove', legal.shove.find((t) => t.unitId === selectedId)],
          ['pass', 'Pass to', legal.pass.find((t) => t.unitId === selectedId)],
        ] as const).flatMap(([kind, verb, option]) => (option ? [{ kind, verb, option }] : []))
      : [];

  return (
    <div style={S.wrap}>
      {picked.length > 0 && (
        <div style={S.tray}>
          {picked.map(({ kind, verb, option }) => (
            <button
              key={kind}
              className="ghost"
              style={S.trayButton}
              disabled={busy}
              onClick={() => act({ kind, targetId: option.unitId })}
            >
              {verb} {option.name} · {option.against}
              {MODE_MARK[option.mode]}
            </button>
          ))}
        </div>
      )}

      {pending && pending !== 'cracker' && (
        <div style={S.tray}>
          <span className="label">Pick a target</span>
          {targets.map((target) => (
            <button
              key={target.unitId}
              className="ghost"
              style={S.trayButton}
              onClick={() =>
                act(
                  pending === 'attack'
                    ? { kind: 'attack', targetId: target.unitId }
                    : pending === 'shove'
                      ? { kind: 'shove', targetId: target.unitId }
                      : { kind: 'pass', targetId: target.unitId },
                )
              }
            >
              {target.name} · {target.against}
              {MODE_MARK[target.mode]}
            </button>
          ))}
          <button className="ghost" style={S.trayButton} onClick={() => setPending(null)}>
            Cancel
          </button>
        </div>
      )}

      {pending === 'cracker' && (
        <div style={S.tray}>
          <span className="label">{cracker ? 'Send it down a line' : 'Which Cracker'}</span>
          {!cracker &&
            legal.batCracker.map((option) => (
              <button
                key={option.crackerId}
                className="ghost"
                style={S.trayButton}
                onClick={() => setCracker(option.crackerId)}
              >
                {option.crackerId} · {option.against}
              </button>
            ))}
          {cracker &&
            (legal.batCracker.find((o) => o.crackerId === cracker)?.directions ?? []).map((d) => (
              <button
                key={d}
                className="ghost"
                style={S.trayButton}
                onClick={() => act({ kind: 'batCracker', crackerId: cracker, direction: d })}
              >
                {arrowFor(d)}
              </button>
            ))}
          <button
            className="ghost"
            style={S.trayButton}
            onClick={() => {
              setPending(null);
              setCracker(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <div style={S.bar}>
        <span className="label" style={{ marginRight: 6 }}>
          {movementFeet} ft left
        </span>

        <Act
          label="Take the Payload"
          tone="brass"
          busy={busy}
          off={legal.canGrabPayload ? null : 'stand on the Payload to pick it up'}
          onClick={() => act({ kind: 'grabPayload' })}
        />

        <Act
          label={legal.shoot ? `Shoot · ${legal.shoot.against}${MODE_MARK[legal.shoot.mode]}` : 'Shoot'}
          {...(legal.shoot?.blockedBy ? { hint: 'the Bulwark is in the mouth' } : {})}
          tone="brass"
          busy={busy}
          off={legal.shoot ? null : 'carry the Payload within range of their Furnace'}
          onClick={() => act({ kind: 'shoot' })}
        />

        <Act
          label={legal.catchSpark ? `Catch the Spark · ${legal.catchSpark.against}` : 'Catch the Spark'}
          tone="spark"
          busy={busy}
          off={legal.catchSpark ? null : 'only from the cell the Spark is on'}
          onClick={() => act({ kind: 'catchSpark' })}
        />

        <Act
          label="Pass"
          busy={busy}
          off={legal.pass.length > 0 ? null : 'carry the Payload, with a team mate in range'}
          onClick={() => setPending('pass')}
        />
        <Act
          label="Swing"
          busy={busy}
          off={legal.attack.length > 0 ? null : 'no enemy within reach, and never while carrying'}
          onClick={() => setPending('attack')}
        />
        <Act
          label="Shove"
          busy={busy}
          off={legal.shove.length > 0 ? null : 'no enemy within reach'}
          onClick={() => setPending('shove')}
        />
        <Act
          label="Bat a Cracker"
          tone="danger"
          busy={busy}
          off={legal.batCracker.length > 0 ? null : 'no live Cracker within reach'}
          onClick={() => setPending('cracker')}
        />

        <Act
          label="Dash"
          busy={busy}
          off={legal.canDash ? null : 'the Action is already spent'}
          onClick={() => act({ kind: 'dash' })}
        />
        <Act
          label="Dodge"
          busy={busy}
          off={legal.canDodge ? null : 'the Action is already spent'}
          onClick={() => act({ kind: 'dodge' })}
        />
        <Act
          label="Disengage"
          busy={busy}
          off={legal.canDisengage ? null : 'the Action is already spent'}
          onClick={() => act({ kind: 'disengage' })}
        />
        {/* Brace (écart 52). Neutral like Pass: it is a posture, not an attack. */}
        <Act
          label="Dig in"
          busy={busy}
          off={legal.canBrace ? null : 'only the Bulwark digs in, with its Action in hand'}
          onClick={() => act({ kind: 'brace' })}
        />

        {/* Choosing the route. Off, a click on a cell walks the shortest way at
            once; on, it adds a waypoint and nothing is sent until Go. */}
        <Act
          label="Plot route"
          on={plotting}
          busy={busy}
          off={legal.destinations.size > 0 || plotting ? null : 'no cell within reach'}
          onClick={onTogglePlot}
        />
        {plotting && (
          <>
            <Act label="Go" tone="brass" busy={busy} off={plotLength > 0 ? null : 'click cells to plot'} onClick={onGo} />
            <Act label="Clear" busy={busy} off={plotLength > 0 ? null : 'nothing plotted'} onClick={onClearPlot} />
          </>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <Act label="End turn" busy={busy} off={null} onClick={() => act({ kind: 'endTurn' })} />
        </div>
      </div>
    </div>
  );
}

function Act({
  label,
  hint,
  tone,
  on,
  busy,
  off,
  onClick,
}: {
  label: string;
  hint?: string | undefined;
  tone?: 'brass' | 'danger' | 'spark';
  /** A toggle that is switched on: lit in the brass the speed buttons use. */
  on?: boolean;
  busy: boolean;
  /** Why this action is unavailable, or null when it can be taken. */
  off: string | null;
  onClick: () => void;
}) {
  const colour =
    on ? 'var(--brass)' : tone === 'brass' ? '#c9b489' : tone === 'danger' ? '#d8a12a' : tone === 'spark' ? '#fffce8' : undefined;
  const note = off ?? hint;

  return (
    <button
      className="ghost"
      disabled={busy || off !== null}
      onClick={onClick}
      title={note}
      style={{
        ...S.act,
        ...(off ? S.off : colour ? { color: colour, borderColor: colour } : {}),
      }}
    >
      {label}
      {note && <span style={S.hint}>{note}</span>}
    </button>
  );
}

/** The eight compass lines, in the engine's own d8 order. */
function arrowFor(direction: number): string {
  const step = DIRECTIONS[direction - 1];
  if (!step) return String(direction);
  const glyphs: Record<string, string> = {
    '0,1': '↑', '1,1': '↗', '1,0': '→', '1,-1': '↘',
    '0,-1': '↓', '-1,-1': '↙', '-1,0': '←', '-1,1': '↖',
  };
  return glyphs[`${step.x},${step.y}`] ?? String(direction);
}

const S: Record<string, React.CSSProperties> = {
  wrap: { flex: 'none' },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 58,
    padding: '0 12px',
    background: 'linear-gradient(#161b1f,#0e1214)',
    border: '1px solid var(--line)',
    boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 6%)',
    flexWrap: 'wrap',
  },
  act: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    fontSize: 13,
    padding: '9px 14px',
    maxWidth: 210,
  },
  off: {
    color: 'var(--text-faint)',
    borderColor: 'rgba(43,52,57,.9)',
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  hint: {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: '.08em',
    textTransform: 'none',
    color: 'var(--text-faint)',
    marginTop: 2,
  },
  tray: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    marginBottom: 4,
    background: 'var(--panel-deep)',
    border: '1px solid var(--brass-dim)',
    flexWrap: 'wrap',
  },
  trayButton: { fontSize: 13, padding: '8px 13px' },
};
