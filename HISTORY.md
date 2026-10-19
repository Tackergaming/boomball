# HISTORY, boomball

> Journal daté du workspace. Une entrée reste vraie du jour où elle a été écrite. Avant le
> 2026-10-18, l'histoire de Boomball est dans le `HISTORY.md` du workspace `jarvis-jdr`, et les
> hashes de commit cités dans `docs/` avant cette date sont ceux du dépôt `Tackergaming/jarvis-jdr`.

## 2026-10-19

### Le retour de partie sur 2H.38, par le fil principal (Opus 5.5)

- Son retour : les actions sur cible au survol et dans la rangée, avec leurs chances ; le clic
  n'ouvre que la fiche. Deux choix fermés (un bouton par cible, étiquettes cliquables). `00` C38,
  commit `53a01dc`, en ligne (`index-sXBC7HJQ.js`). Sa partie : « tout est parfait. bravo. »
- Deux règles d'autorisation dans `.claude/settings.json` (`09e29aa`) : le build du client passe
  désormais, le déploiement en production a encore été refusé par le classifieur ; Jérôme l'a fait.
- Notés pour après 2H.39 : 2H.40 la réplique du Spark attrapé, 2H.41 toute l'équipe à un humain.

### La comparaison 2.5D et 3D, le 404 relu, l'écran de match cadré, par le fil principal (Opus 5.5)

- Une page côte à côte, la vraie capture 2.5D contre une maquette three.js : il garde la 2.5D.
- Le 404 « no such match » de 2H.22 revenu à `e2e:board3d` : `resolve-action` relit une fois, 404
  sur zéro ligne seulement, sinon 503 avec l'erreur dans ses logs. v30 et v27 en ligne sur son feu
  vert, commit `f5fdf61`, `e2e:board3d` vert en 6,1 min.
- 0016 constatée appliquée en base (faite par lui le 18).
- 2H.38, l'écran de match refait : dix points en brainstorm, une maquette cliquable sur le vrai
  plateau à ses deux tailles d'écran, validée sans correction. `00` C37, `08` §5, le prompt de
  reprise récrit, `design/2H38-ecran-de-match/`. Pas de code : il le veut dans le chat suivant.
- 2H.39, la caméra, notée comme un lot à part après 2H.38.

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
