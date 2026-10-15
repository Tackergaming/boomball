/**
 * The words that rise over the pitch: a wound's number, "miss", "held"
 * (2H.21, `00` C23, the living game).
 *
 * Plain DOM over the canvas, like `Labels.tsx`, and for the same reason: not
 * drei's `Html`, which mounts a React root per element and unmounts it
 * synchronously, and React 19 reports that as an error on every unmount.
 * It is also imperative on purpose. A floater lives one second; creating it
 * through React state would re-render per word and per frame. Here the
 * elements are made by hand, moved once a frame by the scene's projection
 * (`link.project`) and dropped when their time is up.
 *
 * Two elements per word: the outer one carries the screen position (written
 * every frame), the inner one carries the `bb-rise` animation, so the two
 * transforms never fight.
 */

import { useEffect, useRef } from 'react';

import { fxBridge } from '../match/fxBridge.js';
import { cellCentre } from './layoutGeometry.js';
import type { SceneLink } from './scene.js';

/** How long a floater stays in the DOM, a little over the 1 s of `bb-rise`. */
const LIFETIME_MS = 1100;
/** World height of the anchor: just above a Giff's head (1.5 high plus its plate). */
const ANCHOR_HEIGHT = 2.4;

interface Floater {
  readonly el: HTMLDivElement;
  readonly world: { x: number; y: number; z: number };
  readonly born: number;
  /** How long it lives, `LIFETIME_MS` times the stretch it was born with. */
  readonly life: number;
}

export function Floaters({ link }: { link: SceneLink }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = layer.current;
    if (!host) return;
    let floaters: Floater[] = [];
    let counter = 0;

    link.float = (text, colour, at) => {
      const stretch = fxBridge.stretch;
      const outer = document.createElement('div');
      outer.setAttribute('data-floater', text);
      outer.style.cssText = 'position:absolute;left:0;top:0;will-change:transform;visibility:hidden;';
      const inner = document.createElement('span');
      inner.textContent = text;
      inner.style.cssText =
        "font:800 14px 'IBM Plex Mono', monospace;letter-spacing:.04em;" +
        'text-shadow:0 0 2px #05070a,0 0 6px #05070a,0 1px 0 #05070a;' +
        `animation:bb-rise ${stretch}s ease-out forwards;display:inline-block;white-space:nowrap;`;
      inner.style.color = colour;
      outer.appendChild(inner);
      host.appendChild(outer);
      // Words on the same cell must not stack exactly: spread them -10, 0, +10 px.
      const jitter = ((counter % 3) - 1) * 10;
      counter += 1;
      inner.style.marginLeft = `${jitter}px`;
      const c = cellCentre(at);
      floaters.push({ el: outer, world: { x: c.x, y: ANCHOR_HEIGHT, z: c.z }, born: performance.now(), life: LIFETIME_MS * stretch });
    };

    const tick = () => {
      const now = performance.now();
      const project = link.project;
      const alive: Floater[] = [];
      for (const f of floaters) {
        if (now - f.born > f.life) {
          f.el.remove();
          continue;
        }
        alive.push(f);
        const p = project ? project(f.world.x, f.world.y, f.world.z) : null;
        if (!p || !p.inFront) {
          f.el.style.visibility = 'hidden';
          continue;
        }
        f.el.style.visibility = 'visible';
        f.el.style.transform = `translate(-50%, -50%) translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      }
      floaters = alive;
    };
    link.listeners.add(tick);

    return () => {
      link.float = null;
      link.listeners.delete(tick);
      for (const f of floaters) f.el.remove();
      floaters = [];
    };
  }, [link]);

  return <div ref={layer} data-floaters style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />;
}
