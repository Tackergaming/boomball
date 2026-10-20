# Audit technique et plan 3D

> Écrit le 2026-10-09 par le fil principal (Fable 5.1), au terme d'un chat d'audit sans écriture de
> code. Un sous-agent `claude-code-guide` a documenté les options Claude Code de la section 6 ; tout
> le reste est du fil principal. **Ce document est le point de départ du chat de développement** :
> il porte l'état mesuré, les décisions prises avec Jérôme et leur date, et la feuille de route par
> phases. `04-etat-des-lieux.md` reste l'historique de ce qui a été construit et pourquoi, et il ne
> faut pas le relire pour décider : tout ce qu'il faut en savoir pour avancer est repris ici.
>
> **Unité d'effort utilisée partout : la séance**, une session de travail Claude Code d'environ deux
> heures, bornée à un commit. **Sévérités : bloquant, majeur, mineur.**

---

## 1. Résumé

### 1.1 Où en est le jeu, en chiffres mesurés le 2026-10-09

| Mesure | Résultat | Ce que ça dit |
|---|---|---|
| `npm test` | 273 tests verts, 14 fichiers, 7,2 s | Le chiffre de `04` est exact |
| `npm run typecheck` racine, scripts, client | Trois fois vert | |
| `npm run sweep` | **109 s**, pas 4 min. 1,66 / 1,93 / 2,29 buts par match, A/B 95-91, 83-104, 96-90 | Identique au bit près au tableau de `04`. Le moteur est déterministe et l'équilibrage n'a pas bougé |
| `npm run build` client | JS 434 Ko (126 Ko gzip), CSS 2,5 Ko, **images 5,9 Mo sur 6,2 Mo** | Le téléchargement est à 95 % des trois JPEG |
| `check_drift.py` | Aucune dérive | |
| Moteur et IA, banc de mesure | 127 ms par match IA contre IA, 394 actions et 744 événements par match, **0,32 ms par décision d'IA**, `reduce` à 0,006 ms, `MatchState` 6,1 Ko en JSON | Rien à optimiser côté règles |
| Taille du code | 16 100 lignes, dont `engine/reduce.ts` 1 198 et `client/src/match/Board.tsx` 724 | |
| `npm audit` | Racine : 7 vulnérabilités, 2 critiques (tinypool via vitest 2) et 1 haute (source-map-js), outillage de test seulement. Client : 1 haute (source-map-js, outillage de build) | Rien dans le bundle livré |
| `npm outdated` | react 18 → 19, vite 6 → 8, vitest 2 → 5, typescript 5.9 → 7, supabase-js 2.113 → 2.117 | Le passage à React 19 est requis par react-three-fiber 9 |
| Supabase, lu par l'API de gestion | **Projet `boomball` trouvé en pause (INACTIVE)**, restauré à 19:44 UTC avec le feu vert de Jérôme, sain à 19:48. Fonctions `resolve-action` v7 et `create-match` v6 du 2026-09-02, `verify_jwt` actif. Base 13 Mo, 2 840 événements pour 4 matchs, RLS active sur les neuf tables, PostgreSQL 17.6, aucune sauvegarde (PITR absent du plan gratuit) | Le jeu était injouable depuis la deuxième semaine de septembre et personne ne l'a vu |
| Vercel, lu par l'API | Compte `montigny-8072`, plan Hobby, aucun projet Boomball, aucun lien Git | Le déploiement reste entièrement à faire |
| Machine de Jérôme | Windows 11, Chrome 154, Node 24.19, Python 3.10, RTX 4060 portable + Intel UHD, 64 Go, Claude Code 2.1.274 dans VS Code, app de bureau Claude installée, **aucun outil navigateur dans la session**, Playwright absent avant ce chat | |
| Premier regard d'une IA sur l'écran | **Fait dans ce chat** : connexion, création d'une batterie, ouverture d'un match, un déplacement cliqué, fin de tour, dix captures. Aucune erreur de page, un 401 au chargement, deux avertissements React | Le point aveugle de `04` est levé, voir §6 |

**Le playtest humain du terrain vertical n'a jamais eu lieu.** Jérôme l'a confirmé. Tout ce qui
touche à l'écran depuis le 2026-09-02 n'a été regardé que par ce chat, en deux tours de jeu par
script.

### 1.2 Les décisions prises dans ce chat, le 2026-10-09

| # | Décision | Qui | Détail |
|---|---|---|---|
| D1 | **Option 2, 2.5D stylisée**, Three.js via react-three-fiber, dans le client React actuel | Jérôme, sur ma recommandation | Caméra fixe face à la paroi, géométrie construite depuis le layout, pions stylisés, événements animés. L'option 1 reste atteignable plus tard, l'option 3 est exclue |
| D2 | **Playwright MCP + scripts Playwright** comme dispositif de contrôle d'écran | Jérôme, sur ma recommandation | Profil Chrome séparé, compte de test dédié, crochet de test en développement seulement |
| D3 | **Le 3D d'abord, le déploiement à la fin** | Jérôme, **contre ma recommandation** de livrer la 2D à ses amis d'abord | Le plan garde un jeu jouable en local à la fin de chaque phase. Conséquence assumée : les amis ne jouent pas avant la fin, et le projet Supabase doit être maintenu en vie pendant le développement |
| D4 | `CRACKER_MOVE_CELLS` : **re-mesurer sur le terrain vertical, puis 10 si confirmé** | Jérôme | Un sweep à 10 en phase 2, arbitrage ensuite, écart à verser au règlement si appliqué. **Confirmé le 2026-10-10 en 2H.3, sur le terrain horizontal : 10, écart 40 de `00` partie C** |
| D5 | **Done = solo en 2.5D, en ligne, stable sans Jérôme, plus la coop à 2 ou 3** | Jérôme | Le son et les temps forts de l'écran de résultats sont hors done, en phase optionnelle |
| D6 | **Compte de test e2e créé par l'API admin**, identifiants dans `.env` sous `BOOMBALL_E2E_EMAIL` et `BOOMBALL_E2E_PASSWORD`, jamais imprimés | Jérôme, feu vert | Fait. Batterie « E2E Battery » et un match de test ouvert avec ce compte |
| D7 | **Maintien en vie de Supabase par un workflow GitHub Actions planifié** | Jérôme | Un ping quotidien de l'API REST avec la clé anon en secret du dépôt. Le dépôt est déjà sur GitHub, aucun lien Vercel |
| D8 | **Relevé au pixel de l'arène 2D abandonné** | Jérôme | En 2.5D le décor est construit depuis le layout, l'écart disparaît par construction |
| D9 | **Projet Supabase restauré par l'API** | Jérôme, feu vert | `POST /v1/projects/{ref}/restore`, quatre minutes |
| D10 | Budget : **zéro euro**. Matériel des amis : **portables bureautiques à GPU intégré** | Jérôme | Contraintes du plan d'assets et du budget de performance |
| D11 | **Terrain horizontal**, vu de dessus en trois quarts plongeant ; plus de chute, de vol, de grappin ni d'ancrage ; plus de coût de zone ; des obstacles avec collision et contournement | Jérôme, **le 2026-10-10**, après sa première partie, avec autorisation explicite de passer outre toute règle écrite qui le contredit | Le plan est `08-plan-terrain-horizontal.md`, **go donné le soir même**, arbitrages J1 à J7 tranchés, partie C du règlement écrite. Il remplace les phases 2 à 6 de §7 et rouvre l'équilibrage par nécessité. D1 à D10 tiennent |

### 1.3 Référence perdue

`04` cite un plan validé à `~/.claude/plans/salut-jarvis-donc-comme-clever-elephant.md`. Le dossier
n'existe plus. Les décisions produit qu'il portait sont reprises dans `04` section « Décisions
produit verrouillées », qui en tient lieu. Rien n'est à chercher.

---

## 2. L'audit

### 2.A Ce qui reste à faire

Ce qui était listé dans « Ce qui attend Jérôme » de `04`, puis ce que les docs n'ont jamais listé.
Les lignes vues à l'écran dans ce chat sont marquées « vu ».

| # | Quoi | Où | Pourquoi ça compte | Sévérité | Séances |
|---|---|---|---|---|---|
| A1 | **Playtest humain du terrain vertical**, jamais fait | Jérôme, `npm run dev` | Tout l'écran depuis le 2 septembre repose sur deux tours joués par script | Bloquant | 0, c'est à Jérôme |
| A2 | **Déploiement Vercel par l'API**, projet à créer, fichiers construits à envoyer, `site_url` à changer | `scripts/` à écrire, Supabase auth config | **Fait le 2026-10-16** : `scripts/deploy-vercel.mjs`, projet `boomball` sans lien Git, `https://boomball.vercel.app` (journal §10). `site_url` reste à changer par propreté | Majeur | 1 |
| A3 | `/security-review` | Jérôme la lance | Avant la mise en ligne | Majeur | 0,5 |
| A4 | **Compteur de victoires** : 1 victoire pour 3 matchs gagnés | `teams.wins`, lu en base | L'ordre des quatre matchs en base colle à l'hypothèse de `04` : seul le dernier, 50-30, a été compté après la migration 0003. Se tranche à la prochaine victoire, humaine ou par script | Majeur | 0,25 |
| A5 | **Fait le 2026-10-10 en 2H.3.** Crackers mesurés à 6 et à 10 sur le terrain horizontal, tableau dans `09-equilibrage-2H3-2026-10-10.md`, Jérôme a tranché 10 : écart 40 de `00` partie C, `CRACKER_MOVE_CELLS = 10` | `engine/constants.ts`, `00-reglement-v2.md` C4 et C6 | Décision D4 | Clos | 0 |
| A6 | **Fait le 2026-10-17 en 2H.32 et 2H.33** (`00` C32, journal §10) : le code d'invitation et le lobby partagé (migration `0011`), les tours des autres humains rejoués, le coup à la porte par tous, le siège remis à la maison, le spectateur, `coop.spec.ts`. Sa porte : la partie de Jérôme à deux. **La coop à 2 ou 3** : rejoindre une batterie, sièges 2 et 3 du lobby, les tours des autres humains rejoués à l'écran, `useAccount` qui ne trouve une équipe que par `owner` | `client/src/screens/Lobby.tsx`, `TeamHub.tsx`, `lib/useAccount.ts`, `match/useMatch.ts`, deux migrations | Décision produit verrouillée de `04`, et dans le done (D5) | Codé, porte ouverte | 0 |
| A7 | **Fait le 2026-10-10 en 2H.4**, sous-agent (j) : échelle compacte, tous les échelons visibles sans défiler à 1440 x 900, et « You are up » ou « You play in N » dans l'en-tête. Vu sur capture. **Échelle d'initiative coupée** (vu) : à 1440 x 900 seules quatre rangées sont visibles, le bloc des six alliés de Jérôme est hors de vue sous « Probe », et il faut faire défiler pour savoir quand on rejoue | `client/src/match/Ladder.tsx`, `screens/Match.tsx` grille de droite | Le brief de design demandait que l'échelle dise d'un coup d'œil quand le joueur rejoue | Clos | 0 |
| A8 | **Sans objet depuis D11** : plus d'ancrage. **Cases sans ancrage jamais montrées** (vu) : le plateau éclaire les cases atteignables mais rien ne distingue celles où finir le tour fait chuter | `client/src/match/Board.tsx` | Le brief de design le demandait, et c'est la règle la plus punitive du sport. L'avertissement `!` n'apparaît qu'après coup | Clos | 0 |
| A9 | **Fait le 2026-10-10 en 2H.4**, fil principal. Confirmé au harnais : le marqueur de round apparaissait deux fois dans le fil. La diffusion arrive **avant** la réponse HTTP, donc ni « est-il en avance sur ce que je tiens » ni « ma requête l'a réclamé » ne suffisait ; le fil dédoublonne par `fromSeq`, quelle que soit la copie qui arrive la première, et `smoke.spec.ts` l'affirme désormais. **Écho Realtime** : le client s'abonne au canal du match et la fonction diffuse chaque lot, y compris au client qui l'a demandé. Le gestionnaire de diffusion ajoute les événements au fil **et** relit le snapshot, alors que la réponse HTTP les ajoute aussi et lance le rejeu. Lu dans le code, à vérifier à l'écran : lignes du fil en double, et un saut du plateau à l'état final en plein rejeu | `client/src/match/useMatch.ts`, effet `channel(...)` et `send()` | Si confirmé, c'est visible à chaque tour en solo | Clos | 0 |
| A10 | **Fait le 2026-10-17 en 2H.31**, fil principal : migration `0010_append_match_step.sql`, une fonction SQL en une transaction avec verrou `for update` et refus si `seq` a bougé ; `persist` l'appelle en un aller-retour et répond 409 au perdant de la course (`00` C32, journal §10). **Écriture non atomique et erreurs ignorées** dans `persist` : trois écritures séquentielles sans transaction ni vérification de `seq`, et le résultat de l'insert des événements n'est pas lu | `supabase/functions/resolve-action/index.ts` `persist()`, `server/persist.ts` | Invisible en solo. En coop, deux requêtes simultanées chargent le même `seq`, la seconde insertion viole la clé primaire sans que personne le sache, et le snapshot est écrasé. À régler avant A6 | Clos | 0 |
| A11 | **Fait le 2026-10-10 en 2H.4**, fil principal. Colonne `matches.engine_version` par la migration 0005, appliquée par Jérôme ; `create-match` estampille et ignore les archivés pour la règle du match unique ; `resolve-action` refuse une autre version en 409 avec une raison lisible (`engineVersionRefusal`, testée) ; le client ne reprend jamais un match archivé et le hub en donne le compte. **Aucune version du moteur sur les matchs** : ni `MatchState`, ni les événements, ni `matches` ne portent de version. Un match inachevé en base est rechargé par n'importe quel moteur futur | `supabase/migrations/`, `engine/constants.ts`, les deux fonctions, `client` | Dès que le 2.5D ou la coop touchent au moteur ou aux événements, un match ouvert sur l'ancienne version casse sans message | Clos | 0 |
| A12 | **Fait le 2026-10-10 en 2H.4**, fil principal. `useAccount` lit `error` sur ses trois lectures et s'arrête à la première qui échoue ; `App` affiche « The silo is not answering » avec le message du serveur à copier et un bouton réessayer. **États d'erreur du chargement** : `useAccount` ignore `error` sur toutes ses lectures. Projet en pause ou réseau coupé, un joueur signé atterrit sur « Raise a battery » comme s'il était nouveau, et le bouton échoue sans explication. Lu dans le code | `client/src/lib/useAccount.ts`, `App.tsx` | C'est exactement l'écran que ses amis auraient vu en septembre | Clos | 0 |
| A13 | **Écrit le 2026-10-10 en 2H.4**, fil principal : `.github/workflows/supabase-keepalive.yml`, cron quotidien, échec si autre chose que 200. **Attend les deux secrets de dépôt posés par Jérôme et une première exécution manuelle.** **Maintien en vie du projet Supabase** (D7) | `.github/workflows/supabase-keepalive.yml`, secrets du dépôt par Jérôme | Sans lui, pause après sept jours sans trafic, et fenêtre de restauration limitée (90 jours selon les docs, un an selon d'autres pages) | Clos | 0 |
| A14 | **Fait le 2026-10-10 en 2H.4**, fil principal : le compte est borné à `TURN_TIMER_SECONDS`. **Chrono affiché à 121 s** (vu) : le compte à rebours dépasse `TURN_TIMER_SECONDS` d'une seconde au premier rendu, parce que `now` peut être antérieur à l'instant de reprise de la main | `client/src/screens/Match.tsx`, calcul de `left` | Cosmétique | Clos | 0 |
| A15 | **Fait le 2026-10-10 en 2H.4**, sous-agent (g) : le ballon libre est la dernière couche du plateau, au-dessus des pions et des plaques. **Payload libre masqué** (vu) : l'anneau et le mot PAYLOAD sont dessinés sous les tokens et leurs plaques de nom, donc un ballon posé à côté d'un joueur disparaît | `client/src/match/Board.tsx`, ordre des couches | Le ballon est tout le sport | Clos | 0 |
| A16 | **Fait le 2026-10-10.** Le 401 ne s'est pas reproduit ; le harnais a trouvé à sa place un **409 sur `POST /rest/v1/profiles` à chaque connexion** : `App` insérait un profil qui existait, parce que `useAccount` gardait le profil `null` de l'état déconnecté à côté du nouvel id le temps d'une lecture. Corrigé par un état `undefined`, « pas encore lu », seul `null` déclenchant l'insertion. Les avertissements React venaient de sept objets de style mêlant un raccourci et une propriété longue (`Ladder`, `Board`, `Feed`, `Announce`, `Results`, `TeamHub`, `SeatPanel`), tous passés en propriétés longues. `smoke.spec.ts` et `global-setup.ts` échouent désormais sur tout avertissement et toute réponse 400 ou plus | `client/src/lib/useAccount.ts`, `App.tsx`, les sept composants | Un défaut qu'on ne lit plus est un défaut qui reste | Clos | 0,25 |
| A17 | **Verdict corrigé le 2026-10-10 en 2H.4**, sous-agent (j) : la feuille lit les événements `scored` du match et dit « on the Spark » quand le vainqueur aux buts seuls diffère du résultat. Vu sur capture, 30 à 10 « Won on the Spark ». Les temps forts restent hors done. **Écran de résultats** : « Won on the Payload » même quand le Spark a décidé, temps forts non dérivés des événements, promotion non signalée | `client/src/screens/Results.tsx` | Hors done pour les temps forts, mais le verdict faux est un défaut | Clos | 0 |
| A18 | **Fait le 2026-10-10 en 2H.4**, sous-agent (j) : le lobby lit et écrit `team_members.character_name` par un upsert sur `(team_id, profile_id)`, politique `team_members_write`. **Nom de personnage non conservé** entre deux matchs : `02` dit que `team_members.character_name` le garde, le lobby ne l'écrit jamais et préremplit avec le nom de profil | `client/src/screens/Lobby.tsx` | Petit écart doc / code | Clos | 0 |
| A19 | **Fait le 2026-10-10 en 2H.4**, fil principal, J5 : les trois JPEG sont retirés du dépôt et du bundle, une seule image convertie en WebP de 103 Ko pour l'écran de connexion. Le bundle passe de 5,9 Mo d'images à 103 Ko. **Images** : trois JPEG 2048², 5,9 Mo. À convertir en WebP, et à décider si elles servent de texture de paroi en 2.5D | `assets/arena/`, `client/src/lib/arena.ts` | 95 % du téléchargement | Clos | 0 |
| A20 | **Montées de version** : React 19 (requis par react-three-fiber 9), vitest 5, `npm audit fix` pour source-map-js | `package.json` des deux paquets | Préalable au 2.5D | Mineur | 0,5 à 1 |
| A21 | **Fait le 2026-10-10**, les deux contrôles chargent le `.env` du workspace eux-mêmes, comme `apply-migration.mjs`. `live-match.ts` (via `run-ts.mjs`) et `deploy-edge-function.mjs` veulent encore leurs variables à la bash | `supabase/checks/*.py` | Une étape qu'on ratait | Clos pour les contrôles | 0 |
| A22 | **Fait le 2026-10-10 en 2H.4** : `02` porte la colonne de version, `01` ouvre sur un bandeau qui dit que l'image ne gagne plus sur le plan. **Docs en dérive** : `02` dit un chrono de 60 s (120 depuis le 2 septembre) ; `01` finit sur « l'image gagne sur le plan », contredit par D8. Le skill `boomball` et `05` sont à jour depuis le 2026-10-10 | `02-architecture.md`, `01-prompts-arene.md` | Un chat neuf les croit | Clos | 0 |
| A23 | **Sauvegardes** : aucune sur le plan gratuit. Un script d'export JSON hebdomadaire des tables de référence et des équipes suffit à un cercle d'amis | `scripts/export-db.mjs` à écrire | Les seules données qui comptent sont les victoires des équipes | Mineur | 0,5 |
| A24 | **Écrit le 2026-10-10 en 2H.4**, fil principal : `.github/workflows/ci.yml`, test, typecheck et build du client sur tout push touchant `boomball/`. **Tourne pour la première fois au prochain push de Jérôme.** **CI** : aucune. Un workflow qui lance test, typecheck et build du client sur chaque push touchant `boomball/` | `.github/workflows/ci.yml` | Un dépôt qui ne se vérifie pas tout seul finit par casser sans bruit | Clos | 0 |
| A25 | **Audio** : inexistant. Six sons CC0 suffiraient | client | Hors done (D5) | Mineur | 1 |
| A26 | `projet test` occupe le second des deux projets gratuits de l'org Supabase | Dashboard, Jérôme | À supprimer le jour où un troisième projet est voulu | Mineur | 0 |
| A27 | **Secret JWT du projet** apparu dans un résultat d'outil de ce chat, en lisant la configuration PostgREST par l'API de gestion. Jamais recopié | Dashboard, Jérôme | Risque faible tant que les transcripts restent sur sa machine. Le faire tourner régénère aussi les clés anon et service, donc `.env` et `client/.env.local` | Mineur | Jérôme décide |
| A28 | **Fait le 2026-10-10 en 2H.4**, fil principal : `serveAction` dans `session.ts` règle l'expiration **ou** joue l'action, jamais les deux, trois tests dans `session.test.ts` ; `resolve-action` n'a plus qu'un chemin de persistance. **Une action en retard est appliquée au tour suivant.** Trouvé au harnais le 2026-10-10. `resolve-action` règle l'expiration par `expireIfDue`, qui fait jouer la maison jusqu'au tour humain suivant, puis **soumet l'action reçue à ce nouveau tour** ; si elle y est légale elle est appliquée, et la réponse ne porte même pas `expired`. Seule une action illégale sur le nouveau plateau prend le chemin `expired`. Mesuré : match ouvert au round 2 avec un chrono passé, un `endTurn` envoyé, tour suivant au round 4. Un `endTurn` après le chrono, **dont le coup à la porte du client**, coûte donc deux tours | `supabase/functions/resolve-action/index.ts`, après `expireIfDue` | C'est une partie de ce que Jérôme décrivait quand « dix rounds avaient passé ». Correctif : quand `overdue` est non nul, ne pas soumettre l'action et répondre `expired` ; un test dans `session.test.ts` ; redéploiement de la fonction | Clos | 0 |
| A29 | **Fait le 2026-10-10 en 2H.4** avec le feu vert de Jérôme : `resolve-action` v8 et `create-match` v7 déployées après la migration 0005. Vérifié au harnais : un match entier joué par script, 30 à 10, le Spark compté 20. **Les fonctions déployées sont en retard sur le moteur.** Trouvé en lisant les événements des deux matchs joués au harnais le 2026-10-10 : `scored(B, 50)` sur une prise du Spark, alors que `engine/constants.ts` dit `SPARK_POINTS = 20` depuis le commit c9be92c du 2026-09-02, « Ramène le Spark à deux buts », et que `04`, `CONTEXT.md` et `check_drift.py` disent 20. `resolve-action` v7 a donc été bundlée avant ce commit. Le jeu en ligne joue un Spark à cinq buts, et le tableau d'équilibrage de `04` ne décrit pas ce qui est déployé. Le commentaire de `scripts/live-match.ts` dit encore « 50 for the Spark » | `npm run deploy:function` pour les deux fonctions, `scripts/live-match.ts` | C'est exactement ce que A11 existe pour attraper : sans version sur les matchs, personne ne voit qu'un moteur déployé diverge. À redéployer avec le feu vert de Jérôme, parce que ça change le jeu en ligne, et A11 juste derrière | Clos | 0 |
| A30 | **Sans objet depuis D11** : plus d'image sous le plateau, le terrain est dessiné depuis le layout. **Le terrain ne se lit plus sous le noircissement** (retour 1 de la première partie de Jérôme, 2026-10-10). L'art est filtré à 50 % de luminosité, lavé d'un voile sombre, et chaque case de structure est peinte à 82 % d'opacité par-dessus : sur les captures, les passerelles de l'image disparaissent derrière le quadrillage | `client/src/match/Board.tsx`, `S.art`, `S.wash`, remplissage des cases | La 2D reste le repli derrière l'interrupteur jusqu'au bout, et c'est l'écran de la phase 2. Alléger le voile et l'opacité des cases, juger sur capture | Clos | 0 |
| A31 | **L'IA n'est ni lisible ni tactique pour un humain** (retours 3 et 4) : après un but marqué par Jérôme, tous ses alliés se sont massés autour de son Bulwark et n'en sont jamais repartis ; dans l'ensemble il n'a pas compris ce que la maison et ses coéquipiers cherchaient. L'équilibrage est mesuré IA contre IA, il ne dit rien de ce qu'un humain comprend. Le `payloadReset` après un but et la valeur de position « défendre » sont les premiers suspects, et la leçon de `positionValue` s'applique : une heuristique doit valoriser la case qui rend une action possible | `ai/`, à reproduire d'abord au harnais avec une capture après un but | **Reproduit et corrigé en 2H.2 le 2026-10-10**, voir §10 : la cause était un coéquipier sans aucune raison de s'écarter de son gardien dans sa propre moitié, corrigée par la valeur de relais `outlet`. Le sweep de contrôle a bougé, signalé en §10. La partie « lisible pour un humain » se juge à la porte de 2H.4 | Corrigé, à juger en 2H.4 | 0 |
| A32 | **Clos le 2026-10-10 en 2H.3.** La portée de tir a paru trop longue (retour 6). Mesurée à 9/12, 7/10 et 6/9 sur le terrain horizontal : les deux portées courtes font passer le rookie sous un but par match et montent les matchs sans but. **Jérôme garde 9/12**, écart 39 de `00` partie C, rien ne change dans le code | `docs/00` C6, `09-equilibrage-2H3-2026-10-10.md` | L'impression venait du terrain vertical sans obstacles | Clos | 0 |

### 2.B Ce qui n'est pas optimisé

Mesuré, puis séparé entre lent et simplement perfectible.

| # | Sujet | Mesure | Verdict | Séances |
|---|---|---|---|---|
| B1 | Moteur et IA | 0,32 ms par décision, 127 ms par match, sweep de 600 matchs en 109 s | **Rien à faire.** Un bloc IA solo de treize unités coûte quelques dizaines de millisecondes. Paralléliser les trois Tiers du sweep sur des workers le ramènerait vers 40 s, inutile | 0 |
| B2 | `reachableCells` trie la frontière à chaque itération | Négligeable sur 675 cases et un budget de 8 cases | Perfectible, pas lent | 0 |
| B3 | Rendu React pendant le rejeu | Un beat toutes les 2,5 s rerend tout le plateau SVG, environ trois cents éléments | **Pas mesurablement lent en 2D.** En 2.5D la règle change : la scène ne doit pas se remonter par beat, les tweens vivent dans des refs. C'est une contrainte de conception de la phase 5, pas une optimisation | 0 |
| B4 | Taille du bundle | 434 Ko de JS, 126 Ko gzip | Normal. Le 2.5D ajoutera environ 700 à 900 Ko minifiés (200 à 250 Ko gzip) pour three, fiber et drei. Acceptable sur ordinateur | 0 |
| B5 | Images | 5,9 Mo, 95 % du téléchargement | **À convertir en WebP** autour de 300 Ko pièce, A19 | 0,5 |
| B6 | Edge Function `resolve-action` | Huit allers-retours base par action : deux lectures en parallèle, le siège, l'arène, l'insert des événements, l'upsert du snapshot, la mise à jour du match, la diffusion. Observé dans le navigateur : fin de tour à maison jouée en moins de 4 s, premier `create-match` après restauration en 3 s, démarrage à froid compris | Perfectible : l'arène est statique et peut être gardée par isolat, le siège peut être joint. Gain de l'ordre de 100 à 200 ms par action. L'atomicité (A10) importe plus que la vitesse | 0, fondu dans A10 |
| B7 | Realtime | Une diffusion par action même en solo, pour un seul abonné qui est l'appelant | Inoffensif. 2 millions de messages par mois sur le plan gratuit, un match en consomme trente | 0 |
| B8 | Requêtes et index | Index présents sur `matches(team_id, created_at)`, `match_participants(profile_id)`, la clé unique `(match_id, profile_id)`, `match_events(match_id, seq)` et `(match_id, kind)`. Toutes les requêtes des fonctions et du client les utilisent | Rien à ajouter. 700 événements et 1,1 Mo par match : le plan gratuit en tient plus d'un millier | 0 |
| B9 | Ouverture du match côté client | 120 derniers événements lus pour le fil, puis le snapshot | Normal | 0 |

### 2.C Ce qui n'est pas prêt pour de vrais joueurs

La barre : **les amis de Jérôme se connectent et jouent un match complet sans lui dans la pièce.**
Jeu privé, jamais vendu ni publié, donc rien n'est dimensionné pour plus d'une dizaine de joueurs.

| # | Sujet | État | Risque | Recommandation | Séances |
|---|---|---|---|---|---|
| C1 | **Mise en pause du plan gratuit** | **S'est produite** : projet en pause trouvé le 2026-10-09, jeu injouable depuis la mi-septembre | Bloquant | D7, workflow GitHub Actions quotidien (A13). Procédure de restauration documentée en §8 | 0,5 |
| C2 | Authentification | Email et mot de passe, confirmation désactivée, JWT 1 h avec rotation du refresh token, session persistée. Mot de passe de 6 caractères minimum | Faible | Garder. Ajouter la sortie propre sur `SIGNED_OUT` : aujourd'hui un refresh raté donne « you are signed out » dans le match sans issue hors rechargement | 0,25 |
| C3 | Inscriptions ouvertes | `disable_signup` à faux : quiconque a l'URL et la clé anon peut s'inscrire et jouer | Faible, c'est un cercle d'amis et le coût est en invocations | Une fois les amis inscrits, Jérôme peut couper les inscriptions dans le dashboard. Son choix, voir §8 | 0 |
| C4 | RLS et les deux fonctions à clé service | Policies lues et cohérentes avec `04`. Identité lue dans le JWT, jamais dans le corps. Ordres validés contre le plateau. `record_team_win` révoquée aux clients. Les deux contrôles Python existent mais n'ont pas pu tourner dans ce chat (projet en pause pendant la lecture, puis écritures de test réservées à Jérôme) | Faible | Jérôme relance `rls-check.py` et `browser-path.py` après A21, puis `browser-path.py` avec `ORIGIN` de l'URL Vercel après A2 | 0,25 |
| C5 | Clé anon dans le bundle | Par conception, protégée par la RLS, pas de policy d'écriture sur les tables de match | Aucun | Rien | 0 |
| C6 | Reprise en cours de match | Rechargement : bannière du hub puis reprise sur le snapshot. Canal Realtime rejoint tout seul, `seq` comparé. En solo c'est suffisant | Faible en solo | En coop, les clients des coéquipiers ne rejouent pas les lots diffusés, ils relisent le snapshot : ils verraient des téléportations. À traiter dans A6 | fondu dans A6 |
| C7 | Chrono de 120 s sous latence | Compté depuis le retour de la main, corrigé du décalage serveur, coup à la porte à double condition. Réponse `expired` gérée | Faible | Garder. Prévoir un drapeau de développement qui coupe le coup à la porte, pour les scripts (§6) | 0,25 |
| C8 | États d'erreur et états vides | Refus et pannes réseau affichés dans les formulaires et le match. **Mais** le chargement du compte ignore les erreurs (A12), et un projet en pause ressemble à un compte neuf | Majeur | A12 | 0,5 |
| C9 | Versionnage de `MatchState` et des événements | Inexistant (A11) | Majeur dès la phase 3 | A11 : colonne `engine_version` sur `matches`, constante dans le moteur, refus explicite au chargement d'une version différente, message côté client | 0,5 |
| C10 | CI | Aucune | Mineur | A24 | 0,5 |
| C11 | Journalisation et supervision | `console.error` côté client, journaux des fonctions dans le dashboard Supabase | Mineur pour un cercle d'amis | Un bouton « copier le diagnostic » dans l'écran d'erreur, qui copie l'id du match, le `seq` et le dernier refus. Pas de service tiers | 0,25 |
| C12 | Sauvegardes | Aucune, PITR hors plan gratuit | Mineur | A23 | 0,5 |
| C13 | Limites du plan gratuit Supabase | 2 projets actifs (plafond atteint), 500 Mo de base, 500 000 invocations de fonction par mois, 2 millions de messages Realtime, 5 Go de sortie | Aucun à l'échelle d'un cercle d'amis : un match consomme trente invocations et 1 Mo | Rien | 0 |
| C14 | Limites Vercel Hobby | Usage non commercial autorisé, 100 Go de bande passante par mois, déploiement par l'API sans dépôt Git possible (`POST /v13/deployments` avec fichiers en ligne ou envoyés par SHA) | Aucun | A2 | fondu dans A2 |
| C15 | Navigateurs | Chrome et Edge de bureau vérifiés par ce chat (Chromium). Firefox et Safari jamais ouverts. ES2022, `aspect-ratio`, `ResizeObserver` : supportés partout depuis 2021 | Faible | Une passe Firefox par Jérôme avant la mise en ligne. WebGL2 universel sur ordinateur, pas de WebGPU requis | 0 |
| C16 | Accueil d'un nouveau joueur | Le briefing explique l'objectif, les trois marqueurs, les zones, le tour et l'appel de balle. Il ne dit pas ce qu'est l'ancrage ni ce que signifie le `!` | Mineur | Une ligne dans le briefing, et A8 qui le montre sur le plateau | 0,1 |
| C17 | Audio | Aucun | Hors done | Phase optionnelle | 1 |
| C18 | Accessibilité de base | Cyan contre magenta, lisible pour un daltonien. Tailles lisibles à 1440 x 900. Aucune navigation clavier, aucun libellé ARIA sur le SVG | Mineur, jeu privé | Styles de focus et libellés sur les boutons, rien de plus | 0,25 |
| C19 | Secret JWT dans un transcript | A27 | Mineur | Jérôme décide | 0 |
| C20 | `site_url` à `localhost:5173` | Sans effet en mot de passe sans email | Aucun | À mettre à l'URL Vercel en A2 par propreté | 0 |

### 2.D Qualité du code et santé de l'architecture

**Le sens des dépendances de `02` tient.** Le client importe du moteur ses types, `legalActions`,
`onlyEndTurnLeft`, `pathTo`, les constantes, `statsFor`, `ladderRungs`, l'arène et `KILL_SILO`, plus
les types d'ordres de `ai/`. `server/session` n'apparaît que dans `replay.test.ts`. **Aucun appel à
`reduce` dans le client**, aucun dé, aucune légalité recalculée. Les fonctions Edge ne décident rien,
`server/session.ts` et `server/lobby.ts` portent la logique et sont testés sans réseau.

**Aucune règle ne fuit dans React.** Ce qui s'en rapproche est de la présentation dupliquée, pas une
règle : les seuils de Tier `3` et `6` recopiés dans `TeamHub.tsx` et `Results.tsx` au lieu de
`TIER_WINS_VETERAN` et `TIER_WINS_STAR`, « Round x of 10 » et « Bench x of 3 » codés en dur dans
`Match.tsx` et `TeamHub.tsx` au lieu de `MATCH_ROUNDS` et `BENCH_SIZE`, « 13 house Giff » dans le
lobby. Risque de dérive le jour où une constante bouge. Un quart de séance.

**Logique en double.** `zoneOf` existe trois fois : `engine/geometry.ts` en base 0, `client/lib/arena.ts`
en base 1, et `zoneName` dans `replay.ts`. `initials()` est écrit deux fois, `ZONE_NAME` deux fois.
Rien de grave, à regrouper quand on touche ces fichiers.

**Code mort ou jamais appelé.** `LegalActions.simple` n'est lu que par des tests. `currentSlot` et
`standing` exportés de `reduce.ts` sans consommateur. `samePoint`, `isAdjacent`, `neighbours` dans
`geometry.ts` sans consommateur. `pathCostFeet` seulement testé. L'événement `diceRolled` est déclaré
et jamais émis. `TeamHub.tsx` réexporte `ROLES` sans raison. La table `role_stats` est lue par le hub
alors que `SeatPanel` lit le moteur : deux sources pour la même ligne, documenté dans `04` mais
incohérent. À nettoyer en une demi-séance, sans urgence.

**Tests.** Le moteur, l'IA et la couche serveur sont bien couverts : 269 tests sur les 273 y vivent,
avec des matchs entiers rejoués au bit près. `sweep.report.test.ts` est un rapport et pas un test,
par conception. `seed.test.ts` tient le fichier généré. **Le client n'a que `replay.test.ts`**, quatre
tests, qui tiennent la seule logique du client qui construit un plateau. Aucun test de composant,
aucun test de bout en bout : c'est la moitié non testée du projet, et le dispositif de §6 est la
réponse. Aucun test qui ne teste rien.

**Endroits fragiles.** `persist()` dans `resolve-action` (A10). Le chemin « expiré puis refusé » de
`resolve-action` duplique la persistance et la diffusion du chemin nominal. `recordResult` suppose que
les humains sont toujours en A, ce qui est vrai par construction mais n'est pas asserté. `Match.tsx`
empile quatre effets clés sur `deadline`, `seq` et `speed`, justes mais denses : à ne pas toucher
sans le harnais de §6. Le plafond et le plancher du rejeu dans `useMatch.ts` se lisent, mais trois
réglages successifs y ont laissé une arithmétique à relire avant d'y revenir.

**Les décisions de `04` sont respectées.** Aucune raison mesurée de rouvrir une décision
d'ingénierie ou d'IA. La seule affirmation de `04` que ce chat contredit est « il n'y a pas de
navigateur pilotable dans cet environnement », qui était vraie et ne l'est plus.

---

## 3. La décision 3D

**Retenue : option 2, 2.5D stylisée** (D1). Rejetées : l'option 1 pour ce cycle, l'option 3 par
Jérôme avant l'audit.

**Pourquoi l'option 2.**

- **La lisibilité d'abord.** Un jeu tactique sur une grille de 15 x 45 se joue en lisant des cases.
  Une caméra fixe face à la paroi garde la grille lisible, le clic reste un lancer de rayon sur un
  plan, et rien ne se cache derrière une passerelle parce que les structures sont minces en
  profondeur et que les pions se tiennent devant.
- **Le layout devient le décor.** Toute la géométrie se construit depuis `KILL_SILO.rows`. L'écart
  entre le dessin et le terrain, qui motivait le relevé au pixel, n'existe plus par construction, et
  un test peut le prouver : chaque `#` produit un solide, chaque `.` n'en produit pas.
- **Le matériel et le budget.** Des portables à GPU intégré et zéro euro : pas de modèles de Giff à
  produire, pas de post-traitement lourd, des textures CC0 et des pions instanciés.
- **Le flux d'événements est déjà une timeline.** `toBeats` découpe un lot en tours, chaque beat
  porte ses événements avec leurs chemins, leurs chutes et leurs jets. Le 2.5D y branche des tweens
  et ne touche ni au moteur ni au rejeu.
- **L'option 1 reste atteignable.** Même scène, même timeline : débloquer la caméra et remplacer
  les pions par des modèles est une phase ultérieure, pas une réécriture.

**Pourquoi pas l'option 1 maintenant.** Avant d'être du code, c'est un chantier d'assets : des Giff
par rôle et par équipe, animés pour marcher, frapper, lancer et tomber, sans artiste et sans budget.
Les outils gratuits existent (génération 3D par IA, auto-rig Mixamo) mais le résultat est incertain
et demande des heures de bricolage de Jérôme. Et une caméra libre sur un puits de 225 pieds ajoute
une gestion de caméra à un tour de 120 secondes. Quatorze à vingt séances contre six à neuf.

**Pourquoi pas l'option 3.** Exclue par Jérôme : un troisième axe réécrirait les règles, la
géométrie, l'IA, la graine et la base, et rouvrirait l'équilibrage clos. Si une phase du plan se
découvrait obligée de toucher `engine/` pour rendre le 2.5D, elle s'arrête et le signale.

**Technologie.**

| Candidat | Verdict | Raison |
|---|---|---|
| **Three.js via react-three-fiber** | **Retenu** | Reste dans React et Vite, le client continue d'importer le moteur, drei fournit caméra, `Html` pour les plaques de nom, instances et textures. Impose React 19 (fiber 9) |
| Babylon.js | Rejeté | Moteur complet et bon inspecteur, mais bundle plus lourd et liaison React moins idiomatique. Rien ici ne demande ce qu'il a en plus |
| Godot ou Unity, export web | Rejeté | Brise le contrat « le client lit le moteur TypeScript » : il faudrait soit porter les règles, soit faire dialoguer l'export avec le JS par un pont. Exports de dizaines de Mo, démarrage lent sur GPU intégré, et un second outillage à maîtriser |
| WebGPU | Pas maintenant | WebGL2 est universel sur ordinateur et suffit à cette scène. Le `WebGPURenderer` de three reste une option ultérieure, sans changement de code applicatif |

**Caméra et lisibilité.** Caméra orthographique ou perspective courte (champ d'environ 25°),
légèrement inclinée, face à la paroi du fond. Défilement vertical continu sur les 45 rangées qui
remplace les trois vues de zone, avec suivi en douceur de l'unité qui agit et deux niveaux de zoom,
une zone ou le puits entier. Une mini-colonne 15 x 45 sur le côté montre tout le puits en permanence,
avec les quatorze points et le ballon. Les cases atteignables et les cases sans ancrage sont des
tuiles plates sur le plan de la paroi. L'échelle d'initiative, la fiche de siège, le fil, la barre
d'actions et la carte d'annonce restent des surcouches HTML. Une chute ou un tir traverse les zones
sans changer d'écran, ce qui est le premier gain concret du 2.5D sur la 2D actuelle.

**Le layout reste la vérité.** La géométrie est générée depuis `KILL_SILO.rows` par un module pur,
testé : chaque cellule `#` produit un solide, chaque `|` un segment de chaîne ou un crochet, chaque
`.` rien. Les bouches de Furnace viennent de `spec.furnaces`. Les trois JPEG peuvent servir de
texture de paroi atténuée, ou être retirés : ils ne portent plus aucune information de jeu. Le
relevé au pixel est abandonné (D8).

**Ce qui reste en 2D.** Connexion, hub, lobby, résultats, et toutes les surcouches du match. Le
plateau SVG actuel reste dans le code derrière un interrupteur `2D / 3D` et sert de repli automatique
quand WebGL échoue.

**Chemin de migration.** `Board3D` vit à côté de `Board`, prend les mêmes props, et un bouton de la
barre du match bascule, mémorisé dans le navigateur. Le 3D devient la vue par défaut en phase 6
seulement, quand il est au moins aussi lisible que la 2D sur un GPU intégré. Un jeu jouable à chaque
étape.

---

## 4. Architecture cible

### 4.1 Ce qui change dans `02-architecture.md`

Mis à jour dans ce chat, pour la seule décision prise : la ligne « Pas de moteur de rendu 3D » de la
section « Ce qu'on ne construit pas » est remplacée par la décision du 2026-10-09, et la section
« Le client » dit qu'il y a deux plateaux, le SVG et la scène 2.5D, derrière un interrupteur. **Le
sens des dépendances ne change pas** : `client/src/board3d/` lit `engine/` et rien d'autre, ne
résout rien, ne tire aucun dé, et reçoit l'état du serveur comme le plateau SVG.

### 4.2 Dossiers

```
boomball/
├── client/src/
│   ├── board3d/               # Nouveau. La scène 2.5D
│   │   ├── Board3D.tsx        # Le Canvas et la composition, mêmes props que Board
│   │   ├── layoutGeometry.ts  # Pur : KILL_SILO.rows -> solides, chaînes, crochets, bouches. Testé
│   │   ├── Camera.tsx         # Caméra fixe, défilement vertical, zoom, suivi
│   │   ├── Silo.tsx           # Parois, passerelles, grilles, Furnaces, lumières
│   │   ├── Tokens.tsx         # Pions instanciés, plaques nom et PV en Html
│   │   ├── Ordnance.tsx       # Payload, Crackers, Spark
│   │   ├── Overlay.tsx        # Tuiles atteignables et sans ancrage, trace du déplacement
│   │   ├── timeline.ts        # Pur : un beat -> liste de tweens datés. Testé
│   │   ├── Effects.tsx        # Explosion, lueur, impact, en sprites
│   │   ├── Minimap.tsx        # La colonne 15 x 45
│   │   ├── textures/          # CC0, WebP ou KTX2, 1K au plus
│   │   └── testHook.ts        # DEV seulement : window.__boomball
│   └── match/Board.tsx        # Inchangé, repli
├── e2e/                       # Nouveau. Playwright
│   ├── playwright.config.ts
│   ├── global-setup.ts        # Connexion du compte e2e, storageState dans .auth/ (ignoré)
│   ├── smoke.spec.ts          # Connexion, hub, lobby, match, trois tours
│   ├── board3d.spec.ts        # Phase 3 et suivantes
│   └── out/                   # Captures, ignoré
└── .github/workflows/
    ├── supabase-keepalive.yml # Ping quotidien
    └── ci.yml                 # test, typecheck, build
```

### 4.3 Dépendances

| Paquet | Version au 2026-10-09 | Rôle |
|---|---|---|
| `react`, `react-dom` | 19.3 | Requis par fiber 9 |
| `three` | 0.186 | Rendu WebGL2 |
| `@react-three/fiber` | 9.8 | Three dans React |
| `@react-three/drei` | 10.7 | `Html`, caméras, `Instances`, `useTexture`, `Line` |
| `@playwright/test` | 1.64 | Scripts e2e, dev |
| `@playwright/mcp` | 0.0.83, via `npx` | Serveur MCP, hors `package.json` |
| `vitest` | 5.0 | Montée au passage, corrige les deux critiques de `npm audit` |

Pas de `@react-three/postprocessing` par défaut : la lueur du Spark et des Furnaces se fait par
matériaux émissifs et sprites, ce qui tient sur un GPU intégré. Le bloom ne s'ajoute en phase 6 que
si la mesure laisse plus de 55 images par seconde.

### 4.4 Le crochet de test, en développement seulement

```ts
// Exposé uniquement si import.meta.env.DEV. Jamais dans un build de production.
window.__boomball = {
  state,                      // le MatchState affiché
  legal,                      // les LegalActions du tour, ou null
  view: '2d' | '3d',
  cellToScreen(x, y),         // le centre de la case en pixels de fenêtre
  clickCell(x, y),            // ce que ferait un clic sur la case
  act(action),                // ce que ferait la barre d'actions
  skipReplay(),
};
```

Deux drapeaux Vite, lus seulement sous `import.meta.env.DEV` : `VITE_BOOMBALL_PATIENT=1` coupe le
coup à la porte du chrono côté client (le serveur n'expire qu'à la requête suivante, et en solo
personne d'autre ne frappe), `VITE_BOOMBALL_HOOK=1` active le crochet.

### 4.5 Versionnage

`ENGINE_VERSION` dans `engine/constants.ts`, écrit par `create-match` dans une colonne
`matches.engine_version`, vérifié par `resolve-action` qui refuse avec une raison lisible si elle
diffère, et lu par le client qui marque le match comme archivé. Les événements restent la vérité du
match tel qu'il a été joué ; on ne les migre pas, on les laisse à leur version.

---

## 5. Plan d'assets

Tout est compatible avec zéro euro. Pour chaque ligne : la route, qui fait, la licence.

| Asset | Route | Qui | Licence | Coût |
|---|---|---|---|---|
| Parois du silo, sol de la Trench, plafond du Summit | Géométrie procédurale depuis le layout, textures PBR CC0 d'ambientCG (plaques rivetées, rouille), 1K, WebP | Claude construit, Jérôme choisit deux ou trois textures | CC0 | 0 € |
| Passerelles (`#`) | Boîtes instanciées par run de cellules, texture de caillebotis CC0 | Claude | CC0 | 0 € |
| Chaîne centrale et crochets (`\|`) | Maillons instanciés ou cylindre à normal map de chaîne, crochets en géométrie simple | Claude | Procédural | 0 € |
| Grilles de ventilation entre zones | Procédural | Claude | Procédural | 0 € |
| Les deux Furnaces | Collerette en tore, disque émissif orange, lumière ponctuelle, sprite de chaleur. Couleur d'équipe sur la collerette | Claude | Procédural | 0 € |
| Payload | Sphère laiton émissive qui tourne, anneau pulsant au sol, étiquette Html | Claude | Procédural | 0 € |
| Crackers | Sphère sombre, mèche en sprite animé, lueur ambre | Claude | Procédural | 0 € |
| Spark | Sprite blanc chaud avec halo, le plus lumineux de la scène | Claude | Procédural | 0 € |
| Giff, version 1 | Pion stylisé : socle hexagonal couleur d'équipe, corps en capsule, glyphe de rôle en sprite, plaque nom et PV en `Html`. L'ambre et le chevron pour le Giff du joueur | Claude | Procédural | 0 € |
| Giff, version 2, **optionnelle, hors done** | Modèles bas-poly par génération IA gratuite (Meshy ou Tripo en gratuit, ou Hunyuan3D en local sur le RTX 4060), rig et animations Mixamo | Jérôme génère, trie et rigge ; Claude intègre | Variable : Meshy gratuit publie en CC BY, Mixamo libre d'usage personnel. À vérifier au moment de l'usage | 0 €, plusieurs heures de Jérôme |
| Battes et grappins | Version 1 : implicites. Version 2 : cylindres simples ou pièces CC0 de Kenney | Claude | CC0 | 0 € |
| Effets : explosion, impact, poussière | Planches de sprites CC0 (Kenney Particle Pack) | Claude | CC0 | 0 € |
| Audio, **optionnel, hors done** | Six sons CC0 : frappe, impact, explosion, tir, but, Spark. Kenney Audio ou freesound CC0 | Jérôme choisit, Claude branche | CC0 | 0 € |
| Les trois JPEG actuels | Texture de paroi atténuée en option, sinon retirés du bundle | Claude | Déjà à Jérôme | 0 € |

**Ce que Jérôme fait lui-même** : choisir les textures CC0, juger la lisibilité à chaque phase, et,
seulement s'il veut la version 2 des Giff, produire les modèles. Rien d'autre.

---

## 6. Contrôle d'écran et vérification

### 6.1 Ce qui a été prouvé dans ce chat

Playwright 1.64 et Chromium ont été installés **hors du dépôt**, dans le dossier de travail de la
session, pour ne rien changer au code. Un script a joué le vrai client sur `http://127.0.0.1:5173`,
contre le vrai projet Supabase, avec le compte e2e : connexion, création de la batterie
« E2E Battery », lobby, ouverture d'un match, briefing, vitesse de rejeu « instant », attente du tour,
**clic sur une case atteignable** (79 cases dessinées, déplacement de 2 cases, 30 pieds restants),
fin de tour, la maison a joué en moins de 4 s, tour suivant au round 2. Dix captures, lues par
Claude. Aucune erreur de page. Dans la console : un 401 au chargement et deux avertissements React
(A16).

Ce que j'ai vu, et qui n'avait jamais été vu : l'écran de connexion et le hub sont propres ; la carte
de briefing est lisible ; le plateau est lisible à 1440 x 900, les PV en chiffres et les prénoms se
lisent ; **l'échelle d'initiative est coupée** (A7) ; **rien ne distingue une case sans ancrage** (A8) ;
le ballon libre se cache sous les tokens voisins (A15) ; le chrono affiche 121 s (A14) ; l'écart
connu des passerelles dessinées et des cases solides de la Zone 2 se voit, sans gêner.

### 6.2 Le dispositif retenu, et ce qui est déjà en place

**La paire : Playwright MCP pour explorer et cliquer en conversation, scripts Playwright pour les
vérifications rejouables.** Même moteur, un seul Chromium.

Déjà fait dans ce chat :

- `.mcp.json` écrit à la racine du workspace, serveur `playwright` avec ton Chrome installé, fenêtre
  1440 x 900, capacité `vision` pour les clics par coordonnées. Il se charge **au démarrage de la
  session suivante**, et Claude Code demande ton approbation une fois.
- `.claude/settings.json` écrit avec l'autorisation des outils `mcp__playwright__*` et l'approbation
  du serveur `playwright` du `.mcp.json`.
- `.gitignore` complété : `boomball/e2e/out/`, `boomball/e2e/.auth/` (l'état de session contient un
  jeton), rapports Playwright.
- Compte e2e créé, identifiants dans `.env`.

Reste à faire en phase 1 : `@playwright/test` dans `client/`, le dossier `boomball/e2e/`, le crochet
de test, les deux drapeaux.

### 6.3 Installation, pas à pas

Depuis `boomball/client/`, en PowerShell :

```
npm i -D @playwright/test@1.64.0
npx playwright install chromium
```

Le `.mcp.json` à la racine du workspace, déjà écrit :

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@0.0.83",
        "--browser", "chrome",
        "--viewport-size", "1440x900",
        "--caps", "vision",
        "--output-dir", "boomball/e2e/out"
      ]
    }
  }
}
```

Ce que Jérôme fait lui-même :

1. Redémarrer la session Claude Code, taper `/mcp`, vérifier que `playwright` est connecté.
2. Au premier `browser_navigate` vers `http://localhost:5173`, une fenêtre Chrome s'ouvre avec un
   profil propre : y taper une fois le mot de passe du compte e2e. Le profil le retient.
3. Lancer `npm run dev` depuis `boomball/client/` avant toute session d'écran, ou laisser le
   `webServer` du `playwright.config.ts` le faire pour les scripts.

Pour les scripts, la connexion se fait dans `global-setup.ts` à partir de `BOOMBALL_E2E_EMAIL` et
`BOOMBALL_E2E_PASSWORD` lus dans le `.env` du workspace, et l'état de session est écrit dans
`e2e/.auth/`, ignoré par git. Claude ne voit jamais le mot de passe.

Pour un rendu WebGL sans écran, en CI ou en headless : lancer Chromium avec
`--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader`, et vérifier dans la page
que `canvas.getContext('webgl2')` n'est pas nul avant d'affirmer quoi que ce soit. Sur la machine de
Jérôme, le mode fenêtré utilise le vrai GPU et c'est lui qui fait foi.

### 6.4 Comment chaque phase est vérifiée

| Phase | Vérification automatique | Vérification par le regard |
|---|---|---|
| 1 | `smoke.spec.ts` vert : connexion, match, trois tours, captures | Claude lit les captures et décrit l'écran |
| 2 | Tous les correctifs couverts par un test unitaire ou par `smoke.spec.ts` | Jérôme joue une partie entière et la compare aux captures |
| 3 | Test de `layoutGeometry` : chaque `#` produit un solide, chaque `.` rien ; capture 3D sans erreur WebGL en console | Jérôme reconnaît le silo et vérifie que les pions sont aux mêmes cases qu'en 2D |
| 4 | `board3d.spec.ts` : clic par `cellToScreen`, déplacement constaté dans `__boomball.state` | Jérôme joue une partie en 3D sans basculer en 2D |
| 5 | Test de `timeline` : événements vers tweens, durées déterministes ; captures en milieu de beat | Jérôme suit un round de la maison sans lire le fil |
| 6 | Échantillon d'images par seconde par `requestAnimationFrame` dans `page.evaluate`, sur le GPU intégré forcé | Jérôme joue sur son portable en GPU intégré |
| 7 | Deux contextes Playwright dans le même match ; `browser-path.py` à deux utilisateurs | Jérôme et un ami jouent |
| 8 | `browser-path.py` avec `ORIGIN` Vercel ; un ami crée un compte et joue sans Jérôme | |

---

## 7. La feuille de route

> **Depuis le 2026-10-10, D11 remplace les phases 2 à 6 ci-dessous par celles de
> `08-plan-terrain-horizontal.md`, dès que Jérôme donne le go.** La phase 1 est faite, les phases 7
> et 8 tiennent telles quelles. Le texte reste pour la trace.

Les phases sont ordonnées selon D3 : le 2.5D avant le déploiement, mais la robustesse minimale et
le harnais d'écran avant le 2.5D, parce qu'on ne construit pas une scène qu'on ne peut pas regarder
sur un projet qui se met en pause tout seul. **Chaque phase laisse un jeu jouable en local, tests
verts.** La phase 1 démarre immédiatement.

### Phase 1 : voir le jeu, 1 à 2 séances

**But.** Le harnais d'écran dans le dépôt, et la première partie humaine du terrain vertical.

| Tâche | Fichiers |
|---|---|
| `@playwright/test` dans `client/`, `boomball/e2e/playwright.config.ts` avec `webServer` sur Vite et `baseURL` `http://127.0.0.1:5173` | `client/package.json`, `e2e/` |
| `global-setup.ts` : connexion du compte e2e, `storageState` dans `e2e/.auth/` | `e2e/global-setup.ts` |
| `smoke.spec.ts` : connexion, hub, lobby, ouverture ou reprise d'un match, vitesse instant, trois tours dont un déplacement et une action, captures datées dans `e2e/out/` | `e2e/smoke.spec.ts` |
| Crochet `window.__boomball` sous `import.meta.env.DEV` et `VITE_BOOMBALL_HOOK` | `client/src/match/testHook.ts`, `screens/Match.tsx` |
| `VITE_BOOMBALL_PATIENT` qui coupe le coup à la porte, sous `DEV` seulement | `client/src/screens/Match.tsx` |
| Les deux contrôles Python lisent le `.env` eux-mêmes, comme `apply-migration.mjs` | `supabase/checks/*.py` |
| Corriger le 401 au chargement et les deux avertissements de style | `client/src/lib/`, `match/Ladder.tsx` ou `screens/` |
| Mettre à jour le skill `boomball` et `05` : le navigateur pilotable existe, voici comment | `.claude/skills/boomball/SKILL.md`, `docs/05` |

**Tests à ajouter.** `smoke.spec.ts`. Rien dans vitest.
**Critère d'acceptation, vérifié en jouant.** `npx playwright test` vert avec captures ; Claude lit
une capture d'un match en cours et la décrit juste ; Jérôme a joué une partie entière sur le terrain
vertical et rapporté ses retours numérotés.
**Jérôme.** Approuver le serveur MCP au redémarrage, taper le mot de passe e2e une fois dans la
fenêtre pilotée, jouer la partie, relancer `rls-check.py` et `browser-path.py`.

### Phase 2 : corriger ce que l'écran révèle et assainir, 2 à 3 séances

**But.** Une 2D saine et versionnée, un projet qui ne meurt plus.

| Tâche | Fichiers |
|---|---|
| A7 échelle d'initiative visible en entier, avec « tu rejoues dans N rangées » | `match/Ladder.tsx`, `screens/Match.tsx` |
| A8 cases sans ancrage dessinées en 2D, via un petit sélecteur `unsafeCells(legal, arena)` réutilisé en 2.5D | `match/Board.tsx`, `lib/cells.ts` |
| A9 écho Realtime : vérifier au harnais, puis ignorer la diffusion dont le `fromSeq` est celui de la réponse en vol, ou ne pas alimenter le fil deux fois | `match/useMatch.ts` |
| A12 `useAccount` lit `error` et `App` affiche « le serveur ne répond pas » avec un bouton réessayer et le diagnostic à copier (C11) | `lib/useAccount.ts`, `App.tsx` |
| A11 `ENGINE_VERSION`, migration `0005_engine_version.sql`, écriture par `create-match`, refus par `resolve-action`, affichage client | `engine/constants.ts`, `supabase/migrations/`, les deux fonctions, `lib/useAccount.ts` |
| A10 migration `0006_append_step.sql` : une fonction SQL `append_match_step(match_id, expected_seq, events, snapshot, columns)` qui fait les trois écritures en une transaction et échoue si `seq` a bougé ; `persist` l'appelle et traite l'erreur | `supabase/migrations/`, `resolve-action/index.ts` |
| A5 et A32 : un seul sweep avec `CRACKER_MOVE_CELLS = 10` et une portée de tir réduite, tableau pour Jérôme, application et écarts au règlement s'il tranche oui | `engine/constants.ts`, `docs/00` |
| A28 : quand `expireIfDue` a réglé un tour, ne pas soumettre l'action reçue, répondre `expired` ; test dans `session.test.ts` | `supabase/functions/resolve-action/index.ts`, `server/session.test.ts` |
| A29 : redéployer les deux fonctions avec le feu vert de Jérôme, puis vérifier au harnais que le Spark vaut 20 ; corriger le commentaire de `live-match.ts` | `npm run deploy:function`, `scripts/live-match.ts` |
| A30 : alléger le voile et l'opacité des cases sur la 2D, juger sur capture | `match/Board.tsx` |
| A31 : reproduire au harnais le massage des alliés après un but, corriger la cause dans `ai/`, sweep de contrôle pour prouver que les moyennes tiennent | `ai/`, `e2e/` |
| A13 `.github/workflows/supabase-keepalive.yml` : cron quotidien, `curl` sur `$SUPABASE_URL/rest/v1/role_stats?select=role&limit=1` avec `apikey` en secret, échec si le code n'est pas 200 | `.github/workflows/` |
| A24 `ci.yml` : test, typecheck, build client sur push touchant `boomball/` | `.github/workflows/` |
| A14, A15, A16 restants, A18 nom de personnage conservé dans `team_members` | `screens/Match.tsx`, `match/Board.tsx`, `screens/Lobby.tsx` |
| A19 images en WebP | `assets/arena/`, `lib/arena.ts` |
| A20 React 19, vitest 5, `npm audit fix` | `package.json` des deux paquets |
| A22 `02` chrono 120 s, `01` dernière ligne | `docs/` |
| Présentation dupliquée (§2.D) : constantes importées au lieu de recopiées | `screens/`, `match/` |

**Tests à ajouter.** `session.test.ts` : refus d'une version différente. Un test de `useMatch` sur la
dédoublonnage du fil si A9 se confirme. `smoke.spec.ts` étendu aux cases sans ancrage et à l'échelle.
**Critère d'acceptation.** Jérôme joue une partie entière : échelle lisible sans défiler, cases sans
ancrage visibles, aucune ligne du fil en double ; la CI est verte ; le workflow de maintien en vie a
tourné une fois ; un match créé avant `0005` est marqué archivé proprement.
**Jérôme.** Deux secrets GitHub (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) ; `/supabase-migrate` pour
`0005` et `0006` ; trancher les Crackers sur le tableau ; rejouer.

### Phase 3 : la scène 2.5D statique, 1 à 2 séances

**But.** `Board3D` dessine le silo depuis le layout, derrière l'interrupteur, sans interaction.

| Tâche | Fichiers |
|---|---|
| Dépendances three, fiber, drei | `client/package.json` |
| `layoutGeometry.ts` pur : runs de `#` vers boîtes, `|` vers maillons et crochets, bouches depuis `spec.furnaces`, grilles aux frontières de zone | `client/src/board3d/layoutGeometry.ts` |
| `Silo.tsx`, `Camera.tsx` (orthographique, défilement vertical, deux zooms, suivi de l'unité au tour), lumières : ambiante faible et une ponctuelle par Furnace | `client/src/board3d/` |
| Textures CC0 choisies par Jérôme, 1K, WebP, dans `textures/` | `client/src/board3d/textures/` |
| `Tokens.tsx` version 1 instanciés, `Ordnance.tsx`, plaques `Html` | `client/src/board3d/` |
| Interrupteur `2D / 3D` dans la barre du match, mémorisé, repli automatique sur la 2D si le contexte WebGL2 échoue | `screens/Match.tsx` |
| `__boomball.cellToScreen` branché sur la caméra 3D | `board3d/testHook` |

**Tests à ajouter.** `layoutGeometry.test.ts` : bijection entre le layout et les solides, bouches aux
bonnes cases, symétrie autour de `y = 22` conservée. `board3d.spec.ts` : bascule, capture, console
sans erreur WebGL, `cellToScreen` cohérent avec les positions des unités.
**Critère d'acceptation.** Jérôme bascule en 3D et reconnaît le silo ; les 45 rangées défilent ; les
quatorze pions, le ballon et les Crackers sont aux mêmes cases qu'en 2D ; couper WebGL ramène la 2D.
**Jérôme.** Choisir deux ou trois textures sur ambientCG, regarder.

### Phase 4 : jouer en 2.5D, 1 à 2 séances

**But.** Toutes les interactions du plateau 2D dans la scène.

| Tâche | Fichiers |
|---|---|
| Lancer de rayon sur le plan de la paroi vers une case, survol, clic vers `pathTo` et `onMove` | `board3d/Overlay.tsx`, `Board3D.tsx` |
| Tuiles atteignables et sans ancrage, trace du déplacement rejoué, projecteur sur l'unité du beat | `board3d/Overlay.tsx` |
| Clic sur un pion pour sélectionner, Giff du joueur en ambre avec chevron | `board3d/Tokens.tsx` |
| `Minimap.tsx`, et les bandeaux de zone remplacés par le défilement et la molette | `board3d/Minimap.tsx`, `screens/Match.tsx` |

**Tests à ajouter.** `board3d.spec.ts` : clic d'une case atteignable par `cellToScreen`, déplacement
constaté dans l'état et à l'écran ; sélection d'un pion ; défilement jusqu'aux deux Furnaces.
**Critère d'acceptation.** Jérôme joue une partie entière en 3D sans toucher à la 2D.
**Jérôme.** Jouer, rapporter.

### Phase 5 : la timeline d'animation, 2 séances

**But.** Chaque beat se regarde.

| Tâche | Fichiers |
|---|---|
| `timeline.ts` pur : un beat vers des tweens datés. Marche le long de `path` à un quart de seconde par case, chute accélérée, recul, chute de bousculade, dérive et détonation d'un Cracker, course du Spark, arc de passe, arc de tir jusqu'à la bouche avec éclat de Furnace sur un but, entrée d'un remplaçant, évacuation qui descend au pont et s'estompe | `board3d/timeline.ts` |
| Les tweens vivent dans des refs et `useFrame`, jamais dans l'état React ; `instant` saute à la fin | `board3d/Board3D.tsx` |
| La caméra suit l'acteur du beat en douceur, la carte d'annonce et les vitesses de rejeu restent | `board3d/Camera.tsx`, `match/useMatch.ts` |
| `Effects.tsx` : explosion et impact en sprites CC0 | `board3d/Effects.tsx` |

**Tests à ajouter.** `timeline.test.ts` : déterminisme, durées bornées par `beatHoldMs`, aucun tween
pour un beat vide, le dernier état du tween égale `beat.state` sur ce que le joueur voit (même
contrat que `replay.test.ts`). Capture en milieu de beat dans `board3d.spec.ts`.
**Critère d'acceptation.** Jérôme suit un round de la maison sans lire le fil et sait qui a marqué.
**Jérôme.** Regarder, régler les vitesses à son goût.

### Phase 6 : lisibilité, performance, bascule par défaut, 1 à 2 séances

**But.** Le 2.5D devient la vue par défaut parce qu'il tient sur un GPU intégré.

| Tâche | Fichiers |
|---|---|
| Budget : au moins 50 images par seconde à 1440 x 900 sur l'Intel UHD de Jérôme (Chrome forcé sur le GPU intégré dans les paramètres graphiques Windows), 200 appels de dessin au plus, chargement sous 3 s, téléchargement total sous 5 Mo | mesure dans `board3d.spec.ts` |
| Instanciation, compression des textures, pas d'ombre, bloom seulement si la mesure le permet | `board3d/` |
| Passe de lisibilité sur captures : plaques, PV, couleurs, Spark visible depuis l'autre bout du puits | `board3d/` |
| 3D par défaut, 2D sous l'interrupteur ; briefing mis à jour (ancrage, défilement) | `screens/Match.tsx`, `match/Briefing.tsx` |

**Tests à ajouter.** L'échantillon d'images par seconde dans `board3d.spec.ts`, en avertissement et
non en échec sur une machine inconnue.
**Critère d'acceptation.** Jérôme joue une partie fluide sur son portable en GPU intégré, et préfère
le 3D à la 2D.
**Jérôme.** Forcer Chrome sur le GPU intégré, jouer, trancher la bascule.

### Phase 7 : la coop à 2 ou 3, 3 à 4 séances

**But.** Trois humains dans la même batterie, dans le même match.

| Tâche | Fichiers |
|---|---|
| Migration `0007_invites.sql` : `teams.invite_code` unique, fonction `join_team(code)` en `security definer` qui insère dans `team_members` ; `useAccount` trouve l'équipe par `owner` ou par `team_members` | `supabase/migrations/`, `lib/useAccount.ts` |
| Hub : « Rejoindre une batterie avec un code », et le code affiché au propriétaire | `screens/TeamHub.tsx` |
| Lobby : le propriétaire compose la partie depuis le roster, nom et rôle par siège, et démarre ; les coéquipiers voient « A match is running » et entrent. Pas de présence temps réel au MVP, c'est le modèle le plus simple qui marche | `screens/Lobby.tsx` |
| Match : les lots diffusés sont rejoués par `play()` chez les coéquipiers au lieu d'une relecture silencieuse ; le coup à la porte ne concerne que l'humain sur le chrono ; le `mineId` et le `yours` tiennent déjà | `match/useMatch.ts`, `screens/Match.tsx` |
| `create-match` : l'appelant doit être le propriétaire quand il y a plusieurs sièges | `supabase/functions/create-match/index.ts`, `server/lobby.ts` |

**Tests à ajouter.** `session.test.ts` et `lobby.test.ts` à trois humains sur l'échelle et le chrono.
`browser-path.py` à deux utilisateurs. `coop.spec.ts` avec deux contextes Playwright dans le même
match.
**Critère d'acceptation.** Jérôme et un ami, ou deux contextes, jouent un match entier ; chacun voit
les tours de l'autre animés ; un rechargement en plein match revient au bon endroit.
**Jérôme.** `/supabase-migrate` pour `0007`, un ami ou un second compte pour tester.

### Phase 8 : déploiement et robustesse sans Jérôme dans la pièce, 2 séances

**But.** L'URL que les amis reçoivent.

| Tâche | Fichiers |
|---|---|
| `scripts/deploy-vercel.mjs` : crée le projet par `POST /v9/projects` la première fois, puis `POST /v13/deployments` avec les fichiers de `client/dist/` envoyés par SHA ou en ligne, cible `production`, sans jamais lier de dépôt Git | `scripts/deploy-vercel.mjs` |
| `site_url` à l'URL Vercel ; `browser-path.py` avec `ORIGIN` de cette URL | config auth, `supabase/checks/` |
| `/security-review` par Jérôme, et ses suites | |
| Décision inscriptions (C3), export JSON hebdomadaire (A23), écran de résultats (A17) | `scripts/export-db.mjs`, `screens/Results.tsx` |
| Passe Firefox, et le repli 2D vérifié sur un navigateur sans WebGL | |

**Tests à ajouter.** `smoke.spec.ts` lancé contre l'URL Vercel avec `BASE_URL`.
**Critère d'acceptation.** Un ami reçoit l'URL, crée un compte, joue un match solo complet sans
Jérôme ; une semaine plus tard le projet est toujours debout ; le compteur de victoires de
« Shrapnel oath » monte à la victoire suivante de Jérôme (A4 clos).
**Jérôme.** Lancer `/security-review`, envoyer l'URL, trancher les inscriptions.

### Phase 9, optionnelle, hors done

Giff version 2, audio, temps forts et revisionnage d'un match depuis ses événements, chiffres de
carrière. À décider après la phase 8.

**Total estimé pour le done : 13 à 19 séances.**

---

## 8. Risques et questions ouvertes

| Risque ou question | Qui décide | Note |
|---|---|---|
| Le projet se remet en pause avant que le workflow de maintien en vie tourne | Jérôme pose les secrets en phase 2 | Restauration : dashboard, projet `boomball`, « Restore project », ou `POST https://api.supabase.com/v1/projects/{ref}/restore` avec le jeton de gestion, puis `GET /v1/projects/{ref}` jusqu'à `ACTIVE_HEALTHY`, quatre minutes observées |
| L'écho Realtime (A9) ne se confirme pas à l'écran | Claude vérifie en phase 2 | Si rien n'est visible, la ligne se ferme sans correctif |
| `CRACKER_MOVE_CELLS` | Jérôme, sur le sweep de la phase 2 | D4 |
| Inscriptions ouvertes ou fermées après l'enrôlement des amis | Jérôme, phase 8 | C3 |
| Faire tourner ou non le secret JWT apparu dans un transcript | Jérôme | A27. Si oui : `.env` et `client/.env.local` à remettre à jour, fonctions à redéployer |
| Modèle de lobby coop : propriétaire qui compose, sans présence temps réel | Claude propose, Jérôme valide en phase 7 | Le modèle avec présence coûte une séance de plus |
| Giff version 2 et audio | Jérôme, après la phase 8 | Hors done |
| React 19 casse un détail | Claude, phase 2 | Base de code petite, typecheck strict, risque faible |
| Le rendu headless SwiftShader diffère du GPU | Claude | Les captures de CI se comparent avec tolérance, le regard de Jérôme fait foi |
| Le `.mcp.json` du projet n'est pas chargé par l'extension VS Code | Jérôme vérifie avec `/mcp` au redémarrage | Repli : `claude mcp add playwright -- npx -y @playwright/mcp@0.0.83 --browser chrome --caps vision` à portée utilisateur |
| `projet test` occupe le second projet gratuit | Jérôme | Sans conséquence tant qu'un troisième projet n'est pas voulu |
| Le match e2e ouvert dans ce chat reste en cours sur « E2E Battery » | Fini en phase 1 par script | Supprimer le compte e2e cascade sur tout, le jour où on n'en veut plus |
| **Q1, orientation du terrain.** Posée et **tranchée par Jérôme le 2026-10-10 : horizontal, décision D11**, plan dans `08` | Tranchée | **Garder le silo** : rien ne change au plan ; la verticalité ne tient qu'à la règle d'ancrage (B6), au coût de zone et au plan vertical du d8 du Spark, parce que tout le monde vole. À rendre lisible par A8, A30, C16 et les phases 3 à 5. **Passer à l'horizontal** : retirer B6 (ancrage, chute libre, chute de bousculade, chute à 0 HP), le coût de zone et le plan du Spark ; les solides du layout deviennent des obstacles vus de dessus, les deux Furnaces restent à chaque bout, le miroir autour de la ligne 22 tient. Le moteur, c'est `rules/falling.ts` qui disparaît, les termes d'ancrage de `reduce.ts` et de `positionValue`, et le règlement v2 : environ une séance, plus une demi-séance d'IA, plus un sweep complet, parce que **l'équilibrage clos a été mesuré avec les chutes et les coûts de zone**, et la cible de 1 à 2 buts par match est à re-prouver. Le 2.5D s'en trouve simplifié : caméra de dessus ou de trois quarts, pas de défilement vertical. C'est aussi un retour vers la vue de dessus du règlement de table, écart 5 de `00`. Le repli que Jérôme avait nommé le 2026-09-02, « comme un terrain de foot », est exactement cette option |

---

## 9. Définition de done du jeu entier

Le jeu est fini quand, sur l'URL Vercel, sans Jérôme dans la pièce :

1. Un ami crée un compte, fonde une batterie, lance un match solo et le joue jusqu'au coup de sifflet
   final en 2.5D, sur un portable à GPU intégré, sans baisse de fluidité gênante ni erreur visible.
2. Il revient le lendemain, retrouve sa batterie, ses victoires et son Tier, et un match inachevé
   l'attend là où il l'a laissé.
3. Deux ou trois amis dans la même batterie jouent un match ensemble, chacun voit les tours des
   autres animés, et un rechargement en plein match revient au bon endroit.
4. Le projet est toujours debout après une semaine sans trafic, et une panne du serveur donne un
   écran qui dit quoi faire.
5. `npm test`, les deux typechecks, le build, `smoke.spec.ts`, `board3d.spec.ts`, `coop.spec.ts`,
   `rls-check.py` et `browser-path.py` sont verts, et la CI tourne à chaque push.
6. Les règles sont celles de `00-reglement-v2.md`, l'équilibrage n'a pas bougé, et `engine/` n'a
   été touché que pour la version et les Crackers si Jérôme les tranche.
7. `/security-review` a été lancée par Jérôme et ses conclusions traitées.
8. Le plateau 2D reste disponible sous l'interrupteur et prend le relais si WebGL échoue.

---

## 10. Journal des phases

### Phase 1, « voir le jeu », construite le 2026-10-10

Par le fil principal (Fable 5.1), avec deux sous-agents Sonnet à effort moyen : l'un a fait lire le
`.env` aux deux contrôles Python, l'autre a passé en propriétés longues les sept objets de style
qui déclenchaient les avertissements React. Tout le reste est du fil principal. **La phase n'est pas
close** : son critère d'acceptation inclut la partie entière de Jérôme, qui n'a pas eu lieu.

| Tâche de §7 | État |
|---|---|
| `@playwright/test` et le harnais | Fait. **Dans le `package.json` racine de `boomball/`, pas dans `client/`** comme le plan le disait : `e2e/` est à côté de `client/`, et `npx playwright` doit se résoudre depuis `boomball/`. Scripts `npm run e2e`, `npm run e2e:playthrough` ; `npm run typecheck` couvre `e2e/` ; vitest exclut `e2e/**` |
| `global-setup.ts` | Fait. Connexion à chaque run, état de session dans `e2e/.auth/`, échec sur toute réponse 400 ou plus du chemin de connexion |
| `smoke.spec.ts` | Fait, vert en 9 s : hub, briefing, match repris, vitesse instant, un tour expiré réglé, un déplacement par le crochet, Dodge et fin de tour par les vrais boutons, un déplacement par clic sur la case du plateau. Dix captures datées dans `e2e/out/<run>/`, lues et décrites par Claude. Échoue sur toute erreur, tout avertissement et toute réponse 400+ |
| Crochet `window.__boomball` | Fait. `client/src/match/testHook.ts` (contrat, `cellToScreen`, `summarise`), `client/src/lib/flags.ts` (les deux drapeaux sous `import.meta.env.DEV`), publication dans `Match.tsx` après chaque rendu. Ancres DOM `data-board-stage`, `data-cell="x,y"`, `data-unit`. Le bundle de production fait 434,66 Ko, identique à l'audit : le crochet est compilé hors du build |
| `VITE_BOOMBALL_PATIENT` | Fait, coupe l'effet du coup à la porte |
| Contrôles Python et le `.env` | Fait, sous-agent. `live-match.ts` et `deploy-edge-function.mjs` restent à la bash |
| 401 et avertissements | Fait, voir A16 : c'était un 409, et sept objets de style |
| Skill `boomball` et `05` | Faits, récrits |
| Match e2e ouvert depuis le 09/10 | **Fini par `npm run e2e:playthrough`** : dix rounds, 10 à 50, la maison gagne. Deux runs de plus ont chacun joué un match neuf en moins de 35 s, le troisième vert de bout en bout jusqu'à la feuille de résultats, 27 requêtes humaines, aucun refus. Les deux premiers ont buté sur la fin de match : `innerText` rend « full time » en majuscules, et le crochet disparaît avec l'écran de match ; les deux sont corrigés |

**Mesuré en lisant les captures.** A7 confirmé, l'échelle montre quatre rangées. A14 confirmé,
121 s au premier rendu. A28 trouvé : une action en retard est appliquée au tour suivant. A29 trouvé
dans les événements : la fonction déployée compte le Spark 50 quand le moteur dit 20. Les deux en
§2.A.

**Écarts au plan.** `localhost` et jamais `127.0.0.1`, parce que Vite n'écoute que `[::1]:5173` sur
cette machine et que le démarrage du serveur expirait. Le paquet Playwright à la racine, voir
ci-dessus. Le mode « finir le match » est un test marqué `@playthrough`, exclu de `npm run e2e`,
plutôt qu'un script Node : il passe par le crochet et donc par le client, et sa cervelle est
`chooseAction`, la même que `live-match.ts`.

**La première partie humaine du terrain vertical, 2026-10-10.** Jérôme a approuvé le serveur MCP,
joué une partie entière et relancé les deux contrôles Python. Ses retours, numérotés par le fil
principal dans l'ordre où il les a donnés, et où chacun va :

1. Le terrain ne se lit plus sous le noircissement. Nouveau, **A30**, phase 2.
2. Les autres balles bougent à peine et restent en zone 2. Les Crackers, selon toute
   vraisemblance : c'est la mesure que **D4 et A5** attendaient, le sweep à 10 cases en phase 2.
3. Le comportement des IA est incompréhensible et pas vraiment tactique. Nouveau, **A31**.
4. Après son but, tous ses alliés se sont massés autour du gardien et n'en sont jamais repartis.
   La reproduction concrète de **A31**, à faire au harnais d'abord.
5. La maison a marqué 10 points sans qu'il comprenne pourquoi ni comment. C'est la raison d'être de
   la **phase 5** : un tir traverse les zones sans changer d'écran. En attendant, la carte d'annonce
   tient un but deux fois plus longtemps que le reste, et le verdict des résultats reste faux
   (**A17**).
6. La distance de tir qui a permis son but lui a paru trop longue. Nouveau, **A32**, mesuré dans
   le sweep de la phase 2 puis arbitré par lui, parce que c'est le règlement v2.
7. Il est tombé sans savoir pourquoi. **A8 et C16**, déjà en phase 2 : les cases sans ancrage ne
   sont pas dessinées et le briefing ne dit pas ce qu'est l'ancrage.

Quatre remarques de plus, données après coup, numérotées à la suite :

8. Les animations de déplacement, la caméra et la séparation en zones statiques le gênent
   fortement ; il veut une caméra qui suit le ballon ou le joueur et fait défiler le terrain en
   continu, comme un jeu de football vidéo. C'est mot pour mot la cible des **phases 3 à 5**,
   déjà écrite en §3 : défilement continu, suivi de l'unité qui agit, un tir qui traverse les
   zones sans changer d'écran.
9. Retirer le coût de déplacement pour passer d'une zone à l'autre, soit `ZONE_CROSSING_FEET`,
   10 pieds par franchissement. Règle du règlement v2, donc son arbitrage ; mesuré dans le sweep
   de la phase 2 avec A5 et A32, ou rendu sans objet par Q1.
10. L'impression qu'il n'y a aucune gestion de collision ni d'obstacle. **Faux dans les règles,
    vrai à l'écran** : les cases `#` du layout sont infranchissables, une case occupée bloque, quitter
    l'allonge d'un adversaire déclenche l'attaque d'opportunité, le Shove pousse. Ce qu'il n'a pas vu,
    c'est A30 : le terrain ne se lit pas sous le noircissement, et le dessin de la zone 2 ne colle pas
    au layout. Le 2.5D construit le décor depuis le layout, donc ce qui se voit est ce qui bloque.
11. **La question la plus grosse, Q1 en §8 : silo vertical ou terrain horizontal.** Son argument
    est l'équité sous gravité. Les faits du moteur : toute unité **vole** à 40 pieds, monter coûte
    exactement ce que descendre coûte ; une chute n'est jamais un déplacement choisi, c'est la
    pénalité d'un tour fini sans ancrage, 10 cases au plus avant le grappin et 1d6 par 2 cases en cas
    d'impact ; la portée d'un tir ou d'une passe est une distance de Chebyshev, la même vers le haut
    que vers le bas ; le ballon ne tombe jamais. **L'iniquité qu'il craint n'existe pas dans les
    règles.** Ce qui existe, c'est que la verticalité ne lui a rien apporté de lisible et lui a
    coûté une chute incomprise (7), un coût de zone (9) et trois écrans (8).

Les deux contrôles Python sont verts : `rls-check.py` 24/24, `browser-path.py` ALL GREEN.

**La phase 1 est close sur ces retours.** Q1 a été tranchée le soir même : D11, le terrain passe à
l'horizontal, et le plan qui en découle est `08-plan-terrain-horizontal.md`. Go donné le soir même,
les sept arbitrages tranchés, la partie C de `00` écrite, le layout accepté. Le développement
démarre dans un chat neuf par 2H.1.


### Sous-phase 2H.1, « règles et moteur », construite le 2026-10-10

Par le fil principal (Fable 5.1), avec six sous-agents Sonnet nommés ci-dessous. Le fil principal a
gardé `types.ts`, `constants.ts`, `geometry.ts`, `arena.ts`, `arenas/kill-silo.ts`, `events.ts`,
`reduce.ts`, `legalActions.ts`, les règles `movement`, `combat`, `reactions`, `payload` et
`ordnance`, le passage minimal de l'IA, `selfPlay.ts`, la régénération de la fixture et
l'intégration. **La sous-phase est close** : `npm test` vert, 17 fichiers et 328 tests contre 14
et 273 avant, `npm run typecheck` vert à la racine, dans `scripts/`, dans `e2e/` et dans `client/`,
`check_drift.py` sans dérive.

| Tâche de `08` §4.1 | État |
|---|---|
| Partie C appliquée au moteur | Fait. Plus de chute, d'ancrage, de vol ni de coût de zone ; obstacles infranchissables qui coupent la ligne de vue ; poussée d'une case sur la bousculade, qui ne bouge pas un porteur ; attaque d'opportunité toujours prise ; évacuation sur place ; Crackers qui contournent en dérive et rebondissent frappés ; Spark qui rebondit ; tir et passe refusés sans ligne de vue, et déjà filtrés par `legalActions`, donc l'IA et la barre d'actions ne les voient plus |
| `rules/sight.ts`, `rules/bounce.ts` et leurs tests | Fait, **sous-agent (a), Sonnet effort moyen**. Ligne de vue par segment de centre à centre, bloquée quand le segment traverse l'intérieur ouvert d'une case `#`, un coin effleuré ne bloque pas. 13 et 15 tests |
| Suppression de `falling.ts`, tests `foundations`, `rules`, `reduce`, `setup` | Fait, **sous-agent (b1), Sonnet moyen**, 102 tests. Nouveaux : évacuation sur place, chemins qui contournent le pilier et la caisse, les faits du layout (58 cases pleines hors bouches, aucun cul-de-sac, aucune colonne ouverte vers une bouche) |
| Tests `combat`, `reactions`, `ordnance`, `legalActions` | Fait, **sous-agent (b2), Sonnet moyen**, 128 tests. Nouveaux : la poussée et ses quatre blocages, l'attaque d'opportunité toujours prise, l'interception qui ignore une case pleine du vol, le contournement d'un Cracker, les rebonds, les lignes de frappe refusées, le tir et la passe masqués |
| `arenas/kill-silo.ts` | Fait par le fil principal, recopié tel quel depuis `08` §3 avant de lancer les agents, pour qu'ils aient tous le même terrain. Le sous-agent (c) prévu dessus n'a eu que la migration |
| Migration `0005_horizontal.sql` | Écrite, **sous-agent (c), Sonnet moyen**, avec `server/migration0005.test.ts` qui tient son bloc `arenas` égal à `buildSeedSql()`. **Pas appliquée** : c'est Jérôme en 2H.4, via `/supabase-migrate`, avec A11 |
| `02-architecture.md` et `live-match.ts` | Fait, **sous-agent (d), Sonnet faible**. Au passage `live-match.ts` comptait les Sparks par `points === 50` : il lit désormais `source === 'spark'` |
| Client compilant sur le moteur 2 | Fait, **sous-agent (e), Sonnet moyen**, hors plan mais nécessaire : sans lui le harnais et `npm test` cassaient. Branches `fell` et `reactionHeld` retirées, « No grip » retiré, le rejeu applique `shoved.pushedTo`. **Aucun changement visuel** : le plateau dessine encore trois bandes de quinze lignes jusqu'à 2H.4 |
| Fixture de seed | Régénérée, `supabase/seed.sql` porte le nouveau layout |

**Ce qui a été fait en avance sur le plan, et pourquoi.** `keepGrip` est retiré des poids de l'IA et
de `evaluate.ts` dès 2H.1 et non en 2H.2 : la pénalité lisait `isAnchorable`, qui n'existe plus,
et un poids mort dans quatre fiches de rôle aurait menti. Rien d'autre de l'IA n'a bougé :
`shotQuality` et `scoringNearness` ignorent encore la ligne de vue, c'est le travail de 2H.2.

**Un point de règle à confirmer par Jérôme.** L'écart 36b, appliqué à la lettre, **coince** un
Cracker ou le Spark sur 24 couples case et cap du layout accepté : une case de bord contre une
couverture latérale avec un cap orthogonal, où l'inversion ne fait que permuter le bord et la
couverture, et une case entre un pilier central et une couverture qui se touchent par les coins,
avec un cap diagonal. Le sous-agent (a) l'a mesuré en balayant toutes les cases ouvertes dans les
huit directions. Comme la précision J6 dit que leur mouvement ne tombe jamais à zéro, `bounce.ts`
ajoute un repli : quand la règle écrite n'a trouvé aucune case libre en quatre tentatives, le
mobile tourne d'une face de d8 dans le sens horaire à partir de son cap d'arrivée et prend la
première case libre, puis continue sur ce cap. Le repli est commenté comme un ajout d'ingénierie
et testé ; il ne se déclenche que sur ces 24 couples. **À écrire dans la partie C sous 36b si
Jérôme le confirme, ou à remplacer par la règle qu'il préfère.** L'interception, écart 34, est
lue de la façon suivante : deux cases adjacentes se voient toujours, donc la ligne de vue porte sur
la passe elle-même, et une case pleine que le pas de Chebyshev du vol effleure ne compte pas.

**Premier sweep du moteur 2**, 200 matchs par Tier, 135 s, sans aucun réglage, comme demandé.

| Tier | A | B | nuls | buts/match | sans but | Spark pris | essais/match | décidés par le Spark | évacués | ballon par tiers A/milieu/B | gardien |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rookie | 89 | 76 | 35 | 0,42 | 147 | 142 | 2,35 | 122 | 1,77 | 24 / 41 / 35 % | 3 % |
| veteran | 98 | 93 | 9 | 0,47 | 146 | 175 | 2,29 | 155 | 1,30 | 24 / 44 / 32 % | 3 % |
| star | 92 | 95 | 13 | 0,50 | 143 | 186 | 1,65 | 159 | 1,15 | 25 / 44 / 31 % | 3 % |

Lecture, sans rien toucher : la cible de 1 à 2 buts par match est loin, trois matchs sur quatre
finissent sans but et le Spark décide trois rencontres sur quatre. Deux causes probables, à
départager en 2H.2 avant tout réglage en 2H.3 : l'IA place encore ses tireurs et ses relais à la
distance, sans savoir qu'une caisse est entre eux et la bouche, donc elle « prépare » des tirs qui
ne lui sont jamais proposés ; et la partie A/B est équilibrée, donc le terrain lui-même n'avantage
personne. La comparaison avec le tableau du 2026-09-02 ne vaut rien graine par graine, seules les
moyennes se lisent, et elles disent que le jeu a changé de régime.

**Ce qui attend 2H.4 et n'a pas bougé** : la ligne `arenas` en base est encore le silo vertical,
les deux fonctions déployées jouent encore le moteur 1, les images de zone sont encore référencées
par le client, A8 et A30 n'ont plus d'objet mais restent écrits en §2.A jusqu'à ce que le plateau
soit redessiné.


### Sous-phase 2H.2, « IA », construite le 2026-10-10

Par le fil principal (Fable 5.1), avec deux sous-agents Sonnet à effort moyen, nommés ci-dessous.
Le fil principal a gardé `ai/evaluate.ts`, les quatre fiches de rôle et `weights.ts`, la
reproduction de A31, son correctif, le scénario du but marqué dans `ai.test.ts` et l'intégration.
**La sous-phase est close** : `npm test` vert, 19 fichiers et 342 tests contre 17 et 328 ;
`npm run typecheck` vert ; le sweep de contrôle est ci-dessous. Aucune constante de `00` n'a bougé.
`CONTEXT.md` attend `/update` : `check_drift.py` signale 328 tests et 0,42 à 0,50 buts jusque-là.

| Tâche de `08` §4.2 | État |
|---|---|
| La ligne de vue dans l'IA | Fait, fil principal. `shotQuality` lit la portée **visible** vers la bouche et vaut zéro quand aucune case de la bouche ne se voit ; `scoringNearness` vaut 1 depuis toute case qui voit la bouche à portée propre, et une case aveugle est escomptée à 80 % quelle que soit sa distance (`BLIND_DISCOUNT`), pour qu'un pas de côté hors de la caisse vaille toujours plus qu'un pas de plus vers elle. Le gradient va jusqu'au bout du terrain au lieu de s'aplatir à zéro au-delà de 39 cases. La portée visible est mémoïsée par arène et par Furnace, parce que `positionValue` la demande pour chaque case atteignable |
| La valeur de couverture à la place de l'ancrage | Fait, fil principal. Poids `cover` dans les quatre fiches (Striker 20, Trajector 25, Breaker 10, Bulwark 0) et fonction `laneCover` : pour un coéquipier du porteur, une case **à portée, en vue du porteur, et dont la trajectoire de passe n'a aucun adversaire à côté**. Chaque intercepteur possible retire la moitié. Le porteur ne la lit pas : rien dans les règles ne l'atteint à distance |
| A31 reproduit | Fait, fil principal, **dans le harnais de self-play et pas à l'écran** : le harnais Playwright joue les fonctions déployées, donc le moteur 1, et une capture n'aurait rien dit du moteur 2. Script de mesure : 60 graines par Tier, après chaque but, les 28 tours suivants du camp qui a encaissé. **Avant correctif, rookie** : le gardien tient encore le ballon sur 77 % de ces tours, 0,98 coéquipier à deux cases ou moins du porteur, et le meilleur déplacement d'un joueur de champ près de son gardien vaut moins de trois points, donc il frappe l'adversaire adjacent ou esquive. La cause n'est pas `payloadReset` : c'est que dans sa propre moitié un coéquipier n'avait **aucune raison de s'écarter**, `scoringNearness` lisait zéro à plus de 39 cases de la bouche adverse, et le seul gradient restant, `screenCarrier`, le tirait vers le porteur |
| A31 corrigé | Fait, fil principal. Nouvelle fonction `outlet` : pour un coéquipier du porteur, le produit de la portée de passe (`passReach`), de la ligne de vue depuis le porteur, et du **terrain gagné** par la passe, à 1 pour une passe propre entière, plus la qualité de tir depuis la case. Un relais vaut le plus **neuf cases devant le porteur, dans sa vue**. `supportAttack` multiplie `outlet` au lieu de l'ancien produit distance-au-but fois portée. **Après correctif, rookie** : gardien à 58 % des tours suivants, 0,68 coéquipier collé, distance moyenne 9,4 à 10,3 ; veteran 60 % et 0,85 ; star 52 % et 0,86. Le gardien passe dès son premier tour dans la médiane des cas |
| Dispersion dans le rapport de sweep | Fait, **sous-agent (e), Sonnet effort moyen**. `BallTrack` gagne `carrierTurns`, `mateSpreadSum`, `huddleSum` ; `SweepReport` gagne `meanMateSpread` (distance de Chebyshev moyenne du porteur à ses coéquipiers actifs, échantillonnée une fois par tour quand le ballon est porté) et `meanHuddle` (coéquipiers à deux cases ou moins) ; colonnes `spread` et `huddle` dans le rapport ; `ai/selfPlay.test.ts` neuf, 4 tests, dont l'arithmétique sur un plateau posé à la main |
| `ai.test.ts` | Bloc « sight and cover », 7 tests, **sous-agent (f), Sonnet effort moyen**, sur la spécification du fil principal, chaque affirmation de ligne de vue gardée par `hasLineOfSight` pour qu'un layout qui bouge fasse échouer le test au lieu de le laisser passer pour la mauvaise raison. Bloc « after a goal is scored », 3 tests, fil principal : les six joueurs de champ s'écartent de leur gardien, aucun ne reste à deux cases, au moins trois sont des relais en vue et à portée ; le gardien choisit la passe vers l'un d'eux ; une décision reste sous 50 ms. Un test existant corrigé par le fil principal : « still prefers the cell further up the pitch » comparait (7, 30) à (7, 26) depuis un porteur en (7, 22), et le pilier (7, 28) cache désormais la première ; décalé d'une colonne, lignes de vue gardées |

**Sweep de contrôle du moteur 2 après 2H.2**, 200 matchs par Tier, 141 s, aucune constante de `00`
touchée, les poids de l'IA seuls ayant bougé. **Les moyennes ont bougé, et c'est à signaler, pas à
cacher** : la cible de 1 à 2 buts par match est atteinte sur les trois Tiers par le seul fait que
l'IA voit les caisses, avant toute campagne d'équilibrage.

| Tier | A | B | nuls | buts/match | sans but | Spark pris | essais/match | décidés par le Spark | évacués | ballon A/milieu/B | gardien | dispersion | collés |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| rookie | 95 | 88 | 17 | 1,05 | 60 | 133 | 2,33 | 94 | 1,85 | 26 / 45 / 29 % | 6 % | 9,5 | 1,30 |
| veteran | 89 | 98 | 13 | 1,37 | 50 | 161 | 1,96 | 99 | 1,44 | 26 / 44 / 29 % | 8 % | 9,1 | 1,44 |
| star | 96 | 90 | 14 | 1,59 | 36 | 186 | 1,65 | 113 | 0,85 | 29 / 41 / 30 % | 9 % | 9,2 | 1,44 |

Lecture, contre la référence de 2H.1. Buts par match de 0,42 à 0,50 vers **1,05 à 1,59**, dans la
cible. Matchs sans but de 143 à 147 vers **36 à 60** sur 200. Matchs décidés par le Spark de 122 à
159 vers **94 à 113**, soit 47 à 57 % : encore loin des 30 % visés, c'est le levier de 2H.3, où le
prix du Spark se discute contre un taux de buts qui a triplé. La part A/B reste équilibrée, le
ballon reste réparti sur les trois tiers. La part du gardien monte de 3 à 6 à 9 % : plus de buts,
donc plus de remises en jeu par le gardien, pas un ballon qui dort. La colonne « collés » n'a pas de
référence dans le sweep de 2H.1 ; le script de reproduction la mesurait à 1,85 en rookie avant le
correctif, 1,23 après, sur 60 graines. Le sweep est passé de 135 à 141 s.

**Deux observations hors périmètre, pour 2H.3 ou 2H.4.** Un gardien qui rate sa passe **court
chercher son propre ballon perdu** jusqu'à sept ou huit cases de sa bouche, parce que la case du
ballon vaut `grabPayload` 80 et que `guardFurnace` ne perd que 95/45 par case : vu sur la graine 2
rookie, le gardien B rate deux passes de suite et finit à treize cases de son but. Ce n'est pas A31
et ça ne date pas de 2H.2, mais c'est de la lisibilité, et Jérôme en jugera à la porte de 2H.4.
Et un Striker à plus de dix-huit cases de son gardien porteur n'a plus aucune raison de revenir,
`passReach` étant nul au-delà : ce sont les Breakers et le Trajector qui ramènent le ballon, ce qui
est défendable mais non décidé.

**Ce qui attend 2H.3** : la campagne de `08` §4.3 sur ce nouveau régime, les Crackers à 6 et 10,
la portée de tir à 9/12, 7/10 et 6/9, et le prix du Spark à discuter sur le tableau, puisque la
part décidée par le Spark est la seule colonne encore hors cible.


### Sous-phase 2H.3, « équilibrage », construite le 2026-10-10

Par le fil principal (Fable 5.1), sans sous-agent, comme `08` §9 le prévoit. **La sous-phase est
close** : la campagne de `08` §4.3 mesurée en entier, Jérôme a tranché sur le tableau, les écarts
39 à 41 sont écrits dans `00` partie C6, `engine/constants.ts` est aligné, `npm test` vert à 342
tests, `npm run typecheck` vert, et le sweep de confirmation sur les constantes commitées
reproduit la variante retenue colonne par colonne. `CONTEXT.md` attend `/update`.

| Tâche de `08` §4.3 | État |
|---|---|
| La référence | Relancée telle quelle : reproduit le sweep de contrôle de 2H.2 colonne par colonne, le harnais est déterministe et rien n'a dérivé entre les deux chats |
| Les Crackers à 6 et à 10 | Mesurés. À 10, les trois Tiers tiennent 1,10, 1,48 et 1,80 but par match, un évacué de plus tous les trois ou quatre matchs, rien d'autre ne bouge |
| La portée de tir à 9/12, 7/10 et 6/9 | Mesurée. À 7/10 le rookie passe à 0,94 et les matchs sans but montent partout, 74, 64 et 55 ; à 6/9 deux Tiers sur trois sont hors cible, 93 matchs sans but sur 200 |
| Le prix du Spark | Rejoué à 5, 10, 15, 20 et 30 sur les mêmes graines, sans nouveau sweep, parce que rien dans `ai/` ne lit le score : les mêmes graines jouent le même match à tout prix, et le rejeu retombe exactement sur les colonnes du sweep à 20. **Le Spark n'est jamais pris deux fois dans un match** sur 2 400 matchs, donc le prix ne fixe que l'avance aux buts qu'une prise renverse. Entre 10 et 30 la part décidée ne bouge que de 44 à 63 % ; seul 5 atteint les 30 % visés |
| Les tableaux | Un par variante, plus celui du prix, dans `09-equilibrage-2H3-2026-10-10.md` |
| Le rapport de sweep | Imprime désormais les constantes sous lesquelles il a été mesuré, pour qu'un tableau archivé ne puisse pas être pris pour un autre |
| Les deux tests d'ordnance pinnés sur six cases | Libérés de la géométrie : ils lisent `CRACKER_MOVE_CELLS` pour placer leur cible et leur point d'arrêt |

**Les arbitrages de Jérôme, le 2026-10-10.** Crackers à 10, écart 40, ma recommandation suivie.
Portée de tir gardée à 9/12, écart 39, ma recommandation suivie. **Spark gardé à 20 points, écart
41, contre ma recommandation de 5** : je lui ai présenté que 20 fait décider le Spark dans un
match sur deux et que seul 5 atteignait sa cible des 30 % ; il garde 20 en connaissance de cause,
le Spark vaut deux buts, et la cible des 30 % est remplacée par cet arbitrage. La définition de
« re-clos » dans le skill et dans `00` suit cette décision.

**État mesuré après arbitrage**, constantes commitées, 200 matchs par Tier : buts par match 1,10,
1,48 et 1,80 ; matchs sans but 69, 46 et 33 ; Spark décidant 107, 110 et 108 matchs sur 200 ;
évacués 2,21, 1,53 et 1,12 ; dispersion 9,4, 9,3 et 9,3 ; collés 1,39, 1,49 et 1,53.

**Deux observations pour 2H.4, non corrigées ici**, en plus des deux de 2H.2 qui restent dues : une
portée de tir plus courte resserre l'équipe, parce que `outlet` et `passReach` sont graduées sur la
portée de tir et non sur celle de la passe, à savoir si la portée descend un jour ; et le Spark est
un enjeu unique par match, pris dans deux matchs sur trois en rookie et neuf sur dix en star, ce
qui est ce que la règle produit et se lit avec le prix.

**Ce qui attend 2H.4** : A11, A28, A29 et la migration 0005 avec le feu vert de Jérôme, le plateau
2D vu de dessus, le briefing, le harnais sur le terrain horizontal, puis sa partie en 2D.


### Sous-phase 2H.4, « serveur et client 2D », construite le 2026-10-10, porte ouverte

Par le fil principal (Fable 5.1), avec quatre sous-agents Sonnet nommés ci-dessous, lancés en
parallèle sur des fichiers disjoints comme `08` §9 le prévoit. Le fil principal a gardé A11, A28,
les deux fonctions, la migration, le redéploiement, `useAccount`, `useMatch`, `App`, `Match.tsx`,
`testHook.ts`, les deux workflows, les images et l'intégration. **Tout ce qui ne dépend pas de
Jérôme est fait et vert** : `npm test` 348 tests sur 18 fichiers contre 342, `npm run typecheck`
vert à la racine, dans `scripts/`, `e2e/` et `client/`, le build du client vert, `smoke.spec.ts`
vert sur le terrain horizontal, `e2e:playthrough` vert jusqu'au sifflet, `browser-path.py` ALL
GREEN, `rls-check.py` 24/24. **La porte de sortie n'est pas franchie** : il reste la partie de
Jérôme en 2D et son verdict sur l'IA.

| Tâche de `08` §4.4 et §4.5 | État |
|---|---|
| Migration 0005 | **Appliquée par Jérôme le 2026-10-10**, ligne `arenas` vérifiée champ par champ contre le moteur, colonne `engine_version` ajoutée, les huit matchs existants, tous terminés, lisant 1 |
| A11 | Fait, fil principal. Estampille à l'ouverture, refus 409 d'une autre version, archivage côté client, le hub compte les archivés. Fonction pure `engineVersionRefusal` testée |
| A28 | Fait, fil principal. `serveAction` règle l'expiration ou joue l'action, jamais les deux ; trois tests ; un seul chemin de persistance dans la fonction |
| A29 | Fait avec le feu vert de Jérôme : `resolve-action` v8, `create-match` v7. Spark vérifié à 20 au harnais |
| Plateau 2D vu de dessus | Fait, **sous-agent (g), Sonnet effort élevé** : terrain entier en 45 sur 15, but de Jérôme à gauche, obstacles depuis le layout, aucune image, ballon libre au-dessus des pions (A15), prénoms tronqués à quatre lettres et nom complet au survol et sur l'unité sélectionnée. Contrat de géométrie partagé avec `testHook.ts` : colonne d'écran = `y`, ligne d'écran = `x`, une case vaut la largeur de la scène sur 45 |
| Briefing, fiche, fil, rejeu | Fait, **sous-agent (h), Sonnet moyen** : briefing récrit pour les caisses, le couvert, la poussée et les tiers ; « Own end, Midfield, Their end » à la place des zones ; plus un mot vertical dans le fil ni le rejeu |
| Harnais sans zone | Fait, **sous-agent (i), Sonnet moyen** : `farthest` sur tout le terrain, une assertion A9 sur les marqueurs de round, une vérification de géométrie entre `cellToScreen` et la scène |
| A7, A17, A18, présentation dupliquée | Fait, **sous-agent (j), Sonnet moyen** : échelle compacte avec « You play in N », verdict « on the Spark », nom conservé dans `team_members`, constantes au lieu de 10, 3, 13 et 6 recopiés |
| A9, A12, A14, A19, A22 | Fait, fil principal, voir §2.A |
| A13, A24 | Workflows écrits ; secrets et premier push par Jérôme |
| A20 React 19 | **Reporté à l'ouverture de la phase 3**, dont c'est le préalable, pour ne pas changer de React le jour où l'écran change de forme |
| A8, A30 | Sans objet depuis D11 |

**Ce que les captures ont montré, et ce qui a été corrigé avant de les montrer à Jérôme.** Le premier
smoke a franchi tout le parcours sur le moteur 2 et n'a échoué que sur la nouvelle assertion A9 :
le marqueur « Round 4 » apparaissait deux fois, parce que la diffusion Realtime de notre propre lot
arrive **avant** la réponse HTTP, ce que le premier correctif, qui réclamait le lot à la réponse,
ne couvrait pas ; le fil dédoublonne désormais par `fromSeq`. La colonne de droite débordait de la
fenêtre : les puces de l'échelle refusaient de passer à la ligne et la colonne suivait ; elles
passent à la ligne et la colonne est bornée. Le second smoke et le playthrough sont verts, 19
requêtes humaines, aucun refus, 12 rounds avec mort subite, 30 à 10, « Won on the Spark ».

**Dette laissée en vue.** La colonne `arenas.art` et le champ `art` du spec nomment encore trois
JPEG qui n'existent plus ; rien ne les lit, à nettoyer avec le plan d'assets de la phase 3. Les
quatre observations d'IA de 2H.2 et 2H.3 attendent le verdict de Jérôme à cette porte.

**Ce qui attend Jérôme** : poser les deux secrets du dépôt et lancer une fois le workflow de
maintien en vie ; pousser le dépôt pour que la CI tourne ; **jouer une partie en 2D et dire s'il
comprend ce que ses coéquipiers et la maison cherchent**, avec des retours numérotés. Puis la phase
3, la scène 2.5D, dont A20 est le premier pas.

**La partie de Jérôme à la porte de 2H.4, le 2026-10-10.** Jouée en 2D sur le terrain horizontal,
en ligne, sur le moteur 2. **La porte n'est pas franchie** : il ne peut pas juger l'IA sur un
plateau qui téléporte. Ses retours, numérotés par le fil principal dans l'ordre où il les a donnés,
avec ce que le moteur en dit et ce qu'il a décidé :

1. Au coup d'envoi personne n'atteint le ballon, même en Dash. Mécanique : 18 cases entre les
   lignes de départ de `08` §3 et le centre, pour 16 de déplacement avec Dash. **Décision : le
   ballon doit être prenable dès le premier tour sans Dash**, donc les six joueurs de champ partent
   à huit cases du ballon, y14 et y30. Écart 38 révisé, en 2H.5.
2. et 3. Un seul Cracker visible au départ, et plus aucun après une explosion. Le règlement les fait
   naître et revenir tous les deux sur la case du ballon, `(7, 22)` : ils sont empilés et dessinés
   sous le disque du ballon, que 2H.4 a mis au-dessus de tout (A15). **Décision : jamais deux sur la
   même case, jamais sur celle du ballon.** Écart 43, en 2H.5.
4. Le ballon perdu reste sous les pieds du porteur, que seul lui peut donc reprendre. C'est
   l'arbitrage du 2026-09-01 conservé à l'écart 32, devenu absurde sur un terrain où deux unités ne
   partagent jamais une case. **Décision : le ballon tombe sur une case adjacente tirée au d8.**
   Écart 42, en 2H.5.
5. Sans animations on ne comprend rien, même à la vitesse normale. **Décision : la passe
   d'animation 2D passe avant le 2.5D**, puis il rejoue. C'est le risque que `08` §8 nommait.
6. L'IA semble un peu meilleure qu'avant, sans qu'il ait pu tout regarder. À confirmer après 5.
7. Les traits de trajectoire du rejeu sont à côté de la plaque et inutiles dès que les pions
   bougent. Retirés en 2H.5.

Le tout forme la **sous-phase 2H.5**, écrite dans `05-reprise-chat-suivant.md`, avec un sweep de
contrôle après les trois écarts et la migration 0006 pour les positions de départ. La porte reste
la même : sa partie, sur le plateau animé.


### Sous-phase 2H.5, « coup d'envoi, ballon perdu, Crackers, animation 2D », construite le 2026-10-10 soir, porte ouverte

Par le fil principal (Fable 5.1), avec deux sous-agents Sonnet nommés ci-dessous, sur des fichiers
disjoints comme `08` §9 le prévoit. Le fil principal a gardé `reduce.ts`, `setup.ts`, les règles
`payload` et `ordnance`, `kill-silo.ts`, les écarts, le sweep, `motion.ts`, `replay.ts`,
`useMatch.ts`, `Match.tsx`, le harnais et l'intégration. **Tout ce qui ne dépend pas de Jérôme est
fait et vert** : `npm test` 382 tests sur 20 fichiers contre 348, `npm run typecheck` vert à la
racine, dans `scripts/`, `e2e/` et `client/`, le build du client vert, `smoke.spec.ts` vert avec
la nouvelle vérification de glissement, `check_drift.py` sans dérive. **La porte n'est pas
franchie** : il reste la migration 0006, le redéploiement des deux fonctions, et la partie de
Jérôme sur le plateau animé.

| Tâche de `05` | État |
|---|---|
| a. Écart 38 révisé | Fait, fil principal. Les six joueurs de champ partent de `y14` pour A et `y30` pour B, mêmes `x`, à huit cases du ballon. `setup.test.ts` prouve sur le vrai plateau de coup d'envoi que chacun des six atteint `(7, 22)` en huit cases exactement malgré le pilier et les couvertures, pour les deux camps, et que le gardien ne le peut pas |
| b. Écart 42 | Fait, fil principal. Le ballon perdu, sur bousculade ou évacuation, roule sur une case adjacente tirée au d8 ; repli écrit et testé : la case libre suivante dans le sens horaire, le ballon reste sur place seulement si les huit voisines sont prises. Règle pure `dropLanding` dans `rules/payload.ts`, 5 tests sans dé ; au plateau, `combat.test.ts` et `reduce.test.ts` vérifient qu'il ne tombe jamais dans un obstacle, hors terrain, sous un joueur ni sous le bousculeur. **Aucun événement nouveau** : `payloadDropped` puis `payloadScattered` à 1 case, donc `ENGINE_VERSION` reste 2 et les matchs ouverts continuent |
| c. Écart 43 | Fait, fil principal. `crackerKickoffCells` met les deux Crackers en `(6, 22)` et `(8, 22)`, de part et d'autre du ballon dans la largeur pour que chacun reste à égale distance des deux Furnaces ; `crackerRespawnCell` rend un Cracker sur la case libre la plus proche du centre, jamais le ballon au sol, jamais une unité, jamais le jumeau en jeu, égalités départagées par le dé ; les deux reviennent l'un après l'autre. 6 tests neufs dans `ordnance.test.ts` |
| d. Traits de trajectoire | Retirés du plateau, de `replay.ts` (`trailOf`) et de `Match.tsx` |
| e. Animation 2D | Fait. **Le contrat de temps**, fil principal : `client/src/match/motion.ts`, qui extrait de chaque beat la liste de ce qui a voyagé dans l'ordre des événements (marche d'une unité le long de son chemin, poussée ou recul d'une case, roulement d'un Cracker ou du Spark, vol du ballon sur passe, tir ou dispersion), le minute à la vitesse choisie (110 ms la case à normal, 180 à slow, 500 ms un vol, 0 partout à instant), et ne transcrit que ce que les événements disent ; `replay.ts` donne son `motion` à chaque beat ; `useMatch.ts` tient le beat au moins le temps du glissement, le premier beat du propre déplacement du joueur compris. **Le plateau**, sous-agent (k), Sonnet effort élevé : `Board.tsx` garde une position d'affichage par pièce, joue les pas l'un après l'autre sur une seule boucle `requestAnimationFrame`, dessine le ballon en vol avec une ombre au sol et un disque qui grossit vers l'apex, et retombe sur l'état du serveur à la fin, au skip et à la relecture du snapshot ; à instant il dessine l'état directement, sans frame, ce dont le harnais dépend. Les couches statiques sont mémoïsées. 11 tests sur `motion.ts`, dont un sur un vrai match qui vérifie que chaque pas finit où l'état du beat met la pièce |
| f. Sweep de contrôle | Fait, fil principal, 133 s, tableau et lecture dans `09` §9. **Le régime a bougé, dans la cible** : buts par match 1,02 / 1,34 / 1,49 contre 1,10 / 1,48 / 1,80 ; matchs sans but 67 / 39 / 48 contre 69 / 46 / 33 ; Spark décidant 46 / 44 / 56 % contre 54 / 55 / 54 % ; le ballon quitte le milieu, 40 / 32 / 33 % contre 49 / 46 / 43 %. Recommandation : laisser l'équilibrage clos ; le point à regarder est le star, 48 matchs sans but. **Jérôme tranche sur le tableau** |
| g. Migration 0006 et redéploiement | **Fait le 2026-10-10 soir.** `supabase/migrations/0006_kickoff_line.sql`, sous-agent (c), Sonnet effort moyen, ne touche que `starts` de la ligne `arenas`, tenue égale au moteur par `server/migration0006.test.ts` ; `migration0005.test.ts` garde 0005 comme historique. Seed régénéré. `ENGINE_VERSION` reste 2 : aucune forme d'état ni d'événement n'a changé. **Appliquée par Jérôme via `/supabase-migrate`**, ligne relue avant (y4, y40) et après (y14, y30), puis **les deux fonctions redéployées avec son feu vert : `resolve-action` v9, `create-match` v8**. Vérifié au harnais sur un match neuf : les six de chaque camp sur y14 et y30, le gardien dans sa bouche. Le premier `e2e:playthrough` a échoué à la connexion sur une réponse 4xx du chemin de signature, le second est passé sans retouche : à surveiller, pas reproduit |

**Ce que les captures ont montré.** Le smoke, au mode slow sur la réponse de la maison au troisième
tour, échantillonne les boîtes des pions tous les dixièmes de seconde et prend deux captures au
premier déplacement vu ; sur la paire du 2026-10-10, le ballon est dans les mains de Kregg Keg sur
la première et en vol, disque et anneau, à mi-chemin d'une interception sur la seconde, à trois
dixièmes d'écart. La capture d'ouverture montre encore l'ancien coup d'envoi, `y4` et `y40`, et
les deux Crackers empilés sous le ballon : **c'est le match ouvert du compte e2e**, créé avant la
migration par la fonction déployée, et c'est attendu. Un match neuf après 0006 et le redéploiement
montrera les lignes à `y14` et `y30` et un Cracker de chaque côté.

**Hors périmètre, laissé en vue.** Une unité évacuée pendant un beat disparaît au début du beat
plutôt qu'à la fin de son dernier pas, choix du sous-agent (k) accepté pour cette passe. La marche
est linéaire sans amorti aux extrémités. Les quatre observations d'IA de 2H.2 et 2H.3 et les poids
de l'IA n'ont pas bougé : ils attendent le verdict de Jérôme sur le plateau animé. La dette
`arenas.art` reste pour le plan d'assets de la phase 3, et A20 (React 19) reste le premier pas de
la phase 3.

**Un effet de l'écart 38 vu au harnais, à trancher par Jérôme.** Les Crackers naissent à une case
du centre et roulent de 10 cases au compte 20 ; les lignes de coup d'envoi sont à 8 cases du
centre. **Au compte 20 du round 1, avant qu'un seul joueur ait agi, les deux Crackers atteignent
donc toujours quelqu'un et détonnent**, 3d6 chacun sur deux joueurs tirés au hasard du côté le plus
proche. C'est mécanique, pas probabiliste : à y4 et y40 ils ne portaient pas, à y14 et y30 ils
portent. Les deux matchs du harnais s'ouvrent ainsi, et le sweep de §9 le compte dans ses évacués en
hausse. Deux options proposées, aucune appliquée : les Crackers ne dérivent pas au round 1, écart 44
à écrire ; ou ils naissent à plus de 10 cases des lignes, ce que le layout ne permet pas sans
toucher aux lignes. **Tranché par Jérôme le soir même : écart 44, pas de dérive au round 1.**
`CRACKER_FIRST_DRIFT_ROUND = 2` dans `constants.ts`, une garde dans `resolveCrackers`, trois tests
dans `ordnance.test.ts` (le vrai coup d'envoi n'explose personne, la chasse commence au round 2,
frapper un Cracker au round 1 reste permis), les fixtures de `ai.test.ts` et d'`ordnance.test.ts`
qui comptaient sur des Crackers partis au round 1 remises d'aplomb. 382 tests. Le sweep de
confirmation est en `09` §10 : 1,12 / 1,40 / 2,00 but par match, le régime de §8 retrouvé, les
deux explosions du coup d'envoi étaient ce qui tirait §9 vers le bas. **La fonction `resolve-action` déployée, v9, ne porte pas l'écart
44** : le redéploiement attend un nouveau feu vert de Jérôme.

**Ce qui attend Jérôme** : son feu vert pour redéployer `resolve-action` avec l'écart 44, puis
**une partie en 2D animée, avec son verdict sur ce que ses coéquipiers et la maison cherchent**.
L'équilibrage est **confirmé clos** par lui le 2026-10-10 soir sur le tableau de `09` §9. Sans le
verdict, pas de phase 3.

**La partie de Jérôme à la porte de 2H.5, le 2026-10-10 soir.** Jouée en 2D animée, en ligne, sur
`resolve-action` v9, donc **sans l'écart 44** : les deux Crackers ont encore explosé au coup
d'envoi. **La porte n'est pas franchie** : il ne dit pas qu'il comprend l'IA, et quatre de ses sept
retours sont de l'IA. Ses retours, numérotés par le fil principal dans l'ordre où il les a donnés,
avec ce que le code en dit, vérifié en le lisant :

1. Au début de chaque tour de la maison on voit déjà l'emplacement final des joueurs, puis
   seulement le tour de chaque IA commence. **Défaut, cause trouvée dans `useMatch.ts`** : la
   diffusion Realtime de notre propre lot arrive avant la réponse HTTP, et le gestionnaire de
   diffusion appelle `load()`, qui pose le snapshot final sur le plateau ; la réponse arrive ensuite
   et rejoue les beats depuis le plateau d'avant. A9 avait dédoublonné le fil, pas cette relecture.
   Invisible au harnais parce qu'il tourne en `instant`. Correctif : ne pas relire le snapshot
   pendant qu'une requête de ce client est en vol, la réponse s'en charge.
2. Les Crackers ne vont pas vers le groupe de joueurs le plus nombreux et le plus proche, mais vers
   le joueur le plus proche. **C'est la règle écrite partout** : la fiche du vault dit « toward the
   closest individual player », B8 et l'écart 35 aussi. Le groupe n'est écrit nulle part. Si Jérôme
   le veut, c'est un écart nouveau à définir : le groupe, sa taille, l'égalité.
3. Les Crackers doivent apparaître autour des piliers de bord de la ligne médiane, `(0, 22)` et
   `(14, 22)`, nord ou sud à l'écran, et non au centre ; et leur vitesse pourrait descendre à 8
   cases. **Décision de design, à préciser** : une case libre adjacente à chaque pilier, un Cracker
   par pilier, au coup d'envoi comme au retour ; la vitesse rouvre l'équilibrage (écart 40).
4. Frapper les Crackers par les Breakers « n'est pas en place », et leur IA ne protège pas les
   Strikers. **La règle est en place** : toute unité sans ballon peut frapper un Cracker adjacent
   (la fiche dit que tout rôle peut tout faire), et le Breaker de l'IA a `batCracker` 70, `attack`
   60, `shove` 65. Ce qui manque est une **IA de garde du corps** : se placer entre ses Strikers et
   les adversaires ou les Crackers, frapper l'adversaire adjacent, renvoyer un Cracker vers l'ennemi.
   C'est la séance d'IA que `08` §8 prévoyait si l'IA restait illisible.
5. Un joueur évacué qui revient à côté de sa Furnace est trop pénalisé ; il devrait revenir au
   centre, où le ballon apparaît. **Décision de design** : écart 37 à réviser, la case libre la plus
   proche du centre, comme un Cracker qui revient.
6. Une passe interceptée par un adversaire adjacent « derrière » lui, hors trajectoire. **La règle
   implémentée est celle qu'il propose** : `passInterceptors` ne retient que les adversaires à une
   case d'une cellule du vol. Le vol commence à la case suivant le lanceur, donc un adversaire
   **à côté** du lanceur, et non juste derrière, touche la première case du vol et peut intercepter.
   C'est ce qu'il a vu. Option à trancher : la première case du vol ne compte pas, une passe qui
   quitte les mains ne se vole pas par un voisin du lanceur.
7. L'IA empile les joueurs autour de la Furnace, alliés comme ennemis. **A31 n'est pas réglé pour un
   humain** : les attaquants convergent vers les cases qui voient la bouche, les défenseurs sur
   `guardFurnace`, et personne ne lit une intention. Même séance d'IA que le retour 4.

Ce que le fil principal en tire : un défaut d'écran à corriger d'abord (1), trois décisions de
design qui attendent Jérôme (2, 3, 5, plus l'option de 6), et une séance d'IA (4 et 7), qui est le
cas que `08` §8 avait nommé : on n'entre pas en 2.5D sur une IA qu'il ne comprend pas. Le
redéploiement de `resolve-action` avec l'écart 44 attend toujours son feu vert.

**Les réponses de Jérôme, le même soir**, point par point, écrites dans `00` partie C8 comme écarts
décidés et non implémentés :

- Retour 2 : **les Crackers se dirigent vers le ballon**, plus vers le joueur le plus proche ; sur la
  case d'un ballon au sol, rien ne se passe, et pour le prendre il faut frapper le Cracker ou
  accepter l'explosion. Écart 45.
- Retour 3 : **un Cracker par pilier de bord**, nord et sud. Écart 46. La vitesse à 8 n'a pas été
  confirmée : ouvert.
- Retour 4 : la frappe d'un Cracker adjacent reste ouverte à tous ; **le Breaker gagne une parade en
  Réaction** quand un Cracker lui arrive dessus, renvoi dans un arc de 120 degrés, AC 10 et 12 cases
  réutilisées. Écart 47. Deux conséquences à lui présenter : `ENGINE_VERSION` 3, et le choix de
  direction pour un humain.
- Retour 5 : pas de réponse. Le remplaçant au centre reste une proposition, ouverte.
- Retour 6 : **durci**, la première case du vol ne compte pas. Écart 48.
- Retour 7 : **une séance dédiée au comportement de l'IA par rôle**, après les écarts.
- Retour 1 : le défaut de relecture pendant le rejeu, à corriger en premier.

Le tout forme **2H.6, « Crackers vers le ballon, parade du Breaker, écrans »**, puis **2H.7, « l'IA
par rôle »**, écrites dans `08` §5 et dans `05-reprise-chat-suivant.md`. Le redéploiement de
`resolve-action` avec l'écart 44 attend toujours son feu vert, et le dépôt porte ces notes non
commitées en attendant son `/save` ou `/commit`.

### Sous-phase 2H.6, « Crackers vers le ballon, parade du Breaker, écrans », construite le 2026-10-10, porte ouverte

Par le fil principal (Fable 5.1), avec trois sous-agents Sonnet nommés ci-dessous, sur des fichiers
disjoints comme `08` §9 le prévoit. Le fil principal a gardé `reduce.ts`, `rules/ordnance.ts`, le
nouveau `rules/placement.ts`, `setup.ts`, `constants.ts`, `events.ts`, les tests du moteur, le
sweep, `useMatch.ts`, le redéploiement et l'intégration. **Tout ce qui ne dépend pas de Jérôme est
fait et vert** : `npm test` 408 tests sur 20 fichiers contre 382, `npm run typecheck` vert à la
racine, dans `scripts/`, `e2e/` et `client/`, le build du client vert, `smoke.spec.ts` vert avec
la nouvelle vérification de relecture. **La porte n'est pas franchie** : il reste le redéploiement
des deux fonctions avec `ENGINE_VERSION` 3, sa lecture du tableau de `09` §11, et sa partie.

Au départ, les cinq questions posées et tranchées par lui : redéployer `resolve-action` avec
l'écart 44 **maintenant** (fait, v10, `ENGINE_VERSION` 2, avant toute ligne de 2H.6) ; `ENGINE_VERSION`
3 et les matchs ouverts archivés, **oui** ; direction de la parade **automatique** avec la règle
proposée ; Crackers à **8** cases (40 bis) ; remplaçant **au centre** (37 bis).

| Tâche de `05` | État |
|---|---|
| a. Retour 1, le plateau montrait le futur | Fait, fil principal, cause confirmée au harnais avant correction : `seq` passait de 224 à 296 trois quarts de seconde après le clic, `replaying` encore faux. `useMatch.ts` tient un compteur de requêtes en vol ; tant qu'il est non nul, le gestionnaire de diffusion prend le fil et ne relit pas le snapshot, la réponse rejoue le lot puis relit. **Le smoke**, sous-agent Sonnet effort élevé : un échantillonneur dans la page toutes les 25 ms depuis le clic d'End turn en mode slow, `startSendWatch`, `firstChangedBoard`, `judgeSend` dans `e2e/harness.ts`, deux assertions (le `seq` ne bouge pas avant le premier beat ; le premier plateau différent de celui d'avant le clic est un beat, pas le plateau final) et deux captures, `first-board-after-send` et `final-board`. Le smoke a échoué sur l'assertion exacte avant le correctif et passe après ; sur la paire du 2026-10-10 le premier plateau après l'envoi est le beat 2 sur 16 de Corvo Ramrod au round 6, le final le round 7 avec Giff à la main |
| b. Écart 45 | Fait, fil principal. `crackerRun` roule vers `ballCell` (porteur ou sol), s'arrête sur un ballon au sol sans rien faire, s'arrête avant le jumeau vivant, détonne sur la première unité traversée, plus de dé. **Un effet de bord trouvé par les tests** : le plus court chemin départageait les ex æquo par l'ordre fixe des huit directions, et trois cases vers l'ouest se roulaient en crochet sud-est puis nord-ouest ; les voisines sont désormais essayées de la plus proche du but à vol d'oiseau à la plus lointaine, ligne droite quand elle existe. 13 tests |
| c. Écart 46 | Fait, fil principal. `crackerPost` dérive les deux piliers de bord de `ordnanceStart`, `crackerHomeCell` prend la case libre la plus proche du pilier à distance 1 ou plus, au coup d'envoi (`setup.ts`, après les noms, avant le nonce d'initiative) comme au retour ; `cracker-1` au pilier ouest `(0, 22)`, `cracker-2` à l'est `(14, 22)`. Rien ne change dans la ligne `arenas`. 6 tests, plus `setup.test.ts` |
| d. Écart 48 | Fait, sous-agent Sonnet effort moyen : `passInterceptors` ignore la première cellule du vol ; 4 tests neufs, un test déplacé parce que son rôdeur n'était à une case que de la première cellule. 33 tests dans `reactions.test.ts` |
| e. Écart 47 | Fait, fil principal, après les deux réponses de Jérôme. Événement `crackerParried` (unitId, crackerId, roll, hit, direction), `ENGINE_VERSION = 3`. Dans `reduce.ts`, `runCracker` distingue une course en dérive d'une course frappée : seule la dérive offre la parade, donc un Cracker renvoyé ne se pare pas deux fois. `arrivalFace` lit la face par laquelle il est entré, sens inverse de son dernier pas ; `parryFaces` donne la face et ses deux voisines ; `parryDirection` choisit la face qui atteint un adversaire le plus tôt, sinon la face d'arrivée, sauf si elle renverrait le Cracker sur un coéquipier alors qu'une voisine ne touche personne. **Trois cas limites décidés par le fil principal, écrits dans `00` C8, à relire par Jérôme** : pas de parade en portant le ballon, pas de parade debout sur le Cracker, pas de recul du Breaker. 12 tests. **Le client**, sous-agent Sonnet effort moyen : une ligne de carte dans `replay.ts` (« parries … CLEAN / MISSED » avec le dé), une ligne du fil dans `Feed.tsx`, une phrase dans `Briefing.tsx`, un test dans `replay.test.ts` |
| f. 40 bis et 37 bis | Fait. `CRACKER_MOVE_CELLS = 8`. Le remplaçant entre sur la case libre la plus proche du centre par `nearestFreeCell` de `rules/placement.ts`, règle commune aux Crackers et au banc, dé pour les égalités ; `substituteEntry` et `substitute_entry` restent et ne sont plus lus. `combat.test.ts` et `foundations.test.ts` suivent |
| g. Sweep de contrôle | Fait, 152 s, tableau et lecture dans `09` §11 : 1,18 / 1,69 / 2,21 but par match contre 1,12 / 1,40 / 2,00 ; **trois fois moins d'évacués** ; le star au-dessus de la cible à 2,21 avec 11 matchs sans but. **Jérôme tranche sur le tableau** |
| h. Redéploiement | **Fait le 2026-10-10 avec son feu vert**, après qu'il a relu les cas limites de la parade (ok) et tranché le tableau de `09` §11 (rien ne bouge) : `resolve-action` v11 et `create-match` v9, `ENGINE_VERSION` 3. Vérifié au harnais dans la foulée : le hub du compte e2e affiche « 1 match from the old silo is archived » (A11), le smoke passe sur un match neuf du moteur 3 avec un Cracker beside each post et la vérification de relecture verte, et un playthrough de 16 s va au sifflet, 0 à 20 sur le Spark, 14 requêtes, 0 refus. Dans ce match la base porte **la première parade en ligne** : `B-breaker-6` pare `cracker-1`, 15 + 4 = 19 contre 10, renvoi face 8. Le match ouvert de Jérôme, round 7 du moteur 2, reste en base en `playing` et le client l'archive |

**Comment le smoke a été vérifié avant le redéploiement.** Le client compile `ENGINE_VERSION` et
archive tout match qui ne la porte pas ; avec le moteur 3 dans le dépôt et les fonctions v10 et v8
en ligne, le harnais n'aurait trouvé aucun match jouable. Le fil principal a donc mis la constante à
2 dans sa copie de travail le temps des trois runs (un playthrough de 18 s pour fermer le match du
compte e2e, bloqué au round 9 avec un Striker encerclé sans case de destination, ce que `farthest`
du smoke ne tolère pas ; le smoke avant correctif, échec attendu ; le smoke après, vert), puis l'a
remise à 3 avant le typecheck et le build. Rien de tout cela n'a touché la base ni les fonctions.

**Hors périmètre, laissé en vue.** `crackerPressure` dans `ai/evaluate.ts` lit toujours la distance
de l'unité au Cracker, alors que le danger est désormais sur la ligne Cracker-ballon : c'est une
ligne de 2H.7, les poids de l'IA n'ont pas bougé. Le choix de direction d'un Breaker humain reste
automatique jusqu'à ce que le jeu sache poser une question en plein échelon des Crackers. La dette
`arenas.art` et A20 (React 19) ne bougent pas.

**Ce qui attend Jérôme** : `/update` pour `CONTEXT.md` et `/commit`, puis **une partie en 2D
animée sur le moteur 3**, avec son verdict sur ce que ses coéquipiers et la maison cherchent, qui
ouvre 2H.7, l'IA par rôle. L'équilibrage est **re-clos par lui sur `09` §11** le 2026-10-10,
Crackers 8, portée 9/12, Spark 20, le star à 2,21 accepté. Sans son verdict sur l'IA, pas de
phase 3.

**La partie de Jérôme à la porte de 2H.6, le 2026-10-10 soir**, sur le moteur 3. Ses retours,
numérotés par le fil principal dans l'ordre où il les a donnés, et ce que le code en disait :

1. Un joueur sur la case du Spark qui rate la prise devrait le voir sauter d'une case au d8, et
   personne ne devrait pouvoir finir son tour dessus : « couver le Spark ». Vrai, `applyCatchSpark`
   ne bougeait rien. **Écart 49.**
2. Quand il n'a pas l'initiative, les adversaires apparaissent déjà placés au coup d'envoi. Vrai,
   `load()` dessinait le snapshot et les événements d'ouverture n'allaient qu'au fil. **Migration
   0007, colonne `matches.kickoff`**, rejouée une fois par le client.
3. Agir en cliquant sur le pion, pas seulement dans la barre. Client seul.
4. Choisir sa trajectoire pour éviter une attaque d'opportunité. Le moteur l'acceptait déjà, le
   client envoyait le plus court. Client seul.
5. Le Spark doit revenir quelque part au hasard après une prise. **Écart 50.**
6. « carried off the field » incompris. Trois lignes de texte.
7. Une façon très visuelle de lire l'ordre d'initiative, le suivant, puis le suivant. Client seul.
8. Le reste est l'IA par rôle, à faire rôle par rôle en chat.

### Sous-phase 2H.7, « l'IA par rôle, l'initiative, le Spark, l'écran », codée le 2026-10-10 soir, porte ouverte

Par le fil principal (Fable 5.1), avec trois sous-agents Sonnet nommés ci-dessous, sur des fichiers
disjoints. Le fil principal a gardé le moteur (`reduce.ts`, `initiative.ts` récrit, `types.ts`,
`constants.ts`, `events.ts`, `actions.ts`, `legalActions.ts`, `rules/combat.ts`, `setup.ts`), l'IA
en entier (`evaluate.ts`, `chooseAction.ts`, les quatre fiches, `weights.ts`, `selfPlay.ts`),
`server/lobby.ts`, la fonction `create-match`, la migration 0007, `useMatch.ts`, le montage de la
bande d'initiative dans `Match.tsx`, le découpage des beats dans `replay.ts`, les tests et les
écarts. **Tout ce qui ne dépend pas de Jérôme est codé et vert** : `npm test` 429 tests sur 20
fichiers contre 408, `npm run typecheck` vert à la racine, dans `scripts/`, `e2e/` et `client/`, le
build du client vert. **Rien n'est en ligne et rien n'est passé au harnais** : le client lit la
colonne `kickoff`, qui n'existe pas en base avant la migration 0007, et le harnais ne tourne donc
qu'après elle. **Le sweep n'a pas tourné**, à la demande de Jérôme : un seul, à la fin.

Le design a été dicté par Jérôme en chat, question par question, après qu'il a refusé les
questions à choix sur un concept qu'il n'avait pas encore décrit (mémoire mise à jour). Les
décisions sont dans `00` C9, écarts 49 à 52 et le bloc « l'IA par rôle ». Deux rôles ont été
reformulés en cours de route : le Breaker en défense passe de « presser le porteur partout » à
« d'abord le chemin des adversaires vers les Strikers, ensuite la ligne des Crackers » ; et le terme
« la maison » est abandonné dans nos échanges au profit de « l'équipe qui a la balle » et « l'équipe
qui ne l'a pas », l'étiquette « The House » restant à l'écran.

| Quoi | État |
|---|---|
| Écart 49, le Spark s'échappe | Fait, fil principal. `sparkEscape` dans `applyEndTurn`, `dropCell` réutilisé, `sparkMoved` gagne `cause: 'drift' \| 'escape'`. 3 tests |
| Écart 50, le Spark revient | Fait, fil principal. `applyCatchSpark` remet `pending`, `Spark.state` perd `caught`. Test réécrit : il rentre au round suivant et une seconde prise marque encore |
| Écart 51, l'initiative | Fait, fil principal. `engine/initiative.ts` récrit : Spark, équipe avec humain, Crackers après l'équipe porteuse, autre équipe ; Trajector, Strikers, Breakers, Bulwark ; humains d'abord, d20 relancé entre humains du même rôle ; ordre des IA d'un rôle par la situation (`orderBySituation`) ; alternance sans humain. `TurnSlot` porte `rank`, l'état `lastCarrierTeam` écrit par `done()`. `buildTurnOrder(arena, state)`. `hasPlayedThisRound` exporté pour la chaîne. 14 tests récrits dans `setup.test.ts`, l'aide `opened()` d'`ordnance.test.ts` marche l'échelle jusqu'aux Crackers |
| Écart 52, se planter | Fait, fil principal. Action `brace`, `Unit.braced`, événement `braced`, `canBrace`, `BRACE_SHOVE_PENALTY = 3`, `opposedRoll` prend un mode pour le challenger, levé à `beginTurn` et au premier pas |
| `ENGINE_VERSION` 4 | Fait. Les quatre écarts changent la forme de l'état ou des événements |
| L'IA : la chaîne | Fait, fil principal. `ballCandidates` lit `hasPlayedThisRound`, `nextToPlay`, `isLastLink` ; jamais à quelqu'un qui a joué sauf dernier maillon ; devant, même ligne, ou 1 à 3 derrière pour le tout prochain ; `potential` compte les huit cases que le receveur a encore ; `safety = 1 / (1 + intercepteurs)` ; `handOff` et `rejoin`. 3 tests |
| L'IA : le Breaker | Fait, fil principal. `escort` (épaule qui fait face à la menace, porteur allié, `wantsEscort` 0 pour le gardien), `guardStrike`, `screen` (en défense, entre l'adversaire et chaque coéquipier qui manie la balle, poids 60), `parryPost` (30), `yieldToKeener`, `crackerPressure` sur la ligne Cracker-ballon via `Board.crackerLines`. 6 tests |
| L'IA : Striker, Trajector, Bulwark, Dodge | Fait, fil principal. Presser par rôle (`stripCarrier` 80 et 70, `pressCarrier` 55 et 45, `attack` bas), `rejoin` 40 et 30 ; Bulwark `leash` 4, `looseBallReach` 3, `brace` 40, `pressCarrier` 60 ; Dodge seulement abîmé de moitié et sans rien d'autre à faire. 4 tests. Le sweep imprime `dodge` |
| Retour 2, l'ouverture rejouée | Fait, fil principal. `OpenedMatch.kickoff`, `create-match` écrit `matches.kickoff = { state, lastSeq }`, **migration 0007 écrite, pas appliquée** ; `useMatch.load()` rend l'ouverture une fois quand le `seq` est encore celui de l'ouverture, et l'effet initial la rejoue. Le hold d'un beat relit la vitesse à chaque beat |
| Retours 3 et 4, agir au clic, tracer sa route | Fait, **sous-agent Sonnet effort élevé** : `pending` remonté dans `Match.tsx`, anneaux de cible sur les pions, tray de contexte, bouton `Plot route`, `Go`, `Clear`, route au survol avec le compte de coups, cases dont la route la plus courte provoque marquées ; `data-cell`, `clickCell` et le clic simple inchangés. Compromis dit par l'agent : la marque lit « la route la plus courte provoque » et non « la case est sous allonge » |
| Retours 6 et 7, textes et bande d'initiative | Fait, **sous-agent Sonnet effort moyen** : `TurnStrip.tsx` neuf, monté par le fil principal au-dessus du plateau ; « knocked out and carried off · back in 2 rounds » ; textes du Spark. Puis **un troisième sous-agent Sonnet effort moyen** : rangs à la place des comptes dans l'échelle et la bande, bouton `Dig in`, lignes `braced` dans le fil, le rejeu et la fiche, phrase du briefing |
| Le rejeu | Fait, fil principal : un beat se ferme aussi sur `roundStarted`, sinon le roulement d'un Cracker en dernier barreau et sa réapparition au round suivant partageaient un beat |

**La mise en ligne, le 2026-10-10 dans le chat suivant**, par le fil principal (Fable 5.1), dans
l'ordre que Jérôme avait fixé :

| Quoi | État |
|---|---|
| Migration 0007 | **Appliquée par Jérôme** via `/supabase-migrate`, la colonne `matches.kickoff` vérifiée en lecture avant et après, consignée dans `04` |
| Harnais sur le moteur 3 | Smoke et playthrough verts avec `ENGINE_VERSION` à 3 le temps des runs, remise à 4 avant toute autre chose. Captures lues : la bande d'initiative au-dessus du plateau (encore en blocs par compte sur le moteur 3, attendu), `Plot route` actif puis grisé « no cell within reach », les cases dont la route la plus courte provoque en liseré orange, `Dig in` grisé pour un Striker |
| Le clic sur un pion | Le smoke ne l'exerçait pas : **étape ajoutée au tour 2** de `smoke.spec.ts`, qui clique une cible de Swing, Shove ou Pass si le plateau en offre une, sinon le premier pion adverse, et affirme la fiche. Capture lue : la fiche bascule sur l'adversaire cliqué. Le tray n'a pas encore été vu, aucune cible à portée dans les deux parties |
| Redéploiement | **Feu vert de Jérôme**, `resolve-action` v12 et `create-match` v10, **moteur 4 en ligne**, vérifié par l'API de gestion |
| Harnais sur le moteur 4 | **Un défaut trouvé au premier run** : sur un match neuf, le plateau restait sur le coup d'envoi avec le Trajector « NOW » et personne n'était jamais sur le chrono. Cause : deux `load()` en vol en même temps, le `StrictMode` de React montant l'effet initial deux fois en développement ; le premier avait réclamé l'ouverture, le second dessinait le snapshot, puis le premier revenait en dernier, dessinait le plateau d'avant l'ouverture et était annulé avant de la rejouer. **Corrigé dans `useMatch.ts`** : un compteur de génération, une lecture dépassée n'applique rien et ne réclame pas l'ouverture. Smoke et playthrough verts ensuite, 18 requêtes humaines, 0 refusée |
| Ce que les captures du moteur 4 montrent | L'ouverture rejouée depuis le coup d'envoi (le fil : « Quill Ironmaw takes the Payload. Quill Ironmaw dashes. », le Trajector allié prend le ballon et file à huit cases de la ligne adverse) ; la bande et l'échelle en **rangs numérotés**, Trajector allié en 1, Giff en 2, les Strikers puis les Breakers puis le Bulwark ; **les Crackers juste après l'équipe qui a la balle**, lus dans les événements des rounds 2 à 4 ; dans un rôle, le porteur d'abord. Sur le match joué jusqu'au sifflet : le Spark s'est échappé trois fois (`sparkMoved` cause `escape`), a été pris au round 9 et **est rentré au round 10** (écart 50), le Bulwark s'est planté une fois, cinq parades réussies sur sept |
| Un aléa resté ouvert | Un **401 sur `GET /rest/v1/role_stats`** au moment de la connexion du compte e2e, 2 runs sur 7, jamais deux fois de suite, code du hub inchangé depuis 2H.6. `global-setup.ts` imprime désormais le corps de la réponse en échec pour lire la raison la prochaine fois |
| Le sweep unique | `09` §12, lancé une fois après tout ce qui précède, constantes inchangées |

**Ce qui attend Jérôme** : trancher `09` §12, dont le prix du Spark maintenant qu'il revient après une
prise ; `/update`, `/commit` ; puis **sa partie**, dont le verdict sur ce que chaque rôle cherche
ouvre la phase 3. **Tranché et joué le 2026-10-11** : rien ne bouge au sweep, et la partie ouvre
2H.8 ci-dessous.

### Sous-phase 2H.8, « la surface de réparation, la relance, l'IA v2, la route, le fil », codée le 2026-10-11, porte ouverte

Par le fil principal (Fable 5.1), avec trois sous-agents Sonnet nommés ci-dessous, sur des fichiers
disjoints. La partie de Jérôme sur le moteur 4 a donné ses retours en chat, non numérotés, puis une
liste complète par rôle demandée par lui, triée par priorité, corrigée en deux passes (le Striker
presse coûte que coûte, le Breaker tape le porteur puis Strikers, Breakers, Trajector, fait mur et
non épaule, le Bulwark se plante sans attendre), puis trois questions fermées (le Striker prend le
ballon du coup d'envoi ; la surface en portée de grille ; le Breaker bouscule le porteur, le
Striker garde sa position de relais) et un arbitrage sur le moment de la relance (le Bulwark attend
la fin du bloc de l'équipe qui a marqué, puis passe en premier du bloc de son équipe). Tout est
écrit dans `00` C10 **avant** la première ligne de code. **Pas de sweep**, à sa demande.

| Quoi | État |
|---|---|
| Écart 53, la surface de réparation | Fait, fil principal. `engine/rules/box.ts`, état `penaltyBox` par Furnace, `relocated`, `movement.ts` et `combat.ts` ferment la zone à la route, au chemin envoyé, à la poussée et au recul, `closeBox` dans `reduce.ts` replace au but par `nearestFreeCell`, la zone rouvre au début du second round après le but. `engine/box.test.ts`, 6 tests |
| Écart 54, la relance | Fait, fil principal. `promoteBulwark` dans `initiative.ts` réordonne l'échelle en cours quand le bloc de l'équipe qui a encaissé est devant, sinon `relaunch` sur l'état et `buildTurnOrder` au round suivant. 2 tests |
| `ENGINE_VERSION` 5 | Fait. L'état gagne deux champs, les événements un kind |
| L'IA v2 | Fait, fil principal. `chaseKickoff`, `Board.hunter`, l'adjacence au porteur adverse, `dashCandidates` (presser, faire mur, jamais devant une cible à portée), `hunt` et `prey`, `block` à la place de `escort`, `relaunch`, le Bulwark planté par défaut et qui paie son pas. Détail des poids en `00` C10. 10 tests neufs dans `ai.test.ts`, deux titres récrits |
| La route en ligne droite | Fait, **sous-agent Sonnet effort moyen** : `pathTo` dans `rules/movement.ts` reconstruit le chemin depuis l'arrivée en prenant, à coût égal, le voisin le plus proche de la droite ; `reachableCells` inchangé ; le client passait déjà par `pathTo`. `engine/rules/movement.test.ts`, 5 tests |
| Le fil complet | Fait, **sous-agent Sonnet effort moyen** : `moved`, `recoiled`, `crackerMoved`, `crackerRespawned`, `payloadScattered` et l'interception ratée étaient muets dans `Feed.tsx`, `turnEnded` sans cas, et `replay.ts` plafonnait un beat à 4 lignes. Désormais une ligne par action, « holds position » pour un tour vide, plafond à 8. 5 tests. Le fil garde 120 événements (`FEED_LIMIT`), soit environ deux rounds maintenant que les marches s'affichent |
| L'écran de la zone et de la relance | Fait, **un troisième sous-agent Sonnet effort moyen** : `Board.tsx` dessine la zone fermée en violet sous les cases atteignables (`data-box`), `Feed.tsx` et `replay.ts` disent « is moved out of the penalty box », le projecteur du rejeu saute le pion, `Briefing.tsx` gagne deux items. Non vu en navigateur par l'agent |
| Vérification | `npm test` 460 sur 22 fichiers contre 429, `npm run typecheck` vert (racine, scripts, e2e), client typecheck et build verts. **Smoke vert en 32 s contre le moteur 4 en ligne**, `ENGINE_VERSION` épinglée à 4 le temps du run et remise à 5 ; `boxClosed` lit l'état d'un moteur antérieur sans planter pour ça. Captures lues : le fil énumère désormais les marches, les Dash et les bousculades tenues |

**La mise en ligne, le 2026-10-11 dans le même chat**, par le fil principal (Fable 5.1), après le
commit poussé par Jérôme (`/commit et push`) et son feu vert :

| Quoi | État |
|---|---|
| Redéploiement | `resolve-action` v13 et `create-match` v11, **moteur 5 en ligne**, aucune migration. Les matchs du moteur 4 sont archivés par le client |
| Harnais sur le moteur 5 | Smoke vert en 33 s, playthrough vert en 37 s, 15 requêtes humaines, 0 refusée, un match entier jusqu'au sifflet, perdu 0 à 20 par le compte e2e |
| Ce que les captures montrent | **Le Trajector allié laisse le ballon du coup d'envoi** (le fil : « Voss Powderkin moves 8 cells », ballon encore au centre, et c'est le pas sans but noté en dette) ; au round 9, **le Trajector chasse le Spark et prend l'attaque d'opportunité pour y aller** (« Gullo Emberkell catches Voss Powderkin leaving », « grabs at the Spark and misses », « The Spark skips a cell away from under its minder ») ; le fil énumère marches, Dash et bousculades tenues |
| Les événements du match en ligne, lus en base | Le ballon du coup d'envoi pris par `A-striker-3`, pas par le Trajector. Deux buts de la maison, les deux par un Breaker tirant de loin : **personne dans la zone, donc aucun `relocated`**, la zone violette n'a pas encore été vue. **Après chaque but, le premier tour du camp qui encaisse est bien `A-bulwark-1`**, au round suivant (écart 54 en ligne). Mais les deux fois le gardien **s'est planté au lieu de lancer** |
| Pourquoi le gardien ne lance pas | Sonde sur 30 matchs d'auto-jeu en veteran, 36 relances : **le gardien lance à chaque fois qu'une passe est légale (13 sur 13)**, et se plante quand aucune ne l'est (22 sur 36), parce qu'après un but ses six coéquipiers sont à 15 à 30 cases de lui, hors des 12 cases ou derrière une caisse. `rejoin` (Striker 40, Trajector 30) les ramène à portée au round suivant, et il lance alors. La règle « il lance immédiatement » n'a donc pas de receveur une fois sur deux : **question posée à Jérôme**, voir ci-dessous. Sonde jetée après lecture |

**La relance sans receveur, tranchée par Jérôme le 2026-10-11 et codée dans la foulée**, fil
principal : si une case atteignable avec son déplacement normal donne au gardien un coéquipier à
portée et en vue, il y va, même au-delà de sa laisse, la plus proche de sa bouche, et passe dans le
même tour ; sinon il se plante ; au tour suivant même règle, et sans ligne même en marchant il se
replante, jamais de Dash. Écrit dans `00` C10 sous le Bulwark. `relaunchCandidates` dans
`chooseAction.ts`, et la laisse est levée dans `positionValue` tant qu'il porte le ballon avec une
relance à faire, sinon il revenait à sa bouche à 500 points au lieu de lancer, vu en traçant la
scène. 2 tests, **462 tests**, typecheck vert. **Règle d'IA seule** : `ENGINE_VERSION` reste 5,
mais les deux fonctions portent l'IA et sont **à redéployer sur le feu vert de Jérôme**.

**Redéployée le 2026-10-11 sur le feu vert de Jérôme** : `resolve-action` v14 et `create-match`
v12, moteur 5 inchangé.

**La partie de Jérôme, le 2026-10-11**, star, 40 à 20 : cinq retours en chat, lus par le fil
principal contre les événements du match en base (table `match_events`, état de coup d'envoi dans
`matches.kickoff`). Corvo, son Trajector, a marché 8 cases au round 2 sans rien d'autre, et 32
tours sur 136 ont fini avec l'Action inutilisée : le Dash était noté sur le mouvement restant,
zéro après la marche, défaut du moteur de décision à une action. L'interception du round 4 était
l'écart 48 appliqué, à une case de la trajectoire, confirmé par lui. Son Bulwark est resté planté
en (9,0) puis (9,1) des rounds 6 à 10, but encaissé au round 6 : la distance à la bouche la plus
proche mettait (9,1) à égalité avec (7,1), et un Bulwark planté payait tout pas. Il a demandé
comment l'IA décide et ce que font les jeux de ce type ; réponse en chat, recommandation acceptée :
**noter des plans de tour et non des actions**. Tout est écrit en **`00` C11, validé par lui**, et
forme **2H.9**, à coder.

**Ce qui attend Jérôme** : `/commit` ; puis au chat suivant le codage de 2H.9 par le fil
principal, son feu vert de redéploiement, sa partie, et **un sweep s'il le demande**, un seul,
contre `09` §12.

### Sous-phase 2H.9, « le plan de tour, l'écart 53 bis, la case de repos du gardien », codée le 2026-10-11, porte ouverte

Par le fil principal (Fable 5.1), avec deux sous-agents Sonnet nommés ci-dessous, sur des fichiers
disjoints, à partir de `00` C11 validé par Jérôme mot pour mot. Rien n'a été rediscuté. **Pas de
sweep**, à sa demande. Pas de commit ni de redéploiement : les deux lui appartiennent.

| Quoi | État |
|---|---|
| Le plan de tour | Fait, fil principal. `ai/chooseAction.ts` récrit autour d'une classe `Planner` : un candidat est un plan, Dash ou non, marche vers une case d'arrivée, action depuis cette case, repli avec le mouvement restant ; la note est la valeur de l'action plus `positionValue` de la case finale moins celle du départ moins les attaques d'opportunité des trajets ; `chooseAction` renvoie la première action du meilleur plan et le plan est reconstruit après chaque action. `rankPlans` expose les plans entiers avec leur phrase, `rankActions` les replie sur leur première action, même contrat qu'avant pour `session.ts`, `selfPlay.ts`, le playthrough et `live-match.ts`. Le détail, poids par poids, est le paragraphe « comment le plan de tour est codé » en `00` C11 |
| Ce qu'une case débloque | Fait, fil principal. `actionOptionsAt(arena, state, unit, cell)` dans `engine/legalActions.ts`, la moitié positionnelle de `legalActions` sortie en fonction et rappelée par lui pour la case réelle : l'IA demande au moteur ce qu'elle pourrait faire depuis une case avant d'y marcher, sans copie des règles d'adjacence, de portée et de ligne de vue. Sortie de `legalActions` inchangée |
| Le Dash | Fait, fil principal. Un plan « dash, puis marche de 16 cases », noté sur la case d'arrivée avec l'Action dépensée (`positionValue(board, cell, false)`, qui ne compte pas la prise du Spark pour le chasseur), à valeur faciale contre les plans qui dépensent l'Action ; un Dash qui n'achète rien n'est pas joué, le plan le plus court gagne à égalité. Interdit devant une cible à portée, sauf la presse (plancher `pressCarrier`) et le mur (plancher `block`) quand la marche simple n'y arrive pas. `w.dash` n'est plus lu |
| Jamais l'Action en poche | Mesuré sur trois matchs d'auto-jeu (vétéran graine 11, rookie et star graine 3) : 5, 0 et 2 tours sur 132 à 135 finis sans Action, contre 32 sur 136 dans la partie de Jérôme, avec 32 à 40 Dash et 2 à 4 Dodge par match |
| Écart 53 bis | Fait, fil principal, `applyPass` dans `reduce.ts` : la zone de l'équipe du lanceur passe à `null` quand le lanceur est le Bulwark, avant le test d'interception. 4 tests dans `engine/box.test.ts`, **sous-agent Sonnet effort moyen** : attrapée, ratée, interceptée, et la passe d'un joueur de champ qui ne lève rien |
| La case de repos du gardien | Fait, fil principal. `restNearness` dans `evaluate.ts` : distance à `arena.spec.starts[team][0]` plus distance à la bouche, sur deux fois la longueur du terrain ; `Board.restCell` ; poids `rest` dans les quatre fiches, 1 pour le Bulwark. Plus de pénalité de pas sur un Bulwark planté au début de sa décision : « rentrer puis se planter » est le plan `[move, brace]`, et un Bulwark déjà planté qui bougerait rend `brace` |
| `reachableCells` | **Sous-agent Sonnet effort moyen** : paramètre `from` optionnel, le départ hypothétique du repli, et une file à seaux à la place du tri de la frontière à chaque pas, mêmes coûts, 3 tests dans `movement.test.ts` |
| Tests | `ai/ai.test.ts` gagne un bloc « the turn plan, 2H.9 », 6 tests : le gardien en (9,1) rentre en (7,1) puis se plante sans Dash, le Striker à douze cases d'un ballon perdu Dash plutôt que de garder l'Action, pas de Dash vers nulle part, marcher puis frapper, frapper puis marcher avec le repli dans le plan, le plan reconstruit après chaque pas. **Deux scènes de C10 ont changé de mécanique sans changer de sens** : « carries towards the Furnace rather than shooting from nowhere » et « the Trajector drops everything for the Spark » attendaient une marche en première action et reçoivent un Dash, parce que rien n'utilisait l'Action ; elles affirment désormais le résultat du tour |
| Vérification | `npm test` **475 sur 22 fichiers** contre 462, `npm run typecheck` vert (racine, scripts, e2e), client typecheck et build verts. **Le test des cinquante millisecondes passe** ; sonde jetée après lecture : 2,7 ms par décision en moyenne, 17,9 ms au pire (un Breaker au round 5), contre moins d'une milliseconde avant ; un match d'auto-jeu dure 1,1 s au lieu de 0,5 s, donc un sweep prendra environ 11 minutes au lieu de 5. Suite complète en 53 s contre 37 |
| Harnais | `ENGINE_VERSION` 5 dans le dépôt comme en ligne, rien à épingler. Smoke vert en 31 s, playthrough vert en 54 s, 19 requêtes humaines, 0 refusée, gagné 40 à 20 par le compte e2e : **le siège humain du playthrough est piloté par le nouveau planificateur depuis Node contre les fonctions en ligne**, et la capture du round 10 montre « Giff dashes » avec 80 pieds à marcher, le Dash joué en premier puis la marche. La maison des captures est encore l'IA v14 en ligne |

**Ce que ça change à l'écran** : rien. Aucun composant du client n'est touché.

**La mise en ligne, le 2026-10-11 dans le même chat**, par le fil principal (Fable 5.1), après le
commit `922368f` poussé sur son `/commit et push` et son feu vert :

| Quoi | État |
|---|---|
| Redéploiement | `resolve-action` v15 et `create-match` v13, moteur 5 inchangé, aucune migration, les matchs ouverts continuent |
| Smoke | **Rouge une fois, pour une raison du harnais et pas du jeu** : au round 2 la maison avait fini un Striker adjacent à Giff, le smoke a cliqué ce pion et le tray « Swing at / Shove » s'est ouvert pour la première fois au harnais, avec deux boutons, et le localisateur du test en attendait un seul (violation du mode strict de Playwright). `.first()` ajouté dans `smoke.spec.ts`, c'est la dette « tray jamais vu au harnais » qui se solde. Puis smoke vert en 23 s |
| Playthrough | Vert en 1,1 min, 26 requêtes humaines, 0 refusée, match nul 10 à 10 en douze rounds |
| Ce que les captures montrent | **Le plan de tour est en ligne chez la maison** : « Derro Tarrow dashes. Derro Tarrow moves 16 cells. » en tête de round, le Dash joué en premier puis une seule marche ; au round 7 Giff bouscule Nib Flintlock qui lâche le ballon |
| Un trait à connaître | Dans 6 tours sur 401 d'auto-jeu (trois matchs vétéran), le Dash vient **après** une première marche : « moves 8, dashes, moves 7 ». Ce n'est pas un défaut du plan mais de la relecture après chaque pas : des termes de `positionValue` lisent la position courante de l'unité (`rejoin` hors de portée de passe, `looseBallReach`, `keenerMateNear`), donc le paysage change une fois l'unité déplacée et un Dash devient rentable là où il ne l'était pas. La case finale est la même, l'ordre des lignes du fil diffère. À laisser tel quel sauf si Jérôme le voit et s'en plaint |

**La partie de Jérôme, le 2026-10-11**, star, **50 à 0**, match `0291a651`, Tacker en
`A-striker-2`. Deux retours en chat, écrits en `00` C12 sans discussion : **un humain joue en
dernier de son rôle** (écart 55, qui renverse la phrase de l'écart 51), et **le Trajector ne
recule jamais à son premier tour**. Et une demande de méthode : la partie est **consignée tour par
tour** et le chat suivant commence par l'analyser, décision par décision, contre la réflexion d'un
agent Opus 5.5 effort élevé, pour en tirer des leçons et des ajustements de l'IA avant de coder.

| Quoi | État |
|---|---|
| `scripts/dump-match.ts` | Neuf, fil principal, permanent. Lit un match en base avec la clé de service (lecture seule, `--list` ou `--match <id>`), écrit `match.json`, `kickoff.json`, `events.json` et `match.md` dans `docs/matches/<date>-<id8>/`, puis **rejoue le match en local** depuis `matches.kickoff` : chaque action est reconstruite depuis les événements qu'elle a produits, `reduce` la rejoue, les événements sont comparés aux événements stockés, et avant chaque décision `rankPlans` dit ce que l'IA de ce dépôt aurait choisi et pourquoi, pour une IA sa raison, pour l'humain ce que l'IA aurait fait à sa place |
| Le match `0291a651` | 869 événements, **418 décisions rejouées, 0 écart d'événement**, score final reproduit, et **0 décision d'IA sur 382 dont l'action stockée ne soit pas le premier plan de ce dépôt** : le dépôt et les fonctions en ligne jouent la même IA, et `match.md` dit vraiment pourquoi chaque coup a été joué. Un seul cas a demandé une règle de lecture : une marche coupée par les attaques d'opportunité, le marcheur évacué en route, est stockée comme les cases parcourues et non comme la route envoyée, et le script la reconnaît comme le même plan quand elle en est un préfixe. 133 tours, **3 Actions inutilisées** contre 32 dans la partie précédente, 39 Dash |
| Ce que le fichier montre déjà | Au round 1 le Trajector allié a dashé de `(12, 14)` à `(5, 1)`, treize cases vers son propre but : avec `chaseKickoff` à zéro et personne à portée de passe, la seule pente était `guardFurnace`. C'est le retour 1 de Jérôme, cause lue dans les plans |

**Ce qui attend Jérôme** : `/update` et `/commit et push` demandés dans le même message, faits
par le fil principal ; puis au chat suivant l'analyse de `docs/matches/2026-10-11-0291a651/match.md`
avec un agent Opus 5.5 effort élevé, les leçons, puis le code de 2H.10, écarts dans `00` avant la
première ligne ; **un sweep s'il le demande**, un seul, contre `09` §12, en comptant onze minutes.

### Sous-phase 2H.10, « l'analyse de la partie, l'humain dernier de son rôle, le Trajector vers l'avant, la quatrième passe de l'IA », codée le 2026-10-11, porte ouverte

Par le fil principal (Fable 5.1), avec deux sous-agents nommés ci-dessous, à partir de `00` C12
validé par Jérôme mot pour mot avant la première ligne de code. **Pas de sweep**, à sa demande
(« inutile pour cela, on en fera un plus tard »). Pas de commit ni de redéploiement : les deux lui
appartiennent.

**L'analyse de la partie d'abord.** Un **agent général Opus 5.5 effort high** a lu `match.md` en
entier et rendu `docs/matches/2026-10-11-0291a651/analyse-2H10.md` : 133 tours d'unité lus un par
un contre ce qu'un joueur réfléchi aurait fait, onze leçons, dix-huit ajustements classés par effet
puis par rôle, trois questions. Le fil principal l'a relu contre `match.md`, C10, C11 et le code,
a tranché quatre de ses points ouverts dans le code (la frappe de Cracker calculée avec l'unité
encore sur sa case de départ ; les passes sans intercepteur par l'écart 48 ; Tobb ramené chez lui
par `guardFurnace` ; le Spark qui rebondit trois rounds dans la poche de la ligne 19, règle 36b
appliquée) et a ajouté quatre points de sa relecture (le Breaker qui préfère un Striker adjacent
au porteur à deux cases, la passe à égalité tranchée par l'identifiant, les Strikers collés, la
case de début de tour). Présenté à Jérôme par rôle et par priorité, corrigé par lui en chat
(les places libres autour du porteur, le Striker collé seulement si son relais tient, le Breaker
porteur et son exception, le Trajector seul sur le Spark, la presse en Dash par une route sans
allonge adverse et cette route pour tout déplacement, la version 6), puis écrit en `00` C12.

| Quoi | État |
|---|---|
| Écart 55, l'humain dernier de son rôle | Fait, fil principal. `teamSlots` dans `engine/initiative.ts` range les IA du rôle avant les humains ; le gardien humain qui relance reste en tête de son équipe (écart 54 prime). 2 tests dans `engine/setup.test.ts` |
| Écart 56, la case de début de tour | Fait, fil principal. `TurnState.startedAt` posée par `beginTurn` ; **`ENGINE_VERSION` 6**, le seul changement de forme. Le test de session qui tirait sans ballon à la relance tire désormais sur un Spark absent, parce qu'un Striker humain reçoit maintenant la balle de ses coéquipiers IA avant de jouer |
| Le Trajector vers l'avant au premier tour | Fait par construction : avec `carrierSafety`, `block` et les routes sûres, plus aucune pente ne tire un Trajector sans balle vers sa propre bouche ; vérifié sur la scène du round 1 en auto-jeu |
| Les routes sûres | **Sous-agent Sonnet effort élevé** : `safeReachableCells` et `safePathTo` dans `engine/rules/movement.ts`, un balayage par (case, pieds dépensés) qui garde pour chaque case la route au moins de provocations puis au moins de pieds, même ensemble de cases que `reachableCells` ; 11 tests dans `movement.test.ts`. Récrits par le fil principal sur des indices numériques quand la première version faisait 8 ms par décision |
| La quatrième passe de l'IA | Fait, fil principal, `ai/chooseAction.ts` récrit et `ai/evaluate.ts` étendu, détail poids par poids dans le paragraphe « comment la quatrième passe est codée » de `00` C12. Nouveaux poids dans les quatre fiches : `carrierSafety`, `spread`, `pressDash`, `shoveBystander`, `receiver`, `chainException` ; `block` change de sens (une place prise) ; `avoidOpportunity` change d'échelle ; `dash`, mort depuis 2H.9, retiré |
| Tests | `ai/ai.test.ts` gagne un bloc « Jérôme's fourth pass, 2H.10 », 14 tests : le chasseur abîmé marche sur le Spark et l'attrape sans Dodge ; le chasseur vise la case de la prochaine dérive ; ramasser puis lancer ; le porteur finit hors de portée des bousculeurs ; garder pour un tir propre ; le Breaker bouscule un porteur sain et frappe un porteur évacuable ; pas de bousculade de non-porteur ; le Breaker ramasse devant un Striker qui a joué ; le gardien ne dashe pas hors de sa laisse ; le Breaker va au porteur à portée plutôt qu'au Striker adjacent ; le Breaker porteur sert un Striker devant lui qui a joué ; la route contourne l'allonge ; la presse en Dash par une route propre ; un Striker abîmé ne traverse pas deux Breakers. Quatre scènes de 2H.8 et 2H.9 récrites au nouveau sens (la place prise, le Breaker sur la route d'un porteur qui n'a pas joué, seule une cible légitime interdit le Dash) |
| Vérification | `npm test` **503 tests sur 22 fichiers contre 475**, `npm run typecheck` vert (racine, scripts, e2e), client typecheck et build verts. Sonde jetée après lecture : 2,7 ms par décision en moyenne et 25 ms au pire sur un match vétéran, comme en 2H.9 ; le test des cinquante millisecondes passe |
| Harnais | Smoke vert deux fois (30 et 32 s) et playthrough vert deux fois (3 puis 20 requêtes humaines, 0 refusée, le second sur un match entier jusqu'au sifflet, 57 s), contre les fonctions en ligne du moteur 5 avec `ENGINE_VERSION` épinglée à 5 le temps du run et remise à 6. Captures lues : la maison en ligne joue encore l'IA v15, l'échelle affichée est celle de l'écart 51 ; **le siège humain du playthrough est piloté par le planificateur de 2H.10 depuis Node**, 0 refus |

**Ce que ça change à l'écran** : rien. Aucun composant du client n'est touché ; la route proposée au
clic reste la ligne droite de 2H.8, la route sûre est celle de l'IA.

**La mise en ligne, le 2026-10-11 dans le même chat**, par le fil principal (Fable 5.1), après le
commit `0dfbaad` (`/commit`) et son feu vert :

| Quoi | État |
|---|---|
| Redéploiement | `resolve-action` v16 et `create-match` v14, **moteur 6 en ligne**, aucune migration. Les matchs du moteur 5 sont archivés par le client |
| Harnais sur le moteur 6, sans épingle | Smoke vert en 31 s, playthrough vert en 55 s, 19 requêtes humaines, 0 refusée, un match entier jusqu'au sifflet, gagné 40 à 20 sur le Spark par le compte e2e en onze rounds |
| Ce que les captures montrent | **L'écart 55 à l'écran** : l'échelle lit Dolm Cannonade, Thessa Rivet, Tullin Ironmaw puis Giff, l'humain quatrième de son équipe, après les deux Strikers IA ; au coup d'envoi c'est Thessa Rivet, un Striker IA, qui prend le ballon et le passe ; au round 8 la maison joue la quatrième passe (marche, batte, recul, marche dans le fil) |

**Ce qui attend Jérôme** : sa partie sur le moteur 6, consignée par `dump-match.ts` ; ses retours
en C13 avant le code ; **un sweep quand il le demandera**, contre `09` §12, en comptant onze
minutes.

### Sous-phase 2H.11, « la cinquième passe de l'IA, l'écart 57, la parade », codée le 2026-10-12, porte ouverte

Par le fil principal (Fable 5.1), avec deux sous-agents Sonnet nommés ci-dessous, à partir de
`00` C13, les vingt-neuf points dictés par Jérôme le 2026-10-12 après la lecture round par round
de sa partie sur le moteur 6 (star, 30 à 50, match `a17c22a5`, visualiseur `viewer.html`), validés
point par point avant la première ligne de code, plus l'écart 57 et neuf poids. **Pas de sweep**,
à sa demande. Pas de redéploiement : il attend son feu vert.

| Quoi | État |
|---|---|
| Écart 57, un porteur ne tente jamais le Spark | Fait, fil principal. `actionOptionsAt` dans `engine/legalActions.ts` ne propose pas la prise à une unité qui tient le ballon, `applyCatchSpark` dans `reduce.ts` la refuse. Aucune forme d'état ne change, **`ENGINE_VERSION` reste 6**. 2 tests dans `legalActions.test.ts`, **sous-agent Sonnet effort moyen** |
| Point 29, une parade n'explose jamais sur le pareur | Fait, fil principal. `parryDirection` dans `engine/rules/ordnance.ts` : à défaut de face qui touche un adversaire ou personne, la face qui touche le coéquipier le plus solide en PV, jamais celle qui revient sur le Breaker. 2 tests dans `ordnance.test.ts`, le même sous-agent |
| Les neuf poids | Dans les quatre fiches tels que dictés : `shove` Breaker 30, `stripCarrier` 150 partout, `screenCarrier` Breaker 80, `carrierSafety` Breaker 80, `guardStrike` 150, `batCracker` Striker 8 et Trajector 5, `wantsEscort` Breaker 0, `shoot` Striker 150 |
| La cinquième passe de l'IA | Fait, fil principal, `ai/chooseAction.ts` et `ai/evaluate.ts`, détail point par point dans « comment la cinquième passe est codée » en `00` C13. Les fiches gagnent `approachDash` (remplace `pressDash`), `idleSwing` et `preyByHp` (remplace la table `prey`), perdent `screen` ; `parryPost` devient un interrupteur en monnaie d'allonge. Deux lectures du fil principal à relire par Jérôme : la proie par chance d'évacuer est **normalisée sur un Striker frais du Tier** pour que `attack` garde son échelle ; et l'approche en Dash reste interdite par une cible légitime à portée (C10 commune 3) et, pour le Breaker, par une proie à portée de marche (point 20) |
| Ce que le code a corrigé en route | Un porteur sans menace nulle part pouvait reculer par la lettre du point 12 (« aucune case devant lui n'est moins exposée ») : sans exposition, pas de recul. Le calcul d'une ligne de Cracker par case candidate (point 27) coûtait trois fois le match : remplacé par un champ de distance par Cracker et par décision |
| Tests | `ai/fifthPass.test.ts`, nouveau, **sous-agent Sonnet effort élevé**, 23 tests : un par point codé (1, 4, 5, 7, 8, 10, 12, 13, 14, 15, 16, 17 au dernier round et en mort subite, 19, 20, 22, 23, 27, 28), plus l'écart 57 côté IA. Dans `ai/ai.test.ts`, fil principal : la chaîne accepte un receveur jusqu'à huit cases derrière (point 9), les scènes de vue et de couverture lisent un Trajector porteur qui a joué (point 3), le Breaker frappe la proie la plus facile à évacuer (point 21), la scène « garde pour un tir propre » ne laisse plus de tir propre à portée de marche (point 13 : l'ancienne passait grâce à la passe gonflée que ce point corrige), deux scènes d'ordres et une de Dash repositionnées hors des nouveaux planchers |
| Vérification | `npm test` **530 tests sur 23 fichiers contre 503**, `npm run typecheck` vert (racine, scripts, e2e), client typecheck et build verts. Dix-huit matchs d'auto-jeu joués à la main pour contrôler que le sport se joue encore, pas un sweep : 2,5 à 3,5 buts par match sur six graines par Tier, contre 1,1 à 2,2 au dernier sweep de `09` §12, à lire au sweep que Jérôme demandera. 1,5 s par match contre 1,2 s, donc un sweep environ quatorze minutes ; le test des cinquante millisecondes passe |
| Harnais | Smoke vert en 34 s et playthrough vert en 45 s, 16 requêtes humaines, 0 refusée, un match entier jusqu'au sifflet, contre les fonctions en ligne du moteur 6 sans épingle (le siège humain est piloté par le planificateur de 2H.11 depuis Node, la maison en ligne joue encore la quatrième passe) |

**Ce que ça change à l'écran** : rien. Aucun composant du client n'est touché.

**La mise en ligne, le 2026-10-12 dans le même chat**, par le fil principal (Fable 5.1), après le
commit `0ffa299` et son feu vert :

| Quoi | État |
|---|---|
| Redéploiement | `resolve-action` v17 et `create-match` v15, **la cinquième passe en ligne**, moteur 6 inchangé, aucune migration, aucun match archivé |
| Harnais sur les fonctions redéployées | Smoke vert en 25 s, playthrough vert en 18 s, 14 requêtes humaines, 0 refusée, un match entier jusqu'au sifflet, perdu 10 à 40 sur le ballon par le compte e2e en dix rounds |
| Ce que les captures montrent | Au round 9, Derro Flintlock, Striker de l'équipe qui n'a pas la balle, **dashe dix cases vers le porteur** en traversant deux allonges, les deux manquées : le Dash d'approche de C13 point 4 par une route que la route sûre ne pouvait pas éviter ; le siège humain, piloté par le planificateur de 2H.11 depuis Node, dashe lui aussi |

**Ce qui attend Jérôme** : sa partie sur 2H.11 consignée par `dump-match.ts`, `CONTEXT.md` par
`/update`, et **un sweep quand il le demandera**, contre `09` §12, en comptant quatorze minutes.

### Sous-phase 2H.12, « l'humain choisit sa place dans son rôle, le Breaker ramasse d'abord », codée et en ligne le 2026-10-12, porte ouverte

Par le fil principal (Opus 5.5), avec trois sous-agents Sonnet nommés ci-dessous, à partir de `00`
C14 : les deux règles dictées par Jérôme le 2026-10-12, écrites avant la première ligne de code, et
la question du chrono de la popup tranchée par lui en chat (« je prends ta recommandation » : son
propre chrono, puis un chrono neuf pour le tour). **Pas de sweep**, à sa demande.

| Quoi | État |
|---|---|
| Écart 58, la popup | Fait, fil principal : `choosePlace`, `turn.placing`, `placeOffered` et `placeChosen`, `placementAt` et `placeHuman` dans `engine/initiative.ts`, `offerPlace` et `applyChoosePlace` dans `reduce.ts`, `legalActions` et `onlyEndTurnLeft`. **`ENGINE_VERSION` 7** |
| Le serveur | `expireIfDue` joue la dernière place ; `clockKey` sépare le chrono du choix de celui du tour, lu **avant** l'action humaine |
| Le Breaker ramasse d'abord | Fait, fil principal : `pickupFirst` (Breaker 1), `yieldToKeener` Breaker 0, `ballFirst` et `PICKUP_FIRST` dans `ai/chooseAction.ts`, les plans « dash, marcher, ramasser » et « attraper, marcher, ramasser » |
| L'écran | `client/src/match/PlacePrompt.tsx`, **sous-agent Sonnet effort moyen** ; `Match.tsx` et le fil, fil principal |
| Tests | `ai/sixthPass.test.ts`, 8 tests, **sous-agent Sonnet effort moyen**, qui a trouvé que la prise du Spark sous les pieds perdait contre un ramassage ordinaire (défaut antérieur à 2H.12, corrigé) ; `engine/placement.test.ts`, 11 tests, **sous-agent Sonnet effort élevé**, qui a trouvé que le tour suivant une place 1 gardait l'échéance du choix (corrigé). `session.test.ts`, `replay.test.ts`, `ai.test.ts` et `fifthPass.test.ts` ajustés par le fil principal |
| Vérification | `npm test` **549 tests sur 25 fichiers contre 530**, typecheck racine, scripts et e2e verts, client typecheck et build verts, le test des cinquante millisecondes passe. Dix-huit matchs d'auto-jeu, pas un sweep : 2,7 / 2,0 / 3,3 buts de ballon par match, 1,3 à 1,4 s par match |
| Harnais avant la mise en ligne | Smoke vert en 31 s et playthrough vert en 25 s, `ENGINE_VERSION` épinglée à 6 le temps du run puis remise à 7 : pas de popup, les fonctions en ligne étant du moteur 6 |
| Commit | `bf00089` |

**La mise en ligne, le 2026-10-12 dans le même chat**, sur le feu vert de Jérôme (question fermée,
« Oui, redéploie ») :

| Quoi | État |
|---|---|
| Redéploiement | `resolve-action` v18 et `create-match` v16, **moteur 7**, les matchs ouverts du moteur 6 archivés, aucune migration |
| Smoke | Vert en 28 s au second essai ; le premier a expiré à la connexion dans `global-setup.ts`, juste après le déploiement. **La popup est vue au harnais**, capture `04-place-prompt-round-1.png` lue : « When does Giff play? », trois boutons 1st, 2nd, 3rd (default), « Close, play last », 120 s, la barre d'actions éteinte derrière ; le joueur passe en tête de ses Strikers dans la chaîne le temps du choix |
| Playthrough | Vert en 26 s, 17 requêtes humaines, 0 refusée, 60 à 30 ; la popup répondue à l'écran à chaque round, places 1, 3, 2, 1, 2, 3 |
| Consigné par `dump-match.ts` | 445 décisions rejouées, 0 écart d'événement ; une ligne DIFFERS, la relance du gardien B au round 9 interceptée : le receveur d'une passe volée n'est pas écrit dans les événements et le dump retient la première passe qui produit les mêmes jets. Artefact connu du dump, pas une différence d'IA. Dossier non gardé |

**Un constat du fil principal, sans décision** : **le Trajector prend le ballon du coup d'envoi**
dans douze matchs d'auto-jeu sur douze, et Thessa l'a pris dans la partie `a17c22a5`, contre C10
Trajector 3 et C10 commune 6. Cause lue dans le code : le plan « marcher, ramasser, passer » de
2H.10 se note sur `grabPayload` sans le facteur `chaseKickoff`, qui ne pèse que dans
`positionValue`. Antérieur à 2H.12. **Tranché par Jérôme le même soir** : le Trajector laissera le
ballon du coup d'envoi aux Strikers, **à coder au prochain lot de corrections**, en `00` C15 avec
ses retours, pas avant. Ses trois matchs du moteur 6 de l'après-midi ne se consignent pas.

**Ce qui attend Jérôme** : sa partie sur 2H.12, jouée le 2026-10-12 au soir, à consigner par
`dump-match.ts` au prochain tour de dev (prévu le 2026-10-17), et un sweep seulement s'il le
demande.

### Sous-phase 2H.13, « le chrono, le Spark qui fuit les Trajectors, le Shove qui prend le ballon, la relance en quatre temps, la septième passe de l'IA », codée le 2026-10-14, porte ouverte

Par le fil principal (Fable 5.1), avec quatre sous-agents Sonnet nommés ci-dessous, à partir de
`00` C15 : les retours de Jérôme après vingt et un matchs sur le moteur 7, lus contre les
événements et les huit plans du visualiseur, reformulés et tranchés point par point en chat avant
la première ligne de code. **Pas de sweep**, à sa demande.

| Quoi | État |
|---|---|
| Les matchs | Vingt et un sur le moteur 7 du 12 au 14 ; cinq consignés et rejoués sans écart (`4f6af883`, `6f956ed1`, `afdea53b` en Trajector, `919c98c0` en Bulwark, `f825ec20` en Striker), gardés dans `docs/matches/` sur sa décision |
| Le chrono | Cause trouvée dans `session.ts` : la clé lue avant l'action ne portait que l'unité, un rôle sans popup gardait l'échéance du round 1 tout le match. Corrigé, clé `unité@round:index` |
| Écarts 59 à 62 | Fait, fil principal : `sparkDriftFace`, `sparkReturnCell`, `applyShove` avec `tookPayload`, `RELAUNCH_ORDER` et `promoteBulwark` devant le premier Breaker. **`ENGINE_VERSION` 8** |
| L'écran | `recoilBlocked`, `passIntercepted.toId`, marqueur de Réaction dépensée hors du pion, popup dockée et déplaçable sans voile, **deux sous-agents Sonnet effort moyen** ; `turn.shot` dans l'état |
| L'IA, septième passe | Fait, fil principal : le coup d'envoi du Trajector, `depthInRange` pour le porteur, `shooterYields`, le gardien jamais dans une allonge, le relais sur la case du gardien, l'appel qui lève la chaîne et expire au tour suivant (serveur) |
| Tests | `engine/c15.test.ts`, 42 tests, huit récrits, **sous-agent Sonnet effort élevé** ; `ai/seventhPass.test.ts`, 18 tests, trois récrits, **sous-agent Sonnet effort élevé** ; `replay` et `motion`, cinq tests. **617 tests sur 27 fichiers contre 549 sur 25**, typecheck racine, scripts, e2e et client verts, build vert |
| Vérification | Dix-huit matchs d'auto-jeu (`scripts/control-2h13.ts`) : 1,8 / 2,2 / 2,0 buts de ballon par match, 67 prises de balle sur 71 Shove réussis, 0 relance volée sur 37, 0 reprise de tireur, Trajector 0/18 au coup d'envoi, 1,7 s par match |
| Harnais avant la mise en ligne | Smoke vert en 36 s, playthrough vert en 30 s (21 requêtes, 0 refusée), `ENGINE_VERSION` épinglée à 7 puis remise à 8 ; la popup vue dans la colonne de droite, capture lue |
| Commit | `57b647c` |

**La mise en ligne, le 2026-10-14 dans le même chat**, sur le feu vert de Jérôme (question fermée,
« Oui, redéploie ») :

| Quoi | État |
|---|---|
| Redéploiement | `resolve-action` v19 et `create-match` v17, **moteur 8**, les matchs ouverts du moteur 7 archivés, aucune migration |
| Smoke | Vert en 37 s au premier essai, trois tours joués |
| Playthrough | Vert en 28 s, 16 requêtes humaines, 0 refusée, 40 à 0 ; la popup répondue à l'écran à chaque round, capture lue : dockée sur la colonne de droite, le terrain lisible derrière. **La zone violette de la surface de réparation (`data-box`) est vue au harnais pour la première fois**, capture du round 7 |
| Consigné par `dump-match.ts` | Match `67fecefa`, 428 décisions rejouées, 0 écart d'événement, 0 DIFFERS. Le premier passage en montrait deux : une marche coupée par une allonge dont le recul était bloqué n'était plus recousue, `recoilBlocked` manquant à `reactionTo` du dump. Corrigé dans ce commit. Dossier non gardé |

**Ce qui attend Jérôme** : sa partie sur 2H.13, à consigner par `dump-match.ts`, et un sweep
seulement s'il le demande.

### Sous-phase 2H.14, « la passe gratuite après le Shove, le relais du Trajector au coup d'envoi, trois retours d'écran », codée le 2026-10-14, porte ouverte

Par le fil principal (Fable 5.1), avec deux sous-agents Sonnet nommés ci-dessous, à partir de
`00` C16 : les cinq retours de Jérôme après ses trois matchs sur le moteur 8, lus contre les
événements, les plans du visualiseur et le code, reformulés, deux questions fermées tranchées en
chat (« n'importe quand dans le tour », « b »), C16 validé avant la première ligne de code.
**Pas de sweep**, pas demandé.

| Quoi | État |
|---|---|
| Les matchs | Trois sur le moteur 8 le 2026-10-14 au soir, consignés et rejoués sans écart ni DIFFERS : `20edbca9` (Striker, 30-20), `b5910869` (Striker, 70-0), `dc474770` (Trajector, 70-30), gardés dans `docs/matches/` |
| Le Trajector qui recule | Cause lue dans `b5910869` : premier de son équipe au round 1, personne ne porte le ballon, relais et mur valent zéro, `guardFurnace` seul tire, « dash, then walk to (5, 1) » à 1,7. Le journal de 2H.10 disait « fait par construction » : faux dans ce cas |
| Écart 63, la passe gratuite | Fait, fil principal : `turn.freePass` (`types.ts`), posé par `applyShove` sur un porteur, consommé par `applyPass` (qui accepte `actionUsed` avec `freePass`), lu par `legalActions` (la passe seule survit à l'Action). **`ENGINE_VERSION` 9**. Un match du moteur 8 ne se rejoue plus avec ce dépôt |
| L'IA, huitième passe | Fait, fil principal. **Point 1** : `Board.kickoffRelay` dans `evaluate.ts` (ballon jamais porté, rôle à `chaseKickoff` zéro) pose `wardLine` depuis la case du ballon vers la bouche adverse, `carrierCanServe` vrai ; `outlet` et `laneCover` lisent ces cases sans porteur ; la branche « coéquipier du porteur » de `positionValue` est sortie en `relayValue` et lue aussi au coup d'envoi ; `kickoffMayEnd` dans `chooseAction.ts`, lu par `mayEnd` aux quatre portes de `carrierMayEnd`, refuse toute case plus près de sa bouche que `turn.startedAt`. **Point 2** : `freeThrow` dans `Planner.plans` offre « passer » et « marcher puis passer » sans Action, `throwsAt` lève les deux filtres de la chaîne (`free`), jamais le tir |
| L'écran | Fait, fil principal : la popup naît en `{ x: 0, y: 0 }` du corps (`screens/Match.tsx`) ; `Board.tsx` marque en permanence, `data-reach`, toute case ouverte adjacente à un adversaire actif de l'équipe du joueur, le marquage « la route la plus courte provoque » retiré avec la dette qui allait avec ; les deux lignes des tiers retirées, `THIRD_LENGTH` plus importé |
| Tests | `engine/c16.test.ts`, 14 tests, **sous-agent Sonnet effort élevé** (le Shove qui pose la passe, le Shove raté ou sur un non-porteur qui ne la pose pas, `legalActions` après le Shove, la passe acceptée puis la seconde refusée, marcher puis passer, le tir et le Dash refusés, le tour suivant sans passe, la passe interceptable sur 120 graines, la version 9) ; `ai/eighthPass.test.ts`, 12 tests, **sous-agent Sonnet effort élevé** (le Trajector A finit en (8, 29) à 51 points, jamais plus près de sa bouche, aucun plan ne ramasse ; la passe gratuite vers un receveur devant, qui a joué, derrière, « marcher puis passer », jamais de tir, les filtres tiennent sans passe gratuite) ; un test de `c15` retitré, la passe étant désormais permise. **643 tests sur 29 fichiers contre 617 sur 27**, typecheck racine, scripts et e2e verts, client typecheck et build verts |
| Vérification | Dix-huit matchs d'auto-jeu (`scripts/control-2h14.ts`), pas un sweep : 1,7 / 1,8 / 1,8 buts de ballon par match ; 92 prises de balle sur 93 Shove réussis, **87 passes gratuites jouées derrière, 4 volées** ; Trajector 0/18 au coup d'envoi ; **0 Trajector sur 36 qui recule au round 1, 36 sur 36 finissent à portée de passe du ballon**, les A en (7, 21) à (10, 31), les B en relais ou sur le porteur ; 1,4 à 2,7 s par match selon la charge de la machine, le même dépôt mesuré par `control-2h13.ts` dans la même fourchette |
| Harnais | Le serveur Vite de Jérôme occupant 5173 sans le crochet, un second Vite avec le crochet sur 5174 et `BASE_URL` ; `ENGINE_VERSION` épinglée à 8 le temps du run puis remise à 9. Smoke vert en 34 s, playthrough vert en 29 s (18 requêtes humaines, 0 refusée). Captures lues : **la popup en haut à gauche**, **les carrés orange autour de chaque adversaire pendant la popup comme pendant le tour**, **plus aucune ligne de tiers**, et dans le fil du playthrough « Ogga Sparshot shoves Dolm Ramrod and takes the Payload » |
| Commit | `e8c0fee` |

**La mise en ligne, le 2026-10-14 dans le même chat**, par le fil principal (Fable 5.1), sur le feu
vert de Jérôme (« oui, redéploie ») :

| Quoi | État |
|---|---|
| Redéploiement | `resolve-action` v20 et `create-match` v18, **moteur 9**, les matchs ouverts du moteur 8 archivés, aucune migration |
| Harnais sur le moteur 9, sans épingle | Sur un second Vite avec le crochet sur 5174, le 5173 restant au `npm run dev` de Jérôme : smoke vert en 40 s, playthrough vert en 37 s, 20 requêtes humaines, 0 refusée, 60 à 10 |
| Consigné par `dump-match.ts` | Match `7d631b71`, 454 décisions rejouées, 0 écart d'événement, 0 DIFFERS. **La passe gratuite vue en ligne** : Harrow Slagborn, Breaker B, Action dépensée après son Shove, passe à son gardien treize cases derrière lui, les trois receveurs à portée étant tous derrière ; à relire par Jérôme. Dossier non gardé |
| Les textures CC0 de la phase 3 | Choisies par Jérôme le 2026-10-14 sur ambientCG : `MetalPlates013` pour le sol en plaques rivetées, `MetalPlates011` pour les parois courbes du tube, `MetalPlates014` pour les caisses et piliers. Les trois archives 1K JPG sont dans `context/import/textures-ambientcg/`, à convertir en WebP 1K en phase 3 |
| Les pions | Jérôme veut la **version 2** (modèles 3D) ; Meshy et Tripo exigent un abonnement pour télécharger, voie gratuite à trouver (TRELLIS en local ou un Space Hugging Face). La phase 3 démarre avec la version 1 en code et accueille la version 2 quand un `glb` existe |

**Ce qui attend Jérôme** : sa partie sur 2H.14, un sweep seulement s'il le demande, un `glb` de Giff
dans `context/import/`. Puis la phase 3, la scène 2.5D statique, dont A20 (React 19) est le premier
pas.

### Sous-phase 2H.15, « les cases orange retirées, la scène 2.5D en un seul bloc », codée le 2026-10-14, porte franchie le 2026-10-15

Par le fil principal (Fable 5.1), avec trois sous-agents Sonnet nommés ci-dessous, à partir de
`00` C17 : la partie de Jérôme sur le moteur 9 consignée, son seul retour (« enlève les cases
orange, c'est trop »), puis **la 2.5D construite d'un coup derrière l'interrupteur 2D / 3D**, comme
il l'a demandé le 2026-10-14 au soir : plus de phases 3, 4 et 5, plus de pions version 1 ou 2, la
scène, le jeu et l'animation dans le même bloc, son `glb` de Giff comme corps des pions et des
capsules en code en repli. **Aucun écart de règle, rien dans `ai/`, `ENGINE_VERSION` reste 9**,
rien à redéployer côté fonctions ; le client en ligne n'est pas redéployé non plus, c'est son feu
vert. **Pas de sweep**, pas demandé.

| Quoi | État |
|---|---|
| La partie | `ab27b827`, Striker star, Shrapnel oath, 50 à 0, 21 h 20 heure de Paris, 465 décisions rejouées, 0 écart, 0 DIFFERS, gardée dans `docs/matches/`. Et `7d631b71`, le match e2e du moteur 9, consigné cette fois et gardé, pour la passe gratuite au gardien de `00` C17 |
| Les cases orange | Retirées de `Board.tsx` (`watched`, `data-reach`), sans retour au marquage d'avant 2H.14. La route sous le curseur reste orange quand elle provoque et l'étiquette compte les allonges |
| A20, React 19 | `react` et `react-dom` 19.3.1, `@types/react` 19.3 ; `three` 0.186.1, `@react-three/fiber` 9.8.1, `@react-three/drei` 10.7.9, `@types/three` 0.186. Typecheck et build du client verts sans autre changement : A20 est soldée |
| La scène | `client/src/board3d/`. `layoutGeometry.ts`, pur : 18 boîtes depuis `KILL_SILO` (chaque case pleine hors bouche couverte une fois), les deux bouches, `cellCentre` et `cellAt` (world X le long du terrain, Z la largeur, une case = une unité, origine au centre), 9 tests, **sous-agent Sonnet effort moyen**. `Silo.tsx` : sol 45 x 15 en `MetalPlates013`, le tube couché de rayon 10 dont le sol est la corde, paroi du fond haute et simple lèvre devant pour ne pas boucher la vue, `MetalPlates011`, deux plaques d'extrémité avec la bouche qui luit en couleur d'équipe et flambe une seconde au but, caisses en `MetalPlates014`, piliers (cylindres) pour les cases pleines isolées, grille fine. Les douze textures converties en WebP 1K par **sous-agent Sonnet effort moyen** (1,2 Mo en tout, README CC0). `Camera.tsx` : trois quarts à 52 degrés, sans rotation (J4), deux zooms, le silo entier calculé sur l'aspect du cadre, ou 18 cases qui suivent le pion dont c'est le tour ou le ballon, amorties ; elle publie la projection que `cellToScreen` lit en 3D (`projection.ts`). `Minimap.tsx` 45 x 15 en SVG, **sous-agent Sonnet effort moyen** |
| Les pions | `Tokens.tsx` : socle hexagonal en couleur de maillot (ambre pour le sien), anneaux au sol (tour, sélection, projecteur du rejeu, cible chaude qui respire ou faible), et le corps : **son `glb`** (`client/public/models/giff-boomball.glb`, 2 Mo, `useGLTF`, normales recalculées, 1,5 case de haut, un seul maillage partagé par les quatorze pions). Le fichier ne nomme pas de metalness et le défaut glTF est 1, ce qui rend noir sans environnement : ramené à 0,15, rugosité 0,8. Capsule en code pendant le chargement ou en repli. Le pion tourne vers sa marche, sinon vers la bouche qu'il attaque. Plaques (nom, PV, lettre de rôle, Réaction dépensée, chevron) en DOM dans `Labels.tsx` |
| Le jeu | `Overlay.tsx` et `Board3D.tsx` : tuiles atteignables cliquables (raycast de fiber, `reachableCells` et `pathTo` du moteur), survol, route pointillée orange quand elle provoque, route tracée, étiquette « clean » ou « N swings on the way », zone violette de la surface de réparation, **ligne de vue** vers le pion survolé (`hasLineOfSight`, cyan ou orange pointillée, « in sight » ou « no line of sight »), ligne du tir vers la case de bouche la plus proche. Un clic sur un pion répond à l'action en attente ou sélectionne. Mêmes props que `Board` |
| L'animation | `match/pose.ts` sorti de `Board.tsx` sans changement et lu par les deux plateaux. Dans `Board3D` une seule `useFrame` place les pièces depuis la pose : marche, poussée, recul, Crackers, Spark, ballon en vol (arc en vraie hauteur), au repos, en main, au sol avec son anneau. Aucun rendu React par frame ; les étiquettes suivent par `link.project` |
| L'interrupteur | `screens/Match.tsx` : « See it in 3D » / « Back to 2D » (`data-testid="view-toggle"`), choix gardé dans `localStorage`, `Board3D` chargé en lazy (le 2D ne télécharge pas three), le crochet publie `view` et `cellToScreen` projette par la caméra en 3D |
| Ce que drei ne fait pas | `Html` de drei monte un root React par étiquette et le démonte de façon synchrone, que React 19 signale en erreur console à chaque démontage : seize erreurs au premier run. Remplacé par `Labels.tsx`, un seul root, le transform écrit à la main une fois par frame. Fiber 9 construit encore un `THREE.Clock` que three 0.186 dit déprécié : un avertissement au démarrage, admis par le spec avec les messages de performance du GL logiciel de Chromium headless |
| Tests | **652 sur 30 fichiers contre 643 sur 29** ; typecheck racine, scripts, e2e et client verts ; build du client vert |
| Harnais | `e2e/board3d.spec.ts`, `npm run e2e:board3d`, sur le Vite 5174 avec le crochet (le 5173 restant à Jérôme) : passe en 3D, capture le silo entier, attend son tour, demande `cellToScreen` d'une case atteignable, qui est la projection de la caméra, **clique à la souris à cet endroit** et voit le pion arriver, zoom rapproché, le tour de l'équipe adverse, retour 2D, zéro erreur console. Vert en 1,4 min. `npm run e2e` exclut `@board3d`. **Smoke 2D vert en 24,5 s et playthrough vert en 23 s** sur le même Vite, après un correctif du smoke lui-même : un Dodge sans mouvement vide le tour, qui se passe tout seul, et le bouton « End turn » qu'il cliquait ensuite avait disparu derrière la popup du round suivant (course pré-existante, le clic est désormais tolérant) |
| Captures lues | Le silo entier : sol riveté, caisses, piliers, parois, les deux bouches cyan et magenta, la minicarte, les plaques lisibles. Le zoom rapproché : **son Giff en armure, batte à la main, debout sur son socle**, quatorze fois, les caisses texturées, le sol. Le survol : la route pointillée et « clean ». À revoir par lui : l'orientation du modèle (`MODEL_YAW` dans `Tokens.tsx` à ajuster s'il regarde de côté), la hauteur des caisses, la couleur des piliers, le noir sous la lèvre avant en vue large |
| Commit | `8168ef5` |

**Lancé par Jérôme le soir même : « le jeu n'a pas planté ».** Ses parties en 3D viennent le
lendemain. **Ce qui attend Jérôme** : ses parties en 3D (« See it in 3D » sur l'écran de match, le
choix est gardé), ses retours en `00` C18, et l'option de `00` C17 sur la passe gratuite au gardien. Un sweep
seulement s'il le demande.

### Sous-phase 2H.16, « la caméra en main », codée le 2026-10-15, porte franchie le même jour

Par le fil principal (Fable 5.1), sans sous-agent, à partir de `00` C18 : les deux retours de
Jérôme après **sa première partie en 3D**, tous deux de caméra, reformulés en chat et tranchés
par lui (bouton droit pour tourner, le bouton de zoom reste comme deux cadrages de départ). Au
même moment il a tranché l'option de `00` C17 : **la passe gratuite au gardien reste autorisée**,
rien ne change dans `ai/`. **Aucun écart de règle, `ENGINE_VERSION` reste 9**, rien à redéployer
côté fonctions ; le client en ligne n'est pas redéployé, c'est son feu vert. **Pas de sweep.**

| Quoi | État |
|---|---|
| J4 | L'arbitrage « trois quarts fixe, sans rotation libre » de `08` §7 tombe, annoté là-bas. La minicarte, fixe, devient le repère « ma bouche à gauche » |
| `framing.ts`, nouveau, pur | Le cadrage comme géométrie testable : la profondeur de sol que la hauteur de l'image couvre selon l'inclinaison et le champ (`groundDepthPerUnit`), le décalage du centre de ce sol par rapport au point visé (`groundCentreOffsetPerUnit`, le cadre couvre plus de sol au-delà du point visé qu'en deçà, donc on vise en retrait pour centrer), les deux cadrages (`presetDistance` : rapproché, les quinze cases de large plus une dans la hauteur de l'image ; large, les quarante-cinq de long dans la largeur et jamais moins que la largeur), la position sur l'orbite (`orbitPosition`), les bornes (inclinaison 20 à 85 degrés, roulette de 0,3 à 2,5 fois le cadrage). **11 tests** dans `framing.test.ts` |
| `Camera.tsx` | L'orbite en main : glisser au **bouton droit** ou du milieu pour tourner (azimut libre, inclinaison bornée), roulette pour la distance, menu contextuel coupé sur le canevas, défilement de page coupé sous la roulette ; le bouton gauche reste au jeu. Le point visé est amorti comme avant, la position s'en déduit par l'orbite à chaque image. Un clic sur le bouton de cadrage remet l'orbite à la vue fixe. En rapproché, la caméra glisse le long du terrain après le pion dont c'est le tour, sinon le ballon, bornée aux bouts du silo ; la largeur étant dans l'image au cadrage, elle ne suit en travers que si la roulette a rapproché |
| `Board3D.tsx` | Le bouton « Close in / Whole silo » reste, son infobulle dit la souris |
| Le crochet | Rien à changer : `cellToScreen` et les plaques lisent la caméra au moment de l'appel |
| Tests | **663 sur 31 fichiers contre 652 sur 30** ; typecheck racine, scripts, e2e et client verts ; build du client vert |
| Harnais | `e2e/board3d.spec.ts` gagne un pas : après la capture rapprochée, un glisser au bouton droit de la souris puis la roulette, capture `board3d-orbit`, la case suivie se projette ailleurs, puis deux clics sur le bouton de cadrage la ramènent à moins de douze pixels de sa première projection. **Vert en 1,7 min** sur un Vite dédié, zéro erreur console. Smoke 2D non relancé : rien de 2D n'a bougé |
| Captures lues | Large : le silo entier, centré. Rapprochée : les quinze cases de large du bord proche au bord lointain, le pion de Jérôme suivi, bloqué au bout du silo comme prévu. Orbite : la scène tournée d'un quart et rapprochée, le pion et son socle lisibles, les caisses de biais |
| Dette | L'orbite se remet à la vue fixe quand on passe par le 2D et revient (le plateau 3D est remonté) ; la borne de suivi aux bouts du silo est calculée pour l'azimut zéro, approximative quand la caméra est tournée ; en vue large la roulette grossit le centre sans suivre le jeu ; en vue large le bas de l'image reste vide sur un cadre très large |

**Ce qui attend Jérôme** : sa partie en 3D avec la caméra en main, ses retours en `00` C19 avant
toute ligne de code, et son feu vert pour le client en ligne s'il le veut. Un sweep seulement
s'il le demande.

### Sous-phase 2H.17, « la caméra décrochée », codée le 2026-10-15, porte franchie le même jour

Par le fil principal (Fable 5.1), sans sous-agent, à partir de `00` C19 : le retour de Jérôme
après **sa partie sur 2H.16**, pouvoir décrocher la caméra du joueur en cours et naviguer le
terrain comme dans Baldur's Gate 3 ou Blood Bowl, reformulé en chat et tranché par deux
arbitrages (les flèches et Ctrl plus la souris, rien au bouton du milieu ni au bord de l'écran ;
la caméra revient d'elle-même quand c'est son tour). **Aucun écart de règle, `ENGINE_VERSION`
reste 9**, rien à redéployer ; le client en ligne n'est pas redéployé. **Pas de sweep.**

| Quoi | État |
|---|---|
| `framing.ts` | `clampPan` borne le point visé au terrain plus quatre cases (`PAN_MARGIN`) ; `viewAxes` donne l'avant et la droite de l'image à plat selon l'azimut, pour que « haut » soit toujours le loin de l'image quelle que soit la rotation. **13 tests** (deux de plus) |
| `Camera.tsx` | Le pan : les **flèches** glissent le point visé à `KEY_PAN_RATE` fois la distance de la caméra par seconde, dans les axes de l'image ; **Ctrl enfoncé plus la souris** sur la scène tire le sol avec elle, un pixel valant la largeur de l'image sur la hauteur du canevas, allongé par l'inclinaison dans le sens de la vue. Tout pan appelle `onUnhook` une fois ; accrochée, la caméra recopie sa cible dans le point de pan à chaque image pour que le décrochage parte de là, sans saut. Les touches sont ignorées dans un champ de saisie, lâchées au `blur` |
| `Board3D.tsx` | `hooked` en état React : faux au premier pan, vrai quand le pion de Jérôme (`yoursId`) arrive sur l'horloge, au clic sur **« Follow the play »** (`data-testid="follow-play"`, visible seulement décrochée) et au choix d'un cadrage. `data-camera="following"` ou `"free"` sur le cadre |
| Tests | **665 sur 31 fichiers contre 663** ; typecheck racine, scripts, e2e et client verts ; build du client vert |
| Harnais | `e2e/board3d.spec.ts` gagne un pas : flèche droite tenue sept dixièmes, le cadre passe à `free`, capture `board3d-panned`, la case suivie se projette à plus de quarante pixels, « Follow the play » la ramène à moins de douze. **Vert en 2,0 min** sur un Vite dédié, zéro erreur console |
| Captures lues | Panoramique : le terrain a glissé d'environ huit cases vers la droite, le bouton « Follow the play » sous « Whole silo », le Spark et le ballon dans l'image, les caisses et les piliers de biais |
| Dette | Le pan à la souris ne passe pas par les plaques en DOM (`Labels.tsx`), qui sont en `pointer-events: none`, mais s'interrompt au-dessus de la minicarte et des boutons ; les flèches font défiler la page quand le plateau 3D n'est pas monté, ce qui est leur rôle |

**Ce qui attend Jérôme** : sa partie en 3D avec la caméra libre, ses retours en `00` C20 avant
toute ligne de code, et son feu vert pour le client en ligne s'il le veut. Un sweep seulement
s'il le demande.

### Sous-phase 2H.18, « la caméra stable, la main brute », codée le 2026-10-15, porte franchie le même jour

Par le fil principal (Fable 5.1), sans sous-agent, à partir de `00` C20 : le retour de Jérôme
après **sa partie sur 2H.17**, « très tremblant et instable », cinq causes lues dans le code et
une proposition en chat, dont il a refusé la caméra à quatre nombres lissés (« mécanique,
s'éloigne de la notion de libre ») et validé le reste. Il joue en normal, parfois en slow.
**Aucun écart de règle, `ENGINE_VERSION` reste 9**, rien à redéployer ; le client en ligne n'est
pas redéployé. **Pas de sweep.**

| Quoi | État |
|---|---|
| `scene.ts` | Le lien gagne `focusKey` (quelle pièce `focus` désigne), `camera` (le pas de la caméra, appelé par la boucle de `Board3D` après les pièces et avant les plaques, donc les trois s'accordent dans la même image) et `fps` |
| `Camera.tsx` | Plus de `useFrame` propre : le pas est `link.camera(delta)`. **La main est brute** : le bouton droit tourne tout de suite autour de la cible, qui ne bouge pas (le décalage de centrage se calcule dans la même image que l'azimut) ; Ctrl plus la souris déplace la cible tout de suite, collée au curseur. **La distance ne dépend plus de l'inclinaison** : le cadrage se calcule à `PRESET_TILT` quand le cadrage change et quand l'aspect de l'image change, et la roulette fixe un facteur vers lequel la distance glisse en un dixième de seconde (`ZOOM_EASE`). **Les flèches ont une inertie** (`KEY_EASE`, un sixième de seconde). **Le suivi est calme** : accrochée, la caméra prend une nouvelle pièce à suivre au plus toutes les quatre dixièmes de seconde (`FOLLOW_DWELL_MS`), suit la pièce retenue pendant qu'elle marche, et glisse vers elle en un quart de seconde (`FOLLOW_EASE`). Compteur d'images par seconde sur la dernière demi-seconde |
| `Board3D.tsx` | La boucle écrit `focusKey` et appelle `link.camera(delta)` ; `FpsReadout`, en mode développement seulement (`import.meta.env.DEV`), sous la minicarte, écrit par un listener sans passer par React |
| Ce qui n'a pas changé | Les cadrages, le bouton droit, Ctrl, les flèches, le décrochage et « Follow the play » de C18 et C19 ; le crochet ; `framing.ts` |
| Tests | **665 sur 31 fichiers**, inchangé ; typecheck racine, scripts, e2e et client verts ; build du client vert |
| Harnais | `e2e/board3d.spec.ts` inchangé, **vert en 1,9 min** sur le Vite 5174 avec le crochet, le 5173 étant à Jérôme, zéro erreur console. Le compteur affiche 8 fps sous le GL logiciel de Chromium headless, ce qui ne dit rien de sa machine |
| Capture lue | Orbite : son Giff sur son socle au pivot, les caisses de biais, le compteur sous la minicarte |
| Dette | La largeur du terrain n'est garantie qu'à l'inclinaison de départ, c'est le prix de la distance fixe ; le pan sous Ctrl s'interrompt au-dessus de la minicarte et des boutons ; le chiffre d'images par seconde chez Jérôme reste à lire |

**Ce qui attend Jérôme** : sa partie en 3D, le chiffre du compteur en bas à droite du plateau,
ses retours en `00` C21 avant toute ligne de code. Si le chiffre est bas, les ombres (2048) et la
résolution (`dpr` 1,5) s'allègent en premier. Un sweep seulement s'il le demande.

### Sous-phase 2H.19, « les gradins et la nouvelle tentative », codée le 2026-10-15, porte franchie le même jour

Par le fil principal (Fable 5.1), sans sous-agent, à partir de `00` C21 : les trois retours de
Jérôme après **sa partie sur 2H.18** (`cb618e32`, consignée et rejouée sans écart) : 45 à 50
images par seconde, une latence et une erreur réseau au round 8, et le vide autour du terrain,
avec ses trois images Nano Banana Pro faites sur les prompts du fil principal (skill
`image-prompt` chargé, espèce décrite jamais nommée). **Aucun écart de règle, `ENGINE_VERSION`
reste 9**, rien à redéployer côté fonctions ; le client en ligne n'est pas redéployé. **Pas de
sweep.**

| Quoi | État |
|---|---|
| La latence et l'erreur | Lu en base par les horodatages de `match_events` : son Shove du round 8 est enregistré une seule fois, à 13:47:18, raté au dé ; le message « could not reach the resolve-action server » est un `fetch` rejeté par le navigateur avant toute réponse, sans délai ni nouvelle tentative dans `callFunction`. Son premier clic n'a jamais atteint le serveur, le second oui |
| `lib/supabase.ts` | `Refused` gagne `unreachable: true` sur un `fetch` rejeté ; `headSeq(matchId)` lit le dernier `seq` du match |
| `match/useMatch.ts` | Dans `send` : sur `unreachable`, attendre `RETRY_AFTER_MS` (1,5 s), lire la tête ; si elle a dépassé `seqRef`, l'action est passée et seule la réponse s'est perdue, `load()` sans renvoyer ; sinon renvoyer une fois. Pas de changement serveur, pas de risque de doublon |
| Les textures | `stand-cyan.webp`, `stand-magenta.webp` (2048 x 1143) et `barrier.webp` (2048 x 720, la bande du mur recadrée) dans `board3d/textures/`, depuis ses trois JPEG de `context/import/` (non commités). Environ 1 Mo en tout |
| `Silo.tsx` | Le tube passe au rayon 15 et le sol devient un tablier sombre de 28 cases de large (`APRON_HALF`), le terrain texturé restant quinze cases ; `TUBE_LENGTH` à 56. **La rambarde** : deux plans à une demi-case des lignes de touche, hauteur 1, image en miroir répété. **Les gradins de côté** (`Stand`) : deux moitiés par côté, pente de 37 degrés, du pied à 0,4 au sommet à 4,6, chaque moitié dans la couleur de la bouche la plus proche, une planche sombre derrière le sommet. **Les gradins de fond** : au-dessus du mur de la bouche, ramené à 2,6 de haut et 28 de large, montant vers une plaque arrière à `BACK_PLATE_X` qui ferme le tube. Les foules sont en `meshBasicMaterial`, non éclairées, `MirroredRepeatWrapping`. **L'effacement** : chaque gradin lit la caméra à chaque image ; derrière lui et plus bas que deux cases au-dessus de sa dernière rangée, il devient transparent jusqu'à 0,08 |
| Tests | **665 sur 31 fichiers**, inchangé ; typecheck racine, scripts, e2e et client verts ; build du client vert |
| Harnais | `e2e/board3d.spec.ts` inchangé. **Un premier run rouge puis deux verts** sur le Vite 5174 (2,4 min) : le premier échec n'a pas été capturé, les trois textures neuves chargent lentement sous le GL logiciel et l'attente de trois secondes après la bascule en 3D est juste ; à surveiller, à allonger si ça se reproduit |
| Captures lues | Large : les deux tribunes de côté, cyan côté bouche cyan et magenta côté bouche magenta, la rambarde devant, les tribunes de fond autour des deux bouches, plus de noir autour du terrain. Orbite : la tribune du fond de biais derrière son Giff, nette. Rapprochée : rien ne gêne, le tablier sombre au bord |
| Dette | La répétition de la foule se voit en vue large (environ deux images par moitié de tribune) ; les gradins de fond sont plus larges que le tube n'est haut à leurs angles ; l'effacement se juge sur la hauteur de la caméra seulement, pas sur la ligne de vue réelle |

**Ce qui attend Jérôme** : sa partie en 3D dans le silo fermé, ses retours en `00` C22 avant
toute ligne de code, et son feu vert pour le client en ligne s'il le veut. Un sweep seulement
s'il le demande.

### Sous-phase 2H.20, « la caméra dans le silo », codée le 2026-10-15, porte ouverte

Par le fil principal (Fable 5.1), sans sous-agent, à partir de `00` C22 : le retour de Jérôme
après **sa partie sur 2H.19**, « on se rapproche d'un truc bien », avec sa capture d'une caméra
sortie du terrain, et sa question sur le Breaker du round 8, répondue depuis le dump (la passe
gratuite de l'écart 63 n'est jamais un tir, aucune décision). **Aucun écart de règle,
`ENGINE_VERSION` reste 9**, rien à redéployer ; le client en ligne n'est pas redéployé. **Pas de
sweep.**

| Quoi | État |
|---|---|
| `layoutGeometry.ts` | Les dimensions du silo deviennent pures et partagées : `APRON_HALF` 14, `TUBE_RADIUS` 15, `TUBE_CENTRE`, `TUBE_TOP`, `BACK_PLATE_X` (le demi-terrain plus 6,5). `Silo.tsx` les importe au lieu de les porter |
| `framing.ts` | `MIN_TILT` 30 degrés (20 avant), `MAX_ZOOM` 1,5 (2,5 avant), `PAN_MARGIN` 1 (4 avant). **`confine`** : sous le haut du tube moins une case, la position de la caméra est retenue entre les parois (`APRON_HALF`) et les plaques de fond (`BACK_PLATE_X` moins une), et jamais sous 1,5 de haut ; au-dessus, libre, c'est là que se tient la vue large. **4 tests** de plus |
| `Camera.tsx` | `confine` s'applique à la position calculée, le point visé ne change pas : une caméra poussée contre une paroi s'en approche de la cible au lieu de la traverser |
| Tests | **669 sur 31 fichiers contre 665** ; typecheck racine, scripts, e2e et client verts ; build du client vert |
| Harnais | `e2e/board3d.spec.ts` inchangé, **vert en 2,5 min** sur le Vite 5174. **Un run froid rouge avant** : `global-setup.ts` n'a pas trouvé le champ Email en trente secondes sur un Vite qui venait de démarrer, c'est le cas « la connexion peut expirer une fois, relancer » ; chauffer le Vite par deux `curl` avant le run l'évite, et c'est sans doute aussi la cause du premier rouge de 2H.19 |
| Capture lue | Rien de neuf à voir en vue large ni rapprochée ; la retenue se voit en jouant, quand la caméra basse bute sur la rambarde du côté proche |
| Dette | La retenue est une boîte, pas le vrai tube : dans les angles hauts du tube la caméra peut encore voir un coin de paroi de l'extérieur ; la largeur du terrain garantie seulement à l'inclinaison de départ |

**Ce qui attend Jérôme** : sa partie en 3D, ses retours en `00` C23 avant toute ligne de code,
et son feu vert pour le client en ligne s'il le veut. S'il veut que la passe gratuite puisse
devenir un tir, ou que le Breaker tire à portée propre, c'est un écart à écrire. Un sweep
seulement s'il le demande.

### Sous-phase 2H.21, « le jeu vivant », codée le 2026-10-15, porte ouverte

Par le fil principal (Fable 5.1), avec six sous-agents Sonnet, à partir de `00` C23 : la demande
de Jérôme à la fin du chat de 2H.20 (« rendre le jeu plus visuellement interactif et vivant, sans
surcharge »), l'inventaire de ce qui existait, un lot de dix lignes proposé en chat et validé par
lui (les chiffres de dégâts aussi en 2D, les durées de bandeau acceptées). **Aucun écart de règle,
rien dans `ai/`, `ENGINE_VERSION` reste 9**, rien à redéployer ; le client en ligne n'est pas
redéployé. La caméra de C18 à C22 n'est pas touchée. **Pas de sweep.**

| Quoi | État |
|---|---|
| Les repères | `motion.ts` : `motionAndCues`, les onze sortes de `Cue`, `after` et leur datation dans `timeMotion` ; `Motion.speed` et `Motion.cues` ; `Beat.cues`. 7 tests |
| Les effets 3D | `Effects.tsx` nouveau (Sonnet, élevé) : étincelles du coup, anneau du Shove, explosion du Cracker, braises du but, faisceau et flash du Spark, pool de huit, trois lumières, texture procédurale, une `useFrame` |
| Les mots qui montent | `Floaters.tsx` nouveau (Sonnet, moyen) en 3D, DOM projeté ; `Board.tsx` (Sonnet, élevé) en 2D, SVG et SMIL ; le chiffre dans le maillot du Giff touché, « miss » et « held » en gris |
| Les transitions | `Board3D.tsx` : l'évacué s'enfonce après son repère, le remplaçant monte, le Spark descend de six cases à son entrée ; `link.transitions` |
| Les bandeaux | `Banner.tsx` nouveau (Sonnet, moyen), un à la fois ; `Match.tsx` les tire du beat affiché, jamais à `instant` ; « Your turn » au tour jouable, qui vide la file |
| La carte | `Announce.tsx` (Sonnet, moyen) : nom dans le maillot, verdict en gros, dé dessous, barre de temps (`useMatch.hold`) |
| Le fil | `Feed.tsx` (Sonnet, moyen) : barre cuivre trois secondes sur les lignes neuves, « ◆ » au but, « ✕ » gras au KO |
| Le crochet | `fx(request)` et `match/fxBridge.ts`, développement seulement, avec `stretch` pour les captures ; bandeaux tenus quatre fois plus longtemps sous `PATIENT` |
| Tests | **676 sur 31 fichiers contre 669** ; typecheck racine, scripts, e2e et client verts ; build vert |
| Harnais | `e2e/board3d.spec.ts` : une capture par effet à `stretch` 6, un round de l'IA en slow pour un bandeau et un verdict, « Your turn » et une ligne fraîche au retour du tour, fin de match tolérée. **Vert en 5,5 min** sur le Vite 5174 chauffé, zéro erreur console. **Smoke 2D vert en 18,6 s** (`Match.tsx`, `Feed.tsx` et `Board.tsx` sont partagés) |
| Captures lues | Le bandeau « ROUND 3 OF 10 », la carte avec son verdict « CAUGHT » et sa barre, le KO en gras dans le fil, l'explosion et le faisceau en vue large. Les étincelles, l'anneau, les braises, le flash et l'affaissement n'apparaissent pas sur les captures du GL logiciel, qui rend des images figées pendant un effet court : à voir par Jérôme |
| Dette | Les captures des effets courts sous le GL logiciel ; le ballon n'est pas vu disparaître dans la bouche (il saute dans les mains du gardien, comme avant) ; en 2D seuls les mots montent, pas d'étincelles ; une seule opacité par nuage de points, donc pas d'étalement des étincelles ; le bandeau de la popup de place n'existe pas (la popup est son annonce) |
| Commit | Pas encore : c'est Jérôme qui tape `/commit` |

**Ce qui attend Jérôme** : sa partie en 3D et en 2D, ses retours en `00` C24 avant toute ligne
de code (le jeu est-il vivant sans surcharge, les durées, ce qui manque ou ce qui est de trop),
`/commit`, et son feu vert pour le client en ligne s'il le veut. Un sweep seulement s'il le
demande.

### Sous-phase 2H.22, « le jeu vivant, deuxième passe », codée le 2026-10-15, porte ouverte

Par le fil principal (Fable 5.1), avec trois sous-agents Sonnet et un Opus 5.5, à partir de `00`
C24 : les sept retours de Jérôme après sa partie sur 2H.21, reformulés en chat, ses réponses, et
le texte de C24 validé par lui (« GO ») avant la première ligne de code. **Aucun écart de règle,
rien dans `ai/`, `ENGINE_VERSION` reste 9**, rien à redéployer, le client en ligne n'est pas
redéployé. La caméra n'est pas touchée. **Pas de sweep.**

| Quoi | État |
|---|---|
| Les mots | Deux fois plus gros (28 px en 3D, 26 en 2D) et tenus deux fois plus longtemps (`FLOAT_MS`, 2 s en normal, 3 s en slow) ; `Floaters.tsx` (Sonnet, moyen), `Board.tsx` (Sonnet, élevé), `theme.css` |
| Les actions | Le repère `action` de `motion.ts` : SWING, ATCK OP, SHOVE, SHOOT, PASS, DISENGAGE, DASH, BAT, DODGE au-dessus de l'acteur, dans sa couleur, avec la case visée (`toward`) ; 3 tests |
| Le but | `Banner.tsx` (Sonnet, moyen) : la sorte `goal`, 40 px, blanc à halo d'équipe, 2,5 s / 4 s ; « Goal · Your Team », « Goal · The other Team » dans `Match.tsx` |
| La carte | `Announce.tsx` : la barre de temps retirée, `useMatch.hold` et `bb-drain` avec elle |
| Le son | `sound.ts` nouveau (Opus 5.5, élevé) : seize recettes Web Audio, contexte ouvert au premier geste confirmé, douze voix, clé `boomball.sound` ; `Match.tsx` joue un son par repère à son instant et le sifflet par round, bouton « ♪ Sound on » ; 4 tests |
| Le pantin | `Board3D.tsx` et `scene.ts` (`link.gestures`) : bob et pente en marche, torsion vers la cible au coup, poussée au Shove, recul de la cible, inclinaison au lancer ; le maillage entier, en attendant un modèle riggé |
| Le fil | `Feed.tsx` : les lignes neuves jugées par le dernier événement et plus par la taille, défaut de 2H.21 vu par le harnais sur une fenêtre pleine |
| Le crochet | `fx({ kind: 'banner', banner, text, tone })` dit un bandeau par `fxBridge.announce`, développement seulement |
| Tests | **683 sur 32 fichiers contre 676** ; typecheck racine, scripts, e2e et client verts ; build vert |
| Harnais | `e2e:board3d` **vert en 5,6 min** sur le Vite 5174 chauffé, avec « SWING », le bandeau de but et le bouton son en plus ; **smoke 2D vert en 18,3 s** |
| Captures lues | « SWING » et « −7 » en gros sur Grim ; « GOAL · YOUR TEAM » blanc à halo cyan ; la carte « MISSED » sans barre ; « ♪ SOUND ON ». Le pantin et le son restent à voir et à entendre chez Jérôme |
| Ses parties sur 2H.21 | Consignées : `c3867408` (40-50, rejouée sans écart) et `2e30f587` (20-10, **la relecture s'arrête au round 2** : « the engine refused the rebuilt action of A-breaker-6 at seq 161: (4, 16) is already occupied », 669 événements non atteints, à lire si Jérôme veut l'analyse) |
| Dette | Celle de 2H.21, plus : le pantin ne bouge ni bras ni jambes (modèle sans squelette, Mixamo ou Blender pour un vrai rig) ; le son est synthétique (des échantillons CC0 à son choix) ; un 404 « no such match » vu une fois au harnais, sans cause trouvée, la relance a passé |
| Après sa partie | « aucun son, pas de pantin » : le son était tué par la répétition d'effet de StrictMode (instance fermée au montage, corrigé, `audio()` dans le crochet et affirmé `running` par le spec) ; le pantin marchait, prouvé par la sonde `probe(unitId)` du crochet, amplitudes doublées ; ses trois WAV (swing, goal, explosion) en MP3 dans `public/sounds/`, joués par `SAMPLES` à la place des recettes ; les sources d'assets déplacées de `context/import/` vers `boomball/assets/source/` ; le 404 « no such match » revu sur la première requête après trois minutes d'inaction, rattrapé par `useMatch.send` comme une réponse perdue. Après tout cela : 683 tests, `e2e:board3d` vert en 6,5 min (la sonde affirme le geste et le son `running`), smoke 2D vert |
| Commit | 2H.21 commitée (`54cd99f`) et 2H.22 (`2bcc46e`) le 2026-10-15 au soir ; la correction du son, la sonde, les échantillons et le déplacement des sources attendent son `/commit` |

**Ce qui attend Jérôme** : `/commit` (deux commits, 2H.21 puis 2H.22), sa partie en 3D et en 2D
avec le son, ses retours en `00` C25 avant toute ligne de code, et son feu vert pour le client en
ligne s'il le veut. Un sweep seulement s'il le demande.

### Sous-phase 2H.23, « trois défauts d'écran », codée le 2026-10-16, porte ouverte

Par le fil principal (Fable 5.1), avec trois sous-agents Sonnet effort moyen, à partir de `00`
C25 : les retours de Jérôme après sa partie sur 2H.22 avec le son (« tout me va », la foule un
peu trop forte), ses trois réponses sur les défauts d'écran, et les mineurs laissés à la main du
fil principal. **Aucun écart de règle, rien dans `ai/` ni `engine/`, `ENGINE_VERSION` reste 9**,
rien à redéployer, le client en ligne n'est pas redéployé. Le pantin, `Tokens.tsx` et le modèle
riggé sont dans son autre chat, sous Blender, **dans la même copie de travail**. **Pas de sweep.**

| Quoi | État |
|---|---|
| La foule | `AMBIENCE.gain` 0,16 à 0,11 dans `sound.ts`, trois décibels de moins, sur ses mots |
| La note du chrono | `useMatch.expired` en `'turn' \| 'place' \| null` ; « Default initiative · you go last » quand la popup a expiré, le serveur plaçant déjà en dernier depuis l'écart 58 ; `fx({ kind: 'notice' })` pour la capturer |
| Le bouton | « Call for the ball » grisé tant que `placing` n'est pas nul ; affirmé par le harnais à chaque popup |
| La passe gratuite | Déduite dans `Feed.tsx` (Sonnet) du `shoved` à `tookPayload` du même tour : « throws the free pass off his Shove to », et le même suffixe dans `match.md` de `dump-match.ts` ; 3 tests ; `c3867408` rejoué sans écart |
| La route sûre | `routeTo` = `safePathTo ?? pathTo` dans `Board.tsx` (Sonnet), `Board3D.tsx` et `clickCell` du crochet : le joueur se voit proposer la route de l'IA |
| La popup | `clampInto` pure et le `resize` dans `PlacePrompt.tsx` (Sonnet), 3 tests ; une phrase dans `Briefing.tsx` |
| Laissé | La parade du Breaker humain reste automatique (moteur, `ENGINE_VERSION`, redéploiement), notée dans les fonctionnalités à venir ; `FEED_LIMIT` 120 |
| Tests | **689 sur 34 fichiers contre 683** ; typecheck racine, scripts, e2e et client verts |
| Harnais | Smoke 2D **vert en 39,3 s** sur le Vite 5174 chauffé ; `e2e:board3d` **vert en 6,5 min** |
| Captures lues | La popup de place avec « Call for the ball » grisé et la note « The clock ran out » d'un vrai tour expiré ; en 3D, « DEFAULT INITIATIVE · YOU GO LAST » avec sa phrase sur les Strikers |
| Sa partie `2e30f587` | Pas à analyser, sur ses mots : ouverte pour une capture, laissée tourner sans jouer |
| Commit | Attend son `/commit`. **Quatre fichiers sont aussi modifiés par son chat Blender** (`fxBridge.ts`, `testHook.ts`, `Board3D.tsx`, `board3d.spec.ts`) et ses fichiers propres (`Tokens.tsx`, `scene.ts`, `giffRig.ts`, `giff-rigged.glb`, `scripts/blender/`, `assets/source/README.md`) ne sont pas à 2H.23 |

**Ce qui attend Jérôme** : relire les deux phrases anglaises (la note et la passe gratuite),
`/commit` quand le chat Blender a fini ou par `git add -p` sur les quatre fichiers partagés, et
sa partie quand le Giff riggé sera dans le jeu. Les fonctionnalités à venir sont notées en `05`
et en `00` C25.

### Sous-phase 2H.24, « le Giff riggé », faite le 2026-10-16 dans un chat parallèle, close

Par un autre chat de Jérôme, sous Blender, pendant que ce fil codait 2H.23 dans la même copie de
travail ; documentée ici par le fil principal (Fable 5.1) d'après le commit `ffa4ae9`, parce que
ce chat n'a rien écrit dans les docs. `scripts/blender/rig_giff.py` (Blender 5.2, sans fenêtre)
construit depuis son GLB un squelette (jambes, hanches, colonne, poitrine, tête, un os `arms` qui
porte les avant-bras et la batte) et sept clips joués sur place : Idle, Run (vitesse suivant la
vitesse au sol du pion), Dash (décollage, vol tenu, atterrissage), Swing, Shove, Throw, Hit.
`client/src/board3d/giffRig.ts` tient un mixeur par pion et mélange les clips par poids ;
`Tokens.tsx` clone le maillage skinné par pion (`SkeletonUtils`) et enregistre le corps dans
`link.bodies` ; la boucle de `Board3D.tsx` le pilote (`drive`, `play`, `dash`), et le pantin de
2H.22 ne fait plus que tourner et pousser un corps riggé, le pantin entier restant pour la capsule
de repli. La sonde `probe(unitId)` dit le clip qui pèse le plus, et le spec 3D affirme `Swing` au
coup. Les sources (`giff-rigged.blend`, la vidéo des sept clips) sont dans `assets/source/models/`,
hors git. **Close par Jérôme le même jour** : « les animations sont parfaites. rien à changer ».
Dette : ses commentaires de code se nomment « 2H.23 », à corriger en 2H.24 à la prochaine passe
sur ces fichiers.

### Sous-phase 2H.25, « le son et le rebond », codée le 2026-10-16, porte ouverte

Par le fil principal (Fable 5.1), avec un Sonnet (`motion.ts`) et un Opus 5.5 effort élevé
(`sound.ts`, `announcer.ts`), à partir de `00` C26 : les retours de Jérôme après ses matchs sur
2H.23 et le Giff riggé, et ses deux réponses à l'outil de questions. **Un écart de règle, le 64,
`ENGINE_VERSION` 10 : les deux fonctions sont à redéployer sur son feu vert**, le client en ligne
reste à 2H.14. Rien dans l'IA, **pas de sweep.**

| Quoi | État |
|---|---|
| Le Spark manqué | CATCH au-dessus du Trajector à chaque tentative, « miss » et son son s'il rate (`motion.ts`, Sonnet) |
| Écart 64 | Le rebond d'un tir manqué part de la case de bouche visée, d4 cases au d8, jamais sous un joueur, tournant depuis la face si bloqué (`reboundLanding`, `reboundCell`, `nearestHatch`, `applyShoot`) ; `ENGINE_VERSION` 10 ; `c26.test.ts` 6 tests |
| Les foules | `crowd-attack.mp3` (40 s coupées dans la première minute de `crowd1`, ramenées au niveau de `crowd2`) quand son équipe a le ballon, `crowd.mp3` sinon, fondu croisé 2 s (`setCrowd`, Opus 5.5) |
| L'annonceur | 54 clips découpés et transcrits des deux packs de `context/import/` ; vingt moments dans `announcer.ts`, tirage sans répétition, chance par moment, délai 2,5 s, les buts et la fin coupent ; `say`, `lastSaid` (Opus 5.5) ; branché par repère dans `Match.tsx`. **La répartition est une proposition à relire par Jérôme** |
| Le crochet | `crowd()`, `lastSaid()`, `say(cue)` ; le spec 3D lit le côté de la foule, dit `kickoff` et lit le clip, capture CATCH |
| Tests | **704 sur 35 fichiers contre 689** ; typecheck racine, scripts, e2e et client verts |
| Harnais | Smoke 2D **vert en 31 s** sur le Vite 5174 (un run rouge avant, le match e2e arrivé au round 10 pendant ses trois tours, le suivant a ouvert un nouveau match) ; `e2e:board3d` vert en 6,4 min (CATCH capturé, le côté de la foule et le clip du coup d'envoi lus par le crochet) |
| Captures lues | « CATCH » au-dessus du Giff en 3D ; le clip du coup d'envoi lu par le crochet |
| Dette | Le fondu croisé des foules sans compensation de puissance (léger creux) ; le délai de l'annonceur part du début du clip ; le côté de foule change avant que la boucle soit décodée au tout premier échange ; un seul annonceur à la fois, pas de duo |
| Ses coupes | « Death match », « First round », les rounds 2 et 3, « Sticks and stones », « Human Anatomy 101 », « The feeding tube », « Instant vegetable », le Dash, « Rage fuel », et tout commentaire de but (son « and it's a goal » suffit) |
| En ligne | **`resolve-action` v21, `create-match` v19, moteur 10, déployées le 2026-10-16 sur son feu vert** ; smoke 2D vert en 40,6 s dessus, playthrough vert en 1,6 min jusqu'au sifflet (un premier run rouge juste après le déploiement, relancé, comme déjà vu) ; le client en ligne reste à 2H.14 |
| Commit | Attend son `/commit` |

**Ce qui attend Jérôme** : relire la répartition des répliques (dans le chat et dans
`announcer.ts`), `/commit`, puis sa partie avec le son sur le moteur 10 en ligne.

### Sous-phase 2H.26, « l'annonceur systématique », codée le 2026-10-16, porte franchie le même soir (« tout est parfait »)

Par le fil principal (Fable 5.1), seul, à partir de `00` C27 : le retour de Jérôme après sa
partie sur 2H.25 avec le son, « il manque la plupart des sons sur les swing raté et réussi et
les attaques d'opp », précisé en répliques d'annonceur, « une systématiquement, mais qu'une ».
Rien dans le moteur ni dans l'IA, `ENGINE_VERSION` toujours 10, rien à redéployer, **pas de
sweep.**

| Quoi | État |
|---|---|
| La chance | `ANNOUNCER_CHANCE` vidée : coup, raté, Shove et Cracker (sa réponse : « ils passent aussi à systématique ») sont dits à chaque fois que la voix est libre ; le délai de 2,5 s, ou la durée du clip, fait seul le tri, trois attaques d'opportunité dans la seconde donnent une réplique |
| Le but qui coupe | Bug trouvé en relisant `say` : les listes `goalOwn` et `goalFoe` étant vides depuis C26, le retour « aucune ligne » précédait la coupure, et une réplique parlait par-dessus « and it's a goal ». La coupure passe avant la recherche de ligne |
| Tests | Un quinzième test dans `sound.test.ts` (un but sans ligne arrête la source en cours) ; **705 sur 35 fichiers contre 704** ; typecheck racine, scripts, e2e et client verts |
| Harnais | Smoke 2D **vert en 42 s**, relancé parce que `Match.tsx` a bougé (un commentaire) |
| Captures | Aucune : rien ne change à l'écran, le crochet `lastSaid()` lit l'annonceur |
| Commit | Attend son `/commit` |

**Sa partie, le même soir** : « tout est parfait ». Porte franchie, et il ouvre le point sur ce
qu'il reste à faire.

### Sous-phase 2H.27, « la ligue au choix », codée le 2026-10-16 au soir, porte franchie le même soir (« c'est fait et ça a marché »)

Par le fil principal (Fable 5.1), seul, à partir de `00` C28. Le point sur la suite, dont il a
validé l'ordre : ses trois fonctionnalités sans le multijoueur (ligue au choix, annuler et
quitter un match), la phase 6, le client redéployé, puis la coop (phase 7, A10 d'abord) et la
phase 8. La ligue est la première. Rien dans le moteur ni dans l'IA, `ENGINE_VERSION` toujours
10, pas de migration, **les deux fonctions à redéployer sur son feu vert**, **pas de sweep.**

| Quoi | État |
|---|---|
| La règle | Une batterie joue à son Tier ou en dessous, jamais au-dessus (`tierAllowed` dans `engine/stats.ts`) ; une victoire ne compte que jouée au Tier de la batterie (sa réponse : « non »), `recordResult` compare `matches.tier` à `teams.tier` au sifflet final |
| `create-match` | Lit `body.tier`, absent = le Tier de la batterie, invalide ou au-dessus refusé ; le match porte le Tier joué |
| Le lobby | Section « League · your battery is Veteran », trois boutons, le palier de la batterie sélectionné par défaut, les paliers en dessous jouables, ceux au-dessus grisés et `disabled` avec « · 3 wins » / « · 6 wins » ; la phrase dessous dit où les victoires comptent ; le header dit « Veteran battery · playing Rookie ». Dessin validé par lui en chat |
| Le hub | Une phrase sous l'échelle et une dans le formulaire : « Once a level is reached, the lobby lets you play it again. Only wins at your own level climb the ladder » |
| Tests | Trois de plus dans `lobby.test.ts` ; **708 sur 35 fichiers contre 705** ; typecheck racine, scripts, e2e et client verts ; les deux fonctions bundlent |
| Harnais | Smoke 2D **vert en 39,7 s** avec la section affirmée (trois boutons, un sélectionné, celui du Tier de la batterie, les verrouillés `disabled`) et la capture du lobby ; un premier smoke avait repris le match e2e en cours sans passer par le lobby, le playthrough l'a fini (38 s), le second smoke a ouvert un match par le lobby |
| Captures lues | `02-lobby.png` : « League · your battery is Star », les trois boutons ouverts, Star sélectionné, « Star is where your wins count ». E2E Battery est Star (23 victoires), donc l'état grisé des paliers au-dessus ne se voit pas sur cette capture ; il est couvert par `disabled` et `data-locked` dans le code, à voir sur une batterie rookie |
| En ligne | **`resolve-action` v22, `create-match` v20, redéployées le 2026-10-16 au soir sur son feu vert**, moteur 10 inchangé ; smoke 2D **vert en 35,5 s** sur les fonctions redéployées |
| Commit | Son `/commit` du même soir |

**Sa partie en dessous de son palier, le même soir** : « c'est fait et ça a marché ». Porte
franchie. Suivant : le cadrage d'annuler et quitter un match.

### Sous-phase 2H.28, « annuler et quitter un match », codée et en ligne le 2026-10-16 au soir, porte franchie le même soir (« parfait ça a fonctionné »)

Par le fil principal (Fable 5.1), seul, à partir de `00` C29 : trois réponses de Jérôme en chat
(le propriétaire, depuis l'écran de match et le hub, avec confirmation ; option B, pas de
résultat ; les mots de la confirmation, dont il a retiré la dernière phrase). Rien dans le moteur
ni dans l'IA, `ENGINE_VERSION` toujours 10, **pas de sweep.**

| Quoi | État |
|---|---|
| Migration `0008_abandon_match.sql` | Colonne `matches.abandoned_at`, fonction SQL `abandon_match(match uuid)` en `security definer`, exécutable par `authenticated`, bornée au propriétaire de la batterie par `auth.uid()`, refuse un match fini ou déjà abandonné. **Appliquée par Jérôme le 2026-10-16 au soir** (`/supabase-migrate`), vérifiée en lecture avant et après : colonne et fonction présentes, 115 matchs dont 4 non finis inchangés, aucun abandonné, droits `authenticated`, `postgres`, `service_role` ; consignée dans `04` |
| `resolve-action` | Lit `abandoned_at`, refuse en 409 « this match was abandoned » |
| `create-match` | Un match abandonné ne compte plus comme « déjà en cours » (`.is('abandoned_at', null)`) |
| Client | `useAccount` : un abandonné n'est ni en cours ni archivé, compté dans `abandoned` ; `abandonMatch` dans `lib/supabase.ts` (rpc) ; `match/AbandonPrompt.tsx`, la confirmation partagée (`abandon-prompt`, `abandon-yes`, `abandon-no`) ; `TeamHub.tsx` : « Abandon this match » (`abandon-match`) à côté de « Back to the silo », la note « 2 matches abandoned: no result, kept, never resumed » (`abandoned-note`) ; `Match.tsx` : « Leave the match » (`leave-match`) dans la barre du haut, la confirmation en surimpression sous la barre ; `App.tsx` : `onLeft` ramène au hub après `refresh` |
| Harnais | `e2e/abandon.spec.ts`, tag `@abandon`, `npm run e2e:abandon`, hors du smoke par défaut : « Leave the match », la confirmation capturée, « Keep playing » referme, puis « Yes, abandon it », le hub revient sans bandeau et la note monte de un. **Vert en 9,5 s** sur les fonctions redéployées. Smoke 2D **vert en 48 s** par le lobby sur un match neuf ; un premier run rouge sur le cas connu, le match e2e arrivé au round 10 pendant ses trois tours |
| Captures lues | `01-leave-prompt.png` : la confirmation en haut à droite du plateau, par-dessus le briefing resté ouvert, les deux boutons ; `02-hub-after-abandon.png` : le hub sans bandeau, « To the lobby » actif, « 1 match abandoned: no result, kept, never resumed », l'échelle à 24 inchangée par l'abandon |
| Vérifié | **708 tests sur 35 fichiers, inchangés** (rien dans le moteur, pas de test unitaire ajouté : la règle vit en SQL et à l'écran, le spec `@abandon` la couvre) ; typecheck racine, scripts, e2e et client verts ; les deux fonctions bundlent |
| En ligne | **`resolve-action` v23, `create-match` v21, redéployées le 2026-10-16 au soir sur son feu vert**, moteur 10 inchangé |
| Commit | `1b2422a`, poussé sur sa demande avec les deux commits précédents du soir (`fc1fdcc`, `aedda25`) |

**Sa partie, le même soir** : il a abandonné un match, « parfait ça a fonctionné ». Porte
franchie. Suivant : la phase 6, à cadrer.

### Sous-phase 2H.29, « la phase 6 : la 3D par défaut, le porteur visible, l'effectif fixe », codée et en ligne le 2026-10-16 au soir, porte ouverte

Par le fil principal (Fable 5.1), avec un Sonnet effort moyen sur `Briefing.tsx` et un Opus 5.5
effort élevé sur le faisceau du porteur (`Tokens.tsx`, `Board3D.tsx`, `scene.ts`,
`Minimap.tsx`), à partir de `00` C30 : son cadrage de la phase 6 en trois réponses. Rien dans
l'IA, aucune règle du moteur ne change (`MatchSetup.roster` est un champ de plus),
`ENGINE_VERSION` toujours 10, **pas de sweep.**

| Quoi | État |
|---|---|
| La 3D par défaut | `Match.tsx` ouvre en 3D sauf si `boomball.view` dit `2d` ; « Back to 2D » garde le choix. Le harnais pose le 2D lui-même (`prefer2D` dans `harness.ts`, appelé par le smoke, le playthrough et le spec d'abandon avant la première navigation) ; le spec 3D ne bascule plus à l'entrée et affirme « Back to 2D » |
| Le briefing (Sonnet) | Quatre fiches de plus : « The view » (la 3D, la caméra, les deux cadrages), « Sound and the booth », « Your league », « Leaving » ; « Your Furnace is on the left as the match opens » ; le pied dit « plays at the league you picked » |
| Le porteur (Opus 5.5) | `CarrierMarker` dans `Tokens.tsx` : un faisceau or (`#ffc14d`, `BALL_GOLD`) de y 1,4 à 3,4, rayon 0,15, additif, et un anneau au sol 0,9 à 1,0 ; pièce `b:carrier` et `link.carrierGlow` dans `scene.ts` ; la boucle de `Board3D` le pose sur la pièce du porteur à chaque image (le lanceur en marche avant le lancer, le receveur après la prise, le porteur de l'état hors beat), `visible` seulement quand le ballon est en main, respiration de 1,6 s (`BREATH_MS`) entre 0,35 et 0,75. `Minimap.tsx` : le porteur en or, 1,2 contre 0,8, cerné de sombre, dessiné en dernier |
| L'effectif | `engine/setup.ts` : `Roster`, `slotKey`, `rosterSlots` (`striker-1` à `striker-3`, `breaker-1`, `breaker-2`, `bulwark-1`, `trajector-1`), `drawRoster(rng, taken)`, `nameCollision`, `MatchSetup.roster` ; `buildTeam` pose le nom d'effectif sur un poste de l'équipe A sans humain, `createMatch` jette sur une collision de noms posés ; `nameUnits` tire le reste (l'adversaire) en évitant tout nom posé, comme avant. `server/lobby.ts` : `LobbyRequest.roster`, le refus « X is already on your battery: pick another name for yourself ». `create-match` : lit `teams.roster`, le tire au premier match avec le RNG de la graine en évitant les noms des sièges, l'écrit (`update ... is('roster', null)`, un échec n'empêche pas le match), le passe au lobby. Migration `0009_roster.sql` : `teams.roster jsonb`, **à appliquer par Jérôme**, sans elle `useAccount` lit une colonne absente et le hub ne charge pas |
| Le hub | Chaque carte de composition porte le nom d'effectif de son poste (`data-roster-slot`, `data-roster-name`), « Named at your first match » tant qu'il n'y en a pas ; le pied de section réécrit |
| Migration `0009` | **Appliquée par Jérôme le 2026-10-16 au soir**, vérifiée en lecture avant (colonne absente, 2 batteries) et après (présente, aucune batterie encore nommée), consignée dans `04` |
| Tests | **713 sur 35 fichiers contre 708** : quatre dans `setup.test.ts` (sept noms distincts par poste hors noms humains ; l'équipe A à ses noms et l'humain au sien, l'adversaire jamais dessus ; le même effectif sur deux graines et le poste quitté qui reprend son nom ; la collision refusée), un dans `lobby.test.ts` ; typecheck racine, scripts, e2e et client verts ; les deux fonctions bundlent |
| Harnais | Smoke 2D **vert en 43,8 s** sur les fonctions redéployées, le 2D posé par `prefer2D`. `e2e:board3d` : l'entrée directement en 3D et les vingt-trois captures passent (route, orbite, pan, quinze effets, bandeaux, popup) ; deux runs rouges à la fin sur le match e2e en fin de partie (un but en round 9 qui tient le bandeau de tour derrière lui sous PATIENT, l'attente passée de 6 à 30 s ; puis le sifflet final en plein run, cas connu), le troisième **vert en 7,7 min** sur un match neuf ouvert par le lobby. **Le faisceau du porteur se voit sur `05-board3d-moved.png` du run vert** : un trait or au-dessus de Harrow Cannonade, qui vient de recevoir la passe de Sarn Gunwale, petit sous le GL logiciel mais là ; les deux runs rouges capturaient un ballon au sol. Le spec ne force pas un porteur : c'est sa partie qui juge la lisibilité. **La même capture montre l'effectif tiré au premier match de E2E Battery** (Harrow Cannonade, Quill Ironmaw, Vandy Halyard, Voss Vantch, Sarn Gunwale, Petra Sparshot et le Giff du siège) |
| En ligne | **`resolve-action` v24, `create-match` v22, redéployées le 2026-10-16 au soir sur son feu vert**, moteur 10 inchangé |
| Commit | Par `/save` à sa demande, le 2026-10-16 au soir, en local (voir `git log`) |

**Ce qui attend Jérôme** : deux matchs de suite : les mêmes noms d'effectif, le porteur vu tout
de suite, le briefing relu. Puis le redéploiement du client.

**Porte franchie le 2026-10-16** sur l'effectif et le porteur (« les noms des joueurs sont bons
et restent », « le halo du porteur est ok »), avec cinq retours de partie qui font 2H.30.

### Sous-phase 2H.30, « cinq retours de partie », codée le 2026-10-16, porte ouverte

Par le fil principal (Fable 5.1), sans sous-agent, à partir de `00` C31 : ses cinq retours
après ses deux matchs sur 2H.29 (`e0d9b642`, star, 30 à 20 ; `c5cb20f6`, abandonné au round 2).
Rien dans le moteur, rien dans l'IA, `ENGINE_VERSION` toujours 10, rien à redéployer, pas de
migration, **pas de sweep.**

| Quoi | État |
|---|---|
| La latence au round 2 | Lue en base (`match_events.created_at`) : la popup du round 2 arrive dans la même réponse que la fin de son tour du round 1, cinquante événements rejoués à l'écran avant qu'elle ne s'affiche ; place 1 ouvre son tour dans la même réponse. Les journaux des fonctions refusés par l'API de gestion. **Non reproduit, rien ne change**, question posée à lui (`00` C31 point 1). **Mesurée au chat suivant** par `scripts/measure-latency.ts` : toute requête coûte 1,6 à 2,7 s quel que soit le travail, l'IA et le démarrage à froid hors de cause ; la fonction tournait à `us-east-1` pour une base à `eu-west-3`, parce que la machine de Jérôme sort par Newark ; épinglée à Paris par `x-region`, 0,84 s médiane. Parade à cadrer avec lui |
| La réplique de KO | `Match.tsx` : un `hit` sur un Giff qui a un repère `exit` dans le même mouvement ne demande pas de réplique, le KO parle ; le craquement joue toujours |
| Le Dash tenu | `match/dashHold.ts` (`heldDashState`, `dashNeeded`, six tests) ; `Match.tsx` (`dashHeld`, `viewState`, `legalView`, `moveWith`) ; `ActionBar.tsx` (« Dash · held » allumé, « 80 ft left · Dash held », `data-testid` `dash` et `feet-left`) ; `useMatch.ts` (`sendMany`, `stateRef`). Le Dash part au serveur avec la première marche qui en a besoin, en deux requêtes ; un second clic l'annule. Proposition du fil principal, à relire par lui |
| La foule dès le Trajector | `sound.ts` : `pageHasBeenActivated()` (`navigator.userActivation.hasBeenActive`), `start()` à la création quand la page a déjà reçu un geste, `onGesture` sinon ; deux tests |
| « Select your champion » | Clé `champion` retirée du manifeste, appel retiré de `Match.tsx` ; le clip reste sur disque |
| Tests | **719 sur 36 fichiers contre 713** : six dans `dashHold.test.ts`, deux dans `sound.test.ts` ; typecheck racine, scripts, e2e et client verts ; le client bundle |
| Harnais | Smoke 2D **vert en 47,7 s** sur les fonctions en ligne, le tour 3 tient le Dash, l'annule, le tient et le dépense par une marche de neuf cases (captures `11-turn-3-dash-held.png` : « 80 FT LEFT · DASH HELD », le bouton allumé, les cases en plus ; `12-turn-3-moved.png` : « Giff dashes. Giff moves 9 cells. », « 35 ft left », Dash grisé). Quatre runs rouges avant : deux sur mon spec (la marche la plus lointaine vidait le tour, qui passait tout seul avant le « End turn » que le glissé attend), deux sur le match e2e où le Giff était cerné de huit pions (zéro case), abandonné par `e2e:abandon`. `e2e:board3d` **vert en 8,0 min** au second run (`e2e/out/2026-10-16T15-28-24/`) ; le premier est tombé sur l'attente du bandeau de tour après le round de l'adversaire, après vingt-trois captures, le cas connu des bandeaux en file sous PATIENT (deux runs pareils sur 2H.29) ; sa trace ne porte aucun avertissement d'AudioContext : le contexte créé à l'ouverture de l'écran passe le harnais |
| En ligne | Rien à redéployer, `resolve-action` v24 et `create-match` v22 inchangées |

**Porte franchie le même jour** : sa partie sur 2H.30, « mes retours après le match : aucun,
tout va bien ». Sa réponse sur la latence : après son clic sur la place 3, la popup reste, rien
ne se passe « pendant longtemps », puis le match reprend par les Strikers de l'IA ; l'attente est
donc dans la requête `choosePlace` qui joue les deux Strikers avant lui (`00` C31 point 1,
**mesurée au chat suivant, le 2026-10-16 : la géographie, pas le travail**, chiffres et parade
candidate dans `00` C31 point 1). Reste ensuite le redéploiement du client sur son feu vert.

### Le client en ligne, le 2026-10-16 au soir : `https://boomball.vercel.app`

Par le fil principal (Fable 5.1), sans sous-agent, sur le mot de Jérôme « passons au déploiement
vercel », après qu'il a tranché la latence (« on laisse tomber le problème de latence, ce n'est
pas grave », chiffres en `00` C31 point 1). C'est l'étape 3 de l'ordre qu'il a validé le 16 au
soir, et la ligne A2 de l'audit. **Contrairement à ce que disaient les prompts de reprise depuis
2H.14, aucun client n'avait jamais été mis en ligne** : le compte Vercel ne portait aucun projet
Boomball (lu par l'API avant d'agir), le client n'avait tourné que sur `localhost:5173`.

| Quoi | État |
|---|---|
| `scripts/deploy-vercel.mjs` | Nouveau. Lit `VERCEL_TOKEN` et `VERCEL_TEAM_ID` du `.env` lui-même ; `GET /v9/projects/boomball`, créé par `POST /v10/projects` s'il manque, **refuse de continuer si le projet porte un `link` Git** ; parcourt `client/dist/`, envoie chaque fichier par `POST /v2/files` avec son SHA-1 (six en parallèle), ajoute un `vercel.json` (réécriture de tout chemin vers `index.html`, `Cache-Control` immuable sur `assets/`), puis `POST /v13/deployments` avec `projectSettings` sans framework ni build, et attend `READY`. Préversion par défaut, `--production` pour le jeu |
| Le déploiement | 82 fichiers, 11,9 Mo, envoyés en 6,5 s, `READY` en 10,5 s. Le premier déploiement d'un projet neuf devient production de lui-même : alias `boomball.vercel.app` et `boomball-montigny-gmailcoms-projects.vercel.app`. Le projet n'a pas de `link`, `framework` nul, `nodeVersion` 24 sans effet |
| Vérifié | `curl` : `/` 200 en `text/html`, `/anything/deep` 200 (la réécriture), `/models/giff-rigged.glb` 200 en `model/gltf-binary`, les `assets/` en `max-age=31536000, immutable` ; Playwright MCP : l'écran de connexion rendu (`e2e/out/vercel-login-2026-10-16.png`), zéro message console ; `browser-path.py` avec `ORIGIN=https://boomball.vercel.app` **ALL GREEN** (CORS `*` sur `create-match` et `resolve-action`) |
| `browser-path.py` corrigé | Deux FAIL au premier run qui étaient le contrôle et pas le jeu : il envoyait `endTurn` à un Striker qui devait d'abord choisir sa place (écart 58, 2H.12). Il répond désormais à la popup par la place 1, puis Dodge (le chrono ne bouge pas), puis `endTurn` |
| Ce qui reste | Les URL de préversion sont derrière la protection SSO de Vercel (302), voulu. `site_url` de l'Auth à `localhost:5173`, sans effet en mot de passe, à changer par propreté sur son mot. Le smoke ne tourne pas contre Vercel (le crochet est `DEV` seulement, voulu). La bande passante Hobby est de 100 Go par mois, 13 Mo par premier chargement |
| Fonctions | Inchangées, `resolve-action` v24 et `create-match` v22, moteur 10 |

**Porte franchie le soir même** : « tout s'est bien passé. c'est parfait. » Il a joué sa partie
sur l'URL, sans Vite. Au passage, **son mot de passe était perdu** : le tableau de bord Supabase
n'offre que l'envoi d'un e-mail de récupération, inutile sans page pour le traiter, donc le fil
principal l'a remplacé par l'API admin (`PUT /auth/v1/admin/users/<id>`, clé service) et l'a
affiché une fois en chat. **Deux trous notés pour la phase 8, avant qu'un ami ne joue** : pas de
« mot de passe oublié » et pas de changement de mot de passe dans l'application. Ensuite la coop
(phase 7, A10 d'abord), demain.

### Sous-phase 2H.31, « A10, le persist atomique », codée et en ligne le 2026-10-17, porte ouverte

Par le fil principal (Fable 5.1), sans sous-agent, à partir de `00` C32 : le cadrage de la coop
en huit réponses de Jérôme, validé en un lot (« GO »), dont 2H.31 est la première sous-phase. Rien
dans le moteur, rien dans l'IA, `ENGINE_VERSION` toujours 10, **pas de sweep.**

| Quoi | État |
|---|---|
| Migration `0010_append_match_step.sql` | La fonction SQL `append_match_step(p_match, p_expected_seq, p_events, p_snapshot, p_columns)` en une transaction : verrou `for update` sur la ligne `match_state`, refus « the board moved on » si le `seq` a bougé, insert des événements numérotés depuis `p_expected_seq + 1`, snapshot, les neuf colonnes de `matches` castées depuis `p_columns`. `security definer`, exécutable par `service_role` seulement. **Appliquée par Jérôme le 2026-10-17**, vérifiée en lecture avant et après (fonction, paramètres, droits, comptes de tables inchangés), consignée dans `04` |
| `server/persist.ts` | Nouveau, pur : `matchColumns(step, orders, now)`, `MOVED_ON`, `isMovedOn` |
| `resolve-action` | `persist` appelle `db.rpc('append_match_step', ...)` en un aller-retour et rend un résultat ; la course répond 409 avec `MOVED_ON`, tout autre échec 500 avec les mots de la base, avant `recordResult` et la diffusion. A10 close |
| Tests | **728 sur 38 fichiers contre 719** : quatre dans `server/persist.test.ts`, cinq dans `server/migration0010.test.ts` ; typecheck racine, scripts et e2e verts ; les deux fonctions bundlent |
| En ligne | **`resolve-action` v25, `create-match` v23, redéployées le 2026-10-17 sur son feu vert**, moteur 10 inchangé |
| Harnais | Smoke 2D : premier run rouge sur le match e2e repris au round 8 avec un tour expiré, tombé après la troisième marche (le cas connu du sifflet pendant les trois tours) ; second run **vert en 42,1 s** sur un match neuf. Playthrough **vert en 49,4 s**, 17 requêtes humaines, 0 refusée, jusqu'au sifflet |
| Le second compte e2e | Créé par le fil principal par l'API admin sur son mot, e-mail confirmé, profil « E2E Second », identifiants dans le `.env` sous `BOOMBALL_E2E2_EMAIL` et `BOOMBALL_E2E2_PASSWORD`, jamais affichés. Sans batterie : il rejoint « E2E Battery » par le code d'invitation en 2H.32 |

**Ce qui suit** : 2H.32, la batterie à plusieurs (migration `0011_invites.sql`, le hub, le lobby
partagé par présence Realtime), puis 2H.33, le match à plusieurs (écart 65, les lots des autres
rejoués, le coup à la porte par tous, « Hand my Giff to the house », le spectateur,
`coop.spec.ts`).

### Sous-phase 2H.32, « la batterie à plusieurs », codée et en ligne le 2026-10-17, porte ouverte

Par le fil principal (Fable 5.1), avec un Sonnet effort élevé sur `TeamHub.tsx`, à partir de
`00` C32 points 1, 2, 3, 4 (les rôles) et 7. Rien dans le moteur, rien dans l'IA,
`ENGINE_VERSION` toujours 10, **pas de sweep.**

| Quoi | État |
|---|---|
| Migration `0011_invites.sql` | `teams.invite_code` (8 hexadécimaux, unique, défaut qui remplit l'existant), `join_team(code)`, `rotate_invite_code(team)`, `battery_members(team)` en `security definer` pour `authenticated`. **Appliquée par Jérôme le 2026-10-17**, vérifiée avant et après, consignée dans `04`. Défaut connu : le propriétaire listé deux fois quand il a sa propre ligne, fusionné côté client (`mergeRoll`), à corriger à la prochaine migration |
| `useAccount` | Toutes les batteries du joueur (RLS, sans filtre), la choisie gardée dans `localStorage` (`pickTeam`), `chooseTeam`, `members` ; `roll.ts` pur |
| Le hub (Sonnet) | Switcher de batteries, « The roll » (code, Copy, New code, membres, Remove, Leave this battery), « Join another battery », l'abandon au propriétaire seul, le formulaire de code sous « Raise a battery » |
| Le lobby partagé | Présence Realtime sur `lobby:<teamId>`, un siège par présent, les rôles pleins grisés, « Ready », « Start match » au propriétaire quand tous sont prêts, la ligue à lui, `started` diffusé ; `lobbySeats.ts` pur |
| `create-match` | Refuse un appelant qui n'est pas le propriétaire (403) |
| Tests | **741 sur 41 fichiers contre 728** ; typecheck racine, scripts, e2e et client verts ; fonctions et client bundlent |
| En ligne | **`resolve-action` v26, `create-match` v24, redéployées le 2026-10-17 sur son feu vert** ; le client en ligne n'est pas redéployé (sur son feu vert, après 2H.33) |
| Harnais | Smoke 2D **vert en 39,1 s** ; `e2e/coop.spec.ts` nouveau (`npm run e2e:coop`) **vert en 18,7 s**, deux contextes, le second compte e2e membre de « E2E Battery » : les deux se voient dans le lobby, le second prend Breaker et coche Ready, le propriétaire démarre, les deux atteignent le plateau avec deux humains côté A, le propriétaire quitte |

**Ce qui suit** : 2H.33, le match à plusieurs (écart 65, les lots des autres rejoués, le coup à
la porte par tous, « Hand my Giff to the house », le spectateur, l'abandon vu par les autres).

### Sous-phase 2H.33, « le match à plusieurs », codée et en ligne le 2026-10-17, porte ouverte

Par le fil principal (Fable 5.1), avec un Sonnet effort élevé sur les tests du moteur et du
serveur, à partir de `00` C32 points 4 (la popup), 5, 6 et 8. Rien dans l'IA ; **le moteur gagne
l'écart 65 et l'action `yieldSeat`, `ENGINE_VERSION` 11** ; pas de migration ; **pas de sweep.**

| Quoi | État |
|---|---|
| Écart 65 | `placementAt` interroge le premier humain du rôle au d20, places = actifs moins les autres humains ; `placeHumans` met les autres juste derrière ; pas de popup quand un seul ordre existe |
| Le siège remis à la maison | `yieldSeat` hors tour dans `reduce` et `submitAction`, `seatYielded`, le pion passe à l'IA, la maison prend la dernière place pendant une popup, l'IA joue le tour s'il était ouvert ; `dump-match` et le fil le lisent |
| Le client | Les lots des autres rejoués animés (`playForeign`) ; « Waiting for X · 1:12 » chez tous ; le coup à la porte par tout siège cinq secondes après l'échéance (`coopClock.ts`) ; « Leave the match » au propriétaire, « Hand my Giff to the house » au coéquipier (`YieldPrompt.tsx`), « Back to the hub » et « Watching » au spectateur ; l'abandon diffusé aux autres |
| Tests | **759 sur 44 fichiers contre 741** ; typecheck racine, scripts, e2e et client verts ; fonctions et client bundlent |
| En ligne | **`resolve-action` v27, `create-match` v25, moteur 11, redéployées le 2026-10-17 sur son feu vert** ; aucun match du moteur 10 n'était ouvert. Le client en ligne reste à redéployer sur son feu vert |
| Harnais | `e2e:coop` **vert en 37,5 s** : le second client voit le tour du propriétaire arriver, le propriétaire lit « Waiting for Second Giff », le second remet son Giff et passe en spectateur, le propriétaire quitte et le second revient au hub ; smoke 2D **vert en 41,5 s** ; playthrough **vert en 1,1 min**, 23 requêtes, 0 refusée |
| Dette | Le nom du joueur sur la plaque des autres pions humains ; le bandeau « Your turn » qui reste après un siège remis ; un spectateur ne frappe pas ; `battery_members` et le propriétaire en double |

**Ce qui attend Jérôme** : une partie à deux, lui et un ami (ou le second compte e2e dans une
fenêtre privée), sur le client redéployé à son feu vert ; puis la phase 8.

### Sous-phase 2H.34, « l'interface d'équipe », codée le 2026-10-17, porte ouverte

Par le fil principal (Fable 5.1), un Opus 5.5 effort élevé sur le hub et le lobby, un Sonnet 5.5
effort moyen sur les mots et les specs, à partir de `00` C33 : les retours de Jérôme après sa
première soirée de coop, une maquette cliquable validée, quinze points validés en un lot. Rien dans
le moteur ni dans l'IA, `ENGINE_VERSION` reste 11, **rien à redéployer côté fonctions** ; migration
`0012` sans schéma ; **pas de sweep.**

| Quoi | État |
|---|---|
| Le hub | Une bande d'appel (« Enter the lobby » ou « Back to the silo »), Players avec « In the lobby » en direct, « Invite a friend », « Your Giff » en compact avec glyphes, « Join a team » en pied, « Switch team » en menu, « Raise a team » |
| Le hub vivant | `team:<id>` (`announceTeamChange` par REST après join, départ, retrait, nouveau code ; `useAccount` relit), la présence du lobby lue depuis `App` (`useLobbyChannel`), relecture au retour sur l'onglet, `refresh(teamId)` bascule sur l'équipe rejointe |
| Le lobby | « The bench » : trois cartes de siège, tuiles de rôle « n open », badges Ready, siège vide avec le code, arrivée animée, barre basse avec la ligue en segments et Start match ou Ready ; le canal n'est plus au lobby mais à `App`, le lobby `track` son siège et le retire en partant |
| Le fond | `client/public/crowd-entering-arena.webp` (198 Ko, de son `Crowd_entering_arena.jpg` déplacé dans `assets/source/images/`), fixe, voilé, panneaux en verre, sur le hub, le lobby et « Raise a team » |
| Les mots | Battery → Team dans tout texte visible, les test ids (`leave-team`, `team-switch`) et les specs ; la RPC `battery_members`, le type `BatteryResult` et le nom « E2E Battery » restent |
| Migration | `0012_team_wording.sql` : les trois messages en « team », le propriétaire une fois dans `battery_members` (sa propre ligne repliée par `left join`) ; six tests ; **appliquée par Jérôme le 2026-10-17**, vérifiée en lecture avant et après (04) |
| Tests | **771 sur 45 fichiers contre 759** ; typecheck racine, scripts, e2e et client verts ; le client bundle |
| Harnais | Smoke 2D **vert en 27 s** ; `e2e:coop` **vert en 20 s** (après la remise du second compte e2e sur « E2E Battery », qu'il avait quittée pendant la soirée de Jérôme, et le spec qui bascule d'équipe par le menu) ; `e2e:board3d` **vert en 7,8 min** seul (rouge une fois lancé en même temps que vitest, à 2 images par seconde) |
| En ligne | **Le client redéployé le 2026-10-17 sur son feu vert** (`deploy-vercel.mjs --production`, 83 fichiers, 12,1 Mo, le fond servi), après le commit `dbdfd69` ; le smoke contre l'URL en ligne passe connexion, hub, lobby et plateau, puis s'arrête sur le crochet absent d'un build, par construction. Les fonctions ne bougent pas |
| Dette | Les trois canaux Realtime publics (phase 8) ; `create-match` et `abandon_match` disent encore « battery » jusqu'à un redéploiement ; un run coop rouge une fois sur la présence, non reproduit |

**Ce qui attend Jérôme** : sa partie à deux sur la nouvelle interface, en ligne, puis la phase 8.

### Sous-phase 2H.35, « la limite de présence et le bouton Ready », codée le 2026-10-17 soir, porte ouverte

Par le fil principal (Fable 5.1), seul, à partir de `00` C34 : les deux retours de Jérôme après sa
seconde partie à deux sur le client redéployé. Rien dans le moteur ni en base, `ENGINE_VERSION`
reste 11, **rien à redéployer côté fonctions** ; pas de sweep.

| Quoi | État |
|---|---|
| Le bug | La revanche s'ouvrait sans le coéquipier qui attendait dans le lobby (`86df1770`, un siège, après `7cfc5976` à deux). Cause tracée dans les trames Realtime : trois `track` de présence en cinquante millisecondes font répondre « Client presence rate limit exceeded » et **fermer le canal pour de bon** ; le canal vivant dans `App` depuis 2H.34, le lobby suivant était muet |
| Le correctif | `useLobbyChannel` : un message de présence au plus par 500 ms, le dernier état, jamais deux fois le même ; un canal fermé par le serveur rouvert une seconde après, siège redit ; `useAccount` ne fait plus clignoter le profil à la relecture |
| Le bouton | « Click here when you're ready », plein, pleine largeur, auréole cyan qui pulse jusqu'au clic |
| Le spec | `e2e/rematch.spec.ts` (`@coop`) : la séquence rapide du lobby, un match entier à deux joué par le cerveau de la maison, « Play again » des deux côtés, les deux sièges de retour, la revanche à deux ; **vert en 1,8 min**, et il reproduisait le défaut avant le correctif |
| Tests | **771**, inchangés ; typecheck racine, scripts, e2e et client verts |
| Harnais | `e2e:coop` **vert en 2,3 min** (deux specs), smoke 2D **vert en 24 s** |
| En ligne | **Le client redéployé le 2026-10-17 soir sur son feu vert** (`dpl_8p89A6GvVMT6qYde22cw4jU1Qg7s`, 83 fichiers, 12,1 Mo, le bundle servi est celui du build) |
| Dette | `Match.tsx` appelle `onFinished` à chaque rendu une fois la phase finie (plusieurs `refresh()` en vol, sans effet visible) |

**Porte franchie le soir même** : sa partie à deux avec une revanche, en ligne (« parfait le bug est
corrigé »). **Ce qui suit** : la phase 8, le déploiement pour un ami, à cadrer en chat ; et, plus
tard, à sa demande, une revue de l'interface des matchs comme celle du hub et du lobby.


### Sous-phase 2H.36, « la phase 8, premier lot : le compte, la revue, l'export », codée le 2026-10-17 soir, porte ouverte

Par le fil principal (Fable 5.1), à partir de `00` C35 : la phase 8 cadrée en chat, huit points
validés par Jérôme en un lot. **Un Sonnet 5.5 effort moyen** sur `scripts/export-db.mjs`, **un
Opus 5.5 effort élevé** pour la revue de sécurité du jeu entier (`docs/10-revue-securite-2026-10-17.md`),
tous deux sur brief fermé et relus par le fil principal. Rien dans le moteur ni dans l'IA,
`ENGINE_VERSION` reste 11, rien en base ; pas de sweep.

| Quoi | État |
|---|---|
| Le cadrage | Mot de passe oublié manuel par Jérôme (pas de SMTP, le mailer intégré plafonne à deux par heure) ; menu « Account » ; `site_url` ; bande passante sans suite ; inscriptions ouvertes ; la revue d'abord ; l'export ; Firefox et sans WebGL. Détail en `00` C35 |
| `site_url` | **Changé le soir même sur son feu vert**, par l'API de gestion : `https://boomball.vercel.app`, la liste des redirections avec cette URL et `localhost:5173`. Lu avant et après |
| Le menu | `screens/AccountMenu.tsx` : « Account ▾ » dans l'en-tête du hub et au-dessus de « Raise a team », « Signed in as X », « Change password » (deux fois, six caractères, sans l'ancien), « Sign out » (ce navigateur seulement) ; `changePassword` et `signOut` dans `lib/supabase.ts` |
| Un défaut trouvé | La reconnexion dans la même page insérait un profil existant (deux 409) : `useAccount.load(null)` remet `loadedForRef` à `null` |
| La connexion | « Forgot your password? Ask Jérôme on Discord, he resets it. » sous le formulaire |
| Sans WebGL | **Page noire** dans un Chromium à `--disable-3d-apis` (three jetait dans le canvas, rien ne l'attrapait). `lib/webgl.ts`, `webglAvailable()` ; `Match.tsx` ouvre en 2D et le bouton de vue dit « No 3D here ». Rejoué : le plateau plat, zéro erreur |
| Firefox | Firefox 157 par Playwright : hub, lobby, plateau 3D à 119 images par seconde, « Back to 2D », zéro erreur à nous |
| L'export | `scripts/export-db.mjs` (Sonnet), `npm run export:db`, sept tables et un manifeste dans `boomball/backups/<date>/`, ignoré par git ; `--events` pour les coups. Lancé une fois : 3 profils, 2 équipes, 4 membres, 157 matchs |
| Le modèle | `client/public/models/giff-boomball.glb` retiré (identique à la source, lu par personne) |
| La revue | **Aucun bloquant**, `rls-check.py` 24 sur 24, aucun secret dans git, un seul JWT dans le bundle. **M1** `team_members_write` laisse tout connecté s'insérer dans toute équipe par UUID ; **M2** le moteur accepte des coordonnées non entières dans un chemin (prouvé) ; **M3** les canaux Realtime publics et ce qu'ils permettent, SQL de la migration proposée en §3 du rapport. Six mineurs, quatorze notes, l'état de C1 à C20 en §4 |
| Tests | **771**, inchangés ; typecheck racine, scripts, e2e et client verts ; le client bundle |
| Harnais | Smoke 2D **vert en 33 s**, `e2e:coop` **vert en 2,2 min**, `e2e:account` (nouveau, `@account`) **vert en 7,4 s**, `e2e:board3d` **vert en 6,4 min** (lancé seul) |
| Maintien en vie | A13 tourne : exécution verte du workflow `supabase-keepalive` vue par Jérôme le 2026-10-17 à 12:53 |
| En ligne | Rien de redéployé : le client en ligne reste celui de 2H.35. Le menu « Account », la ligne de connexion et le repli sans WebGL attendent son feu vert |

**Porte ouverte** : le rapport de revue à lire par Jérôme et ses corrections à trancher (2H.37 :
M1 et m1 en une migration, M2 et le redéploiement de `resolve-action`, puis M3 avec le client et
les deux fonctions ensemble), le client à redéployer sur son feu vert, puis un ami qui crée un
compte et joue sans lui.

### Sous-phase 2H.37, « les corrections de la revue de sécurité », codée et en ligne le 2026-10-18, porte ouverte

Par le fil principal (Fable 5.1) seul, à partir de `00` C36 : les quatre lots tranchés par Jérôme
en chat le matin même, une ou deux questions par message, chacun appliqué, déployé et prouvé
avant le suivant. Rien dans l'IA, `ENGINE_VERSION` reste 11, la forme de l'état ne change pas,
aucun match archivé ; pas de sweep. Le commit `22564ca` de 2H.36 poussé en début de chat, CI verte
vue par Jérôme, puis le client de 2H.36 mis en ligne sur son feu vert avant les corrections.

| Quoi | État |
|---|---|
| M1, m1 | `0013_team_members_guard.sql` (trois politiques à la place de `team_members_write`, le déclencheur `team_members_pin_keys`, les privilèges de colonne sur `teams`) et `0014_team_members_insert_member.sql` (la politique d'insertion élargie à `is_team_member`, parce que le `with check` d'insert s'évalue avant le conflit d'un upsert : 37 sur 38 au premier passage), **appliquées par Jérôme**. `rls-check.py` de 24 à **38 contrôles, 38 sur 38** ; les deux failles prouvées en direct avant 0013. `e2e:coop` vert en 4,3 min |
| M2 | `validatePath` refuse un faux tableau et tout pas non entier (`isCell`) ; `ACTION_KINDS` et `isActionShaped` dans `engine/actions.ts` ; `resolve-action` refuse en 400 une action mal formée. Deux tests. **`resolve-action` v28**, smoke vert en 42,6 s, sondes : le 400 neuf sur quatre actions mal formées, « a step of the path is not a cell » sur le match e2e |
| M3, m4 | `0015_private_channels.sql` **appliquée par Jérôme** (`can_hear_channel`, deux politiques sur `realtime.messages`, les déclencheurs `roll`, `abandon_match` qui diffuse) ; `private: true` sur les trois canaux, `announceAbandoned` et `announceTeamChange` supprimées, `lib/channelReopen.ts` (cinq réouvertures, jamais sur un refus) ; fonctions en supabase-js 2.113.0 et `httpSend` privé. **`resolve-action` v29, `create-match` v26**, puis `e2e:coop` vert en 4,3 min et `e2e:abandon` en 13 s en local contre les fonctions privées, puis **client redéployé**. Sondes : jointures privées `ok` sur le client en ligne ; un étranger connecté refusé ; `private_only` à vrai sur son feu vert, un sujet public refusé même à un membre |
| Mineurs | m2, m3, m5 acceptés ; **m6** : `0016_one_team_per_owner.sql` écrite, **à appliquer par Jérôme** ; **n8** au prochain lot client (les deux écrans disent « 6 ») |
| Tests | **777 sur 47 fichiers** (771 plus `actions.test.ts`, un test de `rules.test.ts`, `channelReopen.test.ts`) ; typecheck racine, scripts, e2e et client verts |
| En ligne | Client de 2H.37 sur `https://boomball.vercel.app`, moteur 11, `resolve-action` v29, `create-match` v26, projet Realtime en privé seulement |

**Porte ouverte** : sa partie à deux sur les canaux privés, 0016 à appliquer, puis un ami qui
crée un compte et joue sans lui.

### Sous-phase 2H.38, « l'écran de match refait », codée et en ligne le 2026-10-19

Par le fil principal (Opus 5.5) à partir de `00` C37 (cadré et maquetté le matin même, validé sans
correction), avec cinq sous-agents Sonnet 5.5 sur fichiers disjoints et consigne fermée : A
`match/odds.ts` (effort moyen), B `match/keys.ts` et `board3d/plateSpread.ts` (moyen), C les trois
volumes de `match/sound.ts` (moyen), D le fil en bandeau et en tiroir de `match/Feed.tsx` (élevé),
E le panneau ⚙ `match/SettingsPanel.tsx` (moyen). Rien dans le moteur, l'IA, les fonctions ni la
base ; `ENGINE_VERSION` reste 11 ; pas de sweep. Détail en `00` C37, « comment 2H.38 est codée ».

| Quoi | État |
|---|---|
| L'écran | La barre à deux lignes et ses pastilles, le plateau plein cadre, la rangée et les étiquettes avec leurs chances, la fiche au clic, le fil qui s'efface et son tiroir, la minicarte repliable et cliquable, les plaques écartées, ⚙ avec trois volumes, le clavier, la coop dans le coin du chrono, la question de place dans la rangée ; la colonne de droite, le panneau d'actions et la carte de dés retirés ; la caméra cadre au-dessus de la rangée (`insetLens`) |
| n8 | Le plancher à 8 caractères dans `AccountMenu.tsx` et à l'inscription de `SignIn.tsx` ; **`password_min_length` à 8 en ligne**, mis par Jérôme dans le tableau de bord sur son feu vert (le PATCH par l'API a été refusé par le classifieur du mode auto), relu par l'API |
| Tests | **842 sur 50 fichiers** (777, plus odds 19, keys 19, plateSpread 14, feed 8, turnStrip 3, framing 2, sound et le test de `PlacePrompt` retiré) ; typecheck racine, scripts, e2e et client verts |
| Harnais | La fenêtre Playwright à 1536 × 695 par défaut, `E2E_VIEWPORT=2560x1271` pour le 27 pouces ; les réglages par `openSettings`, `setReplay`, `settingsClick`. **Smoke 2D vert en 36 s ; `e2e:board3d` vert en 14,0 min au portable et en 22,1 min au 27 pouces** (cinq captures neuves, lues aux deux tailles) ; **`e2e:abandon` vert en 22 s, `e2e:coop` vert en 4,6 min, `e2e:playthrough` vert en 1,8 min**, sans correction, captures lues. Deux contrôles du spec 3D passés sur un observateur posé dans la page (le bandeau « Your turn » et les lignes neuves du fil s'effacent avant que des étapes à 2 images par seconde les regardent) |
| En ligne | **Le 2026-10-19 sur son feu vert**, bundle `index-BLdoW79j.js`, construit et déployé par Jérôme dans PowerShell (`npm.cmd --prefix client run build`, `node scripts/deploy-vercel.mjs --production` ; `npm.ps1` y est bloqué par la politique d'exécution, et le classifieur refusait le build au fil principal) ; il emporte le 503 du 2026-10-19. Sonde Playwright sur l'URL en ligne verte : « At least 8 characters. » à l'inscription, hub, lobby, briefing, plateau 3D, ⚙, crochet absent, rien en console hors l'aléa du 401 sur `role_stats` (2H.6) et les avertissements GL |

**Porte ouverte** : sa partie sur le portable et sur le 27 pouces. Les trois précisions du fil
principal et les quatre choix au code relus par lui : « tout me va ».

### Retour de partie sur 2H.38 (`00` C38), codé et en ligne le 2026-10-19 au soir, porte franchie

Par le fil principal (Opus 5.5), seul. Son retour : les actions sur une cible ne se cachent plus
derrière un clic. Au survol d'une cible, ses étiquettes avec leurs chances, cliquables ; dans la
rangée, un bouton par couple action et cible ; le clic n'ouvre que la fiche ; dans les deux vues.
Commit `53a01dc`, 842 tests, smoke 2D vert en 55 s, sonde 3D jetable verte. **En ligne** : client
`index-sXBC7HJQ.js`, construit par le fil principal (règle `Bash(npm --prefix client run build)`
ajoutée à `.claude/settings.json`, `09e29aa`), déployé par Jérôme : le classifieur du mode auto a
refusé `deploy-vercel.mjs --production` malgré la règle, peut-être faute d'une session qui l'a
relue. **Sa partie : « tout est parfait. bravo. »** Deux demandes notées pour après 2H.39, en `08`
§5 (2H.40, 2H.41).

### Sous-phase 2H.39, « la caméra refaite », codée et en ligne le 2026-10-20, porte franchie

Par le fil principal (Fable 5.1), seul, à partir de `00` C39, cadré le matin même en chat (une
question par message, la première bornant l'ampleur) sur douze captures de la vraie scène prises
par une spec Playwright jetable et rassemblées dans un artifact privé, puis validé en un lot
(« go »). Rien dans le moteur, l'IA, les fonctions ni la base ; `ENGINE_VERSION` reste 11 ; pas de
sweep. Détail en `00` C39, « comment 2H.39 est codée ».

| Quoi | État |
|---|---|
| La caméra | Plus de mode libre. **Quatre vues** : Side (la touche à 52 degrés, l'arrivée au silo entier), Top (la touche à 85 degrés), Own end et Far end (derrière chaque bouche à 40 degrés, figées). La roulette sur Side et Top seulement, du silo avec ses quatre gradins à neuf cases de profondeur ; « Follow the play » part de dix-neuf cases de profondeur (la largeur, les deux rambardes et le premier rang des gradins, mesuré sur sa capture du 27 pouces) à chaque raccrochage, l'ouverture restant le silo entier ; **le bouton droit tire le sol** à la place de Ctrl, les flèches restent ; quatre boutons sous la minicarte et la touche V ; la section Camera de ⚙ retirée ; les plaques courtes à partir de 0,9 fois le silo entier (`link.platesShort`) ; la main brute (C20 tient) |
| Tests | **847 sur 50 fichiers** (842, plus framing récrit de 19 à 24 tests, keys 2 de plus, un test de framing retiré) ; typecheck racine, scripts, e2e et client verts |
| Harnais | **`e2e:board3d` vert en 11,5 min au portable** (1536 × 695) **et en 20,6 min au 27 pouces** (2560 × 1271), neuf captures de caméra lues : l'arrivée, le suivi après C, la roulette, le glisser droit, Top, Own end, Far end, le retour sur Side par V, le silo entier par la roulette. Trois runs rouges avant lui, aucun sur le code : le match e2e qui finissait au round 10, une case lointaine occupée par un Cracker (le spec choisit désormais une case sans Cracker, puisque C38 a rendu le Cracker cliquable), une égalité stricte sur un flottant. **Smoke 2D vert en 35 s** |
| En ligne | **Le 2026-10-20 sur son feu vert**, bundle `index-8Llc-Pv3.js`, construit et déployé par le fil principal : **le classifieur du mode auto a laissé passer `node scripts/deploy-vercel.mjs --production`** cette fois, `curl` de la page en ligne relu |

**Porte franchie le même jour**, sa partie sur les deux écrans : « tout est parfait. j'adore, surtout
l'option full screen. magnifique ».
