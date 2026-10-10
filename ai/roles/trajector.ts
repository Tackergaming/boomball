/**
 * The Trajector moves the ball and chases the Spark.
 *
 * It has the worst melee bonus and the best agility in the game, so it plays
 * the two things agility buys: the throw, and the Spark drifting through the
 * middle third from round six. It is the only role that will cross the whole
 * pitch to be near the Spark, and since lot 3 slowed the thing down to six cells a
 * round, that trip actually arrives.
 *
 * It is also the easiest role to kill, hence the readiest Dodge.
 */

import type { RoleWeights } from './weights.js';

export const TRAJECTOR: RoleWeights = {
  shoot: 55,
  pass: 100,
  grabPayload: 85,
  carryToFurnace: 45,
  chaseLoosePayload: 60,

  attack: 8,
  shove: 25,
  stripCarrier: 70,
  batCracker: 14,

  catchSpark: 300,
  chaseSpark: 75,

  guardFurnace: 6,
  screenCarrier: 30,
  supportAttack: 30,
  cover: 25,
  escort: 0,
  wantsEscort: 1,
  guardStrike: 0,
  parryPost: 0,
  yieldToKeener: 0,
  handOff: 0,
  rejoin: 30,
  screen: 0,
  leash: 99,
  looseBallReach: 99,
  brace: 0,

  pressCarrier: 45,

  avoidOpportunity: 7,
  avoidCrackers: 14,
  dodgeWhenHurt: 8,
  dash: 9,
  disengage: 22,
};
