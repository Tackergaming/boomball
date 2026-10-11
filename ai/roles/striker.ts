/**
 * The Striker scores.
 *
 * It wants the ball, it wants to be near the Furnace it attacks, and it takes
 * the shot. It hits people only when they are between it and the goal. Since
 * 2H.10 (Jérôme, 2026-10-11) it carries the ball without losing it: it ends
 * its turn where the fewest opponents can come and shove it
 * (`carrierSafety`), holds a clean shot for next turn rather than throw at
 * disadvantage, presses the other side's carrier only by a route that crosses
 * nobody's reach (`pressDash`), never shoves a bystander (`shoveBystander`),
 * and stays off its team-mates (`spread`), taking a place beside its own
 * carrier only when its relay does not suffer for it (`block`).
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
  block: 15,
  spread: 10,
  carrierSafety: 60,
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
  rest: 0,

  pressCarrier: 55,

  // 2H.8, Jérôme's second pass.
  chaseKickoff: 1,
  prey: { striker: 1, breaker: 1, trajector: 1, bulwark: 1 },
  hunt: 0,
  relaunch: 0,

  // 2H.10, Jérôme's fourth pass.
  pressDash: 1,
  shoveBystander: 0,
  receiver: 1,
  chainException: 0,

  avoidOpportunity: 40,
  avoidCrackers: 10,
  dodgeWhenHurt: 6,
  disengage: 16,
};
