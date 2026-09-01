# Brief Claude Design

> Deux prompts, dans l'ordre. Le premier pose l'identité visuelle **et** l'écran de match, qui
> reçoit l'essentiel de l'effort. Le second habille les quatre écrans de coque en reprenant ce que
> le premier a établi. Même méthode que pour les images d'arène : on construit la pièce la plus
> caractéristique en premier, elle sert ensuite de référence.

## Deux contraintes qui ne se négocient pas

**L'interface se pose sur une image sombre, chargée et très détaillée.** Le fond de l'arène est un
dessin d'acier riveté, rouille et lumière orange. Aucun panneau ne peut donc être translucide sur
l'arène : les fonds d'interface sont opaques ou fortement floutés, sinon plus rien ne se lit.

**Les couleurs d'équipe ne peuvent pas être orange ni rouge.** Ces deux teintes appartiennent déjà
aux Furnaces, à la fosse et aux explosions. Cyan pour l'équipe des joueurs, magenta pour la maison :
la paire reste distinguable pour un daltonien, ce que rouge contre vert ne fait pas.

---

## Prompt 1, identité visuelle et écran de match

Joindre **deux** images, dans cet ordre : `assets/arena/zone-2-scramble.jpeg`, puis
`assets/arena/zone-3-summit.jpeg`. Pas la zone 1, elle n'ajoute rien que la zone 2 ne dise déjà et
c'est la seule en 1024.

```
Image 1 is the arena background this interface sits on top of. It is finished art: never redesign, redraw or reinterpret it. Your work is the interface layer above it. Use it to judge how dark and how opaque every panel must be, and how a token must be ringed to stay readable against riveted steel and rust. Image 2 is the brightest section of the same arena, with hot furnace doors and warm lanterns. It is the hardest case this interface must survive: check every panel, token and colour against it as well.

Design a desktop game interface for Boomball, a turn-based tactical sport played by the Giff: a militaristic, gunpowder-obsessed warrior culture with a naval-artillery regimental tradition. The sport is violent, explosive and ceremonial. Seven players a side fly on mechanical grapple-rigs inside a vast vertical steel silo, hitting an explosive ball with blast-bats.

Establish a visual identity first, then apply it to one screen.

VISUAL IDENTITY. Dark industrial military. Riveted steel, blackened brass, oxidised copper, hazard stripes, stencilled regimental lettering, rope and chain motifs, powder-horn and cannon heraldry. Headings in a condensed stencil or military sans; numbers and data in a clean, highly legible sans, because this interface is read under a countdown. Deliver a palette, a type scale, role icons for the four positions (Striker, Breaker, Bulwark, Trajector), ordnance icons for the Payload, the Crackers and the Spark, and a team crest treatment.

Colour rules that are fixed. The playing field art beneath the interface is dark steel and rust with hot orange light sources, so orange and red are reserved for the arena and for damage, never for team identity. The player team is cyan. The opposing team is magenta. The Spark is a bright yellow-white, brighter than anything else on screen, because catching it ends the match.

THE MATCH SCREEN. Desktop only, minimum 1280 by 800, no mobile or tablet layout. Five regions.

A top bar carrying the player team's score on the left, the opposing score on the right, the round counter in the centre reading "Round 3 of 10", and a 60-second turn countdown that is calm at first and grows urgent near zero.

A left rail holding the initiative ladder: a vertical list of slots in descending order, current slot highlighted, spent slots dimmed. A slot is either a single player portrait, or a block of two to four portraits resolving together, or a hazard slot for the Crackers, or a hazard slot for the Spark. The ladder must make it obvious at a glance when the player acts again.

The centre is the arena viewport: a square field of 15 by 15 cells over a dark industrial background image, with a thin strip of the zone above and a thin strip of the zone below, both dimmed and compressed, so the player feels the silo continue vertically. Cell grid lines are faint. Show unit tokens as circular portraits ringed in their team colour with a small hit-point arc. Show the reachable cells for the selected unit as a soft highlight, and cells where a unit cannot end its turn as visibly unsafe.

A right rail with two stacked panels. Above, the player team roster: seven rows, each with role icon, name, a hit-point bar, and a clear marker for units that are evacuated and waiting to return. Below, the ally order panel: three large buttons reading "Call for the pass", "Mark a target" and "Hold this zone", which the player aims at a team-mate or a cell.

A bottom bar for the selected unit: its portrait and hit points on the left, then the action buttons, then its remaining movement in feet. Actions are Attack, Pass, Shoot at the Furnace, Bat a Cracker, Shove, Catch the Spark, Dodge, Dash and Disengage. Show three small pips for what the unit has left this turn: action, reaction, object interaction. Unavailable actions are visibly disabled rather than hidden, so the player learns the shape of a turn.

Also design a dice result element: a compact overlay showing the die roll, the bonus, the total, and the target number it was measured against, so a hit or a miss is never mysterious.

Deliver artboards for the full match screen, the initiative ladder in detail, the bottom action bar in detail, and the identity sheet.
```

---

## Prompt 2, les quatre écrans de coque

À lancer une fois le premier validé, sur le même canvas pour que l'identité se propage.

```
Continue the Boomball desktop interface established on this canvas. Reuse its palette, typography, iconography and panel treatment exactly. Desktop only, minimum 1280 by 800, no mobile layout. Design four more screens.

SIGN IN. Minimal. The Boomball crest, a single sign-in action, and one line of flavour naming the sport as the tradition of the Giff. Nothing else.

TEAM HUB. The player's team as a regimental roster sheet. The team crest and name, its current Tier shown as Rookie, Veteran or Star, and a progress element reading the wins toward the next Tier: three wins promote to Veteran, six promote to Star. Below, the seven starters as cards with role icon, name and statistics, and beside them three substitute cards on a visibly separate bench. Make the bench read as finite and precious, because when it empties the team plays short. The player's own player card is renameable in place: show the edit affordance on that one card and not on the others.

LOBBY. One prominent action to start a solo match immediately, with no waiting room. Beside it, a way to invite up to two friends, showing up to three seats with their occupant or an empty state. Each seat carries two choices, and both matter. First, a name field where the player types the name of the Giff they will play, pre-filled with the name they used last time and editable, never a name assigned for them. Second, a position, and the panel must show availability honestly: three Striker slots, two Breaker slots, but only one Bulwark and only one Trajector, so a taken unique position reads as taken. Everyone else on the field, team-mates and opponents alike, is named by the house, so the named seats must feel like the ones that belong to people. A ready indicator per seat, and a start control that is disabled until every seat is named, positioned and ready.

RESULTS. The final score large, and whether the match was won on the Payload or ended instantly by catching the Spark, because those are two different kinds of victory and should not look alike. Then a short list of match highlights: goals scored, Crackers redirected, units evacuated. Then the team's win counter advancing, and a promotion moment if this win crossed a Tier threshold. One clear action to play again.

Deliver one artboard per screen, plus the empty and full states of the lobby seat panel.
```

---

## Ce qui n'est pas dans le brief, et pourquoi

Pas d'écran de spectateur, pas de statistiques par joueur, pas de classement, pas de PvP. Ils sont
hors MVP et les demander maintenant diluerait l'effort sur l'écran de match, qui est le seul que
les joueurs regarderont pendant une heure.
