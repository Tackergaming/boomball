# Reprise du chat suivant, Boomball

> Écrit par le fil principal le 2026-10-12, à la fin du chat qui a codé et mis en ligne 2H.11, la
> cinquième passe de l'IA, et où Jérôme a dicté deux nouvelles règles et répondu aux deux
> questions qu'elles posaient. À coller tel quel comme premier message du chat suivant, dans le workspace `jarvis-jdr`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.11
est la dernière sous-phase codée, §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 57, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 la quatrième passe, C13 la cinquième passe : vingt-neuf points dictés
par moi le 2026-10-12, l'écart 57, neuf poids, et à sa fin « comment la cinquième passe est
codée », poids par poids, À LIRE avant de toucher à ai/. Ne rediscute rien de C12 ni de C13.
07 §10 porte le journal, dont l'entrée 2H.11. 09 §12 est le dernier sweep, tranché « rien ne
bouge » ; il n'y a pas de sweep de 2H.8 à 2H.11. 04 est l'histoire, à lire seulement quand une
décision d'ingénierie te surprend.

Où on en est : 2H.11 est CODÉE, COMMITÉE (0ffa299 puis le commit de mise en ligne) et EN LIGNE
depuis le 2026-10-12 sur mon feu vert : resolve-action v17, create-match v15, ENGINE_VERSION
toujours 6, aucune migration, aucun match archivé. 530 tests verts sur 23 fichiers (503 avant),
typecheck vert, build du client vert, smoke et playthrough verts sur les fonctions redéployées
(14 requêtes humaines, 0 refusée). Pas de sweep, à ma demande. Dix-huit matchs d'auto-jeu joués à la main pour
contrôler que le sport se joue encore, pas un sweep : 2,5 à 3,5 buts par match sur six graines
par Tier, contre 1,1 à 2,2 au dernier sweep de 09 §12 ; c'est au sweep que je demanderai de le
dire. Un match d'auto-jeu dure 1,5 s, donc un sweep environ quatorze minutes.

Deux lectures du fil principal dans le code de 2H.11, à me faire relire si j'ai un doute : la
proie par chance d'évacuer (C13 point 21) est normalisée sur un Striker frais du Tier pour que
le poids attack garde son échelle ; et l'approche en Dash (point 4) reste interdite par une cible
légitime à portée (C10 commune 3) et, pour le Breaker, par une proie à portée de marche (point
20). Une précision du fil principal : un porteur sans aucune menace ne recule jamais, la lettre
du point 12 l'aurait permis.

NON COMMITÉ dans la copie de travail, à commiter en premier (par /commit, sans me demander de
valider le message) : context/CONTEXT.md, context/HISTORY.md et le bandeau de
boomball/docs/04-etat-des-lieux.md, écrits par /update le 2026-10-12 (2H.11 en ligne, la lecture
de ma partie et C13), plus ce fichier 05. check_drift.py dit « aucune dérive ».

Les quatre fichiers du vault modifiés hors de nos sessions (Sapphire Hammer.md, la PREP de la
scène 1.2 Ilthavax, sa battlemap et les prompts de battlemap de la scène 1.3) ne sont pas à
nous : ne les commite pas sans mon feu vert.

DEUX NOUVELLES RÈGLES, dictées par moi le 2026-10-12 à la fin du chat précédent. Elles forment
C14 et la sous-phase 2H.12. Le fil principal les a reformulées ainsi, j'ai validé le principe et
répondu à ses deux questions le même jour ; les réponses sont écrites dans chaque règle.

Règle 1, l'humain choisit sa place dans son rôle. Si je joue un Striker ou un Breaker, quand le
premier tour de mon rôle arrive dans le round, une popup me demande si je veux jouer en premier,
deuxième ou troisième de mon rôle, pour ce round seulement. Les IA du même rôle prennent les
places restantes dans leur ordre par la situation (écart 51). Elle REMPLACE l'écart 55 (l'humain
dernier de son rôle) pour le Striker et le Breaker ; le Trajector et le Bulwark sont seuls de leur
rôle, rien ne change pour eux. Tranché par moi : un camp n'a que deux Breakers, donc pour un
Breaker humain la popup propose premier ou deuxième ; si un coéquipier du rôle est évacué, elle ne
propose que les places qui existent ; si le chrono expire ou si je ferme la popup sans choisir, je
joue dernier de mon rôle, comme aujourd'hui. Elle touche le moteur : une action ou un état nouveau pour ce
choix, très probablement ENGINE_VERSION 7, redéploiement et matchs ouverts archivés ; à confirmer
en lisant engine/initiative.ts, reduce.ts et l'écran de match (client/src/screens/Match.tsx et
voisins) avant de me le dire. Le harnais e2e et le siège humain du playthrough devront savoir
répondre à la popup.

Règle 2, le Breaker ramasse d'abord. Quand la balle est au sol à portée, le Breaker la ramasse en
priorité. « À portée », tranché par moi : même en Dash, donc toute balle qu'il atteint dans le
tour avec seize cases (le plan « dash, marcher, ramasser » existe pour lui ; il ne pourra plus
lancer, l'Action étant partie dans le Dash). Il ne la laisse plus à un Striker ou au Trajector. Elle REMPLACE C10 Breaker 7 et C12
commune 6 pour le Breaker (yieldToKeener, keenerMateNear) ; la suite, le Breaker porteur qui
passe à la première occasion (handOff, chainException), n'est pas touchée sauf si je le dis.

LA TÂCHE, dans cet ordre.

1. Commiter l'état ci-dessus.
2. Écrire C14 dans 00 avant toute ligne de code (l'écart 58 pour la popup, la règle d'IA du
   Breaker), avec mes réponses ci-dessus, et me le faire valider. Si la lecture du code soulève
   une question que mes réponses ne tranchent pas, pose-la en chat avant d'écrire.
3. Coder 2H.12 : la règle 2 d'abord (ai/, poids et chooseAction, avec ses tests), puis la règle 1
   (moteur, client, harnais). Tests en même temps ; sous-agents Sonnet, effort précisé, sur ce
   qui est borné et disjoint (les tests d'une règle, le composant de popup si c'est un fichier à
   part). Le test des cinquante millisecondes fait foi sur la vitesse. Écrire « comment 2H.12 est
   codée » à la fin de C14.
4. Vérifier : npm test, typecheck, build du client, npm run e2e puis e2e:playthrough. Si
   ENGINE_VERSION monte, épingler la version en ligne le temps du run (voir le skill) et la
   remettre. La popup doit être vue au harnais, capture lue.
5. Redéployer sur mon feu vert explicite, rejouer smoke et playthrough sur les fonctions
   redéployées, journal 07 §10, 08 §5, skill, /update proposé, commit.
6. Ma partie sur 2H.12, consignée avec dump-match.ts. Pas de lecture round par round sauf si je
   la demande ou si tu la proposes avec une raison. Un sweep seulement si je le demande, un seul,
   contre 09 §12, quatorze minutes.

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
   ils viennent de mes mots dans 00 C10 à C13 ; la formule est : note du plan = valeur de l'action
   depuis sa case + position de la case finale (Action dépensée) − position de la case de départ
   − exposition des trajets, chaque valeur d'action étant un poids du rôle fois sa chance de
   réussite. Depuis 2H.11 : un plan porte ses provocations et à note égale le moins provocant
   gagne ; une allonge coûte au moins 5 points ; le porteur ne recule jamais ; le dernier round
   lit le score (possession et sifflet dans Board).

4. Le plan de tour, en trois phrases : chooseAction renvoie la première action du meilleur plan
   et l'appelant rappelle après chaque action, donc l'IA se juge sur rankPlans (le plan entier et
   sa phrase) et jamais sur une seule action. Un plan se lit à sa fin, Action dépensée ; « marcher
   puis attraper » (chasseur seul), « marcher puis ramasser », « ramasser puis lancer » sont des
   plans ; une frappe finit sur sa case de recul ; toute route est la route sûre de
   safeReachableCells. Ce qu'une case débloque se demande au moteur par actionOptionsAt dans
   legalActions.ts. Depuis 2H.11, les planchers du Dash (approche du porteur adverse, mur du
   Breaker) sont chaseFloor, lus aussi par la marche qui suit un Dash, pour qu'un plan se tienne
   d'un pas à l'autre.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne : depuis boomball/ en bash,
   set -a && . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis
   --match <id>. Il écrit match.md, viewer.html, events.json, kickoff.json et match.json dans
   docs/matches/<date>-<id8>/ et rejoue le match en local. Les horaires de --list sont en UTC,
   deux heures de moins que l'heure de Paris. Un match joué par les fonctions de la quatrième
   passe (avant le 2026-10-12 après-midi) et rejoué par le dépôt de la cinquième affichera des
   décisions « DIFFERS » : normal ; un match joué depuis doit n'en afficher aucune.
   Pour publier le viewer en artefact privé, l'outil Artifact sur viewer.html ; pour lire les
   plans d'une décision sans ouvrir le navigateur, le JSON est dans la balise match-data du
   viewer.

6. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse
   en 409, le client archive.

7. Le harnais d'écran : npm run e2e en 25 à 55 s, npm run e2e:playthrough en 15 à 70 s, le
   crochet window.__boomball. Le siège humain du playthrough est piloté par chooseAction du dépôt
   depuis Node. Le smoke suppose une case de destination au tour 1 et au tour 3, un clic simple
   sur une case qui envoie la route la plus courte, et un pion cliquable au tour 2 ; le tray
   « Swing at / Shove » d'un pion adjacent porte deux boutons. Il échoue si le match e2e en cours
   atteint le round 10 pendant ses trois tours : lancer npm run e2e:playthrough pour le finir, le
   smoke suivant en ouvre un neuf. La zone violette (data-box) et la ligne « is moved out of the
   penalty box » n'ont pas encore été vues au harnais ni par moi.

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev. Ne l'enlève pas.

9. L'initiative (écart 51) est un ordre sans comptes ; un humain joue en DERNIER de son rôle
   (écart 55, que la règle 1 ci-dessus va remplacer pour le Striker et le Breaker) ; écart 54, promoteBulwark ; écart 53, penaltyBox indexé par l'équipe qui DÉFEND la
   bouche ; 53 bis, applyPass le remet à null quand le Bulwark lance ; écart 56, turn.startedAt
   est la case de début de tour ; écart 57, un porteur ne tente jamais le Spark, legalActions et
   reduce. Deux faits de règle constatés sans décision : l'équipe qui a l'humain joue juste après
   le Spark à chaque round ; la dérive du Spark traverse les unités et peut finir sous les pieds
   d'une unité, qui commence alors son tour dessus.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (530), npm run typecheck, npm run sweep (environ
    14 minutes), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
    http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine du
    workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
    .claude/scripts/check_drift.py. Le cwd de l'outil Bash se réinitialise entre deux appels :
    chemins absolus, ou npm --prefix. Un heredoc bash avec des apostrophes casse : pour écrire un
    gros bloc dans un fichier, l'outil Edit ou Write, pas cat <<EOF, et pour une série de
    remplacements, un script Python écrit par Write dans le scratchpad puis python -I.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 57 de 00 partie
    C, et C11, C12 et C13 en entier, sauf l'écart 55, C10 Breaker 7 et C12 commune 6 que mes deux
    nouvelles règles remplacent. Dette connue : arenas.art et le champ art du spec nomment
    trois JPEG retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; A20
    (React 19) reste le premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la
    parade est automatique ; le marquage des cases sous allonge adverse à l'écran lit « la route
    la plus courte provoque » et la route proposée au clic reste la ligne droite alors que l'IA
    prend la route sûre ; le fil garde 120 événements (FEED_LIMIT) ; le Spark peut rebondir
    plusieurs rounds dans une poche du terrain (ligne 19 entre le bord et la caisse (4, 19)),
    règle 36b appliquée, à moi de dire si le layout doit bouger ; le test du point 5 dans
    fifthPass.test.ts fait varier idleSwing en place et le remet ; les quatre fichiers du vault
    modifiés hors de nos sessions, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
