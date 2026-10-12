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
    /** Filled by `startSendWatch`, read back and removed by `stopSendWatch`. */
    __boomballSamples?: SendSample[];
    __boomballSampler?: number;
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

/**
 * The place prompt of écart 58 (2H.12), answered the way a player does: by a
 * click on the popup on screen, never through the hook. `pick` is given the
 * places on offer and the round, and returns a place or 'close' (play last).
 * Captures the popup the first time it is seen when `shots` is given. Returns
 * like `waitForMyTurn`, once a turn is actually playable.
 */
export async function waitForPlayableTurn(
  page: Page,
  pick: (places: number, round: number) => number | 'close',
  shots?: Shots,
  timeout = 90_000,
): Promise<'turn' | 'finished'> {
  for (let guard = 0; guard < 4; guard++) {
    if ((await waitForMyTurn(page, timeout)) === 'finished') return 'finished';
    const board = await state(page);
    const placing = board.turn?.placing ?? null;
    if (placing === null) return 'turn';

    const prompt = page.getByTestId('place-prompt');
    await prompt.waitFor({ state: 'visible', timeout: 10_000 });
    if (shots && !placeSeen) {
      placeSeen = true;
      await shots.take(`place-prompt-round-${board.round}`);
    }
    const choice = pick(placing, board.round);
    const seq = (await view(page)).seq;
    if (choice === 'close') await page.getByTestId('place-close').click();
    else await prompt.locator(`[data-place="${choice}"]`).click();
    await page.waitForFunction((before) => (window.__boomball?.seq ?? before) !== before || !window.__boomball, seq, {
      timeout: 30_000,
    });
  }
  throw new Error('the place prompt came back four times in a row');
}
let placeSeen = false;

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

/** The destination that costs the most to reach: the whole pitch is on screen, so no zone narrows it. */
export function farthest(destinations: LegalSummary['destinations']): { x: number; y: number; costFeet: number } {
  return destinations.reduce((a, b) => (b.costFeet > a.costFeet ? b : a));
}

/**
 * Audit line A9: the feed ("The call") must not show a round marker twice.
 * Reads every visible line under the panel's head, counts `— Round N —` per N,
 * and returns the counts so a spec can expect each to be 1.
 */
export async function roundMarkers(page: Page): Promise<Record<number, number>> {
  const lines = await page
    .locator('div:has(> .label:text-is("The call"))')
    .first()
    .locator('xpath=..')
    .locator('p')
    .allInnerTexts();
  const counts: Record<number, number> = {};
  for (const line of lines) {
    const m = /^\s*— Round (\d+) —\s*$/.exec(line);
    if (m) counts[Number(m[1])] = (counts[Number(m[1])] ?? 0) + 1;
  }
  return counts;
}

/** The screen boxes of every token, by unit id. */
function tokenBoxes(page: Page): Promise<Record<string, { x: number; y: number }>> {
  return page.evaluate(() => {
    const out: Record<string, { x: number; y: number }> = {};
    for (const node of document.querySelectorAll<SVGGElement>('[data-unit]')) {
      const box = node.getBoundingClientRect();
      out[node.dataset['unit']!] = { x: box.x, y: box.y };
    }
    return out;
  });
}

/**
 * Watches the board during a replay for a token in motion (2H.5).
 *
 * Samples the tokens' boxes every tenth of a second for up to twelve seconds.
 * The first time a token's box differs from its previous sample by more than
 * a pixel, two captures are taken, one at once and one a third of a second
 * later, and the largest shift seen between consecutive samples is reported.
 * A board that only ever jumps whole cells between beats shifts a token by a
 * full cell, about twenty-odd pixels, in one sample, and never by less; a
 * gliding token shows up as a run of small shifts. Both are reported so the
 * spec can say which it saw.
 */
export async function glideSeen(
  page: Page,
  shots: Shots,
): Promise<{ moved: boolean; largestShift: number; smallestShift: number }> {
  let previous = await tokenBoxes(page);
  let moved = false;
  let largestShift = 0;
  let smallestShift = Infinity;
  const started = Date.now();
  let captured = false;

  while (Date.now() - started < 12_000) {
    await page.waitForTimeout(100);
    const now = await tokenBoxes(page);
    for (const [id, box] of Object.entries(now)) {
      const was = previous[id];
      if (!was) continue;
      const shift = Math.hypot(box.x - was.x, box.y - was.y);
      if (shift > 1) {
        moved = true;
        largestShift = Math.max(largestShift, shift);
        smallestShift = Math.min(smallestShift, shift);
      }
    }
    previous = now;
    if (moved && !captured) {
      captured = true;
      await shots.take('glide-a');
      await page.waitForTimeout(300);
      await shots.take('glide-b');
    }
    if (captured && Date.now() - started > 4_000) break;
  }
  return { moved, largestShift, smallestShift: Number.isFinite(smallestShift) ? smallestShift : 0 };
}

/** Where every unit stands, by id: the part of a board a replay is judged on. */
export type Board = Record<string, { x: number; y: number }>;

/** One look at the match screen, taken by the in-page sampler of `startSendWatch`. */
export interface SendSample {
  /** `performance.now()` in the page, milliseconds. */
  t: number;
  seq: number;
  replaying: boolean;
  busy: boolean;
  positions: Board;
}

/** The unit positions on screen right now, read through the hook. */
export function boardOf(page: Page): Promise<Board> {
  return page.evaluate(() => {
    const out: Record<string, { x: number; y: number }> = {};
    for (const u of window.__boomball?.state?.units ?? []) out[u.id] = { x: u.x, y: u.y };
    return out;
  });
}

/** True when at least one unit stands on a different cell on the two boards. */
export function boardsDiffer(a: Board, b: Board): boolean {
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = a[id];
    const q = b[id];
    if (!p || !q || p.x !== q.x || p.y !== q.y) return true;
  }
  return false;
}

/**
 * Starts recording what the match screen shows, every 25 ms, inside the page.
 *
 * A round trip through `page.evaluate` costs more than the transition this
 * guards lasts, so the sampling lives in the browser and is read back once.
 * Call it just before the click that sends the turn, and pair it with
 * `stopSendWatch`.
 */
export async function startSendWatch(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.__boomballSampler !== undefined) window.clearInterval(window.__boomballSampler);
    const samples: SendSample[] = [];
    window.__boomballSamples = samples;
    window.__boomballSampler = window.setInterval(() => {
      const h = window.__boomball;
      if (!h) return;
      const positions: Board = {};
      for (const u of h.state?.units ?? []) positions[u.id] = { x: u.x, y: u.y };
      samples.push({ t: performance.now(), seq: h.seq, replaying: h.replaying, busy: h.busy, positions });
    }, 25);
  });
}

/**
 * Resolves with the first sample whose unit positions differ from `before`,
 * which is the first board a player sees after sending a turn. Take the capture
 * the moment this returns.
 */
export async function firstChangedBoard(page: Page, before: Board, timeout = 30_000): Promise<SendSample> {
  const handle = await page.waitForFunction(
    (was) => {
      const differs = (a: Board, b: Board) => {
        for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
          const p = a[id];
          const q = b[id];
          if (!p || !q || p.x !== q.x || p.y !== q.y) return true;
        }
        return false;
      };
      return window.__boomballSamples?.find((s) => differs(s.positions, was)) ?? false;
    },
    before,
    { timeout, polling: 25 },
  );
  return (await handle.jsonValue()) as SendSample;
}

/** Stops the sampler and returns everything it saw, oldest first. */
export async function stopSendWatch(page: Page): Promise<SendSample[]> {
  return page.evaluate(() => {
    if (window.__boomballSampler !== undefined) window.clearInterval(window.__boomballSampler);
    const samples = window.__boomballSamples ?? [];
    delete window.__boomballSampler;
    delete window.__boomballSamples;
    return samples;
  });
}

/** A few samples around one, relative times, for a failure message. */
function sampleLog(samples: readonly SendSample[], around: number): string {
  const t0 = samples[0]?.t ?? 0;
  return samples
    .slice(Math.max(0, around - 3), around + 4)
    .map((s) => `  +${Math.round(s.t - t0)}ms seq=${s.seq} replaying=${s.replaying} busy=${s.busy}`)
    .join('\n');
}

export interface SendVerdict {
  /** Null when the snapshot was left alone until the replay began, else what was seen. */
  seqJump: string | null;
  /** Null when the first changed board was a beat of the replay, else what was seen. */
  firstBoard: string | null;
}

/**
 * Audit line "retour 1 de 2H.5": the replay must start from the board the
 * player was looking at, not from the end of the round.
 *
 * `useMatch.send()` gets its batch in the HTTP reply, then `play()` walks the
 * beats and ends with `load()`. The Realtime broadcast of the client's own
 * batch can arrive before that reply, and its handler calls `load()` too, so
 * the board jumps to the final positions and `seq` to the final value before
 * the replay has begun; the player sees where everyone ends up, then watches
 * the walk from the old board. Two things must hold, and this judges both:
 * between the click and the first sample with `replaying` true, `seq` is still
 * the one read before the click; and the first board that differs from the
 * pre-click one is drawn during the replay and is not the final board of the
 * batch. In a house round of thirteen AI turns the first beat never equals the
 * final board, so the second check cannot fail on a correct client.
 */
export function judgeSend(
  samples: readonly SendSample[],
  seqBefore: number,
  boardBefore: Board,
  boardAfter: Board,
): SendVerdict {
  const started = samples.findIndex((s) => s.replaying);
  const upToReplay = started < 0 ? samples.length : started;
  const jumpAt = samples.slice(0, upToReplay).findIndex((s) => s.seq !== seqBefore);
  const seqJump =
    jumpAt < 0
      ? null
      : `seq went from ${seqBefore} to ${samples[jumpAt]!.seq} before the replay started ` +
        `(the snapshot was re-read early, retour 1 de 2H.5):\n${sampleLog(samples, jumpAt)}`;

  const firstAt = samples.findIndex((s) => boardsDiffer(s.positions, boardBefore));
  let firstBoard: string | null = null;
  if (firstAt < 0) {
    firstBoard = 'no sample ever showed a board different from the one before the click';
  } else {
    const first = samples[firstAt]!;
    if (!first.replaying) {
      firstBoard =
        `the first changed board was drawn with replaying=false, seq=${first.seq}` +
        `${boardsDiffer(first.positions, boardAfter) ? '' : ', and it is the final board of the batch'}` +
        ` (retour 1 de 2H.5):\n${sampleLog(samples, firstAt)}`;
    } else if (!boardsDiffer(first.positions, boardAfter)) {
      firstBoard =
        `the first changed board is the final board of the batch, replaying=true ` +
        `(retour 1 de 2H.5):\n${sampleLog(samples, firstAt)}`;
    }
  }
  return { seqJump, firstBoard };
}
