/**
 * What the frame loop and the scene's components share without React state.
 *
 * Moving a mesh through React state once a frame would re-render the whole
 * scene sixty times a second. Instead every piece that can travel registers
 * its `Object3D` here under the same key `pose.ts` uses (`u:<id>`, `c:<id>`,
 * `s`, and `b` for the ball; `b:loose` is the loose ball's ring and
 * `b:carrier` the carrier's marker), and one `useFrame` in `Board3D.tsx` sets the
 * positions by hand. The camera reads `focus` from the same object, and the
 * label layer (`Labels.tsx`), which lives in the DOM outside the canvas,
 * reads `project` to follow the pieces on the screen.
 */

import type { MeshBasicMaterial, Object3D } from 'three';

import type { Point } from '../../../engine/geometry.js';
import type { Cue } from '../match/motion.js';
import type { GiffBody } from './giffRig.js';

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
  /**
   * Fires one visual effect for a cue (2H.21): sparks, a ring, a blast, the
   * embers, the Spark's beam or flash. Set by `Effects.tsx` while mounted;
   * the frame loop calls it when the cue's instant comes.
   */
  fx: ((cue: Cue) => void) | null;
  /**
   * Raises a word over a cell, in `colour`, for `lifeMs` (2H.21, 2H.22): a
   * wound's number, "miss", "held", the word of an action. Set by
   * `Floaters.tsx` while mounted. `lifeMs` is `FLOAT_MS` at the replay speed,
   * already multiplied by the development stretch.
   */
  float: ((text: string, colour: string, at: Point, lifeMs: number) => void) | null;
  /**
   * The puppet (2H.22, `00` C24 line 7): a gesture of a whole Giff by pose
   * key, with when it began. `swing` twists the body at `toward`, `lunge`
   * pushes it forward at `toward`, `flinch` rocks it back, `throw` nods it
   * forward. Written by `fire`, read and placed by the frame loop, which
   * forgets each once it is over.
   */
  readonly gestures: Map<string, { kind: 'swing' | 'lunge' | 'flinch' | 'throw'; since: number; stretch: number; toward: { x: number; z: number } | null }>;
  /**
   * The rigged bodies (2H.23), by pose key, registered by `Tokens.tsx` once
   * the model has loaded. A Giff here plays its clips and the puppet leaves
   * its body alone; one missing (the capsule) still gets the puppet.
   */
  readonly bodies: Map<string, GiffBody>;
  /**
   * Pieces part of the way into or out of the pitch, by pose key, with when
   * they began (2H.21): an evacuated Giff sinks (`exit`), a substitute rises
   * (`enter`), the Spark comes down (`drop`). Written and read by the frame
   * loop, which places them.
   */
  readonly transitions: Map<string, { kind: 'exit' | 'enter' | 'drop'; since: number; stretch: number }>;
  /**
   * The ball carrier's marker (2H.29, `00` C30): the materials of its golden
   * beam and floor ring, set by `CarrierMarker` in `Tokens.tsx` while
   * mounted. Its group is the piece `b:carrier`; the frame loop places it,
   * shows it only while the ball is in a hand, and breathes both through
   * these, so the marker has no clock of its own.
   */
  carrierGlow: { readonly beam: MeshBasicMaterial; readonly ring: MeshBasicMaterial } | null;
  /**
   * The pixels at the bottom of the canvas the action row covers (2H.38,
   * `00` C37 point 3): the camera frames the pitch above them. Written by
   * the board from the match screen, read by the rig once a frame.
   */
  bottomInset: number;
  /**
   * Puts a cell in the middle of the frame and lets go of the play (2H.38):
   * a click on a chip of the turn order, or on the minimap. Set by the rig.
   */
  centreOn: ((cell: Point) => void) | null;
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
    fx: null,
    float: null,
    transitions: new Map(),
    gestures: new Map(),
    bodies: new Map(),
    carrierGlow: null,
    bottomInset: 0,
    centreOn: null,
  };
}

/** The colour of a shirt: amber for the Giff this player drives, cyan for the side, magenta for the house. */
export function shirt(team: 'A' | 'B', own: 'A' | 'B', isYou: boolean): string {
  return isYou ? '#ffc14d' : team === own ? '#3ce0f0' : '#ff56dc';
}

export const BRASS = '#c9b489';
export const CYAN = '#3ce0f0';
export const MAGENTA = '#ff56dc';
export const AMBER = '#ff8a3d';
/** The colour of a word that reports nothing happened: a miss, a Shove held. */
export const FAINT = '#9aa7ad';
