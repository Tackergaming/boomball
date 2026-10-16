# Reprise du chat suivant, Boomball

> Écrit par le fil principal (Fable 5.1) le 2026-10-16, à la fin du chat qui a pris le retour de
> Jérôme après sa partie sur 2H.25 avec le son (« il manque la plupart des sons sur les swing
> raté et réussi et les attaques d'opp »), l'a confronté au code, précisé en répliques
> d'annonceur, écrit `00` C27 et codé 2H.26, l'annonceur systématique, plus le bug du but qui ne
> coupait pas la réplique en cours. Sa partie sur 2H.26 : « tout est parfait », porte franchie,
> commitée (`fc1fdcc`). Le même soir il a demandé le point sur ce qu'il reste à faire, validé
> l'ordre (ligue au choix, annuler et quitter un match, phase 6, client redéployé, puis la coop
> et la phase 8), et la première, **2H.27 la ligue au choix** (`00` C28), est codée, PAS
> commitée, fonctions à redéployer sur son feu vert. À coller tel quel comme premier message du
> chat suivant, dans le workspace `jarvis-jdr`.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.27
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
synthétisé, le pantin en attendant un modèle riggé. C25 le lot du 2026-10-16 après ma partie
sur 2H.22 (« tout me va », la foule baissée à 0,11) : la note « Default initiative · you go
last » quand la popup de place expire, « Call for the ball » grisé pendant la popup, la passe
gratuite dite dans le fil et dans match.md, la route sûre proposée au clic, la popup rebornée,
et les fonctionnalités à venir. C26 le lot du 2026-10-16 après mes matchs sur 2H.23 et le Giff
riggé (2H.24, close, « les animations sont parfaites ») : le Spark manqué (CATCH puis miss),
L'ÉCART 64 (le rebond d'un tir manqué part de la bouche, jamais sous un joueur, MOTEUR 10), deux
foules selon la possession, deux annonceurs (54 clips de mes deux packs). C27 le lot du
2026-10-16 au soir après ma partie sur 2H.25 : l'annonceur systématique (« une réplique à chaque
coup, mais qu'une », toutes les chances à 1, le délai de 2,5 s fait seul le tri) et le but qui
coupe la réplique en cours pour de vrai. C28 la ligue au choix (2H.27) : dans le lobby, on joue
à son palier ou en dessous, jamais au-dessus ; une victoire ne compte que jouée au palier de la
batterie (ma réponse : « non ») ; l'écran doit montrer qu'on choisit. Chaque passe finit par
« comment ... est codée », poids par poids, À LIRE avant de toucher à ai/. Ne rediscute rien de
C12 à C28.
07 §10 porte le journal, dont l'entrée 2H.15, qui dit fichier par fichier ce que la 2.5D
contient, les entrées 2H.16 à 2H.20, la caméra et les gradins, 2H.21 et 2H.22, le jeu vivant.
09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep de 2H.8 à 2H.22.
04 est l'histoire, à lire seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.16 à 2H.27 sont CODÉES (2H.26 et 2H.27 le 2026-10-16 au soir), ENGINE_VERSION 10, **MOTEUR 10 EN
LIGNE depuis le 2026-10-16 sur mon feu vert, fonctions redéployées le soir pour 2H.27 :
resolve-action v22, create-match v20** (npm run
deploy:function après set -a && . ../.env && set +a, depuis boomball/) ; les matchs du moteur 9
sont archivés par le client. Le client en ligne n'est PAS redéployé depuis 2H.14 (mon feu vert, pas encore). 708 tests
verts sur 35 fichiers, typecheck racine, scripts, e2e et client verts, les deux fonctions bundlent (npm run build:function). Smoke 2D vert en 39,7 s sur 2H.27 (la section League affirmée, capture 02-lobby.png lue ; E2E Battery est Star, l'état grisé des paliers ne s'y voit pas) ; sur 2H.25, playthrough vert en 1,6 min jusqu'au sifflet (un premier run rouge juste après le déploiement, relancé, comme déjà vu) et e2e:board3d vert en 6,4 min (CATCH capturé, le côté de la foule et le clip du coup d'envoi lus par le crochet), rien n'y a bougé depuis. SUR UN VITE 5174 QUI VIENT DE DÉMARRER, LE
CHAUFFER PAR DEUX curl (la racine et /src/main.tsx) AVANT LE RUN. Le smoke échoue encore quand le
match e2e atteint le round 10 pendant ses trois tours, le suivant ouvre un nouveau match : vu le
16 à midi. Mes parties consignées : ab27b827, 7d631b71, cb618e32, c3867408 sont du moteur 9 et ne se
rejouent plus avec le dépôt au moteur 10 (le rebond diffère). 2e30f587 n'est
PAS à analyser. Tout jusqu'à 2H.27 est commité (voir git log) : vérifier git status en premier
et me le dire. Les fonctions de 2H.27 sont en ligne (v22, v20, moteur 10 inchangé) : le choix
de ligue a effet en ligne, le client en ligne ne le montre pas encore (il est à 2H.14).
Les fichiers de 2H.27 : engine/stats.ts (isTier, tierAllowed), supabase/functions/create-match
et resolve-action (index.ts), client/src/lib/supabase.ts, screens/Lobby.tsx, screens/TeamHub.tsx,
server/lobby.test.ts, e2e/smoke.spec.ts, docs 00 (C28), 07 §10 (2H.27), 08 §5 (ligne 2H.27), et
ce fichier. Les deux WAV d'annonceur sont dans boomball/assets/source/sounds/ (hors git, 39 Mo).

Ce que 2H.27 contient, en quatre phrases, détail en 00 C28 « comment 2H.27 est codée ». Le lobby
a une section « League · your battery is Star » à trois boutons (data-league, data-selected,
data-locked), le palier de la batterie sélectionné par défaut, les paliers en dessous jouables,
ceux au-dessus grisés, disabled et suffixés « · 3 wins » ou « · 6 wins », une phrase dessous qui
dit où les victoires comptent, et le header dit « Star battery · playing Rookie » en dessous.
createMatch(teamId, seats, tier) envoie le choix ; create-match lit body.tier (absent = le Tier
de la batterie, invalide ou au-dessus refusé par isTier et tierAllowed de engine/stats.ts) et le
match porte le Tier joué. resolve-action lit matches.tier et recordResult lit teams.tier au
sifflet final : record_team_win seulement si les deux sont égaux. Le hub dit « Once a level is
reached, the lobby lets you play it again. Only wins at your own level climb the ladder ».

Ce que 2H.26 contient, en trois phrases, détail en 00 C27 « comment 2H.26 est codée ». Toutes
les chances de l'annonceur sont à 1 (ANNOUNCER_CHANCE est vide, le mécanisme reste) : un coup qui
touche, un raté, une attaque d'opportunité, un Shove, un Cracker sont commentés à chaque fois que
la voix est libre, et le délai de 2,5 s (ou la durée du clip) fait seul le tri, donc trois
attaques d'opportunité dans la même seconde donnent une réplique, la première arrivée, jamais
deux voix. Le but et la fin de match coupent la réplique en cours même sans ligne à dire : say
passe par admitCue et hush AVANT de filtrer les lignes décodées, alors qu'avant il sortait sur
« liste vide » et une réplique parlait par-dessus « and it's a goal ». Rien à l'écran, rien dans
le moteur, le crochet lastSaid() lit l'annonceur.

Ce que 2H.25 contient, en sept phrases, détail en 00 C26 « comment 2H.25 est codée ». Le mot
CATCH monte au-dessus du Trajector à chaque tentative sur le Spark, puis « miss » et son son s'il
rate. Écart 64 : un tir manqué rebondit depuis la case de bouche visée, d4 cases dans une
direction au d8, arrêté à la dernière case libre, tournant depuis la face si bloqué, jamais sous
un joueur (reboundLanding, reboundCell, nearestHatch dans rules/payload.ts, applyShoot),
ENGINE_VERSION 10. La foule bascule en fondu croisé de 2 s selon la possession : crowd-attack.mp3
(les vagues de crowd1) quand mon équipe a le ballon, crowd.mp3 sinon, rien quand il est au sol
(Sounds.setCrowd, Match.tsx lit l'équipe du porteur). L'annonceur : announcer.ts porte vingt
moments et leurs clips, une chance par moment (hit 0,3, miss 0,25, shove 0,25, blast 0,5 en
2H.25, TOUTES À 1 DEPUIS 2H.26), un tirage sans répéter la dernière, un délai de 2,5 s, les buts
et la fin coupent ;
Sounds.say(cue), lastSaid ; Match.tsx appelle say par repère 350 ms après le son, le round au
sifflet, la fin de match en win, loss ou fullTime, « Select your champion » au premier tour,
« Come on, do something! » à trente secondes. La répartition des clips est relue par moi le 16 : plus de
commentaire de but (mon « and it's a goal » suffit), plus de Dash, plus d'appel des rounds 2 et
3, « Fight » seul au coup d'envoi, et huit répliques retirées ; ce qui reste est dans
announcer.ts. Le crochet a crowd(), lastSaid() et say(cue). Les hooks de
Match.tsx restent au-dessus du retour anticipé sur state : un effet placé après a planté l'écran
au harnais.

Ce que 2H.23 contient, en six phrases, détail en 00 C25 « comment 2H.23 est codée ». La foule
joue à 0,11 (AMBIENCE dans sound.ts). useMatch.expired vaut 'turn', 'place' ou null, jugé sur le
plateau d'avant l'envoi, et Match.tsx rend un seul bloc clock-notice : « Default initiative · you
go last » quand la popup de place a expiré (le serveur plaçait déjà en dernier depuis l'écart 58,
l'écran disait « took cover » à tort), fx({ kind: 'notice', notice: 'place' }) le pose à la
demande en développement. « Call for the ball » est disabled tant que placing n'est pas nul. Le
fil déduit la passe gratuite (shoved à tookPayload du même tour) et dit « X throws the free pass
off his Shove to Y » ; dump-match suffixe « (free pass, off the Shove) » ; les événements et le
moteur n'ont pas bougé. La route proposée au survol, au clic et par clickCell du crochet est la
route sûre de l'IA (routeTo = safePathTo ?? pathTo) dans les deux plateaux. La popup de place se
reborne au resize (clampInto, pure et testée) et le briefing dit qu'on joue en dernier si elle
expire. Laissé : la parade du Breaker humain reste automatique (moteur et redéploiement),
FEED_LIMIT 120.

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

NOTÉ LE 2026-10-16, À GARDER DANS CHAQUE RÉÉCRITURE DE CE FICHIER.
Ma partie 2e30f587 n'est pas à analyser : je l'ai ouverte pour une capture d'écran puis laissée
tourner sans jouer, sa relecture qui s'arrête au round 2 n'est pas un bug à chercher. Le client en
ligne ne se redéploie pas encore : il reste pas mal de changements d'interface en partie et hors
partie. Fonctionnalités à implémenter dans des chats à venir, à cadrer avec moi avant toute
ligne de code : choisir son niveau de ligue quand les niveaux d'en dessous sont déjà débloqués ;
le mode multijoueur ; annuler un match en cours et en sortir ; d'autres à voir. Le modèle de Giff
riggé (squelette et clips de course et de batte) se fait dans un autre chat, sous Blender : ne
pas toucher au pantin ni à Tokens.tsx ici tant qu'il n'a pas livré son GLB.

L'ORDRE DE LA SUITE, VALIDÉ PAR MOI LE 2026-10-16 AU SOIR : (1) mes trois fonctionnalités sans
le multijoueur : la ligue au choix (2H.27, codée), puis annuler un match en cours et en sortir
(à cadrer avec moi, touche la base donc une fonction ou une politique, feu vert à moi) ; (2) la
phase 6 de 07 : la 3D par défaut, la 2D sous l'interrupteur, le budget d'images par seconde
mesuré au harnais, le briefing ; (3) le client redéployé sur mon feu vert, par l'API Vercel,
jamais le dépôt GitHub ; (4) la coop, phase 7 de 07, A10 d'abord (persist non atomique dans
resolve-action), migration 0008 des invitations, lobby à plusieurs sièges ; (5) la phase 8, le
déploiement pour un ami (deploy-vercel.mjs n'existe pas encore), /security-review par moi.

LA TÂCHE : MA PARTIE SUR 2H.27, PUIS ANNULER ET QUITTER UN MATCH.
1. Vérifier git status et git diff --cached --stat avant toute chose ; 2H.27 est commitée par
   mon /commit du 16 au soir ; si quelque chose traîne, me le dire en premier.
2. Le moteur 10 est en ligne, les fonctions de 2H.27 aussi (v22, v20) ; le client en ligne reste
   à 2H.14 tant que je ne dis pas de le déployer (jamais le dépôt GitHub sur Vercel).
3. Ma partie en dessous de mon palier : le compteur de victoires ne doit
   pas bouger, et je dis si le lobby est clair. Puis la deuxième fonctionnalité, annuler et
   quitter un match : me poser mes questions en chat, une ou deux par message (qui peut annuler,
   que devient le match en base, compte-t-il comme une défaite, retour au hub), reformuler, 00
   C29 et 08 §5 (ligne 2H.28) avant la première ligne de code.
4. Une capture par changement d'écran, le smoke 2D relancé si Match.tsx, Feed.tsx ou Board.tsx
   bougent ; ni le son ni la foule ne se capturent : le crochet audio(), crowd(), lastSaid().
5. Un sweep seulement si je le demande, un seul par lot, contre 09 §12, seize minutes.
6. Les fonctionnalités à venir (ligue au choix, multijoueur, annuler et quitter un match) restent
   à cadrer avec moi, une par une.

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
    C, et C11 à C27 en entier ; J4 de 08 §7 est tombé en C18, la caméra à quatre nombres lissés
    est refusée en C20, la barre de temps de la carte est retirée en C24, l'annonceur parle à
    chaque coup et une seule voix à la fois en C27. Dette connue :
    arenas.art et le champ art du spec nomment trois JPEG retirés ; substituteEntry et
    substitute_entry restent et ne sont plus lus ; le choix de direction d'un Breaker humain à la
    parade est automatique (gardé en C25 : le rendre à l'humain, c'est le moteur et un
    redéploiement) ; le fondu croisé des foules sans compensation de puissance ; le délai de
    l'annonceur compté depuis le début du clip ; un seul annonceur à la fois (voulu, C27) ; la
    coupure par un but ne libère pas le plancher du délai (l'annonceur se tait jusqu'à la fin de
    la fenêtre ouverte, pendant le son du but) ; le fil garde 120 événements (FEED_LIMIT) ; le Spark peut rebondir plusieurs
    rounds dans une poche du terrain ; le test du point 5 dans fifthPass.test.ts fait varier
    idleSwing en place et le remet ; plusieurs humains d'un même rôle (coop) n'ont pas de
    popup, à relire en phase 7 ; un gardien
    peut marcher au-delà de sa laisse jusqu'à côté d'un receveur marqué pour une passe d'une
    case, qu'aucune allonge n'intercepte (écart 48) ; le Shove d'un Bulwark n'est borné que par
    l'adjacence, pas par sa laisse ; le temps par
    match d'auto-jeu se mesure entre 1,4 et 2,7 s selon la charge de la machine ; en 3D,
    l'orientation du modèle, le noir sous la lèvre avant, l'orbite remise à la vue fixe au
    retour du 2D, la borne de suivi calculée pour l'azimut zéro, la roulette en vue large qui ne
    suit pas le jeu, le pan sous Ctrl qui s'interrompt au-dessus de la minicarte et des boutons,
    la largeur du terrain garantie seulement à l'inclinaison de départ, la répétition de la foule
    visible en vue large, l'effacement des gradins jugé sur la hauteur de la caméra et pas sur la
    ligne de vue, la retenue de la caméra en boîte et pas en tube, les captures des effets courts
    figées sous le GL logiciel, le ballon qui ne disparaît pas dans la bouche, pas d'étincelles
    en 2D, le pantin sans bras ni jambes (modèle sans squelette), le son synthétique ; la
    relecture de 2e30f587 qui s'arrête au round 2 (pas à analyser, dit le 16) ; les quatre fichiers du vault modifiés hors de
    nos sessions, à moi de décider.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
