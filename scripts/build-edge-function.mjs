/**
 * Bundles `resolve-action` into the one file Deno can actually run.
 *
 * The obstacle this exists for: the engine imports its own modules as
 * `./types.js` while the files on disk are `.ts`. That is the TypeScript
 * convention the whole repo is built on, it is what lets `tsc` and vitest agree
 * on module identity, and **Deno does not resolve it**. Deno wants the
 * specifier to name a file that exists, so an Edge Function importing
 * `../../../engine/arena.ts` dies on the first transitive `./types.js`.
 *
 * esbuild does resolve it, because it applies TypeScript's own rule that a
 * `.js` specifier in a `.ts` file may mean the `.ts` file next to it. So the
 * fix is a bundle and not a rewrite: nothing in `engine`, `ai`, `server` or in
 * `index.ts` changes, and the repo keeps one import convention rather than two.
 *
 * What ships is plain JavaScript, so the deployed artifact is not the file you
 * read. `supabase/functions/resolve-action/index.ts` stays the source of truth
 * and the thing to edit; `dist/index.js` is generated and gitignored.
 *
 * The Supabase client stays a URL import and is **not** bundled. It is marked
 * external so Deno fetches it at deploy time, which is how Edge Functions are
 * meant to get their dependencies and what keeps this artifact to the size of
 * our own code.
 *
 *     npm run build:function
 */

import { build } from 'esbuild';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const functionDir = join(root, 'supabase', 'functions', 'resolve-action');
const outfile = join(functionDir, 'dist', 'index.js');

await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [join(functionDir, 'index.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  // Neutral rather than 'node': Deno Edge has no Node built-ins to fall back on,
  // and this makes esbuild say so at build time instead of at request time.
  platform: 'neutral',
  external: ['https://*'],
  banner: {
    js: [
      '// GENERATED FILE, do not edit.',
      '// Built from supabase/functions/resolve-action/index.ts by',
      '// scripts/build-edge-function.mjs. Edit the TypeScript, run',
      '// `npm run build:function`, deploy this.',
    ].join('\n'),
  },
});

const { size } = await stat(outfile);
console.log(`resolve-action bundled: ${(size / 1024).toFixed(1)} kb -> ${outfile}`);
