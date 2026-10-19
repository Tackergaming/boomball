# CONTEXT.md, Boomball

> État du jeu vidéo Boomball. Ce fichier se remplace, il ne s'allonge pas : ce qui s'est passé et
> quand vit dans `HISTORY.md`. Ses chiffres sont un résumé daté : `docs/08`, `docs/07` puis
> `docs/04` ont raison, et `python .claude/scripts/check_drift.py` le dit en une seconde.
> Jusqu'au 2026-10-18, ce texte était le volet 2 du CONTEXT.md du workspace `jarvis-jdr`.

---

## Boomball, le jeu vidéo (en construction, actif)

Application web du sport giff de ma campagne. Coopératif contre l'IA, jamais de PvP, 1 à 3 humains
dans la même équipe, ordinateur uniquement. Le solo est le mode dimensionnant : 13 unités IA pour
un humain.

**Tout vit dans ce workspace, extrait de `jarvis-jdr` le 2026-10-18. Point d'entrée depuis le 2026-10-10 :
`docs/08-plan-terrain-horizontal.md`**, le plan de la décision D11 par sous-phases.
`07-audit-et-plan-3d.md` est l'audit du 2026-10-09, avec les décisions D1 à D11 et le journal des
phases ; `04-etat-des-lieux.md` est l'historique de ce qui a été construit et pourquoi.

**État au 2026-10-19.** 0016 appliquée (le 18, par moi). `resolve-action` v30 et `create-match`
v27 en ligne : le 404 « no such match » relu une fois avant de répondre, sinon un 503 qui garde
l'erreur. Une comparaison 2.5D contre 3D : je garde la 2.5D. **L'écran de match refait, 2H.38, est
cadré en dix points et maquetté (`00` C37, `design/2H38-ecran-de-match/`), pas codé** : c'est la
tâche du chat suivant, avec n8. La caméra suit en 2H.39, un lot à part.

**État au 2026-10-18 au matin.** **2H.37, les corrections de la revue de sécurité, sont codées,
appliquées et en ligne** (`00` C36), tranchées par moi en quatre réponses : M1 et m1 par les
migrations 0013 et 0014 (un déclencheur fige `team_id`, l'insertion est « sa propre ligne sur une
équipe dont on est membre », `rls-check.py` passe de 24 à 38 contrôles), M2 par un garde d'entrée
du moteur et de `resolve-action` (v28), M3 et m4 par la migration 0015 (les trois canaux Realtime
privés, la base diffuse elle-même, `private_only` sur le projet, fonctions v29 et v26), m2, m3,
m5 acceptés, m6 écrite en 0016 à appliquer, n8 au prochain lot client. Le client de 2H.36 puis
celui de 2H.37 mis en ligne sur mon feu vert. 777 tests. Reste ma partie à deux sur les canaux
privés, 0016, puis un ami qui joue sans moi. Ce qui suit est dans
`docs/05-reprise-chat-suivant.md`.

**État au 2026-10-17 au soir.** La coop (2H.31 à 2H.33, `00` C32, moteur 11), l'interface
d'équipe (2H.34, `00` C33 : hub vivant, lobby « The bench », Battery devenu Team, migration 0012)
et la limite de présence Realtime (2H.35, `00` C34) sont en ligne sur `https://boomball.vercel.app`
et validées par mes deux parties à deux avec revanche. **La phase 8, le déploiement pour un ami,
est cadrée en `00` C35** (mot de passe oublié manuel par moi, menu « Account », `site_url` sur
l'URL Vercel, inscriptions ouvertes, revue de sécurité d'abord, export JSON, Firefox et sans
WebGL) **et son premier lot, 2H.36, est codé** : le menu Account, la ligne « Ask Jérôme », le
repli en 2D sans WebGL (page noire trouvée et corrigée), `npm run export:db`, `e2e:account`. La
revue de sécurité du jeu entier est dans `docs/10-revue-securite-2026-10-17.md` : aucun
bloquant, trois majeurs (M1 l'insertion libre dans `team_members`, M2 les coordonnées non entières
acceptées par le moteur, M3 les canaux Realtime publics) que je tranche pour 2H.37. 771 tests.

État au 2026-10-16 au soir, après cinq séances de test en local de Jérôme en septembre, un chat d'audit, la
phase 1 construite, ma première partie entière, **les sous-phases 2H.1 à 2H.14 construites et en
ligne, 2H.15 codée dans la nuit du 14, 2H.16 à 2H.22 le 15**, et mes parties aux portes successives, non franchies, dont les retours ont fait
2H.5, 2H.6, 2H.7, 2H.8, 2H.9, 2H.10 puis 2H.11 ; 2H.12 vient de deux règles que j'ai dictées ;
**2H.13 vient de mes vingt et un matchs sur le moteur 7, du 12 au 14 octobre, cinq consignés**. **Ma partie du 2026-10-12 sur le moteur 6 (star,
30 à 50, match `a17c22a5`) est consignée dans `docs/matches/` avec zéro écart, et lue
round par round et joueur par joueur sur un visualiseur nouveau, `viewer.html`, que
`dump-match.ts` produit à côté de `match.md`** : terrain dessiné, une flèche par tour, huit plans
classés par décision. Cette lecture a donné la cinquième passe de l'IA, `00` C13, vingt-neuf
points dictés par moi et validés point par point avant le code, codée et en ligne le même jour.
Puis `00` C14, **2H.12, codée et en ligne le 2026-10-12, moteur 7** : je choisis ma place dans mon
rôle par une popup, et le Breaker ramasse d'abord. Puis `00` C15, **2H.13, codée et en ligne le
2026-10-14, moteur 8**, sur mes retours lus contre les événements de mes matchs : le chrono qui
expirait mon Trajector et mon Bulwark au premier clic après deux minutes, le Spark qui fuit les
Trajectors et revient à 9 cases des deux, le Shove qui met le ballon dans les mains du bousculeur,
la relance Trajector, Strikers, Bulwark, Breakers, la popup hors du terrain et déplaçable, le
marqueur de Réaction, et la septième passe de l'IA (le Trajector laisse le coup d'envoi, le porteur
au plus près de la bouche, le tireur laisse son rebond, le gardien jamais dans une allonge, l'appel
qui lève la chaîne). Trois de mes retours étaient des artefacts d'écran ou de dump, pas des règles.
Puis `00` C16, **2H.14, codée et en ligne le 2026-10-14 au soir, moteur 9**, sur mes
trois matchs sur le moteur 8 : l'écart 63, un Shove réussi sur un porteur laisse au bousculeur
une passe sans Action pour le reste du tour, à tout coéquipier à portée et en vue qu'il ait joué
ou non, jamais un tir ; le Trajector lit le ballon du coup d'envoi comme déjà porté et finit en
relais devant lui au lieu de rentrer chez lui ; la popup de place naît en haut à gauche ; les
cases sous allonge adverse portent le carré orange à chaque tour ; plus de pointillés de tiers.
Puis `00` C17, **2H.15, codée le 2026-10-14 dans la nuit**, sur ma partie sur le moteur 9
(`ab27b827`, Striker, 50 à 0) : mon seul retour, les cases orange, retirées ; et, à ma demande,
**la 2.5D construite en un seul bloc** derrière le bouton « See it in 3D » de l'écran de match,
plus de phases 3, 4, 5 ni de pions version 1 ou 2 : React 19, three, fiber, drei, la scène (sol
riveté, tube couché, caisses, piliers, deux bouches qui flambent au but, mes trois textures CC0
en WebP), la caméra trois quarts fixe à deux zooms, **mon glb de Giff** comme corps des
quatorze pions, le jeu (tuiles, routes, ligne de vue, tir), l'animation partagée avec le 2D, la
minicarte, un harnais `npm run e2e:board3d` qui clique au sol par la caméra. Le moteur en ligne
n'a pas bougé (9), le client en ligne non plus : la 2.5D se joue en local. J'ai lancé le jeu en 3D
le soir même, il n'a pas planté. Puis `00` C18, **2H.16, codée le 2026-10-15**, sur ma première
partie en 3D : deux retours de caméra, tous deux faits. La caméra tourne au bouton droit de la
souris et zoome à la roulette (J4 de `08` §7 tombe), le cadrage rapproché prend les quinze cases
de large, le bouton « Close in / Whole silo » reste comme deux cadrages de départ et remet
l'orbite ; la géométrie du cadrage est pure et testée dans `framing.ts`. Le même jour j'ai
tranché C17 : **la passe gratuite au gardien reste autorisée**, rien ne change dans l'IA. Le
moteur en ligne n'a pas bougé (9), le client en ligne non plus. Puis, le même jour, quatre
parties et quatre lots, `00` C19 à C22, **2H.17 à 2H.20** : la caméra se décroche du jeu aux
flèches ou sous Ctrl plus la souris et revient à mon tour ou par « Follow the play » ; elle
tremblait, j'ai refusé une caméra à quatre nombres lissés (« mécanique, s'éloigne de la notion
de libre »), la main est restée brute, le pivot exact, la distance indépendante de
l'inclinaison, le suivi calme, 45 à 50 images par seconde chez moi ; le vide autour du terrain
me gênait, j'ai fait trois images Nano Banana Pro (deux tribunes de Giff, une rambarde) sur les
prompts du fil principal et le silo est fermé par des gradins qui s'effacent quand la caméra
passe derrière ; une erreur réseau au round 8 lue en base a donné une nouvelle tentative côté
client ; enfin la caméra est retenue dans le silo. Mon Breaker qui n'a pas tiré au round 8,
c'est ma règle de l'écart 63, la passe gratuite n'est jamais un tir. **J'ai clos ce lot (« une
bonne version pour l'instant ») et ouvert le suivant, 2H.21, le jeu vivant**, `00` C23, dix
lignes validées en chat et codées le soir même : les repères lus des événements, les effets 3D
(étincelles, anneau, explosion, braises, faisceau et flash du Spark), les mots qui montent dans
les deux plateaux, les bandeaux, la carte de beat refaite, le fil marqué. Puis `00` C24,
**2H.22, codée le même soir sur mes sept retours** : les mots au-dessus des têtes deux fois
plus gros et tenus deux fois plus longtemps, toutes les actions en mot au-dessus de l'acteur
(SWING, ATCK OP, SHOVE, SHOOT, PASS, DISENGAGE, DASH, BAT, DODGE), le bandeau de but à part
(« Goal · Your Team »), la barre de temps de la carte retirée, le son synthétisé par Web Audio
plus mes trois enregistrements (swing, goal, explosion), et le pantin sur le maillage entier
parce que mon GLB n'a ni squelette ni clip : les vrais clips attendent un modèle riggé (Mixamo
ou Blender). Ma partie sur 2H.22 n'a rien donné à entendre : le son était tué par la répétition
d'effet de React StrictMode en développement, corrigé le soir même, et le pantin tournait trop
peu, prouvé par une sonde du crochet et amplifié. Mes deux parties sur 2H.21 sont consignées
(`c3867408` se rejoue, `2e30f587` s'arrête au round 2 à la relecture, analyse à ma demande).
Les sources de mes assets (images, GLB, sons, archives de textures) vivent dans
`assets/source/`, hors git.
**Le 2026-10-16, sept sous-phases dans la journée, toutes closes par mes parties.** `00` C25,
**2H.23** (trois défauts d'écran, la foule à 0,11) ; **2H.24**, le Giff riggé sous Blender dans
un chat parallèle (sept clips, « les animations sont parfaites ») ; `00` C26, **2H.25, moteur
10 en ligne** : l'écart 64 (le rebond d'un tir manqué part de la bouche, jamais sous un joueur),
CATCH et le miss du Spark, deux foules selon la possession, deux annonceurs en 54 clips de mes
packs ; `00` C27, **2H.26** : l'annonceur parle à chaque coup, une seule voix (« tout est
parfait ») ; puis le point sur la suite, dont j'ai validé l'ordre (ligue au choix, annuler un
match, phase 6, client redéployé, coop, phase 8) ; `00` C28, **2H.27** : je choisis ma ligue
dans le lobby, à mon palier ou en dessous, une victoire ne compte qu'à mon palier (« ça a
marché ») ; `00` C29, **2H.28** : j'abandonne un match en cours sans résultat, migration 0008
appliquée par moi (« parfait ça a fonctionné ») ; `00` C30, **2H.29, la phase 6** : la 3D par
défaut pour tout le monde, le porteur du ballon marqué d'un faisceau doré, l'effectif fixe de ma
batterie (sept noms tirés au premier match, jamais renommés, l'adversaire les évite), migration
0009 appliquée par moi, fonctions redéployées quatre fois dans la journée sur mon feu vert
(`resolve-action` v24, `create-match` v22). Mes deux matchs sur 2H.29 ont franchi sa porte
(« les noms des joueurs sont bons et restent », « le halo du porteur est ok ») et donné `00`
C31, **2H.30, cinq retours de partie**, codée le même jour sans rien dans le moteur : la
réplique de KO à la place de celle du coup qui tue, **le Dash tenu côté client** (annulable tant
qu'aucune marche n'a dépassé mes pieds de base, envoyé avec celle qui en a besoin), la foule dès
l'ouverture de l'écran, « Select your champion » retiré, et la latence du round 2 lue en base :
ma réponse la situe dans la requête qui joue les deux Strikers de l'IA après mon choix de la
place 3. Ma partie sur 2H.30 : « aucun, tout va bien ». **Le soir du 16, la latence est mesurée**
(`00` C31 point 1, `scripts/measure-latency.ts`) : toute requête coûte 2,1 s quel que soit le
travail, parce que la fonction tourne à `us-east-1` pour une base à Paris, ma machine sortant
sur Internet par Newark ; l'IA et le démarrage à froid sont hors de cause ; épinglée à Paris
par `x-region`, 0,84 s. **J'ai laissé tomber** (« ce n'est pas grave »). **Puis le client est en
ligne pour la première fois, `https://boomball.vercel.app`**, par `scripts/deploy-vercel.mjs`
et l'API Vercel, projet `boomball` sans lien Git : le compte ne portait aucun projet Boomball,
« le client en ligne est à 2H.14 » était faux. J'ai joué en ligne : « tout s'est bien passé.
c'est parfait. » Mon mot de passe perdu a été remplacé par l'API admin : le jeu n'a ni « mot de
passe oublié » ni changement de mot de passe, deux trous pour la phase 8. La suite est la coop,
phase 7, A10 d'abord.
**Le 2026-10-17, la coop (phase 7) est cadrée en huit réponses de moi et codée en trois
sous-phases**, `00` C32 : 2H.31 (A10, la fonction SQL `append_match_step` en une transaction,
migration 0010 appliquée par moi), 2H.32 (plusieurs batteries par joueur, le code d'invitation,
le lobby partagé par présence Realtime où chacun choisit son rôle et où je démarre seul,
migration 0011 appliquée par moi, `create-match` au propriétaire seul), 2H.33 (l'écart 65 : à
deux humains du même rôle, le premier au d20 reçoit la popup et l'autre se place derrière ; un
coéquipier remet son Giff à la maison ; les tours des autres rejoués animés ; tous les sièges
frappent à la porte cinq secondes après l'échéance ; un membre non assis regarde en spectateur ;
`ENGINE_VERSION` 11). **Le moteur 11 est en ligne** (`resolve-action` v27, `create-match` v25)
et **le client en ligne est redéployé avec la coop**, le même jour, sur mon feu vert. `npm run
e2e:coop` joue deux contextes dans le même lobby et le même match avec un second compte e2e. La
porte de la phase 7 est ma partie à deux ; la suite est la phase 8, à commencer par les deux
trous du mot de passe.
La lecture round par round n'est pas à refaire à chaque partie : sur ma demande, ou sur proposition du fil principal.
**Les chiffres ci-dessous sont un résumé daté : en cas d'écart, c'est `08`, `07` puis
`docs/04-etat-des-lieux.md` qui font autorité.**

- **Tout est construit et mesuré. 759 tests au vert au 2026-10-17.** `npm test`, `npm run typecheck` et
  `npm run e2e` depuis la racine, `npm run dev` et `npm run build` depuis `client/`,
  plus `npm run sweep` pour le rapport d'équilibrage, environ seize minutes depuis la septième
  passe (1,7 s par match), qui imprime les constantes sous lesquelles il a été mesuré. Le harnais Playwright joue le
  terrain horizontal en ligne, sur le moteur 9 déployé, répond à la popup de place par un clic, avec un tour en mode slow qui vérifie que
  les pions glissent, que le plateau ne montre pas le futur avant le rejeu, et un clic sur un pion
  au tour 2 dont le tray porte deux boutons ; `npm run e2e:board3d` joue la 2.5D en 6 à 7 minutes,
  tire chaque effet par le crochet, lit le pantin par `probe()` et l'audio par `audio()`. **`scripts/dump-match.ts` consigne un match en ligne
  et le rejoue en local** depuis `matches.kickoff` avec le plan que l'IA classe en tête à chaque
  décision : c'est lui qui dit pourquoi l'IA a joué un coup, jamais une capture
- **Le moteur 2 joue le terrain horizontal de la décision D11 depuis la sous-phase 2H.1, faite le
  2026-10-10** : vue de dessus, plus de chute, de vol, de grappin ni d'ancrage, plus de coût de
  zone, des obstacles qui bloquent et coupent la ligne de vue, bousculade qui pousse d'une case,
  attaque d'opportunité toujours prise, évacuation sur place, Crackers et Spark qui contournent ou
  rebondissent. Le Kill-Silo reste un silo à missile, couché. Partie C du règlement appliquée,
  layout de `08` §3, règles `sight` et `bounce` testées. Le repli de la règle de rebond, quand
  l'écart 36b coincerait un mobile, est confirmé par moi et écrit sous 36b. **Depuis 2H.7, le
  2026-10-10, le moteur 4 est le jeu en ligne** : migrations `0005`, `0006` et `0007` appliquées
  par moi (ligne `arenas` horizontale, colonne `engine_version`, lignes de coup d'envoi, colonne
  `kickoff` pour rejouer l'ouverture), `resolve-action` v12 et `create-match` v10 redéployées avec
  mon feu vert, chaque match porte la version du moteur qui l'a écrit et un match d'un moteur
  antérieur est archivé, pas perdu (A11) : mes matchs des moteurs 2 et 3 le sont. Une action en
  retard n'est plus jouée au tour suivant (A28). Le plateau 2D
  montre le terrain entier vu de dessus, mon but à gauche, les obstacles depuis le layout, sans
  image, et **il est animé** : les pions glissent, le ballon vole, un temps par action
- **Les règles de 2H.5 et 2H.6, écarts 38 révisé et 42 à 48 de `00` partie C, toutes dans le
  code et en ligne** : les six joueurs de champ partent à huit cases du ballon ; un ballon perdu
  roule sur une case adjacente tirée au d8 ; les Crackers ne dérivent pas au round 1, naissent et
  reviennent chacun à côté de son pilier de bord de la ligne médiane, roulent vers le ballon et
  non vers le joueur le plus proche, s'arrêtent sur un ballon au sol sans rien faire, à 8 cases
  (40 bis) ; **le Breaker pare en Réaction un Cracker qui lui arrive dessus**, attaque contre AC
  10, et le renvoie de 12 cases dans l'arc d'où il venait, direction automatique pour l'instant
  (écart 47, moteur 3) ; la première case du vol d'une passe ne s'intercepte pas ; le remplaçant
  revient sur la case libre la plus proche du centre (37 bis). Le défaut qui montrait les positions
  finales avant le rejeu est corrigé et le smoke le garde
- **Les règles de 2H.7, écarts 49 à 52 de `00` C9, dans le code et en ligne depuis le 2026-10-10,
  moteur 4** : le Spark s'échappe d'une case au d8 à la fin de tout tour fini sur sa case sans
  l'avoir attrapé (49) ; attrapé, il revient le round suivant, toujours 20 points, autant de fois
  qu'il est pris (50) ; **l'initiative devient un ordre sans comptes** (51) : le Spark, l'équipe
  qui a un humain, les Crackers juste après l'équipe qui a la balle, l'autre équipe, et dans une
  équipe Trajector, Strikers, Breakers, Bulwark, l'ordre des IA d'un rôle fixé par le moteur au
  début du round selon la situation ; le Bulwark se plante, bousculade contre lui à désavantage et
  moins 3 (52). **L'IA des quatre rôles est dictée par moi en chat, mot pour mot dans `00` C9** :
  la chaîne qui remonte la balle le long de l'échelle sans jamais passer à qui a déjà joué, presser
  par rôle, le Breaker garde du corps du porteur et posté sur la ligne des Crackers, le Bulwark en
  laisse à quatre cases de sa bouche, Dodge en dernier recours. À l'écran : l'ouverture rejouée
  depuis le coup d'envoi, agir en cliquant un pion, tracer sa route, la bande d'initiative en rangs.
  Mis en ligne le 2026-10-10 après un défaut de relecture de l'ouverture corrigé dans `useMatch.ts`
  (deux lectures en vol se dépassaient sous le StrictMode de React)
- **Les règles de 2H.8 et 2H.9, écarts 53, 54 et 53 bis de `00` C10 et C11, dans le code et en
  ligne depuis le 2026-10-11, moteur 5** : après un but, la surface de réparation devant la bouche
  qui encaisse est interdite à l'équipe qui a marqué le round du but et le suivant, ou jusqu'à la
  passe du gardien (53, 53 bis) ; le Bulwark qui encaisse passe en premier de son équipe et lance
  tout de suite, en sortant chercher une ligne s'il n'en a pas (54). **L'IA par rôle en deuxième
  version, dictée par moi en listes triées par priorité, `00` C10** : le Trajector laisse le
  ballon du coup d'envoi et chasse le Spark sans rien d'autre, le Striker presse coûte que coûte,
  le Breaker bouscule le porteur puis tape Strikers, Breakers, Trajector et fait mur, le Bulwark
  relance aussitôt et se plante par défaut. **Puis le plan de tour, `00` C11, 2H.9** : l'IA note
  des tours entiers et non plus une action à la fois, Dash ou non, case d'arrivée, action depuis
  cette case, repli, rejoués première action d'abord et reconstruits après chaque dé ; le Dash
  vaut le terrain qu'il achète et l'Action n'est jamais laissée en poche quand quelque chose
  d'utile est légal ; le gardien rentre sur sa case de départ avant de se planter. Trois Actions
  inutilisées sur 133 tours dans ma partie du 2026-10-11, contre 32 sur 136 la veille. **Puis la
  quatrième passe, `00` C12, 2H.10, dictée après l'analyse de cette partie et en ligne le
  2026-10-11, moteur 6** : un plan se lit à sa fin, Action dépensée (marcher puis attraper le
  Spark, ramasser puis lancer, la frappe finit sur sa case de recul) ; le porteur finit là où le
  moins d'adversaires peuvent venir le bousculer, chaque allié collé lui retirant une place, et
  garde la balle pour un tir propre au tour suivant plutôt qu'un tir à désavantage ; contre le
  porteur on bouscule, la batte seulement si elle évacue ; pas de bousculade de non-porteur pour
  Striker et Trajector ; le Breaker se colle au porteur d'abord, là où il sera ; le Breaker
  porteur sert un Striker devant lui même s'il a joué ; le Trajector seul sur le Spark, vers la
  case de la prochaine dérive ; les attaques d'opportunité au prix des PV ; tout déplacement par
  la route qui évite les allonges adverses ; la presse en Dash seulement par une route propre ; la
  laisse du gardien tient pour le Dash. Écart 55 : un humain joue en dernier de son rôle, visible
  sur l'échelle. Écart 56 : la case de début de tour dans l'état du tour, `ENGINE_VERSION` 6.
  **Puis la cinquième passe, `00` C13, 2H.11, dictée le 2026-10-12 après la lecture round par
  round de ma partie sur le moteur 6, en ligne le même jour** : un porteur ne tente jamais le
  Spark (écart 57) et seul le chasseur marche dessus ; le relais se juge contre la case où sera
  le porteur ; le Dash d'approche du porteur adverse est un plan pour les trois rôles de champ,
  noté sur la distance refermée, et ses planchers tiennent après le Dash ; Disengage pour tout
  rôle pressé ; un receveur qui n'a pas joué peut être huit cases derrière ; la case du ballon
  vaut une fin de tour de porteur une fois l'Action dépensée ; le porteur ne recule jamais ; une
  passe ne vaut jamais plus que le tir propre du lanceur et se note sur l'exposition du receveur ;
  une allonge coûte cinq points au moins ; le gardien adverse ne menace que dans sa laisse ; le
  dernier round lit le score, possession pour l'équipe qui a la balle et mène, frappes à portée
  pour l'autre ; en attaque le Breaker protège le porteur avant le Cracker, en défense il frappe
  ce qu'il atteint puis va au porteur, l'écran disparaît ; la proie se juge sur la chance de
  l'évacuer ; pendant la relance adverse la proie est le receveur probable ; le poste de parade
  vaut les dégâts qu'il épargne ; la ligne du Cracker se lit vers la case d'arrivée du porteur ;
  une parade n'explose jamais sur le pareur. Neuf poids changés, dont `shoot` Striker 150 et
  `stripCarrier` 150. 1,5 s par match d'auto-jeu. `resolve-action` v17 et `create-match` v15,
  moteur 6 inchangé. **Puis 2H.12, `00` C14, en ligne le 2026-10-12** : écart 58, un Striker ou un
  Breaker humain choisit, au premier tour de son rôle dans le round, de jouer premier, deuxième ou
  troisième de son rôle, par une popup à son propre chrono, dernière place par défaut ; et le
  Breaker ramasse tout ballon qu'il atteint dans le tour, Dash compris, avant toute cible.
  `ENGINE_VERSION` 7, `resolve-action` v18 et `create-match` v16, matchs du moteur 6 archivés.
  **Puis 2H.13, `00` C15, en ligne le 2026-10-14** : le défaut du chrono de `session.ts` (la clé
  lue avant mon action ne portait que l'unité, un rôle sans popup gardait l'échéance du round 1
  tout le match) ; écart 59, la dérive du Spark tire un d8 à chaque round, jamais une face qui le
  rapproche d'un Trajector, le chasseur vise la case où il est ; écart 60, après une prise il
  revient à 9 cases de chaque Trajector ; écart 61, un Shove réussi sur un porteur met le ballon
  dans les mains du bousculeur, personne ne bouge ; écart 62, l'équipe qui encaisse rejoue
  Trajector, Strikers, Bulwark, Breakers, et si son bloc a commencé le round se finit normalement ;
  `recoilBlocked` et le receveur nommé sur une passe volée, un marqueur hors du pion pour la
  Réaction dépensée, la popup sans voile dockée sur la colonne de droite et déplaçable ; la
  septième passe : le Trajector laisse le coup d'envoi, le porteur va au plus près de la bouche à
  exposition égale, le tireur laisse son rebond à un coéquipier qui n'a pas joué et qui l'atteint,
  le gardien ne lance jamais dans une allonge, le relais lit le gardien sur sa case, « Call for the
  ball » passe outre la chaîne et expire à mon tour suivant. 1,7 s par match d'auto-jeu.
  `ENGINE_VERSION` 8, `resolve-action` v19 et `create-match` v17, matchs du moteur 7 archivés
- **Équilibrage re-clos le 2026-10-10, sous-phase 2H.3 faite.** Rouvert par D11 parce que la
  mesure du 2 septembre, 1,66 à 2,29 buts, avait été prise avec les chutes et le coût de zone ; le
  moteur 2 donnait 0,42 à 0,50 but après 2H.1, puis 1,05 à 1,59 après 2H.2 quand l'IA a vu les
  caisses. La campagne de `08` §4.3 a été mesurée en entier, 200 matchs par Tier par variante,
  tableaux dans `docs/09-equilibrage-2H3-2026-10-10.md`. **Mes trois arbitrages** :
  Crackers à 10 cases (écart 40), portée de tir gardée à 9/12 (écart 39, les portées courtes
  faisaient passer le rookie sous un but par match), **Spark gardé à 20 points (écart 41), contre
  la recommandation de 5 du fil principal** : le Spark n'est jamais pris deux fois dans un match,
  son prix ne fixe que l'avance aux buts qu'une prise renverse, et à 20 il décide un match sur
  deux, part que j'accepte à la place de la cible des 30 %. Le sweep de 2H.3 donnait 1,10 à 1,80.
  **Rouvert par 2H.6 le temps d'un sweep et re-clos par moi le 2026-10-10 sur `09` §11 : entre
  1,18 et 2,21 buts par match**, Crackers à 8, portée 9/12, Spark 20, le star au-dessus de la cible à
  2,21 accepté, trois fois moins d'évacués qu'avant parce que les Crackers chassent le ballon et
  se font parer. **Rouvert par 2H.7 le temps du sweep unique et re-clos par moi sur `09` §12 le
  2026-10-10 : 1,46 à 1,80 buts par match**, les trois Tiers resserrés dans la cible, le Spark
  pris dans neuf matchs sur dix maintenant qu'il revient mais décidant toujours un match sur deux,
  encore moins d'évacués, les attaquants étalés, Dodge environ 7 % des tours d'unité. **Rien ne
  bouge, le Spark reste à 20**, ma partie jugera. Aucune constante de `00` ne bouge hors d'une
  sous-phase d'équilibrage que j'ouvre moi-même. L'initiative est un ordre depuis l'écart 51
- **IA, sous-phase 2H.2 faite le 2026-10-10** : l'IA voit les obstacles pour se placer, `shotQuality`
  et `scoringNearness` lisent la portée visible vers la bouche et une case aveugle est escomptée ;
  une valeur de relais `outlet` (à portée, en vue du porteur, devant lui) et une valeur de
  couverture `laneCover` avec un poids `cover` par rôle remplacent l'ancrage disparu. **A31
  reproduit en self-play et corrigé** : après un but, les coéquipiers n'avaient aucune raison de
  s'écarter de leur gardien ; ils s'écartent et le gardien passe. Le rapport de sweep porte la
  dispersion des coéquipiers du porteur et le nombre de collés. Quatre observations renvoyées à
  2H.4, à juger à ma partie en 2D : le gardien court chercher son propre ballon raté, un Striker à
  plus de dix-huit cases ne revient pas vers son gardien porteur, le relais se place à la portée du
  tir et non à celle de la passe, et le Spark est un enjeu unique par match
- **Phase 4 finie** : projet Supabase en ligne (eu-west-3, ref `tckaybbmnjyitavypqtq`), quatre
  migrations, RLS vérifiée, deux Edge Functions déployées, client React jouable en local, seed
  appliqué, sept migrations depuis le 2026-10-10. **Rien n'est déployé sur Vercel.** Les deux
  défauts serveur trouvés au harnais le 2026-10-10, l'action en retard rejouée (A28) et les
  fonctions en retard sur le moteur (A29), sont corrigés en 2H.4 ; le Spark est vérifié à 20 en
  ligne
- **Le projet Supabase gratuit se met en pause après sept jours sans trafic.** C'est arrivé en
  septembre sans que personne le voie, le jeu était injouable. Restauré le 2026-10-09 par l'API avec
  mon feu vert. **Le maintien en vie par GitHub Actions tourne depuis le 2026-10-10**, secrets
  posés par moi, premier run vert, un ping quotidien ; la CI aussi, test, typecheck et build du
  client à chaque push
- **Phase 1 « voir le jeu » construite le 2026-10-10** : harnais Playwright dans `e2e/`,
  test de fumée qui joue trois tours avec captures, mode qui joue un match entier par script,
  crochet `window.__boomball` sous deux drapeaux de développement, contrôles Python qui lisent le
  `.env` eux-mêmes, 409 de connexion et avertissements React corrigés. Le MCP Playwright est
  approuvé. `localhost`, jamais `127.0.0.1`. **J'ai joué ma première partie entière le
  2026-10-10**, onze retours numérotés dans `07` §10, qui ont conduit à D11
- **Décisions à ne pas rediscuter**, D1 à D11 dans `07` §1.2 : **2.5D stylisée** via Three.js et
  react-three-fiber, en caméra trois quarts que je tourne au bouton droit, zoome à la roulette et
  déplace aux flèches ou sous Ctrl, retenue dans le silo, avec deux cadrages de départ,
  géométrie construite depuis le layout, plateau SVG gardé en repli ; **le 3D avant le
  déploiement** ; **done = solo 2.5D en ligne stable sans moi, plus la coop à 2 ou 3** ; zéro euro ;
  amis sur portables à GPU intégré ; relevé au pixel abandonné ; **le terrain horizontal**
- **Plan** : vingt sous-phases 2H.1 à 2H.20 pour le terrain horizontal (règles et moteur, IA,
  équilibrage, serveur et plateau 2D, coup d'envoi et animation, Crackers vers le ballon et
  parade, l'IA par rôle et l'initiative, la surface de réparation et l'IA v2, le plan de tour,
  l'analyse de la partie et la quatrième passe, la cinquième passe, ma place dans mon rôle et le
  Breaker qui ramasse d'abord, le chrono et le Spark qui fuit les Trajectors et le Shove qui prend
  le ballon et la septième passe, la passe gratuite après le Shove et le relais du Trajector au
  coup d'envoi, les cases orange retirées et la 2.5D en un bloc, la caméra en main, décrochée,
  stable, les gradins, la caméra dans le silo), **2H.1 à 2H.14 en ligne, 2H.15 à 2H.20 en local
  au 2026-10-15**, avec une porte à la fin, une partie de moi où je dis si je
  comprends ce que chaque rôle cherche. **Porte non franchie** : mes parties ont donné leurs
  retours et décisions, toutes dans le code ; **le prochain lot est 2H.21, le jeu vivant**,
  animations et annonces à l'écran, proposé en dix lignes au début du chat suivant, validé par
  moi, écrit en `00` C23 avant le code. Prompt dans `05`. Les phases 3 à 5 de `07` sont faites par 2H.15 ; restent
  6 à 8, lisibilité et performance (sprites d'effets), coop, déploiement. **15 à 21 séances pour le done.** Des sous-agents Sonnet en parallèle sur les
  fichiers disjoints, `08` §9
- **Interdits** : ne jamais connecter le dépôt GitHub à Vercel : le client se déploie par l'API,
  `scripts/deploy-vercel.mjs`, qui s'arrête si le projet porte un lien Git. Les écritures destructives en base passent par moi, pas par Claude. La
  lecture passe
