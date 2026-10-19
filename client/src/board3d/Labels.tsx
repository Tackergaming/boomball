/**
 * The writing over the scene: name plates, the PAYLOAD tag, the cost of a
 * route, the line of sight's verdict.
 *
 * Plain DOM, laid over the canvas, one absolutely positioned element per
 * label, moved once a frame by the scene's own projection (`link.project`).
 * Not drei's `Html`: that mounts a React root per label and unmounts it
 * synchronously, which React 19 reports as an error on every unmount, and the
 * harness fails on any console error. This layer has one root, the page's,
 * and never touches React once a frame: it writes `style.transform` by hand.
 *
 * A label is an anchor, a function returning the world point it hangs from
 * (null to hide it), and the node to show. Anchors read the registered
 * pieces, so a plate follows its Giff through a glide without a re-render.
 *
 * 2H.38 (`00` C37 points 3 and 7): the name plates (`spread`) are pushed apart
 * upward when Giffs stand close and pulled back inside the frame instead of
 * being cut (`plateSpread.ts`); and a label can hang `beside` its anchor, to
 * the right or to the left near the right edge, and take clicks: the action
 * labels next to a target. Sizes are read for every label before any is
 * moved, so a frame lays out once.
 */

import { memo, useEffect, useRef, type ReactNode } from 'react';

import { spreadPlates, type PlateBox } from './plateSpread.js';
import type { SceneLink } from './scene.js';

export interface Label {
  readonly key: string;
  /** The world point the label is centred on, or null while it should not show. */
  readonly anchor: () => { x: number; y: number; z: number } | null;
  readonly node: ReactNode;
  /** A name plate: kept apart from the others and inside the frame. */
  readonly spread?: boolean;
  /** Hung beside the anchor rather than centred on it, and clickable. */
  readonly beside?: boolean;
}

/** How far beside its anchor a `beside` label starts, in px before the interface scale. */
const BESIDE_PX = 34;

export const Labels = memo(function Labels({ link, labels }: { link: SceneLink; labels: readonly Label[] }) {
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const rootRef = useRef<HTMLDivElement>(null);
  const current = useRef(labels);
  current.current = labels;

  useEffect(() => {
    const plates: PlateBox[] = [];
    const tick = () => {
      const project = link.project;
      const root = rootRef.current;
      const width = root?.clientWidth ?? 0;
      const height = root?.clientHeight ?? 0;
      const u = root ? parseFloat(getComputedStyle(root).getPropertyValue('--u')) || 1 : 1;
      plates.length = 0;
      // Reads first: where each label goes and how big each plate is.
      const spots: ({ el: HTMLDivElement; x: number; y: number; label: Label } | null)[] = [];
      for (const label of current.current) {
        const el = nodes.current.get(label.key);
        if (!el) continue;
        const at = project ? label.anchor() : null;
        const p = at ? project!(at.x, at.y, at.z) : null;
        if (!p || !p.inFront) {
          spots.push(null);
          el.style.visibility = 'hidden';
          continue;
        }
        spots.push({ el, x: p.x, y: p.y, label });
        if (label.spread) {
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          plates.push({ key: label.key, x: p.x, y: p.y - h / 2, w, h });
        }
      }
      const placed = plates.length > 0 ? spreadPlates(plates, { width, height }) : null;
      // Then the writes.
      for (const spot of spots) {
        if (!spot) continue;
        const { el, label } = spot;
        el.style.visibility = 'visible';
        const at = placed?.get(label.key);
        if (at) {
          el.style.transform = `translate(-50%, 0) translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
        } else if (label.beside) {
          const left = spot.x > width * 0.68;
          const dx = (left ? -BESIDE_PX : BESIDE_PX) * u;
          el.style.transform = `translate(${left ? '-100%' : '0'}, -50%) translate(${(spot.x + dx).toFixed(1)}px, ${spot.y.toFixed(1)}px)`;
        } else {
          el.style.transform = `translate(-50%, -50%) translate(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px)`;
        }
      }
    };
    link.listeners.add(tick);
    return () => {
      link.listeners.delete(tick);
    };
  }, [link]);

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} data-labels>
      {labels.map((label) => (
        <div
          key={label.key}
          ref={(el) => {
            if (el) nodes.current.set(label.key, el);
            else nodes.current.delete(label.key);
          }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            visibility: 'hidden',
            whiteSpace: 'nowrap',
            pointerEvents: label.beside ? 'auto' : 'none',
            zIndex: label.beside ? 3 : undefined,
          }}
        >
          {label.node}
        </div>
      ))}
    </div>
  );
});

/** A small boxed word, cyan or amber. */
export function Tag({ text, bad }: { text: string; bad: boolean }) {
  const colour = bad ? '#ff8a3d' : '#3ce0f0';
  return (
    <span
      style={{
        font: `600 10px 'IBM Plex Mono', monospace`,
        color: colour,
        background: 'rgba(5,7,10,.92)',
        border: `1px solid ${colour}`,
        padding: '2px 6px',
      }}
    >
      {text}
    </span>
  );
}
