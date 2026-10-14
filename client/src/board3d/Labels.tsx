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
 */

import { memo, useEffect, useRef, type ReactNode } from 'react';

import type { SceneLink } from './scene.js';

export interface Label {
  readonly key: string;
  /** The world point the label is centred on, or null while it should not show. */
  readonly anchor: () => { x: number; y: number; z: number } | null;
  readonly node: ReactNode;
}

export const Labels = memo(function Labels({ link, labels }: { link: SceneLink; labels: readonly Label[] }) {
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const current = useRef(labels);
  current.current = labels;

  useEffect(() => {
    const tick = () => {
      const project = link.project;
      for (const label of current.current) {
        const el = nodes.current.get(label.key);
        if (!el) continue;
        const at = project ? label.anchor() : null;
        const p = at ? project!(at.x, at.y, at.z) : null;
        if (!p || !p.inFront) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = 'visible';
        el.style.transform = `translate(-50%, -50%) translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      }
    };
    link.listeners.add(tick);
    return () => {
      link.listeners.delete(tick);
    };
  }, [link]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} data-labels>
      {labels.map((label) => (
        <div
          key={label.key}
          ref={(el) => {
            if (el) nodes.current.set(label.key, el);
            else nodes.current.delete(label.key);
          }}
          style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'nowrap' }}
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
