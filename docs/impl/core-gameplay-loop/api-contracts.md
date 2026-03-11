# Core Gameplay Loop Socket Contracts

## Purpose
This document defines the recommended Socket.IO contract additions for the core gameplay loop feature.

The current repo already has lobby-level contracts for room creation/join/ready flow. This feature should extend those contracts rather than inventing a second transport model.

## Contract Design Principles
- server authoritative for countdown, movement, collisions, score, and result
- client sends intent only
- all payloads scoped to one room
- snapshots contain enough data for thin clients to render the board without local simulation
- terminal result is explicit and never inferred by the client

## Shared Types

```ts
type RoomPhase =
  | 'waiting-for-players'
  | 'lobby'
  | 'starting'
  | 'in-progress'
  | 'game-over';

type Direction = 'up' | 'down' | 'left' | 'right';

type RoundResult = 'win' | 'lose' | 'draw';

type DeathReason = 'wall' | 'self' | 'head-to-head' | 'head-to-body' | 'cross-over' | 'disconnect';

interface GridPoint {
  x: number;
  y: number;
}

interface PublicSnakeState {
  slotIndex: 0 | 1;
  body: GridPoint[];
  direction: Direction;
  alive: boolean;
  score: number;
}

interface PublicGameStatePayload {
  roomCode: string;
  phase: 'starting' | 'in-progress' | 'game-over';
  tickNumber: number;
  board: {
    width: 30;
    height: 30;
  };
  food: GridPoint;
  snakes: [PublicSnakeState, PublicSnakeState];
  foodsEaten: number;
  tickIntervalMs: number;
  countdownSecondsRemaining?: 3 | 2 | 1 | 0;
  result?: {
    outcome: RoundResult;
    winnerSlotIndex: 0 | 1 | null;
    deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  };
  version: number;
}
```

## Client -> Server Events

### `player:direction:set`
Sent by a player to request a direction change during countdown or active gameplay.

```ts
interface PlayerDirectionSetPayload {
  direction: Direction;
}
```

Validation rules:
- socket must belong to a player in the room
- room phase must be `starting` or `in-progress`
- direction must be one of `up/down/left/right`
- immediate reversal is rejected
- server stores at most one pending direction per snake

Behavior notes:
- allowed during countdown so the opening move can be queued
- applied on the next authoritative tick after gameplay starts
- no acknowledgement is required for success if snapshots are frequent, but invalid inputs should emit `room:error` with `ACTION_NOT_ALLOWED` or a gameplay-specific error if the implementation adds one

## Server -> Client Events

### `game:countdown`
Broadcast to both players whenever the pre-game countdown changes.

```ts
interface GameCountdownPayload {
  roomCode: string;
  phase: 'starting';
  secondsRemaining: 3 | 2 | 1 | 0;
  startsAt: number;
  serverNow: number;
  version: number;
}
```

Usage:
- client renders visible 3-second pre-game countdown
- snakes remain stationary while this event sequence is in progress

### `game:start`
Broadcast once when countdown completes and active play begins.

```ts
interface GameStartPayload {
  roomCode: string;
  phase: 'in-progress';
  board: {
    width: 30;
    height: 30;
  };
  players: [
    { slotIndex: 0; label: 'Player 1' },
    { slotIndex: 1; label: 'Player 2' }
  ];
  tickIntervalMs: number;
  startedAt: number;
  version: number;
}
```

Notes:
- the existing `game:start` event can be expanded rather than replaced
- this event should not fire until movement is actually about to begin

### `game:state`
Broadcast after every authoritative gameplay tick and also optionally once at countdown initialization so clients can render the board before movement.

```ts
type GameStatePayload = PublicGameStatePayload;
```

Minimum expectations:
- contains full snake bodies for both players
- contains current food position
- contains scores and alive flags
- contains current `tickIntervalMs`
- contains `tickNumber` for client debugging/reconciliation

### `game:ended`
Broadcast once when the round reaches a terminal outcome.

```ts
interface GameEndedPayload {
  roomCode: string;
  phase: 'game-over';
  result: {
    bySlot: {
      0: 'win' | 'lose' | 'draw';
      1: 'win' | 'lose' | 'draw';
    };
    winnerSlotIndex: 0 | 1 | null;
    deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  };
  finalState: PublicGameStatePayload;
  teardownAt: number;
  version: number;
}
```

Why both `result` and `finalState`:
- `result` gives a direct UX-ready outcome
- `finalState` preserves the final board for rendering the result screen

### `room:closed`
Broadcast when the result display window is over and the room is torn down.

```ts
interface RoomClosedPayload {
  roomCode: string;
  reason: 'round-complete' | 'player-disconnected';
  version: number;
}
```

Client expectation:
- clear local room/game state
- return player to create/join entry flow
- do not offer replay within the same room

## Existing Event Compatibility
The current shared contract contains:
- `room:create`
- `room:created`
- `room:join`
- `room:joined`
- `room:error`
- `lobby:state`
- `player:ready:set`
- `player:left`
- `game:start`

Recommended additions to `EVENTS`:

```ts
export const EVENTS = {
  roomCreate: 'room:create',
  roomCreated: 'room:created',
  roomJoin: 'room:join',
  roomJoined: 'room:joined',
  roomError: 'room:error',
  lobbyState: 'lobby:state',
  playerReadySet: 'player:ready:set',
  playerLeft: 'player:left',
  playerDirectionSet: 'player:direction:set',
  gameCountdown: 'game:countdown',
  gameStart: 'game:start',
  gameState: 'game:state',
  gameEnded: 'game:ended',
  roomClosed: 'room:closed',
} as const;
```

## Phase Semantics

### `starting`
Means:
- both players are present and ready
- board state exists
- 3-second countdown is visible
- movement has not started yet

### `in-progress`
Means:
- authoritative tick loop is running
- direction input can change future movement
- food, scores, and collision resolution are active

### `game-over`
Means:
- round outcome has been resolved
- gameplay has stopped
- result is visible until teardown

## Snapshot Frequency Guidance
Recommended behavior:
- emit `game:state` once immediately when countdown begins so clients can render spawn positions and food
- emit `game:state` after every active gameplay tick
- emit `game:ended` once at terminal transition

If implementation wants fewer custom event handlers, it may also include enough information in `game:state` for countdown/result rendering, but `game:countdown` and `game:ended` remain recommended because they simplify client state transitions.

## Error Handling Guidance
The current `LobbyErrorReason` union is room/lobby-specific. For MVP, the dev agent can either:
1. continue using `ACTION_NOT_ALLOWED` for invalid direction input, or
2. extend error reasons with gameplay-specific variants such as `INVALID_DIRECTION`

Recommendation:
- keep MVP simple and reuse `ACTION_NOT_ALLOWED` unless UX clearly needs more precision

## Example Round Timeline

### Countdown start
Server emits:
1. `lobby:state` with `phase: 'starting'`
2. `game:state` with initial board, food, scores, `countdownSecondsRemaining: 3`
3. `game:countdown` with `secondsRemaining: 3`

### Countdown progression
Server emits:
- `game:countdown` with `2`
- `game:countdown` with `1`
- `game:countdown` with `0`

### Active round start
Server emits:
- `game:start`
- `game:state` after first authoritative tick
- subsequent `game:state` after each tick

### Round end
Server emits:
- `game:ended` with result and final state
- after result window, `room:closed`

## Contract Notes for the Next Agent
- Keep all payload types in `src/shared/contracts.ts` so both server and client can share them.
- Preserve backward compatibility where reasonable, but treat `game:start` as expandable because the current payload is too small for gameplay.
- Full board snapshots are acceptable for MVP; delta compression is unnecessary at this stage.
- Include `version` or `tickNumber` in gameplay payloads to aid reconciliation and debugging.
