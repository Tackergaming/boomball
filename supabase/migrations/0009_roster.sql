-- The battery's standing roster (2H.29, `00` C30 point 3).
--
-- Until now every name on the field but the human's was drawn afresh at each
-- match from the match's seed, so Jérôme's Bulwark was Quill one evening and
-- Hamm the next, and a Quill could turn up on the other side. He wants his
-- team-mates to be the same Giff every match: « je veux que mon bulwark soit
-- toujours le même gars ».
--
-- `roster` holds seven names keyed by slot (`striker-1` to `striker-3`,
-- `breaker-1`, `breaker-2`, `bulwark-1`, `trajector-1`, see `engine/setup.ts`
-- `rosterSlots`). It is null until the battery's first match, when
-- `create-match` draws it with the match's RNG, avoiding the humans' own names,
-- and writes it with the service role. Nothing else writes it, ever: no
-- renaming, by his decision. The opposing side draws its names per match and
-- avoids these seven and the human's. Readable through the existing
-- `teams_read` policy, like every other team column.

alter table teams add column roster jsonb;
