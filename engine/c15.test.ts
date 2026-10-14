/**
 * The four écarts of 2H.13 (`docs/00-reglement-v2.md` C15, Jérôme on 2026-10-14,
 * engine version 8), and the two small changes of shape that came with them:
 * 59 (the Spark's drift avoids the Trajectors), 60 (it comes back nine cells
 * from each), 61 (a Shove on a carrier puts the ball in the shover's hands),
 * 62 (the conceding side relaunches Trajector, Strikers, Bulwark, Breakers),
 * `recoilBlocked`, `passIntercepted.toId` and `turn.shot`.
 *
 * The neighbouring files each carry the old rule's tests, rewritten for the
 * new one. This file is the focused set: it states each rule once, from the
 * position that shows it.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import {
  MOVE_SPEED_FEET,
  SPARK_MOVE_CELLS,
  SPARK_RETURN_DISTANCE,
  SPARK_SPAWN_MIN_DISTANCE,
  SPARK_SPAWN_THIRD,
} from './constants.js';
import type { MatchEvent } from './events.js';
import { distance, thirdOf, type Point } from './geometry.js';
import { promoteBulwark, RELAUNCH_ORDER } from './initiative.js';
import { openMatch, reduce, type ReduceResult } from './reduce.js';
import { Rng } from './rng.js';
import { sparkDriftFace, sparkReturnCell, sparkRun } from './rules/ordnance.js';
import { createMatch } from './setup.js';
import type { Action } from './actions.js';
import type { MatchState, TeamId, Unit, UnitId } from './types.js';

const arena = new Arena(KILL_SILO);
const CORNER: Point = { x: 0, y: 44 };
const FACES = [1, 2, 3, 4, 5, 6, 7, 8];
const A_TRAJECTOR = 'A-trajector-7';
const B_TRAJECTOR = 'B-trajector-7';

// -- Fixtures ---------------------------------------------------------------

/** Every unit parked in one corner, Crackers out of the way, the match open on round 1. */
function parked(seed = 7): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  return openMatch(arena, {
    ...created,
    units: created.units.map((u) => ({ ...u, ...CORNER })),
    crackers: created.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 99 })),
  }).state;
}

function put(state: MatchState, id: UnitId, at: Point, extra: Partial<Unit> = {}): MatchState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

function unit(state: MatchState, id: UnitId): Unit {
  return state.units.find((u) => u.id === id)!;
}

function cellOf(u: Point): Point {
  return { x: u.x, y: u.y };
}

/** Hands the clock to a unit, cursor and all, so the ladder reads as a real round would. */
function clockOn(state: MatchState, id: UnitId): MatchState {
  const at = state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === id);
  if (at < 0) throw new Error(`${id} has no slot`);
  const holder = unit(state, id);
  return {
    ...state,
    turnIndex: at,
    turn: {
      unitId: id,
      startedAt: cellOf(holder),
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      disengaged: false,
      placing: null,
      shot: false,
    },
  };
}

function carrying(state: MatchState, id: UnitId): MatchState {
  const holder = unit(state, id);
  return {
    ...put(state, id, holder, { holdingPayload: true }),
    payload: { carriedBy: id, x: holder.x, y: holder.y },
    lastCarrierTeam: holder.team,
  };
}

function act(state: MatchState, action: Action, unitId?: UnitId): ReduceResult {
  return reduce(arena, state, { unitId: unitId ?? state.turn!.unitId, action });
}

function must(state: MatchState, action: Action, unitId?: UnitId) {
  const result = act(state, action, unitId);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result;
}

/** The Trajectors where the test says, a side with no cell given taken off the field. */
function trajectors(state: MatchState, cells: { A?: Point; B?: Point }): MatchState {
  let next = state;
  for (const [team, id] of [
    ['A', A_TRAJECTOR],
    ['B', B_TRAJECTOR],
  ] as const) {
    const at = cells[team];
    next = at ? put(next, id, at) : put(next, id, CORNER, { status: 'evacuated' });
  }
  return next;
}

function sparkAt(state: MatchState, at: Point): MatchState {
  return { ...state, spark: { state: 'live', x: at.x, y: at.y, heading: null } };
}

function activeTrajectors(state: MatchState): Unit[] {
  return state.units.filter((u) => u.status === 'active' && u.role === 'trajector');
}

function nearestTrajector(state: MatchState, p: Point): number {
  return Math.min(...activeTrajectors(state).map((t) => distance(p, t)));
}

// -- Écart 59 ---------------------------------------------------------------

describe('the Spark drifts away from the Trajectors (écart 59)', () => {
  /** The faces whose first cell, bounce included, is nearer to some Trajector than the Spark's own cell. */
  function barredFaces(state: MatchState): number[] {
    const from = cellOf(state.spark);
    return FACES.filter((face) => {
      const first = sparkRun(arena, from, face).path[0]!;
      return activeTrajectors(state).some((t) => distance(first, t) < distance(from, t));
    });
  }

  it('never takes a face whose first cell is nearer to a Trajector, whatever the dice say', () => {
    // Open floor, a Trajector due east: the east face and its two diagonals close in on it.
    const state = sparkAt(trajectors(parked(), { A: { x: 12, y: 22 } }), { x: 3, y: 22 });
    const barred = barredFaces(state);
    expect(barred.length).toBeGreaterThan(0);
    expect(barred.length).toBeLessThan(FACES.length);

    const seen = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const face = sparkDriftFace(arena, state, new Rng(seed));
      const first = sparkRun(arena, cellOf(state.spark), face).path[0]!;
      expect(distance(first, state.units.find((u) => u.id === A_TRAJECTOR)!), `seed ${seed}`).toBeGreaterThanOrEqual(
        distance(state.spark, state.units.find((u) => u.id === A_TRAJECTOR)!),
      );
      expect(barred, `seed ${seed}, face ${face}`).not.toContain(face);
      seen.add(face);
    }
    // And it is a d8 among the rest, not one fixed escape route.
    expect([...seen].sort()).toEqual(FACES.filter((f) => !barred.includes(f)));
  });

  it('weighs every Trajector, not just the nearest one', () => {
    const state = sparkAt(trajectors(parked(), { A: { x: 12, y: 22 }, B: { x: 3, y: 30 } }), { x: 3, y: 22 });
    const barred = barredFaces(state);
    const eastOnly = barredFaces(trajectors(state, { A: { x: 12, y: 22 } }));
    // The second Trajector bars faces the first one left open.
    expect(barred.length).toBeGreaterThan(eastOnly.length);
    for (let seed = 1; seed <= 100; seed++) {
      expect(barred).not.toContain(sparkDriftFace(arena, state, new Rng(seed)));
    }
  });

  describe('with every face closing in on one Trajector or the other', () => {
    // Against the end wall, a Trajector on each side and one ahead: every first
    // cell, wall bounce included, is nearer to one of them than the Spark is.
    const state = sparkAt(trajectors(parked(), { A: { x: 1, y: 3 }, B: { x: 5, y: 8 } }), { x: 5, y: 0 });

    it('is a position where all eight faces are barred', () => {
      expect(barredFaces(state)).toEqual(FACES);
    });

    it('takes the face whose run ends farthest from the nearest Trajector', () => {
      const ends = FACES.map((face) => nearestTrajector(state, sparkRun(arena, cellOf(state.spark), face).landing));
      const best = Math.max(...ends);
      const face = sparkDriftFace(arena, state, new Rng(1));
      expect(nearestTrajector(state, sparkRun(arena, cellOf(state.spark), face).landing)).toBe(best);
      // The lowest face among equals, so that the choice needs no dice.
      expect(face).toBe(FACES[ends.indexOf(best)]);
    });

    it('rolls nothing: every seed gives the same face', () => {
      const faces = new Set<number>();
      for (let seed = 1; seed <= 100; seed++) faces.add(sparkDriftFace(arena, state, new Rng(seed)));
      expect(faces.size).toBe(1);
    });

    it('leaves the dice untouched', () => {
      const rng = new Rng(9);
      const before = rng.seed;
      sparkDriftFace(arena, state, rng);
      expect(rng.seed).toBe(before);
    });
  });

  it('lets every face come up when there is no Trajector on the field', () => {
    const state = sparkAt(trajectors(parked(), {}), { x: 3, y: 22 });
    expect(activeTrajectors(state)).toHaveLength(0);

    const seen = new Set<number>();
    for (let seed = 1; seed <= 400; seed++) seen.add(sparkDriftFace(arena, state, new Rng(seed)));
    expect([...seen].sort()).toEqual(FACES);
  });

  describe('through the engine', () => {
    const EAST_PAIR = { A: { x: 12, y: 22 }, B: { x: 12, y: 23 } };

    /** A round-1 match with the Spark live, walked with empty turns until it darts. */
    function firstDrift(seed: number, trajectorCells: { A: Point; B: Point }, from: Point) {
      // Both Trajectors stay on the field: the ladder still has their turns to walk through.
      let state: MatchState = { ...sparkAt(trajectors(parked(), trajectorCells), from), rngSeed: seed };
      for (let i = 0; i < 100; i++) {
        const step = must(state, { kind: 'endTurn' });
        state = step.state;
        const moved = step.events.find((e) => e.kind === 'sparkMoved' && e.cause === 'drift');
        if (moved && moved.kind === 'sparkMoved') return { moved, state };
      }
      throw new Error('the Spark never darted');
    }

    it('writes a sparkMoved with cause drift and a face between 1 and 8', () => {
      const from = { x: 3, y: 22 };
      const { moved, state } = firstDrift(11, EAST_PAIR, from);

      expect(moved.cause).toBe('drift');
      expect(moved.direction).toBeGreaterThanOrEqual(1);
      expect(moved.direction).toBeLessThanOrEqual(8);
      expect(moved.from).toEqual(from);
      expect(moved.path).toHaveLength(SPARK_MOVE_CELLS);
      expect(moved.path[moved.path.length - 1]).toEqual(moved.to);
      expect(cellOf(state.spark)).toEqual(moved.to);
      // The face it ended on is kept for show, and nothing plays from it.
      expect(state.spark.heading).toBe(sparkRun(arena, from, moved.direction).heading);
    });

    it('never darts towards a Trajector over many seeds', () => {
      const from = { x: 3, y: 22 };
      const faces = new Set<number>();
      for (let seed = 1; seed <= 40; seed++) {
        const { moved } = firstDrift(seed, EAST_PAIR, from);
        for (const t of Object.values(EAST_PAIR)) {
          expect(distance(moved.path[0]!, t), `seed ${seed}`).toBeGreaterThanOrEqual(distance(from, t));
        }
        faces.add(moved.direction);
      }
      expect(faces.size).toBeGreaterThan(1);
    });

    it('rolls no heading at entry: the Spark enters with none', () => {
      const entered = { ...parked(), round: 5, spark: { state: 'pending' as const, x: 0, y: 0, heading: null } };
      let state: MatchState = entered;
      let at: Point | null = null;
      for (let i = 0; i < 100 && at === null; i++) {
        const step = must(state, { kind: 'endTurn' });
        state = step.state;
        for (const e of step.events) if (e.kind === 'sparkEntered') at = e.at;
      }
      expect(at).not.toBeNull();
      expect(thirdOf(at!)).toBe(SPARK_SPAWN_THIRD);
      expect(state.spark.state).toBe('live');
    });
  });
});

// -- Écart 60 ---------------------------------------------------------------

describe('the Spark comes back nine cells from each Trajector (écart 60)', () => {
  function pending(cells: { A?: Point; B?: Point }, extra: (s: MatchState) => MatchState = (s) => s): MatchState {
    return { ...extra(trajectors(parked(), cells)), spark: { state: 'pending', x: 0, y: 0, heading: null } };
  }

  function clearance(state: MatchState, p: Point): number {
    return Math.min(...state.units.filter((u) => u.status === 'active').map((u) => distance(p, u)));
  }

  function stray(state: MatchState, p: Point): number {
    return Math.max(...activeTrajectors(state).map((t) => Math.abs(distance(p, t) - SPARK_RETURN_DISTANCE)));
  }

  /** The least stray any open, clear cell can achieve, found cell by cell. */
  function bestStray(state: MatchState): number {
    const clear = [...arena.occupiableCells()].filter((c) => clearance(state, c) >= SPARK_SPAWN_MIN_DISTANCE);
    return Math.min(...clear.map((c) => stray(state, c)));
  }

  it('is nine cells from both Trajectors when such a clear cell exists', () => {
    const state = pending({ A: { x: 3, y: 10 }, B: { x: 11, y: 10 } });
    expect(bestStray(state)).toBe(0);

    const cells = new Set<string>();
    for (let seed = 1; seed <= 150; seed++) {
      const cell = sparkReturnCell(arena, state, new Rng(seed));
      expect(distance(cell, state.units.find((u) => u.id === A_TRAJECTOR)!), `seed ${seed}`).toBe(SPARK_RETURN_DISTANCE);
      expect(distance(cell, state.units.find((u) => u.id === B_TRAJECTOR)!), `seed ${seed}`).toBe(SPARK_RETURN_DISTANCE);
      expect(arena.isOccupiable(cell)).toBe(true);
      cells.add(`${cell.x},${cell.y}`);
    }
    // The dice pick among the exact cells; they are not one fixed cell.
    expect(cells.size).toBeGreaterThan(1);
  });

  it('does not need the middle third any more', () => {
    const state = pending({ A: { x: 3, y: 10 }, B: { x: 11, y: 10 } });
    const thirds = new Set<number>();
    for (let seed = 1; seed <= 150; seed++) thirds.add(thirdOf(sparkReturnCell(arena, state, new Rng(seed))));
    // Nine cells from two Trajectors in the south third lands it outside the middle third.
    expect([...thirds].some((t) => t !== SPARK_SPAWN_THIRD)).toBe(true);
  });

  it('minimises the larger stray when no cell is exactly nine from both', () => {
    // Thirty-five rows apart: no cell is nine from both, so the best it can do is a stray.
    const state = pending({ A: { x: 1, y: 5 }, B: { x: 13, y: 40 } });
    const best = bestStray(state);
    expect(best).toBeGreaterThan(0);

    for (let seed = 1; seed <= 60; seed++) {
      const cell = sparkReturnCell(arena, state, new Rng(seed));
      expect(stray(state, cell), `seed ${seed}`).toBe(best);
      expect(arena.isOccupiable(cell)).toBe(true);
    }
  });

  it('is nine cells from the one Trajector when only one is on the field', () => {
    const state = pending({ A: { x: 7, y: 22 } });
    expect(activeTrajectors(state)).toHaveLength(1);
    const cells = new Set<string>();
    for (let seed = 1; seed <= 150; seed++) {
      const cell = sparkReturnCell(arena, state, new Rng(seed));
      expect(distance(cell, state.units.find((u) => u.id === A_TRAJECTOR)!), `seed ${seed}`).toBe(SPARK_RETURN_DISTANCE);
      cells.add(`${cell.x},${cell.y}`);
    }
    expect(cells.size).toBeGreaterThan(1);
  });

  it('uses the entry rule, the middle third, when there is no Trajector at all', () => {
    const state = pending({});
    expect(activeTrajectors(state)).toHaveLength(0);
    for (let seed = 1; seed <= 100; seed++) {
      const cell = sparkReturnCell(arena, state, new Rng(seed));
      expect(thirdOf(cell), `seed ${seed}`).toBe(SPARK_SPAWN_THIRD);
      expect(arena.isOccupiable(cell)).toBe(true);
      expect(clearance(state, cell)).toBeGreaterThanOrEqual(SPARK_SPAWN_MIN_DISTANCE);
    }
  });

  it('stays four cells clear of every unit when a clear cell exists', () => {
    const wall: [UnitId, Point][] = [
      ['A-bulwark-1', { x: 7, y: 31 }],
      ['A-striker-2', { x: 6, y: 31 }],
      ['A-striker-3', { x: 8, y: 31 }],
      ['A-breaker-5', { x: 5, y: 31 }],
      ['A-breaker-6', { x: 9, y: 31 }],
    ];
    const blocked = pending({ A: { x: 7, y: 22 } }, (s) => wall.reduce((acc, [id, at]) => put(acc, id, at), s));
    const open = pending({ A: { x: 7, y: 22 } });

    // Control: without the wall the ring does run through it, so that the
    // clearance below is doing work and not passing for free.
    const near = (state: MatchState, cell: Point): boolean => wall.some(([, at]) => distance(cell, at) < SPARK_SPAWN_MIN_DISTANCE);
    let crowded = 0;
    for (let seed = 1; seed <= 300; seed++) {
      if (near(open, sparkReturnCell(arena, open, new Rng(seed)))) crowded++;
    }
    expect(crowded).toBeGreaterThan(0);

    for (let seed = 1; seed <= 300; seed++) {
      const cell = sparkReturnCell(arena, blocked, new Rng(seed));
      expect(clearance(blocked, cell), `seed ${seed}: ${cell.x},${cell.y}`).toBeGreaterThanOrEqual(SPARK_SPAWN_MIN_DISTANCE);
      expect(distance(cell, blocked.units.find((u) => u.id === A_TRAJECTOR)!)).toBe(SPARK_RETURN_DISTANCE);
    }
  });
});

// -- Écart 61 ---------------------------------------------------------------

describe('a Shove on a carrier puts the ball in the shover’s hands (écart 61)', () => {
  const CARRIER = 'B-striker-3';

  /** The shover and a target beside it, the ball with the target when it is to be a carrier. */
  function staged(shoverId: UnitId, shoverAt: Point, targetAt: Point, carrier: boolean, seed: number): MatchState {
    let state = put(parked(), shoverId, shoverAt);
    state = put(state, CARRIER, targetAt);
    if (carrier) state = carrying(state, CARRIER);
    return { ...clockOn(state, shoverId), rngSeed: seed };
  }

  /** Walks the seeds until the contest goes the wanted way. */
  function shove(
    shoverId: UnitId,
    shoverAt: Point,
    targetAt: Point,
    carrier: boolean,
    success: boolean,
  ): { before: MatchState; after: MatchState; events: readonly MatchEvent[]; shoved: Extract<MatchEvent, { kind: 'shoved' }> } {
    for (let seed = 1; seed < 400; seed++) {
      const before = staged(shoverId, shoverAt, targetAt, carrier, seed);
      const result = must(before, { kind: 'shove', targetId: CARRIER });
      const shoved = result.events.find((e): e is Extract<MatchEvent, { kind: 'shoved' }> => e.kind === 'shoved')!;
      if (shoved.success === success) return { before, after: result.state, events: result.events, shoved };
    }
    throw new Error('no seed in range gave the wanted contest');
  }

  const SHOVERS: [string, UnitId, Point, Point][] = [
    ['a Striker', 'A-striker-2', { x: 7, y: 22 }, { x: 8, y: 22 }],
    ['a Breaker', 'A-breaker-5', { x: 7, y: 22 }, { x: 8, y: 22 }],
    // The keeper's four cells from its mouth at (7, 1): out to bother a carrier on its doorstep.
    ['a Bulwark', 'A-bulwark-1', { x: 7, y: 3 }, { x: 7, y: 4 }],
  ];

  it.each(SHOVERS)('gives the ball to %s, with nobody moving', (_name, shoverId, shoverAt, targetAt) => {
    const { before, after, events, shoved } = shove(shoverId, shoverAt, targetAt, true, true);

    expect(shoved).toMatchObject({ shoverId, targetId: CARRIER, success: true, pushedTo: null, tookPayload: true });
    expect(events.some((e) => e.kind === 'payloadDropped')).toBe(false);
    expect(events.some((e) => e.kind === 'payloadScattered')).toBe(false);

    // The shover holds, the target does not, and the ball is the shover's.
    expect(unit(after, shoverId).holdingPayload).toBe(true);
    expect(unit(after, CARRIER).holdingPayload).toBe(false);
    expect(after.payload).toEqual({ carriedBy: shoverId, x: shoverAt.x, y: shoverAt.y });
    expect(after.units.filter((u) => u.holdingPayload).map((u) => u.id)).toEqual([shoverId]);

    // Nobody moved.
    for (const u of before.units) expect(cellOf(unit(after, u.id)), u.id).toEqual(cellOf(u));

    // The Action is spent; the walk that was left is kept.
    expect(after.turn!.actionUsed).toBe(true);
    expect(after.turn!.movementFeetRemaining).toBe(before.turn!.movementFeetRemaining);
  });

  it('lets the shover walk off with it, but neither pass nor shoot this turn', () => {
    const { after } = shove('A-striker-2', { x: 7, y: 22 }, { x: 8, y: 22 }, true, true);

    const pass = act(after, { kind: 'pass', targetId: 'A-striker-3' });
    expect(pass.ok).toBe(false);
    expect(act(after, { kind: 'shoot' }).ok).toBe(false);

    const walked = must(after, { kind: 'move', path: [{ x: 6, y: 22 }] });
    expect(unit(walked.state, 'A-striker-2').holdingPayload).toBe(true);
    expect(walked.state.payload.carriedBy).toBe('A-striker-2');
    expect(cellOf(unit(walked.state, 'A-striker-2'))).toEqual({ x: 6, y: 22 });
  });

  it('leaves the carrier holding when the Shove fails', () => {
    for (const [, shoverId, shoverAt, targetAt] of SHOVERS) {
      const { before, after, events, shoved } = shove(shoverId, shoverAt, targetAt, true, false);

      expect(shoved).toMatchObject({ success: false, pushedTo: null, tookPayload: false });
      expect(events.some((e) => e.kind === 'payloadDropped')).toBe(false);
      expect(unit(after, CARRIER).holdingPayload).toBe(true);
      expect(unit(after, shoverId).holdingPayload).toBe(false);
      expect(after.payload.carriedBy).toBe(CARRIER);
      for (const u of before.units) expect(cellOf(unit(after, u.id)), u.id).toEqual(cellOf(u));
      expect(after.turn!.actionUsed).toBe(true);
    }
  });

  it('still pushes a target that is not carrying, and says it took nothing', () => {
    const { after, shoved } = shove('A-striker-2', { x: 7, y: 22 }, { x: 8, y: 22 }, false, true);

    expect(shoved).toMatchObject({ success: true, tookPayload: false, pushedTo: { x: 9, y: 22 } });
    expect(cellOf(unit(after, CARRIER))).toEqual({ x: 9, y: 22 });
    expect(unit(after, 'A-striker-2').holdingPayload).toBe(false);
    expect(after.payload.carriedBy).toBeNull();
  });
});

// -- Écart 62 ---------------------------------------------------------------

describe('the conceding side relaunches Trajector, Strikers, Bulwark, Breakers (écart 62)', () => {
  const MOUTH: Record<TeamId, Point> = { A: { x: 7, y: 1 }, B: { x: 7, y: 43 } };
  const SHOOTER_AT: Record<TeamId, Point> = { A: { x: 7, y: 38 }, B: { x: 7, y: 6 } };
  const other = (team: TeamId): TeamId => (team === 'A' ? 'B' : 'A');

  function sideSlots(state: MatchState, team: TeamId): UnitId[] {
    return state.turnOrder
      .filter((s) => s.actor.kind === 'unit' && s.team === team)
      .map((s) => (s.actor as { unitId: UnitId }).unitId);
  }

  function sideRoles(state: MatchState, team: TeamId): string[] {
    return sideSlots(state, team).map((id) => unit(state, id).role);
  }

  function firstIndexOf(state: MatchState, team: TeamId): number {
    return state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.team === team);
  }

  /** What a side's roles read as in `RELAUNCH_ORDER`, for the units it has on the field. */
  function relaunchRoles(state: MatchState, team: TeamId): string[] {
    return RELAUNCH_ORDER.flatMap((role) =>
      state.units.filter((u) => u.team === team && u.status === 'active' && u.role === role).map(() => role),
    );
  }

  /** A goal by `scorer`, staged on the ladder `ladder` hands back, the seed walked until the shot goes in. */
  function goal(scorer: TeamId, seed: number, ladder: (s: MatchState) => MatchState = (s) => s) {
    const defender = other(scorer);
    const shooter = `${scorer}-striker-2`;
    const keeper = `${defender}-bulwark-1`;
    let base = put(parked(seed), keeper, MOUTH[defender]);
    base = carrying(put(base, shooter, SHOOTER_AT[scorer]), shooter);
    base = clockOn(ladder(base), shooter);

    for (let rng = 1; rng < 500; rng++) {
      const before = { ...base, rngSeed: rng };
      const result = must(before, { kind: 'shoot' });
      if (result.events.some((e) => e.kind === 'scored')) return { before, after: result.state };
    }
    throw new Error('no seed scored');
  }

  /** Plays empty turns until the round after `state`'s, handing back the first state of that round. */
  function nextRound(state: MatchState): MatchState {
    let s = state;
    for (let guard = 0; s.round === state.round && guard < 200; guard++) s = must(s, { kind: 'endTurn' }).state;
    return s;
  }

  for (const scorer of ['A', 'B'] as const) {
    const defender = other(scorer);

    it(`reorders ${defender}'s block at once when it is still wholly ahead (${scorer} scores)`, () => {
      for (let seed = 1; seed < 60; seed++) {
        if (firstIndexOf(parked(seed), scorer) > firstIndexOf(parked(seed), defender)) continue;

        const { before, after } = goal(scorer, seed);
        expect(firstIndexOf(before, defender)).toBeGreaterThan(before.turnIndex);
        expect(sideRoles(before, defender)).toEqual(['trajector', 'striker', 'striker', 'striker', 'breaker', 'breaker', 'bulwark']);

        // Trajector, Strikers, Bulwark, Breakers: the keeper right before the first Breaker.
        expect(sideRoles(after, defender)).toEqual(['trajector', 'striker', 'striker', 'striker', 'bulwark', 'breaker', 'breaker']);
        expect(sideSlots(after, defender).slice(0, 4)).toEqual(sideSlots(before, defender).slice(0, 4));
        expect(sideSlots(after, defender)[4]).toBe(`${defender}-bulwark-1`);

        // The scoring side and the cursor are untouched; no flag is left for the next round.
        expect(sideSlots(after, scorer)).toEqual(sideSlots(before, scorer));
        expect(after.turnIndex).toBe(before.turnIndex);
        expect(after.relaunch).toBeNull();
        return;
      }
      throw new Error(`no seed put ${scorer} before ${defender}`);
    });

    it(`leaves the round alone and builds the next one in relaunch order when ${defender} has already played (${scorer} scores)`, () => {
      for (let seed = 1; seed < 60; seed++) {
        if (firstIndexOf(parked(seed), defender) > firstIndexOf(parked(seed), scorer)) continue;

        const { before, after } = goal(scorer, seed);
        expect(firstIndexOf(before, defender)).toBeLessThan(before.turnIndex);

        expect(after.turnOrder).toEqual(before.turnOrder);
        expect(after.relaunch).toBe(defender);

        const next = nextRound(after);
        expect(next.round).toBe(after.round + 1);
        expect(sideRoles(next, defender)).toEqual(relaunchRoles(next, defender));
        expect(sideRoles(next, defender).indexOf('bulwark')).toBe(sideRoles(next, defender).indexOf('breaker') - 1);
        expect(next.relaunch).toBeNull();
        // The scoring side keeps its ordinary ladder.
        expect(sideRoles(next, scorer).at(-1)).toBe('bulwark');
        return;
      }
      throw new Error(`no seed put ${defender} before ${scorer}`);
    });
  }

  it('lets the round finish as it stands when the conceding side has begun its block', () => {
    // A ladder with the shooter's slot moved to just after the first slot of
    // the conceding side: A has begun, B is mid-block when it scores.
    const interleave = (s: MatchState): MatchState => {
      const shooter = 'B-striker-2';
      const slot = s.turnOrder.find((t) => t.actor.kind === 'unit' && t.actor.unitId === shooter)!;
      const rest = s.turnOrder.filter((t) => t !== slot);
      const firstA = rest.findIndex((t) => t.team === 'A');
      const order = [...rest.slice(0, firstA + 1), slot, ...rest.slice(firstA + 1)];
      return { ...s, turnOrder: order.map((t, i) => ({ ...t, rank: i + 1 })) };
    };
    const { before, after } = goal('B', 7, interleave);

    const firstA = firstIndexOf(before, 'A');
    expect(firstA).toBeLessThan(before.turnIndex);

    expect(after.turnOrder).toEqual(before.turnOrder);
    expect(after.relaunch).toBe('A');

    const next = nextRound(after);
    expect(sideRoles(next, 'A')).toEqual(relaunchRoles(next, 'A'));
  });

  describe('promoteBulwark on its own', () => {
    const state = parked(7);
    const aSide = (order: readonly { team: TeamId | null }[]) => order.map((s, i) => ({ s, i })).filter(({ s }) => s.team === 'A');

    it('puts the keeper in front of the first Breaker, order kept otherwise, ranks renumbered', () => {
      const promoted = promoteBulwark(state.turnOrder, -1, 'A', 'A-bulwark-1', state.units)!;
      expect(promoted).not.toBeNull();
      const roles = promoted
        .filter((s) => s.team === 'A')
        .map((s) => unit(state, (s.actor as { unitId: UnitId }).unitId).role);
      expect(roles).toEqual(['trajector', 'striker', 'striker', 'striker', 'bulwark', 'breaker', 'breaker']);
      expect(promoted.map((s) => s.rank)).toEqual(promoted.map((_, i) => i + 1));
      expect(promoted).toHaveLength(state.turnOrder.length);
      // B's block did not move.
      expect(promoted.filter((s) => s.team === 'B').map((s) => s.actor)).toEqual(
        state.turnOrder.filter((s) => s.team === 'B').map((s) => s.actor),
      );
    });

    it('is idempotent: a ladder already in relaunch order comes back unchanged', () => {
      const once = promoteBulwark(state.turnOrder, -1, 'A', 'A-bulwark-1', state.units)!;
      expect(promoteBulwark(once, -1, 'A', 'A-bulwark-1', state.units)).toEqual(once);
    });

    it('returns null once the side has begun its block', () => {
      const first = aSide(state.turnOrder)[0]!.i;
      expect(promoteBulwark(state.turnOrder, first, 'A', 'A-bulwark-1', state.units)).toBeNull();
      expect(promoteBulwark(state.turnOrder, first + 3, 'A', 'A-bulwark-1', state.units)).toBeNull();
      expect(promoteBulwark(state.turnOrder, first - 1, 'A', 'A-bulwark-1', state.units)).not.toBeNull();
    });

    it('leaves the keeper at the end of its block when the side has no Breaker left', () => {
      const withoutBreakers = state.turnOrder.filter(
        (s) => !(s.actor.kind === 'unit' && unit(state, s.actor.unitId).role === 'breaker'),
      );
      const promoted = promoteBulwark(withoutBreakers, -1, 'A', 'A-bulwark-1', state.units)!;
      expect(promoted.map((s) => s.actor)).toEqual(withoutBreakers.map((s) => s.actor));
    });
  });
});

// -- recoilBlocked ----------------------------------------------------------

describe('a swing whose recoil is blocked says so (recoilBlocked)', () => {
  /** A swing from `from` at an enemy on `at`, the swinger's own turn. */
  function swing(from: Point, at: Point, extra: (s: MatchState) => MatchState = (s) => s) {
    let state = put(put(parked(), 'A-striker-2', from), 'B-striker-2', at);
    state = clockOn(extra(state), 'A-striker-2');
    const result = must(state, { kind: 'attack', targetId: 'B-striker-2' });
    return { before: state, after: result.state, events: result.events };
  }

  it('is said when a wall stands directly behind the swinger', () => {
    // The cover at (5, 18) is behind a swinger on (6, 18) hitting east.
    expect(arena.isSolid({ x: 5, y: 18 })).toBe(true);
    const { before, after, events } = swing({ x: 6, y: 18 }, { x: 7, y: 18 });

    expect(events).toContainEqual({ kind: 'recoilBlocked', unitId: 'A-striker-2', at: { x: 6, y: 18 } });
    expect(events.some((e) => e.kind === 'recoiled')).toBe(false);
    expect(cellOf(unit(after, 'A-striker-2'))).toEqual(cellOf(unit(before, 'A-striker-2')));
  });

  it('is said when a unit stands behind the swinger', () => {
    const { events, after } = swing({ x: 7, y: 22 }, { x: 8, y: 22 }, (s) => put(s, 'A-striker-3', { x: 6, y: 22 }));
    expect(events.some((e) => e.kind === 'recoilBlocked')).toBe(true);
    expect(events.some((e) => e.kind === 'recoiled')).toBe(false);
    expect(cellOf(unit(after, 'A-striker-2'))).toEqual({ x: 7, y: 22 });
  });

  it('is said when the edge of the pitch is behind the swinger', () => {
    const { events, after } = swing({ x: 0, y: 20 }, { x: 1, y: 20 });
    expect(events).toContainEqual({ kind: 'recoilBlocked', unitId: 'A-striker-2', at: { x: 0, y: 20 } });
    expect(events.some((e) => e.kind === 'recoiled')).toBe(false);
    expect(cellOf(unit(after, 'A-striker-2'))).toEqual({ x: 0, y: 20 });
  });

  it('is not said when there is room behind: the swinger recoils as before', () => {
    const { events, after } = swing({ x: 7, y: 22 }, { x: 8, y: 22 });
    expect(events.some((e) => e.kind === 'recoilBlocked')).toBe(false);
    expect(events).toContainEqual({ kind: 'recoiled', unitId: 'A-striker-2', from: { x: 7, y: 22 }, to: { x: 5, y: 22 } });
    expect(cellOf(unit(after, 'A-striker-2'))).toEqual({ x: 5, y: 22 });
  });

  it('is not said when the recoil is only cut short', () => {
    // The cover is the second cell back: one cell of the two is all it gets.
    const { events, after } = swing({ x: 7, y: 18 }, { x: 8, y: 18 });
    expect(events.some((e) => e.kind === 'recoilBlocked')).toBe(false);
    expect(events.some((e) => e.kind === 'recoiled')).toBe(true);
    expect(cellOf(unit(after, 'A-striker-2'))).toEqual({ x: 6, y: 18 });
  });

  it('is said after an opportunity attack too', () => {
    // B's watcher stands at (6, 18) with the cover behind it; A's mover steps out of its reach.
    let state = put(put(parked(), 'A-striker-2', { x: 7, y: 18 }), 'B-breaker-5', { x: 6, y: 18 }, { reactionAvailable: true });
    state = clockOn(state, 'A-striker-2');
    const { events, state: after } = must(state, { kind: 'move', path: [{ x: 8, y: 18 }] });

    expect(events.some((e) => e.kind === 'opportunityAttacked')).toBe(true);
    expect(events).toContainEqual({ kind: 'recoilBlocked', unitId: 'B-breaker-5', at: { x: 6, y: 18 } });
    expect(events.some((e) => e.kind === 'recoiled')).toBe(false);
    expect(cellOf(unit(after, 'B-breaker-5'))).toEqual({ x: 6, y: 18 });
  });

  it('is said after a swing at a Cracker too', () => {
    let state = put(parked(), 'A-striker-2', { x: 6, y: 18 });
    state = {
      ...clockOn(state, 'A-striker-2'),
      crackers: state.crackers.map((c, i) =>
        i === 0 ? { ...c, x: 7, y: 18, state: 'live' as const, respawnOnRound: null } : c,
      ),
    };
    const { events } = must(state, { kind: 'batCracker', crackerId: state.crackers[0]!.id, direction: 3 });
    expect(events).toContainEqual({ kind: 'recoilBlocked', unitId: 'A-striker-2', at: { x: 6, y: 18 } });
    expect(events.some((e) => e.kind === 'recoiled' && e.unitId === 'A-striker-2')).toBe(false);
  });
});

// -- passIntercepted.toId ---------------------------------------------------

describe('a stolen pass names the team-mate it was meant for (passIntercepted.toId)', () => {
  function lane(seed: number): MatchState {
    let state = put(parked(), 'A-striker-2', { x: 5, y: 22 });
    state = put(state, 'A-striker-3', { x: 11, y: 22 });
    state = put(state, 'B-striker-2', { x: 7, y: 21 }, { reactionAvailable: true });
    return { ...clockOn(carrying(state, 'A-striker-2'), 'A-striker-2'), rngSeed: seed };
  }

  it('carries the intended receiver, whether the lane is won or not', () => {
    let stolen = 0;
    let held = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const { events } = must(lane(seed), { kind: 'pass', targetId: 'A-striker-3' });
      const contest = events.find((e) => e.kind === 'passIntercepted');
      if (!contest || contest.kind !== 'passIntercepted') throw new Error(`seed ${seed}: the lane was not contested`);
      expect(contest.toId, `seed ${seed}`).toBe('A-striker-3');
      expect(contest.throwerId).toBe('A-striker-2');
      expect(contest.interceptorId).toBe('B-striker-2');
      if (contest.success) stolen++;
      else held++;
    }
    expect(stolen).toBeGreaterThan(0);
    expect(held).toBeGreaterThan(0);
  });
});

// -- turn.shot --------------------------------------------------------------

describe('the turn knows whether its Action went into a shot (turn.shot)', () => {
  it('is false when a turn opens, and still false after a move', () => {
    const opened = parked();
    expect(opened.turn!.shot).toBe(false);

    const unitId = opened.turn!.unitId;
    const at = cellOf(unit(opened, unitId));
    const moved = must(opened, { kind: 'move', path: [{ x: at.x, y: at.y - 1 }] });
    expect(moved.state.turn!.shot).toBe(false);

    // And the next turn that opens starts clean too.
    const next = must(opened, { kind: 'endTurn' }).state;
    expect(next.turn!.unitId).not.toBe(unitId);
    expect(next.turn!.shot).toBe(false);
  });

  it('is true after a shoot, hit, saved or missed', () => {
    const shooter = 'B-striker-2';
    let base = put(parked(), 'A-bulwark-1', { x: 7, y: 1 });
    base = clockOn(carrying(put(base, shooter, { x: 7, y: 6 }), shooter), shooter);
    expect(base.turn!.shot).toBe(false);

    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const { state, events } = must({ ...base, rngSeed: seed }, { kind: 'shoot' });
      expect(state.turn!.shot, `seed ${seed}`).toBe(true);
      const shot = events.find((e) => e.kind === 'shotAtFurnace');
      if (shot?.kind === 'shotAtFurnace') outcomes.add(shot.scored ? 'scored' : 'failed');
    }
    expect(outcomes.size).toBe(2);
  });

  it('stays false when the shot is refused', () => {
    // Not holding the Payload: refused, and the state handed back is not touched.
    const state = clockOn(put(parked(), 'B-striker-2', { x: 7, y: 6 }), 'B-striker-2');
    expect(act(state, { kind: 'shoot' }).ok).toBe(false);
    expect(state.turn!.shot).toBe(false);
  });
});
