/**
 * The match screen's keyboard (2H.38, `00` C37).
 *
 * Why. The designer wants the whole match playable from the keyboard: the
 * digits press the bottom row (or the target labels when a target is being
 * picked), E ends the turn, Escape cancels, and a few letters toggle the
 * panels. The screen owns the key listener and decides which list the digits
 * point at; this module only turns a key press into a command, so the rules
 * can be tested without a DOM.
 *
 * Ending the turn takes two presses: the first arms it (the button reads
 * "Press E again") for three seconds, a second press inside that window
 * fires it, and after the window it disarms. The arrow keys belong to the
 * camera and return nothing here.
 *
 * Everything is pure: the clock is passed in.
 */

/** What a key press asks the match screen to do. */
export type KeyCommand =
  | { kind: 'action'; index: number }
  | { kind: 'endTurn' }
  | { kind: 'escape' }
  | { kind: 'follow' }
  | { kind: 'view' }
  | { kind: 'log' }
  | { kind: 'minimap' }
  | { kind: 'fullscreen' };

/** The part of a keyboard event the rules read. */
export interface KeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  /** The event came from a field the player is typing in (`isTypingTarget`). */
  typing?: boolean;
}

/**
 * The command a key press means, or null when it means nothing. Nothing fires
 * while typing or with Ctrl, Meta or Alt held; outside the player's own turn
 * only the panel keys and Escape work. Letters are case-insensitive, `1`..`9`
 * give the index 0..8.
 */
export function commandForKey(input: KeyInput, ctx: { myTurn: boolean }): KeyCommand | null {
  if (input.typing || input.ctrlKey || input.metaKey || input.altKey) return null;
  const key = input.key;
  if (key.length === 1 && key >= '1' && key <= '9') {
    return ctx.myTurn ? { kind: 'action', index: key.charCodeAt(0) - 49 } : null;
  }
  switch (key.length === 1 ? key.toLowerCase() : key) {
    case 'e':
      return ctx.myTurn ? { kind: 'endTurn' } : null;
    case 'Escape':
      return { kind: 'escape' };
    case 'c':
      return { kind: 'follow' };
    case 'v':
      return { kind: 'view' };
    case 'l':
      return { kind: 'log' };
    case 'm':
      return { kind: 'minimap' };
    case 'f':
      return { kind: 'fullscreen' };
    default:
      return null;
  }
}

/**
 * Whether a key event's target is a field the player types in: an input, a
 * textarea, a select or a contentEditable element. False where there is no
 * DOM (node tests).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** How long the first press of E keeps the end of turn armed, in ms. */
export const END_TURN_ARM_MS = 3000;

/**
 * One press of E. The first press (nothing armed, or the window gone) arms at
 * `now` and fires nothing; a second press inside the window fires and disarms.
 */
export function pressEndTurn(
  armedAt: number | null,
  now: number,
  windowMs: number = END_TURN_ARM_MS,
): { fire: boolean; armedAt: number | null } {
  if (endTurnArmed(armedAt, now, windowMs)) return { fire: true, armedAt: null };
  return { fire: false, armedAt: now };
}

/** Whether the end of turn is still armed at `now` (the window is half open: it ends at `windowMs`). */
export function endTurnArmed(armedAt: number | null, now: number, windowMs: number = END_TURN_ARM_MS): boolean {
  return armedAt !== null && now - armedAt < windowMs;
}
