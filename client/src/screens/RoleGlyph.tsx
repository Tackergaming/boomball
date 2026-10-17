/**
 * The four role glyphs of the team interface (2H.34), drawn inline so they
 * take the colour of the text around them (`currentColor`) and need no file.
 * The shapes are the validated mockup's: a ball in flight for the Striker, a
 * bat for the Breaker, a shield for the Bulwark, a dotted arc for the
 * Trajector.
 */

import type { Role } from '../../../engine/stats.js';

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 } as const;

function Shape({ role }: { role: Role }) {
  switch (role) {
    case 'striker':
      return (
        <>
          <circle cx="15" cy="9" r="4.5" {...STROKE} />
          <path d="M3 20c3-3 6-4 9-5M2 15c2-1 4-2 6-2" {...STROKE} strokeLinecap="round" />
        </>
      );
    case 'breaker':
      return (
        <>
          <path d="M4 20l9-9" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M12 12l7-7a1.8 1.8 0 0 1 2.5 2.5l-7 7z" fill="currentColor" />
        </>
      );
    case 'bulwark':
      return (
        <>
          <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" {...STROKE} strokeLinejoin="round" />
          <path d="M8 12h8" {...STROKE} strokeLinecap="round" />
        </>
      );
    case 'trajector':
      return (
        <>
          <path d="M3 19C5 8 14 4 21 6" {...STROKE} strokeLinecap="round" strokeDasharray="2.5 2.5" />
          <circle cx="21" cy="6" r="2.4" fill="currentColor" />
        </>
      );
  }
}

export function RoleGlyph({ role, size = 22 }: { role: Role; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      <Shape role={role} />
    </svg>
  );
}
