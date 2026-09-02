/**
 * The replay must never say something the server did not.
 *
 * `replay.ts` projects a board from a batch of events so a player can watch a
 * round happen instead of finding it already over. That projection is the one
 * place in the client where a board is built rather than read, and the whole
 * defence of it is that it only ever transcribes what an event states. This
 * test is that defence made checkable: play real turns through the real server
 * layer, project the events it emitted, and require the two boards to agree.
 *
 * If they ever disagree, the replay is inventing, and inventing is what the
 * architecture forbids the client to do.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from '../../../engine/arena.js';
import { KILL_SILO } from '../../../engine/arenas/kill-silo.js';
import type { MatchEvent } from '../../../engine/events.js';
import { createMatch } from '../../../engine/setup.js';
import { isHuman, type MatchState } from '../../../engine/types.js';
import { chooseAction } from '../../../ai/chooseAction.js';
import { openSession, submitAction, type Session } from '../../../server/session.js';
import { toBeats } from './replay.js';

const arena = new Arena(KILL_SILO);
const HUMAN = [{ humanId: 'jerome', role: 'striker' as const, characterName: 'Kobb' }];
const T0 = 1_700_000_000_000;

function open(seed: number) {
  const state = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: HUMAN, seed });
  return openSession(arena, state, T0);
}

/**
 * What the board looks like to a viewer, which is all the replay has to get
 * right.
 *
 * **Only active units, and that is not a loophole.** The board draws
 * `activeUnits` and nothing else, so where the engine parks a player it has
 * carried off is a coordinate no viewer can ever see. The set of who is still
 * on the field is compared, so a replay that lost or resurrected somebody
 * still fails here.
 */
function visible(state: MatchState) {
  return {
    score: state.score,
    // Only where a loose ball lies. The engine stamps the Payload's coordinates
    // when it changes hands and lets them go stale while it is carried, and the
    // board draws a carried ball on its carrier, so those numbers are never
    // read. Comparing them would be asserting a fact nobody can see.
    payload: state.payload.carriedBy
      ? { carriedBy: state.payload.carriedBy }
      : { carriedBy: null, x: state.payload.x, y: state.payload.y },
    spark: { state: state.spark.state, x: state.spark.x, y: state.spark.y },
    crackers: state.crackers.map((c) => ({ id: c.id, x: c.x, y: c.y, state: c.state })),
    units: state.units
      .filter((u) => u.status === 'active')
      .map((u) => ({
        id: u.id,
        x: u.x,
        y: u.y,
        hp: u.hp,
        holdingPayload: u.holdingPayload,
      })),
    onTheField: state.units.filter((u) => u.status === 'active').map((u) => u.id).sort(),
  };
}

/**
 * Plays one human turn the way the client does, and hands back both the board
 * the server ended on and the board the replay would have drawn.
 */
function step(session: Session, events: MatchEvent[] = []) {
  const before = session.state;
  const unitId = before.turn!.unitId;
  const action = chooseAction(arena, before, unitId);
  const result = submitAction(arena, session, { humanId: 'jerome', unitId, action }, T0);
  if (!result.ok) throw new Error(`refused: ${result.reason}`);

  const batch = [...result.step.events];
  events.push(...batch);
  const beats = toBeats(before, batch, 'A');
  return { session: result.step.session, batch, beats, before };
}

describe('the replay projects, it does not invent', () => {
  it('ends every batch on exactly the board the server holds', () => {
    let session = open(11).session;
    let checked = 0;

    for (let turn = 0; turn < 40 && session.state.phase !== 'finished'; turn++) {
      const onClock = session.state.units.find((u) => u.id === session.state.turn?.unitId);
      if (!onClock || !isHuman(onClock)) break;

      const played = step(session);
      session = played.session;

      // A batch with no beats is a batch with no events, which cannot happen
      // for an accepted action.
      expect(played.beats.length).toBeGreaterThan(0);

      const drawn = played.beats[played.beats.length - 1]!.state;
      expect(visible(drawn)).toEqual(visible(session.state));
      checked++;
    }

    // Solo puts thirteen AI turns behind most human ones, so this covers
    // movement, falls, shoves, damage, the Crackers and usually a goal.
    expect(checked).toBeGreaterThan(8);
  });

  it('walks a batch one turn at a time rather than in one jump', () => {
    // Ending the turn is the click that hands the house its whole round, which
    // is the batch this module exists for: one request, thirteen AI turns.
    const opened = open(3);
    const before = opened.session.state;
    const result = submitAction(
      arena,
      opened.session,
      { humanId: 'jerome', unitId: before.turn!.unitId, action: { kind: 'endTurn' } },
      T0,
    );
    if (!result.ok) throw new Error(result.reason);

    const beats = toBeats(before, result.step.events, 'A');
    const withTurns = beats.filter((beat) => beat.unitId !== null);
    expect(withTurns.length).toBeGreaterThan(3);
    for (const beat of beats) {
      expect(beat.events.length).toBeGreaterThan(0);
    }
    expect(visible(beats[beats.length - 1]!.state)).toEqual(visible(result.step.session.state));
  });

  it('says what happened, with the dice, on the beats that had any', () => {
    let session = open(7).session;
    const seen: string[] = [];

    for (let turn = 0; turn < 30 && session.state.phase !== 'finished'; turn++) {
      const onClock = session.state.units.find((u) => u.id === session.state.turn?.unitId);
      if (!onClock || !isHuman(onClock)) break;
      const played = step(session);
      session = played.session;
      for (const beat of played.beats) {
        for (const line of beat.lines) seen.push(line.text);
      }
    }

    // Every roll the engine emitted has to reach a line, or a player is back to
    // reading the log to find out whether anything worked.
    expect(seen.some((line) => /HIT|MISS/.test(line))).toBe(true);
    expect(seen.some((line) => /SHOVED|HELD/.test(line))).toBe(true);
    expect(seen.some((line) => /Round \d+/.test(line))).toBe(true);
  });

  it('marks a goal as loud, which is what stops it going by unnoticed', () => {
    let session = open(11).session;

    for (let turn = 0; turn < 60 && session.state.phase !== 'finished'; turn++) {
      const onClock = session.state.units.find((u) => u.id === session.state.turn?.unitId);
      if (!onClock || !isHuman(onClock)) break;
      const played = step(session);
      session = played.session;

      for (const beat of played.beats) {
        if (beat.events.some((event) => event.kind === 'scored')) {
          expect(beat.weight).toBe('loud');
          expect(beat.lines.some((line) => /SCORE/i.test(line.text))).toBe(true);
          return;
        }
      }
    }

    throw new Error('no goal was scored in sixty turns, so the loud path went unchecked');
  });
});
