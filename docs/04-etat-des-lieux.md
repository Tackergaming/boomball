# État des lieux

> Point de reprise du projet Boomball. À lire en premier dans une nouvelle session.
> Dernière mise à jour : 2026-09-02, après trois tests en local de Jérôme. L'équilibrage est clos,
> le nombre de buts est à l'objectif (3,6 à 4,5 par match, 0 à 2 matchs sans but sur 200, voir
> « Le lot 4 »).
> **La phase 4 est écrite de bout en bout.** Projet Supabase en ligne, quatre migrations appliquées,
> RLS vérifiée sur de vrais utilisateurs, les deux Edge Functions déployées, un match entier joué à
> travers elles, et **le client React construit et servi en local**. Ses trois tests ont produit
> trois lots de correctifs : le CORS qui bloquait le lobby, dix retours d'ergonomie de match, puis
> deux trous fonctionnels, les victoires que rien n'enregistrait et le canal d'ordres alliés que rien
> ne branchait. Les trois sections sont plus bas, à lire dans l'ordre.
> **261 tests.** Ce qui reste est du playtest, pas de la construction.

## Le projet en trois lignes

Boomball est le sport traditionnel des Giff, inventé par Jérôme pour sa campagne Spelljammer. On en
fait une application web jouable, coopérative contre l'IA, pour que ses amis s'y connectent. Le
règlement de table existait déjà et n'était pas implémentable en l'état : il a été réécrit en
version codable avant la moindre ligne de code.

## Où vit la vérité

| Document | Autorité sur |
|---|---|
| `docs/00-reglement-v2.md` | **Les règles. Validé par Jérôme le 2026-09-01, partie A et partie B.** Rien ne s'écarte de ce document sans un nouvel arbitrage de sa part |
| `docs/02-architecture.md` | Le contrat entre moteur, serveur et client |
| `docs/03-brief-claude-design.md` | Les prompts Claude Design. **Les deux sont lancés et livrés** |
| `docs/01-prompts-arene.md` | Les prompts d'images d'arène, et ce qu'on a appris dessus |
| `design/README.md` | La vérification du design livré, et les jetons de couleur pour la phase 4 |
| `~/.claude/plans/salut-jarvis-donc-comme-clever-elephant.md` | Le plan validé : phases, décisions produit |

## Décisions produit verrouillées

Coopératif contre l'IA, jamais de PvP. 1 à 3 humains dans la même équipe, **le solo est un mode à
part entière et c'est le cas dimensionnant : 13 unités IA pour un humain**. Personnages génériques,
rôle au choix, nom saisi par le joueur au lobby. Match synchrone, chrono de 60 s, passage
automatique en Dodge à expiration. Progression par équipe, adversaire toujours au même Tier. Une
seule arène au MVP. **Ordinateur uniquement, 1280 px minimum, pas de mobile.** Interface en anglais.

## Ce qui est construit et testé

**254 tests au vert, environ 9000 lignes.** Plus `npm run sweep` pour le rapport d'équilibrage.
`npm test` et `npm run typecheck` depuis `boomball/`. Le typecheck lance désormais **deux** tsconfig,
celui de la racine et celui de `scripts/`, pour la raison expliquée plus bas.

| Module | État |
|---|---|
| `geometry`, `constants` | Coordonnées, Chebyshev, péage de zone, rebonds, trajectoires |
| `arena`, `arenas/kill-silo` | Terrain ASCII, ancrage dérivé. **Terrain provisoire, pas encore un relevé au pixel** |
| `rng`, `stats`, `names` | Dés à graine, table rôle x Tier, pool de noms Giff |
| `types`, `setup`, `initiative` | État de match, coup d'envoi, échelle d'initiative plate |
| `rules/movement`, `rules/falling` | Chemins, cases atteignables, `pathTo`, les deux modes de chute |
| `rules/combat`, `rules/payload` | Jets contestés, jet opposé, recul, portées, blocage du gardien, dispersion |
| `rules/reactions` | Qui a le droit de réagir. Attaque d'opportunité, garde-fou d'ancrage, couloir de passe |
| `rules/ordnance` | Où vont les deux hasards. Ciblage des Crackers, trajectoire d'un Cracker frappé, case d'entrée du Spark, dart à réflexion. Le dart ne jette plus de dé, il suit le cap qu'on lui passe |
| `reduce` | La porte unique. Mouvement, Dash, Dodge, Disengage, attaque, bousculade, ramassage, passe, tir, Crackers, Spark, Réactions, fin de tour, rounds, mort subite, élimination, remplaçants |
| `legalActions` | Le générateur unique qui nourrit l'interface et l'IA |
| `ai/roles/*` | Les quatre tables de priorités, en données pures |
| `ai/evaluate` | La valeur d'une case, les cotes d'un jet, la pression des Crackers |
| `ai/chooseAction` | Le choix. Énumère les candidats de `legalActions`, les note, rend le meilleur |
| `ai/orders` | Le canal d'ordres alliés : demander la passe, marquer une cible, tenir une zone |
| `ai/selfPlay` | Le match sans écran, et le harnais d'équilibrage |
| `server/session` | La logique du serveur, sans serveur. Propriété d'une unité, chrono de tour, et la résolution de tous les tours IA jusqu'au prochain humain |
| `server/seed` | Le seed SQL généré depuis le moteur, pour que `role_stats` et l'arène ne dérivent pas |
| `server/lobby` | Qui a le droit d'ouvrir un match, et le coup d'envoi. Sans base, comme `session` |
| `server/arenaRow` | La ligne `arenas` remise dans la forme du moteur. Partagée par les deux fonctions, testée en aller-retour contre `KILL_SILO` |
| `supabase/migrations/*.sql` | Le schéma, les enums et la RLS. **Les quatre sont appliqués au projet.** `0002` corrige la lecture d'une équipe par son propriétaire, `0003` enregistre une victoire, `0004` porte les ordres alliés |
| `scripts/apply-migration.mjs` | Applique un fichier SQL par l'API Management. Pas un migrateur, pas de registre |
| `supabase/checks/rls-check.py` | 24 assertions de RLS contre le projet vivant, deux utilisateurs et de vrais JWT. Hors `npm test`, il lui faut le réseau |
| `supabase/checks/browser-path.py` | 16 assertions sur le parcours exact du navigateur, **préflight CORS compris**. Le seul contrôle qui voit ce que Node ne peut pas voir. Hors `npm test`, il lui faut le réseau |
| `supabase/functions/_shared/cors.ts` | Les en-têtes CORS et la réponse au préflight, partagés par les deux fonctions |
| `supabase/functions/resolve-action` | L'Edge Function du match. **Déployée et éprouvée sur un match complet** |
| `supabase/functions/create-match` | La porte du lobby. **Déployée et éprouvée**, refus compris |
| `scripts/build-edge-function.mjs` | Le bundle esbuild qui lève l'obstacle Deno. `npm run build:function` |
| `scripts/deploy-edge-function.mjs` | Le déploiement par l'API Management. `npm run deploy:function` |
| `scripts/live-match.ts` | Un match entier joué contre la fonction déployée, en HTTP, de bout en bout |
| `client/` | React, Vite, TypeScript. Les cinq écrans du design, la grille SVG, la barre d'actions, la piste d'initiative, le journal |
| `client/src/match/replay.ts` | Le rejeu tour par tour d'un lot d'événements. Transcrit, ne résout jamais. Tenu par `replay.test.ts` contre le plateau du serveur |
| `client/src/match/Announce.tsx` | La carte qui dit ce qui vient d'arriver, jet de dés compris |
| `client/src/match/Briefing.tsx` | L'explication d'ouverture, une fois par joueur |

## Décisions d'ingénierie prises en cours de route

Elles ne sont pas dans le règlement parce qu'elles ne concernent pas le jeu, mais elles ont façonné
le code et il faut les connaître avant d'y toucher.

**L'échelle d'initiative est une file plate**, une unité par entrée, celles d'un même bloc partagent
un `blockId`. La version imbriquée avait un curseur à deux niveaux qui devenait ingérable dès que
des remplaçants entraient en cours de round. `ladderRungs()` regroupe pour l'affichage.

**Deux structures d'initiative selon qui joue.** Avec des humains : tirage individuel, puis les
coéquipiers IA en un bloc juste après le dernier humain, pour qu'un ordre donné pendant un tour
humain soit exécuté dans le même round. Sans humain : les deux équipes en blocs 15 et 10, pour que
les mille runs d'équilibrage soient symétriques et donc lisibles.

**Le client envoie le chemin entier, pas une destination.** Contourner la portée d'un adversaire est
une décision tactique, et un moteur qui choisit l'itinéraire la confisque.

**Dodge vit sur l'unité, Disengage vit sur le tour**, parce qu'ils ne durent pas la même chose.

**Une chute traverse les autres joueurs.** La fiche ne dit rien ; sans ça un puits encombré devient
un carambolage.

**Le remplaçant garde son identifiant et son nom.** Écart assumé de la fiche : mécaniquement
identique, mais un humain qui a tapé son nom ne veut pas se le faire échanger en cours de match.

**Le blocage du gardien est automatique**, jamais proposé. S'interposer ne coûte que la Réaction et
relève toujours le nombre à battre, donc la réponse est unique. Ça épargne au MVP tout un système de
sollicitation de réaction pour une décision qui n'en est pas une.

**Les égalités de proximité d'un Cracker se tranchent au dé, pas par identifiant.** Un départage par
identifiant se résoudrait toujours dans le même sens, et comme l'identifiant porte la lettre
d'équipe, il viserait systématiquement le même camp. Invisible sur un match, ça fausse une passe
d'équilibrage de mille runs, c'est à dire exactement ce que ces passes servent à détecter.

**Frapper un Cracker est une attaque de mêlée à tous les égards**, donc le recul de la batte part
aussi, touché ou manqué, et un porteur du Payload ne peut pas frapper. La fiche appelle ça une
attaque de mêlée, on la traite comme telle. Le recul est ici un cadeau plutôt qu'un coût, il met
deux cases entre le frappeur et une charge vivante.

**Une unité debout sur un Cracker le fait détonner sur place.** La ligne de ciblage n'a nulle part
où aller, donc sans cette lecture, se poser sur un Cracker le désamorcerait pour le reste du match.

**Le Spark n'apparaît que sur une case occupable.** Il ignore le terrain une fois lancé, mais il se
capture en se tenant sur sa case, et un Spark né dans une poutrelle serait incapturable jusqu'à ce
qu'il en dérive.

**Le Spark a trois états, pas un booléen.** `pending`, `live`, `caught`. C'est le lot 3 qui l'a
imposé : tant que la capture sifflait la fin, un Spark ramassé et un Spark pas encore arrivé étaient
également « hors du terrain » et personne ne les distinguait. Sans le troisième état, le Spark
attrapé au round 7 redescendait au round 8, parce que la garde d'entrée lisait « pas en jeu ».

**Le cap du Spark vit dans son état et le dart ne jette aucun dé.** Le `d8` est tiré une fois, à
l'entrée. `reflectedRun` rend le cap de sortie en même temps que le chemin, et c'est lui qui est
rangé pour le round suivant. Conséquence à connaître avant de toucher aux seeds : `resolveSpark` ne
consomme plus de `rngSeed`, donc tous les tirages postérieurs au round 6 sont décalés par rapport aux
sweeps d'avant le lot 3. Les comparaisons de seed à seed avec les anciens rapports ne valent rien,
seules les moyennes se comparent.

**Escamotage ou Acrobaties, la question ne se pose pas.** Les deux tombent dans la même colonne
d'agilité de la table de stats, donc rien à demander au joueur.

**Les Réactions sont prises automatiquement, sous une politique écrite.** Arbitré par Jérôme le
2026-09-01. Solliciter un joueur au milieu du tour d'un autre demande un tour suspendu, un second
chrono et une fenêtre modale, dans un jeu dont le mode dimensionnant est un humain contre treize
unités IA. La politique tient en trois lignes :

- Un couloir de passe défendu est **toujours** contesté. Prendre le Payload vaut mieux que n'importe
  quel usage ultérieur de la Réaction
- Une attaque d'opportunité est prise **sauf si le recul de la batte laisserait le frappeur sans
  ancrage**. C'est le seul coût qui ne vaut pas un d8 : il chuterait au début de son tour suivant et
  perdrait sa position en plus de ses points de vie. Le moteur émet alors un événement
  `reactionHeld`, qui est la seule chose qui explique au joueur pourquoi personne ne l'a frappé
- **Le gardien ne chasse jamais une passe** tant qu'il est à 2 cases ou moins de sa Furnace. Sans
  cette exception, une passe devant le but serait le moyen le moins cher de lui vider sa Réaction
  avant de tirer

**La Réaction est dépensée sur la tentative, pas sur la réussite.** Une passe longue à travers la
Scramble vide donc les Réactions de tous ceux qui bordent le couloir, ce qui fait du dégagement d'un
couloir une action qui vaut un tour.

**Un déplacement se journalise en segments**, coupés là où une attaque d'opportunité tombe, pour
qu'un client rejoue marche, coup, marche au lieu de téléporter le mobile puis de résoudre la
violence après coup.

**Défaut corrigé au passage** : une unité tuée avant d'avoir joué, par la chute qu'elle devait pour
avoir fini son tour précédent en l'air, bloquait la file d'initiative sur un cran que personne ne
pouvait jouer. Le trou existait déjà, les attaques d'opportunité le rendaient atteignable tous les
rounds.

**Simplification connue, non corrigée** : les Réactions se rechargent en haut de round et non au
début du tour de chaque unité comme le dit la fiche. C'est marginalement généreux, l'écart ne se
voit qu'entre la bascule de round et le tour de l'unité concernée.

## Décisions d'IA

**Une IA décide, elle ne résout jamais.** Elle demande à `legalActions` ce qu'elle a le droit de
faire, note ces candidats, et passe le meilleur à `reduce` comme le fait un client humain. Elle ne
peut donc pas tricher même par accident, et un match se rejoue à l'identique quel que soit qui
tenait les maillots.

**Un appel rend une action, pas un tour.** Un tour, c'est marcher, frapper, remarcher. L'appelant
boucle jusqu'à recevoir `endTurn`, exactement comme une interface boucle sur les clics.

**Une case doit valoir les actions qu'elle débloque, pas seulement sa distance à l'objectif.**
C'est la leçon la plus chère du projet, elle a coûté deux lots d'équilibrage à trouver et elle se
reproduira. `positionValue` note une case, et une action qui n'existe que depuis une case précise est
invisible pour elle. Le ramassage du Payload vaut 90, mais il n'est proposé qu'à une unité **déjà
debout** sur le ballon ; l'évaluateur de déplacement, lui, ne voyait que `chaseLoosePayload ×
proximité`, et franchir la dernière case rapportait `55/45`, soit 1,2 point. Résultat mesuré en
traçant les matchs : le ballon restait au sol sur la même case pendant dix rounds **avec une unité à
une case de distance**, tour après tour. Le correctif ajoute la valeur du ramassage à la case du
ballon elle-même. Même défaut et même correctif sur le Spark. À vérifier pour tout nouvel objectif
qu'on ajoutera au jeu.

**`endTurn` vaut zéro et tous les appétits sont positifs.** Une unité s'arrête donc dès que rien sur
le plateau ne vaut mieux que de ne rien faire, au lieu de gigoter parce qu'il lui reste du
mouvement.

**Les tables de priorités sont des données, pas du code**, comme `engine/stats.ts`. Une colonne de
nombres par rôle dans `ai/roles/`, et rien d'autre dans l'IA ne sait quel rôle elle joue.
Rééquilibrer les quatre rôles, c'est éditer ces quatre fichiers.

**L'IA ne jette aucun dé.** Le même plateau donne la même décision. C'est ce qui rend le sweep
lisible et le match rejouable.

**Une case vaut un nombre, et un déplacement vaut la différence.** Toute la lecture positionnelle
tient dans `positionValue`. Aucune simulation du futur, aucun arbre de recherche : le coût d'un tour
IA doit rester de quelques millisecondes puisqu'il y en a treize par round en solo.

**Trois erreurs corrigées pendant la mise au point**, et elles valent d'être connues parce qu'elles
se reproduiront au prochain réglage :

- Une **passe latérale valait la moitié d'une bonne passe**, avec un plancher à 0,5 dans le calcul
  de progression. Résultat : le ballon tournait dans l'équipe toute la partie sans jamais monter,
  parce que toute passe ressemblait à un progrès du seul fait d'être une passe. Une passe ne vaut
  désormais que le terrain qu'elle gagne, plus un supplément quand elle sort le ballon de la
  pression
- Le **gradient vers la Furnace était plat**, donc le premier pas à travers le silo valait autant
  que le dernier pas dans la portée de tir, et le porteur dérivait vers le but sans jamais arriver.
  `scoringNearness` est plat à un dans la portée propre et décroît en dehors
- Le **désengagement ne se déclenchait jamais**, parce que je le conditionnais à un gain de
  déplacement positif, gain justement rendu négatif par les attaques d'opportunité que le
  désengagement sert à acheter. Le gain est maintenant lu deux fois, avec et sans la pénalité

## Ce que ça donne sur le terrain

Mesuré sur 40 matchs joués à vide, les deux équipes ne faisant que passer leur tour :

- **2 détonations dès le round 1, à tous les coups.** Les cases de départ mettent les six joueurs de
  champ à 4 cases exactement de la case d'ordonnance, donc les deux Crackers touchent quelqu'un
  avant le premier tour de jeu. C'est le règlement appliqué à la lettre, mais c'est un choix de
  placement qui se corrigera au relevé de l'arène si tu ne le veux pas
- **24 détonations par match**, soit les deux Crackers à chaque round
- **2,2 joueurs encore hors du terrain au coup de sifflet.** Sur une équipe passive, donc c'est un
  plancher, pas un plafond
- **Le Spark n'a jamais été capturé** sur ces 40 matchs, personne ne le chassant. Sa vraie valeur ne
  se lira qu'une fois l'IA écrite

## Le rapport d'équilibrage

`npm run sweep`, 200 matchs par Tier, IA contre IA. Les deux camps partagent le Tier et le cerveau,
donc un écart de victoires est un biais des règles ou de l'arène, jamais des rôles.

**Buts par match, incrément par incrément :**

| Étape | Rookie | Veteran | Star |
|---|---|---|---|
| Départ | 0,27 | 0,21 | **0,07** |
| + lot 1, colonne Jet et blocage additif | 0,29 | 0,29 | **0,32** |
| + lot 2, Bousculade sans chute, péage à 10 | 0,24 | 0,34 | 0,34 |
| + correctif d'IA, le porteur se débarrasse du ballon | 0,70 | 0,79 | 0,81 |
| + lot 3, le Spark | **0,56** | **0,74** | **0,82** |

Le rapport porte deux colonnes ajoutées au lot 3, parce que les anciennes ne pouvaient pas répondre
à la question posée. **Tentatives/match** compte les mains tendues vers le Spark, réussies ou non :
une capture ne peut jamais valoir qu'un tiers à une moitié de ce nombre, donc c'est lui qui dit si
quelqu'un chasse le Spark, quoi qu'en dise le DC. **Décidés** compte les matchs dont le vainqueur
change quand on retire les points du Spark du tableau.

**État actuel, 200 matchs par Tier :**

| Tier | A | B | Nuls | Buts/match | Sans but | Spark capturé | Tentatives/match | Décidés | Évacués/match |
|---|---|---|---|---|---|---|---|---|---|
| Rookie | 94 | 103 | 3 | **3,60** | **2 / 200** | 78 | 1,24 | 41 | 1,78 |
| Veteran | 103 | 95 | 2 | **4,09** | **1 / 200** | 101 | 1,22 | 54 | 1,43 |
| Star | 108 | 91 | 1 | **4,45** | **0 / 200** | 130 | 1,12 | 76 | 1,07 |

**L'objectif du plan est atteint** : 3 à 5 buts par match et bien moins de 15 % de matchs sans but.
La cible que Jérôme a fixée le 2026-09-01, moins de 6 matchs sans but sur 100, est tenue aux trois
paliers. Le Spark décide 20 % / 27 % / 38 % des matchs, arbitré acceptable en l'état.

**Les trois états précédents, pour la trajectoire :** au départ 0,27 / 0,21 / 0,07 but ; après les
lots 1, 2 et le premier correctif d'IA 0,70 / 0,79 / 0,81 ; après le lot 3 0,56 / 0,74 / 0,82 avec
122 / 103 / 94 matchs sans but sur 200.

**Ce qu'il faut retenir de la série.**

Le **lot 1 a fait exactement ce qu'il devait** : il a réparé l'effondrement du Star, de 0,07 à 0,32,
et rien d'autre. C'était bien un problème de ratio.

Le **lot 2 n'a presque rien fait**, et mon diagnostic était faux. La Bousculade et le péage n'étaient
pas le goulot. Ils restent en place, ils ne nuisent pas, mais ils ne méritent pas le crédit.

**Le vrai goulot était l'IA, pas les règles.** Le Breaker tenait le ballon 65 % du temps, et sur
472 tours de portage il choisissait 176 bousculades, 196 fins de tour et 4 tirs. Il s'asseyait
dessus. Deux causes, toutes deux corrigées dans `ai/chooseAction.ts` :

- **Une passe était valorisée sur le terrain gagné, pas sur la chance créée.** Un Breaker au bord de
  la portée tient un tir à une chance sur cent ; la même case dans les mains d'un Striker vaut une
  sur trois. Mesurée en distance, cette passe ne gagne rien. Elle est désormais notée sur l'écart de
  qualité de tir entre le porteur et le receveur, ce qui est le seul usage sérieux de la colonne Jet
- **Un porteur bousculait au lieu de jouer.** Un joueur qui tient le Payload n'est pas un défenseur,
  son Action c'est le tir ou la passe. L'appétit de bousculade est divisé par cinq quand il porte

Après correctif : le Breaker tombe à 1815 tours de portage et passe 95 fois contre 2 bousculades, le
Striker monte à 3510 tours et tire 82 fois au lieu de 46.

**Ce qui restait ouvert a été traité par le lot 4**, plus bas. Cette série de sweeps s'arrête ici :
l'objectif de 3 à 5 buts est atteint.

## Le lot 3, fait, et ce qu'il a appris

Les trois changements validés sont implémentés, testés et versés au règlement, écarts 19 et 20.

1. **6 cases par round au lieu de 12.** `SPARK_MOVE_CELLS`
2. **Cap persistant.** Le `d8` est tiré une seule fois, à l'entrée. `reflectedRun` rend le cap de
   sortie avec le chemin, et il est rangé dans l'état du Spark pour le round suivant. Entre deux
   murs le Spark est désormais une bille sur un tapis : il se lit et il se coupe
3. **Valeur baissée et plus de fin immédiate.** Posée à 30 au lot 3, portée à **50** au lot 4 quand
   le nombre de buts a été réparé. Le Spark quitte le terrain pour de bon une fois pris,
   et le match va au bout de ses rounds. En mort subite il siffle la fin comme n'importe quel score,
   par la règle de la mort subite et non par la sienne

Le poids `catchSpark` des quatre tables d'IA est passé de 400 à 240.

**Ce que ça a donné.** Les changements 1 et 2 font ce qu'on leur demandait. Les tentatives montent
de 0,40 à 0,51 au Rookie et de 0,38 à 0,47 au Veteran, les captures de 17 à 33 et de 24 à 39 sur
200 matchs. Le Spark est devenu un objectif qu'on va chercher.

**Quatre choses valent d'être connues avant le prochain réglage.**

**Le prix du Spark ne pilote rien, et c'est la vraie découverte du lot.** Le même lot de 600 matchs
rejoué et compté à chaque valeur candidate donne une courbe plate : à 10 points le Spark décide 28
des 33 matchs où il est pris au Rookie, à 150 points il en décide 29. Au Star, 22 sur 39 à 10 points
contre 29 sur 39 à 40. La raison est arithmétique et pas ludique : à 0,8 but par match, la moitié
des rencontres finissent 0-0 ou 1-0, et **n'importe quel prix retourne un score pareil**. Le Spark
cessera de décider les matchs quand le Payload commencera à les décider, pas quand cette constante
baissera.

**Suite au lot 4, cette conclusion tient toujours mais son contexte a changé.** Le nombre de buts est
passé à 3,6-4,5, donc un match moyen pèse 36 à 45 points et une capture ne l'emporte plus
mécaniquement. La valeur a été portée à 50 par Jérôme, et ce qui limite désormais l'influence du
Spark n'est toujours pas son prix mais le nombre de mains qui le cherchent : une seule, celle du
Trajector.

**Le poids `catchSpark` ne pilote presque rien non plus.** Un sweep complet à 400 et un sweep
complet à 240 rendent les mêmes chiffres à un match près. C'est logique après coup : ce poids n'est
lu que par une unité déjà debout sur la case du Spark, où presque rien ne lui dispute l'Action. Le
levier qui décide de la fréquence des captures, c'est `chaseSpark`, qui est un poids de position.

**Le lot 3 a coûté des buts au Rookie sur le moment**, 0,70 à 0,56. Un Spark réellement atteignable
détournait des unités du ballon. Réglé au lot 4 en réservant la chasse au Trajector.

**Une hypothèse à vérifier avant de tirer une conclusion du Star.** Ses tentatives n'ont pas bougé,
0,35 à 0,36, alors que ses captures montent de 24 à 39. Le taux de réussite passerait donc de 34 %
à 54 % sans qu'aucune règle de jet n'ait changé. Ça peut être le décalage du flux de dés décrit plus
haut plus le bruit d'un échantillon de 200, ou un effet réel du Spark ralenti, qu'on peut désormais
retenter après une main manquée, ce qui était impossible quand il filait douze cases. À trancher en montant le sweep à 1000 matchs, pas en raisonnant dessus.

**La valeur du Spark a été tranchée au lot 4 : 50 points.**

## Le lot 4 : pourquoi personne ne marquait

C'est la section à lire avant de retoucher quoi que ce soit à l'équilibrage.

Après le lot 3 le jeu produisait **0,56 à 0,82 but par match et près d'un match sur deux finissait
nil-nil**, contre 3 à 5 buts visés. Question posée par Jérôme : est-ce que l'IA ne sait pas marquer,
ou est-ce que la règle est cassée ? **Les deux, et dans cet ordre d'importance.**

### Comment on a trouvé

En comptant le tunnel qu'un but doit descendre, tour par tour, sur 120 matchs par palier :
possession, arrivée à portée, tir pris, gardien battu. Deux chiffres ont sauté aux yeux.

**96 à 98 % de tous les tirs du match étaient bloqués par le gardien.** Et **le ballon passait 40 à
57 % des tours au sol**, sans personne pour le ramasser.

Ensuite, en isolant les matchs sans but : ils n'étaient pas des matchs malchanceux au tir, c'étaient
des matchs **sans possession du tout**. Le ballon y était porté 2,3 tours contre 13,4 en moyenne, et
les deux tiers d'entre eux ne contenaient **aucun tir**. Une trace round par round a donné la scène
exacte : le ballon immobile au sol sur la même case pendant dix rounds, avec `nearest=1` à chaque
round, c'est à dire une unité debout à une case de lui qui ne monte jamais dessus.

### Les quatre changements

**1. Le correctif d'IA, et c'est le vrai coupable.** Détaillé dans les décisions d'IA plus haut :
`positionValue` ne voyait pas qu'une case peut débloquer une action. Franchir la dernière case vers
le ballon valait 1,2 point quand le ramassage en vaut 90. Corrigé dans `ai/evaluate.ts`, pour le
Payload et pour le Spark.

**2. Le blocage du gardien, divisé par deux**, de +4/+6/+8 à +2/+3/+4. L'arbitrage 2 tarifait ce
blocage comme occasionnel, le second tireur du round devant passer. Mais les deux équipes réunies
produisaient moins de trois tirs par match : un second tir dans le même round n'arrivait jamais, donc
la Réaction se comportait comme un bonus permanent. La forme de l'arbitrage 2 survit, ses nombres non.

**3. Furnace AC 18 → 15.** Elle était écrite contre un blocage supposé occasionnel.

**4. Portée propre du lancer, 30 → 45 pieds.** Les deux Furnaces sont à 14 cases l'une de l'autre sur
la même passerelle. À 30 pieds le porteur mesurait en moyenne 10 cases de la Furnace visée, donc
passait presque tous ses tours en désavantage.

Le match reste en **10 rounds** et l'AC de passe reste à 12 : testés, ils ne sont pas nécessaires.

### Le Spark

Le correctif d'IA s'appliquait aussi à lui, et il est devenu attrapable dans 44 à 61 % des matchs,
décidant un quart à un tiers des rencontres. **Arbitré par Jérôme : `chaseSpark` n'appartient qu'au
Trajector**, il vaut zéro dans les trois autres tables. Un rôle à zéro attrape quand même le Spark
s'il se trouve sur sa case, c'est gratuit ; simplement il n'ira jamais. Valeur du Spark fixée à
**50 points**.

Effet mesuré : deux chasseurs sur quatorze au lieu de quatorze, mais **le taux de capture ne baisse
presque pas**, de 87/96/122 à 78/101/130 sur 200. Un seul Trajector dédié suffit contre un Spark à
6 cases. Le Spark décide donc 20 % / 27 % / 38 % des matchs, **arbitré acceptable par Jérôme**.

Deux leviers ont été mesurés au cas où ça changerait, et ils sont disponibles si tu veux y revenir :
porter le Spark à 8 cases par round donne 68/94/126 captures, et monter le `DC` de capture de 20 à 24
donne 26/61/104. Le second est efficace mais très pentu d'un palier à l'autre, parce qu'il multiplie
un jet de dé au lieu de jouer sur la géométrie.

### Ce qu'on a mesuré et écarté

- **Allonger le match** est un levier faible et trompeur. 20 rounds au lieu de 10 ne donnaient pas
  le double de buts mais 1,14 contre 0,74 : le temps gagné partait en ballon au sol
- **Réduire la dérive du ballon manqué** (`SCATTER_DIE` de 4 à 1) ne valait rien, +0,1 but
- **Faire réclamer les arrêts par le gardien**, au lieu de laisser le ballon rebondir libre, marchait
  bien (le temps au sol tombait de 61 à 40 tours) mais **est devenu inutile une fois le correctif
  d'IA en place**. Écarté pour ne pas changer une règle sans nécessité. À ressortir si on cherche du
  temps de jeu utile plus tard
- **Monter les poids `chaseLoosePayload`** ne réglait rien : le problème n'était pas l'envie d'aller
  au ballon, c'était le dernier pas

## La phase 4, commencée

### Ce qui est fait et testé

**`server/session.ts`, la logique du serveur sans le serveur.** C'est le vrai travail de la couche
et il est volontairement séparé de Supabase, pour qu'il soit testable en millisecondes. Il fait
trois choses, et aucune n'est une règle du jeu :

- **La propriété.** Est-ce bien le tour de cette unité, et est-ce bien ce joueur qui la contrôle. La
  légalité du coup, elle, n'est pas revérifiée : c'est `reduce` qui tranche et sa raison de refus
  est renvoyée telle quelle. Une seule porte, y compris ici
- **Le chrono.** L'échéance vit dans la session et pas dans `MatchState`, parce que le moteur n'a pas
  d'horloge et ne doit pas en gagner une. Un tour expiré se dépense en Dodge à la première requête
  qui le constate, donc un portable en veille ne gèle pas la partie des deux autres
- **La résolution du bloc IA.** Un clic humain déclenche couramment dix tours ou plus, résolus en une
  passe et renvoyés en un seul lot d'événements. Les hasards n'ont besoin de rien : `reduce` résout
  le compte des Crackers et le dart du Spark tout seul quand l'échelle passe dessus

13 tests, dont un match solo complet joué de bout en bout **par la seule porte du serveur**, un match
entier mené uniquement par expiration du chrono, et le déterminisme à graine égale.

**Le schéma, `supabase/migrations/0001_init.sql`.** Les neuf tables de l'architecture, en enums
plutôt qu'en texte libre, avec la RLS active dès la première migration. Deux points à connaître :
le Tier est une **colonne générée** à partir des victoires, donc personne ne peut le saisir à la
main ; et il n'y a **aucune policy d'écriture** sur `matches`, `match_events`, `match_participants`
et `match_state`. Ce n'est pas un oubli : toute écriture passe par l'Edge Function, qui détient la
clé service. Un client capable d'insérer un événement serait un client capable de s'écrire un but.

**Le seed, généré et gardé.** `role_stats` et `arenas.layout` existent en base pour que l'interface
lise une ligne de stats et dessine une grille sans importer le moteur. C'est un miroir, et un miroir
dérive. Donc `supabase/seed.sql` est **généré** depuis `engine/stats.ts` et `engine/arenas/`, et
`server/seed.test.ts` tient le fichier contre le moteur : change une stat, le test casse. Vérifié en
le cassant volontairement.

### Le projet Supabase est en ligne

Créé le 2026-09-02, région **eu-west-3 (Paris)**, ref **`tckaybbmnjyitavypqtq`**, dans
`Jerome's Org`. Le `.env` du workspace porte l'URL, la clé anon, la clé service role, le mot de
passe de la base et le ref, sous le préfixe `SUPABASE_BOOMBALL_`. **Rien de tout ça n'est
versionné**, et rien ne doit l'être.

Ni la CLI `supabase` ni `psql` ne sont installés, et ils ne sont pas nécessaires : le Personal
Access Token de `SUPABASE_API_KEY_BOOMBALL` ouvre l'API Management, qui crée les projets, exécute le
SQL et déploie les fonctions. Tout ce qui suit est passé par là.

**La migration et le seed sont appliqués.** Neuf tables, RLS active sur les neuf, `role_stats` à
douze lignes et le Kill-Silo en base.

**La RLS a été vérifiée pour de vrai**, par `supabase/checks/rls-check.py` : deux utilisateurs
signés, de vrais JWT, 24 assertions sur ce que chacun voit et écrit. C'est un script et pas un test
vitest parce qu'il lui faut un projet vivant et un aller-retour réseau, quand la suite doit rester
en millisecondes. Il a trouvé deux choses le premier jour, et aucune n'était visible en lisant les
policies.

**Un vrai défaut, corrigé par `0002_team_read_owner.sql`.** `teams_read_member` était
`using (is_team_member(id))`, et `is_team_member` répond en interrogeant `teams`. Une sous-requête
dans une policy voit l'instantané du début de l'instruction, donc **la ligne qu'on est en train
d'insérer lui est invisible**. Conséquence : `insert into teams` passait et
`insert into teams ... returning id` était refusé. En termes PostgREST, un insert nu marchait et
`.insert().select()` échouait avec un 42501 dont le message, « new row violates row-level security
policy », désigne le mauvais coupable : ce n'est pas le `with check` de l'insert, c'est la policy de
lecture au moment du `RETURNING`. C'est exactement ce que le lobby enverra. Le correctif lit `owner`
sur la ligne évaluée au lieu d'aller la chercher, ce qui est aussi moins cher à chaque lecture.

**Une fausse alerte, qui vaut d'être connue.** Un client qui tente `PATCH /matches` ou
`DELETE /matches` reçoit **204**, pas 403. Sans aucune policy d'écriture, l'instruction ne
correspond à aucune ligne au lieu de lever, et PostgREST répond 204 pour « rien à signaler », le
même 204 qu'une écriture réussie. Le schéma était bon, c'est la première version du contrôle qui
était fausse. **Toute vérification d'écriture relit donc la ligne** avec la clé service et juge sur
ce que la base a gardé, jamais sur le code de retour.

### L'Edge Function tourne

**L'obstacle Deno est levé, et par une étape de build.** Le moteur importe ses modules en
`./types.js` alors que les fichiers sont en `.ts` ; Deno exige que le spécificateur nomme un fichier
qui existe, esbuild applique la règle TypeScript qui dit que le `.js` peut désigner le `.ts` d'à
côté. `npm run build:function` produit donc `supabase/functions/resolve-action/dist/index.js`, un
seul fichier ESM de 70 ko, le client Supabase restant en import d'URL et marqué externe. Rien dans
`engine`, `ai`, `server` ni dans `index.ts` n'a changé, et le dépôt garde **une seule** convention
d'import. `index.ts` reste la source à éditer, `dist/` est généré et ignoré par git.

**`npm run deploy:function`** construit puis déploie par l'API Management,
`POST /v1/projects/{ref}/functions/deploy`, avec `verify_jwt` actif : la fonction lit l'identité dans
le JWT et refuse qui elle ne peut pas nommer, donc une requête non signée est mieux arrêtée à la
passerelle que dans notre code. Déployée en version 1, statut ACTIVE.

**Un match entier a été joué à travers elle**, par
`node scripts/run-ts.mjs scripts/live-match.ts`. Vrai utilisateur, vrai JWT, vrai projet, chaque tour
humain envoyé en HTTP. Le siège humain est piloté par `chooseAction`, donc la fonction rencontre des
déplacements, des passes, des tirs et des coups de batte au lieu d'une file d'`endTurn`. Le script
ne garde jamais le plateau entre deux tours : il relit `match_state` **à travers la RLS en tant que
joueur**, qui est le chemin de lecture du client React.

L'ordre de grandeur d'un match solo complet, mesuré sur plusieurs exécutions :

| Mesure | Valeur |
|---|---|
| Requêtes à la fonction | 26 à 27 |
| Événements rendus | 640 à 680, plus 8 à 27 à l'ouverture |
| Refus | 0 |
| Durée | 20 secondes |
| Fin | round 10, `finished`, toujours un vainqueur |
| Séquence des événements | 665 à 690 lignes, aucun trou |
| Instantané | toujours sur le dernier événement |

Les fourchettes viennent de la graine, désormais tirée par `create-match`, et le nombre d'événements
à l'ouverture varie avec le rang de l'humain dans l'échelle d'initiative : il compte tous les tours
IA joués avant la première décision humaine.

**Le déterminisme à travers le réseau a été vérifié avant ce changement.** Deux exécutions à graine
fixe rendaient exactement le même match, événement pour événement, avec des identifiants de joueur et
de match différents. Ce n'est plus rejouable depuis ce script, et c'est normal : le contrôle vit dans
`ai.test.ts` et `session.test.ts`, à graine fixe, là où il a sa place.

Un match est conservé en base pour être regardé, `b8fa8b66-7003-4587-95d5-4f1dba5eccea`, ouvert par
`create-match` et joué en entier. Il part avec son joueur,
`DELETE /auth/v1/admin/users/908c92d2-bfd9-42ce-b90f-0db66ac68fb5`, tout cascade.

### La seconde porte, `create-match`

**L'architecture disait « une seule Edge Function », il y en a deux, et c'est la même raison qui
l'impose.** Ouvrir un match écrit dans `matches`, `match_participants`, `match_events` et
`match_state`, quatre tables sur lesquelles aucun client n'a de policy d'écriture. Un navigateur ne
peut donc pas ouvrir un match, et c'est voulu : celui qui le pourrait pourrait aussi s'écrire un
but. Il lui faut une porte, comme pour jouer.

**La logique est dans `server/lobby.ts`, pas dans la fonction**, exactement comme `session.ts` pour
l'autre. 13 tests, sans base et sans réseau. Ce que cette couche possède, c'est la question du
lobby : est-ce une équipe qui a le droit de commencer un match.

**Deux champs que le client n'a pas le droit d'envoyer**, et les deux séparent un lobby d'une
triche :

- **Le Tier** est lu sur la colonne générée de l'équipe. Un client qui nommerait son Tier alignerait
  des Star à son premier match
- **La graine** est tirée par la fonction. Un client qui l'enverrait pourrait rouvrir le même match
  jusqu'à ce que le coup d'envoi lui plaise, dans un jeu dont toute la promesse de déterminisme
  repose sur cette graine

**Les refus sont des refus, pas des exceptions.** `createMatch` lève déjà sur une équipe de quatre,
sur un joueur en double et sur trois Bulwark quand l'équipe n'en aligne qu'un. C'est la bonne
assertion pour un moteur, qui a le droit de tenir ça pour impossible, et la mauvaise réponse pour un
lobby, où c'est un formulaire mal rempli. `server/lobby.ts` les vérifie donc d'abord et rend une
raison affichable, et les jets du moteur redeviennent le garde-fou qu'ils devaient être.

**Deux garde-fous que la couche pure ne peut pas connaître**, parce qu'ils vivent en base. Tout le
monde à table doit appartenir à l'équipe, l'appelant compris. Et **une équipe n'a qu'un match à la
fois** : sans ça un bouton de lobby cliqué deux fois ouvre deux matchs, dont le second devient
silencieusement celui que le client regarde pendant que le premier reste inachevé pour toujours.

**Si une écriture échoue après la création de la ligne de match, le match est détruit.** Un match
dont l'instantané manque est un match que le client trouve et que `resolve-action` ne sait pas
charger. La suppression cascade sur les trois autres tables.

**Éprouvée sur le vrai projet**, et pas seulement en test unitaire. `scripts/live-match.ts` ouvre
désormais son match par cette porte et vérifie au passage les trois refus contre la fonction
déployée : un second match pendant qu'un tourne rend 409, un siège pour quelqu'un d'une autre équipe
rend 403, une requête sans jeton de joueur rend 401.

**Le script ne prend plus aucun raccourci qu'un navigateur n'aurait pas.** Il détient la clé service
et ne s'en sert plus que pour deux choses, créer l'utilisateur jetable et le supprimer, qui sont des
actes d'administration par nature. Tout le reste passe par la RLS ou par une fonction.

Conséquence à connaître : **la graine étant tirée côté serveur, deux exécutions sont deux matchs
différents.** C'est le bon comportement, et ça coûte au script son contrôle de déterminisme, qui
reste couvert là où il doit l'être, dans `ai.test.ts` et `session.test.ts`, à graine fixe.

**Un piège de lecture des événements, rencontré en écrivant le résumé du script.** `sparkCaught` est
émis à **chaque tentative**, réussie ou non, et une capture réussie émet en plus un `scored` à 50
points. Compter les `sparkCaught` comme des captures lit donc deux échecs comme deux Sparks pris.
`scored` est le seul événement qui bouge le tableau, et il porte ses propres points, 10 pour un but
et 50 pour le Spark. Le script réconcilie désormais la somme des `scored` avec les colonnes
`score_a` et `score_b`, ce qui est l'assertion que le mauvais comptage cachait.

**Ce que ça a coûté en outillage.** `scripts/run-ts.mjs` bundle et exécute un script TypeScript qui
importe le moteur, parce que Node 24 enlève les types mais ne résout pas plus `./types.js` que Deno.
`scripts/tsconfig.json` typecheck les scripts à part : la racine ne donne à `engine`, `ai` et
`server` que `lib: ES2022` sans types Node, donc une règle du jeu qui appellerait `fetch` ou
`process.env` ne compilerait pas, et cette garantie vaut mieux qu'un tsconfig économisé.
`npm run typecheck` lance les deux.

### Le client

`client/`, React et Vite, son propre `package.json` et son propre tsconfig. `npm run dev` depuis
`boomball/client`, sur `http://localhost:5173`.

**Il importe le moteur, il ne le recopie pas.** `legalActions` est le générateur unique qui nourrit
l'IA et l'interface, donc la barre d'actions le lit directement depuis `../engine`. C'est ce qui
interdit à un composant React de décider tout seul qu'un tir est possible, et c'est le jour où il le
ferait que les deux réponses divergeraient. Vite le permet par `server.fs.allow`, et son esbuild
applique la même règle `./types.js` vers `.ts` que le bundle des Edge Functions.

**Le client ne résout rien.** Il n'appelle jamais `reduce`, ne tire aucun dé, ne juge d'aucune
légalité. Après chaque action acceptée il **relit `match_state`** au lieu de rejouer les événements
localement. Ça coûte un aller-retour d'environ un dixième de seconde sur un tour qu'un humain a mis
plusieurs secondes à décider ; rejouer localement pour l'économiser mettrait une seconde
implémentation des règles dans le navigateur.

**Realtime est branché mais rien n'en dépend.** Les deux fonctions diffusent sur `match:<id>`, et un
lot dont le `fromSeq` dépasse le nôtre déclenche la même relecture. En solo, le seul mode construit,
tout arrive déjà dans la réponse à sa propre requête, donc une diffusion perdue ne coûte rien. La
reprise après coupure que demande le plan emprunte le même chemin : au réveil, comparer `seq` et
relire s'il a bougé.

**La terre est le layout ASCII, jamais l'image.** La grille SVG dessine les cases solides depuis
`KILL_SILO.rows`. Une colonne qui paraît pleine sur le JPEG et vaut `.` dans le layout est
franchissable. C'est aussi ce qui permettra de refaire le relevé de l'arène sans toucher une ligne
du client.

**Une zone à la fois, quinze cases de côté**, avec les zones voisines en bandeaux au-dessus et
en dessous qui montrent qui s'y trouve. Le silo fait quinze de large sur quarante-cinq de haut : une
vue du puits entier rendrait chaque Giff illisible.

**Ce que le design donnait et qui n'est pas construit**, faute de données et non faute d'écran. Les
chiffres de carrière du hub (GOALS 9, SAVES 14) : rien ne les compte entre deux matchs, et une
colonne qui affiche toujours zéro vaut moins que pas de colonne. Les sièges 2 et 3 du lobby :
`create-match` en accepte trois et `server/lobby.ts` refuse le quatrième, mais **rejoindre l'équipe
de quelqu'un d'autre n'existe pas encore**, et c'est ça qui manque, pas la porte. Les temps forts de
l'écran de résultats, tous dérivables de `match_events` le jour où il y aura un match à revoir.

**L'authentification se fait par email et mot de passe.** Arbitré par Jérôme le 2026-09-02. Pas
d'OAuth, pas de magic link : c'est le mode que Supabase Auth donne sans rien configurer hors du
projet, et le groupe est un cercle d'amis, pas un public.

**La confirmation d'email est désactivée**, arbitré par Jérôme le 2026-09-02. Le SMTP intégré de
Supabase plafonne à deux messages par heure, ce qui rendait la création d'un compte de test
pénible et l'arrivée d'un ami pire. Le jeu n'envoie aucun message, ne réinitialise aucun mot de
passe et ne stocke rien de sensible, donc vérifier l'adresse n'achetait presque rien.
`mailer_autoconfirm` est à `true` et `site_url` pointe sur le port de Vite. **À rouvrir en même
temps qu'un vrai SMTP** si le jeu sort du cercle.

**Le parcours exact du navigateur est vérifié**, avec la seule clé anon et zéro appel d'administration :
inscription, écriture du profil, création d'équipe en `insert().select()`, lecture de `role_stats`,
ouverture d'un match par `create-match`, lecture du plateau à travers la RLS, un tour envoyé à
`resolve-action`, et le refus d'un but écrit à la main. 16 assertions, toutes vertes.

## Ce que le test en local a trouvé

Premier test de Jérôme dans un navigateur, le 2026-09-02. Un défaut bloquant et quatre reproches de
texte. Tout est corrigé, et les fonctions sont redéployées.

### Le bouton du lobby ne partait jamais, et c'était le CORS

**Symptôme :** « Start match » affichait « Loading the silo » et n'en sortait plus. Rien à l'écran,
pas de message, pas d'erreur. La partie ne commençait jamais.

**Cause :** ni `create-match` ni `resolve-action` ne répondaient au préflight CORS. Un navigateur
qui veut envoyer un `POST` avec un en-tête `Authorization` envoie d'abord un `OPTIONS`, et la
passerelle Supabase le laisse passer sans jeton même avec `verify_jwt` actif, donc il arrivait bien
jusqu'à la fonction. Les deux répondaient `405 POST only`, sans le moindre en-tête
`Access-Control-Allow-Origin`. Le navigateur refusait alors d'envoyer la vraie requête et rejetait
le `fetch` avec un `TypeError` nu.

**Pourquoi personne ne l'avait vu, et c'est la leçon.** `scripts/live-match.ts` joue des matchs
entiers à travers ces deux fonctions, en HTTP, contre le vrai projet. Il était vert. **Node ne fait
pas de préflight, seul un navigateur en fait un.** Aucune quantité de tests réseau depuis Node ne
pouvait attraper ce défaut, et 254 tests unitaires encore moins. D'où
`supabase/checks/browser-path.py`, qui rejoue le parcours du lobby en portant un `Origin` et en
vérifiant les en-têtes CORS de chaque réponse, en plus des lectures RLS que le bouton attend.

**Deux correctifs, parce qu'il y avait deux défauts superposés.**

- `supabase/functions/_shared/cors.ts` porte les en-têtes et la réponse au préflight, et les deux
  fonctions le traversent : le préflight passe avant le contrôle de méthode, et `reply()` est le
  seul endroit qui fabrique une `Response`, donc tout ce qui sort porte les en-têtes.
  **L'origine est `*` et c'est délibéré** : l'identité est le JWT de l'en-tête `Authorization`,
  aucune requête n'est envoyée avec `credentials: 'include'`, aucun cookie n'est lu. Une page d'une
  autre origine ne peut pas obtenir le jeton d'un joueur, qui vit dans le stockage local de
  l'origine de l'application ; tout ce qu'un joker donne à un attaquant, c'est le 401 que ces
  fonctions rendent à quiconque n'est pas signé. Ce qu'il nous donne, c'est de ne pas redéployer
  deux fonctions à chaque déménagement du front, URL de préversion Vercel comprises
- **Un écran ne doit jamais pouvoir rester pendu**, et c'est le vrai défaut derrière le premier. Le
  `fetch` rejeté n'était attrapé nulle part : `callFunction` le laissait remonter, `Lobby.start()`
  n'avait pas de `try`, donc `busy` restait vrai pour toujours. Un CORS manquant, un réseau coupé,
  une fonction non déployée et un projet déménagé échouent tous de la même façon, et aucun ne doit
  pouvoir bloquer un écran. `callFunction` rend désormais un refus affichable au lieu de lever, et
  les quatre boutons qui posent un verrou le relâchent dans un `finally` : `Lobby.start()`,
  `useMatch.send()`, le formulaire de `SignIn` et celui de `FoundTeam`. Les trois derniers n'ont
  jamais bloqué personne, ils avaient la même forme, et en plein match ce défaut coûterait au joueur
  le reste de la partie au lieu du bouton du lobby

**Vérifié**, `python boomball/supabase/checks/browser-path.py` : 16 assertions vertes, préflight,
ouverture du match, relecture par la RLS et un tour envoyé. Les fonctions sont redéployées,
`resolve-action` en version 3 et `create-match` en version 2.

### Les textes des écrans

Quatre reproches de Jérôme sur l'écran d'équipe, tous appliqués.

- « Wins toward veteran » devient « Matches to win to level up to veteran ». Sa formulation était
  la bonne idée, l'anglais en a été redressé
- « Starting seven » devient « Composition of the team »
- « Seven of seven fielded · rookie » est supprimé. Le Tier est déjà en haut à droite de l'écran
- **`BAT`, `AIM` et `AGI` ne nommaient rien qu'un joueur de D&D ait jamais lancé.** Ils deviennent
  `MELEE`, `THROW` et `DEX`

**Le choix des trois noms, parce qu'il se rediscutera.** Jérôme a tranché `MELEE / THROW / DODGE`.
Les deux premiers sont exacts : `might` alimente l'attaque de mêlée, `aim` alimente tous les lancers
du Payload. Le troisième ne l'était pas. `agility` **n'est jamais ajouté à l'action Dodge** : il
porte l'initiative, les sauvegardes de Dextérité, les Acrobaties, l'interception d'une passe et la
résistance à une bousculade. C'est une caractéristique entière et pas un mouvement, donc `DEX`.
Le même trio est appliqué au `SeatPanel` du match, qui affichait `Bat / Aim / Agility` : deux écrans
qui nomment différemment la même colonne seraient pires que le vocabulaire de départ.

## Le second test en local : rendre le match lisible

Dix retours de Jérôme après avoir joué pour de vrai. Un seul portait sur une règle, tous les autres
disaient la même chose sous dix formes : **le jeu se déroulait sans rien expliquer de ce qu'il
faisait**. Tout est traité.

### Le rejeu, qui est le vrai sujet

En solo, un clic humain résout treize tours d'IA et revient en un lot de soixante événements.
Appliqués en une image, tout le terrain se téléporte. Le retour exact était : « je suis obligé de
remonter les logs pour voir que mon équipe a marqué un but sans même que je m'en rende compte ».

**Arbitré par Jérôme : tour par tour, environ sept dixièmes de seconde par tour**, ce qui met un
round de treize unités autour de dix secondes. Réglable en trois crans dans la barre du match, lent,
normal, instantané, gardé dans le navigateur, plus un bouton pour passer le reste.

`client/src/match/replay.ts` découpe le lot en **beats**, un beat étant le tour d'une unité ou les
hasards d'un round, et projette un plateau par beat. `Announce.tsx` affiche la carte : qui a agi, ce
qu'il a tenté, et **le jet de dés en clair**, `d20 10+7 = 17 vs 17`. Un but ou une évacuation tient
deux fois plus longtemps. La dernière carte reste à l'écran jusqu'à la prochaine action, pour que le
joueur lise son propre jet au lieu de le voir passer.

**Le client ne résout toujours rien, et c'est vérifié plutôt qu'affirmé.** La projection ne fait que
transcrire ce qu'un événement dit déjà : `moved` porte `from`, `to` et le chemin, `damaged` porte
`hpAfter`, `scored` porte ses points. À la fin du rejeu, le snapshot du serveur est relu et remplace
la projection en entier.

`client/src/match/replay.test.ts` tient cette promesse : il joue de vrais tours à travers
`server/session.ts`, projette les événements émis, et exige que les deux plateaux soient identiques
sur tout ce qu'un joueur peut voir. **Il a trouvé quatre défauts, dont deux dans le moteur.**

- **Une passe interceptée** donne le ballon au voleur. La projection l'ignorait
- **Une passe ratée ou un tir arrêté** laisse le ballon libre, et le lanceur ne l'a plus. La
  projection oubliait la seconde moitié et affichait un porteur qui venait de jeter le ballon
- **Le suivi du ballon porté était une invention de ma part.** Le moteur estampille `payload.x/y`
  quand le ballon change de mains et les laisse vieillir tant qu'il est porté, parce que le plateau
  dessine un ballon porté sur son porteur et ne lit ces coordonnées que pour un ballon au sol.
  Faire suivre le porteur paraissait plus propre et inventait un fait
- **Deux trous dans le journal d'événements du moteur**, décrits juste en dessous

### Deux événements ajoutés au moteur, et pourquoi c'était un vrai défaut

`engine/events.ts` affirme qu'un match se rejoue depuis ses événements. Il ne se rejouait pas.

**`payloadReset`, nouvel événement.** Un but incinère le ballon et en remet un neuf dans les mains
du gardien qui vient d'encaisser, ou devant la Furnace si ce gardien est hors du terrain. `scored`
dit que le score a bougé ; **rien ne disait où était parti le ballon**. Un lecteur qui reconstruisait
le match depuis le journal se retrouvait avec le Payload encore dans les mains du buteur.

**`substituteEntered` porte désormais `at`.** Un remplaçant rentre au point d'entrée de son équipe,
et l'événement ne le disait pas, donc personne ne pouvait le placer.

**Aucun des deux ne touche à une règle ni ne tire un dé**, ce sont deux `log.push`. L'équilibrage
n'est pas concerné, les graines ne bougent pas, les 261 tests passent. Les fonctions sont
redéployées, `resolve-action` en version 5 et `create-match` en version 4.

### Le chrono, qui avait deux bugs

**Il repartait à soixante à chaque action.** Un tour, c'est marcher, agir, remarcher, finir : quatre
requêtes, et chacune recevait un `now + 60s` neuf. Un joueur qui cliquait n'était donc jamais sur un
chrono, pendant que l'affichage repartait de soixante à chaque fois. `deadlineFor` ne fabrique plus
d'échéance que lorsque le tour change de mains ; un tour qui continue garde la sienne. Deux tests
dans `session.test.ts`, plus une assertion contre le vrai projet dans `browser-path.py`.

**À zéro, il ne se passait rien.** L'échéance vit sur le serveur et se règle à la requête suivante,
qui en solo n'arrive jamais : le joueur s'est tu, c'est toute la situation. L'écran de match frappe
donc à la porte lui-même quand le compteur atteint zéro. Le serveur constate l'expiration, dépense
le tour en Dodge, joue la maison, et **répond `accepted` avec `expired: true`** au lieu de refuser :
une action arrivée après le chrono est en retard, pas illégale, et répondre « ce n'est pas ton tour »
pour un tour que le serveur vient lui-même de retirer est un mensonge.

### Le reste, un par un

- **Le tour ne passait pas tout seul.** `onlyEndTurnLeft`, dans `engine/legalActions.ts`, dit quand
  finir le tour est la seule chose qui reste. L'écran l'envoie alors seul, après une seconde qui
  laisse lire la carte du jet. C'est dans le moteur et pas dans React : le jour où une action est
  ajoutée à `LegalActions`, elle doit être comptée là ou l'interface sautera des tours qui avaient
  encore quelque chose dedans
- **Les actions apparaissaient et disparaissaient** selon la position, si bien qu'on n'apprenait
  l'existence de Shove qu'en se trouvant par hasard à côté de quelqu'un. Elles gardent leur place et
  se grisent, avec la phrase qui dit ce qui manque. La règle du générateur unique tient toujours :
  ce qui est *possible* vient toujours de `legalActions` seul, un bouton gris ne se presse pas, et
  seule la phrase est écrite dans le composant
- **La grille couvrait moins de terrain que l'image.** Une zone fait quinze sur quinze, donc carrée,
  et le cadre ne l'était pas : l'image le remplissait en `cover` pendant que le SVG s'y centrait en
  `meet`. La scène est maintenant carrée, les deux couches coïncident
- **Le gros point jaune au milieu**, que personne ne pouvait identifier, est le Payload et donc tout
  le sport. Il pulse, porte un anneau et écrit son nom
- **Rien ne disait que les bandes de zone étaient cliquables.** Ce sont des boutons, ils en ont
  l'air, avec une flèche, le compte des joueurs présents et « click to look » au survol
- **On était propulsé dans le match sans explications.** `Briefing.tsx` dit l'objectif, les trois
  marqueurs, les trois zones et le tour, une fois par joueur, réouvrable par le bouton « Rules »
- **Un but passait inaperçu.** La carte le crie, et le tableau de score se rallume quand il bouge
- **Le texte de l'écran de connexion** est celui que Jérôme a écrit

### Ce qui n'est pas vérifié

Il n'y a pas de navigateur pilotable dans cet environnement, donc **rien de tout ça n'a été regardé à
l'écran**. Ce qui est vérifié l'est par les 261 tests, les deux typechecks, le build du client et
`browser-path.py` contre le vrai projet. La mise en page, le rythme réel du rejeu et la lisibilité
des cartes se jugent en jouant.

## Le troisième test en local : deux trous fonctionnels

Sept retours. Deux d'entre eux n'étaient pas de l'ergonomie mais **des morceaux du jeu qui
n'existaient pas**, tous les deux invisibles depuis le code parce qu'ils consistaient précisément en
l'absence d'un appel.

### Rien n'écrivait jamais les victoires

`teams.wins` existe depuis la migration 0001, le Tier est une colonne générée qui le lit, le hub en
dessine une échelle, et **aucune ligne de code ne l'écrivait**. Toute la progression décrite dans les
décisions produit était donc inerte : une équipe pouvait gagner tous ses matchs et rester Rookie pour
toujours. `Results.tsx` affirmait même en commentaire qu'une victoire écrivait la colonne.

Ça ne se voyait qu'en gagnant, ce que Jérôme a fait.

**Migration `0003_record_win.sql`**, une fonction `record_team_win` appelée par `resolve-action` à la
**transition** vers `finished`, jamais sur un match déjà terminé. C'est une fonction et pas un update
parce que `wins = wins + 1` ne s'exprime pas à travers PostgREST, et un lire-puis-écrire depuis la
fonction serait une course le jour où deux matchs se terminent en même temps.

**Elle n'est pas appelable par un client**, et c'est le sujet des `revoke` en bas du fichier : un
joueur signé qui pourrait l'appeler s'offrirait Star en six requêtes, et le Tier d'une équipe est la
difficulté à laquelle la maison est alignée contre elle. Vérifié dans `browser-path.py` : un joueur
qui tente la RPC reçoit 403 et son compteur reste à zéro.

**Vérifié de bout en bout** par `scripts/live-match.ts`, qui joue un match entier contre la fonction
déployée et lit ensuite le compteur à travers la RLS, comme le hub : match gagné 30-10, `wins` à 1.
Le script se plaint désormais si le compteur et le vainqueur ne s'accordent pas.

### Le canal d'ordres n'était branché nulle part

`ai/orders.ts` le dit dans son propre en-tête : en solo un humain pilote un joueur sur quatorze, donc
le canal d'ordres n'est pas un confort, c'est l'essentiel de ce que fait le joueur, et six des sept
maillots de son camp se conduisent par là. Il est écrit, `chooseAction` le lit, et **rien n'y a
jamais mis un ordre** : aucun bouton dans l'interface, et l'Edge Function passait une liste vide à
chaque requête. Le retour de Jérôme, « je n'ai jamais la balle », est exactement ce que produit un
canal non câblé.

**Migration `0004_match_orders.sql`**, une colonne `orders` sur `matches`. Elle n'est pas dans le
snapshot parce que les ordres ne font pas partie de l'état du jeu : le moteur ignore leur existence,
`reduce` ne les lit jamais, et un match rejoué depuis ses événements est le même avec ou sans eux.
Ils ne biaisent que ce que l'IA choisit d'envoyer à la porte.

**Un ordre ne coûte rien.** `resolve-action` accepte une requête qui ne porte que des ordres : rien
n'est joué, aucun tour n'est dépensé, la liste est écrite et renvoyée. Appeler la balle ne doit pas
coûter le tour pour lequel on l'appelait.

**Les ordres sont validés contre le plateau, jamais crus.** Le destinataire doit être un coéquipier
du camp de l'appelant, et pas l'unité qu'il pilote lui-même. Un ordre invalide est **refusé**, pas
ignoré : un ordre silencieusement jeté ressemble exactement à une IA qui refuse de passer. Vérifié :
ordonner à la maison rend 400.

Côté écran, un bouton « Call for the ball » qui pose un `callForPass` sur les six coéquipiers IA
d'un coup, avec le joueur comme receveur.

### Le match durait dix rounds pendant que Jérôme en jouait quatre

Le chrono lui prenait ses tours, et pour deux raisons superposées, aucune des deux visible depuis un
test.

**Le rejeu mangeait le temps de réflexion.** L'échéance est posée par le serveur à l'instant où il
finit de résoudre, donc les dix à trente secondes de rejeu tombaient dedans.

**Et le client comparait deux horloges différentes.** L'échéance est estampillée par le serveur et
elle était comparée à `Date.now()` du navigateur. Une machine dont l'horloge avance de quelques
minutes lit **tous** ses tours comme déjà expirés et les rend aussitôt.

Trois correctifs. Les fonctions renvoient `serverNow` sur chaque réponse, d'où le client tire son
décalage. Le compte à rebours affiché part du moment où le plateau redevient jouable, pas de
l'estampille serveur. Et **le coup à la porte exige que les deux horloges soient d'accord** : le
délai serveur dépassé une fois corrigé du décalage, *et* un chrono complet réellement écoulé devant
l'écran depuis que la main est revenue. Chacune des deux conditions prise seule lui a coûté un tour
qu'il n'avait pas eu.

Le chrono passe par ailleurs à **120 secondes**, à sa demande. Il ne borne rien dans les règles et
aucun sweep ne le lit. Les deux tests qui codaient soixante secondes en dur sont réécrits sur la
constante.

Enfin, un tour perdu au chrono s'affiche maintenant en bandeau sous le plateau, avec la raison. Il
passait dans une note à côté de l'horloge.

### Le reste

- **Recharger la page ne jette plus dans le match.** Une équipe n'a qu'un match à la fois, donc un
  match inachevé attend forcément, mais le hub le dit et propose d'y retourner au lieu de déposer le
  joueur au milieu d'un round sans explication. Ouvrir un match depuis le lobby y entre directement,
  puisque c'est le clic qu'on vient de faire
- **Le Giff du joueur est ambre avec un chevron**, à part du cyan de son propre camp. Tous les
  maillots alliés étaient de la même couleur, donc se trouver soi-même demandait de lire les noms
- **Le rejeu ralentit encore** : un beat normal passe de 700 ms à 1,5 s, le cran lent à 2,5 s, et le
  plafond du lot de 14 à 30 secondes. C'est ce que paie le chrono à 120 secondes, et le compte à
  rebours ne court de toute façon pas pendant le rejeu

### Outillage ajouté au passage

`scripts/apply-migration.mjs` applique un fichier SQL par l'API Management. Les migrations 0001 et
0002 avaient été appliquées à la main ; 0003 et 0004 en faisaient la deuxième fois, et une étape
faite deux fois à la main est une étape qu'on finira par rater. **Ce n'est pas un migrateur** : pas
de registre, pas d'ordre, il exécute le fichier qu'on lui donne.

`browser-path.py` compte désormais 26 assertions et couvre les ordres, le refus d'un ordre adressé à
la maison, et le fait qu'un joueur ne puisse pas s'attribuer une victoire.

### Ce qui n'est toujours pas vérifié

Toujours pas de navigateur pilotable ici. Ce qui touche à l'écran, la couleur ambre, le bandeau du
chrono, le bouton d'appel, la bannière de reprise et le rythme du rejeu, **n'a pas été regardé**. Ce
qui est vérifié l'est par les 261 tests, les deux typechecks, le build, `browser-path.py` et un match
complet joué par `live-match.ts` contre les fonctions déployées.

## Ce qui attend Jérôme

**La zone 1 est bonne, et ce document a longtemps prétendu le contraire.** Vérifié le 2026-09-02 en
lisant les en-têtes des fichiers : `zone-1-trench.jpeg` fait **2048 x 2048**, exactement comme les
deux autres. Le seul fichier en 1024 de tout le dossier est
`assets/arena/_rejected/zone-2-duplicate-of-zone-1.jpeg`, une image écartée, et c'est cette
confusion qui a produit le reproche.

Les deux autres reproches ne tiennent pas mieux. Sa palette tire plus chaud que celles des zones 2
et 3, mais **c'est la fosse de la Furnace qui brûle en bas de l'image**, donc la fiction de la zone
et pas une dérive d'étalonnage : la Trench est le niveau du sol, elle est censée être la seule
éclairée par le feu. Et la structure est bien symétrique, passerelle pour passerelle aux trois
niveaux ; il ne reste d'asymétrie que dans le placement des échelles, ce qui ne touche à rien
puisque **le terrain jouable est le layout ASCII de `arenas/kill-silo.ts` et jamais le dessin**.

Rien à régénérer, donc. Le prompt reste dans `01-prompts-arene.md` si tu veux quand même une autre
version.

**Le relevé de l'arène.** Le terrain de `arenas/kill-silo.ts` respecte ce que montrent les images au
niveau des hauteurs de passerelles et des colonnes, mais ce n'est pas encore un tracé case par case
sur les dessins. À faire avant le playtest, pas avant.

**Le design est complet, les deux prompts sont livrés.** Les écrans de coque du prompt 2 sont dans
le même `design/Boomball Interface.html`, sous la section « Out-of-match screens », ancres `#2a` à
`#2e` : Sign in, Team hub, Lobby, Results, Seat panel states. `design/README.md` a longtemps
prétendu le contraire, il ne documentait que la vérification du prompt 1.

**Rien, côté design.** Les deux prompts sont livrés et vérifiés.

**Le projet Supabase est en ligne, et rien ne t'attend dessus.** Région eu-west-3, ref
`tckaybbmnjyitavypqtq`, schéma et seed appliqués, fonction déployée. Deux choses à savoir tout de
même. Il y a maintenant **deux projets dans l'org**, `boomball` et `projet test`, ce qui est le
plafond du plan gratuit : supprime `projet test` si tu en veux un troisième. Et un **match de
démonstration** est conservé en base avec l'utilisateur jetable qui le porte, ids dans « L'Edge
Function tourne », à effacer quand tu l'auras regardé. À part lui, la base est vide.

**Rejouer une partie, et c'est la prochaine chose.** `npm run dev` depuis `boomball/client`, puis
`http://localhost:5173`. Les deuxième et troisième lots sont largement de l'écran, et **rien de ce
qui touche à l'écran n'a été regardé** : il n'y a pas de navigateur pilotable dans cet
environnement. Le rythme du rejeu, la carte d'annonce, la scène carrée, la barre grisée, le
briefing, le maillot ambre, le bouton d'appel de balle et la bannière de reprise se jugent en
jouant. La mise en ligne ne vient qu'après.

**Une revue de sécurité, à lancer par toi.** `/security-review` sur le dépôt, avant la mise en
ligne. C'est ta commande, je ne peux pas la déclencher. Le client existe maintenant, donc la surface
qu'elle a à regarder existe aussi : un jeton dans un navigateur, une clé anon dans un bundle, et
deux fonctions qui écrivent avec la clé service.

**L'hébergement Vercel, quand tu auras joué.** Le jeton est en place et vérifié, compte
`montigny-8072`. **Rien n'est connecté à GitHub et il ne faut pas le faire** : l'intégration
donnerait à Vercel un accès en lecture sur tout le dépôt, dont `campagne-vault/`, `context/` et le
`CLAUDE.md` racine. Le projet se créera et se déploiera par l'API, en envoyant les fichiers
construits, sans que Vercel voie jamais le dépôt.

**L'équilibrage est clos.** Si tu veux le rouvrir, la section « Le lot 4 » liste les leviers déjà
mesurés et ce qu'ils valent, pour ne pas refaire ces sweeps.
