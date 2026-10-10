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
  CRACKER_RESPAWN_DELAY,
  CRACKER_SAVE_DC,
  GOAL_POINTS,
  MATCH_ROUNDS,
  MOVE_SPEED_FEET,
  PAYLOAD_PASS_AC,
  SPARK_CATCH_DC,
  SPARK_ENTRY_ROUND,
  SPARK_POINTS,
  SUBSTITUTE_DELAY_ROUNDS,
  SUDDEN_DEATH_ROUNDS,
} from './constants.js';
import type { MatchEvent } from './events.js';
import { directionFromD8, distance, lineTo, stepCostFeet, type Point } from './geometry.js';
import { buildTurnOrder } from './initiative.js';
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
  battedCrackerRun,
  crackerRun,
  sparkEntryCell,
  sparkRun,
  type HazardRun,
} from './rules/ordnance.js';
import {
  blockingBulwark,
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
  opposingTeam,
  sparkIsLive,
  type Cracker,
  type MatchResult,
  type MatchState,
  type TurnSlot,
  type Unit,
  type UnitId,
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

  const turn = state.turn;
  if (!turn) return { ok: false, reason: 'no turn is in progress' };
  if (turn.unitId !== command.unitId) {
    return { ok: false, reason: `it is ${turn.unitId}'s turn, not ${command.unitId}'s` };
  }

  const unit = state.units.find((u) => u.id === command.unitId);
  if (!unit) return { ok: false, reason: `no unit with id ${command.unitId}` };
  if (unit.status !== 'active') return { ok: false, reason: `${unit.name} is off the field` };

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
  }
}

/** Seals a handler's result, writing the RNG cursor back into the state. */
function done(ctx: Ctx, state: MatchState): ReduceResult {
  return { ok: true, state: { ...state, rngSeed: ctx.rng.seed }, events: ctx.log };
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
  if (landing.x === attacker.x && landing.y === attacker.y) return state;

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
  const shoved = (pushedTo: Point | null): MatchEvent => ({
    kind: 'shoved',
    shoverId: unit.id,
    targetId,
    success: contest.success,
    shoverRoll: contest.shoverRoll,
    targetRoll: contest.targetRoll,
    pushedTo,
  });

  const next: MatchState = { ...state, turn: { ...turn, actionUsed: true } };
  if (!contest.success) {
    ctx.log.push(shoved(null));
    return done(ctx, next);
  }

  // A Shove that takes the ball takes the ball and stops there (arbitrage of
  // 2026-09-01, kept by écart 32).
  //
  // Stripping the carrier and moving it in the same action did two jobs at
  // once: it won the ball back, which is good defence, and it undid the trip
  // towards the Furnace, which made scoring impossible. The sweep measured a
  // ball changing hands every round and a half and 1.2 shots a match. Only the
  // second job is removed. In fiction you are grabbing for the Payload, not
  // throwing somebody across the pitch.
  if (target.unit.holdingPayload) {
    ctx.log.push(shoved(null));
    return done(ctx, dropPayload(ctx, next, target.unit.id));
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
    next = runCracker(ctx, next, cracker.id, battedCrackerRun(ctx.arena, next, cracker, direction));
  }

  return done(ctx, recoilFrom(ctx, next, unit.id, { x: cracker.x, y: cracker.y }));
}

/**
 * Count 20. Each live Cracker rolls six cells towards whoever is nearest,
 * friend or foe alike, round whatever is in the way, and goes off on the first
 * player it crosses.
 *
 * They resolve one after the other rather than at once, so the second one sees
 * a field the first one has already changed. A Cracker that just carried
 * someone off the field is not still hunting a player who is gone.
 */
function resolveCrackers(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  const rng = new Rng(state.rngSeed);
  const ctx: Ctx = { arena, log, rng };
  let current = state;

  for (const { id } of state.crackers) {
    const cracker = current.crackers.find((c) => c.id === id)!;
    if (cracker.state !== 'live') continue;
    current = runCracker(ctx, current, id, crackerRun(arena, current, cracker, rng));
  }

  return { ...current, rngSeed: rng.seed };
}

/** Walks a Cracker along a resolved run: it either goes off on someone, or it comes to rest. */
function runCracker(ctx: Ctx, state: MatchState, crackerId: string, run: HazardRun): MatchState {
  const cracker = state.crackers.find((c) => c.id === crackerId)!;
  const from = { x: cracker.x, y: cracker.y };

  if (run.landing.x !== from.x || run.landing.y !== from.y) {
    ctx.log.push({ kind: 'crackerMoved', crackerId, from, to: run.landing, path: [...run.path] });
  }

  const moved: Cracker = { ...cracker, x: run.landing.x, y: run.landing.y };
  const next = replaceCracker(state, moved);
  if (!run.struck) return next;

  return detonate(ctx, next, moved, run.struck.id);
}

/**
 * The blast. One save, one victim, and the Cracker is scrap until a fresh one
 * drops at the centre of the pitch next round.
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

/** A spent Cracker is replaced at the centre of the pitch, and starts hunting again. */
function respawnCrackers(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  const at = arena.spec.ordnanceStart;
  let changed = false;

  const crackers = state.crackers.map((cracker) => {
    if (cracker.state === 'live') return cracker;
    if (cracker.respawnOnRound === null || cracker.respawnOnRound > state.round) return cracker;

    changed = true;
    log.push({ kind: 'crackerRespawned', crackerId: cracker.id, at, round: state.round });
    return { ...cracker, x: at.x, y: at.y, state: 'live' as const, respawnOnRound: null };
  });

  return changed ? { ...state, crackers } : state;
}

// -- The Spark --------------------------------------------------------------

/**
 * Catching the Spark. One Action, from its own cell, against DC 20, for four
 * goals' worth of points and no whistle.
 *
 * It used to end the match on the spot for a hundred and fifty. Now that it is
 * catchable on purpose rather than by accident, an instant win would have made
 * it the only thing worth playing: the points go on the board and the match
 * runs its rounds out. It is gone for good either way, so the prize is there
 * to be taken once and the field has to fight over the Payload for the rest.
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

  const agility = statsFor(unit.role, unit.tier).agility;
  const outcome = rollAgainst(ctx.rng, agility, SPARK_CATCH_DC);
  ctx.log.push({ kind: 'sparkCaught', unitId: unit.id, roll: outcome.roll, caught: outcome.hit });

  const next: MatchState = { ...state, turn: { ...turn, actionUsed: true } };
  if (!outcome.hit) return done(ctx, next);

  ctx.log.push({ kind: 'scored', team: unit.team, points: SPARK_POINTS, source: 'spark' });
  const caught: MatchState = {
    ...next,
    spark: { ...next.spark, state: 'caught', heading: null },
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
  if (!sparkIsLive(state.spark) || state.spark.heading === null) return state;

  const from = { x: state.spark.x, y: state.spark.y };
  const run = sparkRun(arena, from, state.spark.heading);

  log.push({
    kind: 'sparkMoved',
    from,
    to: run.landing,
    direction: run.direction,
    path: [...run.path],
  });

  return {
    ...state,
    spark: { ...state.spark, x: run.landing.x, y: run.landing.y, heading: run.heading },
  };
}

/**
 * The Spark drops in at the top of round 6, on a cell and a heading rolled
 * once and for all. Holding it back that long is what keeps it from deciding
 * the match before anyone has had a chance to score a goal.
 *
 * The guard is on `pending` rather than on being off the field, because a
 * caught Spark is also off the field and must not drop back in next round.
 */
function enterSpark(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  if (state.spark.state !== 'pending' || state.round < SPARK_ENTRY_ROUND) return state;

  const rng = new Rng(state.rngSeed);
  const at = sparkEntryCell(arena, state, rng);
  const heading = rng.die(8);
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
  if (turn.actionUsed) return { ok: false, reason: `${unit.name} has already acted` };
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
  let next: MatchState = { ...replaceUnit(state, thrower), turn: { ...turn, actionUsed: true } };

  // The ball is in the air before anyone catches it, so the lane is contested
  // first. A stolen pass never reaches its team-mate and is never rolled for.
  const stolen = resolveInterception(ctx, next, unit, lineTo(unit, mate));
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
    turn: { ...turn, actionUsed: true },
  };

  if (keeper) {
    next = replaceUnit(next, { ...keeper, reactionAvailable: false });
  }

  if (!outcome.hit) {
    // A saved or wide shot rebounds off the hatch and stays in play.
    const landed = scatter(arena, { x: unit.x, y: unit.y }, ctx.rng);
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
  return next;
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

function dropPayload(ctx: Ctx, state: MatchState, unitId: UnitId): MatchState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || !unit.holdingPayload) return state;

  ctx.log.push({ kind: 'payloadDropped', unitId, at: { x: unit.x, y: unit.y } });
  return {
    ...replaceUnit(state, { ...unit, holdingPayload: false }),
    payload: { carriedBy: null, x: unit.x, y: unit.y },
  };
}

/**
 * Substitutes. Two rounds after going down, a player is replaced from the bench
 * at the same role and Tier, entering beside its own Furnace.
 *
 * The unit keeps its id and its name rather than becoming a new Giff. That is a
 * simplification of the fiche and a deliberate one: mechanically it is the same
 * player back on full hit points, and a human who typed their own name would
 * not want it swapped out from under them mid-match.
 */
function returnSubstitutes(arena: Arena, state: MatchState, log: MatchEvent[]): MatchState {
  let next = state;

  for (const unit of state.units) {
    if (unit.status !== 'evacuated' || unit.evacuatedOnRound === null) continue;
    if (state.round - unit.evacuatedOnRound < SUBSTITUTE_DELAY_ROUNDS) continue;
    if (next.bench[unit.team] <= 0) continue;

    const entry = arena.spec.substituteEntry[unit.team];
    const taken = activeUnits(next).some((u) => u.x === entry.x && u.y === entry.y);
    if (taken) continue;

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

  return next;
}

// -- End of turn and the ladder ---------------------------------------------

function applyEndTurn(arena: Arena, state: MatchState, unit: Unit): ReduceResult {
  const events: MatchEvent[] = [{ kind: 'turnEnded', unitId: unit.id }];
  return advance(arena, { ...state, turn: null }, events);
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

    const unit = current.units.find((u) => u.id === (slot.actor as { unitId: UnitId }).unitId);
    if (!unit || unit.status !== 'active') {
      current = { ...current, turnIndex: current.turnIndex + 1 };
      continue;
    }

    return { ok: true, state: beginTurn(current, unit, log), events: log };
  }

  return { ok: false, reason: 'the initiative ladder did not settle' };
}

/**
 * Start of turn. The Dodge stance lapses, the Reaction comes back, and the
 * unit gets its movement. Nothing else happens here since D11: the fall a unit
 * owed for ending its last turn without a grip went with the grip.
 */
function beginTurn(state: MatchState, unit: Unit, log: MatchEvent[]): MatchState {
  log.push({ kind: 'turnStarted', unitId: unit.id, round: state.round });

  const acting: Unit = { ...unit, dodging: false, reactionAvailable: true };
  return {
    ...replaceUnit(state, acting),
    turn: {
      unitId: acting.id,
      movementFeetRemaining: MOVE_SPEED_FEET,
      actionUsed: false,
      objectInteractionUsed: false,
      disengaged: false,
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
  };
  return { ...refreshed, turnOrder: buildTurnOrder(refreshed) };
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
