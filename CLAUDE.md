# CLAUDE.md, workspace Boomball

> Ce workspace porte Boomball, le jeu vidéo web du sport giff de ma campagne : le code, la base
> Supabase et le déploiement. Il a été extrait de `jarvis-jdr` le 2026-10-18, avec son historique.
> Il ne porte que ce qui doit être vrai avant de savoir sur quoi on travaille ; le détail vit dans
> les skills. La façon de me parler est dans le style de sortie `Boomball`.

## Garde-fous

- **Skill `boomball` avant toute action** sur le code, la base ou le déploiement, et skill
  `supabase-migrate` avant d'écrire ou d'appliquer une migration.
- **Le jeu est en ligne** à `https://boomball.vercel.app`. Redéployer le client en production ou les
  fonctions change le jeu en ligne : seulement sur mon feu vert. Les écritures destructives en base
  passent par moi.
- **Le workflow `supabase-keepalive` garde la base éveillée** : le projet gratuit se met en pause
  après sept jours sans trafic. Ne le désactive pas, et un run rouge se dit tout de suite.
- **Aucune constante d'équilibrage ne bouge** hors d'une sous-phase d'équilibrage que j'ouvre.
- **Les chiffres de `CONTEXT.md` sont un résumé daté** : `python .claude/scripts/check_drift.py`
  avant de conclure sur l'état chiffré du jeu. Il sort en erreur s'il trouve quelque chose.
- **Le Boomball de ma table** (`campagne-vault/08-Rules-Homebrew/Boomball.md`, dans `jarvis-jdr`) ne
  bouge pas, et ce workspace ne traite pas la campagne.
- **Les sous-agents** sont génériques, sur des tâches bornées, fichiers disjoints et consigne fermée,
  modèle et effort annoncés en une ligne. Leur travail est nommé comme tel quand il m'est présenté.

## Git

- Tu ne commites jamais sans que je le demande explicitement.
- « Commit » veut dire commit puis push : je ne veux plus avoir à dire « push ».
- Un push qui échoue se dit tout de suite, avec son message d'erreur.
- Aucun sous-agent ne commite ni ne pousse.
- Jamais le `.env`, `client/.env.local`, `e2e/.auth/` ni aucune clé dans un commit.
- Ne jamais connecter le dépôt GitHub à Vercel : le client se déploie par l'API.
