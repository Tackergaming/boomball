/**
 * The confirmation before a team-mate hands their Giff to the house (2H.33,
 * `00` C32 point 6, Jérôme's "b"). Same shape as `AbandonPrompt`: in the
 * page, captured by the harness, the caller does the handing over and says
 * what went wrong through `error`.
 */

import { useState } from 'react';

export function YieldPrompt({
  onYield,
  onKeep,
}: {
  /** Sends the yield; resolves once the server answered, throws on a refusal. */
  onYield: () => Promise<void>;
  onKeep: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hand() {
    setBusy(true);
    setError(null);
    try {
      await onYield();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'the seat could not be handed over');
      setBusy(false);
    }
  }

  return (
    <div style={S.box} data-testid="yield-prompt" role="alertdialog" aria-labelledby="yield-question">
      <p id="yield-question" style={S.question}>
        Hand your Giff to the house? It plays your seat for the rest of the match, starting now.
        You can keep watching, and leave whenever you like.
      </p>
      {error && (
        <p className="error" style={{ margin: '10px 0 0' }}>
          {error}
        </p>
      )}
      <div style={S.buttons}>
        <button onClick={() => void hand()} disabled={busy} data-testid="yield-yes">
          {busy ? 'Handing it over' : 'Yes, hand it over'}
        </button>
        <button className="ghost" onClick={onKeep} disabled={busy} data-testid="yield-no">
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
