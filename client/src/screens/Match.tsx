/**
 * Artboard 1a: the match screen, and the only screen the game is actually
 * played on.
 *
 * It owns four things and delegates the rest. It works out **whether this
 * client may act** (the unit on the clock is human, it is this human's, and no
 * replay is running), it asks `legalActions` what that unit may do, it runs the
 * turn clock down, and it passes a turn on when the rules leave nothing else.
 *
 * The clock is displayed, not enforced. `matches.turn_deadline` is the server's
 * column and an expired turn is spent in Dodge by whichever request notices it
 * first, so a browser that freezes cannot stop the match and a browser that
 * lies about the time cannot buy any either. What this screen adds is the
 * knock: when the clock reaches zero it sends one request so that the server
 * *does* notice, because a timer that runs out and changes nothing is worse
 * than no timer at all.
 */

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { Action } from '../../../engine/actions.js';
import type { Point } from '../../../engine/geometry.js';
import { legalActions, onlyEndTurnLeft } from '../../../engine/legalActions.js';
import { BENCH_SIZE, MATCH_ROUNDS, TURN_TIMER_SECONDS } from '../../../engine/constants.js';
import { pathTo } from '../../../engine/rules/movement.js';
import { isHuman } from '../../../engine/types.js';
import { arena } from '../lib/arena.js';
import { HOOK_ENABLED, PATIENT } from '../lib/flags.js';
import { ActionBar, type Pending } from '../match/ActionBar.js';
import { Announce } from '../match/Announce.js';
import { Banner, type Announcement } from '../match/Banner.js';
import { Board } from '../match/Board.js';
import { fxBridge } from '../match/fxBridge.js';
import { FLOAT_MS } from '../match/motion.js';
import { createSounds, readSoundEnabled, type SoundKind, type Sounds } from '../match/sound.js';
// The 2.5D board and the whole three.js stack come down only when asked for.
const Board3D = lazy(() => import('../board3d/Board3D.js').then((m) => ({ default: m.Board3D })));
import { projectCell } from '../board3d/projection.js';
import { Briefing, hasBeenBriefed } from '../match/Briefing.js';
import { PlacePrompt } from '../match/PlacePrompt.js';
import { Feed } from '../match/Feed.js';
import { Ladder } from '../match/Ladder.js';
import { TurnStrip } from '../match/TurnStrip.js';
import { SeatPanel } from '../match/SeatPanel.js';
import { cellToScreen, publishHook, summarise, withdrawHook } from '../match/testHook.js';
import { beatHoldMs, useMatch, type Speed } from '../match/useMatch.js';

export function Match({
  matchId,
  userId,
  teamName,
  onFinished,
}: {
  matchId: string;
  userId: string;
  teamName: string;
  onFinished: () => void;
}) {
  // The human always plays team A: `createMatch` seats every human there.
  const own = 'A' as const;

  const match = useMatch(matchId, own);
  const [selected, setSelected] = useState<string | null>(null);

  /**
   * What the action bar has started (a Swing waiting for its target, say). It
   * lives here and not in the bar so the board can read it as well: a pending
   * Swing rings the enemies on the board and a click on one is the answer.
   * Dropped whenever the board moves on, because a half-made choice aimed at a
   * position that no longer exists is how a player swings at the wrong Giff.
   */
  const [pending, setPending] = useState<Pending>(null);

  /**
   * Route plotting. While `plotting` is on, a click on a cell appends the
   * shortest segment to `route` instead of moving, and `Go` sends the lot. The
   * board asks the engine for each segment; this only holds the cells. The
   * route is dropped on every new snapshot, since it was drawn on a board that
   * is gone.
   */
  const [plotting, setPlotting] = useState(false);
  const [route, setRoute] = useState<readonly Point[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [briefing, setBriefing] = useState(() => !hasBeenBriefed());

  /**
   * The 2D / 3D switch (2H.15). The SVG board stays the default and the
   * harness's view; the 2.5D board is the same match in three quarters, and
   * the choice is kept on this browser.
   */
  const [view, setView] = useState<'2d' | '3d'>(() => {
    try {
      return localStorage.getItem('boomball.view') === '3d' ? '3d' : '2d';
    } catch {
      return '2d';
    }
  });
  const toggleView = () => {
    const next = view === '2d' ? '3d' : '2d';
    setView(next);
    try {
      localStorage.setItem('boomball.view', next);
    } catch {
      /* a private window has no say */
    }
  };

  /**
   * The sound (2H.22, `00` C24 line 6): synthesized, one per cue, played from
   * here rather than from a board so both boards sound the same. The module
   * only opens the audio context on the player's first gesture. Nothing at
   * `instant`, like the effects.
   *
   * The instance is made and disposed by one effect, not kept in state with a
   * separate disposing effect: React StrictMode runs every effect twice in
   * development (mount, clean up, mount), and the first version disposed the
   * instance for good on that rehearsal, so Jérôme heard nothing on his dev
   * server while the harness saw the switch. `enabled` is read from storage
   * for the first render, before the instance exists.
   */
  const soundsRef = useRef<Sounds | null>(null);
  const [soundOn, setSoundOn] = useState(() => readSoundEnabled());
  useEffect(() => {
    const sounds = createSounds();
    soundsRef.current = sounds;
    return () => {
      soundsRef.current = null;
      sounds.dispose();
    };
  }, []);
  const toggleSound = () => {
    const next = !soundOn;
    soundsRef.current?.setEnabled(next);
    setSoundOn(next);
  };
  const motionForSound = match.motion;
  useEffect(() => {
    if (!motionForSound || motionForSound.speed === 'instant') return;
    const timers = motionForSound.cues.flatMap((timed) => {
      const kind = soundOf(timed.cue.kind, timed.cue.text);
      return kind ? [setTimeout(() => soundsRef.current?.play(kind), timed.t)] : [];
    });
    return () => timers.forEach(clearTimeout);
  }, [motionForSound]);

  const state = match.state;
  const replaying = match.replaying;

  /**
   * The one Giff this player drives, whoever is on the clock.
   *
   * Every shirt on your own side was the same cyan, so finding yourself meant
   * reading names. It is found through the controller rather than through the
   * turn, so it stays marked while the house is playing, which is exactly when
   * a player is trying to work out what is happening to them.
   */
  const mineId =
    match.state?.units.find(
      (unit) => unit.controller.kind === 'human' && unit.controller.humanId === userId,
    )?.id ?? null;

  const onClock = state?.turn ? state.units.find((u) => u.id === state.turn!.unitId) ?? null : null;
  const yours =
    !!onClock &&
    isHuman(onClock) &&
    onClock.controller.kind === 'human' &&
    onClock.controller.humanId === userId;

  /**
   * Acting is gated on the replay as well as on the turn. During playback the
   * board on screen is a projection of a past moment, so a click on it would be
   * aimed at a position that is no longer there.
   */
  const canAct = yours && !replaying && !match.busy && !briefing;

  /**
   * The place in its role this player is being asked for (écart 58, 2H.12),
   * the number of places on offer, or null. The popup is the whole of the
   * turn while it is up: the bar and the board have nothing legal behind it.
   */
  const placing = yours && !replaying ? state?.turn?.placing ?? null : null;

  const legal = useMemo(
    () => (state && yours && !replaying ? legalActions(arena, state) : null),
    [state, yours, replaying],
  );

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (state?.phase === 'finished') onFinished();
  }, [state?.phase, onFinished]);

  const send = match.send;

  useEffect(() => {
    setPending(null);
  }, [match.seq]);
  useEffect(() => {
    setRoute((r) => (r.length === 0 ? r : []));
  }, [match.seq, state]);

  /**
   * A turn with nothing left in it passes itself on.
   *
   * Being made to press "End turn" at a bar where every other button is dead is
   * a click that carries no decision, and it is the click Jérôme kept having to
   * make. `onlyEndTurnLeft` is the engine's own answer, so this cannot skip a
   * turn that still had something in it. The ref stops the effect firing twice
   * for the same turn while the request is in flight.
   */
  const autoEnded = useRef<string | null>(null);
  useEffect(() => {
    if (!canAct || !legal) return;
    if (!onlyEndTurnLeft(legal)) return;

    // Keyed on the sequence number as well as the unit, because a player drives
    // the same Giff every turn: keying on the unit alone would fire once and
    // never again.
    const turnKey = `${legal.unitId}@${match.seq}`;
    if (autoEnded.current === turnKey) return;

    // Held for a beat first. The action that emptied the turn has its result on
    // screen, and sending the next request would wipe that card before it had
    // been read, which is the very thing the card exists to prevent. The wait
    // is the card's own hold time, so raising one raises the other.
    const timer = setTimeout(() => {
      autoEnded.current = turnKey;
      void send({ kind: 'endTurn' });
    }, beatHoldMs(match.speed));
    return () => clearTimeout(timer);
  }, [canAct, legal, match.seq, match.speed, send]);

  /**
   * When this browser handed control back to the player.
   *
   * The turn clock is counted from here and not from the server's stamp, and
   * that is the fix for turns vanishing. Two things were eating them. The
   * server's deadline is set the moment it finishes resolving, so the ten or
   * twenty seconds of replay came out of the player's thinking time; and it is
   * compared against `Date.now()`, so a machine whose clock runs fast reads
   * every turn as already over. Jérôme played four or five turns and was told
   * ten rounds had gone.
   */
  const tookControl = useRef<number | null>(null);
  const turnKeyNow = yours && !replaying ? `${onClock?.id}@${match.deadline}` : null;
  const turnKeyRef = useRef<string | null>(null);
  if (turnKeyNow && turnKeyRef.current !== turnKeyNow) {
    turnKeyRef.current = turnKeyNow;
    tookControl.current = Date.now();
  }

  /**
   * The knock that makes the clock mean something.
   *
   * The deadline is settled by the next request to arrive, which in a solo
   * match is nobody: the player has gone quiet, that is the whole situation. So
   * the client sends one of its own once the time is genuinely spent.
   *
   * **Both clocks have to agree it is over.** The server's deadline, corrected
   * for how far this browser's clock is out, and a full timer's worth of
   * seconds actually elapsed in front of this screen since control came back.
   * Either one alone has taken a turn off Jérôme that he had not been given.
   */
  const knocked = useRef<string | null>(null);
  useEffect(() => {
    // Development only: a script between two actions is not a player gone
    // quiet, and the server still rules on the deadline when the action lands.
    if (PATIENT) return;
    if (!yours || replaying || match.busy || !match.deadline || !tookControl.current) return;
    if (now + match.skew < match.deadline) return;
    if (Date.now() - tookControl.current < TURN_TIMER_SECONDS * 1000) return;
    const key = `${onClock?.id}@${match.deadline}`;
    if (knocked.current === key) return;
    knocked.current = key;
    void send({ kind: 'endTurn' });
  }, [yours, replaying, match.busy, match.deadline, match.skew, now, onClock?.id, send]);

  /**
   * The test hook, development only and compiled away otherwise.
   *
   * Republished after every render so a script always reads the board that is
   * on screen. Everything it can do goes through `send` and `pathTo` exactly
   * as a click would: see `match/testHook.ts`.
   */
  useEffect(() => {
    if (!HOOK_ENABLED) return;
    publishHook({
      state,
      legal,
      seq: match.seq,
      view,
      yours: canAct,
      replaying,
      busy: match.busy,
      deadline: match.deadline,
      refusal: match.refusal,
      legalSummary: () => summarise(legal),
      setSpeed: match.setSpeed,
      cellToScreen: view === '3d' ? projectCell : cellToScreen,
      clickCell: (x, y) => {
        if (!canAct || !legal) return false;
        const route = pathTo(legal.destinations, { x, y });
        if (!route) return false;
        void send({ kind: 'move', path: route });
        return true;
      },
      act: (action) => (canAct ? send(action) : Promise.resolve()),
      skipReplay: match.skip,
      dismissBeat: match.dismissBeat,
      // 2H.22: where the audio stands, since the harness cannot hear.
      audio: () => soundsRef.current?.state ?? 'none',
      probe: (unitId) => fxBridge.probe?.(unitId) ?? null,
      // 2H.21: an effect on demand, so the harness captures each one on
      // purpose. The mounted board set `fxBridge.fire`; nothing else moves.
      fx: (request) => {
        if (!fxBridge.fire) return false;
        if (request.kind === 'banner') {
          if (!fxBridge.announce) return false;
          fxBridge.announce(request.banner ?? 'loud', request.text ?? '', request.tone ?? 'neutral');
          return true;
        }
        fxBridge.stretch = request.stretch ?? 1;
        fxBridge.fire({
          kind: request.kind,
          at: { x: request.x, y: request.y },
          text: request.text,
          unitId: request.unitId,
          team: request.team,
          after: 0,
        });
        fxBridge.stretch = 1;
        return true;
      },
    });
  });
  useEffect(() => {
    if (!HOOK_ENABLED) return;
    return () => withdrawHook();
  }, []);

  /**
   * Ask every AI team-mate to look for you.
   *
   * `ai/orders.ts` says the orders channel is most of what a player does in
   * solo, six of their seven shirts being driven through it, and **nothing ever
   * put an order into it**: no button here, and the Edge Function passed an
   * empty list every time. Jérôme's report was that he never got the ball,
   * which is exactly what an unwired channel produces.
   *
   * **It costs nothing.** The orders go through the same door carrying no
   * action, so no turn is spent and no board changes: calling for the ball must
   * not cost the turn you were calling for it with. They stand until they are
   * given again.
   */
  const [called, setCalled] = useState(false);

  // The place popup is born at the top left of the body (Jérôme, 2026-10-14,
  // 2H.14; it used to sit over the right column) and the player can drag it.
  // The parent owns the position so it survives the popup unmounting between
  // rounds: kept for the whole match.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [placePos, setPlacePos] = useState<{ x: number; y: number } | null>(null);
  const placeShown = placing !== null && !briefing;
  useLayoutEffect(() => {
    if (!placeShown || placePos !== null) return;
    setPlacePos({ x: 0, y: 0 });
  }, [placeShown, placePos]);

  const postOrders = match.order;
  const callForBall = useCallback(async () => {
    if (!state || !onClock) return;
    const mates = state.units.filter(
      (unit) =>
        unit.team === own && unit.status === 'active' && unit.id !== onClock.id && !isHuman(unit),
    );
    if (mates.length === 0) return;

    await postOrders(
      mates.map((mate) => ({ kind: 'callForPass' as const, to: mate.id, receiverId: onClock.id })),
    );
    setCalled(true);
  }, [state, onClock, own, postOrders]);

  // The call stands until it is given again, but the button should not read as
  // pressed for ever: a player who has moved wants to know the shout is stale.
  useEffect(() => {
    setCalled(false);
  }, [onClock?.x, onClock?.y]);

  /** Every action goes through here, so a pending choice is over once it is made. */
  const act = (action: Action) => {
    setPending(null);
    void send(action);
  };

  /**
   * The banners (2H.21, `00` C23 lines 7 and 8): what a beat announces over
   * the board, one at a time, and "your turn" when the clock comes to this
   * player. Derived from the beat's own events, never from the state, so a
   * banner says what the card says. Nothing at `instant`, where thirteen
   * beats go by in a frame and the banners would only pile up; the turn
   * banner does not come from a beat and shows at every speed. The queue is
   * append-only for `Banner`, trimmed from the front so it never grows.
   */
  const [banners, setBanners] = useState<readonly Announcement[]>([]);
  const bannerId = useRef(0);
  const announce = useCallback((items: readonly Omit<Announcement, 'id'>[]) => {
    if (items.length === 0) return;
    setBanners((old) => [...old, ...items.map((item) => ({ ...item, id: ++bannerId.current }))].slice(-12));
  }, []);
  // 2H.22: a banner on demand for the harness, which cannot order a goal.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    fxBridge.announce = (kind, text, tone) => announce([{ kind, text, tone }]);
    return () => {
      fxBridge.announce = null;
    };
  }, [announce]);
  const beat = match.beat;
  const speed = match.speed;
  useEffect(() => {
    if (!beat || speed === 'instant') return;
    // The whistles (2H.22): the round opens, the match ends. Both at the
    // beat's start, before anything travels.
    for (const event of beat.events) {
      if (event.kind === 'roundStarted') soundsRef.current?.play('whistle');
      else if (event.kind === 'matchEnded') soundsRef.current?.play('fullTime');
    }
    const name = (id: string) => beat.state.units.find((u) => u.id === id)?.name ?? id;
    const side = (team: 'A' | 'B'): Announcement['tone'] => (team === own ? 'own' : 'foe');
    const sideOf = (id: string): Announcement['tone'] => {
      const team = beat.state.units.find((u) => u.id === id)?.team;
      return team ? side(team) : 'neutral';
    };
    const items: Omit<Announcement, 'id'>[] = [];
    for (const event of beat.events) {
      switch (event.kind) {
        case 'roundStarted':
          items.push({
            kind: 'round',
            text: event.round > MATCH_ROUNDS ? 'Sudden death' : `Round ${event.round} of ${MATCH_ROUNDS}`,
            tone: 'neutral',
          });
          break;
        case 'scored':
          // A Spark's points are announced by the catch, one banner per event.
          // 2H.22 (`00` C24 line 3): its own kind, bigger and whiter, and
          // Jérôme's words for the two sides.
          if (event.source === 'payload') {
            items.push({ kind: 'goal', text: `Goal · ${event.team === own ? 'Your Team' : 'The other Team'}`, tone: side(event.team) });
          }
          break;
        case 'evacuated':
          items.push({ kind: 'loud', text: `Knockout · ${name(event.unitId)}`, tone: sideOf(event.unitId) });
          break;
        case 'sparkEntered':
          items.push({ kind: 'loud', text: 'The Spark is loose', tone: 'neutral' });
          break;
        case 'sparkCaught':
          if (event.caught) items.push({ kind: 'loud', text: `Spark caught · ${name(event.unitId)}`, tone: sideOf(event.unitId) });
          break;
        case 'matchEnded':
          items.push({ kind: 'loud', text: 'Full time', tone: 'neutral' });
          break;
        default:
          break;
      }
    }
    announce(items);
  }, [beat, speed, own, announce]);
  // Once the turn is playable, not while the place popup is up: the popup is
  // its own announcement, and the deadline may not move between the two.
  const turnBanner = yours && !replaying && onClock && placing === null ? `${onClock.id}@${match.deadline}` : null;
  const turnBannerShown = useRef<string | null>(null);
  useEffect(() => {
    if (!turnBanner || !onClock || turnBannerShown.current === turnBanner) return;
    turnBannerShown.current = turnBanner;
    // What the replay still had to announce gives way: the board is the
    // player's now, and a queue of old news in front of "your turn" is noise.
    setBanners([{ kind: 'turn', text: `Your turn · ${onClock.name}`, tone: 'own', id: ++bannerId.current }]);
  }, [turnBanner, onClock]);

  if (!state) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <p className="label" style={{ animation: 'bb-tick 1.4s infinite' }}>
          Opening the silo
        </p>
      </div>
    );
  }

  // Counted from when control came back, which is what the knock above waits
  // for. A number that ran out while the player could not act would be a lie
  // twice over: they would watch it fall during the replay and nothing would
  // happen when it hit zero. Clamped at the top as well as at zero: `now` is
  // sampled by the half-second tick and can predate the instant control came
  // back, which read as a hundred and twenty-one on the first render (A14).
  const left =
    yours && !replaying && tookControl.current !== null
      ? Math.min(
          TURN_TIMER_SECONDS,
          Math.max(0, TURN_TIMER_SECONDS - Math.floor((now - tookControl.current) / 1000)),
        )
      : null;
  const beatUnit = match.beat?.unitId ? state.units.find((u) => u.id === match.beat!.unitId) ?? null : null;
  const beatActor = beatUnit?.name ?? null;
  // The actor's shirt, as the boards paint it: amber for this player's Giff.
  const beatColour = beatUnit
    ? beatUnit.id === mineId
      ? '#ffc14d'
      : beatUnit.team === own
        ? 'var(--team-own)'
        : 'var(--team-foe)'
    : null;

  return (
    <div style={S.screen}>
      <header style={S.top}>
        <div style={S.side}>
          <div className="plate" style={{ ...S.crest, border: '2px solid var(--team-own)' }}>
            <span style={{ ...S.crestText, color: 'var(--team-own)' }}>{initials(teamName)}</span>
          </div>
          <div>
            <p className="display" style={{ margin: 0, fontSize: 19 }}>
              {teamName}
            </p>
            <p className="label" style={{ margin: '2px 0 0' }}>
              Bench {state.bench.A} of {BENCH_SIZE}
            </p>
          </div>
        </div>

        <div style={S.centre}>
          <p className="display" style={S.score}>
            <span key={`A${state.score.A}`} style={{ ...S.tally, color: 'var(--team-own)' }}>
              {state.score.A}
            </span>
            <span style={{ color: 'var(--text-faint)', fontSize: 22, padding: '0 12px' }}>·</span>
            <span key={`B${state.score.B}`} style={{ ...S.tally, color: 'var(--team-foe)' }}>
              {state.score.B}
            </span>
          </p>
          <p className="label" style={{ margin: 0, textAlign: 'center' }}>
            Round {state.round} of {MATCH_ROUNDS}
            {state.phase === 'suddenDeath' ? ' · sudden death' : ''}
          </p>
        </div>

        <div style={{ ...S.side, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <p className="display" style={{ margin: 0, fontSize: 19 }}>
              The House
            </p>
            <p className="label" style={{ margin: '2px 0 0' }}>
              Bench {state.bench.B} of {BENCH_SIZE}
            </p>
          </div>
          <div className="plate" style={{ ...S.crest, border: '2px solid var(--team-foe)' }}>
            <span style={{ ...S.crestText, color: 'var(--team-foe)' }}>HS</span>
          </div>
        </div>
      </header>

      <div style={S.body} ref={bodyRef}>
        {placing !== null && onClock && !briefing && placePos !== null && (
          <PlacePrompt
            name={onClock.name}
            role={onClock.role === 'breaker' ? 'breaker' : 'striker'}
            places={placing}
            secondsLeft={left}
            busy={match.busy}
            position={placePos}
            onMove={setPlacePos}
            onChoose={(place) => act({ kind: 'choosePlace', place })}
            // Closing without a choice is the last place, as under écart 55.
            onClose={() => {
              if (!match.busy) act({ kind: 'choosePlace', place: placing });
            }}
          />
        )}

        <div style={S.left}>
          {/* The chain of turns, read left to right: who is up, who is next,
              then next. Jérôme could not tell from the side ladder alone. */}
          <TurnStrip state={state} own={own} yoursId={mineId} onSelect={setSelected} />

          <div style={S.boardWrap}>
            <BoardOf
              view={view}
              state={state}
              legal={legal}
              own={own}
              onMove={canAct ? (path) => void send({ kind: 'move', path }) : null}
              onSelectUnit={setSelected}
              selected={selected}
              yoursId={mineId}
              spotlight={match.beat?.unitId ?? null}
              motion={match.motion}
              pending={pending}
              onAct={canAct ? act : null}
              plot={{ on: plotting && canAct, route }}
              onPlotStep={canAct ? (segment) => setRoute((r) => [...r, ...segment]) : null}
            />

            {match.beat && (
              <Announce
                beat={match.beat}
                actorName={beatActor}
                actorColour={beatColour}
                progress={match.progress}
                onSkip={match.skip}
                onDismiss={match.dismissBeat}
              />
            )}

            {/* Held longer under the harness flag: headless Chromium's software GL
                takes longer to screenshot than a banner lasts. */}
            <Banner queue={banners} speed={match.speed} stretch={PATIENT ? 4 : 1} />

            {briefing && <Briefing onClose={() => setBriefing(false)} />}
          </div>

          {match.expired && (
            <div style={S.expired}>
              <span className="label" style={{ color: 'var(--brass)' }}>
                The clock ran out
              </span>
              <span style={S.expiredLine}>
                Your Giff took cover and the turn passed to the house. You have{' '}
                {TURN_TIMER_SECONDS} seconds a turn, counted from the moment the board is yours
                again.
              </span>
            </div>
          )}

          {match.refusal && (
            <div style={S.refusal}>
              <span className="error">{match.refusal}</span>
              <button className="ghost" style={S.dismiss} onClick={match.dismissRefusal}>
                Dismiss
              </button>
            </div>
          )}

          <div style={S.clockRow}>
            {replaying ? (
              <span className="label" style={{ color: 'var(--brass)' }}>
                The house is playing
              </span>
            ) : yours ? (
              <span
                className="label"
                style={{ color: left !== null && left <= 10 ? 'var(--danger)' : 'var(--brass)' }}
              >
                Your turn · {left ?? TURN_TIMER_SECONDS}s
              </span>
            ) : (
              <span className="label">{onClock ? `${onClock.name} is up` : 'Resolving'}</span>
            )}

            <button
              className="ghost"
              style={{
                ...S.speed,
                ...(called ? { color: 'var(--brass)', borderColor: 'var(--brass)' } : null),
              }}
              // `busy` as well as the turn: an orders write and a turn write
              // both land on the `matches` row, and the last one in wins.
              disabled={!yours || replaying || match.busy}
              onClick={() => void callForBall()}
              title="Tell your AI team-mates to look for you with the Payload"
            >
              {called ? 'Calling for the ball' : 'Call for the ball'}
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="label" style={{ color: 'var(--text-faint)' }}>
                Replay
              </span>
              {(['slow', 'normal', 'instant'] as Speed[]).map((option) => (
                <button
                  key={option}
                  className="ghost"
                  onClick={() => match.setSpeed(option)}
                  style={{
                    ...S.speed,
                    ...(match.speed === option
                      ? { color: 'var(--brass)', borderColor: 'var(--brass)' }
                      : null),
                  }}
                >
                  {option}
                </button>
              ))}
              <button className="ghost" style={S.speed} onClick={() => setBriefing(true)}>
                Rules
              </button>
              <button
                className="ghost"
                style={{ ...S.speed, color: 'var(--brass)', borderColor: 'var(--brass-dim)' }}
                data-testid="view-toggle"
                onClick={toggleView}
                title="The same match, flat from above or in three quarters"
              >
                {view === '2d' ? 'See it in 3D' : 'Back to 2D'}
              </button>
              <button
                className="ghost"
                style={S.speed}
                data-testid="sound-toggle"
                data-sound={soundOn ? 'on' : 'off'}
                onClick={toggleSound}
                title="The bats, the blasts, the whistle. Synthesized, nothing to download."
              >
                {soundOn ? '♪ Sound on' : 'Sound off'}
              </button>
            </div>
          </div>

          <ActionBar
            legal={legal}
            yours={canAct && placing === null}
            busy={match.busy}
            movementFeet={state.turn?.movementFeetRemaining ?? 0}
            onAct={act}
            pending={pending}
            onPending={setPending}
            selectedId={selected}
            plotting={plotting}
            plotLength={route.length}
            onTogglePlot={() => {
              setPlotting((on) => !on);
              setRoute([]);
            }}
            onGo={() => {
              if (route.length === 0) return;
              void send({ kind: 'move', path: [...route] });
              setRoute([]);
            }}
            onClearPlot={() => setRoute([])}
          />
        </div>

        <aside style={S.right}>
          <Ladder state={state} own={own} onSelect={setSelected} />
          <SeatPanel state={state} unitId={selected ?? onClock?.id ?? null} own={own} />
          <Feed feed={match.feed} state={state} own={own} />
        </aside>
      </div>
    </div>
  );
}

/** One of the two boards, same props. */
function BoardOf({ view, ...props }: { view: '2d' | '3d' } & Parameters<typeof Board>[0]) {
  if (view === '2d') return <Board {...props} />;
  return (
    <Suspense
      fallback={
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <p className="label" style={{ animation: 'bb-tick 1.4s infinite' }}>
            Lighting the silo
          </p>
        </div>
      }
    >
      <Board3D {...props} />
    </Suspense>
  );
}

/**
 * Which sound a cue makes (2H.22). A wound makes none: the bat that caused it
 * already cracked. Shove, Disengage and Dodge have no sound of their own
 * either: the Shove's thud is the `push` or `held` cue that follows.
 */
function soundOf(kind: string, text: string | undefined): SoundKind | null {
  switch (kind) {
    case 'action':
      if (text === 'SWING' || text === 'ATCK OP' || text === 'BAT') return 'swing';
      if (text === 'PASS') return 'throw';
      if (text === 'SHOOT') return 'shoot';
      if (text === 'DASH') return 'dash';
      return null;
    case 'hit':
    case 'miss':
    case 'push':
    case 'held':
    case 'blast':
    case 'goal':
    case 'sparkIn':
    case 'sparkCaught':
    case 'exit':
    case 'enter':
      return kind;
    default:
      return null;
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

const S: Record<string, React.CSSProperties> = {
  screen: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: 10,
    padding: 12,
    background: '#0a0c0e',
  },
  top: {
    height: 74,
    flex: 'none',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    padding: '0 14px',
    background: 'linear-gradient(#161b1f,#0e1214)',
    border: '1px solid var(--line)',
    boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 6%)',
  },
  side: { display: 'flex', alignItems: 'center', gap: 12 },
  crest: { width: 44, height: 44, flex: 'none' },
  crestText: { fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17 },
  centre: { textAlign: 'center' },
  score: { margin: 0, fontSize: 36, letterSpacing: '.04em' },
  // Keyed on its own value in the markup above, so React remounts the span when
  // the number changes and the animation runs again. A goal has to be visible
  // in both places a player might be looking: the card and the scoreboard.
  tally: { display: 'inline-block', animation: 'bb-struck .7s ease-out' },
  body: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: 10,
    flex: 1,
    minHeight: 0,
  },
  left: { display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 },
  boardWrap: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  right: {
    display: 'grid',
    gridTemplateRows: 'minmax(140px, 1fr) auto minmax(140px, 1.2fr)',
    gap: 10,
    minHeight: 0,
    // The column is a fixed track, and a panel whose content cannot shrink
    // (a ladder rung that refuses to wrap, say) would otherwise push the whole
    // column past the window's edge instead of scrolling inside its panel.
    minWidth: 0,
    overflow: 'hidden',
  },
  clockRow: { flex: 'none', display: 'flex', alignItems: 'center', gap: 10 },
  speed: { fontSize: 10, padding: '4px 9px' },
  expired: {
    flex: 'none',
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    padding: '9px 12px',
    background: 'var(--panel-deep)',
    border: '1px solid var(--brass-dim)',
  },
  expiredLine: { fontSize: 12, lineHeight: 1.5, color: 'var(--text-dim)' },
  refusal: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 12px',
    background: 'var(--panel-deep)',
    border: '1px solid #ff8fa0',
  },
  dismiss: { marginLeft: 'auto', fontSize: 11, padding: '5px 10px' },
};
