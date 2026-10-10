/**
 * The half minute of explanation the match used to start without.
 *
 * Jérôme's first play test opened straight onto the board: no objective, no
 * idea which of the coloured dots was the ball, and a big yellow one in the
 * middle that turned out to be the thing the whole sport is about. Everything
 * below was already true and already drawn; none of it was ever said.
 *
 * It shows once per player and can be reopened from the board, because the
 * second match needs it less than the first and the fifth not at all. The
 * choice is remembered in the browser, which is the right place for a
 * preference that belongs to a person at a screen rather than to an account.
 */

import { useState } from 'react';

import { MATCH_ROUNDS, SPARK_POINTS, TEAM_SIZE, TURN_TIMER_SECONDS } from '../../../engine/constants.js';

const SEEN_KEY = 'boomball.briefed';

export function hasBeenBriefed(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'yes';
  } catch {
    // Site data blocked. Showing the briefing again is a far smaller cost than
    // failing to open the match, so an unreadable store reads as "not yet".
    return false;
  }
}

function remember(): void {
  try {
    localStorage.setItem(SEEN_KEY, 'yes');
  } catch {
    // See above.
  }
}

export function Briefing({ onClose }: { onClose: () => void }) {
  const [again, setAgain] = useState(true);

  const close = () => {
    if (again) remember();
    onClose();
  };

  return (
    <div style={S.scrim} onClick={close}>
      <div style={S.panel} onClick={(event) => event.stopPropagation()}>
        <p className="label" style={{ margin: 0, color: 'var(--brass)' }}>
          Kill-Silo · what you need before the whistle
        </p>
        <h2 className="display" style={S.title}>
          Put the Payload in their Furnace
        </h2>

        <div style={S.grid}>
          <Item
            mark={<span style={{ ...S.dot, background: '#c9b489' }} />}
            title="The Payload"
            body="The gold disc, and the only thing that scores. Take it, carry it to their Furnace and shoot. Your Furnace is on the left of the screen, theirs on the right. Ten points."
          />
          <Item
            mark={<span style={S.slab} />}
            title="Crates and pillars"
            body="They block the way and cut the line of sight. You cannot shoot or pass through one, and a crate between you and a shooter is cover."
          />
          <Item
            mark={<span style={{ ...S.dot, background: '#d8a12a' }} />}
            title="The Crackers"
            body="Two live charges. Every round they roll towards the nearest player, around obstacles, and go off. Swing at one to bat it away; it bounces off crates and edges. A Breaker parries one that rolls onto it, a Reaction: bat against AC 10, and on a hit it is sent back into the arc it came from."
          />
          <Item
            mark={<span style={{ ...S.dot, background: '#fffce8' }} />}
            title="The Spark"
            body={`Rolls onto the pitch at round six and drifts, bouncing off crates and edges. Catch it, from its own cell, and it is worth ${SPARK_POINTS}; it rolls back on next round, worth as much again. Finish a turn standing on it without catching it and it skips a cell away, so nobody can sit on it.`}
          />
          <Item
            mark={<span style={S.shove}>&rarr;</span>}
            title="Shove"
            body="Pushes the target one cell away. It never moves a Giff who has the Payload: they drop it instead."
          />
          <Item
            mark={<span style={{ ...S.dot, background: '#ffc14d' }} />}
            title="You, and the rest"
            body="Amber with a chevron is the Giff you drive. Cyan is the rest of your side, magenta is the house. The bar under each is what is left of them."
          />
          <Item
            mark={<span style={S.shout}>!</span>}
            title="Call for the ball"
            body="Your six team-mates are run by the house brain. Shout, and every one of them starts looking to pass to you. It costs no turn and it stands until you shout again."
          />
          <Item
            mark={<span style={S.clock}>{TURN_TIMER_SECONDS}</span>}
            title="Your turn"
            body={`One move and one action, in any order, within ${TURN_TIMER_SECONDS} seconds. Run out and the clock takes cover for you and passes the turn on. A Bulwark can dig in for its Action: until its next turn, or until it moves, shoving it rolls at disadvantage and minus 3.`}
          />
        </div>

        <p style={S.foot}>
          {MATCH_ROUNDS} rounds. The house fields {TEAM_SIZE * 2 - 1} Giff against you and plays at your own Tier,
          so a match you win is a match you were meant to be able to lose.
        </p>

        <div style={S.actions}>
          <label style={S.check}>
            <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} />
            <span className="label">Do not show this again</span>
          </label>
          <button onClick={close} style={{ marginLeft: 'auto' }}>
            Into the silo
          </button>
        </div>
      </div>
    </div>
  );
}

function Item({ mark, title, body }: { mark: React.ReactNode; title: string; body: string }) {
  return (
    <div style={S.item}>
      <div style={S.markCell}>{mark}</div>
      <div>
        <p className="label" style={{ margin: 0, color: 'var(--text)' }}>
          {title}
        </p>
        <p style={S.body}>{body}</p>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  scrim: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(4,5,7,.78)',
    zIndex: 10,
  },
  panel: {
    width: 720,
    maxWidth: '92%',
    maxHeight: '92%',
    overflowY: 'auto',
    padding: 26,
    background: 'var(--panel)',
    border: '1px solid var(--brass-dim)',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  },
  title: { margin: '6px 0 18px', fontSize: 30 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  item: { display: 'flex', gap: 11, alignItems: 'flex-start' },
  markCell: {
    width: 26,
    height: 26,
    flex: 'none',
    display: 'grid',
    placeItems: 'center',
    background: 'var(--panel-deep)',
    border: '1px solid var(--line)',
  },
  dot: { width: 11, height: 11, borderRadius: '50%', display: 'block' },
  slab: { width: 14, height: 9, background: 'rgba(201,180,137,.4)', display: 'block' },
  shove: { fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: 'var(--brass)' },
  clock: { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--brass)' },
  shout: { fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: 'var(--brass)' },
  body: { margin: '4px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--text-dim)' },
  foot: {
    marginTop: 18,
    paddingTop: 14,
    borderTop: '1px solid var(--line)',
    fontSize: 12,
    lineHeight: 1.7,
    color: 'var(--text-faint)',
  },
  actions: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 },
  check: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
};
