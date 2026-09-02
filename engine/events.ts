/**
 * What happened, as a list.
 *
 * Events are the persisted truth of a match, not a decorative log. A match is
 * rebuilt by replaying them, a disconnected client catches up by asking for
 * everything after its last sequence number, and the balance sweeps read them
 * to work out why one Tier keeps losing.
 *
 * So an event carries what a reader needs to reconstruct the moment, including
 * the dice. A client must never have to re-derive a roll it was not told about.
 */

import type { Point } from './geometry.js';
import type { MatchResult, TeamId, UnitId } from './types.js';

export interface DiceRoll {
  readonly die: number;
  readonly rolled: number;
  readonly bonus: number;
  readonly total: number;
  readonly against: number | null;
  readonly mode: 'normal' | 'advantage' | 'disadvantage';
}

export type MatchEvent =
  | { readonly kind: 'roundStarted'; readonly round: number }
  | { readonly kind: 'turnStarted'; readonly unitId: UnitId; readonly round: number }
  | {
      readonly kind: 'fell';
      readonly unitId: UnitId;
      readonly from: Point;
      readonly to: Point;
      readonly cellsFallen: number;
      readonly impact: boolean;
      readonly cause: 'lostGrip' | 'shoved';
    }
  | {
      readonly kind: 'moved';
      readonly unitId: UnitId;
      readonly from: Point;
      readonly to: Point;
      readonly path: readonly Point[];
      readonly costFeet: number;
    }
  | { readonly kind: 'dashed'; readonly unitId: UnitId; readonly extraFeet: number }
  | { readonly kind: 'dodging'; readonly unitId: UnitId }
  | { readonly kind: 'disengaged'; readonly unitId: UnitId }
  | {
      readonly kind: 'damaged';
      readonly unitId: UnitId;
      readonly amount: number;
      readonly hpAfter: number;
      readonly source: 'fall' | 'bat' | 'cracker';
    }
  | { readonly kind: 'evacuated'; readonly unitId: UnitId; readonly round: number }
  | {
      readonly kind: 'turnEnded';
      readonly unitId: UnitId;
      /** False means the unit ends in open air and will drop next turn. */
      readonly anchored: boolean;
    }
  | {
      readonly kind: 'attacked';
      readonly attackerId: UnitId;
      readonly targetId: UnitId;
      readonly roll: DiceRoll;
      readonly hit: boolean;
    }
  | { readonly kind: 'recoiled'; readonly unitId: UnitId; readonly from: Point; readonly to: Point }
  | {
      readonly kind: 'opportunityAttacked';
      readonly attackerId: UnitId;
      readonly targetId: UnitId;
      readonly roll: DiceRoll;
      readonly hit: boolean;
    }
  | {
      readonly kind: 'passIntercepted';
      readonly interceptorId: UnitId;
      readonly throwerId: UnitId;
      readonly interceptorRoll: DiceRoll;
      readonly throwerRoll: DiceRoll;
      readonly success: boolean;
    }
  | {
      /**
       * A Reaction the engine chose not to spend. Reactions are automatic, so
       * this is the only thing that tells a player why nobody swung at them.
       */
      readonly kind: 'reactionHeld';
      readonly unitId: UnitId;
      readonly reason: 'anchor';
    }
  | {
      readonly kind: 'shoved';
      readonly shoverId: UnitId;
      readonly targetId: UnitId;
      readonly success: boolean;
      readonly shoverRoll: DiceRoll;
      readonly targetRoll: DiceRoll;
    }
  | {
      readonly kind: 'crackerMoved';
      readonly crackerId: string;
      readonly from: Point;
      readonly to: Point;
      readonly path: readonly Point[];
    }
  | {
      readonly kind: 'crackerBatted';
      readonly unitId: UnitId;
      readonly crackerId: string;
      readonly roll: DiceRoll;
      readonly hit: boolean;
      /** The line it was sent down, 1..8 in d8 order. */
      readonly direction: number;
    }
  | {
      readonly kind: 'crackerDetonated';
      readonly crackerId: string;
      readonly at: Point;
      /** The one player caught in the blast. A Cracker never hits two. */
      readonly targetId: UnitId;
      readonly save: DiceRoll;
      readonly saved: boolean;
      /** Already halved when the save landed, so a client never re-derives it. */
      readonly damage: number;
    }
  | {
      readonly kind: 'crackerRespawned';
      readonly crackerId: string;
      readonly at: Point;
      readonly round: number;
    }
  | { readonly kind: 'sparkEntered'; readonly at: Point; readonly round: number }
  | {
      readonly kind: 'sparkMoved';
      readonly from: Point;
      readonly to: Point;
      readonly direction: number;
      readonly path: readonly Point[];
    }
  | {
      readonly kind: 'sparkCaught';
      readonly unitId: UnitId;
      readonly roll: DiceRoll;
      readonly caught: boolean;
    }
  | { readonly kind: 'payloadGrabbed'; readonly unitId: UnitId }
  | { readonly kind: 'payloadDropped'; readonly unitId: UnitId; readonly at: Point }
  | {
      readonly kind: 'passed';
      readonly fromId: UnitId;
      readonly toId: UnitId;
      readonly roll: DiceRoll;
      readonly caught: boolean;
    }
  | {
      readonly kind: 'payloadScattered';
      readonly to: Point;
      readonly cells: number;
      readonly direction: number;
    }
  | {
      readonly kind: 'shotAtFurnace';
      readonly unitId: UnitId;
      readonly roll: DiceRoll;
      readonly scored: boolean;
      /** The goalkeeper who spent its Reaction to interpose, if any. */
      readonly blockedBy: UnitId | null;
    }
  | {
      readonly kind: 'substituteEntered';
      readonly unitId: UnitId;
      readonly round: number;
      /** Where they come back on. Without it nobody reading the log can place them. */
      readonly at: Point;
    }
  | {
      /**
       * A goal restarts play at once: the ball is incinerated and a fresh one is
       * handed to the keeper who just conceded, or dropped in front of the
       * Furnace when that keeper is off the field.
       *
       * It carries no dice and decides nothing, and it exists because without it
       * the log is not replayable. `scored` says the score moved; nothing said
       * where the ball went, so a reader who rebuilt the match from events
       * ended up with the Payload still in the scorer's hands. The client's
       * replay found this by disagreeing with the server's own board.
       */
      readonly kind: 'payloadReset';
      readonly at: Point;
      readonly carriedBy: UnitId | null;
    }
  /**
   * The only event that moves the scoreboard.
   *
   * `source` says which of the two things that score did it, and it is not a
   * convenience: the balance sweep separates the Payload game from the Spark,
   * and it used to do that by comparing `points` against `GOAL_POINTS`. Set the
   * Spark to the same price as a goal, which is a live question, and that test
   * silently reads every Spark as a goal. A reading that breaks when a constant
   * is tuned is a reading you cannot tune against.
   */
  | {
      readonly kind: 'scored';
      readonly team: TeamId;
      readonly points: number;
      readonly source: 'payload' | 'spark';
    }
  | { readonly kind: 'matchEnded'; readonly result: MatchResult }
  | { readonly kind: 'diceRolled'; readonly unitId: UnitId; readonly roll: DiceRoll; readonly reason: string };
