/**
 * The rigged Giff's body (2H.23): one animation mixer per token, driven by
 * the frame loop of `Board3D.tsx`.
 *
 * The model (`public/models/giff-rigged.glb`) is built from Jérôme's Giff by
 * `scripts/blender/rig_giff.py`: legs, hips, spine, chest, head, and one
 * `arms` bone that carries both forearms and the bat as a block. Its seven
 * clips play in place, the board moves the token:
 *
 * - `Idle` and `Run` loop underneath. The run's speed follows the token's
 *   ground speed, `RUN_CELLS` cells a stride pair.
 * - `Dash` replaces the run when the walk is a Dash: the take-off, the hover
 *   held for as long as the token travels, then the landing.
 * - `Swing`, `Shove`, `Throw` and `Hit` are the gestures, played once over
 *   the time the frame loop gives them, on top of everything else.
 *
 * The weights are blended by hand, every action always playing: a fade of
 * `FADE_S` towards one target at a time, so they always add up to one.
 */

import { type AnimationAction, type AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, type Object3D } from 'three';

export type Gesture = 'swing' | 'lunge' | 'flinch' | 'throw';

const CLIP_OF: Readonly<Record<Gesture, string>> = { swing: 'Swing', lunge: 'Shove', flinch: 'Hit', throw: 'Throw' };
/** How many cells one Run cycle (two steps) covers at its own speed. */
const RUN_CELLS = 1.4;
const FADE_S = 0.1;
/** The Dash clip: the hover is held at `DASH_HOLD_S`, the landing starts at `DASH_LAND_S`. */
const DASH_HOLD_S = 0.45;
const DASH_LAND_S = 0.6;
const DASH_WAIT_S = 1.5;

export interface GiffBody {
  /** Once a frame: whether the token travels, how fast in cells a second, and the time since the last frame. */
  drive(walking: boolean, cellsPerSecond: number, delta: number): void;
  /** A gesture, over `ms`. */
  play(gesture: Gesture, ms: number): void;
  /** The next walk is a Dash. */
  dash(): void;
  /** The clip that weighs the most now, for the development probe. */
  readonly clip: string;
  dispose(): void;
}

export function giffBody(root: Object3D, clips: readonly AnimationClip[]): GiffBody | null {
  const named = new Map(clips.map((c) => [c.name, c]));
  for (const name of ['Idle', 'Run', 'Dash', ...Object.values(CLIP_OF)]) if (!named.has(name)) return null;

  const mixer = new AnimationMixer(root);
  const actions = new Map<string, AnimationAction>();
  for (const [name, clip] of named) {
    const action = mixer.clipAction(clip);
    const loops = name === 'Idle' || name === 'Run';
    action.setLoop(loops ? LoopRepeat : LoopOnce, loops ? Infinity : 1);
    action.clampWhenFinished = true;
    action.setEffectiveWeight(name === 'Idle' ? 1 : 0);
    action.play();
    actions.set(name, action);
  }
  const weights = new Map([...actions.keys()].map((k) => [k, k === 'Idle' ? 1 : 0]));
  const act = (name: string) => actions.get(name)!;

  // Desynchronise the idles so fourteen Giff do not breathe together.
  act('Idle').time = Math.random() * act('Idle').getClip().duration;

  let gesture: { name: string; until: number } | null = null;
  /** When the Dash was announced; a walk that does not start within `DASH_WAIT_S` is not that Dash. */
  let dashPending: number | null = null;
  let dashing = false;
  let clock = 0;
  let top = 'Idle';

  return {
    drive(walking, cellsPerSecond, delta) {
      clock += delta;
      // The base: idle, run, or the Dash in three parts.
      let base = walking ? 'Run' : 'Idle';
      const dashAction = act('Dash');
      if (dashPending !== null && clock - dashPending > DASH_WAIT_S) dashPending = null;
      if (walking && dashPending !== null && !dashing) {
        dashing = true;
        dashPending = null;
        dashAction.reset().play();
        dashAction.timeScale = 1;
      }
      if (dashing) {
        if (walking && dashAction.time >= DASH_HOLD_S) {
          dashAction.time = DASH_HOLD_S;
          dashAction.timeScale = 0;
        } else if (!walking) {
          if (dashAction.time < DASH_LAND_S) dashAction.time = DASH_LAND_S;
          dashAction.timeScale = 1;
        }
        if (!walking && dashAction.time >= dashAction.getClip().duration - 0.02) dashing = false;
        else base = 'Dash';
      }
      act('Run').timeScale = Math.min(2.5, Math.max(0.6, (cellsPerSecond * act('Run').getClip().duration) / RUN_CELLS));

      if (gesture && clock >= gesture.until) gesture = null;
      const target = gesture ? gesture.name : base;
      const k = Math.min(1, delta / FADE_S);
      let best = 0;
      for (const [name, action] of actions) {
        const w = weights.get(name)! + ((name === target ? 1 : 0) - weights.get(name)!) * k;
        weights.set(name, w);
        action.setEffectiveWeight(w);
        if (w > best) {
          best = w;
          top = name;
        }
      }
      mixer.update(delta);
    },
    play(kind, ms) {
      const name = CLIP_OF[kind];
      const action = act(name);
      const seconds = Math.max(0.1, ms / 1000);
      action.reset().play();
      action.timeScale = action.getClip().duration / seconds;
      gesture = { name, until: clock + seconds };
    },
    dash() {
      dashPending = clock;
    },
    get clip() {
      return top;
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
