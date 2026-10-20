// Le panneau des réglages de l'écran de match (2H.38, 00 C37 points 4 et 9).
//
// Jérôme voulait « un endroit plus approprié pour les options de setup », « avec tout dedans » :
// tout ce qui se règle (rythme du replay, vue, caméra, son, plein écran, règles, touches, et la
// sortie du match) vit ici, derrière l'engrenage au bout de la barre du haut. Le panneau tombe
// sous la barre, ne bloque pas le jeu et se ferme d'un clic ailleurs. L'engrenage, lui, porte
// `data-settings-gear` : un clic dessus ne ferme pas ici, c'est lui qui bascule. Échap est géré
// par le parent. L'interrupteur « Team » (2H.41, 00 C41 point 7) bascule entre jouer toute l'équipe
// et jouer son seul Giff : il prend effet au round suivant, et en coop seul le propriétaire le
// touche. Les confirmations (quitter, rendre son Giff) aussi : ici on appelle seulement
// le rappel du siège. Les tailles suivent `--u`, posée par le parent (1 sur portable, jusqu'à 1,4).

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { Speed } from './useMatch.js';

export type VolumeChannel = 'crowd' | 'announcer' | 'effects';

export interface SettingsPanelProps {
  speed: Speed;
  onSpeed: (speed: Speed) => void;
  view: '2d' | '3d';
  hasWebgl: boolean;
  onView: (view: '2d' | '3d') => void;
  /** Le mode de l'équipe pendant ce round. */
  teamMode: 'seat' | 'whole';
  /** Le mode demandé pour le round suivant, null quand rien n'est demandé. */
  requestedMode: 'seat' | 'whole' | null;
  /** Le propriétaire seul : en coop, les autres voient l'interrupteur grisé. */
  canSetTeamMode: boolean;
  onTeamMode: (mode: 'seat' | 'whole') => void;
  /** De 0 à 1. */
  volumes: Readonly<Record<VolumeChannel, number>>;
  onVolume: (channel: VolumeChannel, value: number) => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  onRules: () => void;
  seat: 'owner' | 'member' | 'spectator';
  onLeave: () => void;
  onHandOver: () => void;
  onBackToHub: () => void;
  onClose: () => void;
}

const u = (px: number): string => `calc(${px}px * var(--u))`;

const MONO = 'var(--mono, ui-monospace, monospace)';

const S: Record<string, CSSProperties> = {
  root: {
    position: 'absolute',
    right: u(14),
    top: u(78),
    width: u(330),
    zIndex: 30,
    boxSizing: 'border-box',
    background: 'rgb(10 14 17 / 86%)',
    border: '1px solid var(--line)',
    padding: `${u(10)} ${u(14)}`,
    display: 'grid',
    gap: u(9),
    fontSize: u(13),
    color: 'var(--text)',
    outline: 'none',
  },
  line: { display: 'grid', gridTemplateColumns: `${u(90)} 1fr`, alignItems: 'center', gap: u(8) },
  lineTop: { display: 'grid', gridTemplateColumns: `${u(90)} 1fr`, alignItems: 'start', gap: u(8) },
  label: {
    fontFamily: MONO,
    fontSize: u(10),
    letterSpacing: '.12em',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  seg: { display: 'flex' },
  segBtn: {
    flex: 1,
    background: 'transparent',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--line)',
    marginLeft: -1,
    fontFamily: MONO,
    fontSize: u(11),
    padding: `${u(4)} 0`,
    color: 'var(--text-dim)',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  segOn: { color: 'var(--brass)', borderColor: 'var(--brass)', position: 'relative' },
  segOff: { opacity: 0.45, cursor: 'not-allowed' },
  vols: { display: 'grid', gap: 4 },
  vol: {
    display: 'grid',
    gridTemplateColumns: `${u(78)} 1fr`,
    alignItems: 'center',
    gap: 6,
    fontSize: u(12),
    color: 'var(--text-dim)',
  },
  // The global input is a padded text box; a slider wants none of it.
  range: { width: '100%', accentColor: 'var(--brass)', padding: 0, border: 0, background: 'transparent', height: u(16), margin: 0 },
  hr: { border: 0, borderTop: '1px solid var(--line)', margin: `${u(2)} 0`, width: '100%' },
  plain: {
    textAlign: 'left',
    background: 'transparent',
    border: 0,
    padding: `${u(3)} 0`,
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: u(13),
    fontFamily: 'var(--sans)',
    fontWeight: 400,
    letterSpacing: 0,
    textTransform: 'none',
    justifySelf: 'start',
  },
  danger: {
    textAlign: 'left',
    background: 'transparent',
    border: 0,
    padding: `${u(3)} 0`,
    color: '#ff6b5e',
    cursor: 'pointer',
    fontSize: u(13),
    fontFamily: 'var(--sans)',
    fontWeight: 400,
    letterSpacing: 0,
    textTransform: 'none',
  },
  keys: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: `${u(2)} ${u(10)}`,
    fontSize: u(12),
    color: 'var(--text-dim)',
  },
  kbd: {
    fontFamily: MONO,
    fontSize: u(10),
    border: '1px solid var(--line)',
    padding: `0 ${u(4)}`,
    color: 'var(--text)',
    justifySelf: 'start',
  },
};

const KEYS: ReadonlyArray<readonly [string, string]> = [
  ['1–9', 'actions, or the Giff to send in'],
  ['E E', 'end turn'],
  ['Esc', 'cancel, close'],
  ['C', 'follow the play'],
  ['V', 'next camera view'],
  ['L', 'log'],
  ['M', 'minimap'],
  ['F', 'fullscreen'],
  ['← ↑ → ↓', 'move the camera'],
  ['right drag', 'move the camera'],
  ['wheel', 'zoom'],
];

const VOLUME_ROWS: ReadonlyArray<readonly [VolumeChannel, string]> = [
  ['crowd', 'Crowd'],
  ['announcer', 'Announcer'],
  ['effects', 'Effects'],
];

const NO_WEBGL = 'This browser cannot open WebGL, so the match is shown flat from above';

function Seg({ children }: { children: ReactNode }) {
  return <div style={S.seg}>{children}</div>;
}

function SegButton(props: {
  testId: string;
  on: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean | undefined;
  title?: string | undefined;
}) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      aria-pressed={props.on}
      disabled={props.disabled}
      title={props.title}
      onClick={props.onClick}
      style={{ ...S.segBtn, ...(props.on ? S.segOn : null), ...(props.disabled ? S.segOff : null) }}
    >
      {props.label}
    </button>
  );
}

export function SettingsPanel(props: SettingsPanelProps): ReactElement {
  const { speed, view, hasWebgl, volumes, seat, onClose, teamMode, requestedMode, canSetTeamMode } = props;
  const teamOn = requestedMode ?? teamMode;
  const teamLocked = canSetTeamMode ? undefined : "The owner's call";
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (rootRef.current?.contains(target)) return;
      if (target.closest('[data-settings-gear]')) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Settings"
      data-testid="settings-panel"
      tabIndex={-1}
      style={S.root}
    >
      <div style={S.line}>
        <span style={S.label}>Replay</span>
        <Seg>
          <SegButton testId="replay-slow" on={speed === 'slow'} label="Slow" onClick={() => props.onSpeed('slow')} />
          <SegButton testId="replay-normal" on={speed === 'normal'} label="Normal" onClick={() => props.onSpeed('normal')} />
          <SegButton testId="replay-instant" on={speed === 'instant'} label="Instant" onClick={() => props.onSpeed('instant')} />
        </Seg>
      </div>

      <div style={S.line}>
        <span style={S.label}>View</span>
        <Seg>
          <SegButton
            testId="view-3d"
            on={view === '3d'}
            label="3D"
            disabled={!hasWebgl}
            title={hasWebgl ? undefined : NO_WEBGL}
            onClick={() => props.onView('3d')}
          />
          <SegButton testId="view-2d" on={view === '2d'} label="2D" onClick={() => props.onView('2d')} />
        </Seg>
      </div>

      <div style={S.lineTop}>
        <span style={S.label}>Team</span>
        <div style={{ display: 'grid', gap: u(4) }}>
          <Seg>
            <SegButton
              testId="team-whole"
              on={teamOn === 'whole'}
              label="Whole team"
              disabled={!canSetTeamMode}
              title={teamLocked}
              onClick={() => props.onTeamMode('whole')}
            />
            <SegButton
              testId="team-seat"
              on={teamOn === 'seat'}
              label="My Giff only"
              disabled={!canSetTeamMode}
              title={teamLocked}
              onClick={() => props.onTeamMode('seat')}
            />
          </Seg>
          {requestedMode !== null && requestedMode !== teamMode && (
            <span
              data-testid="team-mode-note"
              style={{ fontFamily: MONO, fontSize: u(10), letterSpacing: '.06em', color: 'var(--text-dim)' }}
            >
              {requestedMode === 'whole' ? 'Whole team from next round' : 'My Giff only from next round'}
            </span>
          )}
        </div>
      </div>

      <div style={S.lineTop}>
        <span style={S.label}>Sound</span>
        <div style={S.vols}>
          {VOLUME_ROWS.map(([channel, label]) => {
            const id = `settings-volume-${channel}`;
            return (
              <label key={channel} htmlFor={id} style={S.vol}>
                {label}
                <input
                  id={id}
                  data-testid={`volume-${channel}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(volumes[channel] * 100)}
                  onChange={(e) => props.onVolume(channel, Number(e.currentTarget.value) / 100)}
                  style={S.range}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div style={S.line}>
        <span style={S.label}>Screen</span>
        <button type="button" data-testid="fullscreen" onClick={props.onFullscreen} style={S.plain}>
          {props.fullscreen ? 'Leave fullscreen · F' : 'Fullscreen · F'}
        </button>
      </div>

      <div style={S.line}>
        <span style={S.label}>Help</span>
        <button type="button" data-testid="rules-open" onClick={props.onRules} style={S.plain}>
          Rules
        </button>
      </div>

      <div style={S.lineTop}>
        <span style={S.label}>Keys</span>
        <div style={S.keys}>
          {KEYS.map(([key, what]) => (
            <KeyRow key={key} keyName={key} what={what} />
          ))}
        </div>
      </div>

      <hr style={S.hr} />
      {seat === 'owner' && (
        <button type="button" data-testid="leave-match" onClick={props.onLeave} style={S.danger}>
          Leave the match
        </button>
      )}
      {seat === 'member' && (
        <button
          type="button"
          data-testid="hand-over"
          onClick={props.onHandOver}
          style={{ ...S.danger, color: 'var(--text)' }}
        >
          Hand my Giff to the house
        </button>
      )}
      {seat === 'spectator' && (
        <button
          type="button"
          data-testid="watch-leave"
          onClick={props.onBackToHub}
          style={{ ...S.danger, color: 'var(--text)' }}
        >
          Back to the hub
        </button>
      )}
    </div>
  );
}

function KeyRow({ keyName, what }: { keyName: string; what: string }) {
  return (
    <>
      <kbd style={S.kbd}>{keyName}</kbd>
      <span>{what}</span>
    </>
  );
}
