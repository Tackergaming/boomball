# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 par le
> fil principal (Fable 5.1), à la fin de la construction de 2H.4. Il remplace le prompt du même jour
> qui ouvrait 2H.4. **Avant de le coller, remplace la ligne entre crochets de l'étape 0 par tes
> retours de partie**, ou dis que la partie n'a pas encore eu lieu.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal, GO donné le 2026-10-10,
dont les quatre sous-phases 2H.1 à 2H.4 sont construites ; §5 porte la feuille
de route des phases 3 à 8 et §9 la parallélisation. Lis ensuite la partie C de
boomball/docs/00-reglement-v2.md, écarts 27 à 41, qui prime sur les parties A et
B. 07-audit-et-plan-3d.md reste l'audit : lis-en §1.2 pour les décisions D1 à
D11, §2.A pour l'état des lignes A1 à A32, §3 à §6 pour la décision 2.5D,
l'architecture cible, le plan d'assets et la vérification par phase, et §10
pour le journal, dont les quatre entrées 2H.1 à 2H.4 du 2026-10-10. 04 est
l'histoire, à lire seulement quand une décision d'ingénierie te surprend.

Étape 0, avant toute ligne de code : la porte de 2H.4. Elle est franchie par ma
partie en 2D et mon verdict sur l'IA, pas par le harnais.
[Mes retours numérotés : ... / ou : je n'ai pas encore joué, on commence par là.]
Si je dis que je ne comprends pas ce que mes coéquipiers et la maison cherchent,
tu proposes une séance d'IA bornée avant la phase 3, sur les quatre observations
notées dans 07 §10 (2H.2 et 2H.3), et tu attends mon go. Sinon, tu ouvres la
phase 3.

Phase 3, la scène 2.5D statique, 07 §7 et 08 §5 : sol, obstacles et deux bouches
construits depuis le layout, caméra trois quarts fixe en orientation avec deux
zooms et sans rotation (J4), textures CC0 choisies par moi, plateau SVG gardé en
repli derrière l'interrupteur. Son premier pas est A20 : React 19, requis par
react-three-fiber 9, vitest 5, npm audit fix, le harnais vert après la montée
avant toute scène. Porte de sortie : bijection layout vers solides, et moi qui
reconnais le terrain.

Ce qu'il faut savoir tout de suite.

1. Les sous-agents de la phase 3 sont ceux de 08 §9, dernière ligne, Sonnet,
   effort précisé, un agent par fichier, fichiers disjoints, brief fermé,
   auteur nommé quand c'est présenté. Le fil principal garde Board3D.tsx,
   Camera.tsx, l'intégration et la montée de version. Toute matière que tu me
   présentes nomme son auteur.

2. Le jeu en ligne est le moteur 2 depuis le 2026-10-10 : migration 0005
   appliquée, resolve-action v8 et create-match v7 déployées avec mon feu vert,
   chaque match porte engine_version. Toute migration future passe par moi via
   /supabase-migrate, tout redéploiement par mon feu vert explicite.

3. Le harnais d'écran joue le terrain horizontal : npm run e2e en 12 s, npm run
   e2e:playthrough en 25 s, le crochet window.__boomball sans notion de zone,
   cellToScreen(x, y) sur tout le terrain. Une capture lue vaut plus qu'un
   typecheck pour tout ce qui touche à l'écran, et c'est encore plus vrai en
   2.5D : chaque pas de la phase 3 se juge sur capture.

4. Deux workflows GitHub existent, le maintien en vie de Supabase et la CI. Ils
   attendent mon premier push et, pour le premier, deux secrets de dépôt. Si
   une requête Supabase échoue, GET https://api.supabase.com/v1/projects/{ref}
   avec le jeton de gestion avant de chercher un bug.

5. L'équilibrage est clos, écarts 39 à 41, y compris le Spark à 20 gardé contre
   la recommandation du fil principal. Tu ne touches ni aux constantes de 00 ni
   aux poids de l'IA sans un go de ma part donné à l'étape 0.

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
   d'assets de la phase 3.
