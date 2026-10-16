/**
 * The lobby layer, tested without a lobby.
 *
 * What is worth asserting here is not the kick-off, which `setup.test.ts` and
 * `session.test.ts` already cover, but the two things this layer owns: **which
 * parties are allowed to start a match**, and **that what it hands back is
 * enough to write the rows without consulting the request again**.
 */

import { describe, expect, it } from 'vitest';

import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { isTier, tierAllowed } from '../engine/stats.js';
import { isHuman } from '../engine/types.js';
import { openLobbyMatch, type LobbyRequest, type SeatRequest } from './lobby.js';

describe('the league a battery may play at (2H.27, C28)', () => {
  it('allows its own Tier and every one below, never one above', () => {
    expect(tierAllowed('rookie', 'rookie')).toBe(true);
    expect(tierAllowed('veteran', 'rookie')).toBe(false);
    expect(tierAllowed('star', 'rookie')).toBe(false);
    expect(tierAllowed('rookie', 'veteran')).toBe(true);
    expect(tierAllowed('veteran', 'veteran')).toBe(true);
    expect(tierAllowed('star', 'veteran')).toBe(false);
    expect(tierAllowed('rookie', 'star')).toBe(true);
    expect(tierAllowed('star', 'star')).toBe(true);
  });

  it('reads a Tier off a request body and nothing else', () => {
    expect(isTier('veteran')).toBe(true);
    expect(isTier('Veteran')).toBe(false);
    expect(isTier('')).toBe(false);
    expect(isTier(2)).toBe(false);
    expect(isTier(undefined)).toBe(false);
  });

  it('opens the match at the Tier it is asked for', () => {
    const result = open(SOLO, { tier: 'star' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.opening.kickoff.units.every((unit) => unit.tier === 'star')).toBe(true);
  });
});

const T0 = 1_700_000_000_000;

function open(seats: readonly SeatRequest[], overrides: Partial<LobbyRequest> = {}) {
  return openLobbyMatch(KILL_SILO, {
    callerId: seats[0]?.profileId ?? 'jerome',
    tier: 'rookie',
    seats,
    seed: 5,
    now: T0,
    ...overrides,
  });
}

const SOLO: SeatRequest[] = [{ profileId: 'jerome', role: 'striker', characterName: 'Bombast' }];

function reasonOf(result: ReturnType<typeof open>): string {
  return result.ok === false ? result.reason : '(it was accepted)';
}

describe('opening a match', () => {
  it('plays the kick-off through to the first human decision', () => {
    const result = open(SOLO);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { session, events } = result.opening;
    expect(session.state.phase).toBe('playing');
    expect(events.some((event) => event.kind === 'roundStarted')).toBe(true);
    expect(session.turnDeadline).toBeGreaterThan(T0);

    const onClock = session.state.units.find((unit) => unit.id === session.state.turn!.unitId)!;
    expect(isHuman(onClock)).toBe(true);
  });

  it('hands back one seat per human, with the ids the engine gave out', () => {
    const result = open([
      { profileId: 'jerome', role: 'striker', characterName: 'Bombast' },
      { profileId: 'ana', role: 'bulwark', characterName: 'Hobbs' },
      { profileId: 'kai', role: 'trajector', characterName: 'Pell' },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { seats, session } = result.opening;
    expect(seats).toHaveLength(3);

    for (const seat of seats) {
      const unit = session.state.units.find((u) => u.id === seat.unitId)!;
      expect(unit.controller).toEqual({ kind: 'human', humanId: seat.profileId });
      expect(unit.role).toBe(seat.role);
      expect(unit.name).toBe(seat.characterName);
    }
    expect(seats.map((seat) => seat.profileId).sort()).toEqual(['ana', 'jerome', 'kai']);
  });

  it('draws a name from the pool when the player left it blank, and reports that name', () => {
    const result = open([{ profileId: 'jerome', role: 'breaker' }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const seat = result.opening.seats[0]!;
    expect(seat.characterName.length).toBeGreaterThan(0);
    // The row that gets written must carry the name the board is showing, or
    // the roster and the pitch disagree from the first round.
    const unit = result.opening.session.state.units.find((u) => u.id === seat.unitId)!;
    expect(unit.name).toBe(seat.characterName);
  });

  it('opens the same match twice for the same seed', () => {
    const first = open(SOLO);
    const second = open(SOLO);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.opening.events).toEqual(first.opening.events);
    expect(second.opening.session.state).toEqual(first.opening.session.state);
  });
});

describe('parties the lobby refuses', () => {
  it('refuses an empty party', () => {
    expect(reasonOf(open([]))).toMatch(/at least one player/);
  });

  it('refuses a fourth player', () => {
    const four: SeatRequest[] = [
      { profileId: 'a', role: 'striker' },
      { profileId: 'b', role: 'striker' },
      { profileId: 'c', role: 'striker' },
      { profileId: 'd', role: 'breaker' },
    ];
    expect(reasonOf(open(four))).toMatch(/at most 3 players/);
  });

  it('refuses the same player twice', () => {
    expect(
      reasonOf(open([
        { profileId: 'jerome', role: 'striker' },
        { profileId: 'jerome', role: 'breaker' },
      ])),
    ).toMatch(/two seats/);
  });

  it('refuses a role the sport does not have', () => {
    const bogus = [{ profileId: 'jerome', role: 'goalie' }] as unknown as SeatRequest[];
    expect(reasonOf(open(bogus))).toMatch(/no such role as goalie/);
  });

  it('refuses more of a role than the team fields, and says how many it fields', () => {
    expect(
      reasonOf(open([
        { profileId: 'a', role: 'bulwark' },
        { profileId: 'b', role: 'bulwark' },
      ])),
    ).toMatch(/fields 1 bulwark, 2 were claimed/);
  });

  it('allows three Strikers, because a team fields three', () => {
    const result = open([
      { profileId: 'a', role: 'striker' },
      { profileId: 'b', role: 'striker' },
      { profileId: 'c', role: 'striker' },
    ]);
    expect(result.ok).toBe(true);
  });

  it('refuses a caller who is not sitting in the match', () => {
    expect(reasonOf(open(SOLO, { callerId: 'somebody-else' }))).toMatch(/not playing in/);
  });

  it('refuses a character name longer than the column takes', () => {
    const long: SeatRequest[] = [
      { profileId: 'jerome', role: 'striker', characterName: 'B'.repeat(41) },
    ];
    expect(reasonOf(open(long))).toMatch(/40 characters at most/);
  });

  it('trims before measuring, so trailing spaces are not an error', () => {
    const padded: SeatRequest[] = [
      { profileId: 'jerome', role: 'striker', characterName: '  Bombast  ' },
    ];
    const result = open(padded);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.opening.seats[0]!.characterName).toBe('Bombast');
  });
});
