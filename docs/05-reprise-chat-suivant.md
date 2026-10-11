# Prompt de reprise pour le chat suivant

> Récrit le 2026-10-11 par le fil principal (Fable 5.1) après la partie de Jérôme sur le plan de
> tour, à l'ouverture de 2H.10. À coller tel quel en ouverture du prochain chat, après `/prime`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.9
est la dernière sous-phase codée et en ligne, 2H.10 est la prochaine, §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 54, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour et son paragraphe « comment le plan de tour est codé », qui dit poids par
poids ce que fait le code : lis-le avant de toucher à ai/. C12 porte mes deux décisions pour
2H.10, dictées par moi le 2026-10-11, ne les rediscute pas. 07 §10 porte le journal, dont
l'entrée 2H.9, sa mise en ligne et ma partie. 09 §12 est le dernier sweep, tranché « rien ne
bouge » ; il n'y a pas de sweep de 2H.8 ni de 2H.9. 04 est l'histoire, à lire seulement quand
une décision d'ingénierie te surprend.

Où on en est : 2H.9 est CODÉE, COMMITÉE, POUSSÉE et EN LIGNE depuis le 2026-10-11. 475 tests
verts sur 22 fichiers, typecheck racine, scripts, e2e et client verts, build du client vert,
smoke et playthrough verts sur les fonctions redéployées. ENGINE_VERSION vaut 5 dans le dépôt
comme en ligne : resolve-action v15 et create-match v13 portent le plan de tour. J'ai joué ma
partie sur ce moteur (star, 50 à 0, match 0291a651, Tacker en A-striker-2). Elle est consignée
tour par tour dans boomball/docs/matches/2026-10-11-0291a651/ : match.md est le fichier à lire,
events.json, kickoff.json et match.json sont la matière brute. match.md a été produit par
scripts/dump-match.ts, qui a rejoué le match en local depuis matches.kickoff avec zéro écart
d'événement sur 869, donc pour chaque décision il donne le plan que l'IA du dépôt classe en tête,
sa phrase et son score, plus les deux suivants : pour une IA c'est sa raison, pour moi c'est ce
que l'IA aurait fait à ma place.

LA TÂCHE, dans cet ordre.

1. L'ANALYSE DE LA PARTIE, avant toute ligne de code. Lance un agent général en modèle Opus 5.5,
   effort high, auteur nommé, avec un brief fermé : lire match.md en entier, et pour chaque round
   et chaque décision, confronter l'action jouée et la raison donnée par le plan à ce qu'un joueur
   réfléchi aurait fait depuis le même plateau, en disant à chaque fois ce qui aurait été plus
   malin et pourquoi, en lisant aussi mes propres coups (Tacker) avec le même regard. Il rend un
   rapport par round puis une synthèse : les leçons, et les ajustements concrets du comportement de
   l'IA qu'elles impliquent, chacun rattaché à une fiche de ai/roles/, à positionValue ou au plan
   de tour, et classés par effet attendu. Tu relis ce rapport contre match.md et contre C10 et C11
   avant de me le présenter, tu nommes l'auteur, et tu me le présentes par rôle, trié par
   priorité, bien aéré, pour que je corrige point par point. Ne code rien tant que je n'ai pas
   tranché.
2. Les écarts et les règles d'IA retenus s'écrivent dans 00, en C12 à la suite des deux décisions
   déjà prises, AVANT la première ligne de code.
3. Le code de 2H.10 : écart 55 (un humain joue en dernier de son rôle, buildTurnOrder dans
   engine/initiative.ts, tests dans engine/initiative.test.ts ou là où vivent les tests de
   l'échelle), la règle du Trajector qui ne recule jamais à son premier tour (règle d'IA, test
   dans ai/ai.test.ts), puis les ajustements que j'ai retenus. ENGINE_VERSION reste 5 tant
   qu'aucune forme d'état ni d'événement ne change. Les 475 tests sont le filet, le test des
   cinquante millisecondes fait foi sur la vitesse.
4. npm test, npm run typecheck, client typecheck et build, npm run e2e et e2e:playthrough,
   lecture des captures, puis journal 07 §10, ligne 2H.10 dans 08 §5, et ce fichier. Pas de
   sweep sans ma demande. Redéploiement seulement sur mon feu vert.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 effort high pour l'analyse de la partie, c'est moi qui le
   demande. Auteur nommé quand c'est présenté. Le fil principal garde reduce.ts, initiative.ts,
   evaluate.ts, chooseAction.ts, legalActions.ts, rules/box.ts, les écarts, le sweep, les
   fonctions et l'intégration. Toute matière que tu me présentes nomme son auteur. Dès que tu as
   une liste d'actions pour moi, donne-la numérotée, une action exacte par ligne, et dis ce qui se
   passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. La méthode qui marche :
   une liste complète par rôle, triée par priorité, bien aérée, que je corrige point par point,
   puis les écarts écrits dans 00 AVANT la première ligne de code. Ne dis plus « la maison » :
   « l'équipe qui a la balle », « l'équipe qui ne l'a pas », ou « en attaque » et « en défense ».
   L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, et un seul par lot de changements d'IA, onze
   minutes maintenant. Tu ne touches à aucune constante de 00 sans mon arbitrage. Les poids de
   l'IA sont dans ai/roles/, et ils viennent de mes mots dans 00 C10, C11 et C12.

4. Le plan de tour, en deux phrases pour ne pas le réapprendre : chooseAction renvoie la première
   action du meilleur plan et l'appelant rappelle après chaque action, donc l'IA se juge sur
   rankPlans (le plan entier et sa phrase, « walk to (7, 1), then dig in ») et jamais sur une
   seule action. Ce qu'une case débloque se demande au moteur par actionOptionsAt dans
   legalActions.ts. Un Dash qui n'achète aucune case n'est pas joué, un lancer se note sur le
   lancer seul, et dans 6 tours sur 401 d'auto-jeu le Dash vient après une première marche parce
   que des termes de positionValue lisent la position courante ; même case finale, détail en 07
   §10 sous 2H.9.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne, scripts/dump-match.ts et
   rien d'autre : depuis boomball/ en bash, set -a && . ../.env && set +a puis
   node scripts/run-ts.mjs scripts/dump-match.ts --list, puis --match <id>. Il écrit dans
   docs/matches/ et rejoue le match en local. Une capture dit ce qui s'est vu, ce fichier dit
   pourquoi.

6. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite, avec depuis boomball/ en bash : set -a && . ../.env && set +a puis
   npm run deploy:function -- resolve-action create-match. Chaque match porte engine_version ;
   une fonction qui lit une autre version refuse en 409, le client archive. Si le dépôt porte une
   ENGINE_VERSION que les fonctions en ligne n'ont pas, épingle la constante à la version en ligne
   le temps d'un run e2e et remets-la avant de commiter.

7. Le harnais d'écran : npm run e2e en 25 à 30 s, npm run e2e:playthrough en 50 à 70 s, le
   crochet window.__boomball. Le siège humain du playthrough est piloté par chooseAction du dépôt
   depuis Node. Le smoke suppose une case de destination au tour 1 et au tour 3, un clic simple
   sur une case qui envoie la route la plus courte, et un pion cliquable au tour 2 ; le tray
   « Swing at / Shove » d'un pion adjacent porte deux boutons, vu le 2026-10-11. Il échoue si le
   match e2e en cours atteint le round 10 pendant ses trois tours : lancer npm run
   e2e:playthrough pour le finir, le smoke suivant en ouvre un neuf. La zone violette
   (data-box="A"|"B") et la ligne « is moved out of the penalty box » n'ont pas encore été vues au
   harnais ni par moi.

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev et deux lectures en vol se dépassaient. Ne l'enlève pas.

9. L'initiative (écart 51) est un ordre sans comptes : TurnSlot porte un rank, l'ordre dans un rôle
   est calculé au début du round selon la situation, hasPlayedThisRound sert à la chaîne ; l'écart
   55 renverse la place de l'humain dans son rôle, en dernier. Écart 54 : après un but,
   promoteBulwark réordonne l'échelle en cours si le bloc de l'équipe qui a encaissé est encore
   devant, sinon relaunch sur l'état met le Bulwark en tête de son équipe au round suivant. Écart
   53 : penaltyBox est indexé par l'équipe qui DÉFEND la bouche ; écart 53 bis : applyPass le
   remet à null quand le Bulwark lance. barredCells donne les cases interdites à une équipe,
   movement.ts et combat.ts la lisent.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (475), npm run typecheck, npm run sweep (environ
    11 minutes), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
    http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine du
    workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
    .claude/scripts/check_drift.py. Le cwd de l'outil Bash se réinitialise entre deux appels
    parallèles : chemins absolus, ou npm --prefix. Un script Python lancé avec python -I et un
    heredoc quoté a tenu pour tout le français de ce chat ; au moindre doute, Write puis python -I.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 55 de 00 partie
    C, et C11 et C12 en entier. Dette connue : arenas.art et le champ art du spec nomment trois
    JPEG retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; w.dash dans
    les quatre fiches n'est plus lu depuis 2H.9 ; A20 (React 19) reste le premier pas de la phase
    3 ; le choix de direction d'un Breaker humain à la parade est automatique ; le marquage des
    cases sous allonge adverse lit « la route la plus courte provoque » et non « la case est sous
    allonge » ; le fil garde 120 événements (FEED_LIMIT) ; le Trajector sans ballon à chasser au
    coup d'envoi n'a pas de position de relais tant que personne ne porte, ce que C12 corrige ;
    quatre fichiers du vault (Sapphire Hammer.md, la PREP de la scène 1.2 Ilthavax, sa battlemap
    et les prompts de battlemap de la scène 1.3) sont modifiés hors de nos sessions Boomball et
    jamais commités par nous, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
