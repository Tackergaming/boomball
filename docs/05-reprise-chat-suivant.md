# Prompt de reprise pour le chat de développement

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session. Écrit le 2026-10-10 soir
> par le fil principal (Fable 5.1), après la partie de Jérôme à la porte de 2H.5 et ses réponses.
> Il remplace le prompt du même soir qui fermait 2H.5 : la sous-phase est en ligne, sa porte ne
> l'est pas, et ses retours ouvrent 2H.6 puis 2H.7 avant la phase 3.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Charge le skill boomball, puis lis EN ENTIER boomball/docs/08-plan-terrain-horizontal.md :
c'est le plan de la décision D11, le terrain horizontal, dont les cinq
sous-phases 2H.1 à 2H.5 sont construites et en ligne ; §3 porte le layout et
les positions de départ, §5 la feuille de route avec 2H.6 et 2H.7, §9 la
parallélisation. Lis ensuite la partie C de boomball/docs/00-reglement-v2.md :
les écarts 27 à 44 sont dans le code et priment sur les parties A et B ; C8
porte les écarts 45 à 48, DÉCIDÉS PAR MOI MAIS PAS ENCORE DANS LE CODE, et
deux points ouverts. 07-audit-et-plan-3d.md reste l'audit : lis-en §1.2 pour
les décisions D1 à D11, §2.A pour l'état des lignes A1 à A32, et §10 pour le
journal, dont les cinq entrées 2H.1 à 2H.5, et sous 2H.5 mes sept retours de
partie avec ce que le code en dit, puis mes réponses. 09 §8 à §10 portent les
sweeps de référence et de contrôle. 04 est l'histoire, à lire seulement quand
une décision d'ingénierie te surprend.

Où on en est : 2H.5 est construite et en ligne (migration 0006 appliquée,
resolve-action v9 et create-match v8), 382 tests verts, smoke vert, équilibrage
clos par moi sur 09 §9 et confirmé par 09 §10. MAIS resolve-action v9 a été
déployée AVANT l'écart 44 (pas de dérive des Crackers au round 1) : tant que
tu n'as pas redéployé, le jeu en ligne fait exploser les deux Crackers au coup
d'envoi. Vérifie dans 07 §10 si un v10 a eu lieu ; sinon c'est la première
chose à me demander. Le dépôt peut aussi porter des notes non commitées de la
fin de la session précédente (00 C8, 07 §10, 08, 05, le skill) : vérifie git
status, et si c'est le cas je taperai /commit.

Tu démarres la sous-phase 2H.6, « Crackers vers le ballon, parade du Breaker,
écrans », dans cet ordre :

a. Le retour 1 : au début de chaque tour de la maison, le plateau montre déjà
   les positions finales, puis seulement le rejeu commence. Cause trouvée dans
   client/src/match/useMatch.ts : la diffusion Realtime de notre propre lot
   arrive avant la réponse HTTP et son gestionnaire appelle load(), qui pose le
   snapshot final ; la réponse rejoue ensuite depuis le plateau d'avant. A9
   avait dédoublonné le fil, pas cette relecture. Correctif : ne pas relire le
   snapshot tant qu'une requête de ce client est en vol, la réponse s'en
   charge ; en solo personne d'autre n'écrit. Le smoke tourne en instant et ne
   le voyait pas : ajoute au smoke, en mode slow, une assertion que le premier
   état affiché après l'envoi n'est pas l'état final du lot, et deux captures.
b. Écart 45 : les Crackers roulent vers le ballon, posé ou porté, plus vers le
   joueur le plus proche. Détonation inchangée sur la première unité traversée.
   Sur la case d'un ballon au sol sans unité, le Cracker s'arrête, rien ne se
   passe. Un Cracker ne traverse pas la case de l'autre. Le tirage entre
   cibles équidistantes disparaît. Tests.
c. Écart 46 : un Cracker par pilier de bord de la ligne médiane, (0, 22) pour
   cracker-1 et (14, 22) pour cracker-2, sur une case libre adjacente au
   pilier, au coup d'envoi comme au retour, jamais le ballon, une unité ni
   l'autre Cracker, égalités au dé. Tests. Rien ne change dans la ligne arenas.
d. Écart 48 : la première case du vol d'une passe ne compte pas pour
   l'interception. Tests dans reactions.test.ts.
e. Écart 47, la parade du Breaker : quand un Cracker en dérive arrive sur la
   case d'un Breaker, avant de détonner, le Breaker dépense sa Réaction pour
   le frapper, attaque contre CRACKER_AC 10 ; réussie, le Cracker repart de
   CRACKER_BAT_RANGE_CELLS 12 cases dans l'arc de 120 degrés face au Cracker,
   soit la face d8 d'arrivée et ses deux voisines, en rebondissant et en
   détonnant sur la première unité ; manquée, il détonne sur le Breaker. AVANT
   D'ÉCRIRE UNE LIGNE, pose-moi les deux conséquences et attends ma réponse :
   un événement nouveau donc ENGINE_VERSION 3 et les matchs ouverts archivés ;
   et le choix de direction pour un Breaker humain, que le jeu ne sait pas
   demander. Ta proposition : automatique pour l'IA et pour l'humain dans un
   premier temps, la face de l'arc qui rencontre un adversaire le plus tôt,
   sinon la face d'arrivée.
f. Les deux points ouverts, à me poser au départ en une question chacun : la
   vitesse des Crackers à 8 au lieu de 10 (40 bis), et le remplaçant sur la
   case libre la plus proche du centre au lieu d'à côté de sa Furnace
   (37 bis). Si oui pour 37 bis : dérivé du centre dans le moteur, la colonne
   substitute_entry reste et n'est plus lue, pas de migration.
g. Un sweep de contrôle après b à f, comparé à 09 §8 et §10 sur les moyennes
   seulement. L'équilibrage est rouvert par 2H.6 le temps de ce sweep : je lis
   le tableau et je tranche.
h. Le redéploiement des deux fonctions avec mon feu vert, et si ENGINE_VERSION
   a bougé, une ligne dans 04 et le client qui archive.

Puis 2H.7, « l'IA par rôle », dans une session dédiée : le Breaker garde du
corps (entre ses Strikers et les menaces, frappe l'adjacent, pare et renvoie),
les attaquants qui s'étalent autour de la bouche au lieu de s'empiler (mon
retour 7, A31 pour un humain), le gardien et les défenseurs lisibles, les
quatre observations de 07 §10 (2H.2 et 2H.3), un critère par rôle dans le
sweep. Porte de sortie : je rejoue et je dis que je comprends ce que chaque
rôle cherche. Sans ce verdict, pas de phase 3.

Ce qu'il faut savoir tout de suite.

1. Sous-agents comme en 08 §9 : Sonnet, effort précisé, fichiers disjoints,
   brief fermé, auteur nommé quand c'est présenté. Le fil principal garde
   reduce.ts, les écarts, le sweep, les fonctions, l'intégration et
   useMatch.ts pour a. Toute matière que tu me présentes nomme son auteur.
   Dès que tu as une liste d'actions pour moi, donne-la numérotée, une action
   exacte par ligne, et dis ce qui se passe ensuite.

2. Le jeu en ligne est le moteur 2 : migrations 0005 et 0006 appliquées,
   resolve-action v9 (sans l'écart 44) et create-match v8, chaque match porte
   engine_version. Toute migration passe par moi via /supabase-migrate, tout
   redéploiement par mon feu vert explicite.

3. Le harnais d'écran : npm run e2e en 30 s (un tour en mode slow, glideSeen
   dans e2e/harness.ts prend deux captures d'un même temps), npm run
   e2e:playthrough en 25 s, le crochet window.__boomball sans notion de zone.
   Une capture lue vaut plus qu'un typecheck pour tout ce qui touche à
   l'écran. Le premier playthrough de la soirée a échoué à la connexion sur un
   4xx, le second est passé : si ça se reproduit, c'est à regarder.

4. L'animation 2D : client/src/match/motion.ts est le contrat de temps, un
   beat du rejeu donne une liste de pas minutés à la vitesse choisie, zéro à
   instant ; Board.tsx les joue sur une seule boucle requestAnimationFrame et
   retombe sur l'état du serveur à la fin, au skip et à la relecture. Rien
   dans le client ne résout une règle. Dette connue : une unité évacuée
   pendant un beat disparaît au début du beat.

5. Deux workflows GitHub tournent, le maintien en vie de Supabase et la CI.
   Si une requête Supabase échoue, GET https://api.supabase.com/v1/projects/{ref}
   avec le jeton de gestion avant de chercher un bug.

6. L'équilibrage est clos sur 09 §9 et §10, écarts 39 à 41, Spark à 20 gardé
   contre la recommandation du fil principal. 2H.6 le rouvre le temps d'un
   sweep. Tu ne touches pas aux poids de l'IA avant 2H.7.

7. Les interdits ne changent pas. Jamais le dépôt GitHub sur Vercel. Jamais
   le .env ni une clé dans un commit. Le règlement de table du vault est
   figé : le jeu diverge de lui, lui ne bouge pas. Ne lis jamais
   design/Boomball Interface.html en entier.

8. Les commandes. Depuis boomball/ : npm test (382), npm run typecheck (racine,
   scripts, e2e), npm run sweep (135 à 210 s selon la machine, imprime ses
   constantes), npm run e2e, npm run e2e:playthrough. Depuis boomball/client/ :
   npm run dev sur http://localhost:5173, jamais 127.0.0.1, npm run build,
   npm run typecheck. Depuis la racine du workspace : python
   boomball/supabase/checks/rls-check.py et browser-path.py, sans rien
   exporter avant, et python .claude/scripts/check_drift.py, qui signale
   CONTEXT.md en retard tant que /update n'a pas tourné.

9. Les décisions à ne pas rediscuter sont D1 à D11 dans 07 §1.2 et les écarts
   27 à 48 de 00 partie C, les 45 à 48 étant décidés et à implémenter. Dette
   connue et laissée en vue : arenas.art et le champ art du spec nomment trois
   JPEG retirés, à nettoyer avec le plan d'assets de la phase 3 ; A20
   (React 19) reste le premier pas de la phase 3.
