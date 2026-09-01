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
   * A hundred and fifty points and the match ends on the spot. Weighted above
   * everything else in all four tables on purpose: even a one-in-three grab is
   * worth more than a Payload in the hand, because it is the whole match.
   */
  readonly catchSpark: number;
  /** Being where it is going to be. */
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
  /** Staying on the opponent who is carrying. */
  readonly pressCarrier: number;

  // -- Caution --------------------------------------------------------------
  /** Penalty for ending up somewhere with nothing to grapple. */
  readonly keepGrip: number;
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
