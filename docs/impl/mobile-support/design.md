# Architecture Design: Mobile Support

## Scope
This feature adds mobile-friendly play to the existing browser-based multiplayer Snake app without changing core game rules or server authority. The current stack is already suitable for this work:
- server-authoritative room + gameplay state via Socket.IO
- vanilla client in `public/index.html`, `public/app.js`, and `public/styles.css`
- board-first gameplay shell already present for desktop/tablet
- existing keyboard input path via `player:direction:set`
- existing audio unlock/toggle behavior in the client

Mobile support should therefore be implemented primarily as a **responsive presentation + input layer enhancement** on top of the existing app.

## Goals
1. Make create/join, lobby, gameplay, result, and rematch screens usable on phones and tablets.
2. Prefer portrait layout on phones while still supporting landscape.
3. Add touch controls via both swipe gestures and on-screen directional buttons.
4. Preserve current desktop keyboard behavior and current server gameplay rules.
5. Preserve current sound semantics, including first-interaction unlock constraints.

## Non-goals
- Native wrappers or app-store packaging
- Offline behavior
- Haptics
- Rewriting gameplay transport
- Server-side mobile detection or orientation-specific server logic

## Current architecture snapshot
The current frontend has three top-level screens:
- `entry`
- `lobby`
- `gameplay`

The gameplay screen uses a three-column shell:
- left rail: match/rematch/player 1 info
- center: post-game banner + board + message
- right rail: room meta/player 2 info

Important existing properties:
- The board is rendered as a square `30 x 30` CSS grid in `.game-stage` / `.board`.
- Keyboard input is captured globally in `document.addEventListener('keydown', ...)` and sent through `socket.emit('player:direction:set', { direction })`.
- Post-game/rematch UI already exists in both a side card and a prominent banner.
- Audio is client-side via `audioManager`, with first-interaction unlock and graceful failure.

This means mobile support does **not** need a new application architecture. It needs a more adaptive layout system and a local touch-input subsystem.

## Design principles

### 1. Server remains authoritative
Mobile input must feed the same `player:direction:set` event already used by keyboard play. Gesture/button input should be translated into the same direction values (`up`, `down`, `left`, `right`) and still rely on the server's existing direction validation.

### 2. Mobile is a progressive enhancement
Desktop remains unchanged in behavior:
- keyboard support stays enabled
- desktop layout keeps the current board-first shell
- mobile-only controls appear only when the device/pointer environment suggests they are helpful

### 3. Portrait-first, not portrait-only
Phones should default to the most optimized portrait composition, but landscape must remain usable. Tablet layouts can use more horizontal density and should feel closer to compact desktop than stretched-phone.

### 4. Board-first at every breakpoint
The board must stay visually stable and prioritized. New controls or banners must not push the board off-screen or cause vertical jumping between phases.

### 5. No duplicate gameplay logic
Swipe and on-screen buttons should be thin adapters over one shared client helper for queuing direction changes. Do not create separate rules for touch vs keyboard.

## Proposed frontend architecture changes

## A. Introduce a small responsive layout layer
Add a client-side layout model derived from viewport width/orientation.

Suggested derived layout modes:
- `desktop`
- `tablet`
- `mobile-portrait`
- `mobile-landscape`

This can be computed in the client from:
- `window.matchMedia('(max-width: ... )')`
- `window.matchMedia('(orientation: portrait)')`
- pointer capability such as `'(pointer: coarse)'`

Recommended helper:
```js
function getLayoutMode() {
  const width = window.innerWidth;
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  if (width <= 768) return portrait ? 'mobile-portrait' : 'mobile-landscape';
  if (width <= 1100) return 'tablet';
  return 'desktop';
}
```

The layout mode should be reflected on the root panel, for example via:
- `data-layout-mode`
- `data-orientation`
- `data-touch`

This keeps responsive decisions mostly in CSS while allowing JS to conditionally show touch controls.

## B. Restructure gameplay shell for mobile stacking
Keep the existing semantic regions, but allow them to reorder more aggressively on mobile.

### Desktop / tablet
Retain the current three-region model:
- left rail
- center board
- right rail

### Mobile portrait
Recommended order:
1. top utility row (room code, sound toggle/build if needed)
2. board and overlay region
3. compact live match summary / scores
4. rematch/result CTA region
5. touch control pad anchored near the bottom of the viewport or directly below the board

This is the most important layout for playability. The board should remain the largest element on screen.

### Mobile landscape
Recommended order:
- board stays centered and largest
- metadata compresses into horizontal chips/compact cards above or below the board
- touch controls may dock below the board or in a compact side cluster depending on width

Do not rely on the current left/right sidebars for narrow landscape phones; they consume too much width and shrink the board.

## C. Add a dedicated touch-controls UI region
Add a new gameplay-only container in `public/index.html`, near the board region rather than in the side rails:

Suggested node:
```html
<div id="touchControls" class="touch-controls hidden" aria-label="Touch controls">
  <button data-direction="up">Up</button>
  <div class="touch-controls-row">
    <button data-direction="left">Left</button>
    <button data-direction="down">Down</button>
    <button data-direction="right">Right</button>
  </div>
</div>
```

Why near the board?
- reduces thumb travel
- keeps mobile gameplay self-contained
- avoids crowding entry/lobby states

Touch controls should render only when all of these are true:
- active screen is gameplay
- layout mode is `mobile-portrait`, `mobile-landscape`, or coarse-pointer tablet
- game phase is `starting`, `in-progress`, or `game-over` if rematch CTA still needs visibility nearby

For `game-over`, keep rematch/result actions visually primary over directional controls.

## D. Add a unified local input adapter
Create one client helper responsible for all input sources:
- keyboard
- swipe gestures
- on-screen directional buttons

Suggested API:
```js
function requestDirection(direction, source) {
  if (!direction) return;
  socket.emit('player:direction:set', { direction });
}
```

All inputs should funnel through this function.

Optional enhancement: local client-side prefilter using the latest known direction/pending direction from `latestGameState` to avoid obviously invalid reverse inputs before sending. However, the server remains final authority. If local prefilter is added, it must mirror existing gameplay rules and never replace server validation.

## E. Add swipe detection only on the board interaction surface
Swipe should attach to the gameplay surface, not the whole document. Preferred target:
- `#gameStage` or `#board`

Rationale:
- avoids accidental direction changes while scrolling entry/lobby screens
- avoids conflict with tapping rematch/room controls
- keeps touch gameplay intent explicit

Suggested gesture model:
- listen to `pointerdown` / `pointermove` / `pointerup` or `touchstart` / `touchend`
- record start point/time
- on release, compute dx/dy
- accept only if distance exceeds threshold and dominant axis is clear
- map dominant axis to one cardinal direction

Recommended thresholds:
- minimum displacement around `20-32px`
- dominant axis ratio or absolute gap to avoid diagonal ambiguity

Pseudo-flow:
```js
onSwipeEnd(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.hypot(dx, dy) < SWIPE_MIN_DISTANCE) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    requestDirection(dx > 0 ? 'right' : 'left', 'swipe');
  } else {
    requestDirection(dy > 0 ? 'down' : 'up', 'swipe');
  }
}
```

## F. Prevent touch gestures from fighting browser scrolling
This is a critical mobile-specific concern.

For the gameplay interaction surface:
- apply `touch-action: none` to the board stage and/or dedicated gesture layer while gameplay is active
- keep scrolling enabled outside gameplay if content overflows elsewhere

Recommended pattern:
- `touch-action: manipulation` for buttons/CTAs
- `touch-action: none` only for the board gesture surface

Do **not** disable touch actions on the whole page.

## G. Add compact mobile HUD variants
Several current UI elements are too verbose for phones when stacked vertically.

Create compact styles for:
- score cards
- countdown/speed labels
- room code card
- status copy
- rematch card/banner

Recommended approach:
- preserve the same DOM/data flow
- add mobile-only style variants rather than duplicating markup where possible
- if duplication is necessary for result/rematch prominence, ensure both variants are fed from the same render functions

Examples:
- room code becomes a compact top badge row during gameplay on phones
- score cards collapse to one row with `P1`, `P2`, score, and state chip
- long helper text becomes shorter mobile-specific copy if layout pressure is too high

## H. Keep entry and lobby forms mobile-safe
The current entry hero and lobby cards should be adapted with mobile-specific form ergonomics:
- create/join buttons full-width on phones
- room code input large enough for one-thumb entry
- copy/ready buttons min height around 44-48px or greater
- spacing reduced but not cramped
- room code remains prominent without consuming the whole first screen

Lobby player cards should stack cleanly and avoid requiring horizontal scanning.

## I. Preserve audio architecture, adjust unlock timing expectations
No transport or server changes are needed for sound. Keep the current `audioManager` design.

However, mobile documentation for the dev should enforce:
- first meaningful touch interaction should attempt audio unlock just like existing keyboard/button flows
- swipe start or tap on on-screen controls is a valid unlock opportunity
- playback failures remain silent and non-blocking
- sound toggle remains accessible on small screens before and during gameplay

Important: do not make sound depend on a new mobile-specific setting. Preserve the current default-on intent.

## Detailed implementation plan

### 1. Layout state and responsive hooks
Add helpers in `public/app.js`:
- `getLayoutMode()`
- `isTouchPreferred()`
- `applyViewportState()`

Attach listeners to:
- `resize`
- orientation/media-query changes if convenient

The root panel should receive attributes/classes such as:
- `data-layout-mode="mobile-portrait"`
- `data-touch="true"`

### 2. Markup updates
Update `public/index.html` to add:
- a gameplay utility/meta wrapper if needed for mobile compaction
- a dedicated `touchControls` container
- optionally a transparent gesture target inside `game-stage` if the developer wants to isolate swipe handling from the board element itself

Avoid large structural rewrites to entry/lobby unless needed; prefer additive containers.

### 3. CSS breakpoint strategy
Current breakpoints (`1100`, `860`, `720`) are not enough for a good phone UX. Expand into clearer tiers, for example:
- `<= 1100px`: compact desktop/tablet
- `<= 860px`: stacked gameplay shell
- `<= 720px`: phone layout
- `<= 480px`: small phone refinement

Likely CSS changes:
- reduce panel padding on phones
- allow panel to fill viewport height more naturally
- constrain top sections so board is visible without excessive scrolling
- introduce sticky or anchored touch-controls styling
- scale button density and type sizes with `clamp()`
- reduce nonessential copy spacing around the board

### 4. Input module changes
In `public/app.js`:
- extract keyboard direction emit into shared `requestDirection`
- add `setupSwipeControls()`
- add `setupTouchButtons()`
- gate them by active layout and phase

This should remain purely client-side.

### 5. Render logic updates
`renderLobby`, `renderGame`, and `showScreen` should also:
- show/hide touch controls appropriately
- set gameplay/mobile state on the panel
- possibly shorten or reposition certain labels in mobile mode

Recommended helper:
```js
function syncTouchControlsVisibility() {}
```

### 6. Accessibility + usability
For on-screen controls:
- use real `<button>` elements
- add `aria-label`
- support pressed/active visual state
- ensure adequate target size and spacing
- avoid placing controls under thumbs directly on top of the board

For orientation support:
- do not block play with a forced-rotate gate
- optional non-blocking hint is acceptable: “Best experienced in portrait”

## Data and state impact
No server-side schema or event model changes are required for the base mobile support feature.

Existing events remain sufficient:
- `lobby:state`
- `game:countdown`
- `game:start`
- `game:state`
- `game:ended`
- `game:rematch-state`
- `player:direction:set`

Client-only derived state additions:
- `layoutMode`
- `touchPreferred`
- `swipeState`
- maybe `touchControlsVisible`

These should live only in the frontend runtime.

## Risks and mitigations

### Risk 1: Board shrinks too much on phones
**Mitigation:** prioritize board size over side information; collapse rails into compact rows/cards beneath or above the board.

### Risk 2: Swipe conflicts with page scroll
**Mitigation:** capture swipe only on the gameplay stage and use scoped `touch-action: none` there.

### Risk 3: Touch controls feel redundant or cluttered
**Mitigation:** make on-screen controls compact and place them in a consistent bottom area; let swipe remain available on the board itself.

### Risk 4: Mobile input allows illegal reversals
**Mitigation:** route all input through the same server event and keep server validation authoritative.

### Risk 5: Desktop regressions from CSS/DOM changes
**Mitigation:** keep desktop layout as default path; implement phone/tablet adaptations behind media queries and layout-mode toggles.

### Risk 6: Audio appears broken on mobile due to autoplay policy
**Mitigation:** reuse current unlock model; call unlock on tap/swipe/button interactions; fail silently.

### Risk 7: Post-game banner or touch controls move the board
**Mitigation:** keep overlays absolutely positioned where appropriate and reserve stable control regions in mobile layout.

## Testing guidance for implementation
The next agent should verify at minimum:
1. entry/create/join usable on narrow phone width
2. lobby readable and tappable on phone portrait
3. gameplay board remains fully visible on phone portrait
4. landscape remains playable without overlap or clipping
5. swipe input changes direction correctly
6. on-screen buttons change direction correctly
7. invalid reverse attempts are still rejected
8. keyboard input still works on desktop
9. result/rematch UI remains usable on mobile
10. sound toggle/unlock still behaves gracefully on touch devices
11. orientation changes mid-session do not corrupt layout or input

## Suggested implementation order
1. Add responsive layout state + panel data attributes.
2. Add touch controls markup and base CSS.
3. Refactor direction input to shared `requestDirection` helper.
4. Implement on-screen directional buttons.
5. Implement scoped swipe detection on `gameStage`/board surface.
6. Refactor gameplay shell CSS for portrait-first mobile stacking.
7. Tighten entry/lobby mobile spacing and tap targets.
8. Validate rematch/result/audio behavior on mobile breakpoints.
9. Regression-test desktop.

## Recommendation summary
Build mobile support as a **client-only responsive/input enhancement** on the existing architecture. Keep the server protocol and game rules unchanged. Use a layout-mode layer, a unified input adapter, scoped swipe detection, and a dedicated touch-controls region to deliver a portrait-preferred mobile experience without regressing desktop behavior.
