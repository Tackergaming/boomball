# État des lieux

> Point de reprise du projet Boomball. À lire en premier dans une nouvelle session.
> Dernière mise à jour : 2026-09-02. L'équilibrage est clos, le nombre de buts est à l'objectif
> (3,6 à 4,5 par match, 0 à 2 matchs sans but sur 200, voir « Le lot 4 »). **La phase 4 est
> commencée** : la couche serveur est écrite et testée, le schéma Postgres et le seed sont posés.
> Reste l'Edge Function à déployer et tout le client.

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
| `docs/03-brief-claude-design.md` | Les prompts Claude Design, dont le prompt 2 non encore lancé |
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

**235 tests au vert, environ 8600 lignes.** Plus `npm run sweep` pour le rapport d'équilibrage. `npm test` et `npx tsc --noEmit` depuis `boomball/`.

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
| `supabase/migrations/0001_init.sql` | Le schéma, les enums et la RLS. Pas encore appliqué à un projet |
| `supabase/functions/resolve-action` | L'Edge Function. **Écrite, jamais exécutée**, voir plus bas |

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

### Ce qui est écrit mais n'a jamais tourné

**`supabase/functions/resolve-action/index.ts`.** Elle ne contient aucune décision, elle charge,
appelle `server/session.ts`, écrit et diffuse. Elle n'est ni typée par le `tsc` du projet, ni
déployée, ni exécutée une seule fois.

**Un obstacle connu avant qu'elle puisse tourner.** Le moteur importe ses modules en `./types.js`
alors que les fichiers sur le disque sont en `.ts`, ce qui est la convention TypeScript de tout le
dépôt et que **Deno ne résout pas**. Il faut donc bundler `engine`, `ai` et `server` en un seul
fichier ESM avec esbuild et l'importer depuis la fonction. C'est une étape de build à ajouter, pas
une réécriture.

**Et il faut un projet Supabase.** Rien n'est appliqué nulle part : ni la migration, ni le seed, ni
la fonction. Il me faut un projet et ses identifiants pour aller plus loin de ce côté.

### Ce qui reste de la phase 4

Le client React et Vite en entier. La grille SVG posée sur l'art de la zone active, la piste
d'initiative, la barre d'actions pilotée par `legalActions`, le panneau d'ordres alliés, et
l'abonnement Realtime avec reprise depuis le dernier `seq` connu.

## Ce qui attend Jérôme

**La zone 1 n'a pas été régénérée.** Elle est en 1024 quand les deux autres sont en 2048, elle est
légèrement asymétrique, et sa palette tire plus rouge. Il a validé en l'état, mais le prompt de
régénération est prêt dans `01-prompts-arene.md` s'il change d'avis.

**Le relevé de l'arène.** Le terrain de `arenas/kill-silo.ts` respecte ce que montrent les images au
niveau des hauteurs de passerelles et des colonnes, mais ce n'est pas encore un tracé case par case
sur les dessins. À faire avant le playtest, pas avant.

**Le prompt 2 de Claude Design** n'a pas été lancé : connexion, hub d'équipe, lobby, résultats.

**Le prompt 2 de Claude Design, que je ne peux pas lancer à ta place.** Il est écrit dans
`03-brief-claude-design.md` et couvre connexion, hub d'équipe, lobby et résultats.

**Un projet Supabase.** La migration, le seed et l'Edge Function sont écrits et n'ont été appliqués
nulle part. Sans projet ni identifiants, la phase 4 s'arrête au code.

**L'équilibrage est clos.** Si tu veux le rouvrir, la section « Le lot 4 » liste les leviers déjà
mesurés et ce qu'ils valent, pour ne pas refaire ces sweeps.
