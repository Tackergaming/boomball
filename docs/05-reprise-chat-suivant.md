# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 par le
> fil principal (Fable 5.1), à la fin de la sous-phase 2H.2. Il remplace le prompt du même jour qui
> ouvrait 2H.2.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal, GO donné le 2026-10-10
avec les sept arbitrages J1 à J7 tranchés, le layout accepté en §3, la campagne
d'équilibrage en §4.3 et la parallélisation en §9. Lis ensuite la partie C de
boomball/docs/00-reglement-v2.md, qui porte les écarts 27 à 40 décidés et prime
sur les parties A et B ; les écarts 39 et 40 sont ceux que 2H.3 mesure.
07-audit-et-plan-3d.md reste l'audit : lis-en §1.2 pour les décisions D1 à D11,
§2.A pour les lignes A1 à A32, et §10 pour le journal, dont les entrées 2H.1 et
2H.2 du 2026-10-10 : la seconde porte le sweep de contrôle qui sert de référence
à 2H.3. 04 est l'histoire, à lire seulement quand une décision d'ingénierie te
surprend.

2H.1 et 2H.2 sont faites : le moteur joue le terrain horizontal, l'IA voit les
obstacles (ligne de vue dans shotQuality et scoringNearness, relais `outlet`,
couverture `laneCover`), A31 est reproduit et corrigé, le rapport de sweep porte
la dispersion des coéquipiers du porteur, npm test est vert à 342 tests, la
migration 0005 est écrite mais pas appliquée. Tu démarres la sous-phase 2H.3 de
08 §5 : l'équilibrage. C'est une boucle à deux : tu mesures, je tranche sur le
tableau. La campagne de 08 §4.3 : la référence est le sweep de contrôle de 2H.2
dans 07 §10 (1,05 à 1,59 but par match, 36 à 60 matchs sans but sur 200, le
Spark qui décide 47 à 57 % des matchs) ; puis les Crackers à 6 et à 10 ; puis la
portée de tir à 9/12, 7/10 et 6/9 ; chacune sur les trois Tiers, 200 matchs par
Tier, les mêmes colonnes que le rapport actuel plus dispersion et collés. La
cible : 1 à 2 buts par match sur les trois Tiers et un Spark qui décide environ
30 % des rencontres. Le prix du Spark, SPARK_POINTS, est un levier à poser sur le
tableau puisque le taux de buts a triplé depuis qu'il a été fixé. Tu t'arrêtes
quand j'ai tranché : les écarts retenus écrits dans la partie C de 00, les
constantes de engine/constants.ts alignées, un tableau par variante archivé dans
docs/ avec la date, l'équilibrage déclaré re-clos dans 07 §10 et dans le skill
boomball, un commit. Si je ne tranche pas dans la séance, tu livres les tableaux
et tu t'arrêtes.

Ce qu'il faut savoir tout de suite.

1. Les sweeps se lancent en Bash d'arrière-plan, deux à la fois au plus, 141 s
   chacun ; une variante se règle en changeant une constante de
   engine/constants.ts le temps du sweep et en la remettant avant de lancer la
   suivante, jamais deux variantes dans le même état du fichier. Il n'y a pas
   de sous-agent prévu en 2H.3 (08 §9) : des commandes, et le fil principal qui
   lit. Une comparaison graine par graine ne vaut rien, seules les moyennes se
   comparent. Toute matière que tu me présentes nomme son auteur.

2. Tu ne touches ni aux poids de l'IA ni au layout pendant la campagne : une
   campagne mesure des constantes de 00, et un bouton qui bouge en même temps
   rend le tableau illisible. Si une variante révèle un défaut de l'IA, tu le
   notes pour 2H.4, tu ne le corriges pas.

3. Le harnais d'écran existe : npm run e2e, npm run e2e:playthrough, le
   crochet window.__boomball, le MCP Playwright que j'approuve au démarrage.
   Il tourne sur l'ancien plateau 2D et sur les fonctions déployées, donc sur
   le moteur 1, jusqu'à 2H.4. Il ne sert à rien en 2H.3.

4. Les deux fonctions déployées jouent encore l'ancien moteur et comptent le
   Spark 50 (A29). Ne redéploie rien : le redéploiement est en 2H.4, avec mon
   feu vert, après A11 qui archive les matchs ouverts. La migration 0005 de la
   ligne arenas attend aussi 2H.4, et c'est moi qui la lance via
   /supabase-migrate.

5. Le projet Supabase gratuit se met en pause après sept jours sans trafic.
   Si une requête échoue, GET https://api.supabase.com/v1/projects/{ref} avec
   le jeton de gestion avant de chercher un bug. Les écritures destructives
   en base passent par moi, via /supabase-migrate.

6. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais
   le .env ni une clé dans un commit. Le règlement de table du vault est
   figé : le jeu diverge de lui, lui ne bouge pas. Ne lis jamais
   design/Boomball Interface.html en entier.

7. Les commandes. Depuis boomball/ : npm test, npm run typecheck (racine,
   scripts, e2e), npm run sweep (141 s), npm run e2e, npm run e2e:playthrough.
   Depuis boomball/client/ : npm run dev sur http://localhost:5173, jamais
   127.0.0.1, npm run build. Depuis la racine du workspace : python
   boomball/supabase/checks/rls-check.py et browser-path.py, sans rien exporter
   avant, et python .claude/scripts/check_drift.py, qui signale CONTEXT.md en
   retard tant que /update n'a pas tourné.

8. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2. Le repli de la
   règle de rebond de l'écart 36b est confirmé et écrit dans la partie C. Deux
   observations d'IA sont notées dans 07 §10 sous 2H.2 et attendent 2H.4 : le
   gardien qui court chercher son propre ballon raté, et le Striker à plus de
   dix-huit cases qui ne revient pas vers son gardien porteur. Tu ne les
   corriges pas en 2H.3.
