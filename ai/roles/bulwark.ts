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

  catchSpark: 400,
  chaseSpark: 6,

  guardFurnace: 95,
  screenCarrier: 8,
  supportAttack: 0,
  pressCarrier: 40,

  keepGrip: 30,
  avoidOpportunity: 4,
  avoidCrackers: 8,
  dodgeWhenHurt: 14,
  dash: 4,
  disengage: 10,
};
