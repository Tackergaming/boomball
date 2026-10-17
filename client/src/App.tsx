/**
 * The whole of the client's navigation, which is a state machine over four rows
 * and not a router.
 *
 * There are no URLs to share: a match is private to its team and a lobby has no
 * link to send. Adding a router would add a second source of truth for where
 * you are.
 *
 * The rule the machine enforces: **a team has one match at a time**, which is
 * also what `create-match` enforces on the server. An unfinished match is
 * therefore always waiting for you, and there is nowhere else to go with it.
 *
 * **It no longer drags you into it, though.** Reloading the page used to drop
 * the player straight onto the board with no idea why, mid-round, with the
 * house halfway through something. The hub says a match is running and offers
 * to take you back to it; opening one from the lobby goes straight in, because
 * that is the click you just made.
 *
 * **The lobby channel lives here since 2H.34**, not in the lobby screen: the
 * hub reads who is waiting in the lobby from it, and a team-mate on the hub
 * hears the match open. The lobby screen tracks the player's seat on it while
 * it is open, and withdraws the seat when it closes.
 */

import { useEffect, useState } from 'react';

import { supabase } from './lib/supabase.js';
import { useAccount } from './lib/useAccount.js';
import { useLobbyChannel } from './lib/useLobbyChannel.js';
import { Lobby } from './screens/Lobby.js';
import { Match } from './screens/Match.js';
import { Results } from './screens/Results.js';
import { SignIn } from './screens/SignIn.js';
import { TeamHub } from './screens/TeamHub.js';

type Where = 'hub' | 'lobby' | 'results';

export function App() {
  const account = useAccount();
  const [where, setWhere] = useState<Where>('hub');
  /** Set by opening a match or by choosing to go back into one. */
  const [atTheBoard, setAtTheBoard] = useState(false);

  // The owner opened the match: everybody on the channel re-reads. A player
  // in the lobby lands on the board, which is the click they were waiting
  // for; a player on the hub sees the running match and chooses.
  const lobby = useLobbyChannel(account.team?.id ?? null, account.userId, () => {
    void account.refresh().then(() => {
      if (where === 'lobby') setAtTheBoard(true);
    });
  });

  // A profile row is written at sign-up, but an account made before that code
  // existed, or one whose insert failed, would otherwise be stuck on a screen
  // that cannot explain itself.
  useEffect(() => {
    // `undefined` is a profile not read yet, and only `null` is a profile that
    // the database has no row for.
    if (!account.userId || account.loading || account.profile !== null) return;
    void supabase
      .from('profiles')
      .insert({ id: account.userId, display_name: 'Giff' })
      .then(() => account.refresh());
  }, [account.userId, account.loading, account.profile, account]);

  if (account.loading) return <Waiting />;
  if (!account.userId) return <SignIn onDone={() => void account.refresh()} />;
  if (account.failure) {
    return <Unreachable reason={account.failure} onRetry={() => void account.refresh()} />;
  }

  const name = account.profile?.display_name ?? '';

  if (account.live && atTheBoard) {
    return (
      <Match
        matchId={account.live.id}
        userId={account.userId}
        teamName={account.team?.name ?? 'Your team'}
        isOwner={!!account.team && account.team.owner === account.userId}
        onFinished={async () => {
          setAtTheBoard(false);
          await account.refresh();
          setWhere('results');
        }}
        onLeft={async () => {
          // The match was abandoned from the board (2H.28): no result, so
          // the hub and not the results screen.
          setAtTheBoard(false);
          await account.refresh();
          setWhere('hub');
        }}
      />
    );
  }

  if (where === 'results' && account.lastFinished && account.team) {
    return (
      <Results
        match={account.lastFinished}
        team={account.team}
        onPlayAgain={() => setWhere('lobby')}
        onHub={() => setWhere('hub')}
      />
    );
  }

  if (where === 'lobby' && account.team) {
    return (
      <Lobby
        userId={account.userId}
        team={account.team}
        members={account.members}
        displayName={name}
        link={lobby}
        onOpened={async () => {
          await account.refresh();
          setAtTheBoard(true);
        }}
        onBack={() => setWhere('hub')}
      />
    );
  }

  return (
    <TeamHub
      userId={account.userId}
      team={account.team}
      teams={account.teams}
      members={account.members}
      displayName={name}
      live={account.live}
      archived={account.archived}
      abandoned={account.abandoned}
      lobby={lobby.seats}
      onResume={() => setAtTheBoard(true)}
      onSignedOut={() => {
        // The auth listener in `useAccount` clears the user; this only makes
        // sure the next player on this browser starts on the hub.
        setWhere('hub');
        setAtTheBoard(false);
      }}
      onAbandoned={() => account.refresh()}
      onCreated={() => void account.refresh()}
      onJoined={(teamId) => account.refresh(teamId)}
      onEnterLobby={() => setWhere('lobby')}
      onChooseTeam={(teamId) => account.chooseTeam(teamId)}
      onRollChanged={() => account.refresh()}
    />
  );
}

/**
 * The screen a player gets when the project does not answer (audit line A12).
 *
 * It replaces the one they used to get, which was "Raise a team" for an
 * account that had one, followed by a button that failed without a word. The
 * reason is the server's own, verbatim, because it is what a friend will paste
 * into a message to Jérôme, and a free project in pause and a network that is
 * down read differently in it.
 */
function Unreachable({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <div style={{ maxWidth: 560, padding: 26, background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <p className="label" style={{ margin: 0, color: 'var(--brass)' }}>
          The silo is not answering
        </p>
        <h2 className="display" style={{ margin: '6px 0 14px', fontSize: 28 }}>
          Could not read your team
        </h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-dim)' }}>
          Your sign-in is fine. The server behind the game did not answer when the page asked for
          your profile, your team or your matches. Check your connection and try again; if it
          keeps happening, send Jérôme the line below.
        </p>
        <p
          className="error"
          style={{ margin: '14px 0 0', fontFamily: 'var(--mono)', fontSize: 11, wordBreak: 'break-word' }}
        >
          {reason}
        </p>
        <button onClick={onRetry} style={{ marginTop: 18 }}>
          Try again
        </button>
      </div>
    </div>
  );
}

function Waiting() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <p className="label" style={{ animation: 'bb-tick 1.4s infinite' }}>
        Reading the roll
      </p>
    </div>
  );
}
