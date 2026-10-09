# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-09 par le
> fil principal (Fable 5.1) à la fin du chat d'audit. Il remplace le prompt du 2026-09-02.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis boomball/docs/07-audit-et-plan-3d.md EN ENTIER :
c'est l'audit et le plan du 2026-10-09, il porte l'état mesuré, les décisions
que j'ai prises avec leur date, et la feuille de route par phases. Tu
démarres la phase 1, « voir le jeu ». boomball/docs/04-etat-des-lieux.md reste
l'historique de ce qui a été construit et pourquoi, lis-le quand une décision
d'ingénierie ou d'IA te surprend, pas avant.

Ce qu'il faut savoir tout de suite.

1. Le skill boomball dit qu'il n'y a pas de navigateur pilotable. C'est
   périmé depuis le 2026-10-09 : la section 6 de 07 dit comment Claude voit et
   joue le jeu. Un .mcp.json à la racine du workspace déclare un serveur
   Playwright MCP, approuve-le quand Claude Code te le demande. Les scripts
   Playwright, eux, marchent sans MCP. Mets le skill à jour dans cette phase.

2. Un compte de test e2e existe. Ses identifiants sont dans le .env du
   workspace, BOOMBALL_E2E_EMAIL et BOOMBALL_E2E_PASSWORD. Ne les affiche
   jamais. Sa batterie s'appelle « E2E Battery » et un match de test y est
   ouvert, à finir par script.

3. Le projet Supabase gratuit se met en pause après sept jours sans trafic.
   C'est arrivé en septembre et personne ne l'a vu. Il a été restauré le
   2026-10-09. Si une requête échoue, vérifie l'état du projet avant de
   chercher un bug : GET https://api.supabase.com/v1/projects/{ref} avec le
   jeton de gestion. Le maintien en vie par GitHub Actions est une tâche de la
   phase 2.

4. Les décisions prises le 2026-10-09, à ne pas rediscuter : option 2, 2.5D
   stylisée via Three.js et react-three-fiber ; Playwright MCP plus scripts ;
   le 3D avant le déploiement ; done = solo 2.5D en ligne stable plus la coop
   à 2 ou 3 ; zéro euro ; amis sur portables à GPU intégré ; relevé au pixel
   abandonné ; Crackers à re-mesurer sur le terrain vertical avant de passer à
   10. Tout est dans 07 §1.2.

5. Les interdits ne changent pas. Ne connecte jamais le dépôt GitHub à Vercel,
   le déploiement se fait par l'API avec les fichiers construits. Ne commite
   jamais le .env ni aucune clé. Les écritures destructives en base passent par
   moi, via /supabase-migrate. L'équilibrage est clos. Le règlement de table du
   vault est figé. Ne lis jamais design/Boomball Interface.html en entier.

6. Les commandes. Depuis boomball/ : npm test, npm run typecheck, npm run sweep
   (109 s, pas 4 min). Depuis boomball/client/ : npm run dev sur
   http://localhost:5173, npm run build. Pour une migration :
   /supabase-migrate. Les deux contrôles Python veulent encore leurs variables
   à la bash, c'est une tâche de la phase 1 de les faire lire le .env.

7. Toute matière que tu me présentes nomme son auteur, toi ou un sous-agent.
   Aucun agent du panthéon n'intervient sur Boomball.

Commence par la phase 1 de 07 §7, tâche par tâche, et arrête-toi à la fin de la
phase pour que je joue ma première partie entière sur le terrain vertical.
