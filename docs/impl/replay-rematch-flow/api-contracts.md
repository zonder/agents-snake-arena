# API Contracts: Replay / Rematch Flow

## Summary
These contracts extend the existing Socket.IO room/gameplay protocol to support same-room replay after `game-over`.

Goals:
- dual acceptance by the same two connected players
- waiting state when only one accepts
- same room code across rounds
- full authoritative reset on rematch start
- open-room behavior after a post-game leave

The implementation should extend the current shared contract file rather than create a parallel transport model.

## Contract strategy
Reuse existing events where possible:
- `lobby:state`
- `game:state`
- `game:countdown`
- `game:start`
- `game:ended`
- `player:left`
- `room:error`

Add one explicit client intent event and one explicit server state event:
- `game:rematch-request`
- `game:rematch-state`

Why add an explicit state event even though `lobby:state` / `game:state` also exist?
- it keeps rematch UI updates obvious and easy to subscribe to
- it avoids overloading the semantics of lobby payloads
- it gives dev/QA a narrow surface for post-game verification

For MVP, the server may also embed the same `rematch` object inside `lobby:state` and `game:state` for convenience. If duplicated, all copies must be identical for the same room version.

## Types

```ts
export type RematchStatus = 'unavailable' | 'idle' | 'waiting' | 'accepted';

export interface RematchView {
  available: boolean;
  status: RematchStatus;
  requestedBySlot: {
    0: boolean;
    1: boolean;
  };
  requestedByYou: boolean;
  waitingForOtherPlayer: boolean;
  bothAccepted: boolean;
  eligiblePlayerCount: 0 | 1 | 2;
}
```

### Shared payload addition
Recommended extension to room-facing payloads:

```ts
interface LobbyStatePayload {
  roomCode: string;
  phase: RoomPhase;
  // existing fields...
  rematch?: RematchView;
}

interface PublicGameStatePayload {
  roomCode: string;
  phase: 'starting' | 'in-progress' | 'game-over';
  // existing fields...
  rematch?: RematchView;
}
```

Rules:
- `rematch` may be omitted outside post-game / waiting contexts if the implementation prefers
- recommended: always include it for consistency once the feature ships
- during `starting` and `in-progress`, `rematch.available` should be `false`

## New client -> server event

### `game:rematch-request`
Signals that the calling player wants another round in the same room.

```ts
export interface GameRematchRequestPayload {}
```

Validation:
- socket must belong to a room
- room phase must be `game-over`
- caller must still occupy one of the room's current player slots
- room must still have two occupied/connected players for the request to remain actionable

Behavior:
- mark caller's acceptance as `true`
- broadcast updated rematch state
- if both players have accepted, start rematch immediately via normal countdown path

Idempotency:
- repeating the same request from the same slot should be a no-op if already accepted
- server must not create duplicate countdowns or duplicate starts

Error path:
- invalid phase or caller state should emit `room:error`
- recommended reason for MVP: existing `ACTION_NOT_ALLOWED`

## New server -> client event

### `game:rematch-state`
Authoritative post-game rematch snapshot for the room.

```ts
export interface GameRematchStatePayload {
  roomCode: string;
  phase: 'game-over' | 'waiting-for-players' | 'lobby' | 'starting';
  rematch: RematchView;
  version: number;
  message?: string;
}
```

Emit when:
- round first enters `game-over`
- one player requests rematch
- both players have requested rematch
- a player leaves/disconnects after game over
- room returns to waiting/open state after stale rematch state is cleared

Client expectations:
- render rematch CTA only when `rematch.available` is true
- show waiting copy when `waitingForOtherPlayer` is true
- clear post-game rematch UI when state becomes `unavailable`

## Existing event changes

### `game:ended`
Current event already communicates round completion. Extend its semantics so clients know the room may remain open.

Recommended addition:

```ts
interface GameEndedPayload {
  roomCode: string;
  phase: 'game-over';
  result: { /* existing fields */ };
  finalState: PublicGameStatePayload;
  teardownAt: number | null;
  version: number;
}
```

Rules:
- for standard rematch-capable round end, `teardownAt` should be `null`
- if implementation still has a teardown path for exceptional cases, it may provide a timestamp
- `finalState.rematch` should show initial rematch availability with both flags false when both players remain connected

### `lobby:state`
Recommended addition:

```ts
interface LobbyStatePayload {
  // existing fields...
  rematch?: RematchView;
}
```

Semantics:
- in ordinary pre-game lobby flow, `rematch.available = false`
- after a post-game leave returns the room to `waiting-for-players`, `rematch.available = false` and both flags false
- this helps the remaining player clear stale result/rematch UI and return to normal lobby waiting UI

### `game:state`
Recommended addition:

```ts
interface PublicGameStatePayload {
  // existing fields...
  rematch?: RematchView;
}
```

Semantics by phase:
- `starting` / `in-progress`: rematch unavailable
- `game-over`: rematch reflects acceptance status and availability

### `game:start`
No new transport event is required, but semantics change slightly for rematch.

Current payload is acceptable if it still represents the start of a fresh round in the same room.

Recommended note:
- `roomCode` remains unchanged from previous round
- `startedAt` refers to the new round only
- `version` must advance from post-game state

### `game:countdown`
No new payload required.

Semantics:
- countdown should fire for a rematch exactly like an initial round start
- clients should not care whether countdown source is initial ready flow or rematch flow

### `player:left`
Current payload is still acceptable:

```ts
interface PlayerLeftPayload {
  roomCode: string;
  slotIndex: 0 | 1;
  reason: 'left' | 'disconnected';
}
```

Post-game semantics:
- if emitted while room was in `game-over`, the remaining player must also receive updated room/rematch state showing that rematch is no longer pending and the room is open again

### `room:closed`
Normal successful round end should no longer imply automatic `room:closed`.

New rule:
- do not emit `room:closed` merely because a round completed
- emit it only when the room is actually being destroyed (for example, both players gone, or other future explicit close conditions)

This is the main contract change downstream consumers must honor.

## Recommended event constants

```ts
export const EVENTS = {
  // existing events...
  gameRematchRequest: 'game:rematch-request',
  gameRematchState: 'game:rematch-state',
} as const;
```

## Canonical rematch state examples

### 1. Round just ended, both players still present
```json
{
  "roomCode": "ABCD",
  "phase": "game-over",
  "rematch": {
    "available": true,
    "status": "idle",
    "requestedBySlot": { "0": false, "1": false },
    "requestedByYou": false,
    "waitingForOtherPlayer": false,
    "bothAccepted": false,
    "eligiblePlayerCount": 2
  },
  "version": 41,
  "message": "Round complete. Choose rematch to play again."
}
```

### 2. Player 1 accepted, waiting on player 2
```json
{
  "roomCode": "ABCD",
  "phase": "game-over",
  "rematch": {
    "available": true,
    "status": "waiting",
    "requestedBySlot": { "0": true, "1": false },
    "requestedByYou": true,
    "waitingForOtherPlayer": true,
    "bothAccepted": false,
    "eligiblePlayerCount": 2
  },
  "version": 42,
  "message": "Waiting for the other player to accept rematch."
}
```

### 3. Both players accepted, round restarting
```json
{
  "roomCode": "ABCD",
  "phase": "starting",
  "rematch": {
    "available": false,
    "status": "accepted",
    "requestedBySlot": { "0": true, "1": true },
    "requestedByYou": true,
    "waitingForOtherPlayer": false,
    "bothAccepted": true,
    "eligiblePlayerCount": 2
  },
  "version": 43,
  "message": "Rematch accepted. Starting now."
}
```

Implementation note:
- it is acceptable to skip broadcasting this intermediate accepted snapshot if the server transitions immediately into `game:countdown` / `game:start`
- if skipped, the next visible payloads must still be consistent

### 4. Opponent leaves after game over
```json
{
  "roomCode": "ABCD",
  "phase": "waiting-for-players",
  "rematch": {
    "available": false,
    "status": "unavailable",
    "requestedBySlot": { "0": false, "1": false },
    "requestedByYou": false,
    "waitingForOtherPlayer": false,
    "bothAccepted": false,
    "eligiblePlayerCount": 1
  },
  "version": 44,
  "message": "Other player left. Room is open for another player."
}
```

## Sequence diagrams

### A. One player accepts first
```text
server -> both: game:ended
server -> both: game:rematch-state { status: idle }

player-0 -> server: game:rematch-request
server -> both: game:rematch-state { status: waiting, requestedBySlot[0]=true }
```

### B. Both players accept
```text
server -> both: game:ended
server -> both: game:rematch-state { status: idle }

player-0 -> server: game:rematch-request
server -> both: game:rematch-state { status: waiting }

player-1 -> server: game:rematch-request
server -> both: game:countdown { secondsRemaining: 3 }
server -> both: game:countdown { secondsRemaining: 2 }
server -> both: game:countdown { secondsRemaining: 1 }
server -> both: game:countdown { secondsRemaining: 0 }
server -> both: game:start
server -> both: game:state
```

### C. Waiting player loses opponent
```text
server -> both: game:ended
player-0 -> server: game:rematch-request
server -> both: game:rematch-state { status: waiting }

player-1 disconnects
server -> player-0: player:left
server -> player-0: lobby:state { phase: waiting-for-players, rematch.available=false }
server -> player-0: game:rematch-state { status: unavailable }
```

## Validation matrix

### `game:rematch-request`
Allowed:
- caller is in room
- phase = `game-over`
- room still has two occupied connected players

Rejected with `ACTION_NOT_ALLOWED`:
- caller not in a room
- phase is `waiting-for-players`, `lobby`, `starting`, or `in-progress`
- caller no longer occupies a room slot
- room composition changed such that rematch is unavailable

## Backward-compatibility notes
1. Existing clients may currently assume `room:closed` after every `game:ended`; that assumption must be removed.
2. Existing `game-over` UI likely needs to stop resetting back to the create/join flow automatically.
3. Existing shared types should be expanded in place under `src/shared/contracts.ts`.
4. Tests should assert that a normal completed round no longer emits `room:closed` immediately.

## Test assertions for the next agent
Add socket/service tests to verify:
1. `game:ended` on normal completion is followed by rematch-available state, not forced `room:closed`
2. first `game:rematch-request` updates only one slot's acceptance
3. second request starts a fresh countdown in the same `roomCode`
4. post-rematch `game:start` has reset score/tick/board state
5. post-game disconnect emits `player:left` plus cleared rematch state
6. replacement join after post-game leave works through existing `room:join` + lobby flow
