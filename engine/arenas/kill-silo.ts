/**
 * The Kill-Silo, the only arena of the MVP.
 *
 * **A missile silo laid on its side**, by nostalgia for Bombara, the Giff
 * homeworld (decision D11 and arbitrage J3, 2026-10-10). Seen from above: a
 * tube fifteen cells across and forty-five long, a Furnace mouth in each end
 * wall, crates and pillars on the floor between them. Nobody flies, nobody
 * falls, nobody pays to cross a line; a unit runs, and goes round what is in
 * the way.
 *
 * **The axis of fairness is y.** The layout is an exact mirror about y = 22:
 * `rows[i] === rows[44 - i]`, held by an assertion in `setup.test.ts`. That is
 * the only thing guaranteeing neither side has the better half.
 *
 * **The layout is the first draft of `docs/08-plan-terrain-horizontal.md` §3**,
 * accepted by Jérôme on 2026-10-10 to start with, and measured the same day: 58
 * obstacle cells outside the mouths, 8.6 % of the pitch; no straight open
 * column from the halfway line to a mouth, so a shot is set up rather than
 * taken from distance; no open cell with fewer than three open neighbours, so
 * no dead ends. It is game design, so it is his: the sweep judges a layout in
 * two minutes and the rows below change in one.
 *
 * Rows are written top first, y = 44 down to y = 0. The thirds, named for the
 * feed and for the Spark's entry only, are y = 30..44 (B's end), 15..29 (the
 * middle) and 0..14 (A's end).
 */

import type { ArenaSpec } from '../arena.js';

export const KILL_SILO: ArenaSpec = {
  id: 'kill-silo',
  name: 'The Kill-Silo',

  rows: [
    '......###......', // 44  Furnace B: the mouth of the tube
    '...............', // 43  B's goalkeeper stands here, in front of the mouth
    '...............', // 42
    '...............', // 41  the keeper's clearance
    '...............', // 40  B's kick-off line
    '...##.....##...', // 39  the two posts
    '...##.....##...', // 38
    '...............', // 37
    '...............', // 36
    '......###......', // 35  the crate in front of the shooting line
    '...............', // 34
    '...............', // 33
    '.##.........##.', // 32  two side covers
    '.##.........##.', // 31
    '...............', // 30
    '...............', // 29
    '.......#.......', // 28  a central pillar
    '...............', // 27
    '....##...##....', // 26  two covers of two cells
    '....##...##....', // 25
    '...............', // 24
    '...............', // 23
    '#.............#', // 22  halfway: two edge pillars. Payload and both
    //                          Crackers drop dead centre at (7, 22)
    '...............', // 21
    '...............', // 20
    '....##...##....', // 19  two covers of two cells
    '....##...##....', // 18
    '...............', // 17
    '.......#.......', // 16  a central pillar
    '...............', // 15
    '...............', // 14
    '.##.........##.', // 13  two side covers
    '.##.........##.', // 12
    '...............', // 11
    '...............', // 10
    '......###......', // 9   the crate in front of the shooting line
    '...............', // 8
    '...............', // 7
    '...##.....##...', // 6   the two posts
    '...##.....##...', // 5
    '...............', // 4   A's kick-off line
    '...............', // 3   the keeper's clearance
    '...............', // 2
    '...............', // 1   A's goalkeeper stands here, in front of the mouth
    '......###......', // 0   Furnace A: the mouth of the tube
  ],

  // Three cells wide, because the pitch is forty-four cells long and a mouth
  // has to be findable from the far end. `rangeToFurnace` takes the minimum
  // over the cells, so a wider mouth is a marginally easier target, which is
  // the intent. The hatch cells are obstacles in the layout, and the line of
  // sight to a Furnace ignores its own cells so the mouth cannot hide itself.
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
    // Then the six field players on a line of their own third, three cells
    // clear of the mouth so the keeper has room to work (écart 38).
    A: [
      { x: 7, y: 1 },
      { x: 2, y: 4 },
      { x: 4, y: 4 },
      { x: 6, y: 4 },
      { x: 8, y: 4 },
      { x: 10, y: 4 },
      { x: 12, y: 4 },
    ],
    B: [
      { x: 7, y: 43 },
      { x: 2, y: 40 },
      { x: 4, y: 40 },
      { x: 6, y: 40 },
      { x: 8, y: 40 },
      { x: 10, y: 40 },
      { x: 12, y: 40 },
    ],
  },

  // Beside its own goal mouth, off the goalkeeper's cell (écart 37).
  substituteEntry: {
    A: { x: 5, y: 1 },
    B: { x: 5, y: 43 },
  },

  // The three pictures are vertical cuts of the old silo and no longer show the
  // pitch. They stay referenced until the 2D board is redrawn in 2H.4 (J5),
  // because the client still imports them and the row is held equal to this
  // spec by `server/arenaRow.test.ts`.
  art: {
    0: 'assets/arena/zone-1-trench.jpeg',
    1: 'assets/arena/zone-2-scramble.jpeg',
    2: 'assets/arena/zone-3-summit.jpeg',
  },
};
