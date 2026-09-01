/**
 * The four priority tables, and the one lookup that reaches them.
 *
 * Same shape as `engine/stats.ts`: a role names a column of numbers, and
 * nothing else in the AI knows which role it is playing.
 */

import type { Role } from '../../engine/stats.js';
import { BREAKER } from './breaker.js';
import { BULWARK } from './bulwark.js';
import { STRIKER } from './striker.js';
import { TRAJECTOR } from './trajector.js';
import type { RoleWeights } from './weights.js';

export type { RoleWeights };
export { BREAKER, BULWARK, STRIKER, TRAJECTOR };

export const ROLE_WEIGHTS: Readonly<Record<Role, RoleWeights>> = {
  striker: STRIKER,
  breaker: BREAKER,
  bulwark: BULWARK,
  trajector: TRAJECTOR,
};

export function weightsFor(role: Role): RoleWeights {
  return ROLE_WEIGHTS[role];
}
