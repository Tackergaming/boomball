/**
 * The request shapes the client sends to the Edge Functions, with no client in
 * them, so a pure module (and its test) can import them without the Supabase
 * client of `supabase.ts`, which throws without its environment.
 */

import type { Role } from '../../../engine/stats.js';

export interface SeatRequest {
  profileId: string;
  role: Role;
  characterName?: string;
}
