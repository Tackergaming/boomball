# Prompt de reprise pour le chat suivant

> Mis à jour par le fil principal (Fable 5.1) le 2026-10-10 soir, à la fin du codage de 2H.7, avant
> migration, harnais, redéploiement et sweep. À coller tel quel au début du chat suivant.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route avec
2H.7, §9 la parallélisation. Lis ensuite la partie C de boomball/docs/00-reglement-v2.md :
les écarts 27 à 52, plus 40 bis et 37 bis, sont tous dans le code et priment sur les parties
A et B ; C9 porte les quatre écarts de 2H.7 (49 le Spark s'échappe, 50 le Spark revient,
51 l'initiative devient un ordre, 52 se planter) et le bloc « l'IA par rôle », qui est le design
dicté par moi en chat, mot pour mot. 07-audit-et-plan-3d.md §10 porte le journal, dont l'entrée
2H.7 avec son tableau et la liste de ce qui m'attend. 09 §11 est le sweep de référence que j'ai
tranché, §12 le sweep de 2H.7 **à lancer, une seule fois**. 04 est l'histoire, à lire seulement
quand une décision d'ingénierie te surprend.

Où on en est : 2H.7 est CODÉE et PAS EN LIGNE. 429 tests verts, typecheck racine, scripts, e2e et
client verts, build du client vert. ENGINE_VERSION vaut 4 dans le dépôt ; en ligne, resolve-action
v11 et create-match v9 jouent le moteur 3. Le dépôt porte 2H.7 non commitée : vérifie git status,
je taperai /commit quand tu me le diras. Le harnais d'écran n'a pas tourné sur 2H.7 : le client lit
la colonne matches.kickoff, qui n'existe pas avant la migration 0007.

Ce que je fais, dans l'ordre, et tu me le rappelles au premier message :
1. /supabase-migrate avec supabase/migrations/0007_kickoff_board.sql (une colonne jsonb nullable,
   inoffensive pour les fonctions v11/v9).
2. Tu passes npm run e2e et npm run e2e:playthrough avec ENGINE_VERSION mis à 3 dans ta copie le
   temps du run, et tu la remets à 4 avant tout commit. Tu lis les captures : la bande
   d'initiative au-dessus du plateau, le bouton Plot route, le clic sur un pion.
3. Je donne mon feu vert pour redéployer resolve-action et create-match au moteur 4.
4. Tu repasses le harnais sur un match neuf du moteur 4 : l'ouverture doit se rejouer depuis le
   coup d'envoi, les Crackers après l'équipe porteuse, le Trajector en premier.
5. Tu lances LE sweep (npm run sweep, 150 à 210 s), tu écris 09 §12 et tu me présentes le tableau
   contre §11, moyennes seulement. Je tranche. Le prix du Spark peut se rouvrir : il revient
   désormais après une prise.
6. /update puis /commit.
7. Je rejoue une partie et je dis si je comprends ce que chaque rôle cherche. Sans ce verdict, pas
   de phase 3.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints, brief fermé, auteur
   nommé quand c'est présenté. Le fil principal garde reduce.ts, initiative.ts, evaluate.ts,
   chooseAction.ts, les écarts, le sweep, les fonctions et l'intégration. Toute matière que tu me
   présentes nomme son auteur. Dès que tu as une liste d'actions pour moi, donne-la numérotée, une
   action exacte par ligne, et dis ce qui se passe ensuite.

2. Quand j'explique un concept, pose tes questions en chat, une ou deux par message, et reformule
   avant de coder. L'outil de questions à choix sert aux arbitrages fermés, pas à un concept que je
   n'ai pas encore décrit. Ne dis plus « la maison » : « l'équipe qui a la balle », « l'équipe qui
   ne l'a pas », ou « en attaque » et « en défense ». L'étiquette The House reste à l'écran.

3. Aucun sweep tant que je ne l'ai pas demandé, et un seul par lot de changements d'IA. Tu ne
   touches à aucune constante de 00 sans mon arbitrage. Les poids de l'IA sont dans ai/roles/, et
   ils viennent de mes mots dans 00 C9.

4. Toute migration passe par moi via /supabase-migrate, tout redéploiement par mon feu vert
   explicite. Chaque match porte engine_version ; une fonction qui lit une autre version refuse en
   409, le client archive.

5. Le harnais d'écran : npm run e2e en 30 s, npm run e2e:playthrough en 20 s, le crochet
   window.__boomball. Une capture lue vaut plus qu'un typecheck pour tout ce qui touche à l'écran.
   Le smoke suppose une case de destination au tour 1 et au tour 3 et un clic simple sur une case
   qui envoie la route la plus courte, ce que le mode Plot route ne doit pas casser. Si le client et
   les fonctions ne portent pas la même ENGINE_VERSION, le harnais ne trouve aucun match jouable.

6. L'initiative (écart 51) n'a plus de comptes : TurnSlot porte un rank, l'ordre dans un rôle est
   calculé par le moteur au début du round selon la situation, hasPlayedThisRound sert à la chaîne.
   Le Breaker en défense : d'abord le chemin des adversaires vers les Strikers, ensuite la ligne des
   Crackers. Le dernier maillon (le Bulwark après un but) passe quand même.

7. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé dans
   un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball Interface.html
   en entier.

8. Les commandes. Depuis boomball/ : npm test (429), npm run typecheck, npm run sweep, npm run e2e,
   npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur http://localhost:5173, jamais
   127.0.0.1, npm run build, npm run typecheck. Depuis la racine du workspace : python
   boomball/supabase/checks/rls-check.py et browser-path.py, et python .claude/scripts/check_drift.py,
   qui signale CONTEXT.md en retard tant que /update n'a pas tourné.

9. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts 27 à 52 de 00 partie
   C. Dette connue : arenas.art et le champ art du spec nomment trois JPEG retirés ; substituteEntry
   et substitute_entry restent et ne sont plus lus ; A20 (React 19) reste le premier pas de la
   phase 3 ; le choix de direction d'un Breaker humain à la parade est automatique ; le marquage des
   cases sous allonge adverse lit « la route la plus courte provoque » et non « la case est sous
   allonge » (compromis du sous-agent, à juger sur ma partie).

10. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
