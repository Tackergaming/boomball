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
 * **A team played whole** (écart 66, 2H.41, engine version 12) has no names
 * on its rungs: it gets one **pick** per active unit, and when the ladder
 * reaches a pick a human of the team says which of its units still to play
 * acts now. The side's place on the ladder is unchanged; its inside order is
 * its humans' to decide, so écarts 55, 58, 62 and 65 do not apply to it.
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
  playsWhole,
  sparkIsLive,
  type MatchState,
  type TeamId,
  type TurnSlot,
  type Unit,
} from './types.js';

/** The order of the roles inside a team's part of the ladder. */
export const ROLE_ORDER: readonly Role[] = ['trajector', 'striker', 'breaker', 'bulwark'];

/**
 * The order of the side that conceded, for its relaunch (écart 62, 2H.13,
 * Jérôme on 2026-10-14): Trajector and Strikers first, so they can come back
 * within a throw of the keeper, then the keeper, who throws at once, then the
 * Breakers. It replaces écart 54's keeper-first.
 */
export const RELAUNCH_ORDER: readonly Role[] = ['trajector', 'striker', 'bulwark', 'breaker'];

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

  // Écart 66 (2H.41): a team played whole gets one pick per active unit and
  // no names. Its humans decide the order rung by rung; écarts 55, 58, 62
  // and 65 are suspended for it, so neither the relaunch order nor the
  // d20 applies here. A whole team with nobody left to pick for it (every
  // human yielded) is laddered seat by seat like any AI side.
  if (playsWhole(state, team)) {
    for (let i = 0; i < units.length; i++) out.push({ actor: { kind: 'pick', team }, blockId: null, team });
    return out;
  }

  // The relaunch (écart 54, reordered by écart 62): the side that conceded
  // after its block had gone plays its next round Trajector, Strikers,
  // keeper, Breakers, so the fresh ball finds somebody within a throw.
  const roles: readonly Role[] = state.relaunch === team ? RELAUNCH_ORDER : ROLE_ORDER;

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
    // Since écart 58 (2H.12) this is only where a human Striker or Breaker
    // starts the round: when its role's first turn comes, it is asked its
    // place (`placementAt`, `placeHuman`), and the last is what it gets when
    // it does not choose.
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
export function orderBySituation(arena: Arena, state: MatchState, team: TeamId, units: Unit[]): Unit[] {
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
 * reading; order changed by écart 62, 2H.13): a goal is scored during the
 * scoring side's block, and when the conceding side's block is still wholly
 * ahead of the cursor, it is reordered here into `RELAUNCH_ORDER`, the keeper
 * moved to just before its side's first Breaker, the ranks renumbered.
 * Returns null when the side has already begun its block, in which case the
 * round finishes as it stands (Jérôme, 2026-10-14: "on finit le round
 * normalement") and the next round's ladder is built with `relaunch`; or when
 * the keeper has no slot.
 */
export function promoteBulwark(
  order: readonly TurnSlot[],
  turnIndex: number,
  team: TeamId,
  keeperId: string,
  units: readonly Unit[] = [],
): TurnSlot[] | null {
  const ours = order
    .map((slot, i) => ({ slot, i }))
    .filter(({ slot }) => slot.actor.kind === 'unit' && slot.team === team);
  if (ours.length === 0 || ours[0]!.i <= turnIndex) return null;

  const keeperAt = ours.find(
    ({ slot }) => slot.actor.kind === 'unit' && slot.actor.unitId === keeperId,
  );
  if (!keeperAt) return null;

  const roleOf = (slot: TurnSlot): Role | null => {
    if (slot.actor.kind !== 'unit') return null;
    const id = slot.actor.unitId;
    return units.find((u) => u.id === id)?.role ?? null;
  };
  const firstBreaker = ours.find(({ slot }) => roleOf(slot) === 'breaker');
  // Before the first Breaker of the side, or at the end of the side's block
  // when it has none left; already there, nothing to do.
  const target = firstBreaker ? firstBreaker.i : ours[ours.length - 1]!.i + 1;
  if (keeperAt.i === target || keeperAt.i + 1 === target) return [...order];

  const without = order.filter((_, i) => i !== keeperAt.i);
  const at = keeperAt.i < target ? target - 1 : target;
  const reordered = [...without.slice(0, at), keeperAt.slot, ...without.slice(at)];
  return reordered.map((slot, i) => ({ ...slot, rank: i + 1 }));
}

// -- The human's place in its role (écart 58, 2H.12) --------------------------

/**
 * The roles in which a human chooses its place each round. The Trajector and
 * the Bulwark are alone in theirs.
 */
export const PLACE_ROLES: readonly Role[] = ['striker', 'breaker'];

/**
 * The slot indices of the role block the slot at `index` belongs to: the run
 * of consecutive unit slots of the same side and role around it. The ladder
 * builds each role of a side in one run (`teamSlots`), and neither the
 * relaunch nor a placement breaks a run.
 */
function roleBlock(state: MatchState, index: number): number[] {
  const unitOfSlot = (i: number): Unit | null => {
    const slot = state.turnOrder[i];
    if (!slot || slot.actor.kind !== 'unit') return null;
    const id = slot.actor.unitId;
    return state.units.find((u) => u.id === id) ?? null;
  };
  const anchor = unitOfSlot(index);
  if (!anchor) return [];
  const same = (i: number): boolean => {
    const u = unitOfSlot(i);
    return u !== null && u.team === anchor.team && u.role === anchor.role;
  };
  let start = index;
  while (start > 0 && same(start - 1)) start--;
  const out: number[] = [];
  for (let i = start; i < state.turnOrder.length && same(i); i++) out.push(i);
  return out;
}

/**
 * Whether the ladder, about to open the turn at `index`, must first ask a
 * human its place in its role (écart 58, Jérôme on 2026-10-12): the slot is
 * the first turn of a Striker or Breaker block that holds a human who has
 * not chosen this round, and at least two places are on offer. Returns the
 * human and the number of places, or null.
 *
 * **Several humans of one role (écart 65, 2H.33, Jérôme on 2026-10-17):**
 * the first of them at the kick-off d20 is asked, and the others take the
 * places right behind it (`placeHumans`), so the places on offer are those
 * that leave room behind: the active units of the block minus the other
 * humans. Three Strikers with two humans: first or second. Two Breakers both
 * human, or three Strikers all human: one order only, no popup.
 */
export function placementAt(state: MatchState, index: number): { unitId: string; places: number } | null {
  const block = roleBlock(state, index);
  if (block.length < 2) return null;
  // Écart 66: a whole team orders itself by its picks and is never asked a place.
  const anchor = state.turnOrder[block[0]!]!;
  if (anchor.team !== null && playsWhole(state, anchor.team)) return null;
  const units = block.map((i) => {
    const slot = state.turnOrder[i]!;
    const id = (slot.actor as { unitId: string }).unitId;
    return { slot, unit: state.units.find((u) => u.id === id)! };
  });
  if (!PLACE_ROLES.includes(units[0]!.unit.role)) return null;
  // In block order, which is the d20 order for humans (`teamSlots`).
  const humans = units.filter((u) => isHuman(u.unit) && u.unit.status === 'active');
  if (humans.length === 0) return null;
  const first = humans[0]!;
  if (first.slot.placed) return null;
  // Only before the block has begun: nobody of it is behind the cursor.
  if (block[0]! < index && units.slice(0, block.indexOf(index)).some((u) => u.unit.status === 'active')) return null;
  const active = units.filter((u) => u.unit.status === 'active').length;
  const places = active - (humans.length - 1);
  return places >= 2 ? { unitId: first.unit.id, places } : null;
}

/**
 * Écart 65: the first human placed at `place` of its role block, as
 * `placeHuman` does, then every other active human of the block moved to
 * right behind it, in their d20 order, all marked as placed. With one human
 * this is `placeHuman`.
 */
export function placeHumans(state: MatchState, index: number, unitId: string, place: number, mark = true): TurnSlot[] {
  const unitOf = (slot: TurnSlot): Unit | null =>
    slot.actor.kind === 'unit' ? state.units.find((u) => u.id === (slot.actor as { unitId: string }).unitId) ?? null : null;
  const others = roleBlock(state, index)
    .map((i) => state.turnOrder[i]!)
    .filter((slot) => {
      const unit = unitOf(slot);
      return unit !== null && unit.id !== unitId && isHuman(unit) && unit.status === 'active';
    })
    .map((slot) => (slot.actor as { unitId: string }).unitId);

  let order = placeHuman(state, index, unitId, place, mark);
  let after = order.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === unitId);
  if (after < 0) return order;
  for (const id of others) {
    const at = order.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === id);
    if (at < 0) continue;
    const slot: TurnSlot = mark ? { ...order[at]!, placed: true } : order[at]!;
    const without = order.filter((_, i) => i !== at);
    // Removing a slot before the anchor shifts the anchor back by one.
    const insertAt = at < after ? after : after + 1;
    order = [...without.slice(0, insertAt), slot, ...without.slice(insertAt)];
    after = insertAt;
  }
  return order.map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * The ladder with the human's slot moved to `place` of its role block,
 * counted among the units still on the field, and marked as placed: place 1
 * at the cursor, place 2 right after the first active AI of the block, and
 * so on. The AI keep their order by the situation. Ranks are renumbered.
 * Unmarked (`mark` false) while the human is being asked: its slot only sits
 * at the cursor so that the slot on the clock is the turn's unit.
 */
export function placeHuman(state: MatchState, index: number, unitId: string, place: number, mark = true): TurnSlot[] {
  const order = state.turnOrder;
  const at = order.findIndex((s) => s.actor.kind === 'unit' && s.actor.unitId === unitId);
  if (at < 0) return [...order];
  const slot: TurnSlot = mark ? { ...order[at]!, placed: true } : order[at]!;
  const without = order.filter((_, i) => i !== at);
  const rest: MatchState = { ...state, turnOrder: without };
  // The block, from the cursor on, without the human.
  const block = roleBlock(rest, index).filter((i) => i >= index);
  let insertAt = index;
  let passed = 0;
  for (const i of block) {
    if (passed >= place - 1) break;
    const id = (without[i]!.actor as { unitId: string }).unitId;
    const unit = state.units.find((u) => u.id === id);
    insertAt = i + 1;
    if (unit && unit.status === 'active') passed++;
  }
  const placed = [...without.slice(0, insertAt), slot, ...without.slice(insertAt)];
  return placed.map((s, i) => ({ ...s, rank: i + 1 }));
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
  if (at >= 0) return at < state.turnIndex;
  // Écart 66: a unit of a whole team has no slot of its own until it is
  // picked. While a pick of its side is still ahead, it may yet play.
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || unit.status !== 'active') return true;
  return !pickAhead(state, unit.team);
}

/** Whether a pick of the side sits at or after the cursor this round (écart 66). */
export function pickAhead(state: MatchState, team: TeamId): boolean {
  return state.turnOrder.some(
    (slot, i) => i >= state.turnIndex && slot.actor.kind === 'pick' && slot.actor.team === team,
  );
}

/**
 * The units a pick of `team` may name (écart 66): active, and without a
 * slot of their own this round, which a unit gets by being picked. In role
 * order, then by identifier, which is the order the pick row lists them in.
 * With `humanId`, the Giff of another human is left out: it is its own
 * human's to play, and nobody else's (`00` C41 point 4).
 */
export function pickableUnits(state: MatchState, team: TeamId, humanId: string | null = null): Unit[] {
  const named = new Set(
    state.turnOrder.flatMap((slot) => (slot.actor.kind === 'unit' ? [slot.actor.unitId] : [])),
  );
  return activeUnitsOf(state, team)
    .filter((u) => !named.has(u.id))
    .filter((u) => humanId === null || u.controller.kind !== 'human' || u.controller.humanId === humanId)
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.id.localeCompare(b.id),
    );
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
  /** A pick (écart 66) is drawn as a rung with no unit named yet. */
  hazard: 'crackers' | 'spark' | 'pick' | null;
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
