/**
 * The pure part of the shared lobby (2H.32, `00` C32 points 3 and 4): which
 * roles are still open, when the owner may start, and the seats the door gets.
 */

import { describe, expect, it } from 'vitest';

import {
  alreadyInLobby,
  benchOrder,
  canStart,
  cleanCode,
  fielded,
  formatCode,
  ladderOf,
  namedSeats,
  openCount,
  openRoles,
  seatRequests,
  wholeTeamOf,
  type Seat,
} from './lobbySeats.js';

const seat = (over: Partial<Seat> & { profileId: string }): Seat => ({
  displayName: over.profileId,
  name: '',
  role: 'striker',
  ready: false,
  owner: false,
  ...over,
});

describe('the roles still open (point 4)', () => {
  it('closes a role once the others hold every place a side fields', () => {
    expect(fielded('striker')).toBe(3);
    expect(fielded('bulwark')).toBe(1);
    expect(openRoles([])).toEqual(['striker', 'breaker', 'bulwark', 'trajector']);
    expect(openRoles([seat({ profileId: 'ana', role: 'bulwark' })])).toEqual(['striker', 'breaker', 'trajector']);
    expect(openRoles([seat({ profileId: 'ana', role: 'striker' }), seat({ profileId: 'kai', role: 'striker' })])).toContain('striker');
  });

  it('lets two humans share a role the composition allows', () => {
    const two = [seat({ profileId: 'ana', role: 'breaker' })];
    expect(openRoles(two)).toContain('breaker');
    const full = [seat({ profileId: 'ana', role: 'breaker' }), seat({ profileId: 'kai', role: 'breaker' })];
    expect(openRoles(full)).not.toContain('breaker');
  });
});

describe('when the owner may start (point 3)', () => {
  const owner = seat({ profileId: 'jerome', owner: true, ready: true });

  it('needs the owner on the channel and every other present member ready', () => {
    expect(canStart([], 'jerome')).toBe(false);
    expect(canStart([owner], 'jerome')).toBe(true);
    expect(canStart([owner, seat({ profileId: 'ana' })], 'jerome')).toBe(false);
    expect(canStart([owner, seat({ profileId: 'ana', ready: true })], 'jerome')).toBe(true);
    expect(canStart([owner, seat({ profileId: 'ana', ready: true }), seat({ profileId: 'kai' })], 'jerome')).toBe(false);
  });
});

describe('the whole-team box (2H.41, point 8)', () => {
  it('is read off the owner seat, and only off it', () => {
    const owner = seat({ profileId: 'jerome', owner: true, ready: true });
    const ana = seat({ profileId: 'ana', ready: true });
    expect(wholeTeamOf([])).toBe(false);
    expect(wholeTeamOf([owner, ana])).toBe(false);
    expect(wholeTeamOf([{ ...owner, wholeTeam: false }, ana])).toBe(false);
    expect(wholeTeamOf([{ ...owner, wholeTeam: true }, ana])).toBe(true);
    // A member's seat never carries the box; a stray flag there counts for nothing.
    expect(wholeTeamOf([owner, { ...ana, wholeTeam: true }])).toBe(false);
  });
});

describe('the seats handed to create-match', () => {
  it('puts the owner first and trims the names', () => {
    const seats = seatRequests([
      seat({ profileId: 'kai', role: 'trajector', name: ' Pell ' }),
      seat({ profileId: 'jerome', owner: true, role: 'striker', name: 'Bombast' }),
      seat({ profileId: 'ana', role: 'bulwark', name: '' }),
    ]);
    expect(seats).toEqual([
      { profileId: 'jerome', role: 'striker', characterName: 'Bombast' },
      { profileId: 'ana', role: 'bulwark', characterName: '' },
      { profileId: 'kai', role: 'trajector', characterName: 'Pell' },
    ]);
  });
});

describe('the bench (2H.34)', () => {
  it('counts the places left in a role', () => {
    expect(openCount('striker', [])).toBe(3);
    expect(openCount('breaker', [seat({ profileId: 'ana', role: 'breaker' })])).toBe(1);
    expect(openCount('bulwark', [seat({ profileId: 'ana', role: 'bulwark' })])).toBe(0);
  });

  it('puts my seat first, then the owner, then the others by name', () => {
    const mine = seat({ profileId: 'me', displayName: 'Zed' });
    const order = benchOrder(
      [
        seat({ profileId: 'kai', displayName: 'Kai' }),
        seat({ profileId: 'me', displayName: 'Zed', name: 'stale' }),
        seat({ profileId: 'jerome', displayName: 'Tacker', owner: true }),
        seat({ profileId: 'ana', displayName: 'Ana' }),
      ],
      mine,
    );
    expect(order.map((s) => s.profileId)).toEqual(['me', 'jerome', 'ana', 'kai']);
    expect(order[0]).toBe(mine);
  });

  it('says how many named seats', () => {
    expect(namedSeats(1)).toBe('1 named seat');
    expect(namedSeats(2)).toBe('2 named seats');
  });
});

describe('the hub (2H.34)', () => {
  it('names who is already in the lobby', () => {
    expect(alreadyInLobby([])).toBeNull();
    expect(alreadyInLobby(['Marc'])).toBe('Marc is already in the lobby');
    expect(alreadyInLobby(['Marc', 'Ana'])).toBe('Marc and Ana are already in the lobby');
    expect(alreadyInLobby(['Marc', 'Ana', 'Kai'])).toBe('Marc, Ana and Kai are already in the lobby');
  });

  it('reads a code four and four, and cleans what a player typed', () => {
    expect(formatCode('C9064Q2A')).toBe('C906 · 4Q2A');
    expect(cleanCode(' kx7m-4q2a ')).toBe('KX7M4Q2A');
  });

  it('climbs the ladder three rungs at a time', () => {
    expect(ladderOf(0)).toEqual({ tier: 'rookie', next: { tier: 'veteran', at: 3 }, rungs: [false, false, false] });
    expect(ladderOf(1).rungs).toEqual([true, false, false]);
    expect(ladderOf(3)).toEqual({ tier: 'veteran', next: { tier: 'star', at: 6 }, rungs: [false, false, false] });
    expect(ladderOf(5).rungs).toEqual([true, true, false]);
    expect(ladderOf(6)).toEqual({ tier: 'star', next: null, rungs: [true, true, true] });
    expect(ladderOf(40).tier).toBe('star');
  });
});
