/**
 * Building the initiative ladder for one round.
 *
 * The table fiche groups enemy NPCs into two blocks so a match stays fast. It
 * says nothing about AI team-mates, because at Jérôme's table they did not
 * exist. Two structures therefore live here, and they exist for two different
 * jobs.
 *
 * **A team with humans on it** rolls individual initiative for each human, and
 * its remaining AI units resolve as one block placed immediately after the last
 * human. That ordering is deliberate: an order posted to a team-mate during a
 * human turn is carried out in the same round, which is the whole reason the
 * order channel is worth having in solo.
 *
 * **A team with no humans** uses the enemy structure instead, fast group on 15
 * and slow group on 10. That makes an AI against AI match perfectly symmetric,
 * which is the only way the thousand-run balance sweeps mean anything.
 *
 * A block is not a slot. The ladder stays a **flat queue of one unit each**, so
 * the engine walks it with a single index and has no nested cursor to lose.
 * Units of the same block share a `blockId`, which is all the interface needs
 * to draw them as one rung.
 */

import { INITIATIVE_ENEMY_FAST, INITIATIVE_ENEMY_SLOW } from './constants.js';
import type { Rng } from './rng.js';
import { statsFor } from './stats.js';
import {
  SLOT_PRIORITY,
  TEAMS,
  activeUnitsOf,
  isHuman,
  sparkIsLive,
  type MatchState,
  type TeamId,
  type TurnSlot,
  type Unit,
} from './types.js';

/** Roles that move on the fast count when a team resolves in blocks. */
const FAST_ROLES = new Set(['striker', 'trajector']);

/**
 * Roll initiative for the humans of a match. Called once at kick-off; the
 * numbers then hold for the whole match, as they do at a table.
 */
export function rollHumanInitiative(units: readonly Unit[], rng: Rng): Unit[] {
  return units.map((unit) => {
    if (!isHuman(unit)) return { ...unit, initiative: null };
    const agility = statsFor(unit.role, unit.tier).agility;
    return { ...unit, initiative: rng.d20() + agility };
  });
}

/**
 * The ordered slots of one round, highest count first. Rebuilt every round, so
 * evacuated units drop out and returning substitutes drop back in on their own.
 */
export function buildTurnOrder(state: MatchState): TurnSlot[] {
  const slots: TurnSlot[] = [];

  if (state.crackers.some((c) => c.state === 'live')) {
    slots.push({
      count: 20,
      priority: SLOT_PRIORITY.crackers,
      actor: { kind: 'crackers' },
      blockId: null,
    });
  }

  if (sparkIsLive(state.spark)) {
    slots.push({
      count: 10,
      priority: SLOT_PRIORITY.spark,
      actor: { kind: 'spark' },
      blockId: null,
    });
  }

  for (const team of TEAMS) slots.push(...teamSlots(state, team));

  return sortSlots(slots);
}

function teamSlots(state: MatchState, team: TeamId): TurnSlot[] {
  const units = activeUnitsOf(state, team);
  if (units.length === 0) return [];

  const humans = units.filter(isHuman);
  if (humans.length === 0) {
    return [
      ...groupSlots(team, 'fast', INITIATIVE_ENEMY_FAST, units.filter((u) => FAST_ROLES.has(u.role))),
      ...groupSlots(team, 'slow', INITIATIVE_ENEMY_SLOW, units.filter((u) => !FAST_ROLES.has(u.role))),
    ];
  }

  const slots: TurnSlot[] = humans.map((unit) => ({
    count: unit.initiative ?? 0,
    priority: SLOT_PRIORITY.units,
    actor: { kind: 'unit' as const, unitId: unit.id },
    blockId: null,
  }));

  // Immediately after the last human, so orders given this round land this
  // round. Clamped at zero: a human who rolls a 1 with a low agility bonus must
  // not push the block off the bottom of the ladder.
  const allies = units.filter((u) => !isHuman(u));
  const lastHuman = Math.min(...humans.map((u) => u.initiative ?? 0));
  slots.push(...groupSlots(team, 'allies', Math.max(0, lastHuman - 1), allies));

  return slots;
}

function groupSlots(
  team: TeamId,
  label: string,
  count: number,
  units: readonly Unit[],
): TurnSlot[] {
  if (units.length === 0) return [];
  const blockId = `${team}-${label}`;
  return units.map((unit) => ({
    count,
    priority: SLOT_PRIORITY.units,
    actor: { kind: 'unit' as const, unitId: unit.id },
    blockId,
  }));
}

/**
 * Highest count first, then the fixed within-count priority, then a stable key
 * so the ladder is identical on every replay of the same state.
 */
function sortSlots(slots: TurnSlot[]): TurnSlot[] {
  return [...slots].sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return actorKey(a).localeCompare(actorKey(b));
  });
}

function actorKey(slot: TurnSlot): string {
  switch (slot.actor.kind) {
    case 'crackers':
      return 'crackers';
    case 'spark':
      return 'spark';
    case 'unit':
      return `${slot.blockId ?? ''}:${slot.actor.unitId}`;
  }
}

/**
 * The ladder as the interface draws it: consecutive slots sharing a blockId
 * collapse into one rung. Display only, never used to drive resolution.
 */
export function ladderRungs(order: readonly TurnSlot[]): {
  count: number;
  blockId: string | null;
  unitIds: string[];
  hazard: 'crackers' | 'spark' | null;
}[] {
  const rungs: ReturnType<typeof ladderRungs> = [];

  for (const slot of order) {
    if (slot.actor.kind !== 'unit') {
      rungs.push({ count: slot.count, blockId: null, unitIds: [], hazard: slot.actor.kind });
      continue;
    }

    const last = rungs[rungs.length - 1];
    if (last && slot.blockId !== null && last.blockId === slot.blockId) {
      last.unitIds.push(slot.actor.unitId);
    } else {
      rungs.push({
        count: slot.count,
        blockId: slot.blockId,
        unitIds: [slot.actor.unitId],
        hazard: null,
      });
    }
  }

  return rungs;
}
