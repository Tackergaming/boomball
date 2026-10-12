/**
 * The Striker scores.
 *
 * It wants the ball, it wants to be near the Furnace it attacks, and it takes
 * the shot. It hits people only when they are between it and the goal. Since
 * 2H.10 (Jérôme, 2026-10-11) it carries the ball without losing it: it ends
 * its turn where the fewest opponents can come and shove it
 * (`carrierSafety`), holds a clean shot for next turn rather than throw at
 * disadvantage, never shoves a bystander (`shoveBystander`), and stays off
 * its team-mates (`spread`), taking a place beside its own carrier only when
 * its relay does not suffer for it (`block`). Since 2H.11 (`00` C13) it
 * dashes towards the other side's carrier when a move falls short
 * (`approachDash`), swings at a bystander only for want of anything better
 * while its side has the ball (`idleSwing`), and all but never bats a Cracker
 * (`batCracker`).
 */

import type { RoleWeights } from './weights.js';

export const STRIKER: RoleWeights = {
  shoot: 150,
  pass: 45,
  grabPayload: 90,
  carryToFurnace: 70,
  chaseLoosePayload: 55,

  attack: 15,
  shove: 30,
  stripCarrier: 150,
  batCracker: 8,

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
  leash: 99,
  looseBallReach: 99,
  brace: 0,
  rest: 0,

  pressCarrier: 55,

  // 2H.8, Jérôme's second pass.
  chaseKickoff: 1,
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

  avoidOpportunity: 40,
  avoidCrackers: 10,
  dodgeWhenHurt: 6,
  disengage: 16,
};
