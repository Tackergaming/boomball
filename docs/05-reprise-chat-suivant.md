# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 par
> le fil principal (Fable 5.1), à la fin de 2H.6. Il remplace le prompt du 2026-10-10 soir qui
> ouvrait 2H.6 : la sous-phase est construite et en ligne, sa porte attend la partie de Jérôme,
> et la session suivante est 2H.7, l'IA par rôle.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal ; §3 porte le layout et
les positions de départ, §5 la feuille de route avec 2H.6 et 2H.7, §9 la
parallélisation. Lis ensuite la partie C de boomball/docs/00-reglement-v2.md :
les écarts 27 à 48, plus 40 bis et 37 bis, sont tous dans le code et priment
sur les parties A et B ; C8 porte les six écarts de 2H.6 et, sur l'écart 47,
trois cas limites de la parade décidés par le fil principal que je dois relire.
07-audit-et-plan-3d.md reste l'audit : lis-en §1.2 pour les décisions D1 à D11,
§2.A pour l'état des lignes A1 à A32, et §10 pour le journal, dont l'entrée
2H.6 avec son tableau a à h. 09 §8, §10 et §11 portent les sweeps de référence
et de contrôle, §11 étant celui de 2H.6 que je dois trancher. 04 est l'histoire,
à lire seulement quand une décision d'ingénierie te surprend.

Où on en est : 2H.6 est construite ET en ligne (408 tests verts, typecheck et
build du client verts, smoke vert avec la vérification de relecture et ses deux
captures, playthrough vert sur le moteur 3). Le moteur 3 (ENGINE_VERSION 3,
événement crackerParried) est déployé : resolve-action v11 et create-match v9,
les matchs du moteur 2 sont archivés par le client. L'équilibrage est re-clos
par moi sur 09 §11 : Crackers 8, portée 9/12, Spark 20, le star à 2,21 accepté.
Vérifie git status : le dépôt peut porter des notes non commitées de la fin de
2H.6, et dans ce cas je taperai /commit.

La porte de 2H.6, que je franchis moi : je rejoue une partie en 2D animée sur
le moteur 3. Mes retours numérotés ouvrent 2H.7. Si je ne te les ai pas encore
donnés, c'est la première chose à me demander.

2H.7, « l'IA par rôle », dans cette session si la porte est franchie :
le Breaker garde du corps (entre ses Strikers et les menaces, frappe
l'adjacent, pare et renvoie, se place sur la ligne Cracker-ballon), les
attaquants qui s'étalent autour de la bouche au lieu de s'empiler (mon
retour 7 de 2H.5, A31 pour un humain), le gardien et les défenseurs lisibles,
crackerPressure dans ai/evaluate.ts qui lit la ligne Cracker-ballon et non la
distance à l'unité (le danger a changé de place avec l'écart 45), les quatre
observations de 07 §10 (2H.2 et 2H.3), un critère par rôle dans le sweep.
Porte de sortie : je rejoue et je dis que je comprends ce que chaque rôle
cherche. Sans ce verdict, pas de phase 3.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints,
   brief fermé, auteur nommé quand c'est présenté. Le fil principal garde
   reduce.ts, evaluate.ts, les écarts, le sweep, les fonctions et
   l'intégration. Toute matière que tu me présentes nomme son auteur.
   Dès que tu as une liste d'actions pour moi, donne-la numérotée, une action
   exacte par ligne, et dis ce qui se passe ensuite.

2. Toute migration passe par moi via /supabase-migrate, tout redéploiement par
   mon feu vert explicite. Chaque match porte engine_version ; une fonction
   qui lit une autre version refuse en 409, le client archive.

3. Le harnais d'écran : npm run e2e en 30 s (un tour en mode slow, glideSeen
   et judgeSend dans e2e/harness.ts, quatre captures de ce tour), npm run
   e2e:playthrough en 20 s, le crochet window.__boomball sans notion de zone.
   Une capture lue vaut plus qu'un typecheck pour tout ce qui touche à
   l'écran. Le smoke suppose une case de destination au tour 1 et au tour 3 :
   un match du compte e2e bloqué avec un Striker encerclé le fait échouer
   avant tout, et le playthrough le ferme. Si le client et les fonctions ne
   portent pas la même ENGINE_VERSION, le harnais ne trouve aucun match
   jouable : mettre la constante à la version en ligne le temps du run, et la
   remettre avant de commiter.

4. L'animation 2D : client/src/match/motion.ts est le contrat de temps,
   Board.tsx le joue sur une seule boucle requestAnimationFrame. Rien dans le
   client ne résout une règle. useMatch.ts tient un compteur de requêtes en
   vol : tant qu'il est non nul, la diffusion Realtime ne relit pas le
   snapshot, c'est la réponse qui rejoue puis relit (retour 1 de 2H.5, A9
   complété). Dette connue : une unité évacuée pendant un beat disparaît au
   début du beat.

5. Deux workflows GitHub tournent, le maintien en vie de Supabase et la CI.
   Si une requête Supabase échoue, GET https://api.supabase.com/v1/projects/{ref}
   avec le jeton de gestion avant de chercher un bug.

6. L'équilibrage est re-clos par moi sur 09 §11 : Crackers 8, portée 9/12,
   Spark 20. Tu ne touches à aucune constante sans mon arbitrage. 2H.7 touche
   aux poids de l'IA, et son sweep se compare à 09 §11 sur les moyennes.

7. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais
   le .env ni une clé dans un commit. Le règlement de table du vault est
   figé : le jeu diverge de lui, lui ne bouge pas. Ne lis jamais
   design/Boomball Interface.html en entier.

8. Les commandes. Depuis boomball/ : npm test (408), npm run typecheck (racine,
   scripts, e2e), npm run sweep (150 à 210 s selon la machine, imprime ses
   constantes), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ :
   npm run dev sur http://localhost:5173, jamais 127.0.0.1, npm run build,
   npm run typecheck. Depuis la racine du workspace : python
   boomball/supabase/checks/rls-check.py et browser-path.py, sans rien
   exporter avant, et python .claude/scripts/check_drift.py, qui signale
   CONTEXT.md en retard tant que /update n'a pas tourné.

9. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts
   27 à 48, 40 bis et 37 bis de 00 partie C. Dette connue et laissée en vue :
   arenas.art et le champ art du spec nomment trois JPEG retirés, à nettoyer
   avec le plan d'assets de la phase 3 ; substituteEntry et substitute_entry
   restent et ne sont plus lus ; A20 (React 19) reste le premier pas de la
   phase 3 ; le choix de direction d'un Breaker humain à la parade est
   automatique tant que le jeu ne sait pas poser une question en plein
   échelon des Crackers.
