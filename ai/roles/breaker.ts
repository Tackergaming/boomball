/**
 * The Breaker is the bodyguard.
 *
 * It is the only role that would rather hit somebody than hold the ball, and
 * the only one that treats the Crackers as a weapon instead of a hazard. Since
 * 2H.7 (Jérôme's retours on the engine 3 game, 2026-10-10) its charge is
 * spelled out: **the carrier, always**. With the ball on its own side it makes
 * itself an obstacle between the nearest threats and the carrier (`block`,
 * reworded by Jérôme in 2H.8: not a shoulder, a wall on their way), dashing
 * over when it is too far to get there, and swings at whoever is standing on
 * the carrier (`guardStrike`). With the ball on the other side it goes and
 * shoves the carrier off it (`pressCarrier`, `stripCarrier`), and when that
 * carrier is out of reach it swings at the nearest opponent it can get to,
 * Strikers first, then Breakers, then the Trajector (`hunt`, `prey`). Only
 * then does it take a stance: on the opponents' way to its Strikers
 * (`screen`), then on the line a Cracker will roll down so the parry fires
 * (`parryPost`), which is why it is the one role with no fear of them. It
 * leaves a loose ball to any Striker or Trajector within two cells
 * (`yieldToKeener`), handing off at the first chance when it does end up
 * holding it (`handOff`).
 *
 * It all but never shoots: `shoot` is low enough that it passes to anyone
 * rather than try.
 */

import type { RoleWeights } from './weights.js';

export const BREAKER: RoleWeights = {
  shoot: 15,
  pass: 60,
  grabPayload: 70,
  carryToFurnace: 40,
  chaseLoosePayload: 45,

  attack: 60,
  // Under the swing on purpose: against anybody but the carrier its tool is
  // the bat, and only the carrier (`stripCarrier`) is worth a grapple.
  shove: 50,
  stripCarrier: 80,
  batCracker: 70,

  catchSpark: 300,
  chaseSpark: 0,

  guardFurnace: 8,
  // Closeness alone is priced at zero: `escort` prices the right shoulder.
  screenCarrier: 0,
  supportAttack: 20,
  cover: 10,
  pressCarrier: 55,

  block: 60,
  wantsEscort: 1,
  guardStrike: 50,
  // Opponents first, Crackers second, in defence: Jérôme's order.
  screen: 60,
  parryPost: 30,
  yieldToKeener: 1,
  handOff: 40,
  rejoin: 0,
  leash: 99,
  looseBallReach: 99,
  brace: 0,
  rest: 0,

  // 2H.8, Jérôme's second pass.
  chaseKickoff: 1,
  prey: { striker: 1, breaker: 0.8, trajector: 0.6, bulwark: 0.4 },
  hunt: 70,
  relaunch: 0,

  avoidOpportunity: 2,
  // Zero on purpose: the line a Cracker rolls down is where this role wants
  // to stand. `parryPost` is the positive reading of the same line.
  avoidCrackers: 0,
  dodgeWhenHurt: 6,
  dash: 6,
  disengage: 8,
};
