/**
 * The roll with the owner listed once (2H.32), and which team the hub opens on.
 */

import { describe, expect, it } from 'vitest';

import { mergeRoll, pickTeam } from './roll.js';
import type { Member, Team } from './useAccount.js';

const owner: Member = { profile_id: 'j', display_name: 'Giff', preferred_role: null, character_name: null, is_owner: true };
const ownerRow: Member = { profile_id: 'j', display_name: 'Giff', preferred_role: 'breaker', character_name: 'Bombast', is_owner: false };
const ana: Member = { profile_id: 'a', display_name: 'Ana', preferred_role: 'striker', character_name: null, is_owner: false };

describe('the roll (2H.32)', () => {
  it('lists the owner once, with the seat their own row remembers', () => {
    expect(mergeRoll([owner, ana, ownerRow])).toEqual([
      { ...owner, preferred_role: 'breaker', character_name: 'Bombast' },
      ana,
    ]);
  });

  it('leaves a roll without a duplicate alone', () => {
    expect(mergeRoll([owner, ana])).toEqual([owner, ana]);
  });
});

const team = (id: string, ownerId: string): Team => ({
  id, name: id, wins: 0, tier: 'rookie', owner: ownerId, roster: null, invite_code: 'ABCDEF12',
});

describe('the team the hub opens on (2H.32)', () => {
  it('prefers the remembered one, then the owned one, then the first joined', () => {
    const mine = team('mine', 'j');
    const other = team('other', 'a');
    expect(pickTeam([mine, other], 'j', 'other')).toBe(other);
    expect(pickTeam([other, mine], 'j', null)).toBe(mine);
    expect(pickTeam([other], 'j', 'gone')).toBe(other);
    expect(pickTeam([], 'j', null)).toBeNull();
  });
});
