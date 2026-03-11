# Feature Spec: Core Gameplay Loop

## Status
Draft for stakeholder approval

## Proposed Feature Slug
`core-gameplay-loop`

## Feature Summary
As a player, I want the snake match to run as a complete realtime round with movement, food, speed progression, collision resolution, countdown, and round-end results so that the room lobby feature becomes a playable competitive game.

## Scope
In scope for this feature:
- 30x30 gameplay grid
- snake spawning and initial movement state
- fixed starting snake length of 3
- authoritative server tick loop for active matches
- 3-second countdown before gameplay begins
- one shared food item on the board at a time
- food consumption that increases snake length
- speed progression as more food is eaten
- player direction input during active play
- prevention of instant reverse direction input
- wall collision handling
- self-collision handling
- snake-to-snake collision handling
- simultaneous death draw handling
- authoritative winner / loser / draw result state
- post-match result screen
- room teardown after round end so players must create/join again from scratch

Out of scope for this feature:
- replay/rematch in the same room
- persistent score history
- matchmaking beyond room codes
- custom player names
- spectator mode
- reconnect recovery
- power-ups or obstacles

## Stakeholder Decisions Captured
- Board size is 30x30.
- Each snake starts at length 3.
- Only one food item appears on the board at a time.
- Food is shared, so both players compete for the same target.
- Game speed increases as more food is eaten.
- If one snake dies, the other player wins.
- If both snakes die on the same tick, the outcome is a draw.
- Players cannot instantly reverse direction.
- Each round begins with a 3-second countdown.
- After game over, players see a win/lose/draw result screen.
- After the round ends, the room is cleared rather than returning to a reusable lobby; players must create/join a new game from scratch.

## Assumptions
- Speed progression applies to the round globally rather than per-player, so both snakes remain synchronized on the same tick rate.
- Eating food increases both snake length and score.
- The current room/lobby flow from issue #3 remains the entry point into gameplay.
- Result screen duration may be brief and implementation-defined, as long as the round-end state is clearly visible before the room is cleared.

## User Scenarios

### Scenario 1: Match starts after countdown
**As a player**, I want a short countdown before movement begins so both players can prepare for the round start.

#### Expected behavior
- Once both players are present and ready, the match enters a countdown state.
- The UI clearly shows a 3-second countdown.
- Snakes do not move during the countdown.
- When the countdown completes, gameplay begins automatically.

### Scenario 2: Control a moving snake
**As a player**, I want to steer my snake during the match so I can compete for food and avoid dying.

#### Expected behavior
- Each player controls one snake.
- The snake moves automatically on the server tick.
- The player can send direction changes while the round is active.
- The server applies only valid direction changes.
- A player cannot instantly reverse into the opposite direction.

### Scenario 3: Compete for shared food
**As a player**, I want both snakes to compete for the same food item so the round feels contested.

#### Expected behavior
- Only one food item is present on the board at a time.
- When a snake reaches the food, that snake consumes it.
- Consuming food increases the snake’s length.
- Consuming food increases the score for that snake.
- A new food item spawns after one is consumed.
- Food must spawn in a valid empty cell.

### Scenario 4: Experience increasing speed
**As a player**, I want the round to speed up as more food is eaten so the match becomes more intense over time.

#### Expected behavior
- The round starts at a baseline speed.
- As food is eaten, the tick rate increases according to implementation rules.
- Both players experience the same authoritative speed progression.
- Speed increases must not desynchronize the clients from server state.

### Scenario 5: Lose, win, or draw based on collisions
**As a player**, I want the game to resolve deaths clearly so the round ends with an understandable outcome.

#### Expected behavior
- A snake dies if it collides with a wall.
- A snake dies if it collides with itself.
- A snake dies if it collides with the other snake according to the server’s collision rules.
- If one snake dies and the other survives, the surviving player wins.
- If both snakes die on the same tick, the round ends in a draw.
- The server publishes one authoritative result to both players.

### Scenario 6: See the result, then leave the finished room behind
**As a player**, I want to see the round result and then return to a clean start state so a new game begins from scratch.

#### Expected behavior
- At round end, both players see a result screen showing win, lose, or draw.
- After the result is shown, the finished room is cleared/closed.
- Players do not remain connected in a reusable lobby.
- To play again, players must create a new room and join again.

## Functional Requirements

### Match start and board setup
1. The system must start active gameplay on a 30x30 grid.
2. Each snake must start with length 3.
3. The system must place both snakes in valid spawn positions that do not overlap.
4. The system must assign each snake an initial direction according to implementation rules.
5. After both players are ready, the system must enter a pre-game countdown state.
6. The countdown must last 3 seconds.
7. The system must not advance snake movement until the countdown completes.
8. When the countdown completes, the system must start gameplay automatically.

### Movement and input
9. The server must run the match on an authoritative tick loop.
10. Snakes must continue moving automatically while the round is active.
11. A player must be able to send direction input during active gameplay.
12. The server must validate direction input before applying it.
13. The system must reject immediate reversal to the opposite direction.
14. Direction input handling must preserve synchronized authoritative state for both players.

### Food and scoring
15. The system must keep exactly one food item on the board at a time.
16. Food must spawn only on an unoccupied valid grid cell.
17. When a snake consumes food, that snake’s length must increase.
18. When a snake consumes food, that snake’s score must increase.
19. After food is consumed, a new food item must spawn.
20. Both players must receive the updated authoritative game state after food consumption.

### Speed progression
21. The round must begin at a baseline speed.
22. The system must increase game speed as more food is eaten.
23. Speed progression must apply consistently for both players within the same round.
24. The system must keep speed changes under server authority rather than client timing.

### Collision and round resolution
25. The system must detect wall collisions.
26. The system must detect self-collisions.
27. The system must detect snake-to-snake collisions.
28. If one snake dies and the other survives on the resolving tick, the surviving player must win.
29. If both snakes die on the same resolving tick, the round must end as a draw.
30. When the round ends, the server must stop active gameplay progression.
31. The server must broadcast the authoritative round result to both players.

### Post-game behavior
32. The UI must show a result state of win, lose, or draw at round end.
33. After the round result is shown, the completed room must be cleared or closed.
34. Players must not remain in a reusable lobby after round end.
35. Starting another game after round end must require creating/joining a room again from scratch.

## Non-Functional Requirements
- Gameplay state must remain server-authoritative.
- The feature must work for exactly 2 anonymous players.
- The match loop must run on a single backend instance with in-memory state.
- The game state updates should be fast enough to feel responsive in normal browser play on the target VM deployment.
- Collision and winner resolution must be deterministic.

## Edge Cases
- Both snakes attempt to move into fatal positions on the same tick.
- A queued direction input arrives just before a tick and must still honor no-instant-reverse rules.
- Food would otherwise spawn inside either snake body and must be rerolled.
- Speed progression increases enough to stress UI rendering and network update timing.
- A player disconnects during countdown or active gameplay; implementation must resolve the round consistently with existing room lifecycle rules.

## Acceptance Criteria
1. After both players are ready, the game shows a 3-second countdown before movement begins.
2. The round runs on a 30x30 board with each snake starting at length 3.
3. During active play, each player can control only their own snake direction.
4. The game blocks immediate reversal into the opposite direction.
5. Exactly one shared food item is present on the board at a time.
6. Eating food increases the consuming snake’s length and score.
7. As more food is eaten, the game speed increases for the round.
8. Wall collisions, self-collisions, and snake-to-snake collisions end the round according to server rules.
9. If only one snake dies, the other player is declared the winner.
10. If both snakes die on the same tick, the round ends in a draw.
11. At round end, players see a result screen with win, lose, or draw.
12. After the result screen, the room is cleared and players must create/join a new game from scratch to play again.

## Open Notes for Implementation
- Collision ordering for head-to-head and cross-over cases must be documented explicitly in the architecture/design artifacts.
- Speed progression should be simple and predictable for MVP rather than highly tuned.
- Result-screen duration can be implementation-defined as long as it is clearly visible before room teardown.
