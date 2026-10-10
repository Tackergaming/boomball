# Prompt de reprise pour le chat suivant

> Mis à jour par le fil principal (Fable 5.1) le 2026-10-10, à la mise en ligne de 2H.7 : migration
> 0007, moteur 4 en ligne, harnais vert, sweep unique écrit en 09 §12. À coller tel quel au début du
> chat suivant, après la partie de Jérôme.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §5 porte la feuille de route, 2H.7
est la dernière sous-phase construite, §9 la parallélisation. Lis ensuite la partie C de
boomball/docs/00-reglement-v2.md : les écarts 27 à 52, plus 40 bis et 37 bis, sont tous dans le
code et EN LIGNE, et priment sur les parties A et B ; C9 porte les quatre écarts de 2H.7 et le
bloc « l'IA par rôle », qui est le design dicté par moi en chat, mot pour mot. 07 §10 porte le
journal, dont l'entrée 2H.7 avec ses deux tableaux (le codage, puis la mise en ligne) et ce qui
m'attend. 09 §12 est le sweep de 2H.7 avec ma décision ; §11 celui de 2H.6. 04 est l'histoire,
à lire seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.7 est CODÉE, COMMITÉE et EN LIGNE depuis le 2026-10-10. 429 tests verts,
typecheck racine, scripts, e2e et client verts, build du client vert. ENGINE_VERSION vaut 4 dans
le dépôt comme en ligne : resolve-action v12 et create-match v10. Migration 0007 appliquée. Le
harnais est vert sur le moteur 4 : l'ouverture se rejoue depuis le coup d'envoi, les Crackers
jouent après l'équipe qui a la balle, le Trajector en premier, le Spark s'échappe et revient, le
Bulwark se plante. Le smoke a gagné une étape « clic sur un pion » au tour 2.

Le sweep de 2H.7 (09 §12) : trois Tiers à 1,46 / 1,73 / 1,80 but par match, Spark pris dans neuf
matchs sur dix et décidant toujours un match sur deux, évacués 0,76 / 0,43 / 0,49, Dodge 9,80 /
9,57 / 8,03 par match. J'ai tranché : rien ne bouge, Spark à 20, équilibrage clos.

LA PORTE DE 2H.7 : j'ai rejoué une partie sur le moteur 4 et je te dis, en retours numérotés, si
je comprends ce que chaque rôle cherche. C'est ce verdict qui ouvre la phase 3 (scène 2.5D,
A20 React 19 en premier pas) ou une sous-phase 2H.8 de corrections. Sans ce verdict, pas de
phase 3. Tu commences par me demander mes retours si je ne les ai pas donnés.

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
   Le smoke suppose une case de destination au tour 1 et au tour 3, un clic simple sur une case qui
   envoie la route la plus courte, et un pion cliquable au tour 2. Il échoue si le match e2e en
   cours atteint le round 10 pendant ses trois tours : lancer npm run e2e:playthrough pour le finir,
   le smoke suivant en ouvre un neuf. Un 401 sur GET /rest/v1/role_stats à la connexion est apparu
   2 runs sur 7, jamais deux fois de suite, code du hub inchangé : global-setup.ts imprime
   maintenant le corps de la réponse, à lire s'il revient.

6. useMatch.load porte un compteur de génération : React StrictMode monte l'effet initial deux
   fois en dev et deux lectures en vol se dépassaient, le plateau restait sur le coup d'envoi et
   personne n'était sur le chrono. Ne l'enlève pas.

7. L'initiative (écart 51) n'a plus de comptes : TurnSlot porte un rank, l'ordre dans un rôle est
   calculé par le moteur au début du round selon la situation, hasPlayedThisRound sert à la chaîne.
   Le Breaker en défense : d'abord le chemin des adversaires vers les Strikers, ensuite la ligne des
   Crackers. Le dernier maillon (le Bulwark après un but) passe quand même.

8. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais le .env ni une clé dans
   un commit. Le règlement de table du vault est figé. Ne lis jamais design/Boomball Interface.html
   en entier.

9. Les commandes. Depuis boomball/ : npm test (429), npm run typecheck, npm run sweep (320 s sur
   une machine occupée), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ : npm run dev
   sur http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck. Depuis la racine
   du workspace : python boomball/supabase/checks/rls-check.py et browser-path.py, et python
   .claude/scripts/check_drift.py, qui signale CONTEXT.md en retard tant que /update n'a pas tourné.
   Le cwd de l'outil Bash se réinitialise entre deux appels parallèles : chemins absolus, ou
   npm --prefix.

10. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts 27 à 52 de 00 partie
    C. Dette connue : arenas.art et le champ art du spec nomment trois JPEG retirés ; substituteEntry
    et substitute_entry restent et ne sont plus lus ; A20 (React 19) reste le premier pas de la
    phase 3 ; le choix de direction d'un Breaker humain à la parade est automatique ; le marquage des
    cases sous allonge adverse lit « la route la plus courte provoque » et non « la case est sous
    allonge » (compromis du sous-agent, à juger sur ma partie) ; le tray « Swing at / Shove / Pass
    to » au clic sur un pion n'a pas encore été vu au harnais, faute de cible à portée.

11. Arrête-toi pour qu'on change de chat dès qu'on est à la moitié de la fenêtre de contexte, après
    avoir récrit ce fichier.
