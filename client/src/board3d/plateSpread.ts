/**
 * Name plates kept apart (2H.38, `00` C37).
 *
 * Why. In the 3D view each Giff has a small name plate drawn in the DOM over
 * the canvas, placed above its token every frame. When tokens stand close the
 * plates pile onto each other and nothing can be read. The designer wants
 * them pushed apart vertically and kept inside the screen, pulled back to the
 * edge instead of being cut. This is the approved mockup's algorithm
 * (`design/2H38-ecran-de-match/index.html`): the plate lowest on screen stays
 * where it wants to be, and each plate above it that overlaps one already
 * placed is lifted to just above that one, until it is free.
 *
 * Pure, and cheap enough to run every animation frame for about 16 plates.
 */

/** A plate's wanted box, in px: `x` the horizontal centre, `y` the top edge. */
export interface PlateBox {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a plate ends up, same convention as `PlateBox`. */
export interface Placed {
  x: number;
  y: number;
}

/**
 * Spread `plates` so that none overlaps another (with `gap` px between them)
 * and all sit inside `viewport` (with `margin` px to the edge). Plates are
 * handled from the lowest wanted y up, ties broken by key, so the result does
 * not depend on the input order. A plate wider than the viewport is centred.
 *
 * The lift is capped at one pass per plate already placed, so it always ends;
 * a stack taller than the viewport is pulled back to the top edge and its
 * topmost plates may then overlap, as in the mockup.
 */
export function spreadPlates(
  plates: readonly PlateBox[],
  viewport: { width: number; height: number },
  gap: number = 2,
  margin: number = 4,
): Map<string, Placed> {
  const order = plates.slice().sort((a, b) => b.y - a.y || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  const out = new Map<string, Placed>();

  for (const p of order) {
    const half = p.w / 2;
    const minX = half + margin;
    const maxX = viewport.width - half - margin;
    const x = minX > maxX ? viewport.width / 2 : Math.min(maxX, Math.max(minX, p.x));
    const maxY = viewport.height - p.h - margin;
    let y = Math.max(margin, Math.min(maxY, p.y));

    for (let pass = 0; pass < placed.length; pass++) {
      let moved = false;
      for (const q of placed) {
        const overlapX = Math.abs(x - q.x) < (p.w + q.w) / 2 + gap;
        const overlapY = y < q.y + q.h + gap && y + p.h + gap > q.y;
        if (overlapX && overlapY) {
          y = q.y - p.h - gap;
          moved = true;
        }
      }
      if (!moved) break;
    }

    y = Math.max(margin, Math.min(maxY, y));
    placed.push({ x, y, w: p.w, h: p.h });
    out.set(p.key, { x, y });
  }
  return out;
}
