/**
 * The exact chance an action succeeds, worked out on the client from the
 * engine's own rules (`engine/rules/combat.ts`, `engine/reduce.ts`).
 *
 * Pure: no React, no DOM, no network. Bonuses come from `statsFor`, the target
 * numbers and modes from the engine's `legalActions`, and every constant from
 * `engine/constants.ts`, so there is no second copy of any number here.
 */

import {
  BAT_DAMAGE_DIE,
  BAT_RECOIL_CELLS,
  BRACE_SHOVE_PENALTY,
  CRACKER_AC,
  GOAL_POINTS,
  SHOVE_PUSH_CELLS,
  SPARK_POINTS,
} from '../../../engine/constants.js';
import type { CatchOption, ShotOption, TargetOption } from '../../../engine/legalActions.js';
import { statsFor } from '../../../engine/stats.js';
import type { Unit } from '../../../engine/types.js';

export type Mode = 'normal' | 'advantage' | 'disadvantage';

/** Weight out of 400 of each face of a d20 taken under `mode`; index 0 is face 1. Integers, so sums are exact. */
function d20Weights(mode: Mode): number[] {
  const w = new Array<number>(20).fill(0);
  for (let a = 1; a <= 20; a++) {
    for (let b = 1; b <= 20; b++) {
      const face = mode === 'normal' ? a : mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
      w[face - 1]! += 1;
    }
  }
  return w;
}

/** P(d20(mode) + bonus >= against), exact. */
export function chanceToBeat(bonus: number, against: number, mode: Mode = 'normal'): number {
  const w = d20Weights(mode);
  let n = 0;
  for (let face = 1; face <= 20; face++) {
    if (face + bonus >= against) n += w[face - 1]!;
  }
  return n / 400;
}

/** P(challenger(mode) + cb > defender + db): ties go to the defender, who rolls a plain d20. */
export function chanceToWinContest(
  challengerBonus: number,
  defenderBonus: number,
  challengerMode: Mode = 'normal',
): number {
  const w = d20Weights(challengerMode);
  let n = 0;
  for (let c = 1; c <= 20; c++) {
    for (let d = 1; d <= 20; d++) {
      if (c + challengerBonus > d + defenderBonus) n += w[c - 1]!;
    }
  }
  return n / 8000;
}

/** A swing: the attacker's might against the target's AC, at the engine's mode. */
export function swingChance(attacker: Unit, option: TargetOption): number {
  return chanceToBeat(statsFor(attacker.role, attacker.tier).might, option.against, option.mode);
}

/** Mirrors `resolveShove`: a braced target costs the shover the penalty and rolls at disadvantage. */
export function shoveChance(shover: Unit, target: Unit): number {
  const targetStats = statsFor(target.role, target.tier);
  return chanceToWinContest(
    statsFor(shover.role, shover.tier).might - (target.braced ? BRACE_SHOVE_PENALTY : 0),
    Math.max(targetStats.might, targetStats.agility),
    target.braced ? 'disadvantage' : 'normal',
  );
}

/** Batting a Cracker: might against `CRACKER_AC`. */
export function batChance(attacker: Unit): number {
  return chanceToBeat(statsFor(attacker.role, attacker.tier).might, CRACKER_AC);
}

/** A pass: aim against the engine's number for this team-mate. Interception is not counted. */
export function passChance(thrower: Unit, option: TargetOption): number {
  return chanceToBeat(statsFor(thrower.role, thrower.tier).aim, option.against, option.mode);
}

/** A shot at the Furnace: aim against what the engine says it has to beat. */
export function shotChance(shooter: Unit, shot: ShotOption): number {
  return chanceToBeat(statsFor(shooter.role, shooter.tier).aim, shot.against, shot.mode);
}

/** Catching the Spark: agility against the engine's number. */
export function catchChance(unit: Unit, option: CatchOption): number {
  return chanceToBeat(statsFor(unit.role, unit.tier).agility, option.against, option.mode);
}

export type OddsBand = 'good' | 'fair' | 'poor';

export function oddsBand(p: number): OddsBand {
  if (p >= 0.6) return 'good';
  if (p >= 0.35) return 'fair';
  return 'poor';
}

export function percent(p: number): number {
  return Math.round(p * 100);
}

export type ActionKind = 'swing' | 'shove' | 'disarm' | 'bat' | 'pass' | 'shoot' | 'catch';

/** One short sentence saying what the action does, built from the engine's numbers. */
export function actionLine(kind: ActionKind, actor: Unit): string {
  switch (kind) {
    case 'swing': {
      const might = statsFor(actor.role, actor.tier).might;
      return `Blast-bat, 1d${BAT_DAMAGE_DIE}+${might} damage. You recoil ${BAT_RECOIL_CELLS} squares.`;
    }
    case 'shove':
      return `Push them ${SHOVE_PUSH_CELLS} square away. No damage.`;
    case 'disarm':
      return 'Shove the carrier: on a win the ball is yours, and a free pass follows this turn.';
    case 'bat':
      return 'Send the Cracker down a line. It blows on the first Giff it meets, either side.';
    case 'pass':
      return 'Throw the Payload to this team-mate. An enemy on the line may try to intercept.';
    case 'shoot':
      return `Shoot at their Furnace. A goal scores ${GOAL_POINTS}.`;
    case 'catch':
      return `Grab the Spark: ${SPARK_POINTS} points if you hold it.`;
  }
}
