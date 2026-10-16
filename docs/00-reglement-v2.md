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

## C14. Décisions du 2026-10-12 à la fin du chat de mise en ligne de 2H.11, **sous-phase 2H.12, dans le code et en ligne depuis le 2026-10-12 (moteur 7, `resolve-action` v18, `create-match` v16)**

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
  veteran, star), 57 ramassages de Breaker sur les dix-huit, 1,3 à 1,4 s par match. Smoke et
  playthrough verts sur les fonctions redéployées du moteur 7, **la popup vue au harnais**, capture
  lue, journal en `07` §10.

## C15. Décisions du 2026-10-14 après vingt et un matchs sur le moteur 7, **sous-phase 2H.13**

> Écrites par le fil principal (Fable 5.1) sur les retours de Jérôme après **vingt et un matchs
> sur le moteur 7** (neuf le 2026-10-12 au soir, neuf le 13, trois le 14 : quatorze en Striker,
> trois en Trajector, trois en Breaker, un en Bulwark), dont cinq consignés et rejoués sans aucun
> écart d'événement dans `docs/matches/` (`4f6af883`, `6f956ed1`, `afdea53b` en Trajector,
> `919c98c0` en Bulwark, `f825ec20` en Striker). Chaque retour a été lu contre les événements en
> base et les huit plans du visualiseur avant d'être reformulé, puis **tranché par lui point par
> point en chat le 2026-10-14, avant la première ligne de code**. S'y ajoute la décision du
> 2026-10-12 au soir sur le coup d'envoi du Trajector (`07` §10, sous 2H.12).
>
> Quatre écarts de règle, 59 à 62, un défaut de serveur, trois retours d'écran et une septième
> passe de l'IA. Le Shove et la dérive du Spark changent ce que les dés produisent, l'état du tour
> gagne un champ et deux événements changent de forme : **`ENGINE_VERSION` monte à 8**, et un match
> du moteur 7 ne se rejoue plus avec ce dépôt. Les matchs ouverts du moteur 7 sont archivés au
> redéploiement.

**Le défaut du chrono, Trajector et Bulwark.** Jérôme : « systématiquement au tour 4 ou 5, l'humain
qui joue le Trajector ne peut plus rien faire et se fait timeout ; pour le Bulwark c'est vers le tour
8 ». Lu dans les trois matchs Trajector : chaque tour à partir du round 4 ou 5 finit par
`dodging, turnEnded`, l'expiration du serveur, et les matchs durent trois minutes, donc les
expirations sont instantanées. Cause dans `server/session.ts` : depuis 2H.12 la clé du chrono est
lue avant l'action de l'humain et ne contient que l'identifiant de l'unité ; pour un rôle sans popup
la clé est la même round après round, le serveur croit que « le même tour continue » et **garde
l'échéance du round 1 tout le match**. Dès que 120 secondes se sont écoulées depuis le premier
tour, chaque tour expire au premier clic. Le Striker et le Breaker y échappent parce que la popup
change la clé deux fois par round. Le match Bulwark, dix rounds en 2 min 36, expire au round 10,
exactement au seuil. **Correctif** : la clé porte le round et l'index de tour. C'est un défaut du
serveur, pas une règle ; il est écrit ici parce que c'est le premier retour de la liste.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 59 | Le Spark dérive de 6 cases par round sur un cap d8 **tiré une fois** à l'entrée, et rebondit (écart 36) | **Le cap est tiré au d8 à chaque dérive**, parmi les faces permises : **une face dont le premier pas rapproche le Spark d'un Trajector actif est interdite** ; si les huit faces sont interdites, il prend celle dont la course finit le plus loin du Trajector le plus proche. Les six cases, les rebonds (écart 36b) et le saut d'échappée (écart 49) ne changent pas. Le cap d'entrée n'est plus tiré : la première dérive tire le sien | Jérôme : « le Spark continue à avoir un déplacement random mais tout mouvement vers un Trajector est interdit ; sur un d8 de choix certains angles seront interdits ; il doit chercher à éviter les Trajectors, jamais aller vers eux ». Conséquence dite et acceptée : le chasseur ne peut plus viser la case où le Spark sera (C13 point 2), il vise la case où il est | **Fait en 2H.13**, `sparkDriftFace`, `Board.sparkNext` disparaît |
| 60 | Attrapé, le Spark revient au round suivant par la règle d'entrée, tiers central à 4 cases ou plus de toute unité (écarts 36 et 50) | **Après une prise, il revient sur une case à 9 cases de chaque Trajector actif**, distance de grille diagonales comprises, la même pour les deux ; s'il n'existe aucune case exacte, celle dont les deux distances s'écartent le moins de 9, égalités au dé ; plus de contrainte de tiers central ; les 4 cases de dégagement de toute unité tiennent ; un seul Trajector sur le terrain, à 9 cases de lui ; aucun, la règle d'entrée. **L'entrée du round 6 ne change pas** | Jérôme : « un Spark ne réapparaît plus après le tour 6 au milieu du terrain ; il doit apparaître à 9 cases d'équidistance des deux Trajectors, égale pour ne pas favoriser l'un ou l'autre » | **Fait en 2H.13**, `sparkReturnCell` dans `rules/ordnance.ts` |
| 61 | Shove réussi sur un porteur : le ballon roule sur une case voisine au d8, le bousculeur doit marcher dessus (écarts 32 et 42) | **Le ballon est dans les mains du bousculeur à l'instant.** Personne ne bouge, ni le bousculé ni le bousculeur. Le bousculeur a dépensé son Action, il ne passe ni ne tire ce tour, garde son mouvement restant et peut s'éloigner avec le ballon ; au round suivant il joue comme tout porteur. Les quatre rôles, humain ou IA, Bulwark compris quand il sort bousculer dans ses quatre cases. L'évacuation d'un porteur garde l'écart 42 | Jérôme : « quand on réussit un Shove sur un porteur, la balle est immédiatement dans les mains de celui qui a désarmé, et non plus par terre ». Cinq points reformulés et validés un par un | **Fait en 2H.13**, `applyShove` dans `reduce.ts`, `shoved` gagne `tookPayload` |
| 62 | Après un but, le Bulwark de l'équipe qui a encaissé passe en premier de son équipe (écart 54) | **L'équipe qui a encaissé rejoue dans l'ordre Trajector, Strikers, Bulwark, Breakers.** Si son bloc est encore entièrement devant dans le round du but, il est réordonné ainsi tout de suite ; **si son bloc a déjà commencé, le round se finit normalement** et c'est le round suivant qui prend cet ordre. Le Bulwark lance toujours immédiatement à son tour (C10 Bulwark 2). La surface de réparation (écarts 53 et 53 bis) ne change pas | Jérôme : « cela permet aux alliés de revenir potentiellement à portée de passe pour la relance ». Question tranchée : bloc déjà commencé, « on finit le round normalement » | **Fait en 2H.13**, `promoteBulwark` et `teamSlots` dans `initiative.ts` |

**Trois retours d'écran, sans règle.**

- **Les attaques d'opportunité ne manquent pas, les reculs si.** Règle D&D gardée, tranché par
  Jérôme : glisser d'une case adjacente à une autre case adjacente du même adversaire ne provoque
  pas. Vérifié sur 493 pas dans sept matchs consignés : chaque adversaire dont on quitte l'allonge
  frappe, zéro oubli, le seul cas contraire étant une cible déjà évacuée par le premier coup. Ce
  qu'il a vu : sur 382 coups portés, **104 sans recul** parce que la case de recul était bloquée
  par un obstacle, une unité ou le bord, et le moteur n'écrivait rien ; et une Réaction déjà
  dépensée dans le round (interception, blocage, parade, allonge précédente), visible seulement dans
  le panneau de l'unité sélectionnée. Décidé : **un marqueur sur le pion dont la Réaction est
  dépensée**, et **un événement `recoilBlocked`** qui donne la ligne « X swings but cannot recoil ».
  Mise en garde de Jérôme pour la 2.5D : le marqueur doit survivre au skin des personnages, donc un
  signe flottant au-dessus de la tête ou au sol, jamais une retouche du pion.
- **La passe volée nomme son receveur.** Les neuf relances volées de l'IA dans les matchs consignés
  visaient un allié, mais le fil disait seulement « X cuts the pass out of the air » et Jérôme
  lisait une passe à l'adversaire. `passIntercepted` gagne `toId`, le fil et le visualiseur disent
  « X's pass to Y is cut out of the air by Z ».
- **La popup de place sort du terrain.** Plus de voile sombre : une carte posée dans la colonne de
  droite au-dessus de la chaîne d'initiative, déplaçable à la souris par son bandeau, position gardée
  le temps du match ; Échap et « Close, play last » valent toujours la dernière place, le chrono reste
  affiché. Jérôme : « en dehors du terrain, pour permettre la lecture du terrain pendant le choix ».

**L'IA, septième passe.** Les mots sont ceux de Jérôme, les lectures du code sont du fil principal.

1. **Le Trajector laisse le ballon du coup d'envoi aux Strikers** (C10 Trajector 3 et commune 6,
   décidé le 2026-10-12 au soir). Lu dans douze matchs d'auto-jeu sur douze et dans `a17c22a5` :
   le plan « marcher, ramasser, passer » de 2H.10 se note sur `grabPayload` sans le facteur
   `chaseKickoff`, qui ne pèse que dans `positionValue`. Le facteur s'applique à tout plan qui
   ramasse le ballon du coup d'envoi.
2. **Le porteur va au plus près de la bouche parmi les cases qu'il atteint, Dash ou pas.** Lu dans
   les matchs : au round 2 le Striker porteur dashe et s'arrête à la ligne 35, neuf cases de la
   bouche, parce que `scoringNearness` plafonne à 1 dès qu'une case voit la bouche à portée propre,
   et qu'au-delà l'IA ne gagne rien. Il ne s'arrête plus court que si la case plus loin est **plus
   exposée** (plus d'adversaires peuvent venir le bousculer avant qu'il rejoue) ou **sans vue** sur
   la bouche. Jérôme : « un Dash consomme toutes les cases, sauf si la situation le justifie
   vraiment ; il se laissait rattraper au lieu de s'approcher du Bulwark ».
3. **Le tireur ne reprend pas son propre ballon dans le même tour.** Après un tir manqué, la case
   du ballon ne vaut rien pour lui (plus la fin de tour de porteur de C13 point 10), **sauf si aucun
   coéquipier qui n'a pas encore joué ce round n'atteint la case du ballon avec sa marche** (huit
   cases, seize pour un Breaker qui Dash) : alors il la reprend, « il vaut mieux que la balle soit
   en sécurité dans ses mains que traîner par terre ». Question tranchée : « seulement ceux qui n'ont
   pas joué ». L'état du tour porte `shot`, posé par le tir, pour que le plan reconstruit le sache.
4. **Le Bulwark ne lance jamais dans une allonge.** Remplace « même avec un risque d'interception »
   de C10 Bulwark 2 : aucune passe avec un adversaire sur la ligne ; il marche pour trouver une
   ligne propre comme aujourd'hui, sinon il se plante, garde le ballon et retente au tour suivant.
   Lu dans `afdea53b` : le gardien B a lancé trois fois avec trois adversaires sur la ligne, volé
   trois fois. Jérôme, option (a) sur question fermée.
5. **Le relais se juge contre la case du gardien quand c'est lui qui porte.** Lecture du fil
   principal pour servir l'écart 62 : `carrierStands` lisait sa route de huit cases vers la bouche
   adverse, que le gardien ne prend jamais ; pour un Bulwark porteur c'est sa case, et ses
   coéquipiers reviennent à portée de passe et à vue de cette case.
6. **« Call for the ball » passe outre la chaîne.** Le bouton est câblé et l'IA le lit déjà
   (`ORDER_PULL`, 60 points sur la passe vers l'appelant), mais la chaîne retirait tout receveur qui
   a déjà joué ce round ou qui est à plus de huit cases en arrière, donc après une place 1 ou 2
   l'appel ne pesait plus rien jusqu'au dernier maillon ; et l'appel restait sur le match jusqu'au
   sifflet. Décidé : un receveur appelé **passe outre les deux filtres de la chaîne**, pas la portée,
   la vue ni les intercepteurs ; et **l'appel expire quand le tour suivant de l'appelant s'ouvre**,
   effacé par le serveur.
7. **Le Shove qui prend le ballon ne change pas les poids** : `stripCarrier` 150 reste, et le plan
   reconstruit après un Shove réussi voit un porteur ordinaire, `handOff` et l'exception à la chaîne
   pour un Breaker.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`. `ENGINE_VERSION` 8. Le moteur
dans `rules/ordnance.ts` (écarts 59 et 60), `reduce.ts` (61, `recoilBlocked`, `turn.shot`),
`initiative.ts` (62), `events.ts` et `types.ts` ; le serveur dans `session.ts` (le chrono) et la
fonction `resolve-action` (l'expiration de l'appel) ; l'IA dans `ai/chooseAction.ts` et
`ai/evaluate.ts` ; l'écran dans `PlacePrompt.tsx`, `Board.tsx`, `replay.ts`, `Feed.tsx`. Les
fonctions à redéployer sur le feu vert de Jérôme. **Un seul sweep à la fin, si Jérôme le demande**,
contre `09` §12, en comptant quatorze minutes. Les 549 tests sont le filet, le test des cinquante
millisecondes fait foi sur la vitesse.

**Comment 2H.13 est codée**, par le fil principal (Fable 5.1) le 2026-10-14, avec quatre
sous-agents Sonnet nommés ci-dessous, pour relire le code contre les mots. **Codé en 2H.13.**

- **Le chrono.** `clockKey` dans `server/session.ts` vaut `unité@round:index`, plus `#place`
  pendant le choix : un tour n'est « le même qui continue » que dans le même round au même
  index. Test `it.each(['trajector', 'bulwark'])` dans `server/session.test.ts`, **sous-agent
  Sonnet effort élevé** : la deuxième échéance est neuve et un tour pris 130 s après l'ouverture
  n'expire pas.
- **Écart 59, `sparkDriftFace` dans `rules/ordnance.ts`.** Le dé choisit parmi les faces permises
  (`rng.pick`), une face étant interdite quand la première case de sa course, rebond compris, est
  plus près d'un Trajector actif que la case de départ ; toutes interdites, la face dont la course
  finit le plus loin du Trajector le plus proche, la plus basse à égalité, sans dé. `resolveSpark`
  tire son dé sur `rngSeed` ; `enterSpark` ne tire plus de cap, `spark.heading` est nul à l'entrée
  et garde ensuite le cap de sortie de la dernière course, pour la lecture seule. **IA** :
  `Board.sparkNext` disparaît, le chasseur vise la case où le Spark est.
- **Écart 60, `sparkReturnCell`.** Parmi les cases occupables à 4 cases ou plus de toute unité
  (sinon toute case libre), celles dont le plus grand écart à 9 sur les Trajectors actifs est
  minimal, départagées au dé ; sans Trajector, `sparkEntryCell`. `enterSpark` choisit par le round :
  6 est l'entrée, au-delà c'est un retour.
- **Écart 61, `applyShove` dans `reduce.ts`.** Shove réussi sur un porteur : `shoved` avec
  `tookPayload`, le bousculé lâche, le bousculeur tient, `payload.carriedBy` passe à lui, personne
  ne bouge, pas de `payloadDropped` ni `payloadScattered`. **Écran** : `replay.ts` donne le ballon
  au bousculeur, `motion.ts` fait voler le ballon d'une case, `Feed.tsx`, `dump-match.ts` et le
  visualiseur disent « and takes the Payload », **sous-agent Sonnet effort moyen**.
- **Écart 62, `initiative.ts`.** `RELAUNCH_ORDER` = Trajector, Strikers, Bulwark, Breakers ;
  `teamSlots` le prend quand `relaunch` est posé ; `promoteBulwark` reçoit les unités et, quand le
  bloc est entièrement devant, place le gardien juste avant le premier Breaker de son camp, sinon
  rend null et le round se finit tel quel. **IA, point 5** : `wardLine` lit un gardien porteur
  comme s'il avait joué, donc sur sa case, et `outlet`, `laneCover` et `rejoin` ramènent les
  coéquipiers à portée et à vue de cette case.
- **`recoilBlocked`** est écrit par `recoilFrom` quand la case de recul est la case de départ ;
  **`passIntercepted.toId`** par `resolveInterception`, qui reçoit le receveur ; **`turn.shot`** est
  posé par `applyShoot`, faux à l'ouverture de tout tour. Le marqueur de Réaction dépensée flotte
  au coin haut droit du pion dans `Board.tsx`, un cercle barré en `--text-faint`, hors du pion,
  **sous-agent Sonnet effort moyen**.
- **La popup** (`PlacePrompt.tsx`, `Match.tsx`), **sous-agent Sonnet effort moyen** : plus de
  voile, carte de 340 px posée en absolu dans le corps de l'écran, à l'origine sur la colonne de
  droite au-dessus de la chaîne, bandeau « Round order » qui sert de poignée (pointer capture,
  bornée pour rester à 60 px dans l'écran), position tenue par `Match.tsx` le temps du match ;
  anchors `place-prompt`, `data-place`, `place-close` inchangés, le harnais n'a pas bougé.
- **Point 1, le coup d'envoi.** Dans `Planner.plans` la part du ballon (`share`) porte
  `chaseKickoff` quand `lastCarrierTeam` est nul, comme `positionValue` le faisait déjà : plus
  aucun plan de ramassage pour le Trajector au coup d'envoi.
- **Point 2, le porteur au plus près.** `carrierEnd` ajoute `carryToFurnace × DEEP_STEP (0,15) ×
  depthInRange`, la profondeur dans la portée propre à vue, 0 au bord de portée, 1 sur la bouche :
  10,5 points pour un Striker sur neuf cases, 1,2 par case, sous le coût d'un seul adversaire de
  plus dans `carrierExposure` (`carrierSafety` 60 fois une chance de bousculade). Hors vue, rien.
- **Point 3, le tireur.** `Board.shooterYields` : `turn.shot`, ballon au sol, et un coéquipier qui
  n'a pas joué dont `reachableCells` avec 8 cases, 16 pour un Breaker, contient la case du
  ballon. Alors `share` vaut zéro dans `positionValue` comme dans `plans` : la case du ballon ne
  vaut rien et le ramassage n'est pas offert. Sans ce coéquipier, la case vaut la fin de tour de
  porteur, comme avant.
- **Point 4, le gardien.** `throwPlans` écarte toute passe avec un intercepteur quand `relaunch`
  est positif ; `cleanPassHere` (une passe sans intercepteur depuis sa case) borne le filtre « il
  lance sans bouger », sinon les plans « marcher puis passer » n'offrent que des lignes propres,
  et le plantage reste. Constat du sous-agent des tests IA : une passe d'une case ne s'intercepte
  jamais (écart 48), donc le gardien peut marcher jusqu'à côté d'un receveur marqué et lui donner le
  ballon, au-delà de sa laisse, ce que C10 Bulwark 2 permet déjà pour trouver une ligne.
- **Point 6, l'appel.** `summoned` lève les deux filtres de la chaîne dans `throwPlans`, pas la
  portée, la vue ni `INTERCEPT_CAUTION`. Dans `resolve-action`, les ordres `callForPass` dont le
  receveur a un `turnStarted` dans le lot sont retirés avant l'écriture, sauf ceux ajoutés par la
  requête même.
- **Tests** : `engine/c15.test.ts`, 42 tests, et huit tests récrits dans `box`, `combat`,
  `ordnance` et `setup`, **sous-agent Sonnet effort élevé** ; `ai/seventhPass.test.ts`, 18
  tests, et trois récrits dans `ai.test.ts`, **sous-agent Sonnet effort élevé** ; `replay.test.ts`
  et `motion.test.ts`, cinq tests, sous-agent de l'écran. **617 tests sur 27 fichiers contre 549
  sur 25**, typecheck racine, scripts et e2e verts, client typecheck et build verts.
- **Mesuré** sur dix-huit matchs d'auto-jeu, six graines par Tier, `scripts/control-2h13.ts`, pas
  un sweep : 1,8 / 2,2 / 2,0 buts de ballon par match (rookie, veteran, star) ; 71 Shove réussis
  dont 67 prennent le ballon ; 37 relances de gardien, aucune volée ; aucun tireur ne reprend son
  ballon ; le Trajector ne prend le coup d'envoi dans aucun des dix-huit ; 25 prises de Spark sur
  38 entrées ; 1,7 s par match, donc un sweep environ seize minutes. Smoke vert en 36 s et
  playthrough vert en 30 s (21 requêtes humaines, 0 refusée), `ENGINE_VERSION` épinglée à 7 le
  temps du run puis remise à 8, **la popup vue dans la colonne de droite**, capture lue, le terrain
  lisible derrière.

## C16. Décisions du 2026-10-14 après trois matchs sur le moteur 8, **sous-phase 2H.14**

> Écrites par le fil principal (Fable 5.1) sur les cinq retours de Jérôme après **trois matchs sur
> le moteur 8** le 2026-10-14 au soir, tous star, équipe Shrapnel oath, consignés et rejoués sans
> aucun écart d'événement dans `docs/matches/` : `20edbca9` (Striker, 30-20), `b5910869` (Striker,
> 70-0), `dc474770` (Trajector, 70-30). Chaque retour a été lu contre les événements en base, les
> plans du visualiseur et le code avant d'être reformulé, puis **tranché par lui en chat le
> 2026-10-14, avant la première ligne de code** : deux questions fermées (« n'importe quand dans le
> tour », « b »), le reste accepté tel que reformulé.
>
> Un écart de règle, 63, qui révise l'écart 61 ; une règle d'IA au coup d'envoi ; trois retours
> d'écran. L'état du tour gagne un champ : **`ENGINE_VERSION` monte à 9**, un match du moteur 8 ne
> se rejoue plus avec ce dépôt, les matchs ouverts du moteur 8 sont archivés au redéploiement.

| # | Règle v2 | Règle décidée | Raison | État |
|---|---|---|---|---|
| 63 | Écart 61 : un Shove réussi sur un porteur met le ballon dans les mains du bousculeur, qui « a dépensé son Action, ne passe ni ne tire ce tour » | **Le bousculeur gagne une passe gratuite pour le reste de son tour.** Le ballon est dans ses mains à l'instant, personne ne bouge (écart 61 inchangé), et il peut, **n'importe quand dans le reste du tour**, donc depuis la case du Shove ou après avoir marché avec son mouvement restant, faire **une passe sans Action** à tout coéquipier à portée et en vue, **qu'il ait déjà joué ce round ou non**. Cette passe est interceptable comme toute passe (écart 48), bornée par la portée et la ligne de vue (écart 34). **Jamais de tir** : l'Action est partie dans le Shove, et la passe gratuite n'ouvre que la passe. Une seule passe gratuite par Shove ; le tour fini sans l'avoir jouée, elle est perdue. Les quatre rôles, humain ou IA, Bulwark compris. L'Action reste dépensée pour tout le reste : pas de Dash, de Dodge, de Disengage ni de batte après le Shove | Jérôme : « quand on désarme la balle à un porteur, on peut gratuitement faire une passe s'il y a quelqu'un à portée, qu'il ait joué ou pas, mais pas tirer pour marquer un but ». Question tranchée : « n'importe quand dans le tour » | **Fait en 2H.14**, fil principal : `turn.freePass` dans `engine/types.ts`, posé par `applyShove` sur un porteur, consommé par `applyPass`, lu par `legalActions` ; **`ENGINE_VERSION` 9**. 14 tests dans `engine/c16.test.ts`, sous-agent Sonnet |

**Ce que les trois matchs ont montré**, pour mémoire. Dans `b5910869`, Osric Rivet, Trajector A,
dashe au round 1 de (12, 14) à (5, 1), treize cases vers sa propre bouche, meilleur plan « dash,
then walk to (5, 1) » à 1,7 point ; dans `dc474770` le même plan était en tête pour le Trajector
humain, qui a cliqué ailleurs ; dans `20edbca9` le Trajector A n'est allé devant que parce qu'un
Cracker à frapper valait 2,5. La cause : quand le Trajector A joue, premier de son équipe au round
1, **personne ne porte encore le ballon**, donc relais, mur et sécurité du porteur valent zéro, et
la seule pente restante est `guardFurnace`. Le journal de 2H.10 (« le Trajector vers l'avant au
premier tour, fait par construction ») était faux dans ce cas. Le Trajector B, lui, joue après
que A a pris le ballon et ferme sur le porteur, comme attendu.

**L'IA, huitième passe.** Les mots sont ceux de Jérôme, les lectures du code sont du fil principal.

1. **Au coup d'envoi, le Trajector se place en relais du ballon, jamais en arrière.** Option b,
   tranchée par Jérôme : tant que le ballon n'a jamais été porté (`lastCarrierTeam` nul) et qu'il
   est au sol, le Trajector le lit **comme s'il était déjà porté par un Striker allié qui n'a pas
   joué, debout sur la case du ballon**, avec sa route de huit cases vers la bouche adverse : la
   même ligne que `wardLine`, lue par `outlet`, `laneCover` et `rejoin`. Il finit donc devant le
   ballon, à portée de passe et à vue, comme un relais ordinaire (C10 Trajector 8). Et, en garde,
   la règle de C12 devient un filtre dur comme `carrierMayEnd` : **au round du coup d'envoi, son
   plan ne finit jamais plus près de sa propre bouche que sa case de départ**, Dash et repli
   compris. `chaseKickoff` reste à zéro : il ne ramasse toujours pas.
2. **La passe gratuite dans le plan de tour.** Après un Shove réussi sur un porteur, le plan
   reconstruit voit un porteur sans Action mais avec `freePass` : les plans « passer » et
   « marcher puis passer » existent pour lui avec le mouvement restant, notés comme toute passe
   (terrain gagné depuis la case de début de tour, exposition du receveur, intercepteurs, `relief`),
   et **les deux filtres de la chaîne sont levés** comme pour un receveur appelé (C15 point 6) :
   un receveur qui a joué, ou derrière, est permis, `BACKWARD_STEP` se paie quand même. Le tir
   n'est pas offert. Le Shove lui-même ne change pas de valeur (C15 point 7, `stripCarrier` 150) :
   la passe qui suit se juge sur le plateau que le dé a laissé.

**Trois retours d'écran, sans règle.**

- **La popup de place naît en haut à gauche** du corps de l'écran, au lieu du haut de la colonne de
  droite ; toujours déplaçable par son bandeau, position gardée le temps du match, Échap et
  « Close, play last » inchangés.
- **Les cases sous allonge adverse se marquent en permanence.** Le marquage lisait, pendant le tour
  du joueur seulement, les cases atteignables dont la route la plus courte provoque une allonge
  (dette connue de 2H.10), d'où ses absences. Décidé, proposition du fil principal acceptée : le
  même carré orange marque, **à chaque tour, le sien comme ceux des IA**, toute case ouverte
  adjacente à un adversaire actif de l'équipe du joueur, c'est-à-dire l'allonge que quitter
  provoque. La route sous le curseur reste orange quand elle provoque, cyan sinon.
- **Les pointillés des tiers disparaissent** du plateau. Les tiers restent dans le fil et dans la
  règle d'entrée du Spark ; aucune règle ni aucun test ne lisait ces deux lignes.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`. `ENGINE_VERSION` 9 pour
`turn.freePass`. Le moteur dans `reduce.ts` (`applyShove`, `applyPass`), `legalActions.ts` et
`types.ts` ; l'IA dans `ai/chooseAction.ts` (la passe gratuite, le filtre du coup d'envoi) et
`ai/evaluate.ts` (le relais du coup d'envoi) ; l'écran dans `Board.tsx` et `screens/Match.tsx`. Les
fonctions à redéployer sur le feu vert de Jérôme. **Un seul sweep à la fin, si Jérôme le demande**,
contre `09` §12, en comptant seize minutes. Les 617 tests sont le filet, le test des cinquante
millisecondes fait foi sur la vitesse.

**Comment 2H.14 est codée**, par le fil principal (Fable 5.1) le 2026-10-14, avec deux
sous-agents Sonnet nommés ci-dessous, pour relire le code contre les mots. **Codé en 2H.14.**

- **Écart 63, le moteur.** `TurnState.freePass` (`types.ts`), faux à l'ouverture de tout tour ;
  `applyShove` le pose quand le Shove réussit sur un porteur, après avoir donné le ballon au
  bousculeur ; `applyPass` accepte `actionUsed` quand `freePass` est posé et l'efface en
  lançant, interception comprise ; `legalActions` offre `pass` sous `hasAction || freePass`, et
  rien d'autre : le tir, le Dash, le Dodge, le Disengage, la batte restent sous l'Action. Un
  `move` ne consomme pas la passe. **`ENGINE_VERSION` 9.** La barre d'actions lit `legal.pass`
  et n'a pas changé.
- **La passe gratuite dans le plan de tour (point 2).** `freeThrow` dans `Planner.plans` :
  Action partie, porteur, `turn.freePass`. Depuis sa case, `throwsAt(here, legal)` filtré sur
  `pass`, noté valeur plus `relief` ; depuis chaque case atteignable, `throwsAt(cell, options,
  there)` filtré sur `pass`, noté moins l'exposition de la route et `WALK_BEFORE_THROW` par case,
  la borne `carrierMayEnd` tenant toujours. Dans `throwsAt`, `free` lève les deux filtres de la
  chaîne (receveur qui a joué, receveur derrière) comme `summoned` ; portée, vue,
  `INTERCEPT_CAUTION`, `BACKWARD_STEP` et l'exposition du receveur tiennent. Le Shove garde sa
  valeur (C15 point 7).
- **Le relais du coup d'envoi (point 1).** `Board.kickoffRelay` dans `evaluate.ts` : ballon au
  sol, `lastCarrierTeam` nul, `chaseKickoff` zéro, pas de porteur allié ; alors `wardLine` part de
  la case du ballon vers la bouche adverse sur huit cases (`carriedForward`) et `carrierCanServe`
  est vrai. `outlet` et `laneCover` ne refusent plus l'absence de porteur quand `kickoffRelay`
  est posé, `laneCover` lisant les intercepteurs sur le maillot de l'unité. La branche
  « coéquipier du porteur » de `positionValue` est sortie en `relayValue` (`screenCarrier`,
  `block`, `supportAttack × outlet`, `cover × laneCover`, `spread`, `rejoin`) et lue aussi dans
  la branche « ballon au sol » quand `kickoffRelay` est posé. `kickoffMayEnd` dans
  `chooseAction.ts`, lu par `mayEnd` aux quatre portes de `carrierMayEnd` (marche, Disengage,
  repli, Dash), refuse toute case plus près de `ownFurnace` que `turn.startedAt`. Mesuré : le
  Trajector A finit en (7, 21) à (10, 31) selon la graine, à 51 points pour (8, 29), sept cases
  devant le ballon ; jamais un ramassage.
- **L'écran.** `screens/Match.tsx` fait naître la popup en `{ x: 0, y: 0 }` du corps ;
  `Board.tsx` calcule `watched` depuis les adversaires actifs de l'équipe du joueur (huit cases
  autour de chacun, hors obstacle et hors terrain), sans `legal`, et dessine le même carré orange
  avec `data-reach` ; `swingsTo` garde la lecture de la route au survol. Les lignes des tiers et
  l'import `THIRD_LENGTH` sont retirés.
- **Tests** : `engine/c16.test.ts`, 14 tests, **sous-agent Sonnet effort élevé** ;
  `ai/eighthPass.test.ts`, 12 tests, **sous-agent Sonnet effort élevé** ; un test de `c15`
  retitré. **643 tests sur 29 fichiers contre 617 sur 27**, typecheck racine, scripts et e2e
  verts, client typecheck et build verts.
- **Mesuré** sur dix-huit matchs d'auto-jeu, `scripts/control-2h14.ts`, pas un sweep : 1,7 / 1,8
  / 1,8 buts de ballon par match ; 93 Shove réussis, 92 prises de balle, 87 passes gratuites
  jouées derrière, 4 volées ; Trajector 0/18 au coup d'envoi, 0/36 qui recule au round 1, 36/36 à
  portée de passe du ballon. Smoke vert en 34 s et playthrough vert en 29 s (18 requêtes
  humaines, 0 refusée), `ENGINE_VERSION` épinglée à 8 le temps du run, sur un Vite dédié avec le
  crochet sur 5174 ; captures lues : la popup en haut à gauche, les carrés orange autour de
  chaque adversaire pendant la popup comme pendant le tour, plus de ligne de tiers.

## C17. Décisions du 2026-10-14 après sa partie sur le moteur 9, **sous-phase 2H.15**

> Écrites par le fil principal (Fable 5.1) sur le retour de Jérôme après **sa partie sur le moteur
> 9** le 2026-10-14 au soir (star, Striker, équipe Shrapnel oath, 50 à 0, match `ab27b827`,
> 21 h 20 heure de Paris), consignée et rejouée sans aucun écart d'événement dans
> `docs/matches/2026-10-14-ab27b827/` (465 décisions). Un seul retour, d'écran. **Aucun écart de
> règle, rien dans l'IA, aucune constante de `00` ne bouge : `ENGINE_VERSION` reste 9, les
> fonctions ne sont pas à redéployer.** La sous-phase 2H.15 porte ce retour et, derrière lui, la
> scène 2.5D construite en un seul bloc (`07` §10, `08` §5), client seul. **Validé par Jérôme le
> 2026-10-14 dans la nuit (« ok c17 »)** ; l'option sur la passe gratuite au gardien reste à choisir.

**Le retour, ses mots : « enlève les cases orange, c'est trop. »** Les carrés orange de 2H.14
(toute case adjacente à un adversaire, marquée à chaque tour, `data-reach`) **sont retirés du
plateau**, sans retour au marquage d'avant 2H.14, qui allait et venait. Ce qui reste dit la même
chose au moment où ça compte : la route sous le curseur passe à l'orange quand elle provoque une
allonge, cyan sinon, et l'étiquette « N swings on the way » compte toujours les allonges de la
route entière. Lecture du fil principal, à corriger par Jérôme s'il voulait aussi retirer la
couleur de la route.

**Un fait à relire, pas une décision.** Dans le match e2e du moteur 9 (`7d631b71`, consigné
dans `docs/matches/2026-10-14-7d631b71/`), au round 2, Harrow Slagborn, Breaker B, bouscule le
porteur en (5, 34), prend le ballon, et joue sa passe gratuite **vers son gardien Voss Halyard en
(7, 43), treize cases derrière lui**, à 144,7 points, devant Thessa Gunwale à six cases derrière
(74,3 : deux adversaires sur la ligne, 0,6 d'exposition à l'arrivée) et Renk Bellows à cinq cases
derrière (49,1 : 1,2 d'exposition à l'arrivée). Les trois receveurs à portée et en vue étaient
tous derrière. Lu dans `throwsAt` : le gardien n'avait pas encore joué ce round, donc son
exposition à l'arrivée vaut zéro et personne n'est sur sa ligne ; le terrain perdu ne coûte que
`BACKWARD_STEP`, un demi-point par case, soit 6,5 points ; et la passe gratuite, comme toute
passe, rend au lanceur `relief`, l'exposition de la case de départ, qui en (5, 34), au milieu de
l'équipe A, est lourde. La passe au gardien est donc « se débarrasser du ballon vers le seul
receveur que personne ne peut atteindre », et elle a réussi : le gardien a relancé de huit
cases au tour suivant. Dans la partie de Jérôme (`ab27b827`), aucune passe gratuite n'a visé un
gardien : Derro Bellows, Breaker A, a refusé une passe à sept cases en arrière (moins 17,5) et
gardé le ballon, Bexley Cannonade, Breaker B, a passé à un Striker sur sa ligne. Les trois
options étaient : laisser (le gardien est un refuge légitime), borner la passe gratuite en
arrière à huit cases comme un receveur ordinaire (C13 point 9), ou écarter le gardien quand un
autre receveur existe. **Tranché par Jérôme le 2026-10-15 : laisser.** Ses mots : « c'est
autorisé et ok pour moi ». La passe gratuite peut viser le gardien loin derrière, rien ne change
dans `ai/`, et la ligne de dette correspondante est soldée.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. L'écran dans `client/src/match/Board.tsx` (les carrés retirés). La 2.5D est un bloc
client derrière l'interrupteur 2D / 3D : `client/src/board3d/`, `screens/Match.tsx` pour
l'interrupteur et le crochet, `e2e/board3d.spec.ts` pour les captures. Pas de sweep.

## C18. Décisions du 2026-10-15 après sa partie en 3D, **sous-phase 2H.16**

> Écrites par le fil principal (Fable 5.1) sur les retours de Jérôme après **sa partie en 3D**
> le 2026-10-15, la première sur la scène 2.5D de 2H.15, en local. Deux retours, tous deux de
> caméra, reformulés en chat et confirmés par lui avec deux arbitrages. **Aucun écart de règle,
> rien dans l'IA, aucune constante de `00` ne bouge : `ENGINE_VERSION` reste 9, les fonctions ne
> sont pas à redéployer.** La sous-phase 2H.16 porte ces deux retours, client seul.

**Retour 1, ses mots : « l'angle de la caméra devrait pouvoir être tourné à la souris librement
et zoomer in et out avec la roulette de la souris. »** C'est l'arbitrage J4 de `08` §7 qui tombe :
« trois quarts fixe en orientation, sans rotation libre, la rotation en option si elle manque ».
Elle manque. **La caméra tourne au bouton droit de la souris** (et au bouton du milieu), le bouton
gauche restant au jeu : clic sur une case, sur un pion, survol. Tranché par Jérôme : « oui bouton
droit ». Elle pivote autour du point qu'elle suit déjà, le pion dont c'est le tour, sinon le
ballon, et le centre du terrain en vue large. L'azimut est libre sur le tour entier ;
l'inclinaison est bornée pour ne jamais passer sous le sol ni regarder à ras. **La roulette règle
la distance en continu** entre un plus près et un plus loin. L'orientation et la distance
choisies restent d'un tour à l'autre, tant que le plateau 3D est monté. La minicarte reste fixe
et devient le repère « ma bouche à gauche » que J4 voulait garder.

**Le bouton « Close in / Whole silo » reste**, comme deux cadrages de départ, et la roulette et
la rotation s'appliquent par-dessus ; un clic sur le bouton remet la caméra au cadrage choisi,
azimut et inclinaison compris. Tranché par Jérôme : « oui il reste et on suit ta
recommandation ».

**Retour 2, ses mots : « le zoom du close in devrait prendre le terrain dans sa largeur, et pas
aussi près que maintenant. »** Le cadrage rapproché montrait dix-huit cases de long et coupait la
largeur. **Il cadre désormais les quinze cases de large dans la hauteur de l'image**, avec une
marge d'une case, et la caméra continue de glisser le long du terrain pour suivre le jeu. Le
cadrage large reste le silo entier, et il tient aussi la largeur quand la fenêtre est haute.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. La caméra de la 2.5D, `client/src/board3d/Camera.tsx`, et sa géométrie de cadrage,
pure et testée, dans `client/src/board3d/framing.ts` ; le bouton de zoom dans `Board3D.tsx` ;
`e2e/board3d.spec.ts` pour une capture après rotation et roulette. J4 de `08` §7 est annoté comme
tombé. Pas de sweep.

## C19. Décisions du 2026-10-15 après sa partie avec la caméra en main, **sous-phase 2H.17**

> Écrites par le fil principal (Fable 5.1) sur le retour de Jérôme après **sa partie sur 2H.16**
> le 2026-10-15, en local. Un retour, de caméra, reformulé en chat et confirmé par lui avec deux
> arbitrages. **Aucun écart de règle, rien dans l'IA, aucune constante de `00` ne bouge :**
> `ENGINE_VERSION` reste 9, les fonctions ne sont pas à redéployer. La sous-phase 2H.17 porte ce
> retour, client seul.

**Le retour, ses mots : « je voudrais quand même que l'on puisse décrocher la caméra du joueur
en cours si on le souhaite et naviguer le terrain avec la caméra comme on le souhaite, similaire
à ce qu'on peut faire dans Baldur's Gate 3 ou Blood Bowl. »** La caméra de C18 tourne et zoome,
mais autour du pion qu'elle suit, et on ne peut pas s'en éloigner. **Elle se déplace désormais
librement sur le terrain**, bornée au silo et à ses abords, et le suivi du jeu reste le
comportement par défaut.

**Comment elle se déplace.** Tranché par Jérôme : **les flèches du clavier**, et **Ctrl enfoncé
plus le mouvement de la souris**, comme il s'en souvient de Baldur's Gate 3. Pas de glisser au
bouton du milieu, pas de défilement au bord de l'écran. Le déplacement se lit par rapport à la
caméra, flèche du haut vers le loin de l'image quelle que soit la rotation ; sous Ctrl la souris
tire le sol avec elle. La vitesse au clavier grandit avec la distance de la caméra. Le bouton
droit, la roulette et les deux cadrages de C18 ne changent pas.

**Quand elle revient sur le jeu.** Tout déplacement la décroche. Tranché par Jérôme, option (c) :
**elle se raccroche d'elle-même quand c'est son tour**, le pion qu'il pilote arrivant sur
l'horloge ; les tours de l'IA la laissent là où il l'a mise. En plus, un bouton **« Follow the
play »**, visible seulement quand elle est décrochée, la ramène sur demande, et choisir un
cadrage par « Close in / Whole silo » la ramène aussi, avec l'orbite remise.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. `client/src/board3d/Camera.tsx` et `framing.ts` pour le déplacement et ses bornes,
`Board3D.tsx` pour le bouton et le raccrochage à son tour, `e2e/board3d.spec.ts` pour un pas aux
flèches. Pas de sweep.

## C20. Décisions du 2026-10-15 après sa partie avec la caméra décrochée, **sous-phase 2H.18**

> Écrites par le fil principal (Fable 5.1) sur le retour de Jérôme après **sa partie sur 2H.17**
> le 2026-10-15, en local. Un retour, de caméra, analysé dans le code et proposé en chat, puis
> tranché par lui en deux échanges. **Aucun écart de règle, rien dans l'IA, aucune constante de
> `00` ne bouge :** `ENGINE_VERSION` reste 9, les fonctions ne sont pas à redéployer. La
> sous-phase 2H.18 porte ce retour, client seul.

**Le retour, ses mots : « c'est pas mal, ça reste encore très tremblant et instable. Je ne sais
pas comment l'expliquer mais ça ne me paraît pas très stable. »** Il joue en normal, parfois en
slow. Les causes, lues dans `Camera.tsx` et `Board3D.tsx` de 2H.17 :

1. **Le pivot bougeait pendant la rotation** : l'azimut changeait tout de suite, le point visé
   était amorti d'un quart de seconde, donc le pion dérivait dans l'image puis revenait.
2. **La distance dépendait de l'inclinaison** (pour tenir la largeur du terrain) : incliner
   faisait avancer ou reculer la caméra et décalait le point visé, trois mouvements pour un geste.
3. **Le lissage était à l'envers** : rotation et roulette brutes (un cran, un saut de 10 %), mais
   le déplacement sous Ctrl amorti, le sol traînait derrière la souris comme un élastique.
4. **La caméra changeait de cible à chaque événement** pendant les tours de l'IA, le pion qui
   agit puis le suivant puis le pion sur l'horloge, sans jamais arriver.
5. **Le nombre d'images par seconde n'est pas mesuré** chez lui : quatorze modèles avec des
   ombres fines sur un GPU intégré peuvent tomber à vingt images par seconde.

**Ce qu'il a tranché.** La proposition d'une caméra à quatre nombres, chacun avec une valeur
visée et une valeur réelle lissée, est **refusée** : « c'est mécanique et s'éloigne de la notion
de libre ». Le reste est validé. Donc :

- **La main reste brute.** Le bouton droit tourne tout de suite, Ctrl plus la souris déplace le
  sol tout de suite, collé au curseur, sans amortissement.
- **Le pivot est exact** : tourner tourne autour de la cible, qui ne bouge pas d'un pixel.
- **La distance ne dépend plus de l'inclinaison.** Le cadrage se calcule quand on choisit « Close
  in » ou « Whole silo » et quand la fenêtre change de taille, à l'inclinaison de départ ;
  incliner ne fait qu'incliner, et la largeur du terrain n'est garantie qu'à cette inclinaison.
- **La roulette est douce** : un cran fixe une distance visée, la caméra y glisse en un dixième
  de seconde. **Les flèches ont une inertie** : la vitesse monte et redescend en un sixième de
  seconde.
- **Le suivi est calme** : accrochée, la caméra ne change de cible qu'une fois par action, jamais
  plus vite que quatre dixièmes de seconde, et glisse vers elle en un quart de seconde ; elle
  suit le pion qui agit (il joue en normal et en slow).
- **Un compteur d'images par seconde** s'affiche en mode développement, pour qu'il donne le
  chiffre. S'il est bas, les ombres et la résolution s'allègent avant de chercher plus loin.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. `client/src/board3d/Camera.tsx` et `scene.ts` (la caméra se place après les pièces et
avant les plaques, dans la même image), `Board3D.tsx` pour le compteur, `e2e/board3d.spec.ts` si
un pas change. Pas de sweep.

## C21. Décisions du 2026-10-15 après sa partie sur la caméra stable, **sous-phase 2H.19**

> Écrites par le fil principal (Fable 5.1) sur les retours de Jérôme après **sa partie sur 2H.18**
> le 2026-10-15 (match `cb618e32`, 13 h 38 heure de Paris, Striker, 30 à 20, consigné et rejoué
> sans écart dans `docs/matches/2026-10-15-cb618e32/`). Trois retours : le compteur, une
> latence et une erreur réseau, et le vide autour du terrain. **Aucun écart de règle, rien dans
> l'IA, aucune constante de `00` ne bouge :** `ENGINE_VERSION` reste 9, les fonctions ne sont pas
> à redéployer. La sous-phase 2H.19 porte ces retours, client seul.

**Le compteur : 45 à 50 images par seconde.** Suffisant, rien à alléger.

**La latence et l'erreur, ses mots : « au round 8, il y a eu une latence énorme de plusieurs
secondes entre mon clic et le déplacement de mon personnage » ; sur le Shove, « j'ai cliqué une
fois et j'ai eu le message d'erreur, puis j'ai cliqué une deuxième fois et ça a marché ».** Le
message était « could not reach the resolve-action server. Check your connection. » Lu en base :
au round 8, son déplacement est enregistré à 13:46:23, son Shove à 13:47:18, **une seule fois**,
raté au dé. Lu dans `client/src/lib/supabase.ts` : ce message vient d'un `fetch` rejeté par le
navigateur avant toute réponse, donc d'une coupure réseau, pas du serveur ; le client n'a ni
délai d'attente ni nouvelle tentative. Le premier clic n'a jamais atteint le serveur, le second
oui. La latence sur le déplacement, une minute plus tôt, est la même coupure qui ralentissait
déjà la ligne. **Décision du fil principal, à corriger par Jérôme** : sur un `fetch` rejeté, le
client attend une seconde et demie, relit la tête des événements du match, et **ne renvoie
l'action que si rien n'a avancé** ; si la tête a avancé, l'action est passée et seule la réponse
s'est perdue, le client recharge sans renvoyer. Une seule nouvelle tentative, puis le message.
Pas de changement serveur.

**Le vide autour du terrain, ses mots : « je crois aussi comprendre ce qui me dérange, je pense
que c'est le vide derrière les bouches et du côté du silo où il n'y a pas de mur. Je pense qu'on
y gagnerait à y mettre des bords de terrain et des gradins remplis de Giff en spectateurs (pas
3D, juste une plaque de skin). »** Accord du fil principal : l'œil juge un mouvement de caméra
contre un cadre fixe, et le noir n'en donne aucun. Fait :

- **Une rambarde** d'une case autour des deux longs côtés du terrain, à hauteur de taille, avec
  son image (`la rambarde.jpg`, Nano Banana Pro, convertie en WebP 2K).
- **Des gradins** sur les deux longs côtés et derrière chaque bouche, en pente, avec ses deux
  images de foule (`le gradin cyan.jpg`, `le gradin magenta.jpg`, WebP 2K), répétées en miroir
  pour cacher le raccord. Derrière chaque bouche, la couleur de l'équipe qui la défend ; sur les
  longs côtés, chaque moitié prend la couleur de la bouche la plus proche. Les plaques sont
  non éclairées pour garder la lumière de l'image.
- **Le tube s'élargit** pour loger les gradins : rayon 15 au lieu de 10, le sol du terrain reste
  quinze cases et un tablier sombre court jusqu'aux parois ; les plaques d'extrémité reculent
  derrière les gradins de fond.
- **Le gradin qui passe entre la caméra et le terrain s'efface** : quand la caméra descend bas du
  côté d'un gradin, celui-ci devient transparent, et revient dès qu'elle remonte.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. `client/src/board3d/Silo.tsx` et ses textures, `client/src/lib/supabase.ts` et
`client/src/match/useMatch.ts` pour la nouvelle tentative, `e2e/board3d.spec.ts` pour les
captures. Pas de sweep.

## C22. Décisions du 2026-10-15 après sa partie dans le silo fermé, **sous-phase 2H.20**

> Écrites par le fil principal (Fable 5.1) sur les retours de Jérôme après **sa partie sur 2H.19**
> le 2026-10-15. Un retour de caméra avec sa capture, et une question sur l'IA, lue dans le
> dump de son match `cb618e32` et pas supposée. **Aucun écart de règle, rien dans l'IA, aucune
> constante de `00` ne bouge :** `ENGINE_VERSION` reste 9, les fonctions ne sont pas à
> redéployer. La sous-phase 2H.20 porte le retour de caméra, client seul.

**Le retour, ses mots : « on se rapproche d'un truc bien. Je pense qu'il faut limiter le max
d'angle et zoom pour éviter de se retrouver en dehors du terrain ou avoir des angles
impossibles. »** Sa capture montre la caméra basse, déplacée au-delà de la ligne de touche
proche, qui voit le bord du tablier, l'extérieur du tube et le noir au-delà. Fait :

- **Le déplacement est borné au terrain plus une case** (il l'était à quatre).
- **L'inclinaison ne descend plus sous trente degrés** (vingt avant), ce qui garde la caméra
  au-dessus des têtes des gradins.
- **La roulette ne recule plus qu'à une fois et demie le cadrage** (deux fois et demie avant).
- **La caméra reste dans le silo** : tant qu'elle est sous le haut du tube, sa position est
  retenue entre les parois et les plaques de fond, et jamais sous une case et demie de haut ;
  au-dessus du haut du tube, qui est ouvert, elle est libre, et c'est là que se tient la vue du
  silo entier. La retenue s'applique à la position, le point visé ne change pas.

**La question, ses mots : « pourquoi en round 8 mon Breaker n'a pas tiré au but ? »** Lu dans
`docs/matches/2026-10-15-cb618e32/match.md`, round 8 : Nib Oakes, Breaker A, marche en (8, 34)
sous une allonge, **bouscule Ogga Flintlock et prend le ballon** (écart 61, un 20 naturel contre
un 1), ce qui dépense son Action. Il lui reste la passe gratuite de l'écart 63, qui est **« jamais
un tir »**, par la règle de Jérôme en C16. Il marche une case en (9, 35) et passe à Dolm Halyard,
l'autre Breaker, qui avait déjà joué son tour, parce qu'un receveur qui a déjà joué n'a aucune
exposition à l'arrivée (125 points contre 58 pour Harrow Flintlock devant). Dolm, Action
dépensée lui aussi, garde le ballon jusqu'à ce que Marrow Flintlock le lui prenne par un Shove au
tour suivant. **Aucune décision** : c'est la règle de l'écart 63 qui a joué, et le Breaker porte
un poids de tir de 15 pour « tout sauf tirer » (C10). S'il voulait que la passe gratuite puisse
devenir un tir, ou que le Breaker tire à portée propre, ce serait un écart à écrire ici.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. `client/src/board3d/framing.ts` (`confine`, les bornes), `layoutGeometry.ts` (les
dimensions du silo partagées avec `Silo.tsx`), `Camera.tsx`. Pas de sweep.

## C23. Décisions du 2026-10-15 au soir après 2H.20, **sous-phase 2H.21, le jeu vivant**

> Écrites par le fil principal (Fable 5.1) sur la demande de Jérôme à la fin du chat de 2H.20
> (« on a une bonne version pour l'instant, on peaufinera peut-être des détails plus tard.
> Maintenant on passe à la version suivante : les animations, et j'aimerais aussi qu'on améliore
> les annonces à l'écran, les popups d'événements. Bref, rendre le jeu plus visuellement
> interactif et vivant, sans surcharge »), puis sur le lot de dix lignes proposé en chat et
> **validé par lui le 2026-10-15** avec deux réponses : les chiffres de dégâts aussi en 2D, et les
> durées de bandeau telles que proposées. **Aucun écart de règle, rien dans l'IA, aucune constante
> de `00` ne bouge :** `ENGINE_VERSION` reste 9, les fonctions ne sont pas à redéployer. La caméra
> de C18 à C22 n'est pas touchée. Client seul.

**L'inventaire avant de proposer**, lu dans le code. Les animations de 2H.15 couvrent la marche,
la poussée, le recul, le roulement des Crackers et du Spark et le vol du ballon (`match/pose.ts`
lu par la boucle de `Board3D`), l'éclat de la bouche au but (`Silo.tsx`, 1,2 s), la lueur de
mèche des Crackers, le halo du Spark, l'anneau du ballon au sol. Un Giff évacué disparaissait
d'un coup, un Cracker qui détonne s'évaporait à la fin du beat, un coup de batte ne se voyait
pas du tout. Les annonces : la carte de beat (`Announce.tsx`, « The silo » pour un round sans
acteur), le score qui gonfle au but, les bandeaux « The clock ran out » et de refus, le fil
« The call », la popup de place. Rien n'annonçait le début d'un round, le tour du joueur ni
l'entrée du Spark autrement que par une ligne de carte.

**Le lot, dix lignes, tel que validé.**

Animations, en 3D seulement sauf la ligne 1, `board3d/Effects.tsx` nouveau plus la boucle de
`Board3D` :

1. **Le coup de batte.** À l'instant du coup, un éclat d'étincelles ambre sur la cible touchée, et
   le chiffre des dégâts (« −7 ») qui monte au-dessus d'elle et s'efface en une seconde. Sur un
   coup manqué, un « miss » gris qui monte, rien d'autre. **Les chiffres et les mots qui montent
   existent aussi en 2D** (Jérôme, question 1), l'éclat d'étincelles non.
2. **Le Cracker qui détonne.** Au bout de sa course, une explosion sur sa case : boule de feu qui
   gonfle, fumée, éclair de lumière une demi-seconde. Le Cracker disparaît dans l'explosion au
   lieu de s'évaporer à la fin du beat.
3. **Le Shove.** Une onde au sol sous la cible au moment où elle est poussée. Sur un Shove tenu,
   « held » monte au-dessus d'elle, même système que la ligne 1.
4. **Le but.** Quand le ballon entre dans la bouche, des braises jaillissent avec l'éclat déjà en
   place.
5. **Le Spark.** À son entrée, il descend du haut du tube dans un faisceau de lumière. À la prise,
   un flash blanc sur le preneur et le Spark s'éteint.
6. **Évacuation et retour.** Le Giff évacué s'affaisse dans le sol en une demi-seconde. Le
   remplaçant monte du sol dans un anneau de sa couleur.

Annonces, dans les deux plateaux, `screens/Match.tsx` et les composants partagés :

7. **Un bandeau d'événement** en haut du plateau, un seul à la fois, en fondu : « GOAL · Your
   battery », « KNOCKOUT · Nib Oakes », « THE SPARK IS LOOSE », « SPARK CAUGHT · Nib Oakes »,
   « FULL TIME ». **1,5 s en normal, 2,5 s en slow** (Jérôme, question 2), jamais en rejeu
   instant, où il s'empilerait.
8. **Un bandeau de round et de tour**, plus fin, même système : « ROUND 4 of 10 » au début de
   chaque round, « SUDDEN DEATH », et « YOUR TURN · Nib Oakes » quand le pion du joueur arrive sur
   l'horloge.
9. **La carte de beat refaite.** Le nom de l'acteur dans la couleur de son maillot, le verdict
   (HIT, MISS, SHOVED, HELD, IN, NO, CAUGHT, DROPPED, CLEAN, MISSED) en gros et coloré à droite de
   la ligne, le dé en petit dessous, une barre fine qui dit combien de temps la carte reste.
10. **Le fil.** Les lignes du dernier lot portent une barre cuivre à gauche qui s'efface en trois
    secondes, pour voir ce qui est neuf. But et KO en gras avec un pictogramme. Le fil reste la
    source, rien ne lui est retiré.

**Les règles du lot.** Un effet par événement ; aucun effet ni bandeau au rejeu instant ; rien ne
clignote, tout est un fondu ou un éclat unique ; la caméra n'est pas touchée ; le fil reste la
source. Les repères (quel effet, sur quelle case, à quel instant du beat) sont lus des événements
et des pas de `motion.ts`, jamais inventés : un effet se place après tous les pas produits par les
événements qui le précèdent dans le beat, donc l'explosion au bout du roulement du Cracker, les
braises au bout du vol du tir, l'impact avant le recul.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. `client/src/match/motion.ts` (les repères), `replay.ts` (le beat les porte),
`useMatch.ts` (la durée de la carte exposée), `screens/Match.tsx` (les bandeaux, la carte, le
déclencheur de développement du crochet), `match/Banner.tsx` nouveau, `Announce.tsx`, `Feed.tsx`,
`Board.tsx` (les mots qui montent en 2D), `board3d/Effects.tsx` et `Floaters.tsx` nouveaux,
`Board3D.tsx`, `scene.ts`, `e2e/board3d.spec.ts` pour une capture par effet, le smoke 2D relancé
parce que `Match.tsx`, `Feed.tsx` et `Board.tsx` sont partagés. Pas de sweep.

**Comment 2H.21 est codée**, par le fil principal (Fable 5.1) le 2026-10-15, avec six
sous-agents Sonnet nommés ci-dessous, pour relire le code contre les dix lignes. **Codé en 2H.21.**

- **Les repères (`Cue`), `match/motion.ts`**, fil principal. `motionAndCues` fait la marche des
  événements qui produisait déjà les pas et en tire, au même passage, les repères : `hit` et
  `miss` sur la cible d'un coup (`attacked`, `opportunityAttacked`), `damage` avec le chiffre
  (`damaged`, « −7 »), `push` sous la cible d'un Shove réussi là où elle se tenait avant la
  poussée, `held` sur un Shove tenu, `blast` sur la case de `crackerDetonated`, `goal` sur la
  case de bouche où le vol du tir a posé le ballon (`scored`, `team` = l'équipe qui défend la
  bouche), `sparkIn` (`sparkEntered`), `sparkCaught`, `exit` (`evacuated`), `enter`
  (`substituteEntered`). Chaque repère porte `after`, le nombre de pas déjà produits ;
  `timeMotion` le date à la somme de ces pas, zéro à `instant`, et `Motion` porte `speed` et
  `cues`. `Beat` (`replay.ts`) porte les repères non datés. Sept tests dans `motion.test.ts`.
- **La boucle de `Board3D.tsx`**, fil principal : la piste du beat porte ses repères datés, vides
  à `instant` et vides quand le même mouvement revient avec un autre état ; à chaque image les
  repères dont l'instant est passé sont tirés une fois, dans l'ordre, par `fire`. Sparks, anneau,
  explosion, braises, faisceau et flash vont à `link.fx` (`Effects.tsx`) ; les mots à
  `link.float` (`Floaters.tsx`), dans le maillot du Giff concerné, gris (`FAINT`) pour « miss » et
  « held » ; `exit`, `enter` et la descente du Spark sont des transitions de `link.transitions`
  que la boucle place : un évacué reste debout jusqu'à son repère puis s'enfonce de 1,9 case en
  0,6 s, un remplaçant est caché jusqu'au sien puis monte, le Spark descend de six cases en
  0,5 s. `scene.ts` porte `fx`, `float`, `transitions`, `MAGENTA`, `FAINT`.
- **`board3d/Effects.tsx`**, nouveau, **sous-agent Sonnet effort élevé** : huit emplacements
  pré-construits (flash, anneau, boule de feu, faisceau, quatre fumées, quatorze étincelles,
  vingt-quatre braises) et trois lumières prêtées à tour de rôle, une texture radiale procédurale
  pour tous les sprites, une seule `useFrame`, aucun état React ; `hit` 0,45 s, `push` 0,4 s,
  `blast` 0,6 s de boule de feu et 1,2 s de fumée, `goal` 1 s, `sparkIn` 0,6 s, `sparkCaught`
  0,4 s. Rien ne clignote.
- **`board3d/Floaters.tsx`**, nouveau, **sous-agent Sonnet effort moyen** : la couche DOM des
  mots qui montent, sur le modèle de `Labels.tsx`, impérative, projetée par `link.project` à
  chaque image, `bb-rise` 1 s, retirée à 1,1 s. Jamais `Html` de drei.
- **`match/Board.tsx`**, 2D, **sous-agent Sonnet effort élevé** : les repères `damage`, `miss`,
  `held` du mouvement reçu sont programmés à leur instant par `setTimeout`, rien à `instant`, et
  dessinés en `<text>` SVG avec deux `<animate>` SMIL (montée d'une case, fondu), dernier calque
  du plateau. C'est la réponse à sa question 1.
- **`match/Banner.tsx`**, nouveau, **sous-agent Sonnet effort moyen** : une file append-only
  d'annonces, une seule à l'écran, `bannerHoldMs` 1,5 s / 2,5 s en slow pour `loud`, 1,2 s /
  1,8 s pour `round` et `turn`, `bb-banner`, `data-testid="banner"`, `data-banner`. **`screens/
  Match.tsx`**, fil principal, les dérive du beat affiché (jamais à `instant`) : « Round n of
  10 » ou « Sudden death », « Goal · Your battery / The House » (ballon seulement, la prise du
  Spark a sa bannière), « Knockout · nom », « The Spark is loose », « Spark caught · nom »,
  « Full time » ; et « Your turn · nom » quand le tour devient jouable (pas pendant la popup de
  place), qui remplace ce que la file avait encore à dire.
- **`match/Announce.tsx`**, **sous-agent Sonnet effort moyen** : `actorColour` (le maillot,
  calculé par `Match.tsx`, ambre pour le pion du joueur), le verdict détaché de la ligne quand
  sa queue après « · » est un mot en capitales, en gros à droite, le dé dessous, une barre
  `bb-drain` de la durée de la carte (`hold` exposé par `useMatch.ts`, zéro quand la carte reste
  après le rejeu), « ⚠ The silo » pour un beat sans acteur, `data-testid="beat-card"`,
  `data-verdict`.
- **`match/Feed.tsx`**, **sous-agent Sonnet effort moyen** : les lignes du dernier lot portent
  `data-fresh` et `bb-fresh` 3 s (comptées par la taille du fil, rien au premier rendu),
  « ◆ » devant un but, « ✕ » et gras devant un KO ; `feedLines` rend aussi l'index de
  l'événement.
- **Le déclencheur de développement**, fil principal : `window.__boomball.fx({ kind, x, y,
  text?, unitId?, team?, stretch? })` passe par `match/fxBridge.ts`, que chaque plateau arme
  pendant qu'il est monté (`import.meta.env.DEV`), et tire un repère comme le beat l'aurait fait ;
  `stretch` ralentit cet effet d'autant, parce que le GL logiciel de Chromium headless dessine
  trois images par seconde et qu'une capture dure plus qu'un éclat ; sous `VITE_BOOMBALL_PATIENT`
  les bandeaux sont tenus quatre fois plus longtemps pour la même raison.
- **Tests** : **676 sur 31 fichiers contre 669**, typecheck racine, scripts, e2e et client verts,
  build du client vert (three dans le chunk `Board3D`, 1,06 Mo, chargé en lazy).
- **Harnais** : `e2e/board3d.spec.ts` tire chaque effet par `fx` à `stretch` 6 sur une case du
  milieu du terrain (le mot vérifié dans le DOM avant la capture), puis joue un round de l'IA en
  slow sans attendre la réponse, capture le premier bandeau de round ou d'événement et le verdict
  de la carte, repasse en instant, et vérifie le bandeau « Your turn » et une ligne fraîche du fil
  au retour de son tour ; il tolère la fin du match pendant ce round. **Vert en 5,5 min** sur le
  Vite 5174, zéro erreur console, le temps du test porté à neuf minutes. **Smoke 2D vert en
  18,6 s.** Captures lues : le bandeau « ROUND 3 OF 10 » au-dessus du plateau avec la carte et
  sa barre de temps ; la carte « Yarrow Oakes reaches for the Spark · CAUGHT » avec le dé dessous
  et le verdict en magenta ; « ✕ Vandy Grapple is knocked out » en gras dans le fil ; en vue
  large, l'explosion orange sur la case et le faisceau blanc du Spark. **Les captures des
  étincelles, de l'anneau, des braises, du flash et de l'affaissement sont des images figées
  sous le GL logiciel** : les effets sont dans la scène (le DOM des mots et l'explosion le
  prouvent), mais ces cinq-là restent à voir chez Jérôme à 45 images par seconde.

## C24. Décisions du 2026-10-15 après sa partie sur 2H.21, **sous-phase 2H.22, le jeu vivant, deuxième passe**

> Écrites par le fil principal (Fable 5.1) sur les sept retours de Jérôme en chat après sa partie
> sur 2H.21 (en 3D et en 2D), reformulés et **validés par lui le 2026-10-15** avec ses réponses :
> BAT et DODGE en plus des sept mots, le texte du bandeau de but, la barre visée est celle de la
> carte de beat, le son synthétisé pour l'instant, le pantin en attendant le rig. **Aucun écart
> de règle, rien dans l'IA, aucune constante de `00` ne bouge :** `ENGINE_VERSION` reste 9, les
> fonctions ne sont pas à redéployer. La caméra de C18 à C22 n'est pas touchée. Client seul.

1. **Les mots au-dessus des têtes, deux fois plus gros.** Ses mots : « je veux que les fonts de
   ce qui popup au-dessus des têtes des joueurs soient doublées en taille ». 28 px en 3D
   (`Floaters.tsx`, 14 avant), 26 unités en 2D (`Board.tsx`, 13 avant), le contour noir épaissi
   d'autant.
2. **Toutes les actions montent au-dessus de l'acteur.** Ses mots : « toutes les actions
   apparaissent en popup au-dessus des têtes : SWING, PASS, ATCK OP, SHOVE, SHOOT, DISENGAGE,
   DASH », plus BAT et DODGE sur sa réponse. Nouveau repère `action` dans `motion.ts`, posé sur la
   case de l'acteur à l'instant de l'événement, dans la couleur de son maillot, dans les deux
   plateaux : SWING (`attacked`), ATCK OP (`opportunityAttacked`), SHOVE (`shoved`), SHOOT
   (`shotAtFurnace`), PASS (`passed`), DISENGAGE (`disengaged`), DASH (`dashed`), BAT
   (`crackerBatted`), DODGE (`dodging`). Le chiffre des dégâts reste sur la cible, « miss » et
   « held » aussi.
3. **Le but, plus visible.** Ses mots : « quand il y a un but la popup soit plus visible et font
   augmentée ». Le bandeau de but devient une sorte à part (`goal` dans `Banner.tsx`) : 40 px,
   cœur blanc, halo dans la couleur de l'équipe, tenu 2,5 s en normal et 4 s en slow. Son texte,
   sur sa demande : « Goal · Your Team » et « Goal · The other Team ». Le fil (« Your battery »,
   « The house ») et l'étiquette The House du bandeau de score ne changent pas.
4. **Les mots tenus deux fois plus longtemps.** Ses mots : « les popups au-dessus des têtes
   restent 2 fois plus longtemps en mode normal (les dégâts, les miss, les actions, ... tous) ».
   2 s en normal, 3 s en slow, 1 s avant quelle que soit la vitesse, la montée ralentie d'autant.
   Tous : dégâts, miss, held et les neuf actions.
5. **La barre de temps de la carte de beat est retirée.** Ses mots : « enlève la barre de
   défilement dans la boîte du bas, c'est stressant pour lire », avec la capture de la carte de
   beat et sa barre cuivre en bas (ligne 9 de C23). Le reste de la carte reste : nom en couleur,
   verdict à droite, dé dessous.
6. **Le son, synthétisé.** Sa question : « est-il possible de mettre du son au jeu ? si oui j'en
   veux ». Oui, par Web Audio, sans fichier : `client/src/match/sound.ts`, un son par repère
   (coup qui touche, coup manqué, Shove et Shove tenu, explosion, but, entrée et prise du Spark,
   évacuation, retour) et par action (le sifflement d'une batte, le lancer, le tir, le Dash),
   plus le sifflet au début de round et le sifflet long à la fin du match, tirés au même instant
   que les effets, dans les deux plateaux, depuis `Match.tsx` et pas depuis un plateau. Un bouton
   son allumé / coupé à côté de « See it in 3D », choix gardé dans `localStorage`, allumé par
   défaut. Silence au rejeu instant. Le contexte audio ne se crée qu'au premier geste du joueur,
   parce que Chrome refuse de le démarrer avant et le dit en console, et le harnais échoue sur
   toute ligne console. Des échantillons CC0 plus tard si le synthétique déçoit, à son choix.
7. **Le pantin, en attendant un modèle riggé.** Sa question : « sera-t-il possible d'avoir les
   animations des joueurs qui courent et des coups de batte ? ». Pas avec le modèle actuel : son
   GLB est un seul maillage sans squelette ni clip d'animation (export trimesh, deux nœuds). Les
   vrais clips demandent un modèle riggé (Mixamo sur le maillage en pose neutre, bras écartés,
   puis export GLB ; ou Blender) et sont une sous-phase à part qui attend ce modèle. En
   attendant, la boucle de `Board3D` anime le maillage entier : balancement et inclinaison vers
   l'avant en marche, torsion rapide du corps au coup (SWING, ATCK OP, BAT), poussée en avant au
   SHOVE, recul de la cible poussée, sans toucher ni bras ni jambes. Sur sa réponse : oui.

**Les règles du lot.** Celles de C23 : un effet par événement, rien au rejeu instant, rien ne
clignote, la caméra n'est pas touchée, le fil reste la source. Un son par repère, jamais deux
pour le même instant sauf le sifflement de la batte avant son impact.

**Ce que ces décisions rouvrent.** Rien dans les constantes de `00`, rien dans `ai/`, rien dans
`engine/`. `client/src/match/motion.ts` (le repère `action`, les durées des mots), `scene.ts`
(la durée passée au mot), `Floaters.tsx`, `Board.tsx`, `Banner.tsx`, `Announce.tsx`,
`Match.tsx` (le bandeau de but, le son, le bouton), `Board3D.tsx` (le pantin, les actions),
`sound.ts` nouveau, `fxBridge.ts` et `testHook.ts` (un bandeau à la demande pour le harnais),
`e2e/board3d.spec.ts`. Le smoke 2D relancé. Pas de sweep.

**Comment 2H.22 est codée**, par le fil principal (Fable 5.1) le 2026-10-15 au soir, avec quatre
sous-agents nommés ci-dessous. **Codé en 2H.22.**

- **Le repère `action`, `match/motion.ts`**, fil principal. `ACTION_WORDS` donne le mot par sorte
  d'événement (neuf), `action()` le pose sur la case de l'acteur telle qu'elle est suivie à cet
  instant (DASH avant la marche, DISENGAGE après, là où elle a fini), avec `toward`, la case
  visée quand il y en a une (la cible du coup, du Shove ou de l'attaque d'opportunité, le
  receveur de la passe, la trappe du tir, le Cracker batté). Sur un coup, le mot de l'attaquant
  précède `hit` ou `miss` sur la cible. `FLOAT_MS` : 3000 en slow, 2000 en normal, 0 en instant.
  Trois tests de plus dans `motion.test.ts`, les anciens filtrent les `action`.
- **Les mots, `board3d/Floaters.tsx`** (sous-agent Sonnet, effort moyen) : `link.float(text,
  colour, at, lifeMs)`, 28 px, contour épaissi, `bb-rise` de la durée du mot, retiré 100 ms
  après ; **`match/Board.tsx`** (Sonnet, élevé) : le repère `action` dans la couleur du maillot
  de l'acteur, `px(26)`, trait `px(5)`, montée d'une case et demie, vie `FLOAT_MS[speed]` fois le
  `stretch` ; `bb-rise` dans `theme.css` monte de 64 px et tient 70 % de sa durée pleine.
- **Le bandeau de but, `match/Banner.tsx`** (Sonnet, moyen) : la sorte `goal`, 2 500 ms en
  normal et 4 000 en slow, 40 px, blanc, bordure et halo dans la couleur de l'équipe
  (`data-banner="goal"`) ; **`screens/Match.tsx`**, fil principal : « Goal · Your Team » et
  « Goal · The other Team », et `fxBridge.announce` en développement pour que le harnais dise un
  bandeau sans but (`fx({ kind: 'banner', banner, text, tone })`).
- **La carte, `match/Announce.tsx`**, fil principal : la barre `bb-drain` et la propriété `hold`
  retirées, `useMatch.hold` retiré avec elles, la keyframe aussi.
- **Le son, `match/sound.ts` nouveau** (sous-agent Opus 5.5, effort élevé, sur le brief fermé du
  fil principal) : `createSounds()`, `play(kind)`, `enabled`, `setEnabled`, `dispose` ; seize
  recettes (`swing`, `hit`, `miss`, `push`, `held`, `blast`, `goal`, `sparkIn`, `sparkCaught`,
  `exit`, `enter`, `throw`, `shoot`, `dash`, `whistle`, `fullTime`), un buffer de bruit blanc,
  oscillateurs et filtres, enveloppes jamais à zéro, compresseur puis master à 0,5, douze voix au
  plus. Le contexte audio ne naît que dans un gestionnaire `pointerdown`, `pointerup`, `keydown`
  ou `touchend` sur `window`, et seulement si `navigator.userActivation.isActive` le confirme :
  avant, chaque `play` est jeté sans un mot. Clé `boomball.sound`, allumé par défaut. Quatre
  tests sur la lecture et l'écriture du choix, aucun test audio. **`Match.tsx`** crée l'instance
  au montage, la ferme au démontage, programme un son par repère à son instant (`soundOf` :
  SWING, ATCK OP et BAT sifflent, PASS lance, SHOOT tire, DASH court ; SHOVE, DISENGAGE et DODGE
  n'ont pas de son propre, le Shove sonne par `push` ou `held` ; `damage` se tait, le coup a déjà
  claqué), le sifflet sur `roundStarted` et le long sur `matchEnded`, rien à `instant` ; le
  bouton « ♪ Sound on / Sound off », `data-testid="sound-toggle"`, `data-sound`.
- **Le pantin, `board3d/Board3D.tsx`**, fil principal. `scene.ts` porte `link.gestures` (`swing`,
  `lunge`, `flinch`, `throw`, avec `toward`). `fire` pose un `swing` sur l'acteur de SWING, ATCK
  OP et BAT, un `lunge` sur celui de SHOVE, un `throw` sur celui de PASS et SHOOT, et un `flinch`
  sur la cible d'un `hit` ou d'un `push`. La boucle : en marche, le corps monte de `BOB` 0,07 une
  fois par case (`STRIDE`) et penche de `LEAN` 0,14 rad vers l'avant, lissé ; le `swing` tourne
  le Giff vers sa cible, le recule de 0,7 rad puis le fait passer à +1 rad et revenir en 420 ms ;
  le `lunge` le pousse de `LUNGE` 0,35 case vers la cible en 320 ms ; le `flinch` le penche en
  arrière de 0,3 rad en 300 ms ; le `throw` l'incline de 0,2 rad. L'ordre d'Euler du pion passe
  en `YXZ` pour que la pente suive le cap. Ni bras ni jambes : le maillage est entier.
- **Le fil, `match/Feed.tsx`**, fil principal, un défaut de 2H.21 trouvé par le harnais : les
  lignes neuves étaient jugées par la taille du fil, aveugle dès que la fenêtre de 120 est pleine
  (un lot entre, autant sort devant, la taille ne bouge pas). Le dernier événement du rendu
  précédent est retenu par son contenu, tout ce qui suit sa copie la plus récente est neuf.
- **Tests** : **683 sur 32 fichiers contre 676**, typecheck racine, scripts, e2e et client verts,
  build vert (chunk `Board3D` 1,06 Mo, lazy).
- **Harnais** : `e2e/board3d.spec.ts` tire aussi `action` SWING sur le Giff suivi (le mot vérifié
  dans le DOM), dit le bandeau de but par le crochet et le capture, lit le bouton son (`on`,
  clic, `off`, clic, `on`). **Vert en 5,6 min** sur le Vite 5174 chauffé, zéro erreur console ;
  **smoke 2D vert en 18,3 s**. Captures lues : « SWING » en 28 px magenta sur Grim avec son « 47 »
  et « −7 » en gros ; « GOAL · YOUR TEAM » blanc à halo cyan au-dessus du silo ; la carte
  « Harrow Cannonade reaches for the Spark · MISSED » sans barre ; « ♪ SOUND ON » dans la barre
  de rejeu. Le pantin et le son ne se capturent pas : à voir et à entendre chez Jérôme.
- **Deux faits du harnais, sans décision.** Un `resolve-action` a répondu 404 « no such match »
  une fois, au tour suivi après trois minutes d'effets, sur un match que la base montrait bien
  en cours ; la relance a passé. Et quand le match e2e atteint le sifflet pendant le smoke, le
  smoke suivant en ouvre un nouveau de lui-même.

**Le soir même, après sa partie sur 2H.22 : « je n'ai entendu aucun son, même après avoir
activé le sound on, et je n'ai pas vu d'animation de pantin, vérifie ton travail ».** Vérifié
par le fil principal, trois faits.

- **Le son ne jouait pas, et c'était un défaut.** `Match.tsx` gardait l'instance de son dans un
  état React et la fermait par un effet à part ; React StrictMode répète chaque effet en
  développement (montage, nettoyage, montage), donc `dispose()` partait à la répétition et
  l'instance était morte avant le premier clic. Le harnais voyait le bouton et rien d'autre.
  Corrigé : l'instance naît et meurt dans un seul effet, lue par une référence ; le module
  expose `state` (`waiting`, `running`, `disposed`) et le crochet `audio()`, et le spec 3D
  affirme `running` après les clics sur le bouton. **Le pantin, lui, marchait** : le crochet
  `probe(unitId)` (développement seulement, `fxBridge.probe`) lit la rotation et la hauteur du
  pion, et pendant un SWING le cap passe de 1,57 à 0,60 puis 2,60 rad avec une pente de 0,2 et
  un bob de 0,05 ; deux captures à une seconde d'écart étaient pourtant identiques, le GL
  logiciel ne les prend pas au bon moment. Le spec 3D lit donc le pantin par la sonde et plus
  par une capture. Les amplitudes ont été doublées pour qu'il se voie à 45 images par seconde :
  bob 0,12, pente 0,22, roulis 0,08 en marche ; le coup en 650 ms, recul 1 rad et frappe 1,4
  rad ; le Shove 0,5 case en 450 ms ; le recul de la cible 0,45 rad.
- **Ses trois sons.** Il a déposé `swing.wav`, `goal.wav` et `explosion cracker.wav` ; convertis
  par ffmpeg en MP3 dans `client/public/sounds/` (`swing`, `goal`, `blast`), la table `SAMPLES`
  de `sound.ts` les nomme avec un gain (0,7 pour le but et l'explosion, masterisés à 0 dB), ils
  sont décodés une fois le contexte lancé et jouent à la place de la recette de leur sorte ; les
  treize autres restent synthétisées jusqu'à ce qu'il en dépose d'autres.
- **Le 404 revu, et rattrapé côté client.** Le même « no such match » est revenu au harnais sur
  la première requête après trois minutes sans action, sur un match que la base montrait en
  cours ; la lecture REST du même match passe. Cause serveur non trouvée (la fonction répond
  404 quand sa double lecture `match_state` et `matches` par `.single()` échoue). `useMatch.send`
  traite désormais cette réponse comme une réponse perdue (C21) : attente, lecture de la tête
  par REST, renvoi une fois.
- **Quatre sons de plus, la nuit du 15.** Ses mots : « le jetpack 1 et 2 c'est pour le dash, car
  dans ma tête les Giff ont des jetpacks et donc quand ils accélèrent on entend le burst du
  jetpack ; pour les sons de crowd, elles ne sont pas des loops parfaites, donc à manipuler, je te
  laisse choisir ». Fait : le Dash joue le deuxième des trois bursts de `jetpack1.aiff` (4,00 à
  5,60 s, fondu de sortie 300 ms, `dash.mp3`, gain 0,8) ; `jetpack2.wav` est un jet continu sans
  burst, gardé pour plus tard. La foule : `crowd2.wav` retenu (61 s au niveau stable, −17 dB
  partout) contre `crowd1.wav` (4 min, des vagues de −13 à −66 dB, matière pour des réactions,
  pas pour un fond) ; trente secondes découpées et la fin fondue sur le début en 1,5 s, boucle
  sans couture (`crowd.mp3`), jouée en fond à 0,16 dès que le contexte tourne et que le son est
  allumé (ramenée à 0,11 le 2026-10-16, ses mots : « un tout petit peu trop fort », trois
  décibels de moins) (`AMBIENCE` dans `sound.ts`, `loopStart` et `loopEnd` à 60 ms des bords pour éviter le
  clic du remplissage MP3), coupée et reprise par le bouton son.
- **Les sources des assets** (les trois JPEG des gradins et de la rambarde, le JPEG du Giff en
  2D, le GLB source, les trois WAV, les trois archives ambientCG) sont déplacées de
  `context/import/` vers `boomball/assets/source/`, avec un README qui dit le dérivé de chacune.
  36 Mo, non commités sauf sa décision.

## C25. Décisions du 2026-10-16 après sa partie sur 2H.22, **sous-phase 2H.23, trois défauts d'écran**

> Écrites par le fil principal (Fable 5.1) sur les retours de Jérôme en chat le 2026-10-16, après
> sa partie sur 2H.22 en 3D et en 2D avec le son. Ses mots d'abord : « j'ai tout testé et tout me
> va, sauf le son de la foule est un tout petit peu trop fort ». La foule est ramenée de 0,16 à
> 0,11 (C24, note du 16). Le pantin et `Tokens.tsx` sont réservés à son autre chat, qui rigge le
> Giff sous Blender : rien ici ne les touche. Sa partie `2e30f587` n'est pas à analyser (ouverte
> pour une capture, laissée tourner sans jouer). Le client en ligne attend encore. **Aucun écart
> de règle, rien dans l'IA, aucune constante de `00` ne bouge :** `ENGINE_VERSION` reste 9, les
> fonctions ne sont pas à redéployer. Client, harnais et `dump-match` seuls.

1. **Le chrono qui expire pendant la popup de place.** Ses mots : « le message devrait dire
   qu'on joue en dernier, et le mettre en dernier de l'initiative de ce rôle. un truc du genre
   "Default initiative - you go last" ». Constat dans le code : le serveur le fait déjà depuis
   l'écart 58 (`expireIfDue` dans `server/session.ts` choisit la dernière place quand la popup
   expire, et le tour de l'humain s'ouvre quand l'échelle l'atteint, avec un chrono entier).
   Seul l'écran mentait : `useMatch.expired` était un booléen et `Match.tsx` disait « Your Giff
   took cover » dans les deux cas. Décidé : `expired` devient `'turn' | 'place' | null`, jugé
   sur l'état d'avant l'envoi (`placing` posé ou non) ; la note dit **« Default initiative ·
   you go last »** puis « The clock ran out before you chose your place. Your Giff plays last
   of the Strikers this round; your turn opens when the ladder reaches it, with a full clock. »
   (Breakers selon le rôle). L'autre cas garde « The clock ran out » et « took cover ». Le
   briefing le dit en une phrase. Le crochet gagne `fx({ kind: 'notice', notice: 'place' })`
   pour capturer la note sans attendre deux minutes, développement seulement.
2. **« Call for the ball » grisé pendant la popup.** Ses mots : « ok, à griser ». Le bouton est
   `disabled` tant que `placing` n'est pas nul, en plus de `yours`, `replaying` et `busy`.
3. **La passe gratuite dans le fil.** Ses mots : « ok, il suffit juste de faire une phrase
   différente qui clarifie la situation. utile pour les logs également. » Constat : l'événement
   `passed` ne dit pas qu'elle était gratuite, et on ne touche pas aux événements (ils sont en
   base et les relectures se comparent dessus). Le fil la déduit : un `shoved` avec
   `tookPayload` par la même unité, plus tôt dans le même tour, fait de la passe qui suit la
   passe gratuite de l'écart 63. Phrases : **« Grim throws the free pass off his Shove to
   Varn. »**, « ..., and it spills. » si elle tombe ; interceptée, « Zed picks off Grim's free
   pass to Varn. » et « ... reaches for Grim's free pass to Varn and misses. ». `dump-match`
   marque la même passe « (free pass, off the Shove) » dans `match.md` : ce sont ses logs.
4. **Les défauts mineurs, à ma main.** Ses mots : « gère-les en background de ton côté. pas
   besoin que je tranche dessus, tu sais déjà quoi faire. » Décidé : (a) **la route proposée au
   clic et sous le curseur est la route sûre**, celle de l'IA (`safePathTo` sur
   `safeReachableCells`), dans les deux plateaux et dans `clickCell` du crochet ; quand rien ne
   provoque elle est la ligne droite d'avant, et les étapes à la main restent possibles ; (b)
   **la popup de place se reborne quand la fenêtre change de taille**, par le même `clamp` que
   le glisser ; (c) **le choix de direction d'un Breaker humain à la parade reste automatique** :
   le rendre à l'humain veut dire arrêter le roulement des Crackers pour une décision, un
   nouvel état de tour, `ENGINE_VERSION` et un redéploiement, c'est noté dans les
   fonctionnalités à venir de `05` ; (d) `FEED_LIMIT` reste à 120.

Fonctionnalités à venir, notées sur ses mots le même jour, à cadrer avec lui avant toute ligne
de code : choisir son niveau de ligue quand les niveaux d'en dessous sont déjà débloqués, le mode
multijoueur, annuler un match en cours et en sortir, d'autres à voir.

**Comment 2H.23 est codée** (le 2026-10-16, fil principal Fable 5.1 et trois sous-agents Sonnet
effort moyen, un par fichier disjoint). **La note du chrono** : `useMatch.expired` est
`'turn' | 'place' | null`, décidé au retour `expired` sur le plateau d'avant l'envoi
(`before.turn.placing` posé, c'est la popup qui a expiré) ; `Match.tsx` rend un seul bloc
`data-testid="clock-notice"` avec `data-notice`, le libellé « Default initiative · you go last »
et la phrase avec le pluriel du rôle de `mineId` (`roleName`), l'autre cas inchangé ;
`fxBridge.notice` et `fx({ kind: 'notice', notice })` sous `HOOK_ENABLED` posent la note à la
demande et le premier envoi (`match.busy`) l'efface ; le spec 3D la capture (`notice-place`).
**Le bouton** : `disabled` ajoute `placing !== null` ; `waitForPlayableTurn` dans `e2e/harness.ts`
l'affirme grisé à chaque popup, pour les trois specs. **La passe gratuite** (Sonnet) :
`feedLines` dans `Feed.tsx` tient `turnOf` (posé au `turnStarted`) et `freePassFrom` (posé par un
`shoved` à `tookPayload` du tour en cours, levé à `turnStarted` et `turnEnded`, jamais à la
première passe parce qu'un lancer intercepté s'écrit `passIntercepted` puis `passed`) ;
`describe(event, name, free)` rend les quatre phrases ; `feed.test.ts`, trois tests ;
`scripts/dump-match.ts` fait le même suivi dans la boucle de `match.md` et suffixe « (free pass,
off the Shove) » ; `c3867408` rejoué après coup, 0 écart. **La route sûre** (Sonnet pour
`Board.tsx`, fil principal pour `Board3D.tsx` et le crochet) : un `useMemo` `sweep` appelle
`safeReachableCells` aux mêmes arguments que `reachable` (état et unité déplacés au dernier point
tracé, budget moins le dépensé) et `routeTo(cell)` rend `safePathTo(sweep.state, sweep.unit,
sweep.safe, cell) ?? pathTo(reachable, cell)` ; le survol (`swingsTo`, `ahead`), le clic
(`onClick`, `onCellClick`) et `clickCell` du crochet passent par elle, le tracé d'étapes aussi ;
le surlignage lit toujours `reachable`. **La popup** (Sonnet) : `clampInto(x, y, card, parent,
keep)` pure et exportée de `PlacePrompt.tsx`, un `useEffect` sur `resize` qui rappelle `onMove`
quand la position bornée diffère, `placePrompt.test.ts`, trois tests ; une phrase dans l'item
« Your turn » de `Briefing.tsx`. **Rien d'autre** : ni `engine/`, ni `ai/`, ni les événements,
`ENGINE_VERSION` 9. **689 tests sur 34 fichiers** (683 avant), typecheck racine, scripts, e2e et
client verts, smoke 2D vert en 39,3 s, `e2e:board3d` vert en 6,5 min sur le Vite 5174 chauffé,
captures lues : la popup avec « Call for the ball » grisé, la note « Default initiative · you go
last » en 3D.

## C26. Décisions du 2026-10-16 après sa partie sur 2H.23 et le Giff riggé, **sous-phase 2H.25, le son et le rebond**

> Écrites par le fil principal (Fable 5.1) sur les retours de Jérôme en chat le 2026-10-16 après
> ses matchs « après nos changements de son et d'animations 3D », et ses deux réponses à l'outil
> de questions (le rebond depuis la bouche, crowd1 en attaque). Ses mots d'abord : « les
> animations sont parfaites. rien à changer ». Le Giff riggé de son chat Blender (commit
> `ffa4ae9`, sept clips, `giffRig.ts`, `rig_giff.py`) est donc **2H.24, close**, documentée dans
> `07` §10 d'après le commit. **Un écart de règle, le 64, `ENGINE_VERSION` 10, les deux fonctions
> à redéployer sur son feu vert.** Rien dans l'IA, aucune constante de `00` ne bouge.

1. **Les animations, closes.** Rien à changer. Le pantin ne reste que pour un corps sans rig (la
   capsule de repli).
2. **Le Spark manqué se voit et s'entend.** Ses mots : « il manque le texte au-dessus de la tête
   quand le trajector rate le ramassage du spark et le son ». Constat : `motion.ts` ne tirait
   aucun repère d'un `sparkCaught` raté. Décidé, proposition du fil principal : le mot **CATCH**
   monte au-dessus du Trajector à chaque tentative (dixième mot de `ACTION_WORDS`, visant la case
   du Spark), puis le flash du Spark s'il réussit, ou **« miss »** en gris sur lui avec le son du
   coup manqué s'il rate, exactement comme une batte dans le vide.
3. **Écart 64, le rebond d'un tir manqué part de la bouche.** Ses mots : « après un tir au but,
   la balle ne devrait jamais revenir directement dans les mains de celui qui a tiré. cette
   trajectoire de rebond devrait être bannie. » Constat dans le code : depuis le moteur 1 un tir
   manqué appelait `scatter` **depuis la case du tireur**, d4 cases dans une direction au d8, et
   quand la première case était bloquée la balle restait sous ses pieds ; le commentaire disait
   « rebondit sur la bouche », l'animation de 2H.21 aussi (le ballon repart de la bouche), le
   code non. Décidé, son choix parmi trois : **le rebond part de la case de bouche visée** (la
   plus proche du tireur, celle que `motion.ts` vise déjà), d4 cases dans une direction au d8,
   arrêté à la dernière case libre (sol ouvert, personne dessus) ; si la balle ne peut pas
   quitter la bouche dans cette direction, première case libre autour de la bouche en tournant
   dans le sens horaire depuis la face tirée, comme l'écart 42 ; le tireur occupe sa case, donc
   la balle n'y tombe jamais. Elle peut tomber à côté de lui, il a accepté cette option plutôt
   que « toujours à deux cases au moins ». L'ancien `scatter` depuis le tireur ne sert plus que
   si les huit cases autour de la bouche sont prises. Les dés se tirent dans le même ordre
   (d4 puis d8), l'événement `payloadScattered` ne change pas de forme.
4. **Deux foules selon la possession.** Ses mots : « changeons le son de la foule. nous avons 2
   fichiers son de foules. l'un devrait être joué quand l'équipe humaine est en attaque, et
   l'autre quand elle est en défense. ça permettra de la variété sonore. » Décidé, son choix :
   **les vagues de `crowd1` quand son équipe a le ballon, le fond stable de `crowd2` quand elle
   ne l'a pas** ; ballon au sol, le fond en cours continue ; bascule en fondu croisé d'environ
   deux secondes ; même gain 0,11. La boucle d'attaque (`crowd-attack.mp3`, 40 s) est coupée
   dans la première minute de `crowd1`, la seule stable (−15 à −18 dB, le reste du fichier
   descend jusqu'à −36), fin fondue sur le début en 1,5 s, ramenée au niveau de `crowd2`.
5. **Deux annonceurs.** Ses mots : « J'ai déposé 2 nouveaux fichiers dans import, ils
   contiennent de nombreux commentaires et sons intéressants à prendre. intègre au jeu ceux qui
   te paraissent bien. [...] fais en sorte que ce ne soit pas toujours le même commentaire pour
   un swing réussi ou un joueur ko ». Les deux WAV de `context/import/` (`announcer-pack-banter-
   man`, 2 min 08, et `announcer-pack-dragon`, 1 min 36) sont découpés aux silences par ffmpeg
   et transcrits par whisper : **26 répliques d'un commentateur sarcastique et 28 mots d'une voix
   de gorge de jeu de combat**, 54 clips MP3 dans `client/public/sounds/announcer/`, 2,5 Mo. Le
   mécanisme : une catégorie par moment du match, un tirage au hasard parmi ses répliques sans
   répéter la dernière, une chance par catégorie pour que les coups de batte ne soient pas tous
   commentés, un délai de 2,5 s entre deux répliques et jamais deux à la fois, le but et la fin
   de match coupant la réplique en cours. **La répartition des 54 clips est une proposition du
   fil principal, à relire par Jérôme** ; elle est dans `client/src/match/announcer.ts` et
   récapitulée dans le chat du 2026-10-16.

**Ce que ces décisions rouvrent.** Le moteur dans `rules/payload.ts` (`reboundLanding`,
`reboundCell`, `nearestHatch`) et `reduce.ts` (`applyShoot`) ; `ENGINE_VERSION` 10 ; le client
dans `motion.ts`, `sound.ts`, `announcer.ts`, `screens/Match.tsx` ; le harnais. Les fonctions à
redéployer sur le feu vert de Jérôme ; tant qu'elles sont au moteur 9, le harnais tourne avec la
constante remise à 9 le temps du run. Pas de sweep : rien dans l'IA.

**Comment 2H.25 est codée** (le 2026-10-16, fil principal Fable 5.1, un Sonnet sur `motion.ts`,
un Opus 5.5 effort élevé sur `sound.ts` et `announcer.ts`). **Écart 64** : `reboundLanding(free,
hatch, roll, cells)` dans `rules/payload.ts`, pure, roule `cells` pas depuis la bouche dans la
face `roll` tant que la case est libre, sinon `dropLanding` en tournant depuis la face, `null` si
rien ; `reboundCell` tire d4 puis d8 et lit le plateau (`isOccupiable` et personne dessus) ;
`nearestHatch(furnace, from)` est la case de bouche que `motion.ts` vise déjà ; `applyShoot`
appelle `reboundCell(arena, next, nearestHatch(...), rng) ?? scatter(...)` et log le même
`payloadScattered` ; **`ENGINE_VERSION` 10**, le test de C16 accepte 9 ou plus ; `c26.test.ts`,
six tests, dont quatre-vingts graines où aucun raté ne tombe sous le tireur ni sous personne et
toujours à d4 de la bouche. **Le Spark** : `ACTION_WORDS.sparkCaught = 'CATCH'`, le cas
`sparkCaught` de `motionAndCues` pose `action` vers la case du Spark puis `sparkCaught` ou
`miss` ; `soundOf` mappe déjà `miss`. **Les foules** : `AMBIENCE.files = { attack:
'crowd-attack.mp3', defence: 'crowd.mp3' }`, deux buffers, `Sounds.setCrowd(side)` et `crowd`,
fondu croisé `CROWD_CROSSFADE` 2 s, côté retenu si le buffer n'est pas encore décodé ;
`Match.tsx` lit `state.payload.carriedBy`, l'équipe du porteur, et appelle `setCrowd('attack')`
quand c'est la sienne, `'defence'` sinon, rien quand le ballon est au sol. **L'annonceur** :
`announcer.ts` porte `ANNOUNCER_LINES` (les clés sont le type `AnnouncerCue` : champion,
kickoff, round2, round3, suddenDeath, hit, miss, knockout, knockoutOwn, shove, goalOwn, goalFoe,
sparkIn, spark, dash, blast, clock, win, loss, fullTime), `ANNOUNCER_CHANCE` (hit 0,3, miss 0,25,
shove 0,25, dash 0,15, blast 0,5, le reste 1), `ANNOUNCER_GAIN` 0,9, `ANNOUNCER_COOLDOWN_MS`
2500, `ANNOUNCER_PRIORITY` (les buts, la fin, win, loss coupent), `pickLine` sans répéter la
dernière, `admitCue`, `passesChance` ; `Sounds.say(cue)` joue la ligne décodée sur sa propre
voix hors des douze des effets, `lastSaid` pour le harnais, `random` injectable dans
`createSounds` ; `Match.tsx` : `sayOf(cue, own, mineId)` par repère, 350 ms après le son du
moment (hit, miss et held, push, blast, goal par le camp qui encaisse, sparkIn, sparkCaught,
exit avec `knockoutOwn` pour son pion, DASH), le round au sifflet plus 700 ms, la fin de match
plus 1,2 s en win, loss ou fullTime, « Select your champion » au premier bandeau de tour du
round 1, « Come on, do something! » une fois par tour à trente secondes. Les 54 clips sont
`client/public/sounds/announcer/<voix>-<nn>-<mots>.mp3`, découpés par ffmpeg (silence sous
−38 dB pendant 0,35 s) et nommés par whisper (modèle medium). **Le crochet** gagne `crowd()`,
`lastSaid()` et `say(cue)` ; le spec 3D lit le côté de la foule, dit `kickoff` et affirme un des
trois clips du coup d'envoi, et capture CATCH. **Les hooks de `Match.tsx` restent au-dessus du
retour anticipé sur `state`** : un effet placé après a fait planter l'écran au harnais (« Rendered
more hooks than during the previous render »), corrigé avant la fin du lot. 704 tests sur 35
fichiers (689 avant), typecheck racine, scripts, e2e et client verts, smoke 2D vert en 31 s,
vert en 6,4 min (CATCH capturé, le côté de la foule et le clip du coup d'envoi lus par le crochet). Les fonctions en ligne sont encore au moteur 9 : le harnais a tourné avec la
constante remise à 9, remise à 10 avant le commit.

**Ses décisions du même jour sur l'annonceur, et le moteur 10 en ligne.** Ses mots : « feu vert
moteur 10 » et « retire les répliques suivantes ». Retirées : « Death match » et « First round »
(le coup d'envoi ne garde que « Fight »), les appels des rounds 2 et 3, « Sticks and stones »,
« Human Anatomy 101 », « The feeding tube », « Instant vegetable », le Dash entier (« The zerk »
et « Killing frenzy » n'y sont plus, ils restent au Shove et au coup), « Rage fuel » partout, et
**tout commentaire de but** : « on garde le son d'avant qui disait "and it's a goal" », c'est
son enregistrement `goal.mp3`, joué par l'échantillon `goal`. Les clés `goalOwn` et `goalFoe`
restent vides pour que le but coupe encore la réplique en cours. **Les fonctions sont
redéployées le 2026-10-16 sur son feu vert : `resolve-action` v21, `create-match` v19, moteur
10** ; smoke 2D vert en 40,6 s sur les fonctions redéployées, playthrough vert en 1,6 min jusqu'au sifflet (un premier run rouge juste après le déploiement, relancé, comme déjà vu).

## C27. Décisions du 2026-10-16 après sa partie sur 2H.25, **sous-phase 2H.26, l'annonceur systématique**

> Écrites par le fil principal (Fable 5.1) sur le retour de Jérôme en chat le 2026-10-16 après sa
> partie avec le son sur le moteur 10 en ligne, et sa réponse à une question. Rien dans le
> moteur, rien dans l'IA, `ENGINE_VERSION` reste 10, rien à redéployer, aucune constante de `00`
> ne bouge.

1. **Une réplique à chaque coup, mais une seule voix.** Ses mots : « il manque la plupart des
   sons sur les swing raté et réussi et les attaques d'opp, mais attention à ne pas autoriser
   que plusieurs se déclenchent si une est déjà en train de tourner », puis, à la question
   bruitages ou annonceur : « je parlais des répliques de l'annonceur. j'en veux une
   systématiquement, mais qu'une. comme ça s'il y a 3 att d'op en même temps ou dans la même
   seconde ou deux, il n'y a qu'une réplique. ça évite la cacophonie. » Constat dans le code :
   un coup qui touchait n'était commenté qu'à 30 %, un raté à 25 %, un Shove à 25 %, un Cracker à
   50 % (`ANNOUNCER_CHANCE`), et même le tirage passé, la réplique était jetée si une autre
   tournait ou avait démarré il y a moins de 2,5 s ; dans un round où les tours de l'IA
   s'enchaînent toutes les deux secondes, la plupart des coups restaient muets. Le verrou « une
   voix à la fois » existait déjà (une réplique en cours fait jeter la suivante, jamais de file
   d'attente). Décidé : **toutes les chances passent à 1**, les coups de batte, les attaques
   d'opportunité, le Shove et le Cracker compris (sa réponse : « ils passent aussi à
   systématique ») ; le délai de 2,5 s, ou la durée du clip si elle est plus longue, fait seul
   le tri, donc trois attaques d'opportunité dans la même seconde donnent une réplique, la
   première arrivée. Le mécanisme de chance reste dans le code, table vide, pour le jour où un
   moment redeviendrait bavard.
2. **Le but coupe la réplique en cours, pour de vrai.** Constat du fil principal en relisant
   `say` : depuis que les listes `goalOwn` et `goalFoe` sont vides (C26, son « and it's a goal »
   suffit), `say` sortait sur « aucune ligne » avant d'arriver à la coupure, donc une réplique
   lancée juste avant un but continuait de parler par-dessus son enregistrement, à l'inverse de
   ce que C26 affirmait. Corrigé : la coupure se fait avant de chercher une ligne à dire, un
   moment prioritaire sans ligne fait taire et ne dit rien. Le plancher du délai n'est pas remis
   à zéro par la coupure : l'annonceur reste muet jusqu'à la fin de la fenêtre déjà ouverte,
   pendant laquelle joue le son du but.

**Comment 2H.26 est codée** (le 2026-10-16, fil principal Fable 5.1, aucun sous-agent : trois
fichiers, quelques lignes). `announcer.ts` : `ANNOUNCER_CHANCE` est `{}`, `passesChance` lit 1
pour tout moment ; `ANNOUNCER_COOLDOWN_MS` 2500 et `admitCue` inchangés. `sound.ts`, `say` :
`admitCue` puis `hush` si la porte dit `cut`, **avant** le filtre des lignes décodées et le
retour sur liste vide ; le reste inchangé. `sound.test.ts` : un quinzième test, « a goal with
no line of its own still cuts the line in progress », qui dit `hit` puis `goalFoe` et affirme
que la source de `h1` est arrêtée et `lastSaid` inchangé. `Match.tsx` : le commentaire de
`sayOf` seulement. Le crochet ne bouge pas, `lastSaid()` suffit à lire ce que l'annonceur a
dit. 705 tests sur 35 fichiers (704 avant), typecheck racine, scripts, e2e et client verts,
smoke 2D vert en 42 s ; rien à redéployer.

## C28. Décisions du 2026-10-16 au soir, **sous-phase 2H.27, la ligue au choix**

> Écrites par le fil principal (Fable 5.1) après le point sur ce qu'il reste à faire, dont Jérôme
> a validé l'ordre : ses trois fonctionnalités sans le multijoueur, la phase 6, le client
> redéployé, puis la coop. La première est « choisir son niveau de ligue quand les niveaux d'en
> dessous sont déjà débloqués », notée le 16 à midi. Rien dans le moteur ni dans l'IA,
> `ENGINE_VERSION` reste 10, **les deux fonctions à redéployer sur son feu vert**, aucune
> constante de `00` ne bouge.

**Ce que le code faisait.** Le Tier d'une batterie (rookie, veteran, star) est une colonne
calculée en base depuis `wins` (`TIER_WINS_VETERAN` 3, `TIER_WINS_STAR` 6). Le client ne
l'envoyait jamais : `create-match` le lisait en base « et nulle part ailleurs », pour qu'un
client ne puisse pas aligner des Star à son premier match. Le Tier s'applique aux deux camps :
c'est la difficulté de la partie. Une victoire incrémentait `wins` quel que soit le Tier joué.
Le lobby affichait le Tier sans rien à choisir.

1. **La ligue se choisit dans le lobby, jamais au-dessus de son palier.** Une batterie veteran
   joue rookie ou veteran, une star les trois. Le client envoie le Tier choisi, `create-match`
   l'accepte s'il est inférieur ou égal au Tier de la batterie et refuse sinon ; absent, il lit
   le Tier de la batterie, comme avant. Le match porte le Tier joué (`matches.tier`).
2. **Une victoire ne compte que jouée au palier de la batterie.** Ses mots : « la réponse à la
   question est non ». Sinon une veteran monterait star en battant des rookies. `resolve-action`
   compare au sifflet final le Tier du match au Tier de la batterie et n'appelle
   `record_team_win` que s'ils sont égaux. Jouer en dessous est un entraînement ou un plaisir.
3. **L'humain doit comprendre qu'il peut choisir.** Ses mots : « il faut que dans l'interface
   l'humain comprenne qu'il peut sélectionner son niveau de ligue ». Dessin validé par lui : une
   section « League » dans le panneau du siège, entre la Position et le bouton Start, trois
   boutons sur le modèle des rôles, le palier de la batterie sélectionné par défaut, les paliers
   en dessous cliquables, les paliers au-dessus grisés avec le nombre de victoires qu'il faut
   (une batterie rookie voit donc dès son premier match que la ligue se choisira) ; une phrase
   sous les boutons qui dit où les victoires comptent ; le header dit « Veteran battery ·
   playing Rookie » quand on joue en dessous ; une phrase de plus sous l'échelle du hub.

**Ce que ces décisions rouvrent.** `server/lobby.ts` (une fonction pure `tierAllowed`),
`create-match`, `resolve-action` (`recordResult`), `client/src/lib/supabase.ts`, `Lobby.tsx`,
`TeamHub.tsx`, le smoke. Pas de migration. Les fonctions en ligne ignorent le champ tant
qu'elles ne sont pas redéployées : le choix n'a d'effet qu'après son feu vert.

**Comment 2H.27 est codée** (le 2026-10-16 au soir, fil principal Fable 5.1, aucun sous-agent).
`engine/stats.ts` : `isTier(value)` lit un Tier dans un corps de requête, `tierAllowed(requested,
reached)` compare les index de `TIERS`, rookie toujours permis. `create-match` : `body.tier`
absent lit le Tier de la batterie, invalide refuse « there is no such league », au-dessus
refuse 403 « your battery has not reached star » ; le Tier joué passe à `openLobbyMatch` et dans
`matches.tier`. `resolve-action` : la ligne du match lit aussi `tier` ; `recordResult(db,
teamId, matchTier, before, after)` lit `teams.tier` au sifflet final seulement et n'appelle
`record_team_win` que si les deux Tiers sont égaux ; le Tier de la batterie est lu au sifflet, pas
au coup d'envoi, parce que c'est l'échelle du moment qui compte. `client/src/lib/supabase.ts` :
`createMatch(teamId, seats, tier)`. `Lobby.tsx` : `tier` en état, `team.tier` par défaut ; la
section « League · your battery is Veteran », trois boutons `data-league`, `data-selected`,
`data-locked`, les verrouillés `disabled` à 45 % d'opacité et suffixés « · 3 wins » ou « · 6
wins » (`WINS_FOR` depuis `TIER_WINS_VETERAN` et `TIER_WINS_STAR`) ; la phrase `league-blurb`
change selon que le palier choisi est celui de la batterie ou en dessous ; la ligne du header
`lobby-tier-line` dit « Veteran battery · playing Rookie » en dessous. `TeamHub.tsx` : une
phrase sous l'échelle et une dans le formulaire de création. `lobby.test.ts` : trois tests de
plus (`tierAllowed` sur les neuf paires, `isTier`, le match ouvert au Tier demandé porte ce
Tier sur chaque unité). `smoke.spec.ts` : trois boutons, un seul sélectionné, celui du Tier lu
dans la ligne du header, déverrouillé ; chaque bouton verrouillé est `disabled`. Les deux
fonctions bundlent (`npm run build:function`). 708 tests sur 35 fichiers (705 avant), smoke 2D
vert en 39,7 s par le lobby. **Redéployées le 2026-10-16 au soir sur son feu vert :
`resolve-action` v22, `create-match` v20, moteur 10 inchangé**, smoke 2D vert en 35,5 s dessus.

## C29. Décisions du 2026-10-16 au soir, **sous-phase 2H.28, annuler et quitter un match**

> Écrites par le fil principal (Fable 5.1) sur trois réponses de Jérôme en chat, après la porte
> de 2H.27 franchie (« c'est fait et ça a marché »). Deuxième de ses trois fonctionnalités, dans
> l'ordre qu'il a validé. Rien dans le moteur ni dans l'IA, `ENGINE_VERSION` reste 10 ; **une
> migration, `0008`, qu'il applique par `/supabase-migrate`, et les deux fonctions à redéployer
> sur son feu vert.**

1. **Qui, et depuis où.** Sa réponse : « oui c'est ça » au dessin proposé. Le propriétaire de la
   batterie, depuis l'écran de match (bouton « Leave the match » dans la barre du haut, à côté
   de « See it in 3D ») comme depuis le hub quand « A match is running » est affiché (bouton
   « Abandon this match » à côté de « Back to the silo »), à n'importe quel round, avec une
   confirmation en place dans la page avant de le faire.
2. **Que devient le match.** Son choix parmi deux : **B, abandonné sans résultat**. Ni victoire ni
   défaite, l'échelle ne bouge pas, le match sort de la vue, ses événements restent en base,
   il n'est jamais repris. L'option A (le match finit en défaite, vainqueur l'adversaire) est
   écartée.
3. **Les mots de la confirmation**, relus par lui, qui a retiré la dernière phrase (« What was
   played stays on record. ») :
   « Abandon this match? It ends here with no result: no win, no loss, and the ladder does not
   move. » Boutons « Yes, abandon it » et « Keep playing ». Le hub compte ensuite « 2 matches
   abandoned » sous la note d'archive.

**Comment c'est codé, décidé avec le dessin.** Pas une quatrième valeur de l'enum `phase` mais
une colonne `matches.abandoned_at timestamptz` : même effet (ni en cours ni fini), sans le
piège d'une valeur d'enum ajoutée et utilisée dans la même transaction, que Postgres refuse par
l'API qu'emploie `apply-migration.mjs`. Une fonction SQL `abandon_match(match uuid)` en
`security definer`, exécutable par `authenticated`, qui vérifie que l'appelant (`auth.uid()`,
jamais le corps) est le propriétaire de la batterie du match, que le match n'est pas
`finished` ni déjà abandonné, puis écrit `abandoned_at = now()`. C'est la seule écriture client
ouverte sur les tables de match, bornée par cette vérification. `resolve-action` lit
`abandoned_at` et refuse en 409 « this match was abandoned » ; `create-match` ne compte plus un
match abandonné comme « déjà en cours ». Côté client, `useAccount` exclut les abandonnés du match
en cours et de l'archive et les compte à part ; `abandonMatch` dans `lib/supabase.ts` appelle
la fonction SQL ; `AbandonPrompt.tsx` porte la confirmation, partagée par le hub et l'écran de
match ; après confirmation, retour au hub. Le harnais gagne `abandon.spec.ts`, tag `@abandon`,
hors du smoke par défaut pour ne pas priver le playthrough de son match ouvert.

**Appliqué et en ligne le 2026-10-16 au soir.** La migration `0008` par Jérôme (`/supabase-migrate`),
vérifiée en lecture avant et après (colonne et fonction présentes, 115 matchs dont 4 non finis
inchangés, aucun abandonné, droits `authenticated`, `postgres`, `service_role`) ; les fonctions
redéployées sur son feu vert : **`resolve-action` v23, `create-match` v21**, moteur 10 inchangé.
708 tests sur 35 fichiers, inchangés (rien dans le moteur) ; typecheck racine, scripts, e2e et
client verts.
