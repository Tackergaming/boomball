# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Fable 5.1) le 2026-10-11 au soir, à la fin du chat qui a codé 2H.10.
> À coller tel quel comme premier message du chat suivant, dans le workspace `jarvis-jdr`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.10
est la dernière sous-phase codée, PAS ENCORE COMMITÉE NI EN LIGNE, §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 56, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 les décisions de 2H.10 : les écarts 55 et 56, les concepts dictés par
moi après l'analyse de ma partie (les places libres autour du porteur, le Breaker collé au
porteur, le Striker collé seulement si son relais tient, le Breaker porteur et son exception à la
chaîne, le Trajector seul sur le Spark, la presse en Dash par une route sans allonge adverse et
cette route pour tout déplacement), les quatre listes par rôle de la quatrième passe, et le
paragraphe « comment la quatrième passe est codée », qui dit poids par poids ce que fait le
code : lis-le avant de toucher à ai/. Ne rediscute rien de C12. 07 §10 porte le journal, dont
l'entrée 2H.10. 09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep
de 2H.8, 2H.9 ni 2H.10. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te
surprend.

Où on en est : 2H.10 est CODÉE le 2026-10-11, dans la copie de travail, ni commitée ni en ligne.
503 tests verts sur 22 fichiers, typecheck racine, scripts, e2e et client verts, build du client
vert, smoke et playthrough verts contre les fonctions en ligne du moteur 5 avec ENGINE_VERSION
épinglée à 5 le temps du run et remise à 6. ENGINE_VERSION vaut 6 dans le dépôt (écart 56, la
case de début de tour dans l'état du tour) et 5 en ligne : resolve-action v15 et create-match
v13 portent encore le plan de tour de 2H.9 et l'IA de la troisième passe. L'analyse de ma partie
précédente est dans boomball/docs/matches/2026-10-11-0291a651/analyse-2H10.md, par un agent Opus
5.5 effort high, relue par le fil principal ; match.md à côté est la partie tour par tour.

LA TÂCHE, dans cet ordre.

1. Je tape /commit (le commit est à moi), puis je donne mon feu vert pour redéployer
   resolve-action et create-match : depuis boomball/ en bash, set -a && . ../.env && set +a puis
   npm run deploy:function -- resolve-action create-match. Le moteur 6 en ligne archive les matchs
   ouverts du moteur 5, le mien et celui du compte e2e. Puis npm run e2e et npm run
   e2e:playthrough SANS épingler, lecture des captures, et le journal 07 §10 complété d'une ligne
   « mise en ligne ».
2. Je joue ma partie sur le moteur 6. Tu la consignes avec scripts/dump-match.ts (--list puis
   --match <id>) dans docs/matches/, et tu vérifies zéro écart d'événement et zéro décision d'IA
   qui diffère du dépôt : si une IA diffère, c'est que le dépôt et les fonctions ne jouent pas la
   même IA, et ça se règle avant toute lecture.
3. Mes retours en chat, reformulés rôle par rôle, triés par priorité, corrigés point par point,
   puis écrits dans 00 en C13 AVANT la première ligne de code, puis le code. Un sweep seulement
   si je le demande, un seul, contre 09 §12, en comptant onze minutes.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 effort high pour l'analyse d'une partie, c'est moi qui le
   demande. Auteur nommé quand c'est présenté. Le fil principal garde reduce.ts, initiative.ts,
   evaluate.ts, chooseAction.ts, legalActions.ts, rules/box.ts, les écarts, le sweep, les
   fonctions et l'intégration. Toute matière que tu me présentes nomme son auteur. Dès que tu as
   une liste d'actions pour moi, donne-la numérotée, une action exacte par ligne, et dis ce qui se
   passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. La méthode qui marche :
   une liste complète par rôle, triée par priorité, bien aérée, que je corrige point par point,
   puis les écarts écrits dans 00 AVANT la première ligne de code. Quand tu me présentes une
   analyse, pas de renvois chiffrés vers un tableau que je n'ai pas sous les yeux : le round par
   round, les leçons et la liste par rôle, en clair, dans le message. Ne dis plus « la maison » :
   « l'équipe qui a la balle », « l'équipe qui ne l'a pas », ou « en attaque » et « en défense ».
   L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, et un seul par lot de changements d'IA, onze
   minutes maintenant. Tu ne touches à aucune constante de 00 sans mon arbitrage. Les poids de
   l'IA sont dans ai/roles/, et ils viennent de mes mots dans 00 C10, C11 et C12.

4. Le plan de tour, en trois phrases pour ne pas le réapprendre : chooseAction renvoie la première
   action du meilleur plan et l'appelant rappelle après chaque action, donc l'IA se juge sur
   rankPlans (le plan entier et sa phrase) et jamais sur une seule action. Depuis 2H.10 un plan se
   lit à sa fin, Action dépensée : une case ne vaut l'action qu'elle débloque que par le plan qui
   la prend, « marcher puis attraper » et « ramasser puis lancer » sont des plans, une frappe
   finit sur sa case de recul, et toute route est la route sûre de safeReachableCells, qui
   provoque le moins d'attaques d'opportunité puis coûte le moins de pieds. Ce qu'une case
   débloque se demande au moteur par actionOptionsAt dans legalActions.ts.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne, scripts/dump-match.ts et
   rien d'autre : depuis boomball/ en bash, set -a && . ../.env && set +a puis
   node scripts/run-ts.mjs scripts/dump-match.ts --list, puis --match <id>. Il écrit dans
   docs/matches/ et rejoue le match en local. Une capture dit ce qui s'est vu, ce fichier dit
   pourquoi. Un match du moteur 5 rejoué par le dépôt du moteur 6 affichera des décisions d'IA
   « DIFFERS » : c'est normal, l'IA a changé, les événements eux ne divergent pas.

6. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse
   en 409, le client archive. Tant que les fonctions en ligne sont au moteur 5 et le dépôt au 6,
   le harnais e2e ne trouve rien à jouer : épingler ENGINE_VERSION à 5 dans engine/constants.ts le
   temps du run et la remettre à 6 avant de commiter. Après le redéploiement du moteur 6, plus
   d'épingle.

7. Le harnais d'écran : npm run e2e en 25 à 55 s, npm run e2e:playthrough en 15 à 70 s, le
   crochet window.__boomball. Le siège humain du playthrough est piloté par chooseAction du dépôt
   depuis Node. Le smoke suppose une case de destination au tour 1 et au tour 3, un clic simple
   sur une case qui envoie la route la plus courte, et un pion cliquable au tour 2 ; le tray
   « Swing at / Shove » d'un pion adjacent porte deux boutons. Il échoue si le match e2e en cours
   atteint le round 10 pendant ses trois tours : lancer npm run e2e:playthrough pour le finir, le
   smoke suivant en ouvre un neuf. Un playthrough qui ne joue que trois requêtes humaines a fini
   un match presque terminé : relancer smoke puis playthrough pour un match entier. La zone
   violette (data-box="A"|"B") et la ligne « is moved out of the penalty box » n'ont pas encore
   été vues au harnais ni par moi.

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev et deux lectures en vol se dépassaient. Ne l'enlève pas.

9. L'initiative (écart 51) est un ordre sans comptes : TurnSlot porte un rank, l'ordre dans un rôle
   est calculé au début du round selon la situation, hasPlayedThisRound sert à la chaîne ; depuis
   l'écart 55 un humain joue en DERNIER de son rôle, après les IA du même rôle, et à l'écran
   l'échelle du moteur 6 le montrera après ses coéquipiers du même rôle. Écart 54 : après un but,
   promoteBulwark réordonne l'échelle en cours si le bloc de l'équipe qui a encaissé est encore
   devant, sinon relaunch sur l'état met le Bulwark en tête de son équipe au round suivant, humain
   compris. Écart 53 : penaltyBox est indexé par l'équipe qui DÉFEND la bouche ; écart 53 bis :
   applyPass le remet à null quand le Bulwark lance. Écart 56 : turn.startedAt est la case de
   début de tour, posée par beginTurn, lue par la chaîne de l'IA.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (503), npm run typecheck, npm run sweep (environ
    11 minutes), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
    http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine du
    workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
    .claude/scripts/check_drift.py. Le cwd de l'outil Bash se réinitialise entre deux appels
    parallèles : chemins absolus, ou npm --prefix. Un script Python qui contient des triples
    guillemets casse le heredoc bash de l'outil : Write dans le scratchpad puis python -I, sans
    exception.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 56 de 00 partie
    C, et C11 et C12 en entier. Dette connue : arenas.art et le champ art du spec nomment trois
    JPEG retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; A20 (React 19)
    reste le premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la parade est
    automatique ; le marquage des cases sous allonge adverse à l'écran lit « la route la plus
    courte provoque » et non « la case est sous allonge », et la route proposée au clic reste la
    ligne droite alors que l'IA prend la route sûre ; le fil garde 120 événements (FEED_LIMIT) ;
    le Spark peut rebondir plusieurs rounds dans une poche du terrain (ligne 19 entre le bord et
    la caisse (4, 19), vu dans ma partie), règle 36b appliquée, à moi de dire si le layout doit
    bouger ; l'équipe qui a l'humain joue juste après le Spark à chaque round, donc elle a la
    première main sur chaque dérive, constaté sans décision ; quatre fichiers du vault (Sapphire
    Hammer.md, la PREP de la scène 1.2 Ilthavax, sa battlemap et les prompts de battlemap de la
    scène 1.3) sont modifiés hors de nos sessions Boomball et jamais commités par nous, à moi de
    décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
