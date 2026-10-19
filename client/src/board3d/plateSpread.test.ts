/**
 * Name plates kept apart (2H.38, `00` C37): untouched when free, stacked when
 * they overlap, pulled back inside the screen.
 */

import { describe, expect, it } from 'vitest';

import { spreadPlates, type PlateBox } from './plateSpread.js';

const VIEW = { width: 800, height: 600 };

function box(key: string, x: number, y: number, w = 60, h = 20): PlateBox {
  return { key, x, y, w, h };
}

describe('spreadPlates', () => {
  it('leaves plates that do not overlap where they are', () => {
    const r = spreadPlates([box('a', 200, 300), box('b', 500, 310)], VIEW);
    expect(r.get('a')).toEqual({ x: 200, y: 300 });
    expect(r.get('b')).toEqual({ x: 500, y: 310 });
  });

  it('leaves side-by-side plates alone when they do not overlap horizontally', () => {
    // centres 62 apart, widths 60: 62 >= 60 + 2
    const r = spreadPlates([box('a', 200, 300), box('b', 262, 300)], VIEW);
    expect(r.get('a')).toEqual({ x: 200, y: 300 });
    expect(r.get('b')).toEqual({ x: 262, y: 300 });
  });

  it('stacks two overlapping plates: the lower stays, the upper goes above with the gap', () => {
    const r = spreadPlates([box('up', 200, 290), box('low', 210, 300)], VIEW);
    expect(r.get('low')).toEqual({ x: 210, y: 300 });
    expect(r.get('up')).toEqual({ x: 200, y: 300 - 20 - 2 });
  });

  it('stacks three in a column', () => {
    const r = spreadPlates([box('a', 200, 300), box('b', 200, 300), box('c', 200, 300)], VIEW);
    const ys = ['a', 'b', 'c'].map((k) => r.get(k)!.y).sort((p, q) => q - p);
    expect(ys).toEqual([300, 278, 256]);
  });

  it('does not depend on the input order', () => {
    const a = spreadPlates([box('a', 200, 300), box('b', 200, 300), box('c', 200, 300)], VIEW);
    const b = spreadPlates([box('c', 200, 300), box('a', 200, 300), box('b', 200, 300)], VIEW);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
    // tie broken by key: a is placed first and keeps its spot
    expect(a.get('a')!.y).toBe(300);
  });

  it('honours a custom gap', () => {
    const r = spreadPlates([box('a', 200, 300), box('b', 200, 300)], VIEW, 10);
    expect(r.get('b')).toEqual({ x: 200, y: 300 - 20 - 10 });
  });

  it('clamps at the left edge', () => {
    expect(spreadPlates([box('a', 0, 300)], VIEW).get('a')).toEqual({ x: 34, y: 300 });
  });

  it('clamps at the right edge', () => {
    expect(spreadPlates([box('a', 900, 300)], VIEW).get('a')).toEqual({ x: 800 - 34, y: 300 });
  });

  it('clamps at the top edge', () => {
    expect(spreadPlates([box('a', 200, -50)], VIEW).get('a')).toEqual({ x: 200, y: 4 });
  });

  it('clamps at the bottom edge', () => {
    expect(spreadPlates([box('a', 200, 700)], VIEW).get('a')).toEqual({ x: 200, y: 600 - 20 - 4 });
  });

  it('lifts a stack from the bottom edge instead of pushing it out', () => {
    const r = spreadPlates([box('a', 200, 700), box('b', 200, 700)], VIEW);
    expect(r.get('a')!.y).toBe(576);
    expect(r.get('b')!.y).toBe(576 - 22);
  });

  it('centres a plate wider than the viewport', () => {
    expect(spreadPlates([box('a', 10, 300, 1000)], VIEW).get('a')).toEqual({ x: 400, y: 300 });
  });

  it('terminates with 30 identical boxes and keeps them inside the viewport', () => {
    const plates = Array.from({ length: 30 }, (_, i) => box(`p${i}`, 400, 300));
    const r = spreadPlates(plates, VIEW);
    expect(r.size).toBe(30);
    for (const p of r.values()) {
      expect(p.y).toBeGreaterThanOrEqual(4);
      expect(p.y).toBeLessThanOrEqual(600 - 20 - 4);
    }
  });

  it('returns an empty map for no plates', () => {
    expect(spreadPlates([], VIEW).size).toBe(0);
  });
});
