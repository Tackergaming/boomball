/**
 * The Kill-Silo, the only arena of the MVP.
 *
 * **The pitch runs top to bottom.** One Furnace in the floor of The Trench, one
 * in the ceiling of The Summit, forty-four cells apart, and a team has to cross
 * the whole shaft to score. Both used to sit in Zone 3, fourteen cells apart on
 * the same catwalk, and the consequence was measured over 120 matches: from
 * round 6 onward ninety per cent of the units and ninety per cent of the ball
 * were in Zone 3 and stayed there. Two goals at the same end make one end the
 * whole sport. Every other sport, Quidditch included, puts them at opposite
 * ends for exactly this reason.
 *
 * **So the axis of fairness is up/down, not left/right.** The layout is an
 * exact mirror about y = 22: `rows[i] === rows[44 - i]`, held by an assertion in
 * `setup.test.ts`. That is the only thing guaranteeing neither side has the
 * better half, and it replaces the left/right symmetry the phase 0 checklist
 * asked for back when the pitch ran across the shaft.
 *
 * PROVISIONAL LAYOUT. This is a hand-built terrain that respects what the three
 * generated images actually show, at the level of "wall trusses run the full
 * height, catwalks project at these heights, one chain hangs dead centre". It
 * is not yet a pixel trace. When the three images are final and mirrored, the
 * rows below get retraced against them cell by cell and this notice comes off.
 *
 * Rows are written top first, y = 44 down to y = 0.
 * Zone 3 The Summit is rows 44..30, Zone 2 The Scramble 29..15, Zone 1 The
 * Trench 14..0.
 */

import type { ArenaSpec } from '../arena.js';

export const KILL_SILO: ArenaSpec = {
  id: 'kill-silo',
  name: 'The Kill-Silo',

  rows: [
    // ---- Zone 3, The Summit. Team B's Furnace, in the ceiling.
    '......###......', // 44  Furnace B: the hatch, dead centre in the roof
    '.......|.......', // 43  the chain, and B's goalkeeper in front of the mouth
    '.......|.......', // 42
    '.......|.......', // 41
    '####...|...####', // 40
    '.......|.......', // 39
    '.......|.......', // 38
    '#####..|..#####', // 37
    '.......|.......', // 36
    '.......|.......', // 35
    '.......|.......', // 34
    '####...|...####', // 33
    '.......|.......', // 32
    '.......|.......', // 31
    '.......|.......', // 30
    // ---- Zone 2, The Scramble. Midfield: one catwalk per half, hooks on the
    //      halfway line. No floor and no ceiling.
    '.......|.......', // 29
    '.......|.......', // 28
    '.......|.......', // 27
    '#####..|..#####', // 26  B's half: the six field players line up above it
    '.......|.......', // 25  B's kick-off line
    '.......|.......', // 24
    '.......|.......', // 23
    '...|.|.|.|.|...', // 22  halfway: the four hanging hooks. Payload and both
    //                          Crackers drop on the chain at (7, 22)
    '.......|.......', // 21
    '.......|.......', // 20
    '.......|.......', // 19  A's kick-off line
    '#####..|..#####', // 18  A's half
    '.......|.......', // 17
    '.......|.......', // 16
    '.......|.......', // 15
    // ---- Zone 1, The Trench. Team A's Furnace, the pit in the floor.
    '.......|.......', // 14
    '.......|.......', // 13
    '.......|.......', // 12
    '####...|...####', // 11
    '.......|.......', // 10
    '.......|.......', // 9
    '.......|.......', // 8
    '#####..|..#####', // 7
    '.......|.......', // 6
    '.......|.......', // 5
    '####...|...####', // 4
    '.......|.......', // 3
    '.......|.......', // 2
    '.......|.......', // 1   the chain, and A's goalkeeper in front of the mouth
    '......###......', // 0   Furnace A: the pit, dead centre in the deck
  ],

  // Three cells wide instead of two, because the pitch is now forty-four cells
  // long instead of fourteen and a mouth has to be findable from the far end.
  // `rangeToFurnace` takes the minimum over the cells, so a wider mouth is a
  // marginally easier target, which is the intent.
  furnaces: [
    {
      defendedBy: 'A',
      cells: [
        { x: 6, y: 0 },
        { x: 7, y: 0 },
        { x: 8, y: 0 },
      ],
    },
    {
      defendedBy: 'B',
      cells: [
        { x: 6, y: 44 },
        { x: 7, y: 44 },
        { x: 8, y: 44 },
      ],
    },
  ],

  ordnanceStart: { x: 7, y: 22 },

  starts: {
    // The Bulwark first, because `setup.ts` assigns it the first cell and
    // `score()` reads that same cell as where a fresh Payload lands when the
    // goalkeeper is off the field. It stands in its own goal mouth: one cell
    // from the hatch, inside `BULWARK_BLOCK_RANGE_CELLS`.
    //
    // Then the six field players, in their own half, above their own catwalk.
    // Not *on* it: y18 and y26 are structure. Each of those cells touches the
    // catwalk or the central chain, so all six start anchored.
    A: [
      { x: 7, y: 1 },
      { x: 2, y: 19 },
      { x: 4, y: 19 },
      { x: 6, y: 19 },
      { x: 8, y: 19 },
      { x: 10, y: 19 },
      { x: 12, y: 19 },
    ],
    B: [
      { x: 7, y: 43 },
      { x: 2, y: 25 },
      { x: 4, y: 25 },
      { x: 6, y: 25 },
      { x: 8, y: 25 },
      { x: 10, y: 25 },
      { x: 12, y: 25 },
    ],
  },

  // Beside its own goal mouth, off the goalkeeper's cell.
  substituteEntry: {
    A: { x: 5, y: 1 },
    B: { x: 5, y: 43 },
  },

  art: {
    0: 'assets/arena/zone-1-trench.jpeg',
    1: 'assets/arena/zone-2-scramble.jpeg',
    2: 'assets/arena/zone-3-summit.jpeg',
  },
};
