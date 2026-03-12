# Core Gameplay Loop Architecture

## Scope
This design extends the existing 2-player room lobby into a complete authoritative Snake round for issue #10.

It focuses on:
- authoritative server tick loop
- 3-second countdown state
- deterministic movement and collision resolution
- shared food spawning and score/length growth
- global speed progression
- round-end result publication
- room teardown after a short result display window

This document does **not** implement code. It defines the server state model, update order, and integration points for the next agent.

## Current Baseline
The repository already provides:
- in-memory `RoomService`
- room create/join/ready flow
- `waiting-for-players` / `lobby` / `starting` / `in-progress` room phases
- Socket.IO transport with shared event constants in `src/shared/contracts.ts`

The current `starting` phase is effectively instantaneous. For this feature, `starting` becomes a real countdown phase and `in-progress` becomes a full active match state.

## Architectural Goals
1. Keep gameplay fully server-authoritative.
2. Make every round resolution deterministic.
3. Preserve simple single-instance in-memory architecture.
4. Keep the client thin: input + rendering only.
5. Support exactly 2 anonymous players.
6. Tear down the completed room after result visibility instead of returning to a reusable lobby.

## Recommended Module Boundaries

### 1. `RoomService` remains the orchestration boundary
`RoomService` should continue owning:
- room lifecycle
- socket-to-room mapping
- ready state and disconnect handling
- countdown start triggers
- creation/destruction of per-room gameplay runtime
- broadcast of room/game events

### 2. Add a gameplay runtime/controller per active room
Recommended new server-side unit:
- `GameRuntime` or `MatchRuntime`

Responsibilities:
- hold gameplay state for one room
- schedule countdown ticks and gameplay ticks
- receive validated direction intents from `RoomService`
- advance match state in deterministic steps
- emit snapshots / result events back to `RoomService`
- stop timers cleanly on game end or disconnect

### 3. Add pure gameplay logic helpers
Recommended pure functions/modules:
- `createInitialMatchState(...)`
- `applyQueuedInputs(...)`
- `advanceOneTick(...)`
- `resolveCollisions(...)`
- `spawnFood(...)`
- `computeSpeedLevel(...)`
- `buildPublicGameState(...)`

Keeping tick advancement mostly pure will make review and future testing much easier.

## State Model

## Room-level additions
Extend each room record with a gameplay section:

```ts
interface RoomRecord {
  roomCode: string;
  phase: 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress' | 'game-over';
  version: number;
  players: [PlayerSlot, PlayerSlot];
  match?: MatchState;
  countdown?: CountdownState;
  teardownAt?: number | null;
}
```

### MatchState
```ts
type Direction = 'up' | 'down' | 'left' | 'right';

type MatchStatus = 'countdown' | 'active' | 'ended';

type RoundResult = 'player-0-win' | 'player-1-win' | 'draw';

interface GridPoint {
  x: number;
  y: number;
}

interface SnakeState {
  slotIndex: 0 | 1;
  direction: Direction;
  pendingDirection: Direction | null;
  body: GridPoint[]; // head at index 0
  alive: boolean;
  growBy: number;
  score: number;
}

interface CountdownState {
  startedAt: number;
  endsAt: number;
  secondsRemaining: 3 | 2 | 1 | 0;
}

interface MatchState {
  roomCode: string;
  board: {
    width: 30;
    height: 30;
  };
  tickNumber: number;
  status: MatchStatus;
  snakes: [SnakeState, SnakeState];
  food: GridPoint;
  foodsEaten: number;
  tickIntervalMs: number;
  startedAt: number | null;
  endedAt: number | null;
  result: RoundResult | null;
  deathReasons: Array<
    | { slotIndex: 0 | 1; reason: 'wall' | 'self' | 'head-to-head' | 'head-to-body' | 'cross-over' | 'disconnect' }
  >;
  winnerSlotIndex: 0 | 1 | null;
}
```

## Spawn Rules
Use deterministic spawn positions symmetric across the board to avoid overlap and avoid accidental immediate death.

Recommended MVP spawn layout:
- Player 1 head at `(7, 15)`, facing `right`
- Player 2 head at `(22, 15)`, facing `left`
- Each snake length 3, extending opposite its facing direction

So initial bodies become:
- Player 1: `[(7,15), (6,15), (5,15)]`
- Player 2: `[(22,15), (23,15), (24,15)]`

Why this choice:
- centered vertically
- enough horizontal spacing for fair opening
- easy to reason about and render
- deterministic for debugging and QA

If future layout randomization is desired, it must still preserve non-overlap and fair spacing.

## Countdown Design

### Trigger
When both players are present and ready:
1. `RoomService` creates initial `MatchState`
2. room phase becomes `starting`
3. countdown starts at 3 seconds
4. countdown events/snapshots are broadcast immediately
5. no snake movement occurs during countdown

### Countdown behavior
Recommended implementation:
- store `countdown.endsAt = now + 3000`
- broadcast a countdown update immediately with `secondsRemaining = 3`
- schedule updates at 2s, 1s, and 0s remaining, or emit on a 250ms heartbeat if simpler
- when countdown reaches zero, transition to active gameplay and start the tick loop

### Key rule
The countdown is a distinct visible state. It is not enough to emit `game:start` and begin movement immediately.

## Authoritative Tick Loop

## Baseline rate
Recommended MVP baseline:
- initial `tickIntervalMs = 200` (5 ticks/sec)

This is simple, readable, and easy for a browser client to render.

## Runtime approach
Prefer one timer per active room, using a self-adjusting `setTimeout` loop instead of raw `setInterval`.

Reasoning:
- easier to change speed after food consumption
- easier to cancel on game end
- avoids overlapping work if a tick takes longer than expected

Pseudo-flow:
```ts
function scheduleNextTick(roomCode: string, delayMs: number) {
  setTimeout(() => {
    runGameplayTick(roomCode);
  }, delayMs);
}
```

After each resolved tick:
- compute current speed interval
- schedule next tick using the updated interval

## Input Handling

### Client behavior
Clients send direction intents only.

### Server behavior
For each snake store:
- current `direction`
- one `pendingDirection`

When an input arrives during countdown or active play:
1. validate the player belongs to the room
2. validate phase is `starting` or `in-progress`
3. normalize direction string
4. reject opposite-of-current direction
5. if a pending direction already exists, replace it only if the new one is still valid relative to current direction and not identical noise

### Why a single pending direction slot
For MVP, one queued turn per snake is enough because:
- it prevents unbounded input buffering
- it handles "pressed just before tick" correctly
- it keeps behavior deterministic and easy to reason about

### Reverse rule
A direction is invalid if it is the exact opposite of the snake's current movement direction.

Important: validation should be against the snake's **effective direction for the upcoming tick**, not just the last key press.

Practical rule:
- if `pendingDirection` exists, validate new input against `pendingDirection`
- otherwise validate against current `direction`

This prevents `left -> up -> right` abuse from sneaking in a reversal before the next movement.

## Tick Resolution Order
This ordering is the core architectural decision for determinism.

For each gameplay tick, execute in exactly this order:

1. **Freeze current state**
   - read both snakes' current bodies and directions

2. **Apply queued direction changes**
   - convert each snake's `pendingDirection` into its tick direction if valid
   - clear `pendingDirection`

3. **Compute candidate next heads**
   - move each snake's head one cell using its tick direction

4. **Determine food consumers**
   - identify whether either candidate head lands on the food cell
   - if both candidate heads hit the same food cell on the same tick, both are marked as consumers for collision resolution purposes, but the collision rules below still determine survival/result

5. **Build candidate next bodies**
   - prepend the candidate head
   - if that snake consumed food, do not remove tail and increment `growBy/score`
   - otherwise remove the last segment

6. **Evaluate deaths using candidate positions for both snakes simultaneously**
   - wall collisions
   - self-collisions
   - snake-to-snake head-to-body collisions
   - head-to-head same-cell collision
   - cross-over collision (heads swap cells in the same tick)

7. **Apply death outcomes simultaneously**
   - mark all dead snakes on the same resolving tick before determining winner

8. **Commit state**
   - if round continues, commit candidate bodies, scores, food, and speed
   - if food was consumed by any surviving snake and round continues, spawn exactly one new food item in an empty cell

9. **Update speed progression**
   - recompute `tickIntervalMs` from total foods eaten in the round

10. **Publish authoritative snapshot**
   - send one state update to both players

11. **If terminal, publish result and stop loop**
   - transition room to `game-over`
   - emit result payload
   - schedule room teardown

## Collision Resolution Rules
These rules should be copied directly into implementation comments/tests because they define the feature.

### 1. Wall collision
A snake dies if its candidate head is outside the 30x30 board.

### 2. Self collision
A snake dies if its candidate head overlaps any segment in its own candidate body excluding the head position itself.

Using the candidate body correctly handles tail movement. Moving into the cell just vacated by your own tail is legal when not growing.

### 3. Head-to-body collision
A snake dies if its candidate head overlaps any segment of the other snake's candidate body excluding the other snake's head.

Using the other snake's candidate body means:
- moving into a cell the other snake's tail vacates this tick is legal if the tail truly moved away
- moving into a cell preserved because the other snake ate food is fatal

### 4. Head-to-head same-cell collision
If both candidate heads occupy the same cell on the same tick, both snakes die and the result is a draw unless one had already died from another cause as well; in practice both are dead, so the round is a draw.

### 5. Cross-over collision
If snake A's candidate head equals snake B's current head **and** snake B's candidate head equals snake A's current head on the same tick, both snakes die.

This explicit rule prevents ambiguous "passing through each other" outcomes.

### 6. Simultaneous multi-cause deaths
If one or both snakes satisfy multiple death conditions on the same tick, they are still just marked dead once; all deaths are considered simultaneous for winner determination.

## Winner Determination
After all death checks for the tick complete:
- if both snakes are dead: `draw`
- if only player 0 is dead: player 1 wins
- if only player 1 is dead: player 0 wins
- otherwise: round continues

Do not short-circuit after finding the first death. Winner calculation must happen only after evaluating both snakes for the same tick.

## Food Rules

### Food count
Exactly one food item exists on the board at a time.

### Spawn timing
- initial food spawns during match initialization before countdown begins
- replacement food spawns only after consumption and only if the round remains active

### Spawn algorithm
Compute the set of empty cells by excluding all occupied snake segments. Choose one uniformly at random.

Recommended helper:
```ts
function spawnFood(board, snakes, random = Math.random): GridPoint
```

If no empty cells remain:
- treat as a terminal round condition
- recommended MVP outcome: player with higher score wins, otherwise draw

This state is extremely unlikely on a 30x30 board, but the function should not loop forever.

### Simultaneous food contest
If both snakes reach the food cell on the same tick:
- both are treated as consuming for body-growth candidate construction
- if both also die due to head-to-head on that cell, result is draw and no replacement food matters because round ends
- if future rules ever allow one to survive, replacement food is spawned once after the tick, not per consumer

For MVP this is mostly relevant to preserving deterministic resolution ordering.

## Score and Growth Rules
When a snake consumes food:
- increase `score` by 1
- increase body length by 1 on that same tick by keeping the tail segment
- increment round-level `foodsEaten`

Prefer this direct-growth model over delayed-growth counters for MVP simplicity, unless the implementation already uses `growBy` internally.

## Speed Progression
Use simple global progression tied to total foods eaten by either player.

Recommended schedule:
- foods eaten 0-2: `200ms`
- foods eaten 3-5: `170ms`
- foods eaten 6-8: `140ms`
- foods eaten 9+: `120ms`

Properties:
- easy to document
- easy to test
- same for both players
- bounded so rendering/network load stays reasonable

Alternative acceptable implementation:
```ts
interval = Math.max(120, 200 - foodsEaten * 10)
```

But the stepped schedule above is preferred because it creates clearer gameplay phases and simpler QA expectations.

## Disconnect Handling
The parent spec notes disconnect resolution must follow existing room lifecycle rules.

Recommended behavior for this feature:
- if a player disconnects during countdown or active gameplay, end the round immediately
- disconnected player loses by `disconnect`
- connected player wins
- if both disconnect effectively simultaneously, result is draw and room is deleted

This is consistent with the existing ephemeral room model and avoids reconnect complexity.

## Post-Game Result Window and Room Teardown

### Result state
After a terminal tick:
1. room phase becomes `game-over`
2. active tick timer is cancelled
3. clients receive a final authoritative `game:ended` / `game:state` snapshot with result metadata
4. room remains available only long enough for both clients to render the result screen

### Recommended result visibility window
Use a fixed result display duration of **3000ms**.

### Teardown behavior
After the display window:
- emit a `room:closed` event with reason `round-complete`
- disconnect both sockets from the room context on the server side
- remove socket-to-room mappings
- delete the room record entirely

This explicitly satisfies the requirement that players must create/join a fresh room to play again.

## Client Rendering Expectations
The client should render from authoritative snapshots and phase/result metadata.

Minimum UI states:
- lobby
- countdown
- active game
- result screen
- room closed / reset back to entry flow

The client should not attempt to infer the winner locally from geometry.

## Server Event Flow Summary
1. Both players ready
2. `lobby:state` shows `starting`
3. `game:countdown` events publish `3`, `2`, `1`
4. `game:start` marks transition into active play
5. repeated `game:state` snapshots broadcast board state
6. `game:ended` broadcasts final outcome and death reasons
7. `room:closed` forces return to fresh create/join flow

## Data Ownership and Determinism Notes
- Server time drives countdown and teardown.
- Server tick count drives gameplay progression.
- Server-generated snapshots are canonical.
- Clients may animate between snapshots, but must reconcile to the latest authoritative state.
- Random food spawning should be isolated behind a helper to keep future tests deterministic.

## Implementation Sequence for Next Agent
1. Extend shared contracts with countdown/game-state/result events and payload types.
2. Extend room phases to include `game-over`.
3. Refactor `RoomService.afterMutation()` so ready state starts a real countdown instead of immediately entering `in-progress`.
4. Introduce per-room gameplay runtime with cancellable timers.
5. Implement deterministic initial board creation and food spawning.
6. Add `player:direction:set` event handling with server-side validation and one-slot input queue.
7. Implement tick advancement in the exact resolution order documented above.
8. Emit authoritative snapshots every tick and final result payload on terminal state.
9. Add teardown timer to delete the room after the result screen window.
10. Ensure disconnect during `starting` / `in-progress` resolves the round and cleans up timers.

## Open Implementation Notes
- The parent issue body says `feature/issue-4`, but this task and checkout correctly use `feature/issue-10`; implementation should continue on `feature/issue-10`.
- The approved spec file was not present in the branch checkout at the time of design, so this architecture was derived from the parent issue body and existing knowledge docs. The next agent should keep artifacts under `docs/impl/core-gameplay-loop/` on `feature/issue-10`.
