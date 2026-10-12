/**
 * The Trajector moves the ball and chases the Spark.
 *
 * It has the worst melee bonus and the best agility in the game, so it plays
 * the two things agility buys: the throw, and the Spark drifting through the
 * middle third from round six. It is the only role that will cross the whole
 * pitch to be near the Spark, and since lot 3 slowed the thing down to six cells a
 * round, that trip actually arrives. Since 2H.11 (`00` C13) it dashes towards
 * the other side's carrier when a move falls short (`approachDash`), swings at
 * a bystander only for want of anything better while its side has the ball
 * (`idleSwing`), and all but never bats a Cracker (`batCracker`).
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
  stripCarrier: 150,
  batCracker: 5,

  catchSpark: 300,
  chaseSpark: 75,

  guardFurnace: 6,
  screenCarrier: 30,
  supportAttack: 30,
  cover: 25,
  block: 10,
  spread: 0,
  carrierSafety: 60,
  wantsEscort: 1,
  guardStrike: 0,
  parryPost: 0,
  yieldToKeener: 0,
  handOff: 0,
  rejoin: 30,
  leash: 99,
  looseBallReach: 99,
  brace: 0,
  rest: 0,

  pressCarrier: 45,

  // 2H.8, Jérôme's second pass.
  chaseKickoff: 0,
  preyByHp: 0,
  hunt: 0,
  relaunch: 0,

  // 2H.10, Jérôme's fourth pass; 2H.11, his fifth.
  approachDash: 1,
  shoveBystander: 0,
  receiver: 1,
  idleSwing: 0.2,
  chainException: 0,
  // 2H.12, Jérôme's sixth pass.
  pickupFirst: 0,

  avoidOpportunity: 50,
  avoidCrackers: 14,
  dodgeWhenHurt: 8,
  disengage: 22,
};
