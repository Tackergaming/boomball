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
 * `boomball/e2e/` can import the type without dragging the browser build in.
 */

import type { Action } from '../../../engine/actions.js';
import { ARENA_WIDTH, ZONE_HEIGHT } from '../../../engine/constants.js';
import type { LegalActions } from '../../../engine/legalActions.js';
import type { MatchState } from '../../../engine/types.js';

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
  /** The zone the board is showing, 1 at the floor. */
  zone: number;
  /** The last refusal the server sent, until dismissed. */
  refusal: string | null;
  legalSummary(): LegalSummary | null;
  setZone(zone: number): void;
  setSpeed(speed: ReplaySpeed): void;
  /** The centre of a cell in window pixels, or null when it is not in the shown zone. */
  cellToScreen(x: number, y: number): { x: number; y: number } | null;
  /** What a click on that cell would do. False when the cell is not a destination. */
  clickCell(x: number, y: number): boolean;
  /** What the action bar would do. Resolves when the reply has been replayed. */
  act(action: Action): Promise<void>;
  skipReplay(): void;
  dismissBeat(): void;
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
 * The stage is square and `ARENA_WIDTH` cells wide, so one cell is its width
 * over fifteen; the row is flipped the way `Board.tsx` flips it, once. A cell
 * in another zone is not on screen and answers null rather than a guess.
 */
export function cellToScreen(zone: number, x: number, y: number): { x: number; y: number } | null {
  const stage = document.querySelector<HTMLElement>('[data-board-stage]');
  if (!stage) return null;
  const bottomY = (zone - 1) * ZONE_HEIGHT;
  if (y < bottomY || y >= bottomY + ZONE_HEIGHT) return null;
  const rect = stage.getBoundingClientRect();
  const cell = rect.width / ARENA_WIDTH;
  const row = ZONE_HEIGHT - 1 - (y - bottomY);
  return { x: rect.left + (x + 0.5) * cell, y: rect.top + (row + 0.5) * cell };
}

export function publishHook(hook: BoomballHook): void {
  (window as Window & { __boomball?: BoomballHook }).__boomball = hook;
}

export function withdrawHook(): void {
  delete (window as Window & { __boomball?: BoomballHook }).__boomball;
}
