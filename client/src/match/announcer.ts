/**
 * The match announcer: what is said, and when a line may be said.
 *
 * Why (2H.25, `00` C26 point 5): Jérôme recorded two announcer packs, two
 * voices ("banter man" and "dragon"), and wants the match commented, with
 * variety: « pas toujours le même commentaire pour un swing réussi ou un joueur
 * ko ». So every moment of the match worth a word (`AnnouncerCue`) has a list
 * of clips, one is drawn at random each time, and never the one just heard for
 * that moment when there is another to say.
 *
 * Pacing. Two lines never overlap. After a line starts, the announcer is busy
 * until the later of its own end and `ANNOUNCER_COOLDOWN_MS`; a line asked for
 * meanwhile is dropped, not queued, because a comment that arrives late is
 * about a moment already gone. The three moments that matter more than any
 * other (`ANNOUNCER_PRIORITY`: a goal either way, the final whistle) cut the
 * line in progress instead of waiting. A moment may also be commented only
 * some of the time (`ANNOUNCER_CHANCE`, drawn before anything else); since
 * 2H.26 (`00` C27) no moment is, Jérôme wanting every bat and every Shove
 * called, with the busy floor alone keeping three opportunity attacks in one
 * second down to one line.
 *
 * This file is pure: no Web Audio, no fetch. `sound.ts` loads the clips and
 * plays them; the choices made here are tested in `sound.test.ts`.
 */

/**
 * The clips, by moment. Each entry is a file name without its folder, served
 * from `public/sounds/announcer/` (for example `'banter-01-what-a-hit.mp3'`).
 *
 * The lists are empty on purpose for now: the main thread fills this manifest
 * from the transcription of Jérôme's two packs, once it has cut them into
 * clips, and may add moments as it goes (round2, round3, suddenDeath,
 * knockoutOwn, idle, clock, win, loss, champion...). The keys ARE the type
 * `AnnouncerCue`, so a moment added here can be said at once, without touching
 * `sound.ts`. A moment with no line, or whose files are all missing or fail to
 * decode, is simply not commented; nothing else changes.
 */
export const ANNOUNCER_LINES = {
  // The match opens: the first turn banner of round 1.
  champion: ['dragon-01-select-your-champion.mp3'],
  // Round 1 opens. Jérôme cut "Death match" and "First round", and the round
  // two and three calls, on 2026-10-16: one word, then the whistle does the job.
  kickoff: ['dragon-02-fight.mp3'],
  suddenDeath: ['dragon-15-sudden-death.mp3', 'dragon-12-death-round.mp3'],
  // A bat lands on a Giff, every time the floor is free (2H.26).
  hit: [
    'banter-01-ooh-that-s-gotta-hurt.mp3',
    'banter-05-oh-my-god-that-definitely.mp3',
    'banter-06-now-that-s-gonna-leave.mp3',
    'banter-08-holy-crap-what-a-beating.mp3',
    'banter-11-i-m-about-as-desensitized.mp3',
    'banter-19-that-looks-painful.mp3',
    'banter-21-i-definitely-heard-a-crack.mp3',
    'banter-22-i-gotta-say-that-fist.mp3',
    'dragon-03-embrace-the-fury.mp3',
    'dragon-06-killing-frenzy.mp3',
    'dragon-21-savagery.mp3',
    'dragon-24-ferocity.mp3',
    'dragon-27-vicious.mp3',
  ],
  // A swing finds air, a Shove is held, the Spark slips through the fingers.
  miss: [
    'banter-03-how-embarrassing.mp3',
    'banter-14-well-that-s-unfortunate.mp3',
    'banter-25-i-ve-seen-more-resistance.mp3',
    'banter-26-that-is-what-we-call.mp3',
    'dragon-04-fear-is-weakness.mp3',
    'dragon-07-pathetic.mp3',
    'dragon-20-disappointing.mp3',
  ],
  // A Giff of either side is carried off.
  knockout: [
    'banter-02-somebody-call-a-doctor.mp3',
    'banter-04-ha-ha-ha-clean-up.mp3',
    'banter-07-oh-damn-i-really-hope.mp3',
    'banter-10-that-looks-like-a-one.mp3',
    'banter-23-this-just-in-the-cleanup.mp3',
    'dragon-16-knockout.mp3',
    'dragon-17-ko.mp3',
    'dragon-22-execution.mp3',
    'dragon-23-finality.mp3',
  ],
  // The player's own Giff is carried off.
  knockoutOwn: ['dragon-18-you-died.mp3', 'banter-02-somebody-call-a-doctor.mp3', 'banter-10-that-looks-like-a-one.mp3'],
  // A Shove that moved its target.
  shove: ['dragon-08-the-zerk.mp3', 'dragon-25-decimation.mp3', 'banter-06-now-that-s-gonna-leave.mp3'],
  // Goals are not commented (Jérôme, 2026-10-16): his own recording, "and it's
  // a goal", plays as the `goal` sample and says it all. The keys stay so a
  // goal still cuts whatever the announcer was saying.
  goalOwn: [],
  goalFoe: [],
  // The Spark rolls onto the pitch.
  sparkIn: ['dragon-19-i-demand-a-sacrifice.mp3'],
  // The Spark is caught.
  spark: ['banter-18-and-that-s-why-i.mp3', 'dragon-14-victor.mp3'],
  // A Cracker goes off on somebody.
  blast: ['banter-13-i-know-it-s-a.mp3', 'banter-23-this-just-in-the-cleanup.mp3', 'banter-05-oh-my-god-that-definitely.mp3', 'dragon-05-apocalypse.mp3'],
  // The player's clock is down to thirty seconds.
  clock: ['banter-16-come-on-do-something.mp3', 'banter-15-what-a-snoozefest.mp3'],
  // Full time: won, lost, drawn.
  win: ['dragon-14-victor.mp3', 'dragon-28-game-over.mp3'],
  loss: ['dragon-28-game-over.mp3', 'dragon-18-you-died.mp3'],
  fullTime: ['dragon-28-game-over.mp3'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

/** A moment of the match that may be commented: any key of the manifest. */
export type AnnouncerCue = keyof typeof ANNOUNCER_LINES;

/**
 * How often a moment is commented at all, from 0 to 1; 1 for any cue left out.
 * `say` draws first, before anything else, and drops the comment when the draw
 * is at or above the chance. 2H.25 had the bat at 0.3, the miss and the Shove
 * at 0.25, the Cracker at 0.5; after his match Jérôme heard most swings go
 * uncommented and asked for one line every time, « mais qu'une » (2H.26, `00`
 * C27). So the table is empty: every moment is said whenever the floor is
 * free, and the floor (`ANNOUNCER_COOLDOWN_MS`, the clip's own length) is what
 * turns a burst of attacks into a single line. The mechanism stays for the
 * day a moment proves too chatty again.
 */
export const ANNOUNCER_CHANCE: Readonly<Partial<Record<AnnouncerCue, number>>> = {};

/**
 * The draw of `ANNOUNCER_CHANCE`: true when `cue` is to be commented this
 * time. `random` is in [0, 1), like `Math.random`, so a chance of 1 always
 * passes and 0 never does. `chances` is the table, passed in by `sound.ts` so
 * a test that swaps the manifest swaps this too.
 */
export function passesChance(
  cue: AnnouncerCue,
  random: () => number,
  chances: Readonly<Partial<Record<AnnouncerCue, number>>> = ANNOUNCER_CHANCE,
): boolean {
  return random() < (chances[cue] ?? 1);
}

/** The announcer's level on the voice gain, before the shared compressor and master. */
export const ANNOUNCER_GAIN = 0.9;

/** The least time between the starts of two lines, in milliseconds. A longer clip keeps the floor until it ends. */
export const ANNOUNCER_COOLDOWN_MS = 2500;

/** The moments that cut the line in progress rather than being dropped. */
export const ANNOUNCER_PRIORITY: ReadonlySet<AnnouncerCue> = new Set<AnnouncerCue>(['goalOwn', 'goalFoe', 'fullTime', 'win', 'loss']);

/**
 * Draws one line at random from `lines`, never `last` when there are at least
 * two lines to choose from: the same comment twice in a row is exactly what
 * Jérôme asked to avoid. `null` when there is nothing to say. `random` returns
 * a number in [0, 1), like `Math.random`, which is what the caller passes.
 */
export function pickLine(lines: readonly string[], last: string | null, random: () => number): string | null {
  if (lines.length === 0) return null;
  const others = lines.length > 1 ? lines.filter((line) => line !== last) : lines;
  // Every line equal to `last` (a manifest that lists one file twice): say it anyway.
  const pool = others.length > 0 ? others : lines;
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index] ?? null;
}

/**
 * Whether a line for `cue` may start at `now`, given that the announcer is
 * busy until `busyUntil` (both in the same unit): `play` when the floor is
 * free, `cut` when it is not but the moment is a priority one (the line in
 * progress, if any, is stopped first), `drop` otherwise.
 */
export function admitCue(cue: AnnouncerCue, now: number, busyUntil: number): 'play' | 'cut' | 'drop' {
  if (now >= busyUntil) return 'play';
  return ANNOUNCER_PRIORITY.has(cue) ? 'cut' : 'drop';
}
