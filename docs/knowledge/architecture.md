# Architecture

## Product Summary
Multiplayer Snake MVP foundation for the web: a quick, fun prototype for exactly 2 anonymous players per room.

## High-Level Architecture
The product uses a client-server realtime game architecture:

- **Frontend**: React + Vite + TypeScript web app
- **Rendering**: HTML5 Canvas for gameplay rendering
- **Backend**: Node.js + TypeScript server
- **Realtime transport**: WebSockets via Socket.IO
- **Game model**: Server-authoritative realtime game loop

## Core Architectural Decision
The backend is the source of truth for all gameplay state.

Clients do **not** simulate authoritative game outcomes. Instead:
- clients send direction inputs only
- server validates inputs
- server advances the game on a fixed tick loop
- server broadcasts canonical game state to both players

This minimizes cheating, keeps both players synchronized, and simplifies collision resolution.

## System Components

### 1. Web Client
Responsibilities:
- create room flow
- join room by code
- lobby UI with player presence and ready state
- canvas-based gameplay rendering
- input capture for snake direction changes
- game-over and replay UX
- rendering score and match state

The client should be kept thin. It is primarily a view/input layer over server state.

### 2. Realtime Game Server
Responsibilities:
- manage room lifecycle in memory
- generate and validate room join codes
- track connected players per room
- manage ready state in lobby
- start game automatically when room has exactly 2 players and both are ready
- run the fixed game tick loop
- process player input messages
- compute movement, food spawning, scoring, collisions, deaths, and winner/game-over state
- broadcast room/game state updates to connected clients
- support replay/reset flow for a completed match

### 3. In-Memory Room and Match State
No database is used for the MVP.

State lives only in server memory:
- room metadata
- join code mapping
- player connection/session state
- lobby readiness
- active game state
- scores
- replay/reset state

Consequence:
- a server restart clears all active rooms and matches
- no long-term persistence, user accounts, or match history exists in MVP

## Room Model
Each room supports:
- exactly 2 players
- one creator/host action path for room creation
- one shared room code for joining
- anonymous participation only

Suggested room lifecycle:
1. room created (with explicit room mode: versus, solo, or co-op)
2. second player joins via code when applicable
3. both players toggle Ready
4. match auto-starts for playable modes; non-playable foundations may stop at lobby until gameplay ships
5. game reaches win/loss/draw terminal state
6. players may trigger replay flow

## Match Flow
1. Player A creates room
2. Player B joins with room code
3. Both players appear in lobby
4. Each player marks ready
5. Server auto-starts when both ready
6. During game, clients send direction inputs only
7. Server broadcasts state updates on each tick
8. Server resolves food, score, collisions, and deaths
9. Server emits winner/game-over state
10. Replay path resets match state while keeping room alive unless players leave

## Gameplay Rules for MVP
Classic snake rules:
- wall collision kills the snake
- self collision kills the snake
- collision with the other snake also kills the snake
- food spawning increases score and/or length according to implementation rules
- winner/game-over state is determined by server-authoritative collision results

If both snakes die on the same tick, treat this as a supported simultaneous-resolution scenario and define final winner behavior clearly in feature specs (draw or tie-break rule).

## Networking Model
Recommended event categories:
- room create / room created
- room join / join success / join rejected
- lobby state updated
- ready toggled
- game started
- direction input
- game state updated
- round ended / game over
- replay requested / replay state updated
- disconnect / room closed / player left

The backend should prefer event-driven updates over polling.

## Tick Loop
Use a fixed server tick for deterministic updates.

Principles:
- one authoritative loop per active room/match
- all movement and collision resolution happen on the server tick
- inputs received between ticks are queued/applied according to server rules
- all clients render based on server snapshots/state updates

## Reliability Expectations for MVP
This is a prototype, so the architecture should optimize for simplicity and fast iteration over scale.

Not in scope for MVP:
- persistence
- matchmaking beyond room codes
- spectator mode
- reconnection recovery guarantees
- horizontal scaling / distributed room state
- bot players
- user accounts

## Future-Friendly Boundaries
Even though MVP is in-memory only, keep code boundaries clean enough to later replace:
- in-memory room store with Redis/database-backed coordination
- anonymous session model with authenticated users
- single-instance deployment with scalable realtime infrastructure
- basic game events with analytics/telemetry

## Deployment Shape
Deploy as a simple web frontend plus a single backend process capable of holding in-memory room state and Socket.IO connections. Single-instance deployment is the expected MVP topology.