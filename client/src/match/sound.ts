/**
 * The match's sounds, made on the spot by the Web Audio API.
 *
 * Why (2H.22, `00` C24 line 6): Jérôme wants the game to be heard, not only
 * seen: a bat that cracks, a Cracker that booms, a furnace that rings when the
 * Payload goes in, a referee's whistle at each round. He chose synthesis over
 * audio files, so nothing is downloaded, nothing has a licence to track, and
 * every sound is one small readable recipe below (`RECIPES`). Sound is on by
 * default, a mute toggle is remembered in localStorage under `boomball.sound`,
 * and the caller keeps it silent during instant replay. If the synthesis ever
 * sounds too thin, CC0 samples may replace any recipe later, at Jérôme's
 * choice; the `play(kind)` contract would not change.
 *
 * The gesture constraint. Chrome prints a console warning when an AudioContext
 * is created, or resumed, without a user gesture, and the end-to-end harness
 * fails on any console warning. So the context is never made at import time,
 * never from a timer, never from `play()`: it is made inside a `pointerdown`,
 * `pointerup`, `keydown` or `touchend` handler on `window`, and only when the
 * browser confirms the gesture counts (`navigator.userActivation.isActive`,
 * where that exists; a touch `pointerdown` or an Escape key does not). Until
 * then every `play()` is dropped without a word. The listeners leave once the
 * context runs. Without `AudioContext` at all (Node, very old browsers) the
 * whole thing is a no-op. Nothing here ever throws.
 *
 * Mixing. Each play builds fresh nodes into its own voice gain, which feeds a
 * compressor, then a master gain at 0.5, then the speakers: overlapping sounds
 * are squeezed rather than clipped. At most `MAX_VOICES` play at once; beyond
 * that a play is dropped, which on a busy round is kinder than a wall of noise.
 * Envelopes ramp to 0.0001, never to 0, which an exponential ramp cannot reach.
 */

export type SoundKind =
  | 'swing' // a bat whooshes (before it lands or misses)
  | 'hit' // the bat lands: a sharp wooden crack with a low thump
  | 'miss' // a swing that found air: the whoosh alone, slightly longer
  | 'push' // a Shove that moved the target: a heavy body thud
  | 'held' // a Shove that did not move it: a dull short thud
  | 'blast' // a Cracker detonates: noise burst, low boom, short decay
  | 'goal' // the ball enters the furnace: a bright rising two-note chime plus a short crowd-like swell
  | 'sparkIn' // the Spark comes down: a rising hum / shimmer, 0.6 s
  | 'sparkCaught' // caught: a bright ping
  | 'exit' // a Giff is carried off: a low descending tone, 0.5 s
  | 'enter' // a substitute comes on: a short ascending tone
  | 'throw' // a pass: a soft whoosh
  | 'shoot' // a shot: a heavier whoosh
  | 'dash' // a dash: two quick footfall thuds
  | 'whistle' // round start: a referee's whistle, one short blow
  | 'fullTime'; // match end: a long whistle, three blows (short short long)

export interface Sounds {
  /** Plays one sound now. Dropped silently when muted or before the first user gesture. */
  play(kind: SoundKind): void;
  /** Whether sound is on. Persisted under localStorage key 'boomball.sound' ('on' | 'off'); on when the key is absent or storage throws. */
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  /**
   * Where the audio stands: `silent` without Web Audio, `waiting` for the
   * first gesture, `running` once the context runs, `disposed` after
   * `dispose()`. Read by the screen harness, which cannot hear.
   */
  readonly state: 'silent' | 'waiting' | 'running' | 'disposed';
  /** Removes the window listeners and closes the context, for unmount. */
  dispose(): void;
}

/** The two storage calls used here, so a test can hand in a plain object. */
export interface SoundStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SOUND_STORAGE_KEY = 'boomball.sound';

/** How many sounds may ring at once; a play beyond that is dropped. */
const MAX_VOICES = 12;
/** The master volume, after the compressor. */
const MASTER_GAIN = 0.5;
/** Length of the shared white-noise buffer, in seconds. */
const NOISE_SECONDS = 1.5;
/** The floor of every envelope: exponential ramps cannot reach 0. */
const SILENT = 0.0001;

/**
 * Jérôme's own recordings (2H.22, the evening of the 15th), by kind: WAV in
 * `boomball/assets/source/sounds/`, served as MP3 from `public/sounds/`. They
 * are fetched and decoded once the context runs; until then, and for every
 * kind without a file, the recipe below plays. `gain` evens them out against
 * the synthesis: the goal and the blast were mastered to 0 dB.
 */
const SAMPLES: Partial<Record<SoundKind, { readonly file: string; readonly gain: number }>> = {
  swing: { file: 'swing.mp3', gain: 1 },
  goal: { file: 'goal.mp3', gain: 0.7 },
  blast: { file: 'blast.mp3', gain: 0.7 },
  // The Giff wear jetpacks in Jérôme's head: a Dash is a burst of one. The
  // second burst of his jetpack1 recording, 1.6 s, faded out.
  dash: { file: 'dash.mp3', gain: 0.8 },
};

/**
 * The crowd (2H.22, the night of the 15th): Jérôme's crowd2 recording, thirty
 * seconds cut from a steady stretch and crossfaded over themselves into a
 * loop, played low under everything while sound is on. `trim` keeps the loop
 * points clear of the MP3 encoder's padding at either end, which would click.
 * Gain 0.16 at first; Jérôme heard it a touch too loud on the 16th, so 0.11
 * (about three decibels lower).
 */
const AMBIENCE = { file: 'crowd.mp3', gain: 0.11, trim: 0.06 } as const;

// ---------------------------------------------------------------------------
// The remembered toggle. Pure, and tested in `sound.test.ts`.
// ---------------------------------------------------------------------------

/** The browser's localStorage, or null where it is missing or reading it throws (private mode, Node). */
function defaultStorage(): SoundStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** On unless the stored value is exactly 'off'. Absent key, missing storage or a throw all read as on. */
export function readSoundEnabled(storage: SoundStorage | null = defaultStorage()): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(SOUND_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Writes 'on' or 'off'. A full or forbidden storage is ignored: the toggle still works for the session. */
export function writeSoundEnabled(on: boolean, storage: SoundStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Nothing to do: the in-memory value is the one that counts until reload.
  }
}

// ---------------------------------------------------------------------------
// Building blocks of the recipes.
// ---------------------------------------------------------------------------

/** What a recipe gets: the context, its own output, the start time and the shared noise. */
interface Voice {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
  readonly at: number;
  readonly noise: AudioBuffer;
}

/**
 * An envelope on a gain: silent, up to `peak` in `attack`, held until
 * `dur - release` when `release` is given, then down to silence at `dur`.
 * Without `release` the sound decays from its peak all the way, which is the
 * shape of a hit; with it, the shape of a held note or a whistle blow.
 */
function envelope(gain: AudioParam, at: number, peak: number, attack: number, dur: number, release?: number): void {
  gain.setValueAtTime(SILENT, at);
  gain.exponentialRampToValueAtTime(peak, at + attack);
  if (release !== undefined && dur - release > attack) {
    gain.setValueAtTime(peak, at + dur - release);
  }
  gain.exponentialRampToValueAtTime(SILENT, at + dur);
}

interface ToneSpec {
  readonly type: OscillatorType;
  readonly freq: number;
  /** Where the pitch glides to by the end, exponentially. */
  readonly to?: number;
  /** Seconds after the voice's start. */
  readonly delay?: number;
  readonly dur: number;
  readonly peak: number;
  readonly attack?: number;
  readonly release?: number;
  /** A sine LFO on the pitch: rate in Hz, depth in Hz. */
  readonly vibrato?: { readonly rate: number; readonly depth: number };
  /** A low-pass after the oscillator, to round a square or a sawtooth. */
  readonly lowpass?: number;
}

/** One oscillator through its own envelope into the voice. */
function tone(v: Voice, s: ToneSpec): void {
  const { ctx } = v;
  const t = v.at + (s.delay ?? 0);
  const end = t + s.dur;
  const osc = ctx.createOscillator();
  osc.type = s.type;
  osc.frequency.setValueAtTime(s.freq, t);
  if (s.to !== undefined) osc.frequency.exponentialRampToValueAtTime(s.to, end);
  const gain = ctx.createGain();
  envelope(gain.gain, t, s.peak, s.attack ?? 0.005, s.dur, s.release);

  let tail: AudioNode = osc;
  if (s.lowpass !== undefined) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(s.lowpass, t);
    osc.connect(lp);
    tail = lp;
  }
  tail.connect(gain);
  gain.connect(v.out);

  if (s.vibrato) {
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(s.vibrato.rate, t);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(s.vibrato.depth, t);
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(end + 0.02);
  }
  osc.start(t);
  osc.stop(end + 0.02);
}

interface NoiseSpec {
  readonly filter: BiquadFilterType;
  readonly freq: number;
  /** Where the filter sweeps to by the end, exponentially: the movement of a whoosh. */
  readonly to?: number;
  readonly q?: number;
  readonly delay?: number;
  readonly dur: number;
  readonly peak: number;
  readonly attack?: number;
  readonly release?: number;
  /** Playback rate of the noise buffer: under 1 darkens it, over 1 brightens it. */
  readonly rate?: number;
}

/** A slice of the shared noise, filtered, through its own envelope into the voice. */
function noise(v: Voice, s: NoiseSpec): void {
  const { ctx } = v;
  const t = v.at + (s.delay ?? 0);
  const end = t + s.dur;
  const src = ctx.createBufferSource();
  src.buffer = v.noise;
  src.loop = true;
  src.playbackRate.setValueAtTime(s.rate ?? 1, t);
  const filter = ctx.createBiquadFilter();
  filter.type = s.filter;
  filter.frequency.setValueAtTime(s.freq, t);
  if (s.to !== undefined) filter.frequency.exponentialRampToValueAtTime(s.to, end);
  filter.Q.setValueAtTime(s.q ?? 1, t);
  const gain = ctx.createGain();
  envelope(gain.gain, t, s.peak, s.attack ?? 0.003, s.dur, s.release);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(v.out);
  // A random start inside the buffer, so two hits in a row are not the same hiss.
  src.start(t, Math.random() * (v.noise.duration - 0.1));
  src.stop(end + 0.02);
}

/** A low body thud: a falling sine with a dark puff of noise. */
function thud(v: Voice, delay: number, freq: number, dur: number, peak: number): void {
  tone(v, { type: 'sine', freq, to: freq * 0.6, delay, dur, peak, attack: 0.004 });
  noise(v, { filter: 'lowpass', freq: 450, delay, dur: dur * 0.5, peak: peak * 0.4, rate: 0.7 });
}

/**
 * One blow of a pea whistle: a sine near 2.8 kHz with a 6 Hz warble, a quiet
 * square a few hertz above it for the edge, and a breath of noise around the
 * same pitch. Held, not decayed, then released quickly.
 */
function blow(v: Voice, delay: number, dur: number): void {
  const vibrato = { rate: 6, depth: 45 };
  tone(v, { type: 'sine', freq: 2800, delay, dur, peak: 0.32, attack: 0.02, release: 0.05, vibrato });
  tone(v, { type: 'square', freq: 2806, delay, dur, peak: 0.035, attack: 0.02, release: 0.05, vibrato, lowpass: 5000 });
  noise(v, { filter: 'bandpass', freq: 2800, q: 4, delay, dur, peak: 0.05, attack: 0.02, release: 0.05 });
}

// ---------------------------------------------------------------------------
// The recipes. Each one builds a sound into its voice and returns its length
// in seconds, after which the voice is let go.
// ---------------------------------------------------------------------------

const RECIPES: Record<SoundKind, (v: Voice) => number> = {
  swing(v) {
    noise(v, { filter: 'bandpass', freq: 600, to: 2400, q: 1.2, dur: 0.18, peak: 0.35, attack: 0.05 });
    return 0.18;
  },

  hit(v) {
    // The crack: a very short band-passed burst, plus a click on top for the wood.
    noise(v, { filter: 'bandpass', freq: 2200, q: 2, dur: 0.07, peak: 0.8, attack: 0.001 });
    tone(v, { type: 'triangle', freq: 1300, to: 900, dur: 0.035, peak: 0.25, attack: 0.001 });
    // The thump under it.
    tone(v, { type: 'sine', freq: 90, to: 60, dur: 0.16, peak: 0.9, attack: 0.002 });
    return 0.16;
  },

  miss(v) {
    noise(v, { filter: 'bandpass', freq: 500, to: 2000, q: 1.1, dur: 0.3, peak: 0.32, attack: 0.08 });
    return 0.3;
  },

  push(v) {
    thud(v, 0, 70, 0.26, 1);
    return 0.26;
  },

  held(v) {
    thud(v, 0, 110, 0.12, 0.55);
    return 0.12;
  },

  blast(v) {
    // The burst, darkening as it falls, and the boom under it.
    noise(v, { filter: 'lowpass', freq: 3200, to: 180, q: 0.7, dur: 0.7, peak: 1, attack: 0.004, rate: 0.6 });
    tone(v, { type: 'sine', freq: 62, to: 30, dur: 0.6, peak: 1, attack: 0.004 });
    tone(v, { type: 'triangle', freq: 120, to: 45, dur: 0.25, peak: 0.35, attack: 0.002 });
    return 0.7;
  },

  goal(v) {
    // Two sine notes a fifth apart, the upper one after the lower: a rising chime.
    tone(v, { type: 'sine', freq: 659.25, dur: 0.55, peak: 0.42, attack: 0.025 });
    tone(v, { type: 'sine', freq: 1318.5, dur: 0.4, peak: 0.06, attack: 0.025 });
    tone(v, { type: 'sine', freq: 987.77, delay: 0.13, dur: 0.75, peak: 0.42, attack: 0.025 });
    tone(v, { type: 'sine', freq: 1975.5, delay: 0.13, dur: 0.5, peak: 0.05, attack: 0.025 });
    // The crowd: a broad, slow swell of noise around speech pitch.
    noise(v, { filter: 'bandpass', freq: 800, to: 1100, q: 0.6, dur: 1.1, peak: 0.22, attack: 0.3, rate: 0.8 });
    return 1.1;
  },

  sparkIn(v) {
    // A hum rising, two sines a hair apart so they beat, and a bright fizz over it.
    tone(v, { type: 'sine', freq: 280, to: 880, dur: 0.6, peak: 0.3, attack: 0.25, release: 0.12 });
    tone(v, { type: 'sine', freq: 284, to: 893, dur: 0.6, peak: 0.2, attack: 0.25, release: 0.12 });
    tone(v, { type: 'triangle', freq: 1120, to: 3520, dur: 0.6, peak: 0.05, attack: 0.3, release: 0.12 });
    noise(v, { filter: 'highpass', freq: 3000, to: 7000, dur: 0.6, peak: 0.06, attack: 0.3, release: 0.12 });
    return 0.6;
  },

  sparkCaught(v) {
    tone(v, { type: 'sine', freq: 1760, dur: 0.38, peak: 0.4, attack: 0.003 });
    tone(v, { type: 'sine', freq: 2637, dur: 0.22, peak: 0.15, attack: 0.003 });
    return 0.38;
  },

  exit(v) {
    tone(v, { type: 'triangle', freq: 392, to: 170, dur: 0.5, peak: 0.35, attack: 0.02, release: 0.15 });
    tone(v, { type: 'sine', freq: 196, to: 85, dur: 0.5, peak: 0.3, attack: 0.02, release: 0.15 });
    return 0.5;
  },

  enter(v) {
    tone(v, { type: 'triangle', freq: 330, to: 660, dur: 0.24, peak: 0.32, attack: 0.015, release: 0.08 });
    tone(v, { type: 'sine', freq: 660, to: 1320, dur: 0.24, peak: 0.08, attack: 0.015, release: 0.08 });
    return 0.24;
  },

  throw(v) {
    noise(v, { filter: 'bandpass', freq: 800, to: 1600, q: 1.4, dur: 0.22, peak: 0.2, attack: 0.06 });
    return 0.22;
  },

  shoot(v) {
    noise(v, { filter: 'bandpass', freq: 400, to: 1800, q: 1.1, dur: 0.3, peak: 0.42, attack: 0.04 });
    tone(v, { type: 'sine', freq: 130, to: 80, dur: 0.09, peak: 0.35, attack: 0.002 });
    return 0.3;
  },

  dash(v) {
    thud(v, 0, 95, 0.09, 0.55);
    thud(v, 0.13, 90, 0.09, 0.5);
    return 0.22;
  },

  whistle(v) {
    blow(v, 0, 0.35);
    return 0.35;
  },

  fullTime(v) {
    // Short, short, long.
    blow(v, 0, 0.2);
    blow(v, 0.32, 0.2);
    blow(v, 0.64, 0.55);
    return 1.19;
  },
};

// ---------------------------------------------------------------------------
// The engine: the context, made on the first real gesture.
// ---------------------------------------------------------------------------

interface Engine {
  readonly ctx: AudioContext;
  readonly bus: AudioNode;
  readonly noise: AudioBuffer;
  /** The recordings, by kind, once decoded. */
  readonly samples: Map<SoundKind, AudioBuffer>;
  /** The crowd's loop once decoded, and its playing source while it plays. */
  ambience: { buffer: AudioBuffer | null; source: AudioBufferSourceNode | null };
}

/** Starts the crowd under everything, if it is decoded and not already playing. */
function startAmbience(engine: Engine): void {
  const { ambience, ctx, bus } = engine;
  if (!ambience.buffer || ambience.source) return;
  try {
    const buffer = ambience.buffer;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = AMBIENCE.trim;
    src.loopEnd = Math.max(AMBIENCE.trim + 1, buffer.duration - AMBIENCE.trim);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENT, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(AMBIENCE.gain, ctx.currentTime + 1.5);
    src.connect(gain);
    gain.connect(bus);
    src.start(0, AMBIENCE.trim);
    ambience.source = src;
  } catch {
    // No crowd, then.
  }
}

/** Stops the crowd, if it plays. The buffer stays for the next start. */
function stopAmbience(engine: Engine): void {
  const { ambience } = engine;
  if (!ambience.source) return;
  try {
    ambience.source.stop();
    ambience.source.disconnect();
  } catch {
    // Already stopped.
  }
  ambience.source = null;
}

/**
 * Fetches and decodes the recordings into `engine.samples`. Each failure is
 * silent: that kind simply keeps its recipe. Called once the context runs,
 * never before, so no decode is attempted on a suspended context.
 */
function loadSamples(engine: Engine, onAmbience: () => void): void {
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? '/';
  fetch(`${base}sounds/${AMBIENCE.file}`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((bytes) => engine.ctx.decodeAudioData(bytes))
    .then((buffer) => {
      engine.ambience.buffer = buffer;
      onAmbience();
    })
    .catch(() => {
      // Silence under the game, then.
    });
  for (const [kind, sample] of Object.entries(SAMPLES) as [SoundKind, { file: string; gain: number }][]) {
    fetch(`${base}sounds/${sample.file}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((bytes) => engine.ctx.decodeAudioData(bytes))
      .then((buffer) => {
        engine.samples.set(kind, buffer);
      })
      .catch(() => {
        // The recipe stays.
      });
  }
}

type AudioContextCtor = new () => AudioContext;

/** The constructor, prefixed or not, or null where Web Audio is absent. */
function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  // Typed as optional on purpose: the DOM types promise both, the browser may have neither.
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Whether the browser counts the current event as a gesture. Where it cannot say, the event types listened to are trusted. */
function gestureIsActive(): boolean {
  if (typeof navigator === 'undefined' || !('userActivation' in navigator)) return true;
  return navigator.userActivation.isActive;
}

function buildEngine(Ctor: AudioContextCtor): Engine {
  const ctx = new Ctor();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, ctx.currentTime);
  compressor.knee.setValueAtTime(12, ctx.currentTime);
  compressor.ratio.setValueAtTime(4, ctx.currentTime);
  compressor.attack.setValueAtTime(0.003, ctx.currentTime);
  compressor.release.setValueAtTime(0.15, ctx.currentTime);
  const master = ctx.createGain();
  master.gain.setValueAtTime(MASTER_GAIN, ctx.currentTime);
  compressor.connect(master);
  master.connect(ctx.destination);

  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  return { ctx, bus: compressor, noise: buffer, samples: new Map(), ambience: { buffer: null, source: null } };
}

const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const;

/** Silent stand-in where there is no Web Audio: it still remembers the toggle. */
function silentSounds(storage: SoundStorage | null): Sounds {
  let enabled = readSoundEnabled(storage);
  return {
    play() {},
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      writeSoundEnabled(on, storage);
    },
    get state() {
      return 'silent' as const;
    },
    dispose() {},
  };
}

/**
 * The match's sounds. `storage` is for tests; the browser's localStorage by
 * default. Safe to call anywhere: it makes no AudioContext until a gesture.
 */
export function createSounds(options: { storage?: SoundStorage | null } = {}): Sounds {
  const storage = 'storage' in options ? (options.storage ?? null) : defaultStorage();
  const Ctor = audioContextCtor();
  if (!Ctor) return silentSounds(storage);
  const ctor: AudioContextCtor = Ctor;

  let enabled = readSoundEnabled(storage);
  let engine: Engine | null = null;
  let disposed = false;
  let voices = 0;
  let listening = false;

  const unlisten = () => {
    if (!listening) return;
    listening = false;
    for (const type of GESTURES) window.removeEventListener(type, onGesture, true);
  };

  function onGesture(): void {
    if (disposed || !gestureIsActive()) return;
    try {
      if (!engine) engine = buildEngine(ctor);
      const { ctx } = engine;
      const made = engine;
      const crowd = () => {
        if (enabled && !disposed) startAmbience(made);
      };
      if (ctx.state === 'running') {
        unlisten();
        loadSamples(made, crowd);
        return;
      }
      ctx.resume().then(
        () => {
          if (ctx.state === 'running') {
            unlisten();
            loadSamples(made, crowd);
          }
        },
        () => {
          // Refused: the listeners stay, the next gesture tries again.
        },
      );
    } catch {
      // A browser that refuses outright: stay silent, never throw into the page.
    }
  }

  try {
    for (const type of GESTURES) window.addEventListener(type, onGesture, { capture: true, passive: true });
    listening = true;
  } catch {
    return silentSounds(storage);
  }

  return {
    play(kind) {
      if (disposed || !enabled || !engine || voices >= MAX_VOICES) return;
      const { ctx, bus, noise: buffer } = engine;
      if (ctx.state !== 'running') return;
      try {
        const out = ctx.createGain();
        out.connect(bus);
        const at = ctx.currentTime + 0.005;
        const sample = engine.samples.get(kind);
        let length: number;
        if (sample) {
          // Jérôme's recording for this kind, at its own level.
          const src = ctx.createBufferSource();
          src.buffer = sample;
          out.gain.setValueAtTime(SAMPLES[kind]?.gain ?? 1, at);
          src.connect(out);
          src.start(at);
          length = sample.duration;
        } else {
          length = RECIPES[kind]({ ctx, out, at, noise: buffer });
        }
        voices++;
        // Every source stops itself at its own end; this lets the voice go and frees its slot.
        setTimeout(() => {
          voices--;
          try {
            out.disconnect();
          } catch {
            // Already gone with a closed context.
          }
        }, (length + 0.1) * 1000);
      } catch {
        // A node that failed to build: that sound is lost, the match goes on.
      }
    },
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      writeSoundEnabled(on, storage);
      // The crowd follows the switch at once; the effects follow it at their next play.
      if (engine) {
        if (on) startAmbience(engine);
        else stopAmbience(engine);
      }
    },
    get state() {
      if (disposed) return 'disposed' as const;
      return engine && engine.ctx.state === 'running' ? ('running' as const) : ('waiting' as const);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unlisten();
      if (engine) {
        stopAmbience(engine);
        engine.ctx.close().catch(() => {});
        engine = null;
      }
    },
  };
}
