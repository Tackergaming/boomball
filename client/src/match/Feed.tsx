/**
 * The running commentary, `match_events` put into words.
 *
 * A solo round resolves thirteen AI turns behind one click and comes back as
 * one batch of sixty-odd events. Without a feed the board simply changes and
 * the player has no idea why their Bulwark is on the floor. This is the only
 * place in the client that reads events at all, and it reads them to narrate,
 * never to work out what the board looks like: that is the snapshot's job.
 *
 * Events with no line here are deliberately silent. `diceRolled` and
 * `turnStarted` fire constantly and would bury the two lines that matter.
 */

import { useEffect, useRef } from 'react';

import type { MatchEvent } from '../../../engine/events.js';
import type { MatchState } from '../../../engine/types.js';

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
        {feed.map((event, i) => {
          const line = describe(event, name);
          if (!line) return null;
          return (
            <p key={i} style={{ ...S.line, ...toneOf(event, side) }}>
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
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
      return null;
    case 'dashed':
      return `${name(event.unitId)} dashes.`;
    case 'dodging':
      return `${name(event.unitId)} goes low.`;
    case 'disengaged':
      return `${name(event.unitId)} breaks contact.`;
    case 'fell':
      return `${name(event.unitId)} ${event.cause === 'shoved' ? 'is put off the edge' : 'loses grip'} and drops ${event.cellsFallen}.`;
    case 'damaged':
      return `${name(event.unitId)} takes ${event.amount}.`;
    case 'evacuated':
      return `${name(event.unitId)} is carried off in round ${event.round}.`;
    case 'attacked':
      return `${name(event.attackerId)} swings at ${name(event.targetId)}${event.hit ? '' : ' and misses'}.`;
    case 'opportunityAttacked':
      return `${name(event.attackerId)} catches ${name(event.targetId)} leaving${event.hit ? '' : ', and misses'}.`;
    case 'reactionHeld':
      return `${name(event.unitId)} holds, no grip to swing from.`;
    case 'recoiled':
      return null;
    case 'shoved':
      return event.success
        ? `${name(event.shoverId)} shoves ${name(event.targetId)} off the line.`
        : `${name(event.shoverId)} shoves at ${name(event.targetId)} and it holds.`;
    case 'crackerBatted':
      return `${name(event.unitId)} bats ${event.crackerId} away.`;
    case 'crackerDetonated':
      return `${event.crackerId} goes off on ${name(event.targetId)} for ${event.damage}${event.saved ? ', half caught' : ''}.`;
    case 'crackerRespawned':
      return null;
    case 'crackerMoved':
      return null;
    case 'sparkEntered':
      return 'The Spark drops into the shaft.';
    case 'sparkMoved':
      return null;
    case 'sparkCaught':
      return event.caught
        ? `${name(event.unitId)} has the Spark.`
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
        : null;
    case 'payloadScattered':
      return null;
    case 'shotAtFurnace':
      if (event.scored) return `${name(event.unitId)} puts it in the Furnace.`;
      return event.blockedBy
        ? `${name(event.blockedBy)} gets in the mouth and turns ${name(event.unitId)} away.`
        : `${name(event.unitId)} shoots and it comes back out.`;
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
  line: { margin: '3px 0', fontSize: 12, lineHeight: 1.5 },
};
