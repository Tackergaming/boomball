/**
 * The CORS headers both functions answer with, and the preflight they have to
 * survive before a browser will send anything at all.
 *
 * **This is the defect that made the client unplayable**, and it is worth
 * writing down because nothing in the project could have caught it. A browser
 * asking for `POST` with an `Authorization` header sends an `OPTIONS`
 * preflight first; Supabase's gateway lets that through unsigned even with
 * `verify_jwt` on, so it arrives here, and both functions used to answer it
 * `405 POST only` with no `Access-Control-Allow-Origin` in sight. The browser
 * then refuses to send the real request and rejects the `fetch` with a bare
 * `TypeError`. In the lobby that showed up as a button stuck on "Loading the
 * silo" forever, with no error anywhere.
 *
 * `scripts/live-match.ts` plays whole matches through these same functions and
 * never saw it: Node does not do preflights. Only a browser does.
 *
 * **Why the origin is `*` and not the app's domain.** Nothing here is
 * authenticated by anything a browser attaches on its own. The identity is the
 * JWT in the `Authorization` header, no request is sent with
 * `credentials: 'include'`, and no cookie is read. A page on another origin
 * cannot obtain a player's token, which lives in the local storage of the app's
 * own origin, so all a wildcard buys an attacker is the 401 these functions
 * give anyone unsigned. What it buys us is not redeploying two functions every
 * time the front end moves, Vercel preview URLs included.
 */

export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  // `apikey` and `authorization` are what the client sends; `x-client-info`
  // rides along whenever a call goes through supabase-js rather than `fetch`.
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
  // A day, so a player clicking through a match pays for the preflight once.
  'access-control-max-age': '86400',
};

/**
 * The preflight answer, or null when the request is a real one. Call it first
 * in the handler: an `OPTIONS` must never reach the `POST only` refusal, which
 * is a correct answer to the wrong question.
 */
export function preflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
