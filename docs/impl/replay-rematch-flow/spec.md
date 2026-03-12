# Feature Spec: Replay / Rematch Flow

## Status
Draft for stakeholder approval

## Feature Summary
As a player, I want to request a rematch with the same opponent in the same room after a round ends so that we can quickly play again without creating a new room from scratch.

## Scope
In scope for this feature:
- post-game rematch UI
- both-player rematch acceptance flow
- waiting state when only one player accepts rematch
- replay in the same room with the same room code
- full round reset for rematch
- score reset for the new round
- fresh countdown before the rematch starts
- room behavior when one player leaves after game over

Out of scope for this feature:
- matchmaking with a new opponent
- persistent match history
- timeout-based rematch expiration
- ranked scoring or session totals across rounds
- spectator support

## Stakeholder Decisions Captured
- Both players must accept the rematch.
- Rematch stays in the same room with the same room code.
- Once both players accept, the rematch starts directly without going back to a separate ready-state flow.
- If only one player accepts, the UI should show that it is waiting for the other player.
- If one player leaves after game over, the room stays open.
- Scores reset to 0 for the new round.
- Rematch performs a full reset: fresh snake positions, fresh food, fresh countdown, normal starting speed.
- There is no special timeout behavior for rematch acceptance.

## Assumptions
- The same two currently connected players are the only players eligible to accept a rematch for that finished round.
- If the room stays open after one player leaves, it returns to a valid waiting/lobby-like state according to current room lifecycle rules.
- A rematch starts a brand-new round but does not require generating a new room code.

## User Scenarios

### Scenario 1: Both players want another round
**As a player**, I want to quickly start another match with the same opponent after game over.

#### Expected behavior
- After the round ends, both players see a rematch option.
- A player can accept/request rematch.
- When both players have accepted, the system starts a fresh round in the same room.
- The room code remains the same.

### Scenario 2: One player accepts first
**As a player**, I want to know when I am waiting for the other player to agree to a rematch.

#### Expected behavior
- If only one player accepts rematch, the UI shows a waiting state.
- The other player can still choose whether to accept.
- The round does not restart until both players accept.

### Scenario 3: Start a rematch with a clean slate
**As a player**, I want the rematch to feel like a brand-new round, not a continuation of the last one.

#### Expected behavior
- Scores reset to 0.
- Snake positions reset.
- Food resets.
- Speed resets to the normal starting speed.
- A fresh countdown appears before movement begins.

### Scenario 4: One player leaves after the round ends
**As a player**, I want the room to remain available if the other player leaves after game over.

#### Expected behavior
- If one player leaves after game over, the room remains open.
- The remaining player does not get forced into room destruction solely because the other player left.
- The room returns to a waiting/open state according to room rules.

## Functional Requirements

### Rematch request flow
1. After a round ends, the system must present both players with a rematch option.
2. The system must track rematch acceptance independently for each player.
3. One player accepting rematch must not restart the round by itself.
4. The system must restart the round only when both players have accepted rematch.
5. The UI must show when a player is waiting for the other player to accept.

### Room continuity
6. A rematch must occur in the same room.
7. The room code must remain unchanged for the rematch.
8. The same connected players should remain associated with that room for the rematch flow.

### Round reset behavior
9. When a rematch starts, the system must fully reset round state.
10. Scores must reset to 0.
11. Snake positions and movement state must reset.
12. Food state must reset to a fresh valid spawn.
13. Speed progression must reset to the normal starting speed.
14. The system must show the normal countdown before the rematch round begins.
15. The rematch must begin without requiring the separate pre-game ready-state flow used for first-time room start.

### Leave/disconnect behavior after game over
16. If a player leaves after game over, the room must remain open.
17. The remaining player must receive an updated room/rematch state.
18. The system must clear any stale rematch acceptance that no longer applies once a player leaves.
19. The room must return to a valid waiting/open state after such a leave event.

### Timeout behavior
20. The system must not enforce any special rematch timeout for MVP.
21. A rematch request may remain pending until another player responds or room state changes.

## Non-Functional Requirements
- Rematch state must remain server-authoritative.
- Reset behavior must be deterministic and consistent for both players.
- The rematch flow must not require page refresh.
- The same-room rematch should minimize friction relative to creating a new room.

## Edge Cases
- Both players click rematch at nearly the same time.
- One player accepts rematch, then disconnects.
- One player leaves after game over while the other is waiting on rematch.
- A rematch starts only after both players have accepted, even if one acceptance was earlier.
- Fresh round reset must not leak score, speed, or board state from the previous round.

## Acceptance Criteria
1. After game over, both players can see and use a rematch option.
2. The round restarts only after both players accept rematch.
3. If only one player accepts, the UI clearly shows that it is waiting for the other player.
4. The rematch happens in the same room with the same room code.
5. Starting a rematch resets scores to 0.
6. Starting a rematch resets snakes, food, speed, and other round state.
7. Starting a rematch shows a fresh countdown before movement begins.
8. Rematch does not require going back through the separate ready-state flow.
9. If one player leaves after game over, the room remains open.
10. No special rematch timeout interrupts the waiting state.

## Open Notes for Implementation
- The UI should make rematch acceptance state obvious for both players.
- Room/open-state behavior after a post-game leave should align with the existing room lifecycle introduced earlier, rather than inventing a separate room model.
