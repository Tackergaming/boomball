/**
 * The Striker scores.
 *
 * It wants the ball, it wants to be near the Furnace it attacks, and it takes
 * the shot. It hits people only when they are between it and the goal, and it
 * is the role most willing to pay an opportunity attack to get where it is
 * going, because a goal is worth ten and a d8 is not.
 */

import type { RoleWeights } from './weights.js';

export const STRIKER: RoleWeights = {
  shoot: 120,
  pass: 45,
  grabPayload: 90,
  carryToFurnace: 70,
  chaseLoosePayload: 55,

  attack: 15,
  shove: 30,
  stripCarrier: 80,
  batCracker: 18,

  catchSpark: 300,
  chaseSpark: 0,

  guardFurnace: 6,
  screenCarrier: 14,
  supportAttack: 45,
  cover: 20,
  block: 0,
  wantsEscort: 1,
  guardStrike: 0,
  parryPost: 0,
  yieldToKeener: 0,
  handOff: 0,
  rejoin: 40,
  screen: 0,
  leash: 99,
  looseBallReach: 99,
  brace: 0,

  pressCarrier: 55,

  // 2H.8, Jérôme's second pass.
  chaseKickoff: 1,
  prey: { striker: 1, breaker: 1, trajector: 1, bulwark: 1 },
  hunt: 0,
  relaunch: 0,

  avoidOpportunity: 4,
  avoidCrackers: 10,
  dodgeWhenHurt: 6,
  dash: 8,
  disengage: 16,
};
