import { describe, expect, it } from 'vitest';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { MOVE_SPEED_FEET, PAYLOAD_RANGE_CELLS, SPARK_CATCH_DC } from '../engine/constants.js';
import { distance, lineTo, type Point } from '../engine/geometry.js';
import type { Action } from '../engine/actions.js';
import type { MatchEvent } from '../engine/events.js';
import { openMatch, reduce } from '../engine/reduce.js';
import { battedCrackerRun } from '../engine/rules/ordnance.js';
import { createMatch } from '../engine/setup.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import { chooseAction, rankActions } from './chooseAction.js';
import { hasLineOfSight } from '../engine/rules/sight.js';
import {
  BLIND_DISCOUNT,
  buildBoard,
  laneCover,
  outlet,
  positionValue,
  scoringNearness,
  shotQuality,
  visibleRange,
} from './evaluate.js';
import type { AllyOrder } from './orders.js';
import { weightsFor } from './roles/index.js';
import type { Role } from '../engine/stats.js';
import { playSeed, sweep } from './selfPlay.js';
import { legalActions } from '../engine/legalActions.js';

const arena = new Arena(KILL_SILO);

const CORNER: Point = { x: 0, y: 44 };

/** A match opened with everyone parked away, so a test places what it means to. */
function board(seed = 5): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  return openMatch(arena, { ...created, units: created.units.map((u) => ({ ...u, ...CORNER })) })
    .state;
}

function put(state: MatchState, id: UnitId, at: Point, extra: Partial<Unit> = {}): MatchState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

/** Hands the turn to a named unit, so a test can watch a role that is not up next. */
function giveTurnTo(state: MatchState, unitId: UnitId): MatchState {
  return {
    ...state,
    turn: {
      unitId,
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      disengaged: false,
    },
  };
}

function unit(state: MatchState, id: UnitId): Unit {
  return state.units.find((u) => u.id === id)!;
}

/**
 * The actions that spend the Action, as opposed to the movement or the one
 * free object interaction. Only these compete with each other, so only these
 * are worth ranking against one another.
 */
const SPENDS_THE_ACTION: ReadonlySet<Action['kind']> = new Set([
  'attack',
  'shove',
  'batCracker',
  'catchSpark',
  'pass',
  'shoot',
]);

/** Drives one unit's whole turn the way `selfPlay` does, and hands back the log. */
function playOutTurn(start: MatchState, unitId: UnitId): MatchEvent[] {
  const events: MatchEvent[] = [];
  let state = start;

  for (let i = 0; i < 60; i++) {
    const action = chooseAction(arena, state, unitId);
    if (action.kind === 'endTurn') break;
    const result = reduce(arena, state, { unitId, action });
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    events.push(...result.events);
    state = result.state;
    if (!state.turn || state.turn.unitId !== unitId) break;
  }

  return events;
}

function carrying(state: MatchState, id: UnitId): MatchState {
  const holder = unit(state, id);
  return {
    ...put(state, id, { x: holder.x, y: holder.y }, { holdingPayload: true }),
    payload: { carriedBy: id, x: holder.x, y: holder.y },
  };
}

// The ladder is deterministic for a match with no humans, and the fast block of
// team A sorts first, so the opening turn always belongs to this shirt.
const OPENER = 'A-striker-2';

// -- The contract with the engine -------------------------------------------

describe('the AI and the door', () => {
  it('never sends an action the engine refuses, over a whole match', () => {
    // playMatch throws on a refusal rather than swallowing it, so reaching the
    // end is the assertion: legalActions and reduce agreed on every turn.
    const played = playSeed(KILL_SILO, 'rookie', 7);
    expect(played.state.phase).toBe('finished');
    expect(played.state.result).not.toBeNull();
  });

  it('plays a match to its proper end, at all three Tiers', () => {
    for (const tier of ['rookie', 'veteran', 'star'] as const) {
      const played = playSeed(KILL_SILO, tier, 3);
      expect(played.state.phase).toBe('finished');

      // Ten rounds, unless somebody caught the Spark, which ends it on the spot.
      const caught = played.events.some((e) => e.kind === 'sparkCaught' && e.caught);
      if (!caught) expect(played.state.round).toBeGreaterThanOrEqual(10);
    }
  });

  it('decides without rolling a die, so the same board gives the same action', () => {
    const state = board();
    const first = chooseAction(arena, state, state.turn!.unitId);
    const again = chooseAction(arena, state, state.turn!.unitId);
    expect(again).toEqual(first);
    expect(state.rngSeed).toBe(board().rngSeed);
  });

  it('replays a whole match byte for byte, and differs on another seed', () => {
    const a = JSON.stringify(playSeed(KILL_SILO, 'rookie', 21).state);
    const b = JSON.stringify(playSeed(KILL_SILO, 'rookie', 21).state);
    const c = JSON.stringify(playSeed(KILL_SILO, 'rookie', 22).state);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('costs a few milliseconds a turn, which is what thirteen of them need', () => {
    const state = board();
    const started = Date.now();
    for (let i = 0; i < 20; i++) chooseAction(arena, state, state.turn!.unitId);
    expect((Date.now() - started) / 20).toBeLessThan(50);
  });

  it('always has something to send, even with nothing to do', () => {
    const state = board();
    expect(chooseAction(arena, state, state.turn!.unitId)).toBeDefined();
    expect(rankActions(arena, state, state.turn!.unitId)[0]).toBeDefined();
  });

  it('offers nothing for a unit whose turn it is not', () => {
    const state = board();
    expect(rankActions(arena, state, 'B-bulwark-1')).toHaveLength(0);
  });
});

// -- What the roles actually do ---------------------------------------------

describe('the priority tables', () => {
  it('shoots once the carrier is in clean range and nothing else is on', () => {
    const furnace = arena.targetFurnaceOf('A').cells[0]!;
    const state = carrying(put(board(), OPENER, { x: furnace.x - 2, y: furnace.y }), OPENER);

    const chosen = chooseAction(arena, state, OPENER);
    expect(chosen.kind).toBe('shoot');
  });

  it('carries towards the Furnace it attacks rather than shooting from nowhere', () => {
    const state = carrying(put(board(), OPENER, { x: 7, y: 22 }), OPENER);
    const chosen = chooseAction(arena, state, OPENER);

    expect(chosen.kind).toBe('move');
    if (chosen.kind !== 'move') throw new Error('unreachable');

    const landing = chosen.path[chosen.path.length - 1]!;
    const furnace = arena.targetFurnaceOf('A').cells[0]!;
    expect(distance(landing, furnace)).toBeLessThan(distance({ x: 7, y: 22 }, furnace));
  });

  it('picks a loose Payload up off the cell it is standing on', () => {
    const start = put(board(), OPENER, { x: 7, y: 22 });
    const state: MatchState = { ...start, payload: { carriedBy: null, x: 7, y: 22 } };

    expect(chooseAction(arena, state, OPENER).kind).toBe('grabPayload');
  });

  it('spends its Action on the Spark ahead of anything else that wants it', () => {
    const trajector = 'A-trajector-7';
    const start = giveTurnTo(put(board(), trajector, { x: 7, y: 22 }), trajector);
    const state: MatchState = { ...start, spark: { state: 'live', x: 7, y: 22, heading: 1 } };

    const ranked = rankActions(arena, state, trajector);
    const spendsAction = ranked.filter((c) => SPENDS_THE_ACTION.has(c.action.kind));

    expect(spendsAction[0]?.action.kind).toBe('catchSpark');
    expect(spendsAction[0]!.why).toMatch(/Spark/);
    expect(SPARK_CATCH_DC).toBe(20);
  });

  it('pockets the loose Payload and the Spark in the one turn, both being on offer', () => {
    // They never competed: the ball costs the object interaction and the Spark
    // costs the Action. Which one the ranking names first decides nothing, so
    // what is worth asserting is that the turn ends with both done.
    const trajector = 'A-trajector-7';
    const start = giveTurnTo(put(board(), trajector, { x: 7, y: 22 }), trajector);
    const state: MatchState = {
      ...start,
      spark: { state: 'live', x: 7, y: 22, heading: 1 },
      payload: { carriedBy: null, x: 7, y: 22 },
    };

    const done = playOutTurn(state, trajector);
    expect(done.some((e) => e.kind === 'payloadGrabbed')).toBe(true);
    expect(done.some((e) => e.kind === 'sparkCaught')).toBe(true);
  });

  it('shoves the carrier rather than swinging at it, because only a Shove strips', () => {
    const breaker = 'A-breaker-5';
    const start = giveTurnTo(put(board(), breaker, { x: 7, y: 22 }), breaker);
    const staged = carrying(put(start, 'B-striker-2', { x: 8, y: 22 }), 'B-striker-2');

    const chosen = chooseAction(arena, staged, breaker);
    expect(chosen).toEqual({ kind: 'shove', targetId: 'B-striker-2' });
  });

  it('keeps the goalkeeper at home: its own hatch is worth more than any cell out there', () => {
    // Read off the arena rather than typed in. The Furnaces moved to opposite
    // ends of the shaft and this test asserted the old coordinates, which is
    // exactly the kind of test that passes for the wrong reason afterwards.
    const keeper = 'A-bulwark-1';
    const mine = arena.furnaceOf('A').cells[1]!;
    const theirs = arena.furnaceOf('B').cells[1]!;
    const goalMouth = { x: mine.x, y: mine.y + 1 };

    const state = giveTurnTo(put(board(), keeper, goalMouth), keeper);
    const legal = legalActions(arena, state)!;
    const home = buildBoard(arena, state, unit(state, keeper), legal, weightsFor('bulwark'), []);

    expect(positionValue(home, goalMouth)).toBeGreaterThan(
      positionValue(home, { x: theirs.x, y: theirs.y - 1 }),
    );
    // Deliberately not the halfway cell itself: a loose Payload sits there and
    // its cell carries the pickup, which is a different rule and would make
    // this a test of `grabPayload` rather than of `guardFurnace`.
    expect(positionValue(home, goalMouth)).toBeGreaterThan(positionValue(home, { x: 7, y: 20 }));
  });

  it('gets open where the carrier can throw, not just up the pitch', () => {
    // Two cells for a Striker supporting its own carrier. One is nearer the
    // goal it attacks and out of any throw; the other is behind it but within
    // a clean pass. Priced on distance to goal alone the first one wins, which
    // is how a support player walks away from the ball.
    const carrier = 'A-breaker-5';
    const mate = 'A-striker-2';
    const target = arena.targetFurnaceOf('A').cells[1]!;

    let staged = put(board(), carrier, { x: 7, y: 12 });
    staged = carrying(staged, carrier);
    staged = giveTurnTo(put(staged, mate, { x: 7, y: 14 }), mate);

    const legal = legalActions(arena, staged)!;
    const view = buildBoard(arena, staged, unit(staged, mate), legal, weightsFor('striker'), []);

    const reachable = { x: 7, y: 20 }; // 8 cells off the carrier: a clean pass
    const stranded = { x: 7, y: 30 }; // 18 cells off it: nothing can reach here

    expect(distance(stranded, target)).toBeLessThan(distance(reachable, target));
    expect(positionValue(view, reachable)).toBeGreaterThan(positionValue(view, stranded));
  });

  it('still prefers the cell further up the pitch when both are within a throw', () => {
    // The guard on the guard. `passReach` must not turn support play into
    // hugging the carrier: inside clean range it is one either way, so the
    // original gradient decides and the more advanced cell has to win.
    const carrier = 'A-breaker-5';
    const mate = 'A-striker-2';

    let staged = put(board(), carrier, { x: 7, y: 22 });
    staged = carrying(staged, carrier);
    staged = giveTurnTo(put(staged, mate, { x: 7, y: 22 }), mate);

    const legal = legalActions(arena, staged)!;
    const view = buildBoard(arena, staged, unit(staged, mate), legal, weightsFor('striker'), []);

    // One column off the axis: the pillar at (7, 28) hides (7, 30) from a
    // carrier at (7, 22), and since écart 34 a cell the carrier cannot see is
    // no outlet at all. Both cells here are in its sight, asserted so the test
    // cannot pass for the wrong reason if the layout moves.
    const further = { x: 6, y: 30 };
    const nearer = { x: 6, y: 26 };
    expect(hasLineOfSight(arena, { x: 7, y: 22 }, further)).toBe(true);
    expect(hasLineOfSight(arena, { x: 7, y: 22 }, nearer)).toBe(true);

    expect(positionValue(view, further)).toBeGreaterThan(positionValue(view, nearer));
  });

  it('brings somebody back into range of a goalkeeper holding the ball', () => {
    // The scene the whole fix exists for. A team concedes, its keeper is handed
    // a fresh Payload in its own mouth at the bottom of the shaft, and its
    // Strikers are away up the silo. Somebody has to come back for the throw or
    // the ball never leaves the goal again.
    const keeper = 'A-bulwark-1';
    const mate = 'A-striker-2';
    const mouth = arena.furnaceOf('A').cells[1]!;
    const keeperCell = { x: mouth.x, y: mouth.y + 1 };

    let staged = put(board(), keeper, keeperCell);
    staged = carrying(staged, keeper);
    staged = giveTurnTo(put(staged, mate, { x: 7, y: 30 }), mate);

    const legal = legalActions(arena, staged)!;
    const view = buildBoard(arena, staged, unit(staged, mate), legal, weightsFor('striker'), []);

    // The Striker is eight cells into the move it can make this turn. Coming
    // down towards the keeper has to beat pressing on up the shaft.
    expect(positionValue(view, { x: 7, y: 22 })).toBeGreaterThan(
      positionValue(view, { x: 7, y: 38 }),
    );
  });

  it('never sends a Cracker into one of its own', () => {
    const breaker = 'A-breaker-5';
    let staged = giveTurnTo(put(board(), breaker, { x: 5, y: 22 }), breaker);
    staged = put(staged, 'A-striker-3', { x: 10, y: 22 }); // due east of the charge
    staged = put(staged, 'B-striker-2', { x: 6, y: 18 }); // and an opponent below it
    staged = {
      ...staged,
      crackers: staged.crackers.map((c, i) =>
        i === 0 ? { ...c, x: 6, y: 22, state: 'live' as const, respawnOnRound: null } : c,
      ),
    };

    const cracker = { x: 6, y: 22 };
    for (const candidate of rankActions(arena, staged, breaker)) {
      if (candidate.action.kind !== 'batCracker') continue;
      const struck = battedCrackerRun(arena, staged, cracker, candidate.action.direction).struck;
      expect(struck?.team).not.toBe('A');
    }
  });
});

// -- Sight and cover ---------------------------------------------------------

describe('sight and cover', () => {
  const furnaceA = arena.furnaceOf('A');
  const BEHIND_CRATE: Point = { x: 7, y: 10 }; // the crate is (6..8, 9)
  const BESIDE_CRATE: Point = { x: 4, y: 10 };

  /** The board as `unit` sees it, with the weights of `role`. */
  function viewOf(staged: MatchState, id: UnitId, role: Role) {
    const legal = legalActions(arena, staged)!;
    return buildBoard(arena, staged, unit(staged, id), legal, weightsFor(role), []);
  }

  /** B's Striker with the ball, attacking A's mouth from `at`. */
  function strikerAt(at: Point): MatchState {
    return giveTurnTo(carrying(put(board(), 'B-striker-2', at), 'B-striker-2'), 'B-striker-2');
  }

  it('a carrier behind the crate is worth less than one beside it, at the same distance to the mouth', () => {
    expect(visibleRange(arena, BEHIND_CRATE, furnaceA)).toBeNull();
    expect(visibleRange(arena, BESIDE_CRATE, furnaceA)).not.toBeNull();

    const blind = scoringNearness(arena, BEHIND_CRATE, furnaceA);
    expect(scoringNearness(arena, BESIDE_CRATE, furnaceA)).toBeGreaterThan(blind);
    // (7,10) is one cell past clean range, so blind is the discount times a
    // gradient a hair under one: the sighted value there would be that gradient.
    const gradient = 1 - (distance(BEHIND_CRATE, furnaceA.cells[1]!) - PAYLOAD_RANGE_CELLS) / 36;
    expect(blind).toBeCloseTo(BLIND_DISCOUNT * gradient, 10);
  });

  it('shotQuality is zero with no hatch in view, whatever the distance', () => {
    const staged = strikerAt(BEHIND_CRATE);
    const view = viewOf(staged, 'B-striker-2', 'striker');
    const striker = unit(staged, 'B-striker-2');

    expect(visibleRange(arena, BEHIND_CRATE, furnaceA)).toBeNull();
    expect(visibleRange(arena, BESIDE_CRATE, furnaceA)).not.toBeNull();
    expect(shotQuality(view, striker, BEHIND_CRATE)).toBe(0);
    expect(shotQuality(view, striker, BESIDE_CRATE)).toBeGreaterThan(0);
  });

  it('the carrier steps into view of the mouth rather than closing distance blind', () => {
    const start: Point = { x: 7, y: 11 };
    expect(visibleRange(arena, start, furnaceA)).toBeNull();

    const chosen = chooseAction(arena, strikerAt(start), 'B-striker-2');
    expect(chosen.kind).toBe('move');
    if (chosen.kind !== 'move') throw new Error('unreachable');

    const landing = chosen.path[chosen.path.length - 1]!;
    expect(visibleRange(arena, landing, furnaceA)).not.toBeNull();
    expect(scoringNearness(arena, landing, furnaceA)).toBeGreaterThan(
      scoringNearness(arena, start, furnaceA),
    );
  });

  it('a support player gets ahead of its carrier, within a throw, rather than standing on its shoulder', () => {
    const keeperCell: Point = { x: 7, y: 1 };
    const near: Point = { x: 8, y: 2 };
    const far: Point = { x: 7, y: 8 };
    expect(arena.isSolid(far)).toBe(false);
    expect(hasLineOfSight(arena, keeperCell, far)).toBe(true);
    expect(hasLineOfSight(arena, keeperCell, near)).toBe(true);

    let staged = carrying(put(board(), 'A-bulwark-1', keeperCell), 'A-bulwark-1');
    staged = giveTurnTo(put(staged, 'A-striker-2', { x: 8, y: 3 }), 'A-striker-2');
    const view = viewOf(staged, 'A-striker-2', 'striker');

    expect(outlet(view, far)).toBeGreaterThan(outlet(view, near));
    expect(positionValue(view, far)).toBeGreaterThan(positionValue(view, near));
  });

  it('an outlet the carrier cannot see is worth nothing', () => {
    const carrier: Point = { x: 7, y: 7 };
    const hidden: Point = { x: 7, y: 11 }; // behind the crate at y = 9
    expect(arena.isSolid(carrier)).toBe(false);
    expect(hasLineOfSight(arena, carrier, hidden)).toBe(false);

    const visible = [
      { x: 3, y: 11 },
      { x: 11, y: 11 },
    ].find((c) => hasLineOfSight(arena, carrier, c));
    expect(visible).toBeDefined();

    let staged = carrying(put(board(), 'A-breaker-5', carrier), 'A-breaker-5');
    staged = giveTurnTo(put(staged, 'A-striker-2', { x: 7, y: 6 }), 'A-striker-2');
    const view = viewOf(staged, 'A-striker-2', 'striker');

    expect(outlet(view, hidden)).toBe(0);
    expect(outlet(view, visible!)).toBeGreaterThan(0);
    expect(positionValue(view, visible!)).toBeGreaterThan(positionValue(view, hidden));
  });

  it('cover: a lane with a defender beside it is worth less than a clean one', () => {
    const carrier: Point = { x: 7, y: 20 };
    const target: Point = { x: 7, y: 24 };
    const guard: Point = { x: 8, y: 22 };
    expect(hasLineOfSight(arena, carrier, target)).toBe(true);
    expect(lineTo(carrier, target).some((c) => distance(c, guard) <= 1)).toBe(true);

    let staged = carrying(put(board(), 'A-breaker-5', carrier), 'A-breaker-5');
    staged = giveTurnTo(put(staged, 'A-striker-2', { x: 7, y: 19 }), 'A-striker-2');

    const clean = viewOf(staged, 'A-striker-2', 'striker');
    const marked = viewOf(put(staged, 'B-breaker-5', guard), 'A-striker-2', 'striker');
    expect(unit(marked.state, 'B-breaker-5').reactionAvailable).toBe(true);

    const open = laneCover(clean, target);
    expect(open).toBeGreaterThan(0);
    expect(laneCover(marked, target)).toBeCloseTo(open * 0.5, 10);
    expect(positionValue(marked, target)).toBeLessThan(positionValue(clean, target));

    // Out of reach (distance 19) and the carrier's own cell read nothing at all.
    expect(laneCover(clean, { x: 7, y: 39 })).toBe(0);
    expect(laneCover(clean, carrier)).toBe(0);
  });

  it('the goalkeeper reads no cover', () => {
    expect(weightsFor('bulwark').cover).toBe(0);
    for (const role of ['striker', 'breaker', 'bulwark', 'trajector'] as const) {
      expect(typeof weightsFor(role).cover).toBe('number');
    }
  });
});

// -- A31: the goal that was scored ---------------------------------------------

/**
 * Drives one unit's turn with the real ladder set aside, the way `playOutTurn`
 * does, and hands back the board it leaves behind rather than the log.
 */
function playTurnOf(start: MatchState, unitId: UnitId): MatchState {
  let state = giveTurnTo(start, unitId);
  for (let i = 0; i < 60; i++) {
    const action = chooseAction(arena, state, unitId);
    if (action.kind === 'endTurn') break;
    const result = reduce(arena, state, { unitId, action });
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    state = result.state;
    if (!state.turn || state.turn.unitId !== unitId) break;
  }
  return state;
}

describe('after a goal is scored', () => {
  // Audit line A31, reproduced from Jérôme's first match on 2026-10-10: a goal
  // goes in, the conceding goalkeeper is handed a fresh ball in its own mouth,
  // its six field players gather round it and never leave. Measured in
  // self-play before the fix: the keeper still held the ball on 77 % of the
  // conceding side's next 28 turns, and a field player's best move from beside
  // the keeper was worth under three points, so it swung at whoever was
  // adjacent or dodged instead. The scene below is that moment, staged.
  const keeper = 'A-bulwark-1';
  const mouth = { x: 7, y: 1 };
  const huddle: readonly [UnitId, Point][] = [
    ['A-striker-2', { x: 5, y: 2 }],
    ['A-striker-3', { x: 6, y: 2 }],
    ['A-striker-4', { x: 8, y: 2 }],
    ['A-breaker-5', { x: 9, y: 2 }],
    ['A-breaker-6', { x: 6, y: 3 }],
    ['A-trajector-7', { x: 8, y: 3 }],
  ];

  function conceded(): MatchState {
    let staged = put(board(), keeper, mouth);
    staged = carrying(staged, keeper);
    for (const [id, at] of huddle) staged = put(staged, id, at);
    // The scorers are back in their own half, out of everybody's reach, so
    // nothing in this scene is a reaction to an opponent.
    let x = 2;
    for (const u of staged.units) {
      if (u.team === 'B') staged = put(staged, u.id, { x: x++, y: 36 });
    }
    return staged;
  }

  it('the field players spread out ahead of their goalkeeper, in its sight and within a throw', () => {
    let state = conceded();
    for (const [id] of huddle) state = playTurnOf(state, id);

    const mates = huddle.map(([id]) => unit(state, id));
    const spread = mates.map((m) => distance(m, mouth));
    const mean = spread.reduce((a, b) => a + b, 0) / spread.length;

    // Nobody is left on the keeper's shoulder, and the side is a throw's
    // length up the pitch on average: this is the dispersion the sweep now
    // reports, asserted on the one scene it was added for.
    expect(mates.filter((m) => distance(m, mouth) <= 2)).toHaveLength(0);
    expect(mean).toBeGreaterThan(5);

    // And they are outlets, not just far away: in reach, in view, up the pitch.
    const outlets = mates.filter(
      (m) =>
        distance(m, mouth) <= PAYLOAD_RANGE_CELLS &&
        hasLineOfSight(arena, mouth, m) &&
        m.y > mouth.y + 3,
    );
    expect(outlets.length).toBeGreaterThanOrEqual(3);
  });

  it('and the goalkeeper throws the ball out to one of them', () => {
    let state = conceded();
    for (const [id] of huddle) state = playTurnOf(state, id);

    const chosen = chooseAction(arena, giveTurnTo(state, keeper), keeper);
    expect(chosen.kind).toBe('pass');
    if (chosen.kind !== 'pass') throw new Error('unreachable');

    const receiver = unit(state, chosen.targetId);
    expect(receiver.y).toBeGreaterThan(mouth.y + 3);
  });

  it('spends no more than it did on the old pitch: a decision stays under fifty milliseconds', () => {
    // `scoringNearness` and `outlet` now read lines of sight for every
    // reachable cell. The Furnace table is memoised per arena, the carrier line
    // is not, and this is the scene with the most reachable cells in sight.
    const state = giveTurnTo(conceded(), 'A-striker-2');
    const started = Date.now();
    for (let i = 0; i < 20; i++) chooseAction(arena, state, 'A-striker-2');
    expect((Date.now() - started) / 20).toBeLessThan(50);
  });
});

// -- The orders channel ------------------------------------------------------

describe('orders bias the table', () => {
  it('pulls a team-mate towards a cell it is told to hold', () => {
    // The ball is in an opponent's hands off in the corner, so the only thing
    // the order competes with is the pull towards that carrier.
    const from: Point = { x: 7, y: 22 };
    // The cell is deliberately the other way from the carrier, so following the
    // order and following the ball cannot be the same walk.
    const state = carrying(put(board(), OPENER, from), 'B-striker-2');
    const at: Point = { x: 13, y: 26 };
    const orders: AllyOrder[] = [{ kind: 'holdZone', to: OPENER, at }];

    const ordered = chooseAction(arena, state, OPENER, orders);
    expect(ordered.kind).toBe('move');
    if (ordered.kind !== 'move') throw new Error('unreachable');

    const landing = ordered.path[ordered.path.length - 1]!;
    expect(distance(landing, at)).toBeLessThan(distance(from, at));
    expect(ordered).not.toEqual(chooseAction(arena, state, OPENER));
  });

  it('points a swing at the opponent it is told to mark', () => {
    let staged = put(board(), OPENER, { x: 7, y: 22 });
    staged = put(staged, 'B-striker-2', { x: 6, y: 22 });
    staged = put(staged, 'B-striker-3', { x: 8, y: 22 });

    const orders: AllyOrder[] = [
      { kind: 'markTarget', to: OPENER, targetId: 'B-striker-3' },
    ];

    const top = rankActions(arena, staged, OPENER, orders).find(
      (c) => c.action.kind === 'attack' || c.action.kind === 'shove',
    )!;
    expect(top.action).toMatchObject({ targetId: 'B-striker-3' });
  });

  it('sends the ball to the team-mate that called for it', () => {
    let staged = carrying(put(board(), OPENER, { x: 7, y: 22 }), OPENER);
    staged = put(staged, 'A-striker-3', { x: 4, y: 22 });
    staged = put(staged, 'A-striker-4', { x: 10, y: 22 });

    const orders: AllyOrder[] = [
      { kind: 'callForPass', to: OPENER, receiverId: 'A-striker-3' },
    ];

    const chosen = chooseAction(arena, staged, OPENER, orders);
    expect(chosen).toEqual({ kind: 'pass', targetId: 'A-striker-3' });
  });

  it('biases and does not replace: an ordered unit still takes the ball at its feet', () => {
    const start = put(board(), OPENER, { x: 7, y: 22 });
    const state: MatchState = { ...start, payload: { carriedBy: null, x: 7, y: 22 } };
    const orders: AllyOrder[] = [{ kind: 'holdZone', to: OPENER, at: { x: 2, y: 34 } }];

    expect(chooseAction(arena, state, OPENER, orders).kind).toBe('grabPayload');
  });

  it('ignores an order addressed to somebody else', () => {
    const state = put(board(), OPENER, { x: 7, y: 22 });
    const at: Point = { x: 2, y: 34 };
    const misdirected: AllyOrder[] = [{ kind: 'holdZone', to: 'A-striker-3', at }];

    expect(chooseAction(arena, state, OPENER, misdirected)).toEqual(
      chooseAction(arena, state, OPENER),
    );
  });
});

// -- The balance harness -----------------------------------------------------

describe('self-play', () => {
  it('produces a report both sides can be read from', () => {
    const report = sweep(KILL_SILO, 'rookie', 12);

    expect(report.matches).toBe(12);
    expect(report.wins.A + report.wins.B + report.draws).toBe(12);
    expect(report.meanActions).toBeGreaterThan(100);
  });

  it('actually plays the sport: the ball is handled and shots are taken', () => {
    let grabs = 0;
    let shots = 0;
    let sparkTries = 0;

    for (let seed = 1; seed <= 12; seed++) {
      for (const event of playSeed(KILL_SILO, 'rookie', seed).events) {
        if (event.kind === 'payloadGrabbed') grabs++;
        if (event.kind === 'shotAtFurnace') shots++;
        if (event.kind === 'sparkCaught') sparkTries++;
      }
    }

    // Guards against the failure mode that matters: an AI that ends every turn
    // and leaves a 0-0 that looks like a balanced match.
    expect(grabs).toBeGreaterThan(12);
    expect(shots).toBeGreaterThan(0);
    expect(sparkTries).toBeGreaterThan(0);
  });
}, 60000);
