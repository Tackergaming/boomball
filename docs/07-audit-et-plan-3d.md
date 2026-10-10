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
| D4 | `CRACKER_MOVE_CELLS` : **re-mesurer sur le terrain vertical, puis 10 si confirmé** | Jérôme | Un sweep à 10 en phase 2, arbitrage ensuite, écart à verser au règlement si appliqué |
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
| A2 | **Déploiement Vercel par l'API**, projet à créer, fichiers construits à envoyer, `site_url` à changer | `scripts/` à écrire, Supabase auth config | Rien n'est déployé. Décision D3 : en dernière phase | Majeur | 1 |
| A3 | `/security-review` | Jérôme la lance | Avant la mise en ligne | Majeur | 0,5 |
| A4 | **Compteur de victoires** : 1 victoire pour 3 matchs gagnés | `teams.wins`, lu en base | L'ordre des quatre matchs en base colle à l'hypothèse de `04` : seul le dernier, 50-30, a été compté après la migration 0003. Se tranche à la prochaine victoire, humaine ou par script | Majeur | 0,25 |
| A5 | **Re-mesure des Crackers à 10 cases** sur le terrain vertical, puis arbitrage, puis écart 26 au règlement v2 | `engine/constants.ts`, `00-reglement-v2.md` B8 | Décision D4 | Mineur | 0,5 |
| A6 | **La coop à 2 ou 3** : rejoindre une batterie, sièges 2 et 3 du lobby, les tours des autres humains rejoués à l'écran, `useAccount` qui ne trouve une équipe que par `owner` | `client/src/screens/Lobby.tsx`, `TeamHub.tsx`, `lib/useAccount.ts`, `match/useMatch.ts`, une migration | Décision produit verrouillée de `04`, jamais construite, et dans le done (D5) | Majeur | 3 à 4 |
| A7 | **Échelle d'initiative coupée** (vu) : à 1440 x 900 seules quatre rangées sont visibles, le bloc des six alliés de Jérôme est hors de vue sous « Probe », et il faut faire défiler pour savoir quand on rejoue | `client/src/match/Ladder.tsx`, `screens/Match.tsx` grille de droite | Le brief de design demandait que l'échelle dise d'un coup d'œil quand le joueur rejoue | Majeur | 0,5 |
| A8 | **Cases sans ancrage jamais montrées** (vu) : le plateau éclaire les cases atteignables mais rien ne distingue celles où finir le tour fait chuter | `client/src/match/Board.tsx` | Le brief de design le demandait, et c'est la règle la plus punitive du sport. L'avertissement `!` n'apparaît qu'après coup | Majeur | 0,5 en 2D, repris dans le 2.5D |
| A9 | **Écho Realtime** : le client s'abonne au canal du match et la fonction diffuse chaque lot, y compris au client qui l'a demandé. Le gestionnaire de diffusion ajoute les événements au fil **et** relit le snapshot, alors que la réponse HTTP les ajoute aussi et lance le rejeu. Lu dans le code, à vérifier à l'écran : lignes du fil en double, et un saut du plateau à l'état final en plein rejeu | `client/src/match/useMatch.ts`, effet `channel(...)` et `send()` | Si confirmé, c'est visible à chaque tour en solo | Majeur si confirmé | 0,5 |
| A10 | **Écriture non atomique et erreurs ignorées** dans `persist` : trois écritures séquentielles sans transaction ni vérification de `seq`, et le résultat de l'insert des événements n'est pas lu | `supabase/functions/resolve-action/index.ts` `persist()` | Invisible en solo. En coop, deux requêtes simultanées chargent le même `seq`, la seconde insertion viole la clé primaire sans que personne le sache, et le snapshot est écrasé. À régler avant A6 | Majeur | 1 |
| A11 | **Aucune version du moteur sur les matchs** : ni `MatchState`, ni les événements, ni `matches` ne portent de version. Un match inachevé en base est rechargé par n'importe quel moteur futur | `supabase/migrations/`, `engine/constants.ts`, les deux fonctions, `client` | Dès que le 2.5D ou la coop touchent au moteur ou aux événements, un match ouvert sur l'ancienne version casse sans message | Majeur | 0,5 |
| A12 | **États d'erreur du chargement** : `useAccount` ignore `error` sur toutes ses lectures. Projet en pause ou réseau coupé, un joueur signé atterrit sur « Raise a battery » comme s'il était nouveau, et le bouton échoue sans explication. Lu dans le code | `client/src/lib/useAccount.ts`, `App.tsx` | C'est exactement l'écran que ses amis auraient vu en septembre | Majeur | 0,5 |
| A13 | **Maintien en vie du projet Supabase** (D7) | `.github/workflows/supabase-keepalive.yml`, secrets du dépôt par Jérôme | Sans lui, pause après sept jours sans trafic, et fenêtre de restauration limitée (90 jours selon les docs, un an selon d'autres pages) | Bloquant | 0,5 |
| A14 | **Chrono affiché à 121 s** (vu) : le compte à rebours dépasse `TURN_TIMER_SECONDS` d'une seconde au premier rendu, parce que `now` peut être antérieur à l'instant de reprise de la main | `client/src/screens/Match.tsx`, calcul de `left` | Cosmétique | Mineur | 0,1 |
| A15 | **Payload libre masqué** (vu) : l'anneau et le mot PAYLOAD sont dessinés sous les tokens et leurs plaques de nom, donc un ballon posé à côté d'un joueur disparaît | `client/src/match/Board.tsx`, ordre des couches | Le ballon est tout le sport | Mineur | 0,25 |
| A16 | **Fait le 2026-10-10.** Le 401 ne s'est pas reproduit ; le harnais a trouvé à sa place un **409 sur `POST /rest/v1/profiles` à chaque connexion** : `App` insérait un profil qui existait, parce que `useAccount` gardait le profil `null` de l'état déconnecté à côté du nouvel id le temps d'une lecture. Corrigé par un état `undefined`, « pas encore lu », seul `null` déclenchant l'insertion. Les avertissements React venaient de sept objets de style mêlant un raccourci et une propriété longue (`Ladder`, `Board`, `Feed`, `Announce`, `Results`, `TeamHub`, `SeatPanel`), tous passés en propriétés longues. `smoke.spec.ts` et `global-setup.ts` échouent désormais sur tout avertissement et toute réponse 400 ou plus | `client/src/lib/useAccount.ts`, `App.tsx`, les sept composants | Un défaut qu'on ne lit plus est un défaut qui reste | Clos | 0,25 |
| A17 | **Écran de résultats** : « Won on the Payload » même quand le Spark a décidé, temps forts non dérivés des événements, promotion non signalée | `client/src/screens/Results.tsx` | Hors done pour les temps forts, mais le verdict faux est un défaut | Mineur | 1 |
| A18 | **Nom de personnage non conservé** entre deux matchs : `02` dit que `team_members.character_name` le garde, le lobby ne l'écrit jamais et préremplit avec le nom de profil | `client/src/screens/Lobby.tsx` | Petit écart doc / code | Mineur | 0,25 |
| A19 | **Images** : trois JPEG 2048², 5,9 Mo. À convertir en WebP, et à décider si elles servent de texture de paroi en 2.5D | `assets/arena/`, `client/src/lib/arena.ts` | 95 % du téléchargement | Mineur | 0,5 |
| A20 | **Montées de version** : React 19 (requis par react-three-fiber 9), vitest 5, `npm audit fix` pour source-map-js | `package.json` des deux paquets | Préalable au 2.5D | Mineur | 0,5 à 1 |
| A21 | **Fait le 2026-10-10**, les deux contrôles chargent le `.env` du workspace eux-mêmes, comme `apply-migration.mjs`. `live-match.ts` (via `run-ts.mjs`) et `deploy-edge-function.mjs` veulent encore leurs variables à la bash | `supabase/checks/*.py` | Une étape qu'on ratait | Clos pour les contrôles | 0 |
| A22 | **Docs en dérive** : `02` dit un chrono de 60 s (120 depuis le 2 septembre) ; `01` finit sur « l'image gagne sur le plan », contredit par D8. Le skill `boomball` et `05` sont à jour depuis le 2026-10-10 | `02-architecture.md`, `01-prompts-arene.md` | Un chat neuf les croit | Mineur | 0,1 |
| A23 | **Sauvegardes** : aucune sur le plan gratuit. Un script d'export JSON hebdomadaire des tables de référence et des équipes suffit à un cercle d'amis | `scripts/export-db.mjs` à écrire | Les seules données qui comptent sont les victoires des équipes | Mineur | 0,5 |
| A24 | **CI** : aucune. Un workflow qui lance test, typecheck et build du client sur chaque push touchant `boomball/` | `.github/workflows/ci.yml` | Un dépôt qui ne se vérifie pas tout seul finit par casser sans bruit | Mineur | 0,5 |
| A25 | **Audio** : inexistant. Six sons CC0 suffiraient | client | Hors done (D5) | Mineur | 1 |
| A26 | `projet test` occupe le second des deux projets gratuits de l'org Supabase | Dashboard, Jérôme | À supprimer le jour où un troisième projet est voulu | Mineur | 0 |
| A27 | **Secret JWT du projet** apparu dans un résultat d'outil de ce chat, en lisant la configuration PostgREST par l'API de gestion. Jamais recopié | Dashboard, Jérôme | Risque faible tant que les transcripts restent sur sa machine. Le faire tourner régénère aussi les clés anon et service, donc `.env` et `client/.env.local` | Mineur | Jérôme décide |
| A28 | **Une action en retard est appliquée au tour suivant.** Trouvé au harnais le 2026-10-10. `resolve-action` règle l'expiration par `expireIfDue`, qui fait jouer la maison jusqu'au tour humain suivant, puis **soumet l'action reçue à ce nouveau tour** ; si elle y est légale elle est appliquée, et la réponse ne porte même pas `expired`. Seule une action illégale sur le nouveau plateau prend le chemin `expired`. Mesuré : match ouvert au round 2 avec un chrono passé, un `endTurn` envoyé, tour suivant au round 4. Un `endTurn` après le chrono, **dont le coup à la porte du client**, coûte donc deux tours | `supabase/functions/resolve-action/index.ts`, après `expireIfDue` | C'est une partie de ce que Jérôme décrivait quand « dix rounds avaient passé ». Correctif : quand `overdue` est non nul, ne pas soumettre l'action et répondre `expired` ; un test dans `session.test.ts` ; redéploiement de la fonction | Majeur | 0,5 |
| A29 | **Les fonctions déployées sont en retard sur le moteur.** Trouvé en lisant les événements des deux matchs joués au harnais le 2026-10-10 : `scored(B, 50)` sur une prise du Spark, alors que `engine/constants.ts` dit `SPARK_POINTS = 20` depuis le commit c9be92c du 2026-09-02, « Ramène le Spark à deux buts », et que `04`, `CONTEXT.md` et `check_drift.py` disent 20. `resolve-action` v7 a donc été bundlée avant ce commit. Le jeu en ligne joue un Spark à cinq buts, et le tableau d'équilibrage de `04` ne décrit pas ce qui est déployé. Le commentaire de `scripts/live-match.ts` dit encore « 50 for the Spark » | `npm run deploy:function` pour les deux fonctions, `scripts/live-match.ts` | C'est exactement ce que A11 existe pour attraper : sans version sur les matchs, personne ne voit qu'un moteur déployé diverge. À redéployer avec le feu vert de Jérôme, parce que ça change le jeu en ligne, et A11 juste derrière | Majeur | 0,25, plus le feu vert |
| A30 | **Le terrain ne se lit plus sous le noircissement** (retour 1 de la première partie de Jérôme, 2026-10-10). L'art est filtré à 50 % de luminosité, lavé d'un voile sombre, et chaque case de structure est peinte à 82 % d'opacité par-dessus : sur les captures, les passerelles de l'image disparaissent derrière le quadrillage | `client/src/match/Board.tsx`, `S.art`, `S.wash`, remplissage des cases | La 2D reste le repli derrière l'interrupteur jusqu'au bout, et c'est l'écran de la phase 2. Alléger le voile et l'opacité des cases, juger sur capture | Mineur | 0,25 |
| A31 | **L'IA n'est ni lisible ni tactique pour un humain** (retours 3 et 4) : après un but marqué par Jérôme, tous ses alliés se sont massés autour de son Bulwark et n'en sont jamais repartis ; dans l'ensemble il n'a pas compris ce que la maison et ses coéquipiers cherchaient. L'équilibrage est mesuré IA contre IA, il ne dit rien de ce qu'un humain comprend. Le `payloadReset` après un but et la valeur de position « défendre » sont les premiers suspects, et la leçon de `positionValue` s'applique : une heuristique doit valoriser la case qui rend une action possible | `ai/`, à reproduire d'abord au harnais avec une capture après un but | **L'équilibrage reste clos** : il s'agit d'une reproduction mesurée puis d'un correctif ciblé, suivi d'un sweep pour vérifier que les moyennes n'ont pas bougé. Un correctif qui bouge les moyennes est un arbitrage de Jérôme | Majeur | 1 à 2 |
| A32 | **La portée de tir a paru trop longue** (retour 6) : `PAYLOAD_RANGE_CELLS` 9 et `PAYLOAD_LONG_RANGE_CELLS` 12, soit 45 et 60 pieds. C'est une règle de `00-reglement-v2.md`, donc un arbitrage de Jérôme, mesuré avant : une ligne de plus dans le sweep de la phase 2, à côté des Crackers | `engine/constants.ts`, `docs/00` | Même méthode que D4 : sweep, tableau, arbitrage, écart au règlement si appliqué | Mineur | fondu dans A5 |

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
`boomball/e2e/.auth/`, ignoré par git. Claude ne voit jamais le mot de passe.

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
