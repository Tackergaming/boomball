import { describe, expect, it } from 'vitest';

import { Arena } from '../arena.js';
import { KILL_SILO } from '../arenas/kill-silo.js';
import { CELL_FEET, MOVE_SPEED_FEET } from '../constants.js';
import { distance, neighbours, type Point } from '../geometry.js';
import { createMatch } from '../setup.js';
import type { MatchState, Unit } from '../types.js';
import { key, pathCostFeet, pathTo, reachableCells, validatePath } from './movement.js';

const arena = new Arena(KILL_SILO);
const state = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed: 7 });

/** A unit parked wherever a test needs it, away from the starting clusters. */
function unitAt(x: number, y: number): Unit {
  return { ...state.units[0]!, id: 'test-unit', x, y };
}

/** A state with only the test unit on the field, so nothing blocks by accident. */
function emptyFieldWith(unit: Unit): MatchState {
  return { ...state, units: [unit] };
}

describe('movement cost', () => {
  it('charges five feet a cell, diagonals included', () => {
    const from = { x: 7, y: 20 };
    expect(pathCostFeet(from, [{ x: 8, y: 20 }])).toBe(CELL_FEET);
    expect(pathCostFeet(from, [{ x: 8, y: 21 }])).toBe(CELL_FEET);
    expect(
      pathCostFeet(from, [
        { x: 8, y: 21 },
        { x: 9, y: 22 },
      ]),
    ).toBe(CELL_FEET * 2);
  });

  it('charges the same across a third boundary, because nothing tolls a crossing', () => {
    // y = 14 is the last row of A's end, y = 15 the first of the middle.
    expect(pathCostFeet({ x: 3, y: 14 }, [{ x: 3, y: 15 }])).toBe(CELL_FEET);
    expect(pathCostFeet({ x: 3, y: 12 }, [{ x: 3, y: 13 }])).toBe(CELL_FEET);
  });
});

describe('path validation', () => {
  const unit = unitAt(7, 20);
  const field = emptyFieldWith(unit);

  it('accepts a legal walk and reports what it cost', () => {
    const verdict = validatePath(arena, field, unit, [
      { x: 7, y: 21 },
      { x: 7, y: 22 },
    ], MOVE_SPEED_FEET);
    expect(verdict).toEqual({ ok: true, costFeet: 10 });
  });

  it('refuses a jump between cells that do not touch', () => {
    const verdict = validatePath(arena, field, unit, [{ x: 7, y: 24 }], MOVE_SPEED_FEET);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/not adjacent/);
  });

  it('refuses to walk into an obstacle, and says so', () => {
    // (7, 16) is the central pillar on A's half.
    const beside = unitAt(7, 17);
    const verdict = validatePath(
      arena,
      emptyFieldWith(beside),
      beside,
      [{ x: 7, y: 16 }],
      MOVE_SPEED_FEET,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/obstacle/);
  });

  it('refuses a path that cuts through an obstacle on its way somewhere else', () => {
    const beside = unitAt(6, 15);
    const verdict = validatePath(
      arena,
      emptyFieldWith(beside),
      beside,
      [{ x: 7, y: 16 }, { x: 8, y: 17 }],
      MOVE_SPEED_FEET,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/obstacle/);
  });

  it('refuses to walk onto another player', () => {
    const mover = unitAt(7, 20);
    const blocker = { ...state.units[1]!, id: 'blocker', x: 7, y: 21 };
    const verdict = validatePath(
      arena,
      { ...state, units: [mover, blocker] },
      mover,
      [{ x: 7, y: 21 }],
      MOVE_SPEED_FEET,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/occupied/);
  });

  it('refuses a path that outruns the budget', () => {
    // Column 6 is clear of every obstacle from y = 21 to y = 29, so the only
    // thing that can refuse nine steps is the budget.
    const runner = unitAt(6, 20);
    const path = Array.from({ length: 9 }, (_, i) => ({ x: 6, y: 20 + i + 1 }));
    const verdict = validatePath(arena, emptyFieldWith(runner), runner, path, MOVE_SPEED_FEET);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/feet/);
  });

  it('lets a player route the long way round rather than picking for them', () => {
    // Both paths reach (8, 22). The engine accepts either, because dodging an
    // enemy's reach is the player's call and not the engine's.
    const direct = validatePath(arena, field, unit, [
      { x: 8, y: 21 },
      { x: 8, y: 22 },
    ], MOVE_SPEED_FEET);
    const around = validatePath(arena, field, unit, [
      { x: 6, y: 21 },
      { x: 7, y: 22 },
      { x: 8, y: 22 },
    ], MOVE_SPEED_FEET);
    expect(direct.ok).toBe(true);
    expect(around.ok).toBe(true);
    expect(around.ok === true && around.costFeet).toBeGreaterThan(
      direct.ok === true ? direct.costFeet : 0,
    );
  });
});

describe('reachable cells', () => {
  it('never includes solid terrain or the cell a player already holds', () => {
    const unit = unitAt(7, 21);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, MOVE_SPEED_FEET);
    expect(cells.has(key(unit))).toBe(false);
    for (const { cell } of cells.values()) {
      expect(arena.isSolid(cell)).toBe(false);
    }
  });

  it('prices a cell by the cheapest route to it, not the first one found', () => {
    const unit = unitAt(7, 21);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, MOVE_SPEED_FEET);
    // Two cells away on the diagonal is two steps, never three.
    expect(cells.get('9,23')?.costFeet).toBe(CELL_FEET * 2);
  });

  it('lets a turn run across a third boundary at full speed', () => {
    // Eight cells straight on, from the middle of A's end into the middle third,
    // costs forty feet and not a foot more: the old grating toll is gone.
    const unit = unitAt(6, 12);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, MOVE_SPEED_FEET);
    expect(cells.get('6,20')?.costFeet).toBe(MOVE_SPEED_FEET);
    expect(cells.get('6,15')?.costFeet).toBe(CELL_FEET * 3);
  });

  it('goes round the pillar at (7, 16) and never onto it', () => {
    const unit = unitAt(6, 16);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, MOVE_SPEED_FEET);
    expect(cells.has('7,16')).toBe(false);
    // The far side of the pillar is reached by a diagonal round it, two steps.
    expect(cells.has('8,16')).toBe(true);
    expect(cells.get('8,16')?.costFeet).toBe(CELL_FEET * 2);
    expect(cells.has('8,17')).toBe(true);
  });

  it('routes to a cell behind the crate without crossing an obstacle', () => {
    // The crate fills (6..8, 9). (7, 10) is on its far side from (7, 8).
    const unit = unitAt(7, 8);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, MOVE_SPEED_FEET);
    const route = pathTo(cells, { x: 7, y: 10 });

    expect(route).not.toBeNull();
    expect(route![route!.length - 1]).toEqual({ x: 7, y: 10 });
    for (const step of route!) expect(arena.isSolid(step), `(${step.x}, ${step.y})`).toBe(false);
    // Round the crate, not through it: more than the two straight steps.
    expect(route!.length).toBeGreaterThan(2);
    expect(validatePath(arena, emptyFieldWith(unit), unit, route!, MOVE_SPEED_FEET).ok).toBe(true);
  });

  it('reaches exactly the open cells within eight steps that are not cut off', () => {
    // Forty feet is eight cells. Count them by an independent flood fill
    // limited to eight king-moves, then compare with the engine's answer.
    const origin = { x: 7, y: 12 };
    const unit = unitAt(origin.x, origin.y);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, MOVE_SPEED_FEET);

    const seen = new Map<string, number>([[key(origin), 0]]);
    let ring: Point[] = [origin];
    for (let step = 1; step <= 8; step++) {
      const next: Point[] = [];
      for (const p of ring) {
        for (const n of neighbours(p)) {
          if (arena.isSolid(n) || seen.has(key(n))) continue;
          seen.set(key(n), step);
          next.push(n);
        }
      }
      ring = next;
    }
    seen.delete(key(origin));

    expect(cells.size).toBe(seen.size);
    for (const [k, steps] of seen) expect(cells.get(k)?.costFeet).toBe(steps * CELL_FEET);

    // The crates and covers really do cut the disc: fewer cells than the
    // unobstructed square of the same reach.
    const everything = [...Array(45).keys()].flatMap((y) =>
      [...Array(15).keys()].map((x) => ({ x, y })),
    );
    const naive = everything.filter((p) => distance(origin, p) <= 8 && key(p) !== key(origin));
    expect(cells.size).toBeLessThan(naive.length);
  });

  it('is blocked by another player standing in the way', () => {
    const unit = unitAt(7, 21);
    const open = reachableCells(arena, emptyFieldWith(unit), unit, MOVE_SPEED_FEET);
    const blocker = { ...state.units[1]!, id: 'blocker', x: 7, y: 22 };
    const crowded = reachableCells(
      arena,
      { ...state, units: [unit, blocker] },
      unit,
      MOVE_SPEED_FEET,
    );
    expect(open.has('7,22')).toBe(true);
    expect(crowded.has('7,22')).toBe(false);
  });
});
