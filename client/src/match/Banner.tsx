/**
 * One short line said over the board, one at a time.
 *
 * Why (2H.21, `00` C23): Jérôme asked for the announcements to make the game
 * feel alive without overload. So there is a single banner on screen, never a
 * stack. A knockout, the Spark and full time are loud; a round opening and
 * "your turn" are quiet. A goal has its own banner, bigger and whiter than the
 * loud one, held longer (2H.22, `00` C24, Jérôme: "quand il y a un but la popup
 * soit plus visible et font augmentée"). The queue is drained in id order, each
 * item held for its own time, and the banner fades in and out, never blinks.
 * The feed stays the record: nothing said here is lost if it was missed.
 *
 * The keyframe `bb-banner` already carries `translate(-50%, 0)`, so the element
 * is placed with `left: 50%` and has no transform of its own.
 */

import { useEffect, useRef, useState } from 'react';

export interface Announcement {
  /** Increasing, unique within the match screen. */
  readonly id: number;
  /** `goal` is a goal, bigger and whiter than `loud` (2H.22, Jérôme's request); `loud` is a knockout, the Spark, full time; `round` opens a round; `turn` says it is the player's turn. */
  readonly kind: 'goal' | 'loud' | 'round' | 'turn';
  readonly text: string;
  readonly tone: 'own' | 'foe' | 'neutral';
}

type Kind = Announcement['kind'];
type Speed = 'slow' | 'normal' | 'instant';

/** How long a banner is held, fades included. `instant` reads as normal. */
export function bannerHoldMs(kind: Kind, speed: Speed): number {
  const slow = speed === 'slow';
  if (kind === 'goal') return slow ? 4000 : 2500;
  if (kind === 'loud') return slow ? 2500 : 1500;
  return slow ? 1800 : 1200;
}

export function Banner({
  queue,
  speed,
  stretch = 1,
}: {
  queue: readonly Announcement[];
  speed: Speed;
  /** How many times longer each banner is held. 1 in play; the screen harness asks for more, its screenshots being slower than a banner. */
  stretch?: number;
}) {
  const [current, setCurrent] = useState<Announcement | null>(null);
  const lastShown = useRef(-Infinity);

  useEffect(() => {
    if (current) return;
    let next: Announcement | null = null;
    for (const a of queue) {
      if (a.id > lastShown.current && (next === null || a.id < next.id)) next = a;
    }
    if (!next) return;
    lastShown.current = next.id;
    setCurrent(next);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), bannerHoldMs(current.kind, speed) * stretch);
    return () => clearTimeout(timer);
  }, [current, speed, stretch]);

  if (!current) return null;

  const hold = bannerHoldMs(current.kind, speed) * stretch;
  const colour = TONE[current.tone];
  const look =
    current.kind === 'goal'
      ? {
          ...S.goal,
          borderColor: colour,
          textShadow: `0 0 24px ${colour}, 0 0 60px ${colour}`,
          boxShadow: `0 0 0 1px ${colour}, 0 0 40px ${colour}, 0 12px 40px rgba(0,0,0,.65)`,
        }
      : current.kind === 'loud'
        ? { ...S.loud, color: colour, borderColor: colour }
        : { ...S.quiet, color: colour };

  return (
    <div
      key={current.id}
      data-testid="banner"
      data-banner={current.kind}
      data-tone={current.tone}
      style={{ ...S.base, ...look, animation: `bb-banner ${hold}ms ease-out forwards` }}
    >
      {current.text}
    </div>
  );
}

const TONE: Record<Announcement['tone'], string> = {
  own: 'var(--team-own)',
  foe: 'var(--team-foe)',
  neutral: 'var(--brass)',
};

const S: Record<string, React.CSSProperties> = {
  base: {
    position: 'absolute',
    top: 10,
    left: '50%',
    zIndex: 4,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  loud: {
    fontFamily: 'var(--display)',
    fontWeight: 800,
    fontSize: 26,
    letterSpacing: '.12em',
    padding: '10px 24px',
    background: 'rgba(5,7,10,.92)',
    boxShadow: '0 8px 30px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)',
    textShadow: '0 0 18px currentColor',
  },
  goal: {
    fontFamily: 'var(--display)',
    fontWeight: 800,
    fontSize: 40,
    letterSpacing: '.14em',
    padding: '14px 34px',
    background: 'rgba(5,7,10,.92)',
    color: '#f4f7f8',
  },
  quiet: {
    fontFamily: 'var(--mono)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '.14em',
    padding: '6px 14px',
    background: 'rgba(5,7,10,.88)',
    borderColor: 'var(--line)',
  },
};
