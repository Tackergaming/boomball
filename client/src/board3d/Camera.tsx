/**
 * The camera: three quarters, plunging, in the player's hand (C18, C19).
 *
 * J4 asked for a frame that holds still; Jérôme's first game in 3D asked for
 * the opposite, and C18 settles it. Two presets, the button on the board:
 *
 * - **wide**: the whole pitch in the frame, centred, whatever the window's
 *   shape. The distance is worked out every frame from the camera's aspect so
 *   the forty-five cells always fit across, and the fifteen always fit down.
 * - **close**: the pitch's full width in the frame's height, a cell to spare,
 *   and the camera glides along the pitch after whatever the match is about
 *   (the unit whose beat is playing, the unit on the clock, else the ball),
 *   clamped so it never looks past an end of the silo.
 *
 * On top of either preset the player drives an orbit: a drag on the right
 * (or middle) mouse button turns the camera around the point it follows,
 * the wheel brings it nearer or further, within `framing.ts`'s bounds. The
 * left button stays the game's.
 *
 * And the player may let go of the play (C19): the arrow keys, or the mouse
 * moved with Ctrl held, pan the camera over the pitch, read in the frame's
 * own directions whichever way it is turned, and bounded to the silo and its
 * surroundings. Any pan unhooks the camera from the play; the board hooks it
 * back when the player's own Giff comes on the clock, when the "Follow the
 * play" button is pressed, and when a preset is chosen again (which also puts
 * the orbit back to the fixed three-quarter view).
 *
 * The rig also publishes two projections of the same camera: the window-pixel
 * one `cellToScreen` reads (see `projection.ts`), and the canvas-relative one
 * the label layer follows (`link.project`). Both read the camera as it is at
 * the time of the call, so turning or moving it costs the game nothing.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import {
  clampPan,
  clampTilt,
  clampZoom,
  groundCentreOffsetPerUnit,
  groundDepthPerUnit,
  orbitPosition,
  presetDistance,
  presetOrbit,
  viewAxes,
  type Orbit,
  type Zoom,
} from './framing.js';
import { cellCentre, PITCH_LENGTH, PITCH_WIDTH } from './layoutGeometry.js';
import { setProjector } from './projection.js';
import type { SceneLink } from './scene.js';

export type { Zoom } from './framing.js';

/** How much of the gap to the point followed the camera closes per second. */
const DAMPING = 4;
/** Radians of orbit per pixel of drag. */
const YAW_PER_PX = 0.006;
const TILT_PER_PX = 0.004;
/** The wheel's bite: one notch of 100 is about ten per cent of distance. */
const WHEEL_RATE = 0.001;
/** Cells per second under an arrow key, per unit of camera distance. */
const KEY_PAN_RATE = 0.5;

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
  const orbit = useRef<Orbit>(presetOrbit());
  /** Where the camera is aimed while unhooked, in world units. */
  const pan = useRef({ x: 0, z: 0 });
  const keys = useRef(new Set<string>());
  const lookAt = useRef(new Vector3());
  const settled = useRef(false);
  /** The camera's distance and tilt this frame, for the mouse pan to scale by. */
  const frame = useRef({ distance: 30, tilt: presetOrbit().tilt });
  const hookedRef = useRef(hooked);
  hookedRef.current = hooked;
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

  // Choosing a preset puts the orbit back to the fixed view.
  useEffect(() => {
    orbit.current = presetOrbit();
  }, [zoom]);

  // The orbit in hand: right or middle button to turn, wheel to zoom; and the
  // pan: Ctrl with the mouse drags the floor along, the arrow keys slide it.
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
      if (e.pointerId === pointer) {
        const o = orbit.current;
        o.yaw -= (e.clientX - lastX) * YAW_PER_PX;
        o.tilt = clampTilt(o.tilt + (e.clientY - lastY) * TILT_PER_PX);
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
      // One pixel of the frame is this much floor at the point looked at,
      // across; along the view the floor is foreshortened by the tilt.
      const fov = (camera.fov * Math.PI) / 180;
      const perPx = (2 * frame.current.distance * Math.tan(fov / 2)) / Math.max(1, el.clientHeight);
      const axes = viewAxes(orbit.current.yaw);
      const across = -dx * perPx;
      const along = (dy * perPx) / Math.sin(frame.current.tilt);
      pan.current = clampPan({
        x: pan.current.x + axes.right.x * across + axes.forward.x * along,
        z: pan.current.z + axes.right.z * across + axes.forward.z * along,
      });
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointer) pointer = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const o = orbit.current;
      o.zoom = clampZoom(o.zoom * Math.exp(e.deltaY * WHEEL_RATE));
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

  useFrame((_, delta) => {
    const o = orbit.current;
    const fov = (camera.fov * Math.PI) / 180;
    const distance = presetDistance(zoom, camera.aspect, fov, o.tilt) * o.zoom;
    const halfSpan = distance * Math.tan(fov / 2) * camera.aspect;
    const depth = distance * groundDepthPerUnit(o.tilt, fov);
    frame.current = { distance, tilt: o.tilt };

    // The point to centre in the frame: the pitch, or what the match is about,
    // or where the player has panned to.
    let tx = 0;
    let tz = 0;
    if (hooked) {
      if (zoom === 'close') {
        const limit = Math.max(0, PITCH_LENGTH / 2 + 1 - halfSpan);
        tx = Math.max(-limit, Math.min(limit, link.focus.x));
        // The whole width is in the frame at the preset; nearer than that, the
        // camera slides across after the play too.
        const across = Math.max(0, 1 - depth / PITCH_WIDTH);
        tz = link.focus.z * across;
      }
      // So that letting go starts from where the play was, without a jump.
      pan.current = { x: tx, z: tz };
    } else {
      if (keys.current.size > 0) {
        const axes = viewAxes(o.yaw);
        let forward = 0;
        let right = 0;
        for (const key of keys.current) {
          const k = PAN_KEYS[key];
          if (k) {
            forward += k.forward;
            right += k.right;
          }
        }
        const step = KEY_PAN_RATE * distance * delta;
        pan.current = clampPan({
          x: pan.current.x + (axes.forward.x * forward + axes.right.x * right) * step,
          z: pan.current.z + (axes.forward.z * forward + axes.right.z * right) * step,
        });
      }
      tx = pan.current.x;
      tz = pan.current.z;
    }
    // The frame covers more floor beyond the point looked at than before it:
    // look that much short of the target, along the view, to centre it.
    const short = distance * groundCentreOffsetPerUnit(o.tilt, fov);
    const goalX = tx + short * Math.sin(o.yaw);
    const goalZ = tz + short * Math.cos(o.yaw);

    if (!settled.current) {
      lookAt.current.set(goalX, 0, goalZ);
      settled.current = true;
    } else {
      const k = 1 - Math.exp(-DAMPING * delta);
      lookAt.current.x += (goalX - lookAt.current.x) * k;
      lookAt.current.z += (goalZ - lookAt.current.z) * k;
    }
    const p = orbitPosition({ x: lookAt.current.x, z: lookAt.current.z }, o, distance);
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(lookAt.current);
    camera.updateMatrixWorld();
  });

  return null;
}
