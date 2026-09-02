import { describe, expect, it } from 'vitest';

import { Arena } from '../arena.js';
import { KILL_SILO } from '../arenas/kill-silo.js';
import {
  CELL_FEET,
  FLY_SPEED_FEET,
  GRAPPLE_CATCH_CELLS,
  SHOVE_FALL_CELLS,
  ZONE_CROSSING_FEET,
} from '../constants.js';
import { createMatch } from '../setup.js';
import type { MatchState, Unit } from '../types.js';
import { resolveFall } from './falling.js';
import { key, pathCostFeet, reachableCells, validatePath } from './movement.js';

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

  it('adds the grating toll on the step that changes zone', () => {
    // y = 14 is the top of The Trench, y = 15 the bottom of The Scramble.
    expect(pathCostFeet({ x: 3, y: 14 }, [{ x: 3, y: 15 }])).toBe(CELL_FEET + ZONE_CROSSING_FEET);
    expect(pathCostFeet({ x: 3, y: 12 }, [{ x: 3, y: 13 }])).toBe(CELL_FEET);
  });

  it('makes a zone crossing cost three ordinary steps, so The Summit is still far', () => {
    const crossing = pathCostFeet({ x: 3, y: 14 }, [{ x: 3, y: 15 }]);
    expect(crossing / CELL_FEET).toBe(3);
  });
});

describe('path validation', () => {
  const unit = unitAt(7, 20);
  const field = emptyFieldWith(unit);

  it('accepts a legal walk and reports what it cost', () => {
    const verdict = validatePath(arena, field, unit, [
      { x: 7, y: 21 },
      { x: 7, y: 22 },
    ], FLY_SPEED_FEET);
    expect(verdict).toEqual({ ok: true, costFeet: 10 });
  });

  it('refuses a jump between cells that do not touch', () => {
    const verdict = validatePath(arena, field, unit, [{ x: 7, y: 24 }], FLY_SPEED_FEET);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/not adjacent/);
  });

  it('refuses to walk into a girder', () => {
    // Row 18 carries the catwalk that runs x = 0..4, on team A's side of the
    // halfway line.
    const onTheEdge = unitAt(5, 18);
    const verdict = validatePath(
      arena,
      emptyFieldWith(onTheEdge),
      onTheEdge,
      [{ x: 4, y: 18 }],
      FLY_SPEED_FEET,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/solid/);
  });

  it('refuses to walk onto another player', () => {
    const mover = unitAt(7, 20);
    const blocker = { ...state.units[1]!, id: 'blocker', x: 7, y: 21 };
    const verdict = validatePath(
      arena,
      { ...state, units: [mover, blocker] },
      mover,
      [{ x: 7, y: 21 }],
      FLY_SPEED_FEET,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/occupied/);
  });

  it('refuses a path that outruns the budget', () => {
    const path = Array.from({ length: 9 }, (_, i) => ({ x: 7 + 0, y: 20 + i + 1 }));
    const verdict = validatePath(arena, field, unit, path, FLY_SPEED_FEET);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/feet/);
  });

  it('lets a player route the long way round rather than picking for them', () => {
    // Both paths reach (8, 22). The engine accepts either, because dodging an
    // enemy's reach is the player's call and not the engine's.
    const direct = validatePath(arena, field, unit, [
      { x: 8, y: 21 },
      { x: 8, y: 22 },
    ], FLY_SPEED_FEET);
    const around = validatePath(arena, field, unit, [
      { x: 6, y: 21 },
      { x: 7, y: 22 },
      { x: 8, y: 22 },
    ], FLY_SPEED_FEET);
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
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, FLY_SPEED_FEET);
    expect(cells.has(key(unit))).toBe(false);
    for (const { cell } of cells.values()) {
      expect(arena.isSolid(cell)).toBe(false);
    }
  });

  it('prices a cell by the cheapest route to it, not the first one found', () => {
    const unit = unitAt(7, 21);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, FLY_SPEED_FEET);
    // Two cells away on the diagonal is two steps, never three.
    expect(cells.get('9,23')?.costFeet).toBe(CELL_FEET * 2);
  });

  it('lets a turn cross into the next zone, but not get far into it', () => {
    // Standing three cells below the grating: ten feet to reach it, fifteen to
    // cross, and fifteen left over. The Summit costs a turn to enter, which is
    // the point of the grating, but entering it is no longer a turn on its own.
    const unit = unitAt(7, 12);
    const cells = reachableCells(arena, emptyFieldWith(unit), unit, FLY_SPEED_FEET);
    const inNextZone = [...cells.values()].filter((c) => c.cell.y >= 15);

    expect(inNextZone.length).toBeGreaterThan(0);
    for (const c of inNextZone) expect(c.cell.y).toBeLessThanOrEqual(18);
  });

  it('is blocked by another player standing in the way', () => {
    const unit = unitAt(7, 21);
    const open = reachableCells(arena, emptyFieldWith(unit), unit, FLY_SPEED_FEET);
    const blocker = { ...state.units[1]!, id: 'blocker', x: 7, y: 22 };
    const crowded = reachableCells(
      arena,
      { ...state, units: [unit, blocker] },
      unit,
      FLY_SPEED_FEET,
    );
    expect(open.has('7,22')).toBe(true);
    expect(crowded.has('7,22')).toBe(false);
  });
});

describe('falling', () => {
  it('catches a free fall in the rig after fifty feet, unhurt', () => {
    // The open shaft at x = 6 in The Scramble has nothing to hit.
    const outcome = resolveFall(arena, { x: 6, y: 29 });
    expect(outcome.cellsFallen).toBe(GRAPPLE_CATCH_CELLS);
    expect(outcome.impact).toBe(false);
    expect(outcome.damageDice).toBe(0);
    expect(outcome.anchored).toBe(true);
  });

  it('stops a free fall on the first girder it meets, and that hurts', () => {
    // Row 26 is a catwalk at x = 0..4; a fall down x = 2 from row 30 lands on it.
    const outcome = resolveFall(arena, { x: 2, y: 30 });
    expect(outcome.impact).toBe(true);
    expect(outcome.landing).toEqual({ x: 2, y: 27 });
    expect(outcome.cellsFallen).toBe(3);
    expect(outcome.damageDice).toBe(1);
  });

  it('charges a d6 for every ten feet of the drop, not for every cell', () => {
    const outcome = resolveFall(arena, { x: 2, y: 30 });
    expect(outcome.damageDice).toBe(Math.floor(outcome.cellsFallen / 2));
    expect(outcome.damageDie).toBe(6);
  });

  it('stops a free fall on the deck of The Trench', () => {
    // Down x = 5, which is clear of the Furnace mouth: the three centre columns
    // of the deck are the hatch itself and a fall stops one cell short of them.
    const outcome = resolveFall(arena, { x: 5, y: 3 });
    expect(outcome.landing.y).toBe(0);
    expect(outcome.impact).toBe(true);
  });

  it('stops a free fall on the lip of the Furnace rather than inside it', () => {
    // The mouth is solid, so the deck's three centre columns catch a faller a
    // cell higher than the rest of the floor does. Nobody lands in the fire.
    const outcome = resolveFall(arena, { x: 7, y: 3 });
    expect(outcome.impact).toBe(true);
    expect(outcome.landing).toEqual({ x: 7, y: 1 });
  });

  it('drops a shoved player three cells and no further', () => {
    const outcome = resolveFall(arena, { x: 6, y: 29 }, 'shove');
    expect(outcome.cellsFallen).toBe(SHOVE_FALL_CELLS);
    expect(outcome.impact).toBe(false);
    expect(outcome.damageDice).toBe(0);
  });

  it('hurts a shoved player who meets a girder inside those three cells', () => {
    const outcome = resolveFall(arena, { x: 2, y: 20 }, 'shove');
    expect(outcome.impact).toBe(true);
    expect(outcome.landing).toEqual({ x: 2, y: 19 });
    expect(outcome.damageDice).toBe(0);
  });

  it('never leaves a player still falling between two turns', () => {
    for (let y = 0; y < 45; y++) {
      expect(resolveFall(arena, { x: 6, y }).anchored).toBe(true);
      expect(resolveFall(arena, { x: 6, y }, 'shove').anchored).toBe(true);
    }
  });
});
