import { describe, expect, it } from 'vitest';

import type { Action } from './actions.js';
import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  CRACKER_AC,
  CRACKER_DAMAGE_DICE,
  CRACKER_BAT_RANGE_CELLS,
  CRACKER_DAMAGE_DIE,
  CRACKER_FIRST_DRIFT_ROUND,
  CRACKER_MOVE_CELLS,
  SPARK_ENTRY_ROUND,
  SPARK_MOVE_CELLS,
  SPARK_POINTS,
  SPARK_SPAWN_MIN_DISTANCE,
  SPARK_SPAWN_THIRD,
} from './constants.js';
import type { MatchEvent } from './events.js';
import { distance, thirdOf, type Point } from './geometry.js';
import { buildTurnOrder } from './initiative.js';
import { legalActions } from './legalActions.js';
import { openMatch, reduce, type ReduceResult } from './reduce.js';
import { Rng } from './rng.js';
import {
  arrivalFace,
  ballCell,
  battedCrackerRun,
  crackerKickoffCells,
  crackerPost,
  crackerRespawnCell,
  crackerRun,
  parryDirection,
  parryFaces,
  shortestPath,
  sparkEntryCell,
  sparkRun,
} from './rules/ordnance.js';
import { createMatch } from './setup.js';
import { statsFor } from './stats.js';
import { unitAt, unitById, type MatchState, type TeamId, type Unit, type UnitId } from './types.js';

const arena = new Arena(KILL_SILO);

/** The far top corner. Anything parked here is twenty-odd cells from anywhere. */
const CORNER: Point = { x: 0, y: 44 };

/** The most a made save can ever let through, which is the halving rule stated as a number. */
const HALF_MAX_BLAST = Math.floor((CRACKER_DAMAGE_DICE * CRACKER_DAMAGE_DIE) / 2);

const EAST = 3;
const WEST = 7;

function fresh(seed = 5): MatchState {
  return createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
}

/**
 * A cell as a bare point. A run that ends on a player hands back the player's
 * own record as its last cell, so equality is read on the coordinates only.
 */
function xy(p: Point): Point {
  return { x: p.x, y: p.y };
}

/** Everyone in one corner, so a test places only the players it cares about. */
function cleared(state: MatchState): MatchState {
  return { ...state, units: state.units.map((u) => ({ ...u, ...CORNER })) };
}

/**
 * A cleared match, patched, opened **on round 2**, and walked with empty turns
 * until the Crackers have rolled.
 *
 * Since écart 51 the Crackers follow the side that carries, or carried last,
 * on the ladder. `lastCarrierTeam` is set to A here so that they roll between
 * the two sides: team A's seven empty turns go by first, then the Crackers,
 * and the walk stops on team B's first turn, before any unit of B has had its
 * Reaction refreshed by `beginTurn`. Nobody moves on an empty turn, so the
 * board the Crackers read is the one the test patched. Round 2 rather than 1
 * because the Crackers do not drift on the kick-off round (écart 44).
 */
function opened(
  patch: (s: MatchState) => MatchState = (s) => s,
  seed = 5,
): { state: MatchState; events: readonly MatchEvent[] } {
  const patched: MatchState = {
    ...patch(cleared(fresh(seed))),
    round: CRACKER_FIRST_DRIFT_ROUND,
    lastCarrierTeam: 'A',
    // A opens round 2 (`sideOrder`), so the Crackers roll after A and before B.
    initiativeNonce: 0,
  };
  // The ladder is built from the patched board, as a round start would.
  const start: MatchState = { ...patched, turnOrder: buildTurnOrder(arena, patched) };
  const openedMatch = openMatch(arena, start);
  let state = openedMatch.state;
  const log: MatchEvent[] = [...openedMatch.events];
  const rung = state.turnOrder.findIndex((slot) => slot.actor.kind === 'crackers');
  for (let i = 0; i < 40 && rung >= 0 && state.turnIndex <= rung && state.phase !== 'finished'; i++) {
    const step = must(state, { kind: 'endTurn' });
    state = step.state;
    log.push(...step.events);
  }
  return { state, events: log };
}

function place(state: MatchState, id: UnitId, at: Point): MatchState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, ...at } : u)) };
}

function crackersAt(state: MatchState, ...cells: readonly Point[]): MatchState {
  return {
    ...state,
    crackers: state.crackers.map((cracker, i) => {
      const at = cells[i];
      return at ? { ...cracker, ...at, state: 'live' as const, respawnOnRound: null } : cracker;
    }),
  };
}

function someone(state: MatchState, team: TeamId): Unit {
  return state.units.find((u) => u.team === team)!;
}

function run(state: MatchState, action: Action): ReduceResult {
  return reduce(arena, state, { unitId: state.turn!.unitId, action });
}

function must(state: MatchState, action: Action) {
  const result = run(state, action);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result;
}

/** Ends turns until the predicate holds, or gives up loudly. */
function until(start: MatchState, reached: (s: MatchState) => boolean, limit = 4000): MatchState {
  let state = start;
  for (let i = 0; i < limit && !reached(state) && state.phase !== 'finished'; i++) {
    state = must(state, { kind: 'endTurn' }).state;
  }
  if (!reached(state)) throw new Error('the match never reached the wanted point');
  return state;
}

/** A cleared board with one player put somewhere on purpose. */
function loneTarget(at: Point, team: TeamId = 'B'): { state: MatchState; target: Unit } {
  const board = cleared(fresh());
  const target = someone(board, team);
  const state = place(board, target.id, at);
  return { state, target: state.units.find((u) => u.id === target.id)! };
}

/** The ball lying loose on a cell, nobody holding it. */
function ballAt(state: MatchState, at: Point): MatchState {
  return {
    ...state,
    units: state.units.map((u) => ({ ...u, holdingPayload: false })),
    payload: { carriedBy: null, x: at.x, y: at.y },
  };
}

/** The ball in a player's hands. */
function carrying(state: MatchState, id: UnitId): MatchState {
  const carrier = state.units.find((u) => u.id === id)!;
  return {
    ...state,
    units: state.units.map((u) => ({ ...u, holdingPayload: u.id === id })),
    payload: { carriedBy: id, x: carrier.x, y: carrier.y },
  };
}

/** A fresh, cleared Cracker record standing on a cell, for the pure homing rule. */
function crackerOn(at: Point, id = 'cracker-1') {
  return { id, x: at.x, y: at.y, state: 'live' as const, respawnOnRound: null };
}

// -- The homing rule, on its own --------------------------------------------

describe('a Cracker on count 20 (écart 45)', () => {
  it('rolls at a loose ball, stops on its cell, and nothing happens', () => {
    const state = ballAt(cleared(fresh()), { x: 7, y: 25 });
    const outcome = crackerRun(arena, state, crackerOn({ x: 7, y: 22 }));

    expect(outcome.struck).toBeNull();
    expect(outcome.path).toHaveLength(3);
    expect(outcome.landing).toEqual({ x: 7, y: 25 });
  });

  it('rolls at the carrier and goes off on them', () => {
    const { state, target } = loneTarget({ x: 7, y: 25 });
    const outcome = crackerRun(arena, carrying(state, target.id), crackerOn({ x: 7, y: 22 }));

    expect(outcome.struck?.id).toBe(target.id);
    expect(xy(outcome.landing)).toEqual({ x: 7, y: 25 });
    expect(outcome.path).toHaveLength(3);
  });

  it('reads a carried ball off the carrier, not off the stale payload cell', () => {
    const { state, target } = loneTarget({ x: 11, y: 30 });
    const stale: MatchState = {
      ...state,
      units: state.units.map((u) => ({ ...u, holdingPayload: u.id === target.id })),
      payload: { carriedBy: target.id, x: 3, y: 3 },
    };
    expect(ballCell(stale)).toEqual({ x: 11, y: 30 });
  });

  it('goes off on the first player it crosses on the way to the ball, not on the one holding it', () => {
    const board = cleared(fresh());
    const bystander = someone(board, 'A');
    const state = ballAt(place(board, bystander.id, { x: 7, y: 24 }), { x: 7, y: 27 });

    const outcome = crackerRun(arena, state, crackerOn({ x: 7, y: 22 }));

    expect(outcome.struck?.id).toBe(bystander.id);
    expect(xy(outcome.landing)).toEqual({ x: 7, y: 24 });
  });

  it('ignores a player who is nearer than the ball but not on the way', () => {
    // Column 11 is open from y = 22 to y = 37. The player stands a cell east
    // of the Cracker; under the old rule it was the nearest thing and got hit.
    const { state } = loneTarget({ x: 12, y: 22 });
    const outcome = crackerRun(arena, ballAt(state, { x: 11, y: 32 }), crackerOn({ x: 11, y: 22 }));

    expect(outcome.struck).toBeNull();
    expect(outcome.path).toHaveLength(CRACKER_MOVE_CELLS);
    expect(outcome.landing).toEqual({ x: 11, y: 22 + CRACKER_MOVE_CELLS });
  });

  it('covers its whole move and no more when the ball is out of reach', () => {
    expect(CRACKER_MOVE_CELLS).toBeLessThan(15);
    const state = ballAt(cleared(fresh()), { x: 11, y: 37 });
    const outcome = crackerRun(arena, state, crackerOn({ x: 11, y: 22 }));

    expect(outcome.struck).toBeNull();
    expect(outcome.path).toHaveLength(CRACKER_MOVE_CELLS);
    expect(outcome.landing).toEqual({ x: 11, y: 22 + CRACKER_MOVE_CELLS });
  });

  it('does nothing when it is already sitting on the loose ball', () => {
    const state = ballAt(cleared(fresh()), { x: 7, y: 22 });
    const outcome = crackerRun(arena, state, crackerOn({ x: 7, y: 22 }));

    expect(outcome.struck).toBeNull();
    expect(outcome.path).toHaveLength(0);
    expect(outcome.landing).toEqual({ x: 7, y: 22 });
  });

  it('goes off where it lies when a player is standing on it, ball or no ball', () => {
    const { state, target } = loneTarget({ x: 7, y: 22 });
    const outcome = crackerRun(arena, ballAt(state, { x: 3, y: 10 }), crackerOn({ x: 7, y: 22 }));

    expect(outcome.struck?.id).toBe(target.id);
    expect(outcome.path).toHaveLength(0);
    expect(outcome.landing).toEqual({ x: 7, y: 22 });
  });

  it('rolls in a straight line when one exists, whichever way the ball lies', () => {
    // Row 22 is open from x = 1 to x = 13. Three cells west: three steps west,
    // not a step south-east and two north-west, which is as short and which
    // the first search produced.
    const state = ballAt(cleared(fresh()), { x: 7, y: 22 });
    const outcome = crackerRun(arena, state, crackerOn({ x: 10, y: 22 }));
    expect(outcome.path.map(xy)).toEqual([
      { x: 9, y: 22 },
      { x: 8, y: 22 },
      { x: 7, y: 22 },
    ]);
    const back = crackerRun(arena, state, crackerOn({ x: 4, y: 22 }));
    expect(back.path.map(xy)).toEqual([
      { x: 5, y: 22 },
      { x: 6, y: 22 },
      { x: 7, y: 22 },
    ]);
  });

  it('goes round an obstacle to reach a ball behind it', () => {
    // The pillar at (7, 16) is dead between the Cracker and the ball.
    expect(arena.isSolid({ x: 7, y: 16 })).toBe(true);

    const from: Point = { x: 7, y: 14 };
    const state = ballAt(cleared(fresh()), { x: 7, y: 18 });
    const outcome = crackerRun(arena, state, crackerOn(from));

    for (const cell of outcome.path) expect(arena.isSolid(cell)).toBe(false);
    // Four rows to climb and one diagonal to step round the pillar: four steps,
    // worked out by hand and then held equal to what the search returns.
    const route = shortestPath(arena, from, { x: 7, y: 18 }, CRACKER_MOVE_CELLS);
    expect(route).toHaveLength(4);
    expect(outcome.path.map(xy)).toEqual(route.map(xy));
    expect(outcome.struck).toBeNull();
    expect(outcome.landing).toEqual({ x: 7, y: 18 });
  });

  it('stops on the last free cell before the other Cracker rather than rolling through it', () => {
    const board = ballAt(cleared(fresh()), { x: 11, y: 30 });
    const state = crackersAt(board, { x: 11, y: 22 }, { x: 11, y: 25 });
    const outcome = crackerRun(arena, state, state.crackers[0]!);

    expect(outcome.struck).toBeNull();
    expect(outcome.path.map(xy)).toEqual([
      { x: 11, y: 23 },
      { x: 11, y: 24 },
    ]);
    expect(outcome.landing).toEqual({ x: 11, y: 24 });
  });

  it('does not stop for its twin once the twin is spent', () => {
    const board = ballAt(cleared(fresh()), { x: 11, y: 30 });
    const placed = crackersAt(board, { x: 11, y: 22 }, { x: 11, y: 25 });
    const state: MatchState = {
      ...placed,
      crackers: placed.crackers.map((c, i) =>
        i === 1 ? { ...c, state: 'destroyed' as const, respawnOnRound: 3 } : c,
      ),
    };
    const outcome = crackerRun(arena, state, state.crackers[0]!);
    expect(outcome.landing).toEqual({ x: 11, y: 30 });
  });

  it('never stops because of an obstacle, from any open cell near the ball', () => {
    // Balls on either side of the pillar and of the crate at y = 9.
    for (const at of [
      { x: 7, y: 17 },
      { x: 7, y: 15 },
      { x: 7, y: 10 },
      { x: 7, y: 8 },
    ]) {
      const state = ballAt(cleared(fresh()), at);
      for (const cell of arena.occupiableCells()) {
        const away = distance(cell, at);
        if (away === 0 || away > 12) continue;

        const outcome = crackerRun(arena, state, crackerOn(cell));
        expect(outcome.path.length, `from ${cell.x},${cell.y} to ${at.x},${at.y}`).toBeGreaterThan(0);
        for (const step of outcome.path) expect(arena.isSolid(step)).toBe(false);
      }
    }
  });
});

describe('a batted Cracker', () => {
  it('goes off on the first player down the chosen line', () => {
    const { state, target } = loneTarget({ x: 9, y: 22 });
    const outcome = battedCrackerRun(arena, state, { x: 6, y: 22 }, EAST);

    expect(outcome.struck?.id).toBe(target.id);
    expect(xy(outcome.landing)).toEqual({ x: 9, y: 22 });
  });

  it('bounces off the edge of the pitch and keeps all twelve of its cells', () => {
    // Row 20 is open end to end. East from (10, 20): four cells to the wall at
    // x = 14, then eight back west.
    const outcome = battedCrackerRun(arena, cleared(fresh()), { x: 10, y: 20 }, EAST);

    expect(outcome.struck).toBeNull();
    expect(outcome.path).toHaveLength(CRACKER_BAT_RANGE_CELLS);
    expect(outcome.path[3]).toEqual({ x: 14, y: 20 });
    expect(outcome.landing).toEqual({ x: 6, y: 20 });
  });

  it('bounces off an obstacle too, and never enters it', () => {
    // North from (7, 13): the pillar at (7, 16) turns it round after two cells.
    const outcome = battedCrackerRun(arena, cleared(fresh()), { x: 7, y: 13 }, 1);

    expect(outcome.path).toHaveLength(CRACKER_BAT_RANGE_CELLS);
    expect(outcome.path[1]).toEqual({ x: 7, y: 15 });
    expect(outcome.path[2]).toEqual({ x: 7, y: 14 });
    for (const cell of outcome.path) expect(arena.isSolid(cell)).toBe(false);
  });

  it('goes off on the first player it meets along the bounced path', () => {
    // East to the wall and back: the player at (8, 20) is the tenth cell, on the
    // way home, and the Cracker does not go on to its twelfth.
    const { state, target } = loneTarget({ x: 8, y: 20 });
    const outcome = battedCrackerRun(arena, state, { x: 10, y: 20 }, EAST);

    expect(outcome.struck?.id).toBe(target.id);
    expect(xy(outcome.landing)).toEqual({ x: 8, y: 20 });
    expect(outcome.path).toHaveLength(10);
  });
});

// -- The Crackers through the engine ----------------------------------------

/**
 * One Cracker at the centre, the ball loose three cells beyond a victim: the
 * Cracker rolls at the ball and goes off on the victim on the way. The second
 * Cracker is parked far away unless a test puts it somewhere.
 */
function homingOnOne(state: MatchState, secondCracker: Point = { x: 0, y: 0 }): MatchState {
  return ballAt(
    place(crackersAt(state, { x: 7, y: 22 }, secondCracker), someone(state, 'B').id, { x: 7, y: 25 }),
    { x: 7, y: 27 },
  );
}

describe('the Crackers on the ladder', () => {
  it('lets them lie still through the kick-off round, so no blast lands before anyone has acted (écart 44)', () => {
    // The real kick-off board: lines eight cells from the centre, Crackers a
    // cell either side of the ball, ten cells of roll. Left to drift on round 1
    // they reached somebody every match. Opened as kick-off actually opens.
    const { state, events } = openMatch(arena, fresh(5));
    expect(state.round).toBe(1);
    expect(events.some((e) => e.kind === 'crackerMoved')).toBe(false);
    expect(events.some((e) => e.kind === 'crackerDetonated')).toBe(false);
    state.crackers.forEach((cracker, i) => {
      expect(cracker.state).toBe('live');
      expect(distance(cracker, crackerPost(arena, i))).toBe(1);
    });
    expect(CRACKER_FIRST_DRIFT_ROUND).toBe(2);
  });

  it('starts them hunting on round 2, on the same board', () => {
    const { events } = opened((s) => ({ ...s, units: fresh(5).units }));
    expect(events.some((e) => e.kind === 'crackerMoved')).toBe(true);
    // Empty turns only: the board they read is the kick-off board.
    expect(events.some((e) => e.kind === 'moved')).toBe(false);
  });

  it('still lets a player bat one on the kick-off round', () => {
    const board = openMatch(arena, fresh(5)).state;
    const actorId = board.turn!.unitId;
    const state = crackersAt(place(board, actorId, { x: 7, y: 20 }), { x: 7, y: 21 }, { x: 0, y: 0 });
    const result = run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: 1 });
    expect(result.ok).toBe(true);
    expect(result.ok && result.events.some((e) => e.kind === 'crackerBatted')).toBe(true);
  });

  it('resolves them on their own rung, right after the carrying side, with nobody taking a turn (écart 51)', () => {
    const { state, events } = opened((s) => homingOnOne(s));

    const moved = events.findIndex((e) => e.kind === 'crackerMoved');
    expect(moved).toBeGreaterThan(-1);
    // The rung sits between the last turn of A and the first turn of B.
    const before = events.slice(0, moved).filter((e) => e.kind === 'turnStarted');
    const after = events.slice(moved).filter((e) => e.kind === 'turnStarted');
    expect(before.every((e) => e.kind === 'turnStarted' && e.unitId.startsWith('A-'))).toBe(true);
    expect(after.every((e) => e.kind === 'turnStarted' && e.unitId.startsWith('B-'))).toBe(true);
    expect(state.turnOrder[state.turnIndex]?.team).toBe('B');
  });

  it('spends the Cracker on detonation and drops a fresh one next round', () => {
    const { state, events } = opened((s) => homingOnOne(s));

    const blast = events.find((e) => e.kind === 'crackerDetonated');
    expect(blast).toBeDefined();

    const crackerId = (blast as { crackerId: string }).crackerId;
    const spent = state.crackers.find((c) => c.id === crackerId)!;
    expect(spent.state).toBe('destroyed');
    expect(spent.respawnOnRound).toBe(state.round + 1);

    // Everyone back to the corner first. A replacement dropped within six cells
    // of a player homes and detonates in the same rollover, which is correct and
    // would hide the only thing this test is about.
    let seen: MatchEvent | undefined;
    let current = cleared(state);
    for (let i = 0; i < 200 && !seen; i++) {
      const step = must(current, { kind: 'endTurn' });
      current = step.state;
      seen = step.events.find((e) => e.kind === 'crackerRespawned' && e.crackerId === crackerId);
    }

    // Écart 46: back beside its own edge post of the halfway line. The blast
    // was on the first drifting round, so the return is the one after.
    expect(seen).toMatchObject({ round: CRACKER_FIRST_DRIFT_ROUND + 1 });
    const at = (seen as { at: Point }).at;
    const index = state.crackers.findIndex((c) => c.id === crackerId);
    expect(distance(at, crackerPost(arena, index))).toBe(1);
    expect(arena.isOccupiable(at)).toBe(true);
    // It is live again, and it has already rolled on count 20 of that round,
    // so its cell is wherever the homing took it, not `at`.
    expect(current.crackers.find((c) => c.id === crackerId)!.state).toBe('live');
  });

  it('returns both Crackers to distinct cells when they went off in the same round', () => {
    // The ball at the centre, a victim between each Cracker and the ball: both
    // go off on count 20 of the first drifting round.
    const { state } = opened((s) => {
      const a = someone(s, 'A');
      const b = someone(s, 'B');
      return ballAt(
        place(place(crackersAt(s, { x: 4, y: 22 }, { x: 10, y: 22 }), a.id, { x: 5, y: 22 }), b.id, { x: 9, y: 22 }),
        { x: 7, y: 22 },
      );
    });
    expect(state.crackers.every((c) => c.state === 'destroyed')).toBe(true);

    let current = cleared(state);
    let events: MatchEvent[] = [];
    for (let i = 0; i < 200 && events.filter((e) => e.kind === 'crackerRespawned').length < 2; i++) {
      const step = must(current, { kind: 'endTurn' });
      current = step.state;
      events = [...events, ...step.events];
    }
    const back = events.filter((e): e is Extract<MatchEvent, { kind: 'crackerRespawned' }> => e.kind === 'crackerRespawned');
    expect(back).toHaveLength(2);
    expect(xy(back[0]!.at)).not.toEqual(xy(back[1]!.at));
    for (const returned of back) {
      const index = current.crackers.findIndex((c) => c.id === returned.crackerId);
      expect(distance(returned.at, crackerPost(arena, index))).toBe(1);
    }
    // Each came back beside its post and has since rolled at the ball on
    // count 20; one of them may well be sitting on it now, which écart 45
    // allows. What it never did is come back **onto** the ball.
    for (const returned of back) expect(xy(returned.at)).not.toEqual(xy(current.payload));
    for (const cracker of current.crackers) {
      expect(cracker.state).toBe('live');
      expect(arena.isOccupiable(cracker)).toBe(true);
    }
  });

  it('takes hit points off whoever it caught, and names the blast as the source', () => {
    const { state, events } = opened((s) => homingOnOne(s, { x: 0, y: 0 }));

    const blast = events.find((e) => e.kind === 'crackerDetonated')!;
    const hurt = state.units.find((u) => u.id === (blast as { targetId: UnitId }).targetId)!;

    expect(events.some((e) => e.kind === 'damaged' && e.source === 'cracker')).toBe(true);
    expect(hurt.hp).toBeLessThan(hurt.maxHp);
  });

  it('halves the blast on a made save, and never halves it on a failed one', () => {
    const saw = { saved: 0, failed: 0, overHalf: 0 };

    for (let seed = 1; seed < 120; seed++) {
      const { events } = opened((s) => homingOnOne(s, { x: 0, y: 0 }), seed);

      for (const event of events) {
        if (event.kind !== 'crackerDetonated') continue;
        expect(event.damage).toBeGreaterThan(0);

        if (event.saved) {
          saw.saved++;
          expect(event.damage).toBeLessThanOrEqual(HALF_MAX_BLAST);
        } else {
          saw.failed++;
          if (event.damage > HALF_MAX_BLAST) saw.overHalf++;
        }
      }
    }

    // Both branches have to have been walked for the cap above to mean anything,
    // and a failed save has to be able to beat what a made one is capped at.
    expect(saw.saved).toBeGreaterThan(0);
    expect(saw.failed).toBeGreaterThan(0);
    expect(saw.overHalf).toBeGreaterThan(0);
  });
});

describe('where a Cracker stands (écart 46)', () => {
  it('names the two edge posts of the halfway line, which are pillars', () => {
    expect(crackerPost(arena, 0)).toEqual({ x: 0, y: 22 });
    expect(crackerPost(arena, 1)).toEqual({ x: 14, y: 22 });
    expect(arena.isSolid(crackerPost(arena, 0))).toBe(true);
    expect(arena.isSolid(crackerPost(arena, 1))).toBe(true);
  });

  it('starts cracker-1 beside the west post and cracker-2 beside the east post, on open floor', () => {
    const board = fresh();
    for (let seed = 1; seed <= 30; seed++) {
      const [first, second] = crackerKickoffCells(arena, board.units, board.payload, new Rng(seed));
      expect(distance(first, crackerPost(arena, 0)), `seed ${seed}`).toBe(1);
      expect(distance(second, crackerPost(arena, 1)), `seed ${seed}`).toBe(1);
      expect(arena.isOccupiable(first)).toBe(true);
      expect(arena.isOccupiable(second)).toBe(true);
      expect(first).not.toEqual(second);
      expect(first).not.toEqual(KILL_SILO.ordnanceStart);
      expect(second).not.toEqual(KILL_SILO.ordnanceStart);
    }
  });

  it('does so on the real kick-off board, as far from both Furnaces as the ball', () => {
    const state = fresh();
    state.crackers.forEach((cracker, i) => {
      expect(distance(cracker, crackerPost(arena, i))).toBe(1);
      expect(state.units.some((u) => u.x === cracker.x && u.y === cracker.y)).toBe(false);
    });
  });

  it('returns a spent Cracker beside its own post', () => {
    const board = cleared(fresh());
    const state: MatchState = {
      ...board,
      payload: { carriedBy: null, x: 7, y: 22 },
      crackers: board.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 2 })),
    };
    for (let seed = 1; seed <= 20; seed++) {
      expect(distance(crackerRespawnCell(arena, state, 0, new Rng(seed)), { x: 0, y: 22 })).toBe(1);
      expect(distance(crackerRespawnCell(arena, state, 1, new Rng(seed)), { x: 14, y: 22 })).toBe(1);
    }
  });

  it('never returns a Cracker onto the loose ball, a player or its live twin', () => {
    const board = cleared(fresh());
    // The five open cells round the west post: three players, the ball, the twin.
    const ring = [
      { x: 0, y: 21 },
      { x: 1, y: 21 },
      { x: 1, y: 22 },
    ];
    let state: MatchState = {
      ...board,
      payload: { carriedBy: null, x: 1, y: 23 },
      crackers: board.crackers.map((c, i) =>
        i === 1
          ? { ...c, x: 0, y: 23, state: 'live' as const, respawnOnRound: null }
          : { ...c, state: 'destroyed' as const, respawnOnRound: 2 },
      ),
    };
    board.units.slice(0, ring.length).forEach((u, i) => {
      state = place(state, u.id, ring[i]!);
    });
    for (let seed = 1; seed <= 20; seed++) {
      const at = crackerRespawnCell(arena, state, 0, new Rng(seed));
      expect(distance(at, { x: 0, y: 22 })).toBe(2);
      expect(arena.isOccupiable(at)).toBe(true);
      expect(state.units.some((u) => u.x === at.x && u.y === at.y)).toBe(false);
      expect(at).not.toEqual({ x: 1, y: 23 });
      expect(at).not.toEqual({ x: 0, y: 23 });
    }
  });

  it('splits the cells beside the post by the dice rather than always the same way', () => {
    const board = cleared(fresh());
    const state: MatchState = {
      ...board,
      payload: { carriedBy: null, x: 7, y: 22 },
      crackers: board.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 2 })),
    };
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const at = crackerRespawnCell(arena, state, 0, new Rng(seed));
      seen.add(`${at.x},${at.y}`);
    }
    expect(seen.size).toBeGreaterThan(2);
  });
});

// -- The Breaker's parry (écart 47) ------------------------------------------

describe('the arc of the parry', () => {
  it('reads the face a Cracker came in through as the way back', () => {
    // Up column 11 from (11, 22) to (11, 26): it came from the south, so the
    // Breaker bats it back south, face 5.
    const run = {
      path: [{ x: 11, y: 23 }, { x: 11, y: 24 }, { x: 11, y: 25 }, { x: 11, y: 26 }],
      landing: { x: 11, y: 26 },
      struck: null,
    };
    expect(arrivalFace({ x: 11, y: 22 }, run)).toBe(5);
    // A single step reads off the cell it rested on.
    expect(arrivalFace({ x: 11, y: 25 }, { path: [{ x: 11, y: 26 }], landing: { x: 11, y: 26 }, struck: null })).toBe(5);
    // No travel, no arrival.
    expect(arrivalFace({ x: 11, y: 26 }, { path: [], landing: { x: 11, y: 26 }, struck: null })).toBeNull();
  });

  it('is the arrival face and its two neighbours, 120 degrees on a d8, wrapping round', () => {
    expect(parryFaces(5)).toEqual([5, 4, 6]);
    expect(parryFaces(1)).toEqual([1, 8, 2]);
    expect(parryFaces(8)).toEqual([8, 7, 1]);
  });

  it('picks the face that reaches an opponent soonest', () => {
    const board = cleared(fresh());
    const breaker = board.units.find((u) => u.team === 'B' && u.role === 'breaker')!;
    const far = board.units.filter((u) => u.team === 'A')[0]!;
    const near = board.units.filter((u) => u.team === 'A')[1]!;
    // Breaker at (7, 22), came in from the south (arrival 5). Straight back
    // south an opponent stands three cells away; south-west another stands two.
    let state = place(board, breaker.id, { x: 7, y: 22 });
    state = place(state, far.id, { x: 7, y: 19 });
    state = place(state, near.id, { x: 5, y: 20 });
    expect(parryDirection(arena, state, state.units.find((u) => u.id === breaker.id)!, 5)).toBe(6);
  });

  it('keeps the arrival face when no face reaches an opponent', () => {
    // Column 11 is open from y = 22 to y = 37: twelve cells north without a
    // bounce, so the straight line comes back on nobody.
    const board = cleared(fresh());
    const breaker = board.units.find((u) => u.team === 'B' && u.role === 'breaker')!;
    const state = place(board, breaker.id, { x: 11, y: 22 });
    expect(parryDirection(arena, state, state.units.find((u) => u.id === breaker.id)!, 1)).toBe(1);
  });

  it('counts a line that bounces back onto the Breaker as a line that strikes its own side', () => {
    // South from (7, 22) the pillar at (7, 16) turns the Cracker round and it
    // rolls back up the column onto the Breaker's own cell: not a quiet face.
    const board = cleared(fresh());
    const breaker = board.units.find((u) => u.team === 'B' && u.role === 'breaker')!;
    const state = place(board, breaker.id, { x: 7, y: 22 });
    const chosen = parryDirection(arena, state, state.units.find((u) => u.id === breaker.id)!, 5);
    expect([4, 6]).toContain(chosen);
  });

  it('turns off the arrival face when it would go off on a team-mate and a quiet face exists', () => {
    const board = cleared(fresh());
    const breaker = board.units.find((u) => u.team === 'B' && u.role === 'breaker')!;
    const mate = board.units.find((u) => u.team === 'B' && u.id !== breaker.id)!;
    let state = place(board, breaker.id, { x: 11, y: 22 });
    state = place(state, mate.id, { x: 11, y: 24 });
    const chosen = parryDirection(arena, state, state.units.find((u) => u.id === breaker.id)!, 1);
    expect(chosen).not.toBe(1);
    expect([8, 2]).toContain(chosen);
  });
});

describe('the Breaker meets a Cracker in drift', () => {
  /**
   * Cracker-1 at (12, 20), the ball loose at (12, 30), the house's Breaker on
   * the way at (12, 24), in the open patch between the two pairs of covers.
   * The Cracker comes up from the south, so the arc the Breaker bats it into
   * is the three southern faces; a player of team A stands two cells down
   * the south-west one, at (10, 22), off the drift line. The second Cracker
   * is parked in the far corner, where it rolls at the ball and meets nobody.
   */
  function staged(seed = 5, patch: (s: MatchState) => MatchState = (s) => s) {
    return opened((s) => {
      const breaker = s.units.find((u) => u.team === 'B' && u.role === 'breaker')!;
      const victim = s.units.find((u) => u.team === 'A')!;
      let state = crackersAt(s, { x: 12, y: 20 }, { x: 0, y: 0 });
      state = place(state, breaker.id, { x: 12, y: 24 });
      state = place(state, victim.id, { x: 10, y: 22 });
      return patch(ballAt(state, { x: 12, y: 30 }));
    }, seed);
  }

  const ofOne = (e: MatchEvent): boolean => 'crackerId' in e && e.crackerId === 'cracker-1';

  function breakerOf(state: MatchState): Unit {
    return state.units.find((u) => u.team === 'B' && u.role === 'breaker')!;
  }

  it('offers the Breaker its Reaction before the blast, and spends it either way', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { state, events } = staged(seed);
      const parried = events.find((e) => e.kind === 'crackerParried');
      expect(parried, `seed ${seed}`).toBeDefined();
      expect(parried).toMatchObject({ unitId: breakerOf(state).id, crackerId: 'cracker-1' });
      expect(breakerOf(state).reactionAvailable).toBe(false);

      // The drift onto the Breaker is logged before the parry; the blast after.
      const moved = events.findIndex((e) => e.kind === 'crackerMoved' && ofOne(e));
      const parry = events.findIndex((e) => e.kind === 'crackerParried');
      const blast = events.findIndex((e) => e.kind === 'crackerDetonated' && ofOne(e));
      expect(moved).toBeLessThan(parry);
      expect(parry).toBeLessThan(blast);
    }
  });

  it('on a hit, sends it back down the arc onto the first player it meets, and the Breaker is unhurt', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { state, events } = staged(seed);
      const parried = events.find((e) => e.kind === 'crackerParried');
      if (!parried || parried.kind !== 'crackerParried' || !parried.hit) continue;

      // Came up from the south; the south-west face reaches an opponent in two
      // cells, straight back south reaches nobody, so south-west it is.
      expect(parried.direction).toBe(6);
      const runs = events.filter((e) => e.kind === 'crackerMoved' && ofOne(e));
      expect(runs).toHaveLength(2);
      expect(runs[1]).toMatchObject({ from: { x: 12, y: 24 }, to: { x: 10, y: 22 } });

      const victim = state.units.find((u) => u.team === 'A' && u.x === 10 && u.y === 22)!;
      expect(events.find((e) => e.kind === 'crackerDetonated')).toMatchObject({
        targetId: victim.id,
        at: { x: 10, y: 22 },
      });
      expect(breakerOf(state).hp).toBe(breakerOf(state).maxHp);
      return;
    }
    throw new Error('no seed in range landed the parry');
  });

  it('on a miss, goes off on the Breaker as it always did', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { state, events } = staged(seed);
      const parried = events.find((e) => e.kind === 'crackerParried');
      if (!parried || parried.kind !== 'crackerParried' || parried.hit) continue;

      expect(events.filter((e) => e.kind === 'crackerMoved' && ofOne(e))).toHaveLength(1);
      expect(events.find((e) => e.kind === 'crackerDetonated')).toMatchObject({
        targetId: breakerOf(state).id,
        at: { x: 12, y: 24 },
      });
      return;
    }
    throw new Error('no seed in range missed the parry');
  });

  it('rolls the parry against the Cracker AC with the Breaker might', () => {
    const { state, events } = staged();
    const parried = events.find((e) => e.kind === 'crackerParried');
    expect(parried).toMatchObject({
      roll: { die: 20, against: CRACKER_AC, bonus: statsFor(breakerOf(state).role, breakerOf(state).tier).might },
    });
  });

  it('is not offered to a Breaker that has already spent its Reaction', () => {
    const { state, events } = staged(5, (s) => ({
      ...s,
      units: s.units.map((u) => (u.id === breakerOf(s).id ? { ...u, reactionAvailable: false } : u)),
    }));
    expect(events.some((e) => e.kind === 'crackerParried')).toBe(false);
    expect(events.find((e) => e.kind === 'crackerDetonated')).toMatchObject({ targetId: breakerOf(state).id });
  });

  it('is not offered to a Breaker carrying the ball, whose hands are full', () => {
    const { state, events } = staged(5, (s) => carrying(s, breakerOf(s).id));
    expect(events.some((e) => e.kind === 'crackerParried')).toBe(false);
    expect(events.find((e) => e.kind === 'crackerDetonated')).toMatchObject({ targetId: breakerOf(state).id });
  });

  it('is not offered to any other role', () => {
    const { events } = staged(5, (s) => {
      const breaker = breakerOf(s);
      const striker = s.units.find((u) => u.team === 'B' && u.role === 'striker')!;
      return place(place(s, breaker.id, { x: 0, y: 44 }), striker.id, { x: 12, y: 24 });
    });
    expect(events.some((e) => e.kind === 'crackerParried')).toBe(false);
    expect(events.some((e) => e.kind === 'crackerDetonated')).toBe(true);
  });

  it('is not offered to a Breaker standing on the Cracker when count 20 comes', () => {
    const { state, events } = staged(5, (s) => place(s, breakerOf(s).id, { x: 12, y: 20 }));
    expect(events.some((e) => e.kind === 'crackerParried')).toBe(false);
    expect(events.find((e) => e.kind === 'crackerDetonated')).toMatchObject({
      targetId: breakerOf(state).id,
      at: { x: 12, y: 20 },
    });
  });

  it('cannot be parried a second time once it has been batted back', () => {
    // The Cracker comes in on the diagonal, from (10, 22) to the Breaker at
    // (12, 24), so the arc it is batted back into is south-west, south and
    // west. Every face is lined with the Breaker's own side and the opponent
    // is gone, so the fallback sends it straight back south-west, onto the
    // team's second Breaker three cells down the line. That run is a batted
    // one, not a drift: it goes off on him, no second parry.
    for (let seed = 1; seed < 200; seed++) {
      const { events } = opened((s) => {
        const breakers = s.units.filter((u) => u.team === 'B' && u.role === 'breaker');
        const mates = s.units.filter((u) => u.team === 'B' && u.role === 'striker');
        let state = crackersAt(s, { x: 10, y: 22 }, { x: 0, y: 0 });
        state = place(state, breakers[0]!.id, { x: 12, y: 24 });
        state = place(state, breakers[1]!.id, { x: 9, y: 21 });
        state = place(state, mates[0]!.id, { x: 12, y: 22 });
        state = place(state, mates[1]!.id, { x: 11, y: 24 });
        return ballAt(state, { x: 14, y: 26 });
      }, seed);
      const parried = events.filter((e) => e.kind === 'crackerParried');
      if (parried.length === 0 || (parried[0]!.kind === 'crackerParried' && !parried[0]!.hit)) continue;

      expect(parried).toHaveLength(1);
      expect(parried[0]).toMatchObject({ direction: 6 });
      expect(events.find((e) => e.kind === 'crackerDetonated' && ofOne(e))).toMatchObject({ at: { x: 9, y: 21 } });
      return;
    }
    throw new Error('no seed in range landed the parry');
  });
});

describe('swinging at a Cracker', () => {
  /** The acting player one cell west of a live Cracker, with an enemy down the line. */
  function staged(seed = 5): MatchState {
    const { state } = opened((s) => s, seed);
    const actor = state.units.find((u) => u.id === state.turn!.unitId)!;
    const enemy = state.units.find((u) => u.team !== actor.team)!;

    const placed = place(place(state, actor.id, { x: 5, y: 22 }), enemy.id, { x: 9, y: 22 });
    return crackersAt(placed, { x: 6, y: 22 }, { x: 0, y: 0 });
  }

  it('is offered by the one generator, and accepted by the engine', () => {
    const state = staged();
    const legal = legalActions(arena, state)!;

    expect(legal.batCracker).toHaveLength(1);
    expect(legal.batCracker[0]!.crackerId).toBe('cracker-1');
    expect(legal.batCracker[0]!.directions).toHaveLength(8);

    const result = run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: EAST });
    expect(result.ok).toBe(true);
  });

  it('sends it down the chosen line and off on the first player it meets', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { events } = must(staged(seed), {
        kind: 'batCracker',
        crackerId: 'cracker-1',
        direction: EAST,
      });
      if (!events.some((e) => e.kind === 'crackerBatted' && e.hit)) continue;

      expect(events.find((e) => e.kind === 'crackerDetonated')).toMatchObject({
        at: { x: 9, y: 22 },
      });
      return;
    }
    throw new Error('no seed in range landed the swing');
  });

  it('leaves the Cracker where it lies on a miss, still live', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { state, events } = must(staged(seed), {
        kind: 'batCracker',
        crackerId: 'cracker-1',
        direction: EAST,
      });
      if (!events.some((e) => e.kind === 'crackerBatted' && !e.hit)) continue;

      const cracker = state.crackers.find((c) => c.id === 'cracker-1')!;
      expect(cracker.state).toBe('live');
      expect({ x: cracker.x, y: cracker.y }).toEqual({ x: 6, y: 22 });
      expect(events.some((e) => e.kind === 'crackerDetonated')).toBe(false);
      return;
    }
    throw new Error('no seed in range missed the swing');
  });

  it('recoils the swinger clear of the charge, hit or miss', () => {
    const state = staged();
    const actorId = state.turn!.unitId;
    const { state: after } = must(state, {
      kind: 'batCracker',
      crackerId: 'cracker-1',
      direction: EAST,
    });

    const swinger = after.units.find((u) => u.id === actorId)!;
    expect({ x: swinger.x, y: swinger.y }).toEqual({ x: 3, y: 22 });
  });

  it('offers only the lines whose first cell is open, and refuses the rest', () => {
    // The actor beside a Cracker that has the pillar (7, 16) directly north of it.
    const board = staged();
    const actorId = board.turn!.unitId;
    const state = crackersAt(place(board, actorId, { x: 6, y: 14 }), { x: 7, y: 15 }, { x: 0, y: 0 });

    const legal = legalActions(arena, state)!;
    expect(legal.batCracker[0]!.directions).not.toContain(1);

    const result = run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: 1 });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/obstacle/);

    // South, into the open, is accepted.
    expect(run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: 5 }).ok).toBe(true);
  });

  it('refuses a line whose first cell is off the pitch', () => {
    const board = staged();
    const actorId = board.turn!.unitId;
    const state = crackersAt(place(board, actorId, { x: 1, y: 10 }), { x: 0, y: 10 }, { x: 0, y: 0 });

    const result = run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: WEST });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/obstacle/);
  });

  it('refuses a swing at a Cracker out of reach', () => {
    const state = crackersAt(staged(), { x: 12, y: 22 }, { x: 0, y: 0 });
    const result = run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: EAST });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/reach/);
  });

  it('refuses a swing at a spent Cracker', () => {
    const board = staged();
    const state: MatchState = {
      ...board,
      crackers: board.crackers.map((c) =>
        c.id === 'cracker-1' ? { ...c, state: 'destroyed' as const, respawnOnRound: 2 } : c,
      ),
    };

    const result = run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: EAST });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/spent/);
  });

  it('refuses a direction that is not one of the eight', () => {
    const result = run(staged(), { kind: 'batCracker', crackerId: 'cracker-1', direction: 9 });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/directions/);
  });

  it('refuses the swing to a player carrying the Payload', () => {
    const board = staged();
    const actorId = board.turn!.unitId;
    const state: MatchState = {
      ...board,
      units: board.units.map((u) => (u.id === actorId ? { ...u, holdingPayload: true } : u)),
      payload: { carriedBy: actorId, x: 5, y: 22 },
    };

    const result = run(state, { kind: 'batCracker', crackerId: 'cracker-1', direction: WEST });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/Payload/);
  });

  it('costs the Action, so a swing and a Dash cannot share a turn', () => {
    const { state } = must(staged(), {
      kind: 'batCracker',
      crackerId: 'cracker-1',
      direction: EAST,
    });

    expect(state.turn!.actionUsed).toBe(true);
    expect(run(state, { kind: 'dash' }).ok).toBe(false);
  });
});

// -- The Spark --------------------------------------------------------------

describe('where the Spark drops in', () => {
  it('picks an open cell of the middle third, clear of everyone', () => {
    const state = opened().state;
    const cell = sparkEntryCell(arena, state, new Rng(7));

    expect(thirdOf(cell)).toBe(SPARK_SPAWN_THIRD);
    expect(arena.isOccupiable(cell)).toBe(true);
    for (const unit of state.units.filter((u) => u.status === 'active')) {
      expect(distance(cell, unit)).toBeGreaterThanOrEqual(SPARK_SPAWN_MIN_DISTANCE);
    }
  });

  it('never drops into an obstacle, whatever the dice say', () => {
    const state = opened().state;
    for (let seed = 1; seed < 200; seed++) {
      const cell = sparkEntryCell(arena, state, new Rng(seed));
      expect(arena.isOccupiable(cell), `seed ${seed}: ${cell.x},${cell.y}`).toBe(true);
      expect(thirdOf(cell)).toBe(SPARK_SPAWN_THIRD);
    }
  });

  it('gives ground rather than stalling when no cell is clear enough', () => {
    // Nine players on a grid put every cell of the middle third within three of
    // somebody, which is the only case the fallback exists for.
    const grid: Point[] = [];
    for (const x of [3, 7, 11]) for (const y of [18, 22, 26]) grid.push({ x, y });

    const start = opened().state;
    const state: MatchState = {
      ...start,
      units: start.units.map((u, i) => ({ ...u, ...grid[i % grid.length]!, status: 'active' as const })),
    };

    const cell = sparkEntryCell(arena, state, new Rng(3));
    const clearance = Math.min(...state.units.map((u) => distance(cell, u)));

    expect(thirdOf(cell)).toBe(SPARK_SPAWN_THIRD);
    expect(arena.isOccupiable(cell)).toBe(true);
    expect(clearance).toBe(SPARK_SPAWN_MIN_DISTANCE - 1);
  });

  it('keeps a dart on the pitch and off the obstacles from a corner, on every heading', () => {
    for (let heading = 1; heading <= 8; heading++) {
      const run = sparkRun(arena, { x: 1, y: 43 }, heading);
      expect(run.path).toHaveLength(SPARK_MOVE_CELLS);
      for (const cell of run.path) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(ARENA_WIDTH);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeLessThan(ARENA_HEIGHT);
        expect(arena.isSolid(cell)).toBe(false);
      }
    }
  });

  it('never enters an obstacle from any open cell on any heading, and never loses a step', () => {
    for (const from of arena.occupiableCells()) {
      for (let heading = 1; heading <= 8; heading++) {
        const run = sparkRun(arena, from, heading);
        expect(run.path, `from ${from.x},${from.y} heading ${heading}`).toHaveLength(
          SPARK_MOVE_CELLS,
        );
        for (const cell of run.path) expect(arena.isSolid(cell)).toBe(false);
      }
    }
  });

  it('travels on the heading it was given and hands back the one it leaves on', () => {
    // Due south down column 3, which is open from y = 22 to y = 16: nothing in
    // the way, so the heading is unchanged and the landing is exactly six cells
    // on. That is what makes it readable.
    const clear = sparkRun(arena, { x: 3, y: 22 }, 5);
    expect(clear.direction).toBe(5);
    expect(clear.heading).toBe(5);
    expect(clear.landing).toEqual({ x: 3, y: 22 - SPARK_MOVE_CELLS });

    // Due east into the east wall: it comes back, and it comes back west.
    const bounced = sparkRun(arena, { x: ARENA_WIDTH - 2, y: 20 }, 3);
    expect(bounced.direction).toBe(3);
    expect(bounced.heading).toBe(7);
    expect(bounced.path[0]).toEqual({ x: ARENA_WIDTH - 1, y: 20 });
    expect(bounced.landing).toEqual({ x: ARENA_WIDTH - 1 - (SPARK_MOVE_CELLS - 1), y: 20 });
  });

  it('bounces off an obstacle and comes back down the line it went up', () => {
    // North from (7, 13): (7, 14), (7, 15), then the pillar at (7, 16) turns it
    // round for the other four cells.
    const run = sparkRun(arena, { x: 7, y: 13 }, 1);

    expect(run.direction).toBe(1);
    expect(run.path).toEqual([
      { x: 7, y: 14 },
      { x: 7, y: 15 },
      { x: 7, y: 14 },
      { x: 7, y: 13 },
      { x: 7, y: 12 },
      { x: 7, y: 11 },
    ]);
    expect(run.landing).toEqual({ x: 7, y: 11 });
    expect(run.heading).toBe(5);
  });

  it('bounces off the edge of the pitch at the end wall', () => {
    // North up column 1 to y = 44, then back down it.
    const run = sparkRun(arena, { x: 1, y: 43 }, 1);

    expect(run.path[0]).toEqual({ x: 1, y: 44 });
    expect(run.path[1]).toEqual({ x: 1, y: 43 });
    expect(run.landing).toEqual({ x: 1, y: 39 });
    expect(run.heading).toBe(5);
  });

  it('throws no dice, so the same heading gives the same run every time', () => {
    const once = sparkRun(arena, { x: 3, y: 12 }, 2);
    const twice = sparkRun(arena, { x: 3, y: 12 }, 2);
    expect(twice).toEqual(once);
  });
});

describe('the Spark in a match', () => {
  it('stays off the field and off the ladder until round 6', () => {
    const before = until(opened().state, (s) => s.round === SPARK_ENTRY_ROUND - 1);

    expect(before.spark.state).toBe('pending');
    expect(before.turnOrder.some((slot) => slot.actor.kind === 'spark')).toBe(false);
  });

  it('arrives at the top of round 6 and takes the first rung', () => {
    const arrived = until(opened().state, (s) => s.round === SPARK_ENTRY_ROUND);

    expect(arrived.spark.state).toBe('live');
    expect(arrived.spark.heading).toBeGreaterThanOrEqual(1);
    expect(arrived.spark.heading).toBeLessThanOrEqual(8);
    expect(thirdOf(arrived.spark)).toBe(SPARK_SPAWN_THIRD);
    expect(arena.isOccupiable(arrived.spark)).toBe(true);
    expect(arrived.turnOrder[0]!.actor.kind).toBe('spark');
  });

  it('darts on its own rung once it is in play', () => {
    let state = until(opened().state, (s) => s.round === SPARK_ENTRY_ROUND);
    let moved: MatchEvent | undefined;

    for (let i = 0; i < 200 && !moved; i++) {
      const step = must(state, { kind: 'endTurn' });
      state = step.state;
      moved = step.events.find((e) => e.kind === 'sparkMoved');
    }

    expect(moved).toBeDefined();
    expect({ x: state.spark.x, y: state.spark.y }).toEqual((moved as { to: Point }).to);
  });

  it('carries its heading from one dart to the next unless a wall turns it', () => {
    let state = until(opened().state, (s) => s.round === SPARK_ENTRY_ROUND);
    const darts: { direction: number; headingAfter: number }[] = [];

    for (let i = 0; i < 4000 && darts.length < 3; i++) {
      const step = must(state, { kind: 'endTurn' });
      state = step.state;
      const moved = step.events.find((e) => e.kind === 'sparkMoved');
      if (moved) darts.push({ direction: moved.direction, headingAfter: state.spark.heading! });
    }

    expect(darts).toHaveLength(3);
    // Every dart leaves on the heading the next one travels on. A reroll every
    // round is exactly what this rules out.
    expect(darts[1]!.direction).toBe(darts[0]!.headingAfter);
    expect(darts[2]!.direction).toBe(darts[1]!.headingAfter);
  });
});

describe('catching the Spark', () => {
  /** The acting player standing in the Spark's own cell, Action in hand. */
  function staged(seed = 5): MatchState {
    const { state } = opened((s) => s, seed);
    const actor = state.units.find((u) => u.id === state.turn!.unitId)!;
    return { ...state, spark: { state: 'live', x: actor.x, y: actor.y, heading: 1 } };
  }

  it('is offered from the Spark cell and nowhere else', () => {
    const here = staged();
    expect(legalActions(arena, here)!.catchSpark).not.toBeNull();
    expect(legalActions(arena, here)!.simple).toContainEqual({ kind: 'catchSpark' });

    const elsewhere: MatchState = { ...here, spark: { state: 'live', x: 7, y: 15, heading: 1 } };
    expect(legalActions(arena, elsewhere)!.catchSpark).toBeNull();

    const result = run(elsewhere, { kind: 'catchSpark' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/this cell/);
  });

  it('refuses the reach while the Spark is off the field', () => {
    const result = run(opened().state, { kind: 'catchSpark' });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not on the field/);
  });

  it('scores its points and leaves the match running', () => {
    for (let seed = 1; seed < 400; seed++) {
      const state = staged(seed);
      const actor = state.units.find((u) => u.id === state.turn!.unitId)!;
      const { state: after, events } = must(state, { kind: 'catchSpark' });
      if (!events.some((e) => e.kind === 'sparkCaught' && e.caught)) continue;

      expect(after.score[actor.team]).toBe(SPARK_POINTS);
      expect(after.spark.state).toBe('pending');
      // The whole of what changed in lot 3: no whistle. There is still a
      // Payload on the field and rounds left to play it in.
      expect(after.phase).toBe('playing');
      expect(after.result).toBeNull();
      expect(events.some((e) => e.kind === 'matchEnded')).toBe(false);
      return;
    }
    throw new Error('no seed in range caught the Spark');
  });

  it('ends the match anyway when it is caught in sudden death', () => {
    for (let seed = 1; seed < 400; seed++) {
      const state: MatchState = { ...staged(seed), phase: 'suddenDeath' };
      const actor = state.units.find((u) => u.id === state.turn!.unitId)!;
      const { state: after, events } = must(state, { kind: 'catchSpark' });
      if (!events.some((e) => e.kind === 'sparkCaught' && e.caught)) continue;

      expect(after.phase).toBe('finished');
      expect(after.result).toEqual({ winner: actor.team });
      expect(events.some((e) => e.kind === 'matchEnded')).toBe(true);
      return;
    }
    throw new Error('no seed in range caught the Spark');
  });

  it('drops back in at the top of the next round, worth as much again (écart 50)', () => {
    for (let seed = 1; seed < 400; seed++) {
      const state = { ...staged(seed), round: SPARK_ENTRY_ROUND };
      const actor = state.units.find((u) => u.id === state.turn!.unitId)!;
      const { state: after, events } = must(state, { kind: 'catchSpark' });
      if (!events.some((e) => e.kind === 'sparkCaught' && e.caught)) continue;

      // Off the field and off the ladder for the rest of this round.
      expect(after.spark.state).toBe('pending');
      const rest = until(after, (s) => s.round === after.round + 1);
      expect(rest.spark.state).toBe('live');
      expect(thirdOf(rest.spark)).toBe(SPARK_SPAWN_THIRD);
      expect(rest.turnOrder[0]!.actor.kind).toBe('spark');

      // And a second catch scores again: the prize is not a once-only.
      const again: MatchState = {
        ...rest,
        spark: { ...rest.spark, x: unitById(rest, rest.turn!.unitId).x, y: unitById(rest, rest.turn!.unitId).y },
      };
      for (let s = 1; s < 400; s++) {
        const twice = must({ ...again, rngSeed: s }, { kind: 'catchSpark' });
        if (!twice.events.some((e) => e.kind === 'sparkCaught' && e.caught)) continue;
        const scorer = unitById(rest, rest.turn!.unitId);
        const expected = (scorer.team === actor.team ? SPARK_POINTS : 0) + SPARK_POINTS;
        expect(twice.state.score[scorer.team]).toBe(expected);
        return;
      }
      throw new Error('no seed in range caught the Spark a second time');
    }
    throw new Error('no seed in range caught the Spark');
  });

  it('skips a cell away at the end of a turn finished standing on it (écart 49)', () => {
    // Fumbled, then the turn ends: the Spark is no longer under the minder.
    for (let seed = 1; seed < 400; seed++) {
      const state = staged(seed);
      const actor = state.units.find((u) => u.id === state.turn!.unitId)!;
      const { state: fumbled, events } = must(state, { kind: 'catchSpark' });
      if (!events.some((e) => e.kind === 'sparkCaught' && !e.caught)) continue;

      const ended = must(fumbled, { kind: 'endTurn' });
      const escape = ended.events.find((e) => e.kind === 'sparkMoved' && e.cause === 'escape');
      expect(escape).toBeDefined();
      if (!escape || escape.kind !== 'sparkMoved') throw new Error('unreachable');
      expect(escape.from).toEqual({ x: actor.x, y: actor.y });
      expect(escape.path).toEqual([escape.to]);
      expect(distance(escape.from, escape.to)).toBe(1);
      expect(arena.isOccupiable(escape.to)).toBe(true);
      expect(unitAt(ended.state, escape.to.x, escape.to.y)).toBeUndefined();
      // The heading is kept: a nudge, not a new drift.
      expect(ended.state.spark.heading).toBe(fumbled.spark.heading);
      return;
    }
    throw new Error('no seed in range fumbled the Spark');
  });

  it('skips away even when the minder never reached for it', () => {
    const state = staged();
    const actor = state.units.find((u) => u.id === state.turn!.unitId)!;
    const ended = must(state, { kind: 'endTurn' });
    const escape = ended.events.find((e) => e.kind === 'sparkMoved' && e.cause === 'escape');
    expect(escape).toBeDefined();
    expect({ x: ended.state.spark.x, y: ended.state.spark.y }).not.toEqual({ x: actor.x, y: actor.y });
  });

  it('stays where it is when a turn ends anywhere else', () => {
    const state = staged();
    const away: MatchState = { ...state, spark: { ...state.spark, x: 7, y: 20 } };
    const ended = must(away, { kind: 'endTurn' });
    expect(ended.events.some((e) => e.kind === 'sparkMoved' && e.cause === 'escape')).toBe(false);
  });

  it('spends the Action and leaves the Spark in play on a fumble', () => {
    for (let seed = 1; seed < 400; seed++) {
      const { state, events } = must(staged(seed), { kind: 'catchSpark' });
      if (!events.some((e) => e.kind === 'sparkCaught' && !e.caught)) continue;

      expect(state.phase).toBe('playing');
      expect(state.spark.state).toBe('live');
      expect(state.turn!.actionUsed).toBe(true);
      return;
    }
    throw new Error('no seed in range fumbled the Spark');
  });
});
