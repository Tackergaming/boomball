/**
 * The order of the turns in chips (2H.38, `00` C37 points 2 and 8): the
 * chips follow the engine's order, the one on the clock is the cursor, and
 * the preview of the place question moves the player's Giff inside its block.
 */

import { describe, expect, it } from 'vitest';

import type { MatchState, TurnSlot } from '../../../engine/types.js';
import { roundChips } from './TurnStrip.js';

const slot = (rank: number, unitId: string, blockId: string | null): TurnSlot =>
  ({ rank, actor: { kind: 'unit', unitId }, blockId }) as TurnSlot;

function stateWith(order: TurnSlot[], turnIndex: number): MatchState {
  return { turnOrder: order, turnIndex } as unknown as MatchState;
}

const order: TurnSlot[] = [
  { rank: 1, actor: { kind: 'spark' }, blockId: null } as TurnSlot,
  slot(2, 'A-trajector-1', null),
  slot(3, 'A-striker-1', 'A-strikers'),
  slot(3, 'A-striker-2', 'A-strikers'),
  slot(3, 'me', 'A-strikers'),
  { rank: 4, actor: { kind: 'crackers' }, blockId: null } as TurnSlot,
  slot(5, 'B-striker-1', null),
];

describe('roundChips', () => {
  it('follows the engine order, hazards included, with the cursor on the clock', () => {
    const { chips, current } = roundChips(stateWith(order, 2));
    expect(chips.map((c) => (c.kind === 'unit' ? c.unitId : c.kind))).toEqual([
      'spark',
      'A-trajector-1',
      'A-striker-1',
      'A-striker-2',
      'me',
      'crackers',
      'B-striker-1',
    ]);
    expect(current).toBe(2);
  });

  it('moves the player inside its block for the place preview, and marks it', () => {
    const first = roundChips(stateWith(order, 2), { unitId: 'me', place: 1 }).chips;
    expect(first.slice(2, 5).map((c) => (c.kind === 'unit' ? c.unitId : ''))).toEqual(['me', 'A-striker-1', 'A-striker-2']);
    expect(first[2]).toMatchObject({ ghost: true });
    const second = roundChips(stateWith(order, 2), { unitId: 'me', place: 2 }).chips;
    expect(second.slice(2, 5).map((c) => (c.kind === 'unit' ? c.unitId : ''))).toEqual(['A-striker-1', 'me', 'A-striker-2']);
    // The rest of the round does not move.
    expect(second[6]).toMatchObject({ unitId: 'B-striker-1', ghost: false });
  });

  it('leaves the order alone for a unit outside any block, and clamps the cursor', () => {
    const { chips, current } = roundChips(stateWith(order, 99), { unitId: 'A-trajector-1', place: 1 });
    expect(chips[1]).toMatchObject({ unitId: 'A-trajector-1', ghost: false });
    expect(current).toBe(order.length);
  });
});
