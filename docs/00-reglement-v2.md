# Boomball v2, règlement codable

> Phase 0 du MVP. Ce document est le verrou : rien ne se code avant que tu l'aies validé.
> Source : `campagne-vault/08-Rules-Homebrew/Boomball.md`, qui reste la version de table et ne
> change pas.

Le document se lit en deux temps. La **partie A** liste tout ce qui s'écarte de ta fiche, avec la
raison, pour que tu puisses valider ou refuser point par point sans lire le reste. La **partie B**
est le règlement complet tel que le moteur va l'implémenter, y compris tout ce que ta fiche ne
disait pas.

---

# Partie A : tableau des écarts

## A1. Corrections de contradictions

| # | Règle de table | Règle v2 | Raison |
|---|---|---|---|
| 1 | Un Shove fait tomber de 15 pieds. Un défaut d'ancrage fait tomber de 50 pieds avant que le grappin ne rattrape | Deux événements distincts. **Shove** : chute contrôlée de 3 cases, sans dégâts sauf impact. **Défaut d'ancrage** : chute libre jusqu'à impact, ou grappin à 10 cases | Les deux nombres ne se contredisent pas, ils décrivent deux choses. Les séparer supprime la contradiction sans rien perdre |
| 2 | Un tir bloqué par le Bulwark se résout contre son AC | Le blocage devient une **Réaction, une fois par round**, utilisable si le Bulwark est à 2 cases ou moins de sa Furnace. Réaction dépensée, les tirs suivants du round visent l'AC de la Furnace | AC 25 en Tier 3 contre +4 au meilleur Striker demande un 21 sur un d20. Tes chiffres sont conservés, mais le contre devient le jeu d'équipe. Les valeurs numériques ont été refaites, voir les écarts 21 à 23 |
| 3 | Le Spark bouge de 60 pieds, d6 pour la zone et d8 pour la direction | Le d6 disparaît. Seul le d8 subsiste, dans le plan vertical, et il n'est tiré qu'une fois, à l'entrée | En vue de profil, monter d'une zone est déjà l'un des huit résultats du d8. Le jet de zone était une rustine de la version à trois cartes. Le cap ensuite persiste, voir l'écart 19 |
| 4 | Un Cracker redirigé ne détonne que sur son propre tour | Un Cracker redirigé explose immédiatement sur la première unité de sa trajectoire | En l'état, envoyer un Cracker dans la figure d'un adversaire ne fait rien pendant un round entier, ce qui vide le Breaker de sa raison d'être |
| 5 | La grille fait 15x15 cases, vue de dessus, trois cartes côte à côte | 15x15 cases par zone, **vue de profil**, trois zones empilées | Tes trois brouillons de carte sont des coupes verticales. C'est ce qui rend cohérente la règle du bord haut, la chute et l'ancrage |

## A2. Écarts de game design

| # | Règle de table | Règle v2 | Raison |
|---|---|---|---|
| 6 | Le Spark est en jeu dès le round 1 | Il entre au **round 6**, sur une case aléatoire de la Zone 2, à 4 cases ou plus de toute unité | À 150 points contre 10 il décidait seul du match, et une position d'entrée fixe se camperait. Le prix a depuis été ramené à 30, voir l'écart 20, mais l'entrée tardive reste : elle laisse cinq rounds de Payload avant que le Spark n'existe |
| 7 | Un joueur à 0 HP est éliminé du match | Un **humain** reprend son remplaçant après 2 rounds, même rôle, même Tier, HP pleins | À la table, un joueur éliminé reste à la table. Devant un écran, il regarde huit rounds sans rien faire |
| 8 | Le MJ groupe les PNJ ennemis en deux blocs d'initiative | Les coéquipiers IA ont aussi leur bloc, placé **juste après le dernier humain** | Ta fiche ne prévoit pas de coéquipiers IA, ils n'existaient pas à la table. Les faire jouer après les humains garantit qu'un ordre donné pendant ton tour est exécuté dans le même round |
| 9 | Rien sur la profondeur de banc | **3 remplaçants par équipe**, au Tier de l'équipe | Ta fiche dit « si l'équipe a gardé des remplaçants de ce calibre » sans jamais donner le nombre. Un banc fini garde une tension d'attrition |
| 19 | Le Spark parcourt 12 cases, direction retirée au `d8` chaque round | **6 cases**, et il garde son cap d'un round sur l'autre. Nouveau cap seulement quand un mur le renvoie, par réflexion | Il allait 12 cases quand un joueur en fait 8, donc il ne se poursuivait pas, et son cap changeait chaque round, donc il ne s'anticipait pas. Sur 600 matchs il ne provoquait que 0,4 tentative par match. Ce n'était pas un objectif, c'était un billet de loterie |
| 20 | Capture du Spark : 150 points et fin immédiate | **50 points, et le match continue.** Le Spark est retiré du terrain pour de bon | Devenu réellement attrapable, un objet à 150 points et fin immédiate serait la seule chose à jouer. Le prix se ramasse une fois et il reste des rounds pour jouer le Payload |
| 21 | Blocage du Bulwark : +4 / +6 / +8 sur l'AC de la Furnace | **+2 / +3 / +4** | 96 à 98 % des tirs d'un match étaient bloqués. Le contre prévu, un second tireur dans le même round, ne se produisait jamais faute de volume de tir, donc la Réaction se comportait comme un bonus permanent et tenait le taux de réussite à 30 % |
| 22 | Furnace AC 18 | **AC 15** | Écrite contre un blocage qu'on croyait occasionnel. Avec le blocage ramené à sa vraie fréquence, 15 place le tir propre d'un Striker Rookie à une chance sur deux |
| 23 | Portée propre du lancer : 30 pieds | **45 pieds**, la portée longue reste à 60 | Les deux Furnaces sont à 14 cases l'une de l'autre sur la même passerelle. À 30 pieds, le porteur mesurait en moyenne 10 cases de la Furnace visée et ne tirait proprement que sur un cinquième de ses tours |

## A3. Trous comblés, la fiche ne disait rien

| # | Sujet | Règle v2 |
|---|---|---|
| 10 | Hauteur d'une zone | 15 cases, soit 75 pieds. Silo total 225 pieds |
| 11 | Carte d'ancrage | Une case est ancrable si elle touche une case de structure, y compris en diagonale |
| 12 | Coût du déplacement diagonal | 5 pieds par case, règle 5e 2024. Distance de Chebyshev partout |
| 13 | Égalité au round 10 | Deux rounds de mort subite, premier score gagne, sinon match nul |
| 14 | Payload remis en jeu si le Bulwark est évacué | Il apparaît sur la case devant la Furnace, libre pour tout le monde |
| 15 | Point d'entrée d'un remplaçant | La plateforme devant la Furnace de son équipe, en Zone 3 |
| 16 | Ligne de vue et couvert | Aucun blocage au MVP. Le silo est à ciel ouvert, les poutrelles sont fines |
| 17 | Liste des actions disponibles | Voir B5. La fiche cite des actions au fil du texte sans jamais les lister |
| 18 | Égalités dans les ciblages automatiques | Compte d'initiative le plus bas, puis identifiant d'unité. Nécessaire pour que le match soit rejouable à l'identique |

---

# Partie B : règlement complet

## B1. Terrain et coordonnées

- Case de 5 pieds. Grille de **15 cases de large sur 45 de haut**, soit 75 par 225 pieds.
- `x` de 0 à 14, de gauche à droite. `y` de 0 à 44, **0 étant le sol**. L'axe `y` monte.
- `zone = floor(y / 15)`. Zone 1 The Trench de `y` 0 à 14, Zone 2 The Scramble de 15 à 29, Zone 3
  The Summit de 30 à 44.
- Toutes les distances se mesurent en **Chebyshev**, `max(|dx|, |dy|)`, ce qui donne le coût
  diagonal à 5 pieds de la règle 5e 2024.

**Deux types de case seulement.** Une case est `open` ou `structure`. Les cases de structure sont
les poutrelles, passerelles grillagées, chaînes, échelles et murs de tes images. Elles ne sont pas
occupables, elles arrêtent une chute, et elles rendent ancrables les cases ouvertes qui les
touchent. Une unité est donc toujours en l'air, accrochée à une structure voisine, ce qui est
exactement la fiction du grappin.

**Furnaces.** Furnace 1 contre le mur gauche de la Zone 3, Furnace 2 contre le mur droit. L'équipe
A défend la 1 et marque dans la 2. Emplacement exact à figer quand la grille sera tracée sur les
images, en visant la hauteur où elles sont dessinées.

**Franchissement de zone.** Passer de `y=14` à `y=15`, ou de `y=29` à `y=30`, coûte **10 pieds en
plus** du coût de la case. *(Arbitrage du 2026-09-01, ramené de 15 à 10 : à 15, un pas de
franchissement mangeait 20 pieds sur 40, donc un porteur franchissait et s'arrêtait.)* Justifié en fiction par une grille de ventilation entre les étages.
C'est ce qui empêche la Zone 3 d'être à trois cases de tout le monde.

## B2. Placement de départ

- Payload et les deux Crackers au centre de la Zone 2, case `(7, 22)`.
- Le Spark n'est pas sur le terrain.
- Les deux Bulwarks en Zone 3, adjacents à leur Furnace.
- Le reste de l'équipe A en Zone 2 côté gauche, `x` de 1 à 3. L'équipe B côté droit, `x` de 11 à 13.

## B3. Unités

Sept par équipe : 3 Strikers, 2 Breakers, 1 Bulwark, 1 Trajector. Vitesse de vol 40 pieds pour
tous, soit 8 cases, la vitesse de marche ne s'y ajoute jamais.

Les statistiques par rôle et par Tier vivent dans une table de données que tu peux corriger sans
toucher au code.

**La colonne Jet est nouvelle, arbitrée le 2026-09-01.** Elle était fondue dans la colonne de mêlée,
ce qui produisait un défaut invisible : au Star, le Breaker lançait à +8 et le Striker à +4, donc le
rôle qui marque était le plus mauvais tireur des deux. La colonne Jet sert à **tout jet du Payload**,
la passe et le tir. La mêlée et l'Athlétisme gardent leur colonne, donc la Bousculade du Breaker ne
bouge pas.

| Rôle | Tier | HP | AC | Mêlée / Athlétisme | **Jet** | Acrobaties / save DEX |
|---|---|---|---|---|---|---|
| Striker | Rookie | 30 | 13 | +2 | **+7** | +4 |
| Striker | Veteran | 40 | 14 | +3 | **+9** | +6 |
| Striker | Star | 50 | 15 | +4 | **+11** | +8 |
| Breaker | Rookie | 50 | 12 | +4 | **+3** | +1 |
| Breaker | Veteran | 65 | 13 | +6 | **+4** | +2 |
| Breaker | Star | 85 | 14 | +8 | **+5** | +3 |
| Bulwark | Rookie | 40 | 19 | +3 | **+2** | +2 |
| Bulwark | Veteran | 55 | 21 | +4 | **+3** | +3 |
| Bulwark | Star | 70 | 25 | +5 | **+4** | +4 |
| Trajector | Rookie | 25 | 14 | +0 | **+7** | +5 |
| Trajector | Veteran | 35 | 15 | +1 | **+9** | +7 |
| Trajector | Star | 45 | 16 | +2 | **+11** | +10 |

**Trêve du sang.** Aucun sort, aucune arme extérieure, jamais. Conséquence technique appréciable :
il n'y a pas de fiche de personnage D&D à implémenter, seulement ces douze lignes.

## B4. Round et initiative

Un round descend du compte 20 au compte 1.

| Compte | Qui agit |
|---|---|
| 20 | Les Crackers se déplacent |
| 15 | Strikers et Trajector adverses, en bloc |
| variable | Les humains, initiative individuelle `d20 + bonus Acrobaties` |
| juste après le dernier humain | Les coéquipiers IA, en bloc |
| 10 | Le Spark se déplace, puis Breakers et Bulwark adverses en bloc |

Égalité d'initiative entre humains : bonus d'Acrobaties le plus haut, puis identifiant d'unité.

**Chrono de 60 secondes par tour humain.** À expiration, l'unité passe automatiquement en Dodge
plutôt que de perdre son tour, ce qui évite de punir une coupure réseau.

Le match dure **10 rounds**. Rien ne l'interrompt : la capture du Spark ne siffle plus la fin.

## B5. Actions

Par tour : un déplacement jusqu'à 8 cases, fractionnable, une Action, une interaction d'objet
gratuite, et une Réaction disponible jusqu'au tour suivant.

**Actions** : Attaque de mêlée à la batte, Passe ou Tir du Payload, Frapper un Cracker, Bousculer,
Attraper le Spark, Esquiver, Foncer, Se désengager.

**Réactions** : Attaque d'opportunité, Interception d'une passe, Blocage du Bulwark.

**Interaction gratuite** : ramasser le Payload en entrant sur sa case.

**Attaque de mêlée** : `1d8 + bonus` contondant. Le recul explosif pousse l'attaquant de 2 cases
dans la direction opposée. C'est du mouvement forcé, donc pas d'attaque d'opportunité, et ça peut
le décrocher de son ancrage.

**Impossible de frapper en tenant le Payload.**

## B6. Ancrage et chute

Une unité doit **finir son tour sur une case ancrable**, c'est à dire touchant une structure. Sinon
elle chute au début de son tour suivant.

**Chute libre.** L'unité descend case par case. Si elle entre dans une case de structure ou atteint
le sol, il y a impact : elle s'arrête et subit `1d6 par tranche de 10 pieds parcourus`. Si elle a
descendu 10 cases sans rien toucher, le grappin auto-déployant la rattrape, elle s'arrête là sans
dégâts, et elle est considérée ancrée.

**Chute de bousculade.** 3 cases vers le bas, le Payload est lâché, pas de dégâts sauf impact
rencontré en chemin. L'unité est ancrée à l'arrivée.

## B7. Le Payload

- **Ramasser** : gratuit en entrant sur sa case.
- **Passer** : attaque à distance contre AC 12. Portée 9 cases, jusqu'à 12 avec désavantage,
  jamais au delà. Touché, le coéquipier attrape. Manqué, le Payload dévie de `1d4` cases dans une
  direction tirée au `d8`.
- **Tirer au but** : contre **AC 15**, à tous les Tiers. Portée propre **9 cases, soit 45 pieds**,
  jusqu'à 12 avec désavantage. Si le Bulwark adverse dépense sa Réaction de blocage, ce blocage
  **ajoute** à l'AC de la Furnace au lieu de la remplacer : **+2 en Rookie, +3 en Veteran, +4 en
  Star**.

  *(Arbitrage du 2026-09-01, second passage. L'arbitrage 2 survit dans sa forme, le blocage reste une
  Réaction une fois par round et le contre reste le second tireur. Mais ses nombres reposaient sur
  une hypothèse fausse. Mesuré sur 600 matchs, **96 à 98 % des tirs du match étaient bloqués** : les
  deux équipes réunies produisaient moins de trois tirs par match, donc un second tir dans le même
  round n'arrivait jamais, et une Réaction jamais tirée deux fois est un +4 à +8 permanent. Le
  blocage est divisé par deux et la Furnace descend de 18 à 15. La portée propre passe de 30 à 45
  pieds parce que les deux Furnaces sont distantes de 14 cases sur la même passerelle : à 30 pieds,
  le porteur passait presque tous ses tours à tirer en désavantage.)*

  **Le principe qui fixe ces nombres** : ce qui est fixe dans le décor devient plus facile avec le
  palier, ce qui est incarné par un adversaire de ton palier reste à parité. La Furnace ne monte pas,
  le gardien monte. Résultat : tir libre à 55 / 70 / 80 %, tir bloqué à 45 / 55 / 60 %, et le match
  produit 3,6 à 4,5 buts pour moins de 1 % de matchs sans but.
- **Marquer** : 10 points. Le Payload est incinéré, un neuf apparaît immédiatement dans les mains
  du Bulwark qui défend, ou sur la case devant la Furnace si ce Bulwark est hors jeu.
- **Voler** : par Bousculade, ou en Réaction par un jet d'Acrobaties opposé si une passe traverse
  une case adjacente.

**Bousculade** : Athlétisme contre Athlétisme ou Acrobaties. Réussie contre quelqu'un qui **ne porte
pas** le Payload, la cible subit la chute de bousculade. Réussie contre **un porteur**, elle lui prend
le ballon, qui tombe sur sa case, et **elle s'arrête là : pas de chute**. *(Arbitrage du 2026-09-01.
Prendre le ballon et faire tomber de 3 cases dans la même action faisait deux choses à la fois,
gagner le ballon, ce qui est une bonne défense, et annuler la montée vers la Zone 3, ce qui rendait
le trajet jusqu'à une Furnace impossible. En fiction, on attrape le ballon, on ne jette pas l'homme
dans le vide.)*

## B8. Les Crackers

Deux Crackers, hasard neutre pour les deux équipes.

- Sur le **compte 20**, chacun se déplace de 6 cases au maximum en ligne droite vers l'unité la
  plus proche, toutes équipes et toutes zones confondues. Ils ignorent le terrain.
- Il explose sur la **première unité dont il traverse la case**, pas seulement à l'arrivée.
- **Explosion** : save Dextérité DC 15, `3d6` contondant et feu, moitié si réussi, sur la seule
  unité touchée.
- Le Cracker est ensuite détruit et réapparaît au début du round suivant, au centre de la Zone 2.
- **Frapper un Cracker** : attaque de mêlée contre AC 10. Touché, il part jusqu'à 12 cases en ligne
  droite dans la direction choisie, et explose sur la première unité rencontrée. Sans rencontre, il
  s'arrête au mur.

## B9. Le Spark

- **Entre au début du round 6**, sur une case aléatoire de la Zone 2 située à 4 cases ou plus de
  toute unité. Si aucune case ne satisfait la contrainte, on retient celle qui maximise la distance
  à l'unité la plus proche, pour que la règle ne bloque jamais.
- Son cap est tiré au `d8` **une seule fois, à l'entrée**.
- Sur le **compte 10**, il parcourt **6 cases** sur ce cap. Il rebondit par réflexion sur les murs,
  le sol et le plafond, poursuit son mouvement sur le nouveau cap, et **conserve ce cap pour les
  rounds suivants**. Il ignore le terrain. Aucun autre dé n'est jeté : entre deux murs, le Spark est
  une bille sur un tapis, et le couper est une décision qui se lit sur le plateau.
- **Attraper** : Action, sur la même case, `DC 20` Dextérité, Escamotage ou Acrobaties. **50 points.
  Le match ne s'arrête pas.** Réussi, le Spark quitte le terrain définitivement et ne réapparaît
  pas. Manqué, l'Action est dépensée et le Spark reste en jeu.

## B10. Élimination

À 0 HP, l'unité tombe au sol de la Zone 1 et est évacuée.

- **Humain** : reprend la main sur son remplaçant après 2 rounds, même rôle, même Tier, HP pleins,
  entrée sur la plateforme devant la Furnace de son équipe en Zone 3.
- **IA** : même délai, même point d'entrée, tant que le banc n'est pas vide.
- **Banc** : 3 remplaçants par équipe. Épuisé, l'équipe joue en sous nombre.

## B11. Fin de match

- Fin au terme du round 10, le plus haut score gagne. La capture du Spark ne met pas fin au match,
  elle met 50 points au tableau.
- Égalité : deux rounds de mort subite, le premier score gagne. En mort subite, la capture du Spark
  met fin au match comme n'importe quel score, par la règle de la mort subite et non par celle du
  Spark. Toujours à égalité, match nul.

---

# Ce qui reste à produire pour clore la phase 0

L'**arène gridée**, seul livrable manquant avant le code :

1. Les trois PNG recadrés en carré 15x15 depuis leur 16:9 actuel.
2. Une symétrie gauche droite vérifiée, pour qu'aucune des deux équipes n'ait un meilleur terrain.
3. `arena.json` : la carte des cases `structure`, l'emplacement des deux Furnaces, et les cases de
   départ des deux équipes.

L'ancrage étant dérivé de la structure, ce fichier est la seule donnée de terrain dont le moteur a
besoin.
