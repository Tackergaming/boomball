/**
 * The camera's framing must fit what it claims (C18): the close preset shows
 * the pitch's width, the wide preset the whole silo, the orbit stays bounded
 * and a camera placed on it looks down at its target from the right side.
 */

import { describe, expect, it } from 'vitest';

import {
  MAX_TILT,
  MAX_ZOOM,
  MIN_TILT,
  MIN_ZOOM,
  PAN_MARGIN,
  PRESET_TILT,
  clampPan,
  clampTilt,
  clampZoom,
  confine,
  distanceForDepth,
  distanceForSpan,
  groundCentreOffsetPerUnit,
  groundDepthPerUnit,
  orbitPosition,
  presetDistance,
  presetOrbit,
  viewAxes,
} from './framing.js';
import { APRON_HALF, BACK_PLATE_X, PITCH_LENGTH, PITCH_WIDTH, TUBE_TOP } from './layoutGeometry.js';

const FOV = (36 * Math.PI) / 180;

/** Where a ray from a camera at `position`, through the frame's vertical edge at `angle` below the horizon, meets the floor along the view. */
function floorHit(height: number, angle: number): number {
  return height / Math.tan(angle);
}

describe('ground framing', () => {
  it('covers, per unit of distance, the floor between the frame’s top and bottom edges', () => {
    const half = FOV / 2;
    const height = Math.sin(PRESET_TILT);
    const expected = floorHit(height, PRESET_TILT - half) - floorHit(height, PRESET_TILT + half);
    expect(groundDepthPerUnit(PRESET_TILT, FOV)).toBeCloseTo(expected, 9);
  });

  it('frames more floor beyond the point looked at than before it, from three quarters', () => {
    expect(groundCentreOffsetPerUnit(PRESET_TILT, FOV)).toBeGreaterThan(0);
    // Straight down, the frame is symmetric around the point looked at.
    expect(groundCentreOffsetPerUnit(Math.PI / 2 - 0.001, FOV)).toBeCloseTo(0, 3);
  });

  it('keeps a finite depth even with the horizon in the frame', () => {
    expect(Number.isFinite(groundDepthPerUnit(MIN_TILT, (60 * Math.PI) / 180))).toBe(true);
  });

  it('fits exactly the cells asked for', () => {
    const d = distanceForDepth(16, PRESET_TILT, FOV);
    expect(d * groundDepthPerUnit(PRESET_TILT, FOV)).toBeCloseTo(16, 9);
    const s = distanceForSpan(47, 16 / 9, FOV);
    expect(2 * s * Math.tan(FOV / 2) * (16 / 9)).toBeCloseTo(47, 9);
  });
});

describe('presets', () => {
  it('close shows the pitch’s width with a cell to spare, whatever the aspect', () => {
    for (const aspect of [1, 16 / 9, 2.4]) {
      const d = presetDistance('close', aspect, FOV, PRESET_TILT);
      expect(d * groundDepthPerUnit(PRESET_TILT, FOV)).toBeCloseTo(PITCH_WIDTH + 1, 9);
    }
  });

  it('close stands further back than the eighteen cells of 2H.15 on a landscape frame', () => {
    const d = presetDistance('close', 16 / 9, FOV, PRESET_TILT);
    expect(d).toBeGreaterThan(distanceForSpan(18, 16 / 9, FOV));
  });

  it('wide shows the whole length across, and never less than the width', () => {
    const landscape = presetDistance('wide', 16 / 9, FOV, PRESET_TILT);
    expect(2 * landscape * Math.tan(FOV / 2) * (16 / 9)).toBeCloseTo(PITCH_LENGTH + 2, 9);
    const tall = presetDistance('wide', 0.5, FOV, PRESET_TILT);
    expect(tall).toBeGreaterThanOrEqual(presetDistance('close', 0.5, FOV, PRESET_TILT));
    expect(landscape).toBeGreaterThan(presetDistance('close', 16 / 9, FOV, PRESET_TILT));
  });
});

describe('the pan (C19)', () => {
  it('stays on the pitch and its surroundings', () => {
    expect(clampPan({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
    const far = clampPan({ x: 999, z: -999 });
    expect(far.x).toBe(PITCH_LENGTH / 2 + PAN_MARGIN);
    expect(far.z).toBe(-(PITCH_WIDTH / 2 + PAN_MARGIN));
  });

  it('reads up as away from the camera and right as the frame’s right, whichever way it is turned', () => {
    const a = viewAxes(0);
    // At yaw 0 the camera sits at +Z looking toward -Z, with +X on its right.
    expect(a.forward.x).toBeCloseTo(0, 9);
    expect(a.forward.z).toBeCloseTo(-1, 9);
    expect(a.right.x).toBeCloseTo(1, 9);
    expect(a.right.z).toBeCloseTo(0, 9);
    const b = viewAxes(Math.PI / 2);
    expect(b.forward.x).toBeCloseTo(-1, 9);
    expect(b.right.z).toBeCloseTo(-1, 9);
    // Forward and right stay perpendicular, both flat.
    for (const yaw of [0.3, 1.9, 4.2]) {
      const v = viewAxes(yaw);
      expect(v.forward.x * v.right.x + v.forward.z * v.right.z).toBeCloseTo(0, 9);
    }
  });
});

describe('the silo around the camera (C22)', () => {
  it('keeps a low camera between the walls and the end plates', () => {
    const p = confine({ x: 40, y: 8, z: -30 });
    expect(p.x).toBe(BACK_PLATE_X - 1);
    expect(p.z).toBe(-APRON_HALF);
    expect(p.y).toBe(8);
  });

  it('leaves a camera above the open top where it is, which is where the wide view stands', () => {
    const p = confine({ x: 0, y: TUBE_TOP + 10, z: 26 });
    expect(p).toEqual({ x: 0, y: TUBE_TOP + 10, z: 26 });
  });

  it('never goes under the stands’ heads', () => {
    expect(confine({ x: 0, y: -3, z: 0 }).y).toBe(1.5);
  });

  it('bounds the orbit tighter than before: thirty degrees up, one and a half times out', () => {
    expect(MIN_TILT).toBeCloseTo((30 * Math.PI) / 180, 9);
    expect(MAX_ZOOM).toBe(1.5);
    expect(PAN_MARGIN).toBe(1);
  });
});

describe('the orbit', () => {
  it('starts from the fixed three-quarter view of J4', () => {
    expect(presetOrbit()).toEqual({ yaw: 0, tilt: PRESET_TILT, zoom: 1 });
  });

  it('is bounded in tilt and zoom', () => {
    expect(clampTilt(0)).toBe(MIN_TILT);
    expect(clampTilt(Math.PI)).toBe(MAX_TILT);
    expect(clampTilt(PRESET_TILT)).toBe(PRESET_TILT);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(1)).toBe(1);
  });

  it('places the camera at the distance asked, above the floor, on the near side at yaw 0', () => {
    const p = orbitPosition({ x: 3, z: -1 }, { yaw: 0, tilt: PRESET_TILT }, 20);
    expect(Math.hypot(p.x - 3, p.y, p.z + 1)).toBeCloseTo(20, 9);
    expect(p.y).toBeGreaterThan(0);
    expect(p.z).toBeGreaterThan(-1);
    expect(p.x).toBeCloseTo(3, 9);
  });

  it('goes round the target with the yaw, at the same height', () => {
    const a = orbitPosition({ x: 0, z: 0 }, { yaw: 0, tilt: PRESET_TILT }, 20);
    const b = orbitPosition({ x: 0, z: 0 }, { yaw: Math.PI / 2, tilt: PRESET_TILT }, 20);
    const c = orbitPosition({ x: 0, z: 0 }, { yaw: Math.PI, tilt: PRESET_TILT }, 20);
    expect(b.y).toBeCloseTo(a.y, 9);
    expect(b.x).toBeCloseTo(a.z, 9);
    expect(b.z).toBeCloseTo(0, 9);
    expect(c.z).toBeCloseTo(-a.z, 9);
  });
});
