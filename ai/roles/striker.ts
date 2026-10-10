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

  attack: 22,
  shove: 20,
  stripCarrier: 35,
  batCracker: 18,

  catchSpark: 300,
  chaseSpark: 0,

  guardFurnace: 6,
  screenCarrier: 14,
  supportAttack: 45,
  cover: 20,
  pressCarrier: 20,

  avoidOpportunity: 4,
  avoidCrackers: 10,
  dodgeWhenHurt: 10,
  dash: 8,
  disengage: 16,
};
