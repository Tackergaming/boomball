# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 par le
> fil principal (Fable 5.1), à la fin de la sous-phase 2H.3. Il remplace le prompt du même jour qui
> ouvrait 2H.3.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal, GO donné le 2026-10-10
avec les sept arbitrages J1 à J7 tranchés, le layout accepté en §3, la sous-phase
2H.4 en §4.4 et §4.5, la parallélisation en §9. Lis ensuite la partie C de
boomball/docs/00-reglement-v2.md, qui porte les écarts 27 à 41 décidés et prime
sur les parties A et B ; C6 porte les trois arbitrages d'équilibrage du
2026-10-10. 07-audit-et-plan-3d.md reste l'audit : lis-en §1.2 pour les
décisions D1 à D11, §2.A pour les lignes A1 à A32, et §10 pour le journal, dont
les entrées 2H.1, 2H.2 et 2H.3 du 2026-10-10. 09-equilibrage-2H3-2026-10-10.md
archive les tableaux d'équilibrage : à lire seulement si une constante de 00 te
surprend. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te
surprend.

2H.1, 2H.2 et 2H.3 sont faites : le moteur joue le terrain horizontal, l'IA voit
les obstacles, l'équilibrage est re-clos sur mon tableau le 2026-10-10 avec les
Crackers à 10, la portée de tir gardée à 9/12 et le Spark gardé à 20, écarts 39 à
41 ; le sweep donne 1,10 à 1,80 but par match et le Spark décide un match sur
deux, ce que j'ai accepté. npm test est vert à 342 tests. Tu démarres la
sous-phase 2H.4 de 08 §5 : serveur et client 2D. Son contenu est 08 §4.4 et §4.5 :
A11 la version du moteur sur les matchs, avec l'archivage des matchs ouverts de
la version 1 ; A28 l'action en retard qui n'est plus soumise au tour suivant ;
la migration 0005 que je lance moi-même via /supabase-migrate ; A29 le
redéploiement des deux fonctions avec mon feu vert ; le plateau 2D en vue de
dessus du terrain entier, le briefing récrit, le fil sans lignes de chute, le
harnais Playwright sans notion de zone ; puis les lignes mécaniques de
l'ancienne phase 2 listées en §4.5. La porte de sortie : smoke.spec.ts vert,
browser-path.py vert, un playthrough entier, et moi qui joue une partie en 2D et
dis si je comprends l'IA. Tu t'arrêtes à cette porte.

Ce qu'il faut savoir tout de suite.

1. Les sous-agents de 2H.4 sont ceux de 08 §9, lignes (g) à (j), Sonnet, effort
   précisé, fichiers disjoints, brief fermé, auteur nommé quand c'est présenté.
   Le fil principal garde A11, A28, les deux fonctions, la migration, le
   redéploiement et l'intégration. Toute matière que tu me présentes nomme son
   auteur.

2. Quatre observations d'IA attendent 2H.4 et se jugent à ma partie en 2D, pas
   avant : le gardien qui court chercher son propre ballon raté, le Striker à
   plus de dix-huit cases qui ne revient pas vers son gardien porteur (07 §10,
   2H.2), le relais qui se place à la portée du tir et non à celle de la passe,
   et le Spark enjeu unique par match (07 §10, 2H.3). Tu ne touches ni aux poids
   de l'IA ni aux constantes de 00 : l'équilibrage est clos, et un changement
   d'IA sans ma partie serait mesuré sur rien.

3. Le harnais d'écran existe : npm run e2e, npm run e2e:playthrough, le
   crochet window.__boomball, le MCP Playwright que j'approuve au démarrage.
   Il joue encore l'ancien plateau 2D et les fonctions déployées, donc le
   moteur 1, tant que 2H.4 n'a pas redéployé : c'est précisément ce que 2H.4
   change, et smoke.spec.ts doit finir vert sur le terrain horizontal.

4. Les deux fonctions déployées jouent encore l'ancien moteur et comptent le
   Spark 50 (A29). Le redéploiement se fait en 2H.4, avec mon feu vert
   explicite, après A11 qui archive les matchs ouverts, jamais avant. La
   migration 0005 de la ligne arenas, et la colonne engine_version de A11,
   c'est moi qui les lance via /supabase-migrate. Tu écris les fichiers SQL et
   tu me dis quoi taper.

5. Le projet Supabase gratuit se met en pause après sept jours sans trafic.
   Si une requête échoue, GET https://api.supabase.com/v1/projects/{ref} avec
   le jeton de gestion avant de chercher un bug. Les écritures destructives
   en base passent par moi, via /supabase-migrate.

6. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais
   le .env ni une clé dans un commit. Le règlement de table du vault est
   figé : le jeu diverge de lui, lui ne bouge pas. Ne lis jamais
   design/Boomball Interface.html en entier.

7. Les commandes. Depuis boomball/ : npm test, npm run typecheck (racine,
   scripts, e2e), npm run sweep (135 s, imprime ses constantes), npm run e2e,
   npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
   http://localhost:5173, jamais 127.0.0.1, npm run build. Depuis la racine du
   workspace : python boomball/supabase/checks/rls-check.py et browser-path.py,
   sans rien exporter avant, et python .claude/scripts/check_drift.py, qui
   signale CONTEXT.md en retard tant que /update n'a pas tourné.

8. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts
   27 à 41 de 00 partie C, y compris le Spark à 20 que j'ai gardé contre la
   recommandation du fil principal.
