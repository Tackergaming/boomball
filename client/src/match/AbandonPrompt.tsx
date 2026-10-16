/**
 * The confirmation before a match is abandoned (2H.28, `00` C29).
 *
 * Shared by the hub ("Abandon this match") and the match screen ("Leave the
 * match"), so the two doors ask the same question in the same words, which
 * Jérôme read and cut to this. It sits in the page, never in a browser dialog:
 * the harness captures it, and it looks like the rest of the game. The caller
 * does the abandoning and says what went wrong through `error`.
 */

import { useState } from 'react';

import { abandonMatch } from '../lib/supabase.js';

export function AbandonPrompt({
  matchId,
  onAbandoned,
  onKeep,
}: {
  matchId: string;
  /** Called once the server has stamped the match; the caller leaves the board. */
  onAbandoned: () => void | Promise<void>;
  onKeep: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abandon() {
    setBusy(true);
    setError(null);
    const reply = await abandonMatch(matchId);
    if (!reply.ok) {
      setError(reply.reason);
      setBusy(false);
      return;
    }
    await onAbandoned();
  }

  return (
    <div style={S.box} data-testid="abandon-prompt" role="alertdialog" aria-labelledby="abandon-question">
      <p id="abandon-question" style={S.question}>
        Abandon this match? It ends here with no result: no win, no loss, and the ladder does not
        move.
      </p>
      {error && (
        <p className="error" style={{ margin: '10px 0 0' }}>
          {error}
        </p>
      )}
      <div style={S.buttons}>
        <button onClick={() => void abandon()} disabled={busy} data-testid="abandon-yes">
          {busy ? 'Leaving the silo' : 'Yes, abandon it'}
        </button>
        <button className="ghost" onClick={onKeep} disabled={busy} data-testid="abandon-no">
          Keep playing
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  box: {
    padding: '16px 18px',
    background: 'var(--panel)',
    border: '1px solid var(--brass)',
    maxWidth: 520,
  },
  question: { margin: 0, fontSize: 14, lineHeight: 1.6 },
  buttons: { display: 'flex', gap: 10, marginTop: 14 },
};
