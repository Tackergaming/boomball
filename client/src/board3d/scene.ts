/**
 * What the frame loop and the scene's components share without React state.
 *
 * Moving a mesh through React state once a frame would re-render the whole
 * scene sixty times a second. Instead every piece that can travel registers
 * its `Object3D` here under the same key `pose.ts` uses (`u:<id>`, `c:<id>`,
 * `s`, and `b` for the ball), and one `useFrame` in `Board3D.tsx` sets the
 * positions by hand. The camera reads `focus` from the same object, and the
 * label layer (`Labels.tsx`), which lives in the DOM outside the canvas,
 * reads `project` to follow the pieces on the screen.
 */

import type { Object3D } from 'three';

export interface Projected {
  /** Pixels from the canvas's top-left corner. */
  readonly x: number;
  readonly y: number;
  /** False when the point is behind the camera. */
  readonly inFront: boolean;
}

export interface SceneLink {
  /** The group of every piece that can travel, by pose key. */
  readonly pieces: Map<string, Object3D>;
  /** What the camera should look at, in world units, written by the frame loop. */
  focus: { x: number; z: number };
  /** Which piece `focus` is, by pose key, so the camera can tell a new thing to follow from the same thing moving. */
  focusKey: string | null;
  /** The camera's step, run by the frame loop after the pieces are placed and before the listeners. */
  camera: ((delta: number) => void) | null;
  /** Frames per second over the last half second, written by the camera's step. */
  fps: number;
  /** The last world position of each piece, to read a direction of travel from. */
  readonly lastAt: Map<string, { x: number; z: number }>;
  /** A world point through the camera, set by the rig while it is mounted. */
  project: ((x: number, y: number, z: number) => Projected) | null;
  /** Called once a frame, after the pieces have been placed. */
  readonly listeners: Set<() => void>;
}

export function newSceneLink(): SceneLink {
  return {
    pieces: new Map(),
    focus: { x: 0, z: 0 },
    focusKey: null,
    camera: null,
    fps: 0,
    lastAt: new Map(),
    project: null,
    listeners: new Set(),
  };
}

/** The colour of a shirt: amber for the Giff this player drives, cyan for the side, magenta for the house. */
export function shirt(team: 'A' | 'B', own: 'A' | 'B', isYou: boolean): string {
  return isYou ? '#ffc14d' : team === own ? '#3ce0f0' : '#ff56dc';
}

export const BRASS = '#c9b489';
export const CYAN = '#3ce0f0';
export const AMBER = '#ff8a3d';
