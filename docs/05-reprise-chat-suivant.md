# Prompt de reprise pour le chat suivant

> Colle le bloc ci-dessous tel quel au démarrage d'une nouvelle session.

---

On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Lis boomball/docs/04-etat-des-lieux.md EN ENTIER avant de toucher à quoi que
ce soit. Il est à jour au 2026-09-02 et il contient tout le contexte. Les
sections à lire en priorité sont les comptes rendus de test en local, dans
l'ordre, puis « Le terrain devient vertical », puis la dernière, « L'initiative
se départage au dé, et le Spark vaut deux buts ».

Sept choses à savoir tout de suite.

1. Tout est construit et 273 tests sont au vert. Moteur, IA, couche serveur,
   base Supabase en ligne, 4 migrations appliquées, les deux Edge Functions
   déployées, et le client React. Le projet est en phase de playtest, plus de
   construction.

2. Le terrain court d'un bout à l'autre du silo. Une Furnace au centre du sol de
   la Zone 1 pour l'équipe A, une au centre du plafond de la Zone 3 pour B,
   44 cases de séparation, et le layout est un miroir exact autour de y=22, tenu
   par une assertion. Le ballon circule enfin dans les trois zones, 27 à 31 % en
   Zone 1 contre 0 % avant.

3. Les deux arbitrages qui attendaient sont tranchés, et le premier n'était pas
   un réglage mais un défaut. L'équipe A gagnait 129 à 66 parce que le tri
   d'initiative départageait les égalités sur une clé commençant par la lettre
   d'équipe : A passait devant à chaque compte, de chaque round, de chaque match.
   Un dé au coup d'envoi désigne maintenant le camp qui gagne les égalités, et ce
   camp alterne à chaque round. Veteran est passé à 91/104 et Star à 103/95. Et
   SPARK_POINTS est passé de 50 à 20, parce que 50 avait été fixé quand le
   terrain donnait quatre buts par match et qu'il en donne deux. Le jeu produit
   1,66 à 2,29 buts par match, dans la cible.

4. La base en ligne est à jour et propre. Le seed est appliqué, l'arène porte
   le terrain vertical et son miroir est vérifié, et il ne reste qu'un compte,
   le mien, avec mes trois parties de test. Le match de démonstration et son
   utilisateur jetable sont supprimés. Attention : le contrôle automatique du
   harnais refuse les écritures destructives en ligne, donc c'est moi qui les
   lance. La lecture passe, tu peux vérifier l'état après coup.

5. Les trois images d'arène sont finales, en 2048x2048, les anciennes dans
   assets/arena/_rejected/. Ce qui reste :
   - Le relevé de l'arène au pixel, et c'est le vrai chantier restant. Le layout
     se déclare provisoire. Deux écarts sont déjà mesurés : la Zone 2 dessine
     ses passerelles à 37 et 63 % de la hauteur quand le layout les code à 23 et
     77 %, et la Zone 1 place sa médiane à 63 % quand le layout dit 50 %. Le
     sens de la correction est une décision, pas une évidence : déplacer les
     rangées rapprocherait les lignes de mise en jeu de l'axe et changerait la
     distance au ballon au coup d'envoi. À trancher après avoir joué
   - Une décision sur les Crackers, toujours ouverte : CRACKER_MOVE_CELLS de 6
     à 10. Les chiffres datent du terrain horizontal et se remesureront
   - Un compteur à surveiller : « Shrapnel oath » porte 1 victoire pour 3 matchs
     gagnés. Probablement la migration 0003 appliquée en cours de route, mais ça
     ne se vérifie qu'en gagnant

6. Les commandes. Depuis boomball/ : `npm test`, `npm run typecheck`,
   `npm run sweep`. Depuis boomball/client/ : `npm run dev` sur
   http://localhost:5173, et `npm run build`. Pour une migration ou le seed,
   depuis boomball/ : `node scripts/apply-migration.mjs <fichier.sql>`, qui
   charge le .env du workspace tout seul, dans n'importe quel shell. Les autres
   scripts veulent encore leurs variables à la main, et cette ligne est du bash
   alors que mon shell est PowerShell : `set -a && . ../.env && set +a` depuis
   boomball/ avant `npm run deploy:function`, ou `set -a && . ./.env && set +a`
   depuis la racine avant `python boomball/supabase/checks/rls-check.py` et
   `python boomball/supabase/checks/browser-path.py`. Un match complet en
   ligne : `node scripts/run-ts.mjs scripts/live-match.ts` depuis boomball/.

7. Ce qu'il ne faut PAS faire. Ne connecte pas le dépôt GitHub à Vercel : il
   contient mon vault de campagne et mes fichiers personnels, le déploiement se
   fait par l'API en envoyant les fichiers construits. Ne commite jamais le .env
   ni aucune clé, elles sont préfixées SUPABASE_BOOMBALL_, plus
   SUPABASE_API_KEY_BOOMBALL et VERCEL_TOKEN. Le fichier
   design/Boomball Interface.html fait 7 Mo, ne le lis pas en entier. Et ne
   compare pas deux sweeps graine par graine si l'un précède le dé d'initiative :
   le tirage a décalé le flux de dés, seules les moyennes se comparent.

Attention : il n'y a pas de navigateur pilotable dans l'environnement, donc tout
ce qui touche à l'écran n'a jamais été regardé, seulement typechecké et
construit. C'est ce que mes tests servent à trouver.

La suite prévue, dans l'ordre : je rejoue une partie, la première sur le terrain
de bout en bout, on traite ce qu'elle révèle, puis je lance /security-review
moi-même, puis tu crées le projet Vercel par l'API et tu déploies.
