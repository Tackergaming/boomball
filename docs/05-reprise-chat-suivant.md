# Prompt de reprise pour le chat suivant

> Récrit le 2026-10-11 par le fil principal (Fable 5.1) à la validation de C11, avant le codage
> de 2H.9. À coller tel quel en ouverture du prochain chat, après `/prime`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.8
est la dernière sous-phase construite et en ligne, 2H.9 est la prochaine, validée et pas codée,
§9 la parallélisation. Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts
27 à 54, plus 40 bis, 37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle
en deuxième version, listes triées par priorité dictées par moi, et le paragraphe « comment l'IA
v2 est codée ». C11 est ce que tu vas coder : je l'ai VALIDÉ le 2026-10-11, mot pour mot, ne le
rediscute pas. 07 §10 porte le journal, dont l'entrée 2H.8 et ce qui m'attend. 09 §12 est le
dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep de 2H.8. 04 est l'histoire, à
lire seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.8 est CODÉE, COMMITÉE, POUSSÉE et EN LIGNE depuis le 2026-10-11. 462 tests
verts sur 22 fichiers, typecheck racine, scripts, e2e et client verts, build du client vert.
ENGINE_VERSION vaut 5 dans le dépôt comme en ligne : resolve-action v14 et create-match v12.
J'ai joué ma partie sur le moteur 5 (star, 40 à 20) et donné mes retours ; le fil principal les
a lus contre les événements du match en base : 32 tours sur 136 finis avec l'Action inutilisée,
mon Bulwark resté planté en (9,1) au lieu de (7,1) des rounds 6 à 10. Tout est dans C11.

LA TÂCHE : CODER 2H.9, telle que C11 la décrit, dans cet ordre.

1. Le plan de tour dans ai/chooseAction.ts : l'IA note des tours complets (Dash ou non, case
   d'arrivée, action depuis cette case, repli éventuel avec le mouvement restant) avec les mêmes
   poids de rôle et la même positionValue, joue le meilleur plan action par action, et recalcule
   après chaque action pour tenir compte des dés. Le Dash vaut le terrain qu'il achète (meilleur
   plan à 16 cases moins meilleur plan à 8), reste interdit devant une cible à portée hors presse
   et mur. Jamais l'Action en poche : le repli est le Dash, pas Dodge. Dodge reste le dernier
   recours, abîmé de moitié et rien à faire. Garde les 462 tests comme filet, surtout
   ai/ai.test.ts : les scènes de C10 doivent toujours passer, et le test des cinquante
   millisecondes par décision fait foi sur la vitesse.
2. L'écart 53 bis dans engine/reduce.ts, applyPass : la surface de réparation se lève à l'instant
   où la passe du gardien quitte ses mains, attrapée, ratée ou interceptée. Test dans
   engine/box.test.ts. ENGINE_VERSION reste 5, aucune forme ne change.
3. La case de repos du gardien dans ai/evaluate.ts : guardFurnace mesure la distance à sa case de
   départ, (7,1) pour A et (7,43) pour B, lue dans arena.spec.starts[team][0], plus la distance à
   la bouche. Il rentre puis se plante : plus de pénalité de pas pour un Bulwark planté, c'est le
   plan de tour qui arbitre.
4. npm test, npm run typecheck, client typecheck et build, npm run e2e et e2e:playthrough, lecture
   des captures, puis journal 07 §10, ligne 2H.9 dans 08 §5, et ce fichier. Pas de sweep sans ma
   demande. Redéploiement seulement sur mon feu vert.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints, brief fermé, auteur
   nommé quand c'est présenté. Le fil principal garde reduce.ts, initiative.ts, evaluate.ts,
   chooseAction.ts, rules/box.ts, les écarts, le sweep, les fonctions et l'intégration. Le plan
   de tour est du fil principal, pas d'un sous-agent. Toute matière que tu me présentes nomme son
   auteur. Dès que tu as une liste d'actions pour moi, donne-la numérotée, une action exacte par
   ligne, et dis ce qui se passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. La méthode qui marche :
   une liste complète par rôle, triée par priorité, bien aérée, que je corrige point par point,
   puis les écarts écrits dans 00 AVANT la première ligne de code. Ne dis plus « la maison » :
   « l'équipe qui a la balle », « l'équipe qui ne l'a pas », ou « en attaque » et « en défense ».
   L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, et un seul par lot de changements d'IA. Tu ne
   touches à aucune constante de 00 sans mon arbitrage. Les poids de l'IA sont dans ai/roles/, et
   ils viennent de mes mots dans 00 C10 et C11.

4. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite, avec depuis boomball/ en bash : set -a && . ../.env && set +a puis
   npm run deploy:function -- resolve-action create-match. Chaque match porte engine_version ; une
   fonction qui lit une autre version refuse en 409, le client archive. Si le dépôt porte une
   ENGINE_VERSION que les fonctions en ligne n'ont pas, épingle la constante à la version en ligne
   le temps d'un run e2e et remets-la avant de commiter ; boxClosed lit un état sans penaltyBox
   sans planter pour ça.

5. Le harnais d'écran : npm run e2e en 30 s, npm run e2e:playthrough en 20 à 50 s, le crochet
   window.__boomball. Une capture lue vaut plus qu'un typecheck pour tout ce qui touche à l'écran.
   Le smoke suppose une case de destination au tour 1 et au tour 3, un clic simple sur une case qui
   envoie la route la plus courte, et un pion cliquable au tour 2. Il échoue si le match e2e en
   cours atteint le round 10 pendant ses trois tours : lancer npm run e2e:playthrough pour le finir,
   le smoke suivant en ouvre un neuf. La zone violette (data-box="A"|"B" sur le plateau) et la
   ligne « is moved out of the penalty box » n'ont pas encore été vues au harnais ni par moi : il
   faut un but avec un adversaire dans la zone. Pour lire ce qui s'est passé dans un match en
   ligne, les événements sont dans la table match_events (match_id, seq, kind, payload) et l'état
   de coup d'envoi dans matches.kickoff : un script Node de lecture avec la clé de service, écrit
   dans le scratchpad, a servi deux fois ce jour et vaut mieux qu'une capture pour les « pourquoi ».

6. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev et deux lectures en vol se dépassaient. Ne l'enlève pas.

7. L'initiative (écart 51) est un ordre sans comptes : TurnSlot porte un rank, l'ordre dans un rôle
   est calculé au début du round selon la situation, hasPlayedThisRound sert à la chaîne. Écart 54 :
   après un but, promoteBulwark réordonne l'échelle en cours si le bloc de l'équipe qui a encaissé
   est encore devant, sinon relaunch sur l'état met le Bulwark en tête de son équipe au round
   suivant. Écart 53 : penaltyBox est indexé par l'équipe qui DÉFEND la bouche, et vaut le dernier
   round fermé ; barredCells(arena, state, team) donne les cases interdites à une équipe, et
   movement.ts comme combat.ts la lisent. La relance sans receveur est relaunchCandidates dans
   chooseAction.ts, et la laisse du gardien est levée dans positionValue tant qu'il porte le ballon
   avec une relance à faire.

8. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé dans
   un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball Interface.html
   en entier.

9. Les commandes. Depuis boomball/ : npm test (462), npm run typecheck, npm run sweep (320 s sur
   une machine occupée), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev
   sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine
   du workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
   .claude/scripts/check_drift.py, qui signale CONTEXT.md en retard tant que /update n'a pas tourné.
   Le cwd de l'outil Bash se réinitialise entre deux appels parallèles : chemins absolus, ou
   npm --prefix. Les heredocs bash avec des apostrophes françaises cassent par moments : écrire un
   script Python dans le scratchpad et le lancer avec python -I est plus sûr ; un backtick dans un
   python -c est mangé par bash.

10. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 54 de 00 partie
    C, et C11 en entier. Dette connue : arenas.art et le champ art du spec nomment trois JPEG
    retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; A20 (React 19)
    reste le premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la parade est
    automatique ; le marquage des cases sous allonge adverse lit « la route la plus courte
    provoque » et non « la case est sous allonge » ; le tray « Swing at / Shove / Pass to » au clic
    sur un pion n'a pas encore été vu au harnais ; le fil garde 120 événements (FEED_LIMIT), soit
    environ deux rounds maintenant que les marches s'affichent ; le Trajector sans ballon à chasser
    au coup d'envoi n'a pas de position de relais tant que personne ne porte, il peut faire un pas
    inutile ; trois fichiers du vault (Sapphire Hammer.md, la PREP de la scène 1.2 Ilthavax et sa
    battlemap) sont modifiés hors de nos sessions Boomball et jamais commités par nous, à moi de
    décider.

11. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
