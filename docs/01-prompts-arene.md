# Prompts de l'arène, Kill-Silo

> Trois images, une par zone, à générer dans Nanobanana. Chaque prompt est complet et se colle
> d'un seul geste. Les consignes qui te sont adressées sont hors des blocs.

## Ordre de génération, et pourquoi

**Génère la Zone 1 en premier**, en passant ton `boomball down.png` en référence. C'est ton dessin
le plus net des trois : contours francs, métal froid, lumière chaude venue de la fosse. Il fixe la
famille visuelle.

Une fois la Zone 1 satisfaisante, **elle devient la référence numéro 1 des deux autres prompts**, à
côté de ton original de la zone concernée. Chaque référence reçoit un rôle unique et nommé : deux
images qui font le même travail donnent un résultat moyenné et mou.

## Trois contraintes de jeu qui pilotent les prompts

**Symétrie miroir gauche droite.** Ce n'est pas esthétique, c'est de l'équité : les deux équipes
doivent avoir exactement le même terrain. Un stade réel est symétrique, donc ça ne se verra pas.

**Bandes de raccord en haut et en bas.** Chaque frame se termine par une grille de ventilation
horizontale pleine largeur, qui est aussi la fiction du coût de 15 pieds pour changer de zone. Les
trois images s'empilent alors sans raccord à truquer. Exception : la Zone 1 pose un sol en bas, la
Zone 3 un plafond en haut.

**Une chaîne lourde au centre exact de chaque frame.** Le centre est le seul emplacement qu'un
modèle place à coup sûr. Cette chaîne coud les trois images en une seule colonne, et elle donne un
point d'ancrage central disputé, juste là où le Payload et les Crackers démarrent.

## Ce qui change par rapport à tes brouillons

Les mentions **FURNACE 1** et **FURNACE 2** peintes sur ton `up.png` disparaissent. Tout texte dans
une image de jeu est un piège : il ne se traduit pas, il ne se repositionne pas, et il pixellise au
zoom. Les deux Furnaces seront étiquetées et colorées par l'interface, par dessus l'image.

---

## Prompt 1, Zone 1, The Trench

Référence à joindre : ton `boomball down.png`.

```
Image 1 sets the palette, the metal treatment, the line weight and the lighting temperature. Match them exactly.

A square orthographic side elevation of the bottom section of an enormous vertical industrial silo, seen straight on from the side, the camera perpendicular to the back wall, every element viewed from directly in front of it, with no perspective convergence and no vanishing point.

The back wall is riveted dark steel plating, streaked with rust and old scorch marks. The floor spans the full width of the bottom of the frame, laid in heavy riveted steel deck plates. A single round furnace pit sits dead centre in that floor, ringed by a raised steel collar, glowing deep orange from within and throwing warm light up the lower wall. A heavy iron chain hangs dead centre in the frame and descends into that collar.

The layout is mirror-symmetrical about the vertical centre line: every platform on the left has an identical counterpart at the same height on the right. Four horizontal steel catwalks with grated decks and diagonal underbraces project from the side walls at four different heights. Two vertical steel ladders connect catwalks. Behind everything runs a regular lattice of thin riveted structural framework, reading clearly as background.

The topmost band of the image is a horizontal steel ventilation grating spanning the full width of the frame, edge to edge.

Lighting is dim and cold from above, warm orange from the pit below. Square 1:1 composition.

Style: Hyper-detailed textures, dark sci-fantasy concept art, 8k resolution.

Avoid: text, letters, numbers, labels, watermark, user interface, borders, frame, grid lines, grid overlay, tokens, characters.
```

---

## Prompt 2, Zone 2, The Scramble

Références à joindre, dans cet ordre : ta **Zone 1 finie**, puis ton `boomball middle.png`.

```
Image 1 sets the palette, the metal treatment, the line weight and the lighting temperature. Match them exactly. Image 2 sets only the density and the spacing of the scaffolding; take nothing else from it.

A square orthographic side elevation of the middle section of an enormous vertical industrial silo, seen straight on from the side, the camera perpendicular to the back wall, every element viewed from directly in front of it, with no perspective convergence and no vanishing point.

The back wall is riveted dark steel plating, streaked with rust and marked by black blast scoring where explosives have detonated against it. This section has neither floor nor ceiling: it is open shaft from top to bottom. A heavy iron chain hangs dead centre in the frame and runs the full height of the image, from the top edge to the bottom edge.

The layout is mirror-symmetrical about the vertical centre line: every platform on the left has an identical counterpart at the same height on the right. Four horizontal steel catwalks with grated decks and diagonal underbraces project from the side walls at four different heights, reaching further toward the centre than in the section below. Four shorter chains hang from the upper framework, each ending in a heavy iron hook. Behind everything runs a regular lattice of thin riveted structural framework, reading clearly as background.

The topmost band and the bottommost band of the image are each a horizontal steel ventilation grating spanning the full width of the frame, edge to edge.

Lighting is dim, cold and even, with no strong source inside the frame. Square 1:1 composition.

Style: Hyper-detailed textures, dark sci-fantasy concept art, 8k resolution.

Avoid: text, letters, numbers, labels, watermark, user interface, borders, frame, grid lines, grid overlay, tokens, characters.
```

---

## Prompt 3, Zone 3, The Summit

Références à joindre, dans cet ordre : ta **Zone 1 finie**, puis ton `boomball up.png`.

```
Image 1 sets the palette, the metal treatment, the line weight and the lighting temperature. Match them exactly. Image 2 sets only the design of the two armoured furnace doors and the treatment of the ceiling; take nothing else from it.

A square orthographic side elevation of the top section of an enormous vertical industrial silo, seen straight on from the side, the camera perpendicular to the back wall, every element viewed from directly in front of it, with no perspective convergence and no vanishing point.

The back wall is riveted dark steel plating, streaked with rust. Two identical armoured furnace doors are set into the side walls facing each other, one against the left wall and one against the right wall, both at exactly the same height in the upper half of the frame, each a heavy riveted steel hatch glowing hot orange through its vents. A broad steel catwalk projects from the wall directly beneath each door.

The layout is mirror-symmetrical about the vertical centre line: every platform on the left has an identical counterpart at the same height on the right. A heavy iron chain hangs dead centre in the frame and runs the full height of the image. Two suspended horizontal steel platforms hang on chains in the open middle of the shaft, one above the other. Behind everything runs a regular lattice of thin riveted structural framework, reading clearly as background.

The topmost band of the image is the ceiling: a horizontal steel roof structure spanning the full width of the frame, with three hanging lanterns casting warm pools of light downward. The bottommost band of the image is a horizontal steel ventilation grating spanning the full width of the frame, edge to edge.

Lighting is warm from the lanterns above and from both furnace doors, cold and dim in the open centre. Square 1:1 composition.

Style: Hyper-detailed textures, dark sci-fantasy concept art, 8k resolution.

Avoid: text, letters, numbers, labels, watermark, user interface, borders, frame, grid lines, grid overlay, tokens, characters.
```

---

## Après génération

**Sortie carrée**, 2048 x 2048 au minimum. À 15 cases de côté, ça fait 136 pixels par case, large
pour un affichage web.

**Itère un mot à la fois.** Réécrire un prompt entier fait perdre quel mot a corrigé l'image et
quel mot l'a cassée.

**Contrôle à faire sur chaque image avant de la garder**, dans cet ordre :

1. La vue est bien de profil et sans fuite. Une seule ligne de perspective et la grille ne tombera
   jamais juste.
2. Les bandes de raccord haut et bas sont pleine largeur, pour que les trois s'empilent.
3. La symétrie gauche droite tient réellement.
4. La densité de structure. C'est le point de jeu : trop dense, l'ancrage devient gratuit et la
   règle ne mord plus. Trop clairsemée, on ne peut plus finir son tour nulle part. Vise un terrain
   où il existe de vrais trous où l'on ne peut pas s'arrêter.

**Si un élément ne sort jamais après plusieurs essais, coupe le du design plutôt que d'insister.**
Un modèle qui laisse tomber un détail te dit qu'il lit comme du bruit, et le renforcer coûte de la
longueur de prompt au reste de l'image.

**L'image gagne sur le plan.** Une fois les trois validées, c'est le dessin qui fait foi : on trace
`arena.json` sur ce qui est réellement dessiné, et on corrige le règlement si la géométrie obtenue
diverge, jamais l'inverse.
