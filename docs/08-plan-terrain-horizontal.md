# Plan du terrain horizontal

> Écrit le 2026-10-10 par le fil principal (Fable 5.1), le soir de la première partie humaine du
> terrain vertical, à la demande de Jérôme. Il remplace les phases 2 à 6 de `07-audit-et-plan-3d.md`
> §7 dès que Jérôme donne le go. Tout le reste de `07` tient : l'état mesuré, les décisions D1 à D10,
> l'audit, le harnais de la phase 1.
>
> **Statut : GO DONNÉ PAR JÉRÔME LE 2026-10-10**, avec les sept arbitrages de §7 tranchés et deux
> précisions reprises en §0. La partie C du règlement est écrite. **2H.1, 2H.2 et 2H.3 sont faites
> le 2026-10-10, et 2H.4 est construite le même jour**, journal en `07` §10. **Sa porte n'est pas
> franchie** : la partie de Jérôme du 2026-10-10 a produit sept retours et quatre décisions, qui
> forment une sous-phase 2H.5 avant la phase 3 : coup d'envoi à huit cases du ballon (écart 38
> révisé), ballon perdu sur une case adjacente au d8 (écart 42), Crackers sur des cases distinctes
> (écart 43), animation 2D avant le 2.5D. **2H.5 est construite et en ligne le 2026-10-10 soir**,
> journal en `07` §10, écart 44 décidé le même soir. **Sa porte n'est pas franchie non plus** : la
> partie de Jérôme sur le plateau animé a produit sept retours et six décisions, écarts 45 à 48 et
> deux points ouverts dans `00` C8, qui forment **2H.6** (règles et le défaut de relecture) puis
> **2H.7** (l'IA par rôle) avant la phase 3. **2H.6 est construite le 2026-10-10**, journal en `07`
> §10, les deux points ouverts tranchés par Jérôme (Crackers à 8, remplaçant au centre), moteur 3
> **en ligne le même jour** (`resolve-action` v11, `create-match` v9), 408 tests, équilibrage
> re-clos par lui sur `09` §11. **Sa partie est jouée le 2026-10-10 soir** : sept retours et, en
> chat, une refonte de l'initiative (écart 51), se planter (écart 52), le Spark qui s'échappe et
> revient (49, 50), et l'IA des quatre rôles dictée par lui, qui forment **2H.7**. **2H.7 est codée
> le même soir, 429 tests, et mise en ligne le 2026-10-10 dans le chat suivant** : migration 0007
> appliquée par Jérôme, moteur 4 en ligne (`resolve-action` v12, `create-match` v10), harnais vert
> après un défaut de relecture de l'ouverture corrigé dans `useMatch.ts`, le sweep unique en `09`
> §12, journal en `07` §10. **Sa partie est jouée le 2026-10-11** : rien ne bouge au sweep, et ses
> retours en chat, reformulés en trois passes, forment **2H.8** : la surface de réparation (écart
> 53), la relance du gardien en tête de son équipe (écart 54), l'IA par rôle en deuxième version
> (`00` C10, listes triées par priorité), la route en ligne droite et le fil complet. **2H.8 est
> codée le 2026-10-11**, 460 tests, `ENGINE_VERSION` 5, commitée et poussée, puis **mise en ligne
> le même jour sur le feu vert de Jérôme** (`resolve-action` v13, `create-match` v11, moteur 5),
> smoke et playthrough verts sur le moteur 5, pas de sweep. **Sa partie est jouée le 2026-10-11**
> (star, 40 à 20), cinq retours lus contre les événements en base, et **C11 validé par lui** le
> même jour : écart 53 bis, le plan de tour comme moteur de décision de l'IA, le Dash de repli, la
> case de repos du gardien. **2H.9 est à coder**, rien n'est commencé. Le prompt est
> `05-reprise-chat-suivant.md`.
>
> **Unité d'effort : la séance**, environ deux heures de Claude Code bornées à un commit.

---

## 0. La décision D11, prise par Jérôme le 2026-10-10

Après sa première partie entière, et avec l'autorisation explicite de passer outre toute règle déjà
écrite qui la contredit :

1. **Le terrain passe à l'horizontal**, vu de dessus en trois quarts plongeant, comme Baldur's
   Gate 3 ou un jeu de football.
2. **Plus de chute, de vol, de grappin, d'ancrage**, ni de rien de ce qui en découle.
3. **Plus de coût de déplacement pour passer d'une zone à l'autre.**
4. **Des obstacles sur le terrain**, avec collision et obligation de les contourner.

**Les arbitrages J1 à J7 de §7, tranchés le 2026-10-10 : oui aux sept**, avec deux précisions.
**J3** : le terrain reste un **silo à missile nucléaire, un tube, mais couché à l'horizontale**. C'est
la nostalgie du monde d'origine des Giff, Bombara. Le nom Kill-Silo reste, les deux Furnaces sont
les deux bouches du tube. **J6** : les Crackers et le Spark **ne s'arrêtent jamais à cause d'un
obstacle**. Ils le contournent ou rebondissent dessus, et leur mouvement ne tombe pas à zéro quand
ils en touchent un. La règle précise est aux écarts 35, 36 et 36b de §2. Le brouillon de terrain de
§3 est accepté tel quel pour commencer.

Ce que D11 annule : la section B6 du règlement v2 en entier, les écarts 1, 3, 5 et 11 de sa partie A,
la vitesse de vol de B3, la chute de bousculade de B7, « tombe au sol de la Zone 1 » de B10, et les
positions de départ « au-dessus des passerelles » de B2. **Ce que D11 rouvre par nécessité :
l'équilibrage**, qui a été mesuré avec les chutes, l'ancrage et le coût de zone, et dont la cible,
1 à 2 buts par match et un Spark qui décide environ 30 % des rencontres, est à re-prouver sur le
nouveau terrain. **Ce que D11 ne touche pas** : le règlement de table du vault, qui reste figé ; les
décisions D1 à D10, dont le 2.5D via react-three-fiber et le harnais ; le sens des dépendances,
`reduce` seule porte d'écriture, `legalActions` seul générateur.

---

## 1. Ce que j'en pense

**D'accord sur le fond**, c'est l'option que j'avais recommandée : les trois remarques de Jérôme
convergeaient vers un jeu de terrain à obstacles, tout le monde volait déjà, et la verticalité ne
tenait qu'à une règle d'ancrage que personne n'avait vue à l'écran. Le terrain vu de dessus est
aussi la vue du règlement de table, écart 5 : la divergence entre les deux Boomball rétrécit.

Trois mises en garde, pour que le go soit donné en connaissance de cause.

**Ça ne rend pas l'IA tactique.** A31, les alliés massés autour du gardien après un but, est un
défaut de l'IA, pas du terrain. Le sweep mesure des buts et des moyennes, jamais ce qu'un humain
comprend. Ce plan traite A31 dans la même passe, et il pose une porte que le sweep ne peut pas
franchir seul : **Jérôme rejoue une partie sur le terrain horizontal en 2D, avant la moindre ligne
de 2.5D**, et dit s'il comprend ce que ses coéquipiers et la maison cherchent.

**Le layout des obstacles devient le cœur du jeu.** Il décide des lignes de tir, du métier du
Bulwark, de l'endroit où les mêlées ont lieu, et de ce que vaut le Spark. C'est du game design, donc
le sien. Je propose un premier brouillon en §3, il l'ajuste en ASCII, et le sweep juge un layout en
deux minutes. Ce n'est pas une tâche de code, c'est une boucle à deux.

**Le prix.** Environ deux séances de plus sur le total, plus la campagne d'équilibrage. Deux lignes
de l'audit disparaissent en échange, A8 les cases sans ancrage et A30 le noircissement, et A5, A32
et le coût de zone se règlent dans un seul sweep. Total pour le done : **15 à 21 séances**, contre
13 à 19 avant D11.

**Sur la caméra**, parce que « Baldur's Gate 3 ou un jeu de football » sont deux caméras différentes.
Je recommande le trois quarts plongeant de BG3, **sans rotation libre** : un jeu de grille où l'on
clique des cases a besoin d'un cadre stable, et « mon but est toujours à gauche » vaut plus qu'une
caméra qu'on tourne. Deux niveaux de zoom, le suivi en douceur du ballon ou de l'unité qui agit, le
terrain qui défile le long de son axe. La caméra de télévision du football, de côté, écrase la
profondeur d'un terrain de 15 cases de large : à garder pour une « caméra de retransmission » des
temps forts, hors done, pas comme vue de jeu.

---

## 2. Ce qui change dans les règles

Les lignes ci-dessous deviennent la **partie C du règlement, « Écarts du 2026-10-10 »**, écrite
dans la première séance. Numérotées à la suite des écarts existants, à partir de 27.

| # | Règle v2 | Règle après D11 | Note |
|---|---|---|---|
| 27 | Vue de profil, trois zones empilées, `y` monte | **Vue de dessus.** 15 cases de large sur 45 de long. `y` reste l'axe long, 0 côté Furnace A, 44 côté Furnace B ; `x` la largeur. Les « zones » ne sont plus que les trois tiers du terrain, nommés pour le fil et pour l'entrée du Spark, sans aucune règle attachée | Les coordonnées du moteur ne changent pas, seule leur lecture change. Le miroir autour de `y = 22` tient |
| 28 | Cases de structure, chaîne centrale, crochets, passerelles | **Obstacles.** Une case `#` est infranchissable et **coupe la ligne de vue**. Rien d'autre sur le terrain : la chaîne `\|` disparaît | Voir §3 pour le layout |
| 29 | Vitesse de vol 40 pieds, 8 cases, dans toutes les directions | **Vitesse de déplacement 40 pieds**, 8 cases, huit directions, 5 pieds la case, Dash ajoute 40. Une case occupée bloque. Le chemin complet est envoyé, comme avant | Inchangé dans les faits, renommé |
| 30 | Franchir une zone coûte 10 pieds de plus | **Supprimé** | |
| 31 | B6, ancrage et chute : finir sur une case ancrable ou chuter, chute libre, grappin, chute de bousculade | **Supprimé en entier.** Aucune unité ne tombe jamais | `anchored` disparaît de l'état, `fell` et `reactionHeld` des événements |
| 32 | Bousculade réussie contre un non-porteur : chute de 3 cases | **Poussée d'une case** dans la direction opposée au bousculeur. Si la case est un obstacle, une unité ou le bord, la cible ne bouge pas. Contre un porteur : le ballon tombe sur sa case et elle ne bouge pas, arbitrage du 2026-09-01 conservé | **J2** |
| 33 | Recul explosif de 2 cases, peut décrocher l'ancrage ; une attaque d'opportunité est retenue si le recul coûterait la prise | Recul de 2 cases, arrêté par un obstacle, une unité ou le bord. **L'attaque d'opportunité est toujours prise** | |
| 34 | Tir et passe : portée en cases, rien ne les bloque | **Ligne de vue obligatoire** pour un tir, une passe et une interception : un obstacle entre les deux cases coupe l'action. Les unités ne coupent pas la ligne de vue | **J1**. Sans elle, un obstacle ne fait qu'allonger un chemin, et « se mettre à couvert » ne veut rien dire |
| 35 | Les Crackers ignorent le terrain | **En dérive**, au compte 20, un Cracker roule vers l'unité la plus proche par le **chemin le plus court qui contourne les obstacles**, 6 cases de chemin. **Frappé**, il part en ligne droite sur la direction d8, **rebondit** sur un obstacle ou un bord selon la règle de rebond et continue avec les cases qui lui restent ; il détonne sur la première unité rencontrée, écart 4, sinon s'immobilise au bout de sa course. Son mouvement ne tombe jamais à zéro à cause d'un obstacle | **J6**, précisé par Jérôme : contourner ou rebondir, jamais s'arrêter |
| 36 | Le Spark entre en Zone 2, dérive de 6 cases sur un cap d8 tiré une fois, dans le plan vertical | Entre dans le **tiers central**, à 4 cases ou plus de toute unité, dérive de 6 cases par round sur un cap d8 tiré une fois, **dans le plan du terrain**, et **rebondit** sur les obstacles et les bords en gardant toutes ses cases | Le comportement actuel au bord du terrain est à lire dans `reduce.ts` et à aligner sur le rebond |
| 36b | | **Règle de rebond**, commune à 35 et 36 : une case orthogonale bloquée renvoie la direction en arrière ; en diagonale, si une seule des deux cases orthogonales voisines est libre, seule la composante bloquée s'inverse, sinon les deux s'inversent. Un rebond ne consomme pas de case | Pure, testée dans `engine/rules/bounce.ts` |
| 37 | À 0 HP, l'unité tombe au sol de la Zone 1 et est évacuée | **Évacuée sur place.** Le remplaçant entre à côté de la bouche de sa Furnace après 2 rounds, comme avant | |
| 38 | Positions de départ au-dessus des passerelles | **Nouvelles positions**, dépendantes du layout de §3 : le Bulwark dans la bouche, les six autres sur une ligne de leur propre tiers | |
| 39 | Portée de tir 9 cases, 12 à désavantage | **Inchangée jusqu'au sweep**, où elle est mesurée avec deux valeurs plus courtes (A32) | Arbitrage sur tableau |
| 40 | Crackers à 6 cases par round | **Inchangé jusqu'au sweep**, mesuré à 10 (D4, A5) | Arbitrage sur tableau |

Tout le reste tient : initiative et échelle, dix rounds et mort subite, banc de trois et retour
après deux rounds, Spark à 20 points, Tiers et statistiques, Dodge, Dash, Disengage, interception,
blocage du Bulwark à 2 cases de sa bouche, le but qui remet un ballon neuf dans les mains du gardien.

---

## 3. Le terrain : principes et premier brouillon

**Principes.** 15 sur 45, miroir exact autour de la ligne 22 pour que personne n'ait le meilleur
côté. Une bouche de Furnace de trois cases au centre de chaque ligne de fond, et **trois cases de
dégagement devant chaque bouche** pour que le gardien ait de la place. Trois couloirs, gauche, centre,
droite, avec des couvertures en quinconce : **aucune ligne droite découverte du milieu du terrain à
une bouche**, pour qu'un tir se prépare au lieu de se prendre de loin. Des obstacles de une à trois
cases, jamais de mur, pour qu'un contournement coûte deux cases au plus. Environ 10 % de cases
pleines. Le tiers central un peu plus ouvert, parce que le Spark y entre et qu'une mêlée doit
pouvoir s'y former.

**Premier brouillon**, moitié A, la moitié B en miroir. `y` croît vers le haut de ce dessin ; la
ligne 0 est la ligne de fond de A.

```
y22  #.............#     ligne médiane : deux piliers de bord
y21  ...............
y20  ...............
y19  ....##...##....     deux couvertures de deux cases
y18  ....##...##....
y17  ...............
y16  .......#.......     un pilier central
y15  ...............
y14  ...............
y13  .##.........##.     deux couvertures de bord
y12  .##.........##.
y11  ...............
y10  ...............
y9   ......###......     la caisse devant la ligne de tir
y8   ...............
y7   ...............
y6   ...##.....##...     les deux poteaux
y5   ...##.....##...
y4   ...............
y3   ...............     dégagement du gardien
y2   ...............
y1   ...............
y0   ......###......     bouche de la Furnace A
```

Ce qu'il fait : le couloir central est coupé à `y9` et à `y16`, donc un tir au centre se prend de
biais ou de près ; les couloirs de bord sont décalés par les couvertures de `y12` et `y19` ; un
porteur a toujours deux chemins. Ce qu'il ne dit pas : si c'est amusant. C'est le sweep, puis la
partie de Jérôme, qui le diront, et le layout se change en une minute dans un fichier ASCII.

**Accepté par Jérôme le 2026-10-10 pour commencer.** Mesuré par script le même jour, sur le terrain
entier en miroir : 58 cases pleines hors bouches, soit 8,6 % ; aucune colonne ouverte en ligne droite
de la ligne médiane à une bouche ; aucune case ouverte avec moins de trois voisines ouvertes, donc
pas de cul-de-sac ; sur les 136 cases à portée propre d'une bouche, 112 la voient, soit 82 %, et sur
les 41 cases à longue portée, 18 la voient, soit 44 %. Les obstacles coupent donc un tir propre sur
cinq et un tir long sur deux, sans fermer le but.

Le terrain entier, à recopier tel quel dans `engine/arenas/kill-silo.ts`, ligne 44 en tête comme
aujourd'hui :

```
44  ......###......   bouche de la Furnace B
43  ...............
42  ...............
41  ...............
40  ...............
39  ...##.....##...
38  ...##.....##...
37  ...............
36  ...............
35  ......###......
34  ...............
33  ...............
32  .##.........##.
31  .##.........##.
30  ...............
29  ...............
28  .......#.......
27  ...............
26  ....##...##....
25  ....##...##....
24  ...............
23  ...............
22  #.............#   ligne médiane
21  ...............
20  ...............
19  ....##...##....
18  ....##...##....
17  ...............
16  .......#.......
15  ...............
14  ...............
13  .##.........##.
12  .##.........##.
11  ...............
10  ...............
 9  ......###......
 8  ...............
 7  ...............
 6  ...##.....##...
 5  ...##.....##...
 4  ...............
 3  ...............
 2  ...............
 1  ...............
 0  ......###......   bouche de la Furnace A
```

**Positions de départ.** Bulwark en `(7, 1)` pour A et `(7, 43)` pour B. Les six joueurs de champ
étaient proposés sur `y4` pour A et `y40` pour B, aux `x` 2, 4, 6, 8, 10, 12 ; **depuis le
2026-10-10 soir, écart 38 révisé, ils partent de `y14` et `y30`**, mêmes `x`, à huit cases du
ballon, parce qu'à dix-huit cases personne ne l'atteignait au premier tour. Le ballon au centre,
`(7, 22)`. Les Crackers étaient de chaque côté du ballon, `(6, 22)` et `(8, 22)` (écart 43) ;
**depuis 2H.6, écart 46, chacun naît sur une case libre adjacente à son pilier de bord de la ligne
médiane**, `cracker-1` près de `(0, 22)` et `cracker-2` près de `(14, 22)`, tirée au dé parmi les
cases libres, et y revient après avoir détonné. Le remplaçant entre sur la case libre la plus
proche du centre (écart 37 bis).

**Le nom et la fiction, J3 tranché.** Le Kill-Silo reste un silo à missile nucléaire, un tube, mais
couché à l'horizontale : la nostalgie de Bombara, le monde d'origine des Giff. L'identifiant
`kill-silo` reste, le nom reste, les deux Furnaces sont les deux bouches du tube. En 2.5D le décor
est un tube couché vu de dessus : parois courbes sur les deux longs côtés, sol plat en plaques
rivetées, obstacles en caisses et piliers. Les trois JPEG de l'arène sont des coupes verticales et ne
servent plus : retirés du bundle, un seul converti en WebP pour l'écran de connexion, **J5**.

---

## 4. Ce qui change dans le code

### 4.1 Moteur, 1 à 1,5 séance

| Fichier | Changement |
|---|---|
| `engine/types.ts` | `anchored` disparaît de `Unit`. `fell` et `reactionHeld` disparaissent des événements, `turnEnded` perd `anchored`, `shoved` gagne `pushedTo` |
| `engine/rules/falling.ts` | Supprimé, avec ses tests |
| `engine/rules/movement.ts`, `engine/geometry.ts` | `stepCostFeet` vaut 5 partout, `ZONE_CROSSING_FEET` disparaît. `zoneOf` devient `thirdOf`, gardé pour le fil et l'entrée du Spark |
| `engine/rules/sight.ts`, nouveau | La ligne de vue sur la grille, pure et testée : vrai si aucune case `#` n'est traversée entre deux cases. Utilisée par tir, passe et interception (J1) |
| `engine/rules/bounce.ts`, nouveau | La règle de rebond de l'écart 36b, pure et testée, utilisée par la frappe des Crackers et la dérive du Spark. La dérive des Crackers contourne par le chemin le plus court, avec `reachableCells` ou un BFS dédié (J6) |
| `engine/arena.ts` | `isAnchorable` disparaît, `blocksSight` apparaît |
| `engine/reduce.ts` | Plus de chute au début du tour ni d'ancrage à la fin, bousculade en poussée d'une case, recul sans test de prise, attaque d'opportunité toujours prise, Crackers qui contournent en dérive et rebondissent en frappe, Spark qui rebondit, évacuation sur place |
| `engine/constants.ts` | `FLY_SPEED_FEET` devient `MOVE_SPEED_FEET`. Disparaissent `ZONE_CROSSING_FEET`, `GRAPPLE_CATCH_CELLS`, `SHOVE_FALL_CELLS`, `FALL_DAMAGE_PER_CELLS`, `FALL_DAMAGE_DIE`. Apparaissent `SHOVE_PUSH_CELLS = 1` et `ENGINE_VERSION = 2` |
| `engine/arenas/kill-silo.ts` | Le layout de §3, les positions de départ, les deux bouches. L'assertion de miroir reste |
| `engine/legalActions.ts` | Tir, passe et frappe de Cracker filtrés par la ligne de vue, ce qui nourrit l'IA et la barre d'actions sans une ligne de plus chez eux |
| Tests | `foundations`, `rules`, `reduce`, `combat`, `reactions`, `ordnance`, `legalActions`, `setup` mis à jour. Nouveaux : poussée et ses blocages, ligne de vue, contournement d'un obstacle, évacuation sur place. `server/seed.test.ts` régénère sa fixture |

### 4.2 IA, 1 séance

`evaluate.ts` perd `keepGrip`. Le tir et la passe ne se proposent qu'à vue, gratuitement par
`legalActions`. Une valeur de couverture, être masqué des adversaires qui pourraient tirer ou
intercepter, remplace la valeur d'ancrage. **A31 est traité ici** : reproduction au harnais du
massage des alliés après un but, correctif de la cause, et un critère ajouté au rapport de sweep,
la dispersion moyenne des coéquipiers du porteur. `selfPlay.ts` compte le ballon par tiers, c'est
déjà ce qu'il fait.

### 4.3 La campagne d'équilibrage, 0,5 à 1 séance, plus les arbitrages de Jérôme

Un sweep prend 109 secondes. La campagne : la référence sur le nouveau layout, puis les Crackers à 6
et à 10, puis la portée de tir à 9/12, 7/10 et 6/9, chacune sur les trois Tiers. Un tableau par
variante, les mêmes colonnes qu'aujourd'hui : buts par match, part A/B, nuls, part des matchs
décidés par le Spark, répartition du ballon par tiers, plus la dispersion des coéquipiers. **Jérôme
tranche sur le tableau**, les écarts retenus s'écrivent dans la partie C du règlement, et
l'équilibrage est **à nouveau clos** quand les trois Tiers sont dans la cible.

### 4.4 Serveur, base, fonctions, 0,5 à 1 séance

| Quoi | Détail |
|---|---|
| Migration `0005_horizontal.sql` | La ligne `arenas` mise à jour avec le nouveau layout, les bouches et les départs ; `server/arenaRow.test.ts` continue de tenir la ligne égale au moteur. Colonne `matches.engine_version`, A11 |
| A11, obligatoire maintenant | L'état d'un match perd `anchored` et change de terrain : un match ouvert sur la version 1 ne peut plus être rejoué par le moteur 2. `create-match` écrit la version, `resolve-action` refuse une version différente avec une raison lisible, le client marque le match **archivé** et `create-match` ignore les archivés pour sa règle du match unique. Les matchs ouverts de Jérôme et du compte e2e sont archivés, pas perdus : leurs événements restent |
| A28 | Quand `expireIfDue` a réglé un tour, l'action reçue n'est pas soumise, la réponse dit `expired`. Test dans `session.test.ts` |
| A29 | Les deux fonctions redéployées, avec le feu vert de Jérôme, puis le Spark vérifié à 20 au harnais |
| A10 | Reste en phase coop, comme prévu |

### 4.5 Client 2D, 0,5 à 1 séance

Le plateau SVG reste le repli et la vue du harnais jusqu'à la phase 4. Il passe en **vue de dessus
du terrain entier**, 45 cases de long sur l'écran, 15 de haut, sans bandeaux ni onglets de zone, les
obstacles dessinés depuis le layout sur un sol sombre, sans image. À 1440 de large une case fait
environ 23 pixels : les PV en chiffres restent, les plaques de nom passent au prénom tronqué et
s'affichent en entier au survol et sur l'unité sélectionnée. Les ancres `data-cell` et `data-unit`
restent, `cellToScreen` suit la rotation. `SeatPanel` perd « No grip », le briefing est récrit
(obstacles, couvert, ligne de vue, poussée, tiers), le fil perd les lignes de chute. Le harnais
`smoke.spec.ts` perd sa notion de zone.

Les lignes de l'ancienne phase 2 qui restent dues et se font ici ou juste après : A7 l'échelle,
A9 l'écho Realtime, A12 les erreurs de chargement, A13 le maintien en vie, A14 à A16, A18, A20
React 19, A22, A24 la CI, la présentation dupliquée. **A8 et A30 disparaissent**, A19 devient un
retrait.

### 4.6 Documents, 0,5 séance

`00-reglement-v2.md` gagne sa partie C ; `02-architecture.md` dit le terrain vu de dessus et la
ligne de vue ; `07` garde D11 en §1.2 ; le skill `boomball` et `05` suivent ; `CONTEXT.md` par
`/update`.

---

## 5. La feuille de route révisée

| Phase | But | Séances | Porte de sortie |
|---|---|---|---|
| **2H.1 Règles et moteur** | Partie C du règlement, layout de §3 validé par Jérôme, moteur et tests verts, fixture régénérée | 1 à 1,5 | `npm test` vert, `sweep` tourne sur le nouveau terrain |
| **2H.2 IA** | Ancrage retiré, couverture et ligne de vue, A31 reproduit et corrigé | 1 | Le critère de dispersion dans le rapport de sweep |
| **2H.3 Équilibrage** | La campagne de §4.3, arbitrages de Jérôme, écarts écrits | 0,5 à 1 | Trois Tiers dans la cible, équilibrage re-clos |
| **2H.4 Serveur et client 2D** | A11, A28, A29, migration, redéploiement, plateau vu de dessus, briefing, harnais | 1,5 à 2 | `smoke.spec.ts` vert, `browser-path.py` vert, un playthrough entier, **Jérôme joue une partie en 2D et dit s'il comprend l'IA** |
| **2H.5 Coup d'envoi, ballon perdu, Crackers, animation 2D** | Écarts 38 révisé, 42, 43 et 44 ; traits de trajectoire retirés ; les pions glissent et le ballon vole, un temps par action ; sweep de contrôle ; migration 0006 et redéploiement | 1 | `smoke.spec.ts` vert avec deux captures d'un même temps à des instants différents, **Jérôme rejoue une partie en 2D animée et dit s'il comprend ce que ses coéquipiers et la maison cherchent** |
| **2H.6 Crackers vers le ballon, parade du Breaker, écrans** | Le défaut de relecture pendant le rejeu (retour 1) ; écarts 45 (Crackers vers le ballon), 46 (un Cracker par pilier de bord), 47 (parade du Breaker, `ENGINE_VERSION` 3), 48 (la première case du vol ne compte pas) ; les deux points ouverts tranchés par Jérôme ; sweep, équilibrage rouvert le temps de le lire ; redéploiement. **Construite le 2026-10-10 et en ligne le soir**, journal en `07` §10, tableau en `09` §11 tranché par Jérôme | 1 à 1,5 | `npm test` vert, smoke vert, le plateau ne montre plus le futur, Jérôme lit le tableau |
| **2H.7 L'IA par rôle, l'initiative, le Spark, l'écran** | Écarts 49 à 52 (`00` C9) ; l'IA des quatre rôles dictée par Jérôme (la chaîne qui lit l'échelle, presser par rôle, le Breaker garde du corps, le Bulwark tenu en laisse, Dodge en dernier recours) ; l'ouverture rejouée (migration 0007), agir au clic sur un pion, tracer sa trajectoire, la bande d'initiative ; `ENGINE_VERSION` 4 ; **un seul sweep à la fin** contre `09` §11. **Codée le 2026-10-10 soir**, 429 tests, **en ligne le 2026-10-10** (migration 0007, moteur 4, harnais vert, sweep en `09` §12), journal en `07` §10 | 1,5 à 2 | **Jérôme rejoue et dit qu'il comprend ce que chaque rôle cherche.** Sans ce verdict, pas de phase 3 |
| **2H.8 La surface de réparation, la relance, l'IA v2, la route, le fil** | Écarts 53 et 54 (`00` C10) ; l'IA des quatre rôles en deuxième version, listes triées par priorité dictées par Jérôme le 2026-10-11 (le Trajector laisse le ballon du coup d'envoi et chasse le Spark sans rien d'autre, le Striker presse le porteur coûte que coûte, le Breaker bouscule le porteur puis tape Strikers, Breakers, Trajector, fait mur devant le porteur allié, le Bulwark relance aussitôt et se plante par défaut, jamais un Dash quand une cible est à portée) ; la route en ligne droite ; toutes les actions des IA dans le fil ; `ENGINE_VERSION` 5 ; **pas de sweep sauf demande**. **Codée et en ligne le 2026-10-11** (moteur 5), 460 tests, journal en `07` §10 | 1 | **Jérôme rejoue et dit qu'il comprend ce que chaque rôle cherche** |
| **2H.9 Le plan de tour, l'écart 53 bis, la case de repos du gardien** | `00` C11, validé par Jérôme le 2026-10-11 : l'IA note des tours complets au lieu d'une action à la fois, le Dash vaut le terrain qu'il achète, jamais l'Action en poche (repli Dash), le gardien rentre sur sa case de départ puis se plante, la zone se lève dès la passe du gardien. `ENGINE_VERSION` reste 5, fonctions à redéployer, **pas de sweep sauf demande**. **À coder** | 1 à 1,5 | 462 tests et le test des cinquante millisecondes verts, harnais vert, feu vert de redéploiement, **Jérôme rejoue et dit qu'il comprend ce que chaque rôle cherche** |
| 3 Scène 2.5D statique | Sol, obstacles, deux bouches depuis le layout ; caméra trois quarts, deux zooms, pas de rotation ; textures CC0 | 1 à 2 | Comme `07` : bijection layout vers solides, Jérôme reconnaît le terrain |
| 4 Jouer en 2.5D | Lancer de rayon sur le sol, survol, clic, tuiles atteignables, **aperçu de la ligne de vue** sur les cibles, mini-carte 45 x 15 | 1 à 2 | Jérôme joue une partie en 3D sans basculer |
| 5 Timeline | Marche, poussée, recul, frappe, dérive du Spark, arc de passe et de tir, éclat de but ; la caméra suit le ballon ; plus aucune chute à animer | 2 | Jérôme suit un round de la maison sans lire le fil |
| 6 Lisibilité et performance | Comme `07` | 1 à 2 | 50 images par seconde sur GPU intégré |
| 7 Coop à 2 ou 3 | Comme `07`, A10 inclus | 3 à 4 | Deux humains dans un match |
| 8 Déploiement | Comme `07` | 2 | Un ami joue sans Jérôme |

**Total pour le done : 15 à 21 séances.** Chaque phase laisse un jeu jouable en local, tests verts,
comme avant.

---

## 6. Vérification, par phase

- **2H.1** : la suite vitest re-verdie avec les nouveaux tests ; `check_drift.py` sans dérive après
  mise à jour de `CONTEXT.md`.
- **2H.2** : `ai.test.ts` sur la couverture et sur le scénario du but marqué ; le rapport de sweep
  porte la dispersion.
- **2H.3** : un tableau par variante, archivé dans `docs/` avec la date, et les écarts dans `00`.
- **2H.4** : `session.test.ts` sur le refus de version et sur A28 ; `arenaRow.test.ts` ;
  `smoke.spec.ts` et `e2e:playthrough` sur le terrain horizontal ; `rls-check.py` et
  `browser-path.py` relancés par Jérôme ; sa partie en 2D avec retours numérotés.
- **3 à 8** : comme `07` §6.4, la caméra en trois quarts à la place du défilement vertical.

---

## 7. Les arbitrages que je demande avec le go

| # | Question | Ma recommandation |
|---|---|---|
| J1 | Les obstacles coupent-ils la ligne de vue des tirs, passes et interceptions ? | **Oui.** Sinon un obstacle n'est qu'un détour et le couvert ne veut rien dire |
| J2 | La bousculade pousse d'une case, et ne pousse pas un porteur, qui lâche le ballon ? | **Oui**, c'est la bousculade de D&D 2024 et l'arbitrage du 2026-09-01 est gardé |
| J3 | Le nom et la fiction du terrain, qui n'est plus un silo ? | Garder `kill-silo` en base, Jérôme nomme le lieu et dit ce qu'il est. **Tranché : un silo à missile couché à l'horizontale, nostalgie de Bombara** |
| J4 | Caméra trois quarts fixe en orientation, deux zooms, suivi du ballon, sans rotation libre ? | **Oui.** La rotation comme option en phase 9 si elle manque |
| J5 | Les trois JPEG : retirés, un seul gardé en WebP pour la connexion ? | Retirer les trois du jeu, garder un WebP pour la connexion |
| J6 | Les Crackers et le Spark s'arrêtent devant un obstacle ? | **Non, tranché par Jérôme** : ils contournent ou rebondissent, leur mouvement ne tombe jamais à zéro. Écarts 35, 36 et 36b |
| J7 | Je dessine le premier layout et Jérôme l'ajuste en ASCII ? | **Oui**, le brouillon de §3 est le point de départ |

---

## 8. Risques

| Risque | Qui | Parade |
|---|---|---|
| La cible de 1 à 2 buts ne tient pas sur un terrain plat : plus de mobilité, plus de buts, ou des tirs bloqués partout, moins de buts | Claude mesure, Jérôme tranche | La portée de tir et la densité du layout sont deux boutons, un sweep coûte deux minutes |
| L'IA reste illisible malgré A31 | Jérôme juge à la porte de 2H.4 | On n'entre pas en 2.5D sur une IA qu'il ne comprend pas ; une séance d'IA de plus avant |
| Le layout demande plusieurs allers-retours | Jérôme | C'est attendu, et c'est le bon usage de son temps |
| Les matchs ouverts de la version 1 | A11 | Archivés avec leurs événements, jamais effacés |
| Le règlement de table et le jeu divergent sur l'orientation | Aucun | Non : le jeu revient à la vue de dessus de la table, écart 5 |
| Les trois images, 5,9 Mo, le relevé au pixel, les prompts d'arène de `01` | Aucun | Tout cela était déjà abandonné par D8 ; `01` devient de l'histoire |

---

## 9. Parallélisation par sous-agents

Demandé par Jérôme le 2026-10-10 : lancer des sous-agents en parallèle partout où ça fait sens,
en précisant le modèle et l'effort. La règle qui rend ça sûr : **des fichiers disjoints par agent,
un brief fermé** (fichiers, règle à appliquer, commande de vérification à lancer), le fil principal
intègre et fait tourner la suite, et **chaque sous-agent est nommé comme auteur** de ce qu'il a
produit quand c'est présenté. Aucun agent du panthéon.

| Sous-phase | Le fil principal, séquentiel | En parallèle, sous-agents | Modèle, effort |
|---|---|---|---|
| 2H.1 | `types.ts`, `reduce.ts`, `constants.ts`, `legalActions.ts`, l'intégration et la suite | (a) `rules/sight.ts` et `rules/bounce.ts` avec leurs tests, depuis les écarts 34 et 36b ; (b) suppression de `rules/falling.ts` et mise à jour mécanique des tests qui affirment chute, ancrage et coût de zone ; (c) `arenas/kill-silo.ts` depuis §3, positions de départ, `arenaRow.test.ts` et la migration `0005` de la ligne `arenas` ; (d) `02-architecture.md` et le commentaire de `live-match.ts` | (a) Sonnet, effort moyen ; (b) Sonnet, moyen ; (c) Sonnet, moyen ; (d) Sonnet, faible |
| 2H.2 | `evaluate.ts`, la reproduction de A31 au harnais et son correctif | (e) la colonne de dispersion des coéquipiers dans `selfPlay.ts` et le rapport de sweep ; (f) `ai.test.ts` pour la couverture et la ligne de vue, depuis la spécification écrite par le fil principal | (e) Sonnet, moyen ; (f) Sonnet, moyen |
| 2H.3 | Les tableaux et la lecture pour Jérôme | Les sweeps eux-mêmes, en Bash d'arrière-plan, deux à la fois sur la machine de Jérôme, 109 s chacun | Pas d'agent, des commandes |
| 2H.4 | A11 et A28 dans les deux fonctions, la migration, le redéploiement avec le feu vert de Jérôme, l'intégration, le smoke | (g) `Board.tsx` en vue de dessus, plateau entier, sans zones ; (h) `Briefing.tsx`, `SeatPanel.tsx`, `Feed.tsx`, `replay.ts` pour les textes et les événements disparus ; (i) `e2e/` sans notion de zone et `cellToScreen` suivant la rotation ; (j) les lignes restantes de l'ancienne phase 2 qui sont mécaniques : A14, A15, A16, A18, la présentation dupliquée | (g) Sonnet, élevé ; (h) Sonnet, moyen ; (i) Sonnet, moyen ; (j) Sonnet, moyen |
| 3 à 6 | `Board3D.tsx`, `Camera.tsx`, `timeline.ts`, l'intégration | `layoutGeometry.ts` et son test ; `Minimap.tsx` ; `Effects.tsx` ; les textures choisies par Jérôme converties en WebP 1K | Sonnet, moyen, un agent par fichier |

Ce qui ne se délègue pas : `reduce.ts`, parce que c'est la seule porte d'écriture de l'état et que
chaque règle y a un voisin ; l'IA de `evaluate.ts`, parce qu'un réglage s'y juge sur des matchs ;
tout ce qui touche à la base en écriture, qui passe par Jérôme.

