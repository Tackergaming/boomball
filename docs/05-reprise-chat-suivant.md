# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Fable 5.1) le 2026-10-15 au soir, à la fin du chat qui a reformulé
> les sept retours de Jérôme sur 2H.21, écrit `00` C24, codé 2H.22, le jeu vivant en deuxième
> passe (les mots plus gros et plus longs, toutes les actions en mot, le bandeau de but, la
> barre de la carte retirée, le son, le pantin), commité 2H.21 et 2H.22, puis corrigé le son
> que StrictMode tuait, prouvé le pantin par une sonde, pris ses trois enregistrements et
> déplacé les sources d'assets. La correction n'est pas commitée : Jérôme tape `/commit`. Sa
> partie sur 2H.22 corrigée est la porte suivante. À coller tel quel comme premier message du
> chat suivant, dans le workspace `jarvis-jdr`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.22
est la dernière sous-phase codée (les phases 3, 4 et 5 sont faites par 2H.15), §9 la
parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 63, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 la quatrième passe, C13 la cinquième, C14 l'écart 58 (ma place dans
mon rôle, par une popup) et la sixième passe, C15 le lot du 2026-10-14 (le chrono, les écarts 59
à 62, la septième passe), C16 le lot du 2026-10-14 au soir (l'écart 63, la passe gratuite après
le Shove qui prend le ballon, la huitième passe, trois retours d'écran), C17 le lot de la nuit
du 2026-10-14 : mon retour sur les cases orange, retirées, et la passe gratuite d'un Breaker vers
son gardien treize cases derrière lui, TRANCHÉE le 2026-10-15 : elle reste autorisée, rien ne
change. C18 le lot du 2026-10-15 : mes deux retours de caméra après ma première partie en 3D, et
J4 qui tombe. C19 le second lot du 2026-10-15 : la caméra décrochée du jeu, mon retour après ma
partie sur 2H.16. C20 le troisième lot du même jour : la caméra stable, mes mots « très tremblant
et instable », les cinq causes, et MON REFUS d'une caméra à quatre nombres lissés, la main reste
brute. C21 le quatrième lot : 45 à 50 images par seconde, l'erreur réseau du round 8 lue en
base et la nouvelle tentative, les gradins et la rambarde sur mes trois images. C22 le
cinquième lot : la caméra retenue dans le silo, et la réponse sur mon Breaker du round 8 (passe
gratuite, jamais un tir, écart 63, aucune décision). C23 le jeu vivant, dix lignes validées :
les effets, les mots qui montent, les bandeaux, la carte, le fil. C24 le jeu vivant en deuxième
passe, mes sept retours après ma partie sur 2H.21 : mots deux fois plus gros et deux fois plus
longs, toutes les actions en mot (SWING, ATCK OP, SHOVE, SHOOT, PASS, DISENGAGE, DASH, BAT,
DODGE), le bandeau de but plus visible (« Goal · Your Team », « Goal · The other Team »), la
barre de temps de la carte retirée (c'était elle que j'appelais barre de défilement), le son
synthétisé, le pantin en attendant un modèle riggé. Chaque passe finit par « comment ... est
codée », poids par poids, À LIRE avant de toucher à ai/. Ne rediscute rien de C12 à C24.
07 §10 porte le journal, dont l'entrée 2H.15, qui dit fichier par fichier ce que la 2.5D
contient, les entrées 2H.16 à 2H.20, la caméra et les gradins, 2H.21 et 2H.22, le jeu vivant.
09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep de 2H.8 à 2H.22.
04 est l'histoire, à lire seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.16 à 2H.22 sont CODÉES le 2026-10-15, ENGINE_VERSION toujours 9, rien à
redéployer côté fonctions, le client en ligne PAS redéployé depuis 2H.14 (mon feu vert). Les
fonctions en ligne restent resolve-action v20 et create-match v18, moteur 9. 683 tests verts sur
32 fichiers (676 avant 2H.22), typecheck racine, scripts, e2e et client verts, build du client
vert (three dans un chunk chargé en lazy, le 2D ne le télécharge pas). Le harnais 3D, npm run
e2e:board3d, est vert en 5,6 minutes depuis 2H.22 sur un Vite dédié (5174). SUR UN VITE 5174 QUI
VIENT DE DÉMARRER, LE CHAUFFER PAR DEUX curl (la racine et /src/main.tsx) AVANT LE RUN : à froid,
global-setup.ts rate le champ Email en trente secondes et le run est rouge avant toute 3D, vu
deux fois le 15. Ce qu'il fait : bascule en 3D, silo entier capturé, cellToScreen par la caméra,
clic à la souris sur la case qu'il désigne et le pion arrive, cadrage rapproché, glisser au
bouton droit puis roulette, la case suivie se projette ailleurs, le bouton de cadrage la ramène,
flèche droite tenue, le cadre passe en data-camera="free", « Follow the play » la ramène, chaque
effet tiré par le crochet dont le mot SWING, le bandeau de but dit par le crochet, le bouton son
lu (on, off, on), un round de l'IA en slow, retour 2D, zéro erreur console. Le smoke 2D (npm run
e2e) est vert en 18,3 s après 2H.22. Ma partie sur le moteur 9 (ab27b827, Striker, 50-0), le
match e2e 7d631b71 et ma partie sur 2H.18 (cb618e32, 30-20) sont consignés et rejoués sans écart
dans docs/matches/. Mes deux parties sur 2H.21 sont consignées le 2026-10-15 au soir :
c3867408 (40-50, rejouée sans écart) et 2e30f587 (20-10) dont LA RELECTURE S'ARRÊTE AU ROUND 2
(« the engine refused the rebuilt action of A-breaker-6 at seq 161: (4, 16) is already
occupied », 669 événements non atteints) : personne n'a cherché pourquoi, c'est à moi de
demander l'analyse. 2H.16 à 2H.20 sont commitées et poussées (fd85266, 46341a0, 2f3096d), 2H.21
(54cd99f) et 2H.22 (2bcc46e) commitées en local le 15 au soir. LA CORRECTION QUI A SUIVI MA
PARTIE N'EST PAS COMMITÉE, c'est moi qui tape /commit : vérifier git status en premier et me le
dire. Elle contient : le son que StrictMode tuait (Match.tsx, l'instance dans un seul effet,
sound.ts expose state, le crochet audio()), la sonde probe(unitId) du crochet (fxBridge.probe,
Board3D) et le spec 3D qui lit le pantin par elle, les amplitudes du pantin doublées, mes trois
WAV en MP3 dans client/public/sounds/ (SAMPLES dans sound.ts : swing, goal, blast), le fil des
sources d'assets déplacé de context/import/ vers boomball/assets/source/ (36 Mo, images,
models, sounds, textures, README) : à moi de dire au /commit si ces sources entrent dans git ;
les dérivés (WebP, MP3, le GLB de public/models/) y entrent.

Ce que 2H.22 contient, en sept phrases, détail en 00 C24 « comment 2H.22 est codée ». Les mots
au-dessus des têtes font 28 px en 3D et 26 en 2D et vivent FLOAT_MS (2 s en normal, 3 s en slow,
rien à instant), link.float prend la durée en quatrième argument. Le repère action de motion.ts
pose le mot de chaque action sur son acteur, dans sa couleur, avec toward, la case visée : SWING,
ATCK OP, SHOVE, SHOOT, PASS, DISENGAGE, DASH, BAT, DODGE, dans les deux plateaux, et le mot de
l'attaquant précède hit ou miss sur la cible. Le bandeau de but est la sorte goal de Banner.tsx,
40 px, blanc à halo d'équipe, 2,5 s en normal et 4 s en slow, « Goal · Your Team » ou « Goal · The
other Team ». La carte de beat n'a plus de barre de temps (useMatch.hold et bb-drain retirés). Le
son est match/sound.ts : seize recettes Web Audio synthétisées (swing, hit, miss, push, held,
blast, goal, sparkIn, sparkCaught, exit, enter, throw, shoot, dash, whistle, fullTime), le
contexte audio ouvert seulement dans un gestionnaire de geste confirmé par
navigator.userActivation (sinon Chrome avertit en console et le harnais tombe), douze voix,
Match.tsx programme un son par repère à son instant et le sifflet au round, le bouton « ♪ Sound on
» (data-testid sound-toggle, data-sound) garde le choix dans localStorage sous boomball.sound,
allumé par défaut, rien à instant. Le pantin est dans la boucle de Board3D : bob et pente en
marche, torsion vers la cible au coup, poussée au Shove, recul de la cible, inclinaison au lancer
(link.gestures, l'ordre d'Euler du pion en YXZ), le maillage entier parce que MON GLB N'A NI
SQUELETTE NI CLIP (export trimesh, deux nœuds) : les vrais clips de course et de batte attendent
un modèle riggé, Mixamo sur le maillage en pose neutre puis export GLB, ou Blender, et sont une
sous-phase à part. Feed.tsx juge ses lignes neuves par le dernier événement et plus par la taille
du fil, défaut de 2H.21 vu par le harnais quand la fenêtre de 120 est pleine. Le crochet gagne
fx({ kind: 'banner', banner, text, tone }) pour dire un bandeau sans but.

Ce que 2H.21 contient, en six phrases, détail en 00 C23 « comment 2H.21 est codée ». Les
repères (Cue) sont lus des événements dans motion.ts au même passage que les pas, et datés sur
les pas qui les précèdent (l'explosion au bout du roulement, les braises au bout du tir, l'impact
avant le recul), zéro à instant où rien ne tire. En 3D, Effects.tsx (pool de huit, une useFrame,
texture procédurale) joue étincelles du coup, anneau du Shove, explosion du Cracker, braises du
but, faisceau et flash du Spark ; Floaters.tsx (DOM projeté) fait monter le chiffre des dégâts
dans le maillot du Giff touché et « miss » / « held » en gris ; la boucle de Board3D enfonce
l'évacué, fait monter le remplaçant et descendre le Spark (link.transitions). En 2D, Board.tsx
fait monter les mêmes mots en SVG SMIL. Banner.tsx montre un bandeau à la fois, tiré du beat par
Match.tsx (Round n of 10, Sudden death, Goal, Knockout, The Spark is loose, Spark caught, Full
time, jamais à instant) et « Your turn » au tour jouable, qui vide la file. Announce.tsx porte le
nom dans le maillot, le verdict en gros à droite, le dé dessous ; Feed.tsx marque ses lignes
neuves d'une barre cuivre trois secondes, ◆ au but, ✕ gras au KO. Le crochet a fx({kind, x, y,
text?, unitId?, team?, stretch?}) via match/fxBridge.ts, développement seulement ; sous PATIENT
les bandeaux sont tenus quatre fois plus longtemps. Dette : sous le GL logiciel les captures des
effets courts (étincelles, anneau, braises, flash, affaissement) sont des images figées ; le
ballon ne disparaît pas dans la bouche ; pas d'étincelles en 2D.

Ce que 2H.20 contient, en deux phrases. Les dimensions du silo (APRON_HALF 14, TUBE_RADIUS 15,
TUBE_TOP, BACK_PLATE_X) sont dans layoutGeometry.ts, partagées par Silo.tsx et framing.ts ;
confine retient la position de la caméra entre les parois et les plaques de fond tant qu'elle
est sous le haut du tube moins une case, jamais sous 1,5 de haut, et la laisse libre au-dessus,
où se tient la vue large. MIN_TILT 30 degrés, MAX_ZOOM 1,5, PAN_MARGIN 1.

Ce que 2H.19 contient, en quatre phrases. Sur un fetch rejeté par le navigateur (Refused
porte unreachable), useMatch.send attend 1,5 s, lit headSeq du match, recharge sans renvoyer si
la tête a dépassé seqRef, sinon renvoie une fois ; rien côté serveur. Silo.tsx : le tube au
rayon 15, un tablier sombre de 28 cases de large (APRON_HALF 14) autour du terrain de quinze,
TUBE_LENGTH 56, la rambarde à une demi-case des touches, les gradins de côté en deux moitiés
(Stand, pente 37 degrés, la couleur de la bouche la plus proche), les gradins de fond au-dessus
du mur de la bouche ramené à 2,6 de haut et une plaque arrière à BACK_PLATE_X. Les foules sont
mes images en meshBasicMaterial, MirroredRepeatWrapping, et chaque Stand s'efface (opacité
jusqu'à 0,08) quand la caméra est derrière lui et plus bas que deux cases au-dessus de sa
dernière rangée. Le compteur d'images par seconde marque 2 à 4 fps en headless, c'est le GL
logiciel, chez moi c'est 45 à 50.

Ce que 2H.18 contient, en quatre phrases. La main est brute : le bouton droit tourne tout de
suite autour de la cible, qui ne bouge pas d'un pixel (le décalage de centrage se calcule dans
la même image que l'azimut), et Ctrl plus la souris déplace la cible tout de suite. La distance
ne dépend plus de l'inclinaison : le cadrage se calcule à PRESET_TILT quand le cadrage ou
l'aspect change, la roulette fixe un facteur vers lequel la distance glisse en un dixième de
seconde (ZOOM_EASE), les flèches ont une inertie d'un sixième (KEY_EASE). Accrochée, la caméra
suit une pièce à la fois (link.focusKey), en prend une nouvelle au plus toutes les quatre
dixièmes de seconde (FOLLOW_DWELL_MS) et glisse vers elle en un quart (FOLLOW_EASE). Le pas de
la caméra est link.camera(delta), appelé par la boucle de Board3D après les pièces et avant les
plaques, et un compteur d'images par seconde (link.fps, FpsReadout) s'affiche sous la minicarte
en mode développement seulement : JE DOIS DONNER CE CHIFFRE.

Ce que 2H.17 contient, en trois phrases. La caméra se décroche du jeu dès qu'on la déplace :
aux flèches (KEY_PAN_RATE fois la distance par seconde, dans les axes de l'image donnés par
viewAxes, donc « haut » est toujours le loin de l'image), ou Ctrl enfoncé plus la souris sur la
scène, qui tire le sol avec elle ; le point visé est borné par clampPan au terrain plus quatre
cases. Elle se raccroche d'elle-même quand mon pion (yoursId) arrive sur l'horloge, au clic sur
« Follow the play » (visible seulement décrochée, data-testid follow-play), et au choix d'un
cadrage ; hooked est un état React de Board3D.tsx passé au Rig, qui appelle onUnhook une fois au
premier pan, et le cadre porte data-camera="following" ou "free". Accrochée, la caméra recopie sa
cible dans le point de pan à chaque image pour que le décrochage parte de là, sans saut.

Ce que 2H.16 contient, en quatre phrases. client/src/board3d/framing.ts est pur : la
profondeur de sol que la hauteur de l'image couvre selon l'inclinaison (groundDepthPerUnit), le
décalage du centre de ce sol par rapport au point visé (groundCentreOffsetPerUnit), les deux
cadrages (presetDistance : rapproché, les quinze cases de large plus une dans la hauteur de
l'image ; large, les quarante-cinq de long et jamais moins que la largeur), la position sur
l'orbite (orbitPosition) et les bornes (inclinaison 20 à 85 degrés, roulette 0,3 à 2,5 fois),
onze tests. Camera.tsx porte l'orbite en main : glisser au bouton droit ou du milieu pour
tourner, roulette pour la distance, menu contextuel coupé sur le canevas, le bouton gauche reste
au jeu, le point visé amorti, la position déduite de l'orbite à chaque image, et un clic sur
« Close in / Whole silo » remet l'orbite à la vue fixe. En rapproché la caméra glisse le long du
terrain après le pion dont c'est le tour sinon le ballon, bornée aux bouts du silo, et ne suit en
travers que si la roulette a rapproché. Le crochet n'a pas bougé : cellToScreen et les plaques
lisent la caméra au moment de l'appel.

Ce que 2H.15 contient, en cinq phrases. Les carrés orange de 2H.14 sont retirés de Board.tsx,
la route sous le curseur reste orange quand elle provoque et l'étiquette compte les allonges.
React 19 (A20) et three, fiber, drei sont installés ; tout client/src/board3d/ est nouveau :
layoutGeometry.ts (pur, testé), Silo.tsx (sol, tube couché, caisses, piliers, deux bouches qui
flambent au but, mes trois textures en WebP 1K dans board3d/textures/), Camera.tsx, Tokens.tsx
(socle, anneaux, MON GLB de Giff dans client/public/models/, capsule en repli), Overlay.tsx
(tuiles, routes, ligne de vue, tir), Labels.tsx (plaques en DOM, jamais Html de drei qui fait
hurler React 19), Ordnance.tsx, Minimap.tsx, Board3D.tsx. L'animation lit match/pose.ts, sorti
de Board.tsx sans changement et partagé par les deux plateaux, dans une seule useFrame : marche,
poussée, recul, Crackers, Spark, passe et tir en arc. L'interrupteur est le bouton « See it in
3D » de l'écran de match, choix gardé dans localStorage, et le crochet publie view. Dette connue
de la 2.5D : l'orientation du modèle (MODEL_YAW dans Tokens.tsx, à vérifier sur mes captures),
le noir sous la lèvre avant en vue large, les pions tous du même maillage sans couleur d'équipe
sur l'armure (le socle et les plaques la portent) ; et depuis 2H.16, l'orbite qui se remet à la
vue fixe quand on passe par le 2D et revient, la borne de suivi aux bouts du silo calculée pour
l'azimut zéro, la roulette en vue large qui grossit le centre sans suivre le jeu.

Les quatre fichiers du vault modifiés hors de nos sessions (Sapphire Hammer.md, la PREP de la
scène 1.2 Ilthavax, sa battlemap et les prompts de battlemap de la scène 1.3) et les deux
fichiers non suivis MARGO.md et theodo.md ne sont pas à nous : ne les commite pas sans mon feu
vert. Les sources d'assets vivent dans boomball/assets/source/ depuis le 15 au soir (README dedans)
et ne sont pas commitées sauf ma décision ; la copie du glb dans client/public/models/, les
WebP et les MP3 le sont.

LA TÂCHE : MA PARTIE SUR 2H.22 CORRIGÉE, PUIS C25.
Ma première partie sur 2H.22 n'a rien donné à entendre (le son était mort au montage) et je
n'ai pas vu le pantin (il tournait, mais trop peu). Je rejoue en 3D et en 2D, son allumé, après
un premier clic n'importe où, et je dis ce que j'entends et ce que je vois : les mots et leur
taille, les actions, le bandeau de but, chaque son (mes trois enregistrements et les treize
recettes synthétisées : ce qui sonne juste, ce qui est de trop, ce qui manque, et quels autres
enregistrements je dépose dans boomball/assets/source/sounds/), le pantin (la marche, le coup
vers la cible, le Shove, le recul du touché). La caméra de 2H.16 à 2H.20 est close.
1. Vérifier git status et git diff --cached --stat avant toute chose ; 2H.21 (l'index) et 2H.22
   (la copie de travail) doivent avoir été commitées en deux commits par mon /commit après le
   chat précédent ; sinon me le dire en premier, c'est moi qui le tape.
2. Lire mes retours contre le code et les captures avant de reformuler ; les reformuler en
   chat, une ou deux questions par message si un choix est à moi ; les écrire en 00 C25 et en
   08 §5 (ligne 2H.23) avant la première ligne de code ; puis coder, sous-agents sur les
   fichiers disjoints (Sonnet pour le borné, Opus 5.5 ou Fable 5.1 quand la qualité le réclame,
   c'est permis depuis le 2026-10-15), le fil principal sur Board3D.tsx et Match.tsx.
3. Une capture par changement dans e2e/board3d.spec.ts, lue, en sachant que les effets courts
   sont figés sous le GL logiciel et que ni le son ni le pantin ne se capturent (lire le DOM des
   mots et des bandeaux, me demander le reste) ; le smoke 2D relancé si Match.tsx, Feed.tsx ou
   Board.tsx bougent.
4. Si je demande le client en ligne : le build est vert, le déploiement passe par mon feu vert
   explicite, jamais le dépôt GitHub sur Vercel.
5. Un sweep seulement si je le demande, un seul par lot, contre 09 §12, seize minutes.
6. Si je demande l'analyse de ma partie 2e30f587 : un agent Opus 5.5 effort élevé, et d'abord
   comprendre pourquoi dump-match refuse l'action rebâtie de A-breaker-6 au seq 161 (le recul
   ou la marche vers (4, 16) occupée), parce que sans relecture complète il n'y a pas de plans à
   lire après le round 2.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 ou Fable 5.1 pour ce qui réclame de la qualité (le son de
   2H.22 est d'un Opus 5.5 effort élevé) ; Opus 5.5 effort high pour l'analyse d'une partie,
   c'est moi qui la demande. Toute matière que tu me présentes nomme son auteur, agent ou fil
   principal. Dès que tu as une liste d'actions pour moi, donne-la numérotée, une action exacte
   par ligne, et dis ce qui se passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés. Quand tu me présentes
   une analyse, le round par round, les leçons et la liste par rôle en clair dans le message,
   jamais un renvoi chiffré vers un tableau que je n'ai pas sous les yeux. Pour expliquer pourquoi
   l'IA a fait un choix, lis les huit plans du viewer et le code, jamais une supposition. Ne dis
   plus « la maison » : « l'équipe qui a la balle », « l'équipe qui ne l'a pas », « en attaque »,
   « en défense ». L'étiquette The House reste à l'écran, et le fil dit encore « Your battery » et
   « The house » : seul le bandeau de but dit « Your Team » et « The other Team ».

3. Aucun sweep tant que je ne l'ai pas demandé, un seul par lot de changements d'IA. Tu ne
   touches à aucune constante de 00 sans mon arbitrage. Les poids de l'IA sont dans ai/roles/, et
   ils viennent de mes mots dans 00 C10 à C16 ; la formule est : note du plan = valeur de l'action
   depuis sa case + position de la case finale (Action dépensée) − position de la case de départ
   − exposition des trajets, chaque valeur d'action étant un poids du rôle fois sa chance de
   réussite. Depuis 2H.11 : un plan porte ses provocations et à note égale le moins provocant
   gagne ; une allonge coûte au moins 5 points ; le porteur ne recule jamais ; le dernier round
   lit le score. Depuis 2H.12 : pour le Breaker, tout plan qui ramasse un ballon atteignable dans
   le tour, Dash compris, gagne PICKUP_FIRST (1000), sauf debout sur le Spark. Depuis 2H.13 :
   le porteur gagne jusqu'à 15 % de carryToFurnace en s'enfonçant dans sa portée propre
   (depthInRange), le tireur qui a manqué lit shooterYields, le gardien écarte toute passe avec un
   intercepteur, un receveur appelé passe outre les filtres de la chaîne. Depuis 2H.14 : le
   Trajector au coup d'envoi lit le ballon comme porté (kickoffRelay, relayValue) et ne finit
   jamais plus près de sa bouche que sa case de départ (kickoffMayEnd) ; la passe gratuite
   (freeThrow dans plans, free dans throwsAt) lève les deux filtres de la chaîne, et elle peut
   viser le gardien loin derrière : c'est tranché en C17, elle reste.

4. Le plan de tour, en trois phrases : chooseAction renvoie la première action du meilleur plan
   et l'appelant rappelle après chaque action, donc l'IA se juge sur rankPlans (le plan entier et
   sa phrase) et jamais sur une seule action. Un plan se lit à sa fin, Action dépensée ; « marcher
   puis attraper » (chasseur seul), « marcher puis ramasser », « ramasser puis lancer », pour
   le Breaker « dash, marcher, ramasser », et après un Shove qui prend le ballon « passer » ou
   « marcher puis passer » sans Action sont des plans ; une frappe finit sur sa case de recul ;
   toute route est la route sûre de safeReachableCells. Ce qu'une case débloque se demande au
   moteur par actionOptionsAt dans legalActions.ts.

5. Pour savoir ce que l'IA a fait et pourquoi dans un match en ligne : depuis boomball/ en bash,
   set -a && . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis
   --match <id>. --list ne montre que les douze derniers matchs ; pour en voir plus, copier le
   script avec limit=40 dans scripts/, lancer, effacer la copie. Il écrit match.md, viewer.html,
   events.json, kickoff.json et match.json dans docs/matches/<date>-<id8>/ et rejoue le match en
   local. Les horaires de --list sont en UTC, deux heures de moins que l'heure de Paris. Une
   passe interceptée peut afficher « DIFFERS » sans vraie différence : le receveur d'une passe
   volée est dans l'événement (toId), mais le dump retient encore la première passe qui produit
   les mêmes jets. Pour publier le viewer en artefact privé, l'outil Artifact sur viewer.html ;
   pour lire les plans d'une décision sans ouvrir le navigateur, le JSON est dans la balise
   match-data du viewer. Les dossiers de docs/matches/ d'avant 20edbca9 sont des matchs des
   moteurs 5 à 7, les trois du 14 au soir du moteur 8 : ils ne se rejouent plus avec le dépôt du
   moteur 9 ; ab27b827, 7d631b71, cb618e32 et c3867408 sont du moteur 9 et se rejouent ;
   2e30f587 est du moteur 9 et sa relecture s'arrête au round 2, voir la tâche 6.

6. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse
   en 409, le client archive.

7. Le harnais d'écran : npm run e2e en 18 à 55 s, npm run e2e:playthrough en 15 à 70 s, npm run
   e2e:board3d en 6 à 7 min, le crochet window.__boomball, dont fx() tire un effet à la demande
   (développement seulement, stretch pour ralentir, kind 'banner' pour dire un bandeau),
   audio() dit où en est le son (running après un clic), probe(unitId) lit la rotation, la
   hauteur et le geste d'un pion en 3D : c'est par elle que le spec juge le pantin, parce que
   deux captures à une seconde d'écart sous le GL logiciel reviennent identiques alors que la
   scène a tourné.
   waitForPlayableTurn dans e2e/harness.ts répond à la popup par un clic à l'écran (data-place,
   place-close) et capture la première vue ; le smoke clique 1, puis Close, puis 2, le playthrough
   une place différente à chaque round, le spec 3D la place 2. Le siège humain du playthrough est
   piloté par chooseAction du dépôt depuis Node. Le smoke suppose une case de destination au
   tour 1 et au tour 3, un clic simple sur une case qui envoie la route la plus courte, et un
   pion cliquable au tour 2. Il échoue si le match e2e en cours atteint le round 10 pendant ses
   trois tours ; le smoke suivant ouvre alors un nouveau match de lui-même, vu le 15 au soir.
   Juste après un déploiement, la connexion de global-setup.ts peut expirer une fois :
   relancer. Si le npm run dev de Jérôme occupe 5173 sans le crochet, le smoke échoue sur « hook
   absent » : lancer un second Vite depuis boomball/client en arrière-plan,
   VITE_BOOMBALL_HOOK=1 VITE_BOOMBALL_PATIENT=1 npx vite --port 5174 --strictPort, le chauffer
   par deux curl, puis BASE_URL=http://localhost:5174 npm run e2e, et le tuer après (netstat
   -ano, taskkill). En 3D il n'y a ni data-cell ni data-unit : le spec clique à la souris là où
   cellToScreen projette, et les plaques portent data-plate. Le spec 3D tourne la caméra avec
   page.mouse.down({ button: 'right' }) puis page.mouse.wheel, et la déplace avec
   page.keyboard.down('ArrowRight'). Il admet deux avertissements console qui ne sont pas à nous
   (THREE.Clock déprécié par three 0.186 mais construit par fiber 9, et les messages de
   performance du GL logiciel de Chromium headless) ; toute autre ligne le fait échouer, y
   compris l'avertissement de Chrome sur un AudioContext créé hors geste : c'est pourquoi
   sound.ts n'ouvre le contexte que dans un gestionnaire de geste confirmé. Le spec 3D dure plus
   que les 120 s du chrono : le tour expire pendant les effets (bandeau « The clock ran out »),
   c'est attendu, et un resolve-action a répondu 404 « no such match » deux fois à ce moment-là
   (la première requête après trois minutes sans action), sans cause serveur trouvée ;
   useMatch.send traite ce 404 comme une réponse perdue et renvoie une fois après avoir lu la
   tête du match par REST. Pour lire ce que le harnais a vraiment envoyé, la
   trace Playwright de e2e/test-results/ se lit avec un script Python sur trace.zip (les
   entrées resource-snapshot du .network).

8. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev. Ne l'enlève pas. Le bash de l'outil casse sur les accents graves et les
   apostrophes dans un heredoc : pour une série de remplacements, un script Python écrit par
   l'outil d'écriture dans le scratchpad, puis lancé avec python -I. Jamais Html de drei : React
   19 signale son démontage synchrone en erreur console, les étiquettes passent par Labels.tsx et
   link.project, les mots par Floaters.tsx. La caméra ne passe pas par OrbitControls de drei :
   l'orbite est dans Camera.tsx et sa géométrie dans framing.ts, parce que le point visé est
   amorti et suit le jeu. Le pantin tourne le pion entier par link.gestures dans la boucle de
   Board3D, pas par Tokens.tsx.

9. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55), un humain Striker ou Breaker choisit sa place (écart 58) ;
   écart 62, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers ; écart 53,
   penaltyBox indexé par l'équipe qui DÉFEND la bouche ; 53 bis, applyPass le remet à null quand
   le Bulwark lance ; écart 56, turn.startedAt ; écart 57, un porteur ne tente jamais le Spark ;
   écart 59, la dérive du Spark tire un d8 par round loin des Trajectors ; écart 60, le retour à
   9 cases ; écart 61, le Shove prend le ballon ; écart 63, la passe gratuite qui suit,
   turn.freePass. Deux faits de règle constatés sans décision : l'équipe qui a l'humain joue
   juste après le Spark à chaque round ; la dérive du Spark traverse les unités et peut finir sous
   les pieds d'une unité.

10. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
    dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
    Interface.html en entier.

11. Les commandes. Depuis boomball/ : npm test (683), npm run typecheck, npm run sweep (environ
    16 minutes), npm run e2e, npm run e2e:playthrough, npm run e2e:board3d, node scripts/run-ts.mjs
    scripts/control-2h14.ts (dix-huit matchs de contrôle, pas un sweep). Depuis boomball/client/ :
    npm run dev sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck.
    Depuis la racine du workspace : python boomball/supabase/checks/rls-check.py et
    browser-path.py, et python .claude/scripts/check_drift.py. Le cwd de l'outil Bash se
    réinitialise entre deux appels : chemins absolus, ou npm --prefix.

12. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 63 de 00 partie
    C, et C11 à C24 en entier ; J4 de 08 §7 est tombé en C18, la caméra à quatre nombres lissés
    est refusée en C20, la barre de temps de la carte est retirée en C24. Dette connue :
    arenas.art et le champ art du spec nomment trois JPEG retirés ; substituteEntry et
    substitute_entry restent et ne sont plus lus ; le choix de direction d'un Breaker humain à la
    parade est automatique ; la route proposée au clic reste la ligne droite alors que l'IA prend
    la route sûre ; le fil garde 120 événements (FEED_LIMIT) ; le Spark peut rebondir plusieurs
    rounds dans une poche du terrain ; le test du point 5 dans fifthPass.test.ts fait varier
    idleSwing en place et le remet ; le bandeau « The clock ran out » dit « Your Giff took cover »
    même quand c'est la popup qui a expiré ; plusieurs humains d'un même rôle (coop) n'ont pas de
    popup, à relire en phase 7 ; la popup n'est pas rebornée quand la fenêtre rétrécit, la
    déplacer suffit ; le bouton « Call for the ball » reste actif pendant la popup ; un gardien
    peut marcher au-delà de sa laisse jusqu'à côté d'un receveur marqué pour une passe d'une
    case, qu'aucune allonge n'intercepte (écart 48) ; le Shove d'un Bulwark n'est borné que par
    l'adjacence, pas par sa laisse ; le fil ne dit pas qu'une passe était gratuite ; le temps par
    match d'auto-jeu se mesure entre 1,4 et 2,7 s selon la charge de la machine ; en 3D,
    l'orientation du modèle, le noir sous la lèvre avant, l'orbite remise à la vue fixe au
    retour du 2D, la borne de suivi calculée pour l'azimut zéro, la roulette en vue large qui ne
    suit pas le jeu, le pan sous Ctrl qui s'interrompt au-dessus de la minicarte et des boutons,
    la largeur du terrain garantie seulement à l'inclinaison de départ, la répétition de la foule
    visible en vue large, l'effacement des gradins jugé sur la hauteur de la caméra et pas sur la
    ligne de vue, la retenue de la caméra en boîte et pas en tube, les captures des effets courts
    figées sous le GL logiciel, le ballon qui ne disparaît pas dans la bouche, pas d'étincelles
    en 2D, le pantin sans bras ni jambes (modèle sans squelette), le son synthétique ; la
    relecture de 2e30f587 qui s'arrête au round 2 ; les quatre fichiers du vault modifiés hors de
    nos sessions, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
