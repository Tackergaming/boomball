/**
 * The match screen's keyboard (2H.38, `00` C37): which key means which
 * command, when it is allowed, and the two-press end of turn.
 */

import { describe, expect, it } from 'vitest';

import { END_TURN_ARM_MS, commandForKey, endTurnArmed, isTypingTarget, pressEndTurn } from './keys.js';

const mine = { myTurn: true };
const theirs = { myTurn: false };

describe('commandForKey', () => {
  it('maps the digits 1..9 to the indexes 0..8', () => {
    for (let d = 1; d <= 9; d++) {
      expect(commandForKey({ key: String(d) }, mine)).toEqual({ kind: 'action', index: d - 1 });
    }
  });

  it('gives nothing for 0', () => {
    expect(commandForKey({ key: '0' }, mine)).toBeNull();
  });

  it('maps each letter and Escape', () => {
    expect(commandForKey({ key: 'e' }, mine)).toEqual({ kind: 'endTurn' });
    expect(commandForKey({ key: 'Escape' }, mine)).toEqual({ kind: 'escape' });
    expect(commandForKey({ key: 'c' }, mine)).toEqual({ kind: 'follow' });
    expect(commandForKey({ key: 'v' }, mine)).toEqual({ kind: 'view' });
    expect(commandForKey({ key: 'l' }, mine)).toEqual({ kind: 'log' });
    expect(commandForKey({ key: 'm' }, mine)).toEqual({ kind: 'minimap' });
    expect(commandForKey({ key: 'f' }, mine)).toEqual({ kind: 'fullscreen' });
  });

  it('ignores the case of letters', () => {
    expect(commandForKey({ key: 'E' }, mine)).toEqual({ kind: 'endTurn' });
    expect(commandForKey({ key: 'C' }, mine)).toEqual({ kind: 'follow' });
    expect(commandForKey({ key: 'L' }, mine)).toEqual({ kind: 'log' });
    expect(commandForKey({ key: 'M' }, mine)).toEqual({ kind: 'minimap' });
    expect(commandForKey({ key: 'F' }, mine)).toEqual({ kind: 'fullscreen' });
  });

  it('leaves the arrow keys to the camera', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(commandForKey({ key }, mine)).toBeNull();
    }
  });

  it('gives nothing for other keys', () => {
    for (const key of ['a', 'Enter', ' ', 'Shift', 'Tab']) {
      expect(commandForKey({ key }, mine)).toBeNull();
    }
  });

  it('blocks actions and end of turn outside the own turn, not the others', () => {
    expect(commandForKey({ key: '1' }, theirs)).toBeNull();
    expect(commandForKey({ key: '9' }, theirs)).toBeNull();
    expect(commandForKey({ key: 'e' }, theirs)).toBeNull();
    expect(commandForKey({ key: 'Escape' }, theirs)).toEqual({ kind: 'escape' });
    expect(commandForKey({ key: 'c' }, theirs)).toEqual({ kind: 'follow' });
    expect(commandForKey({ key: 'v' }, theirs)).toEqual({ kind: 'view' });
    expect(commandForKey({ key: 'l' }, theirs)).toEqual({ kind: 'log' });
    expect(commandForKey({ key: 'm' }, theirs)).toEqual({ kind: 'minimap' });
    expect(commandForKey({ key: 'f' }, theirs)).toEqual({ kind: 'fullscreen' });
  });

  it('is blocked by Ctrl, Meta or Alt', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      expect(commandForKey({ key: 'e', [mod]: true }, mine)).toBeNull();
      expect(commandForKey({ key: '1', [mod]: true }, mine)).toBeNull();
      expect(commandForKey({ key: 'Escape', [mod]: true }, mine)).toBeNull();
    }
  });

  it('is blocked while typing', () => {
    expect(commandForKey({ key: 'e', typing: true }, mine)).toBeNull();
    expect(commandForKey({ key: '3', typing: true }, mine)).toBeNull();
    expect(commandForKey({ key: 'Escape', typing: true }, mine)).toBeNull();
  });
});

describe('isTypingTarget', () => {
  it('is false for null and without a DOM', () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget({} as unknown as EventTarget)).toBe(false);
  });
});

describe('pressEndTurn', () => {
  it('arms on the first press', () => {
    expect(pressEndTurn(null, 1000)).toEqual({ fire: false, armedAt: 1000 });
  });

  it('fires on a second press inside the window', () => {
    expect(pressEndTurn(1000, 2500)).toEqual({ fire: true, armedAt: null });
    expect(pressEndTurn(1000, 1000 + END_TURN_ARM_MS - 1)).toEqual({ fire: true, armedAt: null });
  });

  it('arms again once the window has expired', () => {
    expect(pressEndTurn(1000, 1000 + END_TURN_ARM_MS)).toEqual({ fire: false, armedAt: 4000 });
    expect(pressEndTurn(1000, 9000)).toEqual({ fire: false, armedAt: 9000 });
  });

  it('runs arm, fire, then arm again', () => {
    const a = pressEndTurn(null, 0);
    const b = pressEndTurn(a.armedAt, 500);
    const c = pressEndTurn(b.armedAt, 800);
    expect([a.fire, b.fire, c.fire]).toEqual([false, true, false]);
    expect(c.armedAt).toBe(800);
  });

  it('honours a custom window', () => {
    expect(pressEndTurn(0, 150, 100)).toEqual({ fire: false, armedAt: 150 });
    expect(pressEndTurn(0, 50, 100)).toEqual({ fire: true, armedAt: null });
  });
});

describe('endTurnArmed', () => {
  it('is false when nothing is armed', () => {
    expect(endTurnArmed(null, 0)).toBe(false);
  });

  it('is true from the press up to the last millisecond of the window', () => {
    expect(endTurnArmed(1000, 1000)).toBe(true);
    expect(endTurnArmed(1000, 1000 + END_TURN_ARM_MS - 1)).toBe(true);
  });

  it('is false from the end of the window', () => {
    expect(endTurnArmed(1000, 1000 + END_TURN_ARM_MS)).toBe(false);
    expect(endTurnArmed(1000, 1000 + END_TURN_ARM_MS + 1)).toBe(false);
  });

  it('reads a custom window', () => {
    expect(endTurnArmed(0, 99, 100)).toBe(true);
    expect(endTurnArmed(0, 100, 100)).toBe(false);
  });
});
