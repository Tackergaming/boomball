/**
 * The pure part of the account (2H.32): which team the hub opens on, and the
 * roll with each player listed once. Out of `useAccount.ts` so vitest can load
 * it without the Supabase client, which refuses to be imported without its
 * environment.
 */

import type { Member, Team } from './useAccount.js';

/**
 * Which of the player's teams to show: the remembered one if they are still
 * on it, else the one they own, else the first joined.
 */
export function pickTeam(teams: readonly Team[], userId: string, remembered: string | null): Team | null {
  if (teams.length === 0) return null;
  return (
    teams.find((team) => team.id === remembered) ??
    teams.find((team) => team.owner === userId) ??
    teams[0]!
  );
}

/**
 * One line per player. `battery_members` lists the owner from `teams` and then
 * every `team_members` row, and the owner has a row of their own once the lobby
 * has remembered their seat (2H.32): the same player came back twice, which
 * React reported as a duplicate key. The owner's line keeps its flag and takes
 * the role and name their row remembers.
 */
export function mergeRoll(rows: readonly Member[]): Member[] {
  const byId = new Map<string, Member>();
  for (const row of rows) {
    const seen = byId.get(row.profile_id);
    if (!seen) {
      byId.set(row.profile_id, row);
      continue;
    }
    byId.set(row.profile_id, {
      ...seen,
      is_owner: seen.is_owner || row.is_owner,
      preferred_role: seen.preferred_role ?? row.preferred_role,
      character_name: seen.character_name ?? row.character_name,
    });
  }
  return [...byId.values()];
}
