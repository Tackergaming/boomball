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
| 6 | Le Spark est en jeu dès le round 1 | Il entre au **round 6**, sur une case aléatoire de la Zone 2, à 4 cases ou plus de toute unité | À 150 points contre 10 il décidait seul du match, et une position d'entrée fixe se camperait. Le prix a depuis été ramené à 20, voir l'écart 20, mais l'entrée tardive reste : elle laisse cinq rounds de Payload avant que le Spark n'existe |
| 7 | Un joueur à 0 HP est éliminé du match | Un **humain** reprend son remplaçant après 2 rounds, même rôle, même Tier, HP pleins | À la table, un joueur éliminé reste à la table. Devant un écran, il regarde huit rounds sans rien faire |
| 8 | Le MJ groupe les PNJ ennemis en deux blocs d'initiative | Les coéquipiers IA ont aussi leur bloc, placé **juste après le dernier humain** | Ta fiche ne prévoit pas de coéquipiers IA, ils n'existaient pas à la table. Les faire jouer après les humains garantit qu'un ordre donné pendant ton tour est exécuté dans le même round |
| 9 | Rien sur la profondeur de banc | **3 remplaçants par équipe**, au Tier de l'équipe | Ta fiche dit « si l'équipe a gardé des remplaçants de ce calibre » sans jamais donner le nombre. Un banc fini garde une tension d'attrition |
| 19 | Le Spark parcourt 12 cases, direction retirée au `d8` chaque round | **6 cases**, et il garde son cap d'un round sur l'autre. Nouveau cap seulement quand un mur le renvoie, par réflexion | Il allait 12 cases quand un joueur en fait 8, donc il ne se poursuivait pas, et son cap changeait chaque round, donc il ne s'anticipait pas. Sur 600 matchs il ne provoquait que 0,4 tentative par match. Ce n'était pas un objectif, c'était un billet de loterie |
| 20 | Capture du Spark : 150 points et fin immédiate | **20 points, et le match continue.** Le Spark est retiré du terrain pour de bon | Devenu réellement attrapable, un objet à 150 points et fin immédiate serait la seule chose à jouer. Le prix se ramasse une fois et il reste des rounds pour jouer le Payload. *(Passé de 150 à 50 le 2026-09-01, puis de 50 à 20 le 2026-09-02. Le Spark n'a pas changé, l'échelle autour de lui a changé : à 4 buts par match, 50 points valaient un peu plus que le match ; à 1,9 but sur le terrain de bout en bout, ils en valaient deux et demi. À 20 points, il décide 33 % des matchs en Veteran et 36 % au Star, contre 39 % et 44 % à 50 points.)* |
| 21 | Blocage du Bulwark : +4 / +6 / +8 sur l'AC de la Furnace | **+2 / +3 / +4** | 96 à 98 % des tirs d'un match étaient bloqués. Le contre prévu, un second tireur dans le même round, ne se produisait jamais faute de volume de tir, donc la Réaction se comportait comme un bonus permanent et tenait le taux de réussite à 30 % |
| 22 | Furnace AC 18 | **AC 15** | Écrite contre un blocage qu'on croyait occasionnel. Avec le blocage ramené à sa vraie fréquence, 15 place le tir propre d'un Striker Rookie à une chance sur deux |
| 23 | Portée propre du lancer : 30 pieds | **45 pieds**, la portée longue reste à 60 | Les deux Furnaces étaient alors à 14 cases l'une de l'autre sur la même passerelle. À 30 pieds, le porteur mesurait en moyenne 10 cases de la Furnace visée et ne tirait proprement que sur un cinquième de ses tours. *(La géométrie qui motivait ce chiffre a changé à l'écart 24 ; la portée, elle, est conservée telle quelle.)* |
| 24 | Les deux Furnaces en Zone 3, l'une à gauche l'autre à droite | **Une Furnace à chaque bout du silo, au centre.** `(6,0)-(8,0)` dans le sol de la Trench pour l'équipe A, `(6,44)-(8,44)` dans le plafond du Summit pour B, soit 44 cases de séparation. Trois cases de large au lieu de deux. *(Arbitrage du 2026-09-02.)* | Les deux camps attaquaient le même endroit, et le Payload repart dans les mains du gardien qui encaisse, gardien posté devant sa Furnace. Dès le round 6, 93 % des unités et 99 % du ballon étaient en Zone 3 : deux tiers de l'arène étaient du décor. L'axe d'équité passe de gauche/droite à haut/bas, et le layout devient un miroir exact autour de `y = 22`, tenu par une assertion |
| 25 | Rien : les deux blocs adverses partagent les comptes 15 et 10, et la fiche ne dit pas qui passe devant | **Un dé au coup d'envoi désigne le camp qui gagne les égalités d'initiative, et ce camp alterne à chaque round.** *(Arbitrage du 2026-09-02.)* | À égalité de compte, l'ordre se réglait sur une clé stable commençant par la lettre d'équipe, donc A jouait avant B à chaque compte, de chaque round, de chaque match. Sur 200 matchs par Tier, A ouvrait le round 6 deux cents fois sur deux cents et attrapait le Spark près de trois fois plus souvent, ce qui lui donnait 129 victoires à 66 en Veteran alors que B marquait plus de buts. Une alternance à départ fixe ne suffisait pas : le Spark entrant à un round fixe, elle aurait donné le premier accès à l'autre camp aussi systématiquement |

## A3. Trous comblés, la fiche ne disait rien

| # | Sujet | Règle v2 |
|---|---|---|
| 10 | Hauteur d'une zone | 15 cases, soit 75 pieds. Silo total 225 pieds |
| 11 | Carte d'ancrage | Une case est ancrable si elle touche une case de structure, y compris en diagonale |
| 12 | Coût du déplacement diagonal | 5 pieds par case, règle 5e 2024. Distance de Chebyshev partout |
| 13 | Égalité au round 10 | Deux rounds de mort subite, premier score gagne, sinon match nul |
| 14 | Payload remis en jeu si le Bulwark est évacué | Il apparaît sur la case devant la Furnace, libre pour tout le monde |
| 15 | Point d'entrée d'un remplaçant | À côté de la bouche de la Furnace de son équipe, `(5, 1)` pour A et `(5, 43)` pour B. *(Suit l'écart 24 : chaque camp a désormais son but à un bout du silo, l'équipe A en Zone 1 et l'équipe B en Zone 3.)* |
| 16 | Ligne de vue et couvert | Aucun blocage au MVP. Le silo est à ciel ouvert, les poutrelles sont fines |
| 17 | Liste des actions disponibles | Voir B5. La fiche cite des actions au fil du texte sans jamais les lister |
| 18 | Égalités dans les ciblages automatiques | Compte d'initiative le plus bas, puis identifiant d'unité, **sauf pour la cible d'un Cracker, qui se départage au dé**. Un identifiant porte la lettre d'équipe, donc un départage par identifiant vise toujours le même camp : invisible sur un match, cela fausse une passe d'équilibrage, c'est à dire exactement ce que ces passes servent à détecter. Le même raisonnement a produit l'écart 25 |

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

**Furnaces.** Une bouche à chaque bout du silo, au centre de la paroi. L'équipe A défend
`(6,0)-(8,0)`, creusée dans le sol de la Trench, et marque dans celle de B ; l'équipe B défend
`(6,44)-(8,44)`, ouverte dans le plafond du Summit, et marque dans celle de A. Quarante-quatre cases
les séparent. Trois cases de large, parce qu'une bouche doit rester trouvable depuis l'autre bout du
silo. *(Écart 24, arbitrage du 2026-09-02. Les deux Furnaces étaient auparavant côte à côte en
Zone 3, ce qui laissait deux tiers de l'arène inutilisés à partir du round 4.)*

**Le terrain est symétrique autour de `y = 22`**, ligne pour ligne. Ce n'est pas une intention de
dessin, c'est une assertion tenue par `setup.test.ts` : ce qui doit être identique pour les deux
camps, c'est l'approche vers le but adverse, et l'axe d'équité est donc vertical et non horizontal.
La chaîne centrale plonge dans chaque bouche, donc elle court de `y1` à `y43`.

**Franchissement de zone.** Passer de `y=14` à `y=15`, ou de `y=29` à `y=30`, coûte **10 pieds en
plus** du coût de la case. *(Arbitrage du 2026-09-01, ramené de 15 à 10 : à 15, un pas de
franchissement mangeait 20 pieds sur 40, donc un porteur franchissait et s'arrêtait.)* Justifié en fiction par une grille de ventilation entre les étages.
C'est ce qui empêche la Zone 3 d'être à trois cases de tout le monde.

## B2. Placement de départ

Le coup d'envoi est une mise en jeu : chaque équipe dans sa moitié, le ballon à égale distance des
deux buts.

- Payload et les deux Crackers au centre de la Zone 2, case `(7, 22)`.
- Le Spark n'est pas sur le terrain.
- **Chaque Bulwark dans sa propre bouche**, à une case de la Furnace qu'il défend et donc dans sa
  portée de blocage : `(7, 1)` pour A, `(7, 43)` pour B.
- **Les six joueurs de champ au-dessus de leur propre passerelle**, sur `y19` pour A et `y25`
  pour B, aux `x` 2, 4, 6, 8, 10 et 12. Au-dessus et non dessus : `y18` et `y26` sont de la
  structure. Chacune de ces cases touche la passerelle ou la chaîne centrale, donc les six
  commencent ancrés.

*(Écart 24. Les passerelles de la Zone 2 sont passées à `y18` et `y26` : les anciennes n'étaient
symétriques ni entre elles ni avec le reste du silo.)*

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

**Égalité entre les deux camps : un dé au coup d'envoi, puis alternance.** Les blocs des deux
équipes partagent les comptes 15 et 10, donc chaque slot d'un camp est à égalité avec un slot de
l'autre. Un `d2` tiré à l'ouverture du match désigne le camp qui passe devant au round 1, et ce camp
alterne à chaque round. *(Écart 25, arbitrage du 2026-09-02. L'ordre se réglait auparavant sur une
clé stable commençant par la lettre d'équipe, ce qui donnait toujours la main au même camp et lui
offrait le premier accès au Spark dans tous les matchs.)*

**Chrono de 120 secondes par tour humain.** À expiration, l'unité passe automatiquement en Dodge
plutôt que de perdre son tour, ce qui évite de punir une coupure réseau. *(Porté de 60 à 120 le
2026-09-02 : le chrono ne borne rien dans les règles et aucune passe d'équilibrage ne le lit.)*

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
  le gardien monte. Résultat : tir libre à 55 / 70 / 80 %, tir bloqué à 45 / 55 / 60 %.

  *(Deux chiffres de ce bloc datent d'avant l'écart 24 et ne décrivent plus le terrain. Les deux
  Furnaces ne sont plus distantes de 14 cases sur une passerelle commune mais de 44 cases, aux deux
  bouts du silo ; la portée de 45 pieds est conservée telle quelle, mesurée et non recalculée. Et le
  match produit désormais 1,6 à 2,3 buts pour 7 à 16 % de matchs sans but, ce qui reste dans la cible
  d'au moins un à deux buts par match, et non les 3,6 à 4,5 buts d'un terrain où les deux camps
  attaquaient le même endroit.)*
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
- **Attraper** : Action, sur la même case, `DC 20` Dextérité, Escamotage ou Acrobaties. **20 points.
  Le match ne s'arrête pas.** Réussi, le Spark quitte le terrain définitivement et ne réapparaît
  pas. Manqué, l'Action est dépensée et le Spark reste en jeu.

  *(Le prix se fixe contre le nombre de buts et se rejuge chaque fois que celui-ci bouge. Il vaut
  deux buts, soit environ ce que pèse un match entier. Ce n'est pas une constante que l'IA lit :
  les mêmes graines jouent le même match à n'importe quel prix, seul le tableau change, et la
  mesure porte donc sur la part de rencontres que le Spark décide et sur le nombre de matchs nuls,
  qu'un Spark cher écrase.)*

## B10. Élimination

À 0 HP, l'unité tombe au sol de la Zone 1 et est évacuée.

- **Humain** : reprend la main sur son remplaçant après 2 rounds, même rôle, même Tier, HP pleins,
  entrée à côté de la bouche de la Furnace de son équipe, `(5, 1)` pour A et `(5, 43)` pour B. *(Suit
  l'écart 24 : chaque camp défend désormais un bout du silo, l'équipe A en Zone 1 et l'équipe B en
  Zone 3.)*
- **IA** : même délai, même point d'entrée, tant que le banc n'est pas vide.
- **Banc** : 3 remplaçants par équipe. Épuisé, l'équipe joue en sous nombre.

## B11. Fin de match

- Fin au terme du round 10, le plus haut score gagne. La capture du Spark ne met pas fin au match,
  elle met 20 points au tableau.
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

---

# Partie C : écarts du 2026-10-10, décision D11, le terrain horizontal

> Écrite le 2026-10-10 par le fil principal (Fable 5.1) sur la décision D11 de Jérôme, prise après
> sa première partie entière du terrain vertical, avec son autorisation de passer outre toute règle
> écrite qui la contredit. **Cette partie prime sur les parties A et B partout où elles se
> contredisent.** Elle entre en vigueur dans le code à la sous-phase 2H.1 de
> `08-plan-terrain-horizontal.md` ; jusqu'au redéploiement du moteur 2, le jeu en ligne joue encore
> la partie B. Les écarts sont numérotés à la suite des précédents.

**La fiction.** Le Kill-Silo reste un silo à missile nucléaire, un tube, mais **couché à
l'horizontale**, par nostalgie de Bombara, le monde d'origine des Giff. Les deux Furnaces sont les
deux bouches du tube. Il n'y a plus de haut ni de bas : on ne vole pas, on ne tombe pas, on court
entre des caisses et des piliers.

## C1. Terrain

| # | Règle v2 | Règle après D11 | Raison |
|---|---|---|---|
| 27 | Vue de profil, trois zones empilées, `y` monte (écart 5, B1) | **Vue de dessus.** 15 cases de large sur 45 de long. `y` reste l'axe long, 0 côté Furnace A, 44 côté Furnace B ; `x` la largeur. Le miroir autour de `y = 22` tient. Les trois « zones » ne sont plus que les **trois tiers** du terrain, nommés pour le fil et pour l'entrée du Spark, sans aucune règle attachée | Les coordonnées du moteur ne changent pas, leur lecture change. C'est aussi la vue de la table |
| 28 | Structure, chaîne centrale, crochets, passerelles, carte d'ancrage (écart 11) | **Obstacles.** Une case `#` est infranchissable et **coupe la ligne de vue**. Rien d'autre : la chaîne disparaît. Le layout est celui de `08` §3, accepté par Jérôme le 2026-10-10 | Un obstacle qui ne coupe pas la vue n'est qu'un détour |
| 38 | Départs au-dessus des passerelles (B2, écart 24) | Bulwark en `(7, 1)` pour A et `(7, 43)` pour B. **Révisé le 2026-10-10 soir, à la porte de 2H.4** : les six joueurs de champ sur **`y14` pour A et `y30` pour B**, aux `x` 2, 4, 6, 8, 10, 12, soit **huit cases du ballon** en `(7, 22)`. Le premier brouillon les mettait sur `y4` et `y40`, à dix-huit cases : personne n'atteignait le ballon au premier tour, même en Dash (retour 1 de la partie de Jérôme). Vérifié par test : chacun des six atteint `(7, 22)` en huit cases malgré le pilier et les couvertures, pour les deux camps, et le gardien ne le peut pas | Le ballon est prenable dès le premier tour sans Dash ; chacun reste dans son tiers, le gardien dans sa bouche |

## C2. Déplacement

| # | Règle v2 | Règle après D11 | Raison |
|---|---|---|---|
| 29 | Vitesse de vol 40 pieds (B3) | **Vitesse de déplacement 40 pieds**, 8 cases, huit directions, 5 pieds la case, Dash ajoute 40. Une case occupée ou pleine bloque, le chemin complet est envoyé | Inchangé dans les faits, renommé |
| 30 | Franchir une zone coûte 10 pieds de plus (B1) | **Supprimé** | D11 |
| 31 | B6 en entier : ancrage, chute libre, grappin, chute de bousculade ; écart 1 | **Supprimé.** Aucune unité ne tombe jamais, aucune case n'est « ancrable » | D11 |

## C3. Contact

| # | Règle v2 | Règle après D11 | Raison |
|---|---|---|---|
| 32 | Bousculade réussie contre un non-porteur : chute de 3 cases (B7) | **Poussée d'une case** dans la direction opposée au bousculeur. Si cette case est un obstacle, une unité ou le bord, la cible ne bouge pas. Contre un porteur : le ballon tombe sur sa case et la cible ne bouge pas, arbitrage du 2026-09-01 conservé | La bousculade de D&D 2024, 5 pieds |
| 33 | Recul explosif de 2 cases, peut décrocher l'ancrage ; attaque d'opportunité retenue si le recul coûterait la prise (B3, B5) | Recul de 2 cases, arrêté par un obstacle, une unité ou le bord. **L'attaque d'opportunité est toujours prise** | Plus de prise à perdre |
| 34 | Tir, passe, interception : portée en cases, rien ne les bloque (B7) | **Ligne de vue obligatoire** : un obstacle entre les deux cases interdit le tir, la passe et l'interception. Les unités ne coupent pas la ligne de vue. La portée reste 9 cases, 12 à désavantage, confirmée par le sweep de 2H.3 (écart 39) | J1 : le couvert existe |

## C4. Ordnance

| # | Règle v2 | Règle après D11 | Raison |
|---|---|---|---|
| 35 | Les Crackers ignorent le terrain (B8) | **En dérive**, au compte 20, un Cracker roule vers l'unité la plus proche par le **chemin le plus court qui contourne les obstacles**, **10 cases de chemin** depuis le 2026-10-10 (écart 40). **Frappé**, il part en ligne droite sur la direction d8, **rebondit** sur un obstacle ou un bord selon l'écart 36b et continue avec les cases qui lui restent ; il détonne sur la première unité rencontrée, écart 4, sinon s'immobilise au bout de sa course. **Son mouvement ne tombe jamais à zéro à cause d'un obstacle** | J6, précisé par Jérôme |
| 36 | Le Spark entre en Zone 2 et dérive de 6 cases sur un cap d8 tiré une fois, dans le plan vertical (écart 3, B9) | Entre au round 6 dans le **tiers central**, à 4 cases ou plus de toute unité, dérive de 6 cases par round sur un cap d8 tiré une fois **dans le plan du terrain**, et **rebondit** sur les obstacles et les bords en gardant toutes ses cases | Le plan change, pas la règle |
| 36b | | **Règle de rebond**, commune aux écarts 35 et 36. Une case orthogonale bloquée renvoie la direction en arrière. En diagonale, si une seule des deux cases orthogonales voisines est libre, seule la composante bloquée s'inverse ; si les deux sont bloquées, les deux s'inversent. Un rebond ne consomme pas de case. **Repli, confirmé par Jérôme le 2026-10-10** : si la règle ci-dessus ne trouve aucune case libre en quatre tentatives, le mobile tourne d'une face de d8 dans le sens horaire à partir de son cap d'arrivée, prend la première case libre et continue sur ce cap. Sur le layout accepté cela concerne 24 couples case et cap, mesurés en 2H.1 | Une règle, un fichier, un test. Le repli existe parce que J6 dit « jamais zéro » et que la règle seule coinçait |

## C5. Élimination

| # | Règle v2 | Règle après D11 | Raison |
|---|---|---|---|
| 37 | À 0 HP, l'unité tombe au sol de la Zone 1 et est évacuée (B10) | **Évacuée sur place.** Le remplaçant entre à côté de la bouche de sa Furnace après 2 rounds, `(5, 1)` pour A et `(5, 43)` pour B, comme avant | Plus de sol où tomber |

## C6. Ce qui a été mesuré avant de s'écrire, tranché le 2026-10-10

Campagne de 2H.3, 200 matchs par Tier par variante, tableaux archivés dans
`09-equilibrage-2H3-2026-10-10.md`. Jérôme a tranché sur le tableau le 2026-10-10.

| # | Règle v2 | Mesuré en 2H.3 | Règle après arbitrage | Raison |
|---|---|---|---|---|
| 39 | Portée de tir 9 cases, 12 à désavantage | 9/12 contre 7/10 et 6/9 | **Inchangée, 9 cases, 12 à désavantage** | À 7/10 le rookie passe sous un but par match et les matchs sans but montent partout ; à 6/9 deux Tiers sur trois sont hors cible. Les obstacles coupent déjà un tir propre sur cinq. Le retour 6 de la première partie venait du terrain vertical sans obstacles |
| 40 | Crackers à 6 cases par round | 6 contre 10 | **10 cases de chemin par round** | D4 confirmé. Les trois Tiers tiennent 1,10, 1,48 et 1,80 but par match, un évacué de plus tous les trois ou quatre matchs, rien d'autre ne bouge. C'est le retour 2 de la première partie, « les autres balles bougent à peine » |
| 41 | Spark à 20 points | 5, 10, 15, 20 et 30, rejoués sur les mêmes graines | **Inchangé, 20 points**, deux buts | Le Spark n'est jamais pris deux fois dans un match, donc le prix ne fixe que l'avance aux buts qu'une prise renverse. À 20 il décide 54 à 55 % des rencontres avec les Crackers à 10 ; seul 5 atteignait les 30 % visés. **Jérôme garde 20 en connaissance de cause** : le Spark vaut deux buts, et la cible des 30 % est remplacée par cet arbitrage |

**Tout le reste tient** : initiative, échelle et blocs, dix rounds et mort subite, banc de trois et
retour après deux rounds, Spark à 20 points et son prix fixé contre le nombre de buts, Tiers et
statistiques, Dodge, Dash, Disengage, interception, blocage du Bulwark à 2 cases de sa bouche, le
but qui remet un ballon neuf au gardien.

**L'équilibrage**, clos le 2026-09-02, rouvert par cette partie, est **re-clos le 2026-10-10** à la
fin de 2H.3 : avec les écarts 39 à 41, les trois Tiers tiennent 1,10, 1,48 et 1,80 but par match,
33 à 69 matchs sans but sur 200, et le Spark décide 54 à 55 % des rencontres, part acceptée par
Jérôme à la place de la cible des 30 %. Hors d'une nouvelle sous-phase ouverte par lui, on n'y
touche plus.

## C7. Écarts de la sous-phase 2H.5, décidés par Jérôme le 2026-10-10 soir après sa partie

> Écrits par le fil principal (Fable 5.1) en 2H.5. Les retours numérotés de la partie sont dans
> `07` §10, sous 2H.4. Aucun de ces écarts ne change la forme d'un état ni d'un événement :
> `ENGINE_VERSION` reste 2, les matchs ouverts continuent et jouent la règle au tour suivant.

| # | Règle v2 | Règle après 2H.5 | Raison |
|---|---|---|---|
| 42 | Bousculade réussie contre un porteur : le ballon tombe **sur sa case** (écart 32, arbitrage du 2026-09-01). Évacuation : le ballon reste où l'unité est tombée | **Le ballon perdu roule sur une case adjacente tirée au d8**, comme une passe ratée, sur bousculade comme sur évacuation. Le porteur bousculé ne bouge toujours pas. **Repli** : si la case tirée est un obstacle, hors terrain ou occupée par une unité, le ballon prend **la case libre suivante dans le sens horaire** à partir de la face tirée, en tournant d'une face de d8 à la fois ; si les huit voisines sont prises, il reste sur la case du porteur. La case du bousculeur est occupée, donc une bousculade ne met jamais le ballon dans les mains du bousculeur : il doit encore marcher dessus. Deux événements existants le disent : `payloadDropped` pour les mains, `payloadScattered` à 1 case pour le sol, avec la face tirée | Retour 4 : sur un terrain où deux unités ne partagent jamais une case, un ballon sous les pieds du porteur n'était reprenable que par lui |
| 44 | Les Crackers dérivent au compte 20 **dès le round 1** (B8) | **Pas de dérive au round 1.** Les Crackers sont posés mais immobiles pendant le round de coup d'envoi et chassent à partir du round 2. Les frapper au round 1 reste permis : c'est une décision, pas une taxe | Décidé par Jérôme le 2026-10-10 soir sur un effet mécanique de l'écart 38 révisé vu au harnais : nés à une case du centre avec dix cases de roulement, face à des lignes à huit cases, les deux Crackers atteignaient quelqu'un à chaque match avant qu'un joueur ait agi, deux 3d6 décidés par rien |
| 43 | Les deux Crackers naissent et reviennent **sur la case du ballon**, `(7, 22)` (B8) | **Au coup d'envoi**, un Cracker de chaque côté du ballon **dans la largeur**, `(6, 22)` et `(8, 22)`, jamais sur la case du ballon : chacun reste à égale distance des deux Furnaces. **Au retour**, un Cracker prend **la case libre la plus proche du centre**, le centre lui-même s'il est libre, jamais la case du ballon au sol, jamais une case occupée par une unité, jamais la case de son jumeau encore en jeu ; les cases à égale distance sont départagées par le dé, comme le choix de la cible la plus proche. Les deux reviennent l'un après l'autre, le second voyant où le premier s'est posé | Retours 2 et 3 : empilés sous le disque du ballon, on n'en voyait qu'un, puis aucun |

Hors règlement mais décidé en même temps : les traits de trajectoire du rejeu sont retirés du
plateau (retour 7), et la passe d'animation 2D passe avant toute ligne de 2.5D (retour 5).

## C8. Écarts décidés le 2026-10-10 soir après la partie à la porte de 2H.5, **dans le code depuis 2H.6**

> Écrits par le fil principal (Fable 5.1) sur les réponses de Jérôme à ses sept retours (`07` §10,
> sous 2H.5), puis **implémentés en 2H.6 le 2026-10-10**, journal en `07` §10. Les deux points
> ouverts ont été tranchés par Jérôme au départ de 2H.6, en une question chacun, et sont écrits
> ci-dessous comme écarts 40 bis et 37 bis. L'écart 47 change la forme des événements et fait
> monter `ENGINE_VERSION` à 3, ce qui archive les matchs ouverts du moteur 2 au redéploiement.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 45 | Au compte 20, un Cracker roule vers **l'unité la plus proche** (B8, écart 35) | **Un Cracker roule vers le ballon**, là où il est posé ou là où se tient son porteur, par le chemin le plus court qui contourne les obstacles, de `CRACKER_MOVE_CELLS` cases. Il détonne toujours sur la première unité dont il traverse la case (écart 4), porteur compris. S'il atteint la case d'un ballon au sol sans unité dessus, il s'y arrête et **rien ne se passe** : pour prendre ce ballon il faut d'abord frapper le Cracker pour l'éloigner, ou marcher dessus et prendre l'explosion au compte 20 suivant. Un Cracker ne traverse pas la case de l'autre Cracker : il s'arrête sur la dernière case libre avant. Une unité debout sur un Cracker au compte 20 prend l'explosion sur place, comme avant | Jérôme, retour 2 : une trajectoire simple et prévisible, pour l'IA comme pour chaque rôle. Le tirage au dé entre cibles équidistantes disparaît avec la cible | **Fait en 2H.6**, `crackerRun` dans `rules/ordnance.ts`. Note d'ingénierie : le plus court chemin départage désormais les ex æquo par la case la plus proche du but à vol d'oiseau, sinon trois cases vers l'ouest se roulaient en un crochet sud-est puis nord-ouest, aussi court et illisible |
| 46 | Les Crackers naissent de part et d'autre du ballon au centre et reviennent au plus près du centre (écart 43) | **Un Cracker par pilier de bord de la ligne médiane**, `(0, 22)` au nord de l'écran et `(14, 22)` au sud : au coup d'envoi comme au retour, chacun prend une case libre adjacente à son pilier, jamais le ballon, jamais une unité, jamais l'autre Cracker ; les cases libres équivalentes sont départagées au dé. `cracker-1` au pilier nord, `cracker-2` au pilier sud | Jérôme, retour 3 : loin du ballon et des deux lignes, ils entrent en jeu au lieu de naître dans la mêlée | **Fait en 2H.6**, `crackerPost` et `crackerHomeCell` dans `rules/ordnance.ts`, dérivés de `ordnanceStart` ; rien ne change dans la ligne `arenas` |
| 40 bis | Crackers à 10 cases (écart 40) | **8 cases de chemin par round**, `CRACKER_MOVE_CELLS = 8` | Jérôme, tranché au départ de 2H.6 : nés aux piliers, à sept cases du centre, et lancés sur le ballon, les Crackers n'ont plus besoin de dix cases pour entrer en jeu. Mesuré avec 45, 46, 47 et 48 ensemble dans `09` §11 | **Fait en 2H.6** |
| 47 | Frapper un Cracker est une Action, contre AC 10, sur un Cracker adjacent et immobile (B8) ; aucun rôle n'a de réaction contre un Cracker qui arrive | **La parade du Breaker.** Quand un Cracker en dérive arrive sur la case d'un Breaker, avant de détonner, le Breaker dépense sa **Réaction** pour le frapper : attaque de mêlée contre `CRACKER_AC` 10. Réussie, le Cracker repart de **`CRACKER_BAT_RANGE_CELLS` 12 cases** dans une direction choisie **dans un arc de 120 degrés face au Cracker**, soit sur la grille **la face par laquelle il est entré dans la case du Breaker, c'est-à-dire le sens inverse de son dernier pas**, et ses deux voisines ; il rebondit (écart 36b) et détonne sur la première unité rencontrée, quel que soit son camp. Manquée, il détonne sur le Breaker comme avant. La Réaction est dépensée dans les deux cas. Un Cracker renvoyé par la parade est un Cracker frappé, pas en dérive : il ne se pare pas une seconde fois. Frapper un Cracker adjacent et immobile reste une Action ouverte à tous les rôles | Jérôme, retour 4 : le Breaker protège, et son outil contre les Crackers est la frappe au moment où ça compte. L'AC et la portée de frappe existaient déjà, elles sont réutilisées | **Fait en 2H.6.** Les deux conséquences ont été posées à Jérôme et tranchées au départ : **`ENGINE_VERSION = 3`**, événement `crackerParried`, matchs ouverts du moteur 2 archivés au redéploiement ; **direction automatique** pour l'IA comme pour un Breaker humain dans un premier temps, la face de l'arc qui rencontre un adversaire le plus tôt, sinon la face d'arrivée (`parryDirection`), avec un seul raffinement du fil principal : si la face d'arrivée renverrait le Cracker sur un coéquipier et qu'une face voisine ne touche personne, c'est la voisine. Trois cas limites décidés par le fil principal et à relire par Jérôme : un Breaker qui porte le ballon ne pare pas, comme il ne frappe pas ; un Breaker debout sur un Cracker au compte 20 ne pare rien, le Cracker n'est pas « arrivé » ; la parade ne fait pas reculer le Breaker, le Cracker étant sur sa propre case |
| 48 | Interception possible par tout adversaire à une case d'une cellule du vol, la première comprise (B7, écart 34) | **La première case du vol ne compte pas** : une passe qui quitte les mains ne se vole pas par un voisin du lanceur. Un adversaire doit être sur la trajectoire ou à une case d'une cellule du vol à partir de la deuxième. Conséquences : une passe à un coéquipier adjacent ne s'intercepte jamais ; un adversaire voisin du lanceur compte encore s'il est aussi à une case de la deuxième cellule | Jérôme, retour 6, sur la proposition du fil principal | **Fait en 2H.6**, sous-agent Sonnet, `passInterceptors` dans `rules/reactions.ts` |
| 37 bis | Le remplaçant entre à côté de la bouche de sa Furnace (écart 37) | **La case libre la plus proche du centre**, le centre lui-même s'il est libre, jamais le ballon au sol, une unité ni un Cracker vivant, égalités au dé | Jérôme, tranché au départ de 2H.6 sur le retour 5 : revenir à côté de sa Furnace était trop pénalisant | **Fait en 2H.6.** Dérivé de `ordnanceStart` dans le moteur, règle `nearestFreeCell` de `rules/placement.ts` partagée avec les Crackers ; la colonne `substitute_entry` de la ligne `arenas` et le champ du spec restent et ne sont plus lus, pas de migration |

## C9. Écarts décidés le 2026-10-10 après la partie à la porte de 2H.6, **dans le code depuis 2H.7, en ligne le 2026-10-10 (moteur 4)**

> Écrits par le fil principal (Fable 5.1) sur les retours de Jérôme après sa partie sur le moteur 3
> (`07` §10, sous 2H.6), tranchés par lui en une question chacun au départ de 2H.7, puis implémentés
> le jour même. Les deux écarts touchent le Spark. L'écart 49 ajoute un champ `cause` à l'événement
> `sparkMoved`, l'écart 50 retire l'état `caught` du Spark, l'écart 51 change la forme de
> `turnOrder` et l'écart 52 ajoute un drapeau et un événement : **`ENGINE_VERSION` monte à 4**, les
> matchs ouverts du moteur 3 sont archivés au redéploiement.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 49 | Attraper le Spark est une Action depuis sa case, DC 20 ; manqué, l'Action est dépensée et le Spark reste en jeu (B9). Rien n'interdit de finir son tour sur sa case | **Le Spark s'échappe de la case d'un gardien.** À la fin de tout tour qui se termine sur la case du Spark sans l'avoir attrapé, tentative ratée ou pas de tentative, le Spark saute **d'une case au d8**, avec le repli horaire de l'écart 42 : la première case libre à partir de la face tirée, jamais un obstacle, jamais une unité. Si les huit voisines sont prises il reste. Son cap ne change pas : c'est un saut, pas une nouvelle dérive, et la course du compte 10 repart de la nouvelle case. Un Spark attrapé ne s'échappe pas, il est parti | Jérôme, retour 1 : une case occupée ne s'entre pas, donc une unité assise sur le Spark en interdisait l'accès à tout le monde jusqu'à ce qu'elle bouge, « couver le Spark ». La formulation « à la fin du tour » couvre l'échec et le parking sans interdire d'y marcher, ce qu'il faut pour l'attraper | **Fait en 2H.7**, `sparkEscape` dans `reduce.ts`, appelé par `applyEndTurn` ; événement `sparkMoved` avec `cause: 'escape'`, la dérive portant `cause: 'drift'` |
| 51 | B4 en entier : comptes 20, 15 et 10, d20 + Acrobaties par humain, blocs IA, d2 de départage (écart 25) | **L'initiative devient un ordre, sans comptes.** Dans le round : **le Spark** s'il est sur le terrain ; **l'équipe qui a un humain** ; **les Crackers juste après l'équipe qui porte la balle** (la dernière à l'avoir portée si elle est au sol, en tout dernier au coup d'envoi) ; **l'autre équipe**. Dans une équipe : **Trajector, Strikers, Breakers, Bulwark**. Un humain joue en premier dans son rôle ; plusieurs humains du même rôle sont ordonnés une fois au coup d'envoi par un d20 relancé jusqu'à les séparer. L'ordre des IA d'un même rôle est fixé **au début du round par la situation** : en attaque le porteur d'abord puis du plus en arrière au plus avancé, en défense du plus proche du porteur adverse au plus loin, balle au sol du plus proche de la balle. Sans humain d'aucun côté, les deux camps alternent de round en round depuis un dé de coup d'envoi. L'échelle est fixée au début du round, la balle qui change de mains en cours de round ne la bouge pas | Jérôme, le 2026-10-10 au soir, pour que la balle puisse remonter toute la chaîne de son équipe dans un même round et que la lecture de l'échelle soit immédiate. L'ordre dans un rôle vit dans le moteur et non dans l'IA : c'est une règle de l'échelle, les deux camps lisent la même | **Fait en 2H.7**, `engine/initiative.ts` récrit, `TurnSlot` porte un `rank` et plus de `count`, l'état porte `lastCarrierTeam` ; les comptes disparaissent des constantes |
| 52 | Aucune action propre au Bulwark hors son blocage en Réaction | **Se planter (Brace, « Dig in »).** Action du **Bulwark seul**. Jusqu'au début de son prochain tour, ou jusqu'à ce qu'il se déplace, toute bousculade contre lui est lancée **avec désavantage et moins 3** (`BRACE_SHOVE_PENALTY`). Le blocage en Réaction n'est pas touché | Jérôme : il a trop vu deux adversaires pousser le Bulwark hors de sa bouche, après quoi il ne protège plus rien | **Fait en 2H.7**, action `brace`, drapeau `braced`, événement `braced`, `canBrace` dans `legalActions` |
| 50 | Attrapé, le Spark quitte le terrain définitivement et ne réapparaît pas (B9, écart 41 « jamais pris deux fois ») | **Le Spark revient le round suivant.** Attrapé, il repasse en attente et rentre au début du round suivant par la règle d'entrée habituelle (écart 36 : tiers central, à 4 cases ou plus de toute unité, cap d8 tiré à l'entrée), **toujours 20 points**, autant de fois qu'il est pris. En mort subite la prise termine le match comme avant | Jérôme, retour 5 : pris une fois au round 7, il laissait trois rounds sans rien d'autre à jouer que le ballon. **Rouvre l'équilibrage** : le prix de 20 avait été arbitré sur « jamais pris deux fois ». Mesuré dans `09` §12 | **Fait en 2H.7**, `applyCatchSpark` remet `pending`, `enterSpark` le fait rentrer ; `Spark.state` perd `caught` |

**Hors règlement, décidé en même temps, 2H.7 : l'IA par rôle**, dictée par Jérôme en chat le
2026-10-10, écrite dans les quatre fiches de `ai/roles/` et dans `ai/evaluate.ts` et
`ai/chooseAction.ts`. Les mots sont les siens.

- **La chaîne, en attaque.** Aller le plus vite possible vers le but adverse sans perdre la balle :
  maximiser les cases parcourues par l'équipe dans le round. Le porteur avance, tire s'il voit la
  bouche à portée propre, et **ne passe jamais à quelqu'un qui a déjà joué ce round**, sauf s'il est
  le **dernier maillon** de son équipe (le Bulwark après un but, typiquement), qui passe alors au
  plus loin **sans intercepteur d'abord, loin ensuite**, et jamais ne garde la balle par peur d'une
  interception. Le receveur est devant ou sur la même ligne, ou **à 1 à 3 cases derrière s'il est le
  tout prochain à jouer**, parce que ses huit cases porteront la balle plus loin. Tout rôle peut
  participer, priorité aux Strikers et au Trajector tant que le Spark n'est pas sur le terrain.
  Le Trajector, qui joue toujours en premier, est **le lanceur du round** ; s'il est le plus avancé
  et que personne n'ira aussi loin, il garde et tire.
- **« Presser »**, par rôle. Striker et Trajector : en défense, **bousculade pour faire tomber la
  balle** ; en attaque ils pressent rarement, et si c'est la seule chose à faire, c'est une attaque.
  Breaker : **attaque pour les dégâts** en attaque comme en défense, **bousculade** contre le porteur.
- **Le Breaker, garde du corps.** Son protégé est **toujours le porteur** : escorte du porteur allié
  sur l'épaule qui fait face à la menace, frappe de l'adversaire collé au porteur. En défense, sa
  position vise **d'abord le chemin des adversaires vers ses Strikers**, pour qu'aucun ne finisse
  adjacent à eux, **ensuite la ligne des Crackers**, où il se poste exprès pour parer. Il laisse un
  ballon perdu à un Striker ou un Trajector à deux cases et passe à la première occasion.
- **Le Striker** revient à portée de passe quand il est trop loin devant.
- **Le Bulwark** reste au centre de sa bouche, ne va chercher qu'une balle au sol à **trois cases ou
  moins**, sort bousculer jusqu'à **quatre cases de son but** et pas plus, se plante quand un
  adversaire approche et qu'il n'a rien de mieux.
- **Dodge est le dernier recours** : seulement abîmé de moitié et sans rien à frapper, bousculer,
  passer ni tirer. Le sweep gagne une colonne Dodge par match pour le vérifier.
- `crackerPressure` lit désormais **la ligne Cracker-ballon**, plus la distance à l'unité.

Et quatre retours d'écran sans règle : l'ouverture rejouée depuis le plateau de coup d'envoi
(migration 0007, colonne `matches.kickoff`), agir en cliquant un pion, tracer sa trajectoire, la
chaîne d'initiative au-dessus du plateau.

**Ce que ces écarts changent ensemble, mesuré.** Le sweep de contrôle de 2H.6 est en `09` §11,
`constants crackers 8 range 9/12 spark 20`, 200 matchs par Tier : 1,18 / 1,69 / 2,21 but par match
contre 1,12 / 1,40 / 2,00 en `09` §10, et surtout **trois fois moins d'évacués** (0,88 / 0,58 /
0,61 contre 2,35 / 1,75 / 1,24) : nés aux piliers, à huit cases, lancés sur le ballon et parés par
les Breakers, les Crackers touchent beaucoup moins de monde. L'équilibrage, clos le 2026-10-10,
**est rouvert par 2H.6 le temps de ce tableau, que Jérôme lit et tranche.**

## C10. Écarts décidés le 2026-10-11 après la partie à la porte de 2H.7, **dans le code depuis 2H.8 et en ligne le 2026-10-11 (moteur 5)**

> Écrits par le fil principal (Fable 5.1) sur les retours de Jérôme après sa partie sur le moteur 4,
> donnés en chat le 2026-10-11 et reformulés en trois passes, rôle par rôle, avant la moindre ligne
> de code. Deux écarts de règle, 53 et 54 ; le reste est de l'IA et de l'écran. L'écart 53 ajoute un
> champ à l'état et un événement, l'écart 54 change l'échelle : **`ENGINE_VERSION` monte à 5**, les
> matchs ouverts du moteur 4 sont archivés au redéploiement.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 53 | Après un but, le ballon neuf est dans les mains du gardien qui vient d'encaisser, et rien n'empêche les adversaires de camper devant sa bouche | **La surface de réparation.** Au moment du but, la zone des cases à **trois cases ou moins, en portée de grille, diagonales comprises**, de l'une des trois cases de la bouche qui vient d'encaisser, est **interdite à l'équipe qui a marqué**, pendant le round du but et **tout le round suivant**, levée au début du round d'après. Sur le layout : `x` 3 à 11, `y` 0 à 3 devant la Furnace A, `y` 41 à 44 devant la B, soit 33 cases hors bouche, qui contiennent la case du gardien et sa portée de blocage. **Tout adversaire déjà dedans est replacé immédiatement** sur la case libre la plus proche hors de la zone, égalités au dé, la règle `nearestFreeCell` du remplaçant (écart 37 bis), sans perdre le ballon s'il le porte ; événement `relocated`. Ensuite **aucun déplacement n'y fait entrer un adversaire** : ni un pas volontaire, ni une poussée, ni un recul explosif, qui s'arrêtent devant la zone comme devant un obstacle. Le ballon, le Spark et les Crackers ne sont pas concernés. Un nouveau but sur la même bouche prolonge la zone ; un but sur l'autre bouche ouvre la sienne, les deux peuvent coexister. Humains et IA y sont soumis de la même façon | Jérôme, le 2026-10-11 : après un but il voyait l'équipe qui venait de marquer se poser autour du gardien, et la relance mourait sur place | **Fait en 2H.8**, fil principal. `rules/box.ts` (`penaltyBoxCells`, `boxClosed`, `barredCells`), état `penaltyBox` par Furnace, `movement.ts` ferme les cases à la route et au chemin envoyé, `combat.ts` arrête poussée et recul au bord, `reduce.ts` ferme la zone et replace au but (`closeBox`), rouvre au début du round d'après. 6 tests dans `engine/box.test.ts` |
| 54 | Dans une équipe l'ordre est Trajector, Strikers, Breakers, Bulwark (écart 51) ; le Bulwark après un but est le dernier maillon et passe quand même | **Après un but, le Bulwark de l'équipe qui a encaissé passe exceptionnellement en premier de l'initiative de son équipe**, devant le Trajector, et **il lance la balle immédiatement à son tour**, au plus loin, même avec un risque d'interception. Il ne la garde jamais. Le moment précis de ce tour est tranché ci-dessous | Jérôme, le 2026-10-11 : la relance après un but doit partir tout de suite, et remonter la chaîne dans le même round | **Fait en 2H.8**, fil principal. `promoteBulwark` dans `initiative.ts` réordonne l'échelle du round en cours si le bloc de l'équipe qui a encaissé est encore devant ; sinon l'état porte `relaunch` et `buildTurnOrder` met le Bulwark en tête de son équipe au round suivant, puis l'efface. 2 tests |

**Le moment du tour, tranché par Jérôme le 2026-10-11.** Un but se marque pendant le bloc de
l'équipe qui marque. Le Bulwark **attend la fin de ce bloc**, Crackers compris s'ils suivent cette
équipe, et **quand arrive le bloc de son équipe, il y passe en premier**, devant le Trajector : dans
le même round si son équipe n'a pas encore joué, sinon au début du round suivant, où l'échelle est
construite avec lui en tête de son équipe. Un seul tour, à la première occasion ; ensuite il reprend
sa place habituelle. S'il est évacué entre-temps, rien ne se passe. Humain ou IA, même règle.

**L'IA par rôle, deuxième version, dictée par Jérôme le 2026-10-11.** Elle remplace le bloc de C9.
Les listes sont **triées par priorité**, la première ligne qui s'applique l'emporte. Ce qui change
par rapport à C9 est en gras.

*Règles communes aux quatre rôles.*

1. Debout sur le Spark : l'attraper, toujours.
2. Debout sur le ballon au sol : le ramasser. Seule exception, le Breaker, qui le laisse à un
   Striker ou un Trajector à deux cases ou moins.
3. **Une cible légitime pour son rôle à portée de frappe ou de bousculade se frappe ou se
   bouscule**, jamais un déplacement de trois cases à la place.
4. **Ne jamais finir un tour sans agir** quand une action utile est légale.
5. La chaîne : le porteur ne passe jamais à quelqu'un qui a déjà joué ce round, sauf dernier maillon
   de son équipe, qui passe au plus loin, sans intercepteur d'abord. Le receveur est devant ou sur la
   même ligne, ou 1 à 3 cases derrière s'il est le tout prochain à jouer.
6. **Au coup d'envoi, en IA, c'est un Striker qui prend la balle, jamais le Trajector.** Le moteur
   range déjà les Strikers du plus proche de la balle au plus loin.
7. Dodge est le dernier recours : abîmé de moitié et rien à frapper, bousculer, passer ni tirer.

*Trajector.*

1. **Spark sur le terrain : il le chasse et rien d'autre.** Il quitte l'attaque ou la défense, et
   accepte l'attaque d'opportunité s'il commence son tour au contact.
2. Spark sous ses pieds : l'attraper.
3. **Coup d'envoi en IA : il ne prend pas la balle au premier tour.**
4. Lanceur du round, balle en main : il passe au receveur devant ou sur la même ligne, ou 1 à 3
   cases derrière si c'est le tout prochain à jouer.
5. Il tire s'il voit la bouche à portée propre et que personne n'ira aussi loin que lui.
6. Balle au sol à portée : il la ramasse, priorité partagée avec les Strikers.
7. En défense : bousculade du porteur pour faire tomber la balle.
8. En attaque sans la balle : il se place à vue du porteur, en relais, et revient à portée de passe
   s'il est trop loin.
9. Dodge en dernier recours.

*Striker.*

1. Spark sous ses pieds : l'attraper.
2. Balle au sol à portée : il la ramasse, priorité partagée avec le Trajector.
3. Porteur : il avance le plus vite possible vers la bouche adverse, et tire s'il la voit à portée
   propre.
4. Porteur sans tir : il passe à un maillon qui n'a pas encore joué, devant ou sur la même ligne, ou
   1 à 3 cases derrière si c'est le tout prochain.
5. En attaque sans la balle : il se place devant ou sur la ligne du porteur, étalé, jamais collé à
   un coéquipier ; trop loin devant, il revient à portée de passe. **Un adversaire collé au porteur
   allié ne le fait pas bouger : il garde sa position de relais.**
6. **En défense, il presse le porteur coûte que coûte** : finir son tour sur une case adjacente au
   porteur adverse. **Priorité au déplacement normal jusqu'à l'adjacence puis Shove** pour faire
   tomber la balle ; **sinon Dash pour arriver adjacent**, même sans action restante, afin de tenir
   l'attaque d'opportunité quand le porteur partira.
7. Dodge en dernier recours.

*Breaker.*

1. Spark sous ses pieds : l'attraper.
2. La parade, en Réaction, quand un Cracker en dérive arrive sur sa case. Automatique.
3. **En défense, d'abord le porteur : y aller et le bousculer** pour faire tomber la balle.
4. **Porteur hors de portée : taper l'adversaire proche, Strikers d'abord, puis Breakers, puis
   Trajector.**
5. En défense, personne à portée : sa position vise d'abord le chemin des adversaires vers ses
   Strikers, pour qu'aucun ne finisse adjacent à eux, ensuite la ligne des Crackers, où il se poste
   exprès pour parer.
6. **En attaque, il est un obstacle entre les adversaires et le porteur allié** : il se place sur
   le chemin qu'ils devraient emprunter, pour qu'ils dépensent plus de mouvement ou n'arrivent pas
   en case adjacente au porteur. Plus de notion d'épaule. **Loin du porteur, il Dash pour être
   proche au round suivant** plutôt que de frapper un retardataire adverse. Collé au porteur avec un
   adversaire déjà adjacent, il le frappe. En seconde priorité, la ligne des Crackers.
7. Balle perdue : il la laisse à un Striker ou un Trajector à deux cases ou moins ; s'il la prend
   quand même, il passe à la première occasion. Il ne tire quasiment jamais.
8. Dodge en dernier recours.

*Bulwark.*

1. Spark sous ses pieds : l'attraper.
2. **Après un but : premier de l'initiative de son équipe (écart 54), il lance la balle
   immédiatement, au plus loin, même avec un risque d'interception.** Il ne la garde jamais.
   **Sans receveur, décidé par Jérôme le 2026-10-11 après la mise en ligne** (lu en base : le
   gardien se plantait au lieu de lancer, personne à portée ni en vue dans une relance sur deux) :
   **si une case atteignable avec son déplacement normal lui donne un coéquipier à portée de passe
   et en ligne de mire, il y va, même au-delà de ses quatre cases, la plus proche de sa bouche, et
   passe dans le même tour ; sinon il se plante et garde le ballon ; au tour suivant la même règle
   s'applique, il passe dès qu'il le peut, et s'il n'a toujours aucune ligne même en marchant, il
   se replante.** Jamais de Dash pour ça. Le ballon parti, sa laisse reprend et il rentre. C'est
   une règle de l'IA, pas du moteur : `ENGINE_VERSION` ne bouge pas, les fonctions sont à
   redéployer.
3. Le blocage en Réaction à deux cases de sa bouche, inchangé.
4. Il reste au centre de sa bouche.
5. Balle au sol à trois cases ou moins : il va la chercher. Plus loin, non.
6. Il sort bousculer jusqu'à quatre cases de son but, pas plus.
7. **Il se plante par défaut**, dès qu'il n'a rien de mieux : pas de balle à lancer, pas de balle au
   sol à trois cases ou moins, pas de porteur à bousculer à quatre cases ou moins. **Il n'attend pas
   qu'un adversaire approche.**
8. Dodge en dernier recours.

**Deux retours d'écran sans règle**, 2H.8 : **la route proposée est une ligne droite par défaut**,
la diagonale puis le droit, et ne contourne que ce qui bloque, jamais un arc (capture de Jérôme du
2026-10-11 : une route qui montait de deux cases et redescendait sans obstacle) ; et **toutes les
actions des IA s'affichent** dans le fil et dans le rejeu, aucune n'est tue.

**Ce que ces écarts rouvrent.** Rien dans les constantes de `00`. L'IA change dans les quatre
fiches de `ai/roles/`, `ai/evaluate.ts` et `ai/chooseAction.ts` ; **un seul sweep à la fin, si
Jérôme le demande**, contre `09` §12. **Pas lancé au 2026-10-11.**

**Comment l'IA v2 est codée**, par le fil principal, pour relire les poids contre les mots :
`chaseKickoff` (0 pour le Trajector) retire le ballon du coup d'envoi, jamais porté, à ce rôle ;
`Board.hunter` (Spark sur le terrain et `chaseSpark` > 0, le Trajector seul) fait de
`positionValue` une fonction du Spark seul, retire les attaques et les bousculades des candidats,
annule la pénalité d'attaque d'opportunité sur la route, et ajoute `chaseSpark` à toute passe pour
qu'il se débarrasse du ballon ; la case adjacente au porteur adverse vaut `pressCarrier` en plus du
gradient, et `dashCandidates` offre le Dash à `pressCarrier` quand l'adjacence n'est atteignable
qu'avec lui ; `hunt` (70, Breaker) paie la case adjacente à un adversaire frappable, pondérée par
`prey` (Strikers 1, Breakers 0,8, Trajector 0,6) qui pondère aussi la valeur du coup ; `block`
(60, Breaker, remplace `escort`) paie la case entre les deux menaces les plus proches et le porteur
allié, sur leur ligne, et vaut aussi le Dash quand le porteur est à plus d'un déplacement ; `relaunch`
(150, Bulwark) s'ajoute à toute passe hors du facteur d'interception et lève les filtres de la
chaîne ; le Dash ordinaire n'est plus offert quand une frappe, une bousculade ou un Cracker est à
portée ; le Bulwark se plante sans condition de proximité, et un Bulwark planté paie `brace` pour
tout pas. Le `shove` du Breaker passe de 65 à 50, son `shoot` de 45 à 15. **La relance sans
receveur** est `relaunchCandidates` dans `chooseAction.ts` : pour un porteur dont `relaunch` est
positif et sans passe légale, chaque case atteignable d'où un coéquipier est à portée et en vue
vaut `relaunch`, moins un demi-point par case de distance à sa bouche et la pénalité d'attaque
d'opportunité de la route, hors de la laisse ; une fois sur place, la passe suit.

## C11. Décisions du 2026-10-11 après la partie à la porte de 2H.8, **sous-phase 2H.9, dans le code et en ligne depuis le 2026-10-11 (moteur 5, `resolve-action` v15, `create-match` v13)**

> Écrites par le fil principal (Fable 5.1) sur les cinq retours de Jérôme après sa partie sur le
> moteur 5 (star, 40 à 20), lus contre les événements du match en base, puis deux questions
> fermées. Un seul écart de règle, 53 bis ; le reste est l'IA. **Aucune forme d'état ni
> d'événement ne change : `ENGINE_VERSION` reste 5**, les matchs ouverts jouent la règle au tour
> suivant, les fonctions sont à redéployer. **Codé en 2H.9 le 2026-10-11**, journal en `07` §10.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 53 bis | La surface de réparation reste fermée le round du but et tout le round suivant (écart 53) | **Elle se lève à l'instant où la passe du gardien quitte ses mains**, attrapée, ratée ou interceptée, quel que soit le round. Exception à la durée de l'écart 53. Un gardien qui ne lance pas laisse la zone courir jusqu'à son terme normal | Jérôme, retour 3 : la zone n'a de sens que pour protéger la relance | **Fait en 2H.9**, fil principal, dans `applyPass` de `reduce.ts` : le lanceur est le Bulwark de l'équipe dont la zone est fermée, la zone passe à `null` avant le test d'interception. La passe d'un joueur de champ ne lève rien. 4 tests dans `engine/box.test.ts`, sous-agent Sonnet |
| 48, confirmé | Interception par tout adversaire sur une case du vol ou à une case d'une case du vol, à partir de la deuxième | **Inchangé.** Jérôme a vu au round 4 une interception par un Trajector qui n'était pas sur la trajectoire : il était à une case de celle-ci, la règle est appliquée | Jérôme, le 2026-10-11, question fermée : « on garde » | Rien à faire |

**Ce que les événements de la partie ont montré**, pour mémoire : 32 tours sur 136 finis avec
l'Action inutilisée (14 Breakers, 13 Strikers, 5 Trajectors), dont Corvo au round 2 ; le Bulwark
allié resté planté en (9,0) puis (9,1) des rounds 6 à 10 au lieu de (7,1), but encaissé au round 6
avec lui hors de sa case.

**L'IA, troisième passe : le plan de tour.** Décidé par Jérôme sur la recommandation du fil
principal (« ok pour ta recommandation pour l'instant »).

- **Le moteur de décision change, pas les tableaux.** L'IA notait une action à la fois et
  recommençait jusqu'à finir le tour, ce qui la rendait aveugle à toute séquence : le Dash noté sur
  le mouvement restant valait zéro après la marche, « rentrer puis se planter » n'existait pas,
  « marcher puis frapper » ne se comparait jamais à « frapper puis marcher ». **Elle note désormais
  des plans de tour complets** : Dash ou non, case d'arrivée, action depuis cette case, repli
  éventuel avec le mouvement restant ; le plateau à la fin de chaque plan est noté par les mêmes
  poids de rôle, et le meilleur plan est joué action par action, le plan étant recalculé après
  chaque action pour tenir compte des dés. Les quatre fiches de `ai/roles/` restent les données
  que Jérôme dicte ; `positionValue` reste la note d'une case.
- **Le Dash vaut le terrain qu'il achète** : la différence entre le meilleur plan avec 16 cases et
  le meilleur plan avec 8, jamais le mouvement restant. Il reste interdit quand une frappe, une
  bousculade ou un Cracker est à portée (C10), hors les cas de presse et de mur.
- **Jamais l'Action en poche** : quand aucun plan n'utilise l'Action, **le plan de repli est le
  Dash**, pas Dodge, même si les cases de plus rapportent peu. Jérôme, question fermée du
  2026-10-11 : « je préfère un dash qu'un dodge ». Dodge reste le dernier recours de C10, abîmé de
  moitié et rien à faire.
- **Le gardien a une case de repos : sa case de départ**, le centre devant sa bouche, `(7, 1)`
  pour A et `(7, 43)` pour B. `guardFurnace` mesure désormais la distance à cette case, plus la
  distance à la case de bouche la plus proche, qui mettait `(9, 1)` à égalité avec `(7, 1)`. **Il
  rentre d'abord, il se plante ensuite** : « rentrer puis se planter » est un plan ; un Bulwark
  planté ne paie plus rien pour bouger, c'est le plan de tour qui arbitre.
- Le reste de C10 tient : relance immédiate et sans receveur, presser coûte que coûte, le Breaker
  garde du corps et chasseur, le Trajector chasseur de Spark, le Striker du coup d'envoi.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`. L'IA change dans
`ai/chooseAction.ts` en profondeur, `ai/evaluate.ts` pour la case de repos, les quatre fiches pour
le Dash de repli ; **un seul sweep à la fin, si Jérôme le demande**, contre `09` §12, et la vitesse
d'une décision est à mesurer, le test de cinquante millisecondes de `ai.test.ts` faisant foi.

**Comment le plan de tour est codé**, par le fil principal (Fable 5.1) le 2026-10-11, pour relire
le code contre les mots. **Codé en 2H.9.**

- **Un plan est une suite d'actions** : au plus un Dash, une marche vers une case d'arrivée, une
  action depuis cette case, un repli avec le mouvement restant. `Planner` dans `chooseAction.ts`
  énumère les plans, les note, les trie ; `chooseAction` renvoie la **première action du meilleur
  plan**, et l'appelant rappelle après chaque action, donc le plan est reconstruit de zéro à
  chaque pas, sur le plateau que les dés ont laissé. `rankPlans` expose les plans entiers avec leur
  phrase (« walk to (7, 1), then dig in »), `rankActions` les replie sur leur première action.
- **La note d'un plan** est la valeur de l'action depuis la case d'arrivée, aux mêmes appétits
  qu'avant, plus `positionValue` de la case où le plan finit moins celle de la case de départ,
  moins les attaques d'opportunité des deux trajets (`avoidOpportunity`). `positionValue` est
  calculée une fois par case et par décision. Les quatre fiches de `ai/roles/` ne changent pas de
  rôle : ce sont toujours les données.
- **Les actions depuis une case où l'unité n'est pas encore** sont demandées au moteur :
  `actionOptionsAt(arena, state, unit, cell)` dans `legalActions.ts`, la moitié positionnelle de
  `legalActions` sortie en fonction, qu'il appelle lui-même pour la case réelle. L'IA n'a donc pas
  sa propre copie des règles d'adjacence, de portée et de ligne de vue. Une frappe ou une
  bousculade n'est planifiée **après une marche** que sur une cible qui n'était pas déjà à portée :
  marcher d'abord ne rend jamais la même frappe meilleure, et le plan « frapper puis marcher »
  existe déjà.
- **Un lancer (passe, tir) se note sur le lancer seul** : le terrain gagné par une passe est lu
  depuis la case où le tour a commencé, pas depuis la case d'arrivée, sinon un pas en avant comptait
  comme une passe plus longue ; chaque case marchée avant le lancer coûte 0,25 point, du mouvement
  que le lanceur n'aura plus après ; le repli après un lancer n'est pas planifié, le plan reconstruit
  après la passe s'en charge avec le plateau vrai. Le gardien qui a une passe légale depuis sa case
  **lance sans bouger** (écart 54) ; sans ligne il va à la case la plus proche de sa bouche qui en
  donne une, chaque case de distance à la bouche coûtant 0,5 point (`RELAUNCH_STEP`), jamais de
  Dash pour ça : c'est l'ancien `relaunchCandidates`, devenu un plan ordinaire.
- **Le Dash** est un plan « dash, puis marche de 16 cases », noté `positionValue` de l'arrivée
  **avec l'Action dépensée** (le chasseur de Spark ne compte pas la prise sur la case du Spark
  qu'il atteint en Dash) moins la case de départ moins les attaques d'opportunité. Il concourt à
  valeur faciale contre les plans qui dépensent l'Action, et contre la marche simple, qu'il ne bat
  que s'il achète du terrain : **un Dash qui n'achète rien n'est pas joué**, à égalité le plan le
  plus court l'emporte. Interdit quand une frappe, une bousculade ou un Cracker est à portée, sauf
  vers une case adjacente au porteur adverse (la presse, plancher `pressCarrier`) ou à deux cases
  du porteur allié (le mur du Breaker, plancher `block`) quand une marche simple n'y arrive pas.
  `w.dash` n'est plus lu.
- **Jamais l'Action en poche** : comme le Dash vaut au moins la marche simple dès qu'une case de
  plus rapporte quelque chose, et qu'une cible à portée produit toujours un plan qui la frappe,
  l'Action ne reste en poche que lorsque rien d'utile n'est légal. Mesuré sur trois matchs
  d'auto-jeu : 5, 0 et 2 tours sur 132 à 135 contre 32 sur 136 dans la partie de Jérôme, avec 32
  à 40 Dash par match.
- **Dodge** reste un plan de dernier recours : abîmé de moitié et aucun plan ne frappe, ne
  bouscule, ne passe ni ne tire ; il concourt alors au score contre le Dash. **Disengage** est le
  plan « disengage, puis marche vers la meilleure case sans pénalité » pour un porteur pressé.
- **Le gardien** : `restNearness` dans `evaluate.ts`, distance à `arena.spec.starts[team][0]`
  plus distance à la bouche, lue sur deux fois la longueur du terrain pour garder la pente de
  `guardFurnace` ; la fiche porte `rest: 1` pour le Bulwark et 0 ailleurs. « Rentrer puis se
  planter » est le plan `[move, brace]`, noté gain de la case plus `brace` ; un Bulwark déjà
  planté qui bougerait rend `brace`, ce qui ne se lit qu'au deuxième pas du même tour.
- **Vitesse** : 2,7 ms par décision en moyenne et 18 ms au pire sur un match vétéran, contre
  moins d'une milliseconde avant ; un match d'auto-jeu dure 1,1 s au lieu de 0,5 s, donc le sweep
  prend environ 11 minutes au lieu de 5. `reachableCells` a perdu son tri par itération pour une
  file à seaux (sous-agent Sonnet), ce qui profite aussi au client.

## C12. Décisions du 2026-10-11 après la partie à la porte de 2H.9, **sous-phase 2H.10, dans le code et en ligne depuis le 2026-10-11 (moteur 6, `resolve-action` v16, `create-match` v14)**

> Écrites par le fil principal (Fable 5.1) sur les deux retours de Jérôme en chat après sa partie
> sur le moteur 5 avec le plan de tour (star, 50 à 0, match `0291a651`, consigné tour par tour
> dans `docs/matches/2026-10-11-0291a651/`), puis sur ses réponses, le même jour dans le chat
> suivant, à l'analyse de cette partie décision par décision (`analyse-2H10.md` dans le même
> dossier, par un agent général Opus 5.5 effort high, relue par le fil principal). Tout ce qui
> suit est **dicté par lui et validé mot pour mot avant la première ligne de code**. L'écart 55
> change l'échelle sans changer la forme de l'état ; mais la case de début de tour, décidée en
> fin de section, entre dans l'état du tour : **`ENGINE_VERSION` monte à 6**, les matchs ouverts
> du moteur 5 sont archivés au redéploiement. C'est le seul changement de forme de 2H.10.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 55 | Écart 51 : « Un humain joue en premier dans son rôle » | **Un humain joue en dernier dans son rôle.** Quand un humain tient un rôle, il passe après toutes les IA de ce rôle dans son équipe : un Striker humain joue le troisième des trois Strikers. Le reste de l'échelle ne bouge pas : Trajector, Strikers, Breakers, Bulwark, et l'ordre des IA d'un même rôle par la situation. Plusieurs humains du même rôle restent ordonnés entre eux par le d20 du coup d'envoi | Jérôme, le 2026-10-11, retour 2 : jouer en premier de son rôle le prive de la lecture de ce que ses coéquipiers du même rôle font avant lui | **À faire en 2H.10**, fil principal, `buildTurnOrder` dans `engine/initiative.ts` |
| IA | Le Trajector ne prend pas la balle au coup d'envoi (C10, `chaseKickoff` 0) et rien ne dit où il va | **Au premier tour, le Trajector ne recule jamais : toujours vers l'avant.** Son plan de tour au round du coup d'envoi finit au moins aussi avancé vers la bouche adverse qu'il a commencé, jamais plus près de sa propre bouche | Jérôme, le 2026-10-11, retour 1. Lu dans le match : au round 1 son Trajector a dashé de `(12, 14)` à `(5, 1)`, treize cases vers son propre but, parce qu'avec `chaseKickoff` à zéro et tout le monde à huit cases du ballon la seule pente restante était `guardFurnace` | **À faire en 2H.10**, fil principal, règle d'IA dans `ai/` |
| 56 | Rien ne retient la case où un tour a commencé ; C11 note un lancer « depuis la case où le tour a commencé », ce que le plan reconstruit après chaque pas ne peut pas lire | **L'état du tour porte la case de départ du tour**, posée quand le tour s'ouvre. Aucune règle de jeu n'en dépend : c'est une mémoire pour l'IA et pour le fichier de match | Jérôme, le 2026-10-11, sur la recommandation du fil principal. Au round 2, Tobb a marché sept cases pour une passe de 5 cases vers l'avant, puis, le plan relu depuis la nouvelle case, a passé 5 cases en arrière. Sans cette case, toute note « depuis le début du tour » est impossible à écrire | **À faire en 2H.10**, fil principal, `TurnState` dans `engine/types.ts`, **`ENGINE_VERSION` 6** |

**Ce que l'analyse de la partie a montré**, pour mémoire. Le Spark a fait 40 des 50 points : le
chasseur de B est arrivé trois fois sur le Spark sans Action, deux fois après un Dodge et une
fois après un Dash, et n'a jamais pu le tenter. Douze Dash n'ont rien acheté, dont celui du
gardien A au round 4, parti « sur le porteur » contre sa laisse et resté sur place. Treize
bousculades sur dix-sept visaient un non-porteur. Les Breakers ont frappé le porteur à la batte
quand il fallait le bousculer. A n'a tiré qu'une fois en dix rounds et B deux fois, parce que la
chaîne laisse mourir le ballon chez les Breakers, qui jouent après les Strikers. Les attaques
d'opportunité se payaient 4 points quels que soient l'attaquant et les PV. Deux faits de règle,
constatés sans décision : l'équipe qui a l'humain joue juste après le Spark à chaque round, donc
A a eu la première main sur chaque dérive ; et le Spark a rebondi trois rounds de suite dans la
poche de la ligne 19, entre le bord et la caisse `(4, 19)`, en revenant sur sa case, règle 36b
appliquée.

**Les concepts dictés par Jérôme le 2026-10-11, après l'analyse.** Ses mots.

- **Les places libres autour du porteur.** Autour du porteur il y a huit cases. Chaque case
  libre est une place pour un adversaire : une batte, une bousculade, et une attaque
  d'opportunité dès que le porteur bouge au round suivant. **Chaque allié collé au porteur prend
  une de ces places** : deux alliés collés, c'est six places au lieu de huit, deux attaques et
  deux attaques d'opportunité de moins. La valeur d'un allié adjacent est celle-là, une place
  prise, qu'il bloque une route ou non ; le côté et la ligne droite vers la menace ne comptent
  pas. Le porteur lui-même **ne cherche pas** une case à peu de voisines libres.
- **Le Breaker, en attaque, se colle au porteur d'abord**, avant le Cracker et avant toute
  frappe sur un retardataire, dès que le porteur allié est à portée de Dash d'un adversaire. Il
  ne quitte pas ce contact pour une action dont le recul l'en éloignerait. Au round 1, un Breaker
  a préféré d'un demi-point un Cracker à huit cases, et son recul l'a rejeté à six cases de
  Tacker, que quatre adversaires ont encerclé.
- **Le Striker se colle au porteur seulement si ça ne coûte rien à son relais** : s'il peut
  finir adjacent au porteur en restant une case que le porteur peut servir, à vue, à portée,
  devant ou sur sa ligne, il le fait. Dès que le relais en souffre, le relais passe avant.
- **Le Breaker porteur, exception à la chaîne.** D'abord l'autre Breaker, s'il n'a pas joué et
  que sa marche porterait le ballon plus près de la bouche adverse que là où le porteur se tient.
  Sinon **un Striker plus près de la bouche adverse que lui, même s'il a déjà joué ce round,
  pourvu que la passe soit sans intercepteur.** Sans l'un ni l'autre, il avance et ne tire
  quasiment jamais. La définition du dernier maillon ne change pas pour les autres rôles.
- **Le Spark reste au Trajector seul.** Un Striker qui a le Spark à portée de marche, Action en
  main, ne le tente pas, même quand son Trajector est hors jeu ou vient de le rater. Confirmé
  contre cinq occasions à 45 % dans la partie.
- **La presse en Dash du Striker ne se joue que par une route sans allonge adverse** : s'il
  existe une route jusqu'au contact du porteur qui ne traverse aucune allonge adverse, il la
  prend ; sinon pas de Dash de presse. Et **cette route optimisée vaut pour tout déplacement de
  l'IA** : elle cherche d'abord la route qui ne provoque aucune attaque d'opportunité, quitte à
  faire le tour tant que le mouvement le permet, et ne tombe sur la ligne droite que faute de
  mieux. « Pas tout droit comme un con. »
- **La case de début de tour**, écart 56, pour que la note d'un lancer tienne avant comme après
  la marche. Choisie contre la demi-mesure qui n'aurait corrigé que l'égalité.

**L'IA, quatrième passe : les ajustements retenus**, par rôle, triés par priorité, validés par
Jérôme le 2026-10-11. Aucune constante de règle ne bouge. Les poids viennent de ces mots.

*Commun.*

1. **Une case ne vaut l'action qu'elle débloque que si l'Action reste.** Le repli après une
   action et le Dodge ne comptent plus la prise du Spark ; « marcher puis attraper » devient un
   plan ; la prise du Spark compte dans « rien d'autre à faire » avant un Dodge.
2. **Ramasser puis lancer dans le même tour** : le ramassage est gratuit, le lancer depuis la
   case du ballon se note comme les autres « marche puis lancer ».
3. **Le porteur finit son tour là où le moins d'adversaires peuvent venir le bousculer avant
   qu'il rejoue**, les alliés collés réduisant ce compte, et quand personne ne l'atteint il
   garde la balle pour un tir propre au tour suivant plutôt qu'un tir à désavantage tout de
   suite. C'est « sans perdre la balle » de C9 qui prime sur « le plus vite possible » de C10
   Striker 3.
4. **Contre le porteur, on bouscule.** La batte ou le Cracker ne valent une récupération que si
   le coup peut l'évacuer.
5. **Bousculer un non-porteur ne vaut rien pour un Striker ou un Trajector** : s'il n'y a que
   ça, c'est une attaque. Seule une cible légitime pour son rôle interdit le Dash.
6. **La balle au sol ne se laisse qu'à un coéquipier qui n'a pas encore joué** ; sinon on la
   ramasse, et jamais une ligne de Cracker avant un ballon libre.
7. **Un relais ne vaut que si le porteur aura le droit de le servir.**
8. **Une attaque d'opportunité se paie à ses dégâts attendus rapportés aux PV** de l'unité qui
   la prend, et une route qui donne une chance sérieuse d'évacuation s'écarte.
9. **Le plan se tient d'une action à l'autre** : la frappe de Cracker depuis une case marchée se
   calcule avec l'unité déjà sur cette case ; le dernier maillon ne passe jamais en arrière sur
   une égalité, le terrain gagné tranche avant l'identifiant ; la passe après une marche se juge
   depuis la case de début de tour, écart 56.
10. **Une passe préfère un Striker ou le Trajector à un Breaker** à égalité, les mots de C9.
11. **Tout déplacement prend la route qui évite les allonges adverses** quand le mouvement le
    permet.

*Trajector.*

1. Debout sur le Spark avec son Action, il l'attrape, jamais un Dodge ni un Dash avant.
2. **Il vise la case où le Spark sera après la prochaine dérive**, qui se joue au début du round
   avant tout tour et sans dé, et ne finit jamais son tour sur le Spark sans l'avoir tenté.
3. Pas de Dash pour finir au contact du porteur : en défense il bouscule s'il arrive en
   marchant, sinon un Cracker ou rien.
4. En attaque sans la balle, pas de bousculade d'un non-porteur.
5. Au premier tour, il ne recule jamais (ci-dessus).

*Striker.*

1. Porteur, il avance sans perdre la balle, et garde pour un tir propre au tour suivant quand
   personne ne l'atteint.
2. En défense il bouscule le porteur ; la batte seulement si elle peut l'évacuer.
3. Il ne bouscule pas un non-porteur.
4. Il ne court pas en relais d'un porteur qui ne pourra pas le servir.
5. Il ne paie pas une route à travers des Breakers pour quelques points de position, et sa
   presse en Dash ne part que par une route sans allonge adverse.
6. **Étalé, jamais collé à un coéquipier**, C10 Striker 5, qu'aucun terme n'écrivait : au round
   3 les trois Strikers B ont fini alignés en `(3, 12)`, `(4, 12)` et `(5, 12)`.
7. Il se colle au porteur seulement si son relais n'en souffre pas.

*Breaker.*

1. En attaque, collé au porteur d'abord, une place prise autour de lui, avant le Cracker et
   avant tout retardataire ; il ne quitte pas ce contact pour une action dont le recul
   l'éloignerait.
2. En défense, le porteur se bouscule.
3. Pas de Dash « sur le porteur » ; **frapper l'adversaire proche seulement quand le porteur est
   hors de portée de marche** : finir à côté d'un Striker valait 70 et finir à côté du porteur
   55, contre l'ordre de C10 Breaker 3 puis 4.
4. Porteur : l'autre Breaker s'il porte plus loin, sinon un Striker devant lui même s'il a joué,
   sans intercepteur.
5. Il ne laisse la balle qu'à un Striker ou au Trajector qui n'a pas joué.
6. Porteur, il fuit la ligne des Crackers : un Breaker qui porte ne pare pas (écart 47).
7. Le mur se pose là où sera le porteur : s'il n'a pas encore joué, sur sa route vers la bouche.
8. Loin du porteur en attaque, il Dash vers lui même sans arriver à deux cases.
9. Strikers d'abord, puis Breakers, puis Trajector, aussi pour le Cracker envoyé.

*Bulwark.*

1. **La laisse tient pour tout plan, Dash compris** : jamais de Dash de presse hors de ses
   quatre cases. Au round 4 le gardien A a dashé « sur Tobb », à neuf cases de sa bouche, et
   n'a pas bougé, Action brûlée au lieu de se planter.
2. Rien d'autre : relance, plantage et blocages ont été justes dans la partie.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`. `ENGINE_VERSION` 6 pour la
seule case de début de tour. L'IA change dans `ai/chooseAction.ts`, `ai/evaluate.ts` et les
quatre fiches ; l'échelle dans `engine/initiative.ts` ; la route dans `engine/rules/movement.ts`
pour l'IA seule, le client gardant sa ligne droite au clic. **Un seul sweep à la fin, si Jérôme
le demande**, contre `09` §12, en comptant onze minutes. Les 475 tests sont le filet, le test
des cinquante millisecondes fait foi sur la vitesse.

**Comment la quatrième passe est codée**, par le fil principal (Fable 5.1) le 2026-10-11, pour
relire le code contre les mots. **Codé en 2H.10.**

- **Un plan se lit à sa fin, Action dépensée.** Chaque case d'arrivée est notée par
  `positionValue(board, cell, false)` : une case ne vaut l'action qu'elle débloque que par le plan
  qui la prend. « Marcher sur le Spark puis l'attraper » est un plan (`catchSpark` depuis une case
  marchée, par `actionOptionsAt`), « Dodge puis marcher sur le Spark » ne vaut plus la prise, et
  la prise compte parmi les actions qui interdisent le Dodge. Finir à côté d'une proie sans
  Action ne vaut rien (`hunt` lu seulement avec l'Action). Le chasseur vise `Board.sparkNext`, la
  case où `sparkRun` posera le Spark à la prochaine dérive, et finir sur sa case sans l'avoir
  tenté vaut moins que rien.
- **La frappe recule.** Un plan de batte ou de Cracker finit sur la case de recul
  (`recoilDestination`, écart 33), et le repli part de là. La frappe de Cracker depuis une case
  marchée se calcule sur le plateau où l'unité est déjà sur cette case (`stateWithUnitAt`).
- **Ramasser puis lancer** : `throwsAfterPickup` demande au moteur les lancers d'un porteur
  hypothétique sur la case du ballon, et le plan `[move, grabPayload, pass]` vaut le ramassage
  plus le lancer.
- **La sécurité du porteur** : `carrierThreats` dans `evaluate.ts` liste les adversaires qui
  rejouent avant le porteur (pas encore joué ce round, ou leur camp ouvre le round suivant par
  `sideOrder`) avec les cases où leur marche les amène ; `carrierExposure(cell)` somme leurs
  chances de bousculade (`contestChance`) sur les premiers d'entre eux, jamais plus que de cases
  libres autour de la case, un allié adjacent en retirant une. Poids `carrierSafety` (Striker 60,
  Trajector 60, Breaker 50, Bulwark 0). Quand l'exposition est nulle, la case vaut en plus
  `shoot × HOLD_FOR_CLEAN (0,8) × bestShotNextTurn`, le meilleur tir à une marche de là. Un
  lancer reçoit en retour `relief`, l'exposition de la case de départ, puisque le ballon parti
  n'expose plus personne.
- **Contre le porteur on bouscule** : la batte sur un porteur vaut `stripCarrier ×
  batEvacuates(might, hp)`, le Cracker `stripCarrier × crackerEvacuates(target)` (3d6, jet de
  sauvegarde compris), plus `prey[rôle]` aussi pour le Cracker. La bousculade d'un non-porteur
  vaut `shove × shoveBystander` (Striker 0, Trajector 0, Breaker 1, Bulwark 1).
- **La place prise** : `block` note la proximité à `Board.wardLine`, la case du porteur s'il a
  joué, sinon sa case et les huit cases de sa route vers la bouche, chacune valant plus loin sur
  la route ; plus de côté ni de ligne droite. Poids `block` 80 Breaker, 15 Striker, 10
  Trajector ; `wardThreatened` le réduit à 0,3 quand aucun adversaire n'est à portée de Dash du
  porteur. Le Breaker loin du porteur Dash vers lui dès que le Dash referme une marche de l'écart
  (plancher `block`). `spread` (Striker 10) retire par coéquipier non-porteur adjacent.
- **Le relais** : `outlet` et `laneCover` comptent `UNSERVED_OUTLET` (0,3) quand le porteur n'a
  pas le droit de servir cette unité ce round (`Board.carrierCanServe` : porteur déjà joué,
  dernier maillon, ou Breaker porteur devant un Striker). Une passe à un receveur qui n'a pas
  joué est notée sur le tir qu'il aura après sa marche (`bestShotNextTurn` du receveur), et le
  terrain gagné est pondéré par `receiver` du rôle receveur (Striker 1, Trajector 1, Breaker
  0,8, Bulwark 0,4). `chainException` (Breaker 1) ouvre la passe à un Striker devant lui déjà
  joué, sans intercepteur. Le dernier maillon perd `BACKWARD_STEP` (0,5) par case en arrière.
- **Les attaques d'opportunité** : `Planner.exposure` somme, par attaquant provoqué, sa chance
  de toucher fois ses dégâts moyens, rapportés aux PV de l'unité, fois `avoidOpportunity`
  (Striker 40, Trajector 50, Breaker 20, Bulwark 30), plus `LETHAL_ROUTE` (100) quand la somme
  atteint les PV. Un Breaker porteur craint la ligne des Crackers à `CARRIER_CRACKER_FEAR`
  (14).
- **Les routes** : `safeReachableCells` et `safePathTo` dans `engine/rules/movement.ts`
  (sous-agent Sonnet effort élevé, récrits sur des indices numériques par le fil principal)
  donnent, pour chaque case atteignable, la route qui provoque le moins d'attaques d'opportunité
  puis coûte le moins de pieds, sur un balayage par (case, pieds dépensés) ; l'ensemble des cases
  est celui de `reachableCells`. Le Planner ne lit plus que ces routes, pour la marche, le Dash et
  le repli. Le Dash de presse (`pressDash`, Striker seul) n'est offert que pour une case au
  contact dont la route provoque zéro attaque, et jamais hors de la laisse.
- **La balle au sol** : `keenerMateNear` ignore un coéquipier qui a déjà joué ; `parryPost` vaut
  zéro quand un ballon libre est à une marche.
- **La chaîne lit la case de début de tour** (`turn.startedAt`, écart 56) pour le terrain gagné,
  avant comme après la marche.
- **Vitesse** : 2,7 ms par décision en moyenne et 25 ms au pire sur un match vétéran, comme en
  2H.9 ; le test des cinquante millisecondes passe.

## C13. Décisions du 2026-10-12 après la partie à la porte de 2H.10, **sous-phase 2H.11, dans le code et en ligne depuis le 2026-10-12 (moteur 6, `resolve-action` v17, `create-match` v15)**

> Écrites par le fil principal (Fable 5.1) sur la lecture **round par round et joueur par joueur** de
> la partie de Jérôme sur le moteur 6 (star, 30 à 50, match `a17c22a5`, consigné dans
> `docs/matches/2026-10-12-a17c22a5/`, zéro écart d'événement, zéro décision d'IA différente du
> dépôt). La lecture s'est faite sur un **visualiseur du match** produit par `dump-match.ts` depuis
> le gabarit `scripts/match-viewer.html` (`viewer.html` à côté de `match.md`, aussi publié en
> artefact privé) : le terrain dessiné, une flèche par tour en vue du round, et pour chaque
> décision les **huit** plans que l'IA du dépôt classe, avec leur note. Jérôme a jugé chaque joueur
> de chaque round ; les réponses du fil principal ont lu les huit plans et le code. **Cette lecture
> complète n'est pas à refaire à chaque partie : sur sa demande, ou sur proposition du fil
> principal.** Tout ce qui suit est dicté par lui et validé point par point avant la première
> ligne de code, sauf les trois points ouverts de la fin, qui sont des constats du fil principal
> qu'il n'a pas encore tranchés.
>
> Un seul écart de règle, 57. Il ne change ni la forme de l'état ni celle des événements :
> **`ENGINE_VERSION` reste 6**, les fonctions sont à redéployer. Le reste est l'IA.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 57 | Attraper le Spark : Action, sur sa case, DC 20 (B9, écart 49) ; rien n'interdit la tentative à un porteur | **Un porteur ne tente jamais le Spark : les mains sont prises.** `legalActions` ne propose plus la prise à une unité qui tient le ballon, humain comme IA | Jérôme, le 2026-10-12, round 10 : Harrow porteur a tenté le Spark à 20 %, raté, et n'avait plus d'Action pour le Dash qui le mettait hors d'atteinte ; le Cracker renaissant l'a touché pour 14 sur la case où il s'est replié | **Fait en 2H.11**, fil principal : `actionOptionsAt` dans `legalActions.ts` ne propose pas la prise à une unité qui tient le ballon, et `applyCatchSpark` dans `reduce.ts` la refuse (« is holding the Payload »). 2 tests dans `legalActions.test.ts`, sous-agent Sonnet |

**Ce que la partie a montré**, pour mémoire. Dix tentatives de Spark hors Trajector (Osric 2,
Kregg 3 dont une réussie sur un 20 naturel au round 8, Sarn 2, Harrow 2 dont une en portant la
balle, Gullo 1), parce que le plan « marcher puis attraper » de 2H.10 était offert à tous les
rôles. Au round 1 les deux Breakers A ont marché huit cases pour frapper un Cracker, puis abandonné
la frappe pour un Dash « vers Tacker » qui ne pouvait pas l'atteindre. Les relais des Strikers et
du Trajector étaient notés contre la case **actuelle** du porteur, qui n'avait pas encore joué,
donc valaient zéro dès qu'il fallait courir devant. Tacker au round 6 et Dolm au round 7 avaient un
tir à 65 % à portée de marche que l'IA classait neuvième ou plus loin derrière des passes. Au
round 4 Thessa a reculé sur la balle après sa frappe et l'a ramassée sans pouvoir la passer. Au
round 5 Brann a marché sept cases **en arrière** pour rendre légale une passe à un Striker « devant
lui ». Au round 8 Thessa, chasseuse, s'est mise exactement sur la case où la dérive allait poser le
Spark : le code avait raison. L'attaque d'opportunité d'un Trajector sur un Breaker valait 1,4
point. The House n'a rien joué de faux aux rounds 3, 5, 9 et 10.

**Les poids changés par Jérôme**, le 2026-10-12.

| Poids | Avant | Après |
|---|---|---|
| `shove`, Breaker | 50 | **30** |
| `stripCarrier`, les quatre rôles | 70 / 80 / 80 / 70 | **150** |
| `screenCarrier`, Breaker | 0 | **80** |
| `carrierSafety`, Breaker | 50 | **80** |
| `guardStrike`, Breaker | 50 | **150** |
| `batCracker`, Striker | 18 | **8** |
| `batCracker`, Trajector | 14 | **5** |
| `wantsEscort`, Breaker | 1 | **0** |
| `shoot`, Striker | 120 | **150**, en plus de `relief` sur le tir (point 13), tranché sur question fermée |

**L'IA, cinquième passe : les décisions, par thème puis par rôle, triées par priorité.** Les mots
sont ceux de Jérôme, le numéro du round dit d'où ils viennent.

*Le Spark.*

1. **Aucun rôle sauf le Trajector ne va de lui-même sur la case du Spark.** Le plan « marcher
   puis attraper » n'existe que pour le rôle dont `chaseSpark` est positif. Un Striker, un Breaker
   ou un Bulwark qui se trouve sur la case du Spark par hasard, poussé ou reculé, le tente, Action
   en main et mains libres (C10 commune 1 tient pour lui). Un porteur jamais, écart 57.
2. **Le chasseur, Action dépensée, va vers la case où le Spark sera après la prochaine dérive**,
   comme aujourd'hui (round 8), jamais vers un relais : il joue en premier après la dérive et
   chaque case compte pour arriver dessus avec son Action.

*Commun aux rôles de champ, le plan de tour.*

3. **Le relais se juge contre la case où sera le porteur**, pas contre celle où il est : s'il n'a
   pas encore joué, sa route de huit cases vers la bouche, la même ligne que le mur du Breaker en
   C12 (`wardLine`). Vaut pour `outlet`, `laneCover` et `rejoin`, Striker et Trajector (round 1,
   Kregg ; round 2, Thessa, Kregg, Osric).
4. **Le Dash d'approche du porteur adverse est un plan pour les trois rôles de champ**, noté sur la
   distance refermée, même s'il n'arrive pas au contact, et il concourt contre la batte et le
   Cracker. **C12 Trajector 3 (« pas de Dash pour finir au contact du porteur ») et C12 Breaker 3
   (« pas de Dash sur le porteur ») sont remplacés par ce point**, écrits à une époque où la route
   sûre n'existait pas (round 1, Thessa Grapple, Gullo, Corvo, Brann ; round 8, Harrow, Sarn).
   Les valeurs font que frapper un Cracker n'est **presque jamais** une bonne option pour un
   Striker ou un Trajector : les `batCracker` ci-dessus.
5. **En attaque sans la balle, un Striker ou un Trajector ne frappe que faute de mieux** : la
   batte et le Cracker sur un non-porteur valent 0,2 fois leur valeur en attaque. Le relais garde
   sa place **même quand le porteur a un tir à portée de marche**, pour la relance et le rebond
   d'un tir manqué (round 2 ; round 6, question tranchée).
6. **Un plan « marcher puis frapper » se tient jusqu'à la frappe.** Le plancher du Dash de mur
   prend le même facteur de menace que le mur, et ne s'offre que pour un Dash qui referme
   réellement l'écart avec le mouvement restant (round 1, Sarn et Harrow).
7. **Après un Dash, la marche va au bout de ce que le Dash a acheté vers sa cible**, jamais quatre
   cases sur huit (round 1, Sarn).
8. **Le Disengage s'ouvre à tout rôle pressé**, porteur ou non : « disengage, puis marche » existe
   dès qu'une unité commence son tour au contact d'un adversaire et qu'aucune route sans allonge
   n'atteint la case voulue ; il coûte l'Action et concourt au score (round 3, Thessa, Osric,
   Kregg).
9. **Un receveur qui n'a pas joué peut être derrière de plus de trois cases, jusqu'à huit**, son
   propre déplacement, qu'il soit ou non le tout prochain à jouer. La passe se note sur le
   terrain qu'il portera, son déplacement moins son retard. Au-delà de huit, la balle recule même
   après sa marche (round 4, Thessa vers Osric à quatre cases).
10. **Après l'Action dépensée, la case du ballon vaut une fin de tour de porteur**, terrain et
    sécurité, jamais le poids du ramassage : « reculer sur la balle » n'est plus un plan de
    ramassage. Ramasser puis lancer, Action en main, garde sa priorité (round 4, Thessa).
11. **Devant ou derrière se juge depuis la case de début de tour** (écart 56), pour la chaîne comme
    pour l'exception du Breaker porteur, et **un lancer en arrière coûte `BACKWARD_STEP` pour tout
    lanceur**, pas seulement le dernier maillon. Un porteur ne marche jamais en arrière pour
    rendre une passe légale (round 5, Brann).
12. **Un porteur ne recule jamais, Dash compris, sauf si aucune case devant lui n'est moins
    exposée que celle où il se tient.** Le Breaker porteur sans passe légale avance vers la bouche
    (round 5, Brann et son Dash vers son propre but).
13. **Le tir est une délivrance comme la passe : il reçoit `relief`**, l'exposition de la case de
    départ rendue au lanceur. Et une passe ne vaut jamais plus que le tir propre que le lanceur a
    lui-même après sa marche (round 6, Tacker ; round 7, Dolm : 78 contre 155 et 224).
14. **La passe se note aussi sur l'exposition du receveur à l'arrivée**, le compte de voisines
    libres qu'un adversaire peut atteindre avant qu'il rejoue, comme pour le porteur en C12 (round
    2, la passe à Sarn que Tacker a refusée ; round 5, la passe de Brann dans le paquet).
15. **Une attaque d'opportunité provoquée coûte au moins 5 points**, quels que soient l'attaquant
    et les PV, et à valeur égale le plan qui en provoque le moins l'emporte. La formule de C12
    commune 8 reste au-dessus du plancher (round 9, Sarn, 1,4 point pour l'allonge d'un
    Trajector).
16. **Les menaces sur le porteur tiennent compte de la laisse du gardien adverse** : il ne compte
    que sur les cases à quatre cases ou moins de sa bouche (round 10, Harrow arrêté en (10, 33)
    au lieu de (10, 37)).
17. **L'IA lit le round et le score.** Au dernier round, l'équipe qui a la balle et qui mène ou
    égalise **joue la possession** : le porteur s'éloigne de tout adversaire, Dodge ou Dash, ne
    passe qu'à un receveur moins exposé que lui et ne tire qu'à portée propre. L'équipe qui n'a
    pas la balle **ne court plus après ce qu'elle ne peut pas atteindre avant le sifflet** : elle
    frappe et bouscule ce qui est à portée, et seul le Trajector tente le Spark. Avant le dernier
    round rien ne change. La mort subite se joue comme un dernier round par les deux camps (round
    10, Osric ; les cinq battes de The House).
18. **À égalité, la place prise à côté du porteur se choisit entre le porteur et l'adversaire le
    plus proche.** Départage seulement (round 3, Harrow en (0, 27) plutôt que (1, 27)).

*Breaker.*

19. **En attaque, la protection du porteur passe devant le Cracker, menacé ou non** : la place
    prise à son contact garde sa valeur pleine quelle que soit la distance des adversaires, et le
    Cracker ne vient qu'après. Le facteur 0,3 de `wardThreatened` disparaît (round 1, Sarn et
    Harrow partis frapper un Cracker à huit cases de Tacker).
20. **En défense, frapper un adversaire atteignable passe avant toute posture.** L'écran de C10
    Breaker 5 (« le chemin des adversaires vers ses Strikers ») **disparaît** : l'Action dépensée et
    personne à frapper, le mouvement restant va **vers le porteur adverse**, adjacent ou au plus
    près, puis sur la ligne des Crackers (round 2, Vesk Bellows ; round 8, Harrow et Sarn collés à
    des coéquipiers inutiles).
21. **La proie se juge sur la chance de l'évacuer** : dégâts attendus de la batte rapportés aux PV
    de la cible, à la place de l'ordre fixe Strikers, Breakers, Trajector de C10 Breaker 4 et C12
    Breaker 9 (`prey` devient une fonction, plus une table) (round 2, Brann devant Sarn et
    Thessa).
22. **Pendant la relance adverse, la proie est le receveur probable**, un adversaire que le gardien
    peut servir après sa propre marche, à vue et à portée : il compte double, et l'Action
    dépensée le Breaker finit son tour collé à lui (round 6, Sarn ; round 8, Brann).
23. **Le poste de parade vaut les dégâts qu'il épargne**, dans la même monnaie que l'attaque
    d'opportunité : dégâts attendus du Cracker rapportés aux PV du coéquipier visé, contre dégâts
    attendus des allonges rapportés aux siens (round 4, Harrow, cinq allonges et 17 PV pour en
    épargner 5 à Thessa).

*Trajector.*

24. Les points 1, 2, 3, 4, 5 et 8 ci-dessus ; **C12 Trajector 3 est récrit par le point 4**.

*Striker.*

25. Les points 3, 4, 5, 8 et 13 ; rien de propre au rôle en plus.

*Bulwark.*

26. Rien : relance, plantage et blocages justes dans la partie. Le blocage marche depuis toute
    case à deux cases ou moins de la bouche, (7, 1) et (8, 1) sont équivalentes.

*Trois constats du fil principal, tranchés par Jérôme sur questions fermées le 2026-10-12.*

27. **La ligne du Cracker pour un porteur se calcule vers chaque case d'arrivée candidate**, le
    ballon bougeant avec lui. Aujourd'hui elle est lue vers la case où le ballon est maintenant,
    là où le porteur se tient : au round 10 (10, 30) et (3, 30) étaient notées pareil, et le
    Cracker 2 a roulé huit cases sur la première, 14 PV.
28. **Le chasseur de Spark garde l'exception du ballon au sol** : « ramasser puis lancer » lui
    reste permis quand le ballon est à portée de marche, avec le bonus `chaseSpark` sur la passe
    pour qu'il s'en débarrasse aussitôt (round 6, Thessa ramasse et sert Tacker, qui marque).
    C'est la seule entorse à C10 Trajector 1, « le Spark et rien d'autre ».
29. **Une parade n'explose jamais sur le pareur.** Quand aucune face de l'arc n'épargne tout le
    monde, `parryDirection` prend la face qui touche le coéquipier le plus solide en PV, jamais
    celle qui revient sur le pareur (round 7, Harrow en (11, 19) : les trois faces touchaient un
    coéquipier, deux d'entre elles lui-même parce que l'écart 36b renvoie un Cracker en arrière
    sur sa propre diagonale quand il touche un pilier par le coin seul). L'écart 36b ne change
    pas ; seul le repli du choix de face change, dans `rules/ordnance.ts`.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`. `ENGINE_VERSION` reste 6.
L'écart 57 dans `engine/legalActions.ts`, le point 29 dans `engine/rules/ordnance.ts` ; l'IA dans
`ai/chooseAction.ts`, `ai/evaluate.ts` et les quatre fiches ; les fonctions à redéployer sur le
feu vert de Jérôme. **Un seul sweep à la fin, si
Jérôme le demande**, contre `09` §12, en comptant quatorze minutes depuis cette passe. Les 503
tests sont le filet, le test des cinquante millisecondes fait foi sur la vitesse, et le
visualiseur sert à relire la partie suivante.

**Comment la cinquième passe est codée**, par le fil principal (Fable 5.1) le 2026-10-12, pour
relire le code contre les mots, poids par poids. **Codé en 2H.11.** Les neuf poids de Jérôme
sont dans les fiches tels quels ; ce qui suit dit ce que chaque point a changé dans
`ai/chooseAction.ts`, `ai/evaluate.ts` et les fiches.

- **Le Spark (points 1 et 2, écart 57).** `actionsAt` ne propose la prise depuis une case
  marchée qu'au rôle dont `chaseSpark` est positif, et la boucle des cases ne marque la case du
  Spark comme « une case qui débloque une action » que pour lui ; depuis la case où l'unité se
  tient, tout rôle la tente (C10 commune 1). Le chasseur garde `Board.sparkNext`, et sa case
  sur le Spark ne vaut la prise que les mains libres. `legalActions` et `reduce` refusent la
  prise à un porteur.
- **Le relais contre la case où sera le porteur (point 3).** `carrierStands` donne les cases
  d'où le porteur allié est lu : sa case s'il a joué, sinon chaque case ouverte de `wardLine`,
  sa route de huit cases vers la bouche. `outlet` et `laneCover` prennent le meilleur de ces
  points (portée, vue, terrain gagné, intercepteurs), `rejoin` ne se lit que si aucun point
  n'est à portée de passe, `screenCarrier` lit la proximité au point le plus proche. Les scènes
  de 2H.2 sur la vue et la couverture lisent désormais un Trajector porteur qui a joué.
- **Le Dash d'approche (point 4, `approachDash`, remplace `pressDash`).** `chaseFloor` note une
  case d'arrivée par `pressCarrier` fois la part d'un déplacement qu'elle referme sur le porteur
  adverse, par rapport au plus près qu'une marche simple arrive, et par `pressCarrier` entier
  quand elle finit adjacente par une route qui ne provoque personne (la presse de C10 Striker
  6). Striker, Trajector et Breaker le lisent ; le gardien jamais (laisse). Deux bornes : une
  cible légitime à portée interdit toujours le Dash (C10 commune 3, le mur du Breaker seul
  exempt), et un rôle chasseur (`hunt` positif) ne s'approche pas du porteur tant qu'une proie
  est à portée de marche, parce qu'il la frappe d'abord (point 20).
- **La batte faute de mieux (point 5, `idleSwing`).** Quand son camp a la balle et que l'unité
  ne la porte pas, une batte, une bousculade de non-porteur ou un Cracker sur un adversaire qui
  n'est pas collé au porteur allié valent `idleSwing` fois leur valeur : 0,2 pour Striker et
  Trajector, 1 pour Breaker et Bulwark. Rien ne retire au relais la valeur d'un tir que le
  porteur aurait à portée de marche.
- **Le plan qui se tient (points 6 et 7).** Le plancher du mur et celui de l'approche sont la
  même fonction (`chaseFloor`), lue par le Dash avec l'écart qu'une marche simple laisse, et
  **par la marche qui suit un Dash** (`dashed` : l'Action partie et plus d'un déplacement
  restant) avec l'écart depuis la case où l'unité se tient : la marche va donc au bout de ce
  que le Dash a acheté. Le facteur 0,3 de `wardThreatened` a disparu de `block` comme du
  plancher.
- **Disengage pour tout rôle pressé (point 8).** Le plan « disengage, puis marche » existe pour
  toute unité qui commence son tour adjacente à un adversaire quand la meilleure case
  atteignable par une route qui provoque vaut plus que la meilleure atteignable par une route
  sûre ; noté `disengage × min(1, gain/12) + gain`. Le chasseur de Spark en est exempt : il
  prend l'allonge et part (C10 Trajector 1).
- **Le receveur en arrière (point 9).** Un receveur qui n'a pas joué peut être jusqu'à huit
  cases derrière la case de début de tour, tout prochain ou non ; `potential` note son
  déplacement moins son retard. Au-delà de huit, ou s'il a joué, pas de passe en arrière hors
  dernier maillon, exception du Breaker et relance.
- **La case du ballon, Action dépensée (point 10).** `positionValue` sans Action lit la case du
  ballon au sol comme une fin de tour de porteur, `carrierEnd` : terrain vers la bouche moins
  `carrierSafety × carrierExposure`, les menaces étant désormais construites aussi quand le
  ballon est au sol. Avec l'Action, le plan explicite `[move, grabPayload]` vaut le ramassage
  (`positionValue` avec Action), et `[move, grabPayload, lancer]` comme avant ; aucun des deux
  n'existe quand un coéquipier plus avide qui n'a pas joué est à deux cases (C12 commune 6).
- **Devant et derrière depuis le début de tour (point 11).** `ahead`, pour l'exception du
  Breaker porteur, et `gained` se lisent depuis `turn.startedAt` ; `BACKWARD_STEP` se paie pour
  tout lanceur et plus seulement le dernier maillon.
- **Le porteur ne recule jamais (point 12).** `carrierMayEnd` refuse à un porteur toute case
  d'arrivée plus loin de la bouche adverse que celle où il se tient, pour la marche, le Dash, le
  repli et le Disengage, sauf si aucune case devant lui n'est moins exposée (`noSaferAhead`).
  Le gardien qui relance est exempt.
- **Le tir délivré et la passe bornée (point 13).** Le tir recevait déjà `relief` avec la passe
  (`isThrow`). Ce qui manquait : `mine`, le tir du lanceur dans l'ouverture d'une passe, se lit
  désormais sur le meilleur tir qu'il a lui-même sur une case de sa marche (`ownShot`) et non sur
  la case d'où il lance ; et pour un rôle dont `shoot` dépasse `pass` (le Striker) une passe ne
  vaut jamais plus que `shoot × ownCleanShot`, son meilleur tir propre à une marche. Pas de
  borne pour la relance ni pour le chasseur qui se débarrasse du ballon. `shoot` Striker 150.
- **L'exposition du receveur (point 14).** `receiverExposure` lit, pour un receveur qui a déjà
  joué, les adversaires qui rejoueront avant lui et les places libres autour de sa case, le
  lanceur comptant comme allié adjacent s'il l'est ; un receveur qui n'a pas joué lit zéro, il
  bougera avant eux. La passe perd `carrierSafety × exposition`.
- **Cinq points par allonge (point 15).** `Planner.exposure` vaut au moins `OPPORTUNITY_FLOOR`
  (5) par attaque provoquée, la formule de C12 commune 8 au-dessus ; `Plan.provocations` porte
  le compte et `rank` départage à note égale par le moins de provocations.
- **La laisse du gardien adverse (point 16).** `carrierThreats` ne retient, pour un Bulwark, que
  les cases à `leash` cases ou moins de sa bouche.
- **Le round et le score (point 17).** `Board.lastRound` (round 10 ou mort subite),
  `Board.possession` (notre balle, score égal ou en notre faveur) et `Board.whistle` (leur
  balle). En possession, `carrierEnd` lit la distance à l'adversaire le plus proche à la place
  du terrain, le tir n'est proposé qu'à portée propre, la passe seulement à un receveur moins
  exposé que le lanceur, et un Dodge vaut `carrierSafety × exposition × 0,5` plus le repli. Au
  sifflet, la pente `pressCarrier` et l'approche en Dash disparaissent, seules la case adjacente
  et les frappes à portée comptent. Avant le dernier round, rien ne change.
- **Le départage de la place prise (point 18).** `block` multiplie par 1,001 une place située
  entre le porteur et l'adversaire le plus proche.
- **La protection avant le Cracker (point 19).** `block` ne lit plus `wardThreatened`, retiré du
  `Board` ; `screenCarrier` Breaker 80, `wantsEscort` Breaker 0, `carrierSafety` Breaker 80,
  `guardStrike` 150, `shove` Breaker 30, `stripCarrier` 150 partout.
- **L'écran disparaît (point 20).** Le poids `screen` et la fonction du même nom sont retirés.
  En défense, Action dépensée, le mouvement restant suit la pente `pressCarrier` vers le porteur
  adverse, puis `parryPost`.
- **La proie par chance d'évacuer (point 21, `preyByHp`).** `prey(board, cible)` vaut les
  dégâts attendus de la batte sur les PV restants de la cible, plafonnés à un, rapportés à la
  même part contre un Striker frais du Tier : une batte sur un Striker plein vaut toujours
  `attack`, un Trajector à 25 lit au-dessus, un Breaker à 50 au-dessous, une cible à une batte
  du tunnel trois ou quatre Strikers. Lue par la batte, le Cracker envoyé et la place à côté
  d'une proie ; 1 pour les rôles qui lisent tout maillot pareil (`preyByHp` 0). La table
  `prey` et le facteur 1,4 du Breaker sur une cible presque à terre sont retirés.
- **Le receveur probable de la relance (point 22).** `Board.relaunchReceivers` liste, quand le
  gardien adverse porte, les adversaires qu'il peut servir après sa propre marche, à vue et à
  portée ; `preyOf` les compte double, et une case adjacente à l'un d'eux vaut `hunt × proie`
  même l'Action dépensée (`receiverAdjacency`).
- **Le poste de parade en PV (point 23).** `parryPost` vaut `crackerAverage(coéquipier) /
  ses PV`, multiplié par `avoidOpportunity` dans `positionValue`, pour une ligne qui finit sur
  un coéquipier (`Board.crackerStrikes`) ou sur le ballon au sol qu'un coéquipier qui n'a pas
  joué va prendre ; zéro pour une ligne qui finit sur un adversaire ou sur personne. Le poids
  `parryPost` devient l'interrupteur, 1 pour le Breaker.
- **La ligne du Cracker vers la case d'arrivée (point 27).** `carrierCrackerPressure` lit, pour
  un porteur, un champ de distance par Cracker depuis sa case en contournant les obstacles, une
  fois par décision : 1 sur une case à huit pas ou moins, 0,5 à neuf. Le calcul d'un chemin par
  case candidate a coûté trois fois le match et a été remplacé par ce champ.
- **Le chasseur et le ballon au sol (point 28).** Inchangé : `throwsAfterPickup` offre au
  chasseur « marcher, ramasser, lancer » avec `chaseSpark` sur la passe.
- **La parade (point 29).** `parryDirection` ne renvoie jamais une face qui revient sur le
  pareur : à défaut de face qui touche un adversaire ou personne, celle qui touche le
  coéquipier le plus solide en PV.
- **Vitesse.** Un match d'auto-jeu dure environ 1,5 s contre 1,2 s, donc un sweep environ
  quatorze minutes ; le test des cinquante millisecondes passe.

## C14. Décisions du 2026-10-12 à la fin du chat de mise en ligne de 2H.11, **sous-phase 2H.12, dans le code depuis le 2026-10-12 (moteur 7)**

> Écrites par le fil principal (Opus 5.5) sur les deux règles dictées par Jérôme le 2026-10-12,
> reformulées par le fil principal du chat précédent, principe validé par Jérôme et deux questions
> tranchées par lui le même jour ; puis, dans le chat suivant, après lecture de
> `engine/initiative.ts`, `engine/reduce.ts`, `server/session.ts` et de l'écran de match, une
> question de plus tranchée par lui (le chrono de la popup). **Validées avant la première ligne de
> code.** L'écart 58 ajoute une action, un champ au tour et deux événements : **`ENGINE_VERSION`
> monte à 7**, les matchs ouverts du moteur 6 sont archivés au redéploiement.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 58 | Écart 55 : un humain joue en dernier de son rôle | **L'humain choisit sa place dans son rôle, round par round.** Si l'humain joue un **Striker ou un Breaker**, quand le premier tour de son rôle arrive dans le round, une popup lui demande s'il veut jouer **premier, deuxième ou troisième de son rôle**, pour ce round seulement. Les IA du même rôle prennent les places restantes dans leur ordre par la situation (écart 51). Un camp n'a que deux Breakers : pour un Breaker humain la popup propose premier ou deuxième. Si un coéquipier du rôle est évacué, elle ne propose que les places qui existent ; s'il n'en reste qu'une, pas de popup. **La popup a son propre chrono**, `TURN_TIMER_SECONDS`, et le tour qui suit repart sur un chrono neuf, place 1 comprise. Chrono expiré ou popup fermée sans choix : **il joue dernier de son rôle**, comme sous l'écart 55. Le Trajector et le Bulwark sont seuls de leur rôle, rien ne change pour eux. **Remplace l'écart 55 pour le Striker et le Breaker** | Jérôme, le 2026-10-12 : jouer toujours dernier de son rôle le privait de choisir entre ouvrir le jeu et lire ce que ses coéquipiers du même rôle font avant lui | **Fait en 2H.12**, fil principal, voir « comment 2H.12 est codée » |

**Comment l'écart 58 se lit dans le moteur**, décidé par le fil principal à la lecture du code et
dit à Jérôme avant l'écriture. Tout le serveur et le client lisent `state.turn.unitId` pour savoir
qui est interrogé, à qui est le chrono et où la boucle d'IA s'arrête : la popup est donc **un tour
d'attente de choix**. Quand l'échelle atteint le premier slot actif du rôle de l'humain dans son
équipe, et que ce rôle compte au moins deux unités actives, le moteur ouvre un tour à l'humain
avec `turn.placing`, le nombre de places offertes ; son slot passe en tête du rôle le temps du
choix. La seule action légale est `choosePlace { place }`. Place 1 : son tour commence aussitôt.
Place 2 ou 3 : son slot est remis derrière une ou deux IA actives du rôle, le tour passe à la
première IA, et le sien s'ouvre quand l'échelle l'atteint, sans seconde popup. Deux événements,
`placeOffered` et `placeChosen`. Chrono expiré : le serveur joue `choosePlace` à la dernière place.
Trois conséquences écrites telles quelles : **le Trajector, qui joue avant la popup, planifie avec
l'humain à la dernière place**, ne connaissant pas encore le choix, alors que les IA du rôle lisent
l'échelle déjà réordonnée ; une relance du gardien (écart 54) ne touche pas au rôle ; **plusieurs
humains du même rôle, en coop, n'ont pas de popup** et gardent l'ordre de l'écart 55 et du d20, à
relire en phase 7.

**L'IA, sixième passe : le Breaker ramasse d'abord**, dicté par Jérôme le 2026-10-12. Ses mots.

1. **Quand la balle est au sol à portée, le Breaker la ramasse en priorité.** « À portée » : **même
   en Dash**, toute balle qu'il atteint dans le tour avec seize cases. Le plan « dash, marcher,
   ramasser » existe pour lui ; il ne pourra plus lancer dans ce tour, l'Action étant partie dans
   le Dash. **Il ne la laisse plus à un Striker ni au Trajector**, qu'ils aient joué ou non.
   **Remplace C10 Breaker 7 et C12 commune 6 pour le Breaker** (`yieldToKeener`, `keenerMateNear`),
   et C12 Breaker 5.
2. La suite ne bouge pas : le Breaker porteur passe à la première occasion (`handOff`), avec son
   exception à la chaîne (`chainException`).
3. Lu par le fil principal dans l'ordre de C10 Breaker : **seul le Spark sous ses pieds reste
   au-dessus** (C10 Breaker 1) ; la parade est une Réaction et ne concourt pas. « En priorité »
   passe devant une cible légitime à portée : le Dash vers la balle n'est pas interdit par C10
   commune 3.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`. `ENGINE_VERSION` 7 pour
l'écart 58. L'IA change dans `ai/chooseAction.ts` et la fiche du Breaker. **Un seul sweep à la fin,
si Jérôme le demande**, contre `09` §12, en comptant quatorze minutes ; l'écart 58 ne joue pas en
auto-jeu, faute d'humain. Les 530 tests sont le filet, le test des cinquante millisecondes fait foi
sur la vitesse.

**Comment 2H.12 est codée**, par le fil principal (Opus 5.5) le 2026-10-12, avec trois sous-agents
Sonnet nommés ci-dessous, pour relire le code contre les mots.

- **Le Breaker ramasse d'abord (`pickupFirst`, Breaker 1, autres rôles 0 ; `yieldToKeener` Breaker
  1 → 0).** Le `Planner` de `ai/chooseAction.ts` calcule `ballFirst` une fois par décision : ballon
  au sol, unité qui ne porte pas, case du ballon dans sa marche, ou dans les seize cases du Dash
  quand l'Action est là (`safeReachableCells` sur la marche plus le Dash, gardé pour les plans de
  Dash). Alors **tout plan qui contient le ramassage gagne `PICKUP_FIRST` (1000)**, plus que ce
  que vaut n'importe quel autre plan d'un tour ; entre eux ils se classent comme avant, donc
  « marcher, ramasser, passer » bat « marcher, ramasser » quand la passe vaut quelque chose. Deux
  plans nouveaux : **« dash, marcher, ramasser »** dans `dashPlans`, non barré par une cible à
  portée ; et **« marcher, ramasser » sans Action**, la seconde moitié du précédent une fois le Dash
  joué, que le point 10 de C13 refuse aux autres rôles. **Le Spark sous ses pieds** : la prise
  reçoit le bonus entier et le ramassage la moitié en plus, avec un plan « attraper, marcher,
  ramasser » quand la marche atteint le ballon ; sans ce traitement, trouvé par le sous-agent des
  tests, « marcher, ramasser » (72,5) passait devant la prise (55,6), et c'était déjà vrai avant
  2H.12. `handOff` et `chainException` ne bougent pas. Tests : `ai/sixthPass.test.ts`, 8 tests,
  **sous-agent Sonnet effort moyen** ; dans `ai/ai.test.ts` la scène « laisse le ballon au Striker »
  devient « le prend quand même », et la scène du point 10 de C13 dans `ai/fifthPass.test.ts` se
  lit sur un Striker, le Breaker y ramassant désormais.
- **L'écart 58 dans le moteur, `ENGINE_VERSION` 7.** L'action `choosePlace { place }`
  (`engine/actions.ts`), `turn.placing` (`engine/types.ts`), `placed` sur le slot de l'humain une
  fois le choix fait, les événements `placeOffered` et `placeChosen`. `placementAt` et
  `placeHuman` dans `engine/initiative.ts` : le bloc d'un rôle est la suite de slots d'un même camp
  et d'un même rôle, la popup ne vient que s'il compte un seul humain, au moins deux unités
  actives, et que l'humain n'a pas choisi ce round. `advance` dans `reduce.ts` l'ouvre par
  `offerPlace` au lieu de `beginTurn` ; `applyChoosePlace` place le slot derrière `place - 1` IA
  actives du rôle, puis commence le tour de l'humain (place 1) ou repart de la première IA.
  `legalActions` ne propose que `choosePlace` pendant le choix, et `onlyEndTurnLeft` en tient
  compte, sinon le client passait le tour tout seul. Un tour écrit avant le moteur 7 n'a pas le
  champ : les tests de `placing` sont en égalité lâche.
- **Le serveur** (`server/session.ts`) : le chrono expiré pendant le choix joue `choosePlace` à la
  dernière place. **La popup a son propre chrono** : la clé d'horloge distingue le choix du tour
  (`clockKey`), et elle est lue **avant** l'action humaine ; lue après, comme avant 2H.12, le tour
  qui suit une place 1 gardait l'échéance du choix. Défaut trouvé par le sous-agent des tests du
  moteur, corrigé par le fil principal. Tests : `engine/placement.test.ts`, 11 tests, **sous-agent
  Sonnet effort élevé** ; `server/session.test.ts` répond à la popup par la dernière place avant de
  jouer ses tours.
- **L'IA face à la popup** : jamais en match, faute d'IA humaine ; `rankPlans` répond la dernière
  place pour le siège humain du playthrough et pour `dump-match.ts`, qui reconstruit
  `choosePlace` depuis `placeChosen` et écrit les deux lignes.
- **L'écran** : `client/src/match/PlacePrompt.tsx`, **sous-agent Sonnet effort moyen**, une
  carte au-dessus du plateau, un bouton par place (`data-place`), « Close, play last »
  (`data-testid="place-close"`), Échap et clic à côté valent la dernière place, le chrono affiché.
  `Match.tsx` l'ouvre quand `turn.placing` est posé et que c'est le tour du joueur, et éteint la
  barre d'actions derrière. Le fil dit « X plays second of the role this round ».
- **Le harnais** : `waitForPlayableTurn` dans `e2e/harness.ts` répond à la popup **par un clic à
  l'écran** et la capture la première fois ; le smoke clique la place 1, puis « Close », puis la
  place 2 ; le playthrough une place différente à chaque round.
- **Mesuré** : 549 tests sur 25 fichiers contre 530, typecheck et build du client verts, le test
  des cinquante millisecondes passe. Dix-huit matchs d'auto-jeu, six graines par Tier, pour voir
  que le sport se joue encore, pas un sweep : 2,7 / 2,0 / 3,3 buts de ballon par match (rookie,
  veteran, star), 57 ramassages de Breaker sur les dix-huit, 1,3 à 1,4 s par match.
