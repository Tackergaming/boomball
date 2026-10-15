/**
 * Pure camera geometry for the 3D board (C18): how far a tilted camera must
 * stand to fit the pitch, where the ground it frames is centred, and the
 * bounds of the orbit a player drives with the mouse.
 *
 * No three.js and no React here, so it stays testable. Angles are radians,
 * distances are world units, one cell each.
 */

import { PITCH_LENGTH, PITCH_WIDTH } from './layoutGeometry.js';

export type Zoom = 'wide' | 'close';

/** The three-quarter view both presets start from, below the horizon. */
export const PRESET_TILT = (52 * Math.PI) / 180;
/** The orbit may not look at the floor from lower than this, nor from straight above. */
export const MIN_TILT = (20 * Math.PI) / 180;
export const MAX_TILT = (85 * Math.PI) / 180;
/** The wheel's reach, as a factor over the preset distance. */
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2.5;

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
