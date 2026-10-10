import { describe, expect, it } from 'vitest';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import type { Point } from '../engine/geometry.js';
import { openMatch } from '../engine/reduce.js';
import { createMatch } from '../engine/setup.js';
import { activeUnits, type MatchState, type Unit } from '../engine/types.js';
import { mateSpread, playSeed, sweep } from './selfPlay.js';

const arena = new Arena(KILL_SILO);

/** Moves a unit, leaving the rest of the state alone. */
function put(state: MatchState, id: string, at: Point, extra: Partial<Unit> = {}): MatchState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

describe('ball track', () => {
  it('counts the turns the Payload is carried and how spread out the carrier side is', () => {
    const { ballTrack } = playSeed(KILL_SILO, 'rookie', 3);

    expect(ballTrack.carrierTurns).toBeGreaterThan(0);
    expect(ballTrack.carrierTurns).toBeLessThanOrEqual(ballTrack.turns);
    expect(ballTrack.mateSpreadSum).toBeGreaterThan(0);
    expect(ballTrack.huddleSum).toBeGreaterThanOrEqual(0);
  });

  it('averages into sane per-turn figures over a sweep', () => {
    const report = sweep(KILL_SILO, 'rookie', 4);

    expect(report.meanMateSpread).toBeGreaterThan(0);
    expect(report.meanMateSpread).toBeLessThan(44);
    expect(report.meanHuddle).toBeGreaterThanOrEqual(0);
    expect(report.meanHuddle).toBeLessThanOrEqual(6);
  });
});

describe('mateSpread', () => {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed: 5 });
  const opened = openMatch(arena, created).state;

  it('is null while the ball is loose', () => {
    expect(mateSpread({ ...opened, payload: { ...opened.payload, carriedBy: null } })).toBeNull();
  });

  it('is the mean Chebyshev distance to active team-mates, huddle counting those within 2', () => {
    const carrier = opened.units[0]!;
    const mates = opened.units.filter((u) => u.team === carrier.team && u.id !== carrier.id);
    expect(mates.length).toBeGreaterThanOrEqual(3);

    // Carrier on (5, 20); three mates at Chebyshev distance 1, 2 and 5, the rest benched.
    const at: Point[] = [
      { x: 6, y: 21 },
      { x: 5, y: 22 },
      { x: 10, y: 18 },
    ];
    let state: MatchState = put(opened, carrier.id, { x: 5, y: 20 }, { holdingPayload: true });
    state = { ...state, payload: { ...state.payload, carriedBy: carrier.id, x: 5, y: 20 } };
    mates.forEach((m, i) => {
      state =
        i < at.length
          ? put(state, m.id, at[i]!)
          : put(state, m.id, { x: 0, y: 44 }, { status: 'evacuated' });
    });

    expect(activeUnits(state).filter((u) => u.team === carrier.team)).toHaveLength(at.length + 1);

    const result = mateSpread(state)!;
    expect(result.spread).toBeCloseTo((1 + 2 + 5) / 3, 10);
    expect(result.huddle).toBe(2);
  });
});
