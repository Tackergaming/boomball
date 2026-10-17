/**
 * The mapping from a step to the `matches` row (2H.31, audit line A10), and the
 * reading of the race the SQL function refuses.
 */

import { describe, expect, it } from 'vitest';

import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import type { MatchState } from '../engine/types.js';
import { openLobbyMatch } from './lobby.js';
import { isMovedOn, matchColumns, MOVED_ON } from './persist.js';
import type { SessionStep } from './session.js';

const T0 = 1_700_000_000_000;

function opened(): SessionStep {
  const result = openLobbyMatch(KILL_SILO, {
    callerId: 'jerome',
    tier: 'rookie',
    seats: [{ profileId: 'jerome', role: 'striker', characterName: 'Bombast' }],
    seed: 5,
    now: T0,
  });
  if (!result.ok) throw new Error(result.reason);
  return result.opening;
}

function finished(step: SessionStep, result: MatchState['result'], score: { A: number; B: number }): SessionStep {
  const state: MatchState = { ...step.session.state, phase: 'finished', result, score, turn: null };
  return { session: { state, turnDeadline: null }, events: [] };
}

describe('the matches row after a step (2H.31, A10)', () => {
  it('carries the phase, the round, the score, the deadline and the orders of a live match', () => {
    const step = opened();
    const orders = [{ kind: 'callForPass' as const, to: 'A-striker-1', receiverId: 'A-striker-3' }];
    const columns = matchColumns(step, orders, T0 + 1000);

    expect(columns.phase).toBe('playing');
    expect(columns.round).toBe(1);
    expect(columns.score_a).toBe(0);
    expect(columns.score_b).toBe(0);
    expect(columns.turn_deadline).toBe(new Date(step.session.turnDeadline!).toISOString());
    expect(columns.winner).toBeNull();
    expect(columns.is_draw).toBe(false);
    expect(columns.finished_at).toBeNull();
    expect(columns.orders).toEqual(orders);
  });

  it('names the winner and stamps the end when the match is over', () => {
    const step = finished(opened(), { winner: 'A' }, { A: 30, B: 10 });
    const columns = matchColumns(step, [], T0 + 5000);

    expect(columns.phase).toBe('finished');
    expect(columns.winner).toBe('A');
    expect(columns.is_draw).toBe(false);
    expect(columns.finished_at).toBe(new Date(T0 + 5000).toISOString());
    expect(columns.turn_deadline).toBeNull();
    expect(columns.score_a).toBe(30);
    expect(columns.score_b).toBe(10);
  });

  it('writes a draw as no winner and is_draw', () => {
    const columns = matchColumns(finished(opened(), { winner: 'draw' }, { A: 20, B: 20 }), [], T0);
    expect(columns.winner).toBeNull();
    expect(columns.is_draw).toBe(true);
  });

  it('reads the race off the SQL function message and nothing else', () => {
    expect(isMovedOn('the board moved on: expected seq 47, found 61')).toBe(true);
    expect(isMovedOn(MOVED_ON)).toBe(true);
    expect(isMovedOn('no such match')).toBe(false);
    expect(isMovedOn(undefined)).toBe(false);
    expect(isMovedOn(null)).toBe(false);
  });
});
