/**
 * Eighteen self-play matches, six seeds per Tier, to see that the sport still
 * plays after 2H.13: goals, strips (écart 61), Spark catches and returns
 * (écarts 59, 60), stolen keeper relaunches (C15 point 4), shooter regrabs
 * (point 3), the Trajector's kick-off pickups (point 1). Not a sweep.
 *
 *   node scripts/run-ts.mjs scripts/control-2h13.ts
 */
import { KILL_SILO } from '../engine/arenas/kill-silo.js';
import { distance } from '../engine/geometry.js';
import type { MatchEvent } from '../engine/events.js';
import { playSeed } from '../ai/selfPlay.js';

const tiers = ['rookie', 'veteran', 'star'] as const;
for (const tier of tiers) {
  let goals = 0;
  let strips = 0;
  let shoves = 0;
  let catches = 0;
  let entries = 0;
  let keeperPasses = 0;
  let keeperStolen = 0;
  let regrabs = 0;
  let trajKickoff = 0;
  let driftTowards = 0;
  let drifts = 0;
  let ms = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const t0 = Date.now();
    const result = playSeed(KILL_SILO, tier, seed);
    ms += Date.now() - t0;
    const events = result.events as readonly MatchEvent[];
    let shooter: string | null = null;
    let current: string | null = null;
    let firstGrab = true;
    let trajectorsAt: { x: number; y: number }[] = [];
    const positions = new Map<string, { x: number; y: number; role: string }>();
    for (const u of result.state.units) positions.set(u.id, { x: u.x, y: u.y, role: u.role });
    for (const e of events) {
      if (e.kind === 'scored' && e.source === 'payload') goals++;
      if (e.kind === 'shoved' && e.success) {
        shoves++;
        if (e.tookPayload) strips++;
      }
      if (e.kind === 'sparkCaught' && e.caught) catches++;
      if (e.kind === 'sparkEntered') entries++;
      if (e.kind === 'passed' && e.fromId.includes('bulwark')) keeperPasses++;
      if (e.kind === 'passIntercepted' && e.success && e.throwerId.includes('bulwark')) keeperStolen++;
      if (e.kind === 'turnStarted') {
        current = e.unitId;
        shooter = null;
      }
      if (e.kind === 'shotAtFurnace' && !e.scored) shooter = e.unitId;
      if (e.kind === 'payloadGrabbed') {
        if (shooter === e.unitId && current === e.unitId) regrabs++;
        if (firstGrab) {
          firstGrab = false;
          if (e.unitId.includes('trajector')) trajKickoff++;
        }
      }
      if (e.kind === 'sparkMoved' && e.cause === 'drift') {
        drifts++;
        const first = e.path[0];
        if (first && trajectorsAt.some((t) => distance(first, t) < distance(e.from, t))) driftTowards++;
      }
      // Track Trajector positions roughly through moved/recoiled events.
      if (e.kind === 'moved' || e.kind === 'recoiled') {
        const p = positions.get(e.unitId);
        if (p) positions.set(e.unitId, { ...p, x: e.to.x, y: e.to.y });
      }
      trajectorsAt = [...positions.values()].filter((p) => p.role === 'trajector').map((p) => ({ x: p.x, y: p.y }));
    }
  }
  console.log(
    `${tier}: ${(goals / 6).toFixed(1)} goals/match, shoves ${shoves} of which strips ${strips}, spark entries ${entries} catches ${catches}, keeper passes ${keeperPasses} stolen ${keeperStolen}, shooter regrabs ${regrabs}, trajector took kick-off ${trajKickoff}/6, drifts towards a Trajector ${driftTowards}/${drifts}, ${(ms / 6 / 1000).toFixed(2)} s/match`,
  );
}
