/**
 * Seeded randomness.
 *
 * Every die in a match comes from here, and the seed lives in the match state.
 * That is what makes a match replayable byte for byte from `match_events`, and
 * what lets the AI be balanced over a thousand self-play runs that can be
 * re-run when a rule changes.
 *
 * The generator is mulberry32: small, fast, and good enough for dice.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** The current state, to be written back into the match state. */
  get seed(): number {
    return this.state;
  }

  /** A uint32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** 0 <= result < maxExclusive. */
  int(maxExclusive: number): number {
    if (maxExclusive <= 0) throw new Error(`int() needs a positive bound, got ${maxExclusive}`);
    return this.next() % maxExclusive;
  }

  /** One die, 1..sides. */
  die(sides: number): number {
    return this.int(sides) + 1;
  }

  /** The sum of `count` dice. */
  roll(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) total += this.die(sides);
    return total;
  }

  d20(): number {
    return this.die(20);
  }

  /** A d20 taken twice, keeping the better or the worse roll. */
  d20With(mode: 'normal' | 'advantage' | 'disadvantage'): number {
    if (mode === 'normal') return this.d20();
    const a = this.d20();
    const b = this.d20();
    return mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
  }

  /** Uniform pick. Throws on an empty list rather than returning undefined. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() called on an empty list');
    return items[this.int(items.length)]!;
  }
}
