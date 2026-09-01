/**
 * The Trajector moves the ball and chases the Spark.
 *
 * It has the worst melee bonus and the best agility in the game, so it plays
 * the two things agility buys: the throw, and the hundred and fifty points
 * floating around The Scramble from round six. It is the only role that will
 * cross the whole silo to be near the Spark.
 *
 * It is also the easiest role to kill, hence the largest `keepGrip` and the
 * readiest Dodge.
 */

import type { RoleWeights } from './weights.js';

export const TRAJECTOR: RoleWeights = {
  shoot: 55,
  pass: 100,
  grabPayload: 85,
  carryToFurnace: 45,
  chaseLoosePayload: 60,

  attack: 8,
  shove: 10,
  stripCarrier: 20,
  batCracker: 14,

  catchSpark: 400,
  chaseSpark: 75,

  guardFurnace: 6,
  screenCarrier: 30,
  supportAttack: 30,
  pressCarrier: 12,

  keepGrip: 34,
  avoidOpportunity: 7,
  avoidCrackers: 14,
  dodgeWhenHurt: 18,
  dash: 9,
  disengage: 22,
};
