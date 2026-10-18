# HISTORY, boomball

> Journal daté du workspace. Une entrée reste vraie du jour où elle a été écrite. Avant le
> 2026-10-18, l'histoire de Boomball est dans le `HISTORY.md` du workspace `jarvis-jdr`, et les
> hashes de commit cités dans `docs/` avant cette date sont ceux du dépôt `Tackergaming/jarvis-jdr`.

## 2026-10-18

### Le déménagement depuis jarvis-jdr, par le fil principal (Opus 5.5) et deux porteurs (Opus 5.5)

- Extrait par `git subtree split --prefix=boomball` : les 85 commits qui touchaient `boomball/`,
  hashes réécrits, contenu à la racine. Dépôt privé `Tackergaming/boomball`.
- Rendu autonome : `.gitignore` propre (il n'en existait pas), le `.env` réduit aux douze variables
  Boomball, les six chargeurs du `.env` ramenés d'un niveau, les deux workflows sans le préfixe
  `boomball/`, `.mcp.json`, les skills `boomball`, `supabase-migrate` et `commit`, `check_drift.py`,
  `CONTEXT.md` (l'ancien volet 2), un CLAUDE.md maigre et le style `Boomball`, trois mémoires.
- Copiés hors git : `assets/source/` (153 Mo), `backups/`, `client/.env.local`. Laissés dans
  l'ancien dossier : les captures `e2e/out/` (806 Mo).
