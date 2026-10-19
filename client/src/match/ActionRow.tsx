/**
 * The actions, on the board and never over it (2H.38, `00` C37 points 3, 8 and
 * 9). Replaces the action panel under the board (`ActionBar.tsx`).
 *
 * Jérôme: the panel "devrait disparaître et apparaître directement sur le
 * terrain mais jamais bloquant la vue du joueur", "seulement celles dispo au
 * moment de jouer", "transparent plutôt que popup". So two places:
 *
 * - **The row**, a strip of dark glass along the bottom of the board, for
 *   what the Giff does by itself: only the actions that can be taken now,
 *   "Call for the ball" on the left behind a rule (an order, free), "End
 *   turn" always on the right, in two presses. The camera frames the pitch
 *   above it (`framing.ts`, `insetLens`).
 * - **The labels**, beside a target once it is clicked, for what the Giff does
 *   to it: Swing, "Shove 1 square" or "Disarm the ball" (one engine action,
 *   `shove`, two buttons by whether the target carries the ball, never both),
 *   Pass, Bat a Cracker; each with its exact chance (`odds.ts`) in green,
 *   amber or red, and a line saying what it does on hover.
 *
 * The one-generator rule still holds: what is on offer is what `legalActions`
 * listed, and the match screen builds the lists from it. This file only draws
 * them, numbers them 1 to 9 for the keyboard, and asks the place question when
 * the round asks it (écart 58), in the row itself, so the pitch stays in view:
 * "il faut pouvoir voir le terrain et les joueurs pendant qu'on demande de
 * choisir, car c'est une décision stratégique".
 */

import type { OddsBand } from './odds.js';

/**
 * What the player has started and not finished, kept by the match screen so
 * the boards can answer it: on the flat board a pending Swing rings the
 * enemies and a click on one is the answer; `cracker` is the line still to
 * pick after "Bat a Cracker".
 */
export type Pending = 'attack' | 'shove' | 'pass' | 'cracker' | null;

/** One button of the row or one label beside a target. */
export interface Act {
  readonly key: string;
  readonly label: string;
  /** The chance it works, 0 to 1, when a roll decides it. */
  readonly chance?: number;
  readonly band?: OddsBand;
  /** What the action does, shown on hover. */
  readonly why?: string;
  /** Lit: a held Dash, the plotting switch. */
  readonly on?: boolean;
  readonly testId?: string;
  readonly run: () => void;
}

export function ActionRow({
  mode,
  actions,
  busy,
  call,
  end,
  place,
}: {
  /** `turn` the player's own turn, `place` the place question, `none` anybody else's turn. */
  mode: 'turn' | 'place' | 'none';
  actions: readonly Act[];
  busy: boolean;
  call: { readonly called: boolean; readonly disabled: boolean; readonly run: () => void } | null;
  end: { readonly armed: boolean; readonly run: () => void };
  place: {
    readonly role: 'striker' | 'breaker';
    readonly places: number;
    readonly secondsLeft: number | null;
    readonly onChoose: (place: number) => void;
    readonly onPreview: (place: number | null) => void;
    readonly onLast: () => void;
  } | null;
}) {
  if (mode === 'none') return null;

  if (mode === 'place' && place) {
    const slots = Array.from({ length: place.places }, (_, i) => i + 1);
    return (
      <div className="bb-row" data-testid="place-prompt">
        <span className="bb-row-ask">Play this round as {place.role}</span>
        {slots.map((n) => (
          <button
            key={n}
            type="button"
            className="bb-act place"
            data-place={n}
            disabled={busy}
            onMouseEnter={() => place.onPreview(n)}
            onMouseLeave={() => place.onPreview(null)}
            onFocus={() => place.onPreview(n)}
            onBlur={() => place.onPreview(null)}
            onClick={() => place.onChoose(n)}
          >
            <span className="k" aria-hidden>{n}</span>
            {ORDINAL[n]}
          </button>
        ))}
        {place.secondsLeft !== null && (
          <span className="bb-row-clock" style={place.secondsLeft <= 10 ? { color: 'var(--danger)' } : undefined}>
            ◔ {place.secondsLeft}s
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className="bb-act quiet" data-testid="place-close" disabled={busy} onClick={place.onLast}>
          Play last · Esc
        </button>
      </div>
    );
  }

  return (
    <div className="bb-row" data-testid="action-row">
      {call && (
        <>
          <button
            type="button"
            className={`bb-act order${call.called ? ' on' : ''}`}
            disabled={busy || call.disabled}
            onClick={call.run}
            title="Tell your AI team-mates to look for you with the Payload. It does not cost your turn."
          >
            ⟲ {call.called ? 'Calling for the ball' : 'Call for the ball'}
          </button>
          <div className="bb-row-rule" />
        </>
      )}
      {actions.map((act, i) => (
        <button
          key={act.key}
          type="button"
          className={`bb-act${act.on ? ' on' : ''}`}
          disabled={busy}
          onClick={act.run}
          title={act.why}
          {...(act.testId ? { 'data-testid': act.testId, 'data-on': act.on ? 'yes' : 'no' } : {})}
        >
          {i < 9 && <span className="k" aria-hidden>{i + 1}</span>}
          {act.label}
          {act.chance !== undefined && <span className={`p ${act.band ?? ''}`}>{pct(act.chance)}</span>}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button type="button" className={`bb-act end${end.armed ? ' armed' : ''}`} disabled={busy} onClick={end.run} data-testid="end-turn">
        <span className="k" aria-hidden>E</span>
        {end.armed ? 'Press E again' : 'End turn'}
      </button>
    </div>
  );
}

/**
 * The labels beside a target (`00` C37 point 3), or the eight lines a batted
 * Cracker can be sent down. Positioned by the board that hangs them.
 */
export function TargetTags({ tags, busy, title }: { tags: readonly Act[]; busy: boolean; title?: string }) {
  if (tags.length === 0) return null;
  return (
    <div className="bb-tags" data-testid="target-tags">
      {title && <span className="bb-tags-title">{title}</span>}
      {tags.map((tag, i) => (
        <button
          key={tag.key}
          type="button"
          className={`bb-mtag ${tag.band ?? 'plain'}`}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            tag.run();
          }}
          data-tag={tag.key}
        >
          {i < 9 && <span className="k" aria-hidden>{i + 1}</span>}
          {tag.label}
          {tag.chance !== undefined && <span className="p">{pct(tag.chance)}</span>}
          {tag.why && <span className="why">{tag.why}</span>}
        </button>
      ))}
    </div>
  );
}

const ORDINAL = ['', '1st', '2nd', '3rd'];

function pct(p: number): string {
  return `${Math.round(p * 100)} %`;
}
