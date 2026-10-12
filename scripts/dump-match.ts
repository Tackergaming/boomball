/**
 * Reads a match back from Supabase and writes it down, turn by turn, with the
 * AI's reasoning rebuilt by replaying it locally.
 *
 * Written on 2026-10-11 (2H.9) because a question about what the AI did is
 * answered by the events in `match_events`, never by a screenshot, and because
 * the events say what happened but not why. The why is recovered by replaying
 * the match from `matches.kickoff` with the engine of this checkout: every
 * action is rebuilt from the events it produced, `reduce` is run on it, the
 * events it yields are checked against the stored ones, and before each
 * decision `rankPlans` says what the AI of this checkout would have chosen and
 * why. For an AI unit that is its reason; for a human it is what the AI would
 * have done in its seat.
 *
 * Read-only against the database. The service key is read from the
 * environment, never printed:
 *
 *     set -a && . ../.env && set +a                        # from boomball/
 *     node scripts/run-ts.mjs scripts/dump-match.ts --list
 *     node scripts/run-ts.mjs scripts/dump-match.ts [--match <id>] [--out <dir>]
 *
 * Without `--match` it takes the latest finished match of a team that is not
 * the e2e battery. Writes `match.json`, `kickoff.json`, `events.json` and
 * `match.md` into `--out`, by default `docs/matches/<date>-<id8>/`.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Arena } from '../engine/arena.js';
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import type { Action } from '../engine/actions.js';
import type { MatchEvent } from '../engine/events.js';
import type { Point } from '../engine/geometry.js';
import { legalActions } from '../engine/legalActions.js';
import { openMatch, reduce } from '../engine/reduce.js';
import type { MatchState, Unit, UnitId } from '../engine/types.js';
import { rankPlans, type Plan } from '../ai/chooseAction.js';
import type { AllyOrder } from '../ai/orders.js';

const URL_BASE = need('SUPABASE_BOOMBALL_URL');
const SERVICE = need('SUPABASE_BOOMBALL_SERVICE_ROLE_KEY');

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is missing. From boomball/: set -a && . ../.env && set +a`);
    process.exit(1);
  }
  return value;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(URL_BASE + path, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  if (response.status >= 300) {
    console.error(`${path}: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  return (await response.json()) as T;
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

interface MatchRow {
  id: string;
  team_id: string;
  arena_id: string;
  tier: string;
  phase: string;
  round: number;
  score_a: number;
  score_b: number;
  rng_seed: number;
  engine_version: number;
  created_at: string;
  finished_at: string | null;
  winner: string | null;
  is_draw: boolean;
  orders: AllyOrder[];
  kickoff: { state: MatchState; lastSeq: number } | null;
}

interface Participant {
  match_id: string;
  unit_id: UnitId;
  profile_id: string;
  role: string;
  character_name: string;
}

interface TeamRow {
  id: string;
  name: string;
  owner: string;
}

interface EventRow {
  seq: number;
  kind: string;
  payload: MatchEvent;
}

// -- Listing ----------------------------------------------------------------

const matches = await get<MatchRow[]>(
  '/rest/v1/matches?select=id,team_id,arena_id,tier,phase,round,score_a,score_b,rng_seed,engine_version,created_at,finished_at,winner,is_draw&order=created_at.desc&limit=12',
);
const teamIds = [...new Set(matches.map((m) => m.team_id))];
const teams = await get<TeamRow[]>(`/rest/v1/teams?select=id,name,owner&id=in.(${teamIds.join(',')})`);
const teamName = (id: string): string => teams.find((t) => t.id === id)?.name ?? id.slice(0, 8);

if (process.argv.includes('--list')) {
  const participants = await get<Participant[]>(
    `/rest/v1/match_participants?select=match_id,unit_id,role,character_name&match_id=in.(${matches.map((m) => m.id).join(',')})`,
  );
  for (const m of matches) {
    const seat = participants.find((p) => p.match_id === m.id);
    console.log(
      `${m.id}  ${m.created_at.slice(0, 16)}  ${teamName(m.team_id).padEnd(16)} ${m.tier.padEnd(8)} ${m.phase.padEnd(9)} ${m.score_a}-${m.score_b}  engine ${m.engine_version}  ${seat ? `${seat.character_name} (${seat.unit_id})` : 'no human'}`,
    );
  }
  process.exit(0);
}

// -- The match --------------------------------------------------------------

const wantedId =
  arg('--match') ??
  matches.find((m) => m.phase === 'finished' && teamName(m.team_id) !== 'E2E Battery')?.id ??
  null;
if (!wantedId) {
  console.error('no finished match to dump');
  process.exit(1);
}

const [match] = await get<MatchRow[]>(`/rest/v1/matches?select=*&id=eq.${wantedId}`);
if (!match) {
  console.error(`no match ${wantedId}`);
  process.exit(1);
}
const participants = await get<Participant[]>(`/rest/v1/match_participants?select=*&match_id=eq.${match.id}`);

const events: EventRow[] = [];
for (let offset = 0; ; offset += 1000) {
  const page = await get<EventRow[]>(
    `/rest/v1/match_events?select=seq,kind,payload&match_id=eq.${match.id}&order=seq.asc&limit=1000&offset=${offset}`,
  );
  events.push(...page);
  if (page.length < 1000) break;
}

const stamp = match.created_at.slice(0, 10);
const outDir = arg('--out') ?? join('docs', 'matches', `${stamp}-${match.id.slice(0, 8)}`);
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'match.json'), JSON.stringify({ match: { ...match, kickoff: undefined }, team: teams.find((t) => t.id === match.team_id), participants }, null, 2));
await writeFile(join(outDir, 'kickoff.json'), JSON.stringify(match.kickoff, null, 2));
await writeFile(join(outDir, 'events.json'), JSON.stringify(events, null, 1));
console.log(`${match.id}: ${events.length} events, ${teamName(match.team_id)}, ${match.tier}, ${match.score_a}-${match.score_b}, engine ${match.engine_version}`);

// -- The replay -------------------------------------------------------------

if (!match.kickoff) {
  console.error('no kickoff board on this match (opened before migration 0007): nothing to replay');
  process.exit(1);
}
if (match.arena_id !== KILL_SILO.id) {
  console.error(`arena ${match.arena_id} is not ${KILL_SILO.id}`);
  process.exit(1);
}

const arena = new Arena(KILL_SILO);
const stored: MatchEvent[] = events.map((e) => e.payload);
const humans = new Set(participants.map((p) => p.unit_id));
const orders = match.orders ?? [];

interface Decision {
  seq: number;
  round: number;
  unitId: UnitId;
  human: boolean;
  before: { at: Point; hp: number; holding: boolean; feetLeft: number; actionUsed: boolean };
  /** The board as it stood when the decision was taken, for the viewer. */
  board: BoardSnapshot;
  plans: { why: string; score: number; steps: string[] }[];
  played: Action;
  produced: readonly MatchEvent[];
  agrees: boolean | null;
}

/**
 * What `viewer.html` draws for one decision: the pieces on the board before the
 * action, nothing the engine does not already hold. Kept small on purpose, there
 * are four hundred of them in a match.
 */
interface BoardSnapshot {
  round: number;
  turnIndex: number;
  ladder: { rank: number; actor: string; team: string | null }[];
  units: {
    id: UnitId;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    ball: boolean;
    status: string;
    dodging: boolean;
    braced: boolean;
  }[];
  payload: MatchState['payload'];
  spark: MatchState['spark'];
  crackers: MatchState['crackers'];
  score: MatchState['score'];
  penaltyBox: MatchState['penaltyBox'];
}

function snapshot(s: MatchState): BoardSnapshot {
  return {
    round: s.round,
    turnIndex: s.turnIndex,
    ladder: s.turnOrder.map((slot) => ({
      rank: slot.rank,
      actor: slot.actor.kind === 'unit' ? slot.actor.unitId : slot.actor.kind,
      team: slot.team,
    })),
    units: s.units.map((u) => ({
      id: u.id,
      x: u.x,
      y: u.y,
      hp: u.hp,
      maxHp: u.maxHp,
      ball: u.holdingPayload,
      status: u.status,
      dodging: u.dodging,
      braced: u.braced,
    })),
    payload: s.payload,
    spark: s.spark,
    crackers: s.crackers,
    score: s.score,
    penaltyBox: s.penaltyBox,
  };
}

const decisions: Decision[] = [];
const mismatches: { seq: number; stored: MatchEvent | undefined; produced: MatchEvent | undefined }[] = [];
let cursor = 0;

/** Equal as data: jsonb hands keys back in its own order, so both sides are canonicalised first. */
function same(a: MatchEvent | undefined, b: MatchEvent | undefined): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)))
      : v,
  );
}

function check(produced: readonly MatchEvent[]): void {
  for (const event of produced) {
    if (!same(stored[cursor], event)) mismatches.push({ seq: cursor, stored: stored[cursor], produced: event });
    cursor++;
  }
}

const opened = openMatch(arena, match.kickoff.state);
check(opened.events);
let state = opened.state;

/** Whether `e` is one of the things that happen to a mover between two segments of one walk. */
function reactionTo(e: MatchEvent, mover: UnitId): boolean {
  switch (e.kind) {
    case 'opportunityAttacked':
      return e.targetId === mover;
    case 'damaged':
    case 'evacuated':
      return e.unitId === mover;
    case 'recoiled':
      return true;
    default:
      return false;
  }
}

/** The action that produced the events from `cursor` on, for the unit on the clock. */
function nextAction(unit: UnitId, current: MatchState): Action | null {
  for (let i = cursor; i < stored.length; i++) {
    const e = stored[i]!;
    switch (e.kind) {
      case 'moved': {
        if (e.unitId !== unit) continue;
        // One walk is logged in segments cut by the swings it draws: the
        // segments are stitched back together, two walks apart stay apart.
        const path: Point[] = [...e.path];
        let j = i + 1;
        for (;;) {
          let reacted = false;
          while (j < stored.length && reactionTo(stored[j]!, unit)) {
            if (stored[j]!.kind === 'opportunityAttacked') reacted = true;
            j++;
          }
          const next = stored[j];
          if (reacted && next && next.kind === 'moved' && next.unitId === unit) {
            path.push(...next.path);
            j++;
            continue;
          }
          break;
        }
        return { kind: 'move', path };
      }
      case 'dashed':
        if (e.unitId === unit) return { kind: 'dash' };
        continue;
      case 'dodging':
        if (e.unitId === unit) return { kind: 'dodge' };
        continue;
      case 'disengaged':
        if (e.unitId === unit) return { kind: 'disengage' };
        continue;
      case 'braced':
        if (e.unitId === unit) return { kind: 'brace' };
        continue;
      case 'attacked':
        if (e.attackerId === unit) return { kind: 'attack', targetId: e.targetId };
        continue;
      case 'shoved':
        if (e.shoverId === unit) return { kind: 'shove', targetId: e.targetId };
        continue;
      case 'passed':
        if (e.fromId === unit) return { kind: 'pass', targetId: e.toId };
        continue;
      case 'passIntercepted': {
        if (e.throwerId !== unit) continue;
        // The receiver of a stolen pass is not written down: the throw whose
        // lane produces the same contests is the one that was made.
        for (let j = i; j < stored.length; j++) {
          const later = stored[j]!;
          if (later.kind === 'passed' && later.fromId === unit) return { kind: 'pass', targetId: later.toId };
          if (later.kind === 'turnEnded' || (later.kind === 'turnStarted')) break;
        }
        const legal = legalActions(arena, current);
        for (const option of legal?.pass ?? []) {
          const trial = reduce(arena, current, { unitId: unit, action: { kind: 'pass', targetId: option.unitId } });
          if (!trial.ok) continue;
          const fits = trial.events.every((ev, k) => same(ev, stored[cursor + k]));
          if (fits) return { kind: 'pass', targetId: option.unitId };
        }
        return null;
      }
      case 'shotAtFurnace':
        if (e.unitId === unit) return { kind: 'shoot' };
        continue;
      case 'crackerBatted':
        if (e.unitId === unit) return { kind: 'batCracker', crackerId: e.crackerId, direction: e.direction };
        continue;
      case 'sparkCaught':
        if (e.unitId === unit) return { kind: 'catchSpark' };
        continue;
      case 'payloadGrabbed':
        if (e.unitId === unit) return { kind: 'grabPayload' };
        continue;
      case 'turnEnded':
        if (e.unitId === unit) return { kind: 'endTurn' };
        continue;
      case 'turnStarted':
        // Somebody else's turn began before this unit did anything we can
        // name: the turn ended without a `turnEnded`, which only a mover
        // carried off the field does, and that is a move already handled.
        if (e.unitId !== unit) return null;
        continue;
      default:
        continue;
    }
  }
  return null;
}

/**
 * Whether the stored action is the plan's first step. A walk cut short by the
 * swings it drew, its mover carried off the field, is logged as the cells it
 * managed and not as the route it sent: a rebuilt path that is a prefix of the
 * planned one is the same decision.
 */
function agree(planned: Action, played: Action): boolean {
  if (canonical(planned) === canonical(played)) return true;
  if (planned.kind !== 'move' || played.kind !== 'move') return false;
  if (played.path.length > planned.path.length) return false;
  return played.path.every((p, i) => p.x === planned.path[i]!.x && p.y === planned.path[i]!.y);
}

function unitOf(s: MatchState, id: UnitId): Unit {
  return s.units.find((u) => u.id === id)!;
}

let guard = 0;
while (state.phase !== 'finished' && state.turn && cursor < stored.length && guard++ < 5000) {
  const unitId = state.turn.unitId;
  const action = nextAction(unitId, state);
  if (!action) {
    console.error(`could not rebuild the action of ${unitId} at seq ${cursor} (${stored[cursor]?.kind})`);
    break;
  }
  const unit = unitOf(state, unitId);
  // Three plans in match.md, eight in the viewer: the question is often why a
  // plan lost, and the fourth to eighth say so.
  const plans = rankPlans(arena, state, unitId, orders).slice(0, 8);
  const result = reduce(arena, state, { unitId, action });
  if (!result.ok) {
    console.error(`the engine refused the rebuilt action of ${unitId} at seq ${cursor}: ${result.reason}`);
    break;
  }
  const first = plans[0]?.steps[0] ?? { kind: 'endTurn' };
  decisions.push({
    seq: cursor,
    round: state.round,
    unitId,
    human: humans.has(unitId),
    before: {
      at: { x: unit.x, y: unit.y },
      hp: unit.hp,
      holding: unit.holdingPayload,
      feetLeft: state.turn.movementFeetRemaining,
      actionUsed: state.turn.actionUsed,
    },
    board: snapshot(state),
    plans: plans.map((p) => ({ why: p.why, score: Math.round(p.score * 10) / 10, steps: p.steps.map(describe) })),
    played: action,
    produced: result.events,
    agrees: humans.has(unitId) ? null : agree(first, action),
  });
  check(result.events);
  state = result.state;
}

const leftover = stored.length - cursor;
console.log(
  `replayed ${decisions.length} decisions, ${mismatches.length} event mismatches, ${leftover} stored events not reached, final ${JSON.stringify(state.score)} ${state.phase}`,
);
for (const m of mismatches.slice(0, 5)) console.log(`  seq ${m.seq}: stored ${JSON.stringify(m.stored)}\n           replay ${JSON.stringify(m.produced)}`);

// -- The write-up -----------------------------------------------------------

function describe(a: Action): string {
  switch (a.kind) {
    case 'move': {
      const end = a.path[a.path.length - 1]!;
      return `move ${a.path.length} to (${end.x}, ${end.y})`;
    }
    case 'attack':
    case 'shove':
    case 'pass':
      return `${a.kind} ${a.targetId}`;
    case 'batCracker':
      return `batCracker ${a.crackerId} d8 ${a.direction}`;
    default:
      return a.kind;
  }
}

function roll(r: { rolled: number; bonus: number; total: number; against: number | null; mode: string }): string {
  const vs = r.against === null ? '' : ` vs ${r.against}`;
  const mode = r.mode === 'normal' ? '' : ` ${r.mode}`;
  return `d20 ${r.rolled}${r.bonus >= 0 ? '+' : ''}${r.bonus} = ${r.total}${vs}${mode}`;
}

const names = new Map<UnitId, string>();
for (const u of match.kickoff.state.units) names.set(u.id, `${u.name} (${u.team} ${u.role})`);
const nm = (id: UnitId): string => names.get(id) ?? id;

function line(e: MatchEvent): string | null {
  switch (e.kind) {
    case 'roundStarted':
    case 'turnStarted':
    case 'turnEnded':
      return null;
    case 'moved':
      return `${nm(e.unitId)} moves ${e.path.length} to (${e.to.x}, ${e.to.y})`;
    case 'dashed':
      return `${nm(e.unitId)} dashes`;
    case 'dodging':
      return `${nm(e.unitId)} dodges`;
    case 'disengaged':
      return `${nm(e.unitId)} disengages`;
    case 'braced':
      return `${nm(e.unitId)} digs in`;
    case 'damaged':
      return `${nm(e.unitId)} takes ${e.amount} (${e.hpAfter} left, ${e.source})`;
    case 'evacuated':
      return `${nm(e.unitId)} is evacuated`;
    case 'attacked':
      return `${nm(e.attackerId)} swings at ${nm(e.targetId)}: ${e.hit ? 'HIT' : 'miss'} (${roll(e.roll)})`;
    case 'recoiled':
      return `${nm(e.unitId)} recoils to (${e.to.x}, ${e.to.y})`;
    case 'opportunityAttacked':
      return `${nm(e.attackerId)} catches ${nm(e.targetId)} leaving: ${e.hit ? 'HIT' : 'miss'} (${roll(e.roll)})`;
    case 'passIntercepted':
      return `${nm(e.interceptorId)} grabs at the pass of ${nm(e.throwerId)}: ${e.success ? 'STOLEN' : 'missed'} (${roll(e.interceptorRoll)} vs ${roll(e.throwerRoll)})`;
    case 'shoved':
      return `${nm(e.shoverId)} shoves ${nm(e.targetId)}: ${e.success ? 'SHOVED' : 'held'} (${roll(e.shoverRoll)} vs ${roll(e.targetRoll)})${e.pushedTo ? `, pushed to (${e.pushedTo.x}, ${e.pushedTo.y})` : ''}`;
    case 'crackerMoved':
      return `${e.crackerId} rolls ${e.path.length} to (${e.to.x}, ${e.to.y})`;
    case 'crackerBatted':
      return `${nm(e.unitId)} bats ${e.crackerId} down d8 ${e.direction}: ${e.hit ? 'HIT' : 'miss'} (${roll(e.roll)})`;
    case 'crackerParried':
      return `${nm(e.unitId)} parries ${e.crackerId}: ${e.hit ? 'HIT' : 'miss'} (${roll(e.roll)}), d8 ${e.direction}`;
    case 'crackerDetonated':
      return `${e.crackerId} goes off on ${nm(e.targetId)} at (${e.at.x}, ${e.at.y}): ${e.damage} damage${e.saved ? ', saved' : ''}`;
    case 'crackerRespawned':
      return `${e.crackerId} reappears at (${e.at.x}, ${e.at.y})`;
    case 'sparkEntered':
      return `the Spark enters at (${e.at.x}, ${e.at.y})`;
    case 'sparkMoved':
      return `the Spark ${e.cause === 'escape' ? 'skips' : 'drifts'} to (${e.to.x}, ${e.to.y})`;
    case 'sparkCaught':
      return `${nm(e.unitId)} grabs at the Spark: ${e.caught ? 'CAUGHT' : 'miss'} (${roll(e.roll)})`;
    case 'relocated':
      return `${nm(e.unitId)} is moved out of the penalty box to (${e.to.x}, ${e.to.y})`;
    case 'payloadGrabbed':
      return `${nm(e.unitId)} picks up the Payload`;
    case 'payloadDropped':
      return `${nm(e.unitId)} drops the Payload at (${e.at.x}, ${e.at.y})`;
    case 'passed':
      return `${nm(e.fromId)} passes to ${nm(e.toId)}: ${e.caught ? 'CAUGHT' : 'dropped'} (${roll(e.roll)})`;
    case 'payloadScattered':
      return `the Payload rolls to (${e.to.x}, ${e.to.y})`;
    case 'shotAtFurnace':
      return `${nm(e.unitId)} shoots: ${e.scored ? 'GOAL' : 'miss'} (${roll(e.roll)})${e.blockedBy ? `, ${nm(e.blockedBy)} interposes` : ''}`;
    case 'substituteEntered':
      return `${nm(e.unitId)} enters at (${e.at.x}, ${e.at.y})`;
    case 'payloadReset':
      return `a fresh Payload ${e.carriedBy ? `in the hands of ${nm(e.carriedBy)}` : `at (${e.at.x}, ${e.at.y})`}`;
    case 'scored':
      return `**${e.team} scores ${e.points} (${e.source})**`;
    case 'matchEnded':
      return `**match over: ${JSON.stringify(e.result)}**`;
    case 'diceRolled':
      return `${nm(e.unitId)} rolls ${e.reason}: ${roll(e.roll)}`;
    default:
      return JSON.stringify(e);
  }
}

const md: string[] = [];
md.push(`# Match ${match.id.slice(0, 8)}, ${match.created_at.slice(0, 16).replace('T', ' ')} UTC`);
md.push('');
md.push(`> Dumped and replayed by \`scripts/dump-match.ts\` on ${new Date().toISOString().slice(0, 10)}. Team **${teamName(match.team_id)}**, ${match.tier}, engine ${match.engine_version}, seed ${match.rng_seed}. Final ${match.score_a}-${match.score_b}, ${match.winner ? `winner ${match.winner}` : match.is_draw ? 'draw' : match.phase}. Humans: ${participants.map((p) => `${p.character_name} = ${p.unit_id}`).join(', ') || 'none'}. Orders on the match row: ${JSON.stringify(orders)}.`);
md.push(`> Replay: ${decisions.length} decisions rebuilt, ${mismatches.length} event mismatches, ${leftover} stored events not reached. **plan** is what the AI of this checkout ranks first from that board (score in brackets, then the two runners-up); for an AI unit it is its reason, for a human it is what the AI would have done in its seat. **played** is what was actually sent. A line marked DIFFERS is an AI unit whose stored action is not this checkout's first plan.`);
md.push('');

let round = 0;
let turnOf: UnitId | null = null;
let decisionIndex = 0;
for (let seq = 0; seq < stored.length; seq++) {
  const e = stored[seq]!;
  if (e.kind === 'roundStarted') {
    round = e.round;
    md.push('', `## Round ${round}`, '');
    continue;
  }
  if (e.kind === 'turnStarted') {
    turnOf = e.unitId;
    const u = nm(e.unitId);
    md.push('', `### R${round} · ${u}${humans.has(e.unitId) ? ' · HUMAN' : ''}`, '');
    continue;
  }
  // Decisions taken at this point in the stream.
  while (decisionIndex < decisions.length && decisions[decisionIndex]!.seq <= seq) {
    const d = decisions[decisionIndex++]!;
    if (d.seq < seq) continue;
    const b = d.before;
    const top = d.plans[0];
    const tag = d.agrees === false ? ' · **DIFFERS**' : '';
    md.push(
      `- at (${b.at.x}, ${b.at.y}), ${b.hp} hp${b.holding ? ', ball' : ''}, ${b.feetLeft} ft${b.actionUsed ? ', Action spent' : ''} · plan: « ${top?.why ?? 'end turn'} » [${top?.score ?? 0}]${d.plans.slice(1, 3).map((p) => ` / « ${p.why} » [${p.score}]`).join('')} · played: ${describe(d.played)}${tag}`,
    );
  }
  const text = line(e);
  if (text) md.push(`  - ${text}`);
  void turnOf;
}

// -- Totals -----------------------------------------------------------------

md.push('', '## Totals', '');
const perUnit = new Map<UnitId, { turns: number; dashes: number; pocket: number; differs: number; decisions: number }>();
let currentTurn: { unitId: UnitId; used: boolean } | null = null;
const flush = (): void => {
  if (!currentTurn) return;
  const row = perUnit.get(currentTurn.unitId) ?? { turns: 0, dashes: 0, pocket: 0, differs: 0, decisions: 0 };
  row.turns++;
  if (!currentTurn.used) row.pocket++;
  perUnit.set(currentTurn.unitId, row);
};
for (const e of stored) {
  if (e.kind === 'turnStarted') {
    flush();
    currentTurn = { unitId: e.unitId, used: false };
  } else if (currentTurn) {
    const spends =
      (e.kind === 'dashed' || e.kind === 'dodging' || e.kind === 'disengaged' || e.kind === 'braced' || e.kind === 'shotAtFurnace' || e.kind === 'crackerBatted' || e.kind === 'sparkCaught') && e.unitId === currentTurn.unitId
        ? true
        : e.kind === 'attacked' && e.attackerId === currentTurn.unitId
          ? true
          : e.kind === 'shoved' && e.shoverId === currentTurn.unitId
            ? true
            : (e.kind === 'passed' && e.fromId === currentTurn.unitId) || (e.kind === 'passIntercepted' && e.throwerId === currentTurn.unitId);
    if (spends) currentTurn.used = true;
    if (e.kind === 'dashed' && e.unitId === currentTurn.unitId) {
      const row = perUnit.get(currentTurn.unitId) ?? { turns: 0, dashes: 0, pocket: 0, differs: 0, decisions: 0 };
      row.dashes++;
      perUnit.set(currentTurn.unitId, row);
    }
  }
}
flush();
for (const d of decisions) {
  const row = perUnit.get(d.unitId) ?? { turns: 0, dashes: 0, pocket: 0, differs: 0, decisions: 0 };
  row.decisions++;
  if (d.agrees === false) row.differs++;
  perUnit.set(d.unitId, row);
}
md.push('| Unit | Turns | Decisions | Dashes | Action unused | Differs from this checkout |');
md.push('|---|---|---|---|---|---|');
for (const [id, row] of [...perUnit.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  md.push(`| ${nm(id)}${humans.has(id) ? ' HUMAN' : ''} | ${row.turns} | ${row.decisions} | ${row.dashes} | ${row.pocket} | ${humans.has(id) ? '' : row.differs} |`);
}
const totals = [...perUnit.values()].reduce(
  (a, r) => ({ turns: a.turns + r.turns, pocket: a.pocket + r.pocket, dashes: a.dashes + r.dashes, differs: a.differs + r.differs }),
  { turns: 0, pocket: 0, dashes: 0, differs: 0 },
);
md.push('', `Turns ${totals.turns}, Action unused ${totals.pocket}, dashes ${totals.dashes}, AI decisions differing from this checkout ${totals.differs}.`);

await writeFile(join(outDir, 'match.md'), md.join('\n') + '\n');

// -- The viewer -------------------------------------------------------------
//
// `viewer.html` is `scripts/match-viewer.html` with the match poured into it:
// one board per decision, the events it produced, the plans the AI ranked, so
// the match can be read round by round and player by player on a drawn pitch
// instead of in coordinates. Self-contained, opens from the disk or as an
// artifact. The template is read from the working directory because esbuild
// bundles this script into a temporary file.

const viewer = {
  match: {
    id: match.id,
    createdAt: match.created_at,
    finishedAt: match.finished_at,
    tier: match.tier,
    engine: match.engine_version,
    team: teamName(match.team_id),
    score: { A: match.score_a, B: match.score_b },
    winner: match.winner,
    draw: match.is_draw,
    humans: participants.map((p) => ({ unitId: p.unit_id, name: p.character_name })),
    replay: { decisions: decisions.length, mismatches: mismatches.length, leftover },
  },
  arena: { rows: KILL_SILO.rows, furnaces: KILL_SILO.furnaces, starts: KILL_SILO.starts },
  units: match.kickoff.state.units.map((u) => ({ id: u.id, name: u.name, team: u.team, role: u.role, tier: u.tier })),
  decisions: decisions.map((d) => ({
    seq: d.seq,
    round: d.round,
    unitId: d.unitId,
    human: d.human,
    before: d.before,
    board: d.board,
    plans: d.plans,
    played: describe(d.played),
    agrees: d.agrees,
    events: d.produced,
    lines: d.produced.map(line).filter((l): l is string => l !== null),
  })),
  final: snapshot(state),
};
const template = await readFile(join(process.cwd(), 'scripts', 'match-viewer.html'), 'utf8');
const poured = JSON.stringify(viewer).replace(/<\//g, '<\\/');
if (!template.includes('__MATCH_DATA__')) throw new Error('scripts/match-viewer.html has no __MATCH_DATA__ slot');
const title = `${teamName(match.team_id)}, ${match.created_at.slice(0, 10)}`;
await writeFile(
  join(outDir, 'viewer.html'),
  template.replace('__MATCH_TITLE__', () => title).replace('__MATCH_DATA__', () => poured),
);
console.log(`written to ${outDir} (match.md, viewer.html)`);
