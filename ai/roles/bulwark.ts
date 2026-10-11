/**
 * The Bulwark holds the Furnace.
 *
 * Its Reaction is worth ten points at its own hatch and nothing at all
 * anywhere else, so almost everything here is arranged to keep it home. It
 * presses whoever comes at the goal, it strips them, and it passes the ball
 * out the moment it gets it rather than trying to run with it.
 *
 * `guardFurnace` is the largest positional weight in the four files on purpose:
 * a Bulwark that wanders is a Bulwark that is not a goalkeeper.
 */

import type { RoleWeights } from './weights.js';

export const BULWARK: RoleWeights = {
  shoot: 20,
  pass: 85,
  grabPayload: 80,
  carryToFurnace: 8,
  chaseLoosePayload: 30,

  attack: 30,
  shove: 40,
  stripCarrier: 70,
  batCracker: 20,

  catchSpark: 300,
  chaseSpark: 0,

  guardFurnace: 95,
  screenCarrier: 8,
  supportAttack: 0,
  cover: 0,
  block: 0,
  spread: 0,
  carrierSafety: 0,
  wantsEscort: 0,
  guardStrike: 0,
  parryPost: 0,
  yieldToKeener: 0,
  handOff: 0,
  rejoin: 0,
  screen: 0,
  leash: 4,
  looseBallReach: 3,
  brace: 40,
  rest: 1,

  pressCarrier: 60,

  // 2H.8, Jérôme's second pass.
  chaseKickoff: 1,
  prey: { striker: 1, breaker: 1, trajector: 1, bulwark: 1 },
  hunt: 0,
  relaunch: 150,

  // 2H.10, Jérôme's fourth pass.
  pressDash: 0,
  shoveBystander: 1,
  receiver: 0.4,
  chainException: 0,

  avoidOpportunity: 30,
  avoidCrackers: 8,
  dodgeWhenHurt: 8,
  disengage: 10,
};
