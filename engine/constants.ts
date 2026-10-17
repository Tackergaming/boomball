/**
 * Every tunable number of the v2 ruleset, in one place.
 *
 * Source of truth: docs/00-reglement-v2.md, validated 2026-09-01, and its
 * part C of 2026-10-10 (decision D11, the horizontal pitch), which overrides
 * parts A and B wherever they disagree. Nothing in the engine hard-codes a
 * number that belongs here.
 */

import type { Tier } from './stats.js';

/** A cell is 5 feet. Distances are stored in cells, movement budgets in feet. */
export const CELL_FEET = 5;

// -- Arena ------------------------------------------------------------------

/**
 * The pitch is 15 cells wide and 45 long, seen from above. `x` is the width,
 * `y` the long axis: 0 at Furnace A's mouth, 44 at Furnace B's. The names
 * WIDTH and HEIGHT predate D11 and are kept because every coordinate in the
 * engine, the events and the database is unchanged: only their reading changed,
 * from a wall seen in profile to a floor seen from above.
 */
export const ARENA_WIDTH = 15;
export const THIRD_LENGTH = 15;
export const THIRD_COUNT = 3;
export const ARENA_HEIGHT = THIRD_LENGTH * THIRD_COUNT;

/**
 * Which engine wrote a match. Bumped when a `MatchState` or an event changes
 * shape or meaning, so a match opened under one engine is never replayed by
 * another (audit line A11). Version 1 was the vertical silo with anchoring and
 * falls; version 2 is the horizontal pitch of D11, 2026-10-10; version 3 adds
 * the Breaker's parry and its `crackerParried` event (écart 47, 2H.6, decided
 * by Jérôme on 2026-10-10 soir); version 4 is 2H.7: `sparkMoved` carries a
 * `cause`, the Spark skips away from a minder (écart 49) and comes back after a
 * catch (écart 50), so `Spark.state` loses `caught`; version 5 is 2H.8,
 * decided by Jérôme on 2026-10-11 after his engine 4 game: the penalty box
 * (écart 53, `penaltyBox` on the state and the `relocated` event) and the
 * keeper's relaunch at the head of its side's block after a goal (écart 54,
 * `relaunch` on the state); version 6 is 2H.10, decided by Jérôme on
 * 2026-10-11 after his engine 5 game: the turn state remembers the cell the
 * turn started on (`startedAt`, écart 56), a memory for the AI and the match
 * dump that no rule of play reads; version 7 is 2H.12, decided by Jérôme on
 * 2026-10-12: a human Striker or Breaker chooses its place in its role each
 * round (écart 58, `turn.placing`, the `choosePlace` action and two events);
 * version 8 is 2H.13 (écarts 59 to 62, `turn.shot`, `recoilBlocked`); version
 * 9 is 2H.14, decided by Jérôme on 2026-10-14: the free pass after a Shove
 * that took the ball (écart 63, `turn.freePass`).
 * Nothing in the engine reads the version:
 * the server stamps it on `matches` and refuses a mismatch, and the client
 * archives what it cannot play.
 */
export const ENGINE_VERSION = 11;

// -- The penalty box (écart 53) --------------------------------------------

/**
 * How far from a hatch cell the box in front of a mouth reaches, in grid
 * range with diagonals: three, Jérôme's number. See `rules/box.ts`.
 */
export const PENALTY_BOX_CELLS = 3;
/**
 * How many rounds **after** the round of the goal the scoring side stays out
 * of it: one, so the ban covers the goal's round and the whole next one.
 */
export const PENALTY_BOX_ROUNDS = 1;

// -- Movement ---------------------------------------------------------------

/**
 * Forty feet, eight cells, in any of the eight directions. It was the fly speed
 * of the grapple rig; since D11 nobody flies, everybody runs, and the number is
 * the same (écart 29).
 */
export const MOVE_SPEED_FEET = 40;

/** Bat recoil pushes the attacker this far in the opposite direction. */
export const BAT_RECOIL_CELLS = 2;

/**
 * A successful Shove against a non-carrier pushes it this far straight away
 * from the shover, stopped by an obstacle, a unit or the edge (écart 32). It
 * replaced the three-cell drop of the vertical silo.
 */
export const SHOVE_PUSH_CELLS = 1;

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

/**
 * Eight, since 2H.6 (écart 40 bis, decided by Jérôme on 2026-10-10 soir).
 *
 * Six was the fiche's number and on the horizontal pitch the Crackers barely
 * reached anyone: Jérôme's first game read them as balls that hardly moved.
 * Ten was measured on the 2H.3 sweep and kept (écart 40, decision D4), with
 * the Crackers born a cell from the ball. Since écart 46 they are born at the
 * edge posts of the halfway line, seven cells from the centre, and since écart
 * 45 they roll at the ball rather than at the nearest player; Jérôme brought
 * them down to eight at the same time. The 2H.6 control sweep measures the
 * three changes together, docs/09-equilibrage-2H3-2026-10-10.md §11.
 */
export const CRACKER_MOVE_CELLS = 8;
export const CRACKER_BAT_RANGE_CELLS = 12;
export const CRACKER_AC = 10;

/**
 * The Breaker's parry (écart 47, 2H.6). A Cracker in drift that rolls onto a
 * Breaker's cell is met with the bat before it goes off: a Reaction, a melee
 * attack against `CRACKER_AC`, and on a hit the Cracker is sent back
 * `CRACKER_BAT_RANGE_CELLS` down one of the faces of a 120 degree arc in front
 * of the Breaker, the face it came in through and its two neighbours. One face
 * either side of the arrival face is what 120 degrees is on a d8.
 */
export const CRACKER_PARRY_ARC_HALF_WIDTH = 1;
export const CRACKER_SAVE_DC = 15;
export const CRACKER_DAMAGE_DICE = 3;
export const CRACKER_DAMAGE_DIE = 6;

/** Rounds between a Cracker detonating and its replacement dropping in. */
export const CRACKER_RESPAWN_DELAY = 1;

/**
 * The first round the Crackers drift on count 20 (écart 44, 2026-10-10 soir).
 * They are born a cell from the centre and roll ten cells; since écart 38 the
 * kick-off lines stand eight cells from the centre. Left to drift on round 1
 * they reached somebody every single match before a player had acted, two
 * blasts of 3d6 decided by nothing. So they lie armed but still through the
 * kick-off round, and start hunting on round 2. Batting one still sends it off.
 */
export const CRACKER_FIRST_DRIFT_ROUND = 2;

// -- The Spark --------------------------------------------------------------

/** The Spark stays out of play until the start of this round. */
export const SPARK_ENTRY_ROUND = 6;

/** It enters no closer than this to any unit on the field. */
export const SPARK_SPAWN_MIN_DISTANCE = 4;

/** Third of the pitch it enters in: 1 is the middle third (écart 36). */
export const SPARK_SPAWN_THIRD = 1;

/**
 * After a catch the Spark comes back this many cells from each Trajector,
 * the same for both (écart 60, 2H.13, Jérôme on 2026-10-14). The round 6
 * entry keeps the middle third.
 */
export const SPARK_RETURN_DISTANCE = 9;

/**
 * Six, against a player's eight. Twelve made it structurally uncatchable: it
 * outran the field, so nobody could ever close on it and every catch was an
 * accident of where it happened to stop.
 */
export const SPARK_MOVE_CELLS = 6;
export const SPARK_CATCH_DC = 20;
/**
 * Two goals, which is about what a whole match is worth. It was a hundred and
 * fifty and it ended the match on the spot, then fifty, and it comes down here
 * because the scale around it moved and it did not.
 *
 * **This constant is scenery to the AI.** Nothing outside `reduce` reads it, so
 * changing it moves no decision: the same seeds play the same match and only
 * the scoreboard differs. What it does change is the share of matches the Spark
 * settles, and how many end level. Measured on real sweeps at each price, 200
 * matches per Tier on the end-to-end pitch:
 *
 *     price   Veteran decided   Star decided   draws (Vet / Star)
 *        10      46 (23%)         52 (26%)         14 / 11
 *        20      66 (33%)         71 (36%)         13 / 14
 *        30      72 (36%)         81 (41%)          8 /  5
 *        50      78 (39%)         88 (44%)          5 /  2
 *
 * Twenty was arbitrated on 2026-09-02 because it reproduces the regime Jérôme
 * had already accepted, 27% and 38% of matches decided, at a time when the
 * pitch produced four goals a match rather than two. Fifty was priced for that
 * pitch: five goals bought more than the whole rest of the match once the goal
 * rate halved.
 *
 * The lesson from the 0.8-goal era still holds and is worth keeping: a prize of
 * any size settles a match that would otherwise have finished nil-nil. The
 * Spark stops deciding matches when the Payload starts deciding them, not when
 * this number comes down. That is why the price is set against the goal rate
 * and gets revisited whenever the goal rate moves.
 *
 * Revisited on 2026-10-10 for the horizontal pitch (2H.3). The Spark is never
 * caught twice in a match, so the price only fixes which goal lead one catch
 * overturns. Replayed on the same seeds with the Crackers at ten:
 *
 *     price   Rookie decided   Veteran decided   Star decided
 *         5      74 (37%)         60 (30%)         53 (26%)
 *        10     100 (50%)         95 (48%)         94 (47%)
 *        20     107 (54%)        110 (55%)        108 (54%)
 *        30     111 (56%)        119 (60%)        133 (66%)
 *
 * Jérôme kept twenty, knowing it settles about one match in two: the Spark
 * stays worth two goals. The table is in docs/09-equilibrage-2H3-2026-10-10.md.
 */
export const SPARK_POINTS = 20;

// -- Initiative -------------------------------------------------------------
//
// No counts since écart 51 (2H.7): the ladder is an order, built in
// `engine/initiative.ts` from who has a human, who carries, and the board.

/** Brace (écart 52): a Shove against a braced Bulwark rolls at disadvantage and loses this much. */
export const BRACE_SHOVE_PENALTY = 3;

// -- Match ------------------------------------------------------------------

export const MATCH_ROUNDS = 10;
export const SUDDEN_DEATH_ROUNDS = 2;

/**
 * Seconds a human has to act before the turn auto-resolves as Dodge.
 *
 * Sixty was the fiche's number and it was too tight in practice: a turn is read
 * the board, pick a route, pick an action, and Jérôme was losing turns to it.
 * Raised to a hundred and twenty on 2026-09-02 at his call. It bounds nothing
 * in the rules and no sweep reads it, so it is an ergonomics number living in a
 * rules file only because that is where the match constants are.
 */
export const TURN_TIMER_SECONDS = 120;

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
