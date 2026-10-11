/**
 * Turning one batch of events into something a player can watch.
 *
 * A single human click routinely resolves thirteen AI turns and comes back as
 * sixty events at once. Applied in one frame, the board simply changes: every
 * Giff on the field appears somewhere else, a goal has been scored, and nobody
 * can say what happened. That is what this module exists to fix.
 *
 * **It replays, it never resolves.** The client does not call `reduce`, roll
 * anything, or decide any legality, and nothing here breaks that: every value
 * below is copied out of an event that already states it. `moved` carries
 * `from`, `to` and the whole `path`; `damaged` carries `hpAfter`; `scored`
 * carries its own points. So the projection is a transcription of what the
 * server said, not a second implementation of the sport. The moment the replay
 * ends, the authoritative snapshot re-read from `match_state` replaces it
 * wholesale, so a projection that ever drifted would be corrected within the
 * second rather than believed.
 *
 * The unit of playback is a **beat**, which is one unit's turn or one round's
 * hazards, because that is the grain a person actually follows. Event by event
 * is unreadable at speed and unbearably slow at a readable speed; a beat is one
 * sentence: who acted, what they tried, what the dice said.
 */

import { thirdOf, type Point } from '../../../engine/geometry.js';
import type { DiceRoll, MatchEvent } from '../../../engine/events.js';
import type { MatchState, TeamId, Unit, UnitId } from '../../../engine/types.js';
import { MOVE_SPEED_FEET, SUBSTITUTE_DELAY_ROUNDS } from '../../../engine/constants.js';
import { motionOf, type MotionStep } from './motion.js';

/** One watchable moment: a unit's turn, a round's hazards, or the final whistle. */
export interface Beat {
  /** The unit whose turn this is, when the beat belongs to one. */
  readonly unitId: UnitId | null;
  readonly events: readonly MatchEvent[];
  /** The board as it stands once this beat has played out. */
  readonly state: MatchState;
  /**
   * What travelled during the beat, in event order, for the board to glide
   * through on its way to `state`. Untimed: `useMatch.ts` times it at the
   * speed the player chose. See `motion.ts`.
   */
  readonly motion: readonly MotionStep[];
  /** What to say about it, at most a few lines. */
  readonly lines: readonly BeatLine[];
  /** Set when the beat is worth interrupting for: a goal, a knockout, the end. */
  readonly weight: 'normal' | 'loud';
}

export interface BeatLine {
  readonly text: string;
  /** Rendered as the roll it was, so a player reads the dice and not a verdict. */
  readonly roll?: DiceRoll | undefined;
  readonly outcome?: 'good' | 'bad' | 'neutral' | undefined;
  /**
   * Background movement: worth a line only when nothing louder shares the beat.
   *
   * A walk and a Cracker's drift are both context. Once something was thrown,
   * swung or blown up in the same beat, they are noise in front of it. This
   * used to be decided by sniffing the word `moves` out of the text, which
   * quietly broke the moment a second kind of line needed the same treatment.
   */
  readonly minor?: boolean | undefined;
}

/**
 * Splits a batch into beats and projects the board through each one.
 *
 * `base` is the snapshot from **before** the batch, which is what makes the
 * first beat start from what the player was looking at rather than from the
 * outcome they are supposed to be watching unfold.
 */
export function toBeats(base: MatchState, events: readonly MatchEvent[], own: TeamId): Beat[] {
  const beats: Beat[] = [];
  let board = base;
  let current: MatchEvent[] = [];
  let currentUnit: UnitId | null = null;

  const flush = () => {
    if (current.length === 0) return;
    // Read against the board **before** the beat, which is where everything
    // that moves in it starts from.
    const motion = motionOf(board, current);
    const before = board;
    board = project(board, current);
    beats.push({
      unitId: currentUnit,
      events: current,
      state: board,
      motion,
      lines: describe(current, board, own, before),
      weight: loudness(current),
    });
    current = [];
    currentUnit = null;
  };

  for (const event of events) {
    // A turn starting closes whatever came before it: the hazards of a round,
    // or the previous unit's turn. So does a round starting: since écart 51
    // the Crackers can roll as the last rung of a round, and their roll, the
    // blast and the fresh charge dropped in at the top of the next round
    // would otherwise share one beat, with the charge drawn at its new post
    // before it had been seen to roll.
    if (event.kind === 'turnStarted' || event.kind === 'roundStarted') {
      flush();
      if (event.kind === 'turnStarted') currentUnit = event.unitId;
    }
    current.push(event);
    if (event.kind === 'turnEnded') flush();
  }
  flush();

  return beats;
}

/**
 * The board after a run of events, built only from what those events state.
 *
 * Everything set here is read verbatim out of an event. Nothing is inferred,
 * nothing is rolled, and no rule is consulted: an attack changes hit points
 * because `damaged` says `hpAfter`, never because this file worked out what a
 * bat does.
 */
function project(base: MatchState, events: readonly MatchEvent[]): MatchState {
  const units = new Map(base.units.map((unit) => [unit.id, unit] as const));
  let payload = base.payload;
  let spark = base.spark;
  let crackers = base.crackers;
  let score = base.score;
  let round = base.round;

  const moveUnit = (id: UnitId, to: Point) => {
    const unit = units.get(id);
    if (unit) units.set(id, { ...unit, x: to.x, y: to.y });
  };

  /** The ball changes hands: one carrier, on their own cell, and no other. */
  const hold = (id: UnitId) => {
    const carrier = units.get(id);
    payload = { ...payload, carriedBy: id, ...(carrier ? { x: carrier.x, y: carrier.y } : {}) };
    for (const [other, unit] of units) {
      units.set(other, { ...unit, holdingPayload: other === id });
    }
  };

  /** The ball is on the floor and nobody has it. */
  const loose = (at: Point) => {
    payload = { ...payload, carriedBy: null, x: at.x, y: at.y };
    for (const [id, unit] of units) units.set(id, { ...unit, holdingPayload: false });
  };

  for (const event of events) {
    switch (event.kind) {
      case 'roundStarted':
        round = event.round;
        break;
      // `turn` is deliberately not projected. Movement left, action spent and
      // the rest are the turn's economy, which is the server's to state; a
      // half-built one here would be a rule this file has no business holding.
      // The board is told who is acting through the beat's own `unitId`.
      case 'moved':
      case 'recoiled':
      case 'relocated':
        moveUnit(event.unitId, event.to);
        break;
      case 'shoved':
        if (event.pushedTo) moveUnit(event.targetId, event.pushedTo);
        break;
      case 'damaged': {
        const unit = units.get(event.unitId);
        if (unit) units.set(event.unitId, { ...unit, hp: event.hpAfter });
        break;
      }
      case 'evacuated': {
        const unit = units.get(event.unitId);
        if (unit) units.set(event.unitId, { ...unit, status: 'evacuated' as Unit['status'] });
        break;
      }
      case 'dodging': {
        const unit = units.get(event.unitId);
        if (unit) units.set(event.unitId, { ...unit, dodging: true });
        break;
      }
      case 'payloadGrabbed':
        hold(event.unitId);
        break;
      case 'payloadDropped':
        loose(event.at);
        break;
      // A missed pass or a saved shot leaves the ball loose, and the thrower
      // no longer has it. Forgetting that second half left the replay showing a
      // carrier who had thrown the ball away, which `replay.test.ts` caught.
      case 'payloadScattered':
        loose(event.to);
        break;
      case 'passed':
        if (event.caught) hold(event.toId);
        break;
      // A stolen pass never reaches its team mate: the interceptor comes down
      // with the ball. Missing this was the replay's one real lie, caught by
      // `replay.test.ts` comparing against the server's own board.
      case 'passIntercepted':
        if (event.success) hold(event.interceptorId);
        break;
      case 'crackerMoved':
        crackers = crackers.map((cracker) =>
          cracker.id === event.crackerId ? { ...cracker, x: event.to.x, y: event.to.y } : cracker,
        );
        break;
      case 'crackerRespawned':
        crackers = crackers.map((cracker) =>
          cracker.id === event.crackerId
            ? { ...cracker, x: event.at.x, y: event.at.y, state: 'live' as const }
            : cracker,
        );
        break;
      case 'crackerDetonated':
        crackers = crackers.map((cracker) =>
          cracker.id === event.crackerId ? { ...cracker, state: 'destroyed' as const } : cracker,
        );
        break;
      case 'sparkEntered':
        spark = { ...spark, x: event.at.x, y: event.at.y, state: 'live' as const };
        break;
      case 'sparkMoved':
        spark = { ...spark, x: event.to.x, y: event.to.y };
        break;
      case 'sparkCaught':
        // A caught Spark is not gone for good (écart 50): it comes back next
        // round through `sparkEntered`, so between the catch and that entry it
        // is `pending`, exactly as the engine holds it.
        if (event.caught) spark = { ...spark, state: 'pending' as const };
        break;
      // A goal puts a fresh ball straight back into play. The event exists
      // because the log did not say where it went, and a replay that guessed
      // would be exactly the second implementation this file must not be.
      case 'payloadReset':
        if (event.carriedBy) hold(event.carriedBy);
        else loose(event.at);
        break;
      case 'substituteEntered': {
        const unit = units.get(event.unitId);
        if (unit) {
          units.set(event.unitId, {
            ...unit,
            x: event.at.x,
            y: event.at.y,
            hp: unit.maxHp,
            status: 'active' as Unit['status'],
          });
        }
        break;
      }
      case 'scored':
        score = { ...score, [event.team]: score[event.team] + event.points };
        break;
      default:
        break;
    }
  }

  // No, the carried Payload's coordinates are deliberately not kept up to date
  // here. The engine sets them when the ball changes hands and leaves them
  // where they were while it is carried, and the board only ever reads them for
  // a loose ball; a carried one is drawn on its carrier. Following the carrier
  // looked tidier and was an invention, which is the one thing this file may
  // not do. `replay.test.ts` failed on it.

  return {
    ...base,
    units: base.units.map((unit) => units.get(unit.id) ?? unit),
    payload,
    spark,
    crackers,
    score,
    round,
  } as MatchState;
}

/** A goal, a knockout or the whistle is worth a beat of its own on screen. */
function loudness(events: readonly MatchEvent[]): 'normal' | 'loud' {
  return events.some(
    (event) =>
      event.kind === 'scored' || event.kind === 'evacuated' || event.kind === 'matchEnded',
  )
    ? 'loud'
    : 'normal';
}

// -- Saying what happened ----------------------------------------------------

/**
 * The commentary for one beat.
 *
 * Kept to the events that change something a player cares about. A turn where a
 * Giff walked and stopped says so in one line; a turn with a shove, a fall and
 * a goal says three. The dice ride along on the line they belong to, because
 * "18 against 12" is the part that makes a result feel earned rather than
 * decreed.
 */
function describe(
  events: readonly MatchEvent[],
  after: MatchState,
  own: TeamId,
  before: MatchState,
): BeatLine[] {
  const lines: BeatLine[] = [];
  const name = (id: UnitId) => after.units.find((unit) => unit.id === id)?.name ?? id;
  const mine = (id: UnitId) => after.units.find((unit) => unit.id === id)?.team === own;
  const forMe = (good: boolean, actorIsMine: boolean): BeatLine['outcome'] =>
    good === actorIsMine ? 'good' : 'bad';

  for (const event of events) {
    switch (event.kind) {
      case 'roundStarted':
        lines.push({ text: `Round ${event.round}`, outcome: 'neutral' });
        break;
      case 'moved':
        // Only worth a line when nothing louder happened in the same turn; the
        // filter at the end drops it if it did.
        lines.push({ text: `${name(event.unitId)} moves ${event.path.length} cells`, minor: true });
        break;
      case 'dashed':
        lines.push({ text: `${name(event.unitId)} dashes` });
        break;
      case 'dodging':
        lines.push({ text: `${name(event.unitId)} takes cover` });
        break;
      case 'braced':
        lines.push({
          text: `${name(event.unitId)} digs in · harder to shove`,
          outcome: mine(event.unitId) ? 'good' : 'bad',
        });
        break;
      case 'disengaged':
        lines.push({ text: `${name(event.unitId)} disengages` });
        break;
      case 'turnEnded':
        if (spentNothing(events, before, event.unitId)) {
          lines.push({ text: `${name(event.unitId)} holds position`, outcome: 'neutral' });
        }
        break;
      case 'recoiled':
        // A consequence of a swing, not a choice: background to the swing.
        lines.push({ text: `${name(event.unitId)} is thrown back by the swing`, minor: true });
        break;
      case 'attacked':
      case 'opportunityAttacked':
        lines.push({
          text: `${name(event.attackerId)} swings at ${name(event.targetId)}${
            event.kind === 'opportunityAttacked' ? ' on the way past' : ''
          } · ${event.hit ? 'HIT' : 'MISS'}`,
          roll: event.roll,
          outcome: forMe(event.hit, mine(event.attackerId)),
        });
        break;
      case 'shoved':
        lines.push({
          text: `${name(event.shoverId)} shoves ${name(event.targetId)}${
            event.pushedTo ? ' back a cell' : ''
          } · ${event.success ? 'SHOVED' : 'HELD'}`,
          roll: event.shoverRoll,
          outcome: forMe(event.success, mine(event.shoverId)),
        });
        break;
      case 'damaged':
        lines.push({
          text: `${name(event.unitId)} takes ${event.amount} · ${event.hpAfter} hp left`,
          outcome: mine(event.unitId) ? 'bad' : 'good',
        });
        break;
      case 'evacuated':
        lines.push({
          text: `${name(event.unitId)} is knocked out and carried off · back in ${SUBSTITUTE_DELAY_ROUNDS} rounds`,
          outcome: mine(event.unitId) ? 'bad' : 'good',
        });
        break;
      case 'substituteEntered':
        lines.push({
          text: `${name(event.unitId)} comes back on`,
          outcome: mine(event.unitId) ? 'good' : 'bad',
        });
        break;
      case 'payloadGrabbed':
        lines.push({
          text: `${name(event.unitId)} takes the Payload`,
          outcome: mine(event.unitId) ? 'good' : 'bad',
        });
        break;
      case 'payloadDropped':
        lines.push({ text: `${name(event.unitId)} loses the Payload`, outcome: 'neutral' });
        break;
      case 'passed':
        lines.push({
          text: `${name(event.fromId)} passes to ${name(event.toId)} · ${
            event.caught ? 'CAUGHT' : 'DROPPED'
          }`,
          roll: event.roll,
          outcome: forMe(event.caught, mine(event.fromId)),
        });
        break;
      case 'passIntercepted':
        lines.push(
          event.success
            ? {
                text: `${name(event.interceptorId)} cuts the pass out of the air`,
                roll: event.interceptorRoll,
                outcome: mine(event.interceptorId) ? 'good' : 'bad',
              }
            : {
                text: `${name(event.interceptorId)} reaches for the pass from ${name(event.throwerId)} · MISSED`,
                roll: event.interceptorRoll,
                outcome: forMe(false, mine(event.interceptorId)),
              },
        );
        break;
      // Part of the goal's story (écart 53), so not minor: it must show in the
      // beat of the goal. The token just jumps; motion.ts has no step for it.
      case 'relocated':
        lines.push({ text: `${name(event.unitId)} is moved out of the penalty box`, outcome: 'neutral' });
        break;
      case 'shotAtFurnace':
        lines.push({
          text: `${name(event.unitId)} shoots${
            event.blockedBy ? ` past ${name(event.blockedBy)}` : ''
          } · ${event.scored ? 'IN' : 'NO'}`,
          roll: event.roll,
          outcome: forMe(event.scored, mine(event.unitId)),
        });
        break;
      case 'payloadScattered':
        lines.push({
          text:
            event.cells === 1
              ? 'The Payload rolls to the next cell'
              : `The Payload bounces ${event.cells} cells away`,
        });
        break;
      case 'crackerBatted':
        lines.push({
          text: `${name(event.unitId)} bats ${event.crackerId} away · ${
            event.hit ? 'CLEAN' : 'MISSED'
          }`,
          roll: event.roll,
          outcome: forMe(event.hit, mine(event.unitId)),
        });
        break;
      case 'crackerParried':
        // The parry itself moves nothing: the batted run is its own crackerMoved.
        lines.push({
          text: `${name(event.unitId)} parries ${label(event.crackerId)} · ${
            event.hit ? 'CLEAN' : 'MISSED'
          }`,
          roll: event.roll,
          outcome: forMe(event.hit, mine(event.unitId)),
        });
        break;
      // The Crackers had no commentary at all, so a round where neither one
      // went off showed them rolling across the pitch with nothing said, and a
      // fresh one appearing in midfield looked like the same
      // Cracker refusing to leave. Both are minor: a detonation in the same
      // beat outranks them.
      case 'crackerMoved':
        lines.push({
          text: `${label(event.crackerId)} rolls ${event.path.length} cells towards ${thirdName(event.to, own)}`,
          minor: true,
        });
        break;
      case 'crackerRespawned':
        lines.push({
          text: `A fresh ${label(event.crackerId)} appears in ${thirdName(event.at, own)}`,
          outcome: 'neutral',
          minor: true,
        });
        break;
      case 'crackerDetonated':
        lines.push({
          text: `${event.crackerId} goes off on ${name(event.targetId)} · ${
            event.saved ? 'half' : 'full'
          } blast`,
          roll: event.save,
          outcome: mine(event.targetId) ? 'bad' : 'good',
        });
        break;
      case 'sparkEntered':
        lines.push({ text: 'The Spark rolls onto the pitch', outcome: 'neutral' });
        break;
      // Only the escape earns a line (écart 49); a drift stays silent as before.
      case 'sparkMoved':
        if (event.cause === 'escape') {
          lines.push({ text: 'The Spark skips away', outcome: 'neutral' });
        }
        break;
      case 'sparkCaught':
        lines.push({
          text: `${name(event.unitId)} reaches for the Spark · ${event.caught ? 'CAUGHT' : 'MISSED'}`,
          roll: event.roll,
          outcome: forMe(event.caught, mine(event.unitId)),
        });
        break;
      case 'scored':
        lines.push({
          text: `${event.team === own ? 'YOU SCORE' : 'THE HOUSE SCORES'} · ${event.points}`,
          outcome: event.team === own ? 'good' : 'bad',
        });
        break;
      case 'matchEnded':
        lines.push({ text: 'Full time', outcome: 'neutral' });
        break;
      default:
        break;
    }
  }

  // A walk, or a Cracker drifting, only earns a line when it is the whole
  // story. Once anything was thrown, swung or scored, "moves 8 cells" is noise
  // in front of it. `roundStarted` is not minor and is not competing: it is the
  // heading of the beat it opens.
  const eventful = lines.some((line) => !line.minor);
  const kept = eventful ? lines.filter((line) => !line.minor) : lines;

  // A cap is how an action goes missing: a turn can hold a walk, a dash, a swing,
  // a recoil and a blast, and the old limit of four cut whatever came last,
  // usually the result. Eight is more than any turn has produced.
  return kept.slice(0, MAX_LINES);
}

const MAX_LINES = 8;

/** The kinds that are a unit doing something with its turn. */
const TURN_ACTIONS: ReadonlySet<MatchEvent['kind']> = new Set<MatchEvent['kind']>([
  'moved',
  'dashed',
  'dodging',
  'disengaged',
  'braced',
  'attacked',
  'shoved',
  'passed',
  'shotAtFurnace',
  'crackerBatted',
  'sparkCaught',
  'payloadGrabbed',
]);

/**
 * Whether a turn that is ending did nothing at all.
 *
 * A beat that opens on `turnStarted` holds the whole turn, so no action in it is
 * enough. A beat that does not (a human ending a turn they began in an earlier
 * batch) is judged on the board it started from: the turn still at full
 * movement with its action unspent.
 */
function spentNothing(events: readonly MatchEvent[], before: MatchState, unitId: UnitId): boolean {
  if (events.some((event) => TURN_ACTIONS.has(event.kind))) return false;
  if (events.some((event) => event.kind === 'turnStarted')) return true;
  const turn = before.turn;
  return (
    turn !== null &&
    turn.unitId === unitId &&
    !turn.actionUsed &&
    !turn.objectInteractionUsed &&
    !turn.disengaged &&
    turn.movementFeetRemaining >= MOVE_SPEED_FEET
  );
}

/** `cracker-1` is not a thing to read on a card. */
export function label(crackerId: string): string {
  const n = /(\d+)$/.exec(crackerId)?.[1];
  return n ? `Cracker ${n}` : 'A Cracker';
}

/**
 * Which third of the pitch a cell is in, from the point of view of `own`.
 *
 * The thirds are only names, with no rule behind them. Team A's Furnace is at
 * y = 0 and team B's at y = 44, so "own end" is the low third for A and the
 * high one for B. SeatPanel uses the same words.
 */
export function thirdName(at: Point, own: TeamId): string {
  const third = Math.min(2, Math.max(0, thirdOf(at)));
  const fromOwn = own === 'A' ? third : 2 - third;
  return ['own end', 'midfield', 'their end'][fromOwn]!;
}
