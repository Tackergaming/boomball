# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 par le
> fil principal (Fable 5.1), après la partie de Jérôme à la porte de 2H.4. Il remplace le prompt du
> même jour qui ouvrait la phase 3 : la porte n'est pas franchie, et ses retours ouvrent une
> sous-phase de plus avant.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal, GO donné le 2026-10-10,
dont les quatre sous-phases 2H.1 à 2H.4 sont construites ; §3 porte le layout et
les positions de départ, §5 la feuille de route, §9 la parallélisation. Lis
ensuite la partie C de boomball/docs/00-reglement-v2.md, écarts 27 à 41, qui
prime sur les parties A et B. 07-audit-et-plan-3d.md reste l'audit : lis-en
§1.2 pour les décisions D1 à D11, §2.A pour l'état des lignes A1 à A32, et §10
pour le journal, dont les quatre entrées 2H.1 à 2H.4 du 2026-10-10 et, sous
2H.4, mes sept retours de partie et les quatre décisions qu'ils ont produites.
04 est l'histoire, à lire seulement quand une décision d'ingénierie te
surprend.

Tu démarres la sous-phase 2H.5, « coup d'envoi, ballon perdu, Crackers,
animation 2D », que j'ai décidée le 2026-10-10 à la porte de 2H.4, après avoir
joué une partie sur le terrain horizontal. Son contenu, dans cet ordre :

a. Écart 38 révisé : les six joueurs de champ partent à huit cases du ballon,
   ligne y14 pour A et y30 pour B, aux mêmes x, pour que le ballon soit
   prenable dès le premier tour sans Dash. Le gardien reste dans sa bouche.
   Vérifie par test que chacun des six atteint (7, 22) en huit cases malgré les
   obstacles, pour les deux camps.
b. Écart 42 : le ballon perdu, sur bousculade ou évacuation, ne reste plus sous
   les pieds du porteur. Il tombe sur une case adjacente tirée au d8, comme une
   passe ratée ; si la case tirée est pleine, occupée ou hors terrain, propose
   une règle de repli (la case libre suivante dans le sens horaire), écris-la
   dans l'écart, teste-la.
c. Écart 43 : les deux Crackers naissent sur deux cases distinctes de part et
   d'autre du centre, jamais sur la case du ballon, et un Cracker qui revient
   prend la case libre la plus proche du centre, jamais la case du ballon ni
   une case occupée.
d. Les traits de trajectoire du rejeu sont retirés du plateau et du crochet.
e. La passe d'animation 2D, avant toute ligne de 2.5D : les pions glissent le
   long de leur chemin, le ballon vole sur une passe ou un tir, un temps par
   action, à la vitesse de rejeu choisie. Le plateau est en SVG et le rejeu
   découpe déjà le lot en temps : c'est ce découpage qu'on anime, rien d'autre.
f. Un sweep de contrôle après a, b et c, comparé au tableau de 09 §8, sur les
   moyennes seulement. Si le régime bouge, tu me le montres et je tranche ;
   sinon l'équilibrage reste clos.
g. Les positions de départ changent la ligne arenas : une migration 0006 que je
   lance via /supabase-migrate, le seed régénéré, puis le redéploiement des
   deux fonctions avec mon feu vert, parce qu'elles embarquent le moteur. Ne
   monte ENGINE_VERSION que si la forme d'un état ou d'un événement change ;
   une règle qui s'applique au prochain tour n'archive pas les matchs ouverts.

Porte de sortie : je rejoue une partie en 2D animée et je dis si je comprends
ce que mes coéquipiers et la maison cherchent. Sans ce verdict, pas de phase 3.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints,
   brief fermé, auteur nommé quand c'est présenté. Le fil principal garde
   reduce.ts, les écarts, le sweep, les fonctions, la migration et
   l'intégration ; l'animation du plateau (Board.tsx) peut aller à un
   sous-agent à effort élevé avec un contrat de temps écrit par toi. Toute
   matière que tu me présentes nomme son auteur.

2. Le jeu en ligne est le moteur 2 depuis le 2026-10-10 : migration 0005
   appliquée, resolve-action v8 et create-match v7 déployées, chaque match
   porte engine_version. Toute migration passe par moi via /supabase-migrate,
   tout redéploiement par mon feu vert explicite.

3. Le harnais d'écran joue le terrain horizontal : npm run e2e en 12 s, npm run
   e2e:playthrough en 25 s, le crochet window.__boomball sans notion de zone.
   Une capture lue vaut plus qu'un typecheck pour tout ce qui touche à
   l'écran ; une animation se juge sur deux captures à des instants
   différents du même temps.

4. Deux workflows GitHub tournent, le maintien en vie de Supabase et la CI,
   secrets posés, premiers runs verts le 2026-10-10. Si une requête Supabase
   échoue, GET https://api.supabase.com/v1/projects/{ref} avec le jeton de
   gestion avant de chercher un bug.

5. L'équilibrage est clos, écarts 39 à 41, y compris le Spark à 20 gardé contre
   la recommandation du fil principal. Les écarts 38, 42 et 43 de cette
   sous-phase le rouvrent le temps d'un sweep de contrôle, pas plus. Tu ne
   touches pas aux poids de l'IA : mes quatre observations d'IA (07 §10, 2H.2
   et 2H.3) attendent mon verdict sur le plateau animé.

6. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais
   le .env ni une clé dans un commit. Le règlement de table du vault est
   figé : le jeu diverge de lui, lui ne bouge pas. Ne lis jamais
   design/Boomball Interface.html en entier.

7. Les commandes. Depuis boomball/ : npm test (348), npm run typecheck (racine,
   scripts, e2e), npm run sweep (135 s, imprime ses constantes), npm run e2e,
   npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
   http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck.
   Depuis la racine du workspace : python boomball/supabase/checks/rls-check.py
   et browser-path.py, sans rien exporter avant, et python
   .claude/scripts/check_drift.py, qui signale CONTEXT.md en retard tant que
   /update n'a pas tourné.

8. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts
   27 à 41 de 00 partie C. Dette connue et laissée en vue : arenas.art et le
   champ art du spec nomment trois JPEG retirés, à nettoyer avec le plan
   d'assets de la phase 3 ; A20 (React 19) reste le premier pas de la phase 3.
