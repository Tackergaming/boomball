/**
 * Runs a TypeScript script that imports the engine.
 *
 * Node 24 strips types on its own, but it will not resolve a `./types.js`
 * specifier onto the `types.ts` file beside it, which is the convention every
 * module in `engine`, `ai` and `server` is written in. Same obstacle as the
 * Edge Function, same answer: hand it to esbuild, which does apply that rule.
 *
 * Vitest already covers the tests, so this is only for the one-off scripts that
 * have to talk to the network and therefore do not belong in the suite.
 *
 *     node scripts/run-ts.mjs scripts/live-match.ts [args...]
 */

import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const entry = process.argv[2];
if (!entry) {
  console.error('usage: node scripts/run-ts.mjs <script.ts> [args...]');
  process.exit(1);
}

const dir = await mkdtemp(join(tmpdir(), 'boomball-run-'));
const outfile = join(dir, 'script.mjs');

try {
  await build({
    entryPoints: [resolve(entry)],
    outfile,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'node',
    // Anything from node_modules stays where it is; only our own TypeScript
    // needs the `.js` to `.ts` resolution that this wrapper exists for.
    packages: 'external',
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(dir, { recursive: true, force: true });
}
