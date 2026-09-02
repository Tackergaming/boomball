/**
 * Artboard 1a: the match screen, and the only screen the game is actually
 * played on.
 *
 * It owns three things and delegates the rest. It works out **whether this
 * client may act** (the unit on the clock is human and it is this human's), it
 * asks `legalActions` what that unit may do, and it runs the turn clock down.
 *
 * The clock is displayed, not enforced. `matches.turn_deadline` is the server's
 * column and an expired turn is spent in Dodge by whichever request notices it
 * first, so a browser that freezes cannot stop the match and a browser that
 * lies about the time cannot buy any either.
 */

import { useEffect, useMemo, useState } from 'react';

import { legalActions } from '../../../engine/legalActions.js';
import { TURN_TIMER_SECONDS } from '../../../engine/constants.js';
import { isHuman } from '../../../engine/types.js';
import { arena } from '../lib/arena.js';
import { ActionBar } from '../match/ActionBar.js';
import { Board } from '../match/Board.js';
import { Feed } from '../match/Feed.js';
import { Ladder } from '../match/Ladder.js';
import { SeatPanel } from '../match/SeatPanel.js';
import { useMatch } from '../match/useMatch.js';
import { zoneOf } from '../lib/arena.js';

export function Match({
  matchId,
  userId,
  teamName,
  onFinished,
}: {
  matchId: string;
  userId: string;
  teamName: string;
  onFinished: () => void;
}) {
  const match = useMatch(matchId);
  const [selected, setSelected] = useState<string | null>(null);
  const [zone, setZone] = useState(2);
  const [now, setNow] = useState(() => Date.now());

  const state = match.state;

  // The human always plays team A: `createMatch` seats every human there.
  const own = 'A' as const;

  const onClock = state?.turn ? state.units.find((u) => u.id === state.turn!.unitId) ?? null : null;
  const yours =
    !!onClock &&
    isHuman(onClock) &&
    onClock.controller.kind === 'human' &&
    onClock.controller.humanId === userId;

  const legal = useMemo(
    () => (state && yours ? legalActions(arena, state) : null),
    [state, yours],
  );

  /** Follow the action: the zone the unit on the clock is standing in. */
  useEffect(() => {
    if (onClock) setZone(zoneOf(onClock.y));
  }, [onClock?.id, onClock?.y]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (state?.phase === 'finished') onFinished();
  }, [state?.phase, onFinished]);

  if (!state) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <p className="label" style={{ animation: 'bb-tick 1.4s infinite' }}>
          Opening the silo
        </p>
      </div>
    );
  }

  const left =
    yours && match.deadline ? Math.max(0, Math.ceil((match.deadline - now) / 1000)) : null;

  return (
    <div style={S.screen}>
      <header style={S.top}>
        <div style={S.side}>
          <div className="plate" style={{ ...S.crest, border: '2px solid var(--team-own)' }}>
            <span style={{ ...S.crestText, color: 'var(--team-own)' }}>{initials(teamName)}</span>
          </div>
          <div>
            <p className="display" style={{ margin: 0, fontSize: 19 }}>
              {teamName}
            </p>
            <p className="label" style={{ margin: '2px 0 0' }}>
              Bench {state.bench.A} of 3
            </p>
          </div>
        </div>

        <div style={S.centre}>
          <p className="display" style={S.score}>
            <span style={{ color: 'var(--team-own)' }}>{state.score.A}</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 22, padding: '0 12px' }}>·</span>
            <span style={{ color: 'var(--team-foe)' }}>{state.score.B}</span>
          </p>
          <p className="label" style={{ margin: 0, textAlign: 'center' }}>
            Round {state.round} of 10
            {state.phase === 'suddenDeath' ? ' · sudden death' : ''}
          </p>
        </div>

        <div style={{ ...S.side, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <p className="display" style={{ margin: 0, fontSize: 19 }}>
              The House
            </p>
            <p className="label" style={{ margin: '2px 0 0' }}>
              Bench {state.bench.B} of 3
            </p>
          </div>
          <div className="plate" style={{ ...S.crest, border: '2px solid var(--team-foe)' }}>
            <span style={{ ...S.crestText, color: 'var(--team-foe)' }}>HS</span>
          </div>
        </div>
      </header>

      <div style={S.body}>
        <div style={S.left}>
          <Board
            state={state}
            legal={legal}
            own={own}
            zone={zone}
            onZone={setZone}
            onMove={yours && !match.busy ? (path) => void match.send({ kind: 'move', path }) : null}
            onSelectUnit={setSelected}
            selected={selected}
          />

          {match.refusal && (
            <div style={S.refusal}>
              <span className="error">{match.refusal}</span>
              <button className="ghost" style={S.dismiss} onClick={match.dismissRefusal}>
                Dismiss
              </button>
            </div>
          )}

          <div style={S.clockRow}>
            {yours ? (
              <span className="label" style={{ color: left !== null && left <= 10 ? 'var(--danger)' : 'var(--brass)' }}>
                Your turn · {left ?? TURN_TIMER_SECONDS}s
              </span>
            ) : (
              <span className="label">{onClock ? `${onClock.name} is up` : 'Resolving'}</span>
            )}
          </div>

          <ActionBar
            legal={legal}
            yours={yours}
            busy={match.busy}
            movementFeet={state.turn?.movementFeetRemaining ?? 0}
            onAct={(action) => void match.send(action)}
          />
        </div>

        <aside style={S.right}>
          <Ladder state={state} own={own} onSelect={setSelected} />
          <SeatPanel state={state} unitId={selected ?? onClock?.id ?? null} own={own} />
          <Feed feed={match.feed} state={state} own={own} />
        </aside>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

const S: Record<string, React.CSSProperties> = {
  screen: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: 10,
    padding: 12,
    background: '#0a0c0e',
  },
  top: {
    height: 74,
    flex: 'none',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    padding: '0 14px',
    background: 'linear-gradient(#161b1f,#0e1214)',
    border: '1px solid var(--line)',
    boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 6%)',
  },
  side: { display: 'flex', alignItems: 'center', gap: 12 },
  crest: { width: 44, height: 44, flex: 'none' },
  crestText: { fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17 },
  centre: { textAlign: 'center' },
  score: { margin: 0, fontSize: 36, letterSpacing: '.04em' },
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: 10,
    flex: 1,
    minHeight: 0,
  },
  left: { display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 },
  right: {
    display: 'grid',
    gridTemplateRows: 'minmax(140px, 1fr) auto minmax(140px, 1.2fr)',
    gap: 10,
    minHeight: 0,
  },
  clockRow: { flex: 'none', display: 'flex', alignItems: 'center', gap: 10 },
  refusal: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 12px',
    background: 'var(--panel-deep)',
    border: '1px solid #ff8fa0',
  },
  dismiss: { marginLeft: 'auto', fontSize: 11, padding: '5px 10px' },
};
