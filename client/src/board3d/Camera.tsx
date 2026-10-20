/**
 * The camera: four views, no free orbit (2H.39, `00` C39).
 *
 * Jérôme's first games in 3D asked for a camera in hand (C18, C19); his games
 * on it found "des angles inutiles et injouables", and C39 settles it: the
 * angle is fixed by the view, the zoom is a starting value the wheel changes.
 *
 * - **side**: from the touchline at 52 degrees, own Furnace on the left. The
 *   match opens here, on the whole silo (capture A1).
 * - **top**: from the touchline at 85 degrees, the table's view.
 * - **own** and **far**: from behind each Furnace at 40 degrees, the pitch in
 *   depth, fixed: no wheel, no keys, no drag.
 *
 * In the two touchline views the wheel sets a distance the camera glides to,
 * between the silo with its stands and nine cells of depth; the right (or
 * middle) mouse button drags the floor along, stuck to the cursor, and the
 * arrow keys slide the camera with a short inertia. **The hand is raw**
 * (C20): nothing is damped but the wheel's glide and the keys' inertia. The
 * left button stays the game's.
 *
 * Any pan unhooks the camera from the play (C19); the board hooks it back
 * when the player's own Giff comes on the clock, on "Follow the play" or C,
 * and when a view is chosen. Each time it hooks back (not at the opening),
 * the zoom goes to the follow framing: the pitch's width with its two rails
 * and the first rows of the stands (`FOLLOW_DEPTH`). Hooked, the camera is
 * calm: it changes what it follows once per action and no faster than every
 * four tenths of a second, and glides to it, never looking past the pitch.
 *
 * The rig places the camera from the scene's frame loop (`link.camera`),
 * after the pieces are placed and before the labels follow, so the three
 * agree within one frame. It also publishes two projections of the camera:
 * the window-pixel one `cellToScreen` reads (`projection.ts`), and the
 * canvas-relative one the label layer follows (`link.project`); and whether
 * the plates should be short at this distance (`link.platesShort`).
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import {
  clampDistance,
  clampPan,
  confine,
  endViewDistance,
  followDistance,
  followTarget,
  groundCentreOffsetPerUnit,
  insetLens,
  orbitPosition,
  platesShort,
  viewAxes,
  viewSpec,
  wholeSiloDistance,
  zoomBounds,
  type CameraView,
} from './framing.js';
import { cellCentre } from './layoutGeometry.js';
import { setProjector } from './projection.js';
import type { SceneLink } from './scene.js';

export type { CameraView } from './framing.js';

/** The lens the canvas is made with, before the action row's inset (`Board3D.tsx`). */
const BASE_FOV = 36;

/** The wheel's bite: one notch of 100 is about ten per cent of distance. */
const WHEEL_RATE = 0.001;
/** Seconds for the distance to settle after the wheel, and for a view change. */
const ZOOM_EASE = 0.1;
const VIEW_EASE = 0.3;
/** Cells per second under an arrow key, per unit of camera distance, and how long the speed takes to build or die. */
const KEY_PAN_RATE = 0.5;
const KEY_EASE = 0.15;
/** Seconds for the hooked camera to glide to what it follows, and the least time it stays on one thing. */
const FOLLOW_EASE = 0.25;
const FOLLOW_DWELL_MS = 400;

const PAN_KEYS: Record<string, { forward: number; right: number }> = {
  ArrowUp: { forward: 1, right: 0 },
  ArrowDown: { forward: -1, right: 0 },
  ArrowLeft: { forward: 0, right: -1 },
  ArrowRight: { forward: 0, right: 1 },
};

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** The fraction of a gap closed in `delta` seconds with a settling time of `ease`. */
const settle = (delta: number, ease: number): number => 1 - Math.exp(-delta / ease);

export interface RigProps {
  view: CameraView;
  /** The sign of own Furnace's world x: the end views look from behind it or the other. */
  ownSign: 1 | -1;
  link: SceneLink;
  /** True while the camera follows the play; the board owns it. */
  hooked: boolean;
  /**
   * Counts the times the board hooked the camera back on purpose (own turn,
   * "Follow the play", C): each one puts the zoom at the follow framing.
   */
  hookPulse: number;
  /** Called once when a pan lets go of the play. */
  onUnhook: () => void;
}

export function Rig({ view, ownSign, link, hooked, hookPulse, onUnhook }: RigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  /** The camera's state, all of it read and written by hand, never by React. */
  const cam = useRef({
    /** The ground point centred in the frame. */
    target: { x: 0, z: 0 },
    /** The distance the wheel asks for; null until the first frame opens on the whole silo. */
    wanted: null as number | null,
    /** The distance the camera is actually at, gliding to `wanted`. */
    distance: 30,
    /** The arrow keys' speed, in the frame's directions. */
    vel: { forward: 0, right: 0 },
    /** What the hooked camera is on, when it got there, and where that is. */
    follow: { key: null as string | null, since: 0, at: { x: 0, z: 0 } },
    /** The last hook pulse answered. */
    pulse: hookPulse,
    /** The last view placed, to glide between two rather than cut. */
    view: null as CameraView | null,
    ease: ZOOM_EASE,
    settled: false,
    frames: 0,
    fpsSince: 0,
  });
  /**
   * The lens of the frame above the action row (2H.38, `insetLens`), in
   * radians: what every distance and pan below is worked out with. The
   * camera itself wears the taller virtual lens, set by the frame step.
   */
  const lens = useRef({ fov: (BASE_FOV * Math.PI) / 180, aspect: 1, key: '' });
  const keys = useRef(new Set<string>());
  const lookAt = useRef(new Vector3());
  const hookedRef = useRef(hooked);
  hookedRef.current = hooked;
  const viewRef = useRef(view);
  viewRef.current = view;
  const ownRef = useRef(ownSign);
  ownRef.current = ownSign;
  const pulseRef = useRef(hookPulse);
  pulseRef.current = hookPulse;
  const unhookRef = useRef(onUnhook);
  unhookRef.current = onUnhook;
  const spec = () => viewSpec(viewRef.current, ownRef.current);

  // Both projectors are the camera itself, read at the time of the call.
  useEffect(() => {
    const v = new Vector3();
    setProjector((x, y) => {
      if (x < 0 || x >= ARENA_WIDTH || y < 0 || y >= ARENA_HEIGHT) return null;
      const c = cellCentre({ x, y });
      v.set(c.x, 0, c.z).project(camera);
      if (v.z > 1) return null;
      const rect = gl.domElement.getBoundingClientRect();
      return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
    });
    link.project = (x, y, z) => {
      v.set(x, y, z).project(camera);
      const width = gl.domElement.clientWidth;
      const height = gl.domElement.clientHeight;
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, inFront: v.z <= 1 };
    };
    return () => {
      setProjector(null);
      link.project = null;
    };
  }, [camera, gl, link]);

  // The hand: the wheel to zoom, the right or middle button to drag the
  // floor, the arrow keys to slide. All raw but the wheel's glide and the
  // keys' inertia. Nothing in the two end views.
  useEffect(() => {
    const el = gl.domElement;
    let pointer: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const letGo = () => {
      if (hookedRef.current) unhookRef.current();
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 2 && e.button !== 1) return;
      e.preventDefault();
      if (!spec().zoomable) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const c = cam.current;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (dx === 0 && dy === 0) return;
      letGo();
      // One pixel of the frame is this much floor at the point aimed at,
      // across; along the view the floor is foreshortened by the tilt.
      // The usable lens spans the frame above the row at the same pixel scale.
      const { yaw, tilt } = spec();
      const fov = lens.current.fov;
      const usableHeight = Math.max(1, el.clientHeight - Math.min(link.bottomInset, el.clientHeight * 0.5));
      const perPx = (2 * c.distance * Math.tan(fov / 2)) / usableHeight;
      const axes = viewAxes(yaw);
      const across = -dx * perPx;
      const along = (dy * perPx) / Math.sin(tilt);
      c.target = clampPan({
        x: c.target.x + axes.right.x * across + axes.forward.x * along,
        z: c.target.z + axes.right.z * across + axes.forward.z * along,
      });
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointer) pointer = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!spec().zoomable) return;
      const c = cam.current;
      if (c.wanted === null) return;
      c.wanted = c.wanted * Math.exp(e.deltaY * WHEEL_RATE);
      c.ease = ZOOM_EASE;
    };
    const menu = (e: Event) => e.preventDefault();
    const keyDown = (e: KeyboardEvent) => {
      if (!(e.key in PAN_KEYS) || typing(e.target)) return;
      e.preventDefault();
      if (!spec().zoomable) return;
      keys.current.add(e.key);
      letGo();
    };
    const keyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key);
    };
    const blur = () => keys.current.clear();
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', menu);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', menu);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
    };
  }, [gl, camera, link]);

  // The three ways in from the screen (2H.38, `00` C37): a chip or the
  // minimap puts a cell in the middle of the frame and lets go of the play.
  // Nothing in the two end views, which do not move.
  useEffect(() => {
    link.centreOn = (cell) => {
      if (!spec().zoomable) return;
      const c = cellCentre(cell);
      cam.current.target = clampPan({ x: c.x, z: c.z });
      cam.current.vel = { forward: 0, right: 0 };
      if (hookedRef.current) unhookRef.current();
    };
    return () => {
      link.centreOn = null;
    };
  }, [link]);

  // The frame step, run by the scene's loop once the pieces are placed.
  useEffect(() => {
    link.camera = (delta: number) => {
      const c = cam.current;
      const { yaw, tilt, zoomable } = spec();
      const now = performance.now();

      // The lens above the action row (2H.38). Re-applied whenever the
      // canvas or the row changes, and whenever fiber has put its own aspect
      // back after a resize.
      const width = gl.domElement.clientWidth;
      const height = gl.domElement.clientHeight;
      const inset = insetLens(BASE_FOV, Math.max(1, width), Math.max(1, height), link.bottomInset);
      const lensKey = `${width}x${height}-${link.bottomInset}`;
      if (lensKey !== lens.current.key || Math.abs(camera.aspect - inset.virtual.aspect) > 1e-9) {
        lens.current = { fov: (inset.usable.fov * Math.PI) / 180, aspect: inset.usable.aspect, key: lensKey };
        camera.fov = inset.virtual.fov;
        camera.aspect = inset.virtual.aspect;
        camera.setViewOffset(Math.max(1, width), inset.virtual.fullHeight, 0, inset.virtual.offsetY, Math.max(1, width), Math.max(1, height));
        camera.updateProjectionMatrix();
      }
      const fov = lens.current.fov;
      const aspect = lens.current.aspect;

      // The distance asked for: the whole silo at the opening, the follow
      // framing each time the board hooks the camera back on purpose, the
      // wheel in between; the end views stand where the length fits.
      if (c.wanted === null) c.wanted = wholeSiloDistance(aspect, fov, tilt);
      if (pulseRef.current !== c.pulse) {
        c.pulse = pulseRef.current;
        if (zoomable) c.wanted = followDistance(tilt, fov);
        c.ease = ZOOM_EASE;
      }
      if (c.view !== viewRef.current) {
        c.view = viewRef.current;
        c.ease = VIEW_EASE;
      }
      let wanted: number;
      if (zoomable) {
        c.wanted = clampDistance(c.wanted, zoomBounds(aspect, fov, tilt));
        wanted = c.wanted;
      } else {
        wanted = endViewDistance(fov);
      }
      c.distance = c.settled ? c.distance + (wanted - c.distance) * settle(delta, c.ease) : wanted;
      link.platesShort = !zoomable || platesShort(c.distance, aspect, fov, tilt);

      if (!zoomable) {
        // Fixed on the pitch's centre; nothing moves it.
        c.target = c.settled ? { x: c.target.x * (1 - settle(delta, VIEW_EASE)), z: c.target.z * (1 - settle(delta, VIEW_EASE)) } : { x: 0, z: 0 };
        c.vel = { forward: 0, right: 0 };
      } else if (hookedRef.current) {
        // Calm following: a new thing to follow is taken up once the last one
        // has had its moment; the thing followed is tracked as it moves.
        const key = link.focusKey;
        if (key !== c.follow.key && now - c.follow.since >= FOLLOW_DWELL_MS) {
          c.follow.key = key;
          c.follow.since = now;
        }
        if (key === c.follow.key) c.follow.at = { x: link.focus.x, z: link.focus.z };
        const t = followTarget(c.follow.at, c.distance, aspect, fov, tilt);
        if (c.settled) {
          const k = settle(delta, FOLLOW_EASE);
          c.target = { x: c.target.x + (t.x - c.target.x) * k, z: c.target.z + (t.z - c.target.z) * k };
        } else c.target = t;
        c.vel = { forward: 0, right: 0 };
      } else {
        // The arrow keys, with a short inertia; the right button has
        // already moved the target directly.
        let forward = 0;
        let right = 0;
        for (const key of keys.current) {
          const k = PAN_KEYS[key];
          if (k) {
            forward += k.forward;
            right += k.right;
          }
        }
        const speed = KEY_PAN_RATE * c.distance;
        const k = settle(delta, KEY_EASE);
        c.vel.forward += (forward * speed - c.vel.forward) * k;
        c.vel.right += (right * speed - c.vel.right) * k;
        if (Math.abs(c.vel.forward) > 1e-3 || Math.abs(c.vel.right) > 1e-3) {
          const axes = viewAxes(yaw);
          c.target = clampPan({
            x: c.target.x + (axes.forward.x * c.vel.forward + axes.right.x * c.vel.right) * delta,
            z: c.target.z + (axes.forward.z * c.vel.forward + axes.right.z * c.vel.right) * delta,
          });
        }
      }
      c.settled = true;

      // The frame covers more floor beyond the point looked at than before
      // it: look that much short of the target, along the view, to centre
      // it. The target itself never moves when the view changes.
      const short = c.distance * groundCentreOffsetPerUnit(tilt, fov);
      lookAt.current.set(c.target.x + short * Math.sin(yaw), 0, c.target.z + short * Math.cos(yaw));
      // Inside the silo (C22): the walls and the end plates stop the camera.
      const p = confine(orbitPosition({ x: lookAt.current.x, z: lookAt.current.z }, { yaw, tilt }, c.distance));
      camera.position.set(p.x, p.y, p.z);
      camera.lookAt(lookAt.current);
      camera.updateMatrixWorld();

      // Frames per second, over the last half second, for the dev readout.
      c.frames += 1;
      if (c.fpsSince === 0) c.fpsSince = now;
      else if (now - c.fpsSince >= 500) {
        link.fps = Math.round((c.frames * 1000) / (now - c.fpsSince));
        c.frames = 0;
        c.fpsSince = now;
      }
    };
    return () => {
      link.camera = null;
    };
  }, [link, camera, gl]);

  return null;
}
