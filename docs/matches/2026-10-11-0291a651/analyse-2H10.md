# Analyse du match 0291a651, pour 2H.10

*Analyse par un agent général Opus 5.5, effort high, lancé par le fil principal (Fable 5.1) le 2026-10-11.*

Sources lues en entier : `docs/00-reglement-v2.md` (C prime sur A et B), `docs/08-plan-terrain-horizontal.md` §3, les cinq fiches de `ai/roles/`, `ai/evaluate.ts`, `ai/chooseAction.ts`, et `match.md` (418 décisions rejouées, 0 écart, 133 tours d'unité). Coordonnées (x, y). A attaque vers y44, B vers y0. Les probabilités citées sont celles des formules du dépôt (`chance`, `contestChance`), sur les fiches Star.

Rappel des caisses utiles à la lecture (moitié A, miroir pour B) : (6..8, 9), (3..4, 5..6), (11..12, 5..6), (1..2, 12..13), (12..13, 12..13), (7, 16), (4..5, 18..19), (9..10, 18..19), piliers (0, 22) et (14, 22). Côté B : (4..5, 25..26), (9..10, 25..26), (7, 28), (1..2, 31..32), (12..13, 31..32), (6..8, 35), (3..4, 38..39), (11..12, 38..39).

## Cinq faits avant de lire

1. **Le Spark a fait 40 des 50 points.** Tullin a tenté quatre fois (R7, R8, R9, R10) et pris deux fois. Kregg Cannonade, le chasseur de B, a fini **deux tours debout sur le Spark sans pouvoir le tenter** (R6, R7), à cause d'un défaut du plan de tour (un Dodge noté comme s'il laissait l'Action), puis un troisième dessus après un Dash (R9). B n'a pas fait une seule tentative du match. De ton côté, tu avais le Spark à 4 cases au R6 et à 6 cases au R7, Action en main, et tu ne l'as pas joué.
2. **L'équipe qui a l'humain joue juste après le Spark, à chaque round** (écart 51). Sur les quatre rounds de Spark avec Tullin en jeu, A a eu la première main à chaque fois. Les Crackers qui renaissent aux piliers ont été frappés par A avant que B ne joue : 58 points de dégâts de Cracker infligés par A, 6 par B. C'est l'échelle, pas l'IA : je le range en (c).
3. **A n'a tiré qu'une fois en dix rounds**, le but de Marrow au R2. Ensuite son ballon a fini ses rounds dans les mains d'un Breaker (Harrow, R6 et R7), dernier joueur de champ avant le Bulwark, que la chaîne empêche de passer à des Strikers qui ont déjà joué. Il l'a perdu.
4. **B n'a tiré que deux fois** : Tobb, un Breaker, à 35 % au R4, et Thessa à 65 % au R10, les deux contrées par le blocage de Flintlock. Le ballon de B est resté du R2 au R4 chez ses Breakers pour la même raison de chaîne, et ses Strikers ont couru devant comme relais alors que la chaîne leur interdisait de recevoir, à travers des attaques d'opportunité : trois Strikers B évacués sur le match (Ogga R4, Thessa R6, Osric R8), contre deux unités A.
5. **Treize bousculades sur dix-sept visaient un non-porteur**, pour une case de poussée et rien d'autre. Et quand il fallait bousculer le porteur, les Breakers l'ont frappé à la batte (R6, R9), ce qui ne fait pas tomber la balle.

Le reste du match en chiffres : 7 passes, 7 attrapées, 0 interception. 3 tirs (A 1 but, B 0 sur 2). 39 Dash. 3 Actions inutilisées sur 133 tours, donc la règle « jamais l'Action en poche » de C11 tient ; le problème est devenu **l'Action dépensée pour rien**.

Légende dans la partie 1 : **[C10 ≠ code]** signale une raison de l'IA qui contredit une ligne des listes de C10 ou de C11. **[plan]** signale un défaut du Planner de C11 lui-même. Les renvois [aj. N] pointent vers le tableau des ajustements de la partie 2.

---

# Partie 1, le match round par round

## Round 1

Ordre : A (Tullin, Tacker, Yarrow, Marrow, Gullo Vantch, Harrow, Flintlock), puis B (Cannonade, Ogga, Osric, Thessa, Tobb, Sparshot, Pell). Crackers immobiles (écart 44). Ballon au sol en (7, 22).

- **Tullin (A, Trajector), (12, 14).** Dash et treize cases vers sa propre bouche, en (5, 1). Raison : avec `chaseKickoff` à zéro, seule la pente de `guardFurnace` tirait. C'est exactement la décision C12, acquise, je ne la rediscute pas. Coût réel : deux tours, puisque son R2 est un Dash de retour.
- **Tacker (A, Striker, humain), (2, 14).** Huit cases sur le ballon, ramassage, puis Dash et huit cases **en arrière**, en (9, 14). L'IA, à ta place, fonçait vers (3, 30), au contact de la ligne B : Ogga (2, 30) et Osric (4, 30) adjacents, Thessa, Tobb, Sparshot et Cannonade à une marche, six bousculades possibles avec leur Action (29,5 % pour un Striker contre ton +8, 47,5 % pour un Breaker, 20 % pour le Trajector), soit environ neuf chances sur dix de perdre le ballon avant ton tour suivant. En (9, 14) tu étais à 15 ou 16 cases de toute la ligne B : il leur fallait un Dash pour te toucher, donc aucune bousculade possible. **Ton meilleur coup du match**, et la meilleure leçon pour l'IA [aj. 4]. Note que l'IA suivait à la lettre C10 Striker 3 (« il avance le plus vite possible vers la bouche adverse ») ; c'est C9 qui avait la bonne formule, « sans perdre la balle ».
- **Yarrow (A, Striker), (4, 14).** Dash en (4, 23), relais devant. Rien d'autre à faire. Correct, et il a touché Ogga en attaque d'opportunité au passage.
- **Marrow (A, Striker), (6, 14).** Même chose en (5, 23). Correct.
- **Gullo Vantch (A, Breaker), (8, 14).** Marche en (12, 22), Cracker dans Tobb, 8 dégâts. Bon coup : A frappe les Crackers avant que B n'arrive.
- **Harrow (A, Breaker), (10, 14).** Un pas en (10, 15), contre Tacker, Action inutilisée. Rien à portée, un Dash n'achetait rien. Correct, c'est le mur de C10 Breaker 6.
- **Flintlock (A, Bulwark).** Se plante en (7, 1). Correct.
- **Cannonade (B, Trajector), (12, 30).** Dash au contact de Tacker en (8, 15), sans Action, et 9 dégâts d'attaque d'opportunité de Gullo Vantch en route. **[C10 ≠ code]** la liste du Trajector n'a pas de « Dash pour arriver adjacent », c'est la ligne 6 du Striker seule ; le code offre ce plancher à tout rôle qui a `pressCarrier` > 0 [aj. 5]. Rien d'utile n'était possible pour lui, mais une route qui ne longe pas Gullo Vantch valait 9 PV [aj. 10].
- **Ogga (B, Striker), (2, 30).** Dash au contact de Tacker en (9, 15), à travers la portée de Yarrow et de Marrow : 11 dégâts. Conforme à C10 Striker 6. C'est la route qui coûte : `avoidOpportunity` vaut 4 par attaque d'opportunité contre un plancher de presse à 55 [aj. 10].
- **Osric (B, Striker), (4, 30).** Dash au contact en (8, 14). Conforme.
- **Thessa (B, Striker), (6, 30).** Dash au contact en (10, 14). Conforme. Bilan des trois : Tacker cerné par quatre B, mais aucun n'a d'Action, et c'est A qui rejoue en premier au R2.
- **Tobb (B, Breaker), (8, 30).** Plan de tête à 122 : « marcher en (1, 23) puis envoyer le Cracker dans Yarrow ». Arrivé en (1, 23), ce coup n'existe plus (le replan ne propose que « dégager le Cracker » à 13) et il frappe Yarrow, raté. **[plan]** la frappe de Cracker prévue depuis une case où l'unité n'est pas encore ne tenait plus une fois sur place : il a marché pour une action qui n'existait pas [aj. 11]. Le pourquoi n'est pas lisible dans le fichier, voir (c).
- **Sparshot (B, Breaker), (10, 30).** Dash en (1, 22) à côté de Yarrow, **sans Action**, noté 131,4. Le plan « marcher en (3, 22) puis frapper Yarrow » valait 130,2. **[plan]** `positionValue` paie `hunt` (70) pour finir à côté d'une proie même quand l'Action est dépensée : le Dash a acheté le droit de regarder Yarrow [aj. 5]. **[C10 ≠ code]** C10 commune 3 et Breaker 4 : la cible était à portée en marchant, elle se frappe.
- **Pell (B, Bulwark).** Se plante. Correct.

**Bilan R1.** Tacker garde le ballon parce qu'il a joué la distance, contre l'avis de l'IA. B a dépensé ses six Actions de champ en Dash et en un coup raté.

## Round 2

Ordre : A (Tullin, Tacker, Yarrow, Marrow, Harrow, Gullo Vantch, Flintlock). Après le but de Marrow, B avec Pell promu en tête (écart 54), puis Cannonade, Ogga, Osric, Thessa, Sparshot, Tobb.

- **Tullin (A, Trajector), (5, 1).** Dash de seize cases en (4, 17) : la facture du R1. Il se pose en relais de Tacker, mais il a joué, donc Tacker ne peut pas lui passer. Rien de mieux à faire.
- **Tacker (A, humain), (9, 14), ballon, quatre B au contact** (Osric, Thessa, Ogga, Cannonade). Passe de 11 cases à Marrow en (3, 25), à désavantage, attrapée sur 12 contre 12. Le bon choix : Marrow n'a aucun B à moins de 3 cases et n'a pas joué, alors que Yarrow (2, 23) était collé à Sparshot. Tu restes ensuite sur place avec 40 pieds : partir offrait quatre attaques d'opportunité. Correct.
- **Yarrow (A, Striker), (2, 23).** Un pas (Sparshot rate son attaque d'opportunité), Cracker dans Tobb (10), puis sept cases en (3, 33). Bon usage de l'Action. La course devant est un relais que Marrow ne pourra pas utiliser puisque Yarrow aura joué, mais elle n'a rien coûté.
- **Marrow (A, Striker), (3, 25), ballon.** Sept cases en (3, 32), tir à désavantage à 42 %, **but**. Un joueur réfléchi avait mieux : huit cases jusqu'en (6, 33) par (3, 26), (4, 27), (5, 28), (6, 29) puis tout droit, hors de portée de marche et de bousculade de tous les B (Tobb en (0, 23) est à 9 de (5, 32), Sparshot en (1, 20) à 12, les Strikers B à 19 et plus, Pell tenu par sa laisse), puis au R3, A jouant en premier, trois cases jusqu'en (9, 36) et un tir propre à 65 % malgré le blocage de Pell. 65 contre 42. Les dés ont donné raison au tir, mais l'IA ne sait pas comparer « tirer maintenant » avec « tirer au tour suivant depuis une case que personne n'atteint » [aj. 4].
- **Harrow (A, Breaker), (10, 15).** Après le but, B a le ballon (Pell, hors de portée). Frappe Ogga (10), revient en (10, 15). Correct, C10 Breaker 4, Striker d'abord.
- **Gullo Vantch (A, Breaker), (12, 22).** Cracker dans Cannonade (7, sauvegarde réussie) plutôt que la batte sur Ogga (152,6 contre 128,1). **[C10 ≠ code]** Breaker 4 dit Strikers d'abord, puis Breakers, puis Trajector : `prey` pondère la batte mais pas le Cracker (`crackersAt` ne lit pas `prey`) [aj. 14]. Effet faible, contradiction littérale.
- **Flintlock (A, Bulwark).** Se plante. Correct.
- **Pell (B, Bulwark), relance.** Huit cases en (9, 35), passe de 12 cases à Tobb, à désavantage, attrapée. Conforme à C10 Bulwark 2 : la seule case à portée d'un coéquipier. Les receveurs étaient deux Breakers parce que les Strikers B étaient à 20 cases et plus, encore collés à Tacker depuis leur presse du R1. La laisse le ramène au R3. Correct.
- **Cannonade (B, Trajector), (8, 15), B en attaque.** Bouscule Tacker, qui ne porte plus rien (raté), puis trois pas et l'attaque d'opportunité de Tacker (10). **[C10 ≠ code]** Trajector 8 : sans la balle en attaque, il se place à vue du porteur en relais ; et « en attaque ils pressent rarement, si c'est la seule chose à faire, c'est une attaque ». Tobb, dernier maillon, pouvait déjà lui passer d'où il était. Mieux : ne pas bouger (zéro attaque d'opportunité), et au plus une batte sur Tacker [aj. 6].
- **Ogga (B, Striker), (9, 15).** Bouscule Gullo Vantch (raté), recule de quatre cases sous deux attaques d'opportunité (9). **[C10 ≠ code]** Striker 5, même chose [aj. 6].
- **Osric (B, Striker), (8, 14).** Trois pas, bouscule Gullo Vantch d'une case (réussi, sans effet), recule en (8, 19). Même chose.
- **Thessa (B, Striker), (10, 14).** Bouscule Harrow (raté), puis huit cases en (3, 20). Même chose. Leur repli vers Tobb se comprend (la caisse (4..5, 18..19) coupait la vue de Tobb vers eux), leurs trois bousculades non.
- **Sparshot (B, Breaker), (1, 20).** Trois pas, batte sur Tullin (11), retour en (1, 22) contre le porteur. Acceptable : l'Action n'avait pas d'autre usage et il finit sur son mur.
- **Tobb (B, Breaker), (0, 23), ballon, dernier maillon.** Marche de sept cases en (3, 17) pour « passer à Cannonade, 5 cases gagnées », puis passe **en arrière** à Sparshot (moins 5), puis un pas sous l'attaque d'opportunité de Tullin (5). **[plan]** deux défauts empilés. D'abord la passe après la marche était notée depuis la case de départ du tour (plus 5), et le replan, une fois en (3, 17), la note depuis la nouvelle case (moins 1). Ensuite, pour un dernier maillon, tous les receveurs ont joué, `progress` est planché à zéro, et les cinq passes sont à égalité sur `handOff` (40) : l'égalité se tranche par identifiant d'unité, `B-breaker-6` d'abord [aj. 11]. **[C10 ≠ code]** C10 commune 5 : le dernier maillon « passe au plus loin ». Mieux : depuis (0, 23), passer tout de suite à Ogga (7, 19) ou Osric (8, 19), 4 cases de gagnées, à un Striker qui joue avant les Breakers au R3 et tire à +11 au lieu de +5.

**Bilan R2.** A marque sur un tir à 42 % qu'il pouvait prendre à 65 % un tour plus tard. B dépense trois Actions à pousser des Breakers et finit le round avec le ballon chez Sparshot, un Breaker, dans le dos de son propre porteur.

## Round 3

Ordre : A en défense (Tullin, Tacker, Yarrow, Marrow, Harrow, Gullo Vantch, Flintlock), puis B (Cannonade, Thessa, Ogga, Osric, Sparshot porteur, Tobb, Pell). Crackers après B.

- **Tullin (A, Trajector), (6, 17).** Six cases sous deux attaques d'opportunité (5), Cracker dans Sparshot, le porteur, 3 dégâts. **[C10 ≠ code]** Trajector 7 : en défense, bousculade du porteur. Le code a préféré le Cracker (31,9 contre 19,5) parce qu'un Cracker envoyé sur un porteur reçoit la moitié de `stripCarrier`, alors qu'une explosion ne fait jamais tomber la balle (B8) [aj. 2]. Tullin était le seul A capable d'atteindre Sparshot avec son Action ce round (tous les autres à 10 cases ou plus) : sa bousculade à 20 % était la seule chance de récupération de A au R3, et le Cracker l'a ramenée à zéro.
- **Tacker (A, humain), (11, 12).** Dash au contact de Sparshot en (1, 21), à 10 cases. Conforme à Striker 6, et rien de mieux n'existait (ni Spark, ni Cracker à portée utile). Correct.
- **Yarrow (A, Striker), (3, 33).** Dash au contact en (2, 22). Conforme.
- **Marrow (A, Striker), (2, 33).** Dash au contact en (0, 23). Conforme. Quatre A autour du porteur, aucun avec une Action : Sparshot sort d'un pas sous deux attaques d'opportunité, ratées toutes les deux, et passe.
- **Harrow (A, Breaker), (11, 14).** Huit cases sous trois attaques d'opportunité (14) jusqu'en (3, 21), pour « frapper Thessa » (126,5). Arrivé, le replan préfère « Dash pour aller sur Sparshot » (55), puis un pas en (2, 20) qui **n'est pas** au contact de Sparshot (1, 22). Action dépensée, rien fait. **[C10 ≠ code]** C10 Breaker 4 (porteur hors de portée : taper l'adversaire proche) et commune 3 (une cible à portée se frappe) : Thessa en (3, 20) était au contact. **[plan]** le plancher de presse du Dash promet 55, mais la marche après le Dash est replanifiée sur `positionValue`, où finir à côté de Thessa (`hunt` 70) vaut plus que finir à côté du porteur (plus 55) : le Dash a promis une presse qu'il ne livre pas [aj. 5]. Mieux : la batte sur Thessa, comme prévu, 70 % pour 1d8+8.
- **Gullo Vantch (A, Breaker), (13, 15).** Le même schéma : six cases en (7, 18) pour « frapper Osric » (120), puis Dash « sur Sparshot » et quatre cases en (3, 21), pas au contact. Osric en (8, 19) était au contact. Même contradiction, même défaut.
- **Flintlock (A, Bulwark).** Se plante. Correct.
- **Cannonade (B, Trajector), (10, 16), B en attaque.** Dash de dix cases en (0, 13), relais devant. **[plan]** Sparshot, le porteur, joue après lui et n'est pas dernier maillon (Tobb et Pell suivent) : il ne peut pas lui passer. `outlet` et `laneCover` comptent pourtant ce relais [aj. 9].
- **Thessa (B, Striker), (3, 20).** Bouscule Gullo Vantch d'une case (réussi, sans effet), puis huit cases en (3, 12) sous deux attaques d'opportunité (17). Bousculade d'un non-porteur [aj. 6] et course vers un relais que la chaîne interdit [aj. 9].
- **Ogga (B, Striker), (9, 17), 20 PV.** Cinq cases en (4, 12), Dodge. Le Dodge est conforme (abîmé de plus de moitié, rien à frapper), la case est le même relais interdit. Il y meurt au R4.
- **Osric (B, Striker), (8, 19).** Sept cases en (5, 12), Action inutilisée. Même relais.
- **Sparshot (B, Breaker), (1, 22), ballon, quatre A au contact.** Un pas en (0, 21) (deux attaques d'opportunité ratées), passe de 6 cases à Tobb qui n'a pas joué, puis cinq cases. Bon coup, conforme à la chaîne : le ballon sort d'une mêlée de quatre.
- **Tobb (B, Breaker), (0, 15), ballon, seul Pell après lui.** Ne peut pas passer (chaîne). Dash de neuf cases en (4, 9) : à 9 cases propres de la bouche A, et à 11 cases ou plus de chaque A, donc personne ne pourra le bousculer avec son Action au R4. Bonne case, choisie par hasard : le code ne mesure pas cette sécurité [aj. 4].
- **Pell (B, Bulwark).** Rentre de huit cases et se plante. Correct.

**Bilan R3.** Deux Breakers A dépensent leur Action en Dash dans le vide alors qu'ils avaient une batte au contact. Trois Strikers B courent se placer en relais qu'ils n'ont pas le droit d'être, sous 17 PV d'attaques d'opportunité.

## Round 4

Ordre : A en défense (Tullin, Tacker, Yarrow, Marrow, Harrow, Gullo Vantch, Flintlock), puis B (Cannonade, Ogga, Osric, Thessa, Tobb porteur, Sparshot, Pell). `cracker-1` renaît en (1, 22), `cracker-2` est en (7, 14).

- **Tullin (A, Trajector), (2, 21).** Dash de treize cases sous deux attaques d'opportunité (13 dégâts, il tombe à 16 PV) jusqu'en (3, 8), au contact de Tobb, sans Action. `cracker-1` était au contact de sa case. **[C10 ≠ code]** commune 3 : un Cracker à portée est une cible, et c'est lui qui interdit le Dash en C11 ; seul le plancher de presse l'a levé, et ce plancher n'est pas une règle du Trajector [aj. 5]. Mieux : envoyer `cracker-1` sur un B (Gullo Vantch l'a fait deux tours plus tard depuis (2, 21), douze cases jusqu'à Osric) et rester hors des attaques d'opportunité. Ces 13 PV sont ceux qui permettent à B de l'évacuer au R5.
- **Tacker (A, humain), (3, 23).** Dash au contact de Tobb en (5, 8). Aucun A ne pouvait bousculer Tobb avec son Action ce round (tous à 11 cases ou plus) : la presse ne menaçait qu'une attaque d'opportunité si Tobb bougeait, et il a tiré sans bouger. L'alternative, un pas et `cracker-1` dans Osric, valait autant. Pas une erreur.
- **Yarrow (A, Striker), (4, 24).** Dash au contact en (4, 8). Conforme.
- **Marrow (A, Striker), (0, 25).** Dash au contact en (5, 9), 11 dégâts de Thessa en route. Conforme, route chère [aj. 10].
- **Harrow (A, Breaker), (2, 20).** Sept cases, `cracker-2` dans Osric (5). Correct, Breaker 4.
- **Gullo Vantch (A, Breaker), (3, 22).** Un pas, `cracker-1` dans Osric (6), puis sept cases en (3, 13). Correct.
- **Flintlock (A, Bulwark), (7, 1).** « Dash pour aller sur Tobb » (60), puis « rien ne vaut un pas » : il ne bouge pas, Action brûlée. **[C10 ≠ code]** Bulwark 6 (jamais au-delà de quatre cases) et 7 (se plante par défaut). **[plan]** le plancher de presse du Dash ignore la pénalité de laisse (moins 500) que la marche respecte ensuite. Tobb était à 9 de la bouche, cinq au-delà de la laisse. Mieux : se planter [aj. 5].
- **Cannonade (B, Trajector), (0, 13), B en attaque.** Quatre pas, bouscule Harrow, non-porteur (raté). **[C10 ≠ code]** Trajector 8 [aj. 6].
- **Ogga (B, Striker), (4, 12), 20 PV.** Plan : « marcher en (2, 9), frapper Tullin, repartir en (1, 5) » (33,7). Il quitte la portée de Gullo Vantch puis de Harrow : 12 et 15, évacué. **[plan]** deux attaques d'opportunité de Breaker (70 % chacune pour 12,5 en moyenne) sur 20 PV, c'est près d'une chance sur deux de mourir, et le plan les a comptées 2 fois 4 points [aj. 10].
- **Osric (B, Striker), (7, 14).** Bouscule Harrow, non-porteur (raté), puis huit cases en (6, 6). Les deux défauts [aj. 6, aj. 9].
- **Thessa (B, Striker), (3, 12).** Dash de onze cases sous trois attaques d'opportunité (22 dégâts, de 33 à 11 PV) jusqu'en (6, 1), à une case de la bouche, la meilleure case de tir du match. Mais Tobb, le porteur, joue après elle et n'est pas dernier maillon : il ne peut pas la servir. **[plan]** relais compté pour un receveur que la chaîne exclut [aj. 9]. 22 PV pour rien ; elle sera évacuée au R6.
- **Tobb (B, Breaker), (4, 9), ballon, trois Strikers A au contact.** Tir à 35 %, Flintlock bloque, raté (12 contre 19). Le moins mauvais : la passe à Thessa était interdite, garder le ballon offrait trois bousculades à A au R5. Conforme à Breaker 7 dans l'esprit, faute d'autre chose.
- **Sparshot (B, Breaker), (0, 16).** Six cases, batte sur Marrow (9), collé au porteur. Correct, Breaker 6.
- **Pell (B, Bulwark).** Se plante. Correct.

**Bilan R4.** Le seul tir de B avant le R10 est celui d'un Breaker à 35 %, pendant que la meilleure tireuse de B attend à une case de la bouche sans droit de recevoir. B perd Ogga sur une marche. Flintlock brûle son Action.

## Round 5

Ballon au sol en (4, 7) après le tir raté. Ordre : A (Tullin, Tacker, Yarrow, Marrow, Harrow, Gullo Vantch, Flintlock), puis B (Cannonade, Osric, Thessa, Tobb, Sparshot, Pell ; Ogga évacué), Crackers après B.

- **Tullin (A, Trajector), (3, 8), 16 PV.** Bouscule Tobb, qui ne porte rien puisque le ballon est par terre (raté), puis un pas sur (4, 7) (Tobb rate son attaque d'opportunité), ramassage, quatre cases en (2, 11). Il finit **au contact de Sparshot (3, 11) et de Cannonade (3, 10)**, Action dépensée, 16 PV. Évacué par Tobb puis Sparshot, ballon perdu. **[C10 ≠ code]** Trajector 6 (balle au sol à portée : il la ramasse) passe après une bousculade inutile. **[plan]** « marcher sur la balle, la ramasser, la lancer » n'est pas un plan que le Planner sait écrire : un lancer n'est noté depuis une case que si l'unité tient déjà le ballon [aj. 3]. Mieux : un pas, ramassage gratuit, passe à Tacker en (5, 8), adjacent donc ininterceptable (écart 48) et pas encore joué ; Tacker sort de huit cases et relance vers Harrow (6, 13) ou Gullo Vantch (3, 15), qui n'ont pas joué. Le ballon quitte la grappe B dans le round, et Tullin reste hors de portée.
- **Tacker (A, humain), (5, 8).** Trois cases, batte sur Cannonade (19 PV), ratée, puis cinq cases en (0, 15). L'IA voulait marcher pour bousculer Tobb, un non-porteur : pire. Tullin ne pouvant plus passer, seule la batte sur un voisin du porteur le protégeait, et Cannonade à 19 PV était le seul qu'un Striker pouvait espérer évacuer en deux coups. Défendable. L'erreur du round est celle de Tullin, pas la tienne.
- **Yarrow (A, Striker), (4, 8).** Deux pas (Cannonade le touche, 6), bouscule Tobb, non-porteur (raté), six cases en (10, 16). **[C10 ≠ code]** Striker 5 [aj. 6]. Mieux : la batte sur Cannonade, collé au porteur et à 19 PV.
- **Marrow (A, Striker), (5, 9).** Un pas, bouscule Tobb **avec succès** : de (4, 11) en (3, 12), c'est-à-dire **au contact de son propre porteur** Tullin (2, 11). Puis sept cases en (11, 17). La bousculade d'un non-porteur n'a pas été seulement inutile, elle a amené un Breaker B sur le porteur A [aj. 6].
- **Harrow (A, Breaker), (6, 13).** Deux pas, batte sur Tobb collé au porteur (16). Correct, Breaker 6.
- **Gullo Vantch (A, Breaker), (3, 15).** Cinq cases, batte sur Sparshot collé au porteur, ratée. Correct.
- **Flintlock (A, Bulwark).** Se plante. Correct.
- **Cannonade (B, Trajector), (1, 10).** Batte sur Tullin porteur, ratée. **[C10 ≠ code]** Trajector 7 dit bousculer. Ici les deux étaient mauvais (bousculade à 11,5 % contre l'Acrobaties +10 de Tullin, batte à 35 % qui ne peut pas l'évacuer) ; la batte prépare au moins l'évacuation. Acceptable.
- **Osric (B, Striker), (6, 6).** Cinq cases, batte sur Tullin, ratée. **[C10 ≠ code]** Striker 6 : « priorité au déplacement normal jusqu'à l'adjacence puis Shove ». Le code a donné 24,8 à la batte contre 22,5 à la bousculade parce qu'une batte sur un porteur reçoit la moitié de `stripCarrier`, alors que 1d8+4 ne pouvait pas évacuer 16 PV [aj. 2].
- **Thessa (B, Striker), (6, 1), 11 PV.** Dash hors de la bouche A jusqu'en (3, 10), au contact de Tullin. Conforme à Striker 6, à 11 PV au milieu des Breakers A : évacuée au tour suivant. « Coûte que coûte », pris à la lettre.
- **Tobb (B, Breaker), (3, 12).** Batte sur Tullin porteur (10, il reste 6), puis huit cases sous deux attaques d'opportunité (7). **[C10 ≠ code]** Breaker 3 dit bousculer (38,5 % de faire tomber, contre 8 % d'évacuer avec une batte). Mais ici les deux battes successives de Tobb puis de Sparshot ont évacué Tullin : ballon au sol **et** A sans chasseur pour l'entrée du Spark au R6. Le code a eu raison pour une mauvaise raison (il ne compte pas la probabilité d'évacuer) ; l'ajustement 2 garde exactement ce cas.
- **Sparshot (B, Breaker), (3, 11).** Batte sur Tullin à 6 PV, évacué, ballon en (3, 12). Correct. Puis deux cases en (3, 13), à côté du ballon, **sans le ramasser** : `yieldToKeener`, parce que Thessa (3, 10) et Osric (1, 10) sont à deux cases du ballon. Tous deux ont déjà joué. **[plan]** C10 commune 2 et Breaker 7 laissent la balle à un Striker pour qu'il la prenne ; un Striker qui a joué ne la prendra jamais avant A, qui rejoue en premier. Tacker l'a ramassée gratuitement au R6 [aj. 7]. Mieux : un pas sur le ballon, ramassage gratuit, et A doit gagner une bousculade contre +8 pour l'avoir.
- **Pell (B, Bulwark).** Se plante. Correct.
- **Crackers.** Parés par Sparshot et Tobb, renvoyés douze cases dans le vide.

**Bilan R5.** Le ballon libre au pied de quatre A finit dans les mains d'un Trajector à 16 PV au milieu de trois B : évacué, ballon perdu. B le reprend, puis le laisse par terre à côté de deux Strikers qui ont joué.

## Round 6

Le Spark entre en (2, 19). Ogga revient en (7, 22). Ordre : le Spark, A (Tacker, Yarrow, Marrow, Gullo Vantch, Harrow, Flintlock ; Tullin évacué), les Crackers, B (Cannonade, Osric, Ogga, Sparshot, Tobb, Pell ; Thessa évacuée pendant le bloc A).

- **Tacker (A, humain), (0, 15).** Cinq cases sur le ballon en (3, 12), ramassage, un pas, passe à Yarrow (8, 14), deux cases de gagnées, un pas. L'IA aurait marché pour bousculer Sparshot : pire, elle ne sait pas écrire ramasser puis passer. Mais **le Spark était en (2, 19), à 4 cases de toi, Action en main** : 45 % (Acrobaties +8 contre DC 20) pour 20 points, 9 points d'espérance. Tullin évacué, personne chez A ne le chassait, et le chasseur B, Cannonade, était à 8 cases. Yarrow, qui joue après toi, était à 5 cases du ballon : il pouvait le ramasser et le passer à Marrow (11, 17), qui n'avait pas joué, 5 cases de gagnées. **Ton choix le plus cher du match** (avec le R7). L'écart 55, qui te fera jouer après Yarrow et Marrow, te donnera justement cette lecture.
- **Yarrow (A, Striker), (8, 14), ballon.** Deux pas, passe à Harrow, **une** case de gagnée. Harrow est un Breaker et le dernier joueur de champ A : le ballon finira le round chez lui, sans pouvoir repartir. Marrow (11, 17), Striker, trois cases devant, était noté pareil (58,3) ; l'égalité est tombée sur le Breaker. C10 autorise le Breaker ici (la priorité aux Strikers ne vaut que « tant que le Spark n'est pas sur le terrain »), mais l'effet est le pire possible [aj. 8].
- **Marrow (A, Striker), (11, 17), 30 PV.** Bouscule Tobb, collé au porteur Harrow (raté), puis quatre cases en (14, 21) sous l'attaque d'opportunité de Tobb (14, il tombe à 16). Écarter un adversaire du porteur est le travail des Breakers (`guardStrike`) ; C10 Striker 5 dit justement qu'« un adversaire collé au porteur allié ne le fait pas bouger ». La marche valait 4,5 points contre 70 % de prendre 1d8+8 [aj. 10].
- **Gullo Vantch (A, Breaker), (2, 10).** Batte, Thessa (11 PV) évacuée. Excellent. Puis sept cases sous trois attaques d'opportunité (25 dégâts) jusqu'en (9, 17), pour faire mur devant Harrow, **qui joue après lui** et part de huit cases. **[plan]** `block` lit la case actuelle du porteur même quand le porteur n'a pas encore joué : le mur s'est posé là où le porteur ne serait plus [aj. 13].
- **Harrow (A, Breaker), (10, 17), ballon.** Se désengage de Tobb et avance de huit cases en (11, 24). Il ne peut pas passer (seul Flintlock joue après lui). Le désengagement était juste. La case d'arrivée est sur la ligne des **deux** Crackers, qui roulent vers le ballon : 7 et 5 dégâts. **[plan]** `avoidCrackers` vaut 0 pour le Breaker parce qu'il pare, mais un Breaker qui porte ne pare pas (écart 47) [aj. 12].
- **Flintlock (A, Bulwark).** Se plante. Correct.
- **Cannonade (B, Trajector), (0, 11), chasseur, 19 PV sur 45.** **Dodge, puis huit cases sur le Spark en (2, 19), sans pouvoir le prendre.** Le Spark s'échappe en (1, 19). **[C10 ≠ code]** commune 1 et Trajector 2 (debout sur le Spark : l'attraper, toujours), commune 7 (Dodge en dernier recours). **[plan]** deux défauts. Le repli après une Action est noté avec `positionValue(cell)`, dont la case du Spark inclut la prise (`actionLeft` vrai par défaut) : « Dodge puis marcher sur le Spark » a été crédité d'une prise impossible et passe devant « marcher sur le Spark » (179,6 contre 178,3). Et le test « rien d'autre à faire » du Dodge ignore la prise du Spark, qui n'est pas dans `SPENDS_ON_THE_BOARD` [aj. 1]. 55 % pour 20 points perdus.
- **Osric (B, Striker), (0, 9).** Dash de seize cases sous deux attaques d'opportunité (22 dégâts, de 39 à 17) jusqu'au contact de Harrow. Conforme à Striker 6 ; la route qui longe Tacker et Yarrow est le coût [aj. 10].
- **Ogga (B, Striker), (7, 22).** Quatre cases, bouscule Harrow pour le ballon (raté). Correct, Striker 6.
- **Sparshot (B, Breaker), (3, 13).** Batte sur Tacker (16), puis sept cases vers le porteur. Correct, Breaker 4.
- **Tobb (B, Breaker), (11, 18).** Six cases, **batte** sur Harrow, le porteur, à 59 PV (10 dégâts). **[C10 ≠ code]** Breaker 3 : y aller et le bousculer (47,5 %). La batte ne pouvait pas l'évacuer [aj. 2].
- **Pell (B, Bulwark).** Se plante. Correct.

**Bilan R6.** Le Spark entre et personne ne le tente : Tacker passe à côté, Cannonade se tient dessus après un Dodge. Le ballon de A finit chez un Breaker sur la ligne des deux Crackers.

## Round 7

Tullin revient en (7, 22). Le Spark est en (1, 19). Ordre : le Spark, A (Tullin, Tacker, Yarrow, Marrow, Harrow, Gullo Vantch, Flintlock), les Crackers, B (Cannonade, Ogga, Osric, Tobb, Sparshot, Pell).

- **Tullin (A, Trajector), (7, 22).** Six cases sur le Spark, tentative ratée (19 contre 20). Correct. Le Spark saute en (0, 20).
- **Tacker (A, humain), (4, 14).** Dash de seize cases en (8, 30), relais devant Harrow, qui ne peut pas te passer (tu as joué, il n'est pas dernier maillon). **Le Spark venait de sauter en (0, 20), à 6 cases de toi** : 45 % pour 20 points, encore. Cannonade était à 2 cases du Spark et jouait après A. Deuxième choix cher.
- **Yarrow (A, Striker), (4, 16).** Dash en (10, 32), même relais interdit. Le Spark était à 4 cases de lui ; la règle « le Trajector seul » l'en empêche, voir la question de la partie 2.
- **Marrow (A, Striker), (14, 21), 16 PV.** Dash sous deux attaques d'opportunité (9, il tombe à 7) jusqu'en (10, 33), relais interdit. Évacué par Tobb dans le bloc B [aj. 9, aj. 10].
- **Harrow (A, Breaker), (11, 24), ballon, Tobb, Ogga et Osric au contact.** Se désengage, huit cases en (9, 32), à côté de ses Strikers sans pouvoir leur passer. Ogga le bouscule, ballon perdu. Lecture honnête : avec trois B entre y24 et y25, aucune case à huit pas n'était hors de leur portée de marche et de bousculade, et le ballon était perdu environ trois fois sur quatre quel que soit son porteur. Avec l'ajustement 8 il aurait pu passer à Yarrow (10, 32), mais Osric en (11, 25) était sur la trajectoire, avec Tobb et Ogga à côté : trois intercepteurs. La faute est au R6, quand le ballon est allé au dernier maillon, un Breaker, au milieu de B.
- **Gullo Vantch (A, Breaker), (9, 17).** Huit cases (Sparshot rate), Cracker sur Ogga, collé au porteur : raté. Bonne intention, Breaker 6.
- **Flintlock (A, Bulwark).** Se plante. Correct.
- **Crackers.** Gullo Vantch en pare un, renvoyé dans Osric (6).
- **Cannonade (B, Trajector), (2, 19), chasseur, Spark en (0, 20).** **Dodge puis deux cases sur le Spark**, encore (169,6 contre 168,3). Même défaut [aj. 1]. Le Spark saute en (0, 19), et au R8 Tullin le prend en premier. Deuxième 55 % pour 20 points perdu : 22 points d'espérance sur les deux rounds.
- **Ogga (B, Striker), (12, 23).** Huit cases, bouscule Harrow, le ballon roule en (9, 33). Correct, le meilleur coup défensif de B.
- **Osric (B, Striker), (11, 25), 11 PV.** Huit cases sous deux attaques d'opportunité (6, il reste 5), ramasse le ballon. Aucune passe possible : la caisse (9..10, 25..26) coupe la vue vers Tobb (10, 24), Sparshot est hors de portée. Puis il bouscule Harrow avec son Action (1,8 point, du bruit). Un porteur à 5 PV au milieu de quatre A qui jouent en premier : impasse plutôt qu'erreur.
- **Tobb (B, Breaker), (10, 24).** Huit cases, batte, Marrow (7 PV, collé au porteur Osric) évacué. Correct, Breaker 6.
- **Sparshot (B, Breaker), (12, 15).** Dash « à côté d'Osric », finit à deux cases de lui. Conforme à Breaker 6 (« loin du porteur, il Dash »).
- **Pell (B, Bulwark).** Se plante. Correct.

**Bilan R7.** Quatre unités (Tacker, Yarrow, Cannonade, et Tullin qui l'a raté) pouvaient tenter le Spark ; une seule l'a fait. Trois Strikers A courent en relais interdits, l'un en meurt.

## Round 8

Thessa revient en (7, 22). Le Spark est en (0, 19). Ordre : le Spark, A (Tullin, Tacker, Yarrow, Harrow, Gullo Vantch, Flintlock), B (Cannonade, Ogga, Thessa, Sparshot, Tobb, Pell ; Osric évacué pendant le bloc A), les Crackers.

- **Tullin (A, Trajector), (1, 19).** Un pas, Spark pris (28). **Plus 20.** Correct.
- **Tacker (A, humain), (8, 28).** Quatre cases, batte sur Osric, porteur à 5 PV, ratée, recul, retour en (8, 32). Le bon choix : à 5 PV toute touche (50 %) l'évacue et fait tomber le ballon, la bousculade n'était qu'à 29,5 %. Écart justifié à la lettre de C10 Striker 6, et c'est le cas que l'ajustement 2 rend explicite.
- **Yarrow (A, Striker), (11, 32).** La même batte, ratée. Correct.
- **Harrow (A, Breaker), (9, 31).** Batte, Osric évacué, le ballon roule en (8, 33). Correct. Puis **cinq cases vers l'arrière sous deux attaques d'opportunité (19 dégâts)** jusqu'en (12, 25), une ligne de Cracker, en laissant le ballon libre à trois cases. **[plan]** `yieldToKeener` : Tacker est à une case du ballon et Yarrow à deux, tous deux ont joué [aj. 7]. Mieux : trois cases, ramassage, et garder le ballon (A rejoue en premier au R9).
- **Gullo Vantch (A, Breaker), (11, 26).** Six cases, batte sur Ogga (10), puis deux cases en (8, 31), **à deux cases du ballon libre**, sans le prendre. Même défaut. Ogga le ramasse dans le bloc B.
- **Flintlock (A, Bulwark).** Se plante. Correct.
- **Cannonade (B, Trajector), (0, 20), 19 PV, plus de Spark.** Bouscule Tullin, non-porteur (réussi, une case), puis huit cases en (3, 28). **[C10 ≠ code]** Trajector 7 et 8 : pas de cible légitime. **[plan]** la simple présence d'une bousculade à portée (`violence`) lui interdisait le Dash ; le ballon libre était à 13 cases [aj. 6]. Mais ramasser à 19 PV au milieu de trois A ne valait rien non plus, et Ogga était à deux cases du ballon. Rien d'utile à faire ; la bousculade est du bruit.
- **Ogga (B, Striker), (6, 33).** Deux pas, Cracker sur Gullo Vantch, raté ; quatre cases, ramasse le ballon en (8, 33), Action dépensée, au milieu de Tacker, Yarrow et Gullo Vantch. **[plan]** ramasser d'abord puis passer à Tobb (10, 28), qui n'avait pas joué, cinq cases de gagnées, aurait sorti le ballon de la mêlée (avec un ou deux intercepteurs possibles près de la première moitié du vol). Le plan ne peut pas l'écrire [aj. 3].
- **Thessa (B, Striker), (7, 22).** Six cases, batte sur Tullin, non-porteur, ratée, puis (1, 24). B en attaque, « si c'est la seule chose à faire, c'est une attaque » : conforme. Et (1, 24) devient la case de réception du R9.
- **Sparshot (B, Breaker), (10, 31).** Un pas, batte sur Tacker, collé au porteur Ogga : ratée. Correct.
- **Tobb (B, Breaker), (10, 28).** Six cases, batte sur Tacker, ratée. Correct.
- **Pell (B, Bulwark).** Se plante. Correct.
- **Crackers.** Gullo Vantch pare dans Thessa (13), Harrow pare dans le vide.

**Bilan R8.** A prend le Spark, tue le porteur B, puis laisse le ballon par terre au milieu de ses trois joueurs : B le récupère gratuitement.

## Round 9

Marrow revient en (7, 22). Le Spark entre en (1, 16) puis dérive en (5, 16). Ordre : le Spark, A (Tullin, Tacker, Yarrow, Marrow, Gullo Vantch, Harrow, Flintlock), B (Cannonade, Ogga porteur, Thessa, Tobb, Sparshot, Pell), les Crackers.

- **Tullin (A, Trajector), (0, 21).** Cinq cases, tentative ratée (12). Correct. Le Spark saute en (6, 15).
- **Tacker (A, humain), (8, 32).** Bouscule Ogga, le porteur, ratée (29,5 %), et reste. Conforme. Rester était juste : partir offrait deux attaques d'opportunité de Breaker (Tobb (9, 33), Sparshot (9, 32)). Correct.
- **Yarrow (A, Striker), (10, 32).** Deux pas (Sparshot rate), bouscule Ogga, ratée. Correct.
- **Marrow (A, Striker), (7, 22).** Dash de dix cases au contact d'Ogga. Conforme. **Le Spark venait de sauter en (6, 15), à 7 cases** (même question que Yarrow au R7).
- **Gullo Vantch (A, Breaker), (8, 31).** Un pas, **batte** sur Ogga, le porteur, à 40 PV (11). **[C10 ≠ code]** Breaker 3 : bousculer (47,5 %) [aj. 2].
- **Harrow (A, Breaker), (12, 25).** Huit cases, **batte** sur Ogga (29 PV), ratée. Même contradiction. Deux bousculades de Breaker faisaient tomber le ballon 72 fois sur 100, au pied de quatre A. C'était le moment d'éteindre la seule vraie attaque de B du match.
- **Flintlock (A, Bulwark).** Se plante. Correct.
- **Cannonade (B, Trajector), (3, 28), chasseur.** Dash de treize cases sur le Spark en (6, 15) : impossible de le prendre (le Dash a pris l'Action), et finir dessus le fait s'échapper (écart 49), en (5, 15). **[plan]** le chasseur vise la case actuelle du Spark, pas celle où sa dérive l'amènera, alors que le cap est connu et la dérive sans dé [aj. 16]. Même bien placé, A jouait en premier au R10.
- **Ogga (B, Striker), (8, 33), ballon.** Un pas (deux attaques d'opportunité ratées), passe de 9 cases à Thessa (1, 24), qui n'a pas joué. **Le meilleur coup de B du match.** Puis sept cases sous trois attaques d'opportunité (20 dégâts, de 29 à 9 PV) pour 9 points de position [aj. 10].
- **Thessa (B, Striker), (1, 24), ballon.** Dash de quinze cases en (4, 9) : à 9 cases propres de la bouche, et hors de portée de tous les A sauf Tullin, le chasseur. Bon coup.
- **Tobb (B, Breaker), (9, 33).** Batte sur Tacker (11), puis huit cases **vers sa propre bouche**, en (4, 42), pour 0,6 point. **[C10 ≠ code]** Breaker 6 : « loin du porteur, il Dash pour être proche au round suivant plutôt que de frapper un retardataire adverse ». Le code interdit le Dash dès qu'une frappe est à portée, sauf pour finir à deux cases du porteur, ce qui était hors d'atteinte (Thessa à 24 cases) [aj. 15].
- **Sparshot (B, Breaker), (9, 30).** Dash de quinze cases en (4, 15), vers le porteur, et pare un Cracker dans Tullin (6). Conforme à Breaker 6.
- **Pell (B, Bulwark).** Se plante. Correct.

**Bilan R9.** Les deux Breakers A frappent le porteur au lieu de le bousculer, Ogga passe, Thessa se pose à 9 cases du but. La seule menace réelle de B naît d'un défaut de l'IA de A.

## Round 10

Osric revient en (7, 22). Le Spark dérive en (11, 15). Ordre : le Spark, A (Tullin, Tacker, Marrow, Yarrow, Gullo Vantch, Harrow, Flintlock), B (Cannonade, Thessa porteuse, Ogga, Osric, Tobb, Sparshot, Pell), les Crackers.

- **Tullin (A, Trajector), (5, 16).** Six cases sous deux attaques d'opportunité (9), Spark pris (30). **Plus 20.** Correct, Trajector 1 (il accepte l'attaque d'opportunité).
- **Tacker (A, humain), (10, 32).** Dash de seize cases en (10, 16) : Thessa est à 22 cases, inatteignable. Rien d'autre à faire. Correct.
- **Marrow, Yarrow (A, Strikers).** Le même Dash vers Thessa, sans l'atteindre. Le repli Dash de C11 ; sans effet, sans coût.
- **Gullo Vantch (A, Breaker), (11, 30).** Huit cases, batte sur Osric qui vient d'entrer (9). Correct, Breaker 4.
- **Harrow (A, Breaker), (5, 35).** Huit cases, batte sur Ogga (9 PV), ratée. Correct.
- **Flintlock (A, Bulwark).** Se plante, puis bloque le tir de Thessa, raté de 1 (18 contre 19). Le blocage a décidé le tir.
- **Cannonade (B, Trajector), (4, 15).** Dash de quatorze cases en (6, 1), relais que Thessa, qui joue après lui, n'a pas le droit de servir [aj. 9].
- **Thessa (B, Striker), (4, 9), ballon.** Tir à 65 %, bloqué, raté ; elle reprend le ballon. Correct : aucun B n'ayant pas joué ne pouvait arriver en second tireur après le blocage.
- **Ogga, Osric (B, Strikers).** Dash vers l'avant, rien à faire. Sans effet.
- **Tobb (B, Breaker), (4, 42).** Dodge à 39 sur 85 « rien d'autre à faire », puis (8, 43). Conforme au dernier recours.
- **Sparshot (B, Breaker), (3, 14).** Cinq cases, batte sur Tullin (9). Correct.
- **Pell (B, Bulwark).** Se plante. Correct.

**Bilan R10.** Fin à 50 à 0. Le dernier tir de B est contré par le blocage, le seul mécanisme défensif de A qui ait marché sans faute de tout le match.

---

## Les motifs récurrents

**Le Spark.** Il a fait 40 points sur 50. Côté B, le chasseur n'a jamais tenté : deux fois debout dessus après un Dodge (R6, R7), une fois dessus après un Dash (R9). Côté A, Tullin a été le seul à tenter, et tu as laissé passer deux tentatives à 45 % (R6 à 4 cases, R7 à 6 cases) ; les Strikers IA de A en avaient trois autres à portée de marche (Yarrow R6 et R7, Marrow R9), interdites par la règle « le Trajector seul ». L'ordre de l'échelle donne en plus à A la première main sur chaque dérive.

**L'Action dépensée pour rien.** Douze Dash au moins n'ont rien acheté : R1 Sparshot (finir à côté d'une proie sans Action), R3 Harrow et Gullo Vantch (Dash « sur le porteur » qui finit à deux cases de lui), R4 Flintlock (Dash puis rien, à cause de la laisse), R4 Tullin (au contact sans Action, 13 PV), R9 Cannonade (sur le Spark sans Action), R10 Tacker, Marrow, Yarrow (inatteignable), et les relais interdits de Thessa (R4), Marrow (R7), Cannonade (R3, R10). La cause est la même partout : **des valeurs de case qui supposent une Action que le plan a déjà dépensée**, et un plancher de presse que la marche suivante ne respecte pas.

**Qui frappe au lieu de presser.** Les Breakers frappent le porteur à la batte (Tobb R5 et R6, Gullo Vantch et Harrow R9), Osric aussi (R5), alors que la batte ne fait tomber la balle que si elle évacue. Et inversement, **treize bousculades sur dix-sept** visent un non-porteur (R2 Cannonade, Ogga, Osric, Thessa ; R3 Thessa ; R4 Cannonade, Osric ; R5 Tullin, Yarrow, Marrow ; R6 Marrow ; R7 Osric ; R8 Cannonade) : une case de poussée, et une fois (Marrow, R5) un Breaker poussé sur son propre porteur.

**Les passes qui n'arrivent jamais, parce qu'elles ne partent pas.** Les sept passes lancées sont arrivées. Celles qui manquent ne sont jamais parties : Tobb ne peut pas servir Thessa en (6, 1) au R4, Harrow ne peut pas servir trois Strikers devant lui au R7, Gullo Vantch et Harrow ne ramassent pas le ballon au R8, Tullin (R5) et Ogga (R8) ramassent sans pouvoir passer dans le même tour. Deux mécanismes : **la chaîne bloque le ballon chez le dernier joueur de champ**, qui est presque toujours un Breaker parce que les Breakers jouent après les Strikers ; et **le Planner ne sait pas écrire « ramasser puis lancer »**.

**Les relais qui n'en sont pas.** `outlet` et `laneCover` paient une case de réception même quand le porteur n'aura pas le droit d'y passer. Résultat : des Strikers qui courent devant à travers les attaques d'opportunité (Thessa 22 PV au R4, trois Strikers B au R3, Marrow au R7 qui en meurt).

**Les attaques d'opportunité au rabais.** Elles coûtent 2 à 7 points dans un plan, quel que soit l'attaquant et quels que soient les PV de l'unité. Ogga meurt au R4 en marchant devant deux Breakers à 20 PV, Marrow perd 14 pour 4,5 points au R6, Ogga 20 pour 9 points au R9, Harrow 19 au R8 pour aller à une ligne de Cracker.

**Le gardien.** Les deux Bulwarks ont été justes à neuf tours sur dix : relance de Pell au R2 exactement comme C10 la décrit, plantage, deux blocages de Flintlock dont un qui sauve un but (R10). Le seul défaut est le Dash dans le vide de Flintlock au R4.

**Les Crackers.** A en a frappé sept (six touches) et paré trois, B en a frappé un (raté) et paré trois, dont deux dans le vide. A joue avant B et les Crackers renaissent aux piliers, au milieu du terrain : A arrive le premier. Une seule faute d'IA : le Breaker porteur qui ignore les Crackers (R6, 12 PV).

**Pourquoi B n'a jamais marqué ni vraiment menacé.** Quatre raisons, dans l'ordre de leur poids. Un : sa relance du R2 est partie vers un Breaker parce que ses trois Strikers étaient encore collés à Tacker à 20 cases, et la chaîne a gardé le ballon chez ses Breakers jusqu'au tir à 35 % du R4. Deux : ses Strikers ont dépensé leurs Actions à pousser des Breakers et leurs PV à courir vers des relais interdits, trois évacuations en cinq rounds. Trois : son chasseur de Spark a raté deux occasions à 55 % par un défaut du plan. Quatre : quand il a enfin eu le ballon dans de bonnes mains (Ogga puis Thessa, R9), il ne lui restait qu'un tir, contré par le blocage. Le 50 à 0 dit moins la force de A que ces quatre défauts.

**Toi, Tacker.** Ton R1 est le meilleur coup du match, et ton R2 (passe à Marrow, le seul receveur libre) et ton R8 (la batte sur un porteur à 5 PV plutôt que la bousculade) sont plus fins que ce que l'IA aurait joué. Tes deux erreurs sont le Spark ignoré au R6 et au R7, environ 18 points d'espérance. Ailleurs tu as joué comme l'IA aurait joué, et parfois c'est elle qui avait tort (R3, R4 : la presse en Dash n'a rien produit, voir la question 18).

---

# Partie 2, la synthèse

## (a) Les leçons

1. **Une case ne vaut l'action qu'elle débloque que si l'action reste.** Le plan de tour note des fins de tour, mais plusieurs termes de `positionValue` supposent encore l'Action disponible : la prise du Spark dans le repli après un Dodge (R6, R7), la proie au contact après un Dash (R1, R3), la presse après un Dash (R3, R4). C'est la même erreur que celle que C11 a corrigée pour le Dash sur le Spark, restée ouverte partout ailleurs.

2. **Le ballon se perd entre deux tours, pas pendant.** La seule question qui compte pour un porteur en fin de tour est : combien d'adversaires peuvent venir au contact avec une marche et une Action avant qu'il rejoue. Tacker l'a lue au R1 (zéro), Tobb et Thessa l'ont trouvée par hasard (R3, R9), Tullin l'a ignorée et en est mort (R5). Le code ne la lit nulle part : il pèse les attaques d'opportunité sur la route, jamais la menace sur la case d'arrivée.

3. **La batte ne fait pas tomber la balle.** Une frappe sur un porteur ne vaut quelque chose que si elle peut l'évacuer (R5 Sparshot, R8 Tacker et Harrow l'ont bien fait), sinon c'est la bousculade (R6 Tobb, R9 Gullo Vantch et Harrow l'ont mal fait). Le code donne à toute frappe sur un porteur la moitié de la valeur d'une récupération, Cracker compris.

4. **La chaîne, telle que codée, finit chez le Breaker.** L'ordre Trajector, Strikers, Breakers, Bulwark fait que le ballon passé « à quelqu'un qui n'a pas joué » glisse vers les Breakers en fin de bloc, et qu'un Breaker porteur, avec seulement le Bulwark derrière lui, n'est pas dernier maillon : il ne peut plus servir ses Strikers. A n'a tiré qu'une fois en dix rounds, B a tiré une fois avec un Breaker (R3, R4, R6, R7, R8).

5. **Un relais ne vaut que si le porteur a le droit de servir.** Les Strikers courent devant parce que `outlet` les paie, alors que le porteur qui joue après eux ne peut pas leur passer (R3, R4, R7, R10). Ils y laissent leurs PV.

6. **Ramasser et lancer dans le même tour est le geste le plus fort du jeu, et l'IA ne le connaît pas.** Le ramassage est gratuit, l'Action reste ; Tacker l'a fait au R6. Tullin (R5) et Ogga (R8) ont ramassé avec l'Action déjà dépensée, au milieu de l'adversaire.

7. **Un ballon laissé par terre va à l'équipe qui joue ensuite.** La politesse du Breaker (laisser la balle au Striker à deux cases) ne vaut que si ce Striker n'a pas encore joué : au R5 et au R8 elle a donné le ballon à l'adversaire.

8. **La bousculade d'un non-porteur ne sert presque jamais.** Treize sur dix-sept ; une seule a eu un effet, et il était contre son camp (R5).

9. **Les attaques d'opportunité se paient à ce qu'elles coûtent.** Une marche devant deux Breakers à 20 PV est une mort une fois sur deux (R4), pas 8 points. Trois Strikers B évacués, dont deux par des routes.

10. **Le Spark se lit sur le plateau.** Son cap est connu et sa dérive sans dé. Le chasseur qui vise sa case actuelle arrive dessus sans Action ou le fait s'échapper (R9) ; et des Strikers à 4 ou 6 cases, Action en main, l'ont regardé passer (R6, R7, R9).

11. **Le plan doit se tenir d'une action à l'autre.** Une passe prévue après une marche, notée depuis la case de départ, est renotée depuis la case d'arrivée et change de destinataire (R2 Tobb, passe en arrière) ; une frappe de Cracker prévue depuis une case lointaine disparaît une fois sur place (R1 Tobb).

## (b) Les ajustements

Classés par effet attendu, du plus fort au plus faible. Aucun ne touche une constante de règle. Ceux qui touchent une ligne de C10 sont posés comme des questions et marqués **Question**.

| # | Rôle | Comportement visé | Où ça se code | Effet attendu | Rounds |
|---|---|---|---|---|---|
| 1 | Commun, Trajector d'abord | Debout sur le Spark avec son Action, on l'attrape. Une case qui vaut une action ne la vaut plus une fois l'Action dépensée, ni après un Dodge, ni après une frappe, ni après un Dash. | `chooseAction.ts` : `retreatFrom` et `withRetreat` lisent `positionValue(board, cell, false)` après toute action qui dépense l'Action (un second cache pour `actionLeft` faux) ; le Dodge ajoute `catchSpark` aux actions qui comptent dans « rien d'autre à faire » ; `actionsAt` offre `catchSpark` depuis une case marchée (« marcher puis attraper » devient un plan) | Deux tentatives à 55 % rendues au chasseur B, environ 22 points d'espérance dans ce seul match | R6, R7 (Cannonade) |
| 2 | Commun, Breaker d'abord | Contre le porteur, on bouscule. On ne le frappe, à la batte ou au Cracker, que si le coup peut l'évacuer. | `chooseAction.ts`, `violenceAt` et `crackersAt` : remplacer `stripCarrier × 0,5` par `stripCarrier ×` probabilité d'évacuer (chance de toucher × chance que les dégâts atteignent les PV restants ; pour un Cracker, 3d6 avec la sauvegarde) | Les Breakers récupèrent au lieu de cogner ; 72 % de stopper la seule attaque réelle de B au R9 ; garde les cas justes (porteur à 5 ou 6 PV) | R3 Tullin, R5 Osric et Tobb, R6 Tobb, R9 Gullo Vantch et Harrow ; à garder : R5 Sparshot, R8 Tacker et Harrow |
| 3 | Commun | Ramasser puis lancer : marcher sur la balle, la ramasser, la passer ou tirer dans le même tour. | `chooseAction.ts`, `Planner.plans` : pour la destination qui est la case du ballon libre, demander `actionOptionsAt` avec l'unité tenant le ballon, et noter les lancers depuis cette case comme les autres « marche puis lancer » | Un ballon libre dans une mêlée en sort dans le round, au lieu de rester dans les mains d'un porteur sans Action | R5 Tullin, R8 Ogga ; R6 Tacker l'a fait à la main |
| 4 | Commun, porteur | Le porteur finit son tour là où le moins d'adversaires peuvent venir le bousculer avant qu'il rejoue ; et quand personne ne peut l'atteindre, il garde la balle pour tirer propre au tour suivant plutôt que tirer à désavantage tout de suite. Les mots de C9 : « sans perdre la balle ». | `evaluate.ts`, `positionValue`, branche porteur : nouveau terme `carrierSafety` (nouveau poids par rôle), qui retire de la valeur par adversaire jouant avant le prochain tour du porteur et capable d'atteindre une case adjacente avec une marche, pondéré par ses chances de bousculade ; calculé une fois par décision avec `reachableCells` de chaque adversaire. Dans `chooseAction.ts`, un plan « garder » noté sur la valeur du tir propre au tour suivant, à comparer au tir à désavantage | La possession survit au bloc adverse ; au R1, neuf chances sur dix de perte deviennent zéro ; au R2, 65 % au lieu de 42 % | R1 (Tacker contre l'IA), R2 Marrow, R5 Tullin, R3 Tobb et R9 Thessa (bons par hasard) |
| 5 | Breaker, Bulwark, Trajector | Le Dash pour arriver au contact du porteur est une règle du Striker. Le Breaker va au porteur et le bouscule ; s'il ne peut pas l'atteindre en marchant, il frappe l'adversaire proche. Le Bulwark ne sort pas de sa laisse, même en Dash. | `chooseAction.ts`, `dashPlans` : le plancher `pressCarrier` réservé à un rôle qui porte un nouveau poids `pressDash` (1 Striker, 0 ailleurs) ; le plancher n'est accordé que si la marche après le Dash finit vraiment au contact (garder la case visée dans le plan) et respecte la laisse. `evaluate.ts` : `hunt × preyAdjacency` multiplié par `actionLeft` | Six Actions rendues dans ce match, 22 PV d'attaques d'opportunité évités (Cannonade R1, Tullin R4), deux battes au contact retrouvées | R1 Cannonade et Sparshot, R3 Harrow et Gullo Vantch, R4 Tullin et Flintlock |
| 6 | Striker, Trajector, Commun | Bousculer, c'est contre le porteur. Contre un autre, s'il n'y a que ça à faire, c'est une attaque. Et seule une cible légitime pour son rôle interdit le Dash. | `chooseAction.ts`, `violenceAt` : une bousculade sur un non-porteur ne vaut que si la poussée décolle un adversaire de notre porteur ou ouvre une ligne de passe (nouveau poids `shoveBystander`, proche de 0 pour Striker et Trajector) ; le drapeau `violence` du constructeur du Planner ne compte que les cibles de valeur positive pour le rôle | Treize Actions gaspillées sur dix-sept bousculades ; plus de Breaker poussé sur son propre porteur | R2, R3, R4, R5, R6, R7, R8 (liste dans les motifs) |
| 7 | Commun, Breaker d'abord | On laisse la balle au sol à un Striker ou au Trajector à deux cases seulement s'il n'a pas encore joué ce round. Sinon on la ramasse. Et jamais une ligne de Cracker avant un ballon libre. | `evaluate.ts`, `keenerMateNear` : ajouter « et ce coéquipier n'a pas joué » (`hasPlayedThisRound`) | Plus de ballon offert à l'équipe qui joue ensuite | R5 Sparshot, R8 Harrow et Gullo Vantch. Précision de C10 commune 2, à valider |
| 8 | Commun, la chaîne. **Question** | Le dernier maillon est le dernier joueur de champ à jouer : hors relance, le Bulwark ne compte pas comme maillon suivant. Un Breaker qui finit avec le ballon peut alors servir le Striker le mieux placé, qui jouera tôt au round suivant et tirera à +11. | `evaluate.ts`, `nextToPlay` : sauter un coéquipier dont le rôle porte un nouveau poids `chainLink` à 0 (Bulwark), sauf si `relaunch` s'applique | Le ballon ne meurt plus chez les Breakers ; A n'a tiré qu'une fois en dix rounds | R3 Tobb, R6 et R7 Harrow, R8 Gullo Vantch. C9 cite « le Bulwark après un but » comme dernier maillon type : je te demande si la définition peut s'étendre ainsi |
| 9 | Commun | Un relais ne vaut que si le porteur aura le droit de lui passer. | `evaluate.ts`, `outlet` et `laneCover` : zéro, ou une valeur du round suivant fortement réduite, quand cette unité joue avant le porteur dans le round et que le porteur n'est pas dernier maillon | Fin des courses sous les attaques d'opportunité vers des cases où personne ne servira | R3 Cannonade, Thessa, Ogga, Osric ; R4 Thessa (22 PV), Osric ; R7 Tacker, Yarrow, Marrow ; R10 Cannonade |
| 10 | Commun | Une attaque d'opportunité se paie à ce qu'elle coûte : un Breaker frappe plus fort qu'un Trajector, et 12 PV ne pèsent pas pareil à 20 et à 85. | `chooseAction.ts`, `Planner.exposure` : par attaquant, chance de toucher × dégâts moyens, rapportés aux PV de l'unité ; `avoidOpportunity` devient le multiplicateur ; une route qui donne une chance sérieuse d'évacuation est écartée | Moins d'évacuations : trois Strikers B perdus, dont deux sur des routes | R1 Ogga, R4 Ogga (évacué), Thessa, Tullin, R6 Marrow, Osric, Gullo Vantch, R7 Marrow, R8 Harrow, R9 Ogga |
| 11 | Commun, le plan | Un plan se tient : la passe prévue après la marche se juge depuis la case où le tour a commencé, avant comme après la marche. Le dernier maillon ne passe jamais en arrière sur une égalité. | `chooseAction.ts`, `throwsAt` : `this.here` remplacé par la case de début de tour (à garder dans l'état du tour ou à transmettre au Planner) ; pour le dernier maillon, une passe qui recule n'est offerte que si garder la balle est pire, et l'égalité se tranche par le terrain gagné avant l'identifiant | Fin des passes en arrière par ordre alphabétique et des marches pour une action qui disparaît | R2 Tobb, R1 Tobb |
| 12 | Breaker | Le Breaker qui porte ne pare pas : il fuit la ligne des Crackers comme les autres. | `evaluate.ts`, `positionValue` : quand l'unité tient le ballon, retirer `crackerPressure` avec un poids de porteur au lieu de `avoidCrackers` à 0 | 12 PV au R6 ; un porteur Breaker qui ne s'offre plus aux deux Crackers | R6 Harrow |
| 13 | Breaker | Le mur se pose là où sera le porteur : si le porteur joue après lui, le Breaker se place sur sa route vers la bouche, pas autour de sa case actuelle. | `evaluate.ts`, `block` : si le porteur n'a pas encore joué ce round, projeter sa case de huit cases vers la bouche visée, ou ne compter que le côté avant | Gullo Vantch n'aurait pas payé 25 PV pour garder une case que Harrow quittait | R6 Gullo Vantch |
| 14 | Breaker | Strikers d'abord, puis Breakers, puis Trajector, aussi pour le Cracker envoyé. | `chooseAction.ts`, `crackersAt` : multiplier par `prey[struck.role]` | Conformité littérale à C10 Breaker 4, effet faible | R2 Gullo Vantch |
| 15 | Breaker | En attaque, loin du porteur, il Dash vers lui plutôt que de frapper un retardataire, même s'il ne peut pas finir à deux cases. | `chooseAction.ts`, `dashPlans` : la condition `wall` devient « plus proche du porteur en Dash qu'en marchant », avec un plancher `block` proportionnel au terrain rattrapé | Les Breakers suivent l'attaque au lieu de rentrer chez eux | R9 Tobb |
| 16 | Trajector | Le chasseur vise la case où le Spark sera au prochain round, et ne finit jamais son tour sur le Spark sans l'avoir tenté. | `evaluate.ts`, branche `hunter` de `positionValue` : proximité de la case prédite par la dérive (cap et rebonds, même fonction que le moteur) ; pénalité pour finir sur la case du Spark sans Action (il s'échappe, écart 49) | Moyen : A joue en premier sur chaque dérive, le chasseur B doit être mieux placé que Tullin pour compter | R9 Cannonade |
| 17 | Striker. **Question** | Un Striker qui peut finir sur le Spark avec sa marche normale et son Action l'attrape, quand le Trajector de son équipe est hors jeu ou vient de le rater ce round. | `evaluate.ts` : un nouveau poids `sparkFallback`, lu seulement dans ces deux cas, qui donne à la case du Spark la valeur de la prise | Cinq tentatives à 45 % dans ce match (Tacker R6 et R7, Yarrow R6 et R7, Marrow R9). Contredit C10, « le Trajector seul », arbitrage du 2026-09-01 : je te pose la question | R6, R7, R9 |
| 18 | Striker. **Question** | Le Dash pour finir au contact du porteur sans Action (C10 Striker 6) : le garder tel quel, ou le réserver aux cas où la case gagnée coupe une passe ou une route. | `chooseAction.ts`, `dashPlans`, plancher `pressCarrier` | Mesuré dans ce match : quatorze Dash de presse finis au contact, deux attaques d'opportunité tirées sur un porteur qui part (ratées), aucune balle récupérée, et 66 PV pris en route. C'est ta ligne, je ne la change pas sans toi | R1, R3, R4, R5, R6, R9 |

### La même liste, par rôle

Chaque liste est triée par priorité, les numéros renvoient au tableau.

**Commun**

1. (1) Une case ne vaut l'action qu'elle débloque que si l'action reste : le repli après une action, et le Dodge, ne comptent plus la prise du Spark ; « marcher puis attraper » devient un plan.

2. (3) Ramasser puis lancer dans le même tour.

3. (4) Le porteur finit hors de portée des bousculeurs quand il peut, et garde la balle pour tirer propre au tour suivant quand personne ne l'atteint.

4. (2) Contre le porteur, on bouscule ; la batte ou le Cracker seulement si le coup peut évacuer.

5. (6) La bousculade d'un non-porteur ne vaut que si elle décolle un adversaire de notre porteur ou ouvre une ligne ; seule une cible légitime interdit le Dash.

6. (7) La balle au sol se laisse seulement à un coéquipier qui n'a pas encore joué.

7. (8) **Question** : le dernier maillon est le dernier joueur de champ, le Bulwark hors relance ne compte pas.

8. (9) Un relais ne vaut que si le porteur a le droit de le servir.

9. (10) L'attaque d'opportunité se paie à ses dégâts attendus rapportés aux PV.

10. (11) Le plan se tient d'une action à l'autre ; le dernier maillon ne passe pas en arrière sur une égalité.

**Trajector**

1. (1) Debout sur le Spark avec son Action, il l'attrape ; jamais un Dodge ou un Dash avant.

2. (5) Pas de Dash pour finir au contact du porteur : en défense il bouscule s'il atteint en marchant, sinon un Cracker ou rien.

3. (16) Il vise la case où le Spark sera, et ne finit jamais sur le Spark sans l'avoir tenté.

4. (6) En attaque sans la balle, pas de bousculade d'un non-porteur.

5. Rappel C12, acquis, non rediscuté : au premier tour il ne recule jamais.

**Striker**

1. (4) Porteur : il avance sans perdre la balle, et garde la balle pour un tir propre au tour suivant plutôt qu'un tir à désavantage quand personne ne peut l'atteindre.

2. (2) En défense, il bouscule le porteur ; la batte seulement si elle peut l'évacuer (le cas d'Osric à 5 PV au R8).

3. (6) Il ne bouscule pas un non-porteur ; s'il n'y a que ça, c'est une attaque.

4. (9) Il ne court pas se placer en relais d'un porteur qui ne pourra pas le servir.

5. (10) Il ne paie pas une route à travers des Breakers pour quelques points de position.

6. (17) **Question** : il attrape un Spark à portée de marche quand son Trajector est hors jeu ou vient de le rater.

7. (18) **Question** : la presse en Dash sans Action, à garder ou à restreindre.

**Breaker**

1. (2) En défense, le porteur se bouscule, il ne se frappe que si la frappe peut l'évacuer.

2. (5) Pas de Dash « sur le porteur » : s'il ne l'atteint pas en marchant, il frappe l'adversaire proche, Strikers d'abord ; finir à côté d'une proie ne vaut rien sans Action.

3. (7) Il ne laisse la balle au sol qu'à un Striker ou au Trajector qui n'a pas joué ; sinon il la ramasse, et jamais une ligne de Cracker avant un ballon libre.

4. (12) Porteur, il fuit la ligne des Crackers.

5. (13) Le mur se pose sur la route du porteur s'il n'a pas encore joué.

6. (15) En attaque, loin du porteur, il Dash vers lui plutôt que de frapper un retardataire.

7. (14) Strikers d'abord aussi pour le Cracker.

**Bulwark**

1. (5) La laisse tient pour tout plan, Dash compris : jamais de Dash de presse hors de ses quatre cases.

2. Le reste a été juste dans ce match : relance du R2 conforme à C10 Bulwark 2, plantage, blocages. Rien d'autre à changer.

## (c) Ce que je n'ai pas pu trancher depuis le fichier

1. **Pourquoi la frappe de Cracker prévue par Tobb au R1 a disparu une fois sur place.** Le plan de tête la notait 122 depuis (1, 23) ; arrivé en (1, 23), seule « dégager le Cracker » restait. Soit `battedCrackerRun` est calculé sur l'état où Tobb est encore en (8, 30), soit les directions offertes dépendent de la case du frappeur. Il faut le rejouer en test.

2. **L'échelle donne la première main à l'équipe humaine sur chaque dérive du Spark et sur chaque Cracker renaissant** (écart 51 : le Spark, puis l'équipe qui a un humain). Dans ce match, 40 points de Spark et 58 contre 6 en dégâts de Cracker. Je ne sais pas séparer l'effet de l'ordre de celui des défauts d'IA sur une seule partie. C'est une règle, pas un comportement : je ne propose rien, mais un auto-jeu avec un camp désigné « humain » des deux côtés à tour de rôle le mesurerait.

3. **Les intercepteurs des passes du R2 (Tacker) et du R3 (Sparshot).** Le plan les donne à zéro alors que des adversaires étaient au contact du lanceur ; je n'ai pas pu vérifier sur quelles cases `lineTo` fait passer le vol, donc si l'exemption de la première case (écart 48) suffit à l'expliquer.

4. **Ce qui arrive quand la dérive du Spark finit sur une unité**, et si une unité peut lui barrer une case. Ça décide de l'intérêt réel de l'ajustement 16.

5. **Ce qui a tiré Tobb vers sa propre bouche au R9** (huit cases jusqu'en (4, 42) pour 0,6 point). Probablement `screen` ou `guardFurnace`, mais le fichier ne donne que la somme.

6. **La dérive nulle du Spark au R6** (« entre en (2, 19) », puis « dérive en (2, 19) »). Un rebond qui le ramène sur sa case, ou autre chose : je ne peux pas le dire.

7. **Les probabilités de bousculade** sont celles de `contestChance` sur Athlétisme contre le meilleur de l'Athlétisme ou des Acrobaties de la cible ; si le moteur résout autrement, mes pourcentages des R1, R5, R6 et R9 bougent de quelques points, pas les conclusions.

8. **Trois questions pour toi**, déjà posées dans le tableau : la définition du dernier maillon (8), le Spark pour un Striker à portée de marche (17), et la presse en Dash sans Action du Striker (18).
