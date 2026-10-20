/**
 * Pure camera geometry for the 3D board (C18, refaite en 2H.39, `00` C39):
 * the four views a player may choose, how far a tilted camera must stand to
 * fit what each one claims, where the ground it frames is centred, and the
 * bounds of the zoom and the pan.
 *
 * No three.js and no React here, so it stays testable. Angles are radians,
 * distances are world units, one cell each.
 */

import { APRON_HALF, BACK_PLATE_X, PITCH_LENGTH, PITCH_WIDTH, TUBE_TOP } from './layoutGeometry.js';

/**
 * The four views (`00` C39): `side` from the touchline at 52 degrees, own
 * Furnace on the left, where the match opens; `top` from the touchline at 85
 * degrees; `own` and `far` from behind each Furnace at 40 degrees, fixed.
 */
export type CameraView = 'side' | 'top' | 'own' | 'far';

export const VIEWS: readonly CameraView[] = ['side', 'top', 'own', 'far'];

export const isCameraView = (v: unknown): v is CameraView => typeof v === 'string' && (VIEWS as readonly string[]).includes(v);

/** The view after `view` under the V key: round the four. */
export function nextView(view: CameraView): CameraView {
  return VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]!;
}

const deg = (d: number): number => (d * Math.PI) / 180;

/** The three-quarter tilt of the side view, as since 2H.15. */
export const SIDE_TILT = deg(52);
/** The top view: as near to straight down as keeps the pieces in relief. */
export const TOP_TILT = deg(85);
/** The two end views, the pitch in depth behind a Furnace. */
export const END_TILT = deg(40);

export interface ViewSpec {
  /** Around the vertical: 0 is the touchline view of J4, own Furnace on the left. */
  readonly yaw: number;
  readonly tilt: number;
  /** Whether the wheel, the arrow keys and the right-button drag work; the end views are fixed. */
  readonly zoomable: boolean;
}

/**
 * The orbit of a view. The end views look along the pitch from behind the
 * Furnace of `own` (`ownSign` is the sign of its world x: -1 for the Furnace
 * at the left of the side view) or of the other side.
 */
export function viewSpec(view: CameraView, ownSign: 1 | -1 = -1): ViewSpec {
  switch (view) {
    case 'side':
      return { yaw: 0, tilt: SIDE_TILT, zoomable: true };
    case 'top':
      return { yaw: 0, tilt: TOP_TILT, zoomable: true };
    case 'own':
      return { yaw: (ownSign * Math.PI) / 2, tilt: END_TILT, zoomable: false };
    case 'far':
      return { yaw: (-ownSign * Math.PI) / 2, tilt: END_TILT, zoomable: false };
  }
}

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
 * The whole silo (`00` C39, capture A1): the pitch's length across the frame
 * with a cell to spare at each end, and never less than its width down. The
 * side view opens here.
 */
export function wholeSiloDistance(aspect: number, fov: number, tilt: number): number {
  return Math.max(distanceForSpan(PITCH_LENGTH + 2, aspect, fov), distanceForDepth(PITCH_WIDTH + 1, tilt, fov));
}

/**
 * Where "Follow the play" starts (`00` C39, his capture): the pitch's width
 * with the two rails and the first rows of the stands in the frame, nineteen
 * cells down instead of the sixteen of the old "Close in".
 */
export const FOLLOW_DEPTH = PITCH_WIDTH + 4;

export function followDistance(tilt: number, fov: number): number {
  return distanceForDepth(FOLLOW_DEPTH, tilt, fov);
}

/** The wheel's reach: out to the silo with its four stands (capture B2) ... */
export const FARTHEST_OVER_SILO = 1.5;
/** ... and in to nine cells of depth, about a dozen across on the laptop (capture D3). */
export const NEAREST_DEPTH = 9;

export interface ZoomBounds {
  readonly near: number;
  readonly far: number;
}

/** The distances the wheel may set in a zoomable view, for this frame's shape. */
export function zoomBounds(aspect: number, fov: number, tilt: number): ZoomBounds {
  return {
    near: distanceForDepth(NEAREST_DEPTH, tilt, fov),
    far: FARTHEST_OVER_SILO * wholeSiloDistance(aspect, fov, tilt),
  };
}

export function clampDistance(distance: number, bounds: ZoomBounds): number {
  return Math.max(bounds.near, Math.min(bounds.far, distance));
}

/**
 * The end views stand where the whole length of the pitch fits the frame's
 * height, a cell to spare at each end (capture C3), looking at its centre.
 */
export function endViewDistance(fov: number): number {
  return distanceForDepth(PITCH_LENGTH + 2, END_TILT, fov);
}

/**
 * The plates shrink to the role's letter and the HP (`00` C37 point 7) when
 * the camera stands this far, as a share of the whole-silo distance: the
 * follow framing keeps the full names, the silo entire does not.
 */
export const SHORT_PLATES_OVER_SILO = 0.9;

export function platesShort(distance: number, aspect: number, fov: number, tilt: number): boolean {
  return distance >= SHORT_PLATES_OVER_SILO * wholeSiloDistance(aspect, fov, tilt);
}

/** How far past the pitch's edges the camera may be panned (C19); one cell since C22. */
export const PAN_MARGIN = 1;

/**
 * Keeps the camera inside the silo (C22). Below the tube's top the camera
 * stays between the walls and the end plates, so it never looks in from
 * outside or through a plate's back; above the open top it is free, which is
 * where the whole-silo and the end views stand. It never goes under the
 * stands' heads.
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
 * Where the hooked camera aims to keep `at` in the frame (C20, C39): the
 * point itself, pulled back so the frame never looks past the pitch's ends
 * nor beyond its touchlines plus a cell. Framed whole, the pitch stays
 * centred and the camera does not move.
 */
export function followTarget(
  at: { x: number; z: number },
  distance: number,
  aspect: number,
  fov: number,
  tilt: number,
): { x: number; z: number } {
  const halfSpan = distance * Math.tan(fov / 2) * aspect;
  const lx = Math.max(0, PITCH_LENGTH / 2 + PAN_MARGIN - halfSpan);
  const halfDepth = (distance * groundDepthPerUnit(tilt, fov)) / 2;
  const lz = Math.max(0, PITCH_WIDTH / 2 + PAN_MARGIN - halfDepth);
  return { x: Math.max(-lx, Math.min(lx, at.x)), z: Math.max(-lz, Math.min(lz, at.z)) };
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
 * pitch above it. Everything the rig works out (the distances, the pan, the
 * centring) uses the `usable` lens, the frame above the row, at the same
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
  const degOf = (t: number) => (2 * Math.atan(t) * 180) / Math.PI;
  return {
    usable: { fov: degOf((half * (h - m)) / h), aspect: width / (h - m) },
    virtual: { fov: degOf((half * (h + m)) / h), aspect: width / (h + m), fullHeight: h + m, offsetY: m },
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
