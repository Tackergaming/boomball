/**
 * The camera: three quarters, plunging, in the player's hand (C18).
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
 * left button stays the game's. Choosing a preset again puts the orbit back
 * to the fixed three-quarter view; otherwise it holds from turn to turn.
 *
 * The rig also publishes two projections of the same camera: the window-pixel
 * one `cellToScreen` reads (see `projection.ts`), and the canvas-relative one
 * the label layer follows (`link.project`). Both read the camera as it is at
 * the time of the call, so turning it costs the game nothing.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import {
  clampTilt,
  clampZoom,
  groundCentreOffsetPerUnit,
  groundDepthPerUnit,
  orbitPosition,
  presetDistance,
  presetOrbit,
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

export function Rig({ zoom, link }: { zoom: Zoom; link: SceneLink }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const orbit = useRef<Orbit>(presetOrbit());
  const lookAt = useRef(new Vector3());
  const settled = useRef(false);

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

  // The orbit in hand: right or middle button to turn, wheel to zoom.
  useEffect(() => {
    const el = gl.domElement;
    let pointer: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 2 && e.button !== 1) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const o = orbit.current;
      o.yaw -= (e.clientX - lastX) * YAW_PER_PX;
      o.tilt = clampTilt(o.tilt + (e.clientY - lastY) * TILT_PER_PX);
      lastX = e.clientX;
      lastY = e.clientY;
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
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', menu);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', menu);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const o = orbit.current;
    const fov = (camera.fov * Math.PI) / 180;
    const distance = presetDistance(zoom, camera.aspect, fov, o.tilt) * o.zoom;
    const halfSpan = distance * Math.tan(fov / 2) * camera.aspect;
    const depth = distance * groundDepthPerUnit(o.tilt, fov);

    // The point to centre in the frame: the pitch, or what the match is about.
    let tx = 0;
    let tz = 0;
    if (zoom === 'close') {
      const limit = Math.max(0, PITCH_LENGTH / 2 + 1 - halfSpan);
      tx = Math.max(-limit, Math.min(limit, link.focus.x));
      // The whole width is in the frame at the preset; nearer than that, the
      // camera slides across after the play too.
      const across = Math.max(0, 1 - depth / PITCH_WIDTH);
      tz = link.focus.z * across;
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
