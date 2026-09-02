/**
 * The whole of the client's navigation, which is a state machine over four rows
 * and not a router.
 *
 * There are no URLs to share: a match is private to its team, a lobby has no
 * link to send, and the only deep link anyone could want is "put me back in my
 * match", which is what the machine does on its own by noticing an unfinished
 * one. Adding a router would add a second source of truth for where you are.
 *
 * The rule the machine enforces: **a team has one match at a time**, which is
 * also what `create-match` enforces on the server. If an unfinished match
 * exists, you are in it, whatever screen you thought you were on.
 */

import { useEffect, useState } from 'react';

import { supabase } from './lib/supabase.js';
import { useAccount } from './lib/useAccount.js';
import { Lobby } from './screens/Lobby.js';
import { Match } from './screens/Match.js';
import { Results } from './screens/Results.js';
import { SignIn } from './screens/SignIn.js';
import { TeamHub } from './screens/TeamHub.js';

type Where = 'hub' | 'lobby' | 'results';

export function App() {
  const account = useAccount();
  const [where, setWhere] = useState<Where>('hub');

  // A profile row is written at sign-up, but an account made before that code
  // existed, or one whose insert failed, would otherwise be stuck on a screen
  // that cannot explain itself.
  useEffect(() => {
    if (!account.userId || account.loading || account.profile) return;
    void supabase
      .from('profiles')
      .insert({ id: account.userId, display_name: 'Giff' })
      .then(() => account.refresh());
  }, [account.userId, account.loading, account.profile, account]);

  if (account.loading) return <Waiting />;
  if (!account.userId) return <SignIn onDone={() => void account.refresh()} />;

  const name = account.profile?.display_name ?? '';

  // An unfinished match outranks every other screen.
  if (account.live) {
    return (
      <Match
        matchId={account.live.id}
        userId={account.userId}
        teamName={account.team?.name ?? 'Your battery'}
        onFinished={async () => {
          await account.refresh();
          setWhere('results');
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
        displayName={name}
        onOpened={() => void account.refresh()}
        onBack={() => setWhere('hub')}
      />
    );
  }

  return (
    <TeamHub
      userId={account.userId}
      team={account.team}
      displayName={name}
      onCreated={() => void account.refresh()}
      onEnterLobby={() => setWhere('lobby')}
    />
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
