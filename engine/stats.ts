/**
 * Role and Tier statistics, copied verbatim from Jérôme's table fiche.
 *
 * This is data, not logic. Rebalancing the sport means editing this table and
 * nothing else.
 *
 * Three bonus columns. Two are the fiche's own groupings: `might` covers melee
 * attacks and Athletics, `agility` covers Acrobatics checks and Dexterity
 * saving throws.
 *
 * `aim` is the third, added on 2026-09-01, and it is the one thing that used to
 * be folded into `might`. Every throw of the Payload reads it: the pass and the
 * shot. Splitting it fixed a defect nobody had noticed. With one column, a Star
 * Breaker threw at +8 and a Star Striker at +4, so **the role that scores was
 * the worse shooter of the two**. It also lets the throwing game scale against
 * a Furnace that does not, which is where the feeling of a higher league lives.
 */

export const ROLES = ['striker', 'breaker', 'bulwark', 'trajector'] as const;
export type Role = (typeof ROLES)[number];

export const TIERS = ['rookie', 'veteran', 'star'] as const;
export type Tier = (typeof TIERS)[number];

/** Whether `value` names a Tier: what a request body sends is a string, not a Tier. */
export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

/**
 * Whether a battery that stands at `reached` may open a match at `requested`
 * (2H.27, `00` C28): at its own Tier or any below, never above. The Tier a
 * match is played at is the difficulty of both sides, so a Rookie battery
 * asking for Star would field Star against Star in its first match. Rookie is
 * always allowed: there is nothing below it.
 */
export function tierAllowed(requested: Tier, reached: Tier): boolean {
  return TIERS.indexOf(requested) <= TIERS.indexOf(reached);
}

export interface RoleStats {
  readonly hp: number;
  readonly ac: number;
  /** Melee attack and Athletics. Never a throw. */
  readonly might: number;
  /** Every throw of the Payload: the pass and the shot at the Furnace. */
  readonly aim: number;
  /** Acrobatics checks and Dexterity saving throws. */
  readonly agility: number;
}

export const ROLE_STATS: Readonly<Record<Role, Readonly<Record<Tier, RoleStats>>>> = {
  striker: {
    rookie: { hp: 30, ac: 13, might: 2, aim: 7, agility: 4 },
    veteran: { hp: 40, ac: 14, might: 3, aim: 9, agility: 6 },
    star: { hp: 50, ac: 15, might: 4, aim: 11, agility: 8 },
  },
  breaker: {
    rookie: { hp: 50, ac: 12, might: 4, aim: 3, agility: 1 },
    veteran: { hp: 65, ac: 13, might: 6, aim: 4, agility: 2 },
    star: { hp: 85, ac: 14, might: 8, aim: 5, agility: 3 },
  },
  bulwark: {
    rookie: { hp: 40, ac: 19, might: 3, aim: 2, agility: 2 },
    veteran: { hp: 55, ac: 21, might: 4, aim: 3, agility: 3 },
    star: { hp: 70, ac: 25, might: 5, aim: 4, agility: 4 },
  },
  trajector: {
    rookie: { hp: 25, ac: 14, might: 0, aim: 7, agility: 5 },
    veteran: { hp: 35, ac: 15, might: 1, aim: 9, agility: 7 },
    star: { hp: 45, ac: 16, might: 2, aim: 11, agility: 10 },
  },
};

export function statsFor(role: Role, tier: Tier): RoleStats {
  return ROLE_STATS[role][tier];
}

/** The seven starters of a team, in the composition the sport requires. */
export const TEAM_COMPOSITION: readonly Role[] = [
  'striker',
  'striker',
  'striker',
  'breaker',
  'breaker',
  'bulwark',
  'trajector',
];
