/**
 * The three ways the match screen reaches the 3D camera (2H.38, `00` C37):
 * a click on a chip of the turn order or on the minimap puts a cell in the
 * middle of the frame and lets go of the play; the C key follows the play
 * again. The 3D board fills these in while it is mounted; the flat board has
 * no camera and leaves them null. The camera itself is 2H.39's.
 */

import type { Point } from '../../../engine/geometry.js';

export interface CameraControl {
  centre: ((cell: Point) => void) | null;
  follow: (() => void) | null;
}

export function newCameraControl(): CameraControl {
  return { centre: null, follow: null };
}
