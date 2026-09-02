# Prompt de reprise, chat suivant

> Colle le bloc ci-dessous tel quel dans le nouveau chat. Il ne remplace pas
> `docs/04-etat-des-lieux.md`, il y renvoie.

```
On reprend Boomball, le jeu vidéo. Il vit dans boomball/ dans ce workspace.
Lis boomball/docs/04-etat-des-lieux.md EN ENTIER avant de toucher à quoi que
ce soit. Il est à jour au 2026-09-02 et il contient tout le contexte. Les
sections à lire en priorité sont les cinq comptes rendus de test en local,
dans l'ordre, et surtout la dernière, « Le terrain devient vertical », qui
décrit le chantier en cours.

Sept choses à savoir tout de suite.

1. Tout est construit et 270 tests sont au vert. Moteur, IA, couche serveur,
   base Supabase en ligne, 4 migrations appliquées, les deux Edge Functions
   déployées, et le client React. Le projet est en phase de playtest, plus de
   construction.

2. Le gros changement du dernier chat : le terrain est devenu vertical. Une
   Furnace au centre du sol de la Zone 1 pour l'équipe A, une au centre du
   plafond de la Zone 3 pour B, 44 cases de séparation, et le layout est
   désormais un miroir exact autour de y=22, tenu par une assertion. Avant, les
   deux buts étaient dans la même zone et 99 % du ballon y restait à partir du
   round 6. C'est commité (96c02f7).

3. IL Y A UN ARBITRAGE QUI M'ATTEND ET C'EST LA PREMIÈRE CHOSE À ME DEMANDER.
   Le sweep du nouveau terrain donne 1,54 à 2,15 buts par match, ce qui est ma
   cible, et le ballon circule enfin dans les trois zones. Mais l'équipe A gagne
   129 à 66 en Veteran et 126 à 68 en Star. La décomposition montre que B marque
   PLUS de buts que A partout : tout l'écart vient du Spark, que A attrape trois
   fois plus souvent parce qu'elle joue en premier à chaque round. À 50 points
   pour 1,75 but par match, un Spark vaut cinq buts. Recompté à SPARK_POINTS=10
   sur les mêmes matchs, l'écart se referme presque : 79/92, 99/72, 98/91.
   `SPARK_POINTS` vaut toujours 50, je n'ai rien tranché. Les chiffres complets
   sont dans l'état des lieux.

4. Ce qui reste du chantier du terrain, après cet arbitrage :
   - Les prompts d'images des Zones 2 et 3 à réécrire, et les images à
     régénérer. La Zone 1 n'a rien à faire, son prompt dessine déjà la fosse au
     centre du sol. Les règles de prompt d'image du CLAUDE.md s'appliquent
   - `docs/00-reglement-v2.md`, sections B1, B2 et B10, à mettre à jour avec
     l'écart daté
   - Le seed est régénéré dans supabase/seed.sql mais PAS appliqué en ligne
   - Le durcissement du client contre ZONE_COUNT, décrit dans le plan
   - Le match de démonstration en base porte des positions de l'ancien terrain,
     à supprimer : b8fa8b66-7003-4587-95d5-4f1dba5eccea

5. Les commandes. Depuis boomball/ : `npm test`, `npm run typecheck`,
   `npm run sweep`. Depuis boomball/client/ : `npm run dev` sur
   http://localhost:5173, et `npm run build`. Pour redéployer les fonctions,
   depuis boomball/ : `set -a && . ../.env && set +a` puis
   `npm run deploy:function`. Pour une migration ou le seed :
   `node scripts/apply-migration.mjs <fichier.sql>`. Deux contrôles en ligne,
   depuis la racine du workspace, après `set -a && . ./.env && set +a` :
   `python boomball/supabase/checks/rls-check.py` et
   `python boomball/supabase/checks/browser-path.py`. Un match complet en
   ligne : `node scripts/run-ts.mjs scripts/live-match.ts` depuis boomball/.

6. Ce qu'il ne faut PAS faire. Ne connecte pas le dépôt GitHub à Vercel : il
   contient mon vault de campagne et mes fichiers personnels, le déploiement se
   fait par l'API en envoyant les fichiers construits. Ne commite jamais le .env
   ni aucune clé, elles sont préfixées SUPABASE_BOOMBALL_, plus
   SUPABASE_API_KEY_BOOMBALL et VERCEL_TOKEN. Le fichier
   design/Boomball Interface.html fait 7 Mo, ne le lis pas en entier.

7. Attention : il n'y a pas de navigateur pilotable dans l'environnement, donc
   tout ce qui touche à l'écran n'a jamais été regardé, seulement typechecké et
   construit. C'est ce que mes tests servent à trouver. Le token porte
   maintenant le nom et les points de vie, et la carte d'annonce dure plus
   longtemps : je ne les ai pas encore vus à l'écran.

La suite prévue, dans l'ordre : je tranche le Spark, on finit le chantier du
terrain, je rejoue, puis je lance /security-review moi-même, puis tu crées le
projet Vercel par l'API et tu déploies.
```

## Ce qui n'est pas dans le prompt et qui vit dans le dépôt

- Le plan validé du terrain vertical :
  `~/.claude/plans/je-me-rend-compte-nested-allen.md`
- L'arbitrage en attente sur les Crackers, du chat précédent : ils décrochaient
  du match au round 4 sur l'ancien terrain, et le levier mesuré était
  `CRACKER_MOVE_CELLS` de 6 à 10. **Ce diagnostic est à refaire** : il portait
  sur un terrain où le jeu campait en Zone 3, ce qui n'est plus le cas. Le
  ballon circule désormais à 26-30 % en Zone 1, donc la circulation autour du
  point de réapparition des Crackers a changé du tout au tout
