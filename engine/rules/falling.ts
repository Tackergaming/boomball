/**
 * Falling.
 *
 * The table fiche carries two numbers that look like a contradiction: a Shove
 * drops a player fifteen feet, and the auto-spooling grapple catches a player
 * only after fifty. Arbitrage 1 of the v2 ruleset reads them as two different
 * events rather than one broken rule, and this file is that reading.
 *
 * A **shove** is a short controlled drop of three cells. A **free fall** is
 * what happens to a player who ended a turn without a grip: it keeps going
 * until something stops it, or until the grapple catches it ten cells down.
 *
 * Both stop early on impact, and only an impact hurts.
 */

import type { Arena } from '../arena.js';
import {
  FALL_DAMAGE_DIE,
  FALL_DAMAGE_PER_CELLS,
  GRAPPLE_CATCH_CELLS,
  SHOVE_FALL_CELLS,
} from '../constants.js';
import type { Point } from '../geometry.js';

export type FallKind = 'free' | 'shove';

export interface FallOutcome {
  readonly from: Point;
  readonly landing: Point;
  readonly cellsFallen: number;
  /** True when the drop ended against structure or the deck rather than in air. */
  readonly impact: boolean;
  /** How many d6 the collision is worth. Zero unless there was an impact. */
  readonly damageDice: number;
  readonly damageDie: number;
  /**
   * Always true. A fall ends either on structure or in the grapple's grip, and
   * both are a hold. A unit is never left falling between two turns.
   */
  readonly anchored: true;
}

/**
 * Where a unit ends up, and what the landing costs it.
 *
 * Other units are ignored: you fall past a team-mate, you do not land on one.
 * The fiche says nothing about it and inventing a collision here would turn
 * every crowded shaft into a pile-up.
 */
export function resolveFall(arena: Arena, from: Point, kind: FallKind = 'free'): FallOutcome {
  const limit = kind === 'shove' ? SHOVE_FALL_CELLS : GRAPPLE_CATCH_CELLS;

  let landing = from;
  let cellsFallen = 0;
  let impact = false;

  while (cellsFallen < limit) {
    const below = { x: landing.x, y: landing.y - 1 };

    // Below the deck is the deck. Solid terrain stops the drop the same way.
    if (below.y < 0 || arena.isSolid(below)) {
      impact = true;
      break;
    }

    landing = below;
    cellsFallen++;
  }

  // A shove that runs its three cells without meeting anything is caught by
  // the rig, exactly as a free fall is caught at ten. Neither hurts.
  const damageDice = impact ? Math.floor(cellsFallen / FALL_DAMAGE_PER_CELLS) : 0;

  return {
    from,
    landing,
    cellsFallen,
    impact,
    damageDice,
    damageDie: FALL_DAMAGE_DIE,
    anchored: true,
  };
}
