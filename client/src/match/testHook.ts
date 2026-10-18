/**
 * The test hook: what a script may read and do on the match screen.
 *
 * `Match.tsx` publishes one of these on `window.__boomball` after every render,
 * and only when `HOOK_ENABLED` (see `lib/flags.ts`), which a production build
 * compiles away. Playwright reads the board through it, finds a cell on the
 * screen, and sends the same actions the action bar would.
 *
 * **Nothing here decides anything about the sport.** `clickCell` asks `pathTo`
 * for the route exactly as the board does, `act` goes through the same `send`
 * as the buttons. A script cannot do through this hook anything a player could
 * not do with a mouse; it can only do it without one.
 *
 * This file has no Vite or React import on purpose, so the e2e scripts under
 * `e2e/` can import the type without dragging the browser build in.
 */

import type { Action } from '../../../engine/actions.js';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import type { LegalActions } from '../../../engine/legalActions.js';
import type { MatchState } from '../../../engine/types.js';
import type { CueKind } from './motion.js';

/**
 * An effect a script asks for, by kind and cell (2H.21). The words and the
 * team are optional. `banner` (2H.22) says a banner over the board instead:
 * `banner` is its kind, `text` its words, `tone` its colour; the cell is ignored.
 */
export interface FxRequest {
  kind: CueKind | 'banner' | 'notice';
  x: number;
  y: number;
  text?: string;
  banner?: 'loud' | 'goal' | 'round' | 'turn';
  /** For `kind: 'notice'` (2H.23): which clock notice to show, `turn` by default. */
  notice?: 'turn' | 'place';
  tone?: 'own' | 'foe' | 'neutral';
  unitId?: string;
  team?: 'A' | 'B';
  /** How many times slower the effect runs, for a capture under software GL. 1 by default. */
  stretch?: number;
}

export type ReplaySpeed = 'slow' | 'normal' | 'instant';

/** `LegalActions` with the destinations flattened, so it survives serialisation. */
export interface LegalSummary {
  unitId: string;
  destinations: { x: number; y: number; costFeet: number }[];
  attack: string[];
  shove: string[];
  pass: string[];
  shoot: boolean;
  batCracker: string[];
  catchSpark: boolean;
  canGrabPayload: boolean;
  canDash: boolean;
  canDodge: boolean;
  canDisengage: boolean;
}

export interface BoomballHook {
  /** The board on screen: the server's snapshot, or the beat being replayed. */
  state: MatchState | null;
  /** What the unit on the clock may do, or null when this client may not act. */
  legal: LegalActions | null;
  /** The seq of the snapshot the client holds. */
  seq: number;
  view: '2d' | '3d';
  /** True when a click on the board would be honoured right now. */
  yours: boolean;
  replaying: boolean;
  busy: boolean;
  /** The server's turn deadline, epoch milliseconds, or null. */
  deadline: number | null;
  /** The last refusal the server sent, until dismissed. */
  refusal: string | null;
  legalSummary(): LegalSummary | null;
  setSpeed(speed: ReplaySpeed): void;
  /** The centre of a cell in window pixels, or null when the board is not mounted. */
  cellToScreen(x: number, y: number): { x: number; y: number } | null;
  /** What a click on that cell would do. False when the cell is not a destination. */
  clickCell(x: number, y: number): boolean;
  /** What the action bar would do. Resolves when the reply has been replayed. */
  act(action: Action): Promise<void>;
  skipReplay(): void;
  dismissBeat(): void;
  /** Where the audio stands (2H.22): `waiting` before the first gesture, `running` after, `none` before the screen made it. */
  audio(): 'silent' | 'waiting' | 'running' | 'disposed' | 'none';
  /** Which crowd loop is under the game (2H.25): `attack` when the player's team has the ball. */
  crowd(): 'attack' | 'defence' | 'none';
  /** The last announcer clip that started (2H.25), by file name, or null. */
  lastSaid(): string | null;
  /** Says a moment on request (2H.25), development only, so the harness can read `lastSaid`. */
  say(cue: string): void;
  /** A Giff of the 3D scene (2H.22): its rotation, its height and the gesture on it; null in 2D or when unknown. */
  probe(unitId: string): { yaw: number; pitch: number; roll: number; y: number; gesture: string | null; clip: string | null } | null;
  /**
   * Fires one visual effect on the mounted board as if its beat had, so a
   * capture can be taken of each on purpose (2H.21). False when no board is
   * listening. It touches nothing in the match: a word rises, sparks fly,
   * the state is what it was.
   */
  fx(request: FxRequest): boolean;
}

export function summarise(legal: LegalActions | null): LegalSummary | null {
  if (!legal) return null;
  return {
    unitId: legal.unitId,
    destinations: [...legal.destinations.values()].map((step) => ({
      x: step.cell.x,
      y: step.cell.y,
      costFeet: step.costFeet,
    })),
    attack: legal.attack.map((t) => t.unitId),
    shove: legal.shove.map((t) => t.unitId),
    pass: legal.pass.map((t) => t.unitId),
    shoot: legal.shoot !== null,
    batCracker: legal.batCracker.map((c) => c.crackerId),
    catchSpark: legal.catchSpark !== null,
    canGrabPayload: legal.canGrabPayload,
    canDash: legal.canDash,
    canDodge: legal.canDodge,
    canDisengage: legal.canDisengage,
  };
}

/**
 * Where a cell is on the screen, read from the board's own stage element.
 *
 * Since D11 the whole pitch is on screen, seen from above and laid along the
 * width of the stage: the engine's `y` runs left to right, 0 at the mouth of
 * Furnace A on the left, and the engine's `x` runs top to bottom. The stage is
 * `ARENA_HEIGHT` cells wide, so one cell is its width over forty-five, and the
 * same rule is the one `Board.tsx` draws by. A cell off the pitch answers null
 * rather than a guess.
 */
export function cellToScreen(x: number, y: number): { x: number; y: number } | null {
  const stage = document.querySelector<HTMLElement>('[data-board-stage]');
  if (!stage) return null;
  if (x < 0 || x >= ARENA_WIDTH || y < 0 || y >= ARENA_HEIGHT) return null;
  const rect = stage.getBoundingClientRect();
  const cell = rect.width / ARENA_HEIGHT;
  return { x: rect.left + (y + 0.5) * cell, y: rect.top + (x + 0.5) * cell };
}

export function publishHook(hook: BoomballHook): void {
  (window as Window & { __boomball?: BoomballHook }).__boomball = hook;
}

export function withdrawHook(): void {
  delete (window as Window & { __boomball?: BoomballHook }).__boomball;
}
