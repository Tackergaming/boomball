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
