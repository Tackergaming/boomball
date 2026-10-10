import { describe, expect, it } from 'vitest';

import type { Action } from './actions.js';
import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import type { MatchEvent } from './events.js';
import { lineTo, type Point } from './geometry.js';
import { openMatch, reduce, type ReduceResult } from './reduce.js';
import { opportunityAttackers, passInterceptors, provokedAlong } from './rules/reactions.js';
import { createMatch } from './setup.js';
import type { Role } from './stats.js';
import type { MatchState, Unit, UnitId } from './types.js';

const arena = new Arena(KILL_SILO);

/** The far top corner, where every player not under test is parked. */
const CORNER: Point = { x: 0, y: 44 };

function board(seed = 5): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  return openMatch(arena, { ...created, units: created.units.map((u) => ({ ...u, ...CORNER })) })
    .state;
}

function actorOf(state: MatchState): Unit {
  return state.units.find((u) => u.id === state.turn!.unitId)!;
}

function enemyOf(state: MatchState, actor: Unit, role: Role): Unit {
  return state.units.find((u) => u.team !== actor.team && u.role === role)!;
}

function mateOf(state: MatchState, actor: Unit): Unit {
  return state.units.find((u) => u.team === actor.team && u.id !== actor.id)!;
}

function put(state: MatchState, id: UnitId, at: Point, extra: Partial<Unit> = {}): MatchState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

function run(state: MatchState, action: Action): ReduceResult {
  return reduce(arena, state, { unitId: state.turn!.unitId, action });
}

function must(state: MatchState, action: Action) {
  const result = run(state, action);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result;
}

function straight(from: Point, to: Point): Point[] {
  return lineTo(from, to);
}

// -- Who may react, on its own ----------------------------------------------

describe('who an opportunity attack is drawn from', () => {
  it('names the opponent whose reach the mover walks out of', () => {
    const state = board();
    const mover = actorOf(state);
    const watcher = enemyOf(state, mover, 'breaker');
    const staged = put(put(state, mover.id, { x: 5, y: 22 }), watcher.id, { x: 6, y: 22 });

    const drawn = opportunityAttackers(staged, mover, { x: 5, y: 22 }, { x: 4, y: 22 });
    expect(drawn.map((u) => u.id)).toEqual([watcher.id]);
  });

  it('names nobody when the mover stays inside the reach', () => {
    const state = board();
    const mover = actorOf(state);
    const watcher = enemyOf(state, mover, 'breaker');
    const staged = put(put(state, mover.id, { x: 5, y: 22 }), watcher.id, { x: 6, y: 22 });

    expect(opportunityAttackers(staged, mover, { x: 5, y: 22 }, { x: 5, y: 23 })).toHaveLength(0);
  });

  it('names nobody for a team-mate, whatever the blood-truce costs them', () => {
    const state = board();
    const mover = actorOf(state);
    const mate = mateOf(state, mover);
    const staged = put(put(state, mover.id, { x: 5, y: 22 }), mate.id, { x: 6, y: 22 });

    expect(opportunityAttackers(staged, mover, { x: 5, y: 22 }, { x: 4, y: 22 })).toHaveLength(0);
  });

  it('does not name an opponent beside the thrower who is off the line', () => {
    const state = board();
    const thrower = actorOf(state);
    const neighbour = enemyOf(state, thrower, 'striker');
    const flight = straight({ x: 5, y: 22 }, { x: 11, y: 22 });

    // (5, 21) touches the first cell (6, 22) but is two from (7, 22) onward.
    for (const at of [
      { x: 4, y: 21 },
      { x: 5, y: 21 },
    ]) {
      const staged = put(state, neighbour.id, at);
      expect(passInterceptors(arena, staged, thrower, flight), `${at.x},${at.y}`).toHaveLength(0);
    }
  });

  it('still names an opponent beside the first cell when he is beside the second too', () => {
    const state = board();
    const thrower = actorOf(state);
    const near = enemyOf(state, thrower, 'striker');
    // One from (7, 22), the second cell of the flight.
    const staged = put(state, near.id, { x: 6, y: 21 });

    const flight = straight({ x: 5, y: 22 }, { x: 11, y: 22 });
    expect(passInterceptors(arena, staged, thrower, flight).map((u) => u.id)).toEqual([near.id]);
  });

  it('names nobody on a pass to an adjacent team-mate', () => {
    const state = board();
    const thrower = actorOf(state);
    const near = enemyOf(state, thrower, 'striker');
    const other = enemyOf(state, thrower, 'breaker');
    const staged = put(put(state, near.id, { x: 6, y: 21 }), other.id, { x: 5, y: 23 });

    const flight = straight({ x: 5, y: 22 }, { x: 6, y: 22 });
    expect(flight).toHaveLength(1);
    expect(passInterceptors(arena, staged, thrower, flight)).toHaveLength(0);
  });

  it('names nobody who has already spent its Reaction', () => {
    const state = board();
    const mover = actorOf(state);
    const watcher = enemyOf(state, mover, 'breaker');
    const staged = put(put(state, mover.id, { x: 5, y: 22 }), watcher.id, { x: 6, y: 22 }, {
      reactionAvailable: false,
    });

    expect(opportunityAttackers(staged, mover, { x: 5, y: 22 }, { x: 4, y: 22 })).toHaveLength(0);
  });

  it('lists a whole route once per opponent, for a preview', () => {
    const state = board();
    const mover = actorOf(state);
    const watcher = enemyOf(state, mover, 'breaker');
    const staged = put(put(state, mover.id, { x: 5, y: 22 }), watcher.id, { x: 6, y: 22 });

    const route = [
      { x: 4, y: 22 },
      { x: 5, y: 22 },
      { x: 4, y: 22 },
    ];
    const seen = provokedAlong(staged, staged.units.find((u) => u.id === mover.id)!, route);

    expect(seen.map((u) => u.id)).toEqual([watcher.id]);
  });
});

describe('who may snatch a pass', () => {
  it('names an opponent beside the lane, in the order the ball reaches them', () => {
    const state = board();
    const thrower = actorOf(state);
    const near = enemyOf(state, thrower, 'striker');
    const far = enemyOf(state, thrower, 'breaker');

    const staged = put(put(state, near.id, { x: 7, y: 21 }), far.id, { x: 10, y: 23 });
    const flight = straight({ x: 5, y: 22 }, { x: 11, y: 22 });

    const thieves = passInterceptors(arena, staged, thrower, flight);
    expect(thieves.map((u) => u.id)).toEqual([near.id, far.id]);
  });

  it('names an opponent the ball flies straight through', () => {
    const state = board();
    const thrower = actorOf(state);
    const onLine = enemyOf(state, thrower, 'striker');
    const staged = put(state, onLine.id, { x: 8, y: 22 });

    const flight = straight({ x: 5, y: 22 }, { x: 11, y: 22 });
    expect(passInterceptors(arena, staged, thrower, flight).map((u) => u.id)).toEqual([onLine.id]);
  });

  it('leaves the goalkeeper out of it while it is guarding its Furnace', () => {
    const state = board();
    const thrower = actorOf(state);
    const keeper = enemyOf(state, thrower, 'bulwark');
    // On its line: one cell under the hatch in the middle of the roof.
    const staged = put(state, keeper.id, { x: 7, y: 43 });

    const flight = straight({ x: 5, y: 42 }, { x: 9, y: 42 });
    expect(passInterceptors(arena, staged, thrower, flight)).toHaveLength(0);
  });

  it('lets the same goalkeeper chase a pass once it has left its Furnace', () => {
    const state = board();
    const thrower = actorOf(state);
    const keeper = enemyOf(state, thrower, 'bulwark');
    const staged = put(state, keeper.id, { x: 12, y: 30 });

    const flight = straight({ x: 10, y: 30 }, { x: 14, y: 30 });
    expect(passInterceptors(arena, staged, thrower, flight).map((u) => u.id)).toEqual([keeper.id]);
  });

  it('names nobody who has already spent its Reaction', () => {
    const state = board();
    const thrower = actorOf(state);
    const near = enemyOf(state, thrower, 'striker');
    const staged = put(state, near.id, { x: 7, y: 21 }, { reactionAvailable: false });

    const flight = straight({ x: 5, y: 22 }, { x: 11, y: 22 });
    expect(passInterceptors(arena, staged, thrower, flight)).toHaveLength(0);
  });

  describe('when the flight clips an obstacle', () => {
    // (5, 14) to (9, 16) walks (6, 15), (7, 16), (8, 16), (9, 16), and (7, 16)
    // is the central pillar: the ball does not pass through a crate, so a
    // defender who is beside nothing but that cell has nothing to snatch.
    const flight = straight({ x: 5, y: 14 }, { x: 9, y: 16 });

    it('walks through the pillar on this line, which is what the test relies on', () => {
      expect(flight).toContainEqual({ x: 7, y: 16 });
      expect(arena.isSolid({ x: 7, y: 16 })).toBe(true);
    });

    it('does not count an enemy who is beside the obstacle cell only', () => {
      const state = board();
      const thrower = actorOf(state);
      const lurker = enemyOf(state, thrower, 'striker');
      // One from (7, 16) and two from every open cell of the flight.
      const staged = put(state, lurker.id, { x: 6, y: 17 });

      expect(passInterceptors(arena, staged, thrower, flight)).toHaveLength(0);
    });

    it('does count the same enemy once it is beside an open cell of the flight', () => {
      const state = board();
      const thrower = actorOf(state);
      const lurker = enemyOf(state, thrower, 'striker');
      // One from (8, 16), which is open floor and past the first cell of the
      // flight: écart 48 leaves the cell beside the thrower out of it.
      const staged = put(state, lurker.id, { x: 9, y: 17 });

      expect(passInterceptors(arena, staged, thrower, flight).map((u) => u.id)).toEqual([
        lurker.id,
      ]);
    });
  });
});

// -- Through the engine ------------------------------------------------------

describe('an opportunity attack in a match', () => {
  /** The acting player about to walk out of a Breaker's reach, westward. */
  function staged(seed = 5, mover: Point = { x: 5, y: 22 }, watcher: Point = { x: 6, y: 22 }) {
    const state = board(seed);
    const actor = actorOf(state);
    const enemy = enemyOf(state, actor, 'breaker');
    return {
      state: put(put(state, actor.id, mover), enemy.id, watcher),
      actorId: actor.id,
      watcherId: enemy.id,
    };
  }

  it('swings when the mover leaves the reach, and spends the Reaction', () => {
    const { state, watcherId } = staged();
    const { state: after, events } = must(state, { kind: 'move', path: [{ x: 4, y: 22 }] });

    expect(events.some((e) => e.kind === 'opportunityAttacked')).toBe(true);
    expect(after.units.find((u) => u.id === watcherId)!.reactionAvailable).toBe(false);
  });

  it('does not swing at a mover that stays in reach', () => {
    const { state, watcherId } = staged();
    const { state: after, events } = must(state, { kind: 'move', path: [{ x: 5, y: 23 }] });

    expect(events.some((e) => e.kind === 'opportunityAttacked')).toBe(false);
    expect(after.units.find((u) => u.id === watcherId)!.reactionAvailable).toBe(true);
  });

  it('is bought off entirely by Disengage', () => {
    const { state, watcherId } = staged();
    const disengaged = must(state, { kind: 'disengage' }).state;
    const { state: after, events } = must(disengaged, { kind: 'move', path: [{ x: 4, y: 22 }] });

    expect(events.some((e) => e.kind === 'opportunityAttacked')).toBe(false);
    expect(after.units.find((u) => u.id === watcherId)!.reactionAvailable).toBe(true);
  });

  it('recoils the swinger, exactly as a swing on its own turn would', () => {
    const { state, watcherId } = staged();
    const { state: after, events } = must(state, { kind: 'move', path: [{ x: 4, y: 22 }] });

    const swinger = after.units.find((u) => u.id === watcherId)!;
    expect(events.some((e) => e.kind === 'recoiled' && e.unitId === watcherId)).toBe(true);
    // Two cells east, away from the cell the mover was struck on.
    expect({ x: swinger.x, y: swinger.y }).toEqual({ x: 8, y: 22 });
  });

  it('is always taken, wherever the recoil would send the swinger', () => {
    // Nothing is weighed any more: a watcher with a Reaction swings. Three
    // landings, from open floor to a recoil that cannot move at all.
    const cases: { name: string; mover: Point; step: Point; watcher: Point; lands: Point }[] = [
      {
        name: 'in the open',
        mover: { x: 5, y: 22 },
        step: { x: 4, y: 22 },
        watcher: { x: 6, y: 22 },
        lands: { x: 8, y: 22 },
      },
      {
        // (9, 17) has the cover (9, 18) directly above it.
        name: 'beside an obstacle',
        mover: { x: 6, y: 17 },
        step: { x: 5, y: 17 },
        watcher: { x: 7, y: 17 },
        lands: { x: 9, y: 17 },
      },
      {
        // The cover (5, 18) is the very first cell the recoil would enter.
        name: 'with an obstacle at its back',
        mover: { x: 7, y: 18 },
        step: { x: 8, y: 18 },
        watcher: { x: 6, y: 18 },
        lands: { x: 6, y: 18 },
      },
    ];

    for (const c of cases) {
      const { state, watcherId } = staged(5, c.mover, c.watcher);
      const { state: after, events } = must(state, { kind: 'move', path: [c.step] });

      expect(events.some((e) => e.kind === 'opportunityAttacked'), c.name).toBe(true);
      expect(events.some((e) => (e.kind as string) === 'reactionHeld'), c.name).toBe(false);

      const swinger = after.units.find((u) => u.id === watcherId)!;
      expect(swinger.reactionAvailable, c.name).toBe(false);
      expect({ x: swinger.x, y: swinger.y }, c.name).toEqual(c.lands);
    }
  });

  it('cuts the move into segments, so the swing lands where it happened', () => {
    const { state } = staged();
    const route = [
      { x: 4, y: 22 },
      { x: 3, y: 22 },
      { x: 2, y: 22 },
    ];
    const { events } = must(state, { kind: 'move', path: route });

    const moves = events.filter((e) => e.kind === 'moved');
    expect(moves).toHaveLength(2);
    expect(moves[0]).toMatchObject({ to: { x: 4, y: 22 }, costFeet: 5 });
    expect(moves[1]).toMatchObject({ to: { x: 2, y: 22 }, costFeet: 10 });

    const swing = events.findIndex((e) => e.kind === 'opportunityAttacked');
    expect(swing).toBeGreaterThan(events.indexOf(moves[0]!));
    expect(swing).toBeLessThan(events.indexOf(moves[1]!));
  });

  it('bills the whole route even when it is interrupted halfway', () => {
    const { state } = staged();
    const route = [
      { x: 4, y: 22 },
      { x: 3, y: 22 },
    ];
    const { state: after } = must(state, { kind: 'move', path: route });

    expect(after.turn!.movementFeetRemaining).toBe(30);
  });

  it('ends the turn where the mover is carried off, and walks the ladder on', () => {
    for (let seed = 1; seed < 300; seed++) {
      const { state, actorId } = staged(seed);
      const wounded = put(state, actorId, { x: 5, y: 22 }, { hp: 1 });
      const route = [
        { x: 4, y: 22 },
        { x: 3, y: 22 },
      ];
      const { state: after, events } = must(wounded, { kind: 'move', path: route });
      if (!events.some((e) => e.kind === 'evacuated' && e.unitId === actorId)) continue;

      const moves = events.filter((e) => e.kind === 'moved');
      expect(moves).toHaveLength(1);
      expect(moves[0]).toMatchObject({ to: { x: 4, y: 22 } });

      expect(after.units.find((u) => u.id === actorId)!.status).toBe('evacuated');
      expect(after.turn).not.toBeNull();
      expect(after.turn!.unitId).not.toBe(actorId);
      return;
    }
    throw new Error('no seed in range landed the killing swing');
  });

  it('is never drawn by forced movement, which is what a Shove is', () => {
    for (let seed = 1; seed < 300; seed++) {
      const state = board(seed);
      const shover = actorOf(state);
      const target = enemyOf(state, shover, 'trajector');
      const staged = put(put(state, shover.id, { x: 5, y: 22 }), target.id, { x: 6, y: 22 });

      const { events } = must(staged, { kind: 'shove', targetId: target.id });
      const shoved = events.find((e) => e.kind === 'shoved');
      if (!shoved || shoved.kind !== 'shoved' || shoved.pushedTo === null) continue;

      // The push carries the target out of the shover's own reach, which would
      // have been swung at had the target walked there. The fiche is explicit
      // that forced movement is free.
      expect(events.some((e) => e.kind === 'opportunityAttacked')).toBe(false);
      return;
    }
    throw new Error('no seed in range landed the Shove');
  });
});

describe('snatching a pass in a match', () => {
  /** The acting player throwing across a lane a Striker is standing beside. */
  function staged(seed = 5, thiefCell: Point | null = { x: 7, y: 21 }) {
    const state = board(seed);
    const thrower = actorOf(state);
    const mate = mateOf(state, thrower);
    const thief = enemyOf(state, thrower, 'striker');

    let placed = put(state, thrower.id, { x: 5, y: 22 }, { holdingPayload: true });
    placed = put(placed, mate.id, { x: 11, y: 22 });
    if (thiefCell) placed = put(placed, thief.id, thiefCell);

    return {
      state: { ...placed, payload: { carriedBy: thrower.id, x: 5, y: 22 } },
      throwerId: thrower.id,
      mateId: mate.id,
      thiefId: thief.id,
    };
  }

  it('contests the lane and spends the Reaction on the attempt', () => {
    const { state, mateId, thiefId } = staged();
    const { state: after, events } = must(state, { kind: 'pass', targetId: mateId });

    expect(events.some((e) => e.kind === 'passIntercepted')).toBe(true);
    expect(after.units.find((u) => u.id === thiefId)!.reactionAvailable).toBe(false);
  });

  it('never lets a neighbour of the thrower snatch a pass that has barely left the hands', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { state, mateId, thiefId } = staged(seed, { x: 5, y: 21 });
      const { state: after, events } = must(state, { kind: 'pass', targetId: mateId });

      expect(
        events.some((e) => e.kind === 'passIntercepted'),
        `seed ${seed}`,
      ).toBe(false);
      expect(after.units.find((u) => u.id === thiefId)!.reactionAvailable, `seed ${seed}`).toBe(
        true,
      );
    }
  });

  it('leaves an undefended lane alone', () => {
    const { state, mateId } = staged(5, null);
    const { events } = must(state, { kind: 'pass', targetId: mateId });

    expect(events.some((e) => e.kind === 'passIntercepted')).toBe(false);
    expect(events.some((e) => e.kind === 'passed')).toBe(true);
  });

  it('hands the Payload to the thief, and never rolls the catch', () => {
    for (let seed = 1; seed < 300; seed++) {
      const { state, mateId, thiefId, throwerId } = staged(seed);
      const { state: after, events } = must(state, { kind: 'pass', targetId: mateId });
      if (!events.some((e) => e.kind === 'passIntercepted' && e.success)) continue;

      expect(events.some((e) => e.kind === 'passed')).toBe(false);
      expect(after.payload.carriedBy).toBe(thiefId);
      expect(after.units.find((u) => u.id === thiefId)!.holdingPayload).toBe(true);
      expect(after.units.find((u) => u.id === throwerId)!.holdingPayload).toBe(false);
      expect(after.units.find((u) => u.id === mateId)!.holdingPayload).toBe(false);
      return;
    }
    throw new Error('no seed in range stole the pass');
  });

  it('lets the throw resolve normally once the grab has failed', () => {
    for (let seed = 1; seed < 300; seed++) {
      const { state, mateId, thiefId } = staged(seed);
      const { state: after, events } = must(state, { kind: 'pass', targetId: mateId });
      if (!events.some((e) => e.kind === 'passIntercepted' && !e.success)) continue;

      expect(events.some((e) => e.kind === 'passed')).toBe(true);
      expect(after.payload.carriedBy).not.toBe(thiefId);
      return;
    }
    throw new Error('no seed in range fumbled the grab');
  });

  it('never lets a goalkeeper on its line spend the Reaction it owes the Furnace', () => {
    const state = board();
    const thrower = actorOf(state);
    const mate = mateOf(state, thrower);
    const keeper = enemyOf(state, thrower, 'bulwark');

    let placed = put(state, thrower.id, { x: 5, y: 42 }, { holdingPayload: true });
    placed = put(placed, mate.id, { x: 9, y: 42 });
    placed = put(placed, keeper.id, { x: 7, y: 43 });
    const staged: MatchState = { ...placed, payload: { carriedBy: thrower.id, x: 5, y: 42 } };

    const { state: after, events } = must(staged, { kind: 'pass', targetId: mate.id });

    expect(events.some((e) => e.kind === 'passIntercepted')).toBe(false);
    expect(after.units.find((u) => u.id === keeper.id)!.reactionAvailable).toBe(true);
  });

  it('cannot pick off a shot at a Furnace, only a pass', () => {
    const state = board();
    const shooter = actorOf(state);
    const thief = enemyOf(state, shooter, 'striker');

    const furnace = arena.targetFurnaceOf(shooter.team);
    const near = furnace.cells[0]!;
    // On the end wall, four cells from the mouth and in plain sight of it.
    const from: Point = { x: near.x + 6, y: near.y };

    let placed = put(state, shooter.id, from, { holdingPayload: true });
    placed = put(placed, thief.id, { x: from.x, y: from.y === 0 ? 1 : from.y - 1 });
    const staged: MatchState = { ...placed, payload: { carriedBy: shooter.id, ...from } };

    const { events } = must(staged, { kind: 'shoot' });

    expect(events.some((e) => e.kind === 'shotAtFurnace')).toBe(true);
    expect(events.some((e) => e.kind === 'passIntercepted')).toBe(false);
  });
});

/** Guards the event ordering the interface depends on, in one place. */
describe('the reaction log', () => {
  it('reports every roll it made, so a client re-derives nothing', () => {
    const state = board();
    const mover = actorOf(state);
    const watcher = enemyOf(state, mover, 'breaker');
    const staged = put(put(state, mover.id, { x: 5, y: 22 }), watcher.id, { x: 6, y: 22 });

    const { events } = must(staged, { kind: 'move', path: [{ x: 4, y: 22 }] });
    const swing = events.find((e) => e.kind === 'opportunityAttacked') as Extract<
      MatchEvent,
      { kind: 'opportunityAttacked' }
    >;

    expect(swing.roll.die).toBe(20);
    expect(swing.roll.against).toBeGreaterThan(0);
    expect(swing.roll.total).toBe(swing.roll.rolled + swing.roll.bonus);
  });
});
