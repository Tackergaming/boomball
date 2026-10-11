/**
 * What each role wants, as numbers.
 *
 * This is the priority table the plan calls for, and it is **data, not logic**.
 * Every candidate action the engine offers is scored by the same evaluator; the
 * only thing that separates a Bulwark from a Striker is the column it reads
 * here. Rebalancing the four roles means editing these files and nothing else,
 * which is what makes a thousand-run sweep worth running: the knob it turns is
 * in one place.
 *
 * Scores are on one scale and `endTurn` sits at zero. A unit therefore stops
 * when nothing on the board is worth more than doing nothing, rather than
 * fidgeting because it has movement left.
 *
 * Two families of number:
 *
 *   - **Appetites** are multiplied by how likely the thing is to work and by
 *     how much it is worth. A weight of 100 on `shoot` does not mean the unit
 *     always shoots, it means a certain goal beats a certain anything-else.
 *   - **Cautions** are subtracted flat. They are what stop a Striker from
 *     walking through three opponents to take a shot it will miss.
 */

import type { Role } from '../../engine/stats.js';

export interface RoleWeights {
  // -- The Payload ----------------------------------------------------------
  /** Putting it in the Furnace. */
  readonly shoot: number;
  /** Moving it to somebody better placed. */
  readonly pass: number;
  /** Picking it up off the floor, which is free. */
  readonly grabPayload: number;
  /** Carrying it towards the Furnace this team attacks. */
  readonly carryToFurnace: number;
  /** Going to fetch it while it is loose. */
  readonly chaseLoosePayload: number;

  // -- Violence -------------------------------------------------------------
  readonly attack: number;
  readonly shove: number;
  /** Extra appetite when the target is the one carrying the ball. */
  readonly stripCarrier: number;
  /** Sending a Cracker into somebody. */
  readonly batCracker: number;

  // -- The Spark ------------------------------------------------------------
  /**
   * Take it, you are standing on it. The same number in all four tables
   * because the Spark does not care what role picks it up.
   *
   * **It deliberately does not track `SPARK_POINTS`.** The price came down to
   * two goals on 2026-09-02 and this stayed at 240, because the two numbers
   * answer different questions. The price says what a capture is worth on the
   * scoreboard; this says whether a unit already standing on the Spark should
   * spend its Action on it, and the answer is yes at any price the game would
   * plausibly set. Scaling it down with the price would only risk dropping it
   * near `pickUpPayload` at 90, which is the one case where the choice is real.
   *
   * Above a threshold the exact figure barely matters, and this was measured:
   * a full sweep at 400 and a full sweep at 240 return the same figures to
   * within one match. This appetite is only ever read by a unit already on the
   * Spark's cell, where almost nothing competes. What governs how often that
   * happens is `chaseSpark`.
   */
  readonly catchSpark: number;
  /**
   * Being where it is going to be, and the switch that says whether this role
   * hunts the Spark at all. **Zero in three of the four tables on purpose**,
   * arbitrated 2026-09-01: the Trajector is the only role that leaves its job
   * to go and get it.
   *
   * Once the Spark became genuinely catchable, a whole field that wanted it was
   * caught in 44 to 61 % of matches and settled a quarter of them. Two hunters
   * on fourteen shirts is what keeps it a prize rather than a scramble, and it
   * hands the Trajector back the speciality its stat line was built for.
   *
   * A role with zero here still takes the catch when it happens to be standing
   * in the Spark's cell: that is free. What it will not do is walk there.
   */
  readonly chaseSpark: number;

  // -- Position -------------------------------------------------------------
  /** Staying between the opposition and the Furnace this team defends. */
  readonly guardFurnace: number;
  /** Staying near a team-mate who is carrying. */
  readonly screenCarrier: number;
  /**
   * Being inside shooting range while a team-mate carries. This is what puts a
   * second shooter on the pitch, and without it the goalkeeper's Reaction is
   * drawn by the only shot of the match and never spent.
   */
  readonly supportAttack: number;
  /**
   * Being an outlet nobody is standing beside: in the carrier's reach and
   * sight, on a lane no opponent could intercept. This is what the anchoring
   * value of the vertical silo became once there was nothing to fall from. A
   * crate on the floor is cover only in this sense: the place where a throw
   * reaches you and a defender does not. Zero for the goalkeeper, which does
   * not get open; highest for the Trajector, whose job is the throw.
   */
  readonly cover: number;
  /** Staying on the opponent who is carrying. */
  readonly pressCarrier: number;

  // -- The bodyguard, 2H.7, reworded by Jérôme in 2H.8 ----------------------
  /**
   * Being an obstacle between the opponents and our own carrier: a cell on
   * the way the nearest threats would take to it, a cell or two off the
   * carrier, so that they spend more movement or cannot finish adjacent to it
   * at all. Jérôme's words of 2026-10-11, replacing the "shoulder facing the
   * threat" of 2H.7, which he did not like. Decided on 2026-10-10 and kept:
   * the Breaker's charge is always the carrier, never a Striker by name. Zero
   * for every other role. Also the price of a Dash when the carrier is too far
   * to reach this turn: a Breaker far from its carrier runs rather than swing
   * at a straggler.
   */
  readonly block: number;
  /**
   * Whether this role, when it carries, is worth escorting: one for a field
   * player, zero for the goalkeeper. A keeper handed a fresh ball after a goal
   * needs outlets up the pitch, not two Breakers on its shoulders in the mouth;
   * that was the A31 huddle, and this is what keeps the bodyguard out of it.
   * Read off the **carrier's** table by `escort`.
   */
  readonly wantsEscort: number;
  /**
   * Hitting or shoving an opponent who is standing on our carrier, on top of
   * the plain appetite for a swing. Zero for every other role.
   */
  readonly guardStrike: number;
  /**
   * Standing on the line a Cracker will roll down towards the ball at the next
   * count 20, so that it arrives on this unit and the parry (écart 47) fires.
   * The one positive reading of `crackerPressure`, and the Breaker's weapon:
   * Jérôme chose to have it go and post there on purpose, 3d6 on a miss being
   * the price of the role. Zero for every other role, which run from the line.
   */
  readonly parryPost: number;
  /**
   * Leaving a loose ball to a team-mate who wants it more. One means: when a
   * mate within two cells of the ball has a higher `chaseLoosePayload`, this
   * unit neither walks onto the ball nor picks it up. Zero means it takes
   * whatever is at its feet. A number rather than a role test so the table
   * stays data.
   */
  readonly yieldToKeener: number;
  /**
   * A flat appetite for throwing the ball to anybody, added to every pass,
   * for a unit that should not be the one carrying. It makes a pass that
   * gains no ground still beat walking with the ball.
   */
  readonly handOff: number;
  /**
   * Coming back into throwing range of our own carrier when out of it. A
   * Striker eighteen cells up the pitch had no reason to turn round, because
   * every outlet term reads zero out of reach; this is the reason. Zero for
   * the roles that do not run ahead.
   */
  readonly rejoin: number;
  /**
   * Standing between an opponent and a team-mate who handles the ball, when
   * the other side has it: the bodyguard's defensive stance, Jérôme's words,
   * "so that no opponent can finish adjacent to a Striker". First priority of
   * the Breaker's position in defence, the Cracker line second. Zero for
   * every other role.
   */
  readonly screen: number;

  // -- Jérôme's second pass on the roles, 2H.8, 2026-10-11 ------------------
  /**
   * The share of the kick-off ball this role wants: the ball nobody has
   * carried yet (`lastCarrierTeam` null). Zero for the Trajector, which
   * leaves the first pick-up to a Striker and keeps itself for the throw;
   * one for everybody else.
   */
  readonly chaseKickoff: number;
  /**
   * What a swing at each opposing role is worth, as a share of `attack`. The
   * Breaker's order in defence when the carrier is out of reach: Strikers
   * first, then Breakers, then the Trajector. One across the board for the
   * roles that have no preference.
   */
  readonly prey: Readonly<Record<Role, number>>;
  /**
   * Finishing adjacent to an opponent it can swing at, when the other side
   * has the ball and their carrier is out of reach: "porteur hors de portée,
   * taper l'adversaire proche". Scaled by `prey`. Breaker only. Above
   * `screen` on purpose, since Jérôme ranks the swing before the stance.
   */
  readonly hunt: number;
  /**
   * A flat appetite for throwing the ball at once, whoever has played and
   * wherever they stand, interceptors or not: the keeper's relaunch after a
   * goal (écart 54), "il lance la balle immédiatement, même s'il y a risque
   * d'interception". It also lifts the chain's filters for this role. Bulwark
   * only.
   */
  readonly relaunch: number;

  // -- The goalkeeper's tether, 2H.7 ------------------------------------------
  /**
   * The furthest from its own mouth this role will stand, in cells of range
   * to the Furnace. Four for the Bulwark, by Jérôme's arbitration: out to
   * shove a carrier, never further. A very large number for everybody else.
   */
  readonly leash: number;
  /**
   * How far away a loose ball may lie for this role to go and fetch it. Three
   * for the Bulwark, which otherwise ran seven or eight cells after its own
   * fumbled throw (observed in 2H.2); unbounded for everybody else.
   */
  readonly looseBallReach: number;
  /** Appetite for digging in (écart 52) when an opponent is two cells away. Bulwark only. */
  readonly brace: number;

  // -- Caution --------------------------------------------------------------
  /** Penalty per opponent a route would walk out of the reach of. */
  readonly avoidOpportunity: number;
  /** Penalty for standing next to a live Cracker on count 20. */
  readonly avoidCrackers: number;
  /** Appetite for the Dodge stance, scaled by how hurt the unit is. */
  readonly dodgeWhenHurt: number;
  /** Appetite for a second helping of movement when the objective is far. */
  readonly dash: number;
  /** Appetite for walking away clean while carrying. */
  readonly disengage: number;
}
