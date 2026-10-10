# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 par le
> fil principal (Fable 5.1), le soir du go de Jérôme sur la décision D11. Il remplace le prompt du
> même jour qui ouvrait la phase 2 sur le terrain vertical.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal, GO donné le 2026-10-10
avec les sept arbitrages J1 à J7 tranchés, le layout accepté en §3, et la
parallélisation par sous-agents en §9. Lis ensuite la partie C de
boomball/docs/00-reglement-v2.md, qui porte les écarts 27 à 40 décidés et prime
sur les parties A et B. 07-audit-et-plan-3d.md reste l'audit : lis-en §1.2 pour
les décisions D1 à D11, §2.A pour les lignes A1 à A32, et §10 pour le journal.
04 est l'histoire, à lire seulement quand une décision d'ingénierie te surprend.

Tu démarres la sous-phase 2H.1 de 08 §5 : le moteur et ses tests. Les règles
sont déjà écrites, le layout est déjà dessiné, tu les appliques sans les
rediscuter. Tu t'arrêtes à la fin de 2H.1 : npm test vert avec les nouveaux
tests, fixture de seed régénérée, npm run sweep qui tourne sur le nouveau
terrain et dont tu me donnes les chiffres sans rien régler, un commit.

Ce qu'il faut savoir tout de suite.

1. Lance des sous-agents en parallèle partout où 08 §9 le prévoit, en
   précisant le modèle et l'effort, avec des fichiers disjoints par agent et
   un brief fermé : fichiers, règle à appliquer, commande de vérification.
   Le fil principal garde reduce.ts, types.ts, constants.ts, legalActions.ts
   et l'intégration. Toute matière que tu me présentes nomme son auteur, toi
   ou le sous-agent. Aucun agent du panthéon.

2. L'équilibrage est rouvert par D11 et se referme à la fin de 2H.3, sur mon
   tableau. En 2H.1 tu ne règles rien.

3. Le harnais d'écran existe : npm run e2e, npm run e2e:playthrough, le
   crochet window.__boomball, le MCP Playwright que j'approuve au démarrage.
   Il tourne sur l'ancien plateau 2D jusqu'à 2H.4 ; en 2H.1, les règles se
   jugent aux tests, pas à l'écran.

4. Les deux fonctions déployées jouent encore l'ancien moteur et comptent le
   Spark 50 (A29). Ne redéploie rien en 2H.1 : le redéploiement est en 2H.4,
   avec mon feu vert, après A11 qui archive les matchs ouverts.

5. Le projet Supabase gratuit se met en pause après sept jours sans trafic.
   Si une requête échoue, GET https://api.supabase.com/v1/projects/{ref} avec
   le jeton de gestion avant de chercher un bug. Les écritures destructives
   en base passent par moi, via /supabase-migrate.

6. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais
   le .env ni une clé dans un commit. Le règlement de table du vault est
   figé : le jeu diverge de lui, lui ne bouge pas. Ne lis jamais
   design/Boomball Interface.html en entier.

7. Les commandes. Depuis boomball/ : npm test, npm run typecheck (racine,
   scripts, e2e), npm run sweep (109 s), npm run e2e, npm run e2e:playthrough.
   Depuis boomball/client/ : npm run dev sur http://localhost:5173, jamais
   127.0.0.1, npm run build. Depuis la racine du workspace : python
   boomball/supabase/checks/rls-check.py et browser-path.py, sans rien
   exporter avant.

8. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 : 2.5D via
   Three.js et react-three-fiber, désormais en caméra trois quarts fixe en
   orientation avec deux zooms ; le 3D avant le déploiement ; done = solo
   2.5D en ligne stable plus la coop à 2 ou 3 ; zéro euro ; et le terrain
   horizontal.
