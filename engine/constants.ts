/**
 * Every tunable number of the v2 ruleset, in one place.
 *
 * Source of truth: docs/00-reglement-v2.md, validated 2026-09-01.
 * Nothing in the engine hard-codes a number that belongs here.
 */

import type { Tier } from './stats.js';

/** A cell is 5 feet. Distances are stored in cells, movement budgets in feet. */
export const CELL_FEET = 5;

// -- Arena ------------------------------------------------------------------

export const ARENA_WIDTH = 15;
export const ZONE_HEIGHT = 15;
export const ZONE_COUNT = 3;
export const ARENA_HEIGHT = ZONE_HEIGHT * ZONE_COUNT;

/**
 * Crossing a zone boundary costs this on top of the cell's own 5 feet.
 *
 * Fifteen at first, lowered to ten on 2026-09-01. At fifteen a crossing step
 * ate twenty of a forty foot budget, so a carrier crossed and stopped, and the
 * Furnaces in Zone 3 were three turns from the centre when the ball only
 * survived one and a half. A crossing still costs triple a normal step, so The
 * Summit stays a territory to take rather than a rung like any other.
 */
export const ZONE_CROSSING_FEET = 10;

// -- Movement, anchoring, falling -------------------------------------------

/** Grapple-rig fly speed. Walking speed never adds to it. */
export const FLY_SPEED_FEET = 40;

/** Bat recoil pushes the attacker this far in the opposite direction. */
export const BAT_RECOIL_CELLS = 2;

/** A free fall is caught by the auto-spooling grapple after this distance. */
export const GRAPPLE_CATCH_CELLS = 10;

/** A shove is a short controlled drop, not a free fall. */
export const SHOVE_FALL_CELLS = 3;

/** Collision damage is 1d6 per this many cells fallen (10 feet). */
export const FALL_DAMAGE_PER_CELLS = 2;
export const FALL_DAMAGE_DIE = 6;

// -- The Payload ------------------------------------------------------------

export const PAYLOAD_PASS_AC = 12;
/**
 * Forty-five feet clean, and the long band beyond it.
 *
 * It was thirty. The two Furnaces sit fourteen cells apart on the same catwalk,
 * so a thirty foot clean band meant the carrier spent almost every turn in the
 * long band shooting at disadvantage: measured, the ball-holder averaged ten
 * cells from the hatch and only a fifth of its turns were a clean shot.
 */
export const PAYLOAD_RANGE_CELLS = 9;
export const PAYLOAD_LONG_RANGE_CELLS = 12;
/**
 * Eighteen was the fiche's number and it was set against a keeper's block that
 * turned out to be permanent rather than occasional. With the block cut to what
 * it is now, fifteen puts a Rookie Striker's clean shot near one in two and a
 * Star's near seven in ten, which is what a sport needs to produce a scoreline.
 */
export const FURNACE_AC = 15;
export const GOAL_POINTS = 10;

/** A missed pass scatters 1d4 cells in a direction rolled on a d8. */
export const SCATTER_DIE = 4;

/** The Bulwark may only interpose while this close to its own Furnace. */
export const BULWARK_BLOCK_RANGE_CELLS = 2;

/**
 * What the goalkeeper's Reaction adds to the Furnace's AC.
 *
 * It **adds** rather than replacing. Resolving a blocked shot against the
 * Bulwark's own AC used a number written for surviving a bat, and at Star that
 * AC 25 against a +4 arm needed a 21 on a d20: the goal was arithmetically
 * shut. Arbitrage 2 survives intact, the block is still a Reaction once a round
 * and the counter is still a second shooter, only the size of the wall changed.
 *
 * It rises with the Tier because a goalkeeper is an opponent and opponents
 * scale with you. The Furnace does not rise, because a hatch in a wall does not
 * get better at keeping goal, and that gap is where a higher league is felt.
 */
/**
 * The keeper's Reaction, and the single number that was strangling the sport.
 *
 * Arbitrage 2 priced this as an occasional save: the first shot of a round
 * draws the Reaction, the second one goes in, and the counter to a great
 * goalkeeper is a second shooter. Measured, **96 to 98 % of all shots in a
 * match were blocked**, because both teams together were managing under three
 * shots a match and a second shot in the same round essentially never
 * happened. A once-a-round Reaction that is never drawn twice is a permanent
 * +4 to +8, and it held the hit rate at 30 % when a clean shot should be one
 * in two.
 *
 * Halved. The keeper is still worth ten to fifteen points of hit rate, so it is
 * still a goalkeeper, but it no longer decides on its own that nobody scores.
 */
export const BULWARK_BLOCK_BONUS: Readonly<Record<Tier, number>> = {
  rookie: 2,
  veteran: 3,
  star: 4,
};

// -- The Crackers -----------------------------------------------------------

export const CRACKER_COUNT = 2;
export const CRACKER_INITIATIVE = 20;
export const CRACKER_MOVE_CELLS = 6;
export const CRACKER_BAT_RANGE_CELLS = 12;
export const CRACKER_AC = 10;
export const CRACKER_SAVE_DC = 15;
export const CRACKER_DAMAGE_DICE = 3;
export const CRACKER_DAMAGE_DIE = 6;

/** Rounds between a Cracker detonating and its replacement dropping in. */
export const CRACKER_RESPAWN_DELAY = 1;

// -- The Spark --------------------------------------------------------------

export const SPARK_INITIATIVE = 10;

/** The Spark stays out of play until the start of this round. */
export const SPARK_ENTRY_ROUND = 6;

/** It enters no closer than this to any unit on the field. */
export const SPARK_SPAWN_MIN_DISTANCE = 4;

/** Zone index it enters in: 1 is The Scramble, the middle band. */
export const SPARK_SPAWN_ZONE = 1;

/**
 * Six, against a player's eight. Twelve made it structurally uncatchable: it
 * outran the field, so nobody could ever close on it and every catch was an
 * accident of where it happened to stop.
 */
export const SPARK_MOVE_CELLS = 6;
export const SPARK_CATCH_DC = 20;
/**
 * Five goals. It was a hundred and fifty and it ended the match on the spot,
 * which made it the only thing on the field worth playing for.
 *
 * The sweep says this number matters far less than it looks. Scored over the
 * same 600 matches at every value from 10 to 150, the count of matches whose
 * winner the Spark changes barely moves: 28 of 33 at ten points, 29 of 33 at a
 * hundred and fifty. A prize of any size settles a match that would otherwise
 * have finished nil-nil, and at 0.8 goals a match most of them do. The Spark
 * will stop deciding matches when the Payload starts deciding them, not when
 * this constant comes down. So it is set at the bottom of the validated range,
 * which costs nothing measurable now and ages best as the goal rate rises.
 */
export const SPARK_POINTS = 50;

// -- Initiative -------------------------------------------------------------

export const INITIATIVE_ENEMY_FAST = 15;
export const INITIATIVE_ENEMY_SLOW = 10;

// -- Match ------------------------------------------------------------------

export const MATCH_ROUNDS = 10;
export const SUDDEN_DEATH_ROUNDS = 2;

/** Seconds a human has to act before the turn auto-resolves as Dodge. */
export const TURN_TIMER_SECONDS = 60;

// -- Roster -----------------------------------------------------------------

export const TEAM_SIZE = 7;
export const BENCH_SIZE = 3;

/** Rounds an evacuated player waits before a substitute enters. */
export const SUBSTITUTE_DELAY_ROUNDS = 2;

/** Tier thresholds, in cumulative team wins. */
export const TIER_WINS_VETERAN = 3;
export const TIER_WINS_STAR = 6;

// -- Weapons ----------------------------------------------------------------

export const BAT_DAMAGE_DIE = 8;
