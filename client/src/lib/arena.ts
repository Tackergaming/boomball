/**
 * The arena, as the client needs it: the terrain to draw and the art to draw it
 * on.
 *
 * **The terrain is `KILL_SILO.rows` and never the picture.** The images are
 * finished art laid underneath a grid; a column that looks solid in the JPEG
 * and is walkable in the layout is walkable, and the layout wins every time.
 * That is the whole reason the arena has an ASCII form at all.
 *
 * The client imports the arena from the engine rather than reading the `arenas`
 * row, even though the row exists. The row is the mirror kept for anything that
 * cannot import the engine; this client already imports `legalActions`, so
 * fetching a second copy of the same terrain over the network would only create
 * a way for the two to disagree. `server/arenaRow.test.ts` holds them equal.
 */

import zone1 from '../../../assets/arena/zone-1-trench.jpeg';
import zone2 from '../../../assets/arena/zone-2-scramble.jpeg';
import zone3 from '../../../assets/arena/zone-3-summit.jpeg';

import { Arena } from '../../../engine/arena.js';
import { KILL_SILO } from '../../../engine/arenas/kill-silo.js';
import { ARENA_HEIGHT, ARENA_WIDTH, ZONE_HEIGHT } from '../../../engine/constants.js';

export const arena = new Arena(KILL_SILO);
export const spec = KILL_SILO;

export { ARENA_HEIGHT, ARENA_WIDTH };

/** Zone 1 is the floor, zone 3 the roof, and `y` counts up from the floor. */
export const ZONE_ART: Record<number, string> = { 1: zone1, 2: zone2, 3: zone3 };

/** Which zone a height falls in. 1 at the bottom, 3 at the top. */
export function zoneOf(y: number): number {
  return Math.min(3, Math.max(1, Math.floor(y / ZONE_HEIGHT) + 1));
}

/** The band of rows a zone covers, top row first, the way the grid is drawn. */
export function rowsOfZone(zone: number): { topY: number; bottomY: number } {
  const bottomY = (zone - 1) * ZONE_HEIGHT;
  return { topY: bottomY + ZONE_HEIGHT - 1, bottomY };
}
