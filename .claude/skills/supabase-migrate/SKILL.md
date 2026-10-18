---
name: supabase-migrate
description: "Appliquer une migration SQL ou le seed sur la base Supabase de Boomball, en ligne. Classe le fichier avant de l'exécuter et dit qui lance la commande, Jérôme ou moi."
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash
---

# Écrire dans la base Boomball

**Ce skill ne se déclenche jamais tout seul.** Il faut le taper. C'est délibéré : il est la seule
porte vers une écriture sur une base en ligne qui porte les parties réelles de Jérôme, et une porte
qui s'ouvre d'elle-même n'est pas une porte.

---

## La frontière, et elle n'est pas négociable

**Les écritures destructives en base passent par Jérôme, pas par moi.** Le contrôle automatique du
harnais les refuse, et **une autorisation donnée en conversation ne le lève pas**. Il n'y a
aujourd'hui aucune règle de permission dans un `settings.json` de ce workspace, donc le seul chemin
est qu'il lance la commande lui-même.

**La lecture passe.** Je peux vérifier l'état du projet avant et après, et c'est comme ça que le
seed et la suppression du 2026-09-02 ont été confirmés.

---

## Ce que `apply-migration.mjs` est, et ce qu'il n'est pas

**Ce n'est pas un migration runner.** Il n'y a **aucun registre de ce qui a été appliqué** et aucun
ordre : il exécute le fichier qu'on lui donne, une fois, et dit ce qui revient. Ni la CLI `supabase`
ni `psql` ne sont installées sur cette machine, donc il poste le SQL à l'API de gestion.

Conséquence directe : **c'est à toi de savoir ce qui a déjà tourné.** Les fichiers sont écrits pour
être rejouables sans dégât là où c'est bon marché (`create or replace`) et pour échouer bruyamment
là où ça ne l'est pas (`add column`).

Il charge le `.env` du workspace tout seul, par un chemin résolu depuis le script, donc il marche
dans PowerShell comme dans bash. Ce qui est déjà exporté dans l'environnement gagne.

---

## Étape 1 : lire le fichier, en entier

Avant tout, `Read` le `.sql` visé. Un fichier qu'on n'a pas lu ne s'applique pas, même généré.

`supabase/seed.sql` est **généré** par `server/seed.ts` depuis les tables du moteur et tenu contre
lui par `server/seed.test.ts`. Pour changer ce qu'il contient, on change `engine/stats.ts` ou
`engine/arenas/kill-silo.ts` et on régénère. **Ne l'édite jamais à la main.**

---

## Étape 2 : classer, et c'est ce qui décide qui lance

```
grep -niE '\b(drop|truncate|delete|alter +table .* drop|update)\b' <fichier.sql>
```

| Ce que le fichier contient | Classement | Qui lance |
|---|---|---|
| `insert` idempotent, `create or replace`, `create table if not exists`, `create policy` | Additif | Jérôme, parce que ça écrit en ligne |
| `alter table ... add column` | Additif, mais non rejouable | Jérôme |
| `drop`, `truncate`, `delete`, `update` de lignes existantes | **Destructif** | **Jérôme, sans exception ni dérogation** |
| Une suppression de compte via `DELETE /auth/v1/admin/users/<id>` | **Destructif, et ça cascade** | **Jérôme** |

**Dans tous les cas la commande est lancée par Jérôme.** La classification ne sert pas à savoir si je
peux le faire, elle sert à savoir **ce que je dois lui dire avant qu'il le fasse** : un additif se
résume en une ligne, un destructif se présente avec ce qui va disparaître et ce qui cascade.

---

## Étape 3 : l'état avant, que je peux lire

Avant qu'il lance quoi que ce soit, établis et montre l'état actuel des tables concernées, en
lecture seule. C'est ce qui rend l'étape 5 vérifiable au lieu d'être une déclaration de bonne foi.

---

## Étape 4 : la commande, à lui donner telle quelle

Depuis la racine du workspace :

```
node scripts/apply-migration.mjs supabase/migrations/<fichier>.sql
```

Donne-la en un seul bloc collable, avec le chemin exact du fichier. Pas de variable à substituer, pas
de `<placeholder>` restant.

---

## Étape 5 : vérifier après, ligne par ligne

En lecture, et sans lui demander de te croire. Sur le layout de l'arène du 2026-09-02, la
vérification a porté sur le miroir autour de `y = 22`, confirmé ligne par ligne, et sur les douze
lignes de `role_stats`.

Puis :

```
npm test          # depuis la racine
npm run typecheck
```

Si le schéma a bougé, `server/seed.test.ts` est le test qui attrape la dérive entre le moteur et le
seed.

---

## Après coup

**Une migration appliquée se consigne dans `docs/04-etat-des-lieux.md`**, qui fait autorité
sur l'état du projet, avec sa date et ce qu'elle a changé. Sans ça, le prochain chat n'a aucun moyen
de savoir ce qui a déjà tourné, puisqu'il n'y a pas de registre.

Puis `python .claude/scripts/check_drift.py`, qui compare les chiffres de `CONTEXT.md` à
l'état des lieux et aux constantes du moteur.

---

## Rappels de sécurité

- **Ne jamais commiter le `.env` ni aucune clé.** Elles sont préfixées `SUPABASE_BOOMBALL_`, plus
  `SUPABASE_API_KEY_BOOMBALL` et `VERCEL_TOKEN`
- **Ne jamais connecter le dépôt GitHub à Vercel.** Le client se déploie par l'API,
  `scripts/deploy-vercel.mjs`
- **Deux projets dans l'org Supabase**, `boomball` et `projet test`, ce qui est le plafond du plan
  gratuit
