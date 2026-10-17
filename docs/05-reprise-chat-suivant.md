# Prompt de reprise pour le chat suivant

> Récrit le 2026-10-17 par le fil principal (Fable 5.1) à la fin du chat de l'interface d'équipe
> (2H.34, `00` C33), qui a suivi la coop (2H.31 à 2H.33, `00` C32). Tout ce qui précède est dans
> `07` §10, `08` §5 et `00` C1 à C33. À coller tel quel au début du chat suivant.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.34
est la dernière sous-phase codée (les phases 3, 4 et 5 sont faites par 2H.15, la 6 par 2H.29,
la 7 par 2H.31 à 2H.33, et 2H.34 est l'interface d'équipe qui a suivi ma première soirée de
coop), §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 65, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 à C16 les passes suivantes de l'IA (chacune finit par « comment ...
est codée », À LIRE avant de toucher à ai/), C17 la passe gratuite au gardien tranchée (elle
reste), C18 à C22 la caméra (C20 : MON REFUS d'une caméra à quatre nombres lissés), C23 et C24
le jeu vivant, C25 trois défauts d'écran, C26 le son et le rebond (écart 64, moteur 10), C27
l'annonceur systématique, C28 la ligue au choix, C29 annuler et quitter un match, C30 la phase 6
(3D par défaut, porteur, effectif fixe), C31 mes cinq retours (le Dash tenu, la latence MESURÉE
et LAISSÉE TOMBER), C32 la coop (cadrée en huit réponses de moi, codée en trois sous-phases le
2026-10-17 : 2H.31 A10 et la migration 0010, 2H.32 la batterie à plusieurs et la migration 0011,
2H.33 le match à plusieurs, l'écart 65, `ENGINE_VERSION` 11). **C33 est l'interface d'équipe,
2H.34, codée le 2026-10-17 après-midi sur mes retours de ma première soirée de coop, une maquette
cliquable que j'ai validée et quinze points validés en un lot** : le hub en une bande d'appel et
deux colonnes, vivant (canal `team:<id>`, présence du lobby lue depuis App) ; le lobby « The
bench » en trois cartes de siège ; mon image de la foule devant le silo en fond ; Battery devenu
Team partout à l'écran ; la migration 0012. Ne rediscute rien de C12 à C33.
07 §10 porte le journal (2H.15 la 2.5D fichier par fichier, 2H.16 à 2H.20 la caméra, 2H.21 et
2H.22 le jeu vivant, 2H.29 la phase 6, 2H.30 les cinq retours, « Le client en ligne », 2H.31,
2H.32, 2H.33, 2H.34). 09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de
sweep depuis 2H.8. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te
surprend.

Où on en est : **2H.34 est CODÉE le 2026-10-17, `ENGINE_VERSION` toujours 11, rien à redéployer
côté fonctions (`resolve-action` v27, `create-match` v25, moteur 11 en ligne depuis le 17).**
771 tests verts sur 45 fichiers, typecheck racine, scripts, e2e et client verts, le client
bundle. Smoke 2D vert en 27 s, `npm run e2e:coop` vert en 20 s, `e2e:board3d` vert en 7,8 min, sur la
nouvelle interface.
**LA MIGRATION 0012 (`0012_team_wording.sql`) EST APPLIQUÉE PAR MOI LE 2026-10-17** (vérifiée en
lecture avant et après, consignée en 04) : les trois messages SQL de 0011 en « team », le
propriétaire listé une fois par `battery_members` ; `mergeRoll` côté client est devenu inutile,
à retirer à la prochaine passe sur `roll.ts`. **LE
CLIENT EN LIGNE (https://boomball.vercel.app) EST ENCORE CELUI DU 16 AU SOIR (2H.30)** : il ne
connaît ni la coop ni la nouvelle interface ; il se redéploie par npm run build dans client/
puis node scripts/deploy-vercel.mjs --production depuis boomball/, SUR MON FEU VERT SEULEMENT,
et j'ai dit qu'on attendait la fin de 2H.34 pour le faire. Vérifier git status et git log
origin/main..main en premier et me le dire (`07a8ce3`, la coop, est poussé ; 2H.34 est à
commiter si je ne l'ai pas fait avec /commit en fin de chat), me proposer /save (ou /commit)
puis le push. Les fichiers de 2H.34 : client/src/lib/teamChannel.ts et useLobbyChannel.ts
(nouveaux), useAccount.ts, App.tsx, screens/TeamHub.tsx, Lobby.tsx, lobbySeats.ts (+test),
Shell.tsx et RoleGlyph.tsx (nouveaux), theme.css, match/Feed.tsx, Briefing.tsx, screens/Match.tsx
(un commentaire), lib/supabase.ts, roll.ts (+test), les six specs e2e et global-setup.ts,
client/public/crowd-entering-arena.webp (nouveau), assets/source/images/Crowd_entering_arena.jpg
(mon image, déplacée depuis client/public/), supabase/migrations/0012 et
server/migration0012.test.ts (nouveaux), docs 00 (C33), 04, 07 (§10), 08 (en-tête, §5), le skill
boomball, ce fichier. Les quatre fichiers du vault modifiés hors de nos sessions et les non
suivis MARGO.md, theodo.md, assets/source/ (mon JPEG de la foule y reste non suivi comme les
autres sources, seul le WebP de client/public/ est commité), scripts/blender/__pycache__/ ne sont pas à
nous : ne les commite pas sans mon feu vert ; check_vault.py signale MARGO.md et theodo.md,
c'est connu et c'est à moi.

Ce que 2H.34 contient, détail en 00 C33.

**Le hub.** En-tête (blason, nom, ligue avec trois barreaux laiton, « Switch team » en menu
`team-switch-open` puis `team-switch` seulement sur plusieurs équipes) ; une bande d'appel
« Enter the lobby » (ou « Back to the silo » et « Abandon this match » pour le propriétaire
quand un match tourne) avec « X is already in the lobby » en direct ; colonne Players (une ligne
par humain `member-row`, tag Owner ou rôle, tag cyan « In the lobby » `in-lobby`, retrait en deux
clics, « Leave this team » `leave-team`) ; carte « Invite a friend » (code `invite-code`, Copy,
New code) ; colonne « Your Giff » (les sept, glyphe par rôle, stats en bulle) ; pied de page
« Join a team » (`join-code`, `join-button`) et la ligne archivés et abandonnés
(`abandoned-note`, commence par le nombre). **Le hub est vivant** : `lib/teamChannel.ts`
(`announceTeamChange(teamId)` par `httpSend`, REST, jamais `send()` hors abonnement qui écrit
un avertissement console que le harnais compte comme une erreur ; appelé après join, départ,
retrait, nouveau code) et `useAccount` qui relit matchs et effectif sur `roll` et au retour sur
l'onglet ; `refresh(teamId)` bascule sur l'équipe rejointe. **Le canal de présence du lobby vit
dans App** (`lib/useLobbyChannel.ts`, `LobbyLink { seats, track, announceStarted }`) pour la durée
de l'équipe choisie : le hub lit qui attend, le lobby `track` son siège à chaque changement et le
retire en partant (`track(null)`), le broadcast `started` est entendu par tous (un membre sur le
hub voit le match tourner, un membre au lobby atterrit sur le plateau).

**Le lobby, « The bench ».** Trois cartes : la mienne (`seat-row`, bord cyan, champ `seat-name`,
quatre tuiles `data-role` / `data-taken` avec « n open », figées pour un membre une fois Ready),
celles des autres (`seat-row`, `data-ready`, joueur, Giff, rôle, badge Ready / « Choosing… » /
« Starts the match », arrivée animée `bb-arrive` seulement pour un siège qui arrive après le
premier dessin), les vides (`seat-empty`, le code à copier pour le propriétaire). La ligne
`lobby-tier-line` dit « Star · 2 named seats ». La barre basse : la ligue en segments
(`data-league`, `data-selected`, `data-locked`), « Waiting on X » / « Alone in the lobby » /
« Everyone is ready » pour le propriétaire (`waiting-on`), « X starts the match »
(`owner-starts`) pour un membre, « Start match » (`start-match`) ou « Ready » (`ready`,
`data-ready`). « Back to the hub » en haut à droite. Le flux de `start()` est inchangé
(saveSeatPreference, createMatch, `link.announceStarted`, onOpened).

**Le fond.** `Shell.tsx` : hazard, `/crowd-entering-arena.webp` fixe (198 Ko, WebP 1920 px
qualité 78 de mon JPEG 2752 × 1536) avec voile haut et bas et vignettage, colonne de 1120 px,
panneaux en verre (`--glass`, `--glass-deep`, flou derrière). Sur le hub, le lobby et « Raise a
team ».

**Les mots.** Battery → Team dans tout texte visible, les test ids et les specs (« Enter the
lobby », « Raise a team », « Team name », « The bench », `leave-team`). Restent : la RPC
`battery_members`, le type `BatteryResult`, le nom « E2E Battery » en base, et jusqu'au prochain
redéploiement des fonctions les messages « only the owner of the battery starts its matches »
(create-match) et « ...can abandon its match » (abandon_match), que l'écran ne laisse pas voir.

**Dette de 2H.34** : les trois canaux Realtime (`team:`, `lobby:`, le match) sont publics,
pour ma /security-review de la phase 8 ; « Giff picks the league » et « Giff starts the match »
se répètent dans la barre du membre ; `mergeRoll` reste côté client, inutile une fois 0012
appliquée ; un run `e2e:coop` rouge une fois sur la présence (le siège du second disparu du
lobby du propriétaire après son Ready), non reproduit par une sonde qui a tracé les trames ni par
le run suivant, à surveiller ; le nom du joueur sur la plaque des autres pions humains (dette de
2H.33) ; le bandeau « Your turn » qui reste sa durée après un siège remis ; un spectateur ne
frappe pas à la porte ; `e0d9b642` (moteur 10) et tous les matchs antérieurs ne se rejouent plus.

**Un fait de données à connaître** : le second compte e2e (`BOOMBALL_E2E2_EMAIL`,
`BOOMBALL_E2E2_PASSWORD`, affiché « E2E Second ») est maintenant membre de DEUX équipes, « E2E
Battery » (remis dessus par le fil principal le 17 par `join_team` en tant que joueur, après
qu'il l'avait quittée pendant ma soirée) et « Shrapnel oath », MON équipe (compte
tackergamingrss@gmail.com). `coop.spec.ts` bascule sur « E2E Battery » par le menu quand son hub
s'ouvre ailleurs. Ne le retire pas de mon équipe sans me le demander.

Ce que la coop contient, en bref (détail en 00 C32, ne pas rediscuter). 2H.31, A10 :
`append_match_step` en une transaction, 409 « the board moved on » au perdant d'une course.
2H.32 : plusieurs équipes par joueur, le code d'invitation (`teams.invite_code`, `join_team`,
renouvelable), le lobby partagé par présence, `create-match` au propriétaire seul (UN MEMBRE NE
JOUE PAS EN SOLO SUR MON ÉQUIPE, il monte la sienne). 2H.33 : l'écart 65 (`placementAt`,
`placeHumans`), `yieldSeat` / `seatYielded`, « Hand my Giff to the house », « Waiting for X ·
1:12 » chez tous, le coup à la porte par tout siège à cinq secondes (`coopClock.ts`), le
spectateur, l'abandon diffusé (`abandoned`). Les sous-phases d'avant : 2H.30 le Dash tenu côté
client (`dashHold.ts`), 2H.29 la 3D par défaut et l'effectif fixe (migration 0009), 2H.28
l'abandon (migration 0008), 2H.27 la ligue au choix, 2H.25 et 2H.26 le rebond et l'annonceur,
2H.21 à 2H.24 le jeu vivant et le Giff riggé, 2H.16 à 2H.20 la caméra, 2H.15 la 2.5D.

L'ORDRE DE LA SUITE, VALIDÉ PAR MOI : (1) à (4) FAITS (ligue et abandon, phase 6, client en
ligne, coop) ; (4 bis) **2H.34 l'interface d'équipe, CODÉE** ; (5) **le commit, le redéploiement du client sur mon feu vert, puis MA PARTIE À DEUX** (un ami, ou le
second compte e2e dans une fenêtre privée) sur la nouvelle interface, et mes retours ; (6) la
phase 8, le déploiement pour un ami : le script existe, restent `site_url` de l'Auth, la bande
passante Hobby (100 Go par mois, 13 Mo par premier chargement plus 200 Ko de fond), un ami qui
crée un compte, et DEUX TROUS à cadrer avec moi avant qu'un ami ne joue : pas de « mot de passe
oublié » ni de changement de mot de passe dans le jeu ; /security-review par moi.

LA TÂCHE DU PROCHAIN CHAT : vérifier git et me le dire ; me demander le feu vert pour redéployer le client en ligne ; puis MA PARTIE À DEUX et mes
retours ; puis cadrer la phase 8 avec moi, questions en chat, une ou deux par message.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 ou Fable 5.1 pour ce qui réclame de la qualité (le hub et
   le lobby de 2H.34 sont d'un Opus 5.5 effort élevé sur brief fermé, relus au harnais). Toute
   matière que tu me présentes nomme son auteur, agent ou fil principal. Dès que tu as une liste
   d'actions pour moi, donne-la numérotée, une action exacte par ligne, et dis ce qui se passe
   ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. Pour une interface, une maquette cliquable en artifact avant le code a très
   bien marché (2H.34) : je corrige dessus, puis je dis GO. L'outil de questions à choix sert aux
   arbitrages fermés. Pour expliquer pourquoi l'IA a fait un choix, lis les huit plans du viewer
   et le code, jamais une supposition. Ne dis plus « la maison » : « l'équipe qui a la balle »,
   « l'équipe qui ne l'a pas ». Et plus jamais « battery » à l'écran : « team ».

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

5. Toute migration passe par moi via /supabase-migrate (il n'y a pas de registre : 0001 à 0012
   sont appliquées, dit 04), tout redéploiement par mon feu vert explicite. Chaque
   match porte engine_version ; une fonction qui lit une autre version refuse en 409, le client
   archive. Les écritures destructives en base passent par moi ; la lecture passe (un script
   jetable dans le scratchpad qui poste un select à l'API de gestion fait l'affaire ; un script
   Node qui importe @supabase/supabase-js doit être copié dans client/ le temps de tourner, le
   scratchpad ne résout pas le paquet). Faire jouer ou rejoindre le compte e2e n'est pas
   destructif.

6. Le harnais : npm run e2e en 18 à 55 s, e2e:playthrough en 15 à 70 s, e2e:board3d en 6 à 10
   min, e2e:abandon en 10 s, e2e:coop en 20 à 40 s (hors de npm run e2e ; il abandonne le match
   e2e en cours pour atteindre le lobby, et abandonne le match coop qu'il ouvre). **Ne lance
   jamais npm test et e2e:board3d en même temps** : à 2 fps sous GL logiciel le bandeau « Your
   turn » de 1,2 s est raté et le spec tombe (vu le 17, vert seul). Le crochet window.__boomball
   (DEV seulement) : fx(), audio(), crowd(), lastSaid(), probe(), clickCell, act, legalSummary ;
   `yours` du crochet est faux derrière le briefing (utiliser waitFor sur « Into the silo »,
   jamais isVisible). waitForPlayableTurn répond à la popup à l'écran. Le smoke échoue si le
   match e2e atteint le round 10 pendant ses trois tours (le suivant en ouvre un neuf) ou si le
   Giff e2e est cerné (npm run e2e:abandon). Juste après un déploiement la connexion de
   global-setup.ts peut expirer une fois : relancer. Si mon npm run dev occupe 5173 sans le
   crochet : VITE_BOOMBALL_HOOK=1 VITE_BOOMBALL_PATIENT=1 npx vite --port 5174 --strictPort
   depuis boomball/client en arrière-plan, chauffer par deux curl, BASE_URL=http://localhost:5174,
   le tuer après (netstat -ano, taskkill). Le spec 3D admet deux avertissements console qui ne
   sont pas à nous (THREE.Clock, GL logiciel) ; toute autre ligne le fait échouer, y compris
   l'avertissement de `send()` hors abonnement. Pour lire ce que le harnais a envoyé : la trace
   Playwright de e2e/test-results/ ; pour voir la présence Realtime, une sonde Playwright qui
   écoute `page.on('websocket')` et filtre les trames `presence` (faite le 17, supprimée).

7. useMatch.load porte un compteur de génération, ne l'enlève pas ; useMatch.stateRef est écrit
   partout où setState l'est ; sendMany(actions, asUnitId, quiet) porte sendAs et knock. Le
   bash de l'outil casse sur les accents graves et les apostrophes dans un heredoc : pour une
   série de remplacements, un script Python écrit dans le scratchpad, lancé avec python -I.
   Jamais Html de drei. La caméra ne passe pas par OrbitControls. Le corps du pion est le Giff
   riggé (giffRig.ts). Les hooks de Match.tsx restent au-dessus du retour anticipé sur state.
   Un module client testé par vitest n'importe jamais lib/supabase.ts (il jette sans son
   environnement) : les parties pures vivent à côté (lobbySeats.ts, roll.ts, coopClock.ts).
   `supabase.channel(topic)` rend l'instance existante d'un même topic : ne jamais tenir deux
   fois le même canal dans deux composants, c'est pour ça que le lobby est dans App.

8. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55) ; un humain Striker ou Breaker choisit sa place (écart 58), et
   à plusieurs humains du rôle c'est le premier au d20 qui choisit, les autres derrière (écart
   65) ; écart 62, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers ; écart 53,
   penaltyBox ; 53 bis ; écart 56, turn.startedAt ; 57 ; 59 à 61 ; 63, turn.freePass ; 64, le
   rebond part de la bouche. Deux faits de règle sans décision : l'équipe qui a l'humain joue
   juste après le Spark à chaque round ; la dérive du Spark traverse les unités. Fait de la
   coop, sans décision : une équipe A dont le dernier humain a remis son siège n'a plus d'humain,
   et les deux camps alternent de round en round (sideOrder).

9. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
   dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
   Interface.html en entier (ses images sont compressées dans le bundle, inextractibles par une
   regex base64 ; le gabarit s'extrait par la commande du design/README.md).

10. Les commandes. Depuis boomball/ : npm test (771), npm run typecheck, npm run sweep, npm run
    e2e, e2e:playthrough, e2e:board3d, e2e:abandon, e2e:coop, npm run build:function. Depuis
    boomball/client/ : npm run dev sur http://localhost:5173 (jamais 127.0.0.1), npm run build,
    npm run typecheck. Depuis la racine : python boomball/supabase/checks/rls-check.py et
    browser-path.py, python .claude/scripts/check_drift.py. Le cwd de l'outil Bash se
    réinitialise entre deux appels : chemins absolus, ou npm --prefix.

11. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 65 de 00
    partie C, et C11 à C33 en entier. Dette connue, outre celle de 2H.34 et de la coop ci-dessus :
    arenas.art et le champ art nomment trois JPEG retirés ; substituteEntry non lu ; la parade du
    Breaker humain automatique ; le fondu croisé des foules sans compensation ; le délai de
    l'annonceur compté depuis le début du clip ; une réplique en cours jette le KO d'un coup
    suivant ; la coupure par un but ne libère pas le plancher ; FEED_LIMIT 120 ; le Spark peut
    rebondir plusieurs rounds dans une poche ; un gardien peut marcher jusqu'à côté d'un receveur
    marqué pour une passe d'une case ; le Shove d'un Bulwark n'est borné que par l'adjacence ; le
    Dash tenu n'existe que côté client ; en 3D, l'orientation du modèle, le noir sous la lèvre
    avant, l'orbite remise à la vue fixe au retour du 2D, la borne de suivi à l'azimut zéro, la
    roulette en vue large, le pan sous Ctrl interrompu au-dessus de la minicarte, la largeur
    garantie à l'inclinaison de départ, la répétition de la foule en vue large, l'effacement des
    gradins jugé sur la hauteur, la retenue en boîte, les captures des effets courts figées sous
    le GL logiciel, le ballon qui ne disparaît pas dans la bouche, pas d'étincelles en 2D, les
    commentaires « 2H.23 » de Tokens.tsx ; les quatre fichiers du vault modifiés hors de nos
    sessions, à moi de décider.

12. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte,
    après avoir récrit ce fichier.
