# Lobby Clarity / Polish Pass — Architecture Design

## 1. Goal
This feature improves the pre-match lobby so players can understand the room state at a glance, feel the game's retro-arcade identity before gameplay begins, and move through the share/wait/ready flow without confusion.

The implementation should stay **additive to the existing room/lobby architecture**:
- keep the current server-authoritative room lifecycle
- keep existing ready, countdown, reconnect, and rematch logic intact
- avoid introducing new backend phases unless a UI-only presentation requirement cannot be met otherwise

## 2. Existing baseline
The current lobby is already functional and backed by stable contracts:
- `public/index.html` exposes a lobby screen with room code, message, players list, and ready button
- `public/app.js` renders `lobby:state` payloads into the lobby view and derives copy from:
  - room occupancy
  - ready state
  - reconnect state
  - countdown/game phases
- `src/server/roomService.ts` already publishes authoritative lobby information including:
  - room code
  - player list
  - ready states
  - reconnect/reservation state
  - derived `message`
  - `allPlayersPresent`, `allReady`, `canStart`
- `public/styles.css` already contains the retro-arcade design language used elsewhere in the app

Because the current data model is already sufficient for most of the requested polish, the architecture should favor:
- **layout refactor in the client markup/CSS**
- **clearer lobby rendering logic**
- **copy generation refinements**
- **small contract additions only where they materially improve UI clarity**

## 3. Product intent translated into architecture
The spec prioritizes the following lobby information in order:
1. room code
2. player names
3. ready status
4. what happens next

The lobby should therefore be reorganized around a stronger hierarchy:
- **hero/brand block** first for identity and polish
- **room-code/share block** second for the primary task when waiting
- **player status block** third for occupancy and ready readability
- **next-step CTA block** fourth for explicit action guidance
- **lightweight ambient motion** behind or around the above, never competing with them

## 4. Proposed UI architecture

### 4.1 Lobby composition
Refactor the lobby screen into four semantic regions inside the existing lobby screen container.

#### A. Brand marquee
A new top section that visually establishes the retro-arcade tone.

Contents:
- logo/emblem treatment (text + shape treatment; no bespoke asset pipeline required)
- short lobby title such as `Match Lobby` / `Arena Lobby`
- compact support copy like `Share the code, ready up, launch when both players are set`

Implementation direction:
- render as HTML/CSS treatment rather than a shipped image asset
- support decorative glow/grid/chrome effects entirely in CSS
- allow future replacement with a real SVG/logo without restructuring the screen

#### B. Room code command card
A stronger, central room-code module.

Contents:
- large room code display
- copy/share button
- short guidance copy that adapts by state:
  - waiting for second player
  - second player joined, ready flow active
  - reconnect window active

This becomes the highest-salience utility card in the lobby.

#### C. Player readiness rail
A dedicated two-slot presentation for player identity and readiness.

Contents per player card:
- display name
- persistent slot label (`Player 1`, `Player 2`)
- “You” treatment when applicable
- clear occupancy/connected/reserved state
- clear ready/unready state badge

The current player list can stay structurally similar, but the visual treatment should become more deliberate and scan-friendly:
- stronger separation between identity and state
- explicit state badge/chip rather than burying status in a sentence
- consistent empty-slot treatment
- duplicate-name-safe fallback using existing display name conventions

#### D. Next-step action panel
A bottom action band clarifying what happens next and what the player should do.

Contents:
- the primary ready/unready button
- a one-line “what happens next” explainer derived from authoritative lobby state
- optional secondary supportive copy for sharing/waiting/reconnect edge cases

This panel should answer, at all times:
- what can I do now?
- what is blocking the match?
- when will it start?

### 4.2 State-driven information hierarchy
The same layout remains, but emphasis changes by state.

#### Waiting for second player
Emphasis order:
1. room code/share
2. waiting copy
3. your player card
4. empty slot card
5. ready CTA present but visually de-emphasized if it cannot advance the match alone

#### Both players present, one or more not ready
Emphasis order:
1. player readiness rail
2. ready CTA
3. room code/share as secondary utility
4. next-step copy: both players must be ready

#### Countdown / starting
The lobby should gracefully hand off to gameplay without abrupt information loss.
- preserve the branded shell/theme
- show countdown status prominently
- prevent conflicting CTA states

#### Reconnect reservation active
Reconnect messaging temporarily outranks generic waiting copy.
- reserved/disconnected player card gets a special state treatment
- next-step panel explains the reconnect window
- room code remains visible but secondary

## 5. Client implementation plan

### 5.1 Markup changes (`public/index.html`)
Refactor the lobby screen markup from a flat card into named sub-sections.

Recommended structure:
- `#lobbyBrand`
- `#roomCodeCard`
- `#lobbyStatusSummary`
- `#players`
- `#lobbyActionPanel`
- keep `#readyButton`, but place it inside the action panel

Suggested DOM additions:
- emblem/logo container
- primary lobby heading/subheading
- dedicated next-step element separate from generic `lobbyMessage`
- optional copy/share helper text target

Important constraint:
- preserve existing IDs where practical to limit JS churn
- only introduce new IDs/classes where hierarchy requires a new rendering target

### 5.2 Lobby rendering changes (`public/app.js`)
The current `renderLobby(state)` should be split into smaller derivation helpers so the UI can separately render:
- headline status
- room-code helper copy
- player-card state badges
- CTA label/state
- decorative state class names

Recommended helper layer:
- `deriveLobbyPresentation(state)`
- `getLobbyHeroCopy(state)`
- `getLobbyNextStepCopy(state)`
- `getPlayerCardView(player, state)`

This avoids scattering copy logic across DOM mutations and makes QA easier.

#### Presentation model
Add a client-only derived view model with fields such as:
- `mode`: `waiting` | `ready-check` | `starting` | `reconnect`
- `heroTitle`
- `heroSubtitle`
- `roomCodeHint`
- `nextStepLabel`
- `ctaLabel`
- `ctaTone`
- `showSharePrompt`
- `showReadyPrompt`

This does **not** need to be sent by the server initially; it can be derived from existing payload fields unless implementation finds repeated logic too brittle.

### 5.3 Styling changes (`public/styles.css`)
The CSS work is substantial but still additive.

Primary styling tasks:
- elevate lobby card hierarchy with stronger spacing and grouping
- create a reusable emblem/logo style using gradients, borders, glow, and optional pseudo-elements
- give room-code card “arcade command center” emphasis
- convert player cards into clearer status tiles
- create state badge variants:
  - waiting
  - joined
  - ready
  - disconnected/reserved
- refine the ready CTA so it clearly shifts between:
  - `Ready up`
  - `Unready`
  - waiting for both players
- add subtle ambient motion using transform/opacity/background-position animations only

Motion guidance:
- no layout-thrashing animations
- avoid constant high-contrast flashing
- prefer soft pulse, scanline drift, glow breathing, or tiny floating accents
- honor `prefers-reduced-motion` by disabling non-essential animation

## 6. Server / contract impact

## 6.1 What can remain unchanged
Most of the requested feature can ship without changing the authoritative room state machine.
Existing fields already cover:
- room code
- player names and labels
- ready state
- occupancy and connection/reservation state
- current lobby/game phase
- reconnect detail
- generic message text

Therefore:
- **no new Socket.IO event type is required**
- **no new room lifecycle phase is required**
- **no change to ready logic, countdown logic, or reconnect rules is required**

## 6.2 Recommended small contract additions
Although not strictly required, two additions would simplify a cleaner implementation and reduce client-side heuristic copy logic.

### Addition A: `LobbyStatePayload.nextStep`
Server-computed next-step summary.

Purpose:
- provides a single authoritative statement of what happens next
- reduces duplication between `roomService.ts` and client copy derivation
- helps keep reconnect/waiting/ready copy consistent across lobby/rematch/game shells

Suggested values:
- `share-code`
- `wait-for-player`
- `ready-up`
- `wait-for-opponent-ready`
- `starting`
- `reconnect-wait`

### Addition B: `LobbyStatePayload.shareHint`
Optional helper copy specifically for the room-code/share card.

Purpose:
- lets the room code card show targeted support copy without parsing generic status strings
- keeps room-code messaging authoritative and easy to test

If the team wants to minimize contract churn, both fields can be postponed and implemented as client-only derivation in phase 1.

## 7. Copy architecture
Copy should be generated from state, not hardcoded per element.

Recommended copy buckets:
- **hero copy**: thematic but brief
- **room-code helper copy**: share/wait-oriented
- **next-step copy**: explicit action/outcome
- **player-state labels**: short badges

Examples by state:

### Alone in room
- hero: `Arena Lobby`
- room-code helper: `Share this code so a second player can join.`
- next-step: `You’re in. The match starts after another player joins and both players ready up.`

### Both joined, one not ready
- room-code helper: `Both players are here.`
- next-step: `Press Ready when you’re set. The match launches automatically when both players are ready.`

### You ready, opponent not ready
- next-step: `You’re ready. Waiting for the other player to ready up.`

### Reconnect active
- next-step: `<Player display name> can still return. The slot is reserved until the reconnect window ends.`

## 8. Responsiveness and mobile constraints
This feature must preserve the gains from the existing mobile-support work.

Design constraints:
- room code and CTA must stay within the first viewport on typical phone portrait where possible
- player cards stack vertically on narrow viewports
- no decorative layer may reduce text contrast or tap target clarity
- copy/share and ready buttons must remain tap-friendly
- the brand marquee must collapse cleanly and never push critical controls below the fold unnecessarily

Recommended mobile behavior:
- brand block becomes compact, still visible but shorter
- room code remains high on the page
- player cards stay one-column
- action panel remains full-width and prominent
- animation reduces in intensity on small screens

## 9. Accessibility / usability requirements
Even though this is a polish pass, implementation should maintain core usability discipline.

Required considerations:
- preserve semantic buttons for copy/share and ready
- ensure color is not the only readiness indicator
- keep text contrast high on neon/glow backgrounds
- provide `prefers-reduced-motion` handling
- keep status language short and literal
- ensure reserved/disconnected states are distinguishable from empty waiting states

## 10. Risks and mitigations

### Risk 1: Over-styled lobby hurts readability
Mitigation:
- use decorative chrome only in the brand and container layers
- keep room code, players, and CTA on calm card surfaces

### Risk 2: Client copy logic becomes fragmented
Mitigation:
- centralize presentation derivation in helper functions
- optionally add `nextStep`/`shareHint` to lobby payload

### Risk 3: Mobile regression due to new hierarchy
Mitigation:
- preserve current responsive breakpoints
- ship markup that degrades to a single column naturally
- verify portrait mobile with both one-player and two-player lobby states

### Risk 4: Reconnect states become visually ambiguous
Mitigation:
- reserve a unique badge/state style for `reserved` and `temporarily offline`
- keep reconnect countdown copy in the next-step panel

## 11. Testing expectations for implementation
The dev agent should verify at minimum:
1. one-player waiting lobby on desktop
2. two-player lobby before either player is ready
3. local player ready / opponent not ready
4. both players ready and transition into countdown
5. reconnect reservation state in lobby
6. duplicate-name display remains distinguishable
7. phone portrait layout keeps room code + CTA clear
8. reduced-motion users do not get ambient animation

## 12. Recommended implementation order
1. Refactor lobby markup into semantic sections without changing behavior.
2. Introduce client-side presentation helpers and migrate `renderLobby()` to them.
3. Restyle hierarchy: room code, player cards, CTA, brand marquee.
4. Add lightweight decorative motion and reduced-motion guardrails.
5. If needed, add optional `nextStep` / `shareHint` contract fields to simplify copy consistency.
6. Regression-test lobby, countdown handoff, reconnect, and mobile layouts.

## 13. Out of scope
This feature should not:
- change room creation/join rules
- change ready semantics or match-start conditions
- introduce a real asset/logo pipeline
- alter gameplay HUD contracts beyond what is needed for the lobby handoff
- redesign the whole app beyond keeping the lobby visually coherent with the current arcade direction
