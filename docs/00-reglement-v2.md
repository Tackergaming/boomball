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

## C9. Écarts décidés le 2026-10-10 après la partie à la porte de 2H.6, **dans le code depuis 2H.7, pas encore en ligne**

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
