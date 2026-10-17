# Prompt de reprise pour le chat suivant

> Récrit le 2026-10-17 au soir par le fil principal (Fable 5.1) à la fin du chat qui a cadré la
> phase 8 et codé son premier lot, 2H.36. À coller tel quel au début du chat suivant.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.36
est la dernière sous-phase codée (les phases 3, 4 et 5 sont faites par 2H.15, la 6 par 2H.29,
la 7 par 2H.31 à 2H.33, 2H.34 et 2H.35 l'interface d'équipe et la limite de présence, 2H.36 le
premier lot de la phase 8), §9 la parallélisation.
Lis ensuite la partie C de boomball/docs/00-reglement-v2.md : les écarts 27 à 65, plus 40 bis,
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
demi-seconde, canal fermé rouvert). **C35 EST LA PHASE 8, CADRÉE EN CHAT LE 2026-10-17 SOIR, HUIT
POINTS VALIDÉS PAR MOI EN UN LOT, ET « COMMENT 2H.36 EST CODÉE »** : mot de passe oublié MANUEL
par moi (pas de SMTP, le mailer intégré plafonne à deux e-mails par heure, choix assumé, l'écran
de connexion dit « Forgot your password? Ask Jérôme on Discord, he resets it. ») ; le menu
« Account » dans l'en-tête du hub (nom, « Change password » avec le nouveau deux fois SANS
l'ancien, « Sign out » de ce navigateur seulement) ; `site_url` et la liste des redirections de
l'Auth sur `https://boomball.vercel.app`, FAIT sur mon feu vert ; la bande passante Hobby classée
sans suite et l'ancien `giff-boomball.glb` retiré du client ; les inscriptions OUVERTES pour
l'instant (`disable_signup` les fermera sans code) ; la revue de sécurité d'abord, par un agent
Opus 5.5 effort élevé parce que `/security-review` ne relit que la diff en attente ; l'export
`npm run export:db` ; Firefox vérifié vert et le repli sans WebGL (page noire trouvée et
corrigée, « No 3D here »). Ne rediscute rien de C12 à C35.
07 §10 porte le journal (2H.15 la 2.5D fichier par fichier, 2H.16 à 2H.20 la caméra, 2H.21 et
2H.22 le jeu vivant, 2H.29 la phase 6, 2H.30 les cinq retours, « Le client en ligne », 2H.31 à
2H.36). 09 §12 est le dernier sweep, tranché « rien ne bouge » ; il n'y a pas de sweep depuis
2H.8. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te surprend.
**LIS AUSSI boomball/docs/10-revue-securite-2026-10-17.md EN ENTIER** : c'est le rapport de la
revue de sécurité du jeu entier, rendu par l'agent Opus 5.5 et relu par le fil principal (M1 et
M2 vérifiés dans le code). C'est la matière de 2H.37.

Où on en est : **2H.36 EST CODÉE LE 2026-10-17 SOIR, `ENGINE_VERSION` toujours 11, rien à
redéployer côté fonctions (`resolve-action` v27, `create-match` v25, moteur 11 en ligne depuis
le 17).** 771 tests verts sur 45 fichiers, typecheck racine, scripts, e2e et client verts, le
client bundle. Smoke 2D vert en 33 s, `npm run e2e:coop` vert en 2,2 min (deux specs),
`npm run e2e:account` (nouveau, `@account`, hors de `npm run e2e`) vert en 7,4 s,
`e2e:board3d` **vert en 6,4 min** (lancé seul). **LE CLIENT EN LIGNE (https://boomball.vercel.app) EST ENCORE CELUI DE
2H.35** : le menu « Account », la ligne « Ask Jérôme », le repli sans WebGL et le modèle retiré
attendent MON FEU VERT pour un redéploiement (npm run build dans client/, déjà fait et vert, puis
node scripts/deploy-vercel.mjs --production depuis boomball/). Vérifier git status et git log
origin/main..main en premier et me le dire : au 17 au soir tout était commité et poussé jusqu'à
`0e7e734` ; **2H.36 est à commiter si je ne l'ai pas fait avec /commit ou /save en fin de chat**.
Les fichiers de 2H.36 : client/src/screens/AccountMenu.tsx (nouveau), client/src/lib/webgl.ts
(nouveau), lib/supabase.ts (`changePassword`, `signOut`), lib/useAccount.ts (`load(null)` remet
`loadedForRef` à `null`), App.tsx (`onSignedOut`), screens/TeamHub.tsx (le menu dans l'en-tête et
au-dessus de « Raise a team »), screens/SignIn.tsx (la ligne), screens/Match.tsx (`hasWebgl`, le
bouton « No 3D here »), theme.css (`bb-account-*`, `bb-found-top`), e2e/account.spec.ts
(nouveau), package.json (`e2e:account`, `export:db`, `@account` exclu de `e2e`),
scripts/export-db.mjs (nouveau, Sonnet), client/public/models/giff-boomball.glb (SUPPRIMÉ),
assets/source/README.md, le .gitignore racine (`boomball/backups/`), docs 00 (C35), 07 (§10), 08
(en-tête, §5), 10 (nouveau, le rapport), le skill boomball, ce fichier. Les quatre fichiers du
vault modifiés hors de nos sessions et les non suivis MARGO.md, theodo.md, assets/source/ (mes
sources, non suivies), scripts/blender/__pycache__/ ne sont pas à nous : ne les commite pas sans
mon feu vert ; check_vault.py signale MARGO.md et theodo.md, c'est connu et c'est à moi.
`boomball/backups/` est ignoré par git et contient les codes d'invitation : jamais dans un
dossier partagé.

**Ce que la revue a trouvé, en bref** (détail dans 10, ne pas le réinventer). Verdict : aucun
bloquant, un ami peut jouer sans moi dans la pièce ; `rls-check.py` 24 sur 24 ; aucun secret dans
git ni dans l'historique ; un seul JWT dans le bundle, la clé anon. Trois majeurs, tous contre un
ami malveillant ou un ancien membre, jamais un inconnu (les UUID ne sont exposés nulle part) :
**M1** la politique `team_members_write` de `0001_init.sql` ne regarde pas `team_id` à
l'insertion, n'importe quel connecté s'insère dans toute équipe dont il connaît l'UUID, un membre
retiré revient en une requête ; correction, une migration d'environ 25 lignes (insert réservé au
propriétaire pour sa propre ligne, les amis n'entrent que par `join_team` ; update sur sa ligne
avec des privilèges de colonne qui figent `team_id` ; delete inchangé), sans redéploiement.
**M2** `validatePath` dans `engine/rules/movement.ts` ne vérifie jamais qu'une coordonnée est
entière, `cellAt` rend `undefined` pour `x = 2.5` et une chaîne est stockée telle quelle ; prouvé
contre le vrai moteur ; correction, `Number.isInteger` en tête de boucle, un `path` tableau, une
`action` objet à `kind` chaîne dans `resolve-action`, un test, `ENGINE_VERSION` inchangé,
`resolve-action` à redéployer (v28). **M3** les trois canaux Realtime publics, avec ce qu'ils
permettent (un `abandoned` forgé éjecte tout le monde, un faux lot `events` rejoue de faux buts,
une fausse présence bloque le départ) ; correction en §3 du rapport, SQL complet d'une migration
« canaux privés » (politiques sur `realtime.messages`, déclencheurs `realtime.send` pour `team:*`
et l'abandon, plus aucun client n'écrit sur `team:*` ni `match:*`), `private: true` côté client
et dans les deux fonctions (monter leur supabase-js 2.45.4), **après M1 seulement, client et
fonctions redéployés ensemble hors soirée de jeu**, puis couper l'accès public dans le dashboard
Realtime. Six mineurs : m1 le propriétaire écrit `wins` donc son Tier (trois lignes de
privilèges de colonne) ; m2 le code d'invitation lisible par tout membre (accepter) ; m3 la
présence mensongère d'un membre (accepter) ; m4 la réouverture du canal du lobby sans plafond, à
plafonner AVEC M3 ; m5 les messages Postgres recopiés (laisser) ; m6 plusieurs équipes par
propriétaire (un index unique si j'y tiens). Quatorze notes, dont n8 : passer le minimum à 8
caractères ne coûte rien, et couper les inscriptions une fois mes amis inscrits est la seule
mesure qui ferme vraiment la porte.

L'ORDRE DE LA SUITE, VALIDÉ PAR MOI : (1) à (5) FAITS (ligue et abandon, phase 6, client en
ligne, coop, interface d'équipe, ma partie à deux avec revanche) ; (6) la phase 8 : **le cadrage
et 2H.36 FAITS** ; restent **2H.37, les corrections de la revue, que JE TRANCHE sur le rapport**,
le redéploiement du client sur mon feu vert, et un ami qui crée un compte et joue sans moi.

LA TÂCHE DU PROCHAIN CHAT : vérifier git et me le dire ; me proposer /save (ou /commit) puis le
push si 2H.36 n'est pas commitée ; **me proposer le redéploiement du client** (2H.36 n'a rien
côté fonctions) et le faire sur mon feu vert, puis vérifier l'URL en ligne (curl, la page de
connexion avec la ligne « Ask Jérôme ») ; puis **ME FAIRE TRANCHER 2H.37 EN CHAT, une ou deux
questions par message** : l'ordre proposé est M1 et m1 en une migration 0013 (par moi via
/supabase-migrate, avec les contrôles ajoutés à `rls-check.py`), M2 avec un test et
`resolve-action` v28 sur mon feu vert, puis M3 avec m4 en une migration 0014 et un redéploiement
client plus fonctions ensemble, hors soirée de jeu, `e2e:coop` vert et une partie à deux ; m2,
m3, m5 à accepter, m6 et n8 à mon choix. Ensuite l'ami. **À SAVOIR POUR PLUS TARD, PAS
MAINTENANT : je veux aussi revoir l'interface des matchs à un moment donné**, comme on a refait le
hub et le lobby en 2H.34 (maquette cliquable d'abord, puis GO) ; ne l'ouvre pas de toi-même,
attends que je le demande.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet pour le facile et le borné, effort précisé, fichiers
   disjoints, brief fermé ; Opus 5.5 ou Fable 5.1 pour ce qui réclame de la qualité (le hub et
   le lobby de 2H.34 sont d'un Opus 5.5 effort élevé sur brief fermé ; la revue de 2H.36 aussi,
   relue au code par le fil principal). Toute matière que tu me présentes nomme son auteur, agent
   ou fil principal. Dès que tu as une liste d'actions pour moi, donne-la numérotée, une action
   exacte par ligne, et dis ce qui se passe ensuite.

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

4. Pour savoir ce que l'IA a fait dans un match en ligne : depuis boomball/ en bash, set -a &&
   . ../.env && set +a puis node scripts/run-ts.mjs scripts/dump-match.ts --list, puis --match
   <uuid complet>. Horaires de --list en UTC. Les dossiers de docs/matches/ d'avant le moteur 11
   ne se rejouent plus. 2e30f587 n'est PAS à analyser.

5. Toute migration passe par moi via /supabase-migrate (il n'y a pas de registre : 0001 à 0012
   sont appliquées, dit 04 ; la prochaine est 0013), tout redéploiement par mon feu vert explicite.
   Chaque match porte engine_version ; une fonction qui lit une autre version refuse en 409, le
   client archive. Les écritures destructives en base passent par moi ; la lecture passe (un
   script jetable dans le scratchpad qui poste un select à l'API de gestion fait l'affaire ; un
   script Node qui importe @supabase/supabase-js doit être copié dans client/ le temps de tourner,
   le scratchpad ne résout pas le paquet). La configuration Auth se lit et s'écrit par l'API de
   gestion (`/v1/projects/{ref}/config/auth`, PATCH), l'écriture sur mon feu vert. Faire jouer ou
   rejoindre le compte e2e n'est pas destructif. `npm run export:db` est une lecture.

6. Le harnais : npm run e2e en 18 à 55 s, e2e:playthrough en 15 à 70 s, e2e:board3d en 6 à 10
   min, e2e:abandon en 10 s, e2e:coop en 2 à 3 min (deux specs, hors de npm run e2e ; il
   abandonne le match e2e en cours pour atteindre le lobby, et abandonne le match coop qu'il
   ouvre), e2e:account en 8 s (hors de npm run e2e : il change le mot de passe du compte e2e et le
   remet dans un `finally` ; s'il casse entre les deux, le compte garde l'original suivi de
   `-tmp`, à remettre à la main). **Ne lance jamais npm test et e2e:board3d en même temps** : à
   2 fps sous GL logiciel le bandeau « Your turn » de 1,2 s est raté et le spec tombe. Le crochet
   window.__boomball (DEV seulement) : fx(), audio(), crowd(), lastSaid(), probe(), clickCell,
   act, legalSummary ; `yours` du crochet est faux derrière le briefing (utiliser waitFor sur
   « Into the silo », jamais isVisible). waitForPlayableTurn répond à la popup à l'écran. Le smoke
   échoue si le match e2e atteint le round 10 pendant ses trois tours (le suivant en ouvre un
   neuf ; une sonde qui joue le match e2e le fait avancer, c'est arrivé le 17) ou si le Giff e2e
   est cerné (npm run e2e:abandon). Juste après un déploiement la connexion de global-setup.ts
   peut expirer une fois : relancer. Si mon npm run dev occupe 5173 sans le crochet :
   VITE_BOOMBALL_HOOK=1 VITE_BOOMBALL_PATIENT=1 npx vite --port 5174 --strictPort depuis
   boomball/client en arrière-plan, chauffer par deux curl, BASE_URL=http://localhost:5174, le
   tuer après (netstat -ano, taskkill). Le spec 3D admet deux avertissements console qui ne sont
   pas à nous (THREE.Clock, GL logiciel) ; toute autre ligne le fait échouer, y compris
   l'avertissement de `send()` hors abonnement. Firefox est installé pour Playwright
   (`firefox-1555`) ; une passe navigateur est une sonde jetable dans scripts/ (connexion par
   l'écran, hub, lobby ou reprise, briefing, plateau, console lue), supprimée après ; un Chromium
   sans WebGL se lance avec `--disable-3d-apis`. Pour lire ce que le harnais a envoyé : la trace
   Playwright de e2e/test-results/ (vidée à chaque run) ; pour voir la présence Realtime, une
   sonde Playwright qui écoute `page.on('websocket')` et filtre les trames `presence`.

7. useMatch.load porte un compteur de génération, ne l'enlève pas ; useMatch.stateRef est écrit
   partout où setState l'est ; sendMany(actions, asUnitId, quiet) porte sendAs et knock. Le
   bash de l'outil casse sur les accents graves et les apostrophes dans un heredoc : pour une
   série de remplacements, un script Python écrit dans le scratchpad, lancé avec python -I.
   Jamais Html de drei. La caméra ne passe pas par OrbitControls. Le corps du pion est le Giff
   riggé (giffRig.ts). Les hooks de Match.tsx restent au-dessus du retour anticipé sur state.
   **La présence Realtime est limitée en débit par le serveur et la sanction est la fermeture du
   canal** (C34) : jamais un `track` par touche ni par rendu, toujours par `useLobbyChannel.track`.
   Un module client testé par vitest n'importe jamais lib/supabase.ts (il jette sans son
   environnement) : les parties pures vivent à côté (lobbySeats.ts, roll.ts, coopClock.ts).
   `supabase.channel(topic)` rend l'instance existante d'un même topic : ne jamais tenir deux
   fois le même canal dans deux composants, c'est pour ça que le lobby est dans App. **`signOut`
   est à `scope: 'local'`** (ce navigateur) : un `global` révoquerait les sessions des autres
   specs du run. **`useAccount.load(null)` remet `loadedForRef` à `null`**, sinon une reconnexion
   dans la même page insère un profil existant (409). **`webglAvailable()`** est demandé une fois
   par page dans `Match.tsx` : sans WebGL, 2D forcée et bouton « No 3D here ».

8. L'initiative (écart 51) est un ordre sans comptes ; un humain Trajector ou Bulwark joue en
   dernier de son rôle (écart 55) ; un humain Striker ou Breaker choisit sa place (écart 58), et
   à plusieurs humains du rôle c'est le premier au d20 qui choisit, les autres derrière (écart
   65) ; écart 62, l'équipe qui encaisse rejoue Trajector, Strikers, Bulwark, Breakers ; écart 53,
   penaltyBox ; 53 bis ; écart 56, turn.startedAt ; 57 ; 59 à 61 ; 63, turn.freePass ; 64, le
   rebond part de la bouche. Deux faits de règle sans décision : l'équipe qui a l'humain joue
   juste après le Spark à chaque round ; la dérive du Spark traverse les unités. Fait de la
   coop, sans décision : une équipe A dont le dernier humain a remis son siège n'a plus d'humain,
   et les deux camps alternent de round en round (sideOrder).

9. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé
   dans un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball
   Interface.html en entier (ses images sont compressées dans le bundle, inextractibles par une
   regex base64 ; le gabarit s'extrait par la commande du design/README.md). Mon jeton GitHub du
   .env n'a pas le droit de lire les Actions ni les secrets du dépôt : pour le maintien en vie,
   c'est moi qui regarde l'onglet Actions (vert le 17 à 12:53).

10. Les commandes. Depuis boomball/ : npm test (771), npm run typecheck, npm run sweep, npm run
    e2e, e2e:playthrough, e2e:board3d, e2e:abandon, e2e:coop, e2e:account, npm run build:function,
    npm run export:db. Depuis boomball/client/ : npm run dev sur http://localhost:5173 (jamais
    127.0.0.1), npm run build, npm run typecheck. Depuis la racine : python
    boomball/supabase/checks/rls-check.py et browser-path.py, python .claude/scripts/check_drift.py.
    Le cwd de l'outil Bash se réinitialise entre deux appels : chemins absolus, ou npm --prefix.

11. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2, les écarts 27 à 65 de 00
    partie C, et C11 à C35 en entier. Dette connue, outre la revue : `Match.tsx` appelle
    `onFinished` à chaque rendu une fois la phase finie (à borner par un `useRef`) ; « Giff picks
    the league » et « Giff starts the match » se répètent dans la barre du membre ; `mergeRoll`
    reste côté client, inutile depuis 0012 ; la RPC garde le nom `battery_members` et
    `create-match` et `abandon_match` disent encore « battery » jusqu'au prochain redéploiement ;
    le nom du joueur sur la plaque des autres pions humains ; le bandeau « Your turn » qui reste sa
    durée après un siège remis ; un spectateur ne frappe pas à la porte ; `e0d9b642` (moteur 10)
    et tous les matchs antérieurs ne se rejouent plus ; arenas.art et le champ art nomment trois
    JPEG retirés ; substituteEntry non lu ; la parade du Breaker humain automatique ; le fondu
    croisé des foules sans compensation ; le délai de l'annonceur compté depuis le début du clip ;
    une réplique en cours jette le KO d'un coup suivant ; la coupure par un but ne libère pas le
    plancher ; FEED_LIMIT 120 ; le Spark peut rebondir plusieurs rounds dans une poche ; un
    gardien peut marcher jusqu'à côté d'un receveur marqué pour une passe d'une case ; le Shove
    d'un Bulwark n'est borné que par l'adjacence ; le Dash tenu n'existe que côté client ; en 3D,
    l'orientation du modèle, le noir sous la lèvre avant, l'orbite remise à la vue fixe au retour
    du 2D, la borne de suivi à l'azimut zéro, la roulette en vue large, le pan sous Ctrl
    interrompu au-dessus de la minicarte, la largeur garantie à l'inclinaison de départ, la
    répétition de la foule en vue large, l'effacement des gradins jugé sur la hauteur, la retenue
    en boîte, les captures des effets courts figées sous le GL logiciel, le ballon qui ne
    disparaît pas dans la bouche, pas d'étincelles en 2D, les commentaires « 2H.23 » de
    Tokens.tsx ; n14 du rapport, le roster écrit avant la validation des sièges ; les quatre
    fichiers du vault modifiés hors de nos sessions, à moi de décider.

12. Un fait de données : le second compte e2e (`BOOMBALL_E2E2_EMAIL`, `BOOMBALL_E2E2_PASSWORD`,
    affiché « E2E Second ») est membre de DEUX équipes, « E2E Battery » et « Shrapnel oath », MON
    équipe (compte tackergamingrss@gmail.com). `coop.spec.ts` bascule sur « E2E Battery » par le
    menu quand son hub s'ouvre ailleurs. Ne le retire pas de mon équipe sans me le demander.

13. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte,
    après avoir récrit ce fichier.
