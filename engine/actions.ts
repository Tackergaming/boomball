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

/**
 * The human's place in its role this round (écart 58, 2H.12): 1 plays first
 * of its role, 2 after one AI of the role, 3 after two. The only action
 * open while `turn.placing` is set, and open at no other time.
 */
export interface ChoosePlaceAction {
  readonly kind: 'choosePlace';
  readonly place: number;
}

/**
 * A human hands its Giff to the house for the rest of the match (2H.33, `00`
 * C32 point 6, engine version 11). The one action that is not a turn action:
 * it is accepted at any moment, from the unit's own controller, and the unit
 * is driven by the AI from then on. Never offered by `legalActions`.
 */
export interface YieldSeatAction {
  readonly kind: 'yieldSeat';
}

/**
 * Écart 66 (2H.41, engine version 12): a human of a whole team names the
 * unit that takes the pick the ladder is waiting on. The command's `unitId`
 * is the unit picked; `humanId` is who picked, written by the server off
 * the caller's identity, never trusted off the wire; null when the house
 * resolved the pick itself (a delegated round, a team with nobody to pick).
 */
export interface PickUnitAction {
  readonly kind: 'pickUnit';
  readonly humanId: string | null;
}

/** Écart 66: the rest of this picked turn is the AI's. Accepted from the one who picked. */
export interface DelegateTurnAction {
  readonly kind: 'delegateTurn';
}

/**
 * Écart 66: this turn, if one of the team's picks is open, and every pick of
 * the team still ahead this round are the AI's. What a clock that runs out
 * does for a whole team. The command's `unitId` names any unit of the team.
 */
export interface DelegateRoundAction {
  readonly kind: 'delegateRound';
}

/**
 * Écart 66: how the command unit's team is played from the next round on.
 * Accepted at any moment; the round in progress finishes as it began. The
 * owner's call, which the door checks, not the engine.
 */
export interface SetTeamModeAction {
  readonly kind: 'setTeamMode';
  readonly mode: 'seat' | 'whole';
}

export type Action =
  | MoveAction
  | PickUnitAction
  | DelegateTurnAction
  | DelegateRoundAction
  | SetTeamModeAction
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
  | ChoosePlaceAction
  | YieldSeatAction
  | EndTurnAction;

export type ActionKind = Action['kind'];

/**
 * The kinds that exist, as a value, for the doors that read an action off the
 * wire (2H.37, security review M2): `resolve-action` refuses a body whose
 * `kind` is not one of these before the engine sees it. `satisfies` keeps the
 * list exhaustive: a new Action without its line here does not compile.
 */
export const ACTION_KINDS = {
  move: true,
  dash: true,
  dodge: true,
  disengage: true,
  attack: true,
  shove: true,
  batCracker: true,
  catchSpark: true,
  grabPayload: true,
  pass: true,
  shoot: true,
  brace: true,
  choosePlace: true,
  yieldSeat: true,
  pickUnit: true,
  delegateTurn: true,
  delegateRound: true,
  setTeamMode: true,
  endTurn: true,
} as const satisfies Record<ActionKind, true>;

/** Whether a value off the wire has the shape of an Action: an object with a known `kind`. */
export function isActionShaped(raw: unknown): raw is Action {
  if (typeof raw !== 'object' || raw === null) return false;
  const { kind } = raw as { kind?: unknown };
  return typeof kind === 'string' && Object.hasOwn(ACTION_KINDS, kind);
}

export interface Command {
  readonly unitId: string;
  readonly action: Action;
}
