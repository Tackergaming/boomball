# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Fable 5.1) le 2026-10-14, à la fin du chat qui a consigné cinq des
> vingt et un matchs de Jérôme sur le moteur 7, écrit `00` C15 sur ses retours et codé 2H.13 (le
> chrono, les écarts 59 à 62, l'écran, la septième passe de l'IA). À coller tel quel comme premier
> message du chat suivant, dans le workspace `jarvis-jdr`. La ligne « Où on en est » dit si la mise
> en ligne a eu lieu.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.13
est la dernière sous-phase codée, §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 62, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 la quatrième passe, C13 la cinquième, C14 l'écart 58 (ma place dans
mon rôle, par une popup) et la sixième passe, C15 le lot du 2026-10-14 : le défaut du chrono,
les écarts 59 à 62, trois retours d'écran et la septième passe. Chaque passe finit par
« comment ... est codée », poids par poids, À LIRE avant de toucher à ai/. Ne rediscute rien de
C12 à C15. 07 §10 porte le journal, dont l'entrée 2H.13. 09 §12 est le dernier sweep, tranché
« rien ne bouge » ; il n'y a pas de sweep de 2H.8 à 2H.13. 04 est l'histoire, à lire seulement
quand une décision d'ingénierie te surprend.

Où on en est : 2H.13 est CODÉE, COMMITÉE (57b647c puis le commit de mise en ligne) et EN LIGNE
depuis le 2026-10-14 sur mon feu vert : resolve-action v19, create-match v17, ENGINE_VERSION 8,
aucune migration, les matchs ouverts du moteur 7 archivés. 617 tests verts sur 27 fichiers (549
avant), typecheck racine, scripts, e2e et client verts, build du client vert, smoke et
playthrough verts sur les fonctions redéployées (16 requêtes humaines, 0 refusée), le match e2e
du moteur 8 rejoué par dump-match.ts sans écart ni DIFFERS, la popup vue dans la colonne de
droite, la zone violette de la surface de réparation vue au harnais. Pas de sweep, à ma
demande.
Dix-huit matchs d'auto-jeu de contrôle (scripts/control-2h13.ts) : 1,8 / 2,2 / 2,0 buts de
ballon par match (rookie, veteran, star), 67 prises de balle sur 71 Shove réussis, aucune
relance volée, le Trajector ne prend jamais le coup d'envoi, 1,7 s par match.

Ce que 2H.13 a changé, en six phrases. Le chrono : la clé du tour porte le round et l'index,
un Trajector ou un Bulwark humain n'expire plus au premier clic après deux minutes de match.
Le Spark tire un d8 à chaque dérive, jamais une face qui le rapproche d'un Trajector, et
revient après une prise à 9 cases des deux Trajectors ; le chasseur vise la case où il est.
Un Shove réussi sur un porteur met le ballon dans les mains du bousculeur, personne ne bouge.
Après un but, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers, et si son
bloc a déjà commencé le round se finit normalement. L'IA : le Trajector laisse le coup
d'envoi, le porteur va au plus près de la bouche à exposition égale, le tireur laisse son
rebond à un coéquipier qui n'a pas joué et qui l'atteint, le gardien ne lance jamais dans une
allonge, les relais lisent le gardien sur sa case, « Call for the ball » passe outre la chaîne
et expire à mon tour suivant. L'écran : recoilBlocked et le receveur nommé sur une passe
volée, un marqueur hors du pion pour la Réaction dépensée, la popup dockée sur la colonne de
droite et déplaçable.

Les quatre fichiers du vault modifiés hors de nos sessions (Sapphire Hammer.md, la PREP de la
scène 1.2 Ilthavax, sa battlemap et les prompts de battlemap de la scène 1.3) et les deux
fichiers non suivis MARGO.md et theodo.md ne sont pas à nous : ne les commite pas sans mon feu
vert.

LA TÂCHE.
1. Vérifier git status avant toute chose ; tout est commité au 2026-10-14 au soir.
2. Mes parties sur 2H.13 : les retrouver par dump-match.ts --list (horaires en UTC) et
   consigner celles que je nomme. Un match du moteur 7 ne se rejoue plus avec le dépôt du
   moteur 8. Pas de lecture round par round sauf si je la demande ou si tu la proposes avec
   une raison.
3. Mes retours, en chat, puis C16 dans 00 avant toute ligne de code. Puis la sous-phase
   2H.14 comme les précédentes : tests, sous-agents Sonnet sur le borné, harnais,
   redéploiement sur mon feu vert explicite, journal, commit.
4. Un sweep seulement si je le demande, un seul par lot, contre 09 §12, seize minutes.

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
   ils viennent de mes mots dans 00 C10 à C15 ; la formule est : note du plan = valeur de l'action
   depuis sa case + position de la case finale (Action dépensée) − position de la case de départ
   − exposition des trajets, chaque valeur d'action étant un poids du rôle fois sa chance de
   réussite. Depuis 2H.11 : un plan porte ses provocations et à note égale le moins provocant
   gagne ; une allonge coûte au moins 5 points ; le porteur ne recule jamais ; le dernier round
   lit le score. Depuis 2H.12 : pour le Breaker, tout plan qui ramasse un ballon atteignable dans
   le tour, Dash compris, gagne PICKUP_FIRST (1000), sauf debout sur le Spark. Depuis 2H.13 :
   le porteur gagne jusqu'à 15 % de carryToFurnace en s'enfonçant dans sa portée propre
   (depthInRange), le tireur qui a manqué lit shooterYields, le gardien écarte toute passe avec un
   intercepteur, un receveur appelé passe outre les filtres de la chaîne.

4. Le plan de tour, en trois phrases : chooseAction renvoie la première action du meilleur plan
   et l'appelant rappelle après chaque action, donc l'IA se juge sur rankPlans (le plan entier et
   sa phrase) et jamais sur une seule action. Un plan se lit à sa fin, Action dépensée ; « marcher
   puis attraper » (chasseur seul), « marcher puis ramasser », « ramasser puis lancer », et pour
   le Breaker « dash, marcher, ramasser » sont des plans ; une frappe finit sur sa case de recul ;
   toute route est la route sûre de safeReachableCells. Ce qu'une case débloque se demande au
   moteur par actionOptionsAt dans legalActions.ts.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne : depuis boomball/ en bash,
   set -a && . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis
   --match <id>. --list ne montre que les douze derniers matchs ; pour en voir plus, copier le
   script avec limit=40 dans scripts/, lancer, effacer la copie. Il écrit match.md, viewer.html,
   events.json, kickoff.json et match.json dans docs/matches/<date>-<id8>/ et rejoue le match en
   local. Les horaires de --list sont en UTC, deux heures de moins que l'heure de Paris. Une
   passe interceptée peut afficher « DIFFERS » sans vraie différence : le receveur d'une passe
   volée est désormais dans l'événement (toId, moteur 8), mais le dump retient encore la première
   passe qui produit les mêmes jets. Pour publier le viewer en artefact privé, l'outil Artifact
   sur viewer.html ; pour lire les plans d'une décision sans ouvrir le navigateur, le JSON est
   dans la balise match-data du viewer. Les cinq dossiers de docs/matches/ du 12 au 14 octobre
   sont des matchs du moteur 7 : ils ne se rejouent plus.

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
   violette (data-box) est vue au harnais depuis le 2026-10-14 ; la ligne « is moved out of the
   penalty box » pas encore ; le marqueur de Réaction dépensée est vu au harnais, les lignes
   « cannot recoil » et « and takes the Payload » sont dans le dump du match e2e, pas encore vues
   à l'écran.

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev. Ne l'enlève pas. Le bash de l'outil casse sur les accents graves dans un heredoc :
   pour une série de remplacements, un script Python écrit par l'outil d'écriture, puis lancé.

9. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55), un humain Striker ou Breaker choisit sa place (écart 58) ;
   écart 62, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers ; écart 53,
   penaltyBox indexé par l'équipe qui DÉFEND la bouche ; 53 bis, applyPass le remet à null quand
   le Bulwark lance ; écart 56, turn.startedAt ; écart 57, un porteur ne tente jamais le Spark ;
   écart 59, la dérive du Spark tire un d8 par round loin des Trajectors, spark.heading n'est plus
   qu'une trace ; écart 60, le retour à 9 cases ; écart 61, le Shove prend le ballon. Deux faits
   de règle constatés sans décision : l'équipe qui a l'humain joue juste après le Spark à chaque
   round ; la dérive du Spark traverse les unités et peut finir sous les pieds d'une unité.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (617), npm run typecheck, npm run sweep (environ
    16 minutes), npm run e2e, npm run e2e:playthrough, node scripts/run-ts.mjs
    scripts/control-2h13.ts (dix-huit matchs de contrôle, pas un sweep). Depuis boomball/client/ :
    npm run dev sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck.
    Depuis la racine du workspace : python boomball/supabase/checks/rls-check.py et
    browser-path.py, et python .claude/scripts/check_drift.py. Le cwd de l'outil Bash se
    réinitialise entre deux appels : chemins absolus, ou npm --prefix.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 62 de 00 partie
    C, et C11 à C15 en entier. Dette connue : arenas.art et le champ art du spec nomment trois
    JPEG retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; A20 (React 19)
    reste le premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la parade est
    automatique ; le marquage des cases sous allonge adverse à l'écran lit « la route la plus
    courte provoque » et la route proposée au clic reste la ligne droite alors que l'IA prend la
    route sûre ; le fil garde 120 événements (FEED_LIMIT) ; le Spark peut rebondir plusieurs
    rounds dans une poche du terrain ; le test du point 5 dans fifthPass.test.ts fait varier
    idleSwing en place et le remet ; le bandeau « The clock ran out » dit « Your Giff took cover »
    même quand c'est la popup qui a expiré ; plusieurs humains d'un même rôle (coop) n'ont pas de
    popup, à relire en phase 7 ; la popup n'est pas rebornée quand la fenêtre rétrécit, la
    déplacer suffit ; le bouton « Call for the ball » reste actif pendant la popup ; un gardien
    peut marcher au-delà de sa laisse jusqu'à côté d'un receveur marqué pour une passe d'une case,
    qu'aucune allonge n'intercepte (écart 48) ; le Shove d'un Bulwark n'est borné que par
    l'adjacence, pas par sa laisse ; les quatre fichiers du vault modifiés hors de nos sessions,
    à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
