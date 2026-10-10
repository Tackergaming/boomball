/**
 * The playing surface: the whole pitch at once, seen from above.
 *
 * **The layout is the ground.** There is no picture under the grid any more
 * (D11). Solid cells are drawn from `KILL_SILO.rows` through `arena.cellAt`, on
 * a dark floor, so what a player sees is exactly what the engine walks on.
 *
 * The pitch lies along the width of the screen: forty-five cells long, fifteen
 * across. The engine's `y` is the screen column, 0 at the left where the
 * player's own Furnace sits and 44 at the right where the house's does, and the
 * engine's `x` is the screen row, 0 at the top. A cell (x, y) is therefore the
 * SVG rect at `x={y} y={x}`, and that swap is made here, at the point of
 * drawing, and nowhere else. `testHook.cellToScreen` applies the same rule to
 * the stage element, so a script clicks where this file drew.
 *
 * The three thirds are marked by two faint lines and carry no rule: they are
 * there for the eye, not for the game.
 *
 * **Things move.** The board is handed the beat's final `state` and, beside it,
 * a `Motion`: the list of things that travelled during the beat. The state says
 * where everything ends up and the motion says how it got there, so the board
 * keeps a *display* position for whatever can travel and plays the steps one
 * after another on a single animation frame loop. Whenever there is nothing to
 * play (no motion, or a motion of zero length at the `instant` speed) the
 * display positions are the state's, in the same render, with no frame between.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';

import type { Action } from '../../../engine/actions.js';
import type { Point } from '../../../engine/geometry.js';
import type { LegalActions } from '../../../engine/legalActions.js';
import { pathCostFeet, pathTo, reachableCells, type Reachable } from '../../../engine/rules/movement.js';
import { provokedAlong } from '../../../engine/rules/reactions.js';
import { activeUnits, sparkIsLive, type MatchState, type Unit, type UnitId } from '../../../engine/types.js';
import { ARENA_HEIGHT, ARENA_WIDTH, THIRD_LENGTH, arena, spec } from '../lib/arena.js';
import type { Pending } from './ActionBar.js';
import type { Motion, MotionStep } from './motion.js';

/** Columns on screen, which is the pitch's length. */
const COLS = ARENA_HEIGHT;
/** Rows on screen, which is the pitch's width. */
const ROWS = ARENA_WIDTH;

const BRASS = '#c9b489';

export interface BoardProps {
  state: MatchState;
  legal: LegalActions | null;
  /** The team the human plays for. Everything else is the house. */
  own: 'A' | 'B';
  /** Null when it is not this client's turn to act. */
  onMove: ((path: readonly Point[]) => void) | null;
  onSelectUnit: (unitId: string | null) => void;
  selected: string | null;
  /** The one Giff this player drives, drawn apart from the rest of the side. */
  yoursId?: UnitId | null;
  /** The unit whose beat is being replayed, ringed so the eye finds it. */
  spotlight?: UnitId | null;
  /**
   * What travelled during the beat `state` is the end of. A new object is a new
   * beat. Null, or a total of zero, means there is nothing to play and the
   * board draws `state` as it stands.
   */
  motion?: Motion | null;
  /**
   * What the action bar has started. With a Swing, Shove or Pass pending, the
   * tokens that action may target wear a ring and a click on one is the answer.
   */
  pending?: Pending;
  /** Null when this client may not act, as for `onMove`. */
  onAct?: ((action: Action) => void) | null;
  /**
   * Route plotting. `on` turns a click on a cell into a waypoint; `route` is
   * the cells chosen so far, origin excluded, ready to be sent whole as a move.
   * The board only draws it and asks the engine for each next segment: the
   * state lives in the match screen, which clears it whenever the board moves.
   */
  plot?: { readonly on: boolean; readonly route: readonly Point[] } | null;
  onPlotStep?: ((segment: Point[]) => void) | null;
}

/** The unit as it would stand on `cell`, so the engine can be asked about the walk from there. */
function unitAt(unit: Unit, cell: Point): Unit {
  return { ...unit, x: cell.x, y: cell.y };
}

/**
 * Opportunity attacks a route would draw: the engine's own count, through
 * `provokedAlong`, for the plotted waypoints followed by the shortest way to
 * `cell` from the last of them.
 */
function swingsTo(
  state: MatchState,
  mover: Unit,
  planned: readonly Point[],
  reach: ReadonlyMap<string, Reachable>,
  cell: Point,
): { segment: Point[]; swings: number } | null {
  const segment = pathTo(reach, cell);
  if (!segment) return null;
  return { segment, swings: provokedAlong(state, mover, [...planned, ...segment]).length };
}

const NO_ROUTE: readonly Point[] = [];

const swingsText = (n: number): string => (n === 0 ? 'clean' : `${n} swing${n === 1 ? '' : 's'} on the way`);

/** The cell centres of a route as SVG points, starting from `from`. */
const polyline = (from: Point, route: readonly Point[]): string =>
  [from, ...route].map((p) => `${p.y + 0.5},${p.x + 0.5}`).join(' ');

// -- Motion -------------------------------------------------------------------

/**
 * Where the animation stands. Kept as one piece of React state so that a new
 * beat can be taken in during the render that receives it (see `Board`): the
 * first frame of a glide must already show the pieces at their starting cells,
 * not the finished board for one frame before an effect gets to say otherwise.
 */
interface Track {
  /** The beat this track was opened for. Compared by identity. */
  readonly motion: Motion | null;
  /** The state that came with it. A different one means the board moved on. */
  readonly state: MatchState;
  /** Whether the steps are being played. False means: draw `state`. */
  readonly live: boolean;
  readonly elapsed: number;
}

/** What the steps have done to the pieces at a given instant. */
interface Pose {
  /**
   * Fractional engine coordinates of every piece the beat moves and has not
   * finished moving, keyed `u:<id>`, `c:<id>` or `s`. A piece absent here is
   * drawn where `state` has it.
   */
  readonly moving: ReadonlyMap<string, Point>;
  /** Null once the ball is back to being whatever `state` says it is. */
  readonly ball: BallPose | null;
}

type BallPose =
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
interface Plan {
  readonly motion: Motion;
  readonly starts: readonly number[];
  /** Steps that are the last one of their piece: once over, the piece goes back to `state`. */
  readonly last: ReadonlySet<number>;
  readonly firstBall: number;
  readonly lastBall: number;
  /** The unit carrying the ball into its first flight, when it walked there during the beat. */
  readonly bearer: UnitId | null;
}

function pieceKey(step: MotionStep): string | null {
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

function planOf(motion: Motion): Plan {
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

const easeOut = (u: number): number => 1 - (1 - u) ** 3;
const lerp = (a: Point, b: Point, u: number): Point => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** A point part of the way along `from` then every cell of `path`, equal time per cell. */
function along(from: Point, path: readonly Point[], u: number): Point {
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
function poseAt(plan: Plan, t: number): Pose {
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

// -- The board ----------------------------------------------------------------

export function Board({
  state,
  legal,
  own,
  onMove,
  onSelectUnit,
  selected,
  yoursId = null,
  spotlight = null,
  motion = null,
  pending = null,
  onAct = null,
  plot = null,
  onPlotStep = null,
}: BoardProps) {
  const units = activeUnits(state);

  // -- Routes ------------------------------------------------------------------
  // Everything below asks the engine and decides nothing: where the unit can
  // stand comes from `reachableCells`, a route from `pathTo`, and what a route
  // costs in swings from `provokedAlong`.
  const canMove = onMove !== null;
  const mover = legal ? (state.units.find((u) => u.id === legal.unitId) ?? null) : null;
  const plotting = plot?.on ?? false;
  const planned = plotting && plot ? plot.route : NO_ROUTE;
  const [hover, setHover] = useState<Point | null>(null);

  /**
   * Where the unit could stand next. With nothing plotted that is `legal`'s own
   * answer. Once there are waypoints it is asked afresh from the last one, with
   * the feet the plotted cells have not yet used, on a copy of the state where
   * the unit stands at that waypoint.
   */
  const reachable = useMemo((): ReadonlyMap<string, Reachable> | null => {
    if (!legal || !canMove || !mover) return null;
    if (planned.length === 0) return legal.destinations;
    const waypoint = planned[planned.length - 1]!;
    const spent = pathCostFeet({ x: mover.x, y: mover.y }, planned);
    const moved = unitAt(mover, waypoint);
    const there: MatchState = { ...state, units: state.units.map((u) => (u.id === mover.id ? moved : u)) };
    return reachableCells(arena, there, moved, (state.turn?.movementFeetRemaining ?? 0) - spent);
  }, [legal, canMove, mover, planned, state]);

  /**
   * The cells that are watched. `opportunityAttackers(state, mover, from, to)`
   * answers "who is passed by stepping from one cell to the next", which needs
   * a destination the player has not chosen, so it cannot say whether a cell on
   * its own is inside someone's reach without inventing a `to`. Rather than
   * invent one, a cell is marked when the shortest route that arrives there
   * draws at least one swing (`provokedAlong(...).length > 0`). That is also
   * what the player is deciding about: arriving in a reach costs nothing, it is
   * the walk that went through one on the way that does.
   */
  const watched = useMemo(() => {
    const out = new Set<string>();
    if (!reachable || !mover) return out;
    for (const [key, step] of reachable) {
      const found = swingsTo(state, mover, planned, reachable, step.cell);
      if (found && found.swings > 0) out.add(key);
    }
    return out;
  }, [reachable, mover, planned, state]);

  const origin: Point | null = mover ? { x: mover.x, y: mover.y } : null;
  const ahead = hover && reachable && mover ? swingsTo(state, mover, planned, reachable, hover) : null;
  const plannedSwings = planned.length > 0 && mover ? provokedAlong(state, mover, planned).length : 0;

  // -- Tokens as targets -------------------------------------------------------
  // Rings come from the same three lists the action bar's tray reads. A pending
  // Swing, Shove or Pass rings only what that action may target; with nothing
  // pending every unit that is a target of anything wears a faint ring.
  const targetKind = pending === 'attack' || pending === 'shove' || pending === 'pass' ? pending : null;
  const targets =
    legal && onAct
      ? {
          attack: new Set<string>(legal.attack.map((t) => t.unitId)),
          shove: new Set<string>(legal.shove.map((t) => t.unitId)),
          pass: new Set<string>(legal.pass.map((t) => t.unitId)),
        }
      : null;
  const ringFor = (id: UnitId): 'hot' | 'faint' | null => {
    if (!targets) return null;
    if (targetKind) return targets[targetKind].has(id) ? 'hot' : null;
    return targets.attack.has(id) || targets.shove.has(id) || targets.pass.has(id) ? 'faint' : null;
  };
  const answer = (id: UnitId): boolean => {
    if (!onAct || !targets || !targetKind || !targets[targetKind].has(id)) return false;
    onAct(
      targetKind === 'attack'
        ? { kind: 'attack', targetId: id }
        : targetKind === 'shove'
          ? { kind: 'shove', targetId: id }
          : { kind: 'pass', targetId: id },
    );
    return true;
  };

  /**
   * Taking in a new beat, or noticing that the board moved on, happens here in
   * the render rather than in an effect. React throws this pass away and runs
   * it again with the new track, so no frame is ever painted that shows the
   * finished board under a glide that has not begun, and a motion that is
   * already null or empty is never anything but `state`.
   *
   * A motion is told apart from the last by identity: the keys restart at zero
   * with every batch from the server. The same motion arriving with a different
   * `state` is the snapshot being read again (or a skip), and the animation
   * stops where it is and shows the state.
   */
  const [track, setTrack] = useState<Track>({ motion: null, state, live: false, elapsed: 0 });
  let current = track;
  if (motion !== track.motion) {
    current = { motion, state, live: motion !== null && motion.totalMs > 0, elapsed: 0 };
  } else if (state !== track.state) {
    current = { motion, state, live: false, elapsed: 0 };
  }
  if (current !== track) setTrack(current);

  const playing = current.live ? current.motion : null;
  const plan = useMemo(() => (playing ? planOf(playing) : null), [playing]);
  const pose = plan ? poseAt(plan, current.elapsed) : null;

  // One loop for the whole board, one state tick per frame. Every frame is
  // measured from the clock, not counted, so a slow frame costs a skipped
  // position and never a longer animation.
  useEffect(() => {
    if (!playing) return;
    const began = performance.now();
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - began;
      if (elapsed >= playing.totalMs) {
        setTrack((prev) => (prev.motion === playing && prev.live ? { ...prev, live: false } : prev));
        return;
      }
      setTrack((prev) => (prev.motion === playing && prev.live ? { ...prev, elapsed } : prev));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  /**
   * How many screen pixels one cell is worth, which is what lets the labels be
   * sized in pixels rather than in cells.
   *
   * A cell is one SVG unit, so `font-size: 0.21` is 0.21 of a cell, and a cell
   * is whatever the window left over. With the whole pitch on screen that is
   * about 23 px on a 1440-wide window and about 19 px on the 1280 x 800 this
   * game is specified down to. So the stage is measured and the type is asked
   * for in pixels, which is the unit legibility is actually in.
   */
  const stageRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(23);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setCellPx(Math.max(1, node.getBoundingClientRect().width / COLS));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /** A size in screen pixels, expressed in the SVG units the viewBox counts in. */
  const px = (size: number) => size / cellPx;

  // Where each piece is drawn this frame. A piece the beat is not moving, or
  // has finished moving, is where `state` has it.
  const where = (key: string, fallback: Point): Point => pose?.moving.get(key) ?? fallback;
  const ball = pose?.ball ?? null;
  const loose = !ball && !state.payload.carriedBy;
  const sparkAt = pose?.moving.get('s');

  return (
    <div style={S.frame}>
      {/* Exactly three to one, as wide as the frame allows and no taller than
          it. `width: 100%` plus `max-height` would squash the ratio when the
          height is the scarce side, so the width is the smaller of the frame's
          width and three times its height, which the frame's size container
          lets us say. The stage carries no border: the hook divides its width
          by forty-five, and a border would make the SVG a different size. */}
      <div style={S.stage} ref={stageRef} data-board-stage>
        <svg viewBox={`0 0 ${COLS} ${ROWS}`} style={S.svg} shapeRendering="crispEdges">
          {/* 1 to 5. The floor, the grid, the obstacles, the Furnaces and the
              thirds. Nothing here moves, so it is drawn once. */}
          <Backdrop own={own} />

          {/* 6. Where this unit could stand. */}
          {reachable &&
            [...reachable.values()].map((step) => (
              <rect
                key={`r${step.cell.x}-${step.cell.y}`}
                data-cell={`${step.cell.x},${step.cell.y}`}
                x={step.cell.y + 0.12}
                y={step.cell.x + 0.12}
                width={0.76}
                height={0.76}
                fill="rgba(60,224,240,.14)"
                stroke="rgba(60,224,240,.5)"
                strokeWidth={0.04}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(step.cell)}
                onMouseLeave={() => setHover((h) => (h && h.x === step.cell.x && h.y === step.cell.y ? null : h))}
                onClick={() => {
                  const route = pathTo(reachable, step.cell);
                  if (!route) return;
                  // Plotting: the click adds a waypoint and sends nothing.
                  // The cell may stop being a destination once the route grows,
                  // and a rect that goes away never reports the mouse leaving.
                  if (plotting) {
                    setHover(null);
                    onPlotStep?.(route);
                  } else if (onMove) onMove(route);
                }}
              />
            ))}

          {/* 6b. Cells whose shortest way in draws a swing, in amber inside the
              cell. Painted over the cyan and deaf to the mouse. */}
          {reachable &&
            [...watched].map((key) => {
              const step = reachable.get(key)!;
              return (
                <rect
                  key={`w${key}`}
                  x={step.cell.y + 0.2}
                  y={step.cell.x + 0.2}
                  width={0.6}
                  height={0.6}
                  fill="none"
                  stroke="#ff8a3d"
                  strokeWidth={0.07}
                  opacity={0.9}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}

          {/* 6c. Routes. The plotted one is solid; the one under the cursor is
              dotted and carries on from the last waypoint (or from the unit). */}
          {origin && planned.length > 0 && (
            <polyline
              points={polyline(origin, planned)}
              fill="none"
              stroke="#3ce0f0"
              strokeWidth={0.12}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.9}
              style={{ pointerEvents: 'none' }}
            />
          )}
          {origin && ahead && (
            <polyline
              points={polyline(planned.length > 0 ? planned[planned.length - 1]! : origin, ahead.segment)}
              fill="none"
              stroke={ahead.swings > 0 ? '#ff8a3d' : '#3ce0f0'}
              strokeWidth={0.1}
              strokeDasharray="0.02 0.22"
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* 7. Crackers. One the beat destroys is still drawn until its roll
              is over, because it rolled before it went. */}
          {state.crackers
            .filter((cracker) => cracker.state === 'live' || pose?.moving.has(`c:${cracker.id}`))
            .map((cracker) => {
              const at = where(`c:${cracker.id}`, cracker);
              return (
                <g key={cracker.id}>
                  <circle cx={at.y + 0.5} cy={at.x + 0.5} r={0.2} fill="#d8a12a" stroke="#05070a" strokeWidth={0.05} />
                  <circle
                    cx={at.y + 0.5}
                    cy={at.x + 0.5}
                    r={0.34}
                    fill="none"
                    stroke="rgba(216,161,42,.45)"
                    strokeWidth={0.04}
                  />
                </g>
              );
            })}

          {/* 8. The Spark, likewise: caught at the end of its run, it is seen to run. */}
          {(sparkIsLive(state.spark) || sparkAt) && (
            <circle
              cx={(sparkAt ?? state.spark).y + 0.5}
              cy={(sparkAt ?? state.spark).x + 0.5}
              r={0.24}
              fill="#fffce8"
              stroke="#05070a"
              strokeWidth={0.05}
            />
          )}

          {/* 9. Names first, tokens second, and the order is the whole reason a
              plate may be wider than the cell it belongs to. Four characters at
              a readable size are still wider than a twenty-three pixel box, so
              the plate hangs under the token and takes its chances with the
              neighbours; painting it before the tokens means the one thing it
              can ever be hidden by is another Giff, which is the right way
              round. A plate follows its token, so it is placed by the same
              display position. */}
          {units.map((unit) => {
            const at = where(`u:${unit.id}`, unit);
            return (
              <NamePlate
                key={`n${unit.id}`}
                unit={unit}
                own={own}
                col={at.y}
                row={at.x}
                isYou={yoursId === unit.id}
                full={selected === unit.id}
                px={px}
              />
            );
          })}

          {/* 10. Tokens. */}
          {units.map((unit) => {
            const at = where(`u:${unit.id}`, unit);
            return (
              <UnitMark
                key={unit.id}
                unit={unit}
                own={own}
                col={at.y}
                row={at.x}
                onTheClock={state.turn?.unitId === unit.id}
                spotlit={spotlight === unit.id}
                isYou={yoursId === unit.id}
                selected={selected === unit.id}
                // While a flight is being played the ball is drawn by the
                // flight, not on whoever will end up holding it.
                carrying={!ball && state.payload.carriedBy === unit.id}
                px={px}
                ring={ringFor(unit.id)}
                ringKind={targetKind ?? (targets?.pass.has(unit.id) ? 'pass' : 'attack')}
                onClick={() => {
                  // A pending action takes the click when this unit is a target
                  // of it; any other click is a selection, as it always was.
                  if (answer(unit.id)) return;
                  onSelectUnit(selected === unit.id ? null : unit.id);
                }}
              />
            );
          })}

          {/* 11. The Payload, above the tokens and the plates (audit line A15).
              Carried, it rides on its carrier instead. Loose, it is the whole
              point of the sport, so it pulses, wears a ring, and says its own
              name, and it is the last thing painted so that nothing can hide
              it. In flight it is a disc with a shadow under it. It takes no
              clicks: the Giff under it is still the one you pick. */}
          {loose && <LooseBall col={state.payload.y} row={state.payload.x} px={px} />}
          {ball?.kind === 'rest' &&
            (ball.held ? (
              <circle
                cx={ball.at.y + 0.76}
                cy={ball.at.x + 0.68}
                r={0.12}
                fill={BRASS}
                stroke="#05070a"
                strokeWidth={0.04}
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              <LooseBall col={ball.at.y} row={ball.at.x} px={px} />
            ))}
          {ball?.kind === 'air' && <FlyingBall ball={ball} />}

          {/* 12. What the route would cost, last so nothing hides it. While
              the cursor is on a cell it is about the whole route to that cell;
              otherwise, when a route is plotted, about the plotted one. */}
          {hover && ahead && <RouteLabel cell={hover} text={swingsText(ahead.swings)} bad={ahead.swings > 0} px={px} />}
          {!ahead && planned.length > 0 && (
            <RouteLabel
              cell={planned[planned.length - 1]!}
              text={swingsText(plannedSwings)}
              bad={plannedSwings > 0}
              px={px}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * The layers that never change while a match is on: the floor, the grid, the
 * obstacles, the Furnaces and the thirds. Memoised on the only thing they
 * depend on, so a frame of animation does not rebuild some seven hundred
 * elements to move a dozen.
 */
const Backdrop = memo(function Backdrop({ own }: { own: 'A' | 'B' }) {
  return (
    <g>
      {/* 1. The floor. */}
      <rect x={0} y={0} width={COLS} height={ROWS} fill="#0a0e11" />

      {/* 2. The grid, faint. */}
      {range(COLS + 1).map((col) => (
        <line key={`v${col}`} x1={col} y1={0} x2={col} y2={ROWS} stroke="rgba(142,161,169,.12)" strokeWidth={0.02} />
      ))}
      {range(ROWS + 1).map((row) => (
        <line key={`h${row}`} x1={0} y1={row} x2={COLS} y2={row} stroke="rgba(142,161,169,.12)" strokeWidth={0.02} />
      ))}

      {/* 3. Obstacles, read from the layout. A plate with a lighter edge and
          a lighter inner frame: a block reads as a block at twenty pixels
          without any of it being a thing the rules know about. */}
      {range(ROWS).map((x) =>
        range(COLS).map((y) => {
          if (arena.cellAt({ x, y }) === 'open') return null;
          return (
            <g key={`o${x}-${y}`}>
              <rect
                x={y + 0.03}
                y={x + 0.03}
                width={0.94}
                height={0.94}
                fill="#1c252b"
                stroke="#3d4e58"
                strokeWidth={0.06}
              />
              <rect
                x={y + 0.24}
                y={x + 0.24}
                width={0.52}
                height={0.52}
                fill="none"
                stroke="rgba(142,161,169,.22)"
                strokeWidth={0.04}
              />
            </g>
          );
        }),
      )}

      {/* 4. The Furnaces, which are the goals. Drawn over the obstacle
          cells they sit in, because the hatch is an obstacle in the layout. */}
      {spec.furnaces.map((furnace) =>
        furnace.cells.map((cell) => (
          <rect
            key={`f${furnace.defendedBy}-${cell.x}-${cell.y}`}
            x={cell.y}
            y={cell.x}
            width={1}
            height={1}
            fill={furnace.defendedBy === own ? 'rgba(60,224,240,.16)' : 'rgba(255,86,220,.18)'}
            stroke={furnace.defendedBy === own ? '#3ce0f0' : '#ff56dc'}
            strokeWidth={0.06}
          />
        )),
      )}

      {/* 5. The thirds: two faint lines between columns, nothing more.
          They carry no rule. */}
      {range(ARENA_HEIGHT / THIRD_LENGTH - 1).map((i) => (
        <line
          key={`t${i}`}
          x1={(i + 1) * THIRD_LENGTH}
          y1={0}
          x2={(i + 1) * THIRD_LENGTH}
          y2={ROWS}
          stroke="rgba(201,180,137,.28)"
          strokeWidth={0.04}
          strokeDasharray="0.3 0.3"
        />
      ))}
    </g>
  );
});

/**
 * "2 swings on the way" or "clean", hung beside a cell. To the right of it
 * unless that would run off the stage, and kept inside the top and bottom rows.
 */
function RouteLabel({
  cell,
  text,
  bad,
  px,
}: {
  cell: Point;
  text: string;
  bad: boolean;
  px: (size: number) => number;
}) {
  const size = px(10);
  const height = px(15);
  const width = text.length * size * 0.6 + px(10);
  const left = cell.y + 1.15 + width > COLS ? cell.y - 0.15 - width : cell.y + 1.15;
  const top = Math.min(Math.max(cell.x + 0.5 - height / 2, 0), ROWS - height);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        fill="rgba(5,7,10,.92)"
        stroke={bad ? '#ff8a3d' : '#3ce0f0'}
        strokeWidth={0.04}
      />
      <text
        x={left + width / 2}
        y={top + height - px(4.5)}
        textAnchor="middle"
        fill={bad ? '#ff8a3d' : '#3ce0f0'}
        style={{ font: `600 ${size}px 'IBM Plex Mono', monospace` }}
      >
        {text}
      </text>
    </g>
  );
}

/** The Payload lying on the floor, at a (possibly fractional) screen position. */
function LooseBall({ col, row, px }: { col: number; row: number; px: (size: number) => number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={col + 0.5} cy={row + 0.5} r={0.44} fill="none" stroke={BRASS} strokeWidth={0.05} opacity={0.75}>
        <animate attributeName="r" values="0.34;0.5;0.34" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx={col + 0.5} cy={row + 0.5} r={0.24} fill={BRASS} stroke="#05070a" strokeWidth={0.05} />
      <text
        x={col + 0.5}
        // Above the disc, except on the top row where the stage would clip it.
        y={row < 0.5 ? row + 1.3 : row - 0.16}
        textAnchor="middle"
        fill={BRASS}
        stroke="#05070a"
        strokeWidth={px(2.5)}
        paintOrder="stroke"
        style={{ font: `700 ${px(8)}px 'IBM Plex Mono', monospace`, letterSpacing: `${px(0.5)}px` }}
      >
        PAYLOAD
      </text>
    </g>
  );
}

/**
 * The Payload in the air. Seen from above a ball going up does not move on the
 * screen, so height is told two ways: the disc grows toward the apex, and a
 * shadow stays on the floor and slides away from it. A pass or a shot also wears
 * a lighter ring; the short hop of a scatter is too low for one.
 */
function FlyingBall({ ball }: { ball: Extract<BallPose, { kind: 'air' }> }) {
  const cx = ball.at.y + 0.5;
  const cy = ball.at.x + 0.5;
  const lift = ball.height;
  const high = ball.flight !== 'scatter';
  return (
    <g style={{ pointerEvents: 'none' }}>
      <ellipse
        cx={cx + 0.28 * lift}
        cy={cy + 0.34 * lift}
        rx={0.24}
        ry={0.2}
        fill="#000"
        opacity={(high ? 0.45 : 0.3) * (1 - 0.3 * lift)}
      />
      {high && (
        <circle cx={cx} cy={cy} r={0.44 * ball.scale} fill="none" stroke="rgba(235,222,190,.55)" strokeWidth={0.05} />
      )}
      <circle cx={cx} cy={cy} r={0.24 * ball.scale} fill={BRASS} stroke="#05070a" strokeWidth={0.05} />
    </g>
  );
}

/**
 * The name plate, hung under the token.
 *
 * Its own component and its own layer because of one constraint: a name at a
 * size a person can read is wider than a cell now that the whole pitch is on
 * screen. So it cannot live inside the box, and if it were drawn with its
 * token it would sit on top of whoever stands below. Drawn ahead of every token
 * instead, the worst it can do is be covered by one.
 *
 * The given name alone, cut to four characters: "Voss Ardent" is two cells wide
 * and the surname is the half nobody shouts. The full name is the token's
 * hover title, and is written out in full here for the selected unit.
 */
function NamePlate({
  unit,
  own,
  col,
  row,
  isYou,
  full,
  px,
}: {
  unit: Unit;
  own: 'A' | 'B';
  col: number;
  row: number;
  isYou: boolean;
  /** The selected unit, whose whole name is shown. */
  full: boolean;
  px: (size: number) => number;
}) {
  const colour = isYou ? '#ffc14d' : unit.team === own ? '#3ce0f0' : '#ff56dc';
  const given = unit.name.split(' ')[0] ?? unit.name;
  const label = full ? unit.name : given.slice(0, 4);

  const size = px(9);
  const height = px(12);
  // Under the token, except on the bottom row where the stage would clip it,
  // and clear of the chevron that marks the player's own Giff.
  const below = row < ROWS - 1;
  const top = below ? row + 0.98 : row - height - (isYou ? 0.3 : 0.06);
  // Monospace advance is about 0.6 em, plus a little air either side.
  const width = Math.max(0.7, label.length * size * 0.6 + px(5));
  // A long name beside a wall would run off the stage; slide it back inside.
  const left = Math.min(Math.max(col + 0.5 - width / 2, 0), COLS - width);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={left} y={top} width={width} height={height} fill="rgba(5,7,10,.86)" />
      <text
        x={left + width / 2}
        y={top + height - px(3)}
        textAnchor="middle"
        fill={colour}
        style={{ font: `600 ${size}px 'IBM Plex Mono', monospace` }}
      >
        {label}
      </text>
    </g>
  );
}

function UnitMark({
  unit,
  own,
  col,
  row,
  onTheClock,
  spotlit,
  isYou,
  selected,
  carrying,
  px,
  ring,
  ringKind,
  onClick,
}: {
  unit: Unit;
  own: 'A' | 'B';
  /** Screen column, the engine's `y`. Fractional while the token glides. */
  col: number;
  /** Screen row, the engine's `x`. Fractional while the token glides. */
  row: number;
  onTheClock: boolean;
  /** The unit the replay is currently showing. */
  spotlit: boolean;
  /** The Giff this player drives. */
  isYou: boolean;
  selected: boolean;
  carrying: boolean;
  /** A size in screen pixels, in the SVG units the viewBox counts in. */
  px: (size: number) => number;
  /**
   * Whether this unit is a target: `hot` when the pending action may take it
   * (a click answers it), `faint` when nothing is pending and it merely could
   * be one, so a player learns that a token is something to click.
   */
  ring: 'hot' | 'faint' | null;
  /** Which of the three it is a target of, which picks the colour of the ring. */
  ringKind: 'attack' | 'shove' | 'pass';
  onClick: () => void;
}) {
  // Three colours, not two. Every shirt on your own side was one cyan, so the
  // only way to find yourself was to read names off the sheet. Yours is amber,
  // filled rather than outlined, and wears a chevron.
  const colour = isYou ? '#ffc14d' : unit.team === own ? '#3ce0f0' : '#ff56dc';
  const hurt = unit.hp / unit.maxHp;
  const x = col;

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick} data-unit={unit.id}>
      {/* The whole name, on hover, because the plate only has room for four letters. */}
      <title>{unit.name}</title>
      {spotlit && (
        <rect
          x={x - 0.18}
          y={row - 0.18}
          width={1.36}
          height={1.36}
          fill="rgba(201,180,137,.14)"
          stroke="var(--brass)"
          strokeWidth={0.07}
        />
      )}
      <rect
        x={x + 0.08}
        y={row + 0.08}
        width={0.84}
        height={0.84}
        fill={isYou ? 'rgba(255,193,77,.24)' : 'rgba(5,7,10,.86)'}
        stroke={colour}
        strokeWidth={isYou ? 0.13 : selected || onTheClock ? 0.11 : 0.06}
      />
      {isYou && (
        <polygon
          points={`${x + 0.5},${row - 0.3} ${x + 0.32},${row - 0.02} ${x + 0.68},${row - 0.02}`}
          fill={colour}
        />
      )}
      {ring && (
        <rect
          x={x - 0.1}
          y={row - 0.1}
          width={1.2}
          height={1.2}
          fill="none"
          stroke={ringKind === 'pass' ? '#ffc14d' : ringKind === 'shove' ? '#d8a12a' : '#ff6b6b'}
          strokeWidth={ring === 'hot' ? 0.1 : 0.05}
          strokeDasharray={ring === 'hot' ? undefined : '0.18 0.12'}
          opacity={ring === 'hot' ? 1 : 0.5}
          style={{ pointerEvents: 'none' }}
        >
          {ring === 'hot' && <animate attributeName="opacity" values="1;0.45;1" dur="1.2s" repeatCount="indefinite" />}
        </rect>
      )}
      {onTheClock && (
        <rect
          x={x - 0.02}
          y={row - 0.02}
          width={1.04}
          height={1.04}
          fill="none"
          stroke={colour}
          strokeWidth={0.05}
          opacity={0.55}
        />
      )}

      {/* Hit points in figures, top right of the box.
          Two digits at most: the deepest pool in the game is a Star Breaker's
          85. Red under a third, so a Giff about to be carried off says so
          before it happens rather than after. */}
      <text
        x={x + 0.9}
        y={row + 0.1 + px(8)}
        textAnchor="end"
        fill={hurt <= 0.34 ? '#ff8fa0' : colour}
        style={{ font: `700 ${px(9)}px 'IBM Plex Mono', monospace` }}
      >
        {unit.hp}
      </text>

      {/* The role letter sits left of centre and low, clear of the figure. */}
      <text
        x={x + 0.3}
        y={row + 0.62}
        textAnchor="middle"
        fill={colour}
        style={{ font: `600 ${px(11)}px 'IBM Plex Mono', monospace` }}
      >
        {unit.role[0]!.toUpperCase()}
      </text>

      {/* The health bar along the bottom edge, so a wounded Giff still reads at
          a glance on a board too small for the figure to be comfortable. */}
      <rect x={x + 0.08} y={row + 0.86} width={0.84 * hurt} height={0.06} fill={colour} />

      {/* The ball sits bottom right: the top is spoken for by the hit points
          and the left by the role letter. */}
      {carrying && (
        <circle cx={x + 0.76} cy={row + 0.68} r={0.12} fill={BRASS} stroke="#05070a" strokeWidth={0.04} />
      )}
    </g>
  );
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const S: Record<string, React.CSSProperties> = {
  // A size container, so the stage can be sized against the room it has.
  frame: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    containerType: 'size',
  },
  stage: {
    position: 'relative',
    aspectRatio: '3 / 1',
    width: 'min(100cqw, 300cqh)',
    maxWidth: '100%',
    maxHeight: '100%',
    boxShadow: '0 0 0 1px var(--line)',
    background: '#0a0e11',
    overflow: 'hidden',
  },
  svg: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
};
