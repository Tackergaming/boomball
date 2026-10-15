/**
 * The camera: three quarters, plunging, in the player's hand (C18, C19, C20).
 *
 * J4 asked for a frame that holds still; Jérôme's first game in 3D asked for
 * the opposite, and C18 settles it. Two presets, the button on the board:
 *
 * - **wide**: the whole pitch in the frame, centred, whatever the window's
 *   shape: the forty-five cells fit across, and the fifteen fit down.
 * - **close**: the pitch's full width in the frame's height, a cell to spare,
 *   and the camera glides along the pitch after whatever the match is about
 *   (the unit whose beat is playing, the unit on the clock, else the ball),
 *   clamped so it never looks past an end of the silo.
 *
 * On top of either preset the player drives the camera, and **the hand is
 * raw** (C20): a drag on the right (or middle) mouse button turns the camera
 * at once around the point it aims at, which does not move by a pixel; the
 * mouse moved with Ctrl held drags the floor along, stuck to the cursor; the
 * arrow keys slide the camera with a short inertia. The wheel sets a distance
 * the camera glides to. The left button stays the game's. A preset's distance
 * is worked out when the preset is chosen and when the frame changes shape,
 * at the preset tilt, and tilting changes nothing but the tilt.
 *
 * Any pan unhooks the camera from the play (C19); the board hooks it back
 * when the player's own Giff comes on the clock, on "Follow the play", and
 * when a preset is chosen again (which also puts the orbit back). Hooked, the
 * camera is calm: it changes what it follows once per action and no faster
 * than every four tenths of a second, and glides to it.
 *
 * The rig places the camera from the scene's frame loop (`link.camera`),
 * after the pieces are placed and before the labels follow, so the three
 * agree within one frame. It also publishes two projections of the camera:
 * the window-pixel one `cellToScreen` reads (`projection.ts`), and the
 * canvas-relative one the label layer follows (`link.project`).
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import {
  clampPan,
  clampTilt,
  clampZoom,
  confine,
  groundCentreOffsetPerUnit,
  groundDepthPerUnit,
  orbitPosition,
  PRESET_TILT,
  presetDistance,
  viewAxes,
  type Zoom,
} from './framing.js';
import { cellCentre, PITCH_LENGTH, PITCH_WIDTH } from './layoutGeometry.js';
import { setProjector } from './projection.js';
import type { SceneLink } from './scene.js';

export type { Zoom } from './framing.js';

/** Radians of orbit per pixel of drag. */
const YAW_PER_PX = 0.006;
const TILT_PER_PX = 0.004;
/** The wheel's bite: one notch of 100 is about ten per cent of distance. */
const WHEEL_RATE = 0.001;
/** Seconds for the distance to settle after the wheel. */
const ZOOM_EASE = 0.1;
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
  zoom: Zoom;
  link: SceneLink;
  /** True while the camera follows the play; the board owns it. */
  hooked: boolean;
  /** Called once when a pan lets go of the play. */
  onUnhook: () => void;
}

export function Rig({ zoom, link, hooked, onUnhook }: RigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  /** The camera's state, all of it read and written by hand, never by React. */
  const cam = useRef({
    /** The ground point centred in the frame. */
    target: { x: 0, z: 0 },
    yaw: 0,
    tilt: PRESET_TILT,
    /** The wheel's factor over the preset distance. */
    zoom: 1,
    /** The preset distance, worked out at the preset tilt for the frame's aspect. */
    preset: 30,
    presetAspect: 0,
    /** The distance the camera is actually at, gliding to preset × zoom. */
    distance: 30,
    /** The arrow keys' speed, in the frame's directions. */
    vel: { forward: 0, right: 0 },
    /** What the hooked camera is on, when it got there, and where that is. */
    follow: { key: null as string | null, since: 0, at: { x: 0, z: 0 } },
    settled: false,
    frames: 0,
    fpsSince: 0,
  });
  const keys = useRef(new Set<string>());
  const lookAt = useRef(new Vector3());
  const hookedRef = useRef(hooked);
  hookedRef.current = hooked;
  const zoomRef = useRef(zoom);
  const unhookRef = useRef(onUnhook);
  unhookRef.current = onUnhook;

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

  // Choosing a preset puts the orbit back to the fixed view and asks for the
  // preset distance again.
  useEffect(() => {
    zoomRef.current = zoom;
    const c = cam.current;
    c.yaw = 0;
    c.tilt = PRESET_TILT;
    c.zoom = 1;
    c.presetAspect = 0;
  }, [zoom]);

  // The hand: right or middle button to turn, Ctrl with the mouse to drag the
  // floor, the arrow keys to slide, the wheel to zoom. All raw but the wheel.
  useEffect(() => {
    const el = gl.domElement;
    let pointer: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let ctrlX: number | null = null;
    let ctrlY = 0;
    const letGo = () => {
      if (hookedRef.current) unhookRef.current();
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 2 && e.button !== 1) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      const c = cam.current;
      if (e.pointerId === pointer) {
        c.yaw -= (e.clientX - lastX) * YAW_PER_PX;
        c.tilt = clampTilt(c.tilt + (e.clientY - lastY) * TILT_PER_PX);
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      // Ctrl with the mouse pans only over the scene itself.
      if (!e.ctrlKey || e.target !== el) {
        ctrlX = null;
        return;
      }
      if (ctrlX === null) {
        ctrlX = e.clientX;
        ctrlY = e.clientY;
        return;
      }
      const dx = e.clientX - ctrlX;
      const dy = e.clientY - ctrlY;
      ctrlX = e.clientX;
      ctrlY = e.clientY;
      if (dx === 0 && dy === 0) return;
      letGo();
      // One pixel of the frame is this much floor at the point aimed at,
      // across; along the view the floor is foreshortened by the tilt.
      const fov = (camera.fov * Math.PI) / 180;
      const perPx = (2 * c.distance * Math.tan(fov / 2)) / Math.max(1, el.clientHeight);
      const axes = viewAxes(c.yaw);
      const across = -dx * perPx;
      const along = (dy * perPx) / Math.sin(c.tilt);
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
      const c = cam.current;
      c.zoom = clampZoom(c.zoom * Math.exp(e.deltaY * WHEEL_RATE));
    };
    const menu = (e: Event) => e.preventDefault();
    const keyDown = (e: KeyboardEvent) => {
      if (!(e.key in PAN_KEYS) || typing(e.target)) return;
      e.preventDefault();
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
  }, [gl, camera]);

  // The frame step, run by the scene's loop once the pieces are placed.
  useEffect(() => {
    link.camera = (delta: number) => {
      const c = cam.current;
      const z = zoomRef.current;
      const fov = (camera.fov * Math.PI) / 180;
      const now = performance.now();

      // The preset distance, at the preset tilt, for this frame's shape.
      if (Math.abs(camera.aspect - c.presetAspect) > 1e-6) {
        c.preset = presetDistance(z, camera.aspect, fov, PRESET_TILT);
        c.presetAspect = camera.aspect;
      }
      const wanted = c.preset * c.zoom;
      c.distance = c.settled ? c.distance + (wanted - c.distance) * settle(delta, ZOOM_EASE) : wanted;

      if (hookedRef.current) {
        // Calm following: a new thing to follow is taken up once the last one
        // has had its moment; the thing followed is tracked as it moves.
        const key = link.focusKey;
        if (key !== c.follow.key && now - c.follow.since >= FOLLOW_DWELL_MS) {
          c.follow.key = key;
          c.follow.since = now;
        }
        if (key === c.follow.key) c.follow.at = { x: link.focus.x, z: link.focus.z };

        let tx = 0;
        let tz = 0;
        if (z === 'close') {
          const halfSpan = c.distance * Math.tan(fov / 2) * camera.aspect;
          const limit = Math.max(0, PITCH_LENGTH / 2 + 1 - halfSpan);
          tx = Math.max(-limit, Math.min(limit, c.follow.at.x));
          // The whole width is in the frame at the preset; nearer than that,
          // the camera slides across after the play too.
          const depth = c.distance * groundDepthPerUnit(c.tilt, fov);
          tz = c.follow.at.z * Math.max(0, 1 - depth / PITCH_WIDTH);
        }
        if (c.settled) {
          const k = settle(delta, FOLLOW_EASE);
          c.target = { x: c.target.x + (tx - c.target.x) * k, z: c.target.z + (tz - c.target.z) * k };
        } else c.target = { x: tx, z: tz };
        c.vel = { forward: 0, right: 0 };
      } else {
        // The arrow keys, with a short inertia; Ctrl with the mouse has
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
          const axes = viewAxes(c.yaw);
          c.target = clampPan({
            x: c.target.x + (axes.forward.x * c.vel.forward + axes.right.x * c.vel.right) * delta,
            z: c.target.z + (axes.forward.z * c.vel.forward + axes.right.z * c.vel.right) * delta,
          });
        }
      }
      c.settled = true;

      // The frame covers more floor beyond the point looked at than before
      // it: look that much short of the target, along the view, to centre
      // it. The target itself never moves when the camera turns.
      const short = c.distance * groundCentreOffsetPerUnit(c.tilt, fov);
      lookAt.current.set(c.target.x + short * Math.sin(c.yaw), 0, c.target.z + short * Math.cos(c.yaw));
      // Inside the silo (C22): the walls and the end plates stop the camera.
      const p = confine(orbitPosition({ x: lookAt.current.x, z: lookAt.current.z }, c, c.distance));
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
  }, [link, camera]);

  return null;
}
