/**
 * The pure part of the shared lobby (2H.32, `00` C32 points 3 and 4), kept out
 * of `Lobby.tsx` so vitest can load it without the Supabase client, which
 * refuses to be imported without its environment. Since 2H.34 it also holds
 * the pure part of the hub: the ladder, the code's two readings, the line that
 * names who is waiting in the lobby.
 */

import { TIER_WINS_STAR, TIER_WINS_VETERAN } from '../../../engine/constants.js';
import { TEAM_COMPOSITION, type Role, type Tier } from '../../../engine/stats.js';
import type { SeatRequest } from '../lib/supabase-types.js';

/** What one present member tells the others about their seat. */
export interface Seat {
  readonly profileId: string;
  readonly displayName: string;
  /** The Giff's name, blank for the house to name. */
  readonly name: string;
  readonly role: Role;
  readonly ready: boolean;
  readonly owner: boolean;
  /** The league, carried by the owner's seat only, so the others can read it. */
  readonly tier?: Tier;
}

export const ROLES: readonly Role[] = ['striker', 'breaker', 'bulwark', 'trajector'];

/** How many of a role a side fields. */
export const fielded = (role: Role): number => TEAM_COMPOSITION.filter((x) => x === role).length;

/**
 * The roles still open to `me`, given who else holds what: a role whose places
 * the others have all taken is closed. Two humans may share a role the
 * composition allows (Jérôme, 2026-10-17).
 */
export function openRoles(others: readonly Seat[]): Role[] {
  return ROLES.filter((role) => others.filter((seat) => seat.role === role).length < fielded(role));
}

/**
 * Whether the owner may start: their own seat is on the channel, and every
 * other present member has said they are ready. The owner alone may start
 * at once, as in solo.
 */
export function canStart(seats: readonly Seat[], ownerId: string): boolean {
  if (!seats.some((seat) => seat.profileId === ownerId)) return false;
  return seats.filter((seat) => seat.profileId !== ownerId).every((seat) => seat.ready);
}

/** The seats as `create-match` wants them, the owner first. */
export function seatRequests(seats: readonly Seat[]): SeatRequest[] {
  return [...seats]
    .sort((a, b) => Number(b.owner) - Number(a.owner) || a.profileId.localeCompare(b.profileId))
    .map((seat) => ({ profileId: seat.profileId, role: seat.role, characterName: seat.name.trim() }));
}

// -- 2H.34, the team interface ------------------------------------------------

/** How many places of `role` are left for me, the others' seats taken off what a side fields. */
export function openCount(role: Role, others: readonly Seat[]): number {
  return Math.max(0, fielded(role) - others.filter((seat) => seat.role === role).length);
}

/**
 * The cards of the bench, left to right: my own seat first, then the others
 * present, the owner first and then by name, so a card does not jump about
 * when presence syncs in a different order.
 */
export function benchOrder(everyone: readonly Seat[], mine: Seat): Seat[] {
  const others = everyone
    .filter((seat) => seat.profileId !== mine.profileId)
    .sort(
      (a, b) =>
        Number(b.owner) - Number(a.owner) ||
        a.displayName.localeCompare(b.displayName) ||
        a.profileId.localeCompare(b.profileId),
    );
  return [mine, ...others];
}

/** "1 named seat", "2 named seats". */
export const namedSeats = (count: number): string => `${count} named ${count === 1 ? 'seat' : 'seats'}`;

/** The hub's line about who is waiting in the lobby, null when nobody is. */
export function alreadyInLobby(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  const list =
    names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]!}`;
  return `${list} ${names.length === 1 ? 'is' : 'are'} already in the lobby`;
}

/** The four-and-four reading of an invite code: `KX7M4Q2A` shows as `KX7M · 4Q2A`. */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)} · ${code.slice(4)}`;
}

/** What a player typed as a code, as `join_team` reads it: no dashes, no spaces, upper case. */
export const cleanCode = (typed: string): string => typed.replace(/[-\s]/g, '').toUpperCase();

/** The league's name as the screens wear it. */
export const tierName = (tier: Tier): string => tier[0]!.toUpperCase() + tier.slice(1);

/** Where each Tier starts, mirroring the generated column on `teams`. */
export const LADDER: readonly { tier: Tier; at: number }[] = [
  { tier: 'rookie', at: 0 },
  { tier: 'veteran', at: TIER_WINS_VETERAN },
  { tier: 'star', at: TIER_WINS_STAR },
];

export interface Ladder {
  /** The Tier these wins reach. */
  readonly tier: Tier;
  /** The next Tier and the wins it opens at, null at the top. */
  readonly next: { tier: Tier; at: number } | null;
  /** One rung per win between this Tier and the next, true when won; all won at the top. */
  readonly rungs: readonly boolean[];
}

/** How far up the ladder a team's wins are, for the hub's three rungs. */
export function ladderOf(wins: number): Ladder {
  const index = LADDER.reduce((reached, step, i) => (wins >= step.at ? i : reached), 0);
  const here = LADDER[index]!;
  const next = LADDER[index + 1] ?? null;
  if (!next) {
    const below = LADDER[index - 1]!;
    return { tier: here.tier, next: null, rungs: Array.from({ length: here.at - below.at }, () => true) };
  }
  const span = next.at - here.at;
  return { tier: here.tier, next, rungs: Array.from({ length: span }, (_, i) => i < wins - here.at) };
}
