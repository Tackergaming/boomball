/**
 * Where a cell is on the screen while the 2.5D board is up.
 *
 * The SVG board answers `cellToScreen` from its stage element: a cell is one
 * forty-fifth of the stage's width. The 2.5D board has no such rule, the cell
 * is wherever the camera puts it this frame, so the camera rig registers a
 * projector here once it is mounted and the match screen's hook asks it. The
 * harness clicks where the answer says, exactly as it does in 2D.
 *
 * No React, no three.js import: the match screen and the test hook read this
 * without dragging the scene in.
 */

export type Projector = (x: number, y: number) => { x: number; y: number } | null;

let projector: Projector | null = null;

/** Set by the camera rig while it is mounted, cleared when it goes. */
export function setProjector(next: Projector | null): void {
  projector = next;
}

/** The centre of engine cell (x, y) in window pixels, or null without a 2.5D board. */
export function projectCell(x: number, y: number): { x: number; y: number } | null {
  return projector ? projector(x, y) : null;
}
