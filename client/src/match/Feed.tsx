/**
 * The running commentary, `match_events` put into words.
 *
 * A solo round resolves thirteen AI turns behind one click and comes back as
 * one batch of sixty-odd events. Without a feed the board simply changes and
 * the player has no idea why their Bulwark is off the field. This is the only
 * place in the client that reads events at all, and it reads them to narrate,
 * never to work out what the board looks like: that is the snapshot's job.
 *
 * Every action a unit takes leaves a line, the house's included, a miss as much
 * as a hit and a turn spent doing nothing as much as a turn spent swinging
 * ("holds position"). Jérôme played a match and saw the AI act without the
 * feed saying so: walks, a failed interception and an idle turn were all
 * silent. Only bookkeeping stays quiet: `diceRolled`, `turnStarted`, a Spark
 * drift and a Payload coordinate change carry no action of anybody's.
 *
 * 2H.21: Jérôme wanted to see what is new in the feed without reading it all.
 * The lines that arrived since the last render carry a brass edge that fades in
 * three seconds, a goal opens with a diamond and a knockout with a cross in
 * bold. Nothing is removed or reworded: the feed stays the record.
 *
 * 2H.38 (00 C37, point 5): the right column is gone, and the panel with it. The
 * feed splits in two. A ribbon with no box sits over the board, above the
 * action row, so the player reads what just happened without looking away from
 * the pitch: three lines on the laptop, four on the 27-inch, white with a drop
 * shadow and the names in their team colour. Each line fades after about eight
 * seconds, a goal or a knockout after sixteen, in bold. The whole record moves
 * to a drawer that slides in from the left, grouped by round, while the game
 * goes on behind it. The clock's notices ("Default initiative · you go last")
 * used to be a box of their own; they now come through the ribbon, in brass.
 * What counts as new is still judged by content and not by count (2H.22), but
 * it now feeds a list of lines that expire, not a brass edge that fades.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { SUBSTITUTE_DELAY_ROUNDS } from '../../../engine/constants.js';
import type { MatchEvent } from '../../../engine/events.js';
import type { MatchState } from '../../../engine/types.js';
import { label } from './replay.js';

/** A client line that is not an event: the clock's notices. Seen once by `id`. */
export interface FeedNote {
  readonly id: string;
  readonly text: string;
  readonly notice?: 'turn' | 'place';
}

/** How long a line stays whole before it starts to fade, then how long the fade takes. */
const LINE_MS = 8000;
const BIG_MS = 16000;
const NOTE_MS = 12000;
const FADE_MS = 1300;
/** A hard stop on what the ribbon keeps, whatever a batch brings. */
const KEPT = 100;

// ── what is new ────────────────────────────────────────────────────────────

/**
 * The key a render remembers for the next one: the last event, by content.
 * Fresh means "not there at the previous render". 2H.21 judged it by count,
 * which went blind once the window was full (`FEED_LIMIT`): a batch that
 * arrives then trims as many lines off the front as it adds, and the count
 * does not move. The 3D harness caught it on a match three rounds old (2H.22).
 */
export function lastKeyOf(feed: readonly MatchEvent[]): string | null {
  return feed.length > 0 ? JSON.stringify(feed[feed.length - 1]) : null;
}

/**
 * Where the fresh events start: everything after the latest copy of the
 * previous last event. If it is gone from the window, everything is fresh.
 */
export function freshFrom(feed: readonly MatchEvent[], previousKey: string | null): number {
  let i = feed.length - 1;
  while (i >= 0 && JSON.stringify(feed[i]) !== previousKey) i -= 1;
  return i + 1;
}

// ── names in colour ────────────────────────────────────────────────────────

export type Side = 'own' | 'foe';
export interface Piece {
  readonly text: string;
  readonly side?: Side;
}

/**
 * A line cut into pieces, every occurrence of a unit's name tagged with its
 * side. Longest names first, so "Sarn Gunwale" is not eaten by a "Sarn". The
 * first side given for a name wins; an empty name matches nothing.
 */
export function splitNames(text: string, names: readonly { name: string; side: Side }[]): Piece[] {
  const sides = new Map<string, Side>();
  for (const { name, side } of names) if (name && !sides.has(name)) sides.set(name, side);
  if (sides.size === 0) return text ? [{ text }] : [];
  const sorted = [...sides.keys()].sort((a, b) => b.length - a.length);
  const re = new RegExp(sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const out: Piece[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: m[0], side: sides.get(m[0]) as Side });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

// ── the ribbon ─────────────────────────────────────────────────────────────

interface RibbonItem {
  readonly id: number;
  readonly text: string;
  readonly big: boolean;
  readonly note: boolean;
  readonly notice?: 'turn' | 'place';
  readonly out: boolean;
}

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The newest lines over the board, no box. The parent places it (position,
 * left, bottom) and sets `--u`; the first mount shows nothing, so a reload
 * does not flash the history. A line is fresh from its arrival until it has
 * faded and gone.
 */
export function FeedRibbon({
  feed,
  state,
  own,
  lines,
  notes = [],
}: {
  feed: MatchEvent[];
  state: MatchState;
  own: 'A' | 'B';
  lines: number;
  notes?: readonly FeedNote[];
}) {
  const [items, setItems] = useState<RibbonItem[]>([]);
  const alive = useRef(true);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);
  const lastKeyRef = useRef<string | null | undefined>(undefined);
  const seenNotes = useRef<Set<string> | undefined>(undefined);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      for (const t of pending) clearTimeout(t);
      pending.clear();
    };
  }, []);

  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      if (alive.current) fn();
    }, ms);
    timers.current.add(t);
  };

  const admit = (fresh: Omit<RibbonItem, 'id' | 'out'>[]) => {
    if (fresh.length === 0) return;
    const added = fresh.map((item) => ({ ...item, id: nextId.current++, out: false }));
    setItems((prev) => [...prev, ...added].slice(-KEPT));
    for (const { id, big, note } of added) {
      const ttl = note ? NOTE_MS : big ? BIG_MS : LINE_MS;
      later(ttl, () => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, out: true } : i))));
      later(ttl + FADE_MS, () => setItems((prev) => prev.filter((i) => i.id !== id)));
    }
  };

  const nameOf = (id: string) => state.units.find((unit) => unit.id === id)?.name ?? id;

  // The events: whatever came after the previous render's last event.
  useEffect(() => {
    const key = lastKeyOf(feed);
    const previous = lastKeyRef.current;
    lastKeyRef.current = key;
    if (previous === undefined || key === previous) return;
    const from = freshFrom(feed, previous);
    admit(
      feedLines(feed, nameOf)
        .filter(({ index, event }) => index >= from && event.kind !== 'roundStarted')
        .map(({ event, line }) => ({
          text: line,
          big: event.kind === 'scored' || event.kind === 'evacuated',
          note: false,
        })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  // The notices: each id once. Those already there at mount are history.
  useEffect(() => {
    if (seenNotes.current === undefined) {
      seenNotes.current = new Set(notes.map((n) => n.id));
      return;
    }
    const seen = seenNotes.current;
    const fresh = notes.filter((n) => !seen.has(n.id));
    for (const n of fresh) seen.add(n.id);
    admit(fresh.map((n) => ({ text: n.text, big: false, note: true, ...(n.notice ? { notice: n.notice } : {}) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const names = useMemo(
    () => state.units.map((unit) => ({ name: unit.name, side: (unit.team === own ? 'own' : 'foe') as Side })),
    [state.units, own],
  );
  const reduced = reducedMotion();

  return (
    <div data-testid="feed-ribbon" style={S.ribbon}>
      {items.slice(-Math.max(1, lines)).map((item) => (
        <RibbonLine key={item.id} item={item} names={names} reduced={reduced} />
      ))}
    </div>
  );
}

function RibbonLine({
  item,
  names,
  reduced,
}: {
  item: RibbonItem;
  names: readonly { name: string; side: Side }[];
  reduced: boolean;
}) {
  // It enters one tick after mounting, so the transition has something to run from.
  const [entered, setEntered] = useState(reduced);
  useEffect(() => {
    if (entered) return;
    const t = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(t);
  }, [entered]);

  const shown = entered && !item.out;
  const style: React.CSSProperties = {
    ...S.line,
    ...(item.big ? S.big : {}),
    ...(item.note ? { color: 'var(--brass)' } : {}),
    opacity: shown ? 1 : 0,
    transform: entered ? 'none' : 'translateY(calc(4px * var(--u)))',
    transition: reduced
      ? 'none'
      : item.out
        ? 'opacity 1.2s ease'
        : 'opacity .3s ease, transform .4s ease',
  };
  const pieces = item.note ? [{ text: item.text } as Piece] : splitNames(item.text, names);
  return (
    <div
      style={style}
      {...(item.note
        ? { 'data-testid': 'clock-notice', ...(item.notice ? { 'data-notice': item.notice } : {}) }
        : { 'data-fresh': '' })}
    >
      {pieces.map((piece, i) =>
        piece.side ? (
          <span key={i} style={{ color: piece.side === 'own' ? 'var(--team-own)' : 'var(--team-foe)' }}>
            {piece.text}
          </span>
        ) : (
          piece.text
        ),
      )}
    </div>
  );
}

// ── the drawer ─────────────────────────────────────────────────────────────

/**
 * The whole record, in a drawer that slides in from the left of its positioned
 * parent. Always mounted: its lines are in the page even when it is shut. The
 * parent owns the open state and the L key; the game goes on behind it.
 */
export function FeedDrawer({
  feed,
  state,
  own,
  open,
  onClose,
}: {
  feed: MatchEvent[];
  state: MatchState;
  own: 'A' | 'B';
  open: boolean;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const name = (id: string) => state.units.find((unit) => unit.id === id)?.name ?? id;
  const side = (id: string): Side => (state.units.find((unit) => unit.id === id)?.team === own ? 'own' : 'foe');
  const lines = feedLines(feed, name);

  useEffect(() => {
    if (open) box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [open, lines.length, feed]);

  return (
    <aside
      data-testid="feed-drawer"
      data-open={open ? 'yes' : 'no'}
      aria-hidden={!open}
      inert={!open}
      style={{ ...S.drawer, transform: open ? 'none' : 'translateX(-102%)' }}
    >
      <div style={S.head}>
        <span className="label">The call</span>
        <span style={{ flex: 1, marginLeft: 'calc(8px * var(--u))' }}>· whole match</span>
        <button type="button" data-testid="log-close" style={S.ghost} onClick={onClose}>
          Close · L
        </button>
      </div>
      <div ref={box} style={S.list}>
        {lines.map(({ event, line, index }) => (
          <p
            key={index}
            data-feed-line=""
            style={event.kind === 'roundStarted' ? S.round : { ...S.entry, ...toneOf(event, side) }}
          >
            {line}
          </p>
        ))}
      </div>
    </aside>
  );
}

/** What a unit does with its turn, as opposed to what merely happens to it. */
const ACTIONS: ReadonlySet<MatchEvent['kind']> = new Set<MatchEvent['kind']>([
  'moved',
  'dashed',
  'dodging',
  'disengaged',
  'braced',
  'attacked',
  'shoved',
  'passed',
  'shotAtFurnace',
  'crackerBatted',
  'sparkCaught',
  'payloadGrabbed',
]);

/**
 * The feed as lines. An event maps to a line on its own, except `turnEnded`,
 * which says something only when the unit did nothing since its `turnStarted`.
 * Until a `turnStarted` has been seen the window may have been cut mid-turn, so
 * the unit is given the benefit of the doubt.
 */
export function feedLines(
  feed: readonly MatchEvent[],
  name: (id: string) => string,
): { event: MatchEvent; line: string; index: number }[] {
  const out: { event: MatchEvent; line: string; index: number }[] = [];
  let acted = true;
  // Écart 63 (2H.23): a Shove that takes the Payload leaves the shover one free
  // pass in the same turn, and the `passed` event does not say so (events are
  // stored and replays compare on them, so they stay as they are). The feed
  // deduces it: the flag is raised by such a `shoved` from the unit whose turn
  // it is, and only a turn boundary lowers it. An intercepted throw can come as
  // a `passIntercepted` then a `passed` for the same throw, and both read free.
  let freePassFrom: string | null = null;
  let turnOf: string | null = null;
  for (const [index, event] of feed.entries()) {
    if (event.kind === 'turnStarted') {
      acted = false;
      turnOf = event.unitId;
      freePassFrom = null;
    } else if (event.kind === 'turnEnded') freePassFrom = null;
    else if (event.kind === 'shoved' && event.tookPayload && event.shoverId === turnOf) {
      freePassFrom = event.shoverId;
    }
    if (event.kind !== 'turnStarted' && ACTIONS.has(event.kind)) acted = true;
    const free =
      freePassFrom !== null &&
      ((event.kind === 'passed' && event.fromId === freePassFrom) ||
        (event.kind === 'passIntercepted' && event.throwerId === freePassFrom));
    const line =
      event.kind === 'turnEnded'
        ? acted
          ? null
          : `${name(event.unitId)} holds position.`
        : describe(event, name, free);
    if (line) out.push({ event, line, index });
    if (event.kind === 'turnEnded') acted = true;
  }
  return out;
}

function toneOf(
  event: MatchEvent,
  side: (id: string) => 'own' | 'foe',
): React.CSSProperties {
  if (event.kind === 'scored') {
    return { color: 'var(--brass)', fontWeight: 600 };
  }
  if (event.kind === 'evacuated') {
    return { color: side(event.unitId) === 'own' ? 'var(--team-own)' : 'var(--team-foe)', fontWeight: 600 };
  }
  if (event.kind === 'roundStarted' || event.kind === 'matchEnded') {
    return { color: 'var(--text)', borderTop: '1px solid var(--line)', paddingTop: 7, marginTop: 7 };
  }
  if (event.kind === 'crackerDetonated' || event.kind === 'sparkEntered') {
    return { color: 'var(--danger)' };
  }
  if ('unitId' in event && typeof event.unitId === 'string') {
    return { color: side(event.unitId) === 'own' ? 'var(--team-own)' : 'var(--team-foe)' };
  }
  return {};
}

function describe(event: MatchEvent, name: (id: string) => string, free = false): string | null {
  switch (event.kind) {
    case 'roundStarted':
      return `— Round ${event.round} —`;
    case 'moved':
      return `${name(event.unitId)} moves ${event.path.length} ${event.path.length === 1 ? 'cell' : 'cells'}.`;
    case 'dashed':
      return `${name(event.unitId)} dashes.`;
    case 'dodging':
      return `${name(event.unitId)} goes low.`;
    case 'braced':
      return `${name(event.unitId)} digs in. Shoving it now rolls at disadvantage and minus 3.`;
    case 'disengaged':
      return `${name(event.unitId)} breaks contact.`;
    case 'damaged':
      return `${name(event.unitId)} takes ${event.amount}.`;
    case 'evacuated':
      return `✕ ${name(event.unitId)} is knocked out and carried off. A substitute comes on in ${SUBSTITUTE_DELAY_ROUNDS} rounds.`;
    case 'attacked':
      return `${name(event.attackerId)} swings at ${name(event.targetId)}${event.hit ? '' : ' and misses'}.`;
    case 'opportunityAttacked':
      return `${name(event.attackerId)} catches ${name(event.targetId)} leaving${event.hit ? '' : ', and misses'}.`;
    case 'recoiled':
      return `${name(event.unitId)} is thrown back by the swing.`;
    case 'recoilBlocked':
      return `${name(event.unitId)} swings but cannot recoil.`;
    case 'shoved':
      if (event.tookPayload) return `${name(event.shoverId)} shoves ${name(event.targetId)} and takes the Payload.`;
      return event.success
        ? `${name(event.shoverId)} shoves ${name(event.targetId)}${event.pushedTo ? ' back a cell' : ' off the line'}.`
        : `${name(event.shoverId)} shoves at ${name(event.targetId)} and it holds.`;
    case 'crackerBatted':
      return `${name(event.unitId)} bats ${label(event.crackerId)} away${event.hit ? '' : ' and misses'}.`;
    case 'crackerParried':
      return event.hit
        ? `${name(event.unitId)} gets the bat on ${label(event.crackerId)} as it comes in.`
        : `${name(event.unitId)} swings at ${label(event.crackerId)} as it comes in, and misses.`;
    case 'crackerDetonated':
      return `${label(event.crackerId)} goes off on ${name(event.targetId)} for ${event.damage}${event.saved ? ', half caught' : ''}.`;
    case 'crackerRespawned':
      return `A fresh ${label(event.crackerId)} appears.`;
    case 'crackerMoved':
      return `${label(event.crackerId)} rolls ${event.path.length} ${event.path.length === 1 ? 'cell' : 'cells'}.`;
    case 'sparkEntered':
      return 'The Spark rolls onto the pitch.';
    case 'sparkMoved':
      return event.cause === 'escape' ? 'The Spark skips a cell away from under its minder.' : null;
    case 'sparkCaught':
      return event.caught
        ? `${name(event.unitId)} has the Spark. It rolls back on next round.`
        : `${name(event.unitId)} grabs at the Spark and misses.`;
    case 'payloadGrabbed':
      return `${name(event.unitId)} takes the Payload.`;
    case 'payloadDropped':
      return `${name(event.unitId)} drops it.`;
    case 'passed':
      if (free) {
        return `${name(event.fromId)} throws the free pass off his Shove to ${name(event.toId)}${event.caught ? '.' : ', and it spills.'}`;
      }
      return `${name(event.fromId)} passes to ${name(event.toId)}${event.caught ? '' : ', and it spills'}.`;
    case 'passIntercepted':
      if (free) {
        return event.success
          ? `${name(event.interceptorId)} picks off ${name(event.throwerId)}'s free pass to ${name(event.toId)}.`
          : `${name(event.interceptorId)} reaches for ${name(event.throwerId)}'s free pass to ${name(event.toId)} and misses.`;
      }
      return event.success
        ? `${name(event.interceptorId)} picks off ${name(event.throwerId)}'s pass to ${name(event.toId)}.`
        : `${name(event.interceptorId)} reaches for ${name(event.throwerId)}'s pass to ${name(event.toId)} and misses.`;
    case 'payloadScattered':
      return event.cells === 1
        ? 'The Payload rolls to the next cell.'
        : `The Payload bounces ${event.cells} cells away.`;
    case 'payloadReset':
      return event.carriedBy
        ? `A fresh Payload goes to ${name(event.carriedBy)}.`
        : 'A fresh Payload lands in front of the Furnace.';
    case 'shotAtFurnace':
      if (event.scored) return `${name(event.unitId)} puts it in the Furnace.`;
      return event.blockedBy
        ? `${name(event.blockedBy)} gets in the mouth and turns ${name(event.unitId)} away.`
        : `${name(event.unitId)} shoots and it comes back out.`;
    case 'relocated':
      return `${name(event.unitId)} is moved out of the penalty box.`;
    case 'placeChosen':
      // Écart 58: the human's place in its role this round.
      return `${name(event.unitId)} plays ${['first', 'second', 'third'][event.place - 1] ?? `number ${event.place}`} of the role this round.`;
    case 'substituteEntered':
      return `${name(event.unitId)} comes on.`;
    case 'seatYielded':
      // 2H.33: a team-mate handed the Giff to the house for the rest of the match.
      return `${name(event.unitId)} is handed to the house for the rest of the match.`;
    case 'scored':
      return `◆ ${event.team === 'A' ? 'Your team' : 'The house'} scores ${event.points}.`;
    case 'matchEnded':
      return event.result.winner === 'draw'
        ? 'Full time. Drawn.'
        : `Full time. ${event.result.winner === 'A' ? 'Your team' : 'The house'} takes it.`;
    default:
      return null;
  }
}

const S: Record<string, React.CSSProperties> = {
  ribbon: { display: 'grid', gap: 'calc(3px * var(--u))', pointerEvents: 'none' },
  line: {
    fontSize: 'calc(13px * var(--u))',
    color: 'var(--text)',
    textShadow: '0 1px 2px #000, 0 0 8px #000, 0 0 2px #000',
  },
  big: { fontWeight: 700, fontSize: 'calc(15px * var(--u))' },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 'calc(380px * var(--u))',
    background: 'rgb(8 11 14 / 90%)',
    borderRight: '1px solid var(--line)',
    zIndex: 15,
    transition: 'transform .25s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'calc(12px * var(--u)) calc(14px * var(--u))',
    borderBottom: '1px solid var(--line)',
    fontFamily: 'var(--mono)',
    fontSize: 'calc(11px * var(--u))',
    letterSpacing: '.14em',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid var(--line)',
    fontFamily: 'var(--mono)',
    fontSize: 'calc(11px * var(--u))',
    letterSpacing: '.1em',
    padding: 'calc(4px * var(--u)) calc(9px * var(--u))',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: 'calc(8px * var(--u)) calc(14px * var(--u))',
    display: 'grid',
    alignContent: 'start',
    gap: 'calc(4px * var(--u))',
    fontSize: 'calc(13px * var(--u))',
  },
  entry: { marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, lineHeight: 1.45 },
  round: {
    marginTop: 'calc(8px * var(--u))',
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    fontFamily: 'var(--mono)',
    fontSize: 'calc(11px * var(--u))',
    color: 'var(--text-faint)',
  },
};
