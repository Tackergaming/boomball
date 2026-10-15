/**
 * The motion of a beat must only ever say what its events said.
 *
 * `motion.ts` turns a beat's events into the list of things that travelled, so
 * the board can glide through them instead of teleporting. Like the projection
 * in `replay.ts`, it is a transcription: a walk starts where the event says and
 * follows the event's path, a pass leaves the thrower's cell and lands on the
 * receiver's, a lost ball hops to the cell the scatter named. These tests pin
 * that down on hand-written events, then on a real match, where every step's
 * end must agree with the board the server produced.
 */

import { describe, expect, it } from 'vitest';

import { Arena } from '../../../engine/arena.js';
import { KILL_SILO } from '../../../engine/arenas/kill-silo.js';
import type { MatchEvent } from '../../../engine/events.js';
import { createMatch } from '../../../engine/setup.js';
import { isHuman, type MatchState } from '../../../engine/types.js';
import { chooseAction } from '../../../ai/chooseAction.js';
import { openSession, submitAction } from '../../../server/session.js';
import { ACTION_WORDS, FLOAT_MS, motionAndCues, motionOf, stepDuration, timeMotion } from './motion.js';
import { toBeats } from './replay.js';

const arena = new Arena(KILL_SILO);
const base = createMatch({ arena: KILL_SILO, tier: 'rookie', humans: [], seed: 11 });
const A = base.units.find((u) => u.team === 'A' && u.role === 'striker')!;
const A2 = base.units.find((u) => u.team === 'A' && u.role === 'trajector')!;
const B = base.units.find((u) => u.team === 'B' && u.role === 'breaker')!;

const roll = { die: 20, rolled: 10, bonus: 0, total: 10, against: 12, mode: 'normal' as const };

describe('what a beat moves', () => {
  it('walks a unit from the event\'s origin along the event\'s path', () => {
    const path = [
      { x: A.x, y: A.y + 1 },
      { x: A.x, y: A.y + 2 },
    ];
    const steps = motionOf(base, [
      { kind: 'turnStarted', unitId: A.id, round: 1 },
      { kind: 'moved', unitId: A.id, from: { x: A.x, y: A.y }, to: path[1]!, path, costFeet: 10 },
      { kind: 'turnEnded', unitId: A.id },
    ]);
    expect(steps).toEqual([{ kind: 'unit', unitId: A.id, from: { x: A.x, y: A.y }, path, gait: 'walk' }]);
  });

  it('pushes a shoved unit one sharp cell from where it stood', () => {
    const steps = motionOf(base, [
      {
        kind: 'shoved',
        shoverId: A.id,
        targetId: B.id,
        success: true,
        shoverRoll: roll,
        targetRoll: roll,
        pushedTo: { x: B.x, y: B.y + 1 },
        tookPayload: false,
      },
    ]);
    expect(steps).toEqual([
      { kind: 'unit', unitId: B.id, from: { x: B.x, y: B.y }, path: [{ x: B.x, y: B.y + 1 }], gait: 'push' },
    ]);
  });

  it('flies a pass from the thrower\'s cell to the receiver\'s', () => {
    const carried: MatchState = {
      ...base,
      units: base.units.map((u) => (u.id === A.id ? { ...u, holdingPayload: true } : u)),
      payload: { carriedBy: A.id, x: A.x, y: A.y },
    };
    const steps = motionOf(carried, [
      { kind: 'passed', fromId: A.id, toId: A2.id, roll, caught: true },
    ]);
    expect(steps).toEqual([
      { kind: 'ball', from: { x: A.x, y: A.y }, to: { x: A2.x, y: A2.y }, flight: 'pass' },
    ]);
  });

  it('throws a pass from where the thrower walked to, not from where it started', () => {
    const carried: MatchState = {
      ...base,
      units: base.units.map((u) => (u.id === A.id ? { ...u, holdingPayload: true } : u)),
      payload: { carriedBy: A.id, x: A.x, y: A.y },
    };
    const there = { x: A.x, y: A.y + 3 };
    const steps = motionOf(carried, [
      { kind: 'moved', unitId: A.id, from: { x: A.x, y: A.y }, to: there, path: [there], costFeet: 5 },
      { kind: 'passed', fromId: A.id, toId: A2.id, roll, caught: false },
      { kind: 'payloadScattered', to: { x: A2.x + 1, y: A2.y }, cells: 1, direction: 3 },
    ]);
    expect(steps.map((s) => s.kind)).toEqual(['unit', 'ball', 'ball']);
    expect(steps[1]).toMatchObject({ from: there, to: { x: A2.x, y: A2.y }, flight: 'pass' });
    // The dropped pass hops from the receiver's cell to where the scatter said.
    expect(steps[2]).toMatchObject({ from: { x: A2.x, y: A2.y }, to: { x: A2.x + 1, y: A2.y }, flight: 'scatter' });
  });

  it('hops a lost ball from the carrier\'s cell to the cell it rolled to (écart 42)', () => {
    const carried: MatchState = {
      ...base,
      units: base.units.map((u) => (u.id === B.id ? { ...u, holdingPayload: true } : u)),
      payload: { carriedBy: B.id, x: B.x, y: B.y },
    };
    const steps = motionOf(carried, [
      { kind: 'shoved', shoverId: A.id, targetId: B.id, success: true, shoverRoll: roll, targetRoll: roll, pushedTo: null, tookPayload: false },
      { kind: 'payloadDropped', unitId: B.id, at: { x: B.x, y: B.y } },
      { kind: 'payloadScattered', to: { x: B.x - 1, y: B.y }, cells: 1, direction: 7 },
    ]);
    expect(steps).toEqual([{ kind: 'ball', from: { x: B.x, y: B.y }, to: { x: B.x - 1, y: B.y }, flight: 'scatter' }]);
  });

  it('flies the ball from the carrier to the shover on a Shove that takes it (écart 61)', () => {
    const carried: MatchState = {
      ...base,
      units: base.units.map((u) => (u.id === B.id ? { ...u, holdingPayload: true } : u)),
      payload: { carriedBy: B.id, x: B.x, y: B.y },
    };
    const steps = motionOf(carried, [
      { kind: 'shoved', shoverId: A.id, targetId: B.id, success: true, shoverRoll: roll, targetRoll: roll, pushedTo: null, tookPayload: true },
    ]);
    expect(steps).toEqual([{ kind: 'ball', from: { x: B.x, y: B.y }, to: { x: A.x, y: A.y }, flight: 'pass' }]);
  });

  it('moves nothing for a blocked recoil', () => {
    expect(motionOf(base, [{ kind: 'recoilBlocked', unitId: A.id, at: { x: A.x, y: A.y } }])).toEqual([]);
  });

  it('sends a shot at the nearest hatch of the Furnace the shooter attacks', () => {
    const shooter = { ...A, x: 6, y: 36, holdingPayload: true };
    const carried: MatchState = {
      ...base,
      units: base.units.map((u) => (u.id === A.id ? shooter : u)),
      payload: { carriedBy: A.id, x: 6, y: 36 },
    };
    const steps = motionOf(carried, [
      { kind: 'shotAtFurnace', unitId: A.id, roll, scored: true, blockedBy: null },
    ]);
    expect(steps).toEqual([{ kind: 'ball', from: { x: 6, y: 36 }, to: { x: 6, y: 44 }, flight: 'shot' }]);
  });

  it('rolls a Cracker and the Spark along their paths', () => {
    // The Cracker starts wherever the kick-off put it (beside its post since
    // écart 46); the step reads its origin off the board, not off the event.
    const home = { x: base.crackers[0]!.x, y: base.crackers[0]!.y };
    const path = [
      { x: home.x + 1, y: home.y },
      { x: home.x + 2, y: home.y },
    ];
    const steps = motionOf(base, [
      { kind: 'crackerMoved', crackerId: 'cracker-1', from: home, to: path[1]!, path },
      { kind: 'sparkEntered', at: { x: 3, y: 20 }, round: 6 },
      { kind: 'sparkMoved', from: { x: 3, y: 20 }, to: { x: 3, y: 21 }, direction: 1, path: [{ x: 3, y: 21 }] },
    ]);
    expect(steps).toEqual([
      { kind: 'cracker', crackerId: 'cracker-1', from: home, path },
      { kind: 'spark', from: { x: 3, y: 20 }, path: [{ x: 3, y: 21 }] },
    ]);
  });
});

describe('how long a step takes', () => {
  const walk = { kind: 'unit' as const, unitId: A.id, from: { x: 0, y: 0 }, path: [{ x: 0, y: 1 }, { x: 0, y: 2 }], gait: 'walk' as const };
  const pass = { kind: 'ball' as const, from: { x: 0, y: 0 }, to: { x: 0, y: 5 }, flight: 'pass' as const };

  it('is zero at instant, for everything', () => {
    expect(stepDuration(walk, 'instant')).toBe(0);
    expect(stepDuration(pass, 'instant')).toBe(0);
    expect(timeMotion(0, [walk, pass], 'instant').totalMs).toBe(0);
  });

  it('paces a walk per cell, and slower at slow than at normal', () => {
    expect(stepDuration(walk, 'normal')).toBe(2 * stepDuration({ ...walk, path: [walk.path[0]!] }, 'normal'));
    expect(stepDuration(walk, 'slow')).toBeGreaterThan(stepDuration(walk, 'normal'));
  });

  it('sums the steps into the total the hook waits for', () => {
    const timed = timeMotion(3, [walk, pass], 'normal');
    expect(timed.key).toBe(3);
    expect(timed.totalMs).toBe(stepDuration(walk, 'normal') + stepDuration(pass, 'normal'));
  });
});

describe('on a real match', () => {
  /**
   * Every step's end must be where the beat's own state puts the thing that
   * moved: a motion that ends somewhere else would glide a Giff to a cell it
   * is not on, and the board would then snap it, which is the teleport the
   * animation exists to remove.
   */
  it('ends every step where the beat\'s state has the piece', () => {
    const start = createMatch({
      arena: KILL_SILO,
      tier: 'rookie',
      humans: [{ humanId: 'jerome', role: 'striker' as const }],
      seed: 21,
    });
    let session = openSession(arena, start, 1_700_000_000_000).session;
    let checked = 0;

    for (let i = 0; i < 40 && session.state.phase !== 'finished'; i++) {
      const before = session.state;
      const unitId = before.turn!.unitId;
      const unit = before.units.find((u) => u.id === unitId)!;
      if (!isHuman(unit)) break;
      const action = chooseAction(arena, before, unitId);
      const reply = submitAction(arena, session, { humanId: 'jerome', unitId, action }, 1_700_000_000_000);
      if (!reply.ok) throw new Error(reply.reason);
      session = reply.step.session;
      const events: readonly MatchEvent[] = reply.step.events;

      for (const beat of toBeats(before, events, 'A')) {
        for (const step of beat.motion) {
          if (step.kind === 'unit') {
            const after = beat.state.units.find((u) => u.id === step.unitId)!;
            const end = step.path[step.path.length - 1]!;
            // A unit may move more than once in a beat (walk, then be
            // recoiled); only its last step has to land on the final cell.
            const lastOfUnit = beat.motion.filter((s) => s.kind === 'unit' && s.unitId === step.unitId).pop();
            if (lastOfUnit === step) {
              expect({ x: after.x, y: after.y }, `${step.unitId} in round ${beat.state.round}`).toEqual(end);
              checked++;
            }
          }
          if (step.kind === 'cracker') {
            const lastOfCracker = beat.motion.filter((s) => s.kind === 'cracker' && s.crackerId === step.crackerId).pop();
            const after = beat.state.crackers.find((c) => c.id === step.crackerId)!;
            if (lastOfCracker === step) {
              expect({ x: after.x, y: after.y }).toEqual(step.path[step.path.length - 1]);
              checked++;
            }
          }
          if (step.kind === 'ball') {
            const lastBall = beat.motion.filter((s) => s.kind === 'ball').pop();
            if (lastBall === step && beat.state.payload.carriedBy === null) {
              // A loose ball at the end of the beat lies where the last flight ended.
              expect({ x: beat.state.payload.x, y: beat.state.payload.y }).toEqual(step.to);
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});

describe('what a beat flashes (2H.21)', () => {
  const hit = { ...roll, total: 18 };

  it('places a landed swing, its wound and a miss on the target, before any recoil', () => {
    const { steps, cues } = motionAndCues(base, [
      { kind: 'attacked', attackerId: A.id, targetId: B.id, roll: hit, hit: true },
      { kind: 'damaged', unitId: B.id, amount: 7, hpAfter: 5, source: 'bat' },
      { kind: 'recoiled', unitId: A.id, from: { x: A.x, y: A.y }, to: { x: A.x, y: A.y - 1 } },
      { kind: 'attacked', attackerId: A2.id, targetId: B.id, roll, hit: false },
    ]);
    expect(steps.map((s) => s.kind)).toEqual(['unit']);
    expect(cues.filter((c) => c.kind !== 'action')).toEqual([
      { kind: 'hit', at: { x: B.x, y: B.y }, unitId: B.id, text: undefined, after: 0 },
      { kind: 'damage', at: { x: B.x, y: B.y }, unitId: B.id, text: '\u22127', after: 0 },
      { kind: 'miss', at: { x: B.x, y: B.y }, unitId: B.id, text: 'miss', after: 1 },
    ]);
  });

  it('raises the word of a swing over the attacker, aimed at the target, before what the bat did (2H.22)', () => {
    const { cues } = motionAndCues(base, [
      { kind: 'attacked', attackerId: A.id, targetId: B.id, roll: hit, hit: true },
      { kind: 'damaged', unitId: B.id, amount: 7, hpAfter: 5, source: 'bat' },
      { kind: 'opportunityAttacked', attackerId: A2.id, targetId: B.id, roll, hit: false },
    ]);
    expect(cues.map((c) => c.kind)).toEqual(['action', 'hit', 'damage', 'action', 'miss']);
    expect(cues[0]).toEqual({ kind: 'action', at: { x: A.x, y: A.y }, unitId: A.id, text: 'SWING', toward: { x: B.x, y: B.y }, after: 0 });
    expect(cues[3]).toMatchObject({ kind: 'action', unitId: A2.id, text: 'ATCK OP', toward: { x: B.x, y: B.y } });
  });

  it('raises a word for every action Jérôme listed, where the actor stands at that moment (2H.22)', () => {
    const path = [{ x: A.x, y: A.y + 1 }];
    const { cues } = motionAndCues(base, [
      { kind: 'dashed', unitId: A.id, extraFeet: 30 },
      { kind: 'moved', unitId: A.id, from: { x: A.x, y: A.y }, to: path[0]!, path, costFeet: 5 },
      { kind: 'disengaged', unitId: A.id },
      { kind: 'dodging', unitId: A2.id },
      { kind: 'shoved', shoverId: A2.id, targetId: B.id, success: false, shoverRoll: roll, targetRoll: roll, pushedTo: null, tookPayload: false },
      { kind: 'crackerBatted', unitId: A2.id, crackerId: base.crackers[0]!.id, roll, hit: true, direction: 1 },
    ]);
    const words = cues.filter((c) => c.kind === 'action');
    expect(words.map((c) => c.text)).toEqual(['DASH', 'DISENGAGE', 'DODGE', 'SHOVE', 'BAT']);
    // DASH before the walk, DISENGAGE after it, where the walk ended.
    expect(words[0]).toMatchObject({ at: { x: A.x, y: A.y }, after: 0 });
    expect(words[1]).toMatchObject({ at: path[0], after: 1 });
    expect(words[3]).toMatchObject({ unitId: A2.id, toward: { x: B.x, y: B.y } });
    expect(words[4]).toMatchObject({ unitId: A2.id, toward: { x: base.crackers[0]!.x, y: base.crackers[0]!.y } });
    expect(Object.values(ACTION_WORDS)).toHaveLength(9);
  });

  it('keeps a word up twice as long at normal as 2H.21 did, longer at slow, not at all at instant (2H.22)', () => {
    expect(FLOAT_MS).toEqual({ slow: 3000, normal: 2000, instant: 0 });
  });

  it('waits for the walk that came before the swing', () => {
    const path = [{ x: A.x, y: A.y + 1 }];
    const { cues } = motionAndCues(base, [
      { kind: 'moved', unitId: A.id, from: { x: A.x, y: A.y }, to: path[0]!, path, costFeet: 5 },
      { kind: 'attacked', attackerId: A.id, targetId: B.id, roll: hit, hit: true },
    ]);
    expect(cues.filter((c) => c.kind !== 'action')).toEqual([{ kind: 'hit', at: { x: B.x, y: B.y }, unitId: B.id, text: undefined, after: 1 }]);
    expect(cues[0]).toMatchObject({ kind: 'action', text: 'SWING', at: path[0], after: 1 });
  });

  it('rings the floor under a shoved unit where it stood, and says held when it did not move', () => {
    const { steps, cues } = motionAndCues(base, [
      { kind: 'shoved', shoverId: A.id, targetId: B.id, success: true, shoverRoll: roll, targetRoll: roll, pushedTo: { x: B.x, y: B.y + 1 }, tookPayload: false },
      { kind: 'shoved', shoverId: A2.id, targetId: B.id, success: false, shoverRoll: roll, targetRoll: roll, pushedTo: null, tookPayload: false },
    ]);
    expect(steps).toHaveLength(1);
    expect(cues.filter((c) => c.kind !== 'action')).toEqual([
      { kind: 'push', at: { x: B.x, y: B.y }, unitId: B.id, text: undefined, after: 0 },
      { kind: 'held', at: { x: B.x, y: B.y + 1 }, unitId: B.id, text: 'held', after: 1 },
    ]);
  });

  it('blasts where the Cracker went off, after its roll', () => {
    const home = { x: base.crackers[0]!.x, y: base.crackers[0]!.y };
    const path = [{ x: home.x + 1, y: home.y }];
    const { cues } = motionAndCues(base, [
      { kind: 'crackerMoved', crackerId: 'cracker-1', from: home, to: path[0]!, path },
      { kind: 'crackerDetonated', crackerId: 'cracker-1', at: path[0]!, targetId: B.id, save: roll, saved: false, damage: 9 },
      { kind: 'damaged', unitId: B.id, amount: 9, hpAfter: 3, source: 'cracker' },
    ]);
    expect(cues[0]).toEqual({ kind: 'blast', at: path[0], after: 1 });
    expect(cues[1]).toMatchObject({ kind: 'damage', text: '\u22129', after: 1 });
  });

  it('sends the embers to the hatch once the shot has flown, in the colour of the mouth that took it', () => {
    const shooter = { ...A, x: 6, y: 36, holdingPayload: true };
    const carried: MatchState = {
      ...base,
      units: base.units.map((u) => (u.id === A.id ? shooter : u)),
      payload: { carriedBy: A.id, x: 6, y: 36 },
    };
    const { cues } = motionAndCues(carried, [
      { kind: 'shotAtFurnace', unitId: A.id, roll: hit, scored: true, blockedBy: null },
      { kind: 'scored', team: 'A', points: 10, source: 'payload' },
    ]);
    expect(cues[0]).toMatchObject({ kind: 'action', text: 'SHOOT', unitId: A.id, at: { x: 6, y: 36 }, toward: { x: 6, y: 44 }, after: 0 });
    expect(cues[1]).toEqual({ kind: 'goal', at: { x: 6, y: 44 }, team: 'B', after: 1 });
  });

  it('marks the Spark coming down and being caught, a Giff carried off and one coming on', () => {
    const { cues } = motionAndCues(base, [
      { kind: 'sparkEntered', at: { x: 3, y: 20 }, round: 6 },
      { kind: 'sparkCaught', unitId: A.id, roll: hit, caught: true },
      { kind: 'sparkCaught', unitId: A2.id, roll, caught: false },
      { kind: 'evacuated', unitId: B.id, round: 4 },
      { kind: 'substituteEntered', unitId: B.id, round: 6, at: { x: 7, y: 22 } },
    ]);
    expect(cues.map((c) => c.kind)).toEqual(['sparkIn', 'sparkCaught', 'exit', 'enter']);
    expect(cues[0]!.at).toEqual({ x: 3, y: 20 });
    expect(cues[1]).toMatchObject({ unitId: A.id, at: { x: A.x, y: A.y } });
    expect(cues[3]).toMatchObject({ unitId: B.id, at: { x: 7, y: 22 } });
  });

  it('times a cue at the end of the steps before it, and at zero at instant', () => {
    const walk = { kind: 'unit' as const, unitId: A.id, from: { x: 0, y: 0 }, path: [{ x: 0, y: 1 }, { x: 0, y: 2 }], gait: 'walk' as const };
    const cue = { kind: 'hit' as const, at: { x: 0, y: 3 }, after: 1 };
    const normal = timeMotion(0, [walk], 'normal', [cue, { ...cue, after: 0 }]);
    expect(normal.speed).toBe('normal');
    expect(normal.cues.map((c) => c.t)).toEqual([stepDuration(walk, 'normal'), 0]);
    expect(timeMotion(0, [walk], 'instant', [cue]).cues[0]!.t).toBe(0);
    // A cue after more steps than there are lands at the end.
    expect(timeMotion(0, [walk], 'slow', [{ ...cue, after: 9 }]).cues[0]!.t).toBe(stepDuration(walk, 'slow'));
  });
});
