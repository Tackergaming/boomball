import { describe, expect, it } from 'vitest';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { MATCH_ROUNDS, MOVE_SPEED_FEET } from '../engine/constants.js';
import { distance, type Point } from '../engine/geometry.js';
import type { Action } from '../engine/actions.js';
import type { MatchEvent } from '../engine/events.js';
import { legalActions } from '../engine/legalActions.js';
import { openMatch, reduce } from '../engine/reduce.js';
import { rangeToFurnace } from '../engine/rules/payload.js';
import { createMatch } from '../engine/setup.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import { chooseAction, rankPlans, type Plan } from './chooseAction.js';
import { buildBoard, carrierCrackerPressure, carrierExposure, parryPost } from './evaluate.js';
import { weightsFor } from './roles/index.js';

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
      freePass: false,
      pickedBy: null,
      delegated: false,
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

/** One unit's turn with the real ladder set aside, handing back the board it leaves. */
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

describe("Jérôme's fifth pass, 2H.11", () => {
  const trajector = 'A-trajector-7';
  const breaker = 'A-breaker-5';

  /** Every B shirt parked at the A end, out of every scene's way. */
  function parkB(state: MatchState, at: Point = { x: 7, y: 2 }): MatchState {
    return { ...state, units: state.units.map((u) => (u.team === 'B' ? { ...u, ...at } : u)) };
  }

  function sparkAt(state: MatchState, at: Point, heading: number): MatchState {
    return { ...state, spark: { state: 'live', x: at.x, y: at.y, heading } };
  }

  /** Puts a live Cracker where a test wants it. */
  function crackerAt(state: MatchState, at: Point): MatchState {
    return {
      ...state,
      crackers: state.crackers.map((c, i) =>
        i === 0 ? { ...c, x: at.x, y: at.y, state: 'live' as const, respawnOnRound: null } : c,
      ),
    };
  }

  function endOf(action: Action): Point | null {
    return action.kind === 'move' ? action.path[action.path.length - 1]! : null;
  }

  /** The last cell of the last `move` step of a plan, or null. */
  function planEnd(plan: Plan): Point | null {
    const moves = plan.steps.filter((s) => s.kind === 'move');
    return moves.length === 0 ? null : endOf(moves[moves.length - 1]!);
  }

  const kinds = (plan: Plan) => plan.steps.map((s) => s.kind);

  /** The six best plans, for reading a failing scene. */
  function show(plans: Plan[]) {
    return plans.slice(0, 6).map((p) => [p.score.toFixed(1), kinds(p).join('>'), p.why]);
  }

  // -- The Spark ------------------------------------------------------------

  it('point 1: only the hunter walks onto the Spark, anybody on it tries', () => {
    // The Spark is live at (7, 22), two cells from the unit. A Striker used to
    // be offered "walk, then catch"; now only the Trajector (chaseSpark > 0).
    let scene = sparkAt(parkB(board()), { x: 7, y: 22 }, 3);

    // (a) A Striker two cells away: no plan walks then catches.
    const striker = put(scene, OPENER, { x: 7, y: 20 });
    const strikerPlans = rankPlans(arena, striker, OPENER);
    expect(strikerPlans.length).toBeGreaterThan(0);
    for (const plan of strikerPlans) {
      const ks = kinds(plan);
      expect(ks.includes('move') && ks.includes('catchSpark')).toBe(false);
    }

    // (b) The Trajector, the hunter, walks and catches.
    const hunter = giveTurnTo(put(scene, trajector, { x: 7, y: 20 }), trajector);
    const best = rankPlans(arena, hunter, trajector)[0]!;
    expect(kinds(best).slice(0, 2)).toEqual(['move', 'catchSpark']);

    // (c) A Striker standing on the Spark (shoved there, say) tries for it.
    // (The kick-off ball lies on that cell too, so it is sent away first.)
    const standing = put({ ...scene, payload: { carriedBy: null, x: 7, y: 40 }, lastCarrierTeam: 'A' }, OPENER, { x: 7, y: 22 });
    const plans = rankPlans(arena, standing, OPENER);
    expect(plans[0]!.steps[0]?.kind).toBe('catchSpark');
  });

  it('écart 57: a carrier never tries the Spark, the door and the AI agree', () => {
    // The hunter holds the ball on the live Spark's own cell: the catch used
    // to be offered (at 20 percent) and is no longer.
    let scene = sparkAt(parkB(board()), { x: 7, y: 22 }, 3);
    scene = carrying(giveTurnTo(put(scene, trajector, { x: 7, y: 22 }), trajector), trajector);

    const legal = legalActions(arena, scene)!;
    expect(legal.unitId).toBe(trajector);
    expect(legal.catchSpark).toBeNull();
    for (const plan of rankPlans(arena, scene, trajector)) {
      expect(kinds(plan)).not.toContain('catchSpark');
    }
  });

  // -- The plan of the turn -------------------------------------------------

  it('point 4: the approach Dash is a plan for the Trajector and the Breaker, scored on ground closed', () => {
    // B's carrier is twenty cells away, out of any walk; the Dash buys sixteen
    // more cells of ground. Everybody else on B is out of the way at its mouth.
    const stage = (): MatchState => {
      let s = parkB(board(), { x: 7, y: 44 });
      s = put(s, 'B-striker-2', { x: 7, y: 30 });
      return carrying(s, 'B-striker-2');
    };

    // (a) The Trajector, no Spark on the pitch.
    const a = clockOn(put(stage(), trajector, { x: 7, y: 10 }), trajector);
    const planA = rankPlans(arena, a, trajector);
    expect(planA[0]!.steps[0]?.kind, JSON.stringify(show(planA))).toBe('dash');
    expect(planA[0]!.why).toContain('close on');
    const afterA = playTurnOf(a, trajector);
    expect(distance(unit(afterA, trajector), unit(afterA, 'B-striker-2'))).toBeLessThan(12);

    // (b) The Breaker.
    const b = clockOn(put(stage(), breaker, { x: 7, y: 10 }), breaker);
    const planB = rankPlans(arena, b, breaker);
    expect(planB[0]!.steps[0]?.kind, JSON.stringify(show(planB))).toBe('dash');
    expect(planB[0]!.why).toContain('close on');

    // (c) Point 20: a prey within a move comes first, the Breaker swings
    // at what it can reach before it runs at the carrier.
    const c = put(b, 'B-striker-3', { x: 7, y: 14 });
    const planC = rankPlans(arena, c, breaker);
    const best = planC[0]!;
    expect(best.steps.some((s) => s.kind === 'attack' && s.targetId === 'B-striker-3'), JSON.stringify(show(planC))).toBe(true);
    expect(kinds(best)).not.toContain('dash');
  });

  it('point 5: in attack a Striker swings at a non-carrier only for want of anything better', () => {
    // Own carrier still to play, a B Breaker one cell off OPENER. The swing
    // exists but is not the best thing to do.
    const attackScene = (): MatchState => {
      let s = parkB(board(), { x: 7, y: 2 });
      s = put(s, 'A-striker-3', { x: 7, y: 30 });
      s = carrying(s, 'A-striker-3');
      s = put(s, OPENER, { x: 7, y: 20 });
      return put(s, 'B-breaker-5', { x: 7, y: 21 });
    };
    const inAttack = rankPlans(arena, attackScene(), OPENER);
    const swing = inAttack.find((p) => p.steps[0]?.kind === 'attack');
    expect(swing, JSON.stringify(show(inAttack))).toBeDefined();
    expect(inAttack[0]!.steps[0]?.kind, JSON.stringify(show(inAttack))).not.toBe('attack');
    expect(swing!.score).toBeLessThan(inAttack[0]!.score);

    // The factor itself. A plan's score carries the cell it ends on and the
    // rest of the board, so the swing is isolated by moving `idleSwing` over
    // the same scene and reading the same plan: the swing is worth more at
    // full price (1) than at the Striker's share (0.2) in attack, and the
    // factor changes nothing when the ball is in B's hands.
    const weights = weightsFor('striker') as { idleSwing: number };
    const real = weights.idleSwing;
    expect(real).toBe(0.2);
    const swingScore = (scene: MatchState, factor: number): number => {
      weights.idleSwing = factor;
      try {
        const found = rankPlans(arena, scene, OPENER).find((p) => p.steps[0]?.kind === 'attack');
        expect(found, `a swing at idleSwing ${factor}`).toBeDefined();
        return found!.score;
      } finally {
        weights.idleSwing = real;
      }
    };
    expect(swingScore(attackScene(), 1)).toBeGreaterThan(swingScore(attackScene(), real));

    let defence = parkB(board(), { x: 7, y: 2 });
    defence = put(defence, 'B-striker-2', { x: 7, y: 40 });
    defence = carrying(defence, 'B-striker-2');
    defence = put(defence, OPENER, { x: 7, y: 20 });
    defence = put(defence, 'B-breaker-5', { x: 7, y: 21 });
    expect(swingScore(defence, real)).toBeCloseTo(swingScore(defence, 1), 6);
  });

  it('point 7: after a Dash the walk goes to the end of what the Dash bought', () => {
    // Sixteen cells to the carrier's side: eight walked, eight dashed. The
    // walk used to stop four cells in.
    let staged = parkB(board(), { x: 7, y: 44 });
    staged = put(staged, OPENER, { x: 7, y: 6 });
    staged = put(staged, 'B-striker-2', { x: 7, y: 40 });
    staged = carrying(staged, 'B-striker-2');

    const events = playOutTurn(staged, OPENER);
    expect(events.map((e) => e.kind)).toContain('dashed');
    const moves = events.filter((e): e is Extract<MatchEvent, { kind: 'moved' }> => e.kind === 'moved');
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[moves.length - 1]!.to.y).toBeGreaterThanOrEqual(20);
  });

  it('point 8: any pressed role disengages, the hunter takes the swing and goes', () => {
    // OPENER starts its turn in a B Breaker's reach, its carrier thirty-six up
    // the pitch: the way out is the Disengage, walk afterwards.
    let staged = parkB(board(), { x: 7, y: 2 });
    staged = put(staged, 'A-striker-3', { x: 7, y: 36 });
    staged = carrying(staged, 'A-striker-3');
    staged = put(staged, OPENER, { x: 7, y: 20 });
    staged = put(staged, 'B-breaker-5', { x: 7, y: 21 });
    const plans = rankPlans(arena, staged, OPENER);
    expect(plans.some((p) => p.steps[0]?.kind === 'disengage'), JSON.stringify(show(plans))).toBe(true);

    // The hunter, with the Spark live, does not disengage: it takes the
    // opportunity attack and goes.
    let hunt = sparkAt(parkB(board(), { x: 7, y: 2 }), { x: 7, y: 30 }, 3);
    hunt = put(hunt, trajector, { x: 7, y: 20 });
    hunt = put(hunt, 'B-breaker-5', { x: 7, y: 21 });
    hunt = clockOn(hunt, trajector);
    const huntPlans = rankPlans(arena, hunt, trajector);
    expect(huntPlans.length).toBeGreaterThan(0);
    for (const plan of huntPlans) expect(plan.steps[0]?.kind, JSON.stringify(show(huntPlans))).not.toBe('disengage');
  });

  it('point 10: once the Action is spent the ball is a carrier\'s end of turn, safety included', () => {
    // A Striker has no Action left and the ball lies two cells off. Three B
    // Strikers stand on the ball's doorstep: ending there is a carrier's end
    // of turn into three shovers, so it does not. Without them it does. Until
    // 2H.12 the scene was the Breaker's; since C14 the Breaker picks the ball
    // up first, Action or not, so the rule is read on a Striker and the
    // Breaker's side of it is asserted the other way below.
    const stage = (who: string, threats: boolean): MatchState => {
      let s = parkB(board(), { x: 7, y: 2 });
      s = { ...s, payload: { carriedBy: null, x: 7, y: 22 }, lastCarrierTeam: 'A' };
      s = clockOn(put(s, who, { x: 7, y: 24 }), who);
      s = { ...s, turn: { ...s.turn!, actionUsed: true } };
      if (threats) {
        s = put(s, 'B-striker-2', { x: 6, y: 20 });
        s = put(s, 'B-striker-3', { x: 8, y: 20 });
        s = put(s, 'B-striker-4', { x: 7, y: 19 });
      }
      return s;
    };
    const onBall = (a: Action) => {
      const end = endOf(a);
      return end !== null && end.x === 7 && end.y === 22;
    };

    const hot = stage(OPENER, true);
    const hotPlans = rankPlans(arena, hot, OPENER);
    expect(onBall(chooseAction(arena, hot, OPENER)), JSON.stringify(show(hotPlans))).toBe(false);

    const calm = stage(OPENER, false);
    const calmPlans = rankPlans(arena, calm, OPENER);
    expect(onBall(chooseAction(arena, calm, OPENER)), JSON.stringify(show(calmPlans))).toBe(true);

    // The Breaker picks it up all the same (2H.12, `00` C14).
    const breakerHot = stage(breaker, true);
    const breakerPlans = rankPlans(arena, breakerHot, breaker);
    expect(breakerPlans[0]!.steps.map((s) => s.kind), JSON.stringify(show(breakerPlans))).toEqual(['move', 'grabPayload']);
  });

  it('point 12: a carrier never walks backwards', () => {
    // A B Striker behind the carrier, still to play, makes the cell it stands
    // on exposed; the cells ahead are out of its reach. With nothing ahead
    // safer (B parked far away, exposure zero everywhere) the rule has an
    // exception, so the threat is what makes the scene bite.
    let staged = carrying(parkB(put(board(), OPENER, { x: 7, y: 30 })), OPENER);
    staged = put(staged, 'B-striker-2', { x: 7, y: 26 });
    const view = buildBoard(arena, staged, unit(staged, OPENER), legalActions(arena, staged)!, weightsFor('striker'), []);
    expect(carrierExposure(view, { x: 7, y: 30 })).toBeGreaterThan(0);
    const furnace = arena.targetFurnaceOf('A');
    const here = rangeToFurnace({ x: 7, y: 30 }, furnace);
    const plans = rankPlans(arena, staged, OPENER);
    expect(plans.some((p) => p.steps.some((s) => s.kind === 'move'))).toBe(true);
    for (const plan of plans) {
      for (const step of plan.steps) {
        const end = endOf(step);
        if (!end) continue;
        expect(rangeToFurnace(end, furnace), `${kinds(plan).join('>')} ends at ${end.x},${end.y}`).toBeLessThanOrEqual(here);
      }
    }
  });

  it('point 13: the shot is not outpriced by a pass', () => {
    let staged = carrying(parkB(put(board(), OPENER, { x: 5, y: 32 })), OPENER);
    staged = put(staged, 'A-striker-3', { x: 9, y: 38 });
    const plans = rankPlans(arena, staged, OPENER);
    const best = plans[0]!;
    expect(kinds(best), JSON.stringify(show(plans))).toContain('shoot');
    for (const plan of plans) {
      if (kinds(plan).includes('pass')) expect(plan.score).toBeLessThan(best.score);
    }
  });

  it('point 14: a pass is priced on the receiver\'s exposure where it lands', () => {
    // The Strikers have played (the Breaker sits after them on the ladder),
    // so the receiver holds the ball through B's turns: three B Strikers
    // around it cost the pass.
    const stage = (crowded: boolean): MatchState => {
      let s = parkB(board(), { x: 7, y: 2 });
      s = carrying(clockOn(put(s, breaker, { x: 7, y: 22 }), breaker), breaker);
      // (7, 28) is a pillar, so the mate stands at (9, 30): in sight of (7, 22).
      s = put(s, 'A-striker-3', { x: 9, y: 30 });
      if (crowded) {
        s = put(s, 'B-striker-2', { x: 8, y: 32 });
        s = put(s, 'B-striker-3', { x: 10, y: 32 });
        s = put(s, 'B-striker-4', { x: 9, y: 33 });
      }
      return s;
    };
    const passScore = (s: MatchState): number => {
      const plans = rankPlans(arena, s, breaker);
      const plan = plans.find((p) => p.steps[0]?.kind === 'pass' && (p.steps[0] as { targetId: string }).targetId === 'A-striker-3');
      expect(plan, JSON.stringify(show(plans))).toBeDefined();
      return plan!.score;
    };
    expect(passScore(stage(true))).toBeLessThan(passScore(stage(false)));
  });

  describe('point 15: an opportunity attack costs five points at the least', () => {
    // A B Trajector stands beside the unit when it starts its turn, so any
    // route away provokes it. The same plan to the same end cell is read
    // with the Trajector parked away (X) and beside the unit (Y): the gap is
    // the opportunity attack's price, and the floor is five.
    const stage = (id: UnitId, provoked: boolean): MatchState => {
      let s = parkB(board(), { x: 7, y: 44 });
      s = { ...s, payload: { carriedBy: null, x: 7, y: 40 }, lastCarrierTeam: 'A' };
      s = clockOn(put(s, id, { x: 7, y: 20 }), id);
      if (provoked) s = put(s, 'B-trajector-7', { x: 7, y: 21 });
      return s;
    };
    const shaped = (s: MatchState, id: UnitId, shape: string) =>
      rankPlans(arena, s, id).filter((p) => kinds(p).join('>') === shape);
    const keyOf = (p: Plan) => {
      const end = planEnd(p)!;
      return `${end.x},${end.y}`;
    };

    function gapFor(id: UnitId, shape: string) {
      const X = shaped(stage(id, false), id, shape);
      const Y = shaped(stage(id, true), id, shape);
      expect(X.length).toBeGreaterThan(0);
      expect(Y.length).toBeGreaterThan(0);
      const inY = new Map(Y.map((p) => [keyOf(p), p]));
      const pairs = X.map((x) => ({ x, y: inY.get(keyOf(x)) })).filter(
        (pr) => pr.y !== undefined && (pr.y.provocations ?? 0) >= 1,
      );
      expect(pairs.length, `a ${shape} that provokes the Trajector`).toBeGreaterThan(0);
      return pairs;
    }

    it('a walk out of the melee, for the Breaker', () => {
      // The Breaker with a prey beside it is not offered a Dash (it swings
      // first), so the plan compared is the plain walk.
      for (const { x, y } of gapFor(breaker, 'move')) {
        expect(x.score - y!.score).toBeGreaterThanOrEqual(5);
        expect(y!.provocations).toBeGreaterThanOrEqual(1);
      }
    });

    it('a Dash and a walk, for the Striker', () => {
      for (const { x, y } of gapFor(OPENER, 'dash>move')) {
        expect(x.score - y!.score).toBeGreaterThanOrEqual(5);
        expect(y!.provocations).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('point 16: the keeper\'s leash counts in the carrier\'s threats, four cells from its mouth', () => {
    let staged = parkB(put(board(), OPENER, { x: 7, y: 36 }), { x: 7, y: 2 });
    staged = carrying(put(staged, 'B-bulwark-1', { x: 7, y: 43 }), OPENER);
    const view = buildBoard(arena, staged, unit(staged, OPENER), legalActions(arena, staged)!, weightsFor('striker'), []);
    // Seven cells off the keeper: out of its leash, so no threat at all.
    expect(carrierExposure(view, { x: 7, y: 36 })).toBe(0);
    // Three cells off its mouth: inside.
    expect(carrierExposure(view, { x: 7, y: 40 })).toBeGreaterThan(0);
  });

  // -- The last round -------------------------------------------------------

  describe('point 17: the clock and the score', () => {
    for (const [label, patch] of [
      ['the last round', { round: MATCH_ROUNDS }],
      ['sudden death', { round: MATCH_ROUNDS + 1, phase: 'suddenDeath' as const }],
    ] as const) {
      it(`${label}: the side that leads with the ball plays the possession`, () => {
        let staged = parkB(board(), { x: 7, y: 44 });
        staged = { ...staged, ...patch, score: { A: 10, B: 0 } };
        staged = carrying(put(staged, OPENER, { x: 7, y: 22 }), OPENER);
        staged = put(staged, 'B-striker-2', { x: 7, y: 26 });
        staged = put(staged, 'B-striker-3', { x: 6, y: 26 });
        const nearest = (s: MatchState) =>
          Math.min(...s.units.filter((u) => u.team === 'B').map((u) => distance(unit(s, OPENER), u)));

        const before = nearest(staged);
        const after = playTurnOf(staged, OPENER);
        expect(nearest(after)).toBeGreaterThan(before);
        expect(unit(after, OPENER).holdingPayload).toBe(true);
      });

      it(`${label}: the side without the ball does not run after what it cannot reach before the whistle`, () => {
        const scene = (extra: Partial<MatchState>): MatchState => {
          let s = { ...parkB(board(), { x: 7, y: 44 }), ...extra };
          s = carrying(put(s, 'B-striker-2', { x: 7, y: 40 }), 'B-striker-2');
          return put(s, OPENER, { x: 7, y: 10 });
        };
        // Control: before the last round the same scene has the approach Dash.
        const early = rankPlans(arena, scene({}), OPENER);
        expect(early.some((p) => p.steps[0]?.kind === 'dash' && p.why.includes('close on'))).toBe(true);
        const plans = rankPlans(arena, scene(patch), OPENER);
        expect(plans.length).toBeGreaterThan(0);
        for (const plan of plans) {
          if (plan.steps[0]?.kind === 'dash') expect(plan.why, JSON.stringify(show(plans))).not.toContain('close on');
        }
      });
    }
  });

  // -- The Breaker ----------------------------------------------------------

  it('point 19: in attack the protection of the carrier comes before the Cracker', () => {
    let staged = parkB(board(), { x: 7, y: 44 });
    staged = put(staged, 'A-striker-3', { x: 7, y: 24 });
    staged = carrying(staged, 'A-striker-3');
    staged = clockOn(put(staged, breaker, { x: 7, y: 14 }), breaker);
    staged = crackerAt(staged, { x: 5, y: 12 });

    const plans = rankPlans(arena, staged, breaker);
    const best = plans[0]!;
    expect(kinds(best), JSON.stringify(show(plans))).not.toContain('batCracker');
    const end = planEnd(best);
    expect(end, JSON.stringify(show(plans))).not.toBeNull();
    expect(distance(end!, { x: 7, y: 24 })).toBeLessThan(distance({ x: 7, y: 14 }, { x: 7, y: 24 }));
  });

  it('point 20: in defence with the Action spent the Breaker walks towards the carrier', () => {
    let staged = parkB(board(), { x: 7, y: 44 });
    staged = put(staged, 'B-striker-2', { x: 7, y: 36 });
    staged = carrying(staged, 'B-striker-2');
    staged = clockOn(put(staged, breaker, { x: 7, y: 14 }), breaker);
    staged = { ...staged, turn: { ...staged.turn!, actionUsed: true } };

    const plans = rankPlans(arena, staged, breaker);
    const end = endOf(chooseAction(arena, staged, breaker));
    expect(end, JSON.stringify(show(plans))).not.toBeNull();
    expect(distance(end!, { x: 7, y: 36 })).toBeLessThan(distance({ x: 7, y: 14 }, { x: 7, y: 36 }));
  });

  it('point 22: while a keeper relaunches the Breaker ends beside the probable receiver', () => {
    let staged = parkB(board(), { x: 0, y: 2 });
    staged = carrying(put(staged, 'B-bulwark-1', { x: 7, y: 43 }), 'B-bulwark-1');
    staged = put(staged, 'B-striker-2', { x: 7, y: 36 });
    staged = clockOn(put(staged, breaker, { x: 7, y: 30 }), breaker);
    staged = { ...staged, turn: { ...staged.turn!, actionUsed: true } };

    const plans = rankPlans(arena, staged, breaker);
    const end = endOf(chooseAction(arena, staged, breaker));
    expect(end, JSON.stringify(show(plans))).not.toBeNull();
    expect(distance(end!, { x: 7, y: 36 }), JSON.stringify(show(plans))).toBe(1);
  });

  describe('Crackers', () => {
    const viewOf = (s: MatchState, id: UnitId) =>
      buildBoard(arena, s, unit(s, id), legalActions(arena, s)!, weightsFor(unit(s, id).role), []);

    it('point 23: the parry post is worth the blast it spares a team-mate, none on an opponent', () => {
      // The Cracker at (0, 22) rolls east along row 22 to the ball under the
      // carrier at (9, 22): (4, 22) is on the line.
      const stage = (carrier: UnitId, hp: number): MatchState => {
        let s = parkB(board(), { x: 7, y: 2 });
        s = crackerAt(s, { x: 1, y: 22 });
        s = put(s, carrier, { x: 9, y: 22 }, { hp });
        s = carrying(s, carrier);
        return clockOn(put(s, breaker, { x: 6, y: 26 }), breaker);
      };
      const cell = { x: 4, y: 22 };

      const hurt = viewOf(stage('A-striker-3', 10), breaker);
      expect(hurt.crackerLines[0]?.some((p) => p.x === cell.x && p.y === cell.y), JSON.stringify(hurt.crackerLines)).toBe(true);
      const healthy = viewOf(stage('A-striker-3', 30), breaker);
      expect(parryPost(hurt, cell)).toBeGreaterThan(parryPost(healthy, cell));
      expect(parryPost(healthy, cell)).toBeGreaterThan(0);

      // The line ends on an opponent: nothing to spare.
      const theirs = viewOf(stage('B-striker-2', 30), breaker);
      expect(theirs.crackerLines[0]?.some((p) => p.x === cell.x && p.y === cell.y)).toBe(true);
      expect(parryPost(theirs, cell)).toBe(0);
    });

    it('point 27: the Cracker line is read towards the carrier\'s end cell', () => {
      // The Cracker at (0, 30) rolls eight cells along row 30 towards the ball
      // wherever the carrier ends: (3, 30) is on that line, (12, 30) is not.
      let staged = parkB(board(), { x: 7, y: 2 });
      staged = crackerAt(staged, { x: 0, y: 30 });
      staged = carrying(clockOn(put(staged, breaker, { x: 7, y: 25 }), breaker), breaker);
      const view = viewOf(staged, breaker);
      expect(carrierCrackerPressure(view, { x: 3, y: 30 })).toBe(1);
      expect(carrierCrackerPressure(view, { x: 12, y: 30 })).toBe(0);
    });
  });

  // -- The hunter -----------------------------------------------------------

  it('point 28: the hunter still picks up a loose ball and throws it', () => {
    let staged = sparkAt(parkB(board(), { x: 7, y: 2 }), { x: 7, y: 40 }, 1);
    staged = { ...staged, payload: { carriedBy: null, x: 7, y: 22 }, lastCarrierTeam: 'A' };
    staged = put(staged, 'A-striker-3', { x: 9, y: 30 });
    staged = giveTurnTo(put(staged, trajector, { x: 7, y: 21 }), trajector);

    const plans = rankPlans(arena, staged, trajector);
    expect(kinds(plans[0]!), JSON.stringify(show(plans))).toEqual(['move', 'grabPayload', 'pass']);
  });
});
