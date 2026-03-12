# API Contracts: Mobile Support

## Overview
This feature does **not** require a new backend/mobile API surface. The existing Socket.IO contract already supports mobile play because gameplay input is directional and server-authoritative.

The work should therefore preserve the existing network events and add only **client-local interaction contracts** for responsive layout and touch input.

## Transport contract decision

### No new Socket.IO events required
Keep using the existing gameplay event:

### `player:direction:set`
Client -> server

```ts
socket.emit('player:direction:set', {
  direction: 'up' | 'down' | 'left' | 'right'
});
```

All input sources must map into this event:
- keyboard
- swipe gesture
- on-screen directional buttons

This preserves:
- server-side direction validation
- no-instant-reverse rules
- identical gameplay authority across desktop and mobile

## Existing authoritative events consumed by mobile UI
Mobile layouts should keep consuming the same room/game payloads already used by desktop:
- `lobby:state`
- `game:countdown`
- `game:start`
- `game:state`
- `game:ended`
- `game:rematch-state`
- `player:left`
- `room:error`
- `room:closed`

No payload changes are required unless the dev discovers a concrete missing signal during implementation.

## Client-local contracts
Because mobile support is primarily frontend behavior, the important contracts here are local runtime interfaces.

## 1. Unified direction request contract
All local inputs should call one helper.

```ts
type Direction = 'up' | 'down' | 'left' | 'right';
type InputSource = 'keyboard' | 'swipe' | 'touch-button';

function requestDirection(direction: Direction, source: InputSource): void;
```

### Requirements
- `requestDirection` emits `player:direction:set`.
- It must be callable from keyboard, swipe, and on-screen controls.
- Optional client-side filtering may reject obviously invalid inputs, but server validation remains final.
- The function must be safe to call repeatedly under active gameplay.

## 2. Layout-mode contract
The responsive system should expose a derived viewport model.

```ts
type LayoutMode =
  | 'desktop'
  | 'tablet'
  | 'mobile-portrait'
  | 'mobile-landscape';

interface ViewportState {
  layoutMode: LayoutMode;
  orientation: 'portrait' | 'landscape';
  touchPreferred: boolean;
}
```

### Requirements
- Derived only from browser environment.
- Must not require any server-provided device metadata.
- Must update on resize/orientation changes.
- Should drive CSS/root data attributes and touch-control visibility.

## 3. Swipe gesture contract
Swipe handling should be isolated to the gameplay interaction surface.

```ts
interface SwipeSession {
  active: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  startAt: number;
}
```

Suggested constants:
```ts
const SWIPE_MIN_DISTANCE_PX = 24;
const SWIPE_AXIS_DOMINANCE_PX = 6;
```

Suggested resolution contract:
```ts
function resolveSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Direction | null;
```

### Rules
- Ignore gestures below the minimum threshold.
- Choose the dominant axis only.
- Diagonal drags resolve to the stronger axis.
- Gestures outside gameplay state should not emit direction events.
- Gesture recognition should be attached to `#gameStage`, `#board`, or a dedicated gesture overlay.

## 4. On-screen controls contract
Directional controls are local UI only.

Suggested markup contract:
```html
<div id="touchControls" aria-label="Touch controls">
  <button data-direction="up" aria-label="Move up"></button>
  <button data-direction="left" aria-label="Move left"></button>
  <button data-direction="down" aria-label="Move down"></button>
  <button data-direction="right" aria-label="Move right"></button>
</div>
```

Suggested setup contract:
```ts
function setupTouchButtons(root: HTMLElement): void;
```

### Rules
- Buttons call `requestDirection(direction, 'touch-button')`.
- Buttons must be hidden or inactive when touch controls are not needed.
- Buttons must be disabled only when the app is not in a gameplay-capable phase, not based on mobile-specific game rules.
- Buttons must not alter room/game state beyond direction requests.

## 5. Touch-control visibility contract
The client should expose one helper for whether touch controls should appear.

```ts
function shouldShowTouchControls(params: {
  layoutMode: LayoutMode;
  touchPreferred: boolean;
  phase: 'entry' | 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress' | 'game-over';
  screen: 'entry' | 'lobby' | 'gameplay';
}): boolean;
```

### Expected behavior
Return `true` when:
- screen is `gameplay`
- device is touch-preferred or mobile layout mode is active
- phase is `starting`, `in-progress`, or optionally `game-over` if controls remain rendered in the same shell

Return `false` when:
- on desktop keyboard-first contexts
- during entry/lobby screens
- when room is closed/reset to entry

## 6. Audio unlock interaction contract
No new audio API is required. Extend current unlock triggers to include mobile inputs.

Suggested contract:
```ts
async function ensureInteractionUnlocked(source: 'keyboard' | 'button' | 'swipe'): Promise<void>;
```

### Requirements
- A tap on sound toggle, create/join/ready/rematch buttons, or touch direction buttons should qualify as unlock-worthy interaction.
- Swipe start or first board touch may also attempt unlock.
- Unlock failures must remain silent and non-blocking.
- Existing `audioManager.enabled` semantics remain unchanged.

## Data attributes / DOM state contract
The layout system should project viewport state onto the root panel for CSS targeting.

Suggested attributes:
```html
<section
  class="panel"
  data-layout-mode="mobile-portrait"
  data-orientation="portrait"
  data-touch="true"
>
```

### Requirements
- Values must update when viewport state changes.
- CSS should use these attributes in addition to media queries for clarity.
- They must not become sources of game truth; they are presentation-only.

## CSS interaction contract
These CSS behaviors are part of the architecture and should be preserved:

### Gameplay gesture surface
```css
.game-stage.is-touch-active {
  touch-action: none;
}
```

### Buttons and non-gesture controls
```css
.touch-controls button,
.primary-button,
.secondary-button {
  touch-action: manipulation;
}
```

### Notes
- Do not disable touch actions across the full app.
- Only the gameplay gesture surface should suppress browser panning/zoom gestures where needed.

## Compatibility contract with existing payloads
The mobile implementation must continue to render correctly from these existing fields:

### `lobby:state`
Used for:
- room code
- occupancy state
- ready/unready state
- current room phase
- mobile-safe lobby CTA state

### `game:state`
Used for:
- board contents
- score cards
- game phase
- countdown/tick/speed labels
- rematch status duplication where present

### `game:ended`
Used for:
- final result
- post-game banner state
- preserved board view

### `game:rematch-state`
Used for:
- rematch CTA state
- waiting/accepted copy
- post-game mobile CTA prominence

No mobile-specific payload forks should be introduced.

## Validation / acceptance mapping
This contract must enable the following requirements from the spec:

1. **Responsive layout on phones/tablets**
   - satisfied by `ViewportState`, root data attributes, and responsive CSS
2. **Portrait preferred but landscape supported**
   - satisfied by `LayoutMode` split and orientation-aware rendering
3. **Swipe input**
   - satisfied by `resolveSwipeDirection()` + `requestDirection()`
4. **On-screen directional controls**
   - satisfied by touch button contract
5. **No gameplay-rule divergence**
   - satisfied by reusing `player:direction:set`
6. **Sound behavior preserved**
   - satisfied by extending current unlock triggers rather than changing the audio system
7. **Desktop behavior preserved**
   - satisfied by hiding touch-specific presentation behind layout/touch checks only

## Explicit non-changes
The following should remain unchanged unless implementation proves otherwise:
- server room lifecycle
- match state schema
- rematch state schema
- result payload schema
- room creation/join/ready APIs
- gameplay tick logic
- direction validation rules

## Recommendation to the dev agent
Treat this as a **presentation and input adaptation feature**, not a transport redesign. Reuse the existing Socket.IO contracts, add one shared local input adapter, and keep all mobile-specific behavior in frontend layout/input code.
