# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Fable 5.1) le 2026-10-14, à la fin du chat qui a consigné les trois
> matchs de Jérôme sur le moteur 8, écrit `00` C16 sur ses retours et codé 2H.14 (la passe
> gratuite après le Shove, le relais du Trajector au coup d'envoi, trois retours d'écran). À coller
> tel quel comme premier message du chat suivant, dans le workspace `jarvis-jdr`. La ligne « Où on
> en est » dit si la mise en ligne a eu lieu.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.14
est la dernière sous-phase codée, §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 63, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 la quatrième passe, C13 la cinquième, C14 l'écart 58 (ma place dans
mon rôle, par une popup) et la sixième passe, C15 le lot du 2026-10-14 (le chrono, les écarts 59
à 62, la septième passe), C16 le lot du 2026-10-14 au soir : l'écart 63, la passe gratuite après
le Shove qui prend le ballon, la huitième passe (le relais du Trajector au coup d'envoi, la passe
gratuite dans le plan de tour) et trois retours d'écran. Chaque passe finit par « comment ...
est codée », poids par poids, À LIRE avant de toucher à ai/. Ne rediscute rien de C12 à C16.
07 §10 porte le journal, dont l'entrée 2H.14. 09 §12 est le dernier sweep, tranché « rien ne
bouge » ; il n'y a pas de sweep de 2H.8 à 2H.14. 04 est l'histoire, à lire seulement quand une
décision d'ingénierie te surprend.

Où on en est : 2H.14 est CODÉE, COMMITÉE (e8c0fee puis les commits de contexte) et EN LIGNE
depuis le 2026-10-14 au soir sur mon feu vert : resolve-action v20, create-match v18,
ENGINE_VERSION 9, aucune migration, les matchs ouverts du moteur 8 archivés. 643 tests verts
sur 29 fichiers (617 avant), typecheck racine, scripts, e2e et client verts, build du client
vert, smoke (40 s) et playthrough (37 s, 20 requêtes humaines, 0 refusée) verts sur les fonctions
redéployées, le match e2e du moteur 9 (7d631b71) rejoué sans écart, la popup vue en haut à
gauche, les carrés orange vus autour de chaque adversaire, plus de ligne de tiers. Pas de sweep,
pas demandé. Les textures CC0 de la phase 3 sont choisies et téléchargées dans
context/import/textures-ambientcg/ : MetalPlates013 le sol, 011 les parois, 014 les caisses.
Je veux les pions version 2 (modèles 3D) mais Meshy et Tripo exigent un abonnement pour
télécharger : la voie gratuite reste à trouver, la phase 3 démarre avec la version 1 en code.
Dix-huit matchs d'auto-jeu de contrôle (scripts/control-2h14.ts) : 1,7 / 1,8 / 1,8 buts de
ballon par match (rookie, veteran, star), 92 prises de balle sur 93 Shove réussis, 87 passes
gratuites jouées derrière dont 4 volées, le Trajector ne prend jamais le coup d'envoi et ne
recule jamais au round 1 (0 sur 36), 36 sur 36 finissent à portée de passe du ballon.

Ce que 2H.14 a changé, en quatre phrases. Écart 63 : un Shove réussi sur un porteur met le
ballon dans les mains du bousculeur et lui laisse une passe sans Action pour le reste du tour,
n'importe quand, depuis la case du Shove ou après avoir marché, à tout coéquipier à portée et
en vue qu'il ait joué ou non, interceptable, jamais un tir (turn.freePass, moteur 9). Le
Trajector lit le ballon du coup d'envoi comme déjà porté par un Striker qui n'a pas joué, debout
sur la case du ballon, et finit en relais devant lui, jamais plus près de sa propre bouche que sa
case de départ (kickoffRelay, kickoffMayEnd). La passe gratuite est un plan de tour, « passer »
ou « marcher puis passer », les deux filtres de la chaîne levés comme pour un appel. L'écran :
la popup naît en haut à gauche, toute case adjacente à un adversaire porte le carré orange à
chaque tour (data-reach), les pointillés des tiers ont disparu.

Les quatre fichiers du vault modifiés hors de nos sessions (Sapphire Hammer.md, la PREP de la
scène 1.2 Ilthavax, sa battlemap et les prompts de battlemap de la scène 1.3) et les deux
fichiers non suivis MARGO.md et theodo.md ne sont pas à nous : ne les commite pas sans mon feu
vert.

LA TÂCHE.
1. Vérifier git status avant toute chose ; tout est commité au 2026-10-14 au soir.
2. Mes parties sur 2H.14 : les retrouver par dump-match.ts --list (horaires en UTC) et
   consigner celles que je nomme. Un match du moteur 8 ne se rejoue plus avec le dépôt du
   moteur 9. Pas de lecture round par round sauf si je la demande ou si tu la proposes avec
   une raison. Un fait à relire avec moi : en ligne, un Breaker a joué sa passe gratuite vers
   son gardien treize cases derrière lui, les trois receveurs à portée étant tous derrière.
3. Mes retours s'il y en a, en chat, puis C17 dans 00 avant toute ligne de code.
4. Puis la phase 3 de 08 §5, la scène 2.5D statique, dont A20 (React 19) est le premier pas :
   dépendances three, fiber, drei (07 §4.3), layoutGeometry.ts, Silo.tsx, Camera.tsx en trois
   quarts fixe avec deux zooms et sans rotation (J4), les pions version 1 de 07 §5 (socle
   hexagonal, capsule, glyphe de rôle, plaque Html), l'interrupteur 2D / 3D, le crochet
   cellToScreen sur la caméra 3D. Ce que Jérôme prépare : deux ou trois textures CC0 d'ambientCG
   (sol riveté, paroi courbe rouillée, caisse ou pilier), à convertir en WebP 1K ; il a généré un
   Giff 3D avec Meshy mais ne peut pas le télécharger sans abonnement ; il veut la version 2 des
   pions, à intégrer dès qu'un glb existe dans context/import/, licence à créditer.
5. Un sweep seulement si je le demande, un seul par lot, contre 09 §12, seize minutes.

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
   (freeThrow dans plans, free dans throwsAt) lève les deux filtres de la chaîne.

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
   match-data du viewer. Les dossiers de docs/matches/ du 11 au 14 octobre avant 20edbca9 sont
   des matchs des moteurs 5 à 7 : ils ne se rejouent plus ; les trois du 14 au soir sont du
   moteur 8 et ne se rejoueront plus avec le dépôt du moteur 9.

6. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse
   en 409, le client archive.

7. Le harnais d'écran : npm run e2e en 25 à 55 s, npm run e2e:playthrough en 15 à 70 s, le
   crochet window.__boomball. waitForPlayableTurn dans e2e/harness.ts répond à la popup par un
   clic à l'écran (data-place, place-close) et capture la première vue ; le smoke clique 1, puis
   Close, puis 2, le playthrough une place différente à chaque round. Le siège humain du
   playthrough est piloté par chooseAction du dépôt depuis Node. Le smoke suppose une case de
   destination au tour 1 et au tour 3, un clic simple sur une case qui envoie la route la plus
   courte, et un pion cliquable au tour 2. Il échoue si le match e2e en cours atteint le round 10
   pendant ses trois tours : lancer npm run e2e:playthrough pour le finir. Juste après un
   déploiement, la connexion de global-setup.ts peut expirer une fois : relancer. Si le npm run
   dev de Jérôme occupe 5173 sans le crochet, le smoke échoue sur « hook absent » : lancer un
   second Vite depuis boomball/client en arrière-plan, VITE_BOOMBALL_HOOK=1 VITE_BOOMBALL_PATIENT=1
   npx vite --port 5174 --strictPort, puis BASE_URL=http://localhost:5174 npm run e2e, et le tuer
   après (netstat -ano, taskkill). Vus au harnais : la zone violette (data-box), le marqueur de
   Réaction dépensée, la popup en haut à gauche, les carrés orange (data-reach) ; pas encore vus
   à l'écran : « is moved out of the penalty box », « cannot recoil », « and takes the Payload »
   (ces deux dernières sont dans le fil du playthrough, capture 03 du 2026-10-14T18-47-01).

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev. Ne l'enlève pas. Le bash de l'outil casse sur les accents graves dans un heredoc :
   pour une série de remplacements, un script Python écrit par l'outil d'écriture, puis lancé
   avec python -I.

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

11. Les commandes. Depuis boomball/ : npm test (643), npm run typecheck, npm run sweep (environ
    16 minutes), npm run e2e, npm run e2e:playthrough, node scripts/run-ts.mjs
    scripts/control-2h14.ts (dix-huit matchs de contrôle, pas un sweep). Depuis boomball/client/ :
    npm run dev sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck.
    Depuis la racine du workspace : python boomball/supabase/checks/rls-check.py et
    browser-path.py, et python .claude/scripts/check_drift.py. Le cwd de l'outil Bash se
    réinitialise entre deux appels : chemins absolus, ou npm --prefix.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 63 de 00 partie
    C, et C11 à C16 en entier. Dette connue : arenas.art et le champ art du spec nomment trois
    JPEG retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; A20 (React 19)
    reste le premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la parade est
    automatique ; la route proposée au clic reste la ligne droite alors que l'IA prend la route
    sûre ; le fil garde 120 événements (FEED_LIMIT) ; le Spark peut rebondir plusieurs rounds dans
    une poche du terrain ; le test du point 5 dans fifthPass.test.ts fait varier idleSwing en
    place et le remet ; le bandeau « The clock ran out » dit « Your Giff took cover » même quand
    c'est la popup qui a expiré ; plusieurs humains d'un même rôle (coop) n'ont pas de popup, à
    relire en phase 7 ; la popup n'est pas rebornée quand la fenêtre rétrécit, la déplacer
    suffit ; le bouton « Call for the ball » reste actif pendant la popup ; un gardien peut
    marcher au-delà de sa laisse jusqu'à côté d'un receveur marqué pour une passe d'une case,
    qu'aucune allonge n'intercepte (écart 48) ; le Shove d'un Bulwark n'est borné que par
    l'adjacence, pas par sa laisse ; le fil ne dit pas qu'une passe était gratuite ; le temps par
    match d'auto-jeu se mesure entre 1,4 et 2,7 s selon la charge de la machine, à relire sur une
    machine calme avant de conclure à une régression ; les quatre fichiers du vault modifiés hors
    de nos sessions, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
