/**
 * The 2.5D board: the same match as `match/Board.tsx`, seen in three quarters.
 *
 * Same props, same contract. The board is handed the beat's final `state` and
 * the `Motion` that led to it, it asks the engine what the unit on the clock
 * may do, and it sends the same actions a click on the SVG board sends. It
 * resolves nothing and rolls nothing (D1 to D10, `07` §4.1): `board3d/` reads
 * `engine/` and nothing else.
 *
 * **How things move.** The reading of a motion is `match/pose.ts`, shared
 * with the SVG board. Here it is read inside one `useFrame`: every piece that
 * can travel registered its group with the scene link (`scene.ts`), and the
 * loop sets each group's position from the pose, or from `state` when the
 * piece is not travelling. Nothing goes through React once a frame; the words
 * over the scene (`Labels.tsx`) follow the pieces the same way, in the DOM.
 *
 * **Taking in a beat** happens in the render, as on the SVG board: a motion
 * is told apart from the last by identity, and the same motion with another
 * `state` is the snapshot being read again, which stops the glide where it
 * is. At `instant` a motion has no length and the loop draws `state` at once.
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MathUtils, type Object3D } from 'three';

import type { Point } from '../../../engine/geometry.js';
import { pathCostFeet, pathTo, reachableCells, type Reachable } from '../../../engine/rules/movement.js';
import { provokedAlong } from '../../../engine/rules/reactions.js';
import { hasLineOfSight } from '../../../engine/rules/sight.js';
import { activeUnits, sparkIsLive, type MatchState, type Unit, type UnitId } from '../../../engine/types.js';
import { arena, spec } from '../lib/arena.js';
import type { BoardProps } from '../match/Board.js';
import { fxBridge } from '../match/fxBridge.js';
import { FLOAT_MS, type Cue, type Motion, type TimedCue } from '../match/motion.js';
import { planOf, poseAt, type Plan, type Pose } from '../match/pose.js';
import { Rig, type Zoom } from './Camera.js';
import { Effects } from './Effects.js';
import { Floaters } from './Floaters.js';
import { Labels, Tag, type Label } from './Labels.js';
import { cellCentre } from './layoutGeometry.js';
import { Minimap } from './Minimap.js';
import { Ball, Cracker, Spark } from './Ordnance.js';
import { Overlay, type Sight } from './Overlay.js';
import { BRASS, FAINT, newSceneLink, shirt, type SceneLink } from './scene.js';
import { Silo } from './Silo.js';
import { GIFF_HEIGHT, Plate, Token } from './Tokens.js';

const NO_ROUTE: readonly Point[] = [];

function unitAt(unit: Unit, cell: Point): Unit {
  return { ...unit, x: cell.x, y: cell.y };
}

const swingsText = (n: number): string => (n === 0 ? 'clean' : `${n} swing${n === 1 ? '' : 's'} on the way`);

/** The beat being played, if any, and when it began. Compared by identity. */
interface Track {
  readonly motion: Motion | null;
  readonly state: MatchState;
  readonly plan: Plan | null;
  readonly began: number;
  /**
   * What flashes during the beat and when (2H.21), fired by the loop as the
   * clock passes each one. Empty at `instant`, and empty when the same
   * motion comes back with another state (the snapshot being read again),
   * so nothing fires twice.
   */
  readonly cues: readonly TimedCue[];
}

/** How long a Giff takes to sink when carried off, or to rise when it comes on; the Spark's drop. */
const EXIT_MS = 600;
const DROP_MS = 500;
/**
 * The puppet (2H.22, `00` C24 line 7): until the Giff is rigged, the whole
 * mesh moves. A walk bobs it `BOB` high once per `STRIDE` cells and leans it
 * `LEAN` radians forward; a swing winds the body back then round at its
 * target, a lunge pushes it `LUNGE` cells at its target, a flinch rocks a
 * struck Giff back, a throw nods it forward. Each lasts its `GESTURE_MS`.
 */
const BOB = 0.07;
const STRIDE = 1.0;
const LEAN = 0.14;
const LUNGE = 0.35;
const GESTURE_MS: Readonly<Record<'swing' | 'lunge' | 'flinch' | 'throw', number>> = { swing: 420, lunge: 320, flinch: 300, throw: 320 };
/** How far below the floor a Giff sinks to, in cells. */
const SINK = 1.9;
/** From how high the Spark comes down, in cells. */
const DROP_FROM = 6;

export function Board3D({
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
  const link = useMemo(() => newSceneLink(), []);
  const [zoom, setZoom] = useState<Zoom>(() => {
    try {
      return localStorage.getItem('boomball.zoom') === 'close' ? 'close' : 'wide';
    } catch {
      return 'wide';
    }
  });
  const [hoverUnit, setHoverUnit] = useState<UnitId | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  // Whether the camera follows the play (C19): a pan lets go of it, and it
  // takes hold again when the player's own Giff comes on the clock.
  const [hooked, setHooked] = useState(true);
  const onTheClock = state.turn?.unitId ?? null;
  useEffect(() => {
    if (onTheClock !== null && onTheClock === yoursId) setHooked(true);
  }, [onTheClock, yoursId]);

  // -- Routes, as on the SVG board: the engine answers, this file asks ----------
  const canMove = onMove !== null;
  const mover = legal ? (state.units.find((u) => u.id === legal.unitId) ?? null) : null;
  const plotting = plot?.on ?? false;
  const planned = plotting && plot ? plot.route : NO_ROUTE;
  const reachable = useMemo((): ReadonlyMap<string, Reachable> | null => {
    if (!legal || !canMove || !mover) return null;
    if (planned.length === 0) return legal.destinations;
    const waypoint = planned[planned.length - 1]!;
    const spent = pathCostFeet({ x: mover.x, y: mover.y }, planned);
    const moved = unitAt(mover, waypoint);
    const there: MatchState = { ...state, units: state.units.map((u) => (u.id === mover.id ? moved : u)) };
    return reachableCells(arena, there, moved, (state.turn?.movementFeetRemaining ?? 0) - spent);
  }, [legal, canMove, mover, planned, state]);

  const origin: Point | null = mover && canMove ? { x: mover.x, y: mover.y } : null;
  const ahead = useMemo(() => {
    if (!hover || !reachable || !mover) return null;
    const segment = pathTo(reachable, hover);
    if (!segment) return null;
    return { segment, swings: provokedAlong(state, mover, [...planned, ...segment]).length };
  }, [hover, reachable, mover, planned, state]);
  const plannedSwings = planned.length > 0 && mover ? provokedAlong(state, mover, planned).length : 0;

  // The line of sight from the mover to the token under the cursor, and the
  // shot it has, so a player sees why a target is or is not on offer.
  const sight = useMemo((): Sight | null => {
    if (!mover || !canMove || !hoverUnit || hoverUnit === mover.id) return null;
    const target = state.units.find((u) => u.id === hoverUnit);
    if (!target || target.status !== 'active') return null;
    const from = { x: mover.x, y: mover.y };
    const to = { x: target.x, y: target.y };
    return { from, to, clear: hasLineOfSight(arena, from, to) };
  }, [mover, canMove, hoverUnit, state]);
  const shot = useMemo(() => {
    if (!mover || !canMove || !legal?.shoot) return null;
    const furnace = spec.furnaces.find((f) => f.defendedBy !== mover.team);
    if (!furnace) return null;
    const from = { x: mover.x, y: mover.y };
    const hatch = [...furnace.cells].sort(
      (a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y),
    )[0]!;
    return { from, to: hatch, clean: legal.shoot.mode === 'normal' };
  }, [mover, canMove, legal]);

  const onCellClick = (cell: Point) => {
    if (!reachable) return;
    const route = pathTo(reachable, cell);
    if (!route) return;
    if (plotting) {
      setHover(null);
      onPlotStep?.(route);
    } else onMove?.(route);
  };

  // -- Tokens as targets, from the same three lists the action bar reads ---------
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

  // -- The beat ------------------------------------------------------------------
  const trackRef = useRef<Track>({ motion: null, state, plan: null, began: 0, cues: [] });
  if (motion !== trackRef.current.motion) {
    trackRef.current = {
      motion,
      state,
      plan: motion && motion.totalMs > 0 ? planOf(motion) : null,
      began: performance.now(),
      cues: motion && motion.speed !== 'instant' ? motion.cues : [],
    };
  } else if (state !== trackRef.current.state) {
    trackRef.current = { motion, state, plan: null, began: 0, cues: [] };
  }

  /**
   * One cue, made visible (2H.21). Sparks, rings, blasts, embers and the
   * Spark's beam and flash go to `Effects`; the words go to `Floaters`, in
   * the shirt of the Giff they are about, grey when nothing happened; a
   * Giff carried off, one coming on and the Spark coming down are
   * transitions the frame loop places. Also what the development trigger
   * of the hook fires, so each can be captured on purpose.
   */
  const fire = useCallback(
    (cue: Cue) => {
      const now = performance.now();
      // A word lives `FLOAT_MS` at the beat's speed (2H.22); the development
      // trigger has no beat and reads as normal.
      const life = FLOAT_MS[trackRef.current.motion?.speed ?? 'normal'] * fxBridge.stretch;
      const gesture = (key: string, kind: 'swing' | 'lunge' | 'flinch' | 'throw') => {
        const aim = cue.toward ? cellCentre(cue.toward) : null;
        link.gestures.set(key, { kind, since: now, stretch: fxBridge.stretch, toward: aim ? { x: aim.x, z: aim.z } : null });
      };
      switch (cue.kind) {
        case 'damage':
        case 'action': {
          const unit = cue.unitId ? state.units.find((u) => u.id === cue.unitId) : undefined;
          const colour = unit ? shirt(unit.team, own, unit.id === yoursId) : FAINT;
          link.float?.(cue.text ?? '', colour, cue.at, life);
          // The puppet's gesture for the word (2H.22, `00` C24 line 7).
          if (cue.kind === 'action' && cue.unitId) {
            const word = cue.text;
            if (word === 'SWING' || word === 'ATCK OP' || word === 'BAT') gesture(`u:${cue.unitId}`, 'swing');
            else if (word === 'SHOVE') gesture(`u:${cue.unitId}`, 'lunge');
            else if (word === 'PASS' || word === 'SHOOT') gesture(`u:${cue.unitId}`, 'throw');
          }
          break;
        }
        case 'miss':
        case 'held':
          link.float?.(cue.text ?? cue.kind, FAINT, cue.at, life);
          break;
        case 'hit':
        case 'push':
          // The struck or shoved Giff rocks back; the sparks or the ring too.
          if (cue.unitId) gesture(`u:${cue.unitId}`, 'flinch');
          link.fx?.(cue);
          break;
        case 'exit':
        case 'enter':
          if (cue.unitId) link.transitions.set(`u:${cue.unitId}`, { kind: cue.kind, since: now, stretch: fxBridge.stretch });
          break;
        case 'sparkIn':
          link.transitions.set('s', { kind: 'drop', since: now, stretch: fxBridge.stretch });
          link.fx?.(cue);
          break;
        default:
          link.fx?.(cue);
      }
    },
    [link, state, own, yoursId],
  );
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    fxBridge.fire = fire;
    return () => {
      fxBridge.fire = null;
    };
  }, [fire]);

  // -- Goals: the mouth that took one flares for a second ------------------------
  const scoreRef = useRef(state.score);
  const [flash, setFlash] = useState<Record<'A' | 'B', number>>({ A: 0, B: 0 });
  useEffect(() => {
    const before = scoreRef.current;
    scoreRef.current = state.score;
    if (state.score.A > before.A) setFlash((f) => ({ ...f, B: performance.now() }));
    if (state.score.B > before.B) setFlash((f) => ({ ...f, A: performance.now() }));
  }, [state.score]);

  const toggleZoom = () => {
    const next: Zoom = zoom === 'wide' ? 'close' : 'wide';
    setZoom(next);
    setHooked(true);
    try {
      localStorage.setItem('boomball.zoom', next);
    } catch {
      /* a private window has no say */
    }
  };

  const motionCrackers = new Set(
    (motion?.steps ?? []).flatMap((t) => (t.step.kind === 'cracker' ? [t.step.crackerId] : [])),
  );
  const crackers = state.crackers.filter((c) => c.state === 'live' || motionCrackers.has(c.id));
  const sparkSeen = sparkIsLive(state.spark) || (motion?.steps ?? []).some((t) => t.step.kind === 'spark');

  // -- The words over the scene ---------------------------------------------------
  const above = (key: string, height: number) => (): { x: number; y: number; z: number } | null => {
    const node = link.pieces.get(key);
    if (!node || !node.visible) return null;
    return { x: node.position.x, y: node.position.y + height, z: node.position.z };
  };
  const atCell = (cell: Point, height: number) => {
    const c = cellCentre(cell);
    return () => ({ x: c.x, y: height, z: c.z });
  };
  const labels: Label[] = [
    ...units.map(
      (unit): Label => ({
        key: `plate:${unit.id}`,
        anchor: above(`u:${unit.id}`, GIFF_HEIGHT + 0.55),
        node: (
          <Plate
            unit={unit}
            own={own}
            isYou={yoursId === unit.id}
            selected={selected === unit.id}
            onTheClock={state.turn?.unitId === unit.id}
          />
        ),
      }),
    ),
    {
      key: 'payload',
      anchor: above('b:loose', 1.1),
      node: (
        <span
          style={{
            font: `700 9px 'IBM Plex Mono', monospace`,
            letterSpacing: '.08em',
            color: BRASS,
            background: 'rgba(5,7,10,.8)',
            padding: '1px 4px',
          }}
        >
          PAYLOAD
        </span>
      ),
    },
  ];
  if (hover && ahead) {
    labels.push({ key: 'route', anchor: atCell(hover, 1.2), node: <Tag text={swingsText(ahead.swings)} bad={ahead.swings > 0} /> });
  } else if (planned.length > 0) {
    labels.push({
      key: 'route',
      anchor: atCell(planned[planned.length - 1]!, 1.2),
      node: <Tag text={swingsText(plannedSwings)} bad={plannedSwings > 0} />,
    });
  }
  if (sight) {
    labels.push({ key: 'sight', anchor: atCell(sight.to, 2.6), node: <Tag text={sight.clear ? 'in sight' : 'no line of sight'} bad={!sight.clear} /> });
  }

  return (
    <div style={S.frame} data-board3d data-zoom={zoom} data-camera={hooked ? 'following' : 'free'}>
      <Canvas
        shadows="percentage"
        dpr={[1, 1.5]}
        camera={{ fov: 36, near: 1, far: 160, position: [0, 34, 26] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => setHoverUnit(null)}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#05070a']} />
        <fog attach="fog" args={['#05070a', 70, 130]} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={['#9fb3bf', '#2a241c', 1.1]} />
        <directionalLight
          position={[8, 26, 12]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-28}
          shadow-camera-right={28}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-camera-near={1}
          shadow-camera-far={80}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-14, 18, -10]} intensity={0.7} color="#bcd3e0" />

        <Rig zoom={zoom} link={link} hooked={hooked} onUnhook={() => setHooked(false)} />

        <Suspense fallback={null}>
          <Silo own={own} flash={flash} />
        </Suspense>

        <Overlay
          state={state}
          reachable={reachable}
          origin={origin}
          planned={planned}
          ahead={ahead}
          sight={sight}
          shot={shot}
          hover={hover}
          onHover={setHover}
          onCellClick={onCellClick}
        />

        {units.map((unit) => (
          <Token
            key={unit.id}
            unit={unit}
            own={own}
            isYou={yoursId === unit.id}
            selected={selected === unit.id}
            onTheClock={state.turn?.unitId === unit.id}
            spotlit={spotlight === unit.id}
            ring={ringFor(unit.id)}
            ringKind={targetKind ?? (targets?.pass.has(unit.id) ? 'pass' : 'attack')}
            link={link}
            onClick={() => {
              if (answer(unit.id)) return;
              onSelectUnit(selected === unit.id ? null : unit.id);
            }}
            onHover={setHoverUnit}
          />
        ))}

        {crackers.map((cracker) => (
          <Cracker key={cracker.id} id={cracker.id} link={link} />
        ))}
        {sparkSeen && <Spark link={link} />}
        <Ball link={link} />

        <Effects link={link} own={own} />

        {/* Last, so it runs after everything above has registered and the
            rig has placed the camera: it places the pieces, then the labels. */}
        <Mover link={link} track={trackRef.current} state={state} spotlight={spotlight} fire={fire} />
      </Canvas>

      <Labels link={link} labels={labels} />
      <Floaters link={link} />

      <div style={S.hud}>
        <button
          className="ghost"
          style={S.zoomButton}
          data-testid="zoom-toggle"
          onClick={toggleZoom}
          title="Two framings: the whole silo, or the pitch's width around the play. Right-drag turns the camera, the wheel zooms, the arrow keys or Ctrl with the mouse move it; this button sets it back."
        >
          {zoom === 'wide' ? 'Close in' : 'Whole silo'}
        </button>
        {!hooked && (
          <button
            className="ghost"
            style={S.zoomButton}
            data-testid="follow-play"
            onClick={() => setHooked(true)}
            title="Back on the play. The camera follows it again by itself when your Giff comes on the clock."
          >
            Follow the play
          </button>
        )}
        <Minimap state={state} own={own} yoursId={yoursId} width={225} />
        {import.meta.env.DEV && <FpsReadout link={link} />}
      </div>
    </div>
  );
}

/**
 * The frame loop. Reads the pose of the beat being played and sets every
 * registered group where it belongs this frame, the camera's focus too, then
 * lets the label layer follow.
 */
function Mover({
  link,
  track,
  state,
  spotlight,
  fire,
}: {
  link: SceneLink;
  track: Track;
  state: MatchState;
  spotlight: UnitId | null;
  fire: (cue: Cue) => void;
}) {
  const facing = useRef(new Map<string, number>());
  /** The puppet's walk, per unit: where in its stride it is, and how far it leans (2H.22). */
  const gait = useRef(new Map<string, { phase: number; lean: number }>());
  /** How many of the track's cues have fired, and which track that count is for. */
  const fired = useRef<{ track: Track | null; n: number }>({ track: null, n: 0 });

  useFrame((_, delta) => {
    const now = performance.now();
    const elapsed = now - track.began;
    const pose: Pose | null =
      track.plan && elapsed < track.plan.motion.totalMs ? poseAt(track.plan, elapsed) : null;

    // The cues whose instant has come, in order, once each (2H.21).
    if (fired.current.track !== track) fired.current = { track, n: 0 };
    while (fired.current.n < track.cues.length && track.cues[fired.current.n]!.t <= elapsed) {
      fire(track.cues[fired.current.n]!.cue);
      fired.current.n += 1;
    }
    /** Whether a cue of this kind for this unit is still to come in the beat. */
    const pending = (kind: Cue['kind'], unitId: UnitId): boolean => {
      for (let i = fired.current.n; i < track.cues.length; i++) {
        const cue = track.cues[i]!.cue;
        if (cue.kind === kind && cue.unitId === unitId) return true;
      }
      return false;
    };
    /** A transition's progress, 0 to 1, or null once over (and then forgotten). */
    const transition = (key: string, kind: 'exit' | 'enter' | 'drop', ms: number): number | null => {
      const t = link.transitions.get(key);
      if (!t || t.kind !== kind) return null;
      const u = (now - t.since) / (ms * t.stretch);
      if (u >= 1) {
        link.transitions.delete(key);
        return null;
      }
      return u;
    };

    const place = (node: Object3D, p: Point, y = 0) => {
      const c = cellCentre(p);
      node.position.set(c.x, y, c.z);
    };

    // Units: where the pose has them, else where `state` has them. A unit
    // faces the way it walks, else the Furnace it attacks. One carried off
    // stands until its cue, then sinks (2H.21); one coming on is hidden
    // until its cue, then rises.
    for (const unit of state.units) {
      const key = `u:${unit.id}`;
      const node = link.pieces.get(key);
      if (!node) continue;
      const at = pose?.moving.get(key) ?? unit;
      const c = cellCentre(at);
      const last = link.lastAt.get(key);
      const home = unit.team === 'A' ? Math.PI / 2 : -Math.PI / 2;
      let yaw = facing.current.get(key) ?? home;
      if (last && (Math.abs(c.x - last.x) > 0.002 || Math.abs(c.z - last.z) > 0.002)) {
        yaw = Math.atan2(c.x - last.x, c.z - last.z);
      } else if (!pose?.moving.has(key)) {
        // Back to facing the mouth it attacks, by the short way round.
        const turn = MathUtils.euclideanModulo(home - yaw + Math.PI, Math.PI * 2) - Math.PI;
        yaw += turn * 0.12;
      }
      // The puppet (2H.22): the walk's bob and lean, then the gesture of the
      // moment, which may turn the Giff at what it is doing it to.
      const stride = gait.current.get(key) ?? { phase: 0, lean: 0 };
      const moved = last ? Math.hypot(c.x - last.x, c.z - last.z) : 0;
      const walking = moved > 0.002 && pose?.moving.has(key) === true;
      stride.phase = walking ? stride.phase + (moved * Math.PI) / STRIDE : 0;
      stride.lean += ((walking ? LEAN : 0) - stride.lean) * 0.2;
      gait.current.set(key, stride);
      let bob = walking ? BOB * Math.abs(Math.sin(stride.phase)) : 0;
      let pitch = stride.lean;
      let twist = 0;
      let push = { x: 0, z: 0 };
      const g = link.gestures.get(key);
      if (g) {
        const u = (now - g.since) / (GESTURE_MS[g.kind] * g.stretch);
        if (u >= 1) {
          link.gestures.delete(key);
        } else {
          const aim = g.toward ? Math.atan2(g.toward.x - c.x, g.toward.z - c.z) : yaw;
          const arc = Math.sin(u * Math.PI);
          switch (g.kind) {
            case 'swing':
              // Wind back, strike round, come back.
              yaw = aim;
              twist = u < 0.3 ? -0.7 * (u / 0.3) : u < 0.55 ? -0.7 + 1.7 * ((u - 0.3) / 0.25) : 1.0 * (1 - (u - 0.55) / 0.45);
              pitch += 0.15 * arc;
              break;
            case 'lunge':
              yaw = aim;
              push = { x: Math.sin(aim) * LUNGE * arc, z: Math.cos(aim) * LUNGE * arc };
              pitch += 0.25 * arc;
              break;
            case 'flinch':
              pitch -= 0.3 * arc;
              bob += 0.05 * arc;
              break;
            case 'throw':
              yaw = aim;
              pitch += 0.2 * arc;
              break;
          }
        }
      }
      facing.current.set(key, yaw);
      // Yaw first, then the lean about the Giff's own sideways axis.
      node.rotation.set(pitch, yaw + twist, 0, 'YXZ');
      let y = 0;
      let visible = unit.status === 'active' || pose?.moving.has(key) === true;
      const sinking = transition(key, 'exit', EXIT_MS);
      const rising = transition(key, 'enter', EXIT_MS);
      if (sinking !== null) {
        y = -SINK * sinking * sinking;
        visible = true;
      } else if (rising !== null) {
        y = -SINK * (1 - rising) * (1 - rising);
        visible = true;
      } else if (unit.status !== 'active' && pending('exit', unit.id)) {
        visible = true;
      } else if (unit.status === 'active' && pending('enter', unit.id)) {
        visible = false;
      }
      node.position.set(c.x + push.x, y + bob, c.z + push.z);
      node.visible = visible;
      link.lastAt.set(key, { x: c.x, z: c.z });
    }

    // Crackers: drawn until their roll is over, even when the beat destroys them.
    for (const cracker of state.crackers) {
      const key = `c:${cracker.id}`;
      const node = link.pieces.get(key);
      if (!node) continue;
      const moving = pose?.moving.get(key);
      node.visible = cracker.state === 'live' || moving !== undefined;
      place(node, moving ?? cracker);
    }

    // The Spark. Entering, it comes down from above once its cue has fired
    // (2H.21), and is not drawn before.
    const spark = link.pieces.get('s');
    if (spark) {
      const moving = pose?.moving.get('s');
      const drop = transition('s', 'drop', DROP_MS);
      const waiting = !moving && track.cues.some((c, i) => i >= fired.current.n && c.cue.kind === 'sparkIn');
      spark.visible = !waiting && (sparkIsLive(state.spark) || moving !== undefined);
      place(spark, moving ?? state.spark, drop !== null ? DROP_FROM * (1 - drop) * (1 - drop) : 0);
    }

    // The ball: in flight, waiting for its flight, in a hand, or on the floor.
    const ball = link.pieces.get('b');
    const loose = link.pieces.get('b:loose');
    if (ball) {
      const bp = pose?.ball ?? null;
      if (bp?.kind === 'air') {
        const lift = bp.flight === 'scatter' ? 0.25 + 0.5 * bp.height : 0.6 + 2.4 * bp.height;
        place(ball, bp.at, lift);
        if (loose) loose.visible = false;
      } else if (bp?.kind === 'rest') {
        place(ball, bp.at, bp.held ? 1.15 : 0.22);
        if (loose) {
          loose.visible = !bp.held;
          place(loose, bp.at);
        }
      } else if (state.payload.carriedBy) {
        const carrier = link.pieces.get(`u:${state.payload.carriedBy}`);
        if (carrier) ball.position.set(carrier.position.x + 0.3, 1.15, carrier.position.z + 0.25);
        if (loose) loose.visible = false;
      } else {
        place(ball, state.payload, 0.22);
        if (loose) {
          loose.visible = true;
          place(loose, state.payload);
        }
      }
      ball.visible = true;
    }

    // What the camera follows: the beat's unit, else the unit on the clock,
    // else the ball.
    const star = spotlight ?? state.turn?.unitId ?? null;
    const starNode = star ? link.pieces.get(`u:${star}`) : undefined;
    if (starNode && starNode.visible) {
      link.focus = { x: starNode.position.x, z: starNode.position.z };
      link.focusKey = `u:${star}`;
    } else if (ball) {
      link.focus = { x: ball.position.x, z: ball.position.z };
      link.focusKey = 'b';
    }

    // The camera, then the words that follow the pieces through it.
    link.camera?.(delta);
    for (const listener of link.listeners) listener();
  });

  return null;
}

/** Frames per second, in development only (C20), written by hand once a frame. */
function FpsReadout({ link }: { link: SceneLink }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let shown = -1;
    const tick = () => {
      if (link.fps === shown || !ref.current) return;
      shown = link.fps;
      ref.current.textContent = `${shown} fps`;
    };
    link.listeners.add(tick);
    return () => {
      link.listeners.delete(tick);
    };
  }, [link]);
  return <span ref={ref} style={S.fps} data-testid="fps" />;
}

const S: Record<string, React.CSSProperties> = {
  frame: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    position: 'relative',
    background: '#05070a',
    boxShadow: '0 0 0 1px var(--line)',
    overflow: 'hidden',
  },
  hud: {
    position: 'absolute',
    top: 8,
    right: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    pointerEvents: 'none',
  },
  zoomButton: { fontSize: 10, padding: '4px 9px', pointerEvents: 'auto', background: 'rgba(5,7,10,.8)' },
  fps: { font: `600 10px 'IBM Plex Mono', monospace`, color: BRASS, background: 'rgba(5,7,10,.8)', padding: '1px 5px' },
};
