/**
 * What every e2e script shares: captures, the console watch, and the few
 * reads and acts that go through `window.__boomball`.
 *
 * The hook is published by `Match.tsx` only when the dev server runs with
 * `VITE_BOOMBALL_HOOK=1`, which the Playwright config sets on the server it
 * starts. See `client/src/match/testHook.ts` for what it exposes.
 */

import type { Page, TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BoomballHook, LegalSummary } from '../client/src/match/testHook.js';
import type { Action } from '../engine/actions.js';
import type { MatchState } from '../engine/types.js';

declare global {
  interface Window {
    __boomball?: BoomballHook;
  }
}

export const here = dirname(fileURLToPath(import.meta.url));

/** A run's name, sortable, safe in a file name: 2026-10-10T14-03-27. */
export function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/** Numbered captures under `e2e/out/<run>/`, each also attached to the report. */
export class Shots {
  private n = 0;
  readonly dir: string;

  constructor(
    private readonly page: Page,
    private readonly info: TestInfo,
    run: string,
  ) {
    this.dir = resolve(here, 'out', run);
  }

  async take(name: string): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    this.n += 1;
    const path = resolve(this.dir, `${String(this.n).padStart(2, '0')}-${name}.png`);
    await this.page.screenshot({ path });
    await this.info.attach(name, { path, contentType: 'image/png' });
    return path;
  }
}

export interface Watch {
  /** Console errors and uncaught page errors. */
  errors: string[];
  /** Console warnings, which is where React speaks. */
  warnings: string[];
  /** Responses of 400 and above, as `status METHOD /path`, query values dropped. */
  failed: string[];
}

/**
 * Listens from the first navigation on. Paths only: a Supabase URL carries the
 * anon key in its query on the Realtime handshake, and a report is a file that
 * gets read.
 */
export function watch(page: Page): Watch {
  const seen: Watch = { errors: [], warnings: [], failed: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') seen.errors.push(message.text());
    if (message.type() === 'warning') seen.warnings.push(message.text());
  });
  page.on('pageerror', (error) => seen.errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = new URL(response.url());
    const keys = [...url.searchParams.keys()];
    seen.failed.push(
      `${response.status()} ${response.request().method()} ${url.pathname}` +
        (keys.length ? `?${keys.join('&')}` : ''),
    );
  });
  return seen;
}

export function report(seen: Watch): string {
  const block = (title: string, lines: string[]) =>
    `${title} (${lines.length})\n${lines.map((line) => `  ${line}`).join('\n') || '  none'}`;
  return [block('errors', seen.errors), block('warnings', seen.warnings), block('failed responses', seen.failed)].join('\n\n');
}

/** Fails with the one explanation that fits when the hook never shows. */
export async function waitForHook(page: Page): Promise<void> {
  try {
    await page.waitForFunction(() => !!window.__boomball, null, { timeout: 20_000 });
  } catch {
    throw new Error(
      'window.__boomball never appeared. The dev server on 5173 is probably one started by hand, ' +
        'without VITE_BOOMBALL_HOOK=1. Stop it and let Playwright start its own, or start it with the ' +
        'switch: $env:VITE_BOOMBALL_HOOK=\'1\'; npm run dev',
    );
  }
}

export interface View {
  seq: number;
  yours: boolean;
  replaying: boolean;
  busy: boolean;
  deadline: number | null;
  zone: number;
  phase: MatchState['phase'] | null;
  round: number;
  score: { A: number; B: number } | null;
  turnUnitId: string | null;
  actionUsed: boolean | null;
  movementFeet: number | null;
  refusal: string | null;
}

/** The small, serialisable picture of where the match screen is. */
export function view(page: Page): Promise<View> {
  return page.evaluate(() => {
    const h = window.__boomball;
    if (!h) throw new Error('window.__boomball is gone: the match screen is not mounted');
    return {
      seq: h.seq,
      yours: h.yours,
      replaying: h.replaying,
      busy: h.busy,
      deadline: h.deadline,
      zone: h.zone,
      phase: h.state?.phase ?? null,
      round: h.state?.round ?? 0,
      score: h.state ? { A: h.state.score.A, B: h.state.score.B } : null,
      turnUnitId: h.state?.turn?.unitId ?? null,
      actionUsed: h.state?.turn?.actionUsed ?? null,
      movementFeet: h.state?.turn?.movementFeetRemaining ?? null,
      refusal: h.refusal,
    };
  });
}

/**
 * Resolves when this client may act, or when the match is over.
 *
 * Over is read two ways: the hook says `finished`, or the hook is gone because
 * `App` has swapped the match screen for the results sheet, whose label is the
 * only "full time" on the page.
 */
export async function waitForMyTurn(page: Page, timeout = 90_000): Promise<'turn' | 'finished'> {
  await page.waitForFunction(
    () => {
      const h = window.__boomball;
      // Case-insensitive: the sheet's label is set in small caps by CSS, and
      // `innerText` returns what is rendered, so it reads FULL TIME.
      if (!h) return /full time/i.test(document.body.innerText);
      if (h.state?.phase === 'finished') return true;
      return h.yours && !h.replaying && !h.busy && h.legal !== null;
    },
    null,
    { timeout, polling: 250 },
  );
  const over = await page.evaluate(
    () => !window.__boomball || window.__boomball.state?.phase === 'finished',
  );
  return over ? 'finished' : 'turn';
}

export async function summary(page: Page): Promise<LegalSummary> {
  const legal = await page.evaluate(() => window.__boomball?.legalSummary() ?? null);
  if (!legal) throw new Error('no legal actions: it is not this client\'s turn');
  return legal;
}

export function state(page: Page): Promise<MatchState> {
  return page.evaluate(() => {
    const s = window.__boomball?.state;
    if (!s) throw new Error('no board on screen');
    return s;
  });
}

/** Sends an action the way the bar would, and returns once its reply is on screen. */
export function act(page: Page, action: Action): Promise<void> {
  return page.evaluate((a) => window.__boomball!.act(a), action);
}

export function unitAt(page: Page, unitId: string): Promise<{ x: number; y: number } | null> {
  return page.evaluate((id) => {
    const unit = window.__boomball?.state?.units.find((u) => u.id === id);
    return unit ? { x: unit.x, y: unit.y } : null;
  }, unitId);
}

/** Waits until the unit stands on the cell and the request behind the move is done. */
export function waitForArrival(page: Page, unitId: string, cell: { x: number; y: number }): Promise<unknown> {
  return page.waitForFunction(
    ([id, x, y]) => {
      const h = window.__boomball;
      const unit = h?.state?.units.find((u) => u.id === id);
      return !!h && !h.busy && !!unit && unit.x === x && unit.y === y;
    },
    [unitId, cell.x, cell.y] as const,
    { timeout: 30_000 },
  );
}

/** The destination that costs the most to reach, inside the zone on screen. */
export function farthest(
  destinations: LegalSummary['destinations'],
  zone: number,
): { x: number; y: number; costFeet: number } {
  const bottomY = (zone - 1) * 15;
  const inZone = destinations.filter((d) => d.y >= bottomY && d.y < bottomY + 15);
  const pool = inZone.length ? inZone : destinations;
  const best = pool.reduce((a, b) => (b.costFeet > a.costFeet ? b : a));
  return best;
}
