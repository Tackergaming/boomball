# Prompt de reprise pour le chat suivant

> Récrit le 2026-10-11 par le fil principal (Fable 5.1) à la fin du codage de 2H.8. À coller tel
> quel en ouverture du prochain chat, après `/prime`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.8
est la dernière sous-phase construite, §9 la parallélisation. Lis ensuite la partie C de
boomball/docs/00-reglement-v2.md : les écarts 27 à 54, plus 40 bis et 37 bis, priment sur les
parties A et B ; C10 porte les deux écarts de 2H.8 (la surface de réparation, la relance du
gardien), le bloc « l'IA par rôle, deuxième version », des listes triées par priorité dictées par
moi en chat, mot pour mot, et le paragraphe « comment l'IA v2 est codée » qui relie chaque poids à
mes mots. 07 §10 porte le journal, dont l'entrée 2H.8 et ce qui m'attend. 09 §12 est le sweep de
2H.7, tranché « rien ne bouge » ; il n'y a PAS de sweep de 2H.8. 04 est l'histoire, à lire
seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.8 est CODÉE le 2026-10-11, PAS COMMITÉE si tu lis ceci avant mon /commit, et
PAS EN LIGNE. 460 tests verts sur 22 fichiers, typecheck racine, scripts, e2e et client verts,
build du client vert. ENGINE_VERSION vaut 5 dans le dépôt ; en ligne, resolve-action v12 et
create-match v10 jouent encore le moteur 4. Aucune migration : l'état gagne penaltyBox et
relaunch dans le JSON, les événements gagnent relocated. Le smoke a tourné vert contre le moteur 4
en ligne avec ENGINE_VERSION épinglée à 4 le temps du run, puis remise à 5.

LA PORTE DE 2H.8 : (1) mon feu vert de redéploiement des deux fonctions, qui archive les matchs du
moteur 4 ; (2) ma partie sur le moteur 5, avec en retours numérotés si je comprends ce que chaque
rôle cherche, si la zone violette après un but et la relance du gardien se lisent, si le Trajector
laisse bien le ballon du coup d'envoi ; (3) un sweep si je le demande, un seul, contre 09 §12.
Ce verdict ouvre la phase 3 (scène 2.5D, A20 React 19 en premier pas) ou une sous-phase 2H.9.
Sans ce verdict, pas de phase 3. Tu commences par me demander où j'en suis de ces trois points.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints, brief fermé, auteur
   nommé quand c'est présenté. Le fil principal garde reduce.ts, initiative.ts, evaluate.ts,
   chooseAction.ts, rules/box.ts, les écarts, le sweep, les fonctions et l'intégration. Toute
   matière que tu me présentes nomme son auteur. Dès que tu as une liste d'actions pour moi,
   donne-la numérotée, une action exacte par ligne, et dis ce qui se passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. En 2H.8 la méthode qui a
   marché : une liste complète par rôle, triée par priorité, bien aérée, que je corrige point par
   point, puis les écarts écrits dans 00 AVANT la première ligne de code. Ne dis plus « la
   maison » : « l'équipe qui a la balle », « l'équipe qui ne l'a pas », ou « en attaque » et « en
   défense ». L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, et un seul par lot de changements d'IA. Tu ne
   touches à aucune constante de 00 sans mon arbitrage. Les poids de l'IA sont dans ai/roles/, et
   ils viennent de mes mots dans 00 C10 ; le paragraphe « comment l'IA v2 est codée » dit lequel
   porte quoi.

4. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse en
   409, le client archive. Si le dépôt porte une ENGINE_VERSION que les fonctions en ligne n'ont
   pas, épingle la constante à la version en ligne le temps d'un run e2e et remets-la avant de
   commiter ; boxClosed lit un état sans penaltyBox sans planter pour ça.

5. Le harnais d'écran : npm run e2e en 30 s, npm run e2e:playthrough en 20 s, le crochet
   window.__boomball. Une capture lue vaut plus qu'un typecheck pour tout ce qui touche à l'écran.
   Le smoke suppose une case de destination au tour 1 et au tour 3, un clic simple sur une case qui
   envoie la route la plus courte, et un pion cliquable au tour 2. Il échoue si le match e2e en
   cours atteint le round 10 pendant ses trois tours : lancer npm run e2e:playthrough pour le finir,
   le smoke suivant en ouvre un neuf. Un 401 sur GET /rest/v1/role_stats à la connexion est apparu
   2 runs sur 7, pas sur le run du 2026-10-11 : global-setup.ts imprime le corps de la réponse
   s'il revient. La zone violette (data-box="A"|"B" sur le plateau) et la ligne « is moved out of
   the penalty box » n'ont pas encore été vues au harnais : il faut un but.

6. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev et deux lectures en vol se dépassaient. Ne l'enlève pas.

7. L'initiative (écart 51) est un ordre sans comptes : TurnSlot porte un rank, l'ordre dans un rôle
   est calculé au début du round selon la situation, hasPlayedThisRound sert à la chaîne. Écart 54 :
   après un but, promoteBulwark réordonne l'échelle en cours si le bloc de l'équipe qui a encaissé
   est encore devant, sinon relaunch sur l'état met le Bulwark en tête de son équipe au round
   suivant. Écart 53 : penaltyBox est indexé par l'équipe qui DÉFEND la bouche, et vaut le dernier
   round fermé ; barredCells(arena, state, team) donne les cases interdites à une équipe, et
   movement.ts comme combat.ts la lisent.

8. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé dans
   un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball Interface.html
   en entier.

9. Les commandes. Depuis boomball/ : npm test (460), npm run typecheck, npm run sweep (320 s sur
   une machine occupée), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev
   sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine
   du workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
   .claude/scripts/check_drift.py, qui signale CONTEXT.md en retard tant que /update n'a pas tourné.
   Le cwd de l'outil Bash se réinitialise entre deux appels parallèles : chemins absolus, ou
   npm --prefix. Les heredocs bash avec des apostrophes françaises cassent par moments : écrire un
   script Python dans le scratchpad et le lancer avec python -I est plus sûr.

10. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts 27 à 54 de 00 partie
    C. Dette connue : arenas.art et le champ art du spec nomment trois JPEG retirés ; substituteEntry
    et substitute_entry restent et ne sont plus lus ; A20 (React 19) reste le premier pas de la
    phase 3 ; le choix de direction d'un Breaker humain à la parade est automatique ; le marquage des
    cases sous allonge adverse lit « la route la plus courte provoque » et non « la case est sous
    allonge » ; le tray « Swing at / Shove / Pass to » au clic sur un pion n'a pas encore été vu au
    harnais ; le fil garde 120 événements (FEED_LIMIT), soit environ deux rounds maintenant que les
    marches s'affichent ; le Trajector sans ballon à chasser au coup d'envoi n'a pas de position de
    relais à prendre tant que personne ne porte, il peut faire un pas inutile.

11. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
