---
name: commit
description: "Commiter et pousser l'état du workspace Boomball, sans faire valider le message."
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
---

# Commiter et pousser

---

## Étape 1 : état des lieux

Lance en parallèle :

- `git status`
- `git diff`
- `git log --oneline -10`, pour le style des messages précédents

---

## Étape 2 : vérification de sécurité

Avant tout `git add`, vérifie que rien de sensible ne traîne dans les fichiers modifiés ou non
suivis :

- `.env` ne doit jamais apparaître dans `git status`, le `.gitignore` doit le bloquer. S'il
  apparaît, **arrête-toi et préviens Jérôme** au lieu de l'ajouter
- Si un fichier au nom anodin contient une clé, un token ou un mot de passe en clair, signale-le
  avant de l'ajouter

---

## Étape 3 : rédiger le message et commit

Rédige un message concis, à l'impératif, en français, qui explique **le pourquoi plutôt que le
quoi**, puis **commit directement, sans le faire valider**.

Ajoute précisément les fichiers concernés, pas de `git add -A` aveugle. Lance `git status` après
pour confirmer que tout est propre.

**Le shell est bash, pas PowerShell.** Un message multiligne passe par un heredoc :

```
git commit -m "$(cat <<'EOF'
Sujet à l'impératif

Le corps.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

La syntaxe here-string de PowerShell, `@'...'@`, produit un `@` parasite en première ligne du
message, ce qui casse le sujet du commit. C'est arrivé le 2026-09-06.

---

## Étape 4 : pousser

**« Commit » veut dire commit puis push**, décision de Jérôme du 2026-10-18 : il ne veut plus avoir à
dire « push ». Lance `git push` juste après le commit, puis `git status -sb` : la première ligne ne
doit plus montrer d'avance sur `origin/main`.

**Un push qui échoue se dit tout de suite**, avec son message d'erreur recopié, avant tout autre
chose. Ne le relance pas en `--force`, ne contourne rien : le commit reste en local et Jérôme décide.

---

## Étape 5 : rendre compte

Deux lignes maximum : ce qui a été commité et poussé, et sous quel message. **Si le message est parti
malformé, le dire immédiatement**, tant que le commit est encore la tête et qu'un `--amend` reste
trivial.

---

## Règles

- **Le message ne se fait pas valider**, il se rédige et se commit. Les vraies décisions à poser à
  Jérôme sont ailleurs : quels fichiers inclure quand il y a du bruit
- Jamais de commit sans demande explicite de Jérôme, et aucun sous-agent ne commite
- Jamais de `--force`
- Jamais de `--no-verify`, `--amend` ou de réécriture d'historique sauf demande explicite
- Si `git status` montre des fichiers inattendus (gros binaires, dossiers entiers non prévus),
  demande avant de les inclure
- **Ne jamais forcer l'ajout de `assets/source/`, `e2e/out/` ni `backups/`.** Les sources d'assets
  pèsent 153 Mo, les captures se refont à chaque run, les exports contiennent les codes
  d'invitation, et git conserve chaque version à jamais. Un `git add -f` est irréversible
- `desktop.ini` est un artefact Windows, il ne se commit pas
- **Le répertoire de mémoire est hors du dépôt** et n'est jamais sauvegardé par ce skill
- Les clés sont préfixées `SUPABASE_BOOMBALL_`, plus `SUPABASE_API_KEY_BOOMBALL`, `VERCEL_TOKEN`,
  `VERCEL_TEAM_ID` et les quatre `BOOMBALL_E2E`. `client/.env.local` et `e2e/.auth/` ne se
  commitent jamais non plus
