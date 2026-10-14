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
import type { MatchState, UnitId } from '../../../engine/types.js';
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
 * Everything `Board.tsx` needs to animate one beat. `key` changes with every
 * beat so the board can tell a new beat from a re-render of the same one, and
 * `totalMs` is the sum of the steps, which is also how long `useMatch.ts` holds
 * the beat at the very least.
 */
export interface Motion {
  readonly key: number;
  readonly steps: readonly TimedStep[];
  readonly totalMs: number;
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

/** Times a beat's steps at a speed. `key` is the caller's: the index of the beat in its batch. */
export function timeMotion(key: number, steps: readonly MotionStep[], speed: ReplaySpeed): Motion {
  const timed = steps.map((step) => ({ step, ms: stepDuration(step, speed) }));
  return { key, steps: timed, totalMs: timed.reduce((total, one) => total + one.ms, 0) };
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
  const steps: MotionStep[] = [];

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

  for (const event of events) {
    switch (event.kind) {
      case 'moved':
        unitStep(event.unitId, event.path, 'walk');
        break;
      case 'recoiled':
        unitStep(event.unitId, [event.to], 'push');
        break;
      case 'shoved':
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

  return steps;
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
