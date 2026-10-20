/**
 * Écart 66, the whole team (2H.41, engine 12, `00` C41).
 *
 * A team played "whole" has one pick per active unit on the ladder instead
 * of seven named slots; at each pick a human of the team names which of its
 * units still to play acts now, and that unit plays its whole turn before
 * the next pick. Écarts 55, 58, 62 and 65 are suspended for it. In co-op the
 * Giff of a human is its own human's and nobody else's; the rest go to the
 * first click. "Let the AI play" hands the rest of a picked turn to the AI,
 * "Let the AI finish the round" the rest of the team's round; a clock that
 * runs out does the second. The mode is switched for the next round by
 * `setTeamMode`; the lobby's box is only the starting value.
 *
 * Seed 5 throughout, as in `c32.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import type { Action } from './actions.js';
import { Arena } from './arena.js';
import { KILL_SILO } from './arenas/kill-silo.js';
import { ENGINE_VERSION, TURN_TIMER_SECONDS } from './constants.js';
import type { MatchEvent } from './events.js';
import { hasPlayedThisRound, pickableUnits } from './initiative.js';
import { legalActions, pickOptions } from './legalActions.js';
import { reduce } from './reduce.js';
import { createMatch, type HumanSeat } from './setup.js';
import type { Role } from './stats.js';
import { pendingPick, unitById, type MatchState, type TeamId, type Unit } from './types.js';
import {
  engineVersionRefusal,
  openSession,
  rightsRefusal,
  serveAction,
  submitAction,
  waitingOnHuman,
  type Session,
} from '../server/session.js';

const arena = new Arena(KILL_SILO);
const T0 = 1_700_000_000_000;
const TIMER = TURN_TIMER_SECONDS * 1000;
const SEED = 5;

const SOLO: HumanSeat[] = [{ humanId: 'jerome', role: 'striker', name: 'Bombast' }];
const DUO: HumanSeat[] = [
  { humanId: 'jerome', role: 'striker', name: 'Bombast' },
  { humanId: 'ana', role: 'bulwark', name: 'Hobbs' },
];

function fresh(humans: readonly HumanSeat[], wholeTeam = true, seed = SEED): MatchState {
  return createMatch({ arena: KILL_SILO, tier: 'rookie', humans, seed, wholeTeam });
}

function open(humans: readonly HumanSeat[] = SOLO, wholeTeam = true, seed = SEED) {
  return openSession(arena, fresh(humans, wholeTeam, seed), T0);
}

function ofKind<K extends MatchEvent['kind']>(events: readonly MatchEvent[], kind: K) {
  return events.filter((e): e is Extract<MatchEvent, { kind: K }> => e.kind === kind);
}

function unitOf(state: MatchState, humanId: string): Unit {
  return state.units.find((u) => u.controller.kind === 'human' && u.controller.humanId === humanId)!;
}

function teamSlots(state: MatchState, team: TeamId) {
  return state.turnOrder.filter((s) => s.team === team);
}

/** Sends `action` as `humanId` for `unitId`; throws on a refusal. */
function send(session: Session, humanId: string, unitId: string, action: Action, now = T0) {
  const result = submitAction(arena, session, { humanId, unitId, action }, now);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);
  return result.step;
}

/** The request a refusal is expected from. */
function refusal(session: Session, humanId: string, unitId: string, action: Action, now = T0): string {
  const result = submitAction(arena, session, { humanId, unitId, action }, now);
  if (result.ok) throw new Error(`accepted ${action.kind}, expected a refusal`);
  return result.reason;
}

function pick(session: Session, humanId: string, unitId: string, now = T0) {
  return send(session, humanId, unitId, { kind: 'pickUnit', humanId }, now);
}

/** Who may be picked by `humanId` right now, by id. */
function options(state: MatchState, humanId: string): string[] {
  return pickOptions(state, humanId).map((u) => u.id);
}

/**
 * Plays the team's whole round by hand: at every pick the human takes the
 * first unit on offer, every turn is ended at once. Stops when the round
 * number changes or the match ends. Returns the events of the walk.
 */
function playRoundByHand(session: Session, humanId: string): { session: Session; events: MatchEvent[] } {
  const round = session.state.round;
  const events: MatchEvent[] = [];
  for (let guard = 0; guard < 80; guard++) {
    const { state } = session;
    if (state.phase === 'finished' || state.round !== round) break;
    if (state.turn) {
      const step = send(session, humanId, state.turn.unitId, { kind: 'endTurn' });
      session = step.session;
      events.push(...step.events);
      continue;
    }
    const [first] = options(state, humanId);
    if (!first) throw new Error('nothing to pick and no turn open');
    const step = pick(session, humanId, first);
    session = step.session;
    events.push(...step.events);
  }
  return { session, events };
}

describe('the ladder of a whole team', () => {
  // Rule: a whole team gets one pick per active unit, no names, and goes where the side goes.
  it('ladders team A as seven picks and opens the match on the first of them, no turn open', () => {
    const { session, events } = open();
    const { state } = session;
    expect(state.teamMode).toEqual({ A: 'whole', B: 'seat' });
    const ours = teamSlots(state, 'A');
    expect(ours).toHaveLength(7);
    expect(ours.every((s) => s.actor.kind === 'pick' && s.actor.team === 'A')).toBe(true);
    // The side with the human goes first (écart 51), so the match opens on a pick.
    expect(state.turnIndex).toBe(0);
    expect(state.turn).toBeNull();
    expect(pendingPick(state)).toEqual({ team: 'A', index: 0 });
    expect(ofKind(events, 'placeOffered')).toHaveLength(0);
    // The house is laddered by name, as before.
    expect(teamSlots(state, 'B').every((s) => s.actor.kind === 'unit')).toBe(true);
  });

  // Rule: a seat-by-seat team is untouched by the new rung.
  it('keeps the named ladder and the place question for a team played seat by seat', () => {
    const { session, events } = open(SOLO, false);
    expect(session.state.teamMode.A).toBe('seat');
    expect(teamSlots(session.state, 'A').every((s) => s.actor.kind === 'unit')).toBe(true);
    expect(ofKind(events, 'placeOffered')).toHaveLength(1);
  });

  // Rule: the match is waiting on a human at a pick, and the clock runs for it.
  it('runs the clock on a pick', () => {
    const { session } = open();
    expect(waitingOnHuman(session.state)).toBe(true);
    expect(session.turnDeadline).toBe(T0 + TIMER);
  });
});

describe('the pick', () => {
  // Rule: every active unit of the team not yet played is on offer, in role order.
  it('offers the seven units of the team to its human, in role order', () => {
    const { session } = open();
    const offered = pickOptions(session.state, 'jerome');
    expect(offered).toHaveLength(7);
    expect(offered.map((u) => u.role)).toEqual(['trajector', 'striker', 'striker', 'striker', 'breaker', 'breaker', 'bulwark']);
    expect(options(session.state, 'nobody')).toEqual([]);
    expect(legalActions(arena, session.state)).toBeNull();
  });

  // Rule: a pick opens the chosen unit's turn at once, whoever controls it, and the slot becomes the unit's.
  it('opens the turn of the unit picked, an AI Giff included, and names the slot after it', () => {
    const { session } = open();
    const keeper = session.state.units.find((u) => u.team === 'A' && u.role === 'bulwark')!;
    expect(keeper.controller.kind).toBe('ai');

    const step = pick(session, 'jerome', keeper.id);
    const { state } = step.session;
    expect(step.events.slice(0, 2)).toEqual([
      { kind: 'unitPicked', unitId: keeper.id, humanId: 'jerome', round: 1 },
      { kind: 'turnStarted', unitId: keeper.id, round: 1 },
    ]);
    expect(state.turn).toMatchObject({ unitId: keeper.id, pickedBy: 'jerome', delegated: false, placing: null });
    expect(state.turnOrder[0]!.actor).toEqual({ kind: 'unit', unitId: keeper.id });
    expect(state.turnIndex).toBe(0);
    // The AI did not play it: the turn is the human's, with its clock.
    expect(waitingOnHuman(state)).toBe(true);
    expect(step.session.turnDeadline).toBe(T0 + TIMER);
    expect(legalActions(arena, state)!.canDelegate).toBe(true);
  });

  // Rule: the human drives the picked unit's turn, and nobody else may.
  it('lets the one who picked play the picked Giff, and refuses anybody else', () => {
    const { session } = open(DUO);
    const keeper = unitOf(session.state, 'ana');
    const trajector = session.state.units.find((u) => u.team === 'A' && u.role === 'trajector')!;
    const picked = pick(session, 'jerome', trajector.id).session;

    expect(refusal(picked, 'ana', trajector.id, { kind: 'endTurn' })).toMatch(/does not control/);
    expect(rightsRefusal(picked.state, { humanId: 'ana', unitId: trajector.id, action: { kind: 'endTurn' } })).toMatch(/does not control/);
    expect(rightsRefusal(picked.state, { humanId: 'jerome', unitId: trajector.id, action: { kind: 'endTurn' } })).toBeNull();

    const ended = send(picked, 'jerome', trajector.id, { kind: 'endTurn' });
    expect(ofKind(ended.events, 'turnEnded')[0]).toEqual({ kind: 'turnEnded', unitId: trajector.id });
    // Back to a pick, and the keeper, ana's own, is still to be picked.
    expect(pendingPick(ended.session.state)).toEqual({ team: 'A', index: 1 });
    expect(options(ended.session.state, 'ana')).toContain(keeper.id);
  });

  // Rule: a unit that has played this round is off the offer; a picked unit reads as not yet played.
  it('takes a played unit off the offer and reads the ladder for the chain', () => {
    const { session } = open();
    const [first, second] = options(session.state, 'jerome');
    expect(hasPlayedThisRound(session.state, first!)).toBe(false);
    const picked = pick(session, 'jerome', first!).session;
    expect(hasPlayedThisRound(picked.state, first!)).toBe(false);
    expect(hasPlayedThisRound(picked.state, second!)).toBe(false);

    const ended = send(picked, 'jerome', first!, { kind: 'endTurn' }).session;
    expect(hasPlayedThisRound(ended.state, first!)).toBe(true);
    expect(hasPlayedThisRound(ended.state, second!)).toBe(false);
    expect(options(ended.state, 'jerome')).toHaveLength(6);
    expect(options(ended.state, 'jerome')).not.toContain(first);
    expect(refusal(ended, 'jerome', first!, { kind: 'pickUnit', humanId: 'jerome' })).toMatch(/already played/);
  });

  // Rule: a pick while a turn is open is refused, which is what the loser of a race between two humans gets.
  it('refuses a second pick while the first one\'s turn is open (the race, settled on the board)', () => {
    const { session } = open(DUO);
    const [a] = options(session.state, 'jerome');
    // An AI Striker, which either human could have picked.
    const b = options(session.state, 'ana')[1]!;
    expect(unitById(session.state, b).controller.kind).toBe('ai');
    const picked = pick(session, 'jerome', a!).session;
    expect(refusal(picked, 'ana', b, { kind: 'pickUnit', humanId: 'ana' })).toMatch(/no pick is waiting/);
  });

  // Rule: the Giff of a human is its own human's and nobody else's (C41 point 4).
  it('never offers nor accepts the Giff of another human', () => {
    const { session } = open(DUO);
    const bombast = unitOf(session.state, 'jerome');
    const hobbs = unitOf(session.state, 'ana');
    expect(options(session.state, 'jerome')).not.toContain(hobbs.id);
    expect(options(session.state, 'jerome')).toContain(bombast.id);
    expect(options(session.state, 'ana')).not.toContain(bombast.id);
    expect(options(session.state, 'ana')).toContain(hobbs.id);

    expect(refusal(session, 'jerome', hobbs.id, { kind: 'pickUnit', humanId: 'jerome' })).toMatch(/ana's to play/);
    // The body's humanId is not trusted: the caller is who picked.
    const forged = pick(session, 'ana', hobbs.id);
    expect(ofKind(forged.events, 'unitPicked')[0]).toMatchObject({ unitId: hobbs.id, humanId: 'ana' });
    expect(forged.session.state.turn!.pickedBy).toBe('ana');
  });

  // Rule: a stranger to the team, and a spectator who yielded, pick nothing.
  it('refuses a pick from somebody not on the team', () => {
    const { session } = open();
    const [first] = options(session.state, 'jerome');
    expect(refusal(session, 'ana', first!, { kind: 'pickUnit', humanId: 'ana' })).toMatch(/not on/);
    expect(refusal(session, 'jerome', session.state.units.find((u) => u.team === 'B')!.id, { kind: 'pickUnit', humanId: 'jerome' })).toMatch(/not on/);
  });

  // Rule: the human orders the whole round, and the house plays after the seven picks.
  it('lets the human play its seven units in the order it chooses, then the house plays', () => {
    const { session } = open();
    const order = [...options(session.state, 'jerome')].reverse();
    let current = session;
    const events: MatchEvent[] = [];
    for (const id of order) {
      const picked = pick(current, 'jerome', id);
      events.push(...picked.events);
      const ended = send(picked.session, 'jerome', id, { kind: 'endTurn' });
      events.push(...ended.events);
      current = ended.session;
    }
    expect(ofKind(events, 'unitPicked').map((e) => e.unitId)).toEqual(order);
    const starts = ofKind(events, 'turnStarted').filter((e) => e.round === 1);
    expect(starts.slice(0, 7).map((e) => e.unitId)).toEqual(order);
    // The house's seven turns followed in the same pass, and round 2 opens on a pick again.
    expect(starts.length).toBe(14);
    expect(current.state.round).toBe(2);
    expect(pendingPick(current.state)).toEqual({ team: 'A', index: 0 });
    expect(ofKind(events, 'placeOffered')).toHaveLength(0);
    expect(ofKind(events, 'placeChosen')).toHaveLength(0);
  });

  // Rule: a pick with nobody left to take it is skipped.
  it('skips the picks left when every unit still to play has been evacuated', () => {
    const { session } = open();
    const [first] = options(session.state, 'jerome');
    const picked = pick(session, 'jerome', first!).session;
    const gone: MatchState = {
      ...picked.state,
      units: picked.state.units.map((u) =>
        u.team === 'A' && u.id !== first ? { ...u, status: 'evacuated' as const, evacuatedOnRound: 1 } : u,
      ),
    };
    expect(pickableUnits(gone, 'A')).toHaveLength(0);
    const result = reduce(arena, gone, { unitId: first!, action: { kind: 'endTurn' } });
    if (!result.ok) throw new Error(result.reason);
    // Six picks skipped: the ladder went on to the house's block without opening anything of A's.
    expect(result.state.turnIndex).toBeGreaterThanOrEqual(7);
    expect(ofKind(result.events, 'unitPicked')).toHaveLength(0);
    expect(result.state.turn === null || unitById(result.state, result.state.turn.unitId).team === 'B').toBe(true);
  });
});

describe('the AI in support', () => {
  // Rule: "Let the AI play" hands the rest of the picked turn to the AI; the one who picked sends it.
  it('lets the AI finish a picked turn, then hands the next pick back to the human', () => {
    const { session } = open();
    const [first] = options(session.state, 'jerome');
    const picked = pick(session, 'jerome', first!).session;
    const step = send(picked, 'jerome', first!, { kind: 'delegateTurn' });
    expect(step.events[0]).toEqual({ kind: 'turnDelegated', unitId: first });
    expect(ofKind(step.events, 'turnEnded').map((e) => e.unitId)).toEqual([first]);
    expect(pendingPick(step.session.state)).toEqual({ team: 'A', index: 1 });
    expect(step.session.turnDeadline).toBe(T0 + TIMER);
    expect(options(step.session.state, 'jerome')).toHaveLength(6);
  });

  // Rule: only the one who picked may hand the turn over, and only a picked turn.
  it('refuses delegateTurn from another human, and on a turn that was not picked', () => {
    const duo = open(DUO);
    const trajector = duo.session.state.units.find((u) => u.team === 'A' && u.role === 'trajector')!;
    const picked = pick(duo.session, 'jerome', trajector.id).session;
    expect(refusal(picked, 'ana', trajector.id, { kind: 'delegateTurn' })).toMatch(/did not pick/);

    const seated = open(SOLO, false).session;
    const bombast = unitOf(seated.state, 'jerome');
    // Answer the place question first, then the turn is a seat-by-seat one.
    const turn = send(seated, 'jerome', bombast.id, { kind: 'choosePlace', place: 1 }).session;
    expect(turn.state.turn!.unitId).toBe(bombast.id);
    expect(legalActions(arena, turn.state)!.canDelegate).toBe(false);
    expect(refusal(turn, 'jerome', bombast.id, { kind: 'delegateTurn' })).toMatch(/did not pick/);
  });

  // Rule: "Let the AI finish the round" hands this turn and every pick left to the AI, in the situation's order.
  it('lets the AI finish the round from a picked turn: the six picks left are the house\'s', () => {
    const { session } = open();
    const [first] = options(session.state, 'jerome');
    const picked = pick(session, 'jerome', first!).session;
    const step = send(picked, 'jerome', first!, { kind: 'delegateRound' });
    expect(step.events[0]).toEqual({ kind: 'roundDelegated', team: 'A', round: 1 });
    const housePicks = ofKind(step.events, 'unitPicked');
    expect(housePicks).toHaveLength(6);
    expect(housePicks.every((e) => e.humanId === null && e.round === 1)).toBe(true);
    // The six turns of A left (the picked one had already started), then the
    // house's seven, in one pass, up to round 2's first pick.
    expect(ofKind(step.events, 'turnStarted').filter((e) => e.round === 1)).toHaveLength(13);
    expect(step.session.state.round).toBe(2);
    expect(step.session.state.delegatedRound.A).toBe(false);
    expect(pendingPick(step.session.state)).toEqual({ team: 'A', index: 0 });
  });

  // Rule: the round may be handed over at a pick too, by any human of the team.
  it('lets any human of the team hand the round over at a pick', () => {
    const { session } = open(DUO);
    const hobbs = unitOf(session.state, 'ana');
    const step = send(session, 'ana', hobbs.id, { kind: 'delegateRound' });
    expect(step.events[0]).toEqual({ kind: 'roundDelegated', team: 'A', round: 1 });
    expect(ofKind(step.events, 'unitPicked')).toHaveLength(7);
    expect(step.session.state.round).toBe(2);
    // Refused from outside the team, and when the team plays seat by seat.
    expect(refusal(session, 'kai', hobbs.id, { kind: 'delegateRound' })).toMatch(/not on/);
    const seated = open(SOLO, false).session;
    expect(refusal(seated, 'jerome', unitOf(seated.state, 'jerome').id, { kind: 'delegateRound' })).toMatch(/seat by seat/);
  });
});

describe('the clock of a whole team', () => {
  // Rule: a pick that runs out hands the round to the AI, no Dodge, and the late pick is not played (A28).
  it('hands the round to the AI when a pick runs out, and does not play the late pick', () => {
    const { session } = open();
    const [first] = options(session.state, 'jerome');
    const served = serveAction(
      arena,
      session,
      { humanId: 'jerome', unitId: first!, action: { kind: 'pickUnit', humanId: 'jerome' } },
      T0 + TIMER + 1,
    );
    if (!served.ok) throw new Error(served.reason);
    expect(served.expired).toBe(true);
    expect(served.step.events[0]).toEqual({ kind: 'roundDelegated', team: 'A', round: 1 });
    expect(ofKind(served.step.events, 'unitPicked').every((e) => e.humanId === null)).toBe(true);
    expect(ofKind(served.step.events, 'dodging').filter((e) => unitById(session.state, e.unitId).team === 'A')).toHaveLength(0);
    expect(served.step.session.state.round).toBe(2);
    // Round 2 opens on a pick with a fresh clock.
    expect(served.step.session.turnDeadline).toBe(T0 + TIMER + 1 + TIMER);
  });

  // Rule: a picked turn that runs out does the same: the turn and the rest of the round go to the AI.
  it('hands a picked turn and the rest of the round to the AI when the turn runs out', () => {
    const { session } = open();
    const [first] = options(session.state, 'jerome');
    const picked = pick(session, 'jerome', first!, T0 + 10_000).session;
    expect(picked.turnDeadline).toBe(T0 + 10_000 + TIMER);
    const served = serveAction(
      arena,
      picked,
      { humanId: 'jerome', unitId: first!, action: { kind: 'endTurn' } },
      T0 + 10_000 + TIMER + 1,
    );
    if (!served.ok) throw new Error(served.reason);
    expect(served.expired).toBe(true);
    expect(served.step.events[0]).toEqual({ kind: 'roundDelegated', team: 'A', round: 1 });
    expect(ofKind(served.step.events, 'dodging').filter((e) => e.unitId === first)).toHaveLength(0);
    expect(ofKind(served.step.events, 'turnEnded').map((e) => e.unitId)[0]).toBe(first);
    expect(served.step.session.state.round).toBe(2);
  });

  // Rule: the pick's clock and the picked turn's clock are two clocks.
  it('gives the picked turn a fresh clock, and the same turn carrying on keeps it', () => {
    const { session } = open();
    const [first] = options(session.state, 'jerome');
    const picked = pick(session, 'jerome', first!, T0 + 20_000).session;
    expect(picked.turnDeadline).toBe(T0 + 20_000 + TIMER);
    const dashed = send(picked, 'jerome', first!, { kind: 'dash' }, T0 + 30_000).session;
    expect(dashed.turnDeadline).toBe(T0 + 20_000 + TIMER);
  });
});

describe('the seat yielded in a whole team', () => {
  // Rule: with its last human gone, a whole team's picks are the house's.
  it('lets the house take every pick once the only human has yielded', () => {
    const { session } = open();
    const bombast = unitOf(session.state, 'jerome');
    const step = send(session, 'jerome', bombast.id, { kind: 'yieldSeat' });
    expect(step.events[0]).toEqual({ kind: 'seatYielded', unitId: bombast.id, humanId: 'jerome' });
    expect(ofKind(step.events, 'unitPicked').every((e) => e.humanId === null)).toBe(true);
    // Nobody human is left: the match plays itself out.
    expect(step.session.state.phase).toBe('finished');
    expect(step.session.turnDeadline).toBeNull();
  });

  // Rule: yielding the picked Giff on the clock hands that turn to the AI; the other human keeps picking.
  it('hands the picked turn of a yielded Giff to the AI and leaves the next pick to the other human', () => {
    const { session } = open(DUO);
    const bombast = unitOf(session.state, 'jerome');
    const picked = pick(session, 'jerome', bombast.id).session;
    const step = send(picked, 'jerome', bombast.id, { kind: 'yieldSeat' });
    expect(ofKind(step.events, 'turnEnded')[0]).toEqual({ kind: 'turnEnded', unitId: bombast.id });
    expect(pendingPick(step.session.state)).toEqual({ team: 'A', index: 1 });
    expect(options(step.session.state, 'ana')).toHaveLength(6);
    expect(options(step.session.state, 'jerome')).toEqual([]);
  });
});

describe('the relaunch of a whole team', () => {
  /**
   * A goal by the house against a whole team A whose picks are all behind
   * the cursor: team B's last unit is given the turn with the ball at the
   * mouth of A, the keeper's Reaction spent, and shoots until the dice say
   * goal. Seeds are walked, never guessed.
   */
  function houseScores(): { before: MatchState; result: { state: MatchState; events: readonly MatchEvent[] } } {
    const base = open().session.state;
    // The house's last unit of round 1: the Crackers' rung comes after it at kick-off.
    const last = base.turnOrder.map((s, i) => (s.actor.kind === 'unit' && s.team === 'B' ? i : -1)).filter((i) => i >= 0).pop()!;
    const shooter = unitById(base, (base.turnOrder[last]!.actor as { unitId: string }).unitId);
    expect(shooter.team).toBe('B');
    const keeper = base.units.find((u) => u.team === 'A' && u.role === 'bulwark')!;
    const spot = { x: 7, y: 3 };
    const crafted: MatchState = {
      ...base,
      turnIndex: last,
      turnOrder: base.turnOrder.map((s, i) =>
        i < 7 ? { ...s, actor: { kind: 'unit' as const, unitId: base.units.filter((u) => u.team === 'A')[i]!.id } } : s,
      ),
      units: base.units.map((u) => {
        if (u.id === shooter.id) return { ...u, x: spot.x, y: spot.y, holdingPayload: true };
        if (u.id === keeper.id) return { ...u, reactionAvailable: false };
        return u;
      }),
      payload: { carriedBy: shooter.id, x: spot.x, y: spot.y },
      lastCarrierTeam: 'B',
      turn: {
        unitId: shooter.id,
        startedAt: spot,
        movementFeetRemaining: 40,
        actionUsed: false,
        objectInteractionUsed: false,
        disengaged: false,
        placing: null,
        shot: false,
        freePass: false,
        pickedBy: null,
        delegated: false,
      },
    };
    for (let seed = 1; seed < 400; seed++) {
      const trial = reduce(arena, { ...crafted, rngSeed: seed }, { unitId: shooter.id, action: { kind: 'shoot' } });
      if (!trial.ok) throw new Error(trial.reason);
      if (ofKind(trial.events, 'scored').length > 0) return { before: crafted, result: trial };
    }
    throw new Error('no seed scored');
  }

  // Rule: the conceding whole team relaunches by its picks, in the human's order; the keeper is not moved up.
  it('schedules no keeper-first relaunch for a whole team, which gets seven picks next round', () => {
    const { result } = houseScores();
    expect(result.state.relaunch).toBeNull();
    const ended = reduce(arena, result.state, { unitId: result.state.turn!.unitId, action: { kind: 'endTurn' } });
    if (!ended.ok) throw new Error(ended.reason);
    expect(ended.state.round).toBe(2);
    const ours = teamSlots(ended.state, 'A');
    expect(ours).toHaveLength(7);
    expect(ours.every((s) => s.actor.kind === 'pick')).toBe(true);
    expect(pendingPick(ended.state)).toEqual({ team: 'A', index: 0 });
    // The fresh ball is in the keeper's hands, and the human may send anybody first.
    expect(ended.state.payload.carriedBy).toBe(ended.state.units.find((u) => u.team === 'A' && u.role === 'bulwark')!.id);
    expect(options(ended.state, 'jerome')).toHaveLength(7);
  });
});

describe('the switch', () => {
  // Rule: setTeamMode is accepted at any moment and takes effect at the top of the next round.
  it('applies "my Giff only" from the next round: named slots and the place question come back', () => {
    const { session } = open();
    const bombast = unitOf(session.state, 'jerome');
    const asked = send(session, 'jerome', bombast.id, { kind: 'setTeamMode', mode: 'seat' });
    expect(asked.events).toEqual([{ kind: 'teamModeRequested', team: 'A', mode: 'seat', round: 1 }]);
    expect(asked.session.state.requestedMode.A).toBe('seat');
    expect(asked.session.state.teamMode.A).toBe('whole');
    // The round in progress is still played by picks.
    expect(pendingPick(asked.session.state)).toEqual({ team: 'A', index: 0 });
    expect(asked.session.turnDeadline).toBe(T0 + TIMER);

    const { session: next, events } = playRoundByHand(asked.session, 'jerome');
    expect(next.state.round).toBe(2);
    expect(ofKind(events, 'teamModeChanged')).toEqual([{ kind: 'teamModeChanged', team: 'A', mode: 'seat', round: 2 }]);
    expect(next.state.teamMode.A).toBe('seat');
    expect(next.state.requestedMode.A).toBeNull();
    expect(teamSlots(next.state, 'A').every((s) => s.actor.kind === 'unit')).toBe(true);
    // Écart 58 is back: the human Striker is asked its place.
    expect(ofKind(events, 'placeOffered').filter((e) => e.round === 2)).toHaveLength(1);
    expect(next.state.turn!.placing).not.toBeNull();
  });

  // Rule: the other way round, from a seat-by-seat match to the whole team.
  it('applies "the whole team" from the next round of a match started seat by seat', () => {
    const { session } = open(SOLO, false);
    const bombast = unitOf(session.state, 'jerome');
    const asked = send(session, 'jerome', bombast.id, { kind: 'setTeamMode', mode: 'whole' }).session;
    expect(asked.state.turn!.placing).not.toBeNull();
    // Round 1 as before: place, then turns.
    let current = send(asked, 'jerome', bombast.id, { kind: 'choosePlace', place: 1 }).session;
    const events: MatchEvent[] = [];
    for (let guard = 0; guard < 10 && current.state.round === 1; guard++) {
      const step = send(current, 'jerome', current.state.turn!.unitId, { kind: 'endTurn' });
      events.push(...step.events);
      current = step.session;
    }
    expect(ofKind(events, 'teamModeChanged')).toEqual([{ kind: 'teamModeChanged', team: 'A', mode: 'whole', round: 2 }]);
    expect(current.state.teamMode.A).toBe('whole');
    expect(pendingPick(current.state)).toEqual({ team: 'A', index: 0 });
    expect(options(current.state, 'jerome')).toHaveLength(7);
  });

  // Rule: asking for the mode in force withdraws a pending request.
  it('withdraws a pending request when the mode in force is asked again', () => {
    const { session } = open();
    const bombast = unitOf(session.state, 'jerome');
    const asked = send(session, 'jerome', bombast.id, { kind: 'setTeamMode', mode: 'seat' }).session;
    const back = send(asked, 'jerome', bombast.id, { kind: 'setTeamMode', mode: 'whole' }).session;
    expect(back.state.requestedMode.A).toBeNull();
    expect(refusal(session, 'kai', bombast.id, { kind: 'setTeamMode', mode: 'seat' })).toMatch(/not on/);
  });
});

describe('whole matches', () => {
  // Rule: a solo whole-team match plays to the whistle through the session door alone, never stalling.
  it('plays a solo whole-team match to its end by hand', () => {
    let session = open().session;
    for (let guard = 0; guard < 30 && session.state.phase !== 'finished'; guard++) {
      session = playRoundByHand(session, 'jerome').session;
    }
    expect(session.state.phase).toBe('finished');
    expect(session.turnDeadline).toBeNull();
  });

  // Rule: two humans sharing the picks play to the whistle, each driving what it picked.
  it('plays a co-op whole-team match to its end, picks shared between the two humans', () => {
    let session = open(DUO).session;
    const pickers: Record<string, number> = { jerome: 0, ana: 0 };
    for (let guard = 0; guard < 2000 && session.state.phase !== 'finished'; guard++) {
      const { state } = session;
      if (state.turn) {
        const by = state.turn.pickedBy ?? (unitById(state, state.turn.unitId).controller as { humanId: string }).humanId;
        session = send(session, by, state.turn.unitId, { kind: 'endTurn' }).session;
        continue;
      }
      const who = guard % 2 === 0 ? 'jerome' : 'ana';
      const other = who === 'jerome' ? 'ana' : 'jerome';
      const [mine] = options(state, who);
      const [theirs] = options(state, other);
      const picker = mine ? who : other;
      const id = mine ?? theirs;
      if (!id) throw new Error('nobody to pick');
      pickers[picker]! += 1;
      session = pick(session, picker, id).session;
    }
    expect(session.state.phase).toBe('finished');
    expect(pickers.jerome).toBeGreaterThan(0);
    expect(pickers.ana).toBeGreaterThan(0);
  });
});

describe('the engine version', () => {
  // Rule: a match of engine 11 is archived; the version is 12.
  it('is 12, and refuses a match written by engine 11', () => {
    expect(ENGINE_VERSION).toBe(12);
    expect(engineVersionRefusal(11)).toMatch(/engine version 11/);
    expect(engineVersionRefusal(12)).toBeNull();
  });

  // Rule: the new actions have a shape the door knows, and the roles are listed once.
  it('has a place question for no role of a whole team', () => {
    const roles: Role[] = ['striker', 'breaker'];
    for (const role of roles) {
      const { events } = open([{ humanId: 'jerome', role, name: 'Bombast' }]);
      expect(ofKind(events, 'placeOffered')).toHaveLength(0);
    }
  });
});
