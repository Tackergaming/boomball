/**
 * The camera's framing must fit what it claims (C18, C39): the side view
 * opens on the whole silo, "Follow the play" shows the width with its rails
 * and stands, the end views fit the length, the zoom stays between the
 * silo's stands and nine cells, the pan stays on the pitch, and a camera
 * placed on a view looks down at its target from the right side.
 */

import { describe, expect, it } from 'vitest';

import {
  END_TILT,
  FARTHEST_OVER_SILO,
  FOLLOW_DEPTH,
  NEAREST_DEPTH,
  PAN_MARGIN,
  SIDE_TILT,
  TOP_TILT,
  VIEWS,
  clampDistance,
  clampPan,
  confine,
  distanceForDepth,
  distanceForSpan,
  endViewDistance,
  followDistance,
  followTarget,
  groundCentreOffsetPerUnit,
  groundDepthPerUnit,
  insetLens,
  isCameraView,
  nextView,
  orbitPosition,
  platesShort,
  viewAxes,
  viewSpec,
  wholeSiloDistance,
  zoomBounds,
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
    const height = Math.sin(SIDE_TILT);
    const expected = floorHit(height, SIDE_TILT - half) - floorHit(height, SIDE_TILT + half);
    expect(groundDepthPerUnit(SIDE_TILT, FOV)).toBeCloseTo(expected, 9);
  });

  it('frames more floor beyond the point looked at than before it, from three quarters', () => {
    expect(groundCentreOffsetPerUnit(SIDE_TILT, FOV)).toBeGreaterThan(0);
    // Straight down, the frame is symmetric around the point looked at.
    expect(groundCentreOffsetPerUnit(Math.PI / 2 - 0.001, FOV)).toBeCloseTo(0, 3);
  });

  it('keeps a finite depth even with the horizon in the frame', () => {
    expect(Number.isFinite(groundDepthPerUnit(END_TILT, (60 * Math.PI) / 180))).toBe(true);
  });

  it('fits exactly the cells asked for', () => {
    const d = distanceForDepth(16, SIDE_TILT, FOV);
    expect(d * groundDepthPerUnit(SIDE_TILT, FOV)).toBeCloseTo(16, 9);
    const s = distanceForSpan(47, 16 / 9, FOV);
    expect(2 * s * Math.tan(FOV / 2) * (16 / 9)).toBeCloseTo(47, 9);
  });
});

describe('the four views (C39)', () => {
  it('are side, top, own end and far end, and V goes round them', () => {
    expect(VIEWS).toEqual(['side', 'top', 'own', 'far']);
    expect(nextView('side')).toBe('top');
    expect(nextView('far')).toBe('side');
    expect(isCameraView('top')).toBe(true);
    expect(isCameraView('close')).toBe(false);
    expect(isCameraView(null)).toBe(false);
  });

  it('fix the angle: 52 and 85 from the touchline, 40 from behind the Furnaces', () => {
    expect(viewSpec('side')).toEqual({ yaw: 0, tilt: SIDE_TILT, zoomable: true });
    expect(viewSpec('top')).toEqual({ yaw: 0, tilt: TOP_TILT, zoomable: true });
    expect(SIDE_TILT).toBeCloseTo((52 * Math.PI) / 180, 9);
    expect(TOP_TILT).toBeCloseTo((85 * Math.PI) / 180, 9);
    expect(END_TILT).toBeCloseTo((40 * Math.PI) / 180, 9);
  });

  it('look from behind own Furnace, whichever end it is, and the far view from the other', () => {
    // Own Furnace at the left of the side view (world -x): the camera stands at -x.
    const own = viewSpec('own', -1);
    expect(own.zoomable).toBe(false);
    expect(Math.sin(own.yaw)).toBeCloseTo(-1, 9);
    expect(Math.sin(viewSpec('far', -1).yaw)).toBeCloseTo(1, 9);
    // The other side's own end is the other Furnace.
    expect(Math.sin(viewSpec('own', 1).yaw)).toBeCloseTo(1, 9);
    expect(Math.sin(viewSpec('far', 1).yaw)).toBeCloseTo(-1, 9);
  });
});

describe('the distances (C39)', () => {
  it('open on the whole silo: the length across, and never less than the width down', () => {
    const landscape = wholeSiloDistance(16 / 9, FOV, SIDE_TILT);
    expect(2 * landscape * Math.tan(FOV / 2) * (16 / 9)).toBeCloseTo(PITCH_LENGTH + 2, 9);
    for (const aspect of [0.5, 1, 2.5]) {
      expect(wholeSiloDistance(aspect, FOV, SIDE_TILT)).toBeGreaterThanOrEqual(distanceForDepth(PITCH_WIDTH + 1, SIDE_TILT, FOV));
    }
  });

  it('follow the play with the width, the rails and the first rows of the stands: nineteen cells down', () => {
    expect(FOLLOW_DEPTH).toBe(PITCH_WIDTH + 4);
    for (const tilt of [SIDE_TILT, TOP_TILT]) {
      expect(followDistance(tilt, FOV) * groundDepthPerUnit(tilt, FOV)).toBeCloseTo(FOLLOW_DEPTH, 9);
    }
    // Nearer than the whole silo on a landscape frame, so the plates keep their names there.
    expect(followDistance(SIDE_TILT, FOV)).toBeLessThan(wholeSiloDistance(2.5, FOV, SIDE_TILT));
    expect(platesShort(followDistance(SIDE_TILT, FOV), 2.5, FOV, SIDE_TILT)).toBe(false);
    expect(platesShort(wholeSiloDistance(2.5, FOV, SIDE_TILT), 2.5, FOV, SIDE_TILT)).toBe(true);
  });

  it('bound the wheel between the silo with its stands and nine cells of depth', () => {
    expect(FARTHEST_OVER_SILO).toBe(1.5);
    expect(NEAREST_DEPTH).toBe(9);
    const b = zoomBounds(2.5, FOV, SIDE_TILT);
    expect(b.far).toBeCloseTo(1.5 * wholeSiloDistance(2.5, FOV, SIDE_TILT), 9);
    expect(b.near * groundDepthPerUnit(SIDE_TILT, FOV)).toBeCloseTo(9, 9);
    expect(clampDistance(0, b)).toBe(b.near);
    expect(clampDistance(999, b)).toBe(b.far);
    expect(clampDistance((b.near + b.far) / 2, b)).toBeCloseTo((b.near + b.far) / 2, 9);
  });

  it('stand the end views where the whole length fits the frame’s height', () => {
    expect(endViewDistance(FOV) * groundDepthPerUnit(END_TILT, FOV)).toBeCloseTo(PITCH_LENGTH + 2, 9);
    // High enough to be above the open tube, so the end plate never stops it.
    expect(endViewDistance(FOV) * Math.sin(END_TILT)).toBeGreaterThan(TUBE_TOP - 1);
  });
});

describe('the hooked camera (C20, C39)', () => {
  it('does not move while the pitch is framed whole', () => {
    const d = wholeSiloDistance(2.5, FOV, SIDE_TILT);
    const t = followTarget({ x: 15, z: -6 }, d, 2.5, FOV, SIDE_TILT);
    expect(t.x).toBeCloseTo(0, 9);
    expect(t.z).toBeCloseTo(0, 9);
  });

  it('keeps the thing followed in the frame without looking past the pitch', () => {
    const d = followDistance(SIDE_TILT, FOV);
    const t = followTarget({ x: 3, z: 1 }, d, 2.5, FOV, SIDE_TILT);
    expect(t).toEqual({ x: 3, z: 0 });
    const end = followTarget({ x: 40, z: 0 }, d, 2.5, FOV, SIDE_TILT);
    const halfSpan = d * Math.tan(FOV / 2) * 2.5;
    expect(end.x).toBeCloseTo(PITCH_LENGTH / 2 + PAN_MARGIN - halfSpan, 9);
    expect(end.x).toBeLessThan(40);
  });

  it('slides across too once nearer than the width', () => {
    const b = zoomBounds(2.5, FOV, SIDE_TILT);
    const t = followTarget({ x: 0, z: 7 }, b.near, 2.5, FOV, SIDE_TILT);
    expect(t.z).toBeGreaterThan(0);
    expect(t.z).toBeLessThanOrEqual(PITCH_WIDTH / 2 + PAN_MARGIN);
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

  it('leaves a camera above the open top where it is, which is where the whole silo stands', () => {
    const p = confine({ x: 0, y: TUBE_TOP + 10, z: 26 });
    expect(p).toEqual({ x: 0, y: TUBE_TOP + 10, z: 26 });
  });

  it('never goes under the stands’ heads', () => {
    expect(confine({ x: 0, y: -3, z: 0 }).y).toBe(1.5);
  });

  it('pans one cell past the pitch at most', () => {
    expect(PAN_MARGIN).toBe(1);
  });
});

describe('the orbit', () => {
  it('places the camera at the distance asked, above the floor, on the near side at yaw 0', () => {
    const p = orbitPosition({ x: 3, z: -1 }, { yaw: 0, tilt: SIDE_TILT }, 20);
    expect(Math.hypot(p.x - 3, p.y, p.z + 1)).toBeCloseTo(20, 9);
    expect(p.y).toBeGreaterThan(0);
    expect(p.z).toBeGreaterThan(-1);
    expect(p.x).toBeCloseTo(3, 9);
  });

  it('goes round the target with the yaw, at the same height', () => {
    const a = orbitPosition({ x: 0, z: 0 }, { yaw: 0, tilt: SIDE_TILT }, 20);
    const b = orbitPosition({ x: 0, z: 0 }, { yaw: Math.PI / 2, tilt: SIDE_TILT }, 20);
    const c = orbitPosition({ x: 0, z: 0 }, { yaw: Math.PI, tilt: SIDE_TILT }, 20);
    expect(b.y).toBeCloseTo(a.y, 9);
    expect(b.x).toBeCloseTo(a.z, 9);
    expect(b.z).toBeCloseTo(0, 9);
    expect(c.z).toBeCloseTo(-a.z, 9);
  });
});

describe('the lens above the action row (2H.38)', () => {
  it('keeps the pixel scale and centres the usable frame', () => {
    const lens = insetLens(36, 1536, 611, 62);
    const t = (deg: number) => Math.tan((deg * Math.PI) / 360);
    // Same pixels per unit of tangent as the bare 36 degree frame.
    expect(t(lens.usable.fov) / (611 - 62)).toBeCloseTo(t(36) / 611, 9);
    expect(t(lens.virtual.fov) / (611 + 62)).toBeCloseTo(t(36) / 611, 9);
    expect(lens.usable.aspect).toBeCloseTo(1536 / 549, 9);
    expect(lens.virtual.fullHeight).toBe(673);
    expect(lens.virtual.offsetY).toBe(62);
  });

  it('is the bare lens without an inset', () => {
    const lens = insetLens(36, 1536, 611, 0);
    expect(lens.usable.fov).toBeCloseTo(36, 9);
    expect(lens.virtual.fov).toBeCloseTo(36, 9);
    expect(lens.virtual.offsetY).toBe(0);
  });
});
