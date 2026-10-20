/**
 * The order of the turns in chips (2H.38, `00` C37 points 2 and 8): the
 * chips follow the engine's order, the one on the clock is the cursor, and
 * the preview of the place question moves the player's Giff inside its block.
 * A team played whole (2H.41, `00` C41 point 8) is one block of chips.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from '../../../engine/arena.js';
import { KILL_SILO } from '../../../engine/arenas/kill-silo.js';
import { reduce } from '../../../engine/reduce.js';
import { createMatch } from '../../../engine/setup.js';
import { pendingPick, type MatchState, type TurnSlot } from '../../../engine/types.js';
import { openSession } from '../../../server/session.js';
import { roundChips, type Chip } from './TurnStrip.js';

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

describe('roundChips, a team played whole (écart 66)', () => {
  const arena = new Arena(KILL_SILO);
  const opened = () =>
    openSession(
      arena,
      createMatch({
        arena: KILL_SILO,
        tier: 'rookie',
        humans: [{ humanId: 'jerome', role: 'striker', name: 'Bombast' }],
        seed: 5,
        wholeTeam: true,
      }),
      1_700_000_000_000,
    ).session.state;
  const blockOf = (state: MatchState, team: 'A' | 'B' = 'A') => {
    const { chips, current } = roundChips(state);
    const blocks = chips.filter((c): c is Extract<Chip, { kind: 'block' }> => c.kind === 'block' && c.team === team);
    return { chips, current, blocks, block: blocks[0]! };
  };

  it('draws the team as one block with every Giff still to play, the cursor on it', () => {
    const state = opened();
    expect(pendingPick(state)).not.toBeNull();
    const { chips, current, blocks, block } = blockOf(state);
    expect(blocks).toHaveLength(1);
    expect(block.toPlay).toHaveLength(7);
    expect(block.played).toEqual([]);
    expect(block.current).toBeNull();
    expect(chips[current]).toBe(block);
    // The team's picks are gone from the strip as chips of their own: one entry stands for them.
    expect(chips.length).toBeLessThan(state.turnOrder.length);
    // The other team is not played whole, its seven stay named.
    expect(blockOf(state, 'B').blocks).toHaveLength(0);
  });

  it('puts a picked Giff on the clock inside the block, six left to play', () => {
    const state = opened();
    const unitId = blockOf(state).block.toPlay[0]!;
    const result = reduce(arena, state, { unitId, action: { kind: 'pickUnit', humanId: 'jerome' } });
    if (!result.ok) throw new Error(result.reason);
    const { chips, current, blocks, block } = blockOf(result.state);
    expect(blocks).toHaveLength(1);
    expect(block.current).toBe(unitId);
    expect(block.played).toEqual([]);
    expect(block.toPlay).toHaveLength(6);
    expect(block.toPlay).not.toContain(unitId);
    expect(chips[current]).toBe(block);
  });

  it('keeps the block as the entry on the clock once the turn is over: one played, six to play', () => {
    const state = opened();
    const unitId = blockOf(state).block.toPlay[0]!;
    const picked = reduce(arena, state, { unitId, action: { kind: 'pickUnit', humanId: 'jerome' } });
    if (!picked.ok) throw new Error(picked.reason);
    const ended = reduce(arena, picked.state, { unitId, action: { kind: 'endTurn' } });
    if (!ended.ok) throw new Error(ended.reason);
    const { chips, current, block } = blockOf(ended.state);
    expect(block.played).toEqual([unitId]);
    expect(block.current).toBeNull();
    expect(block.toPlay).toHaveLength(6);
    expect(chips[current]).toBe(block);
  });
});
