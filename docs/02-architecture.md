# Architecture technique

> Le contrat entre les trois morceaux du projet : le moteur, le serveur et le client. C'est le
> document que je relis quand j'hésite sur où mettre un bout de logique.
>
> Il ne réécrit aucune règle. Le règlement fait autorité et vit dans `00-reglement-v2.md`.

---

## Le principe qui commande tout le reste

**Le moteur est une bibliothèque TypeScript pure : ni écran, ni réseau, ni base, ni horloge.** Il
prend un état et une action, il rend un nouvel état et la liste des événements produits. Rien
d'autre.

Ce n'est pas un choix esthétique, il paie trois fois :

1. **Un match complet se joue en test automatisé**, sans navigateur ni serveur, en quelques
   millisecondes. C'est la seule façon de vérifier une règle de chute sans cliquer.
2. **L'IA s'équilibre par auto-affrontement.** Mille matchs IA contre IA par Tier, relançables à
   l'identique quand une règle change. Impossible si le moteur a besoin d'un écran.
3. **La même logique tourne des deux côtés du réseau.** Le client peut prédire le résultat d'une
   action pour l'afficher immédiatement, le serveur tranche. Zéro duplication de règle.

Corollaire à tenir : **aucune règle du jeu ne s'écrit ailleurs que dans `engine/`.** Une condition
de désactivation de bouton codée dans un composant React est un bug en attente.

---

## Les trois couches

```
engine/          TypeScript pur. Les règles. Aucune dépendance.
  ├── constants  tous les nombres réglables du sport
  ├── geometry   coordonnées, distances, trajectoires, rebonds
  ├── arena      terrain ASCII, ancrage dérivé
  ├── stats      table rôle x Tier
  ├── rng        dés à graine
  ├── types      MatchState, Unit, TurnSlot
  ├── initiative construction de l'échelle d'un round
  ├── setup      coup d'envoi
  ├── names      pool de noms Giff
  ├── rules/     un fichier par système
  ├── reduce     le point d'entrée unique
  └── legalActions

ai/              Consomme engine. Décide, ne résout jamais.

server/          La logique d'autorité, en TypeScript pur et testée.
  ├── session    propriété d'une unité, chrono, résolution du bloc IA
  └── seed       le seed SQL généré depuis le moteur

supabase/        Ce qui est propre à la plateforme.
  ├── migrations schéma, enums, RLS
  ├── seed.sql   généré, tenu contre le moteur par un test
  └── functions/ l'Edge Function, qui n'est qu'une coquille autour de server/

client/          React + Vite. Affiche, envoie des intentions.
```

**Le sens des dépendances ne s'inverse jamais.** `engine` ne connaît personne. `ai` connaît
`engine`. `server` connaît `engine` et `ai`. `client` connaît `engine` en lecture seule, pour
prédire et pour éclairer les cases jouables.

---

## Le moteur

### La fonction unique

```ts
reduce(state: MatchState, action: Action): { state: MatchState; events: MatchEvent[] }
```

Pure, synchrone, déterministe. Tout passage d'un état à un autre passe par là, y compris les tours
de l'IA, le déplacement des Crackers et l'entrée du Spark. Il n'existe pas de seconde porte.

### Le générateur d'actions légales

```ts
legalActions(state: MatchState, unitId: UnitId): Action[]
```

**Il sert deux consommateurs et c'est le point à ne pas rater.** L'interface s'en sert pour savoir
quels boutons sont actifs, l'IA s'en sert pour énumérer ses candidats. Si un jour le client
recalcule de son côté qu'un tir est possible, les deux divergeront et le bug sera invisible
pendant des semaines.

### Le hasard

La graine vit dans `MatchState.rngSeed`. Chaque appel à `reduce` ouvre un `Rng` sur cette graine,
tire ce dont il a besoin, et réécrit l'état du générateur dans le nouvel état. Deux conséquences
utiles : un match rejoué produit la même séquence octet pour octet, et toute égalité de ciblage se
tranche par une clé stable, jamais par l'ordre d'un tableau.

### Les événements

`reduce` rend une liste de `MatchEvent` : un dé jeté, un déplacement, une explosion, un but, une
évacuation. Ils sont la **source de vérité persistée**, pas un journal décoratif. Ils permettent la
reprise après déconnexion, le rejeu, et l'analyse des mille runs d'équilibrage. L'instantané
d'état n'est qu'un cache reconstructible.

---

## L'IA

**Elle décide, elle ne résout jamais.** Une IA choisit une `Action` et la passe à `reduce` comme
un humain. Elle ne peut donc pas tricher, même par accident, et le même match se rejoue qu'il ait
été joué par des humains ou par la machine.

```ts
chooseAction(state: MatchState, unitId: UnitId, orders: AllyOrder[]): Action
```

Une table de priorités par rôle dans `ai/roles/`, lisible et modifiable sans toucher au moteur. Les
ordres alliés biaisent la table, ils ne la remplacent pas.

**Le cas dimensionnant est le solo : 13 unités IA pour un humain.** Un tour IA doit coûter
quelques millisecondes, sinon le bloc allié devient une attente.

---

## Le serveur

### Pourquoi il existe

Pas pour l'anti triche : il n'y a pas de PvP, et trois amis coopératifs n'ont personne à voler. Il
existe pour deux raisons concrètes.

**La reprise.** Un joueur qui ferme son onglet en plein match doit retrouver l'état exact. Si
l'autorité vit dans le navigateur d'un des trois, sa déconnexion tue la partie des deux autres.

**La cohérence à trois clients.** Trois navigateurs qui appliquent chacun leur résolution
divergeront sur le premier jet de dé.

### La surface

**La logique vit dans `server/session.ts`, pas dans la fonction.** L'Edge Function charge, appelle,
écrit et diffuse ; elle ne décide rien. C'est ce qui permet de tester au complet la partie
intéressante, la résolution d'un bloc de treize tours IA derrière un seul clic, sans base ni réseau.

Deux Edge Functions, et la seconde a été ajoutée le 2026-09-02. Ce document n'en prévoyait qu'une,
`resolve-action`, et l'oubli est instructif : **aucune écriture de match n'est ouverte à un client,
et ouvrir un match est une écriture de match**. Une fonction qui joue un tour ne suffit donc pas, il
en faut une pour poser la première pierre.

```
POST /create-match
  { teamId, seats: [{ profileId, role, characterName? }], arenaId? }
  -> { accepted: true, matchId, fromSeq, events } | { accepted: false, reason }

POST /resolve-action
  { matchId, unitId, action }
  -> { accepted: true, fromSeq, events } | { accepted: false, reason }
```

`create-match` lit le Tier sur la colonne générée de l'équipe et tire la graine lui-même. **Ni l'un
ni l'autre n'est un champ de la requête**, et c'est la différence entre un lobby et une triche : un
Tier choisi aligne des Star au premier match, une graine choisie permet de rouvrir la partie jusqu'à
ce que le coup d'envoi plaise. Sa logique vit dans `server/lobby.ts`, comme celle de l'autre vit
dans `server/session.ts`.

Ce qu'elle fait, dans l'ordre : elle charge l'instantané, vérifie que l'appelant contrôle bien
l'unité et que c'est son tour, vérifie que l'action figure dans `legalActions`, appelle `reduce`,
écrit les événements et l'instantané dans une transaction, diffuse sur le canal Realtime du match,
puis fait jouer d'affilée tous les tours IA jusqu'au prochain slot humain.

**Ce dernier point est le vrai travail.** Un appel humain déclenche souvent dix tours IA. Ils sont
résolus côté serveur en une passe et diffusés ensemble, pas un aller-retour par unité.

### Le chrono

Le chrono de 60 secondes n'est pas gardé par le client. La date limite du tour courant vit dans
l'instantané, et un tour expiré se résout en Dodge à la première requête qui le constate. Un
navigateur en veille ne peut donc pas geler la partie.

---

## La base

| Table | Contenu | Notes |
|---|---|---|
| `profiles` | id, nom affiché | Adossé à Supabase Auth |
| `teams` | id, propriétaire, nom, tier, victoires | Le Tier se déduit des victoires, il n'est pas saisi |
| `team_members` | équipe, profil, rôle préféré, **nom du personnage** | Le nom saisi au lobby est conservé ici |
| `arenas` | id, nom, largeur, hauteur, `layout` (les 45 lignes ASCII), art | Le chargeur d'arènes est prévu, une seule ligne au MVP |
| `matches` | id, équipe, arène, tier, statut, round, scores, `rng_seed`, échéance du tour | |
| `match_participants` | match, profil, unité, rôle, nom | Qui contrôle quoi |
| `match_events` | match, `seq`, acteur, type, payload, dés | Source de vérité. `(match_id, seq)` unique |
| `match_state` | match, instantané jsonb, `seq` de l'instantané | Cache, reconstructible depuis les événements |
| `role_stats` | rôle, tier, hp, ac, might, agility | Miroir de `engine/stats.ts`, pour que l'interface lise sans importer le moteur |

**Row Level Security dès le premier jour.** Un joueur lit et écrit ses équipes, et lit les matchs
auxquels il participe. Le rattraper après coup coûte toujours plus cher.

**Aucune policy d'écriture sur les tables de match.** `matches`, `match_participants`,
`match_events` et `match_state` sont en lecture seule pour tout client. Toute écriture passe par
`create-match` ou `resolve-action`, qui détiennent la clé service. C'est le pendant en base du
principe de la porte unique : un client capable d'insérer dans `match_events` serait un client
capable de s'écrire un but. C'est aussi ce qui a imposé la seconde fonction, puisque **ouvrir un
match est une écriture de match** comme une autre.

**`role_stats` et `arenas.layout` sont des miroirs du moteur, et un miroir dérive.** Ils sont donc
générés par `server/seed.ts` et tenus contre le moteur par `server/seed.test.ts`, jamais écrits à la
main.

**`match_events.seq` est un entier strictement croissant par match.** C'est lui qui permet à un
client de dire « j'en suis à 47, donne moi la suite » après une coupure, plutôt que de recharger
l'état complet.

---

## Le client

React, TypeScript, Vite. **Ordinateur uniquement, 1280 px de large au minimum, aucune adaptation
mobile.**

Grille SVG posée sur l'image de fond de la zone active. L'image est de l'art fini, l'interface est
une couche par dessus, et le terrain jouable est `arena.layout`, jamais l'image.

Trois choses que le client ne fait jamais : résoudre une règle, tirer un dé, décider qu'une action
est légale. Il affiche l'état, il envoie des intentions, il rejoue les événements reçus.

Abonnement Supabase Realtime par match. Sur reconnexion, il redemande les événements depuis son
dernier `seq` connu.

---

## Ce qu'on ne construit pas

Pas de serveur de jeu dédié ni de WebSocket maison : Realtime suffit pour trois clients en tour par
tour. Pas de moteur de rendu 3D. Pas de file d'attente de matchmaking, l'équipe est fixe et
l'adversaire est la maison. Pas d'API publique.
