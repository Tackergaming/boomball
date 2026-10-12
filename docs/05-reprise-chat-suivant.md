# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Fable 5.1) le 2026-10-12, à la fin du chat qui a lu la partie du
> moteur 6 round par round et écrit C13. À coller tel quel comme premier message du chat suivant,
> dans le workspace `jarvis-jdr`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.10
est la dernière sous-phase codée et en ligne, §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 57, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 la quatrième passe (lis « comment la quatrième passe est codée » avant
de toucher à ai/), et C13 LA TÂCHE DE CE CHAT : vingt-neuf points dictés par moi le 2026-10-12
après la lecture round par round de ma partie sur le moteur 6, validés point par point, plus
l'écart 57, plus neuf poids changés. Ne rediscute rien de C12 ni de C13 : C13 remplace
explicitement C12 Trajector 3 et Breaker 3 (le Dash d'approche), C10 Breaker 4 et 5 (la proie
par chance d'évacuer, plus d'écran), et le facteur wardThreatened. 07 §10 porte le journal,
dont l'entrée 2H.10. 09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de
sweep de 2H.8, 2H.9 ni 2H.10. 04 est l'histoire, à lire seulement quand une décision
d'ingénierie te surprend.

Où on en est : 2H.10 est CODÉE, COMMITÉE (0dfbaad) et EN LIGNE depuis le 2026-10-11, moteur 6
(resolve-action v16, create-match v14), 503 tests verts sur 22 fichiers. Ma partie sur le
moteur 6 est jouée le 2026-10-12 (star, 30 à 50, match a17c22a5), consignée dans
boomball/docs/matches/2026-10-12-a17c22a5/ : zéro écart d'événement, zéro décision d'IA qui
diffère du dépôt. Elle a été lue round par round et joueur par joueur dans le chat qui précède,
sur un VISUALISEUR nouveau : docs/matches/<match>/viewer.html, produit par dump-match.ts depuis
le gabarit scripts/match-viewer.html (terrain dessiné comme à l'écran, ma bouche à gauche, une
flèche par tour en vue du round, huit plans classés par décision avec leur note ; match.md n'en
garde que trois). Le résultat de cette lecture est C13, écrit dans 00 avant toute ligne de code.
Cette lecture complète n'est pas à refaire à chaque partie : sur ma demande ou sur ta
proposition.

NON COMMITÉ dans la copie de travail, à commiter en premier (par /commit, sans me demander de
valider le message) : 00 (C12 passé « en ligne », C13 entier), scripts/dump-match.ts (snapshot du
plateau par décision, huit plans, écriture de viewer.html), scripts/match-viewer.html (nouveau),
docs/matches/2026-10-12-a17c22a5/ (nouveau, 1,5 Mo avec le viewer). Les quatre fichiers du vault
modifiés hors de nos sessions (Sapphire Hammer.md, la PREP de la scène 1.2 Ilthavax, sa battlemap
et les prompts de battlemap de la scène 1.3) ne sont pas à nous : ne les commite pas sans mon feu
vert.

LA TÂCHE, dans cet ordre.

1. Commiter l'état ci-dessus.
2. Coder 2H.11 depuis C13, dans cet ordre : l'écart 57 (legalActions.ts, un porteur ne tente
   jamais le Spark) et le point 29 (parryDirection dans rules/ordnance.ts, jamais le pareur) avec
   leurs tests ; les neuf poids ; puis l'IA point par point, les tests en même temps, le fil
   principal sur chooseAction.ts, evaluate.ts, legalActions.ts, les fiches ; des sous-agents
   Sonnet, effort précisé, sur ce qui est borné et disjoint (les tests d'un point, le gabarit du
   visualiseur si on y touche). Le test des cinquante millisecondes fait foi sur la vitesse.
   Relire chaque point de C13 contre le code avant de dire qu'il est fait, et écrire le paragraphe
   « comment la cinquième passe est codée » à la fin de C13, poids par poids, comme en C11 et C12.
3. Vérifier : npm test, typecheck, build du client, npm run e2e puis e2e:playthrough. Pas de
   sweep sans ma demande ; si je le demande, un seul, contre 09 §12, onze minutes.
4. Redéployer sur mon feu vert explicite (ENGINE_VERSION reste 6, pas de migration), rejouer le
   smoke et le playthrough sur les fonctions redéployées, journal 07 §10, 08 §5, skill, CONTEXT.md
   par /update, commit.
5. Ma partie sur 2H.11. Consignée avec dump-match.ts (--list puis --match <id>), viewer.html
   ouvert ; pas de lecture round par round sauf si je la demande ou si tu la proposes avec une
   raison.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 effort high pour l'analyse d'une partie, c'est moi qui le
   demande. Toute matière que tu me présentes nomme son auteur, agent ou fil principal. Dès que
   tu as une liste d'actions pour moi, donne-la numérotée, une action exacte par ligne, et dis ce
   qui se passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés, et il a bien servi
   pour les trois points ouverts de C13. Quand tu me présentes une analyse, le round par round,
   les leçons et la liste par rôle en clair dans le message, jamais un renvoi chiffré vers un
   tableau que je n'ai pas sous les yeux. Pour expliquer pourquoi l'IA a fait un choix, lis les
   huit plans du viewer et le code, jamais une supposition : c'est ce qui a rendu la lecture
   utile. Ne dis plus « la maison » : « l'équipe qui a la balle », « l'équipe qui ne l'a pas »,
   « en attaque », « en défense ». L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, un seul par lot de changements d'IA, onze
   minutes. Tu ne touches à aucune constante de 00 sans mon arbitrage. Les poids de l'IA sont
   dans ai/roles/, et ils viennent de mes mots dans 00 C10 à C13 ; la formule est : note du plan
   = valeur de l'action depuis sa case + position de la case finale (Action dépensée) − position
   de la case de départ − exposition des trajets, chaque valeur d'action étant un poids du rôle
   fois sa chance de réussite.

4. Le plan de tour, en trois phrases : chooseAction renvoie la première action du meilleur plan
   et l'appelant rappelle après chaque action, donc l'IA se juge sur rankPlans (le plan entier et
   sa phrase) et jamais sur une seule action. Un plan se lit à sa fin, Action dépensée ; « marcher
   puis attraper » et « ramasser puis lancer » sont des plans ; une frappe finit sur sa case de
   recul ; toute route est la route sûre de safeReachableCells. Ce qu'une case débloque se demande
   au moteur par actionOptionsAt dans legalActions.ts. Piège vu dix fois dans la lecture : un
   plan recalculé après une marche peut abandonner l'action pour laquelle il a marché (C13 point
   6), et un plancher de Dash peut battre une action réelle.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne : depuis boomball/ en bash,
   set -a && . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis
   --match <id>. Il écrit match.md, viewer.html, events.json, kickoff.json et match.json dans
   docs/matches/<date>-<id8>/ et rejoue le match en local. Les horaires de --list sont en UTC,
   deux heures de moins que l'heure de Paris. Un match d'un moteur antérieur rejoué par le dépôt
   affichera des décisions « DIFFERS » : normal. Pour publier le viewer en artefact privé, l'outil
   Artifact sur viewer.html ; pour lire les plans d'une décision sans ouvrir le navigateur, le
   JSON est dans la balise match-data du viewer.

6. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse
   en 409, le client archive. Redéploiement : depuis boomball/ en bash, set -a && . ../.env &&
   set +a puis npm run deploy:function -- resolve-action create-match.

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
   (écart 55) ; écart 54, promoteBulwark ; écart 53, penaltyBox indexé par l'équipe qui DÉFEND la
   bouche ; 53 bis, applyPass le remet à null quand le Bulwark lance ; écart 56, turn.startedAt
   est la case de début de tour. Deux faits de règle constatés sans décision : l'équipe qui a
   l'humain joue juste après le Spark à chaque round ; la dérive du Spark traverse les unités et
   peut finir sous les pieds d'une unité, qui commence alors son tour dessus.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (503), npm run typecheck, npm run sweep (environ
    11 minutes), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
    http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine du
    workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
    .claude/scripts/check_drift.py. Le cwd de l'outil Bash se réinitialise entre deux appels :
    chemins absolus, ou npm --prefix. Un heredoc bash long avec des apostrophes a cassé une fois :
    pour écrire un gros bloc dans un fichier, l'outil Edit ou Write, pas cat <<EOF. Un script
    Python qui contient des triples guillemets casse aussi le heredoc : Write dans le scratchpad
    puis python -I.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 57 de 00 partie
    C, et C11, C12 et C13 en entier. Dette connue : arenas.art et le champ art du spec nomment
    trois JPEG retirés ; substituteEntry et substitute_entry restent et ne sont plus lus ; A20
    (React 19) reste le premier pas de la phase 3 ; le choix de direction d'un Breaker humain à la
    parade est automatique ; le marquage des cases sous allonge adverse à l'écran lit « la route
    la plus courte provoque » et la route proposée au clic reste la ligne droite alors que l'IA
    prend la route sûre ; le fil garde 120 événements (FEED_LIMIT) ; le Spark peut rebondir
    plusieurs rounds dans une poche du terrain (ligne 19 entre le bord et la caisse (4, 19)),
    règle 36b appliquée, à moi de dire si le layout doit bouger ; les quatre fichiers du vault
    modifiés hors de nos sessions, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
