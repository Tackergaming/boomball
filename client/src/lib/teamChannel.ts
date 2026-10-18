/**
 * The team's own Realtime channel (2H.34): `team:<teamId>`, broadcast only,
 * **private since 2H.37** (security review M3).
 *
 * Jérôme's first coop evening, 2026-10-17: a friend joined his team by code and
 * his hub never showed it, because the hub read the roll once at load and
 * nothing told it the roll had changed. Since 2H.34 every write to a team's
 * roll is followed by one `roll` message on this channel, and `useAccount`
 * re-reads the roll of the chosen team when it hears it.
 *
 * Until 2H.37 the client sent that message itself, over REST, because the
 * joiner and the leaver are not on the team's channel when they write. On a
 * private channel neither of them is allowed to speak at that moment: the
 * joiner is not a member yet when the request leaves, the leaver no longer is.
 * So the database speaks instead, from triggers on `team_members` and on
 * `teams.invite_code` (migration 0015), through `realtime.send`. No client
 * writes on `team:*` any more; `useAccount` only listens, with `private: true`.
 */

export const teamTopic = (teamId: string): string => `team:${teamId}`;

/** The one event: the roll (members, code) of this team changed, re-read it. */
export const ROLL_EVENT = 'roll';
