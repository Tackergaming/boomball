# État des lieux

> Point de reprise du projet Boomball. À lire en premier dans une nouvelle session.
> Dernière mise à jour : 2026-09-01, lots d'équilibrage 1 et 2 appliqués. **Lot 3, le Spark, reste à faire.**

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

**210 tests au vert, environ 7800 lignes.** Plus `npm run sweep` pour le rapport d'équilibrage. `npm test` et `npx tsc --noEmit` depuis `boomball/`.

| Module | État |
|---|---|
| `geometry`, `constants` | Coordonnées, Chebyshev, péage de zone, rebonds, trajectoires |
| `arena`, `arenas/kill-silo` | Terrain ASCII, ancrage dérivé. **Terrain provisoire, pas encore un relevé au pixel** |
| `rng`, `stats`, `names` | Dés à graine, table rôle x Tier, pool de noms Giff |
| `types`, `setup`, `initiative` | État de match, coup d'envoi, échelle d'initiative plate |
| `rules/movement`, `rules/falling` | Chemins, cases atteignables, `pathTo`, les deux modes de chute |
| `rules/combat`, `rules/payload` | Jets contestés, jet opposé, recul, portées, blocage du gardien, dispersion |
| `rules/reactions` | Qui a le droit de réagir. Attaque d'opportunité, garde-fou d'ancrage, couloir de passe |
| `rules/ordnance` | Où vont les deux hasards. Ciblage des Crackers, trajectoire d'un Cracker frappé, case d'entrée du Spark, dart à réflexion |
| `reduce` | La porte unique. Mouvement, Dash, Dodge, Disengage, attaque, bousculade, ramassage, passe, tir, Crackers, Spark, Réactions, fin de tour, rounds, mort subite, élimination, remplaçants |
| `legalActions` | Le générateur unique qui nourrit l'interface et l'IA |
| `ai/roles/*` | Les quatre tables de priorités, en données pures |
| `ai/evaluate` | La valeur d'une case, les cotes d'un jet, la pression des Crackers |
| `ai/chooseAction` | Le choix. Énumère les candidats de `legalActions`, les note, rend le meilleur |
| `ai/orders` | Le canal d'ordres alliés : demander la passe, marquer une cible, tenir une zone |
| `ai/selfPlay` | Le match sans écran, et le harnais d'équilibrage |

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
| + correctif d'IA, le porteur se débarrasse du ballon | **0,70** | **0,79** | **0,81** |

**État actuel, 200 matchs par Tier :**

| Tier | A | B | Nuls | Buts/match | Sans but | Spark capturé | Évacués/match |
|---|---|---|---|---|---|---|---|
| Rookie | 55 | 36 | 109 | 0,70 | 111 / 200 | 17 | 2,00 |
| Veteran | 61 | 48 | 91 | 0,79 | 102 / 200 | 26 | 1,53 |
| Star | 57 | 64 | 79 | 0,81 | 90 / 200 | 24 | 1,28 |

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

**Reste ouvert.** L'objectif visé était 3 à 5 buts par match et moins de 15 % de matchs sans but. On
est à 0,8 but et 45 à 55 % de matchs sans but. C'est trois fois mieux qu'au départ et la courbe par
Tier est enfin dans le bon sens, mais ce n'est pas encore le but visé. À reprendre après le lot 3.

## Le lot 3, validé et pas encore fait

Jérôme a validé les trois lots le 2026-09-01. Le troisième n'est pas implémenté.

**Constat mesuré sur 600 matchs.** Le Spark se fait attraper deux à trois rounds après son entrée,
médiane autour du round 8 ou 9, étalé sur toute la fenêtre : personne ne campe sur sa case
d'apparition, l'arbitrage 6 fonctionne. Mais il n'y a que **0,34 à 0,43 tentative par match** sur
sept rounds de présence avec quatorze joueurs. Le DC 20 n'y est pour rien, une tentative réussit une
fois sur trois au Rookie et une sur deux au Star. Le goulot est uniquement de se trouver sur sa case.

**C'est structurel.** Il va 12 cases par round quand un joueur en fait 8, donc il ne se poursuit pas.
Sa direction est un d8 tiré à neuf, donc il ne s'anticipe pas. Il file en ligne droite avec rebond,
donc il finit loin. **Ce n'est pas un objectif, c'est un billet de loterie**, et il décide 8 à 13 %
des matchs sans récompenser aucune décision.

**Les trois changements validés :**

1. **6 cases par round au lieu de 12** (`SPARK_MOVE_CELLS`), pour qu'un joueur à 8 cases puisse se
   rabattre dessus
2. **Direction persistante d'un round sur l'autre**, nouveau d8 seulement quand il rebondit. Ça
   demande de stocker le cap dans `Spark` et de faire remonter à `reflectedPath` la direction de
   sortie
3. **Valeur revue à la baisse et fin immédiate supprimée.** Un objet devenu attrapable à 150 points
   et fin immédiate déciderait tout. Ordre de grandeur visé 30 à 50 points, **le chiffre exact se
   fixe au sweep**, pas à la table

Conséquence à ne pas oublier : le poids `catchSpark` des quatre tables d'IA vaut 400, calibré sur
150 points plus une victoire immédiate. Il devra suivre la nouvelle valeur.

## Ce qui attend Jérôme

**La zone 1 n'a pas été régénérée.** Elle est en 1024 quand les deux autres sont en 2048, elle est
légèrement asymétrique, et sa palette tire plus rouge. Il a validé en l'état, mais le prompt de
régénération est prêt dans `01-prompts-arene.md` s'il change d'avis.

**Le relevé de l'arène.** Le terrain de `arenas/kill-silo.ts` respecte ce que montrent les images au
niveau des hauteurs de passerelles et des colonnes, mais ce n'est pas encore un tracé case par case
sur les dessins. À faire avant le playtest, pas avant.

**Le prompt 2 de Claude Design** n'a pas été lancé : connexion, hub d'équipe, lobby, résultats.

**Rien n'est commité.** `boomball/` est entièrement en untracked.
