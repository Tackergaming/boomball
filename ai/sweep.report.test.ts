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
 *   - **sparkCaught.** A hundred and fifty points against ten. If this is the
 *     usual way a match is settled, the Payload is decoration.
 *   - **wins.** A and B share everything but their side of the silo, so a split
 *     far off even is the arena being asymmetric.
 */

import { describe, expect, it } from 'vitest';

import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { sweepAllTiers } from './selfPlay.js';

declare const console: { log: (...args: unknown[]) => void };

/** The plan asks for a thousand. Raise it here when the numbers need settling. */
const MATCHES_PER_TIER = 200;

describe('balance', () => {
  it('reports the three Tiers', () => {
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
          `evacuated ${report.meanEvacuated.toFixed(2)}`,
        ].join(' '),
      );
    }

    expect(reports).toHaveLength(3);
    for (const report of reports) expect(report.matches).toBe(MATCHES_PER_TIER);
  });
});
