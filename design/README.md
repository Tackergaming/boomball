# Design

**Les deux prompts sont livrés.** Le fichier contient les écrans de match du prompt 1 *et* les
quatre écrans de coque du prompt 2. Cette page a un temps prétendu le contraire, à tort : elle ne
documentait que la vérification du prompt 1.

`Boomball Interface.html` est l'export du canvas Claude Design, deposé par Jérôme le 2026-09-01.
C'est un bundle : le markup reel vit dans le payload JSON `<script type="__bundler/template">`, et
les deux images d'arene sont embarquees en base64 dans le manifeste. Pour le relire :

    node -e 'const fs=require("fs");const s=fs.readFileSync("Boomball Interface.html","utf8");
    fs.writeFileSync("out.html",JSON.parse(s.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/)[1]))'

## Verification du rattrapage, 2026-09-01

Les cinq defauts signales sur la premiere version sont corriges.

| Point | Etat |
|---|---|
| La « Zone 4 Upper Gallery » inventee | Supprimee. Le markup porte le commentaire « ONLY THREE ZONES EXIST » et la regle des bandeaux conditionnels |
| L'art d'arene absent du viewport | Corrige. Les deux images remplissent le viewport en `object-fit:cover` avec un `filter:brightness`, et les bandeaux voisins reutilisent la meme image decalee |
| Grille carree 15 x 15 | Annoncee dans les deux viewports |
| Les Furnaces comme buts | Presentes, huit occurrences |
| « Rig Guard » et « 1 shout left » | Disparus tous les deux |

Deux viewports livres, ce qui etait demande : Zone 2 The Scramble en cas ordinaire, Zone 3 The
Summit sans bandeau superieur.

## Le prompt 2, verifie le 2026-09-02

Present dans le meme fichier, sous la section « Out-of-match screens ». Cinq artboards, ancres
`#2a` a `#2e`, tous a la taille bureau demandee :

| Ancre | Ecran | Taille |
|---|---|---|
| `2a` | Sign in | 1440 x 900 |
| `2b` | Team hub, regimental roster sheet | 1512 x 1024 |
| `2c` | Lobby | 1512 x 1024 |
| `2d` | Results | 1512 x 1024 |
| `2e` | Seat panel states | - |

Rien ne manque pour attaquer le client : les six vues du plan sont couvertes.

## Jetons repris pour la phase 4

| Role | Valeur |
|---|---|
| Equipe du joueur | `#3ce0f0` |
| Equipe adverse | `#ff56dc` |
| Laiton, accents | `#c9b489` |
| Texte primaire | `#e9f0f2` |
| Texte secondaire | `#8ea1a9`, `#6b7c84` |
| Surfaces | `#2b3439`, `#10161a`, `#0d1114`, `#0b0f12`, `#05070a` |
| Bandes de danger | `#d8a12a` |
| Le Spark | `#fffce8` |
