# Disconnect / reconnect handling API contracts

## Contract goals
These contracts extend the current Socket.IO room/game protocol with a lightweight same-browser reconnect path. They are intentionally room-scoped and in-memory.

Design requirements:
- no account system
- same browser/device reclaim only
- server-authoritative slot reclaim
- explicit reconnect state visible to both players

## New concepts

### Session token
Opaque reconnect secret minted by the server when a player first occupies a slot.

### Reserved slot
A slot whose player disconnected but whose ownership has not yet expired.

### Reconnect window
30-second server-owned timeout during which the reserved slot remains non-joinable by others.

## New / extended shared types

```ts
export interface PlayerSessionPayload {
  roomCode: string;
  slotIndex: 0 | 1;
  reconnectToken: string;
  issuedAt: number;
  version: number;
}

export interface SessionResumeRequestPayload {
  roomCode: string;
  reconnectToken: string;
}

export interface SessionResumeSucceededPayload {
  roomCode: string;
  slotIndex: 0 | 1;
  phase: RoomPhase;
  resumedAt: number;
  version: number;
}

export interface SessionResumeFailedPayload {
  roomCode: string;
  reason:
    | 'ROOM_NOT_FOUND'
    | 'RESERVATION_EXPIRED'
    | 'TOKEN_MISMATCH'
    | 'SLOT_NOT_RESERVED'
    | 'SLOT_ALREADY_ACTIVE';
  message: string;
}
```

### Reconnect view embedded in authoritative payloads
```ts
export type ReconnectStatus = 'none' | 'waiting-for-player' | 'resume-countdown';

export interface ReconnectView {
  active: boolean;
  status: ReconnectStatus;
  disconnectedSlotIndex: 0 | 1 | null;
  reservedUntil: number | null;
  secondsRemaining: number | null;
  affectedPhase: 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress' | 'game-over' | null;
  yourSlotReserved: boolean;
  canAutoResume: boolean;
}
```

### Lobby player visibility
Current lobby slot shape should expose reservation state explicitly:

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

## Extended payloads

### `lobby:state`
Add:
- `players[n].isConnected`
- `players[n].isReserved`
- `reconnect: ReconnectView`

Semantics:
- `isOccupied=true` + `isConnected=false` + `isReserved=true` means the slot is held for reconnect
- room remains non-joinable for that slot until reservation expires

### `game:state`
Add:
- `reconnect: ReconnectView`
- optional `paused: boolean`

Semantics:
- during reconnect wait, `phase` may stay `starting` or `in-progress`
- `paused=true` means authoritative progression is frozen

### `game:rematch-state`
Add / reuse:
- `reconnect: ReconnectView`

Semantics:
- rematch state must reflect that one player is temporarily disconnected but still eligible to return during reservation window

## New client -> server events

### `session:resume`
Attempt to reclaim a reserved slot.

```ts
socket.emit('session:resume', {
  roomCode: 'ABCD',
  reconnectToken: '<opaque-token>',
} satisfies SessionResumeRequestPayload)
```

Validation rules:
- room exists
- one slot in room matches token
- slot is reserved and disconnected
- reservation has not expired
- slot is not already rebound to another live socket

Side effects on success:
- bind new `socketId` to slot
- mark player connected
- clear reconnect timeout runtime
- cancel or resolve paused reconnect state
- emit full authoritative room/game snapshot

## New server -> client events

### `session:issued`
Sent to the player that just occupied a slot.

```ts
{
  roomCode: 'ABCD',
  slotIndex: 0,
  reconnectToken: '<opaque-token>',
  issuedAt: 1770000000000,
  version: 4,
}
```

Client behavior:
- store in local storage immediately
- overwrite any prior token for same room/slot context

### `session:resume:succeeded`
Sent to reconnecting socket after successful reclaim.

```ts
{
  roomCode: 'ABCD',
  slotIndex: 0,
  phase: 'in-progress',
  resumedAt: 1770000001234,
  version: 21,
}
```

Client behavior:
- stay in room
- await authoritative `lobby:state` / `game:state` / `game:rematch-state`
- no manual confirmation needed

### `session:resume:failed`
Sent when reclaim is denied.

```ts
{
  roomCode: 'ABCD',
  reason: 'RESERVATION_EXPIRED',
  message: 'Reconnect window expired. That slot is no longer reserved.',
}
```

Client behavior:
- clear stale local token for that room
- return to ordinary create/join flow

## Event sequencing

### Fresh create
1. client -> `room:create`
2. server -> `room:created`
3. server -> `session:issued`
4. server -> `lobby:state`

### Fresh join
1. client -> `room:join`
2. server -> `room:joined`
3. server -> `session:issued`
4. server -> `lobby:state` to both players

### Disconnect during lobby
1. transport disconnect detected
2. server marks slot reserved for 30s
3. server -> `lobby:state` to remaining player
4. server -> optional `game:rematch-state` if room is post-game

### Resume success during gameplay
1. reconnecting client transport reconnects
2. client -> `session:resume`
3. server validates token and reservation
4. server -> `session:resume:succeeded`
5. server -> updated `lobby:state` / `game:state` to both players
6. server -> resume countdown event(s) if using visible resume countdown
7. server resumes active tick loop after countdown

### Resume failure
1. client -> `session:resume`
2. server -> `session:resume:failed`
3. client clears stored token and falls back to entry flow

## Resume-countdown contract
Recommended: reuse existing `game:countdown` event for resume countdown instead of inventing a second countdown transport.

Contract rule:
- `game:countdown` during reconnect resume still means authoritative movement has not started/resumed yet
- clients should read `reconnect.status === 'resume-countdown'` to render copy like “Player reconnected. Resuming in 3…”

This avoids creating parallel timer primitives.

## Error semantics

### Join attempts against reserved slot
If room has one live player and one reserved slot, ordinary `room:join` should behave as:
- if no open slot exists => `ROOM_FULL`

This is important: reserved means unavailable to replacement joiners.

### Direction / ready while reconnect wait is active
- `player:direction:set` should be rejected while game is paused for reconnect
- `player:ready:set` should be rejected while slot reservation prevents normal lobby readiness

Use existing `ACTION_NOT_ALLOWED` unless the dev agent wants a more specific reason.

## Versioning rules
Every reconnect-related state change should increment room version:
- slot reserved
- reservation refreshed
- reservation expired and slot reopened
- resume succeeded
- pause entered
- resume countdown started/advanced/completed

The same `version` discipline used elsewhere should continue so the client can treat reconnect transitions as ordinary authoritative updates.

## Persistence rules
- reconnect tokens live only in server memory and browser local storage
- server restart invalidates all outstanding tokens
- client must tolerate resume failure after server restart

## Security / integrity notes
This is deliberately not full auth, but the contracts should still follow these rules:
- token must be opaque and high entropy
- token should never be derivable from room code or slot index
- token should rotate when slot ownership changes
- token should only restore the exact reserved slot it was issued for
- possession of token does not bypass room phase or expiry validation

## Minimum test coverage expected from implementation
1. `session:issued` emitted on create and join
2. `session:resume` succeeds only for matching reserved slot
3. invalid token fails with `session:resume:failed`
4. expired reservation fails with `session:resume:failed`
5. reserved slot blocks replacement `room:join`
6. `lobby:state` exposes reserved/disconnected status correctly
7. `game:state` exposes paused reconnect state correctly
8. `game:countdown` reuse for resume works without double-starting gameplay
9. timeout expiry transitions reserved slot back to open state
10. gameplay timeout still emits correct `game:ended` winner/death reason

## Guidance for the dev agent
Prefer **small extensions to existing event families** over inventing a large new subsystem. The most important additions are:
- `session:issued`
- `session:resume`
- `session:resume:succeeded`
- `session:resume:failed`
- embedded `reconnect` view on authoritative room/game payloads

Keep the client dumb: it stores token, requests resume, and renders whatever the server says.
