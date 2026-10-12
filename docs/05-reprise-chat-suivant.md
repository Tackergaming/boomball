# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Opus 5.5) le 2026-10-12, à la fin du chat qui a écrit C14, codé et
> mis en ligne 2H.12 (l'humain choisit sa place dans son rôle, le Breaker ramasse d'abord). À
> coller tel quel comme premier message du chat suivant, dans le workspace `jarvis-jdr`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.12
est la dernière sous-phase codée, §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 58, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 la quatrième passe, C13 la cinquième passe, C14 l'écart 58 (ma place
dans mon rôle, par une popup) et la sixième passe (le Breaker ramasse d'abord). Chaque passe
finit par « comment ... est codée », poids par poids, À LIRE avant de toucher à ai/. Ne
rediscute rien de C12, C13 ni C14. 07 §10 porte le journal, dont l'entrée 2H.12. 09 §12 est le
dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep de 2H.8 à 2H.12. 04 est
l'histoire, à lire seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.12 est CODÉE, COMMITÉE (bf00089 puis le commit de mise en ligne) et EN LIGNE
depuis le 2026-10-12 sur mon feu vert : resolve-action v18, create-match v16, ENGINE_VERSION 7,
aucune migration, les matchs ouverts du moteur 6 archivés. 549 tests verts sur 25 fichiers (530
avant), typecheck vert, build du client vert, smoke et playthrough verts sur les fonctions
redéployées (17 requêtes humaines, 0 refusée). La popup a été vue au harnais, capture lue. Pas
de sweep, à ma demande. Dix-huit matchs d'auto-jeu pour contrôler que le sport se joue encore :
2,7 / 2,0 / 3,3 buts de ballon par match (rookie, veteran, star), contre 1,1 à 2,2 au dernier
sweep de 09 §12.

Comment l'écart 58 marche, en quatre phrases. Quand l'échelle atteint le premier tour de mon
rôle (Striker ou Breaker) dans le round, le moteur ouvre un tour d'attente à mon unité,
turn.placing = le nombre de places, et la seule action légale est choosePlace. Place 1 : mon
tour commence ; place 2 ou 3 : mon slot passe derrière une ou deux IA du rôle. La popup a son
propre chrono et mon tour repart sur un chrono neuf ; chrono expiré ou popup fermée, je joue
dernier. Mon Trajector, qui joue avant la popup, planifie avec moi en dernier.

NON COMMITÉ dans la copie de travail, à commiter en premier (par /commit, sans me demander de
valider le message) : ce que /update aura écrit le 2026-10-12 s'il a été lancé après le dernier
commit. check_drift.py disait « aucune dérive » au commit.

Les quatre fichiers du vault modifiés hors de nos sessions (Sapphire Hammer.md, la PREP de la
scène 1.2 Ilthavax, sa battlemap et les prompts de battlemap de la scène 1.3) ne sont pas à
nous : ne les commite pas sans mon feu vert.

DEUX CHOSES OUVERTES, à me poser en début de chat si je n'en parle pas.

1. Constat du fil principal, sans décision : le Trajector prend le ballon du coup d'envoi, dans
   douze matchs d'auto-jeu sur douze et dans ma partie a17c22a5 (Thessa), contre C10 Trajector 3
   et C10 commune 6. Cause lue dans le code : le plan « marcher, ramasser, passer » de 2H.10 se
   note sur grabPayload sans le facteur chaseKickoff, qui ne pèse que dans positionValue. À moi
   de dire si on corrige.
2. Mes trois matchs du 2026-10-12 sur le moteur 6, après la mise en ligne de 2H.11 (Shrapnel
   oath, 7a059776, 08a495b4 et 3665fa4a, ce dernier en Trajector), ne sont pas consignés. À moi
   de dire s'ils comptent comme ma partie sur 2H.11.

LA TÂCHE : ma partie sur 2H.12, consignée avec dump-match.ts. Pas de lecture round par round
sauf si je la demande ou si tu la proposes avec une raison. Un sweep seulement si je le demande,
un seul, contre 09 §12, quatorze minutes.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 effort high pour l'analyse d'une partie, c'est moi qui le
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
   ils viennent de mes mots dans 00 C10 à C14 ; la formule est : note du plan = valeur de l'action
   depuis sa case + position de la case finale (Action dépensée) − position de la case de départ
   − exposition des trajets, chaque valeur d'action étant un poids du rôle fois sa chance de
   réussite. Depuis 2H.11 : un plan porte ses provocations et à note égale le moins provocant
   gagne ; une allonge coûte au moins 5 points ; le porteur ne recule jamais ; le dernier round
   lit le score. Depuis 2H.12 : pour le Breaker, tout plan qui ramasse un ballon atteignable dans
   le tour, Dash compris, gagne PICKUP_FIRST (1000), sauf debout sur le Spark, où la prise passe
   devant.

4. Le plan de tour, en trois phrases : chooseAction renvoie la première action du meilleur plan
   et l'appelant rappelle après chaque action, donc l'IA se juge sur rankPlans (le plan entier et
   sa phrase) et jamais sur une seule action. Un plan se lit à sa fin, Action dépensée ; « marcher
   puis attraper » (chasseur seul), « marcher puis ramasser », « ramasser puis lancer », et pour
   le Breaker « dash, marcher, ramasser » sont des plans ; une frappe finit sur sa case de recul ;
   toute route est la route sûre de safeReachableCells. Ce qu'une case débloque se demande au
   moteur par actionOptionsAt dans legalActions.ts.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne : depuis boomball/ en bash,
   set -a && . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis
   --match <id>. Il écrit match.md, viewer.html, events.json, kickoff.json et match.json dans
   docs/matches/<date>-<id8>/ et rejoue le match en local. Les horaires de --list sont en UTC,
   deux heures de moins que l'heure de Paris. Un match du moteur 6 ne se rejoue plus avec le
   dépôt du moteur 7 sans écarts : la popup n'y existait pas. Une passe interceptée peut afficher
   « DIFFERS » sans vraie différence : le receveur d'une passe volée n'est pas écrit dans les
   événements, et le dump retient la première passe qui produit les mêmes jets. Pour publier le
   viewer en artefact privé, l'outil Artifact sur viewer.html ; pour lire les plans d'une
   décision sans ouvrir le navigateur, le JSON est dans la balise match-data du viewer.

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
   déploiement, la connexion de global-setup.ts peut expirer une fois : relancer. La zone
   violette (data-box) et la ligne « is moved out of the penalty box » n'ont pas encore été vues
   au harnais ni par moi.

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev. Ne l'enlève pas.

9. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55), un humain Striker ou Breaker choisit sa place (écart 58) ;
   écart 54, promoteBulwark ; écart 53, penaltyBox indexé par l'équipe qui DÉFEND la bouche ; 53
   bis, applyPass le remet à null quand le Bulwark lance ; écart 56, turn.startedAt ; écart 57, un
   porteur ne tente jamais le Spark. Deux faits de règle constatés sans décision : l'équipe qui a
   l'humain joue juste après le Spark à chaque round ; la dérive du Spark traverse les unités et
   peut finir sous les pieds d'une unité.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (549), npm run typecheck, npm run sweep (environ
    14 minutes), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
    http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine du
    workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
    .claude/scripts/check_drift.py. Le cwd de l'outil Bash se réinitialise entre deux appels :
    chemins absolus, ou npm --prefix. Pour une série de remplacements, un script Python.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 58 de 00 partie
    C, et C11 à C14 en entier. Dette connue : arenas.art et le champ art du spec nomment trois
    JPEG retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; A20 (React 19)
    reste le premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la parade est
    automatique ; le marquage des cases sous allonge adverse à l'écran lit « la route la plus
    courte provoque » et la route proposée au clic reste la ligne droite alors que l'IA prend la
    route sûre ; le fil garde 120 événements (FEED_LIMIT) ; le Spark peut rebondir plusieurs
    rounds dans une poche du terrain (ligne 19, entre le bord et la caisse (4, 19)) ; le test du
    point 5 dans fifthPass.test.ts fait varier idleSwing en place et le remet ; le bandeau « The
    clock ran out » dit « Your Giff took cover » même quand c'est la popup qui a expiré ; plusieurs
    humains d'un même rôle (coop) n'ont pas de popup, à relire en phase 7 ; les quatre fichiers du
    vault modifiés hors de nos sessions, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
