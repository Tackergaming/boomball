import { describe, expect, it } from 'vitest';

import { ACTION_KINDS, isActionShaped } from './actions.js';

describe('the shape of an action off the wire (2H.37, M2)', () => {
  it('accepts an object whose kind is one the engine knows', () => {
    for (const kind of Object.keys(ACTION_KINDS)) {
      expect(isActionShaped({ kind })).toBe(true);
    }
    expect(isActionShaped({ kind: 'move', path: [{ x: 7, y: 21 }] })).toBe(true);
  });

  it('refuses anything else before the engine sees it', () => {
    expect(isActionShaped(undefined)).toBe(false);
    expect(isActionShaped(null)).toBe(false);
    expect(isActionShaped('move')).toBe(false);
    expect(isActionShaped(42)).toBe(false);
    expect(isActionShaped([])).toBe(false);
    expect(isActionShaped({})).toBe(false);
    expect(isActionShaped({ kind: 7 })).toBe(false);
    expect(isActionShaped({ kind: 'teleport' })).toBe(false);
    // Prototype names are not kinds: `Object.hasOwn`, never `in`.
    expect(isActionShaped({ kind: 'toString' })).toBe(false);
    expect(isActionShaped({ kind: 'constructor' })).toBe(false);
  });
});
