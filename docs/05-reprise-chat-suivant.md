# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 soir
> par le fil principal (Fable 5.1), à la fin de la construction de 2H.5. Il remplace le prompt du
> même jour qui ouvrait 2H.5 : la sous-phase est construite, sa porte ne l'est pas.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal, GO donné le 2026-10-10,
dont les cinq sous-phases 2H.1 à 2H.5 sont construites ; §3 porte le layout et
les positions de départ, §5 la feuille de route, §9 la parallélisation. Lis
ensuite la partie C de boomball/docs/00-reglement-v2.md, écarts 27 à 44, qui
prime sur les parties A et B ; C7 porte les quatre écarts de 2H.5.
07-audit-et-plan-3d.md reste l'audit : lis-en §1.2 pour les décisions D1 à D11,
§2.A pour l'état des lignes A1 à A32, et §10 pour le journal, dont les cinq
entrées 2H.1 à 2H.5 du 2026-10-10 et, sous 2H.4, mes sept retours de partie.
09-equilibrage-2H3-2026-10-10.md §9 porte le sweep de contrôle de 2H.5 et sa
lecture. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te
surprend.

Où on en est : 2H.5 est construite et en ligne depuis le 2026-10-10 soir.
382 tests verts, smoke vert avec deux captures d'un même temps à des instants
différents, migration 0006 appliquée par moi, resolve-action v9 et
create-match v8 déployées avec mon feu vert, un match neuf vérifié au harnais
sur les nouvelles lignes. J'ai confirmé l'équilibrage clos sur le sweep de
contrôle de 09 §9 (1,02 / 1,34 / 1,49 but par match, dans la cible). Deux
choses dépendent de moi, vérifie dans 07 §10 sous 2H.5 si elles sont faites :

1. L'écart 44, pas de dérive des Crackers au round 1, est écrit, testé et
   dans le moteur, mais resolve-action v9 a été déployée AVANT lui. Vérifie
   dans 07 §10 sous 2H.5 si un redéploiement v10 a eu lieu ; sinon il attend
   mon feu vert explicite, et tant qu'il n'est pas fait le jeu en ligne fait
   encore exploser les deux Crackers au coup d'envoi.
2. Ma partie en 2D animée et mon verdict : est-ce que je comprends ce que mes
   coéquipiers et la maison cherchent. Sans ce verdict, pas de phase 3. Mes
   retours numérotés décident s'il faut une séance d'IA avant : les quatre
   observations d'IA de 07 §10 (2H.2 et 2H.3) attendent, et les poids de l'IA
   n'ont pas bougé depuis 2H.2.

Ensuite seulement, la phase 3 de 08 §5 : la scène 2.5D statique, dont A20
(React 19) est le premier pas, puis 4 à 8.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints,
   brief fermé, auteur nommé quand c'est présenté. Le fil principal garde
   reduce.ts, les écarts, le sweep, les fonctions, la migration et
   l'intégration. Toute matière que tu me présentes nomme son auteur.

2. Le jeu en ligne est le moteur 2 depuis le 2026-10-10 : migrations 0005 et
   0006 appliquées, resolve-action v9 et create-match v8 déployées le soir
   du 2026-10-10, chaque match porte engine_version. Toute migration passe par
   moi via /supabase-migrate, tout redéploiement par mon feu vert explicite.

3. Le harnais d'écran joue le terrain horizontal : npm run e2e en 30 s depuis
   2H.5 (le mode slow sur un tour pour voir glisser), npm run e2e:playthrough
   en 25 s, le crochet window.__boomball sans notion de zone. Une capture lue
   vaut plus qu'un typecheck pour tout ce qui touche à l'écran ; une animation
   se juge sur deux captures à des instants différents du même temps, ce que
   glideSeen dans e2e/harness.ts produit.

4. L'animation 2D : client/src/match/motion.ts est le contrat de temps, un
   beat du rejeu donne une liste de pas minutés à la vitesse choisie, zéro à
   instant ; Board.tsx les joue sur une seule boucle requestAnimationFrame et
   retombe sur l'état du serveur à la fin, au skip et à la relecture. Rien
   dans le client ne résout une règle : motion.ts transcrit les événements,
   et motion.test.ts le tient sur un vrai match.

5. Deux workflows GitHub tournent, le maintien en vie de Supabase et la CI,
   secrets posés, premiers runs verts le 2026-10-10. Si une requête Supabase
   échoue, GET https://api.supabase.com/v1/projects/{ref} avec le jeton de
   gestion avant de chercher un bug.

6. L'équilibrage est clos, écarts 39 à 41, y compris le Spark à 20 gardé contre
   la recommandation du fil principal, et confirmé clos par moi sur 09 §9 le
   2026-10-10 soir. Tu ne touches pas aux poids de l'IA sans mon verdict sur
   le plateau animé.

7. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais
   le .env ni une clé dans un commit. Le règlement de table du vault est
   figé : le jeu diverge de lui, lui ne bouge pas. Ne lis jamais
   design/Boomball Interface.html en entier.

8. Les commandes. Depuis boomball/ : npm test (382), npm run typecheck (racine,
   scripts, e2e), npm run sweep (133 s, imprime ses constantes), npm run e2e,
   npm run e2e:playthrough. Depuis boomball/client/ : npm run dev sur
   http://localhost:5173, jamais 127.0.0.1, npm run build, npm run typecheck.
   Depuis la racine du workspace : python boomball/supabase/checks/rls-check.py
   et browser-path.py, sans rien exporter avant, et python
   .claude/scripts/check_drift.py, qui signale CONTEXT.md en retard tant que
   /update n'a pas tourné.

9. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts
   27 à 44 de 00 partie C. Dette connue et laissée en vue : arenas.art et le
   champ art du spec nomment trois JPEG retirés, à nettoyer avec le plan
   d'assets de la phase 3 ; une unité évacuée pendant un beat disparaît au
   début du beat ; A20 (React 19) reste le premier pas de la phase 3.
