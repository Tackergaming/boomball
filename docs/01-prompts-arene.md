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

**Symétrie miroir haut bas, et non plus gauche droite.** *(Révisé le 2026-09-02, écart 24 du
règlement.)* Chaque équipe défend un bout du silo : la Furnace de A est une fosse au centre du sol
de la Zone 1, celle de B une bouche au centre du plafond de la Zone 3. Ce qui doit être identique
pour les deux camps, c'est donc l'approche vers le but adverse, et l'axe d'équité est vertical. Le
terrain est un miroir exact autour de la ligne médiane, tenu par une assertion de test.

**Conséquence directe sur les images : la Zone 3 est la Zone 1 retournée.** Mêmes passerelles aux
mêmes hauteurs, comptées depuis le plafond au lieu du sol. Et la Zone 2 est symétrique en elle-même
autour de sa propre ligne médiane. La symétrie gauche droite reste vraie dans chaque image, mais
elle n'est plus ce qui porte l'équité : c'est devenu de la simple bonne tenue de stade.

**Bandes de raccord en haut et en bas.** Chaque frame se termine par une grille de ventilation
horizontale pleine largeur, qui est aussi la fiction du coût de 10 pieds pour changer de zone. Les
trois images s'empilent alors sans raccord à truquer. Exception : la Zone 1 pose un sol en bas, la
Zone 3 un plafond en haut, et chacun de ces deux bords porte une bouche de Furnace en son centre.

**Une chaîne lourde au centre exact de chaque frame.** Le centre est le seul emplacement qu'un
modèle place à coup sûr. Cette chaîne coud les trois images en une seule colonne, et elle donne un
point d'ancrage central disputé, juste là où le Payload et les Crackers démarrent. Elle **plonge
dans chaque bouche de Furnace** aux deux extrémités du silo, donc elle ne touche jamais tout à fait
le bord du sol ni celui du plafond.

## Ce qui change par rapport à tes brouillons

Les mentions **FURNACE 1** et **FURNACE 2** peintes sur ton `up.png` disparaissent. Tout texte dans
une image de jeu est un piège : il ne se traduit pas, il ne se repositionne pas, et il pixellise au
zoom. Les deux Furnaces seront étiquetées et colorées par l'interface, par dessus l'image.

---

## Prompt 1, Zone 1, The Trench

Référence à joindre : ton `boomball down.png`.

*(Rien à régénérer ici : l'image livrée dessine déjà la fosse au centre du sol et la chaîne qui y
plonge, ce que l'écart 24 demande. Un seul mot est corrigé ci-dessous, `four` devient `three` : le
modèle avait rendu trois paires de passerelles, l'image gardée en montre trois et le layout en code
trois. Le prompt décrit maintenant l'image qui existe, ce qui compte pour la Zone 3, qui doit en
être le miroir.)*

```
Image 1 sets the palette, the metal treatment, the line weight and the lighting temperature. Match them exactly.

A square orthographic side elevation of the bottom section of an enormous vertical industrial silo, seen straight on from the side, the camera perpendicular to the back wall, every element viewed from directly in front of it, with no perspective convergence and no vanishing point.

The back wall is riveted dark steel plating, streaked with rust and old scorch marks. The floor spans the full width of the bottom of the frame, laid in heavy riveted steel deck plates. A single round furnace pit sits dead centre in that floor, ringed by a raised steel collar, glowing deep orange from within and throwing warm light up the lower wall. A heavy iron chain hangs dead centre in the frame and descends into that collar.

The layout is mirror-symmetrical about the vertical centre line: every platform on the left has an identical counterpart at the same height on the right. Exactly three horizontal steel catwalks cross the shaft, and no others, at roughly three tenths, one half and eight tenths of the frame height measured upward from the floor. Each has a grated deck and diagonal underbraces, projects from both side walls, and stops short of the centre so that the central chain passes cleanly through a narrow gap between its two halves. The middle one reaches further toward the centre than the other two. Two vertical steel ladders connect catwalks. Behind everything runs a regular lattice of thin riveted structural framework, reading clearly as background.

The topmost band of the image is a horizontal steel ventilation grating spanning the full width of the frame, edge to edge.

Lighting is dim and cold from above, warm orange from the pit below. Square 1:1 composition.

Style: Hyper-detailed textures, dark sci-fantasy concept art, 8k resolution.

Avoid: text, letters, numbers, labels, watermark, user interface, borders, frame, grid lines, grid overlay, tokens, characters.
```

---

## Prompt 2, Zone 2, The Scramble

*(Réécrit le 2026-09-02. Les passerelles sont passées de quatre à deux, une par moitié de terrain,
à égale distance de la ligne médiane, et les crochets sont descendus sur cette ligne médiane. C'est
le milieu de terrain : chaque équipe se range au-dessus de sa propre passerelle au coup d'envoi.)*

Références à joindre, dans cet ordre : ta **Zone 1 finie**, puis ton `boomball middle.png`.

```
Image 1 sets the palette, the metal treatment, the line weight and the lighting temperature. Match them exactly. Image 2 sets only the look of the hanging chains and their hooks; take nothing else from it.

A square orthographic side elevation of the middle section of an enormous vertical industrial silo, seen straight on from the side, the camera perpendicular to the back wall, every element viewed from directly in front of it, with no perspective convergence and no vanishing point.

The back wall is riveted dark steel plating, streaked with rust and marked by black blast scoring where explosives have detonated against it. This section has neither floor nor ceiling: it is open shaft from top to bottom. A heavy iron chain hangs dead centre in the frame and runs the full height of the image, from the top edge to the bottom edge, unbroken.

The composition is mirror-symmetrical about the horizontal centre line as well as the vertical one, so that the upper half and the lower half of the shaft are the same terrain the other way up. Exactly two horizontal steel catwalks cross the shaft, and no others: one at roughly one quarter of the frame height from the bottom, one at roughly one quarter from the top. Each has a grated deck and diagonal underbraces, projects from both side walls, and stops short of the centre so that the central chain passes cleanly through a narrow gap between its two halves.

Exactly on the horizontal centre line of the frame, four short chains hang from the framework, two on each side of the central chain, evenly spaced and each ending in a heavy iron hook. They hang free in open air, well clear of both catwalks. Behind everything runs a regular lattice of thin riveted structural framework, reading clearly as background.

The topmost band and the bottommost band of the image are each a horizontal steel ventilation grating spanning the full width of the frame, edge to edge.

Lighting is dim, cold and even, with no strong source inside the frame. Square 1:1 composition.

Style: Hyper-detailed textures, dark sci-fantasy concept art, 8k resolution.

Avoid: text, letters, numbers, labels, watermark, user interface, borders, frame, grid lines, grid overlay, tokens, characters.
```

---

## Prompt 3, Zone 3, The Summit

*(Réécrit le 2026-09-02. Les deux portes de fournaise latérales disparaissent : il n'y a plus qu'une
bouche, au centre du plafond, et c'est le but de l'équipe B. Cette zone est désormais la Zone 1
retournée, donc **la seule référence à joindre est ta Zone 1 finie**. Ton `boomball up.png` ne sert
plus : il dessine la géométrie qu'on vient d'abandonner, et le donner en référence ramènerait les
deux portes latérales.)*

Référence à joindre : ta **Zone 1 finie**, et elle seule.

```
Image 1 sets the palette, the metal treatment, the line weight and the lighting temperature. Match them exactly. This image is the same silo as image 1 seen at the opposite end of the shaft, so it is image 1 turned upside down: read its structure, flip it vertically, and keep every height the same distance from the ceiling here as it is from the floor there.

A square orthographic side elevation of the top section of an enormous vertical industrial silo, seen straight on from the side, the camera perpendicular to the back wall, every element viewed from directly in front of it, with no perspective convergence and no vanishing point.

The back wall is riveted dark steel plating, streaked with rust and old scorch marks. The ceiling spans the full width of the top of the frame, laid in heavy riveted steel deck plates. A single round furnace mouth sits dead centre in that ceiling, ringed by a raised steel collar, glowing deep orange from within and throwing warm light down the upper wall. A heavy iron chain hangs dead centre in the frame and rises into that collar.

The layout is mirror-symmetrical about the vertical centre line: every platform on the left has an identical counterpart at the same height on the right. Exactly three horizontal steel catwalks cross the shaft, and no others, at roughly three tenths, one half and eight tenths of the frame height measured downward from the ceiling. Each has a grated deck and diagonal underbraces, projects from both side walls, and stops short of the centre so that the central chain passes cleanly through a narrow gap between its two halves. The middle one reaches further toward the centre than the other two. Two vertical steel ladders connect catwalks. Behind everything runs a regular lattice of thin riveted structural framework, reading clearly as background.

The bottommost band of the image is a horizontal steel ventilation grating spanning the full width of the frame, edge to edge.

Lighting is dim and cold from below, warm orange from the furnace mouth above. Square 1:1 composition.

Style: Hyper-detailed textures, dark sci-fantasy concept art, 8k resolution.

Avoid: text, letters, numbers, labels, watermark, user interface, borders, frame, grid lines, grid overlay, tokens, characters, hanging lanterns, doors in the side walls.
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
