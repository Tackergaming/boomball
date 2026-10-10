/**
 * What a player, or an AI, may ask to do.
 *
 * An `Action` is an intention, never a result. It is what a client sends, what
 * `legalActions` enumerates and what the AI chooses among. Nothing here decides
 * anything: `reduce` does.
 */

import type { Point } from './geometry.js';

/**
 * Moving is not an Action in the action-economy sense. A unit spends movement
 * and still has its Action, which is why a turn can be walk, hit, walk again.
 */
export interface MoveAction {
  readonly kind: 'move';
  /** The whole route, origin excluded. The player picks it, not the engine. */
  readonly path: readonly Point[];
}

/** Costs the Action and buys a second helping of movement. */
export interface DashAction {
  readonly kind: 'dash';
}

/** Costs the Action. Holds until this unit's next turn. */
export interface DodgeAction {
  readonly kind: 'dodge';
}

/** Costs the Action. Holds until the end of this turn. */
export interface DisengageAction {
  readonly kind: 'disengage';
}

/** Costs the Action. The target must be within reach of the bat. */
export interface AttackAction {
  readonly kind: 'attack';
  readonly targetId: string;
}

/** Costs the Action. Knocks the target off its line and out of its grip. */
export interface ShoveAction {
  readonly kind: 'shove';
  readonly targetId: string;
}

/**
 * Costs the Action. A bat swing at a live Cracker in reach, which sends it
 * twelve cells down a line the player chooses. The engine never picks the
 * direction: aiming the thing at someone is the entire job of the Breaker.
 */
export interface BatCrackerAction {
  readonly kind: 'batCracker';
  readonly crackerId: string;
  /** One of the eight compass directions, 1..8 in d8 order. */
  readonly direction: number;
}

/** Costs the Action. Only from the Spark's own cell, and it ends the match. */
export interface CatchSparkAction {
  readonly kind: 'catchSpark';
}

/** The free object interaction, taken by standing on the loose ball. */
export interface GrabPayloadAction {
  readonly kind: 'grabPayload';
}

/** Costs the Action. A throw to a team-mate. */
export interface PassAction {
  readonly kind: 'pass';
  readonly targetId: string;
}

/** Costs the Action. A throw at the Furnace this unit's team attacks. */
export interface ShootAction {
  readonly kind: 'shoot';
}

/**
 * The Bulwark digs in (écart 52): until its next turn, or until it moves, a
 * Shove against it rolls at disadvantage and minus `BRACE_SHOVE_PENALTY`.
 */
export interface BraceAction {
  readonly kind: 'brace';
}

export interface EndTurnAction {
  readonly kind: 'endTurn';
}

export type Action =
  | MoveAction
  | DashAction
  | DodgeAction
  | DisengageAction
  | AttackAction
  | ShoveAction
  | BatCrackerAction
  | CatchSparkAction
  | GrabPayloadAction
  | PassAction
  | ShootAction
  | BraceAction
  | EndTurnAction;

export type ActionKind = Action['kind'];

export interface Command {
  readonly unitId: string;
  readonly action: Action;
}
