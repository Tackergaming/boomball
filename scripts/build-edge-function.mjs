/**
 * Bundles the Edge Functions into the one file each that Deno can actually run.
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
 * the functions changes, and the repo keeps one import convention rather
 * than two.
 *
 * What ships is plain JavaScript, so the deployed artifact is not the file you
 * read. Each `supabase/functions/<slug>/index.ts` stays the source of truth and
 * the thing to edit; its `dist/index.js` is generated and gitignored.
 *
 * The Supabase client stays a URL import and is **not** bundled. It is marked
 * external so Deno fetches it at deploy time, which is how Edge Functions are
 * meant to get their dependencies and what keeps these artifacts to the size of
 * our own code.
 *
 *     npm run build:function              # both
 *     node scripts/build-edge-function.mjs resolve-action
 */

import { build } from 'esbuild';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const FUNCTIONS = ['resolve-action', 'create-match'];

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export function bundlePathFor(slug) {
  return join(root, 'supabase', 'functions', slug, 'dist', 'index.js');
}

export async function bundle(slug) {
  const functionDir = join(root, 'supabase', 'functions', slug);
  const outfile = bundlePathFor(slug);

  await mkdir(dirname(outfile), { recursive: true });
  await build({
    entryPoints: [join(functionDir, 'index.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    // Neutral rather than 'node': Deno Edge has no Node built-ins to fall back
    // on, and this makes esbuild say so at build time, not at request time.
    platform: 'neutral',
    external: ['https://*'],
    banner: {
      js: [
        '// GENERATED FILE, do not edit.',
        `// Built from supabase/functions/${slug}/index.ts by`,
        '// scripts/build-edge-function.mjs. Edit the TypeScript, run',
        '// `npm run build:function`, deploy that.',
      ].join('\n'),
    },
  });

  const { size } = await stat(outfile);
  return { slug, outfile, size };
}

/** Only when run directly, so the deploy script can import the bundler. */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const wanted = process.argv.slice(2);
  const slugs = wanted.length > 0 ? wanted : FUNCTIONS;
  for (const slug of slugs) {
    if (!FUNCTIONS.includes(slug)) {
      console.error(`no such function: ${slug}. Known: ${FUNCTIONS.join(', ')}`);
      process.exit(1);
    }
    const { size, outfile } = await bundle(slug);
    console.log(`${slug} bundled: ${(size / 1024).toFixed(1)} kb -> ${outfile}`);
  }
}
