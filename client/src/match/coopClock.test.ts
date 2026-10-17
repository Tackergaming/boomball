import { describe, expect, it } from 'vitest';

import { TEAMMATE_KNOCK_GRACE_MS, clockText, secondsLeft, teammateKnockDue } from './coopClock.js';

const T = 1_700_000_000_000;

describe("a team-mate's knock (2H.33, C32 point 5)", () => {
  it('waits five seconds past the deadline, corrected for the clock skew', () => {
    expect(teammateKnockDue(null, 0, T)).toBe(false);
    expect(teammateKnockDue(T, 0, T)).toBe(false);
    expect(teammateKnockDue(T, 0, T + TEAMMATE_KNOCK_GRACE_MS - 1)).toBe(false);
    expect(teammateKnockDue(T, 0, T + TEAMMATE_KNOCK_GRACE_MS)).toBe(true);
    // A browser two minutes behind the server reads the deadline as far off
    // until the skew is added back.
    expect(teammateKnockDue(T, 120_000, T - 120_000 + TEAMMATE_KNOCK_GRACE_MS)).toBe(true);
    expect(teammateKnockDue(T, 120_000, T - 120_000)).toBe(false);
  });

  it("reads the seconds left on somebody else's clock", () => {
    expect(secondsLeft(null, 0, T)).toBeNull();
    expect(secondsLeft(T + 72_000, 0, T)).toBe(72);
    expect(secondsLeft(T + 500, 0, T)).toBe(1);
    expect(secondsLeft(T - 9_000, 0, T)).toBe(0);
    expect(clockText(72)).toBe('1:12');
    expect(clockText(5)).toBe('0:05');
    expect(clockText(120)).toBe('2:00');
  });
});
