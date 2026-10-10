/**
 * The shape of a match in progress.
 *
 * `MatchState` is the whole truth of a game. It is plain data, it is cloned
 * rather than mutated, and it carries its own RNG seed so that a match replays
 * byte for byte from the same starting state and the same sequence of actions.
 */

import type { TeamId } from './arena.js';
import type { Role, Tier } from './stats.js';

export type { TeamId };

export type UnitId = string;
export type HumanId = string;

export const TEAMS: readonly TeamId[] = ['A', 'B'];

export function opposingTeam(team: TeamId): TeamId {
  return team === 'A' ? 'B' : 'A';
}

// -- Units ------------------------------------------------------------------

export type Controller = { readonly kind: 'human'; readonly humanId: HumanId } | { readonly kind: 'ai' };

export interface Unit {
  readonly id: UnitId;
  /**
   * What the table calls this player. A human types their own at the lobby and
   * keeps it on their account; everyone else is drawn from the Giff name pool.
   * Never derived from the role, and never shown as an id.
   */
  readonly name: string;
  readonly team: TeamId;
  readonly role: Role;
  readonly tier: Tier;
  readonly controller: Controller;

  readonly x: number;
  readonly y: number;

  readonly hp: number;
  readonly maxHp: number;

  readonly holdingPayload: boolean;
  readonly reactionAvailable: boolean;
  /** Set by the Dodge action. Holds until this unit's next turn begins. */
  readonly dodging: boolean;

  readonly status: 'active' | 'evacuated';
  /** The round this unit dropped to 0 HP, which starts the substitute delay. */
  readonly evacuatedOnRound: number | null;

  /** Rolled at kick-off for human-controlled units only. */
  readonly initiative: number | null;
}

// -- Ordnance ---------------------------------------------------------------

export interface Payload {
  /** Null when the ball is loose on the field. */
  readonly carriedBy: UnitId | null;
  readonly x: number;
  readonly y: number;
}

export interface Cracker {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly state: 'live' | 'destroyed';
  /** Set when destroyed: the round its replacement drops in. */
  readonly respawnOnRound: number | null;
}

export interface Spark {
  /**
   * `pending` until the start of round 6, `caught` for good once somebody has
   * a hand on it. Three states rather than a flag because catching it no
   * longer ends the match: a spent Spark has to be told apart from one that
   * has not arrived, or it would drop back in at the top of the next round.
   */
  readonly state: 'pending' | 'live' | 'caught';
  readonly x: number;
  readonly y: number;
  /**
   * The d8 face it is travelling on, kept from one round to the next and
   * changed only by a bounce. Null while it is pending. A heading rerolled
   * every round is a heading nobody can play around, which is what made the
   * Spark a lottery ticket rather than an objective.
   */
  readonly heading: number | null;
}

/** On the field and still there to be had. */
export function sparkIsLive(spark: Spark): boolean {
  return spark.state === 'live';
}

// -- Turn order -------------------------------------------------------------

/**
 * Who acts in one slot of the initiative ladder. A block resolves as a single
 * slot: every unit in it takes its turn back to back, which is what keeps a
 * fourteen unit match from making a human wait through thirteen separate turns.
 */
export type TurnActor =
  | { readonly kind: 'crackers' }
  | { readonly kind: 'spark' }
  | { readonly kind: 'unit'; readonly unitId: UnitId };

export interface TurnSlot {
  /** The initiative count, shown on the ladder in the interface. */
  readonly count: number;
  /**
   * Order within the same count. The Crackers detonate before anyone moves,
   * and the Spark darts before the slow enemy block that shares its count.
   */
  readonly priority: number;
  readonly actor: TurnActor;
  /**
   * Units that resolve back to back as one rung of the ladder share a blockId.
   * The ladder stays a flat queue for the engine, which has no nested cursor to
   * lose, while the interface groups by this field to draw the rung.
   */
  readonly blockId: string | null;
  /**
   * The side this slot belongs to, null for the two hazards. Read by the sort
   * to break ties between slots that share a count, which is the whole of the
   * initiative fairness question when both teams resolve on the same numbers.
   */
  readonly team: TeamId | null;
}

/**
 * The economy of the turn in progress. Rebuilt each time a unit starts a turn
 * and thrown away when it ends, so nothing here can leak into the next player.
 */
export interface TurnState {
  readonly unitId: UnitId;
  readonly movementFeetRemaining: number;
  readonly actionUsed: boolean;
  readonly objectInteractionUsed: boolean;
  /** Disengage holds for this turn only, so it lives here and not on the unit. */
  readonly disengaged: boolean;
}

export const SLOT_PRIORITY = { crackers: 0, spark: 1, units: 2 } as const;

// -- The match ---------------------------------------------------------------

export type MatchPhase = 'playing' | 'suddenDeath' | 'finished';

export type MatchResult = { readonly winner: TeamId } | { readonly winner: 'draw' };

export interface MatchState {
  readonly arenaId: string;
  readonly round: number;
  readonly phase: MatchPhase;

  readonly turnOrder: readonly TurnSlot[];
  /** Index into `turnOrder`. Equal to its length when the round is spent. */
  readonly turnIndex: number;
  /** Null between turns and while a hazard slot resolves. */
  readonly turn: TurnState | null;

  readonly units: readonly Unit[];
  readonly payload: Payload;
  readonly crackers: readonly Cracker[];
  readonly spark: Spark;

  readonly score: Readonly<Record<TeamId, number>>;
  /** Substitutes left on the bench. */
  readonly bench: Readonly<Record<TeamId, number>>;

  readonly rngSeed: number;
  /**
   * Which side goes first among slots sharing an initiative count, alternating
   * every round from this starting value. Rolled once at kick-off and never
   * again: see `sortSlots` in `initiative.ts` for why it is a die and not a
   * fixed rule.
   */
  readonly initiativeNonce: number;
  readonly result: MatchResult | null;
}

// -- Lookups ----------------------------------------------------------------

export function unitById(state: MatchState, id: UnitId): Unit {
  const unit = state.units.find((u) => u.id === id);
  if (!unit) throw new Error(`no unit with id ${id}`);
  return unit;
}

/** Units still on the field. Evacuated players are not in play. */
export function activeUnits(state: MatchState): Unit[] {
  return state.units.filter((u) => u.status === 'active');
}

export function activeUnitsOf(state: MatchState, team: TeamId): Unit[] {
  return activeUnits(state).filter((u) => u.team === team);
}

export function unitAt(state: MatchState, x: number, y: number): Unit | undefined {
  return activeUnits(state).find((u) => u.x === x && u.y === y);
}

export function isHuman(unit: Unit): boolean {
  return unit.controller.kind === 'human';
}
