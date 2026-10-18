/**
 * Whether a Realtime channel the server closed is worth opening again
 * (2H.37, security review m4). Pure, so it is tested; `useLobbyChannel` is
 * the only caller.
 *
 * Until 2H.37 every `CLOSED`, `CHANNEL_ERROR` or `TIMED_OUT` reopened the
 * lobby channel a second later, forever. Harmless while the channels were
 * public. On a private channel a player the owner removed is refused the
 * join, and would have knocked on the door every second for the whole
 * evening. Two bounds: a refusal of authorisation is final, and anything else
 * is retried `REOPEN_LIMIT` times per lobby, no more.
 */

/** How many times a closed channel is opened again before the client gives up on this lobby. */
export const REOPEN_LIMIT = 5;

/**
 * Realtime answers a join it refuses with an error whose reason names the
 * missing permission; realtime-js joins the fields of that reply into the
 * error's message. This reads it, loosely, so a wording change on the server
 * costs a few vain retries and not a silent lobby.
 */
export function isAuthorisationRefusal(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /unauthori[sz]|permission|not allowed|forbidden/i.test(message);
}

/**
 * `attempts` is how many reopenings this lobby has already made. True when one
 * more is due: the error is not a refusal and the limit is not reached.
 */
export function shouldReopen(attempts: number, error: unknown): boolean {
  if (isAuthorisationRefusal(error)) return false;
  return attempts < REOPEN_LIMIT;
}
