/**
 * The Dash held back (2H.30, `00` C31 point 3).
 *
 * Why. Pressing Dash used to send it at once, and the Action was gone even
 * when the player then walked no further than their own feet took them.
 * Jérôme: « quand on clique sur le bouton dash, on devrait pouvoir annuler si
 * on n'a pas encore consommé les extra mouvements ». The engine has no undo,
 * and giving it one is a new action, a version and a redeployment; so the
 * client holds the Dash instead. Pressing Dash shows the board with the
 * Dash's feet already counted (`heldDashState`) and sends nothing; the Dash
 * goes to the server right before the first walk that needs it
 * (`dashNeeded`), as two requests in a row; until then a second press cancels
 * it and nothing was spent. In the engine's eyes the turn is the same turn: a
 * Dash declared later adds the same forty feet, and a walk inside the plain
 * budget never needed it.
 *
 * Both functions are pure and read nothing but the turn.
 */

import { MOVE_SPEED_FEET } from '../../../engine/constants.js';
import type { Point } from '../../../engine/geometry.js';
import { pathCostFeet } from '../../../engine/rules/movement.js';
import type { MatchState } from '../../../engine/types.js';

/**
 * The board as the player sees it with the Dash held: the same turn with the
 * Dash's feet already added and the Action still in hand. The state itself
 * when there is no turn or the Action is spent, in which case there is nothing
 * to hold.
 */
export function heldDashState(state: MatchState): MatchState {
  const turn = state.turn;
  if (!turn || turn.actionUsed) return state;
  return { ...state, turn: { ...turn, movementFeetRemaining: turn.movementFeetRemaining + MOVE_SPEED_FEET } };
}

/**
 * Whether walking `path` from `from` needs the held Dash: it costs more feet
 * than the turn has without it. False when the Action is spent, since the
 * Dash cannot be sent then anyway.
 */
export function dashNeeded(state: MatchState, from: Point, path: readonly Point[]): boolean {
  const turn = state.turn;
  if (!turn || turn.actionUsed) return false;
  return pathCostFeet(from, path) > turn.movementFeetRemaining;
}
