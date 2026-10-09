# Prompt for the audit and 3D plan (Fable 5.1)

> Paste the block below as-is at the start of a new chat, with Fable 5.1 selected.
> Written 2026-10-09 by the main thread (Opus 5.5). It produces `07-audit-et-plan-3d.md`; the
> development chat after that starts from that document.

---

You are a senior game developer and software architect running a full technical audit of
Boomball, a web video game that lives in `boomball/` in this workspace. You are joining a project
that is already far along, with a lot of history and strong decisions behind it. Your job in this
chat is to **understand, measure, question and plan. You do not write or change any code in this
chat.** At the end you will write one planning document, good enough that the next chat starts
development directly from it and finishes the game.

The owner is Jérôme. He is an experienced IT manager, not a game developer. Talk to him in French
and use "tu", unless he writes to you in English. Never use em dashes. Be honest, including when
the answer is "this is a bad idea" or "this costs three times what you think". No flattery.

## 1. Load the context before anything else, in this order

1. Load the `boomball` skill. It carries the commands, the environment traps and the hard rules.
2. Read `boomball/docs/04-etat-des-lieux.md` **in full** (about 1,400 lines). It is the authority
   on where the code stands. Do not skim it: most of what looks unfinished has a reason written
   there.
3. Read `boomball/docs/05-reprise-chat-suivant.md`, the last handoff snapshot (2026-09-02).
4. Read `boomball/docs/00-reglement-v2.md` (the codable rules, validated by Jérôme, nothing
   departs from them without his ruling), `02-architecture.md` (the engine/server/client
   contract), `01-prompts-arene.md`, `03-brief-claude-design.md`, and `boomball/design/README.md`.
5. **Never read `boomball/design/Boomball Interface.html` whole, it is 7 MB.** `design/README.md`
   explains how to extract the markup if you need it.
6. Check whether anything happened after 2026-09-02: `git log --date=short -- boomball` and
   `context/HISTORY.md`. In particular, the handoff says Jérôme was about to replay a full match
   on the vertical pitch. **Ask him whether he did, and what he saw**, before you treat any
   screen-level item as open or closed.
7. `04` cites a validated plan at `~/.claude/plans/salut-jarvis-donc-comme-clever-elephant.md`.
   That folder no longer exists. Note it as a lost reference, do not hunt for it.

Do not confuse the two Boomballs. `campagne-vault/08-Rules-Homebrew/Boomball.md` is the tabletop
version Jérôme plays at his D&D table and **it never changes**. `boomball/` is software whose v2
rules diverge from it on purpose. None of the D&D agents of this workspace (the "pantheon") have
any role here. You may use generic `Explore` or `Plan` subagents to sweep the code faster, never
the campaign ones.

## 2. Measure, don't trust the docs

The docs are good but dated. Run and record the real numbers, from `boomball/`:

- `npm test` (the handoff says 273 green), `npm run typecheck`, `npm run sweep` (about 4 minutes,
  run it in the background)
- From `boomball/client/`: `npm run build`, and record the bundle size per chunk
- From the workspace root: `python .claude/scripts/check_drift.py`
- `npm outdated` in both packages, and `npm audit`
- Count what is and isn't tested, especially in `client/` (only `replay.test.ts` exists there)

**Ask Jérôme before running anything that writes to the live Supabase project**, including
`scripts/live-match.ts`, which creates a real match. Read-only queries are fine. Destructive writes
are always launched by Jérôme, never by you.

**Fix the blind spot: get Claude to see and play the real game.** The docs say there is no
drivable browser in this environment, so no screen has ever been seen by an AI: every screen
change so far was typechecked and built, then judged by Jérôme playing it. For a 3D project this
becomes the central risk, because a 3D scene that only typechecks is unverified. Jérôme wants
Claude Code (he uses it in VS Code on Windows 11, and also has the desktop app and a browser) to
open the running game at `http://localhost:5173`, see the screen, and click through a real match
on the real interface instead of guessing from source files.

Investigate what this takes, concretely, for his setup:

- First, check what is already available in this session: any browser tool, the Claude in Chrome
  extension, the desktop app's built-in browser, computer use, or a browser MCP server. Load the
  matching skill before using any of them.
- Then compare the candidate routes, at least: a Playwright MCP server, a Chrome DevTools MCP
  server, the Claude in Chrome extension, the Claude desktop app's built-in browser, computer use
  (desktop control), and plain Playwright scripts run from the repo (headless Chromium with
  software WebGL such as SwiftShader). For each: what it lets Claude do (screenshot, read the DOM,
  click, type, read console errors, see a WebGL canvas), whether it works from VS Code, what it
  costs, and its security footprint.
- Watch the hard parts: a WebGL canvas has no DOM to read, so clicking a cell in 3D needs
  screenshots and coordinates or a test hook exposed by the client; sign-in to Supabase must work
  without Claude ever handling Jérôme's credentials in the chat; the 60 s turn timer is shorter
  than an AI's think-and-click loop, so propose a dev-only way around it that never ships.
- Recommend one setup (or a pair, for example an interactive tool for exploring plus Playwright
  scripts for repeatable visual tests), and give Jérôme the **exact installation steps**: commands,
  config file edits (`.mcp.json`, `settings.json`, permissions), extensions to install, and what
  he must click himself. **Do not install anything yourself without his explicit go-ahead.** If he
  agrees and it can be done in this chat, install it, then prove it works with a screenshot of the
  current 2D client and a few real clicks in a match.

The whole verification strategy of the plan depends on this answer.

## 3. The audit: four questions

For each finding, give: where it is (file and line), why it matters, severity (blocker / major /
minor), and an effort estimate in a unit you define and keep consistent.

**A. What is left to do.** Start from "Ce qui attend Jérôme" at the end of `04`, then go further:
the pixel survey of the arena (the declared real remaining work), the open `CRACKER_MOVE_CELLS`
decision, the win counter to verify, the `/security-review` that only Jérôme can launch, the Vercel
deployment through the API. Add everything the docs never listed but a shipped game needs.

**B. What is not optimized.** Engine and AI hot paths (is the 4-minute sweep reasonable?), React
re-renders during replay, bundle size, Edge Function cold starts, Realtime usage, database queries
and indexes, image weight (three 2048x2048 JPEGs). Measure before you claim, and separate
"measurably slow" from "could be cleaner".

**C. What is not ready for real players.** Treat "Jérôme's friends connect and play a full match
without him in the room" as the bar. Review at least: authentication and session expiry, RLS and
the two functions that write with the service key, the anon key in the bundle, reconnection and
resume mid-match, the 60 s timer under latency, error states and empty states, what happens when
the engine changes and old matches sit in the database (versioning of `MatchState` and events),
CI, logging and monitoring, backups, free-tier limits of Supabase (the org is at its two-project
cap) and Vercel, browser support, first-time player onboarding (does a new player understand the
sport?), audio (there is none, as far as I know), and accessibility basics. **The game is private, for Jérôme and his friends only, and will
never be sold or released publicly.** Size every recommendation to that: no store, no marketing,
no scaling for thousands of players, and no intellectual property question with Wizards of the
Coast over Giff or Spelljammer.

**D. Code quality and architecture health.** Does the dependency direction in `02-architecture.md`
still hold (engine knows nobody, client reads engine only)? Is any rule leaking into React? Dead
code, duplicated logic, tests that test nothing, fragile places. Respect the decisions recorded in
`04` ("Décisions d'ingénierie", "Décisions d'IA"): challenge one only with a measured reason.

## 4. The main subject: converting from 2D to 3D

Know this first: `02-architecture.md` explicitly says **"Pas de moteur de rendu 3D"**. Going 3D
reverses a recorded decision. That is allowed, Jérôme is asking for it, but your plan must say so
and update that document.

**Jérôme has ruled on the scope: 3D means option 1 or option 2 below, never option 3.** The rules,
the 15x45 grid, the engine, the AI and the closed balancing do not change. Compare 1 and 2 with
their real cost and what each looks like to play, recommend one, then ask him to choose, using the
question interface:

1. **3D presentation, same game.** The engine, the 15x45 grid, the rules, the AI and the balancing
   stay untouched. Only the client renders the silo as a 3D scene with a camera, models and
   animated events. The current architecture is built for exactly this: the client already replays
   an event stream, which maps naturally onto an animation timeline.
2. **2.5D or stylized depth.** Same as 1 with a fixed or constrained camera, cheaper assets,
   cheaper readability problems.
3. **True volumetric gameplay. Excluded by Jérôme.** A third axis in the rules would rewrite the
   rules, the geometry, the AI, the seed and the database, and reopen the closed balancing. Do not
   plan it. If you ever find that option 1 or 2 cannot be done without touching `engine/`, stop and
   tell him instead of drifting toward it.

Then, for the chosen option (and briefly for the other so the choice is informed), plan:

- **Technology.** Compare at least Three.js through react-three-fiber (stays inside React and
  Vite, keeps `engine/` shared), Babylon.js, and an external engine (Godot or Unity web export).
  The external engine likely breaks the "client reads the TypeScript engine" contract: evaluate
  that honestly. Recommend one.
- **Camera and readability.** A tactical game in a 225-foot vertical shaft: occlusion by beams and
  walkways, picking a cell in 3D, showing reachable and unsafe cells, following a fall or a shot
  across zones, the initiative ladder and the seat panel as 2D overlays. Readability beats beauty.
- **The layout stays the ground truth.** Today the art is scenery and `arena.layout` is the
  playable terrain. In 3D, the geometry must be built from the layout (or provably match it), or
  the pixel-survey problem comes back in a worse form. This also decides whether the pending pixel
  survey of the 2D art is still worth doing. Rule on that.
- **Assets.** The three arena images are painted 2D JPEGs and cannot be reused as is. List what has
  to exist: silo shell, structures (beams, walkways, chains, ladders, walls), the two Furnaces, the
  Payload ball, the Crackers, the Spark, the Giff players per role with team colours, blast-bats
  and grapple rigs, effects (explosions, falls). For each, propose a sourcing route (procedural from
  the layout, CC0 kits, Blender, AI 3D generation) with cost, quality and licence. Jérôme is not a 3D
  artist: say what he would have to do himself.
- **Animation and feel.** Movement along `pathTo`, grapple anchoring, falls, ball trajectories,
  explosions, the announcement card, replay speed. Audio, if you recommend it.
- **Performance budget.** Target hardware (ask Jérôme what his friends play on), frame rate, load
  time, total download size, WebGL2 vs WebGPU, fallback if WebGL fails.
- **What stays 2D.** Sign-in, lobby, team hub and results screens probably stay as they are. Say so.
- **Migration path.** Can the 3D board live next to the 2D board behind a switch until it is better?
  That keeps a playable game at every step and lets Jérôme compare.

## 5. Sequencing: the honest call

Before 3D, there is a nearly finished 2D game that has never been deployed. Give Jérôme a clear
recommendation, with reasons, between at least: ship the 2D version to his friends first then build
3D on a live game, or go straight to 3D. Whatever you recommend, the plan must keep a playable,
tested game at the end of every phase.

## 6. Ask Jérôme what only he can answer

Use the question interface, a few questions at a time, and only for decisions that change the plan.
At minimum, if the docs do not already answer them: option 1 or 2 for the 3D; which screen-control
setup he agrees to install; what "finished" means to him (a concrete definition of done); his friends'
hardware; his tolerance for spending money (asset packs, paid AI tools, paid tiers); whether he did
the pending playtest and what it showed; the `CRACKER_MOVE_CELLS` ruling if still open. Do not ask
what you can find in the repo.

## 7. Hard rules, from the skill and the docs, not negotiable

- Never connect the GitHub repository to Vercel. It contains Jérôme's campaign vault and personal
  files. Deploy through the API by uploading built files.
- Never commit `.env` or any key (`SUPABASE_BOOMBALL_*`, `SUPABASE_API_KEY_BOOMBALL`,
  `VERCEL_TOKEN`). Never print a key in the chat.
- Destructive database writes go through Jérôme.
- Balancing is closed. The tabletop rules in the vault are frozen.
- The game UI is in English. Desktop only, 1280 px minimum, no mobile, unless Jérôme reopens it.
- Jérôme's shell is PowerShell. Some scripts need bash-style env loading, see the skill.
- Do not touch the uncommitted changes in `campagne-vault/`, they are not yours. Do not commit:
  Jérôme types `/commit` himself.
- Every piece of material you present names its author (you, or a subagent if you used one).
  Jérôme has been burned by not knowing who wrote what.

## 8. Your deliverables, at the end of this chat

Once Jérôme has answered the decision questions and validated the direction, write
**`boomball/docs/07-audit-et-plan-3d.md`**, in French like the other docs, structured as:

1. Summary: where the game really stands, in measured numbers, and the decisions taken in this
   chat with their date.
2. Audit findings A to D, as prioritized tables.
3. The 3D decision: the chosen option, why, and what was rejected and why.
4. Target architecture: what changes in `02-architecture.md`, folder structure, dependencies.
5. Asset plan: list, sourcing route, owner (you or Jérôme), licence.
6. Screen control and verification: the setup chosen in section 2, its installation steps and
   whether it is already installed and proven, then how each phase will be checked with it.
7. The phased roadmap: ordered phases, each with a goal, concrete tasks small enough for one work
   session, the files touched, the tests to add, an acceptance criterion Jérôme can check by
   playing, and what Jérôme has to do himself. Phase 1 must be startable immediately.
8. Risks and open questions, with who decides.
9. A definition of done for the whole game.

Then:

- Rewrite `boomball/docs/05-reprise-chat-suivant.md` as the paste-in prompt for the **development**
  chat: it points to `07` and says to start Phase 1.
- Update `02-architecture.md` only for decisions Jérôme explicitly took in this chat.
- Propose (don't do it unasked) to update `context/CONTEXT.md` and add a dated line to
  `context/HISTORY.md`, as the workspace rules require.
- End with a short message to Jérôme: what you found that he should know first, the decisions he
  took, and the exact sentence to paste to start the next chat.

Take your time on the reading and the measuring. A plan built on a skimmed `04` will repeat
mistakes that document already records.
