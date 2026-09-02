/**
 * The Breaker clears the way.
 *
 * It is the only role that would rather hit somebody than hold the ball, and
 * the only one that treats the Crackers as a weapon instead of a hazard. It
 * strips carriers, it shoves people off their line, and it hangs on whoever is
 * holding rather than on the goal.
 *
 * It shoots badly and knows it, so `shoot` is low enough that it will pass to
 * anyone rather than try.
 */

import type { RoleWeights } from './weights.js';

export const BREAKER: RoleWeights = {
  shoot: 45,
  pass: 60,
  grabPayload: 70,
  carryToFurnace: 40,
  chaseLoosePayload: 45,

  attack: 60,
  shove: 65,
  stripCarrier: 80,
  batCracker: 70,

  catchSpark: 300,
  chaseSpark: 0,

  guardFurnace: 8,
  screenCarrier: 26,
  supportAttack: 20,
  pressCarrier: 55,

  keepGrip: 20,
  avoidOpportunity: 2,
  avoidCrackers: 4,
  dodgeWhenHurt: 10,
  dash: 6,
  disengage: 8,
};
