/**
 * Artboard 2a, plus the form the artboard did not have.
 *
 * The delivered design shows one Sign in button, because the authentication
 * method was still open when it was drawn. Jérôme settled it on 2026-09-02:
 * **email and password**, no OAuth and no magic link, since the players are a
 * circle of friends and it is the one method Supabase Auth gives without
 * configuring anything outside the project. So the button became a form, in the
 * artboard's own vocabulary rather than in a new one.
 *
 * Signing up writes the profile row immediately. A player with an auth user and
 * no profile is a player every later screen has to have an opinion about, and
 * there is no reason to create that state.
 */

import { useState, type FormEvent } from 'react';

import trench from '../../../assets/arena/sign-in.webp';
import { supabase } from '../lib/supabase.js';

type Mode = 'in' | 'up';

export function SignIn({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * `busy` disables the button, so every path out of here clears it in the
   * `finally`. The lobby learned that the hard way: one path that did not left
   * a button reading "Loading the silo" with nothing on screen to explain it,
   * and a sign-in form that hangs is the same dead end one screen earlier.
   */
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === 'in') {
        const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
        if (failure) {
          setError(failure.message);
          return;
        }
        onDone();
        return;
      }

      const { data, error: failure } = await supabase.auth.signUp({ email, password });
      if (failure) {
        setError(failure.message);
        return;
      }
      if (!data.session) {
        // The project has email confirmation on. Nothing more can be done here
        // and saying so is better than a screen that appears to have hung.
        setError('Check your email to confirm the account, then sign in.');
        setMode('in');
        return;
      }

      const { error: profileFailure } = await supabase
        .from('profiles')
        .insert({ id: data.user!.id, display_name: name.trim() || email.split('@')[0]! });
      if (profileFailure) {
        setError(profileFailure.message);
        return;
      }
      onDone();
    } catch (failure) {
      console.error('sign in failed', failure);
      setError('could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.screen}>
      <img src={trench} alt="" style={S.art} />
      <div style={S.wash} />
      <div className="hazard" style={S.stripe} />

      <div style={S.column}>
        <div className="plate" style={S.badge}>
          <div style={S.badgeInner} />
          <span style={S.badgeText}>GRBL</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 className="display" style={S.title}>
            Boomball
          </h1>
          <p style={S.tagline}>
            Welcome to the Galactic tournament of Boomball. The ancestral game of the Giff.
          </p>
        </div>

        <form onSubmit={submit} style={S.form}>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="label" htmlFor="password" style={{ marginTop: 14 }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {mode === 'up' && (
            <>
              <label className="label" htmlFor="name" style={{ marginTop: 14 }}>
                Name on the roster
              </label>
              <input
                id="name"
                type="text"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}

          {error && (
            <p className="error" style={{ marginTop: 16 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} style={{ marginTop: 22, width: '100%' }}>
            {busy ? 'Standing by' : mode === 'in' ? 'Sign in' : 'Enlist'}
          </button>

          <button
            type="button"
            className="ghost"
            style={{ marginTop: 10, width: '100%' }}
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setError(null);
            }}
          >
            {mode === 'in' ? 'No account yet' : 'I already have an account'}
          </button>

          {mode === 'in' && (
            // No mail path exists, by choice (`00` C35 point 1): a forgotten
            // password is reset by Jérôme, by hand, and the screen says so.
            <p className="label" style={S.forgot} data-testid="forgot-note">
              Forgot your password? Ask Jérôme on Discord, he resets it.
            </p>
          )}
        </form>
      </div>

      <div className="hazard" style={S.stripeBottom} />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  screen: {
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
    background: 'var(--page)',
  },
  art: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(.42) saturate(.6)',
  },
  wash: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(60% 60% at 50% 46%, rgba(7,8,10,.62), rgba(7,8,10,.9))',
  },
  stripe: { position: 'absolute', left: 0, right: 0, top: 0 },
  stripeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  column: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  badge: {
    width: 118,
    height: 118,
    border: '3px solid var(--brass-dim)',
  },
  badgeInner: {
    position: 'absolute',
    inset: 5,
    border: '1px solid rgba(201,180,137,.35)',
    clipPath: 'polygon(50% 0,100% 26%,100% 74%,50% 100%,0 74%,0 26%)',
  },
  badgeText: {
    fontFamily: 'var(--display)',
    fontWeight: 800,
    fontSize: 26,
    letterSpacing: '.14em',
    color: 'var(--brass)',
  },
  title: { margin: 0, fontSize: 62, letterSpacing: '.08em' },
  tagline: {
    margin: '10px auto 0',
    maxWidth: 460,
    fontSize: 13,
    lineHeight: 1.6,
    color: 'var(--text-dim)',
  },
  form: {
    width: 380,
    padding: 26,
    background: 'rgba(11,15,18,.82)',
    border: '1px solid var(--line)',
  },
  forgot: {
    margin: '16px 0 0',
    textAlign: 'center',
    lineHeight: 1.6,
    textTransform: 'none',
    letterSpacing: '.04em',
  },
};
