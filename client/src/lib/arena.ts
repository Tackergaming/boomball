/**
 * The arena, as the client needs it: the terrain to draw.
 *
 * **The terrain is `KILL_SILO.rows` and nothing else.** Since D11 the pitch is
 * laid horizontal and seen from above, and there is no picture under the grid
 * any more: what the board draws is the layout, cell by cell, so there is no
 * scenery that could disagree with the ground.
 *
 * The client imports the arena from the engine rather than reading the `arenas`
 * row, even though the row exists. The row is the mirror kept for anything that
 * cannot import the engine; this client already imports `legalActions`, so
 * fetching a second copy of the same terrain over the network would only create
 * a way for the two to disagree. `server/arenaRow.test.ts` holds them equal.
 */

import { Arena } from '../../../engine/arena.js';
import { KILL_SILO } from '../../../engine/arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH, THIRD_LENGTH } from '../../../engine/constants.js';

export const arena = new Arena(KILL_SILO);
export const spec = KILL_SILO;

export { ARENA_HEIGHT, ARENA_WIDTH, THIRD_LENGTH };
