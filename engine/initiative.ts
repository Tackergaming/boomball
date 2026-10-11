/**
 * Building the initiative ladder for one round (écart 51, 2H.7).
 *
 * Decided by Jérôme on 2026-10-10 after his engine 3 game, replacing the
 * counts of the table fiche (20, 15, 10 and a d20 per human) with an **order**:
 *
 *   1. the Spark, when it is on the field;
 *   2. the team with a human on it, before the team that is all AI;
 *   3. the Crackers, right after the team that carries the ball;
 *   4. the other team.
 *
 * "Carries" is read at the top of the round: the carrier's side, or, with the
 * ball loose, the side that carried it last (`lastCarrierTeam`), or nobody at
 * kick-off, in which case the Crackers go last. The ladder is fixed when it is
 * built; a ball that changes hands mid-round does not move it.
 *
 * **Within a team** the roles go Trajector, Strikers, Breakers, Bulwark. A
 * human plays **last** in its role since écart 55 (2H.10, 2026-10-11; it
 * played first under écart 51), so it sees what its AI team-mates of the same
 * role do before it moves; two or three humans of the same role are ordered
 * once, at kick-off, by a d20 rerolled until it separates them. The AI
 * units of a role are ordered **by the situation at the top of the round**, a
 * rule Jérôme accepted in those words: attacking, the carrier first if it is
 * one of them, then from the rearmost to the most advanced, so the ball can
 * climb the whole chain in one round; defending, from the nearest to the enemy
 * carrier outwards, so the first who can swing swings; ball loose, nearest to
 * the ball first. This lives in the engine and not in `ai/` because it is a
 * rule of the ladder, deterministic, and both sides get the same one.
 *
 * With no human on either side, the sides alternate round by round from a die
 * rolled at kick-off (`initiativeNonce`), which keeps a balance sweep
 * symmetric. Both AI sides read the same ordering rule, so a sweep measures the
 * rule and not a bias.
 *
 * The ladder stays a **flat queue of one unit each** and the engine walks it
 * with a single index. `blockId` is kept on the slot for the interface and is
 * null everywhere since écart 51: the order inside a role is the point now,
 * and a rung that hid it would hide the chain.
 */

import type { Arena } from './arena.js';
import { distance } from './geometry.js';
import type { Rng } from './rng.js';
import { rangeToFurnace } from './rules/payload.js';
import type { Role } from './stats.js';
import {
  TEAMS,
  activeUnitsOf,
  isHuman,
  sparkIsLive,
  type MatchState,
  type TeamId,
  type TurnSlot,
  type Unit,
} from './types.js';

/** The order of the roles inside a team's part of the ladder. */
export const ROLE_ORDER: readonly Role[] = ['trajector', 'striker', 'breaker', 'bulwark'];

/**
 * Roll the humans' order within their role. Called once at kick-off; the
 * numbers then hold for the whole match. Two humans of the same side and role
 * who tie are rerolled together until they do not, so the order is always
 * established and never falls to an identifier.
 */
export function rollHumanInitiative(units: readonly Unit[], rng: Rng): Unit[] {
  const rolled = units.map((unit) => ({
    ...unit,
    initiative: isHuman(unit) ? rng.d20() : null,
  }));

  for (const team of TEAMS) {
    for (const role of ROLE_ORDER) {
      const group = rolled.filter((u) => u.team === team && u.role === role && isHuman(u));
      for (let guard = 0; guard < 100 && hasTie(group); guard++) {
        for (const unit of group) {
          const i = rolled.findIndex((u) => u.id === unit.id);
          rolled[i] = { ...rolled[i]!, initiative: rng.d20() };
          unit.initiative = rolled[i]!.initiative;
        }
      }
    }
  }
  return rolled;
}

function hasTie(group: { initiative: number | null }[]): boolean {
  const seen = new Set<number>();
  for (const unit of group) {
    if (unit.initiative === null) continue;
    if (seen.has(unit.initiative)) return true;
    seen.add(unit.initiative);
  }
  return false;
}

/**
 * The ordered slots of one round, first to act first. Rebuilt every round, so
 * evacuated units drop out, returning substitutes drop back in, and the order
 * inside each role follows the board as it stands at the top of the round.
 */
export function buildTurnOrder(arena: Arena, state: MatchState): TurnSlot[] {
  const slots: Omit<TurnSlot, 'rank'>[] = [];

  if (sparkIsLive(state.spark)) {
    slots.push({ actor: { kind: 'spark' }, blockId: null, team: null });
  }

  const [first, second] = sideOrder(state);
  const carrying = carryingSide(state);
  const crackersLive = state.crackers.some((c) => c.state === 'live');
  const crackers: Omit<TurnSlot, 'rank'> = { actor: { kind: 'crackers' }, blockId: null, team: null };

  slots.push(...teamSlots(arena, state, first));
  if (crackersLive && carrying === first) slots.push(crackers);
  slots.push(...teamSlots(arena, state, second));
  if (crackersLive && carrying !== first) slots.push(crackers);

  return slots.map((slot, i) => ({ ...slot, rank: i + 1 }));
}

/**
 * The side that acts first this round. A side with a human on it goes first;
 * with humans on both or on neither, the sides alternate from the kick-off die
 * so that over a sweep each opens round 6, the Spark's round, half the time.
 */
export function sideOrder(state: MatchState): readonly [TeamId, TeamId] {
  const humansOn = (team: TeamId): boolean => activeUnitsOf(state, team).some(isHuman);
  const aHuman = humansOn('A');
  const bHuman = humansOn('B');
  if (aHuman !== bHuman) return aHuman ? ['A', 'B'] : ['B', 'A'];
  return (state.initiativeNonce + state.round) % 2 === 0 ? ['A', 'B'] : ['B', 'A'];
}

/** The side the Crackers follow this round, or null when nobody has had the ball yet. */
function carryingSide(state: MatchState): TeamId | null {
  const carrier = state.payload.carriedBy;
  if (carrier !== null) {
    const unit = state.units.find((u) => u.id === carrier);
    if (unit) return unit.team;
  }
  return state.lastCarrierTeam;
}

function teamSlots(arena: Arena, state: MatchState, team: TeamId): Omit<TurnSlot, 'rank'>[] {
  const units = activeUnitsOf(state, team);
  const out: Omit<TurnSlot, 'rank'>[] = [];

  // The relaunch (écart 54): the side that conceded after its block had gone
  // opens its next round with the keeper, so the fresh ball leaves its hands
  // before anybody else of its side has moved.
  const roles: readonly Role[] =
    state.relaunch === team ? ['bulwark', ...ROLE_ORDER.filter((r) => r !== 'bulwark')] : ROLE_ORDER;

  for (const role of roles) {
    const ofRole = units.filter((u) => u.role === role);
    const humans = ofRole
      .filter(isHuman)
      .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0) || a.id.localeCompare(b.id));
    const ai = orderBySituation(arena, state, team, ofRole.filter((u) => !isHuman(u)));

    // Écart 55 (2H.10, Jérôme after his engine 5 game): a human plays **last**
    // in its role, after every AI of that role on its side, so that it reads
    // what its team-mates of the same role have done before it moves. Two or
    // three humans of the same role keep their kick-off d20 between them.
    for (const unit of [...ai, ...humans]) {
      out.push({ actor: { kind: 'unit', unitId: unit.id }, blockId: null, team });
    }
  }
  return out;
}

/**
 * The AI units of one role, in the order the situation calls for. Attacking:
 * the carrier, then rearmost first, so each can throw to the next up the pitch
 * within the round. Defending: nearest to the enemy carrier first. Ball loose:
 * nearest to it first. Ties fall to the identifier so a replay is identical.
 */
function orderBySituation(arena: Arena, state: MatchState, team: TeamId, units: Unit[]): Unit[] {
  const carrierId = state.payload.carriedBy;
  const carrier = carrierId ? state.units.find((u) => u.id === carrierId) ?? null : null;
  const byId = (a: Unit, b: Unit): number => a.id.localeCompare(b.id);

  if (carrier && carrier.team === team) {
    const target = arena.targetFurnaceOf(team);
    return [...units].sort((a, b) => {
      if (a.id === carrier.id) return -1;
      if (b.id === carrier.id) return 1;
      return rangeToFurnace(b, target) - rangeToFurnace(a, target) || byId(a, b);
    });
  }

  const focus = carrier ?? { x: state.payload.x, y: state.payload.y };
  return [...units].sort((a, b) => distance(a, focus) - distance(b, focus) || byId(a, b));
}

/**
 * The relaunch inside the round of the goal (écart 54, 2H.8, Jérôme's
 * reading): a goal is scored during the scoring side's block, the conceding
 * keeper waits for that block to end, and when its own side's block comes it
 * goes first. When that block is still ahead of the cursor, the ladder of
 * this round is reordered here, the keeper's slot moved to the head of its
 * side's slots and the ranks renumbered. Returns null when the side has
 * already begun or finished its block, in which case the next round's ladder
 * is built with `relaunch` instead, or when the keeper has no slot.
 */
export function promoteBulwark(
  order: readonly TurnSlot[],
  turnIndex: number,
  team: TeamId,
  keeperId: string,
): TurnSlot[] | null {
  const ours = order
    .map((slot, i) => ({ slot, i }))
    .filter(({ slot }) => slot.actor.kind === 'unit' && slot.team === team);
  if (ours.length === 0 || ours[0]!.i <= turnIndex) return null;

  const keeperAt = ours.find(
    ({ slot }) => slot.actor.kind === 'unit' && slot.actor.unitId === keeperId,
  );
  if (!keeperAt) return null;
  if (keeperAt.i === ours[0]!.i) return [...order];

  const without = order.filter((_, i) => i !== keeperAt.i);
  const head = ours[0]!.i;
  const reordered = [...without.slice(0, head), keeperAt.slot, ...without.slice(head)];
  return reordered.map((slot, i) => ({ ...slot, rank: i + 1 }));
}

/**
 * Whether a unit has already taken its turn this round: its slot is behind the
 * cursor. The unit on the clock has not "played" yet in this sense, and a unit
 * with no slot (evacuated after the ladder was built) reads as played, since
 * it will not act. This is what the chain reads before throwing (2H.7): a pass
 * to somebody who has played is a pass that waits a whole round.
 */
export function hasPlayedThisRound(state: MatchState, unitId: string): boolean {
  const at = state.turnOrder.findIndex(
    (slot) => slot.actor.kind === 'unit' && slot.actor.unitId === unitId,
  );
  if (at < 0) return true;
  return at < state.turnIndex;
}

/**
 * The ladder as the interface draws it: consecutive slots sharing a blockId
 * collapse into one rung. Display only, never used to drive resolution. Since
 * écart 51 every slot is its own rung, but the grouping is kept so a future
 * block does not need a new reader.
 */
export function ladderRungs(order: readonly TurnSlot[]): {
  rank: number;
  blockId: string | null;
  unitIds: string[];
  hazard: 'crackers' | 'spark' | null;
}[] {
  const rungs: ReturnType<typeof ladderRungs> = [];

  for (const slot of order) {
    if (slot.actor.kind !== 'unit') {
      rungs.push({ rank: slot.rank, blockId: null, unitIds: [], hazard: slot.actor.kind });
      continue;
    }

    const last = rungs[rungs.length - 1];
    if (last && slot.blockId !== null && last.blockId === slot.blockId) {
      last.unitIds.push(slot.actor.unitId);
    } else {
      rungs.push({ rank: slot.rank, blockId: slot.blockId, unitIds: [slot.actor.unitId], hazard: null });
    }
  }

  return rungs;
}
