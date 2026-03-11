# API Contracts: Room Lobby Auto-Start

## Contract Goals
These contracts define the Socket.IO events and payloads for the room creation, join, lobby sync, ready toggle, and start handoff flow.

They are intentionally limited to the approved feature scope.

## Event Naming
Use domain-scoped event names:
- `room:create`
- `room:created`
- `room:join`
- `room:joined`
- `room:error`
- `lobby:state`
- `player:ready:set`
- `player:left`
- `game:start`

## Shared Types
```ts
export type RoomPhase =
  | 'waiting-for-players'
  | 'lobby'
  | 'starting'
  | 'in-progress';

export type LobbyErrorReason =
  | 'INVALID_ROOM_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'ACTION_NOT_ALLOWED';

export interface LobbyPlayerView {
  slotIndex: 0 | 1;
  isOccupied: boolean;
  isReady: boolean;
  label: 'Player 1' | 'Player 2';
  isYou: boolean;
}

export interface LobbyStatePayload {
  roomCode: string;
  phase: RoomPhase;
  players: [LobbyPlayerView, LobbyPlayerView];
  occupiedCount: 0 | 1 | 2;
  allPlayersPresent: boolean;
  allReady: boolean;
  canStart: boolean;
  version: number;
  message?: string;
}

export interface RoomErrorPayload {
  reason: LobbyErrorReason;
  message: string;
}
```

## Client → Server Events

### `room:create`
Create a new room and place the requester into slot 0.

Payload:
```ts
export interface RoomCreateRequest {}
```

Validation:
- caller must not already be in an active room, or the server must first remove them from the previous room

Success response:
- `room:created`
- `lobby:state`

### `room:join`
Join an existing room by code.

Payload:
```ts
export interface RoomJoinRequest {
  roomCode: string;
}
```

Normalization:
- trim whitespace
- uppercase before validation

Validation:
- `roomCode` must be alphabetic and 4–6 chars after normalization
- room must exist
- room must not be full
- room must not be `starting` or `in-progress`

Success response:
- `room:joined` to the joining socket
- `lobby:state` to both room members

Failure response:
- `room:error`

### `player:ready:set`
Set the current player's ready state.

Payload:
```ts
export interface PlayerReadySetRequest {
  ready: boolean;
}
```

Validation:
- socket must belong to the target room
- room phase must be `waiting-for-players` or `lobby`
- only the caller's slot may be mutated

Success response:
- `lobby:state`
- optional `game:start` if the final authoritative check passes

Failure response:
- `room:error`

## Server → Client Events

### `room:created`
Confirms room creation to the creator.

Payload:
```ts
export interface RoomCreatedPayload {
  roomCode: string;
  yourSlotIndex: 0;
}
```

Notes:
- client should route into the lobby on receipt
- canonical lobby UI still comes from `lobby:state`

### `room:joined`
Confirms successful room join to the second player.

Payload:
```ts
export interface RoomJoinedPayload {
  roomCode: string;
  yourSlotIndex: 0 | 1;
}
```

Notes:
- `yourSlotIndex` is included for convenience
- client should treat the latest `lobby:state` as authoritative

### `lobby:state`
Authoritative snapshot of the lobby.

Payload:
```ts
export interface LobbyStatePayload {
  roomCode: string;
  phase: 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress';
  players: [
    {
      slotIndex: 0 | 1;
      isOccupied: boolean;
      isReady: boolean;
      label: 'Player 1' | 'Player 2';
      isYou: boolean;
    },
    {
      slotIndex: 0 | 1;
      isOccupied: boolean;
      isReady: boolean;
      label: 'Player 1' | 'Player 2';
      isYou: boolean;
    }
  ];
  occupiedCount: 0 | 1 | 2;
  allPlayersPresent: boolean;
  allReady: boolean;
  canStart: boolean;
  version: number;
  message?: string;
}
```

Field semantics:
- `phase`: current room phase
- `players`: exactly two slot views for stable UI rendering
- `isReady`: always false for unoccupied slots
- `allPlayersPresent`: true only when two occupied slots exist
- `allReady`: true only when both occupied players are ready
- `canStart`: true only when start eligibility is satisfied
- `version`: monotonically increasing room-state version for debugging and stale-render protection
- `message`: optional user-facing status such as `Waiting for opponent`

Emission rules:
- after room creation
- after successful join
- after ready/unready changes
- after leave/disconnect changes
- immediately before handoff to `game:start` if phase changes to `starting`

### `room:error`
Authoritative error event for rejected room/lobby actions.

Payload:
```ts
export interface RoomErrorPayload {
  reason:
    | 'INVALID_ROOM_CODE'
    | 'ROOM_NOT_FOUND'
    | 'ROOM_FULL'
    | 'GAME_ALREADY_STARTED'
    | 'ACTION_NOT_ALLOWED';
  message: string;
}
```

Recommended messages:
- `INVALID_ROOM_CODE` → `Enter a valid room code.`
- `ROOM_NOT_FOUND` → `Room no longer exists.`
- `ROOM_FULL` → `That room is already full.`
- `GAME_ALREADY_STARTED` → `That game has already started.`
- `ACTION_NOT_ALLOWED` → `That action is not available right now.`

### `player:left`
Inform the remaining player that the other slot became vacant.

Payload:
```ts
export interface PlayerLeftPayload {
  roomCode: string;
  slotIndex: 0 | 1;
  reason: 'left' | 'disconnected';
}
```

Emission rules:
- emit only to remaining room members
- follow immediately with a fresh `lobby:state`

### `game:start`
Signals that lobby conditions have been satisfied and gameplay is beginning.

Payload:
```ts
export interface GameStartPayload {
  roomCode: string;
  phase: 'in-progress';
  seed?: string;
  players: [
    { slotIndex: 0 | 1; label: 'Player 1' | 'Player 2' },
    { slotIndex: 0 | 1; label: 'Player 1' | 'Player 2' }
  ];
}
```

Notes:
- keep this payload minimal for now
- gameplay-specific initial state can be expanded in the gameplay issue if needed
- this feature only requires enough data for client transition into the game screen

## State Transition Rules

### Create flow
```text
client -> room:create
server -> room:created
server -> lobby:state (phase=waiting-for-players)
```

### Join flow
```text
client -> room:join
server -> room:joined (to joiner)
server -> lobby:state (phase=lobby or waiting-for-players if not full yet)
```

### Ready flow without start
```text
client -> player:ready:set { ready }
server -> lobby:state
```

### Ready flow with auto-start
```text
client -> player:ready:set { ready: true }
server -> lobby:state (phase=starting)
server -> game:start (phase=in-progress)
```

### Leave/disconnect before start
```text
server -> player:left
server -> lobby:state (phase=waiting-for-players)
```

## Server-Side Rules the Dev Should Preserve
- Do not trust client-sent player identity.
- Compute room membership from socket context.
- Broadcast full `lobby:state` snapshots instead of partial ready patches.
- Revalidate start eligibility immediately before emitting `game:start`.
- Reset stale ready conditions when occupancy drops below 2.
- Treat `starting` and `in-progress` rooms as non-joinable.

## Suggested Test Matrix
1. Create room returns `room:created` and lobby snapshot with one occupied slot.
2. Valid join returns `room:joined` and synchronized `lobby:state` for both clients.
3. Malformed or lowercase-invalid code returns `room:error` with `INVALID_ROOM_CODE` unless normalized into a valid uppercase code.
4. Third player join attempt returns `ROOM_FULL`.
5. Join attempt after start returns `GAME_ALREADY_STARTED`.
6. Ready toggle updates only the caller's slot and rebroadcasts `lobby:state`.
7. Both players ready triggers `game:start` only once.
8. Unready before start prevents `game:start`.
9. Disconnect before start emits `player:left`, resets lobby phase, and does not start the match.
10. Room emptied by both departures is removed from memory.
