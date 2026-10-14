/**
 * The camera: three quarters, plunging, fixed in orientation (J4).
 *
 * A grid game where you click cells needs a frame that holds still, so there
 * is no rotation: the player's own Furnace is always on the left, the house's
 * on the right, exactly as on the SVG board. Two zooms and nothing else.
 *
 * - **wide**: the whole pitch in the frame, centred, whatever the window's
 *   shape. The distance is worked out every frame from the camera's aspect so
 *   the forty-five cells always fit across.
 * - **close**: about eighteen cells across, and the camera glides along the
 *   pitch after whatever the match is about (the unit whose beat is playing,
 *   the unit on the clock, else the ball), clamped so it never looks past an
 *   end of the silo.
 *
 * The rig also publishes two projections of the same camera: the window-pixel
 * one `cellToScreen` reads (see `projection.ts`), and the canvas-relative one
 * the label layer follows (`link.project`).
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import { cellCentre, PITCH_LENGTH } from './layoutGeometry.js';
import { setProjector } from './projection.js';
import type { SceneLink } from './scene.js';

export type Zoom = 'wide' | 'close';

/** Degrees below the horizon the camera looks. */
const PITCH_DEG = 52;
/** Cells visible across the frame at the close zoom. */
const CLOSE_SPAN = 18;
/** How much of the gap to the goal the camera closes per second. */
const DAMPING = 4;

export function Rig({ zoom, link }: { zoom: Zoom; link: SceneLink }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const goal = useRef(new Vector3());
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

  useFrame((_, delta) => {
    const tilt = (PITCH_DEG * Math.PI) / 180;
    const halfFov = (camera.fov * Math.PI) / 360;
    // Half of what the frame shows across, at the point looked at, per unit
    // of distance: the vertical half-angle times the aspect.
    const halfWidthPerUnit = Math.tan(halfFov) * camera.aspect;

    let span: number;
    let cx: number;
    let cz: number;
    if (zoom === 'wide') {
      span = PITCH_LENGTH + 2;
      cx = 0;
      cz = 0;
    } else {
      span = CLOSE_SPAN;
      const halfSpan = span / 2;
      const limit = PITCH_LENGTH / 2 + 1 - halfSpan;
      cx = Math.max(-limit, Math.min(limit, link.focus.x));
      cz = Math.max(-2, Math.min(2, link.focus.z * 0.4));
    }
    const distance = span / 2 / halfWidthPerUnit;
    lookAt.current.set(cx, 0, cz);
    goal.current.set(cx, distance * Math.sin(tilt), cz + distance * Math.cos(tilt));

    if (!settled.current) {
      camera.position.copy(goal.current);
      settled.current = true;
    } else {
      const k = 1 - Math.exp(-DAMPING * delta);
      camera.position.lerp(goal.current, k);
    }
    camera.lookAt(lookAt.current);
    camera.updateMatrixWorld();
  });

  return null;
}
