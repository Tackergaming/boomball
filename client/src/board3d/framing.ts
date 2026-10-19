/**
 * Pure camera geometry for the 3D board (C18): how far a tilted camera must
 * stand to fit the pitch, where the ground it frames is centred, and the
 * bounds of the orbit a player drives with the mouse.
 *
 * No three.js and no React here, so it stays testable. Angles are radians,
 * distances are world units, one cell each.
 */

import { APRON_HALF, BACK_PLATE_X, PITCH_LENGTH, PITCH_WIDTH, TUBE_TOP } from './layoutGeometry.js';

export type Zoom = 'wide' | 'close';

/** The three-quarter view both presets start from, below the horizon. */
export const PRESET_TILT = (52 * Math.PI) / 180;
/**
 * The orbit may not look at the floor from lower than this, nor from straight
 * above. Thirty degrees (C22) keeps the camera above the stands' heads.
 */
export const MIN_TILT = (30 * Math.PI) / 180;
export const MAX_TILT = (85 * Math.PI) / 180;
/** The wheel's reach, as a factor over the preset distance; 1.5 (C22) never leaves the silo behind. */
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 1.5;

export interface Orbit {
  /** Around the vertical, 0 being the fixed view of J4: own Furnace on the left. */
  yaw: number;
  tilt: number;
  /** Multiplies the preset distance; 1 is the preset itself. */
  zoom: number;
}

export const presetOrbit = (): Orbit => ({ yaw: 0, tilt: PRESET_TILT, zoom: 1 });

export const clampTilt = (tilt: number): number => Math.max(MIN_TILT, Math.min(MAX_TILT, tilt));
export const clampZoom = (zoom: number): number => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

const cot = (a: number): number => 1 / Math.tan(a);

/**
 * How much ground the frame's height covers along the view, per unit of
 * distance to the point looked at: from where the top edge of the frame meets
 * the floor to where the bottom edge does. With the horizon in the frame the
 * far edge never lands, so the top ray is pinned just below it.
 */
export function groundDepthPerUnit(tilt: number, fov: number): number {
  const half = fov / 2;
  const height = Math.sin(tilt);
  const far = Math.max(tilt - half, 0.02);
  return height * (cot(far) - cot(tilt + half));
}

/**
 * The frame covers more floor beyond the point looked at than before it. This
 * is how far, per unit of distance, the centre of the framed floor lies past
 * that point: aim this much short of a target to centre it.
 */
export function groundCentreOffsetPerUnit(tilt: number, fov: number): number {
  const half = fov / 2;
  const height = Math.sin(tilt);
  const far = Math.max(tilt - half, 0.02);
  const beyond = height * (cot(far) - cot(tilt));
  const before = height * (cot(tilt) - cot(tilt + half));
  return (beyond - before) / 2;
}

/** The distance at which `cells` of floor fit the frame's height. */
export function distanceForDepth(cells: number, tilt: number, fov: number): number {
  return cells / groundDepthPerUnit(tilt, fov);
}

/** The distance at which `cells` fit the frame's width at the point looked at. */
export function distanceForSpan(cells: number, aspect: number, fov: number): number {
  return cells / 2 / (Math.tan(fov / 2) * aspect);
}

/**
 * The preset distance of a zoom, before the wheel: close fits the pitch's
 * width in the frame's height with a cell to spare (C18); wide fits the whole
 * length across, and the width too when the frame is tall.
 */
export function presetDistance(zoom: Zoom, aspect: number, fov: number, tilt: number): number {
  const width = distanceForDepth(PITCH_WIDTH + 1, tilt, fov);
  if (zoom === 'close') return width;
  return Math.max(distanceForSpan(PITCH_LENGTH + 2, aspect, fov), width);
}

/** How far past the pitch's edges the camera may be panned (C19); one cell since C22. */
export const PAN_MARGIN = 1;

/**
 * Keeps the camera inside the silo (C22). Below the tube's top the camera
 * stays between the walls and the end plates, so it never looks in from
 * outside or through a plate's back; above the open top it is free, which is
 * where the whole-silo view stands. It never goes under the stands' heads.
 */
export function confine(p: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const y = Math.max(1.5, p.y);
  if (y >= TUBE_TOP - 1) return { x: p.x, y, z: p.z };
  const lx = BACK_PLATE_X - 1;
  const lz = APRON_HALF;
  return { x: Math.max(-lx, Math.min(lx, p.x)), y, z: Math.max(-lz, Math.min(lz, p.z)) };
}

/** Keeps a pan target on the pitch and its surroundings. */
export function clampPan(p: { x: number; z: number }): { x: number; z: number } {
  const lx = PITCH_LENGTH / 2 + PAN_MARGIN;
  const lz = PITCH_WIDTH / 2 + PAN_MARGIN;
  return { x: Math.max(-lx, Math.min(lx, p.x)), z: Math.max(-lz, Math.min(lz, p.z)) };
}

/**
 * The flat directions of a camera at `yaw`: `forward` is away from the camera
 * along the floor, `right` is the frame's right. A pan reads the keys and the
 * mouse in these, so "up" is always away whichever way the camera is turned.
 */
export function viewAxes(yaw: number): { forward: { x: number; z: number }; right: { x: number; z: number } } {
  return {
    forward: { x: -Math.sin(yaw), z: -Math.cos(yaw) },
    right: { x: Math.cos(yaw), z: -Math.sin(yaw) },
  };
}

/**
 * The lens of a frame whose bottom `inset` pixels are covered (2H.38, `00` C37
 * point 3): the action row lies over the board, and the camera frames the
 * pitch above it. Everything the rig works out (the preset distances, the pan,
 * the centring) uses the `usable` lens, the frame above the row, at the same
 * pixel scale the whole frame would have at `fov`. The camera itself is given
 * the `virtual` lens: a frame `inset` taller than the canvas whose centre is
 * the usable frame's centre, of which the canvas shows the bottom part
 * (`setViewOffset(width, fullHeight, 0, offsetY, width, height)`). Picking and
 * projection go through the camera's matrices, so they stay exact.
 */
export interface InsetLens {
  readonly usable: { readonly fov: number; readonly aspect: number };
  readonly virtual: { readonly fov: number; readonly aspect: number; readonly fullHeight: number; readonly offsetY: number };
}

export function insetLens(fovDeg: number, width: number, height: number, inset: number): InsetLens {
  const h = Math.max(1, height);
  const m = Math.max(0, Math.min(inset, h * 0.5));
  const half = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const deg = (t: number) => (2 * Math.atan(t) * 180) / Math.PI;
  return {
    usable: { fov: deg((half * (h - m)) / h), aspect: width / (h - m) },
    virtual: { fov: deg((half * (h + m)) / h), aspect: width / (h + m), fullHeight: h + m, offsetY: m },
  };
}

/** Where a camera orbiting `lookAt` sits. */
export function orbitPosition(
  lookAt: { x: number; z: number },
  orbit: { yaw: number; tilt: number },
  distance: number,
): { x: number; y: number; z: number } {
  const flat = distance * Math.cos(orbit.tilt);
  return {
    x: lookAt.x + flat * Math.sin(orbit.yaw),
    y: distance * Math.sin(orbit.tilt),
    z: lookAt.z + flat * Math.cos(orbit.yaw),
  };
}
