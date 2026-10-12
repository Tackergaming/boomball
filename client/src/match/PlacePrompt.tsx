/**
 * The one question a round asks of the human before its first turn.
 *
 * Écart 58, sub-phase 2H.12, Jérôme on 2026-10-12: when the first turn of the
 * player's role comes round, it chooses to play first, second or third of that
 * role for this round only (Breakers have two places, fewer if a team-mate of
 * the role is off the field). This replaces écart 55's "a human always plays
 * last of its role", which kept the player from ever opening a play.
 *
 * Closing the popup without choosing, by the button, Escape or a click on the
 * scrim, is a choice too: the player plays last, as before. The popup carries
 * its own clock, and the parent passes the seconds left.
 */

import { useEffect } from 'react';

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
  readonly onChoose: (place: number) => void;
  /** Closing without choosing: the caller sends the last place. */
  readonly onClose: () => void;
}

const ORDINAL = ['', '1st', '2nd', '3rd'];
const HINT = ['', 'open the play', 'read one team-mate first', 'read two team-mates first'];

export function PlacePrompt({ name, role, places, secondsLeft, busy, onChoose, onClose }: PlacePromptProps) {
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
    <div style={S.scrim} onClick={onClose}>
      <div style={S.panel} data-testid="place-prompt" onClick={(event) => event.stopPropagation()}>
        <p className="label" style={{ margin: 0, color: 'var(--brass)' }}>
          Round order
        </p>
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
  scrim: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(4,5,7,.78)',
    zIndex: 10,
  },
  panel: {
    width: 480,
    maxWidth: '92%',
    padding: 26,
    background: 'var(--panel)',
    border: '1px solid var(--brass-dim)',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  },
  title: { margin: '6px 0 10px', fontSize: 26 },
  body: { margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-dim)' },
  row: { display: 'flex', gap: 10, marginTop: 18 },
  place: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    background: 'var(--panel-deep)',
    border: '1px solid var(--line)',
  },
  ordinal: { fontSize: 22, color: 'var(--brass)' },
  hint: { fontSize: 11, lineHeight: 1.4, color: 'var(--text-dim)', textAlign: 'center' },
  actions: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 },
  clock: { marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 14, letterSpacing: '.06em' },
};
