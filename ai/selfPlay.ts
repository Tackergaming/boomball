/**
 * Playing a whole match without a screen.
 *
 * Two jobs. It is the phase 1 exit criterion, a full ten rounds resolved head
 * to head with a deterministic result for a given seed. And it is the harness
 * for the balance sweeps: a thousand matches per Tier, reading the spread of
 * scores, how often the Spark decides it, and how many shirts end up on the
 * bench.
 *
 * It drives the engine through the same door a client uses. Nothing here knows
 * a rule.
 */

import { Arena, type ArenaSpec } from '../engine/arena.js';
import { THIRD_COUNT } from '../engine/constants.js';
import type { MatchEvent } from '../engine/events.js';
import { distance, thirdOf, type Point } from '../engine/geometry.js';
import { openMatch, reduce } from '../engine/reduce.js';
import { createMatch, type MatchSetup } from '../engine/setup.js';
import type { Tier } from '../engine/stats.js';
import { activeUnits, type MatchState, type TeamId } from '../engine/types.js';
import { chooseAction } from './chooseAction.js';
import type { AllyOrder } from './orders.js';

/** A turn is a walk, a swing and another walk. This is well past that. */
const ACTIONS_PER_TURN_LIMIT = 60;

export interface PlayResult {
  readonly state: MatchState;
  readonly events: readonly MatchEvent[];
  /** Every action sent, which is what a stuck AI shows up in. */
  readonly actions: number;
  /** Where the ball was at the top of each turn. See `SweepReport`. */
  readonly ballTrack: BallTrack;
}

/** Turns counted by where the Payload was, sampled once per turn. */
export interface BallTrack {
  /** One entry per third of the pitch, Furnace A's end first. */
  readonly byThird: readonly number[];
  /** Of those turns, the ones where a goalkeeper was holding it. */
  readonly heldByKeeper: number;
  readonly turns: number;
  /** Of those turns, the ones where somebody carried it. A loose ball is not counted. */
  readonly carrierTurns: number;
  /** Sum over the carried turns of the carrier's mean distance to its team-mates. */
  readonly mateSpreadSum: number;
  /** Sum over the carried turns of the team-mates within 2 cells of the carrier. */
  readonly huddleSum: number;
}

/** Within this many cells of the carrier, a team-mate counts as huddled on it. */
const HUDDLE_RADIUS = 2;

/**
 * How spread out the carrier's team-mates are on this turn, or null when the
 * ball is loose or the carrier has nobody left standing beside it.
 *
 * Spread is the mean Chebyshev distance from the carrier to its active
 * team-mates; huddle is how many of them sit within `HUDDLE_RADIUS`. Only the
 * carrier's side is read, the opponents say nothing about getting open.
 */
export function mateSpread(state: MatchState): { spread: number; huddle: number } | null {
  const carrierId = state.payload.carriedBy;
  if (!carrierId) return null;

  const carrier = state.units.find((u) => u.id === carrierId);
  if (!carrier) return null;

  const mates = activeUnits(state).filter((u) => u.team === carrier.team && u.id !== carrier.id);
  if (mates.length === 0) return null;

  let total = 0;
  let huddle = 0;
  for (const mate of mates) {
    const d = distance(carrier, mate);
    total += d;
    if (d <= HUDDLE_RADIUS) huddle++;
  }
  return { spread: total / mates.length, huddle };
}

/**
 * Where the Payload is, as a cell.
 *
 * Carried, it rides on its carrier: the engine stamps `payload.x/y` when the
 * ball changes hands and lets them age while somebody holds it, so those
 * coordinates are only the truth for a loose ball.
 */
function ballAt(state: MatchState): { cell: Point; keeper: boolean } {
  const carrier = state.payload.carriedBy
    ? state.units.find((u) => u.id === state.payload.carriedBy)
    : undefined;

  return carrier
    ? { cell: { x: carrier.x, y: carrier.y }, keeper: carrier.role === 'bulwark' }
    : { cell: { x: state.payload.x, y: state.payload.y }, keeper: false };
}

/**
 * Runs a match to its end. The orders list is the same one a solo player would
 * be posting, so a sweep can measure what the channel is actually worth.
 */
export function playMatch(
  arena: Arena,
  start: MatchState,
  orders: readonly AllyOrder[] = [],
): PlayResult {
  const opened = openMatch(arena, start);
  const events: MatchEvent[] = [...opened.events];

  let state = opened.state;
  let actions = 0;
  const limit = ACTIONS_PER_TURN_LIMIT * 14 * 14;

  const byThird = new Array<number>(THIRD_COUNT).fill(0);
  let heldByKeeper = 0;
  let turns = 0;
  let carrierTurns = 0;
  let mateSpreadSum = 0;
  let huddleSum = 0;
  let sampled: string | null = null;

  while (state.phase !== 'finished' && state.turn && actions < limit) {
    const unitId = state.turn.unitId;

    // Once per turn, not once per action: a turn is a walk, a swing and another
    // walk, and counting actions would weight a busy turn three times over.
    if (sampled !== unitId) {
      sampled = unitId;
      const ball = ballAt(state);
      byThird[thirdOf(ball.cell)]!++;
      if (ball.keeper) heldByKeeper++;
      turns++;

      const mates = mateSpread(state);
      if (mates) {
        carrierTurns++;
        mateSpreadSum += mates.spread;
        huddleSum += mates.huddle;
      }
    }

    const result = reduce(arena, state, {
      unitId,
      action: chooseAction(arena, state, unitId, orders),
    });

    // The AI only ever sends what `legalActions` offered, so a refusal is a
    // disagreement between the generator and the door and must not be swallowed.
    if (!result.ok) throw new Error(`the AI sent an illegal action: ${result.reason}`);

    events.push(...result.events);
    state = result.state;
    actions++;
  }

  if (state.phase !== 'finished') throw new Error(`the match did not end in ${limit} actions`);
  return { state, events, actions, ballTrack: { byThird, heldByKeeper, turns, carrierTurns, mateSpreadSum, huddleSum },
  };
}

export function playSeed(spec: ArenaSpec, tier: Tier, seed: number): PlayResult {
  const setup: MatchSetup = { arena: spec, tier, humans: [], seed };
  return playMatch(new Arena(spec), createMatch(setup));
}

// -- Balance ----------------------------------------------------------------

export interface SweepReport {
  readonly tier: Tier;
  readonly matches: number;
  readonly wins: Readonly<Record<TeamId, number>>;
  readonly draws: number;
  /** Goals only, so the Spark's points do not drown the Payload game. */
  readonly meanGoals: number;
  readonly goallessMatches: number;
  /** Matches in which somebody got a hand on it. */
  readonly sparkCaught: number;
  /**
   * Reaches for it per match, caught or missed. This is the one that reads
   * whether the Spark is an objective at all: a catch rate can only ever be a
   * third to a half of this, so a low figure here means nobody is chasing it,
   * whatever the DC says.
   */
  readonly meanSparkAttempts: number;
  /**
   * Matches whose winner changes when the Spark's points are taken back out.
   * The whole question of what it should be worth is this number.
   */
  readonly sparkDecided: number;
  /** Mean players still off the field when the whistle goes. */
  readonly meanEvacuated: number;
  readonly meanActions: number;
  /**
   * Where the ball spends the match, as a share of turns in each third of the
   * pitch, Furnace A's end first.
   *
   * This is the column that diagnosed the pitch. With both Furnaces at the same
   * end it read 0 / 10 / 90 from round 6 on: the ball went there and never came
   * back, and two thirds of the arena were scenery. On a pitch that runs end to
   * end it should be spread, and a reading that collapses onto one third again
   * means the sport has found a new place to camp.
   */
  readonly ballThirdShare: readonly number[];
  /**
   * Share of turns the ball sits in a goalkeeper's hands.
   *
   * The failure mode a long pitch invites: a keeper takes the restart, nobody
   * comes back within throwing distance, and the ball never leaves the goal.
   * `passReach` in `ai/evaluate.ts` exists for this number.
   */
  readonly keeperHeldShare: number;
  /**
   * Mean distance, in cells, from the carrier to its active team-mates, over the
   * turns where somebody carries the Payload.
   *
   * This column exists for audit line A31, team-mates massing around the
   * goalkeeper after a goal. Read it with `meanHuddle`: a low spread with a high
   * huddle means the team is hugging its carrier instead of getting open. It
   * reads the carrier's side only.
   */
  readonly meanMateSpread: number;
  /**
   * Mean number of team-mates within 2 cells of the carrier, over the same
   * turns as `meanMateSpread`. See there for how the two are read together.
   */
  readonly meanHuddle: number;
}

/**
 * Who would have won on the Payload alone.
 *
 * Compared against the real winner, this is what says whether the Spark
 * settled the match or merely padded a scoreline that was already decided.
 * It is deliberately blind to the Spark's own points rather than subtracting
 * them, so it stays right whatever the constant is set to.
 */
function winnerOnGoalsAlone(goalEvents: readonly MatchEvent[]): TeamId | 'draw' {
  const score: Record<TeamId, number> = { A: 0, B: 0 };
  for (const e of goalEvents) if (e.kind === 'scored') score[e.team] += e.points;

  if (score.A === score.B) return 'draw';
  return score.A > score.B ? 'A' : 'B';
}

/**
 * Self-play over a range of seeds. The two teams share a Tier and a brain, so
 * anything other than an even split of wins is a bias in the rules or in the
 * arena rather than in the roles, which is exactly what the sweep is for.
 */
export function sweep(spec: ArenaSpec, tier: Tier, matches: number, firstSeed = 1): SweepReport {
  const wins: Record<TeamId, number> = { A: 0, B: 0 };
  let draws = 0;
  let goals = 0;
  let goalless = 0;
  let sparkCaught = 0;
  let sparkAttempts = 0;
  let sparkDecided = 0;
  let evacuated = 0;
  let actions = 0;
  const ballThird = new Array<number>(THIRD_COUNT).fill(0);
  let keeperHeld = 0;
  let ballTurns = 0;
  let carrierTurns = 0;
  let mateSpreadSum = 0;
  let huddleSum = 0;

  for (let i = 0; i < matches; i++) {
    const played = playSeed(spec, tier, firstSeed + i);
    const { state } = played;

    const winner = state.result?.winner;
    if (winner === 'draw' || winner === undefined) draws++;
    else wins[winner]++;

    // Read off `source`, never off the price. The two used to be told apart by
    // comparing points against GOAL_POINTS, which stops working the moment the
    // Spark is priced at a goal.
    const goalEvents = played.events.filter(
      (e) => e.kind === 'scored' && e.source === 'payload',
    );
    goals += goalEvents.length;
    if (goalEvents.length === 0) goalless++;

    sparkAttempts += played.events.filter((e) => e.kind === 'sparkCaught').length;
    if (played.events.some((e) => e.kind === 'sparkCaught' && e.caught)) {
      sparkCaught++;
      if (winnerOnGoalsAlone(goalEvents) !== (winner ?? 'draw')) sparkDecided++;
    }

    evacuated += state.units.filter((u) => u.status === 'evacuated').length;
    actions += played.actions;

    for (let t = 0; t < THIRD_COUNT; t++) ballThird[t]! += played.ballTrack.byThird[t]!;
    keeperHeld += played.ballTrack.heldByKeeper;
    ballTurns += played.ballTrack.turns;
    carrierTurns += played.ballTrack.carrierTurns;
    mateSpreadSum += played.ballTrack.mateSpreadSum;
    huddleSum += played.ballTrack.huddleSum;
  }

  return {
    tier,
    matches,
    wins,
    draws,
    meanGoals: goals / matches,
    goallessMatches: goalless,
    sparkCaught,
    meanSparkAttempts: sparkAttempts / matches,
    sparkDecided,
    meanEvacuated: evacuated / matches,
    meanActions: actions / matches,
    ballThirdShare: ballThird.map((n) => (ballTurns === 0 ? 0 : n / ballTurns)),
    keeperHeldShare: ballTurns === 0 ? 0 : keeperHeld / ballTurns,
    meanMateSpread: carrierTurns === 0 ? 0 : mateSpreadSum / carrierTurns,
    meanHuddle: carrierTurns === 0 ? 0 : huddleSum / carrierTurns,
  };
}

/** The three Tiers in one pass, for the report the plan asks for. */
export function sweepAllTiers(
  spec: ArenaSpec,
  matches: number,
  tiers: readonly Tier[] = ['rookie', 'veteran', 'star'],
): SweepReport[] {
  return tiers.map((tier) => sweep(spec, tier, matches));
}
