/**
 * Kick-off. Turns a match request into the starting `MatchState`.
 *
 * Humans are always on team A and always play together: this is a co-op sport
 * against the house, never a human against a human. Any starting slot no human
 * claimed is filled by AI, which is what makes solo a real mode rather than a
 * degraded one.
 */

import { Arena, type ArenaSpec, type TeamId } from './arena.js';
import { BENCH_SIZE } from './constants.js';
import { buildTurnOrder, rollHumanInitiative } from './initiative.js';
import { drawNames } from './names.js';
import { Rng } from './rng.js';
import { crackerKickoffCells } from './rules/ordnance.js';
import { TEAM_COMPOSITION, statsFor, type Role, type Tier } from './stats.js';
import type { Cracker, MatchState, Unit } from './types.js';

export interface HumanSeat {
  readonly humanId: string;
  readonly role: Role;
  /** Chosen by the player at the lobby. Blank falls back to the name pool. */
  readonly name?: string;
}

export interface MatchSetup {
  readonly arena: ArenaSpec;
  /** Both teams field the same Tier: the house always matches the players. */
  readonly tier: Tier;
  /** Zero to three, all on team A. Zero means a self-play balance run. */
  readonly humans: readonly HumanSeat[];
  readonly seed: number;
}

export const MAX_HUMANS = 3;

export function createMatch(setup: MatchSetup): MatchState {
  const arena = new Arena(setup.arena);
  const rng = new Rng(setup.seed);

  assertSeatsAreFillable(setup.humans);

  const units = nameUnits(
    [...buildTeam(setup, 'A', setup.humans), ...buildTeam(setup, 'B', [])],
    rng,
  );

  const ordnance = setup.arena.ordnanceStart;
  if (!arena.isOccupiable(ordnance)) {
    throw new Error(`arena ${setup.arena.id} drops its ordnance on solid terrain`);
  }

  // One beside each edge post of the halfway line, never on the ball, never
  // on a player (écart 46). The ball lies loose at the centre at kick-off.
  const payload = { carriedBy: null, x: ordnance.x, y: ordnance.y };
  const crackers: Cracker[] = crackerKickoffCells(arena, units, payload, rng).map((cell, i) => ({
    id: `cracker-${i + 1}`,
    x: cell.x,
    y: cell.y,
    state: 'live' as const,
    respawnOnRound: null,
  }));

  // Which side wins initiative ties in round 1, alternating from there. One die
  // for the whole match, taken before the human counts so the tie-break cannot
  // depend on what the humans rolled.
  const initiativeNonce = rng.int(2);

  const state: MatchState = {
    arenaId: setup.arena.id,
    round: 1,
    phase: 'playing',
    turnOrder: [],
    turnIndex: 0,
    turn: null,
    units: rollHumanInitiative(units, rng),
    payload,
    lastCarrierTeam: null,
    penaltyBox: { A: null, B: null },
    relaunch: null,
    crackers,
    // The Spark stays off the field until the start of round 6.
    spark: { state: 'pending', x: ordnance.x, y: ordnance.y, heading: null },
    score: { A: 0, B: 0 },
    bench: { A: BENCH_SIZE, B: BENCH_SIZE },
    rngSeed: rng.seed,
    initiativeNonce,
    result: null,
  };

  return { ...state, turnOrder: buildTurnOrder(arena, state) };
}

/**
 * Humans pick their role, so two of them may both want to be Striker (there
 * are three) but only one can be the Bulwark or the Trajector.
 */
function assertSeatsAreFillable(humans: readonly HumanSeat[]): void {
  if (humans.length > MAX_HUMANS) {
    throw new Error(`a team seats at most ${MAX_HUMANS} humans, got ${humans.length}`);
  }

  const seen = new Set<string>();
  for (const seat of humans) {
    if (seen.has(seat.humanId)) throw new Error(`duplicate human ${seat.humanId}`);
    seen.add(seat.humanId);
  }

  for (const role of new Set(humans.map((h) => h.role))) {
    const wanted = humans.filter((h) => h.role === role).length;
    const available = TEAM_COMPOSITION.filter((r) => r === role).length;
    if (wanted > available) {
      throw new Error(`a team fields ${available} ${role}(s), but ${wanted} were claimed`);
    }
  }
}

/**
 * Fills in every unit a player did not name. Drawn in one pass over both teams
 * so no two players on the field share a name, and so a name a human typed for
 * themselves is kept off the pool.
 */
function nameUnits(units: readonly Unit[], rng: Rng): Unit[] {
  const chosen = units.map((u) => u.name).filter((name) => name.length > 0);
  const needed = units.length - chosen.length;
  const pool = drawNames(needed, rng, chosen);

  let next = 0;
  return units.map((unit) => (unit.name ? unit : { ...unit, name: pool[next++]! }));
}

function buildTeam(
  setup: MatchSetup,
  team: TeamId,
  humans: readonly HumanSeat[],
): Unit[] {
  const seats = [...humans];
  const starts = setup.arena.starts[team];

  // The Bulwark first, because the arena lists its Furnace-side cell first.
  const roles = [...TEAM_COMPOSITION].sort(
    (a, b) => Number(b === 'bulwark') - Number(a === 'bulwark'),
  );

  return roles.map((role, index) => {
    const seatIndex = seats.findIndex((s) => s.role === role);
    const seat = seatIndex >= 0 ? seats.splice(seatIndex, 1)[0] : undefined;

    const cell = starts[index];
    if (!cell) throw new Error(`arena ${setup.arena.id} has no start cell ${index} for team ${team}`);

    const stats = statsFor(role, setup.tier);

    return {
      id: `${team}-${role}-${index + 1}`,
      // Left blank here and filled by nameUnits, which needs to see the whole
      // field at once to keep every name on it distinct.
      name: seat?.name?.trim() ?? '',
      team,
      role,
      tier: setup.tier,
      controller: seat ? { kind: 'human', humanId: seat.humanId } : { kind: 'ai' },
      x: cell.x,
      y: cell.y,
      hp: stats.hp,
      maxHp: stats.hp,
      holdingPayload: false,
      reactionAvailable: true,
      dodging: false,
      braced: false,
      status: 'active',
      evacuatedOnRound: null,
      initiative: null,
    };
  });
}
