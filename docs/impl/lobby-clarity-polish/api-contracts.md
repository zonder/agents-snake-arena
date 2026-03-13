# Lobby Clarity / Polish Pass — API Contracts

## 1. Contract strategy
This feature is primarily a **presentation-layer polish pass**. The preferred approach is to keep the existing Socket.IO event model intact and implement most improvements by deriving richer UI presentation from current `lobby:state` payloads.

## 2. Existing authoritative events used by this feature

### `lobby:state`
Primary event for lobby rendering.

Current payload already provides the core information needed for this feature:
- `roomCode`
- `phase`
- `yourSlotIndex`
- `players[]`
  - `slotIndex`
  - `label`
  - `name`
  - `displayName`
  - `isOccupied`
  - `isReady`
  - `isConnected`
  - `isReserved`
  - `isYou`
- `occupiedCount`
- `allPlayersPresent`
- `allReady`
- `canStart`
- `version`
- `message`
- `rematch`
- `reconnect`

This is already sufficient to support:
- room-code prominence
- player identity and readiness cards
- waiting/joined/reserved states
- CTA labeling
- next-step copy derivation

### `game:countdown`
Used for the transition from polished lobby to active match.

### `game:state`
Used to maintain shell continuity while the lobby hands off into countdown and gameplay.

## 3. No required new event types
This design does **not** require:
- a new `lobby:branding` event
- a new `lobby:cta` event
- a new lobby-only animation event
- a new server phase

The server remains authoritative for room truth; the client remains responsible for presentation.

## 4. Optional additive payload refinements
These are optional but recommended if the dev agent finds client-side copy derivation repetitive or brittle.

## 4.1 Optional field: `nextStep`
Add to `LobbyStatePayload`:

```ts
export type LobbyNextStep =
  | 'share-code'
  | 'wait-for-player'
  | 'ready-up'
  | 'wait-for-opponent-ready'
  | 'starting'
  | 'reconnect-wait';
```

```ts
interface LobbyStatePayload {
  // existing fields...
  nextStep?: LobbyNextStep;
}
```

### Semantics
- `share-code`: you are the only player and the room code should be shared
- `wait-for-player`: the UI should emphasize that a second player has not joined yet
- `ready-up`: both players are present and this viewer still needs to ready
- `wait-for-opponent-ready`: this viewer is ready, opponent is not
- `starting`: both players are ready and countdown/start handoff is active
- `reconnect-wait`: reconnect reservation messaging should dominate

### Recommended derivation rules in `roomService.ts`
- if `disconnectWindow` active → `reconnect-wait`
- else if `phase === 'starting'` → `starting`
- else if `occupiedCount < 2` → `share-code`
- else if viewer exists and !viewer.ready → `ready-up`
- else if all players present and !allReady → `wait-for-opponent-ready`

## 4.2 Optional field: `shareHint`
Add to `LobbyStatePayload`:

```ts
interface LobbyStatePayload {
  // existing fields...
  shareHint?: string;
}
```

### Purpose
Short helper copy specifically for the room-code card. Keeps the room code area from reusing a generic status string that may be optimized for another part of the layout.

### Example values
- `Share this code with a friend to fill the room.`
- `Both players are here. Ready up when you’re set.`
- `Slot reserved while the player reconnects.`

## 5. Existing client actions remain unchanged

### Ready toggle
No contract change:

```ts
socket.emit('player:ready:set', { ready: boolean })
```

The lobby polish pass must not change ready semantics.

### Copy/share action
No server API required. This remains client-only using the current browser clipboard path.

## 6. Existing payload fields to rely on explicitly
The implementation should avoid string-parsing `message` wherever a structured field already exists.

Prefer these fields for state derivation:
- `occupiedCount`
- `allPlayersPresent`
- `allReady`
- `canStart`
- `phase`
- `players[i].isReady`
- `players[i].isOccupied`
- `players[i].isConnected`
- `players[i].isReserved`
- `players[i].isYou`
- `reconnect.active`
- `reconnect.status`
- `reconnect.secondsRemaining`
- `reconnect.disconnectedPlayerDisplayName`

Use `message` only as fallback/general status copy.

## 7. Client-side presentation contract
Even if the server contract stays unchanged, the frontend should define a local derived presentation type.

```ts
type LobbyPresentationMode =
  | 'waiting'
  | 'ready-check'
  | 'starting'
  | 'reconnect';

interface LobbyPresentationModel {
  mode: LobbyPresentationMode;
  heroTitle: string;
  heroSubtitle: string;
  roomCodeHint: string;
  nextStepLabel: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  highlightRoomCode: boolean;
  highlightPlayers: boolean;
  highlightCta: boolean;
}
```

This is a client-only abstraction and should not be exported across the network boundary.

## 8. Backward compatibility
All recommended contract additions are backward-compatible because they are optional and additive.

If not implemented server-side, the frontend can still derive the same behavior from current payloads.

## 9. Test assertions for contract-level behavior
Implementation/tests should confirm:
- `lobby:state` still emits on create/join/ready/disconnect/reconnect transitions
- existing ready and reconnect fields remain unchanged in meaning
- countdown/game events still fire as before when both players are ready
- optional new fields, if added, stay consistent with the existing room truth

## 10. Developer guidance
For this feature, prefer:
- **stable existing room contracts**
- **structured client derivation**
- **small optional payload enrichments only if they remove duplicated copy logic**

Do not introduce new network APIs for purely decorative or CSS-driven lobby polish.
