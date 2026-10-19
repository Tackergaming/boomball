/**
 * The feed's free pass (écart 63, 2H.23).
 *
 * A Shove that takes the Payload leaves the shover one free pass in the same
 * turn. The `passed` event does not carry that, so `feedLines` deduces it from
 * the `shoved` before it. Events are built by hand with the engine's types.
 */

import { describe, expect, it } from 'vitest';

import type { DiceRoll, MatchEvent } from '../../../engine/events.js';
import { feedLines, freshFrom, lastKeyOf, splitNames } from './Feed.js';

const roll: DiceRoll = { die: 20, rolled: 10, bonus: 0, total: 10, against: null, mode: 'normal' };
const name = (id: string): string => id;

// `shoved` has more fields than the test cares about (pushedTo and the like):
// the cast keeps the fixture to what the deduction reads.
const shoved = (shoverId: string, tookPayload: boolean): MatchEvent =>
  ({ kind: 'shoved', shoverId, targetId: 'b1', success: true, shoverRoll: roll, targetRoll: roll, pushedTo: null, tookPayload }) as MatchEvent;
const passed = (fromId: string, toId: string, caught = true): MatchEvent => ({ kind: 'passed', fromId, toId, roll, caught });
const started = (unitId: string): MatchEvent => ({ kind: 'turnStarted', unitId, round: 1 });
const ended = (unitId: string): MatchEvent => ({ kind: 'turnEnded', unitId });

const lines = (events: MatchEvent[]): string[] => feedLines(events, name).map((l) => l.line);

describe('feedLines, the free pass', () => {
  it('keeps an ordinary pass as it was', () => {
    expect(lines([started('a1'), passed('a1', 'a2')])).toEqual(['a1 passes to a2.']);
  });

  it('calls the pass after a Shove that took the Payload a free pass', () => {
    const out = lines([started('a1'), shoved('a1', true), passed('a1', 'a2'), passed('a1', 'a3', false)]);
    expect(out[1]).toBe('a1 throws the free pass off his Shove to a2.');
    expect(out[2]).toBe('a1 throws the free pass off his Shove to a3, and it spills.');
  });

  it('forgets the free pass when the turn ends', () => {
    const out = lines([started('a1'), shoved('a1', true), ended('a1'), started('a2'), passed('a2', 'a3')]);
    expect(out[out.length - 1]).toBe('a2 passes to a3.');
  });
});

describe('freshFrom, what is new by content', () => {
  const evs = [started('a1'), passed('a1', 'a2'), ended('a1')];
  const key = (e: MatchEvent): string => JSON.stringify(e);

  it('starts after the previous last event', () => {
    expect(freshFrom(evs, key(evs[1]!))).toBe(2);
  });

  it('calls everything fresh when the previous last event left the window', () => {
    expect(freshFrom(evs, key(started('zz')))).toBe(0);
  });

  it('calls everything fresh after an empty feed', () => {
    expect(freshFrom(evs, null)).toBe(0);
    expect(lastKeyOf([])).toBeNull();
  });

  it('uses the latest copy of a repeated event', () => {
    const twice = [started('a1'), ended('a1'), started('a1'), ended('a1')];
    expect(freshFrom(twice, key(ended('a1')))).toBe(4);
  });
});

describe('splitNames, names in colour', () => {
  const names = [
    { name: 'Sarn', side: 'own' as const },
    { name: 'Sarn Gunwale', side: 'foe' as const },
    { name: 'Petra Sparshot', side: 'own' as const },
  ];

  it('returns the text whole when there are no names', () => {
    expect(splitNames('Nothing here.', [])).toEqual([{ text: 'Nothing here.' }]);
    expect(splitNames('', names)).toEqual([]);
  });

  it('colours every occurrence and keeps the rest plain', () => {
    expect(splitNames('Petra Sparshot passes to Sarn, then Petra Sparshot runs.', names)).toEqual([
      { text: 'Petra Sparshot', side: 'own' },
      { text: ' passes to ' },
      { text: 'Sarn', side: 'own' },
      { text: ', then ' },
      { text: 'Petra Sparshot', side: 'own' },
      { text: ' runs.' },
    ]);
  });

  it('prefers the longest name when one is a prefix of another', () => {
    expect(splitNames('Sarn Gunwale swings at Sarn.', names)).toEqual([
      { text: 'Sarn Gunwale', side: 'foe' },
      { text: ' swings at ' },
      { text: 'Sarn', side: 'own' },
      { text: '.' },
    ]);
  });

  it('takes a name with regex characters literally and the first side for a repeated name', () => {
    const odd = [
      { name: 'Mr. X (II)', side: 'foe' as const },
      { name: 'Mr. X (II)', side: 'own' as const },
    ];
    expect(splitNames('Mr. X (II) waits; MrZ X (II) does not.', odd)).toEqual([
      { text: 'Mr. X (II)', side: 'foe' },
      { text: ' waits; MrZ X (II) does not.' },
    ]);
  });
});
