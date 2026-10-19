/**
 * The match's sounds, made on the spot by the Web Audio API.
 *
 * Why (2H.22, `00` C24 line 6): Jérôme wants the game to be heard, not only
 * seen: a bat that cracks, a Cracker that booms, a furnace that rings when the
 * Payload goes in, a referee's whistle at each round. He chose synthesis over
 * audio files, so nothing is downloaded, nothing has a licence to track, and
 * every sound is one small readable recipe below (`RECIPES`). The caller keeps
 * it silent during instant replay. If the synthesis ever
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
 * whole thing is a no-op. Nothing here ever throws. Since 2H.30 (`00` C31
 * point 4) the context is also made at once, with no gesture, when the page
 * already holds one (`navigator.userActivation.hasBeenActive`): the player
 * reached the match through the hub's buttons, so the browser lets a context
 * start outside a handler, and the crowd no longer waited for the first click
 * of the match, which was the place popup of Jérôme's Striker, long after the
 * Trajector had opened the round.
 *
 * Mixing. Each play builds fresh nodes into its own voice gain, which feeds a
 * compressor, then a master gain at 0.5, then the speakers: overlapping sounds
 * are squeezed rather than clipped. At most `MAX_VOICES` play at once; beyond
 * that a play is dropped, which on a busy round is kinder than a wall of noise.
 * Envelopes ramp to 0.0001, never to 0, which an exponential ramp cannot reach.
 *
 * Two crowds and an announcer (2H.25, `00` C26 points 4 and 5). « Changeons le
 * son de la foule »: the crowd now follows the ball, a loop of waves while the
 * player's team has it (`attack`) and the steady murmur otherwise (`defence`),
 * crossfaded over two seconds when possession turns (`setCrowd`). And a voice
 * comments the match (`say`), drawing from Jérôme's two announcer packs so that
 * the same moment is not always met with the same line; what is said and when
 * lives in `announcer.ts`. The announcer has a single voice of its own, outside
 * the `MAX_VOICES` of the effects: it never speaks over itself, and a busy
 * round of effects must not silence it on a goal.
 *
 * Three volumes instead of a switch (2H.38, `00` C37 point 4). The single
 * « Sound on » toggle (`boomball.sound`) is gone: sound is always on, and a
 * settings panel holds three sliders, `crowd`, `announcer` and `effects`, each a
 * number in [0, 1] that defaults to 1, which is the mix tuned so far: a slider
 * only ever scales down, never louder than before. Each channel has one
 * GainNode, set live with a short `setTargetAtTime` so a drag does not click,
 * between its voices and the compressor: the crowd loops (with their own fades
 * and the tuned `AMBIENCE.gain`) feed the crowd bus, every `play()` voice,
 * sample or recipe, whistles included, feeds the effects bus, and every line of
 * `say` feeds the announcer bus. Each volume is remembered per channel under
 * `boomball.volume.<channel>`; a volume set before the context exists waits and
 * is applied when it opens. The old `boomball.sound` key is ignored: a player
 * who had switched sound off hears it again, and can now lower it as they like.
 */

import {
  ANNOUNCER_CHANCE,
  ANNOUNCER_COOLDOWN_MS,
  ANNOUNCER_GAIN,
  ANNOUNCER_LINES,
  admitCue,
  passesChance,
  pickLine,
  type AnnouncerCue,
} from './announcer.js';

export type { AnnouncerCue } from './announcer.js';

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
  /** Plays one sound now. Dropped silently at effects volume 0 or before the first user gesture. */
  play(kind: SoundKind): void;
  /**
   * The three volumes, each in [0, 1] and 1 by default (today's mix; 2H.38, C37
   * point 4). Persisted per channel under `boomball.volume.<channel>`.
   */
  readonly volumes: Readonly<Record<VolumeChannel, number>>;
  /**
   * Sets one channel's volume (clamped to [0, 1]; NaN is ignored), live and
   * without a click, remembered for the next visit. Set before the context
   * exists, it is applied when it opens. 0 silences that channel only.
   */
  setVolume(channel: VolumeChannel, value: number): void;
  /**
   * Where the audio stands: `silent` without Web Audio, `waiting` for the
   * first gesture, `running` once the context runs, `disposed` after
   * `dispose()`. Read by the screen harness, which cannot hear.
   */
  readonly state: 'silent' | 'waiting' | 'running' | 'disposed';
  /**
   * Which crowd plays: `attack` while the player's team has the ball, `defence`
   * otherwise (2H.25, C26 point 4). A change crossfades over `CROWD_CROSSFADE`
   * seconds; the same side again does nothing. Remembered before the first
   * gesture, at crowd volume 0, and while the side's loop is still decoding: the
   * loop starts on that side as soon as it can.
   */
  setCrowd(side: CrowdSide): void;
  /** The side set last; `defence` at first. */
  readonly crowd: CrowdSide;
  /**
   * Comments a moment of the match (2H.25, C26 point 5): one decoded line of
   * `ANNOUNCER_LINES[cue]`, at random and never the one said last for that
   * cue when there is another. Dropped at announcer volume 0, before the first gesture,
   * when the cue has no decoded line, or when another line still holds the
   * floor, unless the cue is a goal or full time, which cut it, even with no
   * line of their own to say (2H.26).
   */
  say(cue: AnnouncerCue): void;
  /** The file of the last line that started, or null. Read by the screen harness, which cannot hear. */
  readonly lastSaid: string | null;
  /** Removes the window listeners and closes the context, for unmount. */
  dispose(): void;
}

/** Who has the ball, as the crowd hears it: the player's team (`attack`) or not (`defence`). */
export type CrowdSide = 'attack' | 'defence';

/** The three channels the player can turn up and down (2H.38, C37 point 4). */
export type VolumeChannel = 'crowd' | 'announcer' | 'effects';

export const VOLUME_CHANNELS: readonly VolumeChannel[] = ['crowd', 'announcer', 'effects'];

/** The two storage calls used here, so a test can hand in a plain object. */
export interface SoundStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Where a channel's volume is remembered. */
export const volumeStorageKey = (channel: VolumeChannel): string => `boomball.volume.${channel}`;

/** A volume nobody has touched: today's mix. */
const DEFAULT_VOLUME = 1;
/** How fast a volume change settles, as a `setTargetAtTime` time constant in seconds: short, but not a click. */
const VOLUME_SETTLE = 0.02;

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
 * `assets/source/sounds/`, served as MP3 from `public/sounds/`. They
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
 *
 * Since 2H.25 (C26 point 4) there are two loops, one per side of possession:
 * `crowd-attack.mp3`, forty seconds of rising and falling waves for when the
 * player's team has the ball, and the steady `crowd.mp3` above for when it has
 * not. Same level, same trim at both ends.
 */
const AMBIENCE = {
  files: { attack: 'crowd-attack.mp3', defence: 'crowd.mp3' },
  gain: 0.11,
  trim: 0.06,
} as const satisfies { files: Record<CrowdSide, string>; gain: number; trim: number };

/** The first fade-in of the crowd, in seconds: when sound starts or comes back on. */
const CROWD_FADE_IN = 1.5;
/** The crossfade between the two crowds when possession turns, in seconds. */
const CROWD_CROSSFADE = 2;
/** How fast a line that is cut by a priority one fades out, in seconds: short, but not a click. */
const ANNOUNCER_CUT = 0.05;

// ---------------------------------------------------------------------------
// The remembered volumes. Pure, and tested in `sound.test.ts`.
// ---------------------------------------------------------------------------

/** The browser's localStorage, or null where it is missing or reading it throws (private mode, Node). */
function defaultStorage(): SoundStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** A volume held to [0, 1]; anything that is not a finite number is the default. */
function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

/**
 * The three stored volumes. An absent or unreadable value, a missing storage or
 * a throw reads as 1; a number out of range is clamped; garbage is 1.
 */
export function readVolumes(storage: SoundStorage | null = defaultStorage()): Record<VolumeChannel, number> {
  const out: Record<VolumeChannel, number> = { crowd: DEFAULT_VOLUME, announcer: DEFAULT_VOLUME, effects: DEFAULT_VOLUME };
  if (!storage) return out;
  for (const channel of VOLUME_CHANNELS) {
    try {
      const raw = storage.getItem(volumeStorageKey(channel));
      if (raw === null || raw.trim() === '') continue;
      out[channel] = clampVolume(Number(raw));
    } catch {
      // This channel stays at its default.
    }
  }
  return out;
}

/** Writes one channel's volume, clamped. A full or forbidden storage is ignored: the slider still works for the session. */
export function writeVolume(channel: VolumeChannel, value: number, storage: SoundStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(volumeStorageKey(channel), String(clampVolume(value)));
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
  /** The compressor: where the three channel buses meet. */
  readonly bus: AudioNode;
  /** One gain per channel, between its voices and the compressor: the volume sliders. */
  readonly channels: Readonly<Record<VolumeChannel, GainNode>>;
  readonly noise: AudioBuffer;
  /** The recordings, by kind, once decoded. */
  readonly samples: Map<SoundKind, AudioBuffer>;
  /** The announcer's clips, by file name, once decoded. */
  readonly lines: Map<string, AudioBuffer>;
  /** The two crowd loops once decoded, and what plays of them. */
  readonly ambience: Ambience;
}

/** One crowd loop sounding: its source and its own gain, for the fades. */
interface CrowdVoice {
  readonly side: CrowdSide;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
}

interface Ambience {
  /** Each side's loop, once decoded. */
  readonly buffers: Map<CrowdSide, AudioBuffer>;
  /** The loop at full level, or rising to it. */
  playing: CrowdVoice | null;
  /** Loops on their way out after a crossfade, kept so a stop can cut them too. */
  readonly fading: Set<CrowdVoice>;
}

/** Holds a gain where it stands now, so a new ramp starts from there and not from the last scheduled value. */
function holdGain(param: AudioParam, now: number): void {
  const value = Math.max(SILENT, param.value);
  param.cancelScheduledValues(now);
  param.setValueAtTime(value, now);
}

/** Lets a loop go: down to silence in `fade` seconds, then stopped and unplugged. */
function fadeOutCrowd(engine: Engine, voice: CrowdVoice, fade: number): void {
  const { ctx, ambience } = engine;
  ambience.fading.add(voice);
  try {
    const now = ctx.currentTime;
    holdGain(voice.gain.gain, now);
    voice.gain.gain.exponentialRampToValueAtTime(SILENT, now + fade);
    voice.source.onended = () => {
      ambience.fading.delete(voice);
      try {
        voice.gain.disconnect();
      } catch {
        // Already gone with a closed context.
      }
    };
    voice.source.stop(now + fade + 0.05);
  } catch {
    // A loop that will not fade: cut it.
    ambience.fading.delete(voice);
    cutCrowd(voice);
  }
}

/** Stops one loop at once. */
function cutCrowd(voice: CrowdVoice): void {
  try {
    voice.source.stop();
    voice.source.disconnect();
    voice.gain.disconnect();
  } catch {
    // Already stopped.
  }
}

/**
 * Brings the crowd to `side`, if that side's loop is decoded: nothing when it
 * already plays, a fade-in of `CROWD_FADE_IN` from silence, or a crossfade of
 * `CROWD_CROSSFADE` from the other side's loop. When the loop is not decoded
 * yet, whatever plays goes on, and the caller asks again when it arrives.
 */
function syncAmbience(engine: Engine, side: CrowdSide): void {
  const { ambience, ctx } = engine;
  if (ambience.playing?.side === side) return;
  const buffer = ambience.buffers.get(side);
  if (!buffer) return;
  const old = ambience.playing;
  const fade = old ? CROWD_CROSSFADE : CROWD_FADE_IN;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = AMBIENCE.trim;
    src.loopEnd = Math.max(AMBIENCE.trim + 1, buffer.duration - AMBIENCE.trim);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENT, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(AMBIENCE.gain, ctx.currentTime + fade);
    src.connect(gain);
    gain.connect(engine.channels.crowd);
    src.start(0, AMBIENCE.trim);
    ambience.playing = { side, source: src, gain };
  } catch {
    // No new crowd, then; the old one, if any, plays on.
    return;
  }
  if (old) fadeOutCrowd(engine, old, fade);
}

/** Stops every crowd loop, playing or fading. The buffers stay for the next start. */
function stopAmbience(engine: Engine): void {
  const { ambience } = engine;
  if (ambience.playing) cutCrowd(ambience.playing);
  ambience.playing = null;
  for (const voice of ambience.fading) cutCrowd(voice);
  ambience.fading.clear();
}

/** Fetches one file under `public/sounds/` and decodes it; rejects on a missing file or a bad decode. */
function fetchBuffer(engine: Engine, base: string, path: string): Promise<AudioBuffer> {
  return fetch(`${base}sounds/${path}`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((bytes) => engine.ctx.decodeAudioData(bytes));
}

/**
 * Fetches and decodes the recordings into `engine.samples`, the two crowds
 * into `engine.ambience.buffers` and the announcer's lines into
 * `engine.lines`. Each failure is silent: that kind simply keeps its recipe,
 * that crowd stays quiet, that line is never said. Called once the context
 * runs, never before, so no decode is attempted on a suspended context.
 * `onAmbience` is called each time a crowd loop arrives.
 */
function loadSamples(engine: Engine, onAmbience: () => void): void {
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? '/';
  for (const side of ['defence', 'attack'] as const) {
    fetchBuffer(engine, base, AMBIENCE.files[side])
      .then((buffer) => {
        engine.ambience.buffers.set(side, buffer);
        onAmbience();
      })
      .catch(() => {
        // Silence under the game on that side, then.
      });
  }
  for (const [kind, sample] of Object.entries(SAMPLES) as [SoundKind, { file: string; gain: number }][]) {
    fetchBuffer(engine, base, sample.file)
      .then((buffer) => {
        engine.samples.set(kind, buffer);
      })
      .catch(() => {
        // The recipe stays.
      });
  }
  // One fetch per file, even if the manifest lists a file under two cues.
  const files = new Set<string>(Object.values(ANNOUNCER_LINES as Readonly<Record<string, readonly string[]>>).flat());
  for (const file of files) {
    fetchBuffer(engine, base, `announcer/${file}`)
      .then((buffer) => {
        engine.lines.set(file, buffer);
      })
      .catch(() => {
        // That line is never said.
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

/**
 * Whether the page has had a gesture at some point (sticky activation), which
 * is what lets a context start outside a handler without a word in the
 * console. False where the browser cannot say: then only a gesture starts it.
 */
function pageHasBeenActivated(): boolean {
  if (typeof navigator === 'undefined' || !('userActivation' in navigator)) return false;
  return navigator.userActivation.hasBeenActive;
}

function buildEngine(Ctor: AudioContextCtor, volumes: Readonly<Record<VolumeChannel, number>>): Engine {
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

  // One gain per channel, at the volume asked for before the context existed.
  const channels = {} as Record<VolumeChannel, GainNode>;
  for (const channel of VOLUME_CHANNELS) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(volumes[channel], ctx.currentTime);
    g.connect(compressor);
    channels[channel] = g;
  }

  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  return {
    ctx,
    bus: compressor,
    channels,
    noise: buffer,
    samples: new Map(),
    lines: new Map(),
    ambience: { buffers: new Map(), playing: null, fading: new Set() },
  };
}

const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const;

/**
 * Silent stand-in where there is no Web Audio: it still remembers the volumes
 * and the crowd's side, and says nothing (`lastSaid` stays null).
 */
function silentSounds(storage: SoundStorage | null): Sounds {
  const volumes = readVolumes(storage);
  let crowd: CrowdSide = 'defence';
  return {
    play() {},
    get volumes() {
      return { ...volumes };
    },
    setVolume(channel, value) {
      if (!VOLUME_CHANNELS.includes(channel) || typeof value !== 'number' || Number.isNaN(value)) return;
      volumes[channel] = clampVolume(value);
      writeVolume(channel, volumes[channel], storage);
    },
    get state() {
      return 'silent' as const;
    },
    setCrowd(side) {
      crowd = side;
    },
    get crowd() {
      return crowd;
    },
    say() {},
    get lastSaid() {
      return null;
    },
    dispose() {},
  };
}

/** What `createSounds` takes, both for tests. */
export interface SoundOptions {
  /** Where the volumes are remembered; the browser's localStorage by default, null for nowhere. */
  readonly storage?: SoundStorage | null;
  /** The announcer's dice, in [0, 1): `ANNOUNCER_CHANCE` and the choice of line. `Math.random` by default. */
  readonly random?: () => number;
}

/** The line the announcer is saying: its source and its own voice gain, so a goal can cut it. */
interface Speech {
  readonly source: AudioBufferSourceNode;
  readonly out: GainNode;
}

/**
 * The match's sounds. The options are for tests. Safe to call anywhere: it
 * makes no AudioContext until a gesture.
 */
export function createSounds(options: SoundOptions = {}): Sounds {
  const storage = 'storage' in options ? (options.storage ?? null) : defaultStorage();
  const random = options.random ?? Math.random;
  const Ctor = audioContextCtor();
  if (!Ctor) return silentSounds(storage);
  const ctor: AudioContextCtor = Ctor;

  /** The volumes in force; read once, then kept here so one set before the context exists is not lost. */
  const volumes = readVolumes(storage);
  let engine: Engine | null = null;
  let disposed = false;
  let voices = 0;
  let listening = false;
  let crowd: CrowdSide = 'defence';
  /** The announcer: what it says now, until when it holds the floor, what it said last per cue and overall. */
  let speech: Speech | null = null;
  let busyUntil = 0;
  const lastByCue = new Map<AnnouncerCue, string>();
  let lastSaid: string | null = null;

  /** Stops the line in progress, quickly faded so the cut does not click. */
  const hush = (ctx: AudioContext) => {
    if (!speech) return;
    const { source, out } = speech;
    speech = null;
    try {
      const now = ctx.currentTime;
      holdGain(out.gain, now);
      out.gain.exponentialRampToValueAtTime(SILENT, now + ANNOUNCER_CUT);
      source.stop(now + ANNOUNCER_CUT + 0.01);
    } catch {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
  };

  const unlisten = () => {
    if (!listening) return;
    listening = false;
    for (const type of GESTURES) window.removeEventListener(type, onGesture, true);
  };

  /**
   * Makes the context and loads the clips: from a gesture handler, or at once
   * when the page already holds an activation (2H.30). A context that comes
   * up suspended is resumed; refused, the listeners stay for the next gesture.
   */
  function start(): void {
    if (disposed) return;
    try {
      if (!engine) engine = buildEngine(ctor, volumes);
      const { ctx } = engine;
      const made = engine;
      // Each crowd loop that arrives is offered to the side in force at that moment.
      const onCrowd = () => {
        if (!disposed) syncAmbience(made, crowd);
      };
      if (ctx.state === 'running') {
        unlisten();
        loadSamples(made, onCrowd);
        return;
      }
      ctx.resume().then(
        () => {
          if (ctx.state === 'running') {
            unlisten();
            loadSamples(made, onCrowd);
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

  function onGesture(): void {
    if (!gestureIsActive()) return;
    start();
  }

  try {
    for (const type of GESTURES) window.addEventListener(type, onGesture, { capture: true, passive: true });
    listening = true;
  } catch {
    return silentSounds(storage);
  }
  // The page has been touched before this screen (the hub's buttons): start now.
  if (pageHasBeenActivated()) start();

  return {
    play(kind) {
      if (disposed || volumes.effects === 0 || !engine || voices >= MAX_VOICES) return;
      const { ctx, channels, noise: buffer } = engine;
      if (ctx.state !== 'running') return;
      try {
        const out = ctx.createGain();
        out.connect(channels.effects);
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
    get volumes() {
      return { ...volumes };
    },
    setVolume(channel, value) {
      if (!VOLUME_CHANNELS.includes(channel) || typeof value !== 'number' || Number.isNaN(value)) return;
      const v = clampVolume(value);
      volumes[channel] = v;
      writeVolume(channel, v, storage);
      // Live, on the channel's own gain; a context not yet open picks it up in `buildEngine`.
      if (engine && !disposed) {
        try {
          const param = engine.channels[channel].gain;
          param.cancelScheduledValues(engine.ctx.currentTime);
          param.setTargetAtTime(v, engine.ctx.currentTime, VOLUME_SETTLE);
        } catch {
          // A gain that will not move: the next start of that sound uses the new value.
        }
      }
    },
    get state() {
      if (disposed) return 'disposed' as const;
      return engine && engine.ctx.state === 'running' ? ('running' as const) : ('waiting' as const);
    },
    setCrowd(side) {
      if (side === crowd) return;
      crowd = side;
      // A loop not decoded yet starts on this side when it arrives (`onCrowd`).
      if (engine && !disposed) syncAmbience(engine, side);
    },
    get crowd() {
      return crowd;
    },
    say(cue) {
      // The draw comes first: a moment not to be commented this time costs nothing more.
      if (!passesChance(cue, random, ANNOUNCER_CHANCE)) return;
      if (disposed || volumes.announcer === 0 || !engine) return;
      const { ctx, channels, lines } = engine;
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const gate = admitCue(cue, now, busyUntil);
      if (gate === 'drop') return;
      // A priority moment cuts the line in progress even when it has nothing
      // of its own to say: a goal has no line since the 16th (his recording
      // says it), yet nobody may talk over "and it's a goal" (2H.26, C27).
      if (gate === 'cut') hush(ctx);
      const decoded = (ANNOUNCER_LINES[cue] as readonly string[]).filter((file) => lines.has(file));
      if (decoded.length === 0) return;
      const file = pickLine(decoded, lastByCue.get(cue) ?? null, random);
      const buffer = file === null ? undefined : lines.get(file);
      if (file === null || !buffer) return;
      try {
        const at = now + 0.005;
        const out = ctx.createGain();
        out.gain.setValueAtTime(ANNOUNCER_GAIN, at);
        out.connect(channels.announcer);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(out);
        const mine: Speech = { source, out };
        source.onended = () => {
          if (speech === mine) speech = null;
          try {
            out.disconnect();
          } catch {
            // Already gone with a closed context.
          }
        };
        source.start(at);
        speech = mine;
        busyUntil = at + Math.max(ANNOUNCER_COOLDOWN_MS / 1000, buffer.duration);
        lastByCue.set(cue, file);
        lastSaid = file;
      } catch {
        // A voice that failed to build: that comment is lost, the match goes on.
      }
    },
    get lastSaid() {
      return lastSaid;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unlisten();
      if (engine) {
        stopAmbience(engine);
        hush(engine.ctx);
        engine.ctx.close().catch(() => {});
        engine = null;
      }
    },
  };
}
