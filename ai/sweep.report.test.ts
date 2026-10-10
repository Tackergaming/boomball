/**
 * The balance report. Run with `npm run sweep`, never by `npm test`.
 *
 * Both sides field the same Tier and the same brain, so an even split of wins
 * is the null result. Anything else is a bias in the rules or in the arena, not
 * in the roles, which is the only reason self-play is worth the minutes.
 *
 * What to read, in order of what it would cost to be wrong about:
 *
 *   - **meanGoals and goallessMatches.** The plan's third verification
 *     criterion is that the Payload game decides matches before the Spark
 *     arrives on round 6. A pile of goalless matches says it does not.
 *   - **sparkCaught, tries/match and decided.** Tries say whether anyone is
 *     chasing it at all, and `decided` counts the matches whose winner changes
 *     once the Spark's points come back out. That last one is what the Spark's
 *     value has to be set against: if it settles most of the matches it turns
 *     up in, the Payload is decoration.
 *   - **spread and huddle.** Mean distance from the carrier to its team-mates,
 *     and how many stand within 2 cells of it (audit line A31). A low spread
 *     with a high huddle means the team hugs its carrier instead of getting
 *     open. Carrier's side only, loose-ball turns excluded.
 *   - **wins.** A and B share everything but their end of the pitch, so a split
 *     far off even is the arena being asymmetric.
 */

import { describe, expect, it } from 'vitest';

import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import {
  CRACKER_MOVE_CELLS,
  PAYLOAD_LONG_RANGE_CELLS,
  PAYLOAD_RANGE_CELLS,
  SPARK_POINTS,
} from '../engine/constants.js';
import { sweepAllTiers } from './selfPlay.js';

declare const console: { log: (...args: unknown[]) => void };

/** The plan asks for a thousand. Raise it here when the numbers need settling. */
const MATCHES_PER_TIER = 200;

describe('balance', () => {
  it('reports the three Tiers', () => {
    // The report names the constants it was measured under, so that a table
    // archived from this output can never be mistaken for another variant's.
    console.log(
      `constants crackers ${CRACKER_MOVE_CELLS} range ${PAYLOAD_RANGE_CELLS}/${PAYLOAD_LONG_RANGE_CELLS} spark ${SPARK_POINTS}`,
    );

    const reports = sweepAllTiers(KILL_SILO, MATCHES_PER_TIER);

    for (const report of reports) {
      console.log(
        [
          report.tier.padEnd(9),
          `A ${report.wins.A}`.padEnd(7),
          `B ${report.wins.B}`.padEnd(7),
          `draws ${report.draws}`.padEnd(12),
          `goals/match ${report.meanGoals.toFixed(2)}`.padEnd(20),
          `goalless ${report.goallessMatches}`.padEnd(15),
          `spark ${report.sparkCaught}`.padEnd(12),
          `tries/match ${report.meanSparkAttempts.toFixed(2)}`.padEnd(20),
          `decided ${report.sparkDecided}`.padEnd(14),
          `evacuated ${report.meanEvacuated.toFixed(2)}`.padEnd(17),
          // Where the ball lives, Furnace A's third first, and how much of that
          // is a goalkeeper standing on it. These two read the pitch rather than
          // the scoreline: a share that collapses onto one third means the sport
          // has found somewhere to camp again.
          `ball ${report.ballThirdShare.map((n) => `${Math.round(n * 100)}%`).join('/')}`.padEnd(20),
          `keeper ${Math.round(report.keeperHeldShare * 100)}%`.padEnd(11),
          // Audit A31: how far the carrier's team-mates stand from it, and how
          // many are within 2 cells.
          `spread ${report.meanMateSpread.toFixed(1)}`.padEnd(13),
          `huddle ${report.meanHuddle.toFixed(2)}`,
          `dodge ${report.meanDodges.toFixed(2)}`,
        ].join(' '),
      );
    }

    expect(reports).toHaveLength(3);
    for (const report of reports) expect(report.matches).toBe(MATCHES_PER_TIER);
  });
});
