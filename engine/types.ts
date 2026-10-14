/**
 * The shape of a match in progress.
 *
 * `MatchState` is the whole truth of a game. It is plain data, it is cloned
 * rather than mutated, and it carries its own RNG seed so that a match replays
 * byte for byte from the same starting state and the same sequence of actions.
 */

import type { TeamId } from './arena.js';
import type { Point } from './geometry.js';
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
  /**
   * Set by the Bulwark's Brace action (écart 52, 2H.7): a Shove against this
   * unit rolls at disadvantage and minus three. Holds until this unit's next
   * turn begins, and drops the moment it moves.
   */
  readonly braced: boolean;

  readonly status: 'active' | 'evacuated';
  /** The round this unit dropped to 0 HP, which starts the substitute delay. */
  readonly evacuatedOnRound: number | null;

  /**
   * Rolled at kick-off for human-controlled units only: a d20 that orders the
   * humans of the same side and role, rerolled on a tie (écart 51).
   */
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
   * `pending` until the start of round 6, `live` on the pitch. A catch puts it
   * back to `pending`: since écart 50 (2H.7, Jérôme's retour 5 on the engine 3
   * game) a caught Spark drops back in at the top of the next round, worth as
   * much again, instead of being gone for good. Before that there was a third
   * state, `caught`, whose whole job was to stop exactly that.
   */
  readonly state: 'pending' | 'live';
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
  /**
   * Position on the ladder, 1 first. Since écart 51 (2H.7) the ladder is an
   * order and not a count: the Spark, the side with a human, the Crackers
   * after the side that carries, the other side. See `engine/initiative.ts`.
   */
  readonly rank: number;
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
  /**
   * Set on a human's slot once it has chosen its place in its role this
   * round (écart 58), so the ladder does not ask twice. The ladder is rebuilt
   * every round, which clears it.
   */
  readonly placed?: true;
}

/**
 * The economy of the turn in progress. Rebuilt each time a unit starts a turn
 * and thrown away when it ends, so nothing here can leak into the next player.
 */
export interface TurnState {
  readonly unitId: UnitId;
  /**
   * The cell the unit stood on when the turn opened (écart 56, 2H.10). No
   * rule of play reads it: the AI prices a throw on the ground gained since
   * the turn began, whatever step it is on, and the match dump says where a
   * turn started. Engine version 6.
   */
  readonly startedAt: Point;
  readonly movementFeetRemaining: number;
  readonly actionUsed: boolean;
  readonly objectInteractionUsed: boolean;
  /** Disengage holds for this turn only, so it lives here and not on the unit. */
  readonly disengaged: boolean;
  /**
   * Écart 58 (2H.12, engine version 7): set while a human is choosing its
   * place in its role, to the number of places offered (2 or 3). The turn
   * has not begun: no `turnStarted`, no stance lapsed, and the only action
   * is `choosePlace`. Null in every turn that is being played.
   */
  readonly placing: number | null;
  /**
   * Whether this turn's Action went into a shot at the Furnace (2H.13, `00`
   * C15 point 3, engine version 8). No rule reads it: the AI uses it so a
   * shooter does not walk back onto its own rebound while a team-mate still
   * to play could take it.
   */
  readonly shot: boolean;
  /**
   * Écart 63 (2H.14, engine version 9, Jérôme on 2026-10-14): a Shove that
   * took the Payload off a carrier leaves the shover one pass for the rest of
   * its turn, from wherever its movement takes it, with the Action already
   * spent. One pass, never a shot. `applyShove` sets it, `applyPass` spends
   * it, and a turn that ends without throwing loses it.
   */
  readonly freePass: boolean;
}

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
  /**
   * The last side to hold the ball, kept so the Crackers can follow the
   * carrying side on the ladder when the ball is loose at the top of a round
   * (écart 51). Null until somebody picks it up.
   */
  readonly lastCarrierTeam: TeamId | null;
  /**
   * The penalty box (écart 53, 2H.8), keyed by the team that **defends** the
   * mouth: the last round through which the other side is barred from the
   * cells in front of it, or null when it is open. Set by a goal, read by
   * every route and forced move, cleared at the top of the round after it
   * lapses. See `rules/box.ts`.
   */
  readonly penaltyBox: Readonly<Record<TeamId, number | null>>;
  /**
   * The side whose Bulwark goes first in its next block (écart 54, 2H.8):
   * set by a goal when the conceding side has already played this round, so
   * the next ladder is built with the keeper at the head of that side, then
   * cleared. Null otherwise. When that side has not played yet, the ladder
   * of the current round is reordered on the spot instead and this stays
   * null.
   */
  readonly relaunch: TeamId | null;
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
