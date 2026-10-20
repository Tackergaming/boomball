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
 * - **The labels**, beside a target while the cursor is on it, for what the
 *   Giff does to it: Swing, "Shove 1 square" or "Disarm the ball" (one engine
 *   action, `shove`, two buttons by whether the target carries the ball, never
 *   both), Pass, Bat a Cracker; each with its exact chance (`odds.ts`) in
 *   green, amber or red, and a line saying what it does on hover. The same
 *   actions are in the row too, one button per target (Jérôme after his game
 *   on 2H.38: never "cachées derrière un clic"; the click is the sheet alone).
 *
 * The one-generator rule still holds: what is on offer is what `legalActions`
 * listed, and the match screen builds the lists from it. This file only draws
 * them, numbers them 1 to 9 for the keyboard, and asks the place question when
 * the round asks it (écart 58), in the row itself, so the pitch stays in view:
 * "il faut pouvoir voir le terrain et les joueurs pendant qu'on demande de
 * choisir, car c'est une décision stratégique".
 *
 * A team played whole (écart 66, 2H.41, `00` C41 point 8) adds three things,
 * all in the row so that nothing is "cachée derrière un clic":
 *
 * - **The pick row**, when the ladder reaches one of the team's picks: "Your
 *   team · pick a Giff" and one button per Giff still to play, first name and
 *   role letter, in role order, keys 1 to 9 as the row's actions have them.
 *   The cursor on a button lights that Giff on the board (`onAim`), the clock
 *   runs here as in the place question, and "Let the AI finish the round" sits
 *   on the right: the clock running out does the same.
 * - **The two AI buttons**, at the right of the row during a picked Giff's
 *   turn, just before "End turn": "Let the AI play" (this Giff, then the pick
 *   comes back) and "Let the AI finish the round" (this Giff and every one
 *   still to play). No key digit, they are not actions of the Giff.
 * - **The wait row**, for a team-mate: a picked Giff is somebody else's turn,
 *   so the row only says to wait, and the pick row comes back for everyone as
 *   soon as the turn ends.
 */

import type { OddsBand } from './odds.js';
import { ROLE_LETTER } from './TurnStrip.js';

/**
 * What the player has started and not finished, which the boards can answer: a
 * pending Swing rings the enemies and a click on one is the answer. The match
 * screen no longer starts one since every target has its own button (after
 * Jérôme's game on 2H.38), so the boards always get null.
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
  /** Whom it is aimed at, by name, for a button of the row. */
  readonly target?: string;
  /** The id of that unit or Cracker, lit on the board while the button is hovered. */
  readonly aims?: string;
  /** Lit: a held Dash, the plotting switch. */
  readonly on?: boolean;
  readonly testId?: string;
  readonly run: () => void;
}

/** One Giff the pick row offers, already in role order. */
export interface PickOption {
  readonly id: string;
  readonly name: string;
  readonly role: 'striker' | 'breaker' | 'bulwark' | 'trajector';
  readonly run: () => void;
}

export function ActionRow({
  mode,
  actions,
  onAim,
  busy,
  call,
  end,
  place,
  pick = null,
  ai = null,
  wait = null,
}: {
  /**
   * `turn` the player's own turn, `place` the place question, `pick` a whole
   * team's pick, `wait` a team-mate playing a picked Giff, `none` anybody
   * else's turn.
   */
  mode: 'turn' | 'place' | 'pick' | 'wait' | 'none';
  actions: readonly Act[];
  /** The target of the button under the cursor, or null when it leaves. */
  onAim?: (id: string | null) => void;
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
  /** The pick row's content (écart 66); null outside a pick. */
  pick?: {
    readonly units: readonly PickOption[];
    readonly secondsLeft: number | null;
    readonly onRound: () => void;
    /** The Giff under the cursor, or null when it leaves: the board lights it. */
    readonly onAim?: (id: string | null) => void;
  } | null;
  /** The two AI buttons of a picked Giff's turn (écart 66); null for a team played seat by seat. */
  ai?: { readonly onTurn: () => void; readonly onRound: () => void } | null;
  /** What a team-mate waits for while a picked Giff plays (écart 66). */
  wait?: { readonly text: string } | null;
}) {
  if (mode === 'none') return null;

  if (mode === 'wait' && wait) {
    return (
      <div className="bb-row" data-testid="wait-row">
        <span className="bb-row-ask">{wait.text}</span>
      </div>
    );
  }

  if (mode === 'pick' && pick) {
    return (
      <div className="bb-row" data-testid="pick-row">
        <span className="bb-row-ask">Your team · pick a Giff</span>
        {pick.units.map((unit, i) => (
          <button
            key={unit.id}
            type="button"
            className="bb-act pick"
            data-testid="pick-unit"
            data-unit-id={unit.id}
            disabled={busy}
            onMouseEnter={() => pick.onAim?.(unit.id)}
            onMouseLeave={() => pick.onAim?.(null)}
            onFocus={() => pick.onAim?.(unit.id)}
            onBlur={() => pick.onAim?.(null)}
            onClick={unit.run}
          >
            {i < 9 && <span className="k" aria-hidden>{i + 1}</span>}
            <span className="rl">{ROLE_LETTER[unit.role]}</span>
            {unit.name}
          </button>
        ))}
        {pick.secondsLeft !== null && (
          <span className="bb-row-clock" style={pick.secondsLeft <= 10 ? { color: 'var(--danger)' } : undefined}>
            ◔ {pick.secondsLeft}s
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" className="bb-act quiet" data-testid="ai-round" disabled={busy} onClick={pick.onRound}>
          Let the AI finish the round
        </button>
      </div>
    );
  }

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
          className={`bb-act${act.on ? ' on' : ''}${act.target ? ' aimed' : ''}`}
          disabled={busy}
          onClick={act.run}
          title={act.why}
          {...(act.aims
            ? {
                'data-aims': act.aims,
                onMouseEnter: () => onAim?.(act.aims ?? null),
                onMouseLeave: () => onAim?.(null),
              }
            : {})}
          {...(act.testId ? { 'data-testid': act.testId, 'data-on': act.on ? 'yes' : 'no' } : {})}
        >
          {i < 9 && <span className="k" aria-hidden>{i + 1}</span>}
          {act.target ? (
            <span className="two">
              <span>{act.label}</span>
              <span className="who">{act.target}</span>
            </span>
          ) : (
            act.label
          )}
          {act.chance !== undefined && <span className={`p ${act.band ?? ''}`}>{pct(act.chance)}</span>}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {ai && (
        <>
          <button
            type="button"
            className="bb-act quiet"
            data-testid="ai-play"
            disabled={busy}
            onClick={ai.onTurn}
            title="The AI plays this Giff for the rest of its turn, then you pick the next one."
          >
            Let the AI play
          </button>
          <button
            type="button"
            className="bb-act quiet"
            data-testid="ai-round"
            disabled={busy}
            onClick={ai.onRound}
            title="The AI plays this Giff and every Giff of your team still to play this round."
          >
            Let the AI finish the round
          </button>
        </>
      )}
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
export function TargetTags({
  tags,
  busy,
  title,
  numbered = false,
  onHold,
}: {
  tags: readonly Act[];
  busy: boolean;
  title?: string;
  /** Whether the keys 1 to 9 answer them: only the lines of a batted Cracker, the row has them otherwise. */
  numbered?: boolean;
  /** The cursor on the labels (true) or gone from them (false), so hover-shown labels stay up to be clicked. */
  onHold?: (on: boolean) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="bb-tags" data-testid="target-tags" onMouseEnter={() => onHold?.(true)} onMouseLeave={() => onHold?.(false)}>
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
          {numbered && i < 9 && <span className="k" aria-hidden>{i + 1}</span>}
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
