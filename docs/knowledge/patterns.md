# Patterns

## Product Patterns

### Thin Client, Authoritative Server
Use a thin-client pattern:
- client captures input and renders UI/game state
- server owns room state, rules, timing, and outcomes

Do not let the client determine authoritative movement, collisions, score, or match result.

### Room-Based Multiplayer Flow
Use short-lived room sessions as the core product interaction model:
- player creates room
- room generates shareable join code
- second player joins
- both ready up
- match auto-starts

Rooms should be simple and ephemeral.

### Fixed Tick Realtime Loop
Game simulation should follow a fixed-step server loop instead of ad hoc per-message updates.

Benefits:
- deterministic rule application
- simpler collision handling
- consistent pacing across players
- easier debugging of realtime behavior

### Input-Only Client Messaging
Clients should send only player intent:
- direction changes
- ready toggle
- replay request
- room join/create actions

Clients should not send authoritative position, score, food, or collision outcomes.

### Explicit Match State Machine
Represent room/match lifecycle with clear states, for example:
- waiting-for-players
- lobby
- ready-to-start
- in-progress
- round-ended
- replay-pending
- closed

This reduces ambiguous transitions and simplifies UI/server synchronization.

### Shared Contract Types
Use shared TypeScript types/interfaces where practical for:
- room state
- player state
- game board entities
- socket event payloads
- match phases

This helps frontend and backend stay aligned.

## UX Patterns

### Fast Time-to-Play
Optimize for minimal friction:
- create room quickly
- share join code easily
- join with short code
- auto-start when both ready

### Lobby Before Gameplay
Always place players in a lobby before the match starts.

Lobby should communicate:
- player slots
- join status
- ready status
- match start conditions

### Clear Game State Feedback
The UI should always make the current state obvious:
- waiting for opponent
- both players joined
- ready status
- in-game score
- game over result
- replay prompt/options

### Replay Without Recreating Room
Prefer replay/reset within the same room after game over, unless one/both players leave.

## Engineering Patterns

### Separation of Concerns
Keep code boundaries clear:
- UI and rendering logic on the client
- socket transport layer isolated from game rules
- game engine/rules separated from room/session orchestration
- room management separated from presentation concerns

### Deterministic Collision Resolution
Process movement and collisions in a defined order each tick. Document any simultaneous-death behavior explicitly in feature specs and implementation docs.

### Graceful Disconnect Handling
Even though MVP is simple, handle disconnects explicitly:
- mark player as disconnected
- end or invalidate active match as needed
- notify remaining player
- decide whether room closes immediately or returns to waiting state

### Ephemeral State Simplicity
Because there is no persistence:
- avoid adding abstractions that imply durable storage
- keep in-memory repositories/stores simple
- optimize for clarity over extensibility

### Single-Instance Assumption
Assume one backend instance for MVP. Do not design core room synchronization around distributed nodes yet.

## Spec Writing Pattern for This Product
When defining future features/specs, describe behavior from the player perspective and always include:
- room entry conditions
- ready/start conditions
- realtime gameplay expectations
- disconnect/error behavior
- end-of-round behavior
- replay behavior
- explicit acceptance criteria for edge cases