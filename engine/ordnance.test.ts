import { describe, expect, it } from 'vitest';

import type { Action } from './actions.js';
import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  CRACKER_DAMAGE_DICE,
  CRACKER_DAMAGE_DIE,
  CRACKER_MOVE_CELLS,
  SPARK_ENTRY_ROUND,
  SPARK_MOVE_CELLS,
  SPARK_POINTS,
  SPARK_SPAWN_MIN_DISTANCE,
  SPARK_SPAWN_ZONE,
} from './constants.js';
import type { MatchEvent } from './events.js';
import { distance, zoneOf, type Point } from './geometry.js';
import { legalActions } from './legalActions.js';
import { openMatch, reduce, type ReduceResult } from './reduce.js';
import { Rng } from './rng.js';
import { battedCrackerRun, crackerRun, sparkEntryCell, sparkRun } from './rules/ordnance.js';
import { createMatch } from './setup.js';
import type { MatchState, TeamId, Unit, UnitId } from './types.js';

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

/** Everyone in one corner, so a test places only the players it cares about. */
function cleared(state: MatchState): MatchState {
  return { ...state, units: state.units.map((u) => ({ ...u, ...CORNER })) };
}

/**
 * A cleared match, patched, then opened.
 *
 * `openMatch` walks the ladder from the top, which means it resolves count 20.
 * Patching the board before opening it is therefore how a test drives the
 * Crackers without hand-rolling a round.
 */
function opened(
  patch: (s: MatchState) => MatchState = (s) => s,
  seed = 5,
): { state: MatchState; events: readonly MatchEvent[] } {
  return openMatch(arena, patch(cleared(fresh(seed))));
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

// -- The homing rule, on its own --------------------------------------------

describe('a Cracker on count 20', () => {
  it('walks to the nearest player and goes off on them', () => {
    const { state, target } = loneTarget({ x: 7, y: 25 });
    const outcome = crackerRun(state, { x: 7, y: 22 }, new Rng(1));

    expect(outcome.struck?.id).toBe(target.id);
    expect(outcome.landing).toEqual({ x: 7, y: 25 });
    expect(outcome.path).toHaveLength(3);
  });

  it('goes off on the first player it crosses, not on the one it was aiming at', () => {
    const board = cleared(fresh());
    const aimedAt = someone(board, 'B');
    const bystander = someone(board, 'A');
    const state = place(place(board, aimedAt.id, { x: 7, y: 27 }), bystander.id, { x: 7, y: 24 });

    const outcome = crackerRun(state, { x: 7, y: 22 }, new Rng(1));

    expect(outcome.struck?.id).toBe(bystander.id);
    expect(outcome.landing).toEqual({ x: 7, y: 24 });
  });

  it('covers six cells and no more, and hurts nobody when it falls short', () => {
    const { state } = loneTarget({ x: 7, y: 40 });
    const outcome = crackerRun(state, { x: 7, y: 22 }, new Rng(1));

    expect(outcome.struck).toBeNull();
    expect(outcome.path).toHaveLength(CRACKER_MOVE_CELLS);
    expect(outcome.landing).toEqual({ x: 7, y: 28 });
  });

  it('goes off where it lies when a player is standing on it', () => {
    const { state, target } = loneTarget({ x: 7, y: 22 });
    const outcome = crackerRun(state, { x: 7, y: 22 }, new Rng(1));

    expect(outcome.struck?.id).toBe(target.id);
    expect(outcome.path).toHaveLength(0);
    expect(outcome.landing).toEqual({ x: 7, y: 22 });
  });

  it('ignores terrain, and flies through a catwalk to reach someone', () => {
    // Row 18 is the catwalk on team A's side of the halfway line.
    expect(arena.isSolid({ x: 3, y: 18 })).toBe(true);

    const { state } = loneTarget({ x: 3, y: 16 });
    const outcome = crackerRun(state, { x: 1, y: 20 }, new Rng(1));

    expect(outcome.struck).not.toBeNull();
    expect(outcome.path).toContainEqual({ x: 3, y: 18 });
  });
});

describe('a batted Cracker', () => {
  it('goes off on the first player down the chosen line', () => {
    const { state, target } = loneTarget({ x: 9, y: 22 });
    const outcome = battedCrackerRun(state, { x: 6, y: 22 }, EAST);

    expect(outcome.struck?.id).toBe(target.id);
    expect(outcome.landing).toEqual({ x: 9, y: 22 });
  });

  it('stops at the wall rather than bouncing when it meets nobody', () => {
    const outcome = battedCrackerRun(cleared(fresh()), { x: 6, y: 22 }, EAST);

    expect(outcome.struck).toBeNull();
    expect(outcome.landing).toEqual({ x: 14, y: 22 });
  });
});

// -- The Crackers through the engine ----------------------------------------

/** Both Crackers on the kick-off cell, and one victim three cells above them. */
function homingOnOne(state: MatchState, secondCracker: Point = { x: 7, y: 22 }): MatchState {
  return place(
    crackersAt(state, { x: 7, y: 22 }, secondCracker),
    someone(state, 'B').id,
    { x: 7, y: 25 },
  );
}

describe('the Crackers on the ladder', () => {
  it('resolves them at the top of the round, before anyone takes a turn', () => {
    const { events } = opened((s) => homingOnOne(s));

    const moved = events.findIndex((e) => e.kind === 'crackerMoved');
    const firstTurn = events.findIndex((e) => e.kind === 'turnStarted');

    expect(moved).toBeGreaterThan(-1);
    expect(moved).toBeLessThan(firstTurn);
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

    expect(seen).toMatchObject({ at: KILL_SILO.ordnanceStart, round: 2 });
    expect(current.crackers.find((c) => c.id === crackerId)!.state).toBe('live');
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
  it('picks a cell of The Scramble, clear of everyone', () => {
    const state = opened().state;
    const cell = sparkEntryCell(arena, state, new Rng(7));

    expect(zoneOf(cell)).toBe(SPARK_SPAWN_ZONE);
    expect(arena.isOccupiable(cell)).toBe(true);
    for (const unit of state.units.filter((u) => u.status === 'active')) {
      expect(distance(cell, unit)).toBeGreaterThanOrEqual(SPARK_SPAWN_MIN_DISTANCE);
    }
  });

  it('gives ground rather than stalling when no cell is clear enough', () => {
    // Nine players on a grid put every cell of The Scramble within three of
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

    expect(zoneOf(cell)).toBe(SPARK_SPAWN_ZONE);
    expect(clearance).toBe(SPARK_SPAWN_MIN_DISTANCE - 1);
  });

  it('keeps a dart inside the silo from a corner, on every heading', () => {
    for (let heading = 1; heading <= 8; heading++) {
      const run = sparkRun({ x: 1, y: 43 }, heading);
      expect(run.path).toHaveLength(SPARK_MOVE_CELLS);
      for (const cell of run.path) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(ARENA_WIDTH);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeLessThan(ARENA_HEIGHT);
      }
    }
  });

  it('travels on the heading it was given and hands back the one it leaves on', () => {
    // Due south from mid-field: nothing in the way, so the heading is unchanged
    // and the landing is exactly six cells on. That is what makes it readable.
    const clear = sparkRun({ x: 7, y: 22 }, 5);
    expect(clear.direction).toBe(5);
    expect(clear.heading).toBe(5);
    expect(clear.landing).toEqual({ x: 7, y: 22 - SPARK_MOVE_CELLS });

    // Due east into the east wall: it comes back, and it comes back west.
    const bounced = sparkRun({ x: ARENA_WIDTH - 2, y: 22 }, 3);
    expect(bounced.direction).toBe(3);
    expect(bounced.heading).toBe(7);
  });

  it('throws no dice, so the same heading gives the same run every time', () => {
    const once = sparkRun({ x: 3, y: 12 }, 2);
    const twice = sparkRun({ x: 3, y: 12 }, 2);
    expect(twice).toEqual(once);
  });
});

describe('the Spark in a match', () => {
  it('stays off the field and off the ladder until round 6', () => {
    const before = until(opened().state, (s) => s.round === SPARK_ENTRY_ROUND - 1);

    expect(before.spark.state).toBe('pending');
    expect(before.turnOrder.some((slot) => slot.actor.kind === 'spark')).toBe(false);
  });

  it('arrives at the top of round 6 and takes its rung on count 10', () => {
    const arrived = until(opened().state, (s) => s.round === SPARK_ENTRY_ROUND);

    expect(arrived.spark.state).toBe('live');
    expect(arrived.spark.heading).toBeGreaterThanOrEqual(1);
    expect(arrived.spark.heading).toBeLessThanOrEqual(8);
    expect(zoneOf(arrived.spark)).toBe(SPARK_SPAWN_ZONE);
    expect(arrived.turnOrder.find((slot) => slot.actor.kind === 'spark')?.count).toBe(10);
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
      expect(after.spark.state).toBe('caught');
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

  it('is gone for good and does not drop back in at the top of a round', () => {
    for (let seed = 1; seed < 400; seed++) {
      const state = staged(seed);
      const { state: after, events } = must(state, { kind: 'catchSpark' });
      if (!events.some((e) => e.kind === 'sparkCaught' && e.caught)) continue;

      const later = until(after, (s) => s.round >= after.round + 2);
      expect(later.spark.state).toBe('caught');
      expect(later.turnOrder.some((slot) => slot.actor.kind === 'spark')).toBe(false);
      return;
    }
    throw new Error('no seed in range caught the Spark');
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
