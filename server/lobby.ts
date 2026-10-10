/**
 * Opening a match, with no database in it.
 *
 * Same division as `session.ts`, for the same reason: everything that decides
 * anything lives here where a test can reach it in milliseconds, and the Edge
 * Function on top is left with loading, writing and broadcasting. What this
 * layer owns is the lobby's own question, **is this a party that may start a
 * match**, and then handing back every row the caller has to write.
 *
 * No rule of the sport lives here either. The position, the initiative and the
 * kick-off are `createMatch` and `openSession`'s business; this file only
 * refuses malformed parties and passes the rest through.
 *
 * ## What a client is not allowed to choose
 *
 * Two fields are deliberately absent from the request and computed by the
 * caller instead, and both are the difference between a lobby and a cheat:
 *
 * - **The Tier.** Read off the team's generated column, never sent. A client
 *   that named its own Tier would field Star players in its first match
 * - **The seed.** Made server-side. A client that sent one could open the same
 *   match over and over until it liked the kick-off, which in a game whose
 *   whole determinism claim rests on the seed is the cheapest exploit there is
 *
 * ## Why refusals rather than the engine's exceptions
 *
 * `createMatch` already throws on a party of four, on a repeated player, and on
 * three Bulwarks when a team fields one. Those are the right assertions for an
 * engine, which may treat them as impossible, and the wrong answer for a lobby,
 * where they are simply a form filled in badly. So every one of them is checked
 * here first and turned into a reason a client can display, and the engine's
 * throws stay as the backstop they were meant to be.
 */

import type { ArenaSpec } from '../engine/arena.js';
import { Arena } from '../engine/arena.js';
import { createMatch, MAX_HUMANS, type HumanSeat } from '../engine/setup.js';
import { ROLES, TEAM_COMPOSITION, type Role, type Tier } from '../engine/stats.js';
import { isHuman, type MatchState, type UnitId } from '../engine/types.js';
import { openSession, type Refusal, type SessionStep } from './session.js';

/** What the `character_name` columns accept, and so what the lobby accepts. */
const NAME_LIMIT = 40;

export interface SeatRequest {
  readonly profileId: string;
  readonly role: Role;
  /** Blank or absent falls back to the Giff name pool, as at the table. */
  readonly characterName?: string;
}

export interface LobbyRequest {
  /** Who is asking. Must be sitting in the match they are opening. */
  readonly callerId: string;
  readonly tier: Tier;
  readonly seats: readonly SeatRequest[];
  readonly seed: number;
  readonly now: number;
}

/** One `match_participants` row, with the name the engine actually settled on. */
export interface SeatAssignment {
  readonly unitId: UnitId;
  readonly profileId: string;
  readonly role: Role;
  readonly characterName: string;
}

export interface OpenedMatch extends SessionStep {
  readonly seats: readonly SeatAssignment[];
  /**
   * The board as it stood **before** the opening events: every unit on its
   * start cell, the ball at the centre, nobody on the clock. The snapshot the
   * function writes is the board after the house has played up to the first
   * human, so without this a client that loads a fresh match sees the house
   * already in place and never watches it get there (Jérôme's retour 2 on the
   * engine 3 game). The client replays `events` from here, once.
   */
  readonly kickoff: MatchState;
}

export type LobbyResult = { readonly ok: true; readonly opening: OpenedMatch } | Refusal;

function no(reason: string): Refusal {
  return { ok: false, reason };
}

/**
 * The party, checked; then the kick-off, played through to the first human.
 *
 * The events handed back are the whole opening, `roundStarted` included and any
 * AI turns that come before the first human decision, and they are numbered
 * from 0 by the caller. That is why the caller must write them before anything
 * else can act on the match: `resolve-action` continues the sequence from the
 * snapshot's `seq`, and a snapshot written without its events would leave a
 * match whose history starts in the middle.
 */
export function openLobbyMatch(arena: ArenaSpec, request: LobbyRequest): LobbyResult {
  const { seats } = request;

  if (seats.length === 0) return no('a match needs at least one player');
  if (seats.length > MAX_HUMANS) {
    return no(`a team seats at most ${MAX_HUMANS} players, got ${seats.length}`);
  }

  const seen = new Set<string>();
  for (const seat of seats) {
    if (typeof seat.profileId !== 'string' || seat.profileId.length === 0) {
      return no('every seat needs a player');
    }
    if (seen.has(seat.profileId)) return no('a player cannot take two seats in the same match');
    seen.add(seat.profileId);

    if (!ROLES.includes(seat.role)) return no(`there is no such role as ${String(seat.role)}`);

    const name = seat.characterName?.trim() ?? '';
    if (name.length > NAME_LIMIT) {
      return no(`a character name runs to ${NAME_LIMIT} characters at most`);
    }
  }

  // The caller opens a match they are playing in. Opening one for other people
  // is not a feature the lobby has, and allowing it would let anyone on a team
  // start matches in their team-mates' names.
  if (!seen.has(request.callerId)) return no('you cannot open a match you are not playing in');

  for (const role of new Set(seats.map((seat) => seat.role))) {
    const claimed = seats.filter((seat) => seat.role === role).length;
    const fielded = TEAM_COMPOSITION.filter((r) => r === role).length;
    if (claimed > fielded) {
      return no(`a team fields ${fielded} ${role}${fielded === 1 ? '' : 's'}, ${claimed} were claimed`);
    }
  }

  const humans: HumanSeat[] = seats.map((seat) => {
    const name = seat.characterName?.trim() ?? '';
    return name ? { humanId: seat.profileId, role: seat.role, name } : {
      humanId: seat.profileId,
      role: seat.role,
    };
  });

  const state = createMatch({ arena, tier: request.tier, humans, seed: request.seed });
  const step = openSession(new Arena(arena), state, request.now);

  // Read the seats back off the board rather than off the request: the unit id
  // is the engine's to hand out, and a player who left the name blank has been
  // given one from the pool that the roster has to show.
  const assigned: SeatAssignment[] = step.session.state.units
    .filter((unit) => isHuman(unit))
    .map((unit) => ({
      unitId: unit.id,
      profileId: unit.controller.kind === 'human' ? unit.controller.humanId : '',
      role: unit.role,
      characterName: unit.name,
    }));

  return { ok: true, opening: { ...step, seats: assigned, kickoff: state } };
}
