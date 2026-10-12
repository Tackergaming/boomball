/**
 * Écart 58 (engine 7, 2H.12): a human Striker or Breaker chooses its place in
 * its role each round. The engine asks (`placeOffered`) when the ladder reaches
 * the first turn of the human's block, the human answers `choosePlace`, and the
 * server's clock gives the choice its own deadline and the turn that follows a
 * fresh one.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { TURN_TIMER_SECONDS } from './constants.js';
import type { MatchEvent } from './events.js';
import { buildTurnOrder } from './initiative.js';
import { legalActions, onlyEndTurnLeft } from './legalActions.js';
import { reduce } from './reduce.js';
import { createMatch, type HumanSeat } from './setup.js';
import type { Role } from './stats.js';
import { unitById, type MatchState } from './types.js';
import { openSession, serveAction, submitAction, type Session } from '../server/session.js';

const arena = new Arena(KILL_SILO);
const T0 = 1_700_000_000_000;
const TIMER = TURN_TIMER_SECONDS * 1000;
const HUMAN = 'jerome';

function seat(role: Role): HumanSeat[] {
  return [{ humanId: HUMAN, role, name: 'Bombast' }];
}

function fresh(role: Role, seed = 5): MatchState {
  return createMatch({ arena: KILL_SILO, tier: 'rookie', humans: seat(role), seed });
}

function open(role: Role, seed = 5) {
  return openSession(arena, fresh(role, seed), T0);
}

/** The human's unit id in a state. */
function humanUnitId(state: MatchState): string {
  return state.units.find((u) => u.controller.kind === 'human')!.id;
}

/** One of the human's actions through the session, which must be accepted. */
function act(session: Session, action: Parameters<typeof submitAction>[2]['action'], now = T0) {
  const result = submitAction(
    arena,
    session,
    { humanId: HUMAN, unitId: session.state.turn!.unitId, action },
    now,
  );
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result.step;
}

function ofKind<K extends MatchEvent['kind']>(events: readonly MatchEvent[], kind: K) {
  return events.filter((e): e is Extract<MatchEvent, { kind: K }> => e.kind === kind);
}

describe('écart 58: the human chooses its place in its role', () => {
  it('asks a lone human Striker its place among three, before its turn begins', () => {
    const { session, events } = open('striker');
    const id = humanUnitId(session.state);

    expect(session.state.turn!.unitId).toBe(id);
    expect(session.state.turn!.placing).toBe(3);

    const offers = ofKind(events, 'placeOffered').filter((e) => e.unitId === id);
    expect(offers).toHaveLength(1);
    expect(offers[0]!.places).toBe(3);
    expect(offers[0]!.round).toBe(1);

    const offeredAt = events.findIndex((e) => e.kind === 'placeOffered' && e.unitId === id);
    const humanStartsAfter = events.findIndex(
      (e, i) => i > offeredAt && e.kind === 'turnStarted' && e.unitId === id,
    );
    expect(humanStartsAfter).toBe(-1);

    const slot = session.state.turnOrder[session.state.turnIndex]!;
    expect(slot.actor).toEqual({ kind: 'unit', unitId: id });
  });

  it('offers nothing but the choice of a place while it is being asked', () => {
    const { session } = open('striker');
    const { state } = session;
    const id = state.turn!.unitId;
    const human = unitById(state, id);

    const legal = legalActions(arena, state)!;
    expect(legal.choosePlace).toEqual([1, 2, 3]);
    expect(legal.simple).toEqual([1, 2, 3].map((place) => ({ kind: 'choosePlace', place })));
    expect(legal.destinations.size).toBe(0);
    expect(legal.canDash).toBe(false);
    expect(onlyEndTurnLeft(legal)).toBe(false);

    expect(reduce(arena, state, { unitId: id, action: { kind: 'endTurn' } }).ok).toBe(false);
    const step = { x: human.x, y: human.y + 1 };
    expect(reduce(arena, state, { unitId: id, action: { kind: 'move', path: [step] } }).ok).toBe(false);
    expect(reduce(arena, state, { unitId: id, action: { kind: 'choosePlace', place: 4 } }).ok).toBe(false);
    expect(reduce(arena, state, { unitId: id, action: { kind: 'choosePlace', place: 0 } }).ok).toBe(false);
  });

  it('starts the human turn at once on place 1', () => {
    const { session } = open('striker');
    const id = session.state.turn!.unitId;

    const result = reduce(arena, session.state, { unitId: id, action: { kind: 'choosePlace', place: 1 } });
    if (!result.ok) throw new Error(result.reason);

    expect(result.events.map((e) => e.kind)).toEqual(['placeChosen', 'turnStarted']);
    expect(result.events[0]).toEqual({ kind: 'placeChosen', unitId: id, place: 1 });
    expect(result.state.turn!.unitId).toBe(id);
    expect(result.state.turn!.placing).toBeNull();
    // choosePlace is refused once the turn is being played.
    expect(
      reduce(arena, result.state, { unitId: id, action: { kind: 'choosePlace', place: 1 } }).ok,
    ).toBe(false);
  });

  it('lets both AI Strikers play first on place 3, with no second popup', () => {
    const { session } = open('striker');
    const id = session.state.turn!.unitId;
    const strikers = session.state.units.filter(
      (u) => u.team === 'A' && u.role === 'striker' && u.id !== id,
    );
    expect(strikers).toHaveLength(2);

    const step = act(session, { kind: 'choosePlace', place: 3 });

    const order = step.events
      .filter((e) => e.kind === 'turnStarted' || e.kind === 'placeChosen')
      .map((e) => (e.kind === 'placeChosen' ? 'chosen' : (e as { unitId: string }).unitId));
    expect(order[0]).toBe('chosen');
    const humanAt = order.indexOf(id);
    expect(humanAt).toBeGreaterThan(0);
    for (const s of strikers) {
      const at = order.indexOf(s.id);
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(humanAt);
    }

    expect(step.session.state.turn!.unitId).toBe(id);
    expect(step.session.state.turn!.placing).toBeNull();
    expect(step.session.turnDeadline).not.toBeNull();
    expect(ofKind(step.events, 'placeOffered').filter((e) => e.unitId === id)).toHaveLength(0);
  });

  it('puts exactly one AI Striker before the human on place 2', () => {
    const { session } = open('striker');
    const id = session.state.turn!.unitId;
    const strikerIds = session.state.units
      .filter((u) => u.team === 'A' && u.role === 'striker')
      .map((u) => u.id);

    const step = act(session, { kind: 'choosePlace', place: 2 });

    const starts = ofKind(step.events, 'turnStarted').map((e) => e.unitId);
    expect(starts[starts.length - 1]).toBe(id);
    const between = starts.slice(0, -1).filter((u) => strikerIds.includes(u));
    expect(between).toHaveLength(1);
    expect(between[0]).not.toBe(id);
    expect(step.session.state.turn!.unitId).toBe(id);
    expect(step.session.state.turn!.placing).toBeNull();
  });

  it('asks again the next round', () => {
    const opened = open('striker');
    let session = opened.session;
    const id = session.state.turn!.unitId;
    const all: MatchEvent[] = [...opened.events];

    for (let guard = 0; guard < 30 && session.state.round === 1; guard++) {
      const action =
        session.state.turn!.placing !== null
          ? ({ kind: 'choosePlace', place: 1 } as const)
          : ({ kind: 'endTurn' } as const);
      const step = act(session, action);
      session = step.session;
      all.push(...step.events);
    }

    const offers = ofKind(all, 'placeOffered').filter((e) => e.unitId === id);
    expect(offers.map((e) => e.round)).toEqual([1, 2]);
    expect(session.state.round).toBe(2);
    expect(session.state.turn!.unitId).toBe(id);
    expect(session.state.turn!.placing).toBe(3);
  });

  it('offers two places when one of the two AI Strikers is off the field', () => {
    const base = fresh('striker');
    const aiStriker = base.units.find(
      (u) => u.team === 'A' && u.role === 'striker' && u.controller.kind === 'ai',
    )!;
    const hurt: MatchState = {
      ...base,
      units: base.units.map((u) =>
        u.id === aiStriker.id ? { ...u, status: 'evacuated' as const, evacuatedOnRound: 1 } : u,
      ),
    };
    const state: MatchState = { ...hurt, turnOrder: buildTurnOrder(arena, hurt) };

    const { session, events } = openSession(arena, state, T0);
    const id = humanUnitId(session.state);

    expect(session.state.turn!.unitId).toBe(id);
    expect(session.state.turn!.placing).toBe(2);
    expect(ofKind(events, 'placeOffered').filter((e) => e.unitId === id)[0]!.places).toBe(2);
    expect(legalActions(arena, session.state)!.choosePlace).toEqual([1, 2]);
  });

  it('never asks a human Trajector or Bulwark in the first round', () => {
    for (const role of ['trajector', 'bulwark'] as const) {
      const opened = open(role);
      let session = opened.session;
      const all: MatchEvent[] = [...opened.events];
      for (let guard = 0; guard < 10 && session.state.round === 1 && session.state.phase !== 'finished'; guard++) {
        expect(session.state.turn!.placing).toBeNull();
        const step = act(session, { kind: 'endTurn' });
        session = step.session;
        all.push(...step.events);
      }
      expect(session.state.round).toBe(2);
      expect(ofKind(all, 'placeOffered')).toHaveLength(0);
      expect(ofKind(all, 'placeChosen')).toHaveLength(0);
    }
  });

  it('settles the choice on the last place when the clock runs out, and gives the next turn a fresh clock', () => {
    const { session } = open('striker');
    const id = session.state.turn!.unitId;
    const deadline = session.turnDeadline!;
    expect(deadline).toBe(T0 + TIMER);

    const now = deadline + 5_000;
    const served = serveAction(
      arena,
      session,
      { humanId: HUMAN, unitId: id, action: { kind: 'endTurn' } },
      now,
    );
    if (!served.ok) throw new Error(served.reason);

    expect(served.expired).toBe(true);
    expect(ofKind(served.step.events, 'placeChosen')).toEqual([
      { kind: 'placeChosen', unitId: id, place: 3 },
    ]);
    expect(served.step.session.state.turn!.unitId).toBe(id);
    expect(served.step.session.state.turn!.placing).toBeNull();
    expect(served.step.session.turnDeadline).toBe(now + TIMER);

  });

  // Found by this test (sub-agent Sonnet) and fixed by the fil principal: the
  // session read who was on the clock from the state after the choice, which
  // after place 1 is already the human's turn, so the turn kept the choice's
  // deadline. `advance` now takes the clock key read before the action.
  it('gives the turn that follows place 1 a fresh clock', () => {
    const { session } = open('striker');
    const id = session.state.turn!.unitId;
    const deadline = session.turnDeadline!;
    const t = T0 + 5_000;
    const quick = act(session, { kind: 'choosePlace', place: 1 }, t);
    expect(quick.session.state.turn!.unitId).toBe(id);
    expect(quick.session.state.turn!.placing).toBeNull();
    expect(quick.session.turnDeadline).toBe(t + TIMER);
    expect(quick.session.turnDeadline).not.toBe(deadline);
  });

  it('offers two places to a lone human Breaker', () => {
    const { session, events } = open('breaker');
    const id = humanUnitId(session.state);

    expect(unitById(session.state, id).role).toBe('breaker');
    expect(session.state.turn!.unitId).toBe(id);
    expect(session.state.turn!.placing).toBe(2);
    const offers = ofKind(events, 'placeOffered').filter((e) => e.unitId === id);
    expect(offers).toHaveLength(1);
    expect(offers[0]!.places).toBe(2);
  });
});
