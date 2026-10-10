/**
 * The two development-only switches the screen harness relies on.
 *
 * Both are read under `import.meta.env.DEV`, so a production build evaluates
 * them to `false` at compile time and drops everything behind them. Neither
 * can be turned on from a deployed bundle, whatever the environment says.
 *
 * They are set in the environment of the dev server, not in a file, because
 * the only process that wants them is Playwright's `webServer`
 * (`e2e/playwright.config.ts`). From PowerShell, for a hand-driven session:
 *
 *     $env:VITE_BOOMBALL_HOOK='1'; $env:VITE_BOOMBALL_PATIENT='1'; npm run dev
 */

/** Exposes `window.__boomball` so a script can read the board and act on it. */
export const HOOK_ENABLED: boolean =
  import.meta.env.DEV && import.meta.env.VITE_BOOMBALL_HOOK === '1';

/**
 * Stops the client knocking when the turn clock reaches zero.
 *
 * The server only expires a turn when the next request arrives, and in solo
 * nobody else sends one, so with this on a script may take as long as it likes
 * between two actions. The clock is still displayed and the server still rules
 * on the deadline when the action lands.
 */
export const PATIENT: boolean =
  import.meta.env.DEV && import.meta.env.VITE_BOOMBALL_PATIENT === '1';
