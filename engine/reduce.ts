/**
 * The single door.
 *
 * Every transition of a match passes through `reduce`: a human clicking, an AI
 * choosing, the Crackers homing in, the round rolling over. There is no second
 * way to change a `MatchState`, which is what makes a match replayable from its
 * events and testable without a screen.
 *
 * Pure and synchronous. It takes a state and a command, it returns a new state
 * and what happened. It never mutates its input, never reads a clock, never
 * touches the network.
 */

import type { Action, Command } from './actions.js';
import type { Arena } from './arena.js';
import {
  BAT_DAMAGE_DIE,
  CRACKER_AC,
  CRACKER_DAMAGE_DICE,
  CRACKER_DAMAGE_DIE,
  CRACKER_FIRST_DRIFT_ROUND,
  CRACKER_RESPAWN_DELAY,
  CRACKER_SAVE_DC,
  GOAL_POINTS,
  MATCH_ROUNDS,
  MOVE_SPEED_FEET,
  PAYLOAD_PASS_AC,
  PENALTY_BOX_ROUNDS,
  SPARK_CATCH_DC,
  SPARK_ENTRY_ROUND,
  SPARK_POINTS,
  SUBSTITUTE_DELAY_ROUNDS,
  SUDDEN_DEATH_ROUNDS,
} from './constants.js';
import type { MatchEvent } from './events.js';
import { directionFromD8, distance, lineTo, stepCostFeet, type Point } from './geometry.js';
import {
  buildTurnOrder,
  pickableUnits,
  placeHuman,
  placeHumans,
  placementAt,
  promoteBulwark,
} from './initiative.js';
import { Rng } from './rng.js';
import {
  attackMode,
  opposedRoll,
  pushDestination,
  recoilDestination,
  resolveShove,
  rollAgainst,
} from './rules/combat.js';
import { validatePath } from './rules/movement.js';
import { opportunityAttackers, passInterceptors } from './rules/reactions.js';
import {
  arrivalFace,
  battedCrackerRun,
  crackerRespawnCell,
  crackerRun,
  parryDirection,
  sparkDriftFace,
  sparkEntryCell,
  sparkReturnCell,
  sparkRun,
  type HazardRun,
} from './rules/ordnance.js';
import { barredCells } from './rules/box.js';
import { cellKey, nearestFreeCell, takenOn } from './rules/placement.js';
import {
  blockingBulwark,
  dropCell,
  nearestHatch,
  reboundCell,
  scatter,
  shotTarget,
  throwRange,
  throwRangeOver,
  visibleRangeToFurnace,
} from './rules/payload.js';
import { hasLineOfSight } from './rules/sight.js';
import { statsFor } from './stats.js';
import {
  activeUnits,
  activeUnitsOf,
  modeOf,
  opposingTeam,
  pendingPick,
  playsWhole,
  sparkIsLive,
  type Cracker,
  type HumanId,
  type MatchResult,
  type MatchState,
  type TeamId,
  type TeamMode,
  type TurnSlot,
  type Unit,
  type UnitId,
  unitById,
} from './types.js';

export type ReduceResult =
  | { readonly ok: true; readonly state: MatchState; readonly events: readonly MatchEvent[] }
  | { readonly ok: false; readonly reason: string };

/**
 * The board, the log and the dice. Enough for anything that resolves without
 * anyone taking a turn, which is what the Crackers and the Spark do.
 */
interface Ctx {
  readonly arena: Arena;
  readonly log: MatchEvent[];
  readonly rng: Rng;
}

/** A `Ctx` inside a unit's turn, gathered once so handler signatures stay short. */
interface TurnCtx extends Ctx {
  readonly state: MatchState;
  readonly unit: Unit;
}

export function reduce(arena: Arena, state: MatchState, command: Command): ReduceResult {
  if (state.phase === 'finished') return { ok: false, reason: 'the match is over' };

  // A seat handed to the house (2H.33) is not a turn action: it is accepted
  // at any moment, on the clock or not, from the unit's own controller.
  if (command.action.kind === 'yieldSeat') return applyYieldSeat(arena, state, command.unitId);

  // Écart 66 (2H.41): three more that do not wait for a turn. The pick is
  // the moment before a turn; the mode is for the next round; the round
  // handed to the AI is accepted on a pick as on a picked turn.
  if (command.action.kind === 'pickUnit') return applyPickUnit(state, command.unitId, command.action.humanId);
  if (command.action.kind === 'setTeamMode') return applySetTeamMode(state, command.unitId, command.action.mode);
  if (command.action.kind === 'delegateRound') return applyDelegateRound(state, command.unitId);

  const turn = state.turn;
  if (!turn) return { ok: false, reason: 'no turn is in progress' };
  if (turn.unitId !== command.unitId) {
    return { ok: false, reason: `it is ${turn.unitId}'s turn, not ${command.unitId}'s` };
  }

  const unit = state.units.find((u) => u.id === command.unitId);
  if (!unit) return { ok: false, reason: `no unit with id ${command.unitId}` };
  if (unit.status !== 'active') return { ok: false, reason: `${unit.name} is off the field` };

  // Écart 58: while a human is asked its place in its role, that is the only
  // thing it can send, and it can send it at no other time. Loose equality on
  // purpose: a turn written before engine 7 has no such field.
  if (turn.placing != null) {
    if (command.action.kind !== 'choosePlace') {
      return { ok: false, reason: `${unit.name} has to choose a place in its role first` };
    }
    return applyChoosePlace(arena, state, unit, command.action.place);
  }
  if (command.action.kind === 'choosePlace') {
    return { ok: false, reason: 'no place is being chosen' };
  }

  return apply(arena, state, unit, command.action);
}

function apply(arena: Arena, state: MatchState, unit: Unit, action: Action): ReduceResult {
  const ctx: TurnCtx = { arena, state, unit, log: [], rng: new Rng(state.rngSeed) };

  switch (action.kind) {
    case 'move':
      return applyMove(ctx, action.path);
    case 'dash':
      return applyDash(ctx);
    case 'dodge':
      return applySelfAction(ctx, 'dodging');
    case 'brace':
      return applyBrace(ctx);
    case 'disengage':
      return applySelfAction(ctx, 'disengaged');
    case 'attack':
      return applyAttack(ctx, action.targetId);
    case 'shove':
      return applyShove(ctx, action.targetId);
    case 'batCracker':
      return applyBatCracker(ctx, action.crackerId, action.direction);
    case 'catchSpark':
      return applyCatchSpark(ctx);
    case 'grabPayload':
      return applyGrabPayload(ctx);
    case 'pass':
      return applyPass(ctx, action.targetId);
    case 'shoot':
      return applyShoot(ctx);
    case 'endTurn':
      return applyEndTurn(arena, state, unit);
    case 'choosePlace':
      return { ok: false, reason: 'no place is being chosen' };
    case 'delegateTurn':
      return applyDelegateTurn(state, unit);
    case 'yieldSeat':
    case 'pickUnit':
    case 'setTeamMode':
    case 'delegateRound':
      // Handled before the turn checks in `reduce`; unreachable here.
      return { ok: false, reason: `${action.kind} is not a turn action` };
  }
}

// -- The whole team (écart 66, 2H.41, engine version 12) ----------------------

/**
 * A pick taken: the slot the ladder waits on becomes the unit's, and its
 * turn opens at once. The unit must be the team's, active, and without a
 * turn of its own this round; `humanId` is who picked, and the Giff of
 * another human is refused (`00` C41 point 4). A pick of a team whose
 * round is delegated opens a delegated turn, whoever took it; so does a
 * pick the house took itself (`humanId` null).
 */
function applyPickUnit(state: MatchState, unitId: UnitId, humanId: HumanId | null): ReduceResult {
  const pick = pendingPick(state);
  if (!pick) return { ok: false, reason: 'no pick is waiting' };
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: `no unit with id ${unitId}` };
  if (unit.team !== pick.team) return { ok: false, reason: `${unit.name} is not on the team whose pick it is` };
  if (!pickableUnits(state, pick.team).some((u) => u.id === unitId)) {
    return { ok: false, reason: `${unit.name} cannot be picked: off the field or already played this round` };
  }
  if (humanId !== null && unit.controller.kind === 'human' && unit.controller.humanId !== humanId) {
    return { ok: false, reason: `${unit.name} is ${unit.controller.humanId}'s to play` };
  }

  const log: MatchEvent[] = [{ kind: 'unitPicked', unitId, humanId, round: state.round }];
  const slot: TurnSlot = { ...state.turnOrder[pick.index]!, actor: { kind: 'unit', unitId }, team: unit.team };
  const named: MatchState = {
    ...state,
    turnOrder: state.turnOrder.map((s, i) => (i === pick.index ? slot : s)),
  };
  const delegated = humanId === null || named.delegatedRound[unit.team];
  const begun = beginTurn(named, unit, log);
  return {
    ok: true,
    state: { ...begun, turn: { ...begun.turn!, pickedBy: humanId, delegated } },
    events: log,
  };
}

/**
 * The rest of a picked turn handed to the AI. Only a turn that came from a
 * pick: a seat-by-seat turn is its human's to the end, as before.
 */
function applyDelegateTurn(state: MatchState, unit: Unit): ReduceResult {
  const turn = state.turn!;
  if (turn.pickedBy === null) return { ok: false, reason: `${unit.name}'s turn did not come from a pick` };
  if (turn.delegated) return { ok: false, reason: 'the turn is already the AI\'s' };
  return {
    ok: true,
    state: { ...state, turn: { ...turn, delegated: true } },
    events: [{ kind: 'turnDelegated', unitId: unit.id }],
  };
}

/**
 * The team's remaining picks this round handed to the AI, and the picked
 * turn in progress with them. The command unit names the team. Refused for
 * a team not played whole, and when nothing of the team's is left this
 * round: a late click on a round that has moved on is a stale board, which
 * the client already knows how to read.
 */
function applyDelegateRound(state: MatchState, unitId: UnitId): ReduceResult {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: `no unit with id ${unitId}` };
  const team = unit.team;
  if (!playsWhole(state, team)) return { ok: false, reason: 'the team is played seat by seat' };
  if (state.delegatedRound[team]) return { ok: false, reason: 'the round is already the AI\'s' };

  const onPick = pendingPick(state)?.team === team;
  const onTurn = state.turn !== null && state.turn.pickedBy !== null && unitById(state, state.turn.unitId).team === team;
  const ahead = state.turnOrder.some(
    (slot, i) => i > state.turnIndex && slot.actor.kind === 'pick' && slot.actor.team === team,
  );
  if (!onPick && !onTurn && !ahead) return { ok: false, reason: 'nothing of the team is left to play this round' };

  const turn = onTurn && state.turn ? { ...state.turn, delegated: true } : state.turn;
  return {
    ok: true,
    state: { ...state, turn, delegatedRound: { ...state.delegatedRound, [team]: true } },
    events: [{ kind: 'roundDelegated', team, round: state.round }],
  };
}

/**
 * The mode asked for the command unit's team from the next round on. The
 * round in progress finishes as it began; `rebuild` applies it. Asking for
 * the mode already in force withdraws a pending request, so the next round
 * is what the owner last said.
 */
function applySetTeamMode(state: MatchState, unitId: UnitId, mode: TeamMode): ReduceResult {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: `no unit with id ${unitId}` };
  if (mode !== 'seat' && mode !== 'whole') return { ok: false, reason: `there is no such mode as ${String(mode)}` };
  const team = unit.team;
  const requested = mode === modeOf(state, team) ? null : mode;
  return {
    ok: true,
    state: { ...state, requestedMode: { ...state.requestedMode, [team]: requested } },
    events: [{ kind: 'teamModeRequested', team, mode, round: state.round }],
  };
}

/**
 * A human hands its Giff to the house for the rest of the match (2H.33, `00`
 * C32 point 6, Jérôme's "b", engine version 11). The unit's controller becomes
 * the AI's; `seatYielded` says so. If the unit was being asked its place in
 * its role, the house takes the last, as a clock that ran out would, and the
 * ladder moves on; if the unit was on the clock, the turn stays open and the
 * caller's AI loop plays it. Nothing else changes: the unit keeps its cell,
 * its hit points and its ball.
 */
function applyYieldSeat(arena: Arena, state: MatchState, unitId: UnitId): ReduceResult {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: `no unit with id ${unitId}` };
  if (unit.controller.kind !== 'human') return { ok: false, reason: `${unit.name} is already the house's` };

  const log: MatchEvent[] = [{ kind: 'seatYielded', unitId, humanId: unit.controller.humanId }];
  const yielded: Unit = { ...unit, controller: { kind: 'ai' } };
  const next = replaceUnit(state, yielded);

  if (next.turn?.unitId === unitId && next.turn.placing != null) {
    const placed = applyChoosePlace(arena, next, yielded, next.turn.placing);
    if (!placed.ok) return placed;
    return { ok: true, state: placed.state, events: [...log, ...placed.events] };
  }
  // Écart 66: a picked turn of the yielded unit is the AI's from here, as
  // the human who picked it controls nothing of it any more.
  if (next.turn?.unitId === unitId && next.turn.pickedBy !== null) {
    return { ok: true, state: { ...next, turn: { ...next.turn, delegated: true } }, events: log };
  }
  return { ok: true, state: next, events: log };
}

/** Seals a handler's result, writing the RNG cursor back into the state. */
function done(ctx: Ctx, state: MatchState): ReduceResult {
  return { ok: true, state: rememberCarrier({ ...state, rngSeed: ctx.rng.seed }), events: ctx.log };
}

/**
 * The side holding the ball, written down whenever a handler finishes with it
 * in somebody's hands, so the ladder can put the Crackers after the carrying
 * side even when the ball is loose at the top of the round (écart 51). Every
 * change of hands goes through a handler and so through `done`.
 */
function rememberCarrier(state: MatchState): MatchState {
  const carrier = state.payload.carriedBy;
  if (carrier === null) return state;
  const unit = state.units.find((u) => u.id === carrier);
  if (!unit || unit.team === state.lastCarrierTeam) return state;
  return { ...state, lastCarrierTeam: unit.team };
}

// -- Movement ---------------------------------------------------------------

/**
 * Walking a route, one cell at a time.
 *
 * The whole path is validated up front, then walked step by step, because
 * stepping out of an opponent's reach is what draws an opportunity attack and
 * the engine has to know exactly where the mover was when it did.
 *
 * The move is logged in segments, cut wherever a swing lands, so a client
 * replays walk, swing, walk instead of teleporting the mover past its
 * attackers and resolving the violence afterwards.
 */
function applyMove(ctx: TurnCtx, path: readonly Point[]): ReduceResult {
  const { state, unit, arena } = ctx;
  const turn = state.turn!;
  const verdict = validatePath(arena, state, unit, path, turn.movementFeetRemaining);
  if (!verdict.ok) return { ok: false, reason: verdict.reason };

  let next: MatchState = state;
  let spentFeet = 0;
  let carriedOff = false;

  let segment: Point[] = [];
  let segmentFeet = 0;
  let segmentFrom: Point = { x: unit.x, y: unit.y };
  let current: Point = segmentFrom;

  const flush = (): void => {
    if (segment.length === 0) return;
    const to = segment[segment.length - 1]!;
    ctx.log.push({
      kind: 'moved',
      unitId: unit.id,
      from: segmentFrom,
      to,
      path: [...segment],
      costFeet: segmentFeet,
    });
    segmentFrom = to;
    segment = [];
    segmentFeet = 0;
  };

  for (const step of path) {
    const mover = next.units.find((u) => u.id === unit.id)!;
    next = replaceUnit(next, { ...mover, x: step.x, y: step.y });

    const cost = stepCostFeet(current, step);
    spentFeet += cost;
    segmentFeet += cost;
    segment.push(step);

    // Disengage buys the whole turn out of this, which is what it is for.
    const watchers = turn.disengaged ? [] : opportunityAttackers(next, mover, current, step);
    current = step;
    if (watchers.length === 0) continue;

    flush();
    next = resolveOpportunityAttacks(ctx, next, unit.id, watchers);

    if (next.units.find((u) => u.id === unit.id)!.status !== 'active') {
      carriedOff = true;
      break;
    }
  }

  flush();

  // A braced Bulwark that walks is no longer dug in (écart 52).
  const walker = next.units.find((u) => u.id === unit.id)!;
  if (walker.braced && path.length > 0) next = replaceUnit(next, { ...walker, braced: false });

  const spent: MatchState = {
    ...next,
    turn: { ...turn, movementFeetRemaining: turn.movementFeetRemaining - spentFeet },
  };

  // Taken off the field in the middle of its own move. The turn ends where it
  // fell, and the ladder moves on rather than waiting on a player who is gone.
  if (carriedOff) return advance(arena, { ...spent, turn: null, rngSeed: ctx.rng.seed }, ctx.log);

  return done(ctx, spent);
}

/**
 * The swings drawn by one step. Automatic, under the policy in `reactions.ts`:
 * every opponent with a Reaction left takes it (écart 33). The vertical silo
 * let a swinger hold back when the recoil would have cost it its grip; on a
 * floor there is nothing to hold back for.
 */
function resolveOpportunityAttacks(
  ctx: Ctx,
  state: MatchState,
  moverId: UnitId,
  watchers: readonly Unit[],
): MatchState {
  let next = state;

  for (const watcher of watchers) {
    const target = next.units.find((u) => u.id === moverId)!;
    if (target.status !== 'active') break;

    const attacker = next.units.find((u) => u.id === watcher.id)!;
    if (attacker.status !== 'active' || !attacker.reactionAvailable) continue;

    const landingSpot = { x: target.x, y: target.y };
    next = replaceUnit(next, { ...attacker, reactionAvailable: false });

    const might = statsFor(attacker.role, attacker.tier).might;
    const outcome = rollAgainst(
      ctx.rng,
      might,
      statsFor(target.role, target.tier).ac,
      attackMode(target),
    );
    ctx.log.push({
      kind: 'opportunityAttacked',
      attackerId: attacker.id,
      targetId: moverId,
      roll: outcome.roll,
      hit: outcome.hit,
    });

    if (outcome.hit) {
      next = applyDamage(ctx, next, moverId, ctx.rng.die(BAT_DAMAGE_DIE) + might, 'bat');
    }

    next = recoilFrom(ctx, next, attacker.id, landingSpot);
  }

  return next;
}

function applyDash(ctx: TurnCtx): ReduceResult {
  const { state, unit } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };

  ctx.log.push({ kind: 'dashed', unitId: unit.id, extraFeet: MOVE_SPEED_FEET });
  return done(ctx, {
    ...state,
    turn: {
      ...turn,
      actionUsed: true,
      movementFeetRemaining: turn.movementFeetRemaining + MOVE_SPEED_FEET,
    },
  });
}

/**
 * Dodge and Disengage differ only in where the flag lives. Dodge holds until
 * this unit's next turn, so it sits on the unit; Disengage dies with the turn,
 * so it sits on the turn.
 */
function applySelfAction(ctx: TurnCtx, effect: 'dodging' | 'disengaged'): ReduceResult {
  const { state, unit } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };

  ctx.log.push({ kind: effect === 'dodging' ? 'dodging' : 'disengaged', unitId: unit.id });

  return done(
    ctx,
    effect === 'dodging'
      ? { ...replaceUnit(state, { ...unit, dodging: true }), turn: { ...turn, actionUsed: true } }
      : { ...state, turn: { ...turn, actionUsed: true, disengaged: true } },
  );
}

/**
 * The Bulwark digs in (écart 52, 2H.7). Its Action; from then until its next
 * turn, or until it takes a step, a Shove against it rolls at disadvantage and
 * minus three (`resolveShove`). The blocking Reaction is untouched, which is
 * the point: a keeper that cannot be walked out of the mouth is a keeper that
 * still has a mouth to block.
 */
function applyBrace(ctx: TurnCtx): ReduceResult {
  const { state, unit } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };
  if (unit.role !== 'bulwark') return { ok: false, reason: 'only a Bulwark can dig in' };

  ctx.log.push({ kind: 'braced', unitId: unit.id });
  return done(ctx, {
    ...replaceUnit(state, { ...unit, braced: true }),
    turn: { ...turn, actionUsed: true },
  });
}

// -- Violence ---------------------------------------------------------------

function applyAttack(ctx: TurnCtx, targetId: UnitId): ReduceResult {
  const { state, unit } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };
  if (unit.holdingPayload) return { ok: false, reason: 'a player holding the Payload cannot swing' };

  const target = liveTarget(state, unit, targetId, 1);
  if ('reason' in target) return { ok: false, reason: target.reason };

  const might = statsFor(unit.role, unit.tier).might;
  const outcome = rollAgainst(ctx.rng, might, target.unit.ac, attackMode(target.unit));
  ctx.log.push({
    kind: 'attacked',
    attackerId: unit.id,
    targetId,
    roll: outcome.roll,
    hit: outcome.hit,
  });

  let next: MatchState = { ...state, turn: { ...turn, actionUsed: true } };
  if (outcome.hit) {
    const damage = ctx.rng.die(BAT_DAMAGE_DIE) + might;
    next = applyDamage(ctx, next, target.unit.id, damage, 'bat');
  }

  return done(ctx, recoilFrom(ctx, next, unit.id, { x: target.unit.x, y: target.unit.y }));
}

/**
 * The blast-bat's charge going off, which fires whether or not the swing
 * landed. That is what makes any swing a positional decision and not a free
 * one. It is forced movement, so it provokes nothing, and it stops against an
 * obstacle, a player or the edge (écart 33).
 *
 * The status guard is not theoretical: a player may bat a Cracker back into its
 * own cell and be carried off before the recoil would have moved it.
 */
function recoilFrom(ctx: Ctx, state: MatchState, unitId: UnitId, target: Point): MatchState {
  const attacker = state.units.find((u) => u.id === unitId);
  if (!attacker || attacker.status !== 'active') return state;

  const landing = recoilDestination(ctx.arena, state, attacker, target);
  if (landing.x === attacker.x && landing.y === attacker.y) {
    // Nothing behind the swinger to recoil into (écart 33). Said out loud
    // since 2H.13: a hundred and four such swings in seven games read on
    // screen as swings that never happened (`00` C15).
    ctx.log.push({ kind: 'recoilBlocked', unitId, at: { x: attacker.x, y: attacker.y } });
    return state;
  }

  ctx.log.push({
    kind: 'recoiled',
    unitId,
    from: { x: attacker.x, y: attacker.y },
    to: landing,
  });

  return replaceUnit(state, { ...attacker, x: landing.x, y: landing.y });
}

function applyShove(ctx: TurnCtx, targetId: UnitId): ReduceResult {
  const { state, unit, arena } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };

  const target = liveTarget(state, unit, targetId, 1);
  if ('reason' in target) return { ok: false, reason: target.reason };

  const contest = resolveShove(ctx.rng, unit, target.unit);
  const shoved = (pushedTo: Point | null, tookPayload = false): MatchEvent => ({
    kind: 'shoved',
    shoverId: unit.id,
    targetId,
    success: contest.success,
    shoverRoll: contest.shoverRoll,
    targetRoll: contest.targetRoll,
    pushedTo,
    tookPayload,
  });

  const next: MatchState = { ...state, turn: { ...turn, actionUsed: true } };
  if (!contest.success) {
    ctx.log.push(shoved(null));
    return done(ctx, next);
  }

  // A Shove that takes the ball takes the ball and stops there (arbitrage of
  // 2026-09-01, kept by écart 32): the carrier is not pushed. **Since écart
  // 61 (2H.13, Jérôme on 2026-10-14) the Payload goes straight into the
  // shover's hands**: nobody moves, the shover has spent its Action and
  // keeps whatever movement it has left, and from the next round on it is a
  // carrier like any other. It used to roll to a cell beside the carrier
  // (écart 42, which still rules an evacuated carrier), and the shover had
  // to walk onto it, which a human reads as a shove that won nothing.
  if (target.unit.holdingPayload) {
    ctx.log.push(shoved(null, true));
    // And since écart 63 (2H.14, Jérôme on 2026-10-14) the shover may throw
    // one pass for the rest of its turn without an Action: from this cell or
    // after walking what it has left. A pass, never a shot.
    const freed: MatchState = { ...next, turn: { ...next.turn!, freePass: true } };
    const stripped = replaceUnit(freed, { ...target.unit, holdingPayload: false });
    const shover = stripped.units.find((u) => u.id === unit.id)!;
    return done(ctx, {
      ...replaceUnit(stripped, { ...shover, holdingPayload: true }),
      payload: { carriedBy: shover.id, x: shover.x, y: shover.y },
    });
  }

  // Anyone else is pushed one cell straight away from the shover (écart 32),
  // or not at all when an obstacle, a player or the edge is at its back. The
  // push is in the event itself: there is no second event to replay.
  const landing = pushDestination(arena, next, target.unit, unit);
  const moved = landing.x !== target.unit.x || landing.y !== target.unit.y;
  ctx.log.push(shoved(moved ? landing : null));
  if (!moved) return done(ctx, next);

  return done(ctx, replaceUnit(next, { ...target.unit, x: landing.x, y: landing.y }));
}

// -- The Crackers -----------------------------------------------------------

/**
 * Batting a Cracker down a chosen line.
 *
 * The fiche calls this a melee attack, so it is one in every respect: it costs
 * the Action, it is barred to a player carrying the Payload, and the recoil
 * throws the swinger two cells clear whether or not the swing connected. That
 * last part is a gift rather than a cost here, since it puts distance between
 * the swinger and a live charge.
 *
 * The line has to start on an open cell: a Cracker is not batted straight into
 * a crate or off the pitch, and `legalActions` offers the same lines for the
 * same reason. Past its first cell it bounces (écart 35).
 *
 * A miss simply leaves the thing where it lies, still live, still homing on
 * count 20.
 */
function applyBatCracker(ctx: TurnCtx, crackerId: string, direction: number): ReduceResult {
  const { state, unit } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };
  if (unit.holdingPayload) return { ok: false, reason: 'a player holding the Payload cannot swing' };
  if (!Number.isInteger(direction) || direction < 1 || direction > 8) {
    return { ok: false, reason: `${direction} is not one of the eight directions` };
  }

  const cracker = state.crackers.find((c) => c.id === crackerId);
  if (!cracker) return { ok: false, reason: `no Cracker with id ${crackerId}` };
  if (cracker.state !== 'live') return { ok: false, reason: 'that Cracker is spent' };
  if (distance(unit, cracker) > 1) return { ok: false, reason: 'the Cracker is out of reach' };

  const step = directionFromD8(direction);
  if (ctx.arena.isSolid({ x: cracker.x + step.x, y: cracker.y + step.y })) {
    return { ok: false, reason: 'that line runs straight into an obstacle' };
  }

  const might = statsFor(unit.role, unit.tier).might;
  const outcome = rollAgainst(ctx.rng, might, CRACKER_AC);
  ctx.log.push({
    kind: 'crackerBatted',
    unitId: unit.id,
    crackerId,
    roll: outcome.roll,
    hit: outcome.hit,
    direction,
  });

  let next: MatchState = { ...state, turn: { ...turn, actionUsed: true } };
  if (outcome.hit) {
    next = runCracker(
      ctx,
      next,
      cracker.id,
      battedCrackerRun(ctx.arena, next, cracker, direction),
      'batted',
    );
  }

  return done(ctx, recoilFrom(ctx, next, unit.id, { x: cracker.x, y: cracker.y }));
}

/**
 * Count 20. Each live Cracker rolls `CRACKER_MOVE_CELLS` cells towards the
 * ball, posed or carried (écart 45), round whatever is in the way, and goes
 * off on the first player it crosses, friend or foe alike.
 *
 * Not on the kick-off round (écart 44): with the lines eight cells from the
 * centre, a Cracker that drifted on round 1 reached somebody every match
 * before anyone had moved. They sit still through round 1 and hunt from
 * round 2. A player may still bat one on round 1; that is a decision, not a
 * toll.
 *
 * They resolve one after the other rather than at once, so the second one sees
 * a field the first one has already changed. A Cracker that just carried
 * someone off the field is not still hunting a player who is gone, and a
 * Cracker that stopped on the ball is a cell the second one will not enter.
 */
function resolveCrackers(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  if (state.round < CRACKER_FIRST_DRIFT_ROUND) return state;

  const rng = new Rng(state.rngSeed);
  const ctx: Ctx = { arena, log, rng };
  let current = state;

  for (const { id } of state.crackers) {
    const cracker = current.crackers.find((c) => c.id === id)!;
    if (cracker.state !== 'live') continue;
    current = runCracker(ctx, current, id, crackerRun(arena, current, cracker), 'drift');
  }

  return { ...current, rngSeed: rng.seed };
}

/**
 * Walks a Cracker along a resolved run: it either goes off on someone, or it
 * comes to rest. A run in **drift** that ends on a Breaker is offered to the
 * Breaker's bat first (écart 47); a run sent by a bat is not, so a parried
 * Cracker cannot be parried again down the line.
 */
function runCracker(
  ctx: Ctx,
  state: MatchState,
  crackerId: string,
  run: HazardRun,
  mode: 'drift' | 'batted',
): MatchState {
  const cracker = state.crackers.find((c) => c.id === crackerId)!;
  const from = { x: cracker.x, y: cracker.y };

  if (run.landing.x !== from.x || run.landing.y !== from.y) {
    ctx.log.push({ kind: 'crackerMoved', crackerId, from, to: run.landing, path: [...run.path] });
  }

  const moved: Cracker = { ...cracker, x: run.landing.x, y: run.landing.y };
  const next = replaceCracker(state, moved);
  if (!run.struck) return next;

  if (mode === 'drift') {
    const parried = parry(ctx, next, moved, from, run);
    if (parried.sent) return parried.state;
    return detonate(ctx, parried.state, moved, run.struck.id);
  }

  return detonate(ctx, next, moved, run.struck.id);
}

/**
 * The Breaker's parry (écart 47). A Cracker in drift has just rolled onto a
 * Breaker's cell. Before it goes off, a Breaker with its Reaction still in
 * hand, and its hands free, swings at it: a melee attack against `CRACKER_AC`.
 * On a hit the Cracker is sent `CRACKER_BAT_RANGE_CELLS` back down a face of
 * the 120 degree arc in front of the Breaker, the face it came in through and
 * its two neighbours, bouncing as a batted Cracker does and going off on the
 * first player it meets, whoever that is. On a miss it goes off on the Breaker
 * as it always did. Either way the Reaction is spent.
 *
 * The direction is chosen by `parryDirection`, automatically, for the AI and
 * for a human alike: see there for the rule Jérôme accepted and for why.
 *
 * Three edges, decided here and told to Jérôme. A Breaker carrying the ball
 * does not parry, because every other swing of the bat is barred to a carrier
 * and the parry is a swing. A Breaker standing on a Cracker when count 20
 * comes is not parrying anything: the Cracker arrived from nowhere and goes
 * off where it lies. And the swing does not recoil the Breaker, because the
 * recoil is measured away from what was hit and the Cracker is on the
 * Breaker's own cell: there is no direction to recoil along.
 */
function parry(
  ctx: Ctx,
  state: MatchState,
  cracker: Cracker,
  from: Point,
  run: HazardRun,
): { readonly state: MatchState; readonly sent: boolean } {
  const breaker = state.units.find((u) => u.id === run.struck!.id);
  if (!breaker || breaker.role !== 'breaker' || breaker.status !== 'active') {
    return { state, sent: false };
  }
  if (!breaker.reactionAvailable || breaker.holdingPayload) return { state, sent: false };

  const arrival = arrivalFace(from, run);
  if (arrival === null) return { state, sent: false };

  const guarded = replaceUnit(state, { ...breaker, reactionAvailable: false });
  const might = statsFor(breaker.role, breaker.tier).might;
  const outcome = rollAgainst(ctx.rng, might, CRACKER_AC);
  const direction = parryDirection(ctx.arena, guarded, breaker, arrival);
  ctx.log.push({
    kind: 'crackerParried',
    unitId: breaker.id,
    crackerId: cracker.id,
    roll: outcome.roll,
    hit: outcome.hit,
    direction,
  });

  if (!outcome.hit) return { state: guarded, sent: false };

  const sent = runCracker(
    ctx,
    guarded,
    cracker.id,
    battedCrackerRun(ctx.arena, guarded, cracker, direction),
    'batted',
  );
  return { state: sent, sent: true };
}

/**
 * The blast. One save, one victim, and the Cracker is scrap until a fresh one
 * drops back in near the centre of the pitch next round.
 *
 * The damage is rolled whether or not the save landed, so the sequence of dice
 * is the same either way and a replay cannot drift on a lucky Dexterity roll.
 */
function detonate(ctx: Ctx, state: MatchState, cracker: Cracker, targetId: UnitId): MatchState {
  const target = state.units.find((u) => u.id === targetId)!;
  const save = rollAgainst(ctx.rng, statsFor(target.role, target.tier).agility, CRACKER_SAVE_DC);
  const rolled = ctx.rng.roll(CRACKER_DAMAGE_DICE, CRACKER_DAMAGE_DIE);
  const damage = save.hit ? Math.floor(rolled / 2) : rolled;

  ctx.log.push({
    kind: 'crackerDetonated',
    crackerId: cracker.id,
    at: { x: cracker.x, y: cracker.y },
    targetId,
    save: save.roll,
    saved: save.hit,
    damage,
  });

  const spent = replaceCracker(state, {
    ...cracker,
    state: 'destroyed',
    respawnOnRound: state.round + CRACKER_RESPAWN_DELAY,
  });

  return applyDamage(ctx, spent, targetId, damage, 'cracker');
}

/**
 * A spent Cracker comes back beside its own edge post of the halfway line
 * (écart 46), never on the ball, on a player, or on the other Cracker, and
 * starts hunting again. One after the other, so the second sees where the
 * first landed.
 */
function respawnCrackers(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  const rng = new Rng(state.rngSeed);
  let current = state;
  let changed = false;

  state.crackers.forEach((cracker, index) => {
    if (cracker.state === 'live') return;
    if (cracker.respawnOnRound === null || cracker.respawnOnRound > state.round) return;

    const at = crackerRespawnCell(arena, current, index, rng);
    changed = true;
    log.push({ kind: 'crackerRespawned', crackerId: cracker.id, at, round: state.round });
    current = replaceCracker(current, {
      ...cracker,
      x: at.x,
      y: at.y,
      state: 'live' as const,
      respawnOnRound: null,
    });
  });

  return changed ? { ...current, rngSeed: rng.seed } : state;
}

// -- The Spark --------------------------------------------------------------

/**
 * Catching the Spark. One Action, from its own cell, against DC 20, for four
 * goals' worth of points and no whistle.
 *
 * It used to end the match on the spot for a hundred and fifty. Now that it is
 * catchable on purpose rather than by accident, an instant win would have made
 * it the only thing worth playing: the points go on the board and the match
 * runs its rounds out.
 *
 * It is not gone for good any more (écart 50, 2H.7). A caught Spark goes back
 * to `pending` and `enterSpark` drops it in again at the top of the next
 * round, on a fresh cell and heading, worth as much again. Jérôme asked for it
 * after the engine 3 game: a prize that is taken once by round seven leaves
 * three rounds with nothing but the Payload to play for. What that does to
 * the share of matches the Spark settles is measured in the 2H.7 sweep, and
 * the price stays his call.
 *
 * In sudden death it ends the match like any other score, because that is the
 * sudden-death rule and not the Spark's.
 *
 * The fiche offers Sleight of Hand or Acrobatics. Both sit in the same agility
 * column of the stat table, so there is nothing to ask the player: a Trajector
 * is the one who reaches for it, which is the point of the number.
 */
function applyCatchSpark(ctx: TurnCtx): ReduceResult {
  const { state, unit } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };
  if (!sparkIsLive(state.spark)) return { ok: false, reason: 'the Spark is not on the field' };
  if (state.spark.x !== unit.x || state.spark.y !== unit.y) {
    return { ok: false, reason: 'the Spark is not in this cell' };
  }
  // Écart 57 (2H.11): a carrier's hands are full.
  if (unit.holdingPayload) return { ok: false, reason: `${unit.name} is holding the Payload` };

  const agility = statsFor(unit.role, unit.tier).agility;
  const outcome = rollAgainst(ctx.rng, agility, SPARK_CATCH_DC);
  ctx.log.push({ kind: 'sparkCaught', unitId: unit.id, roll: outcome.roll, caught: outcome.hit });

  const next: MatchState = { ...state, turn: { ...turn, actionUsed: true } };
  if (!outcome.hit) return done(ctx, next);

  ctx.log.push({ kind: 'scored', team: unit.team, points: SPARK_POINTS, source: 'spark' });
  const caught: MatchState = {
    ...next,
    spark: { ...next.spark, state: 'pending', heading: null },
    score: { ...next.score, [unit.team]: next.score[unit.team] + SPARK_POINTS },
  };

  if (caught.phase === 'suddenDeath') return done(ctx, finish(caught, ctx.log));
  return done(ctx, caught);
}

/**
 * Count 10. Six cells along the heading it is already on, bouncing off the
 * obstacles and the edge of the pitch and keeping whatever heading the bounce
 * leaves it with (écart 36).
 *
 * No dice are thrown here, which is deliberate: a Spark whose heading is
 * rerolled every round cannot be cut off, only stumbled into. Read off the
 * board it is now a ball on a table, and closing on it is a decision.
 *
 * It hits nobody and nothing on the way: the only thing that happens to the
 * Spark is being caught, which is why it is worth chasing rather than avoiding.
 */
function resolveSpark(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  if (!sparkIsLive(state.spark)) return state;

  // Écart 59 (2H.13): a d8 each round, never towards a Trajector. The face
  // the run ended on is kept on the state for whoever reads it; nothing
  // plays from it any more.
  const rng = new Rng(state.rngSeed);
  const from = { x: state.spark.x, y: state.spark.y };
  const run = sparkRun(arena, from, sparkDriftFace(arena, state, rng));

  log.push({
    kind: 'sparkMoved',
    from,
    to: run.landing,
    direction: run.direction,
    path: [...run.path],
    cause: 'drift',
  });

  return {
    ...state,
    spark: { ...state.spark, x: run.landing.x, y: run.landing.y, heading: run.heading },
    rngSeed: rng.seed,
  };
}

/**
 * The Spark skipping away from under a minder (écart 49, 2H.7).
 *
 * A unit that finishes its turn standing on the Spark without having caught
 * it, whether it tried and fumbled or never tried, was sitting on the prize:
 * a cell with a unit on it cannot be entered, so nobody else could reach for
 * it until the minder moved. Jérôme saw it in his engine 3 game and called it
 * "couver le Spark". So at the end of any such turn the Spark hops one cell
 * away on a d8, with the same clockwise fallback as a dropped ball (écart 42,
 * `dropLanding`): the first free neighbour from the rolled face. If all eight
 * are taken it stays, which the layout makes rare and a test keeps honest.
 *
 * The heading is kept: the hop is a nudge, not a new drift, and the count-10
 * run carries on from the new cell. The event is a `sparkMoved` with
 * `cause: 'escape'` so the client can say what happened without guessing.
 */
function sparkEscape(arena: Arena, state: MatchState, unit: Unit, log: MatchEvent[]): MatchState {
  if (!sparkIsLive(state.spark)) return state;
  if (state.spark.x !== unit.x || state.spark.y !== unit.y) return state;

  const rng = new Rng(state.rngSeed);
  const from = { x: state.spark.x, y: state.spark.y };
  const { landing, direction } = dropCell(arena, state, from, rng);
  if (landing.x === from.x && landing.y === from.y) return { ...state, rngSeed: rng.seed };

  log.push({ kind: 'sparkMoved', from, to: landing, direction, path: [landing], cause: 'escape' });
  return {
    ...state,
    spark: { ...state.spark, x: landing.x, y: landing.y },
    rngSeed: rng.seed,
  };
}

/**
 * The Spark drops in at the top of round 6, on a cell and a heading rolled
 * once and for all. Holding it back that long is what keeps it from deciding
 * the match before anyone has had a chance to score a goal.
 *
 * The guard is on `pending` and the round: a caught Spark is `pending` again
 * (écart 50) and comes back through here at the next round.
 */
function enterSpark(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  if (state.spark.state !== 'pending' || state.round < SPARK_ENTRY_ROUND) return state;

  const rng = new Rng(state.rngSeed);
  // Round 6 is the entry, the middle third (écart 36); any later round is a
  // return after a catch, nine cells from each Trajector (écart 60, 2H.13).
  // No heading is rolled any more: each drift rolls its own (écart 59).
  const at =
    state.round > SPARK_ENTRY_ROUND ? sparkReturnCell(arena, state, rng) : sparkEntryCell(arena, state, rng);
  const heading = null;
  log.push({ kind: 'sparkEntered', at, round: state.round });

  return {
    ...state,
    spark: { state: 'live', x: at.x, y: at.y, heading },
    rngSeed: rng.seed,
  };
}

// -- The ball ---------------------------------------------------------------

function applyGrabPayload(ctx: TurnCtx): ReduceResult {
  const { state, unit } = ctx;
  const turn = state.turn!;
  if (turn.objectInteractionUsed) {
    return { ok: false, reason: `${unit.name} has already handled something this turn` };
  }
  if (state.payload.carriedBy !== null) return { ok: false, reason: 'the Payload is already held' };
  if (state.payload.x !== unit.x || state.payload.y !== unit.y) {
    return { ok: false, reason: 'the Payload is not in this cell' };
  }

  ctx.log.push({ kind: 'payloadGrabbed', unitId: unit.id });
  return done(ctx, {
    ...replaceUnit(state, { ...unit, holdingPayload: true }),
    payload: { carriedBy: unit.id, x: unit.x, y: unit.y },
    turn: { ...turn, objectInteractionUsed: true },
  });
}

function applyPass(ctx: TurnCtx, targetId: UnitId): ReduceResult {
  const { state, unit, arena } = ctx;
  const turn = state.turn!;
  // The free pass after a Shove that took the ball (écart 63) throws without
  // the Action; it is spent by the throw, whatever becomes of the ball.
  if (turn.actionUsed && !turn.freePass) return { ok: false, reason: `${unit.name} has already acted` };
  if (!unit.holdingPayload) return { ok: false, reason: `${unit.name} is not holding the Payload` };

  const mate = state.units.find((u) => u.id === targetId);
  if (!mate || mate.status !== 'active') return { ok: false, reason: 'no such team-mate on the field' };
  if (mate.team !== unit.team) return { ok: false, reason: 'the Payload is passed to a team-mate' };

  const range = throwRange(unit, mate);
  if (!range.ok) return { ok: false, reason: range.reason };
  if (!hasLineOfSight(arena, unit, mate)) {
    return { ok: false, reason: `${mate.name} is out of sight behind an obstacle` };
  }

  const thrower: Unit = { ...unit, holdingPayload: false };
  let next: MatchState = { ...replaceUnit(state, thrower), turn: { ...turn, actionUsed: true, freePass: false } };

  // Écart 53 bis (2H.9, Jérôme's retour 3 on the engine 5 game): the box in
  // front of this keeper's own mouth opens the instant its throw leaves its
  // hands, caught, dropped or stolen, whatever the round. The box only ever
  // existed to protect the relaunch. A keeper that does not throw leaves it
  // to lapse on its own (écart 53); a field player's throw opens nothing.
  if (unit.role === 'bulwark' && next.penaltyBox[unit.team] !== null) {
    next = { ...next, penaltyBox: { ...next.penaltyBox, [unit.team]: null } };
  }

  // The ball is in the air before anyone catches it, so the lane is contested
  // first. A stolen pass never reaches its team-mate and is never rolled for.
  const stolen = resolveInterception(ctx, next, unit, mate.id, lineTo(unit, mate));
  next = stolen.state;
  if (stolen.thiefId) {
    const thief = next.units.find((u) => u.id === stolen.thiefId)!;
    return done(ctx, {
      ...replaceUnit(next, { ...thief, holdingPayload: true }),
      payload: { carriedBy: thief.id, x: thief.x, y: thief.y },
    });
  }

  const aim = statsFor(unit.role, unit.tier).aim;
  const outcome = rollAgainst(ctx.rng, aim, PAYLOAD_PASS_AC, range.mode);
  ctx.log.push({
    kind: 'passed',
    fromId: unit.id,
    toId: targetId,
    roll: outcome.roll,
    caught: outcome.hit,
  });

  if (outcome.hit) {
    next = {
      ...replaceUnit(next, { ...mate, holdingPayload: true }),
      payload: { carriedBy: mate.id, x: mate.x, y: mate.y },
    };
  } else {
    const landed = scatter(arena, { x: mate.x, y: mate.y }, ctx.rng);
    ctx.log.push({
      kind: 'payloadScattered',
      to: landed.landing,
      cells: landed.cells,
      direction: landed.direction,
    });
    next = { ...next, payload: { carriedBy: null, x: landed.landing.x, y: landed.landing.y } };
  }

  return done(ctx, next);
}

/**
 * The lane. Every opponent the ball passes within reach of gets one grab at it,
 * in flight order, and the first to win the contest takes it.
 *
 * The Reaction is spent on the attempt, not on the success, so a defended lane
 * strips the reactions of everyone lining it. That is the price of throwing
 * the middle third, and it is what makes clearing a lane worth a turn.
 *
 * A shot at a Furnace is not a pass and cannot be picked off: it is answered by
 * the goalkeeper's own Reaction instead.
 */
function resolveInterception(
  ctx: Ctx,
  state: MatchState,
  thrower: Unit,
  receiverId: UnitId,
  flight: readonly Point[],
): { readonly state: MatchState; readonly thiefId: UnitId | null } {
  let next = state;

  for (const candidate of passInterceptors(ctx.arena, next, thrower, flight)) {
    const thief = next.units.find((u) => u.id === candidate.id)!;
    if (thief.status !== 'active' || !thief.reactionAvailable) continue;

    next = replaceUnit(next, { ...thief, reactionAvailable: false });

    const contest = opposedRoll(
      ctx.rng,
      statsFor(thief.role, thief.tier).agility,
      statsFor(thrower.role, thrower.tier).agility,
    );
    ctx.log.push({
      kind: 'passIntercepted',
      interceptorId: thief.id,
      throwerId: thrower.id,
      toId: receiverId,
      interceptorRoll: contest.challengerRoll,
      throwerRoll: contest.defenderRoll,
      success: contest.success,
    });

    if (contest.success) return { state: next, thiefId: thief.id };
  }

  return { state: next, thiefId: null };
}

function applyShoot(ctx: TurnCtx): ReduceResult {
  const { state, unit, arena } = ctx;
  const turn = state.turn!;
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };
  if (!unit.holdingPayload) return { ok: false, reason: `${unit.name} is not holding the Payload` };

  const furnace = arena.targetFurnaceOf(unit.team);
  const visible = visibleRangeToFurnace(arena, unit, furnace);
  if (visible === null) return { ok: false, reason: 'the Furnace is out of sight behind an obstacle' };
  const range = throwRangeOver(visible);
  if (!range.ok) return { ok: false, reason: range.reason };

  // Arbitrage 2: the goalkeeper's Reaction, not a permanently higher target.
  const keeper = blockingBulwark(state, furnace, furnace.defendedBy);

  const aim = statsFor(unit.role, unit.tier).aim;
  const outcome = rollAgainst(ctx.rng, aim, shotTarget(keeper), range.mode);
  ctx.log.push({
    kind: 'shotAtFurnace',
    unitId: unit.id,
    roll: outcome.roll,
    scored: outcome.hit,
    blockedBy: keeper?.id ?? null,
  });

  let next: MatchState = {
    ...replaceUnit(state, { ...unit, holdingPayload: false }),
    turn: { ...turn, actionUsed: true, shot: true },
  };

  if (keeper) {
    next = replaceUnit(next, { ...keeper, reactionAvailable: false });
  }

  if (!outcome.hit) {
    // A saved or wide shot rebounds off the hatch and stays in play. Since
    // écart 64 (2H.25, Jérôme on 2026-10-16) it really does come off the
    // hatch: a d4 of cells in a d8 direction from the hatch cell the shot was
    // aimed at, never onto a player, the shooter included. Until engine 9 it
    // scattered from the shooter's own cell and could stay under its feet.
    // The old scatter is kept only for a hatch with no free cell around it.
    const landed =
      reboundCell(arena, next, nearestHatch(furnace, { x: unit.x, y: unit.y }), ctx.rng) ??
      scatter(arena, { x: unit.x, y: unit.y }, ctx.rng);
    ctx.log.push({
      kind: 'payloadScattered',
      to: landed.landing,
      cells: landed.cells,
      direction: landed.direction,
    });
    return done(ctx, { ...next, payload: { carriedBy: null, x: landed.landing.x, y: landed.landing.y } });
  }

  return done(ctx, score(ctx, next, unit.team));
}

/**
 * A goal. The ball is incinerated and a fresh one is handed straight to the
 * goalkeeper who just conceded, so play never stops. With that keeper off the
 * field it drops on the cell in front of the Furnace instead, free to anyone.
 */
function score(ctx: Ctx, state: MatchState, team: MatchState['units'][number]['team']): MatchState {
  const scored = state.score[team] + GOAL_POINTS;
  ctx.log.push({ kind: 'scored', team, points: GOAL_POINTS, source: 'payload' });

  const defender = opposingTeam(team);
  const keeper = activeUnits(state).find((u) => u.team === defender && u.role === 'bulwark');
  const spot = ctx.arena.spec.starts[defender][0]!;

  const withBall: MatchState = keeper
    ? {
        ...replaceUnit(state, { ...keeper, holdingPayload: true }),
        payload: { carriedBy: keeper.id, x: keeper.x, y: keeper.y },
      }
    : { ...state, payload: { carriedBy: null, x: spot.x, y: spot.y } };

  // Where the fresh ball went. Logged because nothing else says it, and a log
  // a match cannot be rebuilt from is not the truth this project claims it is.
  ctx.log.push({
    kind: 'payloadReset',
    at: keeper ? { x: keeper.x, y: keeper.y } : { x: spot.x, y: spot.y },
    carriedBy: keeper?.id ?? null,
  });

  const next: MatchState = { ...withBall, score: { ...state.score, [team]: scored } };

  // In sudden death the first goal ends it, which is the whole point of it.
  if (next.phase === 'suddenDeath') return finish(next, ctx.log);

  // The box closes and the keeper's relaunch is scheduled (écarts 53 and 54).
  return scheduleRelaunch(ctx.arena, closeBox(ctx, next, defender), defender);
}

/**
 * The penalty box (écart 53): the mouth that just conceded closes its box to
 * the scoring side through the next round, and anybody of that side already
 * inside is put out on the nearest free cell beyond the edge, the dice
 * splitting ties as for a substitute. A relocated player loses nothing but
 * its footing: a braced one is no longer braced, which only a keeper could be.
 */
function closeBox(ctx: Ctx, state: MatchState, defender: TeamId): MatchState {
  let next: MatchState = {
    ...state,
    penaltyBox: { ...state.penaltyBox, [defender]: state.round + PENALTY_BOX_ROUNDS },
  };
  const intruders = opposingTeam(defender);
  const barred = barredCells(ctx.arena, next, intruders);

  for (const unit of activeUnitsOf(next, intruders)) {
    if (!barred.has(cellKey(unit))) continue;
    const taken = takenOn(next);
    for (const k of barred) taken.add(k);
    const to = nearestFreeCell(ctx.arena, taken, unit, ctx.rng);
    ctx.log.push({ kind: 'relocated', unitId: unit.id, from: { x: unit.x, y: unit.y }, to });
    next = replaceUnit(next, { ...unit, x: to.x, y: to.y, braced: false });
  }
  return next;
}

/**
 * The keeper's relaunch (écart 54): the conceding side's Bulwark opens its
 * side's next block. If that block is still ahead this round, the ladder is
 * reordered now; if the side has already played, the next round's ladder is
 * built with the keeper first (`relaunch`). No keeper on the field, nothing.
 */
function scheduleRelaunch(arena: Arena, state: MatchState, defender: TeamId): MatchState {
  // Écart 66: a whole team relaunches by its picks, in the order its humans
  // choose (`00` C41 point 3); the keeper is not moved up for it.
  if (playsWhole(state, defender)) return state;
  const keeper = activeUnitsOf(state, defender).find((u) => u.role === 'bulwark');
  if (!keeper) return state;
  const promoted = promoteBulwark(state.turnOrder, state.turnIndex, defender, keeper.id, state.units);
  if (promoted) return { ...state, turnOrder: promoted };
  return { ...state, relaunch: defender };
}

// -- Damage and the bench ---------------------------------------------------

function applyDamage(
  ctx: Ctx,
  state: MatchState,
  unitId: UnitId,
  amount: number,
  source: 'bat' | 'cracker',
): MatchState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || unit.status !== 'active') return state;

  const hp = Math.max(0, unit.hp - amount);
  ctx.log.push({ kind: 'damaged', unitId, amount, hpAfter: hp, source });

  const hurt: Unit = { ...unit, hp };
  if (hp > 0) return replaceUnit(state, hurt);

  // Down. The medics drag the player off where it lies (écart 37); its cell
  // frees up and its Payload, if any, stays on the field.
  const dropped = dropPayload(ctx, replaceUnit(state, hurt), unitId);
  const downed = dropped.units.find((u) => u.id === unitId)!;

  ctx.log.push({ kind: 'evacuated', unitId, round: state.round });
  return replaceUnit(dropped, {
    ...downed,
    status: 'evacuated',
    evacuatedOnRound: state.round,
    dodging: false,
  });
}

/**
 * The ball leaves its carrier's hands, on a Shove or an evacuation, and rolls
 * to a cell beside it (écart 42). Two events, both already in the vocabulary:
 * `payloadDropped` says whose hands and where, `payloadScattered` says where
 * the one-cell roll took it, with the face it was rolled on. Only when every
 * neighbouring cell is taken does the ball stay put and the second event is
 * not written.
 */
function dropPayload(ctx: Ctx, state: MatchState, unitId: UnitId): MatchState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || !unit.holdingPayload) return state;

  const lost = { x: unit.x, y: unit.y };
  ctx.log.push({ kind: 'payloadDropped', unitId, at: lost });
  const stripped: MatchState = {
    ...replaceUnit(state, { ...unit, holdingPayload: false }),
    payload: { carriedBy: null, x: lost.x, y: lost.y },
  };

  const fell = dropCell(ctx.arena, stripped, lost, ctx.rng);
  if (fell.landing.x === lost.x && fell.landing.y === lost.y) return stripped;

  ctx.log.push({ kind: 'payloadScattered', to: fell.landing, cells: 1, direction: fell.direction });
  return { ...stripped, payload: { carriedBy: null, x: fell.landing.x, y: fell.landing.y } };
}

/**
 * Substitutes. Two rounds after going down, a player is replaced from the bench
 * at the same role and Tier, entering on **the free cell nearest the centre of
 * the pitch** (écart 37 bis, 2H.6), the centre itself when it is free, never
 * the loose ball, a player or a live Cracker, ties split by the dice. It used
 * to come back beside its own Furnace mouth (écart 37), which Jérôme's second
 * game found too punishing: twenty cells from where the ball was. The
 * `substituteEntry` of the arena spec and the `substitute_entry` column stay
 * in place and are no longer read.
 *
 * The unit keeps its id and its name rather than becoming a new Giff. That is a
 * simplification of the fiche and a deliberate one: mechanically it is the same
 * player back on full hit points, and a human who typed their own name would
 * not want it swapped out from under them mid-match.
 */
function returnSubstitutes(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  const rng = new Rng(state.rngSeed);
  let next = state;
  let changed = false;

  for (const unit of state.units) {
    if (unit.status !== 'evacuated' || unit.evacuatedOnRound === null) continue;
    if (state.round - unit.evacuatedOnRound < SUBSTITUTE_DELAY_ROUNDS) continue;
    if (next.bench[unit.team] <= 0) continue;

    const entry = nearestFreeCell(arena, takenOn(next), arena.spec.ordnanceStart, rng);
    changed = true;
    log.push({ kind: 'substituteEntered', unitId: unit.id, round: state.round, at: entry });
    next = {
      ...replaceUnit(next, {
        ...unit,
        x: entry.x,
        y: entry.y,
        hp: unit.maxHp,
        status: 'active',
        evacuatedOnRound: null,
        reactionAvailable: true,
      }),
      bench: { ...next.bench, [unit.team]: next.bench[unit.team] - 1 },
    };
  }

  return changed ? { ...next, rngSeed: rng.seed } : state;
}

// -- End of turn and the ladder ---------------------------------------------

function applyEndTurn(arena: Arena, state: MatchState, unit: Unit): ReduceResult {
  const events: MatchEvent[] = [{ kind: 'turnEnded', unitId: unit.id }];
  // Read the unit off the state rather than trusting the argument: the turn
  // may have moved it. The Spark leaves before the ladder moves on (écart 49).
  const standing = state.units.find((u) => u.id === unit.id) ?? unit;
  const cleared = sparkEscape(arena, state, standing, events);
  return advance(arena, { ...cleared, turn: null }, events);
}

/**
 * Walks the queue until a unit is ready to act, resolving anything automatic on
 * the way and rolling the round over when the ladder runs out.
 */
function advance(arena: Arena, state: MatchState, events: MatchEvent[]): ReduceResult {
  let current = { ...state, turnIndex: state.turnIndex + 1 };
  const log = [...events];

  // Bounded rather than `while (true)`: a bug in the round rollover should fail
  // loudly here instead of hanging the server.
  for (let guard = 0; guard < 400; guard++) {
    if (current.turnIndex >= current.turnOrder.length) {
      const rolled = startRound(arena, current, log);
      if (rolled.finished) return { ok: true, state: rolled.state, events: log };
      current = rolled.state;
      continue;
    }

    const slot = current.turnOrder[current.turnIndex]!;

    // The two hazards resolve on their own rungs, with nobody taking a turn.
    if (slot.actor.kind === 'crackers') {
      current = { ...resolveCrackers(arena, current, log), turnIndex: current.turnIndex + 1 };
      continue;
    }

    if (slot.actor.kind === 'spark') {
      current = { ...resolveSpark(arena, current, log), turnIndex: current.turnIndex + 1 };
      continue;
    }

    // Écart 66: a pick is a question to a human. With somebody still to be
    // picked, the ladder stops here with no turn open and the server waits,
    // or answers for the house; with nobody left (evacuations since the
    // ladder was built), the pick is skipped.
    if (slot.actor.kind === 'pick') {
      if (pickableUnits(current, slot.actor.team).length === 0) {
        current = { ...current, turnIndex: current.turnIndex + 1 };
        continue;
      }
      return { ok: true, state: current, events: log };
    }

    const unit = current.units.find((u) => u.id === (slot.actor as { unitId: UnitId }).unitId);
    if (!unit || unit.status !== 'active') {
      current = { ...current, turnIndex: current.turnIndex + 1 };
      continue;
    }

    // Écart 58: the first turn of a human's Striker or Breaker block asks it
    // its place first.
    const asked = placementAt(current, current.turnIndex);
    if (asked) return { ok: true, state: offerPlace(current, asked.unitId, asked.places, log), events: log };

    return { ok: true, state: beginTurn(current, unit, log), events: log };
  }

  return { ok: false, reason: 'the initiative ladder did not settle' };
}

/**
 * The human is asked its place in its role (écart 58, 2H.12). Its slot moves
 * to the cursor so the slot on the clock is the turn's unit, and a turn opens
 * that has not begun: nothing lapses, no `turnStarted`, `placing` set.
 */
function offerPlace(state: MatchState, unitId: UnitId, places: number, log: MatchEvent[]): MatchState {
  const human = state.units.find((u) => u.id === unitId)!;
  log.push({ kind: 'placeOffered', unitId, round: state.round, places });
  return {
    ...state,
    turnOrder: placeHuman(state, state.turnIndex, unitId, 1, false),
    turn: {
      unitId,
      startedAt: { x: human.x, y: human.y },
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      disengaged: false,
      placing: places,
      shot: false,
      freePass: false,
      pickedBy: null,
      delegated: false,
    },
  };
}

/**
 * The place chosen. First: the human's turn begins at once. Later: its slot
 * goes behind one or two AI of its role, still on the field, and the ladder
 * moves on from the cursor, which now holds the first of them; the human's
 * turn opens when the ladder reaches it, without asking again.
 */
function applyChoosePlace(arena: Arena, state: MatchState, unit: Unit, place: number): ReduceResult {
  const places = state.turn!.placing!;
  if (!Number.isInteger(place) || place < 1 || place > places) {
    return { ok: false, reason: `place ${place} is not on offer: 1 to ${places}` };
  }
  const log: MatchEvent[] = [{ kind: 'placeChosen', unitId: unit.id, place }];
  // Écart 65 (2H.33): the other humans of the role, if any, go right behind.
  const placed: MatchState = {
    ...state,
    turnOrder: placeHumans(state, state.turnIndex, unit.id, place),
    turn: null,
  };
  if (place === 1) return { ok: true, state: beginTurn(placed, unit, log), events: log };
  return advance(arena, { ...placed, turnIndex: placed.turnIndex - 1 }, log);
}

/**
 * Start of turn. The Dodge stance lapses, the Reaction comes back, and the
 * unit gets its movement. Nothing else happens here since D11: the fall a unit
 * owed for ending its last turn without a grip went with the grip.
 */
function beginTurn(state: MatchState, unit: Unit, log: MatchEvent[]): MatchState {
  log.push({ kind: 'turnStarted', unitId: unit.id, round: state.round });

  const acting: Unit = { ...unit, dodging: false, braced: false, reactionAvailable: true };
  return {
    ...replaceUnit(state, acting),
    turn: {
      unitId: acting.id,
      startedAt: { x: acting.x, y: acting.y },
      movementFeetRemaining: MOVE_SPEED_FEET,
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
}

/**
 * Rolls into the next round, or ends the match. Ten rounds, then two of sudden
 * death if the scores are level, then a draw.
 */
function startRound(
  arena: Arena,
  state: MatchState,
  log: MatchEvent[],
): { state: MatchState; finished: boolean } {
  const finishedRound = state.round;

  if (finishedRound >= MATCH_ROUNDS && state.phase === 'playing') {
    if (state.score.A !== state.score.B) return { state: finish(state, log), finished: true };
    log.push({ kind: 'roundStarted', round: finishedRound + 1 });
    return {
      state: rebuild(arena, { ...state, phase: 'suddenDeath', round: finishedRound + 1 }, log),
      finished: false,
    };
  }

  if (state.phase === 'suddenDeath' && finishedRound >= MATCH_ROUNDS + SUDDEN_DEATH_ROUNDS) {
    return { state: finish(state, log), finished: true };
  }

  log.push({ kind: 'roundStarted', round: finishedRound + 1 });
  return { state: rebuild(arena, { ...state, round: finishedRound + 1 }, log), finished: false };
}

function finish(state: MatchState, log: MatchEvent[]): MatchState {
  const result: MatchResult =
    state.score.A === state.score.B
      ? { winner: 'draw' }
      : { winner: state.score.A > state.score.B ? 'A' : 'B' };

  log.push({ kind: 'matchEnded', result });
  return { ...state, phase: 'finished', result, turn: null };
}

/**
 * The top of a round: the bench empties, a spent Cracker is replaced, and on
 * round 6 the Spark arrives. All three happen before the ladder is built,
 * because the ladder only carries a rung for a hazard that is on the field.
 */
function rebuild(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  const returned = returnSubstitutes(arena, state, log);
  const restocked = enterSpark(arena, respawnCrackers(arena, returned, log), log);
  const refreshed: MatchState = {
    ...restocked,
    units: restocked.units.map((u) => ({ ...u, reactionAvailable: true })),
    turnIndex: 0,
    turn: null,
    // A box whose ban has lapsed opens again (écart 53).
    penaltyBox: {
      A: lapsed(restocked, 'A') ? null : restocked.penaltyBox.A,
      B: lapsed(restocked, 'B') ? null : restocked.penaltyBox.B,
    },
    // A round handed to the AI is over with the round (écart 66).
    delegatedRound: { A: false, B: false },
  };
  // The mode asked mid-round takes effect here, before the ladder reads it
  // (écart 66, `00` C41 point 7: "from next round").
  const moded = applyRequestedModes(refreshed, log);
  // The relaunch is spent by the ladder it reorders (écart 54).
  return { ...moded, turnOrder: buildTurnOrder(arena, moded), relaunch: null };
}

function applyRequestedModes(state: MatchState, log: MatchEvent[]): MatchState {
  let next = state;
  for (const team of ['A', 'B'] as const) {
    const asked = state.requestedMode?.[team] ?? null;
    if (asked === null) continue;
    if (asked !== modeOf(next, team)) {
      log.push({ kind: 'teamModeChanged', team, mode: asked, round: state.round });
      next = { ...next, teamMode: { ...next.teamMode, [team]: asked } };
    }
    next = { ...next, requestedMode: { ...next.requestedMode, [team]: null } };
  }
  return next;
}

function lapsed(state: MatchState, defender: TeamId): boolean {
  const until = state.penaltyBox[defender];
  return until !== null && state.round > until;
}

// -- Kick-off ---------------------------------------------------------------

/**
 * Opens the first turn of a freshly built match. Shares `beginTurn` with the
 * rest of the ladder so kick-off cannot drift from every later turn.
 */
export function openMatch(
  arena: Arena,
  state: MatchState,
): { state: MatchState; events: MatchEvent[] } {
  const events: MatchEvent[] = [{ kind: 'roundStarted', round: state.round }];
  const opened = advance(arena, { ...state, turnIndex: -1 }, events);
  if (!opened.ok) throw new Error(opened.reason);
  return { state: opened.state, events: [...opened.events] };
}

// -- Helpers ----------------------------------------------------------------

/** A living opponent within reach, or the reason there is not one. */
function liveTarget(
  state: MatchState,
  unit: Unit,
  targetId: UnitId,
  reach: number,
): { unit: Unit & { ac: number } } | { reason: string } {
  const target = state.units.find((u) => u.id === targetId);
  if (!target || target.status !== 'active') return { reason: 'no such player on the field' };
  if (target.id === unit.id) return { reason: 'a player cannot target itself' };
  if (target.team === unit.team) return { reason: 'the blood-truce holds between team-mates' };
  if (distance(unit, target) > reach) return { reason: `${target.name} is out of reach` };

  return { unit: { ...target, ac: statsFor(target.role, target.tier).ac } };
}

function replaceUnit(state: MatchState, unit: Unit): MatchState {
  return { ...state, units: state.units.map((u) => (u.id === unit.id ? unit : u)) };
}

function replaceCracker(state: MatchState, cracker: Cracker): MatchState {
  return { ...state, crackers: state.crackers.map((c) => (c.id === cracker.id ? cracker : c)) };
}

/** The slot the ladder is sitting on, or null when the round is spent. */
export function currentSlot(state: MatchState): TurnSlot | null {
  return state.turnOrder[state.turnIndex] ?? null;
}

/** How many units are still standing, which is what a balance sweep reads. */
export function standing(state: MatchState): number {
  return activeUnits(state).length;
}
