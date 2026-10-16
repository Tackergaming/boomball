/**
 * The remembered sound toggle (2H.22, `00` C24), and since 2H.25 (`00` C26
 * points 4 and 5) the two crowds and the announcer. Node has no Web Audio and
 * no window, so `createSounds` falls back to its silent stand-in here, which
 * still has to remember the toggle and the crowd's side and never throw. The
 * engine itself is then driven through a fake AudioContext that hears nothing
 * but records which buffer each source plays and whether it was stopped: the
 * state, not the sound.
 *
 * The real announcer manifest is empty until the main thread fills it, so this
 * file swaps in a small one and a chance table for `hit` (`vi.mock` below).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { admitCue, passesChance, pickLine } from './announcer.js';
import {
  SOUND_STORAGE_KEY,
  createSounds,
  readSoundEnabled,
  writeSoundEnabled,
  type SoundStorage,
} from './sound.js';

vi.mock('./announcer.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('./announcer.js')>();
  return {
    ...real,
    ANNOUNCER_LINES: {
      ...real.ANNOUNCER_LINES,
      hit: ['h1.mp3', 'h2.mp3'],
      miss: ['m1.mp3'],
      goalOwn: ['g1.mp3'],
      // A file the server does not have: the cue is never said.
      kickoff: ['gone.mp3'],
    },
    ANNOUNCER_CHANCE: { hit: 0.5 },
  };
});

function memory(initial?: string): SoundStorage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set(SOUND_STORAGE_KEY, initial);
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

const broken: SoundStorage = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('full');
  },
};

describe('readSoundEnabled', () => {
  it('is on when the key is absent, the storage missing or throwing', () => {
    expect(readSoundEnabled(memory())).toBe(true);
    expect(readSoundEnabled(null)).toBe(true);
    expect(readSoundEnabled(broken)).toBe(true);
  });

  it('reads what was stored', () => {
    expect(readSoundEnabled(memory('on'))).toBe(true);
    expect(readSoundEnabled(memory('off'))).toBe(false);
  });
});

describe('writeSoundEnabled', () => {
  it("writes 'on' and 'off', and swallows a throwing storage", () => {
    const s = memory();
    writeSoundEnabled(false, s);
    expect(s.map.get(SOUND_STORAGE_KEY)).toBe('off');
    writeSoundEnabled(true, s);
    expect(s.map.get(SOUND_STORAGE_KEY)).toBe('on');
    expect(() => writeSoundEnabled(false, broken)).not.toThrow();
    expect(() => writeSoundEnabled(false, null)).not.toThrow();
  });
});

describe('createSounds without Web Audio', () => {
  it('starts on, remembers the toggle, and plays nothing without throwing', () => {
    const s = memory();
    const sounds = createSounds({ storage: s });
    expect(sounds.enabled).toBe(true);
    sounds.setEnabled(false);
    expect(sounds.enabled).toBe(false);
    expect(s.map.get(SOUND_STORAGE_KEY)).toBe('off');
    expect(createSounds({ storage: s }).enabled).toBe(false);
    expect(() => {
      sounds.play('goal');
      sounds.dispose();
    }).not.toThrow();
  });

  it('keeps the crowd side, says nothing and never throws (2H.25)', () => {
    const sounds = createSounds({ storage: null });
    expect(sounds.crowd).toBe('defence');
    sounds.setCrowd('attack');
    expect(sounds.crowd).toBe('attack');
    expect(() => sounds.say('goalOwn')).not.toThrow();
    expect(sounds.lastSaid).toBeNull();
  });
});

describe('pickLine', () => {
  it('is null with no line, and the only line when there is one', () => {
    expect(pickLine([], null, () => 0.5)).toBeNull();
    expect(pickLine(['a'], null, () => 0.99)).toBe('a');
    expect(pickLine(['a'], 'a', () => 0)).toBe('a');
  });

  it('never repeats the last line when there are two or more', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickLine(['a', 'b'], 'a', () => r)).toBe('b');
      expect(pickLine(['a', 'b'], 'b', () => r)).toBe('a');
      expect(pickLine(['a', 'b', 'c'], 'b', () => r)).not.toBe('b');
    }
  });

  it('lets the draw choose among the others', () => {
    expect(pickLine(['a', 'b', 'c'], null, () => 0)).toBe('a');
    expect(pickLine(['a', 'b', 'c'], null, () => 0.5)).toBe('b');
    expect(pickLine(['a', 'b', 'c'], null, () => 0.99)).toBe('c');
    expect(pickLine(['a', 'b', 'c'], 'a', () => 0)).toBe('b');
    expect(pickLine(['a', 'b', 'c'], 'a', () => 0.99)).toBe('c');
  });
});

describe('admitCue and passesChance', () => {
  it('plays on a free floor, cuts for a goal or full time, drops the rest', () => {
    expect(admitCue('hit', 3, 3)).toBe('play');
    expect(admitCue('hit', 2, 3)).toBe('drop');
    expect(admitCue('goalOwn', 2, 3)).toBe('cut');
    expect(admitCue('goalFoe', 2, 3)).toBe('cut');
    expect(admitCue('fullTime', 2, 3)).toBe('cut');
  });

  it('draws under the chance, 1 for a cue left out', () => {
    expect(passesChance('hit', () => 0.32, { hit: 1 / 3 })).toBe(true);
    expect(passesChance('hit', () => 0.34, { hit: 1 / 3 })).toBe(false);
    expect(passesChance('miss', () => 0.999, { hit: 1 / 3 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// A fake Web Audio that records, and a fake fetch whose files can be held back.
// ---------------------------------------------------------------------------

class FakeParam {
  value = 1;
  setValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class FakeNode {
  connect() {}
  disconnect() {}
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

interface FakeBuffer {
  readonly file: string;
  readonly duration: number;
}

class FakeSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate = new FakeParam();
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  start() {
    this.started = true;
  }
  /** Stops at once, where the real context would stop at the end of the fade. */
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.onended?.();
  }
}

let lastCtx: FakeContext | null = null;

/** The path after `sounds/`, as the manifest and the AMBIENCE table name it. */
const nameOf = (url: string) => url.replace(/^.*sounds\//, '');

class FakeContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 100;
  destination = new FakeNode();
  readonly sources: FakeSource[] = [];
  constructor() {
    lastCtx = this;
  }
  createDynamicsCompressor() {
    const n = new FakeNode() as FakeNode & Record<string, FakeParam>;
    for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = new FakeParam();
    return n;
  }
  createGain() {
    return new FakeGain();
  }
  createBuffer(_channels: number, length: number, rate: number) {
    return { duration: length / rate, getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const src = new FakeSource();
    this.sources.push(src);
    return src;
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  /** The fake fetch hands over the URL as the bytes; every clip lasts one second. */
  decodeAudioData(bytes: unknown): Promise<FakeBuffer> {
    return Promise.resolve({ file: nameOf(String(bytes)), duration: 1 });
  }
  /** The sources playing a given file, started and not stopped. */
  live(file: string) {
    return this.sources.filter((s) => s.started && !s.stopped && s.buffer?.file === file);
  }
}

/** Installs the fakes; returns the gesture to fire and a way to release a held file. */
function fakeBrowser(options: { missing?: string[]; held?: string[] } = {}) {
  const listeners: (() => void)[] = [];
  const held = new Map<string, () => void>();
  vi.stubGlobal('window', {
    AudioContext: FakeContext,
    addEventListener: (_type: string, fn: () => void) => listeners.push(fn),
    removeEventListener: () => {},
  });
  vi.stubGlobal('fetch', (url: string) => {
    const name = nameOf(url);
    const response = {
      ok: !(options.missing ?? []).includes(name),
      status: 404,
      arrayBuffer: () => Promise.resolve(url),
    };
    if (!(options.held ?? []).includes(name)) return Promise.resolve(response);
    return new Promise((resolve) => held.set(name, () => resolve(response)));
  });
  return {
    gesture: () => listeners[0]?.(),
    release: (name: string) => held.get(name)?.(),
  };
}

/** Lets every pending fetch and decode settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A random that returns the given draws in turn, then 0. */
function draws(...values: number[]): () => number {
  return () => values.shift() ?? 0;
}

describe('createSounds with a fake AudioContext (2H.25)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    lastCtx = null;
  });

  it('plays the defence crowd first, crossfades on a change of side, ignores the same side', async () => {
    const browser = fakeBrowser();
    const sounds = createSounds({ storage: null });
    expect(sounds.crowd).toBe('defence');
    browser.gesture();
    await settle();
    const ctx = lastCtx!;
    expect(ctx.live('crowd.mp3')).toHaveLength(1);
    expect(ctx.live('crowd-attack.mp3')).toHaveLength(0);

    sounds.setCrowd('attack');
    expect(sounds.crowd).toBe('attack');
    expect(ctx.live('crowd-attack.mp3')).toHaveLength(1);
    expect(ctx.live('crowd.mp3')).toHaveLength(0);

    const before = ctx.sources.length;
    sounds.setCrowd('attack');
    expect(ctx.sources.length).toBe(before);

    sounds.setEnabled(false);
    expect(ctx.live('crowd-attack.mp3')).toHaveLength(0);
    sounds.setEnabled(true);
    expect(ctx.live('crowd-attack.mp3')).toHaveLength(1);
    sounds.dispose();
    expect(ctx.sources.every((s) => s.stopped)).toBe(true);
  });

  it('remembers a side whose loop is still decoding, and starts it when it arrives', async () => {
    const browser = fakeBrowser({ held: ['crowd-attack.mp3'] });
    const sounds = createSounds({ storage: null });
    sounds.setCrowd('attack');
    browser.gesture();
    await settle();
    const ctx = lastCtx!;
    // The defence loop is decoded but is not the side asked for; the attack loop is not there yet.
    expect(ctx.live('crowd.mp3')).toHaveLength(0);
    expect(ctx.live('crowd-attack.mp3')).toHaveLength(0);
    browser.release('crowd-attack.mp3');
    await settle();
    expect(ctx.live('crowd-attack.mp3')).toHaveLength(1);
    sounds.dispose();
  });

  it('comments by chance, never the same line twice, never over itself, except for a goal', async () => {
    const browser = fakeBrowser({ missing: ['announcer/gone.mp3'] });
    // The draws, in order: hit before the gesture (0.7, its chance only); hit 0.7 (over its
    // chance of 0.5: dropped); hit 0.1 then 0 (h1); miss (chance 1) dropped on a busy floor;
    // goal then its line; hit 0 then 0 (h2, since h1 was said last for hit).
    const sounds = createSounds({ storage: null, random: draws(0.7, 0.7, 0.1, 0, 0, 0, 0, 0, 0) });
    sounds.say('hit');
    expect(sounds.lastSaid).toBeNull();
    browser.gesture();
    await settle();
    const ctx = lastCtx!;

    sounds.say('hit');
    expect(sounds.lastSaid).toBeNull();
    sounds.say('hit');
    expect(sounds.lastSaid).toBe('h1.mp3');

    sounds.say('miss');
    expect(sounds.lastSaid).toBe('h1.mp3');

    sounds.say('goalOwn');
    expect(sounds.lastSaid).toBe('g1.mp3');
    expect(ctx.live('h1.mp3')).toHaveLength(0);

    ctx.currentTime = 10;
    sounds.say('hit');
    expect(sounds.lastSaid).toBe('h2.mp3');

    // Its only file is missing: never said.
    ctx.currentTime = 20;
    sounds.say('kickoff');
    expect(sounds.lastSaid).toBe('h2.mp3');

    sounds.setEnabled(false);
    ctx.currentTime = 30;
    sounds.say('miss');
    expect(sounds.lastSaid).toBe('h2.mp3');
    sounds.dispose();
  });

  it('a goal with no line of its own still cuts the line in progress (2H.26)', async () => {
    const browser = fakeBrowser();
    const sounds = createSounds({ storage: null, random: draws(0, 0, 0, 0) });
    browser.gesture();
    await settle();
    const ctx = lastCtx!;

    sounds.say('hit');
    expect(sounds.lastSaid).toBe('h1.mp3');
    // The fake names a clip by its path under `sounds/`.
    expect(ctx.live('announcer/h1.mp3')).toHaveLength(1);

    // `goalFoe` is empty in the real manifest (his "and it's a goal" recording speaks).
    sounds.say('goalFoe');
    expect(ctx.live('announcer/h1.mp3')).toHaveLength(0);
    expect(sounds.lastSaid).toBe('h1.mp3');
    sounds.dispose();
  });
});
