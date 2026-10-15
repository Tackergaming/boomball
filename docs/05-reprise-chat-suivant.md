# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Fable 5.1) le 2026-10-15, à la fin du chat qui a pris les retours
> de Jérôme sur ses deux premières parties en 3D, écrit `00` C18 et C19, consigné sa décision
> sur C17 et codé 2H.16 puis 2H.17 : la caméra en main, puis décrochée. À coller tel quel comme premier message du chat suivant, dans le
> workspace `jarvis-jdr`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.17
est la dernière sous-phase codée (les phases 3, 4 et 5 sont faites par 2H.15), §9 la
parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 63, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 la quatrième passe, C13 la cinquième, C14 l'écart 58 (ma place dans
mon rôle, par une popup) et la sixième passe, C15 le lot du 2026-10-14 (le chrono, les écarts 59
à 62, la septième passe), C16 le lot du 2026-10-14 au soir (l'écart 63, la passe gratuite après
le Shove qui prend le ballon, la huitième passe, trois retours d'écran), C17 le lot de la nuit
du 2026-10-14 : mon retour sur les cases orange, retirées, et la passe gratuite d'un Breaker vers
son gardien treize cases derrière lui, TRANCHÉE le 2026-10-15 : elle reste autorisée, rien ne
change. C18 le lot du 2026-10-15 : mes deux retours de caméra après ma première partie en 3D, et
J4 qui tombe. C19 le second lot du 2026-10-15 : la caméra décrochée du jeu, mon retour après ma
partie sur 2H.16. Chaque passe finit par « comment ... est codée », poids par poids, À LIRE avant
de toucher à ai/. Ne rediscute rien de C12 à C19.
07 §10 porte le journal, dont l'entrée 2H.15, qui dit fichier par fichier ce que la 2.5D
contient, et les entrées 2H.16 et 2H.17, la caméra. 09 §12 est le dernier sweep, tranché « rien
ne bouge » ; il n'y a pas de sweep de 2H.8 à 2H.17. 04 est l'histoire, à lire seulement quand une décision
d'ingénierie te surprend.

Où on en est : 2H.16 et 2H.17 sont CODÉES le 2026-10-15, ENGINE_VERSION toujours 9, rien à
redéployer côté fonctions, le client en ligne PAS redéployé depuis 2H.14 (mon feu vert). Les
fonctions en ligne restent resolve-action v20 et create-match v18, moteur 9. 665 tests verts sur
31 fichiers (652 avant 2H.16), typecheck racine, scripts, e2e et client verts, build du client vert (three dans un chunk
chargé en lazy, le 2D ne le télécharge pas). Le harnais 3D, npm run e2e:board3d, est vert en 2,0
minutes sur un Vite dédié (5174) : bascule en 3D, silo entier capturé, cellToScreen par la caméra,
clic à la souris sur la case qu'il désigne et le pion arrive, cadrage rapproché, glisser au
bouton droit puis roulette, la case suivie se projette ailleurs, le bouton de cadrage la ramène,
flèche droite tenue, le cadre passe en data-camera="free", « Follow the play » la ramène, tour de
l'équipe adverse, retour 2D, zéro erreur console. Le smoke 2D (npm run e2e) n'a pas été relancé
en 2H.16 ni 2H.17, rien de 2D n'a bougé ; la ligne « Smoke 2D » du journal 2H.15 dans 07 §10 dit
vert. Ma partie sur le moteur 9 (ab27b827, Striker, 50-0) et le match e2e 7d631b71 sont
consignés et rejoués sans écart dans docs/matches/. 2H.16 est commitée et poussée (fd85266) ; le
commit de 2H.17 : à vérifier par git log, c'est moi qui le tape.

Ce que 2H.17 contient, en trois phrases. La caméra se décroche du jeu dès qu'on la déplace :
aux flèches (KEY_PAN_RATE fois la distance par seconde, dans les axes de l'image donnés par
viewAxes, donc « haut » est toujours le loin de l'image), ou Ctrl enfoncé plus la souris sur la
scène, qui tire le sol avec elle ; le point visé est borné par clampPan au terrain plus quatre
cases. Elle se raccroche d'elle-même quand mon pion (yoursId) arrive sur l'horloge, au clic sur
« Follow the play » (visible seulement décrochée, data-testid follow-play), et au choix d'un
cadrage ; hooked est un état React de Board3D.tsx passé au Rig, qui appelle onUnhook une fois au
premier pan, et le cadre porte data-camera="following" ou "free". Accrochée, la caméra recopie sa
cible dans le point de pan à chaque image pour que le décrochage parte de là, sans saut.

Ce que 2H.16 contient, en quatre phrases. client/src/board3d/framing.ts est nouveau et pur : la
profondeur de sol que la hauteur de l'image couvre selon l'inclinaison (groundDepthPerUnit), le
décalage du centre de ce sol par rapport au point visé (groundCentreOffsetPerUnit), les deux
cadrages (presetDistance : rapproché, les quinze cases de large plus une dans la hauteur de
l'image ; large, les quarante-cinq de long et jamais moins que la largeur), la position sur
l'orbite (orbitPosition) et les bornes (inclinaison 20 à 85 degrés, roulette 0,3 à 2,5 fois),
onze tests. Camera.tsx porte l'orbite en main : glisser au bouton droit ou du milieu pour
tourner, roulette pour la distance, menu contextuel coupé sur le canevas, le bouton gauche reste
au jeu, le point visé amorti, la position déduite de l'orbite à chaque image, et un clic sur
« Close in / Whole silo » remet l'orbite à la vue fixe. En rapproché la caméra glisse le long du
terrain après le pion dont c'est le tour sinon le ballon, bornée aux bouts du silo, et ne suit en
travers que si la roulette a rapproché. Le crochet n'a pas bougé : cellToScreen et les plaques
lisent la caméra au moment de l'appel.

Ce que 2H.15 contient, en cinq phrases. Les carrés orange de 2H.14 sont retirés de Board.tsx,
la route sous le curseur reste orange quand elle provoque et l'étiquette compte les allonges.
React 19 (A20) et three, fiber, drei sont installés ; tout client/src/board3d/ est nouveau :
layoutGeometry.ts (pur, testé), Silo.tsx (sol, tube couché, caisses, piliers, deux bouches qui
flambent au but, mes trois textures en WebP 1K dans board3d/textures/), Camera.tsx, Tokens.tsx
(socle, anneaux, MON GLB de Giff dans client/public/models/, capsule en repli), Overlay.tsx
(tuiles, routes, ligne de vue, tir), Labels.tsx (plaques en DOM, jamais Html de drei qui fait
hurler React 19), Ordnance.tsx, Minimap.tsx, Board3D.tsx. L'animation lit match/pose.ts, sorti
de Board.tsx sans changement et partagé par les deux plateaux, dans une seule useFrame : marche,
poussée, recul, Crackers, Spark, passe et tir en arc. L'interrupteur est le bouton « See it in
3D » de l'écran de match, choix gardé dans localStorage, et le crochet publie view. Dette connue
de la 2.5D : l'orientation du modèle (MODEL_YAW dans Tokens.tsx, à vérifier sur mes captures),
pas de sprite d'impact ni d'explosion (Effects.tsx reste à faire, phase 6), le noir sous la lèvre
avant en vue large, les pions tous du même maillage sans couleur d'équipe sur l'armure (le socle
et les plaques la portent) ; et depuis 2H.16, l'orbite qui se remet à la vue fixe quand on passe
par le 2D et revient, la borne de suivi aux bouts du silo calculée pour l'azimut zéro, la
roulette en vue large qui grossit le centre sans suivre le jeu.

Les quatre fichiers du vault modifiés hors de nos sessions (Sapphire Hammer.md, la PREP de la
scène 1.2 Ilthavax, sa battlemap et les prompts de battlemap de la scène 1.3) et les deux
fichiers non suivis MARGO.md et theodo.md ne sont pas à nous : ne les commite pas sans mon feu
vert. Les archives de textures (19 Mo) dans context/import/textures-ambientcg/ et le glb source
dans context/import/ ne sont pas commités non plus ; la copie du glb dans client/public/models/
et les WebP le sont.

LA TÂCHE.
1. Vérifier git status avant toute chose ; 2H.16 doit être commitée (par /commit ou /save, tapés
   par moi) ; si elle ne l'est pas, me le dire en premier.
2. Ma partie en 3D avec la caméra libre : je l'ai jouée ou je la joue, en local (npm run dev
   dans boomball/client, « See it in 3D », bouton droit pour tourner, roulette pour zoomer,
   flèches ou Ctrl plus souris pour me déplacer, « Follow the play » pour revenir). Mes retours
   en chat, puis C20 dans 00 avant toute ligne de code.
3. Si je demande le client en ligne : le build est vert, le déploiement passe par mon feu vert
   explicite, jamais le dépôt GitHub sur Vercel.
4. Un sweep seulement si je le demande, un seul par lot, contre 09 §12, seize minutes.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 effort high pour l'analyse d'une partie, c'est moi qui la
   demande. Toute matière que tu me présentes nomme son auteur, agent ou fil principal. Dès que
   tu as une liste d'actions pour moi, donne-la numérotée, une action exacte par ligne, et dis ce
   qui se passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. Quand tu me présentes
   une analyse, le round par round, les leçons et la liste par rôle en clair dans le message,
   jamais un renvoi chiffré vers un tableau que je n'ai pas sous les yeux. Pour expliquer pourquoi
   l'IA a fait un choix, lis les huit plans du viewer et le code, jamais une supposition. Ne dis
   plus « la maison » : « l'équipe qui a la balle », « l'équipe qui ne l'a pas », « en attaque »,
   « en défense ». L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, un seul par lot de changements d'IA. Tu ne
   touches à aucune constante de 00 sans mon arbitrage. Les poids de l'IA sont dans ai/roles/, et
   ils viennent de mes mots dans 00 C10 à C16 ; la formule est : note du plan = valeur de l'action
   depuis sa case + position de la case finale (Action dépensée) − position de la case de départ
   − exposition des trajets, chaque valeur d'action étant un poids du rôle fois sa chance de
   réussite. Depuis 2H.11 : un plan porte ses provocations et à note égale le moins provocant
   gagne ; une allonge coûte au moins 5 points ; le porteur ne recule jamais ; le dernier round
   lit le score. Depuis 2H.12 : pour le Breaker, tout plan qui ramasse un ballon atteignable dans
   le tour, Dash compris, gagne PICKUP_FIRST (1000), sauf debout sur le Spark. Depuis 2H.13 :
   le porteur gagne jusqu'à 15 % de carryToFurnace en s'enfonçant dans sa portée propre
   (depthInRange), le tireur qui a manqué lit shooterYields, le gardien écarte toute passe avec un
   intercepteur, un receveur appelé passe outre les filtres de la chaîne. Depuis 2H.14 : le
   Trajector au coup d'envoi lit le ballon comme porté (kickoffRelay, relayValue) et ne finit
   jamais plus près de sa bouche que sa case de départ (kickoffMayEnd) ; la passe gratuite
   (freeThrow dans plans, free dans throwsAt) lève les deux filtres de la chaîne, et elle peut
   viser le gardien loin derrière : c'est tranché en C17, elle reste.

4. Le plan de tour, en trois phrases : chooseAction renvoie la première action du meilleur plan
   et l'appelant rappelle après chaque action, donc l'IA se juge sur rankPlans (le plan entier et
   sa phrase) et jamais sur une seule action. Un plan se lit à sa fin, Action dépensée ; « marcher
   puis attraper » (chasseur seul), « marcher puis ramasser », « ramasser puis lancer », pour
   le Breaker « dash, marcher, ramasser », et après un Shove qui prend le ballon « passer » ou
   « marcher puis passer » sans Action sont des plans ; une frappe finit sur sa case de recul ;
   toute route est la route sûre de safeReachableCells. Ce qu'une case débloque se demande au
   moteur par actionOptionsAt dans legalActions.ts.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne : depuis boomball/ en bash,
   set -a && . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis
   --match <id>. --list ne montre que les douze derniers matchs ; pour en voir plus, copier le
   script avec limit=40 dans scripts/, lancer, effacer la copie. Il écrit match.md, viewer.html,
   events.json, kickoff.json et match.json dans docs/matches/<date>-<id8>/ et rejoue le match en
   local. Les horaires de --list sont en UTC, deux heures de moins que l'heure de Paris. Une
   passe interceptée peut afficher « DIFFERS » sans vraie différence : le receveur d'une passe
   volée est dans l'événement (toId), mais le dump retient encore la première passe qui produit
   les mêmes jets. Pour publier le viewer en artefact privé, l'outil Artifact sur viewer.html ;
   pour lire les plans d'une décision sans ouvrir le navigateur, le JSON est dans la balise
   match-data du viewer. Les dossiers de docs/matches/ d'avant 20edbca9 sont des matchs des
   moteurs 5 à 7, les trois du 14 au soir du moteur 8 : ils ne se rejouent plus avec le dépôt du
   moteur 9 ; ab27b827 et 7d631b71 sont du moteur 9 et se rejouent.

6. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse
   en 409, le client archive.

7. Le harnais d'écran : npm run e2e en 25 à 55 s, npm run e2e:playthrough en 15 à 70 s, npm run
   e2e:board3d en 1,7 min, le crochet window.__boomball. waitForPlayableTurn dans e2e/harness.ts
   répond à la popup par un clic à l'écran (data-place, place-close) et capture la première vue ;
   le smoke clique 1, puis Close, puis 2, le playthrough une place différente à chaque round, le
   spec 3D la place 2. Le siège humain du playthrough est piloté par chooseAction du dépôt depuis
   Node. Le smoke suppose une case de destination au tour 1 et au tour 3, un clic simple sur une
   case qui envoie la route la plus courte, et un pion cliquable au tour 2. Il échoue si le match
   e2e en cours atteint le round 10 pendant ses trois tours : lancer npm run e2e:playthrough pour
   le finir. Juste après un déploiement, la connexion de global-setup.ts peut expirer une fois :
   relancer. Si le npm run dev de Jérôme occupe 5173 sans le crochet, le smoke échoue sur « hook
   absent » : lancer un second Vite depuis boomball/client en arrière-plan,
   VITE_BOOMBALL_HOOK=1 VITE_BOOMBALL_PATIENT=1 npx vite --port 5174 --strictPort, puis
   BASE_URL=http://localhost:5174 npm run e2e, et le tuer après (netstat -ano, taskkill). En 3D
   il n'y a ni data-cell ni data-unit : le spec clique à la souris là où cellToScreen projette, et
   les plaques portent data-plate. Le spec 3D tourne la caméra avec page.mouse.down({ button:
   'right' }) puis page.mouse.wheel, et la déplace avec page.keyboard.down('ArrowRight'). Il admet deux avertissements console qui ne sont pas à nous
   (THREE.Clock déprécié par three 0.186 mais construit par fiber 9, et les messages de
   performance du GL logiciel de Chromium headless) ; toute autre ligne le fait échouer.

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev. Ne l'enlève pas. Le bash de l'outil casse sur les accents graves dans un heredoc :
   pour une série de remplacements, un script Python écrit par l'outil d'écriture ou en heredoc
   quoté, puis lancé avec python -I. Jamais Html de drei : React 19 signale son démontage
   synchrone en erreur console, les étiquettes passent par Labels.tsx et link.project. La caméra
   ne passe pas par OrbitControls de drei : l'orbite est dans Camera.tsx et sa géométrie dans
   framing.ts, parce que le point visé est amorti et suit le jeu.

9. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55), un humain Striker ou Breaker choisit sa place (écart 58) ;
   écart 62, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers ; écart 53,
   penaltyBox indexé par l'équipe qui DÉFEND la bouche ; 53 bis, applyPass le remet à null quand
   le Bulwark lance ; écart 56, turn.startedAt ; écart 57, un porteur ne tente jamais le Spark ;
   écart 59, la dérive du Spark tire un d8 par round loin des Trajectors ; écart 60, le retour à
   9 cases ; écart 61, le Shove prend le ballon ; écart 63, la passe gratuite qui suit,
   turn.freePass. Deux faits de règle constatés sans décision : l'équipe qui a l'humain joue
   juste après le Spark à chaque round ; la dérive du Spark traverse les unités et peut finir sous
   les pieds d'une unité.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (663), npm run typecheck, npm run sweep (environ
    16 minutes), npm run e2e, npm run e2e:playthrough, npm run e2e:board3d, node scripts/run-ts.mjs
    scripts/control-2h14.ts (dix-huit matchs de contrôle, pas un sweep). Depuis boomball/client/ :
    npm run dev sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck.
    Depuis la racine du workspace : python boomball/supabase/checks/rls-check.py et
    browser-path.py, et python .claude/scripts/check_drift.py. Le cwd de l'outil Bash se
    réinitialise entre deux appels : chemins absolus, ou npm --prefix.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 63 de 00 partie
    C, et C11 à C19 en entier ; J4 de 08 §7 est tombé en C18. Dette connue : arenas.art et le
    champ art du spec nomment trois JPEG retirés ; substituteEntry et substitute_entry restent et
    ne sont plus lus ; le choix de direction d'un Breaker humain à la parade est automatique ; la
    route proposée au clic reste la ligne droite alors que l'IA prend la route sûre ; le fil garde
    120 événements (FEED_LIMIT) ; le Spark peut rebondir plusieurs rounds dans une poche du
    terrain ; le test du point 5 dans fifthPass.test.ts fait varier idleSwing en place et le
    remet ; le bandeau « The clock ran out » dit « Your Giff took cover » même quand c'est la
    popup qui a expiré ; plusieurs humains d'un même rôle (coop) n'ont pas de popup, à relire en
    phase 7 ; la popup n'est pas rebornée quand la fenêtre rétrécit, la déplacer suffit ; le
    bouton « Call for the ball » reste actif pendant la popup ; un gardien peut marcher au-delà de
    sa laisse jusqu'à côté d'un receveur marqué pour une passe d'une case, qu'aucune allonge
    n'intercepte (écart 48) ; le Shove d'un Bulwark n'est borné que par l'adjacence, pas par sa
    laisse ; le fil ne dit pas qu'une passe était gratuite ; le temps par match d'auto-jeu se
    mesure entre 1,4 et 2,7 s selon la charge de la machine ; en 3D, l'orientation du modèle, les
    sprites d'effets, le noir sous la lèvre avant, l'orbite remise à la vue fixe au retour du 2D,
    la borne de suivi calculée pour l'azimut zéro, la roulette en vue large qui ne suit pas le
    jeu, le pan sous Ctrl qui s'interrompt au-dessus de la minicarte et des boutons ; les quatre
    fichiers du vault modifiés hors de nos sessions, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
