import { describe, expect, it } from 'vitest';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { MOVE_SPEED_FEET } from '../engine/constants.js';
import { distance, type Point } from '../engine/geometry.js';
import type { MatchEvent } from '../engine/events.js';
import { legalActions } from '../engine/legalActions.js';
import { openMatch, reduce } from '../engine/reduce.js';
import { throwRange } from '../engine/rules/payload.js';
import { hasLineOfSight } from '../engine/rules/sight.js';
import { createMatch } from '../engine/setup.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import { chooseAction, rankPlans, type Plan } from './chooseAction.js';
import type { AllyOrder } from './orders.js';

const arena = new Arena(KILL_SILO);

const CORNER: Point = { x: 0, y: 44 };

/**
 * A match opened with everyone parked away, so a test places what it means to.
 * The Crackers are parked too (spent until a round no test reaches); a test
 * about the Crackers puts one back where it wants it.
 */
function board(seed = 5): MatchState {
  const created = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed });
  const opened = openMatch(arena, {
    ...created,
    units: created.units.map((u) => ({ ...u, ...CORNER })),
    crackers: created.crackers.map((c) => ({ ...c, state: 'destroyed' as const, respawnOnRound: 99 })),
  }).state;
  // The clock is handed to OPENER, cursor and all, so the chain's reading of
  // who has played (écart 51) is the one a real round would give: everybody
  // before OPENER on the ladder has, everybody after has not.
  const at = opened.turnOrder.findIndex(
    (s) => s.actor.kind === 'unit' && s.actor.unitId === OPENER,
  );
  return giveTurnTo({ ...opened, turnIndex: at }, OPENER);
}

function put(state: MatchState, id: UnitId, at: Point, extra: Partial<Unit> = {}): MatchState {
  // A unit moved while on the clock starts its turn there (écart 56).
  const turn = state.turn && state.turn.unitId === id ? { ...state.turn, startedAt: { x: at.x, y: at.y } } : state.turn;
  return { ...state, turn, units: state.units.map((u) => (u.id === id ? { ...u, ...at, ...extra } : u)) };
}

/** Hands the clock to a unit, cursor and all, so the ladder reads as a real round would. */
function clockOn(state: MatchState, unitId: UnitId): MatchState {
  const at = state.turnOrder.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === unitId);
  if (at < 0) throw new Error(`${unitId} has no slot`);
  return giveTurnTo({ ...state, turnIndex: at }, unitId);
}

/** Hands the turn to a named unit, cursor untouched. */
function giveTurnTo(state: MatchState, unitId: UnitId): MatchState {
  return {
    ...state,
    turn: {
      unitId,
      startedAt: { x: unit(state, unitId).x, y: unit(state, unitId).y },
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      disengaged: false,
      placing: null,
      shot: false,
    },
  };
}

function unit(state: MatchState, id: UnitId): Unit {
  return state.units.find((u) => u.id === id)!;
}

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

// The shirt `board()` hands the clock to: team A's first Striker, second on
// its side's ladder behind the Trajector (écart 51).
const OPENER = 'A-striker-2';


const kinds = (plan: Plan) => plan.steps.map((s) => s.kind);

/** Where a plan's walk ends: the last cell of its last `move`, or null when it never walks. */
function endOf(plan: Plan): Point | null {
  const moves = plan.steps.filter((s) => s.kind === 'move') as { kind: 'move'; path: Point[] }[];
  const last = moves[moves.length - 1];
  return last ? last.path[last.path.length - 1]! : null;
}

/** The first plans of a ranking, as a line a failing assertion can print. */
function show(plans: Plan[], n = 6) {
  return plans.slice(0, n).map((p) => [p.score.toFixed(1), kinds(p).join('>'), JSON.stringify(endOf(p)), p.why]);
}

/** Every B shirt parked out of every scene's way. */
function parkB(state: MatchState, at: Point = { x: 13, y: 30 }): MatchState {
  return { ...state, units: state.units.map((u) => (u.team === 'B' ? { ...u, ...at } : u)) };
}

/** The Action spent for the turn on the clock, the rest of the turn untouched. */
function actionSpent(state: MatchState, extra: { shot?: boolean } = {}): MatchState {
  return { ...state, turn: { ...state.turn!, actionUsed: true, ...extra } };
}

/** The score of the plans that only walk, and end on `cell`. */
function walkScores(plans: Plan[], cell: Point): number[] {
  return plans
    .filter((p) => p.steps.length === 1 && p.steps[0]!.kind === 'move')
    .filter((p) => endOf(p)!.x === cell.x && endOf(p)!.y === cell.y)
    .map((p) => p.score);
}

const picksUp = (plan: Plan) => plan.steps.some((s) => s.kind === 'grabPayload');
const passesTo = (plan: Plan, id: UnitId) => plan.steps.some((s) => s.kind === 'pass' && s.targetId === id);

describe("Jérôme's seventh pass, 2H.13", () => {
  const trajector = 'A-trajector-7';
  const keeper = 'A-bulwark-1';

  describe("point 1: the kick-off ball is a Striker's", () => {
    function kickoff(who: UnitId, ball: Point, lastCarrierTeam: 'A' | 'B' | null): MatchState {
      let s = parkB(board());
      s = put(s, trajector, { x: 7, y: 20 });
      s = put(s, OPENER, { x: 7, y: 20 });
      s = put(s, 'A-striker-3', { x: 7, y: 30 }); // ahead and in sight: a pass has a receiver
      s = { ...s, payload: { carriedBy: null, x: ball.x, y: ball.y }, lastCarrierTeam };
      return clockOn(s, who);
    }

    it('the Trajector walks past the kick-off ball: no plan picks it up, not even to pass it', () => {
      const state = kickoff(trajector, { x: 7, y: 24 }, null);
      const plans = rankPlans(arena, state, trajector);
      expect(plans.some(picksUp), JSON.stringify(show(plans))).toBe(false);
      const best = endOf(plans[0]!);
      expect(best === null || best.x !== 7 || best.y !== 24).toBe(true);
    });

    it('nor when the ball lies in its own cell', () => {
      const state = kickoff(trajector, { x: 7, y: 20 }, null);
      expect(legalActions(arena, state)!.canGrabPayload).toBe(true);
      const plans = rankPlans(arena, state, trajector);
      expect(plans.some(picksUp), JSON.stringify(show(plans))).toBe(false);
    });

    it('control: a Striker takes the kick-off ball, and the Trajector takes a ball a team has carried', () => {
      const striker = rankPlans(arena, kickoff(OPENER, { x: 7, y: 24 }, null), OPENER);
      expect(kinds(striker[0]!), JSON.stringify(show(striker))).toContain('grabPayload');

      const after = rankPlans(arena, kickoff(trajector, { x: 7, y: 24 }, 'B'), trajector);
      expect(kinds(after[0]!), JSON.stringify(show(after))).toContain('grabPayload');
    });
  });

  describe('point 2: a carrier in range keeps gaining towards the mouth', () => {
    /** A Striker carrying from (7,31) with the Action spent, so its plans are walks. */
    function carrier(parked: (s: MatchState) => MatchState = (s) => s): MatchState {
      let s = parked(parkB(board(), { x: 7, y: 2 })); // behind the carrier: nobody can reach it
      s = carrying(put(s, OPENER, { x: 7, y: 31 }), OPENER);
      s = { ...s, lastCarrierTeam: 'A' };
      return actionSpent(clockOn(s, OPENER));
    }

    it('with nobody able to reach either cell, the walk ending nearer the mouth outranks the one at the edge of range', () => {
      const plans = rankPlans(arena, carrier(), OPENER);
      const edge = walkScores(plans, { x: 7, y: 36 });
      const mid = walkScores(plans, { x: 7, y: 38 });
      const deep = walkScores(plans, { x: 7, y: 39 });
      expect(edge, JSON.stringify(show(plans))).toHaveLength(1);
      expect(mid).toHaveLength(1);
      expect(deep).toHaveLength(1);
      expect(deep[0]!).toBeGreaterThan(mid[0]!);
      expect(mid[0]!).toBeGreaterThan(edge[0]!);
      expect(endOf(plans[0]!)).toMatchObject({ y: 39 });
    });

    it('a cell nearer the mouth that one more opponent can reach still loses', () => {
      // The far keeper stands on its leash (four cells) in front of its mouth:
      // it can come out to the row beside (7,39), not the row beside (7,37).
      const plans = rankPlans(
        arena,
        carrier((s) => put(s, 'B-bulwark-1', { x: 7, y: 43 })),
        OPENER,
      );
      const near = walkScores(plans, { x: 7, y: 37 });
      const deeper = walkScores(plans, { x: 7, y: 39 });
      expect(near, JSON.stringify(show(plans))).toHaveLength(1);
      expect(deeper.length === 0 || deeper[0]! < near[0]!).toBe(true);
      expect(endOf(plans[0]!)!.y).toBeLessThan(39);
    });
  });

  describe('point 3: the shooter leaves its own rebound to a team-mate still to play', () => {
    /** The Striker has shot and missed from (7,16), the ball loose at (7,18), the Action spent. */
    function rebound(mate?: { id: UnitId; at: Point }): MatchState {
      let s = parkB(board());
      s = put(s, OPENER, { x: 7, y: 16 });
      s = { ...s, payload: { carriedBy: null, x: 7, y: 18 }, lastCarrierTeam: 'A' };
      if (mate) s = put(s, mate.id, mate.at);
      return actionSpent(clockOn(s, OPENER), { shot: true });
    }

    const onBall = (plans: Plan[]) =>
      plans.some((p) => {
        const end = endOf(p);
        return end !== null && end.x === 7 && end.y === 18;
      });

    it('a Striker still to play, seven cells from the ball, gets it: the shooter does not fetch it', () => {
      const plans = rankPlans(arena, rebound({ id: 'A-striker-3', at: { x: 7, y: 25 } }), OPENER);
      expect(onBall(plans), JSON.stringify(show(plans))).toBe(false);
      expect(plans.some(picksUp)).toBe(false);
    });

    it('a Breaker still to play within sixteen cells counts too', () => {
      const plans = rankPlans(arena, rebound({ id: 'A-breaker-5', at: { x: 7, y: 33 } }), OPENER);
      expect(onBall(plans), JSON.stringify(show(plans))).toBe(false);
    });

    it('with no such team-mate it fetches the ball itself', () => {
      const alone = rankPlans(arena, rebound(), OPENER);
      expect(onBall(alone), JSON.stringify(show(alone))).toBe(true);
      expect(endOf(alone[0]!)).toEqual({ x: 7, y: 18 });
    });

    it('a Striker nine cells off, a Breaker seventeen, or a mate that has already played, are out of reach: it fetches', () => {
      for (const mate of [
        { id: 'A-striker-3', at: { x: 7, y: 27 } },
        { id: 'A-breaker-5', at: { x: 7, y: 35 } },
        { id: trajector, at: { x: 7, y: 20 } },
      ] as const) {
        const plans = rankPlans(arena, rebound({ id: mate.id, at: mate.at }), OPENER);
        expect(onBall(plans), `${mate.id}: ${JSON.stringify(show(plans))}`).toBe(true);
      }
    });

    it('control: without the shot, the same Striker with the same team-mate beside the ball still goes for it', () => {
      const state = rebound({ id: 'A-striker-3', at: { x: 7, y: 25 } });
      const unshot: MatchState = { ...state, turn: { ...state.turn!, shot: false } };
      expect(onBall(rankPlans(arena, unshot, OPENER))).toBe(true);
    });
  });

  describe('point 4: the keeper never throws into an interceptor', () => {
    function relaunch(defenders: Point[], receiver: Point = { x: 7, y: 8 }): MatchState {
      let s = parkB(board());
      s = carrying(put(s, keeper, { x: 7, y: 1 }), keeper);
      s = put(s, OPENER, receiver);
      s = { ...s, lastCarrierTeam: 'B' };
      defenders.forEach((d, i) => {
        s = put(s, i === 0 ? 'B-striker-2' : 'B-striker-3', d);
      });
      return giveTurnTo(s, keeper);
    }

    const throws = (plans: Plan[]) => plans.filter((p) => p.steps.some((s) => s.kind === 'pass'));
    const free = (plan: Plan) => / 0 in the lane/.test(plan.why);

    it('a clean pass from where it stands is thrown at once', () => {
      const state = relaunch([]);
      const plans = rankPlans(arena, state, keeper);
      expect(kinds(plans[0]!), JSON.stringify(show(plans))).toEqual(['pass']);
      expect(chooseAction(arena, state, keeper)).toEqual({ kind: 'pass', targetId: OPENER });
      // And no plan walks first to throw: the clean lane is here.
      expect(throws(plans).every((p) => p.steps.length === 1)).toBe(true);
    });

    it('with the only receiver in a defended lane it walks to a clean lane and throws from there', () => {
      const state = relaunch([{ x: 7, y: 4 }]);
      const plans = rankPlans(arena, state, keeper);
      expect(kinds(plans[0]!), JSON.stringify(show(plans))).toEqual(['move', 'pass']);
      expect(throws(plans).every(free), JSON.stringify(show(throws(plans)))).toBe(true);
      expect(plans.some((p) => p.steps.length === 1 && p.steps[0]!.kind === 'pass')).toBe(false);

      const events: MatchEvent[] = playOutTurn(state, keeper);
      const passed = events.findIndex((e) => e.kind === 'passed');
      const moved = events.findIndex((e) => e.kind === 'moved');
      expect(moved).toBeGreaterThanOrEqual(0);
      expect(passed).toBeGreaterThan(moved);
    });

    it('with no clean lane within a move it digs in and keeps the ball', () => {
      // The receiver is eleven cells out with an opponent beside it: any lane
      // ends within one cell of that opponent, and no cell within a move is
      // close enough to make a flight of one cell.
      const state = relaunch([{ x: 7, y: 13 }], { x: 7, y: 12 });
      const plans = rankPlans(arena, state, keeper);
      expect(throws(plans), JSON.stringify(show(plans))).toHaveLength(0);
      expect(chooseAction(arena, state, keeper)).toEqual({ kind: 'brace' });
    });
  });

  describe('point 5: the relays read a keeper carrier where it stands', () => {
    function keeperHasIt(who: UnitId): MatchState {
      let s = parkB(board());
      s = carrying(put(s, keeper, { x: 7, y: 1 }), keeper);
      s = put(s, who, { x: 7, y: 20 });
      s = { ...s, lastCarrierTeam: 'B' };
      return clockOn(s, who);
    }

    it.each(['A-striker-2', trajector] as const)(
      "the %s ends its turn within throw range and sight of the keeper's own cell",
      (who) => {
        const plans = rankPlans(arena, keeperHasIt(who), who);
        const end = endOf(plans[0]!);
        expect(end, JSON.stringify(show(plans))).not.toBeNull();
        const at = { x: 7, y: 1 };
        const range = throwRange(end!, at);
        expect(range.ok && range.mode === 'normal', `${JSON.stringify(end)} is ${distance(end!, at)} from the keeper`).toBe(true);
        expect(hasLineOfSight(arena, end!, at)).toBe(true);
        // It came back towards the keeper, not away down the pitch.
        expect(distance(end!, at)).toBeLessThan(distance({ x: 7, y: 20 }, at));
      },
    );
  });

  describe('point 6: "call for the ball" passes outside the chain', () => {
    /** Striker A-striker-2 carries from (7,30) with the Action in hand; `mate` stands at `at`. */
    function thrower(mate: UnitId, at: Point): MatchState {
      let s = parkB(board());
      s = carrying(put(s, OPENER, { x: 7, y: 30 }), OPENER);
      s = put(s, mate, at);
      s = { ...s, lastCarrierTeam: 'A' };
      return clockOn(s, OPENER);
    }

    const call = (receiverId: UnitId): AllyOrder[] => [{ kind: 'callForPass', to: OPENER, receiverId }];
    const offered = (plans: Plan[], id: UnitId) => plans.filter((p) => passesTo(p, id));

    it('a called receiver that has already played is still offered the ball, an unasked one is not', () => {
      // The Trajector leads its side's ladder: it has played when the Striker's turn comes.
      const state = thrower(trajector, { x: 7, y: 36 });
      expect(offered(rankPlans(arena, state, OPENER), trajector)).toHaveLength(0);
      const plans = rankPlans(arena, state, OPENER, call(trajector));
      expect(offered(plans, trajector).length, JSON.stringify(show(plans))).toBeGreaterThan(0);
    });

    it('a called receiver ten cells behind the thrower is offered too, an unasked one is not', () => {
      const state = thrower('A-striker-3', { x: 7, y: 20 });
      expect(offered(rankPlans(arena, state, OPENER), 'A-striker-3')).toHaveLength(0);
      const plans = rankPlans(arena, state, OPENER, call('A-striker-3'));
      expect(offered(plans, 'A-striker-3').length, JSON.stringify(show(plans))).toBeGreaterThan(0);
    });

    it('the call does not lift the lane: with an opponent beside the called receiver no clean throw to it exists', () => {
      let state = thrower(trajector, { x: 7, y: 36 });
      state = put(state, 'B-striker-2', { x: 7, y: 37 });
      const plans = rankPlans(arena, state, OPENER, call(trajector));
      const toThem = offered(plans, trajector);
      expect(toThem.length).toBeGreaterThan(0);
      // Offered, but priced as defended: nothing in the list claims a clean lane
      // for a flight longer than one cell.
      expect(toThem.some((p) => / 0 in the lane/.test(p.why) && p.steps.length === 1)).toBe(false);
    });
  });
});
