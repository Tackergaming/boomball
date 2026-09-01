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
export const PAYLOAD_RANGE_CELLS = 6;
export const PAYLOAD_LONG_RANGE_CELLS = 12;
export const FURNACE_AC = 18;
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
export const BULWARK_BLOCK_BONUS: Readonly<Record<Tier, number>> = {
  rookie: 4,
  veteran: 6,
  star: 8,
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

export const SPARK_MOVE_CELLS = 12;
export const SPARK_CATCH_DC = 20;
export const SPARK_POINTS = 150;

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
