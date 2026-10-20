/**
 * What moved during a beat, and how long each movement takes on screen.
 *
 * `replay.ts` cuts a batch of events into beats, one per turn, and projects the
 * board through each one. That projection is a board **after** the beat; shown
 * on its own, a Giff that walked eight cells simply appears eight cells away,
 * and Jérôme's verdict on 2026-10-10 was that without movement he could not
 * tell what anyone was trying to do. This file is the other half of a beat: the
 * list of things that travelled during it, in the order the events say they
 * did, each with a start, a route and a duration at the chosen replay speed.
 *
 * **It transcribes, it never resolves.** Every point below is copied out of an
 * event (`moved.from` and `moved.path`, `shoved.pushedTo`, `sparkMoved.path`,
 * `payloadScattered.to`) or read off the board as it stood before the beat
 * (where the thrower was standing when the ball left its hands). Nothing here
 * decides where anything ends up; the beat's own `state` already says that,
 * and the board snaps to it the moment the motion is over.
 *
 * One beat is one action, animated once: `Board.tsx` plays the steps one after
 * another inside the beat's hold, and `useMatch.ts` holds the beat at least as
 * long as the steps take. At `instant` every duration is zero and the board
 * draws the beat's final state directly, which is what the screen harness
 * relies on for a capture that does not depend on a frame.
 */

import { distance, type Point } from '../../../engine/geometry.js';
import type { MatchEvent } from '../../../engine/events.js';
import type { MatchState, TeamId, UnitId } from '../../../engine/types.js';
import { spec } from '../lib/arena.js';
import type { ReplaySpeed } from './testHook.js';

/** One thing travelling, in the order the beat's events state. */
export type MotionStep =
  | {
      readonly kind: 'unit';
      readonly unitId: UnitId;
      /** Where it stood when the step begins. */
      readonly from: Point;
      /** The cells it passes through, in order, the last one being where it stops. */
      readonly path: readonly Point[];
      /** A walk is paced per cell; a push or a recoil is one sharp cell. */
      readonly gait: 'walk' | 'push';
    }
  | { readonly kind: 'cracker'; readonly crackerId: string; readonly from: Point; readonly path: readonly Point[] }
  | { readonly kind: 'spark'; readonly from: Point; readonly path: readonly Point[] }
  | {
      readonly kind: 'ball';
      readonly from: Point;
      readonly to: Point;
      /** A pass or a shot arcs; a scatter is a short low hop off a hand or a hatch. */
      readonly flight: 'pass' | 'shot' | 'scatter';
    };

/** A step with the time it takes at the speed the player chose. Zero at `instant`. */
export interface TimedStep {
  readonly step: MotionStep;
  readonly ms: number;
}

/**
 * What flashed during a beat, as opposed to what travelled (2H.21, `00` C23).
 *
 * A cue is one visible thing for one event: the sparks of a bat that lands,
 * the number of a wound, the blast of a Cracker, the embers of a goal. Like a
 * step it is a transcription: the cell and the words come out of the event,
 * and **when** it happens is read off the steps, never guessed. A cue fires
 * once every step produced by the events before it is over (`after`), so the
 * blast waits for the Cracker's roll, the embers for the shot's flight, and
 * the impact comes before the recoil it causes.
 */
export type CueKind =
  /** `unitId` did something: the word (`text`, one of `ACTION_WORDS`) rises over it, both boards (2H.22, `00` C24). */
  | 'action'
  /** A bat landed on `unitId`: sparks, 3D only. The number is the `damage` cue. */
  | 'hit'
  /** `unitId` took `text` hit points: the number rises, in both boards. */
  | 'damage'
  /** A swing missed `unitId`: the word rises, both boards. */
  | 'miss'
  /** A Shove that did not move `unitId`: the word rises, both boards. */
  | 'held'
  /** A Shove landed on `unitId`: a ring on the floor under it, 3D only. */
  | 'push'
  /** A Cracker went off on `at`, 3D only. */
  | 'blast'
  /** A goal went into the mouth at `at`, defended by `team`, 3D only. */
  | 'goal'
  /** The Spark came down on `at`, 3D only. */
  | 'sparkIn'
  /** `unitId` caught the Spark on `at`, 3D only. */
  | 'sparkCaught'
  /** `unitId` was carried off from `at`: it sinks, 3D only. */
  | 'exit'
  /** `unitId` came on at `at`: it rises, 3D only. */
  | 'enter';

export interface Cue {
  readonly kind: CueKind;
  /** The cell it happens on, in engine coordinates. */
  readonly at: Point;
  /** The unit it concerns, when one does. */
  readonly unitId?: UnitId | undefined;
  /** The words that rise over the cell, for `damage`, `miss`, `held` and `action`. */
  readonly text?: string | undefined;
  /** For an action aimed at something: the cell it is aimed at, so the 3D Giff can turn to it (2H.22). */
  readonly toward?: Point | undefined;
  /** For a goal: the team whose Furnace took it, so the embers wear its colour. */
  readonly team?: TeamId | undefined;
  /** How many of the beat's steps precede it. It fires once they are done. */
  readonly after: number;
}

/**
 * The word an action raises over its actor (2H.22, `00` C24 line 2): Jérôme's
 * seven, plus BAT and DODGE on his answer, plus CATCH on the Trajector's
 * attempt at the Spark (2H.25, `00` C26 point 2): ten words. The key is the
 * event's kind.
 */
export const ACTION_WORDS = {
  attacked: 'SWING',
  opportunityAttacked: 'ATCK OP',
  shoved: 'SHOVE',
  shotAtFurnace: 'SHOOT',
  passed: 'PASS',
  disengaged: 'DISENGAGE',
  dashed: 'DASH',
  crackerBatted: 'BAT',
  dodging: 'DODGE',
  sparkCaught: 'CATCH',
} as const;

/**
 * How long a word stays up over a head, by replay speed (2H.22, `00` C24
 * line 4): Jérôme asked for twice the second of 2H.21 at normal. Zero at
 * `instant`, where nothing rises. The rise animation lasts the same time.
 */
export const FLOAT_MS: Readonly<Record<ReplaySpeed, number>> = { slow: 3000, normal: 2000, instant: 0 };

/** A cue with the instant into the beat, in milliseconds, at which it fires. Zero at `instant`. */
export interface TimedCue {
  readonly cue: Cue;
  readonly t: number;
}

/**
 * Everything `Board.tsx` needs to animate one beat. `key` changes with every
 * beat so the board can tell a new beat from a re-render of the same one, and
 * `totalMs` is the sum of the steps, which is also how long `useMatch.ts` holds
 * the beat at the very least.
 */
export interface Motion {
  readonly key: number;
  readonly steps: readonly TimedStep[];
  readonly totalMs: number;
  /** The speed it was timed at. At `instant` the boards draw `state` and fire nothing. */
  readonly speed: ReplaySpeed;
  /** What flashes during the beat, timed. Empty when the beat was quiet. */
  readonly cues: readonly TimedCue[];
}

// -- Timing -------------------------------------------------------------------

/**
 * Milliseconds per cell for a walking Giff. A full move of eight cells takes
 * under a second at normal, which sits inside the two and a half seconds the
 * beat's card is already held for; a Dash of sixteen runs a little past it and
 * the hold stretches to fit rather than the glide being cut.
 */
const WALK_MS_PER_CELL: Readonly<Record<ReplaySpeed, number>> = { slow: 180, normal: 110, instant: 0 };

/** A push or a bat recoil: one cell, sharp. */
const PUSH_MS: Readonly<Record<ReplaySpeed, number>> = { slow: 260, normal: 160, instant: 0 };

/** The hazards roll faster than a Giff walks: ten cells of Cracker in well under a second. */
const ROLL_MS_PER_CELL: Readonly<Record<ReplaySpeed, number>> = { slow: 120, normal: 70, instant: 0 };

/** A pass or a shot, whatever the distance: the arc reads as one gesture. */
const FLIGHT_MS: Readonly<Record<ReplaySpeed, number>> = { slow: 800, normal: 500, instant: 0 };

/** A scattered ball hops a cell or four and stops. */
const SCATTER_MS: Readonly<Record<ReplaySpeed, number>> = { slow: 450, normal: 280, instant: 0 };

export function stepDuration(step: MotionStep, speed: ReplaySpeed): number {
  switch (step.kind) {
    case 'unit':
      return step.gait === 'push' ? PUSH_MS[speed] : WALK_MS_PER_CELL[speed] * step.path.length;
    case 'cracker':
    case 'spark':
      return ROLL_MS_PER_CELL[speed] * step.path.length;
    case 'ball':
      return step.flight === 'scatter' ? SCATTER_MS[speed] : FLIGHT_MS[speed];
  }
}

/**
 * Times a beat's steps, and its cues, at a speed. `key` is the caller's: the
 * index of the beat in its batch. A cue's instant is the sum of the steps
 * before it, so it lands exactly where the eye is.
 */
export function timeMotion(
  key: number,
  steps: readonly MotionStep[],
  speed: ReplaySpeed,
  cues: readonly Cue[] = [],
): Motion {
  const timed = steps.map((step) => ({ step, ms: stepDuration(step, speed) }));
  const starts: number[] = [0];
  for (const one of timed) starts.push(starts[starts.length - 1]! + one.ms);
  const total = starts[starts.length - 1]!;
  return {
    key,
    steps: timed,
    totalMs: total,
    speed,
    cues: cues.map((cue) => ({ cue, t: starts[Math.min(cue.after, timed.length)]! })),
  };
}

// -- Extraction ---------------------------------------------------------------

/**
 * The steps of one beat, read from its events and from the board as it stood
 * before them.
 *
 * `before` is needed for two things an event does not carry: where a shoved
 * unit was standing before it was pushed, and where the ball was when it was
 * thrown, which is the thrower's cell at that moment. Both are tracked as the
 * events are walked, so a unit that walked and was then pushed is pushed from
 * where its walk ended, not from where the beat started.
 */
export function motionOf(before: MatchState, events: readonly MatchEvent[]): MotionStep[] {
  return motionAndCues(before, events).steps;
}

/**
 * The steps and the cues of one beat, in one walk, since both need to know
 * where everything stood at each event. Every cue below names its cell from
 * the event or from the position tracked so far, and its `after` is the
 * number of steps already produced, which is what times it.
 */
export function motionAndCues(
  before: MatchState,
  events: readonly MatchEvent[],
): { steps: MotionStep[]; cues: Cue[] } {
  const steps: MotionStep[] = [];
  const cues: Cue[] = [];

  const at = new Map<UnitId, Point>(before.units.map((u) => [u.id, { x: u.x, y: u.y }] as const));
  const crackers = new Map(before.crackers.map((c) => [c.id, { x: c.x, y: c.y }] as const));
  let spark: Point = { x: before.spark.x, y: before.spark.y };

  // Where the ball is right now, carried or loose. Updated as the events say,
  // never guessed: a grab puts it on the grabber, a drop puts it on the floor.
  const carrier = before.payload.carriedBy;
  let ball: Point = carrier
    ? at.get(carrier) ?? { x: before.payload.x, y: before.payload.y }
    : { x: before.payload.x, y: before.payload.y };

  const unitStep = (unitId: UnitId, path: readonly Point[], gait: 'walk' | 'push'): void => {
    const from = at.get(unitId);
    if (!from || path.length === 0) return;
    steps.push({ kind: 'unit', unitId, from, path, gait });
    const to = path[path.length - 1]!;
    at.set(unitId, to);
    // A carried ball travels with its carrier.
    if (before.payload.carriedBy === unitId || ball === from) ball = to;
  };

  /** A cue on a unit, where it stands right now. */
  const cueOn = (kind: CueKind, unitId: UnitId, text?: string): void => {
    const where = at.get(unitId);
    if (where) cues.push({ kind, at: where, unitId, text, after: steps.length });
  };
  /** The word of an action over its actor, where it stands, aimed at `toward` when it is aimed at anything. */
  const action = (unitId: UnitId, word: keyof typeof ACTION_WORDS, toward?: Point): void => {
    const where = at.get(unitId);
    if (where) cues.push({ kind: 'action', at: where, unitId, text: ACTION_WORDS[word], toward, after: steps.length });
  };

  for (const event of events) {
    switch (event.kind) {
      case 'moved':
        unitStep(event.unitId, event.path, 'walk');
        break;
      case 'recoiled':
        unitStep(event.unitId, [event.to], 'push');
        break;
      case 'attacked':
      case 'opportunityAttacked':
        // The word over the attacker first, then what the bat did to the target.
        action(event.attackerId, event.kind, at.get(event.targetId));
        if (event.hit) cueOn('hit', event.targetId);
        else cueOn('miss', event.targetId, 'miss');
        break;
      case 'dashed':
      case 'disengaged':
      case 'dodging':
        action(event.unitId, event.kind);
        break;
      case 'crackerBatted':
        action(event.unitId, 'crackerBatted', crackers.get(event.crackerId));
        break;
      case 'damaged':
        cueOn('damage', event.unitId, `\u2212${event.amount}`);
        break;
      case 'evacuated':
        cueOn('exit', event.unitId);
        break;
      case 'shoved':
        action(event.shoverId, 'shoved', at.get(event.targetId));
        // The ring is under the target where it stood when the Shove landed,
        // before the push; a Shove that holds says so in a word instead.
        if (event.success) cueOn('push', event.targetId);
        else cueOn('held', event.targetId, 'held');
        if (event.pushedTo) unitStep(event.targetId, [event.pushedTo], 'push');
        // Écart 61: the ball goes from where it was to the shover's hands.
        if (event.tookPayload) {
          const shover = at.get(event.shoverId);
          if (shover) {
            steps.push({ kind: 'ball', from: ball, to: shover, flight: 'pass' });
            ball = shover;
          }
        }
        break;
      case 'substituteEntered':
        // Appears; nothing travels. Recorded so a later push starts from the right cell.
        at.set(event.unitId, event.at);
        cues.push({ kind: 'enter', at: event.at, unitId: event.unitId, after: steps.length });
        break;
      case 'crackerDetonated':
        // The event names the cell; `after` makes the blast wait for the roll.
        cues.push({ kind: 'blast', at: event.at, after: steps.length });
        break;
      case 'crackerMoved': {
        const from = crackers.get(event.crackerId) ?? event.from;
        if (event.path.length > 0) steps.push({ kind: 'cracker', crackerId: event.crackerId, from, path: event.path });
        crackers.set(event.crackerId, event.to);
        break;
      }
      case 'crackerRespawned':
        crackers.set(event.crackerId, event.at);
        break;
      case 'sparkEntered':
        spark = event.at;
        cues.push({ kind: 'sparkIn', at: event.at, after: steps.length });
        break;
      case 'sparkCaught':
        // 2H.25, `00` C26 point 2: CATCH rises on the attempt; a miss shows the grey word, like a missed swing.
        action(event.unitId, 'sparkCaught', spark);
        if (event.caught) cueOn('sparkCaught', event.unitId);
        else cueOn('miss', event.unitId, 'miss');
        break;
      case 'scored':
        // The shot's flight set `ball` on the hatch; the embers come when it lands.
        // 2H.40 (`00` C40): the Spark's twenty points are not a goal. Its catch
        // already has its flash and its own voice; before this, every `scored`
        // lit the embers on the ball and played "and it's a goal" over the Spark.
        if (event.source === 'payload') {
          cues.push({ kind: 'goal', at: ball, team: event.team === 'A' ? 'B' : 'A', after: steps.length });
        }
        break;
      case 'sparkMoved':
        if (event.path.length > 0) steps.push({ kind: 'spark', from: spark, path: event.path });
        spark = event.to;
        break;
      case 'payloadGrabbed':
        ball = at.get(event.unitId) ?? ball;
        break;
      case 'payloadDropped':
        // Lost where the carrier stands. If it then scatters, the scatter is
        // the step; if not, it simply lies there.
        ball = event.at;
        break;
      case 'passed': {
        const to = at.get(event.toId);
        action(event.fromId, 'passed', to);
        if (to) steps.push({ kind: 'ball', from: ball, to, flight: 'pass' });
        // A dropped pass scatters from the receiver's cell, which is where the
        // engine measures the scatter from; the scatter event supplies the rest.
        if (to) ball = to;
        break;
      }
      case 'passIntercepted': {
        if (!event.success) break;
        const thief = at.get(event.interceptorId);
        if (thief) {
          steps.push({ kind: 'ball', from: ball, to: thief, flight: 'pass' });
          ball = thief;
        }
        break;
      }
      case 'shotAtFurnace': {
        const shooter = at.get(event.unitId) ?? ball;
        const hatch = nearestHatch(shooter, before.units.find((u) => u.id === event.unitId)?.team ?? 'A');
        action(event.unitId, 'shotAtFurnace', hatch);
        steps.push({ kind: 'ball', from: shooter, to: hatch, flight: 'shot' });
        // A miss comes back off the hatch; `payloadScattered` says where to.
        ball = hatch;
        break;
      }
      case 'payloadScattered':
        steps.push({ kind: 'ball', from: ball, to: event.to, flight: 'scatter' });
        ball = event.to;
        break;
      case 'payloadReset':
        ball = event.at;
        break;
      default:
        break;
    }
  }

  return { steps, cues };
}

/**
 * The hatch cell a shot is drawn flying at: the nearest cell of the Furnace the
 * shooter's team attacks. The engine resolves a shot against the mouth as a
 * region, so which cell the disc hits is a drawing decision, not a rule.
 */
function nearestHatch(from: Point, team: 'A' | 'B'): Point {
  const furnace = spec.furnaces.find((f) => f.defendedBy !== team) ?? spec.furnaces[0]!;
  let best = furnace.cells[0]!;
  for (const cell of furnace.cells) if (distance(from, cell) < distance(from, best)) best = cell;
  return best;
}
