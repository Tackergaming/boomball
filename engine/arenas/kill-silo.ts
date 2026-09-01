/**
 * The Kill-Silo, the only arena of the MVP.
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
    // ---- Zone 3, The Summit. Both Furnaces, lanterns, suspended platforms.
    '.......|.......', // 44  ceiling
    '.......|.......', // 43
    '.......|.......', // 42
    '.......|.......', // 41
    '.......|.......', // 40
    '#....##|##....#', // 39  Furnace hatches, upper suspended platform
    '#......|......#', // 38  Furnace hatches
    '#####..|..#####', // 37  the broad catwalk under each Furnace
    '.......|.......', // 36
    '.......|.......', // 35
    '.......|.......', // 34
    '.....##|##.....', // 33  lower suspended platform
    '.......|.......', // 32
    '.......|.......', // 31
    '.......|.......', // 30
    // ---- Zone 2, The Scramble. Main battleground, no floor and no ceiling.
    '.......|.......', // 29
    '.......|.......', // 28
    '####...|...####', // 27
    '.......|.......', // 26
    '...|.|.|.|.|...', // 25  the four hanging hooks, plus the central chain
    '.......|.......', // 24
    '#####..|..#####', // 23
    '.......|.......', // 22  kick-off: Payload and both Crackers drop here
    '.......|.......', // 21
    '.......|.......', // 20
    '#####..|..#####', // 19
    '.......|.......', // 18
    '.......|.......', // 17
    '.......|.......', // 16
    '.......|.......', // 15
    // ---- Zone 1, The Trench. The floor and the furnace pit.
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
    '.......|.......', // 1
    '.......|.......', // 0   the deck, and the pit at its centre
  ],

  furnaces: [
    {
      defendedBy: 'A',
      cells: [
        { x: 0, y: 39 },
        { x: 0, y: 38 },
      ],
    },
    {
      defendedBy: 'B',
      cells: [
        { x: 14, y: 39 },
        { x: 14, y: 38 },
      ],
    },
  ],

  ordnanceStart: { x: 7, y: 22 },

  starts: {
    // The Bulwark first, then the six other starters. Team A holds the left
    // wall of The Scramble, team B the right, both perched on the catwalks.
    A: [
      { x: 1, y: 38 },
      { x: 1, y: 20 },
      { x: 2, y: 20 },
      { x: 3, y: 20 },
      { x: 1, y: 24 },
      { x: 2, y: 24 },
      { x: 3, y: 24 },
    ],
    B: [
      { x: 13, y: 38 },
      { x: 13, y: 20 },
      { x: 12, y: 20 },
      { x: 11, y: 20 },
      { x: 13, y: 24 },
      { x: 12, y: 24 },
      { x: 11, y: 24 },
    ],
  },

  substituteEntry: {
    A: { x: 1, y: 36 },
    B: { x: 13, y: 36 },
  },

  art: {
    0: 'assets/arena/zone-1-trench.jpeg',
    1: 'assets/arena/zone-2-scramble.jpeg',
    2: 'assets/arena/zone-3-summit.jpeg',
  },
};
