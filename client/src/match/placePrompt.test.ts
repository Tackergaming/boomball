/**
 * The drag and resize clamp of the place popup (2H.23). Only the pure geometry
 * is tested: Node has no layout, so the component itself is left to the e2e.
 */

import { describe, expect, it } from 'vitest';

import { clampInto } from './PlacePrompt.js';

const card = { width: 340, height: 200 };
const parent = { width: 800, height: 600 };

describe('clampInto', () => {
  it('leaves a position in the middle alone', () => {
    expect(clampInto(100, 100, card, parent)).toEqual({ x: 100, y: 100 });
  });

  it('pulls a position too far right or too low back, keeping 60 px', () => {
    expect(clampInto(2000, 2000, card, parent)).toEqual({ x: 740, y: 540 });
  });

  it('pulls a position too far left or too high back', () => {
    expect(clampInto(-1000, -50, card, parent)).toEqual({ x: 60 - 340, y: 0 });
  });
});
