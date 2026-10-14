/**
 * Eighteen self-play matches, six seeds per Tier, to see that the sport still
 * plays after 2H.14: goals, strips (écart 61) and the free pass that follows
 * them (écart 63), the Trajector's first turn at the kick-off (`00` C16 point
 * 1: never nearer its own mouth, ends within a pass of the ball). Not a sweep.
 *
 *   node scripts/run-ts.mjs scripts/control-2h14.ts
 */
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { PAYLOAD_RANGE_CELLS } from '../engine/constants.js';
import { distance } from '../engine/geometry.js';
import type { MatchEvent } from '../engine/events.js';
import { playSeed } from '../ai/selfPlay.js';

const BALL = { x: 7, y: 22 };
const tiers = ['rookie', 'veteran', 'star'] as const;
for (const tier of tiers) {
  let goals = 0;
  let strips = 0;
  let shoves = 0;
  let freePasses = 0;
  let freeStolen = 0;
  let trajKickoff = 0;
  let trajBack = 0;
  let trajTurns = 0;
  let trajInReach = 0;
  const ends: string[] = [];
  let ms = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const t0 = Date.now();
    const result = playSeed(KILL_SILO, tier, seed);
    ms += Date.now() - t0;
    const events = result.events as readonly MatchEvent[];
    let round = 0;
    let current: string | null = null;
    let stripper: string | null = null;
    let firstGrab = true;
    // The Trajectors' first turn: the cell of its first step, and the cell of
    // its last one. A Trajector that never moved in round 1 is not counted.
    const start = new Map<string, { x: number; y: number }>();
    const end = new Map<string, { x: number; y: number }>();
    for (const e of events) {
      if (e.kind === 'roundStarted') round = e.round;
      if (e.kind === 'scored' && e.source === 'payload') goals++;
      if (e.kind === 'turnStarted') {
        current = e.unitId;
        stripper = null;
      }
      if (e.kind === 'shoved' && e.success) {
        shoves++;
        if (e.tookPayload) {
          strips++;
          stripper = e.shoverId;
        }
      }
      if (e.kind === 'passed' && e.fromId === stripper && current === stripper) freePasses++;
      if (e.kind === 'passIntercepted' && e.throwerId === stripper && current === stripper) {
        freePasses++;
        if (e.success) freeStolen++;
      }
      if (e.kind === 'payloadGrabbed' && firstGrab) {
        firstGrab = false;
        if (e.unitId.includes('trajector')) trajKickoff++;
      }
      if ((e.kind === 'moved' || e.kind === 'recoiled') && round === 1 && e.unitId.includes('trajector')) {
        if (!start.has(e.unitId)) start.set(e.unitId, { x: e.from.x, y: e.from.y });
        end.set(e.unitId, { x: e.to.x, y: e.to.y });
      }
    }
    for (const [id, from] of start) {
      const to = end.get(id);
      if (!to) continue;
      trajTurns++;
      const ownY = id.startsWith('A') ? 0 : 44;
      if (Math.abs(to.y - ownY) < Math.abs(from.y - ownY)) trajBack++;
      if (distance(to, BALL) <= PAYLOAD_RANGE_CELLS) trajInReach++;
      ends.push(`${id.slice(0, 1)}(${to.x},${to.y})`);
    }
  }
  console.log(
    `${tier}: ${(goals / 6).toFixed(1)} goals/match, shoves ${shoves} of which strips ${strips}, free passes after a strip ${freePasses} (stolen ${freeStolen}), trajector took kick-off ${trajKickoff}/6, trajector round 1: ${trajBack}/${trajTurns} went back, ${trajInReach}/${trajTurns} ended within a pass of the ball, ${(ms / 6 / 1000).toFixed(2)} s/match`,
  );
  console.log(`  round-1 Trajector ends: ${ends.join(' ')}`);
}
