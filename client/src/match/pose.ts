/**
 * Where everything is part of the way through a beat.
 *
 * `motion.ts` says what travelled during a beat and how long each step takes;
 * this file says where each piece is at an instant `t` into the beat. It is
 * the one reading of a motion that both boards share (2H.15): the SVG board
 * ticks it into React state once a frame, the 2.5D board reads it inside its
 * own frame loop and moves the meshes by hand. Either way the sport is not
 * touched: a pose only interpolates between cells the events already named.
 *
 * Pulled out of `Board.tsx` unchanged when the 2.5D board arrived, so that a
 * glide, a push, a roll or a flight reads the same from above and in three
 * quarters.
 */

import type { Point } from '../../../engine/geometry.js';
import type { UnitId } from '../../../engine/types.js';
import type { Motion, MotionStep } from './motion.js';

/** What the steps have done to the pieces at a given instant. */
export interface Pose {
  /**
   * Fractional engine coordinates of every piece the beat moves and has not
   * finished moving, keyed `u:<id>`, `c:<id>` or `s`. A piece absent here is
   * drawn where `state` has it.
   */
  readonly moving: ReadonlyMap<string, Point>;
  /** Null once the ball is back to being whatever `state` says it is. */
  readonly ball: BallPose | null;
}

export type BallPose =
  /** Waiting for its flight: in a hand, or lying where it will hop from. */
  | { readonly kind: 'rest'; readonly at: Point; readonly held: boolean }
  | {
      readonly kind: 'air';
      readonly at: Point;
      readonly flight: 'pass' | 'shot' | 'scatter';
      /** 1 on the ground, up to the apex of the flight. */
      readonly scale: number;
      /** 0 on the ground, 1 at the apex. */
      readonly height: number;
    };

/** A step with the instants it begins and ends, so a frame can find its place without a search. */
export interface Plan {
  readonly motion: Motion;
  readonly starts: readonly number[];
  /** Steps that are the last one of their piece: once over, the piece goes back to `state`. */
  readonly last: ReadonlySet<number>;
  readonly firstBall: number;
  readonly lastBall: number;
  /** The unit carrying the ball into its first flight, when it walked there during the beat. */
  readonly bearer: UnitId | null;
}

export function pieceKey(step: MotionStep): string | null {
  switch (step.kind) {
    case 'unit':
      return `u:${step.unitId}`;
    case 'cracker':
      return `c:${step.crackerId}`;
    case 'spark':
      return 's';
    case 'ball':
      return null;
  }
}

export function planOf(motion: Motion): Plan {
  const starts: number[] = [];
  const last = new Set<number>();
  const seen = new Set<string>();
  let clock = 0;
  for (const timed of motion.steps) {
    starts.push(clock);
    clock += timed.ms;
  }
  // Walked backwards so the first sighting of a piece is its final step.
  for (let i = motion.steps.length - 1; i >= 0; i--) {
    const key = pieceKey(motion.steps[i]!.step);
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    last.add(i);
  }
  const balls = motion.steps.flatMap((timed, i) => (timed.step.kind === 'ball' ? [i] : []));
  const firstBall = balls[0] ?? -1;
  const lastBall = balls[balls.length - 1] ?? -1;

  // A thrower who walked before throwing carries the ball along the way: the
  // ball's launch cell is the end of that walk.
  let bearer: UnitId | null = null;
  const launch = firstBall >= 0 ? motion.steps[firstBall]!.step : null;
  if (launch && launch.kind === 'ball') {
    for (let i = 0; i < firstBall; i++) {
      const step = motion.steps[i]!.step;
      if (step.kind !== 'unit') continue;
      const end = step.path[step.path.length - 1];
      if (end && end.x === launch.from.x && end.y === launch.from.y) bearer = step.unitId;
    }
  }
  return { motion, starts, last, firstBall, lastBall, bearer };
}

export const easeOut = (u: number): number => 1 - (1 - u) ** 3;
export const lerp = (a: Point, b: Point, u: number): Point => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** A point part of the way along `from` then every cell of `path`, equal time per cell. */
export function along(from: Point, path: readonly Point[], u: number): Point {
  const n = path.length;
  if (n === 0) return from;
  const scaled = Math.min(Math.max(u, 0), 1) * n;
  const i = Math.min(Math.floor(scaled), n - 1);
  return lerp(i === 0 ? from : path[i - 1]!, path[i]!, scaled - i);
}

function glide(step: MotionStep, u: number): Point {
  switch (step.kind) {
    case 'unit':
      // A push is one sharp cell; a walk is even, so a long one reads as a stride.
      return step.gait === 'push' ? lerp(step.from, step.path[0]!, easeOut(u)) : along(step.from, step.path, u);
    case 'cracker':
    case 'spark':
      return along(step.from, step.path, u);
    case 'ball':
      return step.from;
  }
}

function endOf(step: MotionStep): Point {
  return step.kind === 'ball' ? step.to : step.path[step.path.length - 1]!;
}

/** Everything the steps have done at instant `t` into the beat. */
export function poseAt(plan: Plan, t: number): Pose {
  const { steps } = plan.motion;
  const moving = new Map<string, Point>();

  for (let i = 0; i < steps.length; i++) {
    const { step, ms } = steps[i]!;
    const key = pieceKey(step);
    if (key === null) continue;
    const start = plan.starts[i]!;
    if (t < start) {
      // Not its turn yet: it stays where the board last showed it.
      if (!moving.has(key)) moving.set(key, step.from);
    } else if (t >= start + ms) {
      // Done. The piece's last step hands it back to `state`; an earlier one
      // leaves it at the end of its route for the next step to pick up.
      if (plan.last.has(i)) moving.delete(key);
      else moving.set(key, endOf(step));
    } else {
      moving.set(key, glide(step, (t - start) / ms));
    }
  }

  return { moving, ball: ballAt(plan, t, moving) };
}

function ballAt(plan: Plan, t: number, moving: ReadonlyMap<string, Point>): BallPose | null {
  if (plan.firstBall < 0) return null;
  const { steps } = plan.motion;
  const { starts } = plan;
  const finish = starts[plan.lastBall]! + steps[plan.lastBall]!.ms;
  if (t >= finish) return null;

  const first = steps[plan.firstBall]!.step;
  if (first.kind !== 'ball') return null;
  // A ball in a hand is drawn as one; a ball that is about to hop lies on the floor.
  const heldBefore = (index: number): boolean => {
    for (let i = index; i < steps.length; i++) {
      const step = steps[i]!.step;
      if (step.kind === 'ball') return step.flight !== 'scatter';
    }
    return true;
  };

  if (t < starts[plan.firstBall]!) {
    const at = (plan.bearer && moving.get(`u:${plan.bearer}`)) || first.from;
    return { kind: 'rest', at, held: heldBefore(plan.firstBall) };
  }

  let landed: { at: Point; next: number } | null = null;
  for (let i = plan.firstBall; i <= plan.lastBall; i++) {
    const { step, ms } = steps[i]!;
    if (step.kind !== 'ball') continue;
    const start = starts[i]!;
    if (t >= start + ms) {
      landed = { at: step.to, next: i + 1 };
      continue;
    }
    if (t < start) break;
    const u = ms > 0 ? (t - start) / ms : 1;
    const arc = Math.sin(Math.PI * u);
    return step.flight === 'scatter'
      ? { kind: 'air', at: lerp(step.from, step.to, easeOut(u)), flight: 'scatter', scale: 1 + 0.2 * arc, height: arc }
      : { kind: 'air', at: lerp(step.from, step.to, u), flight: step.flight, scale: 1 + 0.6 * arc, height: arc };
  }
  // Between two flights it waits where the last one set it down.
  return landed ? { kind: 'rest', at: landed.at, held: heldBefore(landed.next) } : null;
}
