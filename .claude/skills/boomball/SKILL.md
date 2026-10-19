---
name: boomball
description: Reprendre le développement de Boomball, le jeu vidéo web du sport giff de la campagne. Où lire l'état du code, les commandes qui marchent, le harnais d'écran Playwright, les pièges d'environnement et les interdits durs. À charger avant toute action sur le code, la base ou le déploiement de ce workspace.
---

# Boomball, le jeu vidéo

**C'est du logiciel, pas de la préparation de partie.** TypeScript, tests, base de données, client
React. Des
sous-agents génériques (Sonnet, effort précisé) sont attendus sur les tâches indépendantes et
bornées, avec des fichiers disjoints et un brief fermé : `08` §9 dit lesquelles. Leur travail est
nommé comme tel quand il est présenté.

**Ne confonds pas les deux Boomball.** Celui de `campagne-vault/08-Rules-Homebrew/Boomball.md`, dans
le workspace `jarvis-jdr`, est ce qui se joue à la table de Jérôme, et **il ne bouge pas**. Celui de ce workspace est un logiciel,
avec son propre règlement v2 qui diverge volontairement de la fiche.

---

## Avant toute action, dans cet ordre

1. **`docs/08-plan-terrain-horizontal.md`, EN ENTIER.** Depuis le 2026-10-10 c'est le plan
   en cours : la décision D11, le terrain horizontal, go donné, les arbitrages, le layout, les
   sous-phases 2H.1 à 2H.5 puis 3 à 8, et la parallélisation par sous-agents.
2. **La partie C de `docs/00-reglement-v2.md`**, les écarts 27 à 58 plus 40 bis, 37
   bis et 53 bis, qui prime sur les parties A et B ; C7 porte les quatre écarts de 2H.5, C8 les
   six de 2H.6, C9 les quatre de 2H.7, **C10 les deux de 2H.8 et l'IA par rôle en deuxième
   version, listes triées par priorité**, C11 le plan de tour, C12 la quatrième passe, **C13 la
   cinquième passe, vingt-neuf points dictés par Jérôme le 2026-10-12**, **C14 l'écart 58 (l'humain
   choisit sa place dans son rôle) et le Breaker qui ramasse d'abord**. Chaque passe se termine
   par un paragraphe « comment ... est codée », poids par poids, à lire avant de toucher à
   `ai/`. **Rien ne s'en écarte sans un arbitrage de Jérôme.**
3. **`docs/07-audit-et-plan-3d.md`** pour l'état mesuré du 2026-10-09, les décisions D1 à
   D11 en §1.2, les lignes d'audit A1 à A32 en §2.A, et le journal des phases en §10.
4. **`docs/05-reprise-chat-suivant.md`** pour le prompt de reprise.
5. **`docs/04-etat-des-lieux.md`** est l'historique de ce qui a été construit et pourquoi.
   À lire quand une décision d'ingénierie ou d'IA surprend, pas avant.

**Les chiffres de `CONTEXT.md` sont un résumé daté.** En cas d'écart, c'est `08`, `07` puis
`04` qui ont raison, et `python .claude/scripts/check_drift.py` le dit en une seconde.

---

## Les commandes

Depuis la racine du workspace :

```
npm test                                    # la suite vitest
npm run typecheck                           # racine, scripts et e2e
npm run sweep                               # rapport d'équilibrage, 135 s mesurées le 2026-10-10 en 2H.3, imprime ses constantes
npm run e2e                                 # le test de fumée Playwright, captures dans e2e/out/
npm run e2e:playthrough                     # joue le match ouvert du compte e2e jusqu'au sifflet
npm run e2e:board3d                         # la 2.5D : bascule, capture, clic au sol par la caméra, deux zooms
node scripts/apply-migration.mjs <fichier.sql>   # charge le .env du workspace tout seul
node scripts/run-ts.mjs scripts/dump-match.ts --list            # après set -a && . ./.env && set +a
node scripts/run-ts.mjs scripts/dump-match.ts --match <id>      # consigne et rejoue un match dans docs/matches/
node scripts/deploy-vercel.mjs [--production]   # le client en ligne, préversion par défaut, lit le .env lui-même
```

**Le client est en ligne depuis le 2026-10-16 à `https://boomball.vercel.app`**, redéployé le 2026-10-17 avec la coop et l'interface d'équipe (2H.34), projet Vercel
`boomball` créé par l'API sans lien Git, par `scripts/deploy-vercel.mjs` après `npm run build`
dans `client/`. **`--production` seulement sur le feu vert de Jérôme**, comme les fonctions. Les
URL de préversion sont derrière la protection SSO de Vercel. Avant ce jour aucun client n'avait
jamais été en ligne, quoi qu'aient dit les prompts de reprise.

**Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne, `dump-match.ts` et rien
d'autre** (2H.9) : il lit les événements avec la clé de service, rejoue le match en local depuis
`matches.kickoff`, vérifie que les événements rejoués sont ceux de la base, et écrit dans
`docs/matches/<date>-<id8>/match.md` chaque décision avec le plan que l'IA de ce dépôt classe en
tête et sa phrase. Une capture dit ce qui s'est vu, ce fichier dit pourquoi.

Depuis `client/` :

```
npm run dev      # http://localhost:5173
npm run build
npm run typecheck
```

Depuis la racine du workspace, les deux contrôles Python **lisent le `.env` eux-mêmes**, en
PowerShell comme en bash :

```
python supabase/checks/rls-check.py
python supabase/checks/browser-path.py
```

**Deux scripts veulent encore leurs variables à la main, et ces lignes sont du bash** : depuis
la racine, `set -a && . ./.env && set +a` avant `npm run deploy:function` et avant
`node scripts/run-ts.mjs scripts/live-match.ts`, et avant
`node scripts/run-ts.mjs scripts/measure-latency.ts [--region eu-west-3] [--idle 60] [--rounds 10]`,
qui chronomètre chaque requête `resolve-action` depuis un joueur jetable (`00` C31 point 1 : la
fonction tournait à `us-east-1` pour une base à `eu-west-3`, 2,1 s par requête contre 0,84 s
épinglée à Paris).

---

## Le harnais d'écran, depuis le 2026-10-10

**Claude voit et joue le jeu.** Deux voies, même Chromium :

- **Les scripts Playwright de `e2e/`**, rejouables, sans MCP. `npm run e2e` démarre Vite
  lui-même avec les deux drapeaux de développement, se connecte avec le compte e2e dans
  `global-setup.ts`, puis `smoke.spec.ts` joue hub, lobby, match et trois tours en laissant des
  captures datées dans `e2e/out/<run>/`. **Une capture lue avec `Read` vaut plus qu'un typecheck
  pour tout ce qui touche à l'écran.** Le test échoue sur toute erreur de page, tout avertissement
  console et toute réponse 400 ou plus, y compris sur le chemin de connexion.
- **Le serveur Playwright MCP** du `.mcp.json` du workspace, pour explorer et cliquer en
  conversation. Jérôme l'approuve au démarrage de session.

**Le crochet `window.__boomball`** est publié par l'écran de match quand Vite tourne avec
`VITE_BOOMBALL_HOOK=1`, sous `import.meta.env.DEV` seulement, donc jamais dans un build. Il expose
le plateau, les actions légales, `cellToScreen`, `clickCell`, `act` et `legalSummary`. Le contrat
est dans `client/src/match/testHook.ts`, les drapeaux dans `client/src/lib/flags.ts`.
`VITE_BOOMBALL_PATIENT=1` coupe le coup à la porte du chrono côté client.

**Un `npm run dev` lancé à la main sans ces drapeaux est réutilisé tel quel par Playwright**, et le
test de fumée échoue alors sur le crochet absent, avec un message qui le dit. Pour une session
manuelle avec le crochet, en PowerShell : `$env:VITE_BOOMBALL_HOOK='1'; npm run dev`.

**`localhost`, jamais `127.0.0.1`.** Sur cette machine Vite n'écoute que `[::1]:5173`, l'adresse
IPv4 ne répond jamais et le démarrage du serveur expire au bout de 60 s.

Le compte de test est dédié : identifiants dans le `.env` sous `BOOMBALL_E2E_EMAIL` et
`BOOMBALL_E2E_PASSWORD`, **jamais affichés**. Son équipe s'appelle « E2E Battery » (le nom reste, le mot « battery » a quitté l'écran en 2H.34). L'état de
session va dans `e2e/.auth/`, ignoré par git, et il est refait à chaque run parce que Supabase fait
tourner le refresh token. **Depuis 2H.5, le smoke passe un tour en mode slow** et `glideSeen`
dans `e2e/harness.ts` échantillonne les pions jusqu'à en voir un glisser, puis prend deux captures
à trois dixièmes d'écart : c'est ainsi qu'une animation se juge, et le run passe de 12 à 30 s.
**Depuis 2H.4, le 2026-10-10, le harnais joue le terrain horizontal
sur les fonctions déployées du moteur 2** : `smoke.spec.ts` affirme aussi qu'aucun round n'est
doublé dans le fil (A9) et que `cellToScreen` et la scène s'accordent.

---

## Les pièges d'environnement, tous mesurés

**Le projet Supabase gratuit se met en pause après sept jours sans trafic.** C'est arrivé en
septembre 2026 sans que personne le voie. Avant de chercher un bug sur une requête qui échoue,
lire l'état du projet par l'API de gestion. La restauration est une écriture : feu vert de Jérôme,
puis `POST /v1/projects/{ref}/restore`, quatre minutes. Le maintien en vie est une tâche de 2H.4.

**Les fonctions déployées peuvent être en retard sur le moteur, et seule la version le dit.** Le
2026-10-10, `resolve-action` v7 comptait encore le Spark 50 quand le moteur disait 20 depuis
septembre. Depuis 2H.4 chaque match porte `engine_version` (A11) : une fonction qui ne lit pas la
version du match qu'on lui donne refuse en 409, et un match d'un moteur antérieur est archivé, pas
perdu. **Redéployer change le jeu en ligne** : `npm run deploy:function` seulement avec le feu vert
de Jérôme, et après toute migration que le code attend. Déployées le 2026-10-11 à la mise en
ligne de 2H.8, redéployées le même jour pour la relance sans receveur du gardien, puis **le même
jour encore pour 2H.9, le plan de tour** (IA seule) : `resolve-action` v15 et `create-match`
v13, **moteur 5** (`ENGINE_VERSION = 5`, écarts 53, 53 bis et 54), puis **le même jour encore
pour 2H.10** : `resolve-action` v16 et `create-match` v14, **moteur 6** (`ENGINE_VERSION = 6`,
écarts 55 et 56, la quatrième passe de l'IA), puis **le 2026-10-12 pour 2H.11** :
`resolve-action` v17 et `create-match` v15, moteur 6 inchangé, la cinquième passe de l'IA, puis
**le même jour pour 2H.12** : `resolve-action` v18 et `create-match` v16, **moteur 7**
(`ENGINE_VERSION = 7`, écart 58, la popup de place), la sixième passe de l'IA. **2H.13 porte
`ENGINE_VERSION = 8`** (écarts 59 à 62, `turn.shot`, `recoilBlocked`), **en ligne le 2026-10-14** :
`resolve-action` v19 et `create-match` v17, **moteur 8**. **2H.14 porte `ENGINE_VERSION = 9`**
(écart 63, `turn.freePass`), **en ligne le 2026-10-14 au soir** : `resolve-action` v20 et
`create-match` v18, **moteur 9**. **2H.25 porte `ENGINE_VERSION = 10`** (écart 64, le rebond
d'un tir manqué part de la bouche), **en ligne le 2026-10-16** : `resolve-action` v21 et
`create-match` v19, **moteur 10** ; **redéployées le soir même pour 2H.27, la ligue au choix
(`00` C28, moteur 10 inchangé) : `resolve-action` v22 et `create-match` v20 ; puis pour 2H.28,
annuler et quitter un match (`00` C29, migration `0008` appliquée par Jérôme, moteur 10
inchangé) : `resolve-action` v23 et `create-match` v21 ; puis pour 2H.29, la phase 6 (`00`
C30, migration `0009` appliquée par Jérôme, l'effectif fixe) : `resolve-action` v24 et
`create-match` v22 ; puis **le 2026-10-17 pour 2H.31, A10 (`00` C32, migration `0010` appliquée
par Jérôme, la fonction SQL `append_match_step` qui écrit un pas en une transaction et refuse en
409 le perdant d'une course) : `resolve-action` v25 et `create-match` v23 ; puis le même jour pour
2H.32, la batterie à plusieurs (migration `0011` appliquée par Jérôme, le code d'invitation, le
lobby partagé par présence Realtime, `create-match` au propriétaire seul) : `resolve-action` v26
et `create-match` v24 ; **puis le même jour pour 2H.33, le match à plusieurs : `ENGINE_VERSION`
11** (l'écart 65, la popup au premier humain du rôle ; l'action `yieldSeat` et l'événement
`seatYielded`, le siège remis à la maison), **`resolve-action` v27 et `create-match` v25, moteur
11**, les matchs du moteur 10 ne se rejouent plus ; **puis le 2026-10-18 pour 2H.37** : `resolve-action` v28 (M2, le garde d'entrée), puis **`resolve-action` v29 et `create-match` v26** (les canaux privés, supabase-js 2.113.0), moteur 11 inchangé ; **puis le 2026-10-19, `resolve-action` v30 et `create-match` v27** : le 404 « no such match » de 2H.22 est revenu au harnais sur la première requête après cinq minutes d'inaction ; la fonction relit une fois une lecture du match qui échoue, ne répond 404 que sur zéro ligne (`PGRST116`), sinon 503 « could not read the match » avec l'erreur, écrite dans ses logs, et `useMatch.send` traite ce 503 comme le 404 (le client part au prochain déploiement)**.** Depuis 2H.32, `npm run e2e:coop` joue deux contextes dans le même lobby
avec le second compte e2e (`BOOMBALL_E2E2_EMAIL` et `BOOMBALL_E2E2_PASSWORD` dans le `.env`, membre
de « E2E Battery »), et abandonne le match qu'il ouvre. 2H.30 (`00` C31, le Dash tenu côté client, le KO commenté, la foule dès
l'ouverture de l'écran) ne touche ni le moteur ni les fonctions : rien à redéployer.
Si le dépôt porte une `ENGINE_VERSION` que les fonctions en ligne n'ont pas, le client
archive tout match en ligne et le harnais e2e ne trouve rien à jouer : mettre la constante à la
version en ligne dans la copie de travail le temps du run, et la remettre avant de commiter.

**Une action en retard n'est jamais jouée au tour suivant** (A28, corrigé en 2H.4) : `serveAction`
règle l'expiration **ou** joue l'action. Le client reçoit `expired` et rejoue sur le plateau qui
en résulte. Si ça réapparaît, c'est que la fonction déployée est d'avant le 2026-10-10.

**La diffusion Realtime de notre propre lot arrive avant la réponse HTTP.** Le fil du match
dédoublonne par `fromSeq` (A9) ; toute nouvelle lecture d'un lot doit passer par ce même
ensemble, sinon les lignes reviennent en double.

**Node ne fait pas de préflight CORS.** `live-match.ts` joue des matchs entiers depuis Node et ne
peut donc structurellement pas attraper un défaut CORS, qui a bloqué le lobby pour toujours sur
« Loading the silo ». C'est `supabase/checks/browser-path.py` qui rejoue le parcours du navigateur
avec un `Origin`, et lui seul.

**Une comparaison de sweeps graine par graine ne vaut rien** si l'un précède le dé d'initiative : le
tirage a décalé le flux de dés. Seules les moyennes se comparent.

**`design/Boomball Interface.html` fait 7 Mo.** Ne le lis jamais en entier.

---

## Les interdits durs

**Ne jamais connecter le dépôt GitHub à Vercel.** Le déploiement se fait par l'API, en envoyant les fichiers construits :
c'est `scripts/deploy-vercel.mjs`, qui s'arrête de lui-même si le projet porte un `link` Git.

**Les écritures destructives en base passent par Jérôme**, jamais par toi. La lecture passe, et tu
peux vérifier l'état après coup. Jouer un match avec le compte e2e n'est pas destructif.

**Ne jamais commiter le `.env` ni aucune clé.** Elles sont préfixées `SUPABASE_BOOMBALL_`, plus
`SUPABASE_API_KEY_BOOMBALL`, `VERCEL_TOKEN` et les deux `BOOMBALL_E2E_`.

**L'équilibrage est re-clos depuis le 2026-10-10**, à la fin de 2H.3, sur le tableau de Jérôme :
Crackers à 10, portée de tir 9/12, Spark à 20, écarts 39 à 41 de `00` partie C6, tableaux dans
`09-equilibrage-2H3-2026-10-10.md`. Les trois Tiers donnent 1,10 à 1,80 but par match et le Spark
décide un match sur deux, part acceptée par Jérôme à la place de la cible des 30 %. **Aucune
constante de `00` ne bouge hors d'une sous-phase d'équilibrage qu'il ouvre lui-même.** Le rapport
de sweep imprime les constantes sous lesquelles il a été mesuré : un tableau sans cette ligne ne se
compare à rien.

**Le règlement de table du vault de `jarvis-jdr` est figé.** Ne le modifie pas pour le faire coller au code.

---

## Une leçon de conception à ne pas réapprendre

**`positionValue` ne voyait pas qu'une case peut débloquer une action.** Franchir la dernière case
vers le ballon au sol valait 1,2 point quand le ramassage en vaut 90, parce que le ramassage n'est
proposé qu'à une unité déjà debout dessus. Résultat : ballon immobile sur la même case pendant dix
rounds avec une unité à une case de lui, et près d'un match sur deux qui finissait 0-0.

**La leçon vaut pour tout futur objectif de l'IA**, et pour la valeur de couverture qui remplace
l'ancrage : une heuristique de position doit valoriser la case qui rend une action possible, pas
seulement la distance à la cible.

---

## L'animation 2D, depuis 2H.5

**Le client ne résout toujours rien.** `client/src/match/motion.ts` lit les événements d'un beat et
en tire ce qui a voyagé, dans l'ordre, minuté à la vitesse de rejeu choisie et à zéro en `instant` ;
`Board.tsx` joue ces pas sur une seule boucle `requestAnimationFrame` et retombe sur l'état du
serveur à la fin, au skip et à la relecture du snapshot. Le harnais tourne en `instant`, où le
plateau dessine l'état directement sans frame : ne change pas ça sans changer le smoke.

## Ce qui reste

Voir `08-plan-terrain-horizontal.md` §5, qui fait foi. **2H.8 est codée et en ligne le
2026-10-11** (moteur 5) : surface de réparation (écart 53, `rules/box.ts`), relance du gardien (écart 54,
`promoteBulwark`), IA v2 (`00` C10 : le Trajector laisse le ballon du coup d'envoi et chasse le
Spark sans rien d'autre, le Striker presse coûte que coûte, le Breaker bouscule le porteur puis tape
Strikers, Breakers, Trajector et fait mur, le Bulwark relance aussitôt et se plante par défaut,
jamais de Dash devant une cible à portée), route en ligne droite (`pathTo`), fil complet,
`ENGINE_VERSION` 5, 462 tests, smoke et playthrough verts sur le moteur 5. **Sa partie est jouée
et `00` C11 validé le 2026-10-11 ; 2H.9 est codée le même jour dans le chat suivant** : le plan
de tour comme moteur de décision de l'IA (`Planner` dans `chooseAction.ts` note des tours
complets, `rankPlans` les expose, `actionOptionsAt` dans `legalActions.ts` dit ce qu'une case
débloque), le Dash de repli qui vaut le terrain qu'il achète, la case de repos du gardien
(`restNearness`, poids `rest`), l'écart 53 bis dans `applyPass` ; `ENGINE_VERSION` reste 5, 475
tests, 2,7 ms par décision, smoke et playthrough verts, le paragraphe « comment le plan de tour
est codé » en `00` C11. **Commitée, poussée et en ligne le même jour** (`resolve-action` v15,
`create-match` v13), smoke et playthrough verts sur les fonctions redéployées ; le smoke a
soldé la dette du tray « Swing at / Shove » au clic sur un pion, vu pour la première fois.
**Sa partie est jouée le 2026-10-11** (star, 50 à 0, match `0291a651`, consigné tour par tour
avec les raisons de l'IA dans `docs/matches/`) : deux décisions en `00` C12, un humain joue en
dernier de son rôle (écart 55) et le Trajector ne recule jamais à son premier tour, et une
analyse de la partie décision par décision avec un agent Opus 5.5 effort élevé, qui forment
**2H.10**. **2H.10 est codée, commitée et mise en ligne le 2026-10-11 dans le chat suivant** (moteur 6) :
l'analyse rendue (`docs/matches/2026-10-11-0291a651/analyse-2H10.md`) et relue, les décisions de
Jérôme en `00` C12 avant le code (les places libres autour du porteur, le Breaker collé au
porteur, le Breaker porteur et son exception à la chaîne, le Trajector seul sur le Spark, la
presse en Dash et tout déplacement par la route sûre), l'écart 55, l'écart 56 et
`ENGINE_VERSION` 6, `safeReachableCells` dans `rules/movement.ts`, la quatrième passe de l'IA
dans `chooseAction.ts` et `evaluate.ts` (un plan se lit à sa fin Action dépensée, ramasser puis
lancer, la sécurité du porteur, bousculer le porteur, les attaques d'opportunité au prix des PV,
le chasseur sur la prochaine dérive), 503 tests, 2,7 ms par décision, harnais vert sur le moteur
6 en ligne sans épingle, **pas de sweep** à sa demande. **Sa partie sur le moteur 6 est jouée le
2026-10-12** (star, 30 à 50, match `a17c22a5`), lue round par round sur le **visualiseur**
`docs/matches/<match>/viewer.html` que `dump-match.ts` produit depuis `scripts/match-viewer.html`
(terrain dessiné, une flèche par tour, huit plans classés par décision) : le résultat est `00`
C13, vingt-neuf points, l'écart 57 et neuf poids, soit **2H.11, codée le 2026-10-12 dans le chat
suivant** : un porteur ne tente jamais le Spark (`legalActions` et `reduce`), une parade
n'explose jamais sur le pareur (`parryDirection`), la cinquième passe de l'IA dans
`chooseAction.ts`, `evaluate.ts` et les fiches (`approachDash`, `idleSwing`, `preyByHp`, plus
de `screen`), 530 tests sur 23 fichiers, `ENGINE_VERSION` toujours 6, harnais vert sur le moteur
6, **pas de sweep** ; **commitée (`0ffa299`) et en ligne le même jour sur son feu vert**
(`resolve-action` v17, `create-match` v15, moteur 6 inchangé), smoke et playthrough verts sur les
fonctions redéployées. **2H.12 est codée le même jour dans le chat suivant** (`00` C14) :
l'écart 58, un Striker ou un Breaker humain choisit sa place dans son rôle par une popup
(`PlacePrompt.tsx`, `turn.placing`, l'action `choosePlace`, `waitForPlayableTurn` dans le
harnais, qui y répond par un clic à l'écran), et le Breaker ramasse d'abord (`pickupFirst`),
549 tests sur 25 fichiers, **`ENGINE_VERSION` 7**, commitée (`bf00089`) et **en ligne sur son
feu vert** (`resolve-action` v18, `create-match` v16), la popup vue au harnais, pas de sweep. Sa
partie sur 2H.12 est devenue **vingt et un matchs du 12 au 14 octobre**, cinq consignés, dont
`00` C15 et **2H.13, codée le 2026-10-14** : le chrono qui expirait le Trajector et le Bulwark
(`clockKey` porte le round), les écarts 59 à 62 (la dérive du Spark au d8 chaque round loin des
Trajectors, le retour à 9 cases des deux, le Shove qui prend le ballon, la relance Trajector,
Strikers, Bulwark, Breakers), `recoilBlocked`, le receveur nommé sur l'interception, le marqueur
de Réaction, la popup dockée et déplaçable, la septième passe de l'IA (`shooterYields`,
`depthInRange`, le gardien jamais dans une allonge, l'appel qui lève la chaîne), 617 tests sur 27
fichiers, `ENGINE_VERSION` 8, harnais vert, pas de sweep ; **commitée (`57b647c`) et en ligne le
même jour sur son feu vert** (`resolve-action` v19, `create-match` v17, moteur 8). Sa partie sur
2H.13 a été jouée trois fois le 14 au soir, consignée (`20edbca9`, `b5910869`, `dc474770`), et
donne `00` C16 et **2H.14, codée le 2026-10-14** : l'écart 63, la passe gratuite après le Shove
qui prend le ballon (`turn.freePass`, **`ENGINE_VERSION` 9**), le Trajector qui lit le ballon du
coup d'envoi comme déjà porté et finit en relais (`kickoffRelay`, `kickoffMayEnd`), la popup en
haut à gauche, les cases sous allonge adverse marquées à chaque tour (`data-reach`), plus de
pointillés de tiers ; 643 tests sur 29 fichiers, harnais vert sur un Vite dédié avec le crochet
sur 5174 quand 5173 est pris par le `npm run dev` de Jérôme (`BASE_URL=http://localhost:5174`).
**Commitée (`e8c0fee`) et en ligne le même soir sur son feu vert** (`resolve-action` v20,
`create-match` v18, moteur 9), smoke et playthrough verts sur les fonctions redéployées. Sa partie
sur 2H.14 (`ab27b827`) donne `00` C17 et **2H.15, codée le 2026-10-14** : les cases orange
retirées, et **la 2.5D en un seul bloc** derrière « See it in 3D » (`client/src/board3d/`, React
19, three, fiber, drei ; son `glb` de Giff dans `client/public/models/` ; les textures en WebP 1K
dans `board3d/textures/` ; `match/pose.ts` partagé par les deux plateaux ; `e2e/board3d.spec.ts`),
652 tests, `ENGINE_VERSION` toujours 9, rien à redéployer. **Jamais `Html` de drei** : React 19
le signale en erreur à chaque démontage, les étiquettes sont dans `Labels.tsx`. **Sa première
partie en 3D, le 2026-10-15, donne `00` C18 et 2H.16, codée le même jour** : la caméra en main
(`framing.ts` pur et testé, `Camera.tsx` : bouton droit pour tourner, roulette pour zoomer, le
cadrage rapproché sur les quinze cases de large, le bouton de cadrage remet l'orbite, J4 de `08`
§7 tombé), et sa décision sur C17, la passe gratuite au gardien reste ; 663 tests sur 31 fichiers,
`e2e:board3d` vert en 1,7 min. **Sa partie sur 2H.16, le même jour, donne `00` C19 et 2H.17** :
la caméra se décroche du jeu aux flèches ou sous Ctrl plus la souris (`clampPan`, `viewAxes`,
`hooked` dans `Board3D.tsx`), revient d'elle-même quand son pion arrive sur l'horloge ou par
« Follow the play » ; 665 tests, `e2e:board3d` vert en 2,0 min. **Sa partie sur 2H.17 donne `00`
C20 et 2H.18, le même jour** : la caméra stable, la main brute (il a refusé une caméra à quatre
nombres lissés), le pivot exact, la distance indépendante de l'inclinaison, la roulette douce,
les flèches avec inertie, le suivi calme (`focusKey`, `FOLLOW_DWELL_MS`), le pas de la caméra
appelé par la boucle de `Board3D` via `link.camera`, un compteur d'images par seconde en
développement. **Sa partie sur 2H.18 donne `00` C21 et 2H.19, le même jour** : 45 à 50 images par
seconde ; la nouvelle tentative après un `fetch` rejeté (`unreachable`, `headSeq`, la tête du match
relue avant de renvoyer) ; les gradins et la rambarde sur ses trois images Nano Banana Pro
(`stand-cyan`, `stand-magenta`, `barrier` en WebP), le tube au rayon 15, `Stand` qui s'efface
derrière la caméra. **Sa partie sur 2H.19 donne `00` C22 et 2H.20, le même jour** : la caméra
retenue dans le silo (`confine` dans `framing.ts`, les dimensions du silo dans
`layoutGeometry.ts`), inclinaison à trente degrés, roulette à une fois et demie, déplacement au
terrain plus une case ; 669 tests. **Il clôt la caméra et ouvre 2H.21, le jeu vivant, `00` C23, codée le même soir** : les repères (`Cue`) lus des événements dans `motion.ts` et datés sur les pas, `Effects.tsx` (étincelles, anneau, explosion, braises, faisceau et flash du Spark), `Floaters.tsx` et les mots qui montent en 2D dans `Board.tsx`, l'évacué qui s'enfonce et le remplaçant qui monte, `Banner.tsx` (goal, knockout, Spark, full time, round, your turn, jamais à `instant`), la carte de beat avec son verdict en gros et sa barre de temps, le fil qui marque ses lignes neuves ; 676 tests, `e2e:board3d` vert en 5,5 min (chaque effet tiré par `window.__boomball.fx` avec `stretch`, un round en slow), smoke 2D vert. **Sa partie sur 2H.21 donne `00` C24 et 2H.22, codée le même soir** : les mots au-dessus des têtes deux fois plus gros et tenus deux fois plus longtemps (`FLOAT_MS`), toutes les actions en mot au-dessus de l'acteur (repère `action`, neuf mots), le bandeau de but à part (« Goal · Your Team »), la barre de temps de la carte retirée, **le son** (`match/sound.ts`, Web Audio synthétisé, contexte ouvert au premier geste, bouton « ♪ Sound on »), **le pantin** sur le maillage entier (`link.gestures`) en attendant un modèle riggé, le fil qui juge ses lignes neuves par le dernier événement ; 683 tests, `e2e:board3d` vert en 5,6 min, smoke 2D vert. **Le 2026-10-16, 2H.23 à 2H.29** (`00` C25 à C30), toutes en ligne, moteur 10 depuis 2H.25 ; **sa partie sur 2H.29 franchit la porte de l'effectif et du porteur et donne `00` C31 et 2H.30, codée le même jour** : la réplique de KO à la place de celle du coup qui tue, **le Dash tenu côté client** (`match/dashHold.ts` : « Dash · held », annulable tant qu'aucune marche n'a dépassé les pieds de base, envoyé avec celle qui en a besoin par `useMatch.sendMany`), la foule dès l'ouverture de l'écran quand la page a déjà reçu un geste (`navigator.userActivation.hasBeenActive` dans `sound.ts`), « Select your champion » retiré, la latence du round 2 lue en base et non reproduite ; 719 tests sur 36 fichiers, smoke 2D vert avec le Dash tenu capturé, rien à redéployer. Sa partie est la porte suivante. **Sur un Vite 5174 qui vient de
démarrer, chauffer par deux `curl` avant le harnais**, sinon `global-setup.ts` peut rater le
champ Email une fois. Un match d'auto-jeu dure environ 1,7 s
depuis 2H.11, donc un sweep environ quatorze minutes. Cette
lecture round par round n'est pas à refaire à chaque partie : sur sa demande, ou sur proposition. **2H.7 est codée le 2026-10-10 soir et
en ligne le même jour** : écarts 49 à 52 de `00` C9 (le Spark s'échappe et revient, l'initiative
devient un ordre sans comptes, se planter), l'IA des quatre rôles dictée par Jérôme, l'ouverture
rejouée (migration 0007 appliquée, le client lit `matches.kickoff`), `ENGINE_VERSION` 4, 429
tests, moteur 4 en ligne, le sweep unique en `09` §12 que Jérôme tranche. **Sa porte n'est pas
franchie** : il rejoue et dit s'il comprend ce que chaque rôle cherche. **Un sweep par lot de
changements d'IA, jamais sans qu'il le demande.** Deux `load()` en vol se dépassent (StrictMode
monte l'effet deux fois) : `useMatch.load` porte un compteur de génération, ne l'enlève pas. Ne dis plus
« la maison » : « l'équipe qui a la balle » et « l'équipe qui ne l'a pas ». Quand il explique un
concept, pose tes questions en chat, une par message, pas avec l'outil de questions à choix. **Les sous-phases 2H.1 à 2H.6 sont
construites le 2026-10-10**, 2H.1 à 2H.5 en ligne, migration 0006 appliquée. **2H.6** a corrigé la
relecture pendant le rejeu (retour 1), mis les écarts 45 à 48, 40 bis et 37 bis dans le moteur 3,
408 tests, et son sweep est en `09` §11, sur lequel Jérôme a **re-clos l'équilibrage** (Crackers 8,
portée 9/12, Spark 20). **Le moteur 3 est en ligne** depuis le même jour, les matchs du moteur 2
archivés. **Sa porte n'est pas franchie** : il reste sa partie en 2D animée et son verdict sur ce
que chaque rôle cherche, qui ouvre **2H.7, l'IA par rôle** (Breaker garde du corps, attaquants étalés autour de
la bouche, gardien et défenseurs lisibles, `crackerPressure` qui lit la ligne Cracker-ballon, un
critère par rôle dans le sweep). Sans ce verdict, pas de phase 3. Puis les phases 3 à 8 de `07`, le
2.5D en caméra trois quarts, dont A20 (React 19) est le premier pas, la coop, le déploiement. Les
décisions à ne pas rediscuter sont D1 à D11 en §1.2 de `07` et les écarts 27 à 58 de `00` partie C.

**2H.34, l'interface d'équipe, codée le 2026-10-17** (`00` C33) : le hub et le lobby récrits sur une maquette validée par Jérôme, le fond `client/public/crowd-entering-arena.webp`, Battery devenu Team dans tout texte visible et dans les specs (« Enter the lobby », « Raise a team », « Team name », « The bench », `leave-team`). **Le canal de présence du lobby vit dans `App`** (`client/src/lib/useLobbyChannel.ts`), pas dans l'écran : le hub lit qui attend, le lobby `track` son siège et le retire en partant ; `client/src/lib/teamChannel.ts` diffuse par REST (`httpSend`, jamais `send()` hors abonnement, qui écrit un avertissement console que le harnais compte comme une erreur) qu'un effectif a changé, et `useAccount` relit. **Le second compte e2e peut être sur plusieurs équipes** : `coop.spec.ts` bascule sur « E2E Battery » par le menu `team-switch-open` quand le hub s'ouvre ailleurs ; s'il a quitté « E2E Battery », le faire rejoindre par son code en tant que joueur (script jetable, comme en 2H.32). Migration `0012` (les mots, le propriétaire une fois) à appliquer par Jérôme.

**2H.35, le 2026-10-17 soir** (`00` C34) : **la présence Realtime est limitée en débit par le serveur, et la sanction est la fermeture du canal** (« Client presence rate limit exceeded », puis `phx_close`, définitif). Trois `track` en cinquante millisecondes l'ont déclenchée et ont vidé la revanche de Jérôme de son coéquipier. `useLobbyChannel.track` lisse à un message par demi-seconde et rouvre un canal fermé : ne jamais appeler `channel.track` ailleurs. `e2e/rematch.spec.ts` (`@coop`, dans `npm run e2e:coop`, 1,8 min) joue un match entier à deux puis la revanche ; il reproduisait le défaut avant le correctif. Pour voir les trames Realtime d'un client, une sonde Playwright qui écoute `page.on('websocket')` : les trames sont des tableaux `[joinRef, ref, topic, event, payload]`.

**2H.36, le 2026-10-17 soir, le premier lot de la phase 8** (`00` C35) : le menu « Account » (`screens/AccountMenu.tsx`, changer le mot de passe deux fois sans l'ancien, « Sign out » à `scope: 'local'` pour ne pas révoquer les sessions des autres specs), la ligne « Ask Jérôme » du mot de passe oublié (pas de SMTP : le mailer intégré plafonne à deux e-mails par heure, choix assumé), `site_url` et la liste des redirections sur `https://boomball.vercel.app` (fait par l'API de gestion), **le repli sans WebGL** (`lib/webgl.ts`, `webglAvailable()` : sans lui la 2.5D jetait dans le canvas et l'écran était noir ; `Match.tsx` ouvre en 2D, le bouton dit « No 3D here »), `npm run export:db` (`scripts/export-db.mjs`, sept tables en JSON dans `backups/`, ignoré par git, contient les codes d'invitation), `npm run e2e:account` (`@account`, hors de `npm run e2e` : il change le mot de passe du compte e2e et le remet dans un `finally` ; s'il casse entre les deux, le compte garde l'original suivi de `-tmp`). Firefox est installé pour Playwright (`firefox-1555`) ; une sonde jetable qui se connecte, atteint le plateau et lit la console suffit pour une passe navigateur. **Une reconnexion dans la même page après « Sign out »** passe par `useAccount.load(null)`, qui remet `loadedForRef` à `null`, sinon `App` insère un profil existant (409). **La revue de sécurité du jeu entier est `docs/10-revue-securite-2026-10-17.md`** (agent Opus 5.5 effort élevé) : aucun bloquant ; M1 `team_members_write` laisse tout connecté s'insérer dans toute équipe par UUID ; M2 `validatePath` accepte des coordonnées non entières (prouvé) ; M3 les canaux Realtime publics. `/security-review` ne relit que la diff en attente : pour le jeu entier, un agent sur brief fermé.

**2H.37, le 2026-10-18 au matin, les corrections de la revue** (`00` C36), tranchées par Jérôme en quatre réponses et faites lot par lot, chacun appliqué et prouvé avant le suivant. **Migrations 0013, 0014 et 0015 appliquées par lui, puis 0016 (appliquée par lui le 18 après l'écriture du prompt de reprise ; 0001 à 0016 appliquées).** Trois faits à ne pas réapprendre. **Le `with check` d'une politique INSERT s'évalue sur la ligne proposée AVANT la recherche du conflit**, donc sur le chemin update d'un upsert aussi : la politique « insert réservé au propriétaire » de 0013 refusait à un membre de resauvegarder son propre siège (37 sur 38), 0014 l'a élargie à `is_team_member(team_id)`. **Des privilèges de colonne cassent un upsert** même quand la valeur ne change pas (supabase-js assigne toutes les colonnes envoyées) : `team_id` est figé par le déclencheur `team_members_pin_keys`, pas par un `grant update (...)`. **Le projet Realtime est en `private_only`** : tout canal s'ouvre avec `private: true` et doit avoir une politique sur `realtime.messages` (0015), sinon « Unauthorized » ou « PrivateOnly » ; seul `lobby:*` s'écrit depuis un client, `team:*` et `match:*` sont écrits par la base (`realtime.send`, qui rattrape ses erreurs) et par les fonctions en `httpSend` explicite ; `channelReopen.ts` plafonne la réouverture à cinq et jamais sur un refus. `rls-check.py` compte **38 contrôles** et crée deux équipes jetables en plus des deux comptes. `isCell` dans `validatePath` et `isActionShaped` dans `resolve-action` ferment M2. **Fonctions : `resolve-action` v29, `create-match` v26, supabase-js 2.113.0**, moteur 11 inchangé ; client de 2H.37 en ligne. L'API de gestion rend le résultat de la dernière instruction SQL seulement, et un PATCH de configuration peut répondre un corps vide : relire après.

**2H.38, l'écran de match refait, cadré et maquetté le 2026-10-19, puis codé le même jour dans le chat suivant et mis en ligne le même soir** (`00` C37, « comment 2H.38 est codée » ; client `index-BLdoW79j.js`, `password_min_length` à 8). **Le classifieur du mode auto refuse le PATCH de la configuration Auth et même `npm run build` du client** : Jérôme les fait lui-même, et dans son PowerShell `npm` s'écrit `npm.cmd` (`npm.ps1` y est bloqué). **Depuis 2H.38 les réglages sont derrière la roue ⚙** : le harnais passe par `openSettings`, `closeSettings`, `setReplay` et `settingsClick` (`e2e/harness.ts`), jamais par un bouton « instant » à l'écran ; la fenêtre Playwright vaut 1536 × 695 par défaut et `E2E_VIEWPORT=2560x1271` donne le 27 pouces (`e2e:board3d` y a trente minutes). La caméra cadre au-dessus de la rangée par `insetLens` (`framing.ts`). Le match e2e qui finit pendant le tour de la maison (round 10) emporte l'écran de match et la roue avec lui : les aides du harnais le tolèrent, le run suivant ouvre un match neuf. **Pour capturer la scène 3D seule** (une maquette, une comparaison) : une spec jetable qui atteint le match comme `board3d.spec.ts`, cache par CSS tout le DOM sauf `[data-board3d] canvas`, fixe `[data-board3d]` à la zone voulue, capture, et lit `cellToScreen` de chaque pion ; le sol est un plan, donc une homographie ajustée sur les pions donne toute case à l'écran.

**Le retour de partie sur 2H.38, le 2026-10-19 au soir** (`00` C38, en ligne, `index-sXBC7HJQ.js`) :
les actions sur une cible au survol (étiquettes cliquables, `tagTarget` et `holdTags` dans
`Match.tsx`) et dans la rangée, un bouton par couple action et cible (`aimed`, `data-aims`) ; le
clic sur un pion n'ouvre que sa fiche ; la 2D pose ses étiquettes à côté du pion (`BesideTarget`
dans `Board.tsx`). Validé par Jérôme : « tout est parfait ». **Le build du client passe par la règle
`Bash(npm --prefix client run build)`** de `.claude/settings.json` ; `deploy-vercel.mjs
--production` y est autorisé aussi mais a encore été refusé par le classifieur dans la session qui
l'a ajouté. Suite : 2H.39 la caméra, puis 2H.40 (réplique du Spark) et 2H.41 (toute l'équipe à un
humain), notées en `08` §5.
