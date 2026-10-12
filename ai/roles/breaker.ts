/**
 * The Breaker is the bodyguard.
 *
 * It is the only role that would rather hit somebody than hold the ball, and
 * the only one that treats the Crackers as a weapon instead of a hazard. Since
 * 2H.7 (Jérôme's retours on the engine 3 game, 2026-10-10) its charge is
 * spelled out: **the carrier, always**. With the ball on its own side it goes
 * to its carrier before anything (`screenCarrier`, since 2H.11) and takes a
 * place beside it, where the carrier will be (`block`, reworded by Jérôme in
 * 2H.10: every team-mate standing in one of the eight cells around the
 * carrier is one swing, one shove and one opportunity attack fewer; first job
 * in attack, before a Cracker and before any straggler, threatened or not
 * since 2H.11), dashing over when it is too far to get there, and swings at
 * whoever is standing on the carrier (`guardStrike`). With the ball on the
 * other side it goes and shoves the carrier off it (`pressCarrier`,
 * `stripCarrier`; a bat only when it can evacuate), dashing towards it when a
 * move falls short (`approachDash`), and when that carrier is out of a move's
 * reach it swings at the opponent it can get to that it is likeliest to
 * evacuate (`hunt`, `preyByHp`). With the Action spent and nobody to hit, the
 * movement left goes towards the carrier, then onto the line a Cracker will
 * roll down so the parry fires (`parryPost`, worth the blast it spares a
 * team-mate), which is why it is the one role with no fear of them, unless it
 * carries. It leaves a loose ball to a Striker or Trajector within two cells
 * who has not played yet (`yieldToKeener`), and when it does end up holding
 * it, hands off at the first chance (`handOff`), to a Striker ahead even one
 * who has played, if nobody can intercept (`chainException`).
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
  // Thirty since 2H.11 (Jérôme, 2026-10-12), the strip carrying the shove.
  shove: 30,
  stripCarrier: 150,
  batCracker: 70,

  catchSpark: 300,
  chaseSpark: 0,

  guardFurnace: 8,
  screenCarrier: 80,
  supportAttack: 20,
  cover: 10,
  pressCarrier: 55,

  block: 80,
  spread: 0,
  carrierSafety: 80,
  wantsEscort: 0,
  guardStrike: 150,
  parryPost: 1,
  yieldToKeener: 1,
  handOff: 40,
  rejoin: 0,
  leash: 99,
  looseBallReach: 99,
  brace: 0,
  rest: 0,

  // 2H.8, Jérôme's second pass.
  chaseKickoff: 1,
  preyByHp: 1,
  hunt: 70,
  relaunch: 0,

  // 2H.10, Jérôme's fourth pass; 2H.11, his fifth.
  approachDash: 1,
  shoveBystander: 1,
  receiver: 0.8,
  idleSwing: 1,
  chainException: 1,

  avoidOpportunity: 20,
  // Zero on purpose: the line a Cracker rolls down is where this role wants
  // to stand. `parryPost` is the positive reading of the same line.
  avoidCrackers: 0,
  dodgeWhenHurt: 6,
  disengage: 8,
};
