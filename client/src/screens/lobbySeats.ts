/**
 * The pure part of the shared lobby (2H.32, `00` C32 points 3 and 4), kept out
 * of `Lobby.tsx` so vitest can load it without the Supabase client, which
 * refuses to be imported without its environment.
 */

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
