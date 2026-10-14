/**
 * The one question a round asks of the human before its first turn.
 *
 * Écart 58, sub-phase 2H.12, Jérôme on 2026-10-12: when the first turn of the
 * player's role comes round, it chooses to play first, second or third of that
 * role for this round only (Breakers have two places, fewer if a team-mate of
 * the role is off the field). This replaces écart 55's "a human always plays
 * last of its role", which kept the player from ever opening a play.
 *
 * Closing the popup without choosing, by the button or Escape, is a choice too:
 * the player plays last, as before. The popup carries its own clock, and the
 * parent passes the seconds left.
 *
 * Jérôme, 2026-10-14: no scrim and not in the middle of the screen. The card
 * floats over the right column so the pitch stays readable while choosing, and
 * its header is a handle to drag it. The parent owns the position.
 */

import { useEffect, useRef } from 'react';

export interface PlacePromptProps {
  /** The player's Giff name, e.g. "Tacker". */
  readonly name: string;
  readonly role: 'striker' | 'breaker';
  /** Places on offer, 2 or 3. */
  readonly places: number;
  /** Seconds left on the choice's clock, or null when unknown. */
  readonly secondsLeft: number | null;
  /** True while a request is in flight: buttons disabled. */
  readonly busy: boolean;
  /** Top-left corner inside the positioned parent, in px. */
  readonly position: { readonly x: number; readonly y: number };
  readonly onMove: (position: { x: number; y: number }) => void;
  readonly onChoose: (place: number) => void;
  /** Closing without choosing: the caller sends the last place. */
  readonly onClose: () => void;
}

const ORDINAL = ['', '1st', '2nd', '3rd'];
const HINT = ['', 'open the play', 'read one team-mate first', 'read two team-mates first'];

/** Pixels of the card that must stay inside the parent. */
const KEEP = 60;

export function PlacePrompt({
  name,
  role,
  places,
  secondsLeft,
  busy,
  position,
  onMove,
  onChoose,
  onClose,
}: PlacePromptProps) {
  const card = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const clamp = (x: number, y: number) => {
    const el = card.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x, y };
    return {
      x: Math.min(Math.max(x, KEEP - el.offsetWidth), parent.clientWidth - KEEP),
      y: Math.min(Math.max(y, 0), parent.clientHeight - KEEP),
    };
  };

  const onDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onMove(clamp(event.clientX - drag.current.dx, event.clientY - drag.current.dy));
  };
  const onUp = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const plural = role === 'striker' ? 'Strikers' : 'Breakers';
  const slots = Array.from({ length: places }, (_, i) => i + 1);

  return (
    <div
      ref={card}
      style={{ ...S.panel, left: position.x, top: position.y }}
      data-testid="place-prompt"
    >
      <div
        style={S.handle}
        title="Drag to move"
        onPointerDown={onDown}
        onPointerMove={onDrag}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <p className="label" style={{ margin: 0, color: 'var(--brass)' }}>
          Round order
        </p>
        <span aria-hidden style={S.grip}>
          ⋮⋮
        </span>
      </div>
      <div style={S.content}>
        <h2 className="display" style={S.title}>
          When does {name} play?
        </h2>
        <p style={S.body}>
          Pick your place among your {plural} this round. The others take the remaining places.
        </p>

        <div style={S.row}>
          {slots.map((n) => (
            <button key={n} data-place={n} disabled={busy} onClick={() => onChoose(n)} style={S.place}>
              <span className="display" style={S.ordinal}>
                {ORDINAL[n]}
              </span>
              <span style={S.hint}>
                {HINT[n]}
                {n === places && n !== 1 ? ' (default)' : ''}
              </span>
            </button>
          ))}
        </div>

        <div style={S.actions}>
          <button className="ghost" data-testid="place-close" disabled={busy} onClick={onClose}>
            Close, play last
          </button>
          {secondsLeft !== null && (
            <span style={{ ...S.clock, color: secondsLeft <= 10 ? 'var(--danger)' : 'var(--text-dim)' }}>
              {secondsLeft}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    zIndex: 10,
    boxSizing: 'border-box',
    width: 340,
    maxWidth: '100%',
    minWidth: 0,
    background: 'var(--panel)',
    border: '1px solid var(--brass-dim)',
    boxShadow: '0 12px 36px rgba(0,0,0,.55)',
  },
  handle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderBottom: '1px solid var(--line)',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  },
  grip: { color: 'var(--text-dim)', letterSpacing: '-.1em' },
  content: { padding: '12px 14px 14px' },
  title: { margin: '0 0 8px', fontSize: 22 },
  body: { margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-dim)' },
  row: { display: 'flex', gap: 8, marginTop: 12 },
  place: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 6px',
    background: 'var(--panel-deep)',
    border: '1px solid var(--line)',
  },
  ordinal: { fontSize: 22, color: 'var(--brass)' },
  hint: { fontSize: 11, lineHeight: 1.4, color: 'var(--text-dim)', textAlign: 'center' },
  actions: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 },
  clock: { marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 14, letterSpacing: '.06em' },
};
