# Design: Room Create/Join Lobby with Ready State and Auto-Start

## Scope
This design covers the pre-game room and lobby flow for a 2-player match:
- create room
- generate and validate join code
- join room by code
- synchronize a 2-slot lobby
- allow each player to toggle only their own ready state
- auto-start the match when exactly 2 connected players are ready
- cancel start conditions when readiness or occupancy changes
- handle leave/disconnect before match start

Out of scope:
- snake gameplay rules
- score, food, collision, winner logic
- replay flow
- persistence or auth

## Architecture Summary
Use a server-authoritative room service on top of Socket.IO. The browser is a thin UI client that sends user intent and renders authoritative room state pushed by the server.

The server owns:
- room creation and join-code uniqueness
- room membership and slot assignment
- ready state
- lobby phase transitions
- eligibility checks for starting gameplay
- disconnect/leave cleanup

The client owns:
- create/join forms
- copy-code interaction
- lobby presentation for two slots
- local affordances for ready/unready and error display
- routing from home screen to lobby and from lobby into gameplay when `game:start` is emitted

## Recommended Module Boundaries

### Server
1. **Socket gateway**
   - maps socket events to service calls
   - validates payload shape
   - emits success, error, and state-sync events

2. **Room service**
   - create room
   - join room
   - leave room
   - toggle ready
   - compute whether room is startable
   - normalize room-code input

3. **Room store**
   - in-memory `Map<roomCode, RoomRecord>`
   - optional socket/player indexes for fast disconnect cleanup

4. **Lobby state serializer**
   - produces one consistent payload shape for `lobby:state`
   - ensures both clients receive the same authoritative view

5. **Game handoff adapter**
   - converts a ready lobby into the initial gameplay session
   - marks room phase as `starting` / `in-progress`
   - emits `game:start`

### Client
1. **Home screen** for create/join actions
2. **Lobby screen** for room code, slot state, ready action, waiting copy
3. **Socket client layer** for event subscriptions and emits
4. **Shared lobby model** matching server payloads

## State Model

### Room phases
Use a strict finite-state model:
- `waiting-for-players` — only one occupied slot
- `lobby` — two occupied slots, not all ready
- `ready-to-start` — two occupied slots and both ready; transient computed state only
- `starting` — server has committed to starting and is creating gameplay state
- `in-progress` — gameplay has started; room is not joinable
- `closed` — optional terminal/cleanup state before deletion

Implementation note: `ready-to-start` does not need to be stored durably if it is computed from room data. What matters is that start is triggered only after a final atomic eligibility check.

### Room record
```ts
interface RoomRecord {
  roomCode: string;
  phase: 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress';
  createdAt: number;
  players: [PlayerSlot, PlayerSlot];
  version: number;
  startNonce: number;
}

interface PlayerSlot {
  slotIndex: 0 | 1;
  playerId: string | null;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
}
```

### Derived lobby view
The lobby payload should be derived from the room record and never assembled ad hoc in multiple places.

Derived fields:
- `occupiedCount`
- `allPlayersPresent`
- `allReady`
- `canStart`
- `yourSlotIndex`
- `yourReady`
- `roomCode`
- `phase`

## Room Code Strategy
- Use uppercase alphabetic codes only.
- Recommended length: start with 4 letters and increase to 5 or 6 only if collision pressure warrants it.
- Normalize join input by trimming whitespace and uppercasing before validation.
- Reject non-alphabetic or wrong-length inputs as `INVALID_ROOM_CODE`.
- On room creation, retry code generation until an unused active code is found.

## Core Behaviors

### 1. Create room
1. Client emits `room:create`.
2. Server allocates a `playerId` for the requesting socket if needed.
3. Server creates a room with the requester in slot 0.
4. Room phase becomes `waiting-for-players`.
5. Server associates socket with room and joins the Socket.IO room.
6. Server emits `room:created` to the creator and `lobby:state` to the room.

### 2. Join room
1. Client emits `room:join` with a room code.
2. Server normalizes and validates the code.
3. Server loads the room and rejects if missing, full, or `in-progress` / `starting`.
4. Server inserts the joining player into the empty slot.
5. Server resets the joining player ready state to `false`.
6. Phase becomes:
   - `waiting-for-players` if still only one player somehow remains
   - `lobby` if two players are present and not both ready
7. Server emits `room:joined` to the joiner and `lobby:state` to both clients.

### 3. Toggle ready
1. Client emits `player:ready:set` with `ready: boolean`.
2. Server identifies the caller from socket context, not from client-supplied player id.
3. Server updates only that player slot.
4. Server increments `version` and emits `lobby:state`.
5. Server re-checks start eligibility after the update.
6. If exactly 2 connected players are present and both are ready, server attempts start.

### 4. Auto-start
Use a synchronous commit step to avoid stale starts.

Recommended sequence:
1. Evaluate `canStart(room)` after any join/ready/disconnect change.
2. If false, do nothing.
3. If true, increment `startNonce`, set phase to `starting`, increment `version`.
4. Immediately revalidate that:
   - both slots are still occupied
   - both sockets are still connected
   - both players are still ready
   - phase is still `starting` for the same `startNonce`
5. Create gameplay state and set phase to `in-progress`.
6. Emit `game:start` with the initial game payload.

This feature does **not** require a countdown. Starting immediately after the validated ready transition keeps behavior deterministic and satisfies the approved spec.

### 5. Leave/disconnect before start
When a socket disconnects or leaves during lobby phases:
1. Locate the room by socket index.
2. Clear that player slot's `socketId`, `playerId`, and `connected` state.
3. Reset the departed slot ready state to `false`.
4. Reset the remaining player's ready state to `false` as a conservative anti-stale rule.
5. Set phase to `waiting-for-players`.
6. Emit `player:left` and a fresh `lobby:state` to any remaining player.
7. If both slots become empty, delete the room from memory.

### Why reset the remaining player to unready?
The spec says readiness should be recalculated after a player leaves and stale ready conditions must never accidentally start a match. Resetting the remaining player to `false` is the simplest deterministic rule and prevents a replacement player from inheriting a half-satisfied start condition.

## Concurrency and Race Handling

### Simultaneous final-slot joins
Because the server is single-process and authoritative, handle joins inside one critical section per room code:
- check room joinability
- assign empty slot
- persist updated room
- emit new state

A second near-simultaneous join sees the room as full and gets `ROOM_FULL`.

### Ready/unready thrash
Always emit the full authoritative lobby state after each mutation. Clients should treat server state as truth and not attempt optimistic convergence logic beyond temporary button disable/loading UX.

### Disconnect after both ready
If a disconnect occurs before `game:start` is committed, `canStart(room)` becomes false and start must not proceed. The `starting` transition must revalidate occupancy and readiness before emitting `game:start`.

## Validation Rules

### Client input validation
Validate payload shape before domain processing:
- `room:create`: empty payload only
- `room:join`: `roomCode` string required
- `player:ready:set`: boolean `ready` required

### Domain validation
Reject with explicit reason if:
- room code format is invalid
- room does not exist
- room already has 2 players
- room phase is `starting` or `in-progress`
- socket is not a member of the room for ready actions
- action is not allowed in current phase

## Frontend UX Guidance
- Home screen should have clear create/join actions.
- Lobby should always show exactly two slots.
- Each slot should show `Waiting`, `Joined`, and `Ready/Not ready` state clearly.
- Show room code prominently with copy button near it.
- Show a small status line such as: `Game starts automatically when both players are ready.`
- Disable the ready toggle after `game:start` or while lobby phase is `starting`.
- When a player leaves, show a lightweight notice and keep the remaining player in the same lobby.

## Error-State Design
Map server reasons to simple user-facing text:
- `INVALID_ROOM_CODE` → `Enter a valid room code.`
- `ROOM_NOT_FOUND` → `Room no longer exists.`
- `ROOM_FULL` → `That room is already full.`
- `GAME_ALREADY_STARTED` → `That game has already started.`
- `ACTION_NOT_ALLOWED` → `That action is not available right now.`

## Implementation Order for Fullstack Dev
1. Add shared TypeScript lobby contracts and event-name constants.
2. Implement in-memory room store and socket/player indexes.
3. Implement room creation and join flows with code normalization and validation.
4. Implement lobby-state serializer and broadcast helper.
5. Implement ready toggle and start eligibility checks.
6. Implement disconnect/leave cleanup and room deletion when empty.
7. Implement client home + lobby UI against authoritative events.
8. Wire `game:start` handoff into the gameplay module boundary without filling in gameplay logic here.
9. Add tests for join races, ready/unready cancellation, and disconnect-before-start.

## Explicit Scope Guardrails
To avoid scope creep, do not add in this issue:
- usernames/profile setup
- host-only controls
- countdown timers
- spectator or rejoin support
- persistence or reconnection recovery
- replay flow
