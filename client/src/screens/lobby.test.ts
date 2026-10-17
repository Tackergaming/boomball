/**
 * The pure part of the shared lobby (2H.32, `00` C32 points 3 and 4): which
 * roles are still open, when the owner may start, and the seats the door gets.
 */

import { describe, expect, it } from 'vitest';

import { canStart, fielded, openRoles, seatRequests, type Seat } from './lobbySeats.js';

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
