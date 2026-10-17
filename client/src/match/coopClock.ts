/**
 * The clock as the other seats read it (2H.33, `00` C32 point 5), pure.
 *
 * Every seated human's client shows the clock of whoever is on it, and knocks
 * at the door once the deadline is five seconds gone, so that a team-mate
 * whose laptop went to sleep cannot hold the match: the server settles the
 * expiry on the next request, whoever sends it. The five seconds are the
 * player's own: their client knocks at the deadline, and its request must be
 * the one that lands first when both are awake.
 */

/** How long after the deadline a team-mate knocks, in milliseconds. */
export const TEAMMATE_KNOCK_GRACE_MS = 5_000;

/**
 * Whether a team-mate's client should knock now. `deadline` is the server's
 * stamp, `skew` how far this browser's clock is behind it (`useMatch.skew`),
 * `now` this browser's clock.
 */
export function teammateKnockDue(deadline: number | null, skew: number, now: number): boolean {
  if (deadline === null) return false;
  return now + skew >= deadline + TEAMMATE_KNOCK_GRACE_MS;
}

/** Seconds left on somebody else's clock, never below zero, or null without a deadline. */
export function secondsLeft(deadline: number | null, skew: number, now: number): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - (now + skew)) / 1000));
}

/** "1:12" for 72 seconds. */
export function clockText(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
