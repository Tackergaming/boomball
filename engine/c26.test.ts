/**
 * `00` C26 (2H.25, 2026-10-16): écart 64, a missed shot rebounds off the hatch.
 *
 * Jérôme: "après un tir au but, la balle ne devrait jamais revenir directement
 * dans les mains de celui qui a tiré." Until engine 9 the scatter started from
 * the shooter's own cell and could stay under its feet. Now it starts from the
 * hatch cell the shot was aimed at, and never lands on a player.
 */
import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { ENGINE_VERSION, SCATTER_DIE } from './constants.js';
import { distance, type Point } from './geometry.js';
import { openMatch, reduce } from './reduce.js';
import { nearestHatch, reboundLanding } from './rules/payload.js';
import { createMatch } from './setup.js';
import type { MatchState } from './types.js';

const arena = new Arena(KILL_SILO);

function base(seed: number): MatchState {
  return openMatch(arena, createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed })).state;
}

/** The acting unit made an A shooter with the ball at `at`, in range of Furnace 2, which B defends. */
function shootingState(seed: number, at: Point): MatchState {
  const start = base(seed);
  const actor = start.units.find((u) => u.id === start.turn!.unitId)!;
  return {
    ...start,
    units: start.units.map((u) => {
      if (u.id === actor.id) return { ...u, team: 'A' as const, x: at.x, y: at.y, holdingPayload: true };
      // The keeper stands off, so the shot is against the hatch alone and misses often enough.
      if (u.team === 'B' && u.role === 'bulwark') return { ...u, x: 7, y: 30 };
      return u;
    }),
    payload: { carriedBy: actor.id, x: at.x, y: at.y },
  };
}

describe('écart 64: the rebound comes off the hatch (engine 10)', () => {
  it('bumps the engine version, because the stored matches of engine 9 roll a different ball', () => {
    expect(ENGINE_VERSION).toBe(10);
  });

  it('rolls d4 cells from the hatch in the d8 direction when the way is free', () => {
    const everywhere = () => true;
    // Face 1 is north (y + 1): three cells north of the hatch.
    expect(reboundLanding(everywhere, { x: 7, y: 43 }, 1, 3)).toEqual({ landing: { x: 7, y: 46 }, direction: 1 });
    // Face 5 is south (y - 1): one cell.
    expect(reboundLanding(everywhere, { x: 7, y: 43 }, 5, 1)).toEqual({ landing: { x: 7, y: 42 }, direction: 5 });
  });

  it('stops at the last free cell, short of a crate, the edge or a player', () => {
    const hatch = { x: 7, y: 43 };
    const free = (p: Point) => !(p.x === 7 && p.y === 41);
    // Two cells south: the second is taken, the ball lies on the first.
    expect(reboundLanding(free, hatch, 5, 4)).toEqual({ landing: { x: 7, y: 42 }, direction: 5 });
  });

  it('turns clockwise to the first free face when the rolled way is blocked at once', () => {
    const hatch = { x: 7, y: 43 };
    // South (5) and south-west (6) taken: west (7) takes it, one cell.
    const free = (p: Point) => !((p.x === 7 && p.y === 42) || (p.x === 6 && p.y === 42));
    expect(reboundLanding(free, hatch, 5, 3)).toEqual({ landing: { x: 6, y: 43 }, direction: 5 });
  });

  it('gives up only when nothing around the hatch is free', () => {
    expect(reboundLanding(() => false, { x: 7, y: 43 }, 3, 2)).toBeNull();
  });

  it('never lands under the shooter nor under anybody, over many seeds, and starts from the hatch', () => {
    const at = { x: 7, y: 40 };
    const furnace = arena.targetFurnaceOf('A');
    const hatch = nearestHatch(furnace, at);
    let misses = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const state = shootingState(seed, at);
      const result = reduce(arena, state, { unitId: state.turn!.unitId, action: { kind: 'shoot' } });
      if (!result.ok) throw new Error(`refused: ${result.reason}`);
      const shot = result.events.find((e) => e.kind === 'shotAtFurnace');
      if (!shot || shot.kind !== 'shotAtFurnace' || shot.scored) continue;
      misses++;
      const landed = result.events.find((e) => e.kind === 'payloadScattered');
      expect(landed, `seed ${seed}: a miss scatters`).toBeDefined();
      if (!landed || landed.kind !== 'payloadScattered') continue;
      const ball = result.state.payload;
      expect(ball.carriedBy).toBeNull();
      expect({ x: ball.x, y: ball.y }).toEqual(landed.to);
      // Not on the shooter, not on anyone, on open floor.
      expect(landed.to).not.toEqual(at);
      expect(result.state.units.some((u) => u.status === 'active' && u.x === landed.to.x && u.y === landed.to.y)).toBe(false);
      expect(arena.isOccupiable(landed.to)).toBe(true);
      // Within the d4 of the hatch it was aimed at, never further.
      expect(distance(hatch, landed.to)).toBeLessThanOrEqual(SCATTER_DIE);
      expect(landed.cells).toBeGreaterThanOrEqual(1);
      expect(landed.cells).toBeLessThanOrEqual(SCATTER_DIE);
    }
    expect(misses).toBeGreaterThan(10);
  });
});
