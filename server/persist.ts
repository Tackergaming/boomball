/**
 * What a step writes to the `matches` row, with no database in it.
 *
 * Since 2H.31 (audit line A10) `resolve-action` writes a step through the SQL
 * function `append_match_step` (migration 0010), in one transaction, and that
 * function takes the `matches` columns as a JSON object it casts and writes.
 * This module computes that object from a `SessionStep`, so the mapping from
 * the engine's state to the row is tested here in milliseconds rather than
 * read off a Deno bundle. It decides nothing about the sport.
 */

import type { AllyOrder } from '../ai/orders.js';
import type { SessionStep } from './session.js';

/** The columns of `matches` that a step settles, as `append_match_step` reads them. */
export interface MatchColumns {
  readonly phase: 'playing' | 'suddenDeath' | 'finished';
  readonly round: number;
  readonly score_a: number;
  readonly score_b: number;
  /** ISO 8601, or null when nobody human is on the clock. */
  readonly turn_deadline: string | null;
  readonly winner: 'A' | 'B' | null;
  readonly is_draw: boolean;
  /** ISO 8601 of `now` once the match is finished, null before. */
  readonly finished_at: string | null;
  readonly orders: readonly AllyOrder[];
}

/**
 * The `matches` row after this step. `now` is the instant the step is written,
 * which is what `finished_at` records.
 */
export function matchColumns(step: SessionStep, orders: readonly AllyOrder[], now: number): MatchColumns {
  const state = step.session.state;
  return {
    phase: state.phase,
    round: state.round,
    score_a: state.score.A,
    score_b: state.score.B,
    turn_deadline: step.session.turnDeadline !== null ? new Date(step.session.turnDeadline).toISOString() : null,
    winner: state.result && state.result.winner !== 'draw' ? state.result.winner : null,
    is_draw: state.result?.winner === 'draw',
    finished_at: state.phase === 'finished' ? new Date(now).toISOString() : null,
    orders,
  };
}

/**
 * The reason a client gets when its step lost the race (409). The board it
 * acted from is behind; it reads the board again and plays from it.
 */
export const MOVED_ON = 'the board moved on: another action landed first, play again from the board on screen';

/** Whether a failure of `append_match_step` is the race, and not a broken write. */
export function isMovedOn(message: string | null | undefined): boolean {
  return typeof message === 'string' && message.includes('the board moved on');
}
