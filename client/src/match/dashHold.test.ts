/**
 * The Dash held back (2H.30, `00` C31 point 3): the board shown with the
 * Dash's feet counted, and the walk that needs the Dash sent.
 */

import { describe, expect, it } from 'vitest';

import { MOVE_SPEED_FEET } from '../../../engine/constants.js';
import type { MatchState, TurnState } from '../../../engine/types.js';
import { dashNeeded, heldDashState } from './dashHold.js';

function withTurn(turn: Partial<TurnState> | null): MatchState {
  const base: TurnState = {
    unitId: 'A-striker-1',
    startedAt: { x: 2, y: 14 },
    movementFeetRemaining: 40,
    actionUsed: false,
    objectInteractionUsed: false,
    disengaged: false,
    placing: null,
    shot: false,
    freePass: false,
    pickedBy: null,
    delegated: false,
  };
  return { turn: turn === null ? null : { ...base, ...turn } } as unknown as MatchState;
}

describe('heldDashState', () => {
  it('adds the Dash feet to the turn and keeps the Action in hand', () => {
    const held = heldDashState(withTurn({ movementFeetRemaining: 25 }));
    expect(held.turn?.movementFeetRemaining).toBe(25 + MOVE_SPEED_FEET);
    expect(held.turn?.actionUsed).toBe(false);
  });

  it('is the state itself with no turn or the Action spent', () => {
    const spent = withTurn({ actionUsed: true });
    expect(heldDashState(spent)).toBe(spent);
    const none = withTurn(null);
    expect(heldDashState(none)).toBe(none);
  });
});

describe('dashNeeded', () => {
  const from = { x: 2, y: 14 };
  const cells = (n: number) => Array.from({ length: n }, (_, i) => ({ x: 2, y: 15 + i }));

  it('is false inside the plain budget, true one cell past it', () => {
    const state = withTurn({ movementFeetRemaining: 40 });
    expect(dashNeeded(state, from, cells(8))).toBe(false);
    expect(dashNeeded(state, from, cells(9))).toBe(true);
  });

  it('is false once the Action is spent, whatever the walk', () => {
    expect(dashNeeded(withTurn({ actionUsed: true, movementFeetRemaining: 10 }), from, cells(9))).toBe(false);
    expect(dashNeeded(withTurn(null), from, cells(9))).toBe(false);
  });
});
