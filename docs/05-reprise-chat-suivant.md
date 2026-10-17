# Prompt de reprise pour le chat suivant

> Récrit le 2026-10-17 par le fil principal (Fable 5.1) à la fin du chat de la coop (2H.31 à
> 2H.33, `00` C32). Tout ce qui précède est dans `07` §10, `08` §5 et `00` C1 à C32. À coller tel
> quel au début du chat suivant.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.33
est la dernière sous-phase codée (les phases 3, 4 et 5 sont faites par 2H.15, la 6 par 2H.29,
la 7 par 2H.31 à 2H.33), §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 65, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 à C16 les passes suivantes de l'IA (chacune finit par « comment ...
est codée », À LIRE avant de toucher à ai/), C17 la passe gratuite au gardien tranchée (elle
reste), C18 à C22 la caméra (C20 : MON REFUS d'une caméra à quatre nombres lissés), C23 et C24
le jeu vivant, C25 trois défauts d'écran, C26 le son et le rebond (écart 64, moteur 10), C27
l'annonceur systématique, C28 la ligue au choix, C29 annuler et quitter un match, C30 la phase 6
(3D par défaut, porteur, effectif fixe), C31 mes cinq retours (le Dash tenu, la latence MESURÉE
et LAISSÉE TOMBER). **C32 est la coop, cadrée le 2026-10-17 en huit réponses de moi et codée en
trois sous-phases le même jour** : 2H.31 (A10, la migration 0010 `append_match_step`), 2H.32
(la batterie à plusieurs, la migration 0011, le lobby partagé par présence Realtime), 2H.33 (le
match à plusieurs, l'écart 65, le siège remis à la maison, `ENGINE_VERSION` 11), chacune avec
son « comment ... est codée ». Ne rediscute rien de C12 à C32.
07 §10 porte le journal (2H.15 la 2.5D fichier par fichier, 2H.16 à 2H.20 la caméra, 2H.21 et
2H.22 le jeu vivant, 2H.29 la phase 6, 2H.30 les cinq retours, « Le client en ligne », 2H.31,
2H.32, 2H.33). 09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep
depuis 2H.8. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te surprend.

Où on en est : **2H.31 à 2H.33 sont CODÉES le 2026-10-17, ENGINE_VERSION 11, MOTEUR 11 EN LIGNE
depuis le 2026-10-17 sur mon feu vert : resolve-action v27, create-match v25** (npm run
deploy:function après set -a && . ../.env && set +a, depuis boomball/). Les migrations 0010 et
0011 sont APPLIQUÉES par moi le 17 (vérifiées avant et après, consignées en 04). Aucun match du
moteur 10 n'était ouvert au redéploiement. **LE CLIENT EN LIGNE (https://boomball.vercel.app)
EST ENCORE CELUI DU 16 AU SOIR (2H.30)** : il ne connaît ni le code d'invitation, ni le lobby
partagé, ni la coop ; il se redéploie par npm run build dans client/ puis node
scripts/deploy-vercel.mjs --production depuis boomball/, SUR MON FEU VERT SEULEMENT. 759 tests
verts sur 44 fichiers, typecheck racine, scripts, e2e et client verts, le client bundle. Sur le
moteur 11 en ligne : smoke 2D vert en 41,5 s, playthrough vert en 1,1 min (23 requêtes, 0
refusée), **npm run e2e:coop vert en 37,5 s** (deux contextes : le second client voit le tour du
propriétaire arriver, « Waiting for Second Giff · 1:59 », le second remet son Giff à la maison
et passe en spectateur, le propriétaire quitte et le second revient à son hub). e2e:board3d n'a
pas été relancé ce jour (Match.tsx a bougé : à relancer au prochain chat, 6 à 8 min, sur un
Vite 5174 chauffé par deux curl). **RIEN DE CE JOUR N'EST COMMITÉ** : vérifier git status et
git log origin/main..main en premier et me le dire, me proposer /save (ou /commit) puis le push.
Les fichiers du jour : supabase/migrations/0010 et 0011 (nouveaux), server/persist.ts et ses
tests, server/migration0010.test.ts, migration0011.test.ts, yield.test.ts, engine/c32.test.ts,
engine/actions.ts, events.ts, constants.ts, initiative.ts, reduce.ts, c26.test.ts,
server/session.ts, les deux fonctions, scripts/dump-match.ts, client/src/lib/useAccount.ts,
roll.ts (+test), supabase.ts, supabase-types.ts, client/src/screens/Lobby.tsx, lobbySeats.ts
(+test), TeamHub.tsx, Match.tsx, App.tsx, client/src/match/useMatch.ts, Feed.tsx,
YieldPrompt.tsx, coopClock.ts (+test), e2e/coop.spec.ts, package.json (e2e:coop), docs 00 (C32),
04, 07 (A6, A10, §10), 08 (en-tête, §5), le skill boomball, ce fichier. Les quatre fichiers du
vault modifiés hors de nos sessions et les non suivis MARGO.md, theodo.md, assets/source/,
scripts/blender/__pycache__/ ne sont pas à nous : ne les commite pas sans mon feu vert ;
check_vault.py signale MARGO.md et theodo.md, c'est connu et c'est à moi.

Ce que la coop contient, par sous-phase, détail en 00 C32.

**2H.31, A10.** La fonction SQL `append_match_step(p_match, p_expected_seq, p_events,
p_snapshot, p_columns)` écrit un pas en une transaction : verrou `for update` sur `match_state`,
refus « the board moved on » si le seq a bougé, événements, snapshot, les neuf colonnes de
`matches`. `server/persist.ts` (pur) calcule les colonnes ; `resolve-action` appelle la fonction
par rpc en un aller-retour et répond 409 au perdant d'une course, que le client traite comme un
refus ordinaire. Exécutable par `service_role` seulement.

**2H.32, la batterie à plusieurs.** Mes réponses : un joueur possède une batterie et peut en
rejoindre d'autres (le hub montre la liste, « Your batteries », et garde la choisie dans
localStorage sous boomball.team) ; un lobby partagé où chacun choisit son rôle ; le propriétaire
seul démarre, quand tous les présents sont prêts, et choisit la ligue ; deux humains peuvent
avoir le même rôle dans la limite de la composition ; le code d'invitation (`teams.invite_code`,
8 hexadécimaux, montré au propriétaire, renouvelable), `join_team(code)`, `battery_members`,
quitter et retirer par la politique `team_members_write`. Le lobby : présence Realtime sur
`lobby:<teamId>` à la clé userId, un siège par présent (nom, rôle, Ready), rôles pleins grisés,
« Start match » au propriétaire (`start-match`), `started` diffusé au démarrage ; `lobbySeats.ts`
pur (`openRoles`, `canStart`, `seatRequests`). `create-match` refuse un appelant qui n'est pas le
propriétaire : UN MEMBRE NE JOUE PAS EN SOLO SUR MA BATTERIE, il monte la sienne (conséquence de
ma réponse 3, à me redire si je voulais autre chose). `TeamHub.tsx` est d'un Sonnet effort élevé.
Défaut connu : `battery_members` liste le propriétaire deux fois quand il a sa propre ligne,
fusionné côté client (`mergeRoll`), à corriger à la prochaine migration.

**2H.33, le match à plusieurs.** Écart 65 : dans un rôle à deux ou trois humains, le premier au
d20 reçoit la popup, les autres se placent juste derrière lui, les places offertes = actifs moins
les autres humains, pas de popup quand un seul ordre existe (`placementAt`, `placeHumans`).
`yieldSeat` : action hors tour, du contrôleur de l'unité seulement, le pion passe à l'IA
(`seatYielded`), la maison prend la dernière place pendant une popup, l'IA joue le tour s'il
était ouvert ; `submitAction` l'accepte hors tour. Client : les lots des autres rejoués animés
(`playForeign` quand le lot suit exactement le plateau tenu, relecture sinon) ; « Waiting for
X · 1:12 » (`waiting-for`) chez tous ; le coup à la porte par tout siège cinq secondes après
l'échéance (`coopClock.ts`, `useMatch.knock`, silencieux, jamais sous PATIENT ni pour un
spectateur) ; « Leave the match » au propriétaire seul, « Hand my Giff to the house »
(`hand-over`, `YieldPrompt.tsx`) pour un coéquipier assis, « Back to the hub » (`watch-leave`)
et « Watching · no seat in this match » pour un spectateur (un membre non assis entre par « Back
to the silo ») ; l'abandon du propriétaire diffusé (`abandoned`) et les autres reviennent au hub.
Les tests `engine/c32.test.ts` et `server/yield.test.ts` sont d'un Sonnet effort élevé.

**Dette de la coop** : le nom du joueur sur la plaque des autres pions humains (non fait ; les
plaques portent le nom du Giff, l'échelle dit qui est humain) ; le bandeau « Your turn » reste sa
durée après un siège remis ; un spectateur ne frappe pas à la porte ; la présence et la
diffusion Realtime sont sur des canaux publics (quiconque connaît l'id d'une batterie ou d'un
match peut écouter), noté pour la /security-review de la phase 8 ; `e0d9b642` (moteur 10) et
tous les matchs antérieurs ne se rejouent plus avec le dépôt ; le second compte e2e
(`BOOMBALL_E2E2_EMAIL` et `BOOMBALL_E2E2_PASSWORD` dans le .env, membre de « E2E Battery ») est
créé par le fil principal par l'API admin sur mon mot.

Ce que les sous-phases d'avant contiennent, en bref (le détail est en 00 C25 à C31 et 07 §10,
ne pas rediscuter). 2H.30 : le Dash tenu côté client (`dashHold.ts`, « Dash · held »,
`sendMany`), la réplique de KO, la foule dès l'ouverture de l'écran, « Select your champion »
retiré. 2H.29 : la 3D par défaut (`boomball.view`), le faisceau doré du porteur, l'effectif fixe
(`teams.roster`, migration 0009). 2H.28 : l'abandon par le propriétaire (`abandon_match`,
migration 0008). 2H.27 : la ligue au choix. 2H.26 : l'annonceur à chaque coup, une seule voix.
2H.25 : l'écart 64, deux foules, deux annonceurs. 2H.23 : la note « Default initiative · you go
last », la route sûre au clic. 2H.21 et 2H.22 : le jeu vivant, les mots, les bandeaux, le son
(`sound.ts`, contexte dans un geste ou dès l'ouverture si la page a été touchée), le pantin
remplacé par le Giff riggé (2H.24, `giffRig.ts`). 2H.16 à 2H.20 : la caméra en main, brute,
dans le silo (`framing.ts`, `Camera.tsx`, `confine`). 2H.15 : la 2.5D en un bloc
(`client/src/board3d/`). Le Dash tenu est validé par ma partie ; s'il me gêne un jour,
l'alternative est un `undoDash` moteur, `ENGINE_VERSION` 12 et un redéploiement, à cadrer.

L'ORDRE DE LA SUITE, VALIDÉ PAR MOI LE 2026-10-16 AU SOIR, OÙ ON EN EST : (1) la ligue au choix et
l'abandon, FAITS ; (2) la phase 6, FAITE ; (3) le client en ligne, FAIT ; (4) **la coop, phase 7,
CODÉE le 17, sa porte est MA PARTIE À DEUX** (un ami, ou le second compte e2e dans une fenêtre
privée) sur le client redéployé à mon feu vert ; (5) la phase 8, le déploiement pour un ami : le
script existe, restent `site_url` de l'Auth, la bande passante Hobby (100 Go par mois, 13 Mo par
premier chargement), un ami qui crée un compte, et DEUX TROUS à cadrer avec moi avant qu'un ami
ne joue : pas de « mot de passe oublié » ni de changement de mot de passe dans le jeu (mon
compte est tackergamingrss@gmail.com, mot de passe remplacé le 16 par l'API admin) ;
/security-review par moi.

LA TÂCHE DU PROCHAIN CHAT : vérifier git, me proposer /save et le push ; me demander le feu vert
pour redéployer le client en ligne avec la coop (npm run build dans client/, puis
node scripts/deploy-vercel.mjs --production) ; relancer e2e:board3d ; puis MA PARTIE À DEUX et
mes retours ; puis cadrer la phase 8 avec moi, questions en chat, une ou deux par message.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 ou Fable 5.1 pour ce qui réclame de la qualité. Toute
   matière que tu me présentes nomme son auteur, agent ou fil principal. Dès que tu as une liste
   d'actions pour moi, donne-la numérotée, une action exacte par ligne, et dis ce qui se passe
   ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. Pour expliquer
   pourquoi l'IA a fait un choix, lis les huit plans du viewer et le code, jamais une supposition.
   Ne dis plus « la maison » : « l'équipe qui a la balle », « l'équipe qui ne l'a pas ».

3. Aucun sweep tant que je ne l'ai pas demandé, un seul par lot de changements d'IA, contre 09
   §12, seize minutes. Tu ne touches à aucune constante de 00 sans mon arbitrage. Les poids de
   l'IA sont dans ai/roles/ et viennent de mes mots dans 00 C10 à C16 ; la formule : note du plan
   = valeur de l'action depuis sa case + position de la case finale − position de la case de
   départ − exposition des trajets. Le plan de tour : chooseAction renvoie la première action du
   meilleur plan, l'IA se juge sur rankPlans.

4. Pour savoir ce que l'IA a fait dans un match en ligne : depuis boomball/ en bash, set -a &&
   . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis --match
   <uuid complet>. Horaires de --list en UTC. Les dossiers de docs/matches/ d'avant le moteur 11
   ne se rejouent plus. 2e30f587 n'est PAS à analyser.

5. Toute migration passe par moi via /supabase-migrate (il n'y a pas de registre : 0001 à 0011
   sont appliquées, dit 04), tout redéploiement par mon feu vert explicite. Chaque match porte
   engine_version ; une fonction qui lit une autre version refuse en 409, le client archive.
   Les écritures destructives en base passent par moi ; la lecture passe (un script jetable
   dans le scratchpad qui poste un select à l'API de gestion fait l'affaire).

6. Le harnais : npm run e2e en 18 à 55 s, e2e:playthrough en 15 à 70 s, e2e:board3d en 6 à 8
   min, e2e:abandon en 10 s, **e2e:coop en 20 à 40 s** (hors de npm run e2e ; il abandonne le
   match e2e en cours pour atteindre le lobby, et abandonne le match coop qu'il ouvre). Le
   crochet window.__boomball (DEV seulement) : fx(), audio(), crowd(), lastSaid(), probe(),
   clickCell, act, legalSummary ; `yours` du crochet est faux derrière le briefing (utiliser
   waitFor sur « Into the silo », jamais isVisible). waitForPlayableTurn répond à la popup à
   l'écran. Le smoke échoue si le match e2e atteint le round 10 pendant ses trois tours (le
   suivant en ouvre un neuf) ou si le Giff e2e est cerné (npm run e2e:abandon). Juste après un
   déploiement la connexion de global-setup.ts peut expirer une fois : relancer. Si mon npm run
   dev occupe 5173 sans le crochet : VITE_BOOMBALL_HOOK=1 VITE_BOOMBALL_PATIENT=1 npx vite
   --port 5174 --strictPort depuis boomball/client en arrière-plan, chauffer par deux curl,
   BASE_URL=http://localhost:5174, le tuer après (netstat -ano, taskkill). Le spec 3D admet deux
   avertissements console qui ne sont pas à nous (THREE.Clock, GL logiciel) ; toute autre ligne
   le fait échouer. Pour lire ce que le harnais a envoyé : la trace Playwright de
   e2e/test-results/ (trace.zip, les entrées resource-snapshot du .network) par un script Python.

7. useMatch.load porte un compteur de génération, ne l'enlève pas ; useMatch.stateRef est écrit
   partout où setState l'est ; sendMany(actions, asUnitId, quiet) porte sendAs et knock. Le
   bash de l'outil casse sur les accents graves et les apostrophes dans un heredoc : pour une
   série de remplacements, un script Python écrit dans le scratchpad, lancé avec python -I.
   Jamais Html de drei. La caméra ne passe pas par OrbitControls. Le corps du pion est le Giff
   riggé (giffRig.ts). Les hooks de Match.tsx restent au-dessus du retour anticipé sur state.
   Un module client testé par vitest n'importe jamais lib/supabase.ts (il jette sans son
   environnement) : les parties pures vivent à côté (lobbySeats.ts, roll.ts, coopClock.ts).

8. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55) ; un humain Striker ou Breaker choisit sa place (écart 58), et
   à plusieurs humains du rôle c'est le premier au d20 qui choisit, les autres derrière (écart
   65) ; écart 62, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers ; écart 53,
   penaltyBox ; 53 bis ; écart 56, turn.startedAt ; 57 ; 59 à 61 ; 63, turn.freePass ; 64, le
   rebond part de la bouche. Deux faits de règle sans décision : l'équipe qui a l'humain joue
   juste après le Spark à chaque round ; la dérive du Spark traverse les unités. Fait nouveau de
   la coop, sans décision : une équipe A dont le dernier humain a remis son siège n'a plus
   d'humain, et les deux camps alternent de round en round (sideOrder).

9. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
   dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
   Interface.html en entier.

10. Les commandes. Depuis boomball/ : npm test (759), npm run typecheck, npm run sweep, npm run
    e2e, e2e:playthrough, e2e:board3d, e2e:abandon, e2e:coop, npm run build:function. Depuis
    boomball/client/ : npm run dev sur http://localhost:5173 (jamais 127.0.0.1), npm run build,
    npm run typecheck. Depuis la racine : python boomball/supabase/checks/rls-check.py et
    browser-path.py, python .claude/scripts/check_drift.py. Le cwd de l'outil Bash se
    réinitialise entre deux appels : chemins absolus, ou npm --prefix.

11. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 65 de 00
    partie C, et C11 à C32 en entier. Dette connue, outre celle de la coop ci-dessus : arenas.art
    et le champ art nomment trois JPEG retirés ; substituteEntry non lu ; la parade du Breaker
    humain automatique ; le fondu croisé des foules sans compensation ; le délai de l'annonceur
    compté depuis le début du clip ; une réplique en cours jette le KO d'un coup suivant ; la
    coupure par un but ne libère pas le plancher ; FEED_LIMIT 120 ; le Spark peut rebondir
    plusieurs rounds dans une poche ; un gardien peut marcher jusqu'à côté d'un receveur marqué
    pour une passe d'une case ; le Shove d'un Bulwark n'est borné que par l'adjacence ; le Dash
    tenu n'existe que côté client ; en 3D, l'orientation du modèle, le noir sous la lèvre avant,
    l'orbite remise à la vue fixe au retour du 2D, la borne de suivi à l'azimut zéro, la roulette
    en vue large, le pan sous Ctrl interrompu au-dessus de la minicarte, la largeur garantie à
    l'inclinaison de départ, la répétition de la foule en vue large, l'effacement des gradins
    jugé sur la hauteur, la retenue en boîte, les captures des effets courts figées sous le GL
    logiciel, le ballon qui ne disparaît pas dans la bouche, pas d'étincelles en 2D, les
    commentaires « 2H.23 » de Tokens.tsx ; les quatre fichiers du vault modifiés hors de nos
    sessions, à moi de décider.

12. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte,
    après avoir récrit ce fichier.
