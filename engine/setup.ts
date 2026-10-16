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

/**
 * The battery's fixed roster (2H.29, `00` C30 point 3): one name per slot of
 * team A, keyed by `slotKey`, drawn once at the battery's first match and kept
 * on the team for ever. Jérôme: « je veux que mon bulwark soit toujours le
 * même gars ». A slot a human sits in that match wears the human's name
 * instead; the roster name comes back when the human plays another role.
 */
export type Roster = Readonly<Record<string, string>>;

export interface MatchSetup {
  readonly arena: ArenaSpec;
  /** Both teams field the same Tier: the house always matches the players. */
  readonly tier: Tier;
  /** Zero to three, all on team A. Zero means a self-play balance run. */
  readonly humans: readonly HumanSeat[];
  readonly seed: number;
  /** Team A's standing names by slot. Absent (self-play, old matches): drawn from the pool as before. */
  readonly roster?: Roster;
}

export const MAX_HUMANS = 3;

/**
 * The key of the k-th unit of a role on a team, 1-based in composition order:
 * `striker-1` to `striker-3`, `breaker-1`, `breaker-2`, `bulwark-1`,
 * `trajector-1`. Stable as long as `TEAM_COMPOSITION` is, which is the rule.
 */
export function slotKey(role: Role, k: number): string {
  return `${role}-${k}`;
}

/** The seven slot keys of a team, in composition order. */
export function rosterSlots(): string[] {
  const seen = new Map<Role, number>();
  return TEAM_COMPOSITION.map((role) => {
    const k = (seen.get(role) ?? 0) + 1;
    seen.set(role, k);
    return slotKey(role, k);
  });
}

/**
 * Draws a battery's roster: seven distinct names, none in `taken` (the names
 * its humans go by), one per slot. Called once per battery, by `create-match`
 * at its first match, with the match's own RNG.
 */
export function drawRoster(rng: Rng, taken: Iterable<string> = []): Roster {
  const slots = rosterSlots();
  const names = drawNames(slots.length, rng, taken);
  return Object.fromEntries(slots.map((slot, i) => [slot, names[i]!]));
}

/**
 * Two names on the same side that read the same, or null. A human who names
 * themselves after a roster team-mate is refused by the lobby with this; the
 * engine throws on it, as a backstop, because two Quills make the ladder
 * unreadable.
 */
export function nameCollision(names: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) return name.trim();
    seen.add(key);
  }
  return null;
}

export function createMatch(setup: MatchSetup): MatchState {
  const arena = new Arena(setup.arena);
  const rng = new Rng(setup.seed);

  assertSeatsAreFillable(setup.humans);

  const sides = [...buildTeam(setup, 'A', setup.humans), ...buildTeam(setup, 'B', [])];
  const clash = nameCollision(sides.map((u) => u.name));
  if (clash) throw new Error(`two units on the field would be called ${clash}`);
  const units = nameUnits(sides, rng);

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
  // The k-th unit of each role, for the roster's slot key (2H.29).
  const kOf = new Map<Role, number>();

  return roles.map((role, index) => {
    const seatIndex = seats.findIndex((s) => s.role === role);
    const seat = seatIndex >= 0 ? seats.splice(seatIndex, 1)[0] : undefined;
    const k = (kOf.get(role) ?? 0) + 1;
    kOf.set(role, k);

    const cell = starts[index];
    if (!cell) throw new Error(`arena ${setup.arena.id} has no start cell ${index} for team ${team}`);

    const stats = statsFor(role, setup.tier);

    // A human's own name first; then, on team A, the battery's standing name
    // for this slot (2H.29, C30 point 3); else blank, and nameUnits fills it
    // from the pool, seeing the whole field at once to keep every name distinct.
    const standing = team === 'A' && !seat ? setup.roster?.[slotKey(role, k)] : undefined;

    return {
      id: `${team}-${role}-${index + 1}`,
      name: seat?.name?.trim() || standing?.trim() || '',
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
