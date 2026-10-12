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
 */

import { useEffect, useRef } from 'react';

import { SUBSTITUTE_DELAY_ROUNDS } from '../../../engine/constants.js';
import type { MatchEvent } from '../../../engine/events.js';
import type { MatchState } from '../../../engine/types.js';
import { label } from './replay.js';

export function Feed({ feed, state, own }: { feed: MatchEvent[]; state: MatchState; own: 'A' | 'B' }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [feed.length]);

  const name = (id: string) => state.units.find((unit) => unit.id === id)?.name ?? id;
  const side = (id: string) =>
    state.units.find((unit) => unit.id === id)?.team === own ? 'own' : 'foe';

  return (
    <div style={S.panel}>
      <div style={S.head}>
        <span className="label">The call</span>
      </div>
      <div ref={box} style={S.list}>
        {feedLines(feed, name).map(({ event, line }, i) => (
          <p key={i} style={{ ...S.line, ...toneOf(event, side) }}>
            {line}
          </p>
        ))}
      </div>
    </div>
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
): { event: MatchEvent; line: string }[] {
  const out: { event: MatchEvent; line: string }[] = [];
  let acted = true;
  for (const event of feed) {
    if (event.kind === 'turnStarted') acted = false;
    else if (ACTIONS.has(event.kind)) acted = true;
    const line =
      event.kind === 'turnEnded'
        ? acted
          ? null
          : `${name(event.unitId)} holds position.`
        : describe(event, name);
    if (line) out.push({ event, line });
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

function describe(event: MatchEvent, name: (id: string) => string): string | null {
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
      return `${name(event.unitId)} is knocked out and carried off. A substitute comes on in ${SUBSTITUTE_DELAY_ROUNDS} rounds.`;
    case 'attacked':
      return `${name(event.attackerId)} swings at ${name(event.targetId)}${event.hit ? '' : ' and misses'}.`;
    case 'opportunityAttacked':
      return `${name(event.attackerId)} catches ${name(event.targetId)} leaving${event.hit ? '' : ', and misses'}.`;
    case 'recoiled':
      return `${name(event.unitId)} is thrown back by the swing.`;
    case 'shoved':
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
      return `${name(event.fromId)} passes to ${name(event.toId)}${event.caught ? '' : ', and it spills'}.`;
    case 'passIntercepted':
      return event.success
        ? `${name(event.interceptorId)} picks off the pass from ${name(event.throwerId)}.`
        : `${name(event.interceptorId)} reaches for the pass from ${name(event.throwerId)} and misses.`;
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
    case 'scored':
      return `${event.team === 'A' ? 'Your battery' : 'The house'} scores ${event.points}.`;
    case 'matchEnded':
      return event.result.winner === 'draw'
        ? 'Full time. Drawn.'
        : `Full time. ${event.result.winner === 'A' ? 'Your battery' : 'The house'} takes it.`;
    default:
      return null;
  }
}

const S: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flex: 1,
    background: 'var(--panel)',
    border: '1px solid var(--line)',
  },
  head: { padding: '10px 12px', borderBottom: '1px solid var(--line)' },
  list: { overflowY: 'auto', padding: '8px 12px' },
  line: { marginTop: 3, marginBottom: 3, marginLeft: 0, marginRight: 0, fontSize: 12, lineHeight: 1.5 },
};
