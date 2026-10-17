/**
 * The page shell of every out-of-match screen (2H.34): the hazard stripe on
 * top, the crowd at the silo gate fixed behind the content, veiled dark at the
 * top so the header reads and at the bottom so the bar reads, a vignette, and
 * the centred 1120px column. The rules are `.bb-shell` and its kin in
 * `theme.css`; this component only puts the layers in order.
 *
 * It also holds the one control both the hub and the lobby draw around an
 * invite code, `CopyCode`, so the two copy buttons fail the same way.
 */

import { useEffect, useState, type ReactNode } from 'react';

export function Shell({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <div className="bb-shell">
      <div className="bb-backdrop" aria-hidden="true" />
      <div className="hazard bb-layer" />
      <div className={center ? 'bb-wrap bb-wrap-center' : 'bb-wrap'}>{children}</div>
    </div>
  );
}

/** The four-and-four reading of an invite code is in `lobbySeats.ts`; this copies the raw code. */
export function CopyCode({
  code,
  onError,
  testId,
}: {
  code: string;
  /** Said when the clipboard refuses, so the screen can show it. */
  onError: (message: string) => void;
  testId?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (failure) {
      console.error('the invite code could not be copied', failure);
      onError('could not copy the code. Select it and copy it by hand.');
    }
  }

  return (
    <button type="button" className="ghost bb-small" onClick={() => void copy()} {...(testId ? { 'data-testid': testId } : {})}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
