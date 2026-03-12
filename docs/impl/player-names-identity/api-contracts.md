# API Contracts — Player Names / Identity

## Purpose
This document defines the contract changes needed to support required player names across create/join, lobby, gameplay, rematch, and reconnect flows.

## Contract Principles
- Server remains authoritative.
- Reconnect continues to use room code + reconnect token only.
- Display names are payload data, not authentication.
- Duplicate names are valid.
- Slot labels remain available for fallback/disambiguation.

## Shared Types

### New constants
```ts
export const PLAYER_NAME_MAX_LENGTH = 12;
export const PLAYER_NAME_STORAGE_KEY = 'snake:player-name';
```

### New validation result types
```ts
export type PlayerNameValidationReason =
  | 'REQUIRED'
  | 'TOO_LONG'
  | 'EMOJI_NOT_ALLOWED';

export interface PlayerNameValidationResult {
  valid: boolean;
  normalized: string;
  reason?: PlayerNameValidationReason;
  message?: string;
}
```

### New reusable player identity view
```ts
export interface PlayerIdentityView {
  slotIndex: 0 | 1;
  label: 'Player 1' | 'Player 2';
  name: string | null;
  displayName: string;
}
```

## Event Contract Changes

### `room:create`
#### Current
```ts
socket.emit('room:create')
```

#### Proposed
```ts
socket.emit('room:create', {
  name: string,
})
```

### `room:join`
#### Current
```ts
socket.emit('room:join', {
  roomCode: string,
})
```

#### Proposed
```ts
socket.emit('room:join', {
  roomCode: string,
  name: string,
})
```

### `session:resume`
#### No change
```ts
socket.emit('session:resume', {
  roomCode: string,
  reconnectToken: string,
})
```

## Error Contract Changes

### `LobbyErrorReason`
Add:
```ts
export type LobbyErrorReason =
  | 'INVALID_ROOM_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'ACTION_NOT_ALLOWED'
  | 'INVALID_PLAYER_NAME';
```

### `room:error`
No shape change required:
```ts
export interface RoomErrorPayload {
  reason: LobbyErrorReason;
  message: string;
}
```

Recommended server message for MVP:
```txt
Enter a name up to 12 characters without emoji.
```

## Payload Shape Changes

### `LobbyPlayerView`
#### Current
```ts
export interface LobbyPlayerView {
  slotIndex: 0 | 1;
  isOccupied: boolean;
  isReady: boolean;
  isConnected: boolean;
  isReserved: boolean;
  label: 'Player 1' | 'Player 2';
  isYou: boolean;
}
```

#### Proposed
```ts
export interface LobbyPlayerView {
  slotIndex: 0 | 1;
  isOccupied: boolean;
  isReady: boolean;
  isConnected: boolean;
  isReserved: boolean;
  label: 'Player 1' | 'Player 2';
  name: string | null;
  displayName: string;
  isYou: boolean;
}
```

### `LobbyStatePayload`
#### Shape
No top-level structure change required; it continues to expose:
```ts
export interface LobbyStatePayload {
  roomCode: string;
  phase: RoomPhase;
  yourSlotIndex: 0 | 1 | null;
  players: [LobbyPlayerView, LobbyPlayerView];
  occupiedCount: 0 | 1 | 2;
  allPlayersPresent: boolean;
  allReady: boolean;
  canStart: boolean;
  version: number;
  message?: string;
  rematch: RematchView;
  reconnect: ReconnectView;
}
```

### `PublicSnakeState`
#### No required change
Snake movement/score payload can stay focused on snake state.

### `PublicGameStatePayload`
#### Current
```ts
export interface PublicGameStatePayload {
  roomCode: string;
  phase: 'starting' | 'in-progress' | 'game-over';
  yourSlotIndex: 0 | 1 | null;
  tickNumber: number;
  board: { width: 30; height: 30 };
  food: GridPoint;
  snakes: [PublicSnakeState, PublicSnakeState];
  foodsEaten: number;
  tickIntervalMs: number;
  countdownSecondsRemaining?: 3 | 2 | 1 | 0;
  paused?: boolean;
  reconnect: ReconnectView;
  result?: {
    outcome: RoundResult;
    winnerSlotIndex: 0 | 1 | null;
    deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  };
  rematch: RematchView;
  version: number;
}
```

#### Proposed
Add player identity metadata:
```ts
export interface PublicGameStatePayload {
  roomCode: string;
  phase: 'starting' | 'in-progress' | 'game-over';
  yourSlotIndex: 0 | 1 | null;
  tickNumber: number;
  board: { width: 30; height: 30 };
  food: GridPoint;
  snakes: [PublicSnakeState, PublicSnakeState];
  players: [PlayerIdentityView, PlayerIdentityView];
  foodsEaten: number;
  tickIntervalMs: number;
  countdownSecondsRemaining?: 3 | 2 | 1 | 0;
  paused?: boolean;
  reconnect: ReconnectView;
  result?: {
    outcome: RoundResult;
    winnerSlotIndex: 0 | 1 | null;
    deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  };
  rematch: RematchView;
  version: number;
}
```

### `GameStartPayload`
#### Current
```ts
export interface GameStartPayload {
  roomCode: string;
  phase: 'in-progress';
  board: { width: 30; height: 30 };
  players: [
    { slotIndex: 0; label: 'Player 1' },
    { slotIndex: 1; label: 'Player 2' }
  ];
  tickIntervalMs: number;
  startedAt: number;
  version: number;
}
```

#### Proposed
```ts
export interface GameStartPayload {
  roomCode: string;
  phase: 'in-progress';
  board: { width: 30; height: 30 };
  players: [
    {
      slotIndex: 0;
      label: 'Player 1';
      name: string;
      displayName: string;
    },
    {
      slotIndex: 1;
      label: 'Player 2';
      name: string;
      displayName: string;
    }
  ];
  tickIntervalMs: number;
  startedAt: number;
  version: number;
}
```

### `GameEndedPayload`
#### No top-level change required
`finalState` will include named players once `PublicGameStatePayload` is updated.

### `GameRematchStatePayload`
#### Current
```ts
export interface GameRematchStatePayload {
  roomCode: string;
  phase: 'game-over' | 'waiting-for-players' | 'lobby' | 'starting';
  rematch: RematchView;
  reconnect: ReconnectView;
  yourSlotIndex: 0 | 1 | null;
  version: number;
  message?: string;
}
```

#### Proposed
Add player identity metadata so post-game/rematch UI can render names without depending on stale lobby state:
```ts
export interface GameRematchStatePayload {
  roomCode: string;
  phase: 'game-over' | 'waiting-for-players' | 'lobby' | 'starting';
  players: [PlayerIdentityView, PlayerIdentityView];
  rematch: RematchView;
  reconnect: ReconnectView;
  yourSlotIndex: 0 | 1 | null;
  version: number;
  message?: string;
}
```

### `PlayerLeftPayload`
#### Keep shape unchanged
```ts
export interface PlayerLeftPayload {
  roomCode: string;
  slotIndex: 0 | 1;
  reason: 'left' | 'disconnected';
}
```

Rationale:
- the event already has enough structural meaning
- the human-readable name-aware messaging should come from snapshot payloads / message text
- avoiding name duplication here reduces drift risk during disconnect transitions

## Internal Server Model Changes

### `PlayerSlot`
```ts
interface PlayerSlot {
  slotIndex: 0 | 1;
  playerId: string | null;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
  name: string | null;
  reconnectToken: string | null;
  disconnectedAt: number | null;
  reservationExpiresAt: number | null;
}
```

### State rules
- `name` is set when a player successfully creates/joins.
- `name` survives temporary disconnect/resume.
- `name` is cleared when the slot is fully vacated via leave/removal.

## Server Method Signature Changes

### `createRoom`
#### Current
```ts
createRoom(socketId: string): ServiceResult
```

#### Proposed
```ts
createRoom(socketId: string, rawName: string): ServiceResult
```

### `joinRoom`
#### Current
```ts
joinRoom(socketId: string, rawRoomCode: string): ServiceResult
```

#### Proposed
```ts
joinRoom(socketId: string, rawRoomCode: string, rawName: string): ServiceResult
```

## Serialization Rules

### Display name rule
For any occupied slot:
```ts
displayName = normalizedName
```

For unoccupied slots:
```ts
displayName = label
name = null
```

### Preferred human-readable reference rule
When composing banner/message copy:
1. use player `name` if present
2. if duplicate-name disambiguation is needed in that specific message, append slot label
3. otherwise fall back to `label`

Examples:
- `Alex disconnected. Waiting 30s for reconnect.`
- `Alex (Player 2) disconnected. Waiting 30s for reconnect.`
- `Player 2 disconnected. Waiting 30s for reconnect.`

## Client Storage Contract

### Name storage
```ts
localStorage['snake:player-name'] = '<normalized valid name>'
```

Rules:
- write only after successful validation
- read on app start
- prefill entry input if still valid
- ignore/clear invalid stored values

### Reconnect storage
No change to the existing session storage contract:
```ts
localStorage['snake:session:<ROOM>'] = JSON.stringify({
  roomCode,
  reconnectToken,
  slotIndex,
  issuedAt,
  version,
})
```

## UI Contract Expectations

### Entry form
The client should maintain local form state roughly like:
```ts
interface EntryFormState {
  name: string;
  roomCode: string;
  nameError: string | null;
}
```

### Submission guard
Create/join must not emit socket events unless:
- name is valid
- join additionally has a syntactically valid room code input state

## Acceptance Mapping
- Required name before create/join → new client payload requirement + server validation
- Max 12, spaces allowed, emoji rejected → shared validation contract
- Persist last valid name locally → `snake:player-name`
- Show names in lobby/HUD/result/rematch/reconnect messaging → enriched snapshot payloads
- Duplicate names allowed → no uniqueness checks in any contract
- No auth → no changes to reconnect token model beyond retaining server-stored name

## Recommended Test Assertions
- `room:create` with invalid name returns `room:error { reason: 'INVALID_PLAYER_NAME' }`
- `room:join` with invalid name returns `room:error { reason: 'INVALID_PLAYER_NAME' }`
- successful lobby state includes `players[n].name` and `players[n].displayName`
- `game:start` and `game:state` include named `players`
- reconnect keeps the same slot name after `session:resume`
- duplicate names produce successful create/join and serialize both names unchanged
