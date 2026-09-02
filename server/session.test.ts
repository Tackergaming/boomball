/**
 * The server layer, tested without a server.
 *
 * What is worth asserting here is not the rules, which `engine` already covers
 * exhaustively, but the three things this layer owns: **who is allowed to move
 * what**, **that a human click resolves every AI turn behind it in one pass**,
 * and **that a silent player cannot stop the match**.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { TURN_TIMER_SECONDS } from '../engine/constants.js';
import { createMatch, type HumanSeat } from '../engine/setup.js';
import { isHuman, unitById, type MatchState } from '../engine/types.js';
import { expireIfDue, isExpired, openSession, submitAction, type Session } from './session.js';

const arena = new Arena(KILL_SILO);
const T0 = 1_700_000_000_000;

const SOLO: HumanSeat[] = [{ humanId: 'jerome', role: 'striker', name: 'Bombast' }];
const TRIO: HumanSeat[] = [
  { humanId: 'jerome', role: 'striker', name: 'Bombast' },
  { humanId: 'ana', role: 'bulwark', name: 'Hobbs' },
  { humanId: 'kai', role: 'trajector', name: 'Pell' },
];

function fresh(humans: readonly HumanSeat[], seed = 5): MatchState {
  return createMatch({ arena: KILL_SILO, tier: 'rookie', humans, seed });
}

function open(humans: readonly HumanSeat[], seed = 5) {
  return openSession(arena, fresh(humans, seed), T0);
}

/** The unit the session is currently waiting on. */
function onTheClock(session: Session) {
  return unitById(session.state, session.state.turn!.unitId);
}

describe('opening a session', () => {
  it('stops on a human and hands back everything that happened before them', () => {
    const { session, events } = open(SOLO);

    expect(session.state.phase).toBe('playing');
    expect(isHuman(onTheClock(session))).toBe(true);
    expect(onTheClock(session).controller).toEqual({ kind: 'human', humanId: 'jerome' });
    expect(events.some((e) => e.kind === 'roundStarted')).toBe(true);
  });

  it('puts the human on the clock and nobody else', () => {
    const { session } = open(SOLO);

    expect(session.turnDeadline).toBe(T0 + TURN_TIMER_SECONDS * 1000);
    expect(isExpired(session, T0 + 59_000)).toBe(false);
    expect(isExpired(session, T0 + 60_000)).toBe(true);
  });
});

describe('who may move what', () => {
  it('refuses an action sent for a unit whose turn it is not', () => {
    const { session } = open(SOLO);
    const other = session.state.units.find((u) => u.id !== session.state.turn!.unitId)!;

    const result = submitAction(
      arena,
      session,
      { humanId: 'jerome', unitId: other.id, action: { kind: 'endTurn' } },
      T0,
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not .*'s turn/);
  });

  it('refuses a player reaching for somebody else\'s unit', () => {
    const { session } = open(TRIO);
    const onClock = onTheClock(session);
    const owner = onClock.controller.kind === 'human' ? onClock.controller.humanId : '';
    // Whichever of the three is up, the impostor is one of the other two.
    const impostor = TRIO.map((seat) => seat.humanId).find((id) => id !== owner)!;

    const result = submitAction(
      arena,
      session,
      { humanId: impostor, unitId: onClock.id, action: { kind: 'endTurn' } },
      T0,
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(
      new RegExp(`${impostor} does not control`),
    );
  });

  it('hands back the engine\'s own reason when the move itself is illegal', () => {
    const { session } = open(SOLO);
    const mine = session.state.turn!.unitId;

    // Nobody is holding the Payload at kick-off, so this is refused by `reduce`
    // and not by anything this layer re-decided.
    const result = submitAction(
      arena,
      session,
      { humanId: 'jerome', unitId: mine, action: { kind: 'shoot' } },
      T0,
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not holding the Payload/);
  });
});

describe('one click, every AI turn behind it', () => {
  it('resolves the whole AI block in a single pass and returns one batch of events', () => {
    const { session } = open(SOLO);
    const mine = session.state.turn!.unitId;

    const result = submitAction(
      arena,
      session,
      { humanId: 'jerome', unitId: mine, action: { kind: 'endTurn' } },
      T0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { session: after, events } = result.step;

    // Thirteen AI units act between one human turn and the next, so this single
    // call has to have carried far more than the one `turnEnded` it was sent.
    const turnsTaken = events.filter((e) => e.kind === 'turnEnded').length;
    expect(turnsTaken).toBeGreaterThan(5);

    // And it stops on a human, or on the final whistle. Never mid-block.
    if (after.state.phase !== 'finished') {
      expect(isHuman(onTheClock(after))).toBe(true);
    }
  });

  it('plays a solo match to its end through the session door alone', () => {
    let { session } = open(SOLO);
    let clicks = 0;
    const seen: string[] = [];

    while (session.state.phase !== 'finished' && clicks < 400) {
      const unit = onTheClock(session);
      expect(isHuman(unit)).toBe(true);
      seen.push(unit.controller.kind);

      const result = submitAction(
        arena,
        session,
        { humanId: 'jerome', unitId: unit.id, action: { kind: 'endTurn' } },
        T0,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      session = result.step.session;
      clicks++;
    }

    expect(session.state.phase).toBe('finished');
    expect(session.state.result).not.toBeNull();
    // A ten round match asks its one human for about ten decisions, not four
    // hundred: the AI is doing the rest inside the calls.
    expect(clicks).toBeLessThan(30);
    expect(seen.every((k) => k === 'human')).toBe(true);
  });

  it('takes the clock off the table once the match is over', () => {
    let { session } = open(SOLO);

    for (let i = 0; i < 400 && session.state.phase !== 'finished'; i++) {
      const result = submitAction(
        arena,
        session,
        { humanId: 'jerome', unitId: session.state.turn!.unitId, action: { kind: 'endTurn' } },
        T0,
      );
      if (!result.ok) throw new Error(result.reason);
      session = result.step.session;
    }

    expect(session.state.phase).toBe('finished');
    expect(session.turnDeadline).toBeNull();
    expect(isExpired(session, T0 + 10_000_000)).toBe(false);

    const late = submitAction(
      arena,
      session,
      { humanId: 'jerome', unitId: session.state.units[0]!.id, action: { kind: 'endTurn' } },
      T0,
    );
    expect(late.ok).toBe(false);
    expect(late.ok === false && late.reason).toMatch(/over/);
  });

  it('replays identically for the same seed, whoever is asking', () => {
    const play = (): string => {
      let { session } = open(SOLO, 11);
      const kinds: string[] = [];
      for (let i = 0; i < 400 && session.state.phase !== 'finished'; i++) {
        const result = submitAction(
          arena,
          session,
          { humanId: 'jerome', unitId: session.state.turn!.unitId, action: { kind: 'endTurn' } },
          T0,
        );
        if (!result.ok) throw new Error(result.reason);
        kinds.push(...result.step.events.map((e) => e.kind));
        session = result.step.session;
      }
      return kinds.join(',');
    };

    expect(play()).toBe(play());
  });
});

describe('a player who goes quiet', () => {
  it('does not freeze the match: the turn is spent on Dodge and play moves on', () => {
    const { session } = open(SOLO);
    const stalled = onTheClock(session);

    const step = expireIfDue(arena, session, session.turnDeadline! + 1);
    expect(step).not.toBeNull();
    if (!step) return;

    expect(step.events.some((e) => e.kind === 'dodging' && e.unitId === stalled.id)).toBe(true);
    expect(step.events.some((e) => e.kind === 'turnEnded')).toBe(true);

    // And it kept going: the AI block behind the stalled player was resolved.
    expect(step.events.filter((e) => e.kind === 'turnEnded').length).toBeGreaterThan(5);
    if (step.session.state.phase !== 'finished') {
      expect(isHuman(onTheClock(step.session))).toBe(true);
    }
    expect(step.session.turnDeadline).toBeGreaterThan(session.turnDeadline!);
  });

  it('does nothing at all while the clock is still running', () => {
    const { session } = open(SOLO);
    expect(expireIfDue(arena, session, session.turnDeadline! - 1)).toBeNull();
  });

  it('carries a whole match on the clock alone, never stalling', () => {
    let { session } = open(SOLO);
    let expiries = 0;

    while (session.state.phase !== 'finished' && expiries < 400) {
      const step = expireIfDue(arena, session, session.turnDeadline! + 1);
      if (!step) throw new Error('the clock refused to advance a live match');
      session = step.session;
      expiries++;
    }

    expect(session.state.phase).toBe('finished');
  });
});

describe('three players', () => {
  it('stops on each human in turn and never asks one to move another', () => {
    let { session } = open(TRIO);
    const asked = new Set<string>();

    for (let i = 0; i < 60 && session.state.phase !== 'finished'; i++) {
      const unit = onTheClock(session);
      expect(isHuman(unit)).toBe(true);
      const owner = unit.controller.kind === 'human' ? unit.controller.humanId : '';
      asked.add(owner);

      const result = submitAction(
        arena,
        session,
        { humanId: owner, unitId: unit.id, action: { kind: 'endTurn' } },
        T0,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      session = result.step.session;
    }

    expect([...asked].sort()).toEqual(['ana', 'jerome', 'kai']);
  });
});
