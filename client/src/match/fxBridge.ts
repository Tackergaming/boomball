/**
 * The development trigger for effects (2H.21).
 *
 * The screen harness captures each effect on purpose rather than waiting for
 * the dice to produce one: `window.__boomball.fx(...)` (see `testHook.ts`)
 * hands a cue to whichever board is mounted, which fires it as if the beat
 * had. Each board sets `fire` while it is mounted, in development only; a
 * production build never calls it. Nothing here touches the match.
 */

import type { Cue } from './motion.js';

export const fxBridge: {
  fire: ((cue: Cue) => void) | null;
  /**
   * Says a banner over the board on request (2H.22), so the harness can
   * capture the goal banner without a goal. Set by the match screen while
   * mounted, in development only.
   */
  announce: ((kind: 'loud' | 'goal' | 'round' | 'turn', text: string, tone: 'own' | 'foe' | 'neutral') => void) | null;
  /**
   * Reads a piece of the 3D scene (2H.22): its rotation and height, and
   * whether a puppet gesture is on it. Set by the 3D board while mounted, in
   * development only, so the harness can tell a Giff turned when a capture
   * under software GL cannot.
   */
  probe: ((unitId: string) => { yaw: number; pitch: number; roll: number; y: number; gesture: string | null; clip: string | null } | null) | null;
  /**
   * How many times slower the next effects run. 1 in play. The harness asks
   * for more, because headless Chromium's software GL draws three frames a
   * second and a screenshot takes longer than a bat's sparks last; the hook
   * sets it for one request and puts it back.
   */
  stretch: number;
} = { fire: null, announce: null, probe: null, stretch: 1 };
