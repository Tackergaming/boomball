/**
 * Orders posted to AI team-mates.
 *
 * In solo a human pilots one player out of fourteen, so the orders channel is
 * not a convenience: it is most of what the player actually does. Six of the
 * seven shirts on their own side are driven from here.
 *
 * **An order biases the priority table, it never replaces it.** A Bulwark told
 * to hold a cell in The Summit still blocks the shot that comes at its Furnace,
 * and a Breaker told to mark a Striker still grabs a loose Payload at its feet.
 * Orders that overrode the table would turn team-mates into puppets, and the
 * first thing a player would notice is that ordered units play worse.
 */

import type { Point } from '../engine/geometry.js';
import type { UnitId } from '../engine/types.js';

/** Ask the addressee to send the Payload to a particular player. */
export interface CallForPassOrder {
  readonly kind: 'callForPass';
  readonly to: UnitId;
  readonly receiverId: UnitId;
}

/** Point the addressee at one opponent, to hit, shove and follow. */
export interface MarkTargetOrder {
  readonly kind: 'markTarget';
  readonly to: UnitId;
  readonly targetId: UnitId;
}

/** Send the addressee to a cell and keep it there. */
export interface HoldZoneOrder {
  readonly kind: 'holdZone';
  readonly to: UnitId;
  readonly at: Point;
}

export type AllyOrder = CallForPassOrder | MarkTargetOrder | HoldZoneOrder;

/**
 * The standing orders for one player. An order lives until it is replaced, so
 * the same list is handed to every decision that unit makes.
 */
export function ordersFor(orders: readonly AllyOrder[], unitId: UnitId): AllyOrder[] {
  return orders.filter((order) => order.to === unitId);
}

export function findOrder<K extends AllyOrder['kind']>(
  orders: readonly AllyOrder[],
  kind: K,
): Extract<AllyOrder, { kind: K }> | null {
  const found = orders.find((order) => order.kind === kind);
  return (found as Extract<AllyOrder, { kind: K }> | undefined) ?? null;
}
