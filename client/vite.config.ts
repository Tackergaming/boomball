import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const boomball = fileURLToPath(new URL('..', import.meta.url));

/**
 * The client, which lives beside the engine rather than importing a copy of it.
 *
 * `legalActions` is the one generator that feeds both the AI and the interface,
 * so the action bar has to reach into `../engine`. Vite's dev server refuses to
 * serve files outside its root unless told, hence `fs.allow`. esbuild, which
 * Vite transpiles with, applies TypeScript's `./types.js` to `types.ts` rule,
 * which is the same reason the Edge Functions are bundled with it.
 *
 * The client never calls `reduce`. It reads what is legal, it sends an
 * intention, and it replays the events that come back. Resolving anything here
 * would be a second door into the rules.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: [boomball] },
  },
  build: {
    // Desktop only, and the arena art is already 2048px: no point shipping a
    // build target older than what runs those.
    target: 'es2022',
  },
});
