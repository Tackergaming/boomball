On reprend Boomball, le jeu vidéo. Il vit à la racine de ce workspace.
Charge le skill boomball, puis lis EN ENTIER docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, **2H.40
est la dernière sous-phase codée, le 2026-10-20** (les phases 3, 4 et 5 sont
faites par 2H.15, la 6 par 2H.29, la 7 par 2H.31 à 2H.33, 2H.34 et 2H.35 l'interface d'équipe et
la limite de présence, 2H.36 le premier lot de la phase 8, 2H.37 les corrections de la revue de
sécurité, 2H.38 l'écran de match refait, 2H.39 la caméra refaite, 2H.40 la réplique du Spark),
2H.41 vient après, §9 la parallélisation.
Lis ensuite la partie C de docs/00-reglement-v2.md : les écarts 27 à 65, plus 40 bis,
37 bis et 53 bis, priment sur les parties A et B. C10 porte l'IA par rôle en deuxième version,
C11 le plan de tour, C12 à C16 les passes suivantes de l'IA (chacune finit par « comment ...
est codée », À LIRE avant de toucher à ai/), C17 la passe gratuite au gardien tranchée (elle
reste), C18 à C22 la caméra (C20 : MON REFUS d'une caméra à quatre nombres lissés), C23 et C24
le jeu vivant, C25 trois défauts d'écran, C26 le son et le rebond (écart 64, moteur 10), C27
l'annonceur systématique, C28 la ligue au choix, C29 annuler et quitter un match, C30 la phase 6
(3D par défaut, porteur, effectif fixe), C31 mes cinq retours (le Dash tenu, la latence MESURÉE
et LAISSÉE TOMBER), C32 la coop (cadrée en huit réponses de moi, codée en trois sous-phases le
2026-10-17 : 2H.31 A10 et la migration 0010, 2H.32 la batterie à plusieurs et la migration 0011,
2H.33 le match à plusieurs, l'écart 65, `ENGINE_VERSION` 11), C33 l'interface d'équipe (2H.34,
le hub et le lobby « The bench » sur une maquette validée, Battery devenu Team, migration 0012),
C34 la limite de présence Realtime et le bouton Ready (2H.35 : `track()` lissé à un message par
demi-seconde, canal fermé rouvert), C35 la phase 8 cadrée en huit points et « comment 2H.36 est
codée » (mot de passe oublié MANUEL par moi, le menu « Account », `site_url` sur l'URL Vercel,
inscriptions ouvertes, la revue de sécurité par un agent Opus 5.5, `npm run export:db`, le repli
sans WebGL). **C36 EST 2H.37, LES CORRECTIONS DE LA REVUE, TRANCHÉES PAR MOI LE 2026-10-18 EN
QUATRE RÉPONSES ET « COMMENT 2H.37 EST CODÉE »** : M1 et m1 par les migrations 0013 et 0014 (le
déclencheur `team_members_pin_keys` plutôt que les privilèges de colonne, parce que l'upsert du
lobby les aurait heurtés ; la politique d'insertion corrigée en 0014 parce que le `with check`
d'insert s'évalue AVANT le conflit d'un upsert ; `rls-check.py` de 24 à 38 contrôles) ; M2 par
`isCell` dans `validatePath` et `isActionShaped` dans `resolve-action` (v28) ; M3 et m4 par la
migration 0015 (les trois canaux Realtime PRIVÉS, politiques sur `realtime.messages`, la base
diffuse `roll` et `abandoned` elle-même), `announceAbandoned` et `announceTeamChange` SUPPRIMÉES,
`lib/channelReopen.ts`, fonctions v29 et v26 en supabase-js 2.113.0, `private_only` à vrai sur le
projet ; m2, m3, m5 acceptés ; m6 en 0016, appliquée ; n8 avec 2H.38. **C37 EST 2H.38, L'ÉCRAN DE
MATCH REFAIT, CADRÉ PAR MOI LE 2026-10-19 EN DIX POINTS SUR UNE MAQUETTE VALIDÉE SANS CORRECTION
(`design/2H38-ecran-de-match/index.html`), PUIS CODÉ LE MÊME JOUR** : lis « comment 2H.38 est
codée » à la fin de C37 avant de toucher à l'écran. **C38 EST MON RETOUR DE PARTIE SUR 2H.38**
(les actions sur cible au survol et dans la rangée, le clic n'ouvre que la fiche), en ligne, et
porte mes deux demandes d'après la caméra, 2H.40 (faite) et 2H.41. **C39 EST 2H.39, LA CAMÉRA
REFAITE, CADRÉE PAR MOI LE 2026-10-20 EN CHAT SUR DOUZE CAPTURES DE LA VRAIE SCÈNE ET « COMMENT
2H.39 EST CODÉE »** : plus de mode libre, quatre vues (Side à 52 degrés, l'arrivée au silo entier ;
Top à 85 ; Own end et Far end à 40 derrière chaque bouche, figées), la roulette sur Side et Top
seulement, Follow the play qui part de dix-neuf cases de profondeur, le bouton droit qui tire le
sol à la place de Ctrl, les flèches, quatre boutons sous la minicarte et la touche V, la section
Camera de ⚙ retirée, la main brute (C20 tient). **C40 EST 2H.40, LA RÉPLIQUE DU SPARK, CADRÉE PAR
MOI LE 2026-10-20 EN CHAT, UNE QUESTION PAR MESSAGE, ET « COMMENT 2H.40 EST CODÉE »** : « and it's
a goal » sur un Spark attrapé ÉTAIT UN DÉFAUT (`motion.ts` faisait un repère de but de tout
`scored`, source ballon ou Spark), pas une réplique ; ma phrase « And the Spark is caught! Twenty
points on the board! » dans la voix du but (un clip d'un pack Freesound, PAS ma voix) clonée par
Chatterbox en local sur ma RTX 4060, ma prise choisie à l'oreille parmi six ; le Spark ne
déclenche plus rien du but ; la catégorie `spark` de l'annonceur vide et prioritaire. Ne
rediscute rien de C12 à C40.
07 §10 porte le journal (2H.15 la 2.5D fichier par fichier, 2H.16 à 2H.20 la caméra, 2H.21 et
2H.22 le jeu vivant, 2H.29 la phase 6, 2H.30 les cinq retours, « Le client en ligne », 2H.31 à
2H.40). 09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep depuis
2H.8. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te surprend. 10 est le
rapport de la revue de sécurité (agent Opus 5.5) : ses trois majeurs sont fermés par 2H.37, n8 est
dans le code de 2H.38, lis son §4 (l'état de C1 à C20) si la question touche à l'exploitation.

Où on en est : **2H.40, LA RÉPLIQUE DU SPARK, EST CODÉE LE 2026-10-20 PAR LE FIL PRINCIPAL SEUL**
(`sound.ts`, `motion.ts`, `announcer.ts`, deux tests, `client/public/sounds/spark.mp3`,
`scripts/voice/clone-line.py`, `00` C40, `08` §5, `07` §10, `04`, CONTEXT, la skill, ce prompt).
**COMMITÉE (`6159a45`) ET EN LIGNE LE 2026-10-20 SUR MON FEU VERT**, bundle `index-D4GRahNO.js`,
déployée par le fil principal (le classifieur a laissé passer `deploy-vercel.mjs --production`
une seconde fois). Les documents qui notent la mise en ligne (07 §10, 08 §5, CONTEXT, la skill, ce
prompt) ont été modifiés après `6159a45` : s'ils ne sont pas commités, demande-moi « commit » (git
doit être propre et `origin/main..main` vide : vérifie-le). Rien à redéployer côté fonctions. **848 tests verts sur
50 fichiers** (847 avant), smoke 2D vert en 46 s (un premier run rouge parce que le match e2e a
atteint le round 10 pendant ses trois tours, le cas connu), `e2e:board3d` non relancé
(`Effects.tsx` ne change pas ; dernier vert le 2026-10-20 en 11,5 min au portable et 20,6 min au
27 pouces). `ENGINE_VERSION` toujours 11. Fonctions en ligne : `resolve-action` v30 et
`create-match` v27 (si la ligne « reading the match failed » apparaît dans les logs de la
fonction, dis-le-moi). **LE CLIENT EN LIGNE (https://boomball.vercel.app) EST `index-D4GRahNO.js`
(2H.40)**, construit et déployé par le fil principal le 2026-10-20. `password_min_length`
vaut 8, `disable_signup` faux. **Le projet Realtime est en `private_only`** : tout nouveau canal
doit être `private: true` ET avoir une politique sur `realtime.messages`. Migrations appliquées :
**0001 à 0016**. assets/source/ (mes sources, dont `spark.wav` et `spark-takes/`) est ignoré par
git : ne le commite jamais. `backups/` est ignoré par git et contient les codes d'invitation :
jamais dans un dossier partagé.

**L'outil de clonage de voix, installé le 2026-10-20** : Chatterbox (`chatterbox-tts` 0.1.7, torch
2.6.0 cu124) dans un environnement Python 3.10 HORS DÉPÔT,
`C:\Users\monti\AppData\Local\boomball-tools\chatterbox`, qui tourne sur ma RTX 4060 ;
`scripts/voice/clone-line.py` dit comment sortir une nouvelle phrase (trois prises par référence,
à juger à l'oreille, les mots vérifiés par whisper, qui est installé dans le Python 3.10 global).
La référence est la voix seule découpée (`assets/source/sounds/spark-takes/reference-goal-voice.wav`).
Une voix clonée sur cinq secondes ressemble, elle n'est pas exacte.

L'ORDRE DE LA SUITE, VALIDÉ PAR MOI : (1) à (9) FAITS, **(9) étant 2H.40, la réplique du Spark
(`00` C40), codée le 2026-10-20** ; (10) **2H.41, en option, un humain joue tous les Giffs de son
équipe**, ce qui refait l'ordre et l'initiative de son équipe (moteur, fonctions,
`ENGINE_VERSION`). 2H.41 est notée en `00` C38 et `08` §5, PAS cadrée : elle se cadre en chat,
une question par message, la première bornant l'ampleur. Restent aussi, sans date : ma partie à
deux sur les canaux privés (la porte de 2H.37) et un ami qui crée un compte et joue sans moi (la
porte de la phase 8).

LA TÂCHE DU PROCHAIN CHAT : vérifier git et me le dire (2H.40 est VALIDÉE par ma partie en ligne :
« parfait ça marche bien ») ; puis **cadrer 2H.41**, si ce n'est pas déjà commencé dans le chat
précédent (regarde `00` : un C41 existe alors), en chat, une question par message, la première bornant
l'ampleur (l'initiative est dans `engine/` : écarts 51, 55, 58 et 65, `turn`, le siège et
`seatYielded` de 2H.33 ; les fonctions et `ENGINE_VERSION` bougent). **Fermer les inscriptions**
(`disable_signup`) le jour où je le dis, pas avant. Deux remarques de la relecture des captures
de 2H.38, sans décision : la maison peut avoir deux pions au même prénom (deux « Osric »), que les
pastilles et les plaques ne distinguent pas ; le bandeau « Your turn » à côté de « Spectating »
juste après un siège remis (dette connue). Une de C38 : la fiche, fixée en haut à gauche, peut
s'ouvrir sur une cible qui se trouve juste dessous et lui faire perdre ses étiquettes.

**Le classifieur du mode auto** a refusé le PATCH Auth le 2026-10-19. Depuis `09e29aa`,
`.claude/settings.json` autorise `Bash(npm --prefix client run build)` (le build passe, écris-le
EXACTEMENT ainsi, depuis la racine) et `Bash(node scripts/deploy-vercel.mjs:*)` : **le 2026-10-20
le déploiement en production est passé par le fil principal**, sur mon feu vert ; s'il est refusé
un jour, je déploie, ou je passe en mode par défaut le temps de la commande. Une écriture
de configuration, je la fais moi-même dans PowerShell ou le tableau de bord, et **dans mon
PowerShell `npm` ne marche pas** (la politique d'exécution bloque `npm.ps1`) : écris-moi
`npm.cmd`.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 ou Fable 5.1 pour ce qui réclame de la qualité (le hub et
   le lobby de 2H.34 sont d'un Opus 5.5 effort élevé sur brief fermé ; la revue de 2H.36 aussi,
   relue au code par le fil principal). 2H.37, 2H.39 et 2H.40 ont été faites par le fil principal
   seul. Toute matière que tu me présentes
   nomme son auteur, agent ou fil principal. Dès que tu as une liste d'actions pour moi, donne-la
   numérotée, une action exacte par ligne, et dis ce qui se passe ensuite. **Je suis dans
   PowerShell** : une commande pour moi ne contient jamais `set -a && . ./.env`, les scripts
   lisent le `.env` eux-mêmes (`apply-migration.mjs`, `deploy-vercel.mjs`, `rls-check.py`).

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. Pour une interface, une maquette cliquable en artifact avant le code a très
   bien marché (2H.34) : je corrige dessus, puis je dis GO. L'outil de questions à choix sert aux
   arbitrages fermés. Pour expliquer pourquoi l'IA a fait un choix, lis les huit plans du viewer
   et le code, jamais une supposition. Ne dis plus « la maison » : « l'équipe qui a la balle »,
   « l'équipe qui ne l'a pas ». Et plus jamais « battery » à l'écran : « team ».

3. Aucun sweep tant que je ne l'ai pas demandé, un seul par lot de changements d'IA, contre 09
   §12, seize minutes. Tu ne touches à aucune constante de 00 sans mon arbitrage. Les poids de
   l'IA sont dans ai/roles/ et viennent de mes mots dans 00 C10 à C16 ; la formule : note du plan
   = valeur de l'action depuis sa case + position de la case finale − position de la case de
   départ − exposition des trajets. Le plan de tour : chooseAction renvoie la première action du
   meilleur plan, l'IA se juge sur rankPlans.

4. Pour savoir ce que l'IA a fait dans un match en ligne : depuis la racine du workspace en bash, set -a &&
   . ./.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis --match
   <uuid complet>. Horaires de --list en UTC. Les dossiers de docs/matches/ d'avant le moteur 11
   ne se rejouent plus. 2e30f587 n'est PAS à analyser.

5. Toute migration passe par moi via /supabase-migrate (il n'y a pas de registre : 0001 à 0016
   sont appliquées), tout redéploiement par mon feu vert explicite. Chaque
   match porte engine_version ; une fonction qui lit une autre version refuse en 409, le client
   archive. Les écritures destructives en base passent par moi ; la lecture passe (un script
   jetable dans le scratchpad qui poste un select à `/v1/projects/{ref}/database/query` fait
   l'affaire, l'API ne rend que le résultat de la DERNIÈRE instruction ; un script Node qui
   importe @supabase/supabase-js doit être copié dans client/ le temps de tourner, le scratchpad
   ne résout pas le paquet). La configuration Auth et la configuration Realtime se lisent et
   s'écrivent par l'API de gestion (`/v1/projects/{ref}/config/auth` et `/config/realtime`,
   PATCH, dont la réponse peut être VIDE : relire après), l'écriture sur mon feu vert. Faire jouer
   ou rejoindre le compte e2e n'est pas destructif, et un compte jetable créé par l'API admin et
   supprimé après non plus (c'est ce que fait `rls-check.py`). `npm run export:db` est une lecture.

6. Le harnais : npm run e2e en 30 à 55 s, e2e:playthrough en 15 à 70 s, **e2e:board3d en 11,5 min
   à 1536 × 695 (vingt de marge) et 20,6 à 2560 × 1271 (quarante-cinq de marge)**, e2e:abandon en 10 s, e2e:coop en
   2 à 5 min (deux specs, hors de npm run e2e ; il abandonne le match e2e en cours pour atteindre
   le lobby, et abandonne le match coop qu'il
   ouvre), e2e:account en 8 s (hors de npm run e2e : il change le mot de passe du compte e2e et le
   remet dans un `finally` ; s'il casse entre les deux, le compte garde l'original suivi de
   `-tmp`, à remettre à la main). **Depuis 2H.38 les réglages sont derrière ⚙** : vitesse, vue,
   volumes, et les boutons « Leave the match », « Hand my Giff to the
   house », « Back to the hub » ; le harnais passe par `openSettings`, `closeSettings`,
   `setReplay`, `settingsClick` (`e2e/harness.ts`). **Depuis 2H.39 la caméra se pilote sur le
   plateau** : `cam-side`, `cam-top`, `cam-own`, `cam-far` sous la minicarte, `follow-play`,
   `[data-board3d][data-view=...]` et `[data-camera=following|free]` ; plus de `zoom-close` ni
   `zoom-wide`. La fenêtre Playwright vaut **1536 × 695 par
   défaut** et `E2E_VIEWPORT=2560x1271` donne le 27 pouces. Ouvrir ⚙ coûte plusieurs secondes à 2
   images par seconde : un contrôle de quelque chose qui s'efface (bandeau, ligne neuve du fil)
   passe par un observateur posé dans la page, comme dans `board3d.spec.ts`. Le match e2e qui
   finit pendant le tour de la maison emporte l'écran et la roue : le run suivant en ouvre un
   neuf. **Ne lance jamais npm test et e2e:board3d en même temps** : à
   2 fps sous GL logiciel le bandeau « Your turn » de 1,2 s est raté et le spec tombe. Le crochet
   window.__boomball (DEV seulement) : fx(), audio(), crowd(), lastSaid(), probe(), clickCell,
   act, legalSummary ; `yours` du crochet est faux derrière le briefing (utiliser waitFor sur
   « Into the silo », jamais isVisible). waitForPlayableTurn répond à la popup à l'écran. Le smoke
   échoue si le match e2e atteint le round 10 pendant ses trois tours (le suivant en ouvre un
   neuf ; une sonde qui joue le match e2e le fait avancer) ou si le Giff e2e est cerné (npm run
   e2e:abandon). Juste après un déploiement la connexion de global-setup.ts peut expirer une
   fois : relancer. Si mon npm run dev occupe 5173 sans le crochet : VITE_BOOMBALL_HOOK=1
   VITE_BOOMBALL_PATIENT=1 npx vite --port 5174 --strictPort depuis client/ en
   arrière-plan, chauffer par deux curl, BASE_URL=http://localhost:5174, le tuer après (netstat
   -ano, taskkill). Le spec 3D admet deux avertissements console qui ne sont pas à nous
   (THREE.Clock, GL logiciel) ; toute autre ligne le fait échouer, y compris l'avertissement de
   `send()` hors abonnement. Firefox est installé pour Playwright (`firefox-1555`) ; une passe
   navigateur est une sonde jetable dans scripts/ (connexion par l'écran, hub, lobby ou reprise,
   briefing, plateau, console lue), supprimée après ; un Chromium sans WebGL se lance avec
   `--disable-3d-apis`. Le smoke ne tourne PAS contre l'URL en ligne (le crochet est DEV
   seulement) : pour le client en ligne, curl du bundle plus une sonde Playwright. Pour voir la
   présence et les jointures Realtime, une sonde qui écoute `page.on('websocket')` : les trames
   sont des tableaux `[joinRef, ref, topic, event, payload]`, `phx_join` porte
   `payload.config.private`, la réponse `phx_reply` porte `status` et `response.reason`.

7. useMatch.load porte un compteur de génération, ne l'enlève pas ; la caméra 3D n'a plus
   d'orbite libre (C39) : quatre vues dans `framing.ts`, le rig de `Camera.tsx` lit `hookPulse`
   pour remettre le zoom de suivi, `link.platesShort` dit aux plaques d'être courtes ; useMatch.stateRef est écrit
   partout où setState l'est ; sendMany(actions, asUnitId, quiet) porte sendAs et knock. Le
   bash de l'outil casse sur les accents graves et les apostrophes dans un heredoc, même cité :
   un fichier long s'écrit avec l'outil Write, et une série de remplacements avec un script
   Python écrit dans le scratchpad, lancé avec python -I. Jamais Html de drei. La caméra ne passe
   pas par OrbitControls. Le corps du pion est le Giff riggé (giffRig.ts). Les hooks de Match.tsx
   restent au-dessus du retour anticipé sur state. **Le son (C26, C27, C40)** : `motion.ts` ne fait
   un repère de but que d'un `scored` de source `payload` ; `SAMPLES` de `sound.ts` porte les
   enregistrements (`swing`, `goal`, `blast`, `dash`, `sparkCaught`) qui remplacent la synthèse
   une fois décodés ; `ANNOUNCER_PRIORITY` (`goalOwn`, `goalFoe`, `spark`, `fullTime`, `win`,
   `loss`) coupe la réplique en cours, une liste vide fait taire sans rien dire. **La présence Realtime est limitée en débit
   par le serveur et la sanction est la fermeture du canal** (C34) : jamais un `track` par touche
   ni par rendu, toujours par `useLobbyChannel.track`. Un module client testé par vitest
   n'importe jamais lib/supabase.ts (il jette sans son environnement) : les parties pures vivent
   à côté (lobbySeats.ts, roll.ts, coopClock.ts, channelReopen.ts). `supabase.channel(topic)`
   rend l'instance existante d'un même topic : ne jamais tenir deux fois le même canal dans deux
   composants, c'est pour ça que le lobby est dans App. **`signOut` est à `scope: 'local'`**.
   **`useAccount.load(null)` remet `loadedForRef` à `null`**. **`webglAvailable()`** est demandé
   une fois par page dans `Match.tsx`. **Les trois canaux sont privés (2H.37)** : `private: true`
   à l'ouverture, les membres entendent, SEUL le lobby s'écrit depuis un client (présence et
   `started`) ; `team:*` et `match:*` sont écrits par la base (`realtime.send` dans les
   déclencheurs de 0015 et dans `abandon_match`) et par les fonctions (`httpSend` explicite,
   service role, hors RLS) ; `useLobbyChannel` rouvre un canal fermé cinq fois au plus et jamais
   sur « Unauthorized » (`channelReopen.ts`). Sur `team_members`, `team_id` et `profile_id` sont
   figés par le déclencheur `team_members_pin_keys` ; l'insertion est « sa propre ligne sur une
   équipe dont on est membre », parce que le `with check` d'INSERT s'évalue sur un upsert même
   quand la ligne existe. Sur `teams`, `authenticated` n'a plus que `insert (owner, name)` et
   `update (name)`.

8. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55) ; un humain Striker ou Breaker choisit sa place (écart 58), et
   à plusieurs humains du rôle c'est le premier au d20 qui choisit, les autres derrière (écart
   65) ; écart 62, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers ; écart 53,
   penaltyBox ; 53 bis ; écart 56, turn.startedAt ; 57 ; 59 à 61 ; 63, turn.freePass ; 64, le
   rebond part de la bouche. Deux faits de règle sans décision : l'équipe qui a l'humain joue
   juste après le Spark à chaque round ; la dérive du Spark traverse les unités. Fait de la
   coop, sans décision : une équipe A dont le dernier humain a remis son siège n'a plus d'humain,
   et les deux camps alternent de round en round (sideOrder). **2H.41 touche à tout ce point.**

9. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
   dans un commit. Le règlement de table du vault de jarvis-jdr est figé. Ne lis jamais design/Boomball
   Interface.html en entier (ses images sont compressées dans le bundle, inextractibles par une
   regex base64 ; le gabarit s'extrait par la commande du design/README.md). Mon jeton GitHub du
   .env n'a pas le droit de lire les Actions ni les secrets du dépôt : pour le maintien en vie et
   la CI, c'est moi qui regarde l'onglet Actions (vert sur 22564ca le 18 au matin).

10. Les commandes. Depuis la racine du workspace : npm test (848), npm run typecheck, npm run sweep, npm run
    e2e, e2e:playthrough, e2e:board3d, e2e:abandon, e2e:coop, e2e:account, npm run build:function,
    npm run export:db ; en bash avec le .env chargé : npm run deploy:function (les deux) ou node
    scripts/deploy-edge-function.mjs resolve-action (une seule) ; node scripts/deploy-vercel.mjs
    --production (lit le .env lui-même). Depuis client/ : npm run dev sur
    http://localhost:5173 (jamais 127.0.0.1), npm run build, npm run typecheck. Depuis la
    racine : python supabase/checks/rls-check.py (38 contrôles, crée et supprime deux
    comptes jetables et deux équipes) et browser-path.py, python .claude/scripts/check_drift.py.
    Le cwd de l'outil Bash se réinitialise entre deux appels : chemins absolus, ou npm --prefix.

11. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 65 de 00
    partie C, et C11 à C40 en entier. 2H.38 a soldé le nom du joueur sur la plaque et la pastille
    des autres pions humains et `onFinished` appelé à chaque rendu. Dette connue : le bandeau
    « Your turn » à revoir avec le coin du chrono (C37 ne l'a pas tranché) ; « Giff picks the league » et « Giff
    starts the match » se répètent dans la barre du membre ; `mergeRoll` reste côté client,
    inutile depuis 0012 ; la RPC garde le nom `battery_members` et `create-match` dit encore
    « battery » dans un message ; le
    bandeau « Your turn » qui reste sa durée après un siège remis ; un spectateur ne frappe pas à
    la porte ; `e0d9b642` (moteur 10) et tous les matchs antérieurs ne se rejouent plus ;
    arenas.art et le champ art nomment trois JPEG retirés ; substituteEntry non lu ; la parade du
    Breaker humain automatique ; le fondu croisé des foules sans compensation ; le délai de
    l'annonceur compté depuis le début du clip ; une réplique en cours jette le KO d'un coup
    suivant ; la coupure par un but ne libère pas le plancher ; FEED_LIMIT 120 ; le Spark peut
    rebondir plusieurs rounds dans une poche ; un gardien peut marcher jusqu'à côté d'un receveur
    marqué pour une passe d'une case ; le Shove d'un Bulwark n'est borné que par l'adjacence ; le
    Dash tenu n'existe que côté client ; en 3D, l'orientation du modèle, le noir sous la lèvre
    avant, la répétition de la foule en vue large, l'effacement des
    gradins jugé sur la hauteur, la retenue en boîte, les vues Own end et Far end qui ne suivent
    pas le jeu, le zoom qui ne survit pas au démontage du plateau (la vue, oui), les captures des effets courts figées sous le
    GL logiciel, le ballon qui ne disparaît pas dans la bouche, pas d'étincelles en 2D, les
    commentaires « 2H.23 » de Tokens.tsx ; du rapport 10 : n12 (le secret JWT dans un transcript,
    à faire tourner si un dossier de transcripts est partagé) et n14 (le roster écrit avant la
    validation des sièges) ; le déclencheur `team_members_roll` fait relire le hub à chaque
    sauvegarde de siège, un bruit sans coût.

12. Un fait de données : le second compte e2e (`BOOMBALL_E2E2_EMAIL`, `BOOMBALL_E2E2_PASSWORD`,
    affiché « E2E Second ») est membre de DEUX équipes, « E2E Battery » et « Shrapnel oath », MON
    équipe (compte tackergamingrss@gmail.com). `coop.spec.ts` bascule sur « E2E Battery » par le
    menu quand son hub s'ouvre ailleurs. Ne le retire pas de mon équipe sans me le demander.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte,
    après avoir récrit ce fichier.
