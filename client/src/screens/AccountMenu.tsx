/**
 * The "Account" menu, top right of the hub (phase 8, `00` C35 point 2).
 *
 * Two things a player could not do anywhere before a friend was ever sent
 * the URL: change their password, and sign out. Both live behind one small
 * button next to the team switcher, drawn the same way, because the header
 * is the one place every signed-in screen out of a match shares.
 *
 * The password form asks for the new password twice and nothing else. Jérôme
 * settled it on 2026-10-17 ("le nouveau deux fois suffit"): the project does
 * not require re-authentication for a password change, and a player who is
 * signed in on this browser is the player. Six characters minimum, the same
 * floor as the sign-up form, so the two never disagree.
 *
 * Forgotten passwords are not handled here at all, on purpose: there is no
 * mail path, and the sign-in screen says to ask Jérôme (C35 point 1).
 */

import { useEffect, useState, type FormEvent } from 'react';

import { changePassword, signOut } from '../lib/supabase.js';

/** The same floor as `SignIn.tsx`; the server enforces it too. */
export const PASSWORD_MIN_LENGTH = 6;

export function AccountMenu({
  displayName,
  onSignedOut,
}: {
  displayName: string;
  /** Called once the session is gone, so the app forgets where it was. */
  onSignedOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  // Closing the menu also closes the form and forgets what was typed: a
  // half-typed password is not something to keep around behind a closed menu.
  useEffect(() => {
    if (open) return;
    setChanging(false);
    setPassword('');
    setAgain('');
    setError(null);
    setChanged(false);
  }, [open]);

  const mismatch = again.length > 0 && password !== again;
  const tooShort = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const canSave = password.length >= PASSWORD_MIN_LENGTH && password === again && !busy;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const result = await changePassword(password);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setChanged(true);
      setChanging(false);
      setPassword('');
      setAgain('');
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      const result = await signOut();
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      onSignedOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bb-switch">
      <button
        className="ghost bb-small"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        data-testid="account-open"
      >
        Account ▾
      </button>
      {open && (
        <div className="bb-switch-menu bb-account" role="menu" data-testid="account-menu">
          <p className="label bb-account-name" title={displayName}>
            Signed in as <span>{displayName || 'Giff'}</span>
          </p>

          {changed && (
            <p className="bb-account-done" data-testid="password-changed">
              Password changed.
            </p>
          )}

          {changing ? (
            <form onSubmit={save} className="bb-account-form" data-testid="password-form">
              <label className="label" htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="new-password"
              />
              <label className="label" htmlFor="new-password-again">
                Once more
              </label>
              <input
                id="new-password-again"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                required
                value={again}
                onChange={(e) => setAgain(e.target.value)}
                data-testid="new-password-again"
              />
              {tooShort && (
                <p className="label bb-account-hint">At least {PASSWORD_MIN_LENGTH} characters.</p>
              )}
              {mismatch && !tooShort && (
                <p className="label bb-account-hint" data-testid="password-mismatch">
                  The two do not match.
                </p>
              )}
              {error && <p className="error">{error}</p>}
              <div className="bb-account-row">
                <button type="submit" className="bb-small" disabled={!canSave} data-testid="save-password">
                  {busy ? 'Saving' : 'Save'}
                </button>
                <button
                  type="button"
                  className="ghost bb-small"
                  onClick={() => {
                    setChanging(false);
                    setPassword('');
                    setAgain('');
                    setError(null);
                  }}
                  data-testid="cancel-password"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                role="menuitem"
                className="ghost bb-small"
                onClick={() => {
                  setChanged(false);
                  setChanging(true);
                }}
                data-testid="change-password"
              >
                Change password
              </button>
              {error && <p className="error">{error}</p>}
              <button
                role="menuitem"
                className="ghost bb-small"
                disabled={busy}
                onClick={() => void leave()}
                data-testid="sign-out"
              >
                {busy ? 'Signing out' : 'Sign out'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
