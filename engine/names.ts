/**
 * Names for the units nobody named.
 *
 * A human names their own player at the lobby, and that name is kept on their
 * account. Everyone else on the field needs one too, and in solo that is
 * thirteen of the fourteen. Role labels like "Striker 2" would be honest and
 * dead: a team-mate you shout at should have a name.
 *
 * Names are drawn with the match's seeded RNG, so the same seed fields the same
 * two teams every replay, and a match can be read back from `match_events`
 * without storing fourteen strings alongside it.
 */

import type { Rng } from './rng.js';

const GIVEN = [
  'Voss', 'Murrin', 'Ogga', 'Tullin', 'Hamm', 'Derro', 'Nib', 'Kregg',
  'Brann', 'Gullo', 'Thessa', 'Wrenna', 'Dolm', 'Harrow', 'Bexley', 'Corvo',
  'Ulmo', 'Petra', 'Sarn', 'Vandy', 'Grimm', 'Halsa', 'Renk', 'Osric',
  'Marrow', 'Pell', 'Quill', 'Tobb', 'Vesk', 'Yarrow',
] as const;

const SURNAMES = [
  'Ardent', 'Thack', 'Brasshorn', 'Spyre', 'Rivet', 'Keg', 'Grapple', 'Rossel',
  'Ironmaw', 'Flintlock', 'Cannonade', 'Ramrod', 'Breechlock', 'Capstan',
  'Gunwale', 'Sparshot', 'Emberkell', 'Slagborn', 'Halyard', 'Powderkin',
  'Tarrow', 'Vantch', 'Oakes', 'Bellows',
] as const;

/**
 * `count` distinct names, avoiding anything in `taken`, which is how a name a
 * player typed for themselves keeps the pool off it. Throws rather than
 * repeating: two Voss Ardents on the same field would make the initiative
 * ladder unreadable.
 */
export function drawNames(count: number, rng: Rng, taken: Iterable<string> = []): string[] {
  const capacity = GIVEN.length * SURNAMES.length;
  if (count > capacity) {
    throw new Error(`asked for ${count} names, the pool holds ${capacity}`);
  }

  const reserved = new Set([...taken].map(normalise));
  const drawn: string[] = [];

  // Bounded so a pathological RNG cannot spin here forever.
  for (let attempt = 0; drawn.length < count && attempt < count * 200; attempt++) {
    const name = `${rng.pick(GIVEN)} ${rng.pick(SURNAMES)}`;
    if (reserved.has(normalise(name))) continue;
    reserved.add(normalise(name));
    drawn.push(name);
  }

  if (drawn.length < count) {
    throw new Error(`could not draw ${count} distinct names`);
  }
  return drawn;
}

function normalise(name: string): string {
  return name.trim().toLowerCase();
}
