/**
 * Swinging the blast-bat, and shoving people off their line.
 *
 * Every contested roll in the sport has the same shape: a d20, a bonus from the
 * role and Tier table, and a number to beat. It lives here once so an attack, a
 * thrown Payload and a shot at a Furnace cannot drift apart.
 */

import type { Arena } from '../arena.js';
import { BAT_RECOIL_CELLS, SHOVE_PUSH_CELLS } from '../constants.js';
import type { DiceRoll } from '../events.js';
import { inBounds, type Point } from '../geometry.js';
import type { Rng } from '../rng.js';
import { statsFor } from '../stats.js';
import { activeUnits, type MatchState, type Unit } from '../types.js';

export interface AttackOutcome {
  readonly roll: DiceRoll;
  readonly hit: boolean;
}

/**
 * One d20 against a target number. `against` is carried in the result because a
 * client must never have to work out what the roll was measured against: that
 * is exactly what makes a miss feel arbitrary at the table.
 */
export function rollAgainst(
  rng: Rng,
  bonus: number,
  against: number,
  mode: 'normal' | 'advantage' | 'disadvantage' = 'normal',
): AttackOutcome {
  const rolled = rng.d20With(mode);
  const total = rolled + bonus;
  return {
    roll: { die: 20, rolled, bonus, total, against, mode },
    hit: total >= against,
  };
}

/** A defender in the Dodge stance is harder to hit. */
export function attackMode(target: Unit): 'normal' | 'disadvantage' {
  return target.dodging ? 'disadvantage' : 'normal';
}

export interface OpposedOutcome {
  readonly challengerRoll: DiceRoll;
  readonly defenderRoll: DiceRoll;
  readonly success: boolean;
}

/**
 * Two d20s and two flat bonuses, the challenger first. Ties go to the defender,
 * as a contested check does in 5e.
 *
 * Both sides carry the other's total in `against`, so a client never has to
 * work out which roll it lost to. Shared by the Shove and by a pass snatched
 * out of the air, which are the same contest with different columns.
 */
export function opposedRoll(
  rng: Rng,
  challengerBonus: number,
  defenderBonus: number,
): OpposedOutcome {
  const challengerRolled = rng.d20();
  const defenderRolled = rng.d20();
  const challengerTotal = challengerRolled + challengerBonus;
  const defenderTotal = defenderRolled + defenderBonus;

  return {
    challengerRoll: {
      die: 20,
      rolled: challengerRolled,
      bonus: challengerBonus,
      total: challengerTotal,
      against: defenderTotal,
      mode: 'normal',
    },
    defenderRoll: {
      die: 20,
      rolled: defenderRolled,
      bonus: defenderBonus,
      total: defenderTotal,
      against: challengerTotal,
      mode: 'normal',
    },
    success: challengerTotal > defenderTotal,
  };
}

/**
 * A contested check: the shover's Athletics against the best defence the target
 * can muster. A Breaker resists on strength, a Trajector on agility, and taking
 * the better of the two is what stops the Shove from simply deleting Trajectors.
 */
export function resolveShove(rng: Rng, shover: Unit, target: Unit): {
  readonly shoverRoll: DiceRoll;
  readonly targetRoll: DiceRoll;
  readonly success: boolean;
} {
  const targetStats = statsFor(target.role, target.tier);
  const outcome = opposedRoll(
    rng,
    statsFor(shover.role, shover.tier).might,
    Math.max(targetStats.might, targetStats.agility),
  );

  return {
    shoverRoll: outcome.challengerRoll,
    targetRoll: outcome.defenderRoll,
    success: outcome.success,
  };
}

/**
 * Where the blast-bat's recoil throws the attacker.
 *
 * Ten feet directly away from what it hit (écart 33). This is forced movement,
 * so it provokes nothing. It stops short rather than pushing into an obstacle,
 * off the pitch or into another player.
 */
export function recoilDestination(
  arena: Arena,
  state: MatchState,
  attacker: Unit,
  target: Point,
): Point {
  return forcedDestination(arena, state, attacker, target, BAT_RECOIL_CELLS);
}

/**
 * Where a successful Shove sends a target that was not carrying the ball.
 *
 * One cell straight away from the shover (écart 32), the 5e 2024 shove. If the
 * cell behind it is an obstacle, a unit or the edge, the target does not move
 * at all, which is the whole value of having one's back to a crate.
 */
export function pushDestination(
  arena: Arena,
  state: MatchState,
  target: Unit,
  shover: Point,
): Point {
  return forcedDestination(arena, state, target, shover, SHOVE_PUSH_CELLS);
}

/**
 * Forced movement, shared by the recoil and the push: `mover` travels up to
 * `cells` directly away from `awayFrom`, one cell at a time, and stops in front
 * of the first obstacle, edge or player it meets. It never lands on anything.
 */
function forcedDestination(
  arena: Arena,
  state: MatchState,
  mover: Unit,
  awayFrom: Point,
  cells: number,
): Point {
  const step = {
    x: Math.sign(mover.x - awayFrom.x),
    y: Math.sign(mover.y - awayFrom.y),
  };
  if (step.x === 0 && step.y === 0) return { x: mover.x, y: mover.y };

  const occupied = new Set(
    activeUnits(state)
      .filter((u) => u.id !== mover.id)
      .map((u) => `${u.x},${u.y}`),
  );

  let landing: Point = { x: mover.x, y: mover.y };
  for (let i = 0; i < cells; i++) {
    const next = { x: landing.x + step.x, y: landing.y + step.y };
    if (!inBounds(next) || arena.isSolid(next) || occupied.has(`${next.x},${next.y}`)) break;
    landing = next;
  }
  return landing;
}
