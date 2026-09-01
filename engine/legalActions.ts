/**
 * What the unit whose turn it is may legally do, right now.
 *
 * This is the load-bearing function of the whole project, and its value comes
 * entirely from having **one** of it. It feeds two consumers that would
 * otherwise each grow their own copy of the rules:
 *
 *   - the interface, which greys a button out and highlights reachable cells;
 *   - the AI, which enumerates its candidates before scoring them.
 *
 * The day a React component decides for itself that a shot is possible, the two
 * answers drift and the bug hides for weeks. So nothing outside `engine/` ever
 * works out whether an action is available: it asks here.
 *
 * Reachable cells are returned as a set of destinations rather than as one
 * `move` action per route, because the number of routes is combinatorial while
 * the number of destinations is a few dozen. `pathTo` turns a chosen
 * destination into the cheapest route, and a player is free to send another.
 */

import type { Action } from './actions.js';
import type { Arena } from './arena.js';
import { CRACKER_AC, PAYLOAD_PASS_AC, SPARK_CATCH_DC } from './constants.js';
import { DIRECTIONS, distance } from './geometry.js';
import { blockingBulwark, rangeToFurnace, shotTarget, throwRangeOver } from './rules/payload.js';
import { reachableCells, type Reachable } from './rules/movement.js';
import { throwRange } from './rules/payload.js';
import { statsFor } from './stats.js';
import { activeUnits, type MatchState, type Unit, type UnitId } from './types.js';

/** The d8 rolls, 1..8, derived from the direction table so the two cannot drift. */
const D8_DIRECTIONS: readonly number[] = DIRECTIONS.map((_, i) => i + 1);

export interface TargetOption {
  readonly unitId: UnitId;
  readonly name: string;
  /** The number the roll has to beat, so the interface can show it before committing. */
  readonly against: number;
  readonly mode: 'normal' | 'advantage' | 'disadvantage';
}

export interface ShotOption {
  readonly against: number;
  readonly mode: 'normal' | 'advantage' | 'disadvantage';
  /** The goalkeeper who would interpose, if one is in position with a Reaction. */
  readonly blockedBy: UnitId | null;
}

export interface CrackerOption {
  readonly crackerId: string;
  readonly against: number;
  /**
   * The lines it may be sent down, 1..8 in d8 order. Always all eight: a
   * Cracker ignores terrain, so no direction is ever barred. They are listed
   * rather than assumed so the AI enumerates candidates from here like every
   * other action, instead of growing its own copy of that rule.
   */
  readonly directions: readonly number[];
}

export interface CatchOption {
  readonly against: number;
  readonly mode: 'normal' | 'advantage' | 'disadvantage';
}

export interface LegalActions {
  readonly unitId: UnitId;
  /** Destinations, keyed "x,y", with what each costs and where it came from. */
  readonly destinations: ReadonlyMap<string, Reachable>;
  readonly attack: readonly TargetOption[];
  readonly shove: readonly TargetOption[];
  readonly pass: readonly TargetOption[];
  readonly shoot: ShotOption | null;
  /** Live Crackers within bat reach, each with the lines it can be sent down. */
  readonly batCracker: readonly CrackerOption[];
  /** Set only when this unit is standing in the Spark's own cell. */
  readonly catchSpark: CatchOption | null;
  readonly canGrabPayload: boolean;
  readonly canDash: boolean;
  readonly canDodge: boolean;
  readonly canDisengage: boolean;
  /** Every action above that needs no further choice, ready to send as is. */
  readonly simple: readonly Action[];
}

export function legalActions(arena: Arena, state: MatchState): LegalActions | null {
  const turn = state.turn;
  if (!turn || state.phase === 'finished') return null;

  const unit = state.units.find((u) => u.id === turn.unitId);
  if (!unit || unit.status !== 'active') return null;

  const hasAction = !turn.actionUsed;
  const holding = unit.holdingPayload;

  const adjacentEnemies = activeUnits(state).filter(
    (u) => u.team !== unit.team && distance(unit, u) === 1,
  );

  const attack: TargetOption[] =
    hasAction && !holding
      ? adjacentEnemies.map((target) => ({
          unitId: target.id,
          name: target.name,
          against: statsFor(target.role, target.tier).ac,
          mode: target.dodging ? ('disadvantage' as const) : ('normal' as const),
        }))
      : [];

  // A player holding the ball can still shove: it is a grapple, not a swing.
  const shove: TargetOption[] = hasAction
    ? adjacentEnemies.map((target) => {
        const stats = statsFor(target.role, target.tier);
        return {
          unitId: target.id,
          name: target.name,
          against: Math.max(stats.might, stats.agility),
          mode: 'normal' as const,
        };
      })
    : [];

  const pass: TargetOption[] =
    hasAction && holding
      ? activeUnits(state)
          .filter((u) => u.team === unit.team && u.id !== unit.id)
          .flatMap((mate) => {
            const range = throwRange(unit, mate);
            if (!range.ok) return [];
            return [
              {
                unitId: mate.id,
                name: mate.name,
                against: PAYLOAD_PASS_AC,
                mode: range.mode,
              },
            ];
          })
      : [];

  const shoot = hasAction && holding ? shotOption(arena, state, unit) : null;

  // Swinging at a Cracker is a bat swing, so the Payload bars it exactly as it
  // bars an attack on a player.
  const batCracker: CrackerOption[] =
    hasAction && !holding
      ? state.crackers
          .filter((c) => c.state === 'live' && distance(unit, c) === 1)
          .map((c) => ({ crackerId: c.id, against: CRACKER_AC, directions: D8_DIRECTIONS }))
      : [];

  const catchSpark: CatchOption | null =
    hasAction && state.spark.inPlay && state.spark.x === unit.x && state.spark.y === unit.y
      ? { against: SPARK_CATCH_DC, mode: 'normal' }
      : null;

  const canGrabPayload =
    !turn.objectInteractionUsed &&
    state.payload.carriedBy === null &&
    state.payload.x === unit.x &&
    state.payload.y === unit.y;

  const simple: Action[] = [{ kind: 'endTurn' }];
  if (hasAction) simple.push({ kind: 'dash' }, { kind: 'dodge' }, { kind: 'disengage' });
  if (canGrabPayload) simple.push({ kind: 'grabPayload' });
  if (catchSpark) simple.push({ kind: 'catchSpark' });

  return {
    unitId: unit.id,
    destinations: reachableCells(arena, state, unit, turn.movementFeetRemaining),
    attack,
    shove,
    pass,
    shoot,
    batCracker,
    catchSpark,
    canGrabPayload,
    canDash: hasAction,
    canDodge: hasAction,
    canDisengage: hasAction,
    simple,
  };
}

function shotOption(arena: Arena, state: MatchState, unit: Unit): ShotOption | null {
  const furnace = arena.targetFurnaceOf(unit.team);
  const range = throwRangeOver(rangeToFurnace(unit, furnace));
  if (!range.ok) return null;

  const keeper = blockingBulwark(state, furnace, furnace.defendedBy);
  return {
    against: shotTarget(keeper),
    mode: range.mode,
    blockedBy: keeper?.id ?? null,
  };
}
