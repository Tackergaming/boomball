# Prompt de reprise pour le chat suivant

> Récrit le 2026-10-11 par le fil principal (Fable 5.1) à la mise en ligne de 2H.9, avant la
> partie de Jérôme. À coller tel quel en ouverture du prochain chat, après `/prime`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.9
est la dernière sous-phase codée, §9 la parallélisation. Lis ensuite la partie C de
boomball/docs/00-reglement-v2.md : les écarts 27 à 54, plus 40 bis, 37 bis et 53 bis, priment
sur les parties A et B. C10 porte l'IA par rôle en deuxième version, listes triées par priorité
dictées par moi. C11 porte le plan de tour, validé par moi le 2026-10-11 et codé le même jour,
avec le paragraphe « comment le plan de tour est codé » qui dit poids par poids ce que fait le
code : lis-le avant de toucher à ai/. 07 §10 porte le journal, dont l'entrée 2H.9 et ce qui
m'attend. 09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep de 2H.8
ni de 2H.9. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.9 est CODÉE, COMMITÉE (922368f), POUSSÉE et EN LIGNE depuis le 2026-10-11.
475 tests verts sur 22 fichiers, typecheck racine, scripts, e2e et client verts, build du client
vert. ENGINE_VERSION vaut 5 dans le dépôt comme en ligne : resolve-action v15 et create-match
v13 portent le plan de tour. Smoke vert en 23 s et playthrough vert en 1,1 min sur les fonctions
redéployées, 26 requêtes humaines, 0 refusée ; la capture de tête de round montre « Derro Tarrow
dashes. Derro Tarrow moves 16 cells. », le Dash joué en premier puis une seule marche. Le smoke
a soldé la dette du tray « Swing at / Shove » au clic sur un pion : vu pour la première fois,
deux boutons, le localisateur du test en attendait un seul, corrigé par .first() dans
smoke.spec.ts. Ce correctif et les documents de mise en ligne sont peut-être encore à commiter :
vérifie git status avant de conclure. Je n'ai pas encore joué ma partie sur le plan de tour.

LA TÂCHE, dans cet ordre, chaque étape sur mon feu vert explicite.

1. Si git status montre smoke.spec.ts ou des documents modifiés : je tape /commit. Tu ne
   commites pas tout seul.
2. Ma partie, puis mes retours en chat. Tu les lis contre les événements du match en base
   (match_events et matches.kickoff, un script Node de lecture avec la clé de service dans le
   scratchpad, comme pour 2H.8) avant de proposer quoi que ce soit. Les questions sur ce que
   fait l'IA se répondent par les événements, pas par une capture. Un trait connu : dans 6 tours
   sur 401 d'auto-jeu le Dash vient après une première marche (« moves 8, dashes, moves 7 »),
   parce que des termes de positionValue lisent la position courante (rejoin, looseBallReach,
   keenerMateNear) et que le plan est reconstruit après chaque pas ; même case finale, ordre du
   fil différent, détail en 07 §10 sous 2H.9. À ne changer que si je m'en plains.
3. Un sweep seulement si je le demande, un seul, contre 09 §12 : compte onze minutes maintenant
   qu'un match d'auto-jeu dure 1,1 s, et le rapport imprime ses constantes.
4. Mes retours forment soit la porte franchie vers la phase 3 (2.5D, A20 React 19 en premier
   pas), soit une 2H.10 de corrections : liste par rôle triée par priorité que je corrige, écarts
   écrits dans 00 AVANT la première ligne de code, journal 07 §10, 08 §5, ce fichier, puis /update
   et /save quand je les tape.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints, brief fermé, auteur
   nommé quand c'est présenté. Le fil principal garde reduce.ts, initiative.ts, evaluate.ts,
   chooseAction.ts, legalActions.ts, rules/box.ts, les écarts, le sweep, les fonctions et
   l'intégration. Toute matière que tu me présentes nomme son auteur. Dès que tu as une liste
   d'actions pour moi, donne-la numérotée, une action exacte par ligne, et dis ce qui se passe
   ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. La méthode qui marche :
   une liste complète par rôle, triée par priorité, bien aérée, que je corrige point par point,
   puis les écarts écrits dans 00 AVANT la première ligne de code. Ne dis plus « la maison » :
   « l'équipe qui a la balle », « l'équipe qui ne l'a pas », ou « en attaque » et « en défense ».
   L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, et un seul par lot de changements d'IA. Tu ne
   touches à aucune constante de 00 sans mon arbitrage. Les poids de l'IA sont dans ai/roles/, et
   ils viennent de mes mots dans 00 C10 et C11.

4. Le plan de tour, en deux phrases pour ne pas le réapprendre : chooseAction renvoie la première
   action du meilleur plan et l'appelant rappelle après chaque action, donc l'IA se juge sur
   rankPlans (le plan entier et sa phrase, « walk to (7, 1), then dig in ») et jamais sur une
   seule action. Ce qu'une case débloque se demande au moteur par actionOptionsAt dans
   legalActions.ts. Un Dash qui n'achète aucune case n'est pas joué, et un lancer se note sur le
   lancer seul, le terrain gagné lu depuis la case de départ du tour.

5. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse
   en 409, le client archive. Si le dépôt porte une ENGINE_VERSION que les fonctions en ligne
   n'ont pas, épingle la constante à la version en ligne le temps d'un run e2e et remets-la avant
   de commiter ; boxClosed lit un état sans penaltyBox sans planter pour ça.

6. Le harnais d'écran : npm run e2e en 30 s, npm run e2e:playthrough en 50 à 60 s, le crochet
   window.__boomball. Le siège humain du playthrough est piloté par chooseAction du dépôt depuis
   Node, donc par le nouveau planificateur ; la maison est l'IA des fonctions en ligne. Le smoke
   suppose une case de destination au tour 1 et au tour 3, un clic simple sur une case qui envoie
   la route la plus courte, et un pion cliquable au tour 2. Il échoue si le match e2e en cours
   atteint le round 10 pendant ses trois tours : lancer npm run e2e:playthrough pour le finir, le
   smoke suivant en ouvre un neuf. La zone violette (data-box="A"|"B" sur le plateau) et la ligne
   « is moved out of the penalty box » n'ont pas encore été vues au harnais ni par moi : il faut
   un but avec un adversaire dans la zone.

7. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev et deux lectures en vol se dépassaient. Ne l'enlève pas.

8. L'initiative (écart 51) est un ordre sans comptes : TurnSlot porte un rank, l'ordre dans un rôle
   est calculé au début du round selon la situation, hasPlayedThisRound sert à la chaîne. Écart 54 :
   après un but, promoteBulwark réordonne l'échelle en cours si le bloc de l'équipe qui a encaissé
   est encore devant, sinon relaunch sur l'état met le Bulwark en tête de son équipe au round
   suivant. Écart 53 : penaltyBox est indexé par l'équipe qui DÉFEND la bouche, et vaut le dernier
   round fermé ; écart 53 bis : applyPass le remet à null quand le Bulwark lance. barredCells
   donne les cases interdites à une équipe, movement.ts et combat.ts la lisent.

9. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé dans
   un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball Interface.html
   en entier.

10. Les commandes. Depuis boomball/ : npm test (475), npm run typecheck, npm run sweep (environ
    11 minutes maintenant), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ :
    npm run dev sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck.
    Depuis la racine du workspace : python boomball/supabase/checks/rls-check.py et
    browser-path.py, et python .claude/scripts/check_drift.py, qui signale CONTEXT.md en retard
    tant que /update n'a pas tourné. Le cwd de l'outil Bash se réinitialise entre deux appels
    parallèles : chemins absolus, ou npm --prefix. Un script Python dans le scratchpad lancé avec
    python -I est plus sûr qu'un heredoc bash pour tout texte français.

11. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 54 de 00 partie
    C, et C11 en entier avec son paragraphe de codage. Dette connue : arenas.art et le champ art
    du spec nomment trois JPEG retirés ; substituteEntry et substitute_entry restent et ne sont
    plus lus ; w.dash dans les quatre fiches n'est plus lu depuis 2H.9 ; A20 (React 19) reste le
    premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la parade est
    automatique ; le marquage des cases sous allonge adverse lit « la route la plus courte
    provoque » et non « la case est sous allonge » ; le tray « Swing at / Shove / Pass to » au clic
    sur un pion n'a pas encore été vu au harnais ; le fil garde 120 événements (FEED_LIMIT) ; le
    Trajector sans ballon à chasser au coup d'envoi n'a pas de position de relais tant que personne
    ne porte ; trois fichiers du vault (Sapphire Hammer.md, la PREP de la scène 1.2 Ilthavax et sa
    battlemap) plus la PREP des prompts de battlemap de la scène 1.3 sont modifiés hors de nos
    sessions Boomball et jamais commités par nous, à moi de décider.

12. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
