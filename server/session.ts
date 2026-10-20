/**
 * The server's half of a match, with no server in it.
 *
 * This is the whole of what `resolve-action` does, minus the database and the
 * broadcast: check that the caller owns the unit and that it is its turn, put
 * the action through `reduce`, then **play every AI turn that follows until a
 * human is up again**. That last step is the real work of the layer. In solo
 * there are thirteen AI units against one human, so a single click routinely
 * has to resolve ten or more turns, and they are resolved here in one pass and
 * shipped as one batch of events rather than one round trip per unit.
 *
 * It is kept free of Supabase on purpose. Everything that can go wrong in the
 * server's logic, an AI loop that never reaches a human, a turn clock that
 * skips the wrong player, a match that ends mid-block, is a bug that a test can
 * catch here in milliseconds. The Edge Function on top of it is then only
 * loading, persisting and broadcasting.
 *
 * No rule lives here. Legality is `reduce`'s business and nothing re-decides
 * it: the checks below are about **ownership and the clock**, which are the two
 * things the engine deliberately knows nothing about.
 */

import type { Action } from '../engine/actions.js';
import type { Arena } from '../engine/arena.js';
import { ENGINE_VERSION, TURN_TIMER_SECONDS } from '../engine/constants.js';
import type { MatchEvent } from '../engine/events.js';
import { orderBySituation, pickableUnits } from '../engine/initiative.js';
import { openMatch, reduce } from '../engine/reduce.js';
import {
  hasHuman,
  isHuman,
  pendingPick,
  playsWhole,
  unitById,
  type HumanId,
  type MatchState,
  type TeamId,
  type Unit,
  type UnitId,
} from '../engine/types.js';
import { chooseAction } from '../ai/chooseAction.js';
import type { AllyOrder } from '../ai/orders.js';

/**
 * A match plus the one thing about it that is not a rule: when the turn on the
 * table stops being the player's.
 *
 * The deadline lives here and not in `MatchState` because the engine has no
 * clock and must not grow one. It is null whenever no human is on the clock,
 * which is every moment the AI is resolving and every moment after the final
 * whistle.
 */
export interface Session {
  readonly state: MatchState;
  /** Epoch milliseconds. Null when nobody human is on the clock. */
  readonly turnDeadline: number | null;
}

export interface SessionStep {
  readonly session: Session;
  /** Everything that happened, in order, ready to append to `match_events`. */
  readonly events: readonly MatchEvent[];
}

export interface ActionRequest {
  readonly humanId: HumanId;
  readonly unitId: UnitId;
  readonly action: Action;
}

export type SessionResult = { readonly ok: true; readonly step: SessionStep } | Refusal;

export interface Refusal {
  readonly ok: false;
  readonly reason: string;
  /**
   * The HTTP status the door answers with, when it is not the 400 of a move
   * the rules refuse: 403 for a request the caller has no right to send
   * (`rightsRefusal`, 2H.41). Read by `resolve-action`, absent otherwise.
   */
  readonly status?: 403;
}

/**
 * A hard stop on the AI loop.
 *
 * Thirteen units, each taking a walk, a swing and another walk, is nowhere near
 * this. The guard exists so that a future scoring bug that leaves an AI wanting
 * the same action forever fails loudly on the first request instead of hanging
 * an Edge Function until its own timeout.
 */
const AI_ACTION_LIMIT = 60 * 14 * 14;

// -- Opening ----------------------------------------------------------------

/**
 * Kick-off through to the first human decision.
 *
 * A match whose ladder opens on the enemy block has to resolve that block
 * before anybody is asked for anything, so opening is not merely `openMatch`.
 */
export function openSession(
  arena: Arena,
  state: MatchState,
  now: number,
  orders: readonly AllyOrder[] = [],
): SessionStep {
  const opened = openMatch(arena, state);
  return advance(arena, { state: opened.state, turnDeadline: null }, [...opened.events], now, orders);
}

// -- The one entry point ----------------------------------------------------

/**
 * One human action, then the AI up to the next human.
 *
 * The refusals are deliberately specific. A client that sends an action for the
 * wrong unit is a bug in the client, and "not your turn" is the message that
 * finds it; a client whose action `reduce` rejects is usually a stale board,
 * and passing the engine's own reason back is what makes that legible.
 */
export function submitAction(
  arena: Arena,
  session: Session,
  request: ActionRequest,
  now: number,
  orders: readonly AllyOrder[] = [],
): SessionResult {
  const { state } = session;

  if (state.phase === 'finished') return { ok: false, reason: 'the match is over' };

  // A seat handed to the house (2H.33, engine 11) is the one request that
  // need not wait for the unit's turn: the caller must control the unit, the
  // engine switches it to the AI, and the AI plays on from wherever the
  // ladder stands, the yielded unit's own turn included.
  if (request.action.kind === 'yieldSeat') {
    const unit = state.units.find((u) => u.id === request.unitId);
    if (!unit) return { ok: false, reason: `no unit with id ${request.unitId}` };
    if (unit.controller.kind !== 'human' || unit.controller.humanId !== request.humanId) {
      return { ok: false, reason: `${request.humanId} does not control ${request.unitId}`, status: 403 };
    }
    const result = reduce(arena, state, { unitId: request.unitId, action: request.action });
    if (!result.ok) return { ok: false, reason: result.reason };
    return {
      ok: true,
      step: advance(arena, { ...session, state: result.state }, [...result.events], now, orders, clockKey(state)),
    };
  }

  // Écart 66 (2H.41): the pick, the round handed to the AI and the mode for
  // the next round do not wait for a turn either. Who may send which is
  // `rightsRefusal`, shared with the door; the engine reads the rest.
  const kind = request.action.kind;
  if (kind === 'pickUnit' || kind === 'delegateRound' || kind === 'setTeamMode') {
    const refused = rightsRefusal(state, request);
    if (refused) return { ok: false, reason: refused, status: 403 };
    // Who picked is the caller, whatever the body said.
    const action: Action = kind === 'pickUnit' ? { kind, humanId: request.humanId } : request.action;
    const result = reduce(arena, state, { unitId: request.unitId, action });
    if (!result.ok) return { ok: false, reason: result.reason };
    return {
      ok: true,
      step: advance(arena, { ...session, state: result.state }, [...result.events], now, orders, clockKey(state)),
    };
  }

  if (!state.turn) return { ok: false, reason: 'no turn is open' };

  if (state.turn.unitId !== request.unitId) {
    return { ok: false, reason: `it is not ${request.unitId}'s turn` };
  }

  const refused = rightsRefusal(state, request);
  if (refused) return { ok: false, reason: refused, status: 403 };

  const result = reduce(arena, state, { unitId: request.unitId, action: request.action });
  if (!result.ok) return { ok: false, reason: result.reason };

  const events = [...result.events];
  return {
    ok: true,
    step: advance(arena, { ...session, state: result.state }, events, now, orders, clockKey(state)),
  };
}

/**
 * Why the caller may not send this request, or null. The one statement of
 * who drives what, read here and by `resolve-action`, which answers it with
 * a 403:
 *
 * - a turn action is the unit's own human's, or, on a turn that came from a
 *   pick (écart 66), the human who picked;
 * - `delegateTurn` is the one who picked;
 * - `pickUnit` is any human of the team, for a unit of the house or its own;
 * - `delegateRound` is any human of the team;
 * - `setTeamMode` is any human of the team here; the owner alone at the door,
 *   which reads `teams.owner`, a thing the engine does not know.
 *
 * "Of the team" means controlling a unit of it, on the field or not: a human
 * who yielded its seat is a spectator and sends nothing.
 */
export function rightsRefusal(state: MatchState, request: ActionRequest): string | null {
  const { humanId, unitId, action } = request;
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return `no unit with id ${unitId}`;
  const owns = unit.controller.kind === 'human' && unit.controller.humanId === humanId;
  const onTeam = state.units.some(
    (u) => u.team === unit.team && u.controller.kind === 'human' && u.controller.humanId === humanId,
  );

  switch (action.kind) {
    case 'pickUnit':
      if (!onTeam) return `${humanId} is not on ${unit.name}'s team`;
      if (unit.controller.kind === 'human' && !owns) return `${unit.name} is ${unit.controller.humanId}'s to play`;
      return null;
    case 'delegateRound':
    case 'setTeamMode':
      return onTeam ? null : `${humanId} is not on ${unit.name}'s team`;
    case 'delegateTurn':
      return state.turn?.unitId === unitId && state.turn.pickedBy === humanId
        ? null
        : `${humanId} did not pick ${unit.name}`;
    default: {
      const picked = state.turn?.unitId === unitId && state.turn.pickedBy === humanId;
      return owns || picked ? null : `${humanId} does not control ${unitId}`;
    }
  }
}

/**
 * What a request that carries an action gets, once the clock has been read.
 *
 * `expired` is the one bit a client has to know: when it is set, the events
 * are the expiry the server settled and **the action was not played**.
 */
export type ServedAction =
  | { readonly ok: true; readonly step: SessionStep; readonly expired: boolean }
  | Refusal;

/**
 * The whole of a request: settle an overdue clock, or play the action.
 *
 * **Never both** (audit line A28). `resolve-action` used to settle the expiry
 * and then submit the action it had been sent to the turn that came next, and
 * since a `move` or an `endTurn` is legal on most turns, the late action was
 * applied to a turn the player had not seen yet: an `endTurn` sent after the
 * clock, including the client's own knock, cost two turns, and the reply did
 * not even say `expired`. So an overdue clock is the only thing a late request
 * achieves. The player gets the expiry back, marked as such, and acts again on
 * the board that results.
 */
export function serveAction(
  arena: Arena,
  session: Session,
  request: ActionRequest,
  now: number,
  orders: readonly AllyOrder[] = [],
): ServedAction {
  const overdue = expireIfDue(arena, session, now, orders);
  if (overdue) return { ok: true, step: overdue, expired: true };

  const result = submitAction(arena, session, request, now, orders);
  if (!result.ok) return result;
  return { ok: true, step: result.step, expired: false };
}

/**
 * Why a match written by another engine cannot be played, or null when it can
 * (audit line A11).
 *
 * A `MatchState` and its events change shape between engine versions: the
 * version 1 silo had anchoring and falls, version 2 has neither and a different
 * pitch. Replaying a version 1 snapshot through this engine would not fail
 * loudly, it would play a corrupt match. So the `matches` row carries the
 * version that wrote it, and the doors refuse a mismatch with a reason the
 * client can show. The match is archived, not lost: its events stay.
 *
 * A row from before the column existed reads as version 1, which is what it
 * was.
 */
export function engineVersionRefusal(written: number | null | undefined): string | null {
  const version = written ?? 1;
  if (version === ENGINE_VERSION) return null;
  return (
    `this match was played on engine version ${version} and the game now runs version ` +
    `${ENGINE_VERSION}: it is archived and cannot be resumed`
  );
}

// -- The clock --------------------------------------------------------------

/**
 * Whether the human on the clock has run out of it.
 *
 * Asked by the first request that touches the match, whoever sends it. The
 * clock is not guarded by a timer on anyone's machine, so a laptop that goes to
 * sleep mid-turn cannot freeze the other two players' game.
 */
export function isExpired(session: Session, now: number): boolean {
  return session.turnDeadline !== null && now >= session.turnDeadline;
}

/**
 * Spends an expired turn on Dodge and moves on.
 *
 * Dodge rather than a forfeited turn, per the locked product decision: a player
 * who loses their connection should not also be punished for it, and standing
 * ready to dodge is the least damaging thing a Giff can do with a turn.
 *
 * Returns null when the clock has not run out, so a caller can treat this as
 * "settle anything overdue, then carry on".
 */
export function expireIfDue(
  arena: Arena,
  session: Session,
  now: number,
  orders: readonly AllyOrder[] = [],
): SessionStep | null {
  if (!isExpired(session, now)) return null;

  const { state } = session;
  if (state.phase === 'finished') return null;

  // Écart 66 (`00` C41 point 6, Jérôme: "tous les joueurs restant sous son
  // contrôle doivent repasser pour ce tour à l'IA"): a whole team whose
  // clock runs out, on a pick or on a picked turn, hands the rest of its
  // round to the AI. No Dodge: the house plays the turn out properly.
  const whole = wholeTeamOnClock(state);
  if (whole !== null) {
    const anyUnit = state.units.find((u) => u.team === whole)!;
    const ceded = reduce(arena, state, { unitId: anyUnit.id, action: { kind: 'delegateRound' } });
    if (!ceded.ok) throw new Error(`a round could not be handed to the AI on the clock: ${ceded.reason}`);
    return advance(arena, { ...session, state: ceded.state }, [...ceded.events], now, orders, clockKey(state));
  }

  if (!state.turn) return null;

  const unitId = state.turn.unitId;
  const events: MatchEvent[] = [];
  let current = state;

  // A human asked its place in its role who lets the clock run out plays
  // last of its role, as under écart 55 (écart 58, Jérôme on 2026-10-12).
  if (state.turn.placing != null) {
    const placed = reduce(arena, current, { unitId, action: { kind: 'choosePlace', place: state.turn.placing } });
    if (!placed.ok) throw new Error(`a place could not be chosen on the clock: ${placed.reason}`);
    events.push(...placed.events);
    return advance(arena, { ...session, state: placed.state }, events, now, orders, clockKey(state));
  }

  // Dodge is refused once the Action is spent, which is the common case for a
  // player who acted and then went quiet. Ending the turn is the part that has
  // to happen either way.
  const dodged = reduce(arena, current, { unitId, action: { kind: 'dodge' } });
  if (dodged.ok) {
    events.push(...dodged.events);
    current = dodged.state;
  }

  const ended = reduce(arena, current, { unitId, action: { kind: 'endTurn' } });
  if (!ended.ok) throw new Error(`a turn could not be ended on the clock: ${ended.reason}`);
  events.push(...ended.events);

  return advance(arena, { ...session, state: ended.state }, events, now, orders, clockKey(state));
}

// -- Running the machine ----------------------------------------------------

/**
 * Plays out everything nobody human has to decide.
 *
 * The hazards need no help: `reduce` resolves the Crackers' count and the
 * Spark's dart itself as the ladder passes over them. What is left is the AI
 * units, and each one is driven exactly the way a client drives a human: ask
 * for one action, send it, repeat until the turn passes to somebody else.
 */
function advance(
  arena: Arena,
  session: Session,
  events: MatchEvent[],
  now: number,
  orders: readonly AllyOrder[],
  // Who was on the clock before this step, so the deadline below can tell a
  // turn that carried on from a turn that started. Read by the caller on the
  // state before the human's action: after a place chosen first (écart 58)
  // the state handed in here is already the human's turn, which has to get a
  // fresh clock and not the one the choice was given.
  wasOnClock: string | null = clockKey(session.state),
): SessionStep {
  let current = session.state;
  let spent = 0;

  while (current.phase !== 'finished') {
    if (spent++ >= AI_ACTION_LIMIT) {
      throw new Error(`the AI did not reach a human turn within ${AI_ACTION_LIMIT} actions`);
    }

    // Écart 66: a pick nobody human will answer, because the team handed
    // the round to the AI or has nobody left to pick, is taken by the house
    // in the order the situation calls for, which is the order an AI side
    // is laddered in. The turn it opens is delegated and played below.
    if (!current.turn) {
      const pick = pendingPick(current);
      if (!pick || waitingOnHuman(current)) break;
      const [first] = orderBySituation(arena, current, pick.team, pickableUnits(current, pick.team));
      if (!first) throw new Error('a pick with nobody to take it was not skipped');
      const picked = reduce(arena, current, { unitId: first.id, action: { kind: 'pickUnit', humanId: null } });
      if (!picked.ok) throw new Error(`the house could not take a pick: ${picked.reason}`);
      events.push(...picked.events);
      current = picked.state;
      continue;
    }

    const unit = unitById(current, current.turn.unitId);
    if (waitingOnHuman(current)) break;

    const action = chooseAction(arena, current, unit.id, orders);
    const result = reduce(arena, current, { unitId: unit.id, action });

    // The AI only ever sends what `legalActions` offered, so a refusal here is
    // a disagreement between the generator and the door, not a bad move. It
    // must surface rather than be skipped, or the match would silently stall.
    if (!result.ok) throw new Error(`the AI sent an illegal action: ${result.reason}`);

    events.push(...result.events);
    current = result.state;
  }

  return {
    session: {
      state: current,
      turnDeadline: deadlineFor(current, now, wasOnClock, session.turnDeadline),
    },
    events,
  };
}

/**
 * The clock only runs while a human is being asked for something, and it is
 * **the turn's clock, not the request's**.
 *
 * That distinction is the whole of this function and it was got wrong. A turn
 * is walk, swing, walk again, end: four requests, and every one of them used to
 * be handed a fresh `now + 60s`. A player who kept clicking was never on a
 * clock at all, while the display restarted at sixty each time, which is
 * exactly what Jérôme saw. So the deadline is only made when the turn actually
 * changes hands; a turn that carries on keeps the one it started with.
 */
function deadlineFor(
  state: MatchState,
  now: number,
  wasOnClock: string | null,
  standing: number | null,
): number | null {
  if (!waitingOnHuman(state)) return null;
  // Same unit still on the clock, and it already had a deadline: it is the same
  // turn continuing, so it keeps the time it was given.
  if (standing !== null && wasOnClock === clockKey(state)) return standing;
  return now + TURN_TIMER_SECONDS * 1000;
}

/**
 * Whether the match is waiting on a human: a turn of a human's unit, or
 * since écart 66 a picked turn not yet handed to the AI, or a pick of a
 * whole team that still has somebody to answer it and has not ceded the
 * round. This is what stops the AI loop and what the clock runs for; the
 * two must never disagree, so they read one function.
 */
export function waitingOnHuman(state: MatchState): boolean {
  if (state.phase === 'finished') return false;
  const turn = state.turn;
  if (turn) {
    if (turn.delegated) return false;
    return turn.pickedBy !== null || isHuman(unitById(state, turn.unitId));
  }
  const pick = pendingPick(state);
  if (!pick) return false;
  return hasHuman(state, pick.team) && !state.delegatedRound[pick.team];
}

/**
 * The whole team whose clock is running (écart 66): the team of a pending
 * pick, or of a picked turn still its human's. Null when the clock belongs
 * to a seat-by-seat turn, or to nobody.
 */
function wholeTeamOnClock(state: MatchState): TeamId | null {
  if (!waitingOnHuman(state)) return null;
  const turn = state.turn;
  if (turn) {
    if (turn.pickedBy === null) return null;
    const unit: Unit = unitById(state, turn.unitId);
    return playsWhole(state, unit.team) ? unit.team : null;
  }
  return pendingPick(state)?.team ?? null;
}

/**
 * What the clock is running for: the unit on the turn, and whether it is
 * choosing its place in its role. The choice has its own clock and the turn
 * that follows starts a fresh one, the first place included (écart 58,
 * Jérôme on 2026-10-12). A pick (écart 66) has its own clock too, named by
 * the round, the team and the rung, and the picked turn starts a fresh one.
 */
function clockKey(state: MatchState): string | null {
  if (!state.turn) {
    const pick = pendingPick(state);
    return pick ? `pick:${pick.team}@${state.round}:${pick.index}` : null;
  }
  // The round and the cursor are part of the key (2H.13). With the unit alone,
  // a Trajector or a Bulwark, which has no place to choose, read as "the same
  // turn carrying on" round after round and kept its round 1 deadline for the
  // whole match: once two minutes had passed, every later turn expired on the
  // first click. Jérôme saw it at round 4 or 5 as Trajector, round 8 as
  // Bulwark. A Striker or Breaker escaped it only because the place prompt
  // changed the key twice a round.
  const turn = `${state.turn.unitId}@${state.round}:${state.turnIndex}`;
  return state.turn.placing != null ? `${turn}#place` : turn;
}
