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
import { DIRECTIONS, distance, type Point } from './geometry.js';
import { reachableCells, type Reachable } from './rules/movement.js';
import {
  blockingBulwark,
  shotTarget,
  throwRange,
  throwRangeOver,
  visibleRangeToFurnace,
} from './rules/payload.js';
import { hasLineOfSight } from './rules/sight.js';
import { pickableUnits } from './initiative.js';
import { statsFor } from './stats.js';
import {
  activeUnits,
  pendingPick,
  sparkIsLive,
  type HumanId,
  type MatchState,
  type Unit,
  type UnitId,
} from './types.js';

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
   * The lines it may be sent down, 1..8 in d8 order. A line whose first cell
   * is an obstacle or off the pitch is not offered: a Cracker is not batted
   * straight into a crate (past its first cell it bounces, écart 35). They are
   * listed rather than assumed so the AI enumerates candidates from here like
   * every other action, instead of growing its own copy of that rule.
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
  /** Brace, the Bulwark's dig-in (écart 52): only that role, Action in hand. */
  readonly canBrace: boolean;
  /**
   * The places on offer while a human chooses its place in its role (écart
   * 58, 2H.12), 1 first; empty in a turn being played. While it is not
   * empty, nothing else is legal, not even ending the turn.
   */
  readonly choosePlace: readonly number[];
  /**
   * Écart 66 (2H.41): the turn came from a pick of a whole team and is
   * still its human's, so "Let the AI play" and "Let the AI finish the
   * round" are on offer. Not in `simple`, on purpose: the AI enumerates
   * `simple` and must never hand itself a turn.
   */
  readonly canDelegate: boolean;
  /** Every action above that needs no further choice, ready to send as is. */
  readonly simple: readonly Action[];
}

/**
 * The units a human may name for the pick the ladder waits on (écart 66),
 * or empty when no pick is pending, when it is not this human's team's, or
 * when the team's round is already the AI's. The Giff of another human of
 * the team is never offered. The one place the interface asks.
 */
export function pickOptions(state: MatchState, humanId: HumanId): Unit[] {
  const pick = pendingPick(state);
  if (!pick || state.delegatedRound[pick.team]) return [];
  if (!state.units.some((u) => u.team === pick.team && u.controller.kind === 'human' && u.controller.humanId === humanId)) {
    return [];
  }
  return pickableUnits(state, pick.team, humanId);
}

/**
 * What a unit could do with its Action, and with its free object interaction,
 * **if it stood on `at`** with both still in hand. The position-dependent half
 * of `legalActions`, split out so the AI's turn plan (2H.9) can ask what a
 * cell would unlock before walking there, from the same code the door reads,
 * rather than growing its own copy of the adjacency, range and sight rules.
 * The economy of the turn, whether the Action or the interaction is still
 * available, is `legalActions`' business and is not read here.
 */
export interface ActionOptions {
  readonly attack: readonly TargetOption[];
  readonly shove: readonly TargetOption[];
  readonly pass: readonly TargetOption[];
  readonly shoot: ShotOption | null;
  readonly batCracker: readonly CrackerOption[];
  readonly catchSpark: CatchOption | null;
  readonly canGrabPayload: boolean;
}

export function actionOptionsAt(
  arena: Arena,
  state: MatchState,
  unit: Unit,
  at: Point,
): ActionOptions {
  const holding = unit.holdingPayload;

  const adjacentEnemies = activeUnits(state).filter(
    (u) => u.team !== unit.team && distance(at, u) === 1,
  );

  const attack: TargetOption[] = holding
    ? []
    : adjacentEnemies.map((target) => ({
        unitId: target.id,
        name: target.name,
        against: statsFor(target.role, target.tier).ac,
        mode: target.dodging ? ('disadvantage' as const) : ('normal' as const),
      }));

  // A player holding the ball can still shove: it is a grapple, not a swing.
  const shove: TargetOption[] = adjacentEnemies.map((target) => {
    const stats = statsFor(target.role, target.tier);
    return {
      unitId: target.id,
      name: target.name,
      against: Math.max(stats.might, stats.agility),
      mode: 'normal' as const,
    };
  });

  // A pass needs range and a line of sight (écart 34). The sight is filtered
  // here so the interface and the AI both see only the throws the door takes.
  const pass: TargetOption[] = holding
    ? activeUnits(state)
        .filter((u) => u.team === unit.team && u.id !== unit.id)
        .flatMap((mate) => {
          const range = throwRange(at, mate);
          if (!range.ok || !hasLineOfSight(arena, at, mate)) return [];
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

  const shoot = holding ? shotOption(arena, state, unit, at) : null;

  // Swinging at a Cracker is a bat swing, so the Payload bars it exactly as it
  // bars an attack on a player.
  const batCracker: CrackerOption[] = holding
    ? []
    : state.crackers
        .filter((c) => c.state === 'live' && distance(at, c) === 1)
        .map((c) => ({ crackerId: c.id, against: CRACKER_AC, directions: openLines(arena, c) }));

  // A carrier never tries for the Spark (écart 57, 2H.11): its hands are
  // full. Human or AI, the door does not offer it, and `reduce` refuses it.
  const catchSpark: CatchOption | null =
    !holding && sparkIsLive(state.spark) && state.spark.x === at.x && state.spark.y === at.y
      ? { against: SPARK_CATCH_DC, mode: 'normal' }
      : null;

  const canGrabPayload =
    state.payload.carriedBy === null && state.payload.x === at.x && state.payload.y === at.y;

  return { attack, shove, pass, shoot, batCracker, catchSpark, canGrabPayload };
}

export function legalActions(arena: Arena, state: MatchState): LegalActions | null {
  const turn = state.turn;
  if (!turn || state.phase === 'finished') return null;

  const unit = state.units.find((u) => u.id === turn.unitId);
  if (!unit || unit.status !== 'active') return null;

  // Écart 58: a human asked its place has that choice and nothing else.
  if (turn.placing != null) {
    const places = Array.from({ length: turn.placing }, (_, i) => i + 1);
    return {
      unitId: unit.id,
      destinations: new Map(),
      attack: [],
      shove: [],
      pass: [],
      shoot: null,
      batCracker: [],
      catchSpark: null,
      canGrabPayload: false,
      canDash: false,
      canDodge: false,
      canDisengage: false,
      canBrace: false,
      choosePlace: places,
      canDelegate: false,
      simple: places.map((place) => ({ kind: 'choosePlace', place })),
    };
  }

  const hasAction = !turn.actionUsed;
  const options = actionOptionsAt(arena, state, unit, unit);

  const attack = hasAction ? options.attack : [];
  const shove = hasAction ? options.shove : [];
  // The pass alone survives the Action after a Shove that took the ball
  // (écart 63, 2H.14): `turn.freePass`. The shot does not.
  const pass = hasAction || turn.freePass ? options.pass : [];
  const shoot = hasAction ? options.shoot : null;
  const batCracker = hasAction ? options.batCracker : [];
  const catchSpark = hasAction ? options.catchSpark : null;
  const canGrabPayload = !turn.objectInteractionUsed && options.canGrabPayload;

  const canBrace = hasAction && unit.role === 'bulwark';

  const simple: Action[] = [{ kind: 'endTurn' }];
  if (hasAction) simple.push({ kind: 'dash' }, { kind: 'dodge' }, { kind: 'disengage' });
  if (canBrace) simple.push({ kind: 'brace' });
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
    canBrace,
    choosePlace: [],
    canDelegate: turn.pickedBy !== null && !turn.delegated,
    simple,
  };
}

/**
 * Whether ending the turn is the only thing left to do.
 *
 * The interface passes a turn on by itself when this is true, so that a player
 * who has moved and acted is not made to click "End turn" at a bar where every
 * other button is dead. It lives here rather than in a React component for the
 * usual reason: it is a statement about what the rules still allow, and the day
 * a new action is added to `LegalActions`, it has to be counted here or the
 * interface will start skipping turns that still had something in them.
 */
export function onlyEndTurnLeft(legal: LegalActions): boolean {
  return (
    legal.destinations.size === 0 &&
    legal.attack.length === 0 &&
    legal.shove.length === 0 &&
    legal.pass.length === 0 &&
    legal.batCracker.length === 0 &&
    legal.shoot === null &&
    legal.catchSpark === null &&
    !legal.canGrabPayload &&
    !legal.canDash &&
    !legal.canDodge &&
    !legal.canDisengage &&
    !legal.canBrace &&
    legal.choosePlace.length === 0
  );
}

/** The d8 faces whose first cell from `at` is open, which is what a bat can send a Cracker down. */
function openLines(arena: Arena, at: Point): number[] {
  return D8_DIRECTIONS.filter((face) => {
    const d = DIRECTIONS[face - 1]!;
    return !arena.isSolid({ x: at.x + d.x, y: at.y + d.y });
  });
}

/** A shot needs a hatch cell in sight and in range (écart 34). */
function shotOption(arena: Arena, state: MatchState, unit: Unit, from: Point): ShotOption | null {
  const furnace = arena.targetFurnaceOf(unit.team);
  const visible = visibleRangeToFurnace(arena, from, furnace);
  if (visible === null) return null;
  const range = throwRangeOver(visible);
  if (!range.ok) return null;

  const keeper = blockingBulwark(state, furnace, furnace.defendedBy);
  return {
    against: shotTarget(keeper),
    mode: range.mode,
    blockedBy: keeper?.id ?? null,
  };
}
