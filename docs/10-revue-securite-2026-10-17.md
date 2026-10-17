# Revue de sécurité de Boomball, 2026-10-17

Rapport écrit par un agent Opus 5.5 effort élevé, sur brief fermé du fil principal, le 2026-10-17.

Revue en lecture seule. Aucun fichier du dépôt n'a été modifié en dehors de celui-ci. Les seules
commandes qui ont touché le réseau sont `rls-check.py` (qui crée deux comptes jetables et les
supprime) et des `git log` / `git ls-files` en lecture. Deux scripts de preuve ont tourné contre le
moteur **en local**, dans le scratchpad de la session, sans base ni réseau.

---

## 1. Verdict

**Oui, tu peux laisser un ami jouer sans toi dans la pièce.** Rien de ce que j'ai lu ne permet à un
inconnu, ni à un ami, de lire les données d'une autre équipe, d'écrire un score par la base, de se
donner une victoire par la porte du serveur ou de trouver un secret dans le bundle ou dans git ; la
RLS passe 24/24 en direct aujourd'hui. Il n'y a **aucun constat bloquant**. Il y a trois constats
majeurs, qui visent tous un ami malveillant ou un ancien membre, pas un inconnu : à corriger avant
d'élargir le cercle, pas avant la prochaine soirée.

---

## 2. Les constats, par gravité

Lecture des colonnes « coût » : L = lignes de code à peu près, Mig = migration SQL, Fn =
redéploiement d'une Edge Function, Cl = redéploiement du client.

### Bloquant

Aucun.

### Majeur

| # | Sujet | Fichier:ligne | Ce que j'ai vu | Ce que ça permet concrètement | Correction et coût |
|---|---|---|---|---|---|
| M1 | `team_members_write` laisse n'importe qui s'inscrire dans n'importe quelle équipe | `supabase/migrations/0001_init.sql:212-219` ; reprise telle quelle par `0011_invites.sql:25-26` | La politique `for all` accepte toute ligne dont `profile_id = auth.uid()`, **sans regarder `team_id`**. Rien n'oblige à passer par `join_team` ni par le code. Elle permet aussi à un membre de faire un `update` de sa propre ligne en changeant `team_id`, et au propriétaire d'insérer **n'importe quel** `profile_id` dans son équipe | Un ami que tu as retiré de l'équipe connaît déjà son UUID (la RLS le lui a montré tant qu'il était membre). Une seule requête `POST /rest/v1/team_members` avec `{team_id, profile_id: lui, preferred_role}`, sa clé anon et son jeton, le remet dans l'équipe : **ni « Remove », ni « New code » ne l'arrêtent**. Revenu, il relit l'équipe (code d'invitation compris), les matchs, les événements et les noms d'affichage (`battery_members`). Un inconnu, lui, ne connaît aucun UUID d'équipe (jamais dans l'URL ni dans la console, vérifié) : le risque est l'ancien membre. Le propriétaire peut aussi inscrire de force un joueur dont il connaît le `profile_id` (gêne mineure, couverte par la même correction) | Remplacer la politique par trois. **Insert** réservé au propriétaire pour sa propre ligne (`profile_id = auth.uid() and exists (select 1 from teams t where t.id = team_id and t.owner = auth.uid())`) : les amis n'entrent plus que par `join_team`. **Update** sur sa propre ligne, avec des privilèges de colonne pour figer `team_id` : `revoke update on team_members from authenticated; grant update (preferred_role, character_name) on team_members to authenticated;`. **Delete** inchangé (sa ligne, ou toute ligne de son équipe pour le propriétaire). L'`upsert` de `saveSeatPreference` (`client/src/lib/supabase.ts`) reste valable : sur une ligne existante il prend le chemin update. Ajouter à `rls-check.py` : « bob ne s'inscrit pas seul dans l'équipe d'alice », « bob ne déplace pas sa ligne ». **Mig oui, ~25 L SQL et ~20 L de contrôle ; Fn non ; Cl non** |
| M2 | Le moteur accepte des coordonnées non entières dans un chemin | `engine/rules/movement.ts:63-85`, `engine/geometry.ts:20-22`, `engine/arena.ts:71-74`, appelés par `engine/reduce.ts:239-243` et `:270-272` ; porte d'entrée `supabase/functions/resolve-action/index.ts:99-104` puis `:186-192` | `validatePath` vérifie les bornes, l'adjacence (`distance === 1`), les obstacles et l'occupation, **jamais que `x` et `y` sont des entiers**. `cellAt` lit `this.cells[y][x]` : avec `x = 2.5` il obtient `undefined`, qui n'est pas `'obstacle'`. `resolve-action` passe l'action du corps telle quelle (`action as Action`). **Prouvé** par un script local contre le vrai moteur : depuis (2, 14), le chemin `[(2.5, 13), (2.5, 12)]` est **accepté** alors que (2, 13) et (2, 12) sont deux cases d'obstacle ; un `x` envoyé en chaîne (`"3"`) est accepté et **stocké comme chaîne** dans l'état | Un joueur d'un match (donc un ami de l'équipe) qui forge sa requête traverse obstacles et unités (les clés d'occupation comme `"2.5,13"` ne correspondent jamais à rien), et c'est écrit dans `match_events`, la source de vérité, pour toujours. Une coordonnée en chaîne peut ensuite casser l'arithmétique du moteur et figer le match pour les coéquipiers (500 à chaque action). C'est la seule brèche que j'ai trouvée dans « le moteur est la seule porte » | Dans `validatePath`, en tête de boucle : refuser un pas dont `x` ou `y` n'est pas `Number.isInteger`, et refuser un `path` qui n'est pas un tableau avant de lire `path.length`. Dans `resolve-action`, refuser une `action` qui n'est pas un objet avec un `kind` chaîne (aujourd'hui un `kind` inconnu fait renvoyer `undefined` à `reduce`, puis un 500 sans écriture). Un test vitest. `ENGINE_VERSION` ne bouge pas, la forme de l'état ne change pas. **Mig non ; ~10 L et un test ; Fn oui (resolve-action) ; Cl non** |
| M3 | Les trois canaux Realtime sont publics (connu), et ce qu'ils permettent vraiment | `client/src/match/useMatch.ts:457-477` et `:487-489`, `client/src/screens/Match.tsx:344-346` ; `client/src/lib/useLobbyChannel.ts:122-131`, `client/src/screens/lobbySeats.ts:45-55`, `client/src/screens/Lobby.tsx:188` et `:194` ; `client/src/lib/teamChannel.ts:31-48` | Le client **fait confiance au contenu** des diffusions, pas seulement à leur signal. (a) `abandoned` sur `match:<id>` met `abandonedByOwner` à vrai, et `Match.tsx:345` fait sortir le joueur du match. (b) Un lot `events` dont `fromSeq` vaut `seq + 1` entre dans le fil et est **rejoué beat par beat** (`playForeign`), puis le plateau est relu ; son `fromSeq` est marqué vu, donc le vrai lot de ce numéro n'entrera pas dans le fil. (c) Dans le lobby, la présence de n'importe qui devient un siège : un faux siège `ready: false` bloque `canStart`, un faux siège au `profileId` d'un membre absent l'assoit dans le match (`create-match` revérifie l'appartenance, pas la présence). (d) La diffusion `started` donne le `matchId` à quiconque écoute `lobby:<teamId>` | Qui connaît un UUID d'équipe peut éjecter tout le monde d'un match en cours (en boucle), faire « voir » de faux buts animés à toute l'équipe, empêcher le propriétaire de lancer. Il faut connaître l'UUID : membres et anciens membres seulement. **Tant que M1 n'est pas corrigé, cette correction ne protège de personne** : l'ancien membre se réinscrit et redevient légitime | Canaux privés et politiques sur `realtime.messages`, détaillés en §3. **Mig oui, ~70 L SQL ; Cl oui, ~15 L modifiées et ~45 L supprimées ; Fn oui, les deux ; un réglage du dashboard** |

### Mineur

| # | Sujet | Fichier:ligne | Ce que j'ai vu | Ce que ça permet | Correction et coût |
|---|---|---|---|---|---|
| m1 | Le propriétaire écrit ses victoires, donc son Tier | `0001_init.sql:202-205` (`teams_insert_own`, `teams_update_owner`), sans restriction de colonne ; `supabase/checks/rls-check.py:183-186` le teste **comme une fonctionnalité** | `update teams set wins = 6` passe pour le propriétaire (le contrôle de ce matin l'a fait : « six wins derive the star tier », ok). Un `insert` peut aussi fournir `wins`, `roster` et `invite_code` | Un ami passe Star tout de suite, et `create-match` lui ouvre Star (`create-match/index.ts:108-111` lit le Tier dérivé). Ça contredit l'intention écrite dans `0003_record_win.sql:13-17`. Il ne triche que contre lui-même et la maison, il n'y a pas de classement entre équipes. Il peut aussi renommer son roster (interdit par ta décision) et se choisir un code facile (`AAAAAAAA`) | `revoke insert, update on teams from authenticated; grant insert (owner, name) on teams to authenticated; grant update (name) on teams to authenticated;` (en Postgres, retirer une colonne ne sert à rien tant que le privilège de table existe, d'où le retrait de table puis l'octroi par colonne). Mettre `rls-check.py:183-187` à jour : écrire `wins` en service, et attendre 0 quand alice essaie. **Mig oui, 3 L ; contrôle ~5 L ; Fn non ; Cl non** (le client n'insère que `owner` et `name`, `TeamHub.tsx:650-651`) |
| m2 | Le code d'invitation arrive chez tous les membres | `0011_invites.sql:14-16` (« a screen rule and not a policy »), `client/src/lib/useAccount.ts:235-238` | `select ... invite_code` sur toutes les équipes du joueur, possédées ou rejointes : le code est dans le navigateur de chaque membre, l'écran le cache seulement | Tout membre peut faire entrer qui il veut (pas d'approbation). Entre amis, c'est presque une fonctionnalité | Accepter, à mon avis. Sinon : privilèges de colonne sur le `select` de `teams` sans `invite_code`, et une fonction `team_invite_code(team)` réservée au propriétaire. **Mig oui ~15 L ; Cl oui ~10 L** |
| m3 | Un membre peut toujours mentir dans la présence, même en privé | `client/src/lib/useLobbyChannel.ts:122-124`, `client/src/screens/lobbySeats.ts:45-55` | La clé de présence est choisie par le client, et rien ne la lie à `auth.uid()`, ni dans Realtime ni dans le client | Après §3, un **membre** peut encore bloquer le départ ou asseoir un coéquipier absent. Gêne, pas fuite : `create-match` refuse tout non-membre | Accepter. Parade côté client si tu veux : ignorer un siège dont la clé de présence diffère de `profileId`, et n'envoyer à `create-match` que des joueurs présents dans `members`. ~5 L, Cl oui |
| m4 | La réouverture du canal du lobby boucle sans fin | `client/src/lib/useLobbyChannel.ts:141-148` | Tout `CLOSED`, `CHANNEL_ERROR` ou `TIMED_OUT` rouvre le canal une seconde plus tard, sans plafond | Sans effet aujourd'hui. **Avec des canaux privés**, un joueur retiré de l'équipe (refus d'autorisation) rouvrirait le canal toutes les secondes toute la soirée | À faire **avec** §3 : plafonner (cinq essais, ou recul exponentiel) et ne pas rouvrir sur un refus d'autorisation. ~10 L, Cl oui |
| m5 | Les réponses d'erreur recopient le message de Postgres | `supabase/functions/create-match/index.ts:238`, `supabase/functions/resolve-action/index.ts:330`, `client/src/lib/useAccount.ts:120-122` | `could not open the match: ${failed.error!.message}` et `the step could not be written: ${error.message}` | Des noms de tables et de contraintes, rien de plus. Cosmétique, et utile au diagnostic | Laisser. Ou journaliser le message dans la fonction et renvoyer un texte fixe. ~4 L, Fn oui |
| m6 | « Un joueur possède au plus une équipe » n'est pas tenu par la base | `0001_init.sql:53` (index non unique), commentaire `useAccount.ts:17-19` | Seul l'écran l'empêche | Un ami crée dix équipes par l'API. Sans conséquence | `create unique index teams_one_per_owner on teams (owner);` si tu y tiens. Mig 1 L |

### Note

| # | Sujet | Ce que j'ai vu, et mon avis |
|---|---|---|
| n1 | Secrets | **Propre.** `git ls-files` ne suit aucun `.env` (seulement `.env.example` et `boomball/client/.env.example`, sans valeurs), aucun `.auth/`, aucune clé. `git log --all -G` ne trouve **aucun JWT ni aucune clé `sbp_` ou `sb_secret_` dans tout l'historique**. Le bundle `client/dist/` contient **un seul JWT distinct, égal à `VITE_SUPABASE_ANON_KEY`** (comparé sans l'afficher) ; aucune valeur secrète du `.env` n'y figure, sauf le ref du projet, public puisqu'il est dans l'URL ; la chaîne `sb_secret_` qu'on y trouve est le code de supabase-js qui reconnaît les formats de clé. Les bundles des deux fonctions ne contiennent aucune valeur, seulement `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`. `client/.env.local` ne porte que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, et il est ignoré (`.gitignore:3`). Aucune variable `VITE_` dans le `.env` du workspace, donc rien ne peut fuir par le serveur de dev que Playwright lance avec tout `process.env`. Les scripts de déploiement et de migration n'impriment jamais leurs jetons ; `deploy-vercel.mjs:165-168` refuse un projet lié à Git |
| n2 | e2e | `e2e/global-setup.ts` ne journalise jamais l'e-mail ni le mot de passe ; en cas d'échec il recopie 200 caractères du corps de la réponse, qui pour `/auth/v1/token` est un message d'erreur, pas un secret. `trace: 'retain-on-failure'` (`playwright.config.ts:60`) garde des jetons de session dans `e2e/test-results/`, ignoré par git. Rien à faire |
| n3 | XSS et stockage local | Aucun `dangerouslySetInnerHTML` dans `client/src`, ni `innerHTML`, `eval` ou `new Function`. Tout ce qui vient des autres joueurs (noms d'affichage, noms de Giff, présence) passe par React, donc échappé. `localStorage` ne garde que des préférences (équipe choisie, vue, zoom, son, vitesse, briefing vu) ; la session Supabase y vit aussi, c'est le fonctionnement normal de supabase-js |
| n4 | CORS `*` | Justifié dans `supabase/functions/_shared/cors.ts:18-26`, et je suis d'accord : aucune requête n'utilise de cookie ni `credentials`, l'identité est le JWT lu par `auth.getUser()` (`create-match/index.ts:75-82`, `resolve-action/index.ts:83-90`), jamais le corps |
| n5 | Les portes du serveur | Vérifié et bon. Identité lue dans le JWT. `create-match` exige que l'appelant soit **propriétaire** (`index.ts:126`) et que chaque siège soit membre (`:127-131`) ; Tier validé par `isTier` et plafonné au Tier atteint (`:109-111`) ; graine tirée côté serveur (`:154`) ; un seul match vivant par équipe (`:139-149`). `resolve-action` vérifie le siège dans `match_participants` (`:132-138`), puis `submitAction` vérifie que **l'unité appartient à l'appelant** (`server/session.ts:120-123` et `:139-142`) ; les ordres sont validés contre le plateau (`resolve-action/index.ts:245-267`) ; le rejeu est impossible, `append_match_step` verrouille `match_state` et refuse un `seq` dépassé (`0010:47-54`) ; `fromSeq` n'est jamais lu dans la requête, il est calculé (`:196`). `record_team_win` et `append_match_step` sont retirées aux clients (`0003:28-31`, `0010:90-93`). `abandon_match` lit le propriétaire dans `auth.uid()` (`0008:34-45`) |
| n6 | Fonctions `security definer` | Toutes ont `set search_path = public`. Le linter Supabase préfère `''` avec des noms qualifiés ; ici aucun client ne peut créer d'objet (PostgREST seulement), donc c'est cosmétique |
| n7 | La graine est dans l'état | `MatchState.rngSeed` (`engine/types.ts:243`) est dans `match_state.snapshot`, lisible par les membres, comme `matches.rng_seed`. Un joueur qui réécrirait le moteur pourrait prédire les dés. Dépôt privé, effort énorme : accepter |
| n8 | Auth | Inscriptions ouvertes, pas de confirmation, 6 caractères, pas de captcha : **pour un cercle d'amis, je ne mettrais ni captcha ni 2FA**. Deux remarques honnêtes. Sans confirmation, quelqu'un peut créer un compte avec l'e-mail d'un ami avant lui (squat) : tu le verras et tu le régleras à la main. Passer le minimum à 8 caractères ne coûte rien (dashboard). Et coupe les inscriptions une fois tes amis inscrits (C3) : c'est la seule mesure qui ferme vraiment la porte aux inconnus |
| n9 | `join_team` | Code de 8 hexadécimaux, 32 bits, pas de limite de débit sur les RPC. Avec dix équipes, il faut de l'ordre de 400 millions d'essais pour en toucher une : non exploitable |
| n10 | Nom d'affichage | Laissé vide à l'inscription, il prend la partie locale de l'e-mail (`client/src/screens/SignIn.tsx:68`), que les coéquipiers voient. Cosmétique |
| n11 | Pas de limite de débit sur les fonctions | Un membre peut appeler `resolve-action` en boucle ; chaque appel est validé et refusé, il ne coûte que des invocations (quota de 500 000 par mois). Accepter |
| n12 | Secret JWT dans un transcript (A27, C19) | Le secret JWT permet de signer un jeton `service_role`, donc un accès total. Mais il est sur la même machine que le `.env`, qui contient déjà la clé service : le risque supplémentaire est faible **tant que tes transcripts ne quittent pas ta machine**. Si tu partages un jour un dossier `~/.claude/projects`, fais-le tourner avant (il régénère anon et service : `.env`, `client/.env.local`, rebuild et redéploiement du client) |
| n13 | Sauvegarde | `scripts/export-db.mjs` vient d'apparaître (non suivi par git à ma lecture) et une première sauvegarde existe dans `boomball/backups/2026-10-17-1719/`, ignorée par git (`.gitignore:92`). Elle contient les codes d'invitation : garde-la hors de tout dossier synchronisé et partagé |
| n14 | Ordre des opérations dans `create-match` | Le roster est tiré et écrit (`create-match/index.ts:161-166`) **avant** que `openLobbyMatch` valide les sièges : une requête refusée pour un nom trop long fige quand même le roster. Pas un sujet de sécurité, une bizarrerie à connaître |

---

## 3. La correction des canaux Realtime

### Est-ce la bonne correction ?

Oui. C'est la correction native de Supabase et la seule qui lie un canal à l'identité. Trois
réserves, honnêtes :

1. **Elle ne sert à rien sans M1.** Un ancien membre qui se réinscrit par `team_members` redevient
   membre, donc légitime pour les politiques. Corrige M1 d'abord.
2. **Elle ne protège pas d'un membre** (m3). On autorise par sujet, par extension (`broadcast` ou
   `presence`) et par utilisateur, pas par nom d'événement ni par contenu. D'où le choix ci-dessous :
   **plus aucun client n'écrit sur `match:*` ni sur `team:*`**, seules la base et les fonctions y
   parlent. Seul le lobby reste ouvert en écriture aux membres, parce que la présence l'exige.
3. Les UUID ne sont exposés nulle part publiquement : le gain réel est contre les anciens membres
   et contre un identifiant collé par erreur sur Discord. Ce n'est pas urgent, c'est propre.

### La migration (proposée comme `0013_private_channels.sql`)

```sql
-- Canaux Realtime privés (revue de sécurité du 2026-10-17, M3).
-- Trois familles de sujets : lobby:<team uuid>, team:<team uuid>, match:<match uuid>.
-- Lecture (recevoir broadcast et présence) : les membres de l'équipe concernée.
-- Écriture par un client : le lobby seulement (présence, et la diffusion `started`).
-- team:* et match:* ne sont écrits que par la base (realtime.send) et par les fonctions
-- (service role, qui contourne la RLS).

create or replace function public.channel_uuid(topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(topic, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(topic, ':', 2)::uuid
  end;
$$;

create or replace function public.can_hear_channel(topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case split_part(topic, ':', 1)
      when 'lobby' then is_team_member(channel_uuid(topic))
      when 'team'  then is_team_member(channel_uuid(topic))
      when 'match' then exists (
        select 1 from matches m
        where m.id = channel_uuid(topic) and is_team_member(m.team_id)
      )
      else false
    end,
    false
  );
$$;

revoke all on function public.can_hear_channel(text) from public, anon;
grant execute on function public.can_hear_channel(text) to authenticated, service_role;

create policy boomball_channels_read on realtime.messages
  for select to authenticated
  using (public.can_hear_channel(realtime.topic()));

create policy boomball_lobby_write on realtime.messages
  for insert to authenticated
  with check (
    split_part(realtime.topic(), ':', 1) = 'lobby'
    and realtime.messages.extension in ('presence', 'broadcast')
    and public.can_hear_channel(realtime.topic())
  );

-- Le rôle d'une équipe a changé : la base le dit elle-même, après l'écriture.
-- Remplace announceTeamChange, qui ne peut plus marcher en privé pour un membre qui
-- vient de partir : il n'est plus membre au moment d'envoyer.
create or replace function public.announce_team_roll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t uuid;
begin
  if tg_table_name = 'teams' then
    t := new.id;
  elsif tg_op = 'DELETE' then
    t := old.team_id;
  else
    t := new.team_id;
  end if;
  perform realtime.send(jsonb_build_object('teamId', t), 'roll', 'team:' || t::text, true);
  return null;
end;
$$;

create trigger team_members_roll
  after insert or update or delete on team_members
  for each row execute function public.announce_team_roll();

create trigger teams_code_roll
  after update of invite_code on teams
  for each row execute function public.announce_team_roll();

-- L'abandon se dit depuis la base, plus depuis le client du propriétaire.
-- Corps identique à 0008 (avec le mot team de 0012), plus une ligne avant le return.
create or replace function abandon_match(match uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  current_phase boomball_match_phase;
  already timestamptz;
  stamp timestamptz;
begin
  select t.owner, m.phase, m.abandoned_at
    into owner_id, current_phase, already
    from matches m
    join teams t on t.id = m.team_id
    where m.id = match;

  if owner_id is null then
    raise exception 'no such match' using errcode = 'P0002';
  end if;
  if owner_id <> auth.uid() then
    raise exception 'only the owner of the team can abandon its match' using errcode = '42501';
  end if;
  if current_phase = 'finished' then
    raise exception 'this match is already finished' using errcode = 'P0001';
  end if;
  if already is not null then
    raise exception 'this match was already abandoned' using errcode = 'P0001';
  end if;

  update matches set abandoned_at = now() where id = match returning abandoned_at into stamp;
  perform realtime.send(jsonb_build_object('matchId', match), 'abandoned', 'match:' || match::text, true);
  return stamp;
end;
$$;

revoke all on function abandon_match(uuid) from public;
revoke all on function abandon_match(uuid) from anon;
grant execute on function abandon_match(uuid) to authenticated;
grant execute on function abandon_match(uuid) to service_role;
```

À vérifier avant de l'appliquer : que `realtime.send(payload jsonb, event text, topic text, private
boolean)` existe dans le projet, par exemple avec `select 1 from pg_proc p join pg_namespace n on
n.oid = p.pronamespace where n.nspname = 'realtime' and p.proname = 'send';`. Je n'ai pas pu lancer
de SQL sur le projet. Si une diffusion qui échoue ne doit jamais faire échouer l'écriture qui la
précède, vérifie aussi que `realtime.send` rattrape ses propres erreurs dans la version du projet,
sinon entoure l'appel d'un bloc `begin ... exception when others then null; end;`.

### Côté client

1. `client/src/lib/useLobbyChannel.ts:122-124` : `config: { private: true, presence: { key: userId, enabled: true } }`.
2. `client/src/lib/useAccount.ts:294` : `supabase.channel(teamTopic(teamId), { config: { private: true } })`.
3. `client/src/match/useMatch.ts:457-458` : `` supabase.channel(`match:${matchId}`, { config: { private: true } }) ``.
4. Supprimer `announceAbandoned` (`useMatch.ts:487-489`, et son appel `screens/Match.tsx:955`) :
   c'est `abandon_match` qui diffuse maintenant.
5. Supprimer `announceTeamChange` (`client/src/lib/teamChannel.ts:37-48`) et ses trois appels
   (`screens/TeamHub.tsx:387`, `:404`, `:557`) : ce sont les déclencheurs qui diffusent.
6. `useLobbyChannel.ts:141-148` : plafonner la réouverture (m4), sinon un joueur retiré de l'équipe
   frappe à la porte toutes les secondes.
7. Rien à faire pour le jeton : supabase-js 2.113.0 (installé dans `client/node_modules`) passe le
   jeton de session à Realtime à chaque changement d'auth, et les trois canaux ne s'ouvrent qu'une
   fois `userId` connu, donc jamais avec le seul jeton anon.

### Côté fonctions

- `supabase/functions/create-match/index.ts:243` et `supabase/functions/resolve-action/index.ts:220` :
  `` db.channel(`match:${matchId}`, { config: { private: true } }).send(...) ``. **Sans ce changement,
  les fonctions diffusent sur le sujet public, que plus aucun client n'écoute, et la coop perd ses
  animations** (le plateau se relit quand même à l'action suivante).
- La clé service contourne la RLS de `realtime.messages` : aucune politique à écrire pour elles.
- Les fonctions importent `@supabase/supabase-js@2.45.4` depuis esm.sh (`create-match/index.ts:31`,
  `resolve-action/index.ts:37`). Hors d'un canal rejoint, `send()` passe par l'API REST de diffusion,
  dont le message doit porter `private: true`. La 2.113.0 du client le fait (`RealtimeChannel.js`) ;
  je n'ai pas pu vérifier la 2.45.4 hors ligne. **Monte l'import à la version du client** pour lever
  le doute.
- Les deux fonctions sont à redéployer (`npm run deploy:function`).
- Option : la diffusion `started` du lobby pourrait aussi partir de `create-match` (sujet
  `lobby:<teamId>`, privé) plutôt que du client du propriétaire. Pas nécessaire, les membres ont le
  droit d'écrire dans le lobby.

### Ordre de bascule

1. Migration `0013`, sans effet sur les canaux publics, qui ne consultent pas les politiques.
2. Fonctions et client redéployés **ensemble**, hors soirée de jeu : un client ancien sur sujet
   public et une fonction nouvelle sur sujet privé ne s'entendent plus.
3. `npm run e2e:coop`, et une partie à deux.
4. Dashboard, Realtime, Settings : couper l'accès public (« Allow public access », ou
   « private-only » selon le libellé du moment). C'est de la défense en profondeur : sans ça, plus
   personne n'écoute les sujets publics, mais ils restent ouverts.

---

## 4. Les lignes C1 à C20 de l'audit du 9 octobre (`docs/07-audit-et-plan-3d.md:128-147`)

| Ligne | Sujet | État au 2026-10-17 | Sur quoi je m'appuie |
|---|---|---|---|
| C1 | Pause du plan gratuit | **Réglé côté code** | `.github/workflows/supabase-keepalive.yml`, lecture quotidienne de `role_stats`, échec si autre chose que 200. Je n'ai vu ni les exécutions GitHub ni les secrets du dépôt |
| C2 | Authentification, sortie sur `SIGNED_OUT` | **Réglé**, non éprouvé en match | `useAccount.ts:329-333` recharge sur tout changement d'auth, et un `userId` nul ramène à la connexion. Le menu Account (déconnexion, mot de passe) est en cours chez le fil principal |
| C3 | Inscriptions ouvertes | **Ouvert, choix assumé** | Voir n8 : à couper une fois les amis inscrits |
| C4 | RLS et fonctions à clé service | **Réglé et revérifié aujourd'hui, mais incomplet** | `rls-check.py` : **24/24 en direct ce jour**. Il ne teste ni `team_members` (M1), ni la colonne `wins` côté propriétaire (il l'autorise, m1), ni `join_team`. `browser-path.py` non lancé, il écrit un match |
| C5 | Clé anon dans le bundle | **Réglé, vérifié** | Un seul JWT dans `client/dist/`, égal à la clé anon attendue (n1) |
| C6 | Reprise en cours de match, coop | **Réglé** | `playForeign`, `useMatch.ts:436-454`, rejoue les lots des coéquipiers (2H.33) |
| C7 | Chrono sous latence | **Réglé** | Drapeau `PATIENT` dans `client/src/lib/flags.ts:27-28`, réponse `expired` gérée |
| C8 | États d'erreur | **Réglé** | A12 : chaque lecture de `useAccount` remonte son erreur dans `failure` (`useAccount.ts:168-175`, `:226-243`) |
| C9 | Versionnage de l'état | **Réglé** | `matches.engine_version` (`0005:23-25`), refus dans `resolve-action/index.ts:123-124` |
| C10 | CI | **Réglé** | `.github/workflows/ci.yml` : test, typecheck, build |
| C11 | Journalisation, bouton « copier le diagnostic » | **Ouvert** | Aucune occurrence de « diagnostic » dans `client/src`. Mineur |
| C12 | Sauvegardes | **En cours de règlement aujourd'hui** | `scripts/export-db.mjs` et une première sauvegarde du 2026-10-17 (n13) ; script pas encore suivi par git à ma lecture |
| C13 | Limites du plan Supabase | **Toujours vrai** | À ajouter : la limite de débit de présence Realtime, qui a fermé un canal le 17 (C34 de `00`) |
| C14 | Limites Vercel | **Réglé** | Déploiement par l'API sans dépôt lié, `scripts/deploy-vercel.mjs` |
| C15 | Navigateurs | **Ouvert, non vérifié** | Je n'ai trouvé aucune trace d'une passe Firefox |
| C16 | Accueil, ancrage et `!` | **Dépassé** | Plus d'ancrage depuis D11 (`07:53`), A8 est « sans objet » (`07:79`) |
| C17 | Audio | **Réglé** | `client/src/match/sound.ts` |
| C18 | Accessibilité de base | **Réglé au niveau visé** | Styles `:focus-visible` (`client/src/theme.css:314-315`), neuf `aria-label` dans les écrans |
| C19 | Secret JWT dans un transcript | **Ouvert, à ta décision** | Mon avis en n12 |
| C20 | `site_url` | **Réglé**, d'après le brief | Je ne l'ai pas relu dans le dashboard |

---

## 5. Ce que je n'ai pas pu vérifier, et pourquoi

- **La configuration Auth réelle** (confirmation coupée, longueur minimale, limites de débit de
  connexion, `site_url`) : elle se lit par l'API de gestion ou le dashboard, interdits par le brief.
  Je me fie au brief et au code de `SignIn.tsx`.
- **Le réglage d'accès public de Realtime** : même raison.
- **Les migrations réellement appliquées** en production. `rls-check.py` prouve 0001 à 0003
  indirectement ; rien ne m'a montré 0011 et 0012 en place, sinon le fait que le jeu tourne.
- **M1 n'a pas été éprouvé en direct** : il faudrait écrire une ligne `team_members`, et le brief
  interdit toute écriture hors `rls-check.py`. La lecture de la politique ne laisse pas de place au
  doute ; le contrôle proposé en M1 le prouvera.
- **M2 a été éprouvé contre le moteur local, pas contre la fonction déployée.** Je n'ai pas comparé
  les bundles déployés aux sources (lecture par l'API de gestion), mais `resolve-action` passe
  l'action sans la retoucher, donc le comportement est le même.
- **La diffusion REST en canal privé de supabase-js 2.45.4**, celle des fonctions : pas d'accès à
  esm.sh dans cette revue (§3).
- **L'existence de `realtime.send`** dans le projet : pas de SQL possible.
- `browser-path.py` et `npm run e2e` : exclus par le brief.
- Le caractère privé du dépôt GitHub, ses secrets et l'état « non lié » du projet Vercel : je n'ai
  consulté ni GitHub ni l'API Vercel. Le script de déploiement s'arrête de lui-même si le projet est
  lié (`deploy-vercel.mjs:165-168`).
- Le menu Account (`AccountMenu.tsx`, `changePassword`, `signOut`) : hors périmètre, en cours
  d'écriture par le fil principal.
