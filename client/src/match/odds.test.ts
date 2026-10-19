/**
 * The odds shown on the match screen (2H.38). Exact enumeration, cross-checked
 * against the engine's own dice drawn from its seeded Rng.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from '../../../engine/arena.js';
import { KILL_SILO } from '../../../engine/arenas/kill-silo.js';
import { BRACE_SHOVE_PENALTY, CRACKER_AC, SPARK_POINTS } from '../../../engine/constants.js';
import { Rng } from '../../../engine/rng.js';
import { openMatch } from '../../../engine/reduce.js';
import { opposedRoll, rollAgainst } from '../../../engine/rules/combat.js';
import { createMatch } from '../../../engine/setup.js';
import { statsFor, type Role, type Tier } from '../../../engine/stats.js';
import type { Unit } from '../../../engine/types.js';
import {
  actionLine,
  batChance,
  catchChance,
  chanceToBeat,
  chanceToWinContest,
  oddsBand,
  passChance,
  percent,
  shotChance,
  shoveChance,
  swingChance,
} from './odds.js';

const arena = new Arena(KILL_SILO);
const roster = openMatch(arena, createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed: 5 })).state.units;

/** A real engine unit of the given role and tier, with overrides. */
function unit(role: Role, tier: Tier, over: Partial<Unit> = {}): Unit {
  return { ...roster.find((u) => u.role === role)!, role, tier, braced: false, dodging: false, ...over };
}

describe('chanceToBeat', () => {
  it('is exact on a plain d20', () => {
    expect(chanceToBeat(4, 15)).toBe(0.5);
  });

  it('squares the miss with disadvantage and advantage', () => {
    expect(chanceToBeat(4, 15, 'disadvantage')).toBeCloseTo(0.25, 12);
    expect(chanceToBeat(4, 15, 'advantage')).toBeCloseTo(0.75, 12);
  });

  it('reaches 0 and 1 with no natural 1 or 20 rule', () => {
    expect(chanceToBeat(0, 21)).toBe(0);
    expect(chanceToBeat(0, 1)).toBe(1);
    expect(chanceToBeat(5, 6, 'disadvantage')).toBeCloseTo(1, 12);
    expect(chanceToBeat(0, 25, 'advantage')).toBe(0);
  });
});

describe('chanceToWinContest', () => {
  it('gives ties to the defender', () => {
    expect(chanceToWinContest(0, 0)).toBeCloseTo(190 / 400, 12);
  });

  it('moves with bonuses and mode', () => {
    expect(chanceToWinContest(3, 0)).toBeGreaterThan(chanceToWinContest(0, 0));
    expect(chanceToWinContest(0, 0, 'disadvantage')).toBeLessThan(chanceToWinContest(0, 0));
    expect(chanceToWinContest(0, 0, 'advantage')).toBeGreaterThan(chanceToWinContest(0, 0));
  });
});

describe('the engine actions', () => {
  it('shoves a braced Bulwark at the penalty and at disadvantage', () => {
    const shover = unit('breaker', 'star');
    const plain = unit('bulwark', 'star');
    const braced = unit('bulwark', 'star', { braced: true });
    const t = statsFor('bulwark', 'star');
    const might = statsFor('breaker', 'star').might;
    const defence = Math.max(t.might, t.agility);

    expect(shoveChance(shover, plain)).toBeCloseTo(chanceToWinContest(might, defence), 12);
    expect(shoveChance(shover, braced)).toBeCloseTo(
      chanceToWinContest(might - BRACE_SHOVE_PENALTY, defence, 'disadvantage'),
      12,
    );
    expect(shoveChance(shover, braced)).toBeLessThan(shoveChance(shover, plain));
  });

  it('swings at disadvantage on a dodging target', () => {
    const attacker = unit('striker', 'star');
    const plain = chanceToBeat(4, 14);
    const option = { unitId: 'x', name: 'x', against: 14, mode: 'disadvantage' as const };
    expect(swingChance(attacker, option)).toBeCloseTo(plain * plain, 12);
  });

  it('reads each column of the stats table', () => {
    const star = unit('striker', 'star');
    const s = statsFor('striker', 'star');
    const opt = { unitId: 'x', name: 'x', against: 12, mode: 'normal' as const };
    expect(batChance(star)).toBe(chanceToBeat(s.might, CRACKER_AC));
    expect(passChance(star, opt)).toBe(chanceToBeat(s.aim, 12));
    expect(shotChance(star, { against: 15, mode: 'advantage', blockedBy: null })).toBe(
      chanceToBeat(s.aim, 15, 'advantage'),
    );
    expect(catchChance(star, { against: 20, mode: 'normal' })).toBe(chanceToBeat(s.agility, 20));
  });
});

describe('oddsBand and percent', () => {
  it('cuts at 0.60 and 0.35', () => {
    expect(oddsBand(0.6)).toBe('good');
    expect(oddsBand(0.35)).toBe('fair');
    expect(oddsBand(0.3499)).toBe('poor');
    expect(oddsBand(0.5999)).toBe('fair');
    expect(oddsBand(0)).toBe('poor');
  });

  it('rounds to a whole percent', () => {
    expect(percent(0.5)).toBe(50);
    expect(percent(190 / 400)).toBe(48);
  });
});

describe('actionLine', () => {
  it('builds Star Striker text from the engine numbers', () => {
    const star = unit('striker', 'star');
    expect(actionLine('swing', star)).toBe('Blast-bat, 1d8+4 damage. You recoil 2 squares.');
    expect(actionLine('shove', star)).toBe('Push them 1 square away. No damage.');
    expect(actionLine('catch', star)).toContain(String(SPARK_POINTS));
    for (const kind of ['swing', 'shove', 'disarm', 'bat', 'pass', 'shoot', 'catch'] as const) {
      expect(actionLine(kind, star).length).toBeLessThan(90);
    }
  });
});

describe('Monte Carlo against the engine dice', () => {
  const N = 20000;
  const tol = 0.015;
  type M = 'normal' | 'advantage' | 'disadvantage';

  const hitRate = (seed: number, bonus: number, against: number, mode: M): number => {
    const rng = new Rng(seed);
    let hits = 0;
    for (let i = 0; i < N; i++) if (rollAgainst(rng, bonus, against, mode).hit) hits++;
    return hits / N;
  };

  const winRate = (seed: number, cb: number, db: number, mode: M): number => {
    const rng = new Rng(seed);
    let wins = 0;
    for (let i = 0; i < N; i++) if (opposedRoll(rng, cb, db, mode).success) wins++;
    return wins / N;
  };

  it.each([
    ['normal', 4, 15],
    ['advantage', 4, 15],
    ['disadvantage', 4, 15],
    ['advantage', 2, 20],
    ['disadvantage', 8, 18],
  ] as const)('rollAgainst, %s, +%i vs %i', (mode, bonus, against) => {
    expect(Math.abs(hitRate(11, bonus, against, mode) - chanceToBeat(bonus, against, mode))).toBeLessThan(tol);
  });

  it.each([
    ['normal', 0, 0],
    ['advantage', 3, 5],
    ['disadvantage', 4, 6],
  ] as const)('opposedRoll, %s, +%i vs +%i', (mode, cb, db) => {
    expect(Math.abs(winRate(23, cb, db, mode) - chanceToWinContest(cb, db, mode))).toBeLessThan(tol);
  });
});
