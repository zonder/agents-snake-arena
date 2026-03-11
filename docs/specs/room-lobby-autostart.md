# Feature Spec: Create/Join Room + 2-Player Lobby with Ready State and Auto-Start

## Status
Draft for stakeholder approval

## Feature Summary
As a player, I want to create or join a private 2-player room, wait together in a lobby, mark myself ready, and have the match start automatically once both players are ready.

## Scope
In scope for this feature:
- create room
- generate room code
- join room with room code
- enforce exactly 2 players per room
- show lobby with both player slots
- show ready/unready state per player
- allow each player to toggle their own ready state
- auto-start the match when exactly 2 players are present and both are ready
- handle core join and lobby error states
- handle lobby disconnect/leave behavior

Out of scope for this feature:
- gameplay loop details
- food spawning
- scoring
- collision logic
- winner/game-over rules
- replay flow
- persistence
- authentication beyond anonymous participation

## Stakeholder Decisions Captured
- Room code format: 4–6 letters
- Creator share UX: PM recommendation is code display + copy button
- Join errors required: invalid code, room full, game already started, room no longer exists
- If one player unreadies before start, auto-start is canceled until both are ready again
- If one player leaves/disconnects before start, the room remains open for a replacement player
- Both players have the same rights in the lobby; creator has no special privileges
- Replay is out of scope for this feature

## Assumptions
- Room codes will use uppercase letters only for readability unless changed during implementation review
- Anonymous players do not set usernames in this feature unless implementation adds lightweight labels such as "Player 1" and "Player 2"
- Match start transfers the room from lobby state into gameplay state managed by the server

## User Scenarios

### Scenario 1: Create a room
**As a player**, I want to create a new private room so I can invite another player.

#### Expected behavior
- The player can choose a create-room action from the web app
- The system creates a new room on the server
- The system generates a join code that is 4–6 letters long
- The creator is placed into the room lobby immediately
- The lobby displays the room code clearly
- The lobby provides a copy action for the room code
- The creator sees that one player slot is filled and one is waiting

### Scenario 2: Join a room with a code
**As a player**, I want to enter a room code and join an existing room so I can play with my friend.

#### Expected behavior
- The player can enter a room code and submit a join action
- The server validates the code
- If valid and joinable, the player enters the room lobby
- The lobby updates for both connected players to show 2 occupied slots
- If the room is not joinable, the player sees a clear error state

### Scenario 3: Wait together in a lobby
**As a player**, I want to see whether the other player has joined and whether they are ready so I know when the match will begin.

#### Expected behavior
- The lobby shows exactly two player slots
- Each slot shows whether it is occupied or waiting
- Each connected player sees their own ready status and the other player’s ready status
- The lobby clearly communicates that the match starts automatically once both players are present and ready

### Scenario 4: Toggle ready state
**As a player**, I want to mark myself ready or unready before the game begins so the match starts only when both players are prepared.

#### Expected behavior
- Each player can toggle only their own ready state
- Ready-state changes are synchronized in real time to both players
- If both players are present and both are ready, the match auto-starts
- If one player unreadies before the match starts, the pending start condition is canceled

### Scenario 5: Handle lobby exits before start
**As a player**, I want the lobby to react clearly if the other player leaves before the match starts so I know what happens next.

#### Expected behavior
- If one player disconnects or leaves before the match starts, the other player remains in the room lobby
- The vacant player slot returns to waiting status
- The remaining player’s ready state behavior should be recalculated according to server rules
- The room remains open for a replacement second player
- Both the remaining player and any future joining player see the current valid lobby state

## Functional Requirements

### Room creation
1. The system must allow an anonymous player to create a room.
2. The system must generate a room code that is 4–6 letters long.
3. The system must ensure the room code maps to a single active room.
4. The system must place the creating player into the lobby immediately after room creation.
5. The system must return/display the room code in the lobby.
6. The UI should provide a copy button for the room code.

### Room joining
7. The system must allow an anonymous player to attempt to join via room code.
8. The system must reject invalid room codes.
9. The system must reject joins to rooms that no longer exist.
10. The system must reject joins to rooms that already contain 2 players.
11. The system must reject joins to rooms whose game has already started if late joining is not supported.
12. On successful join, both players must see the same authoritative lobby state.

### Lobby behavior
13. Each room must support exactly 2 player slots.
14. The lobby must show occupancy state for both slots.
15. The lobby must show ready/unready state for each connected player.
16. Players must have equal permissions in the lobby; the room creator must not have special controls.
17. The lobby must communicate the auto-start condition clearly.

### Ready state
18. A player must be able to toggle only their own ready/unready state.
19. Ready-state updates must be broadcast to the other player in real time.
20. The server must not start the match unless exactly 2 players are present.
21. The server must not start the match unless both players are ready.
22. When both players are present and both are ready, the server must auto-start the match.
23. If a player unreadies before auto-start completes, the system must cancel the start condition and return to lobby waiting state.

### Leave/disconnect handling before match start
24. If a player leaves or disconnects before the match starts, their slot must become open again.
25. The room must remain open for a replacement second player.
26. The remaining player must receive an updated lobby state.
27. The system must prevent stale ready conditions from accidentally triggering a start after a player leaves.

### Error handling
28. The system must provide a clear player-facing error for invalid room code.
29. The system must provide a clear player-facing error for room full.
30. The system must provide a clear player-facing error for game already started.
31. The system must provide a clear player-facing error for room no longer exists.

## Non-Functional Requirements
- Lobby state must be synchronized through the server as the source of truth.
- The implementation must work with anonymous players only.
- Room and lobby state must live in memory only for MVP.
- The feature must be designed for a single backend instance.
- The UI should minimize time-to-play and unnecessary friction.

## Edge Cases
- A player enters a malformed or lowercase code; system should normalize or reject consistently.
- Two join attempts arrive near-simultaneously for the final room slot; only one may succeed.
- A player toggles ready repeatedly; both clients must still converge on server truth.
- A player disconnects immediately after both become ready; game must not start unless server conditions are still valid.
- A room becomes empty before match start; implementation may safely clean it up in memory.

## Acceptance Criteria
1. A player can create a room and immediately land in a lobby with a visible 4–6 letter room code.
2. The creator can copy the room code from the lobby UI.
3. A second player can join the room using the code if the room exists, is not full, and the game has not started.
4. The room never allows more than 2 players.
5. Both players see a 2-slot lobby with accurate occupancy state.
6. Both players can see each player’s ready/unready state in real time.
7. Each player can toggle only their own ready state.
8. The match does not start until 2 players are present and both are ready.
9. The match auto-starts once both players are present and both are ready.
10. If either player unreadies before the match starts, auto-start is canceled.
11. If one player leaves before the match starts, the room stays open and the lobby returns to waiting for a second player.
12. Join attempts fail with clear errors for invalid code, room full, game already started, and room no longer exists.

## Open Notes for Implementation
- Recommended default: use uppercase alphabetic room codes for readability.
- If countdown-to-start UX is added during implementation, it must still honor cancel-on-unready behavior.
- Player labels can be generic (for example, Player 1 / Player 2) unless a later feature introduces custom names.