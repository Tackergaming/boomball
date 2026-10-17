/**
 * Handing a seat to the house (2H.33, engine 11), through the server layer.
 *
 * `yieldSeat` is the one request that need not wait for the unit's turn, but
 * its caller must control the unit; an overdue clock still wins over it.
 *
 * Seed 5, the TRIO seats: kai (Trajector) is on the clock first, then jerome
 * (Striker, asked his place), then ana (Bulwark).
 */

import { describe, expect, it } from 'vitest';

import type { Action } from '../engine/actions.js';
import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { TURN_TIMER_SECONDS } from '../engine/constants.js';
import type { MatchEvent } from '../engine/events.js';
import { createMatch, type HumanSeat } from '../engine/setup.js';
import { isHuman, unitById, type MatchState } from '../engine/types.js';
import { openSession, serveAction, submitAction, type Session } from './session.js';

const arena = new Arena(KILL_SILO);
const T0 = 1_700_000_000_000;
const TIMER = TURN_TIMER_SECONDS * 1000;
const SEED = 5;

const TRIO: HumanSeat[] = [
  { humanId: 'jerome', role: 'striker', name: 'Bombast' },
  { humanId: 'ana', role: 'bulwark', name: 'Hobbs' },
  { humanId: 'kai', role: 'trajector', name: 'Pell' },
];

function fresh(humans: readonly HumanSeat[], seed = SEED): MatchState {
  return createMatch({ arena: KILL_SILO, tier: 'rookie', humans, seed });
}

function open(humans: readonly HumanSeat[] = TRIO, seed = SEED) {
  return openSession(arena, fresh(humans, seed), T0);
}

function ofKind<K extends MatchEvent['kind']>(events: readonly MatchEvent[], kind: K) {
  return events.filter((e): e is Extract<MatchEvent, { kind: K }> => e.kind === kind);
}

function unitOf(state: MatchState, humanId: string) {
  return state.units.find((u) => u.controller.kind === 'human' && u.controller.humanId === humanId)!;
}

/** Ending the turn, or, asked its place, taking the last. */
function turnAction(session: Session): Action {
  const placing = session.state.turn?.placing ?? null;
  return placing !== null ? { kind: 'choosePlace', place: placing } : { kind: 'endTurn' };
}

/** Answers every popup with the last place until a turn is actually being played. */
function settle(session: Session, now = T0): Session {
  for (let guard = 0; guard < 10 && session.state.turn?.placing != null; guard++) {
    const unit = unitById(session.state, session.state.turn.unitId);
    const humanId = unit.controller.kind === 'human' ? unit.controller.humanId : '';
    const result = submitAction(arena, session, { humanId, unitId: unit.id, action: turnAction(session) }, now);
    if (!result.ok) throw new Error(result.reason);
    session = result.step.session;
  }
  return session;
}

/** Plays human turns (ending each) until `humanId` is on the clock, popups settled. */
function untilOnTheClock(session: Session, humanId: string): Session {
  for (let guard = 0; guard < 20; guard++) {
    session = settle(session);
    const unit = unitById(session.state, session.state.turn!.unitId);
    if (unit.controller.kind === 'human' && unit.controller.humanId === humanId) return session;
    const result = submitAction(
      arena,
      session,
      { humanId: (unit.controller as { humanId: string }).humanId, unitId: unit.id, action: { kind: 'endTurn' } },
      T0,
    );
    if (!result.ok) throw new Error(result.reason);
    session = result.step.session;
  }
  throw new Error(`${humanId} never came on the clock`);
}

const yieldRequest = (humanId: string, unitId: string) => ({
  humanId,
  unitId,
  action: { kind: 'yieldSeat' } as const,
});

describe('handing a seat to the house', () => {
  // Rule: only the unit's own human may yield it.
  it('refuses a human who does not control the unit', () => {
    const { session } = open();
    const jerome = unitOf(session.state, 'jerome');

    const result = submitAction(arena, session, yieldRequest('ana', jerome.id), T0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/does not control/);
  });

  // Rule: yielding a unit that is not on the clock changes nobody's turn and leaves the clock alone.
  it('lets a human yield his unit while another human is on the clock, without touching the clock', () => {
    const { session } = open();
    const kai = unitOf(session.state, 'kai');
    expect(session.state.turn!.unitId).toBe(kai.id);
    const jerome = unitOf(session.state, 'jerome');

    const result = submitAction(arena, session, yieldRequest('jerome', jerome.id), T0 + 10_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(ofKind(result.step.events, 'seatYielded')).toEqual([
      { kind: 'seatYielded', unitId: jerome.id, humanId: 'jerome' },
    ]);
    expect(result.step.session.state.turn!.unitId).toBe(kai.id);
    expect(result.step.session.turnDeadline).toBe(session.turnDeadline);
    expect(unitById(result.step.session.state, jerome.id).controller).toEqual({ kind: 'ai' });
  });

  // Rule: yielding the unit on the clock lets the AI play that very turn, then the session moves on.
  it('lets the AI play the turn of the unit that was on the clock', () => {
    const session = settle(open().session);
    const kai = unitOf(session.state, 'kai');
    expect(session.state.turn!.unitId).toBe(kai.id);

    const result = submitAction(arena, session, yieldRequest('kai', kai.id), T0 + 5_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { events, session: after } = result.step;

    const yieldedAt = events.findIndex((e) => e.kind === 'seatYielded');
    const endedAt = events.findIndex((e) => e.kind === 'turnEnded' && e.unitId === kai.id);
    expect(yieldedAt).toBe(0);
    expect(endedAt).toBeGreaterThan(yieldedAt);

    expect(unitById(after.state, kai.id).controller.kind).toBe('ai');
    // Waiting on another human (or the match has moved on), never on the yielded unit.
    if (after.state.phase !== 'finished') {
      expect(after.state.turn!.unitId).not.toBe(kai.id);
      expect(isHuman(unitById(after.state, after.state.turn!.unitId))).toBe(true);
      expect(after.turnDeadline).toBe(T0 + 5_000 + TIMER);
    }
  });

  // Rule: a human yielding a unit that was on the clock after its own popup is handled the same way.
  it('lets the AI play a Striker whose human has chosen his place and then yields', () => {
    const session = untilOnTheClock(open().session, 'jerome');
    const jerome = unitOf(session.state, 'jerome');
    expect(session.state.turn!.unitId).toBe(jerome.id);
    expect(session.state.turn!.placing ?? null).toBeNull();

    const result = submitAction(arena, session, yieldRequest('jerome', jerome.id), T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const events = result.step.events;
    expect(events[0]).toEqual({ kind: 'seatYielded', unitId: jerome.id, humanId: 'jerome' });
    expect(events.some((e) => e.kind === 'turnEnded' && e.unitId === jerome.id)).toBe(true);
    expect(unitById(result.step.session.state, jerome.id).controller.kind).toBe('ai');
    expect(result.step.session.state.turn?.unitId).not.toBe(jerome.id);
  });

  // Rule: "never both" (A28): an overdue clock is settled and the late yield is not applied.
  it('settles an expired clock and does not apply the yield in the same request', () => {
    const session = settle(open().session);
    const kai = unitOf(session.state, 'kai');
    expect(session.turnDeadline).toBe(T0 + TIMER);

    const served = serveAction(arena, session, yieldRequest('kai', kai.id), T0 + TIMER + 1);
    expect(served.ok).toBe(true);
    if (!served.ok) return;

    expect(served.expired).toBe(true);
    expect(ofKind(served.step.events, 'seatYielded')).toHaveLength(0);
    expect(unitById(served.step.session.state, kai.id).controller).toEqual({ kind: 'human', humanId: 'kai' });
    expect(served.step.events.some((e) => e.kind === 'turnEnded' && e.unitId === kai.id)).toBe(true);
  });

  // Rule: once yielded, the unit is the house's and its former human controls nothing of it.
  it('refuses any later request from the human who yielded the unit', () => {
    const session = settle(open().session);
    const kai = unitOf(session.state, 'kai');

    const yielded = submitAction(arena, session, yieldRequest('kai', kai.id), T0);
    expect(yielded.ok).toBe(true);
    if (!yielded.ok) return;
    const after = yielded.step.session;

    // A second yield goes through the ownership check.
    const again = submitAction(arena, after, yieldRequest('kai', kai.id), T0);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toMatch(/does not control/);

    // A turn action is refused too (here by the turn check, since the unit is not on the clock).
    const ended = submitAction(arena, after, { humanId: 'kai', unitId: kai.id, action: { kind: 'endTurn' } }, T0);
    expect(ended.ok).toBe(false);
  });
});
