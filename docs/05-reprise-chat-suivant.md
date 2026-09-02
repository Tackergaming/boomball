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

4. DEUX ÉCRITURES EN BASE M'ATTENDENT ET ELLES DEMANDENT MA MAIN. Le contrôle
   automatique du harnais refuse les écritures destructives en ligne, et une
   autorisation donnée en conversation ne le lève pas : il faut une règle de
   permission dans settings.json, ou que je lance les commandes moi-même.
   - Appliquer le seed régénéré. L'arène en base porte encore l'ancien layout.
     Depuis boomball/, après `set -a && . ../.env && set +a` :
     `node scripts/apply-migration.mjs supabase/seed.sql`
   - Supprimer le match de démonstration, en supprimant l'utilisateur jetable qui
     le porte : `DELETE /auth/v1/admin/users/908c92d2-bfd9-42ce-b90f-0db66ac68fb5`.
     Vérifié : cet utilisateur est Bombast et ne possède que ce match. Mes trois
     parties, sous Tacker et « Shrapnel oath », sont sur un autre compte

5. Ce qui reste, en dehors de ça :
   - Les images des Zones 2 et 3 à générer. Les deux prompts sont écrits et prêts
     à coller dans docs/01-prompts-arene.md. La Zone 1 n'a rien à faire. Pour la
     Zone 3, ne joindre QUE la Zone 1 finie : `boomball up.png` dessine les deux
     portes latérales qu'on vient d'abandonner
   - Le relevé de l'arène au pixel, contre les nouvelles images, une fois
     validées. Le layout se déclare lui-même provisoire
   - Une décision sur les Crackers, toujours ouverte : `CRACKER_MOVE_CELLS` de 6
     à 10. Les chiffres datent du terrain horizontal et se remesureront
   - Un compteur à surveiller : « Shrapnel oath » porte 1 victoire pour 3 matchs
     gagnés. Probablement la migration 0003 appliquée en cours de route, mais ça
     ne se vérifie qu'en gagnant

6. Les commandes. Depuis boomball/ : `npm test`, `npm run typecheck`,
   `npm run sweep`. Depuis boomball/client/ : `npm run dev` sur
   http://localhost:5173, et `npm run build`. Pour redéployer les fonctions,
   depuis boomball/ : `set -a && . ../.env && set +a` puis
   `npm run deploy:function`. Pour une migration ou le seed :
   `node scripts/apply-migration.mjs <fichier.sql>`. Deux contrôles en ligne,
   depuis la racine du workspace, après `set -a && . ./.env && set +a` :
   `python boomball/supabase/checks/rls-check.py` et
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

La suite prévue, dans l'ordre : j'applique les deux écritures en base, je génère
les deux images, je rejoue, puis je lance /security-review moi-même, puis tu
crées le projet Vercel par l'API et tu déploies.
