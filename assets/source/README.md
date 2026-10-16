# Sources des assets Boomball

Les fichiers bruts de Jérôme, déplacés ici depuis `context/import/` le 2026-10-15 à sa demande.
Le jeu ne lit jamais ce dossier : il lit les dérivés, qui eux sont commités.

| Source | Dérivé lu par le jeu |
|---|---|
| `images/le gradin cyan.jpg`, `le gradin magenta.jpg`, `la rambarde.jpg` (Nano Banana Pro) | `client/src/board3d/textures/stand-cyan.webp`, `stand-magenta.webp`, `barrier.webp` |
| `images/Giff-boomball-2d.jpg` | rien encore |
| `models/giff-boomball.glb` (export trimesh, sans squelette) | `client/public/models/giff-rigged.glb` depuis le 2026-10-16 : riggé et animé par `scripts/blender/rig_giff.py` (Blender 5.2, sans fenêtre), sept clips. L'ancienne copie `client/public/models/giff-boomball.glb` n'est plus lue |
| `models/giff-rigged.blend`, `models/giff-rigged-clips.mp4` | rien : la scène Blender du rig, pour l'ouvrir à la main, et la vidéo des sept clips |
| `sounds/swing.wav`, `goal.wav`, `explosion cracker.wav` | `client/public/sounds/swing.mp3`, `goal.mp3`, `blast.mp3` (ffmpeg, mp3 q4) |
| `sounds/jetpack1.aiff` (trois bursts, 12 s) | `client/public/sounds/dash.mp3` : le deuxième burst, 4,00 à 5,60 s, fondu de sortie 300 ms (le Dash, les Giff ont des jetpacks) |
| `sounds/jetpack2.wav` (jet continu, 2 s) | rien encore |
| `sounds/crowd2.wav` (61 s, niveau stable) | `client/public/sounds/crowd.mp3` : 5,0 à 36,5 s, fin fondue sur le début sur 1,5 s, boucle de 30 s jouée en fond (`AMBIENCE`) |
| `sounds/crowd1.wav` (4 min, niveau très variable, des vagues) | rien encore : matière pour des réactions de foule, pas pour un fond |
| `textures/MetalPlates011_1K-JPG.zip`, `013`, `014` (ambientCG, CC0) | les WebP 1K de `client/src/board3d/textures/` |

Refaire le Giff animé, depuis `boomball/` :
`"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P scripts/blender/rig_giff.py -- client/public/models/giff-rigged.glb assets/source/models/giff-rigged.blend`

Conversion d'un son : `ffmpeg -i source.wav -ac 2 -ar 44100 -codec:a libmp3lame -q:a 4 client/public/sounds/<kind>.mp3`,
puis la table `SAMPLES` de `client/src/match/sound.ts`.

Ces sources pèsent 36 Mo. Elles ne sont pas commitées sauf décision de Jérôme au `/commit`.
