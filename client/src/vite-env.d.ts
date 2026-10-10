/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** '1' exposes `window.__boomball` on the match screen. Development only. */
  readonly VITE_BOOMBALL_HOOK?: string;
  /** '1' stops the client knocking when the turn clock runs out. Development only. */
  readonly VITE_BOOMBALL_PATIENT?: string;
}

interface Window {
  /** Present only when the dev server runs with `VITE_BOOMBALL_HOOK=1`. */
  __boomball?: import('./match/testHook.js').BoomballHook;
}
