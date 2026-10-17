/**
 * Ecart 65 and the yielded seat (2H.33, engine 11).
 *
 * Ecart 65: in a Striker or Breaker block holding two or three humans, the
 * human first at the kick-off d20 is asked its place, and the others are
 * placed right behind it, in d20 order, when the choice is made.
 *
 * `yieldSeat`: a human hands its unit to the AI, at any time, through
 * `reduce`; `legalActions` never offers it.
 *
 * Seed 5 is used throughout.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { TURN_TIMER_SECONDS } from './constants.js';
import type { MatchEvent } from './events.js';
import { legalActions } from './legalActions.js';
import { reduce } from './reduce.js';
import { createMatch, type HumanSeat } from './setup.js';
import type { Role } from './stats.js';
import { unitById, type MatchState, type Unit } from './types.js';
import { openSession, serveAction, submitAction, type Session } from '../server/session.js';

const arena = new Arena(KILL_SILO);
const T0 = 1_700_000_000_000;
const TIMER = TURN_TIMER_SECONDS * 1000;
const SEED = 5;

const NAMES = ['jerome', 'ana', 'kai'];

function seats(role: Role, count: number): HumanSeat[] {
  return NAMES.slice(0, count).map((humanId) => ({ humanId, role, name: humanId }));
}

function fresh(role: Role, count: number, seed = SEED): MatchState {
  return createMatch({ arena: KILL_SILO, tier: 'rookie', humans: seats(role, count), seed });
}

function open(role: Role, count: number, seed = SEED) {
  return openSession(arena, fresh(role, count, seed), T0);
}

function ofKind<K extends MatchEvent['kind']>(events: readonly MatchEvent[], kind: K) {
  return events.filter((e): e is Extract<MatchEvent, { kind: K }> => e.kind === kind);
}

function humanIdOf(unit: Unit): string {
  return unit.controller.kind === 'human' ? unit.controller.humanId : '';
}

/** The human units of a role on team A, first at the d20 first (higher initiative plays first). */
function byD20(state: MatchState, role: Role): Unit[] {
  return state.units
    .filter((u) => u.team === 'A' && u.role === role && u.controller.kind === 'human')
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));
}

/** The unit ids of team A's block of a role, in ladder order. */
function block(state: MatchState, role: Role): string[] {
  return state.turnOrder
    .filter((s) => s.actor.kind === 'unit' && s.team === 'A')
    .map((s) => (s.actor as { unitId: string }).unitId)
    .filter((id) => unitById(state, id).role === role);
}

function slotOf(state: MatchState, unitId: string) {
  return state.turnOrder.find((s) => s.actor.kind === 'unit' && s.actor.unitId === unitId)!;
}

function act(session: Session, action: Parameters<typeof submitAction>[2]['action'], now = T0) {
  const unit = unitById(session.state, session.state.turn!.unitId);
  const result = submitAction(arena, session, { humanId: humanIdOf(unit), unitId: unit.id, action }, now);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result.step;
}

/** Answers the popup with `place`. */
function choose(session: Session, place: number) {
  return act(session, { kind: 'choosePlace', place });
}

/**
 * Plays round 1 out: every popup is answered with the last place, every human
 * turn ends at once. Returns every event of the round, opening included.
 */
function playRoundOne(opened: ReturnType<typeof open>) {
  let session = opened.session;
  const events: MatchEvent[] = [...opened.events];
  for (let guard = 0; guard < 60 && session.state.round === 1 && session.state.phase !== 'finished'; guard++) {
    const placing = session.state.turn!.placing ?? null;
    const step = act(session, placing !== null ? { kind: 'choosePlace', place: placing } : { kind: 'endTurn' });
    session = step.session;
    events.push(...step.events);
  }
  return { session, events };
}

describe('ecart 65: several humans of one role', () => {
  // Rule: the first human at the d20 is the only one asked, with places = active units - other humans.
  it('asks only the human first at the d20, with two places for two humans among three Strikers', () => {
    const { session, events } = open('striker', 2);
    const [first, second] = byD20(session.state, 'striker');
    expect(first!.initiative).not.toBe(second!.initiative);
    expect(first!.initiative!).toBeGreaterThan(second!.initiative!);

    const offers = ofKind(events, 'placeOffered');
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ unitId: first!.id, round: 1, places: 2 });
    expect(session.state.turn!.unitId).toBe(first!.id);
    expect(session.state.turn!.placing).toBe(2);
  });

  // Rule: the other humans of the role sit right behind the chooser, in d20 order, all marked placed.
  it('puts the second human right behind the first on place 1, and behind the AI on place 2', () => {
    const one = open('striker', 2);
    const [first, second] = byD20(one.session.state, 'striker');
    const ai = one.session.state.units.find(
      (u) => u.team === 'A' && u.role === 'striker' && u.controller.kind === 'ai',
    )!;

    const afterOne = choose(one.session, 1).session.state;
    expect(block(afterOne, 'striker')).toEqual([first!.id, second!.id, ai.id]);
    expect(slotOf(afterOne, first!.id).placed).toBe(true);
    expect(slotOf(afterOne, second!.id).placed).toBe(true);

    const two = open('striker', 2);
    const afterTwo = choose(two.session, 2).session.state;
    expect(block(afterTwo, 'striker')).toEqual([ai.id, first!.id, second!.id]);
    expect(slotOf(afterTwo, first!.id).placed).toBe(true);
    expect(slotOf(afterTwo, second!.id).placed).toBe(true);
  });

  // Rule: the second human is never asked, it is placed by the first one's choice.
  it('never asks the second human during the whole first round', () => {
    const { session, events } = playRoundOne(open('striker', 2));
    const [first, second] = byD20(session.state, 'striker');
    const offered = ofKind(events, 'placeOffered').filter((e) => e.round === 1).map((e) => e.unitId);
    expect(offered).toEqual([first!.id]);
    expect(offered).not.toContain(second!.id);
    expect(ofKind(events, 'placeChosen').map((e) => e.unitId)).toEqual([first!.id]);
    // The second human still played its turn.
    expect(ofKind(events, 'turnStarted').some((e) => e.unitId === second!.id && e.round === 1)).toBe(true);
  });

  // Rule: two Breakers both human leave one order only, so no popup, and d20 order decides.
  it('offers no popup to two human Breakers, who play in d20 order', () => {
    const { session, events } = playRoundOne(open('breaker', 2));
    const [first, second] = byD20(session.state, 'breaker');
    expect(ofKind(events, 'placeOffered')).toHaveLength(0);
    expect(ofKind(events, 'placeChosen')).toHaveLength(0);

    const breakers = session.state.units.filter((u) => u.team === 'A' && u.role === 'breaker');
    expect(breakers).toHaveLength(2);
    const order = ofKind(events, 'turnStarted')
      .filter((e) => e.round === 1)
      .map((e) => e.unitId)
      .filter((id) => breakers.some((b) => b.id === id));
    expect(order).toEqual([first!.id, second!.id]);
  });

  // Rule: three Strikers all human leave one order only, so no popup, and d20 order decides.
  it('offers no popup to three human Strikers', () => {
    const { session, events } = playRoundOne(open('striker', 3));
    expect(ofKind(events, 'placeOffered')).toHaveLength(0);
    expect(ofKind(events, 'placeChosen')).toHaveLength(0);

    const order = byD20(session.state, 'striker').map((u) => u.id);
    expect(order).toHaveLength(3);
    const starts = ofKind(events, 'turnStarted')
      .filter((e) => e.round === 1)
      .map((e) => e.unitId)
      .filter((id) => order.includes(id));
    expect(starts).toEqual(order);
  });

  // Rule: a clock that runs out takes the last place on offer, and the other humans still go behind.
  it('takes the last place for the first human when the clock runs out, the second still goes behind', () => {
    const { session } = open('striker', 2);
    const [first, second] = byD20(session.state, 'striker');
    const ai = session.state.units.find(
      (u) => u.team === 'A' && u.role === 'striker' && u.controller.kind === 'ai',
    )!;

    const served = serveAction(
      arena,
      session,
      { humanId: humanIdOf(first!), unitId: first!.id, action: { kind: 'endTurn' } },
      T0 + TIMER + 1,
    );
    if (!served.ok) throw new Error(served.reason);

    expect(served.expired).toBe(true);
    expect(ofKind(served.step.events, 'placeChosen')).toEqual([
      { kind: 'placeChosen', unitId: first!.id, place: 2 },
    ]);
    expect(block(served.step.session.state, 'striker')).toEqual([ai.id, first!.id, second!.id]);
    expect(slotOf(served.step.session.state, second!.id).placed).toBe(true);
    expect(served.step.session.state.turn!.unitId).toBe(first!.id);
  });
});

describe('yieldSeat through the engine', () => {
  const yieldFor = (state: MatchState, unitId: string) =>
    reduce(arena, state, { unitId, action: { kind: 'yieldSeat' } });

  // Rule: a human unit off the clock is handed to the AI at once, with exactly one seatYielded.
  it('hands a human unit that is not on the clock to the AI with one seatYielded', () => {
    const { session } = open('striker', 2);
    const [first, second] = byD20(session.state, 'striker');
    expect(session.state.turn!.unitId).toBe(first!.id);

    const result = yieldFor(session.state, second!.id);
    if (!result.ok) throw new Error(result.reason);
    expect(unitById(result.state, second!.id).controller).toEqual({ kind: 'ai' });
    expect(result.events).toEqual([
      { kind: 'seatYielded', unitId: second!.id, humanId: humanIdOf(second!) },
    ]);
    // The popup of the first human is untouched.
    expect(result.state.turn!.unitId).toBe(first!.id);
    expect(result.state.turn!.placing).toBe(2);
  });

  // Rule: only a human seat can be yielded.
  it('refuses a unit that is already the AI', () => {
    const { session } = open('striker', 2);
    const ai = session.state.units.find((u) => u.controller.kind === 'ai')!;
    expect(yieldFor(session.state, ai.id).ok).toBe(false);
  });

  // Rule: a yielded unit being asked its place gets the last place from the house.
  it('takes the last place for a unit that is being asked its place', () => {
    const { session } = open('striker', 2);
    const id = session.state.turn!.unitId;
    const places = session.state.turn!.placing!;

    const result = yieldFor(session.state, id);
    if (!result.ok) throw new Error(result.reason);
    expect(result.events[0]).toMatchObject({ kind: 'seatYielded', unitId: id });
    expect(result.events[1]).toEqual({ kind: 'placeChosen', unitId: id, place: places });
    expect(unitById(result.state, id).controller).toEqual({ kind: 'ai' });
  });

  // Rule: legalActions never offers yieldSeat, neither in a popup nor on a turn.
  it('is never offered by legalActions, in a popup or on a turn', () => {
    const popup = open('striker', 2).session;
    const turn = choose(popup, 1).session;
    expect(turn.state.turn!.placing).toBeNull();
    for (const state of [popup.state, turn.state]) {
      const legal = legalActions(arena, state)!;
      expect(legal).not.toBeNull();
      expect('yieldSeat' in legal).toBe(false);
      expect(legal.simple.some((a) => a.kind === 'yieldSeat')).toBe(false);
    }
  });
});
