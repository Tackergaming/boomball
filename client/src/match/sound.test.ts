/**
 * The remembered sound toggle (2H.22, `00` C24). Only the pure part is tested:
 * Node has no Web Audio and no window, so `createSounds` falls back to its
 * silent stand-in here, which still has to remember the toggle and never throw.
 */

import { describe, expect, it } from 'vitest';

import {
  SOUND_STORAGE_KEY,
  createSounds,
  readSoundEnabled,
  writeSoundEnabled,
  type SoundStorage,
} from './sound.js';

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
});
