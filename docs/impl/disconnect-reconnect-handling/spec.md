# Feature Spec: Disconnect / Reconnect Handling

## Status
Draft for stakeholder approval

## Feature Summary
As a player, I want temporary disconnects and page refreshes to be handled gracefully so that a match or room is not unnecessarily ruined when someone drops and returns.

## Scope
In scope for this feature:
- disconnect detection
- reconnect flow for players returning to an existing room/session
- preserving room/match continuity during temporary disconnects
- player-facing status for disconnected/reconnecting states
- timeout-based slot reservation
- reconnect behavior across lobby, gameplay, and post-game/rematch states
- automatic slot reclaim on successful reconnect

Out of scope for this feature:
- account-based identity across devices
- long-term persistence
- spectator mode
- matchmaking recovery across unrelated rooms
- full offline mode
- reconnect across unrelated browsers/devices without local session continuity

## Stakeholder Decisions Captured
- Disconnect reservation timeout is **30 seconds**.
- During active gameplay, the match should **pause briefly**, then the remaining player should win if the disconnected player does not return in time.
- If the player reconnects in time, they should **automatically reclaim the same slot**.
- If gameplay timeout expires, the **remaining player wins**.
- In lobby and rematch states, the disconnected player’s slot should be reserved for the timeout and then reopened.
- Reconnect identity for MVP should use **same browser/device via local session token**.

## Assumptions
- Reconnect handling will rely on a short-lived local session token stored client-side.
- The server remains authoritative over slot ownership and reconnect eligibility.
- A brief gameplay pause should be clearly communicated to both players.
- Automatic slot reclaim means no extra manual reconnect confirmation is required if the same browser/device returns with a valid token.

## User Scenarios

### Scenario 1: Reconnect during lobby
**As a player**, I want to reconnect to my room after a brief disconnect so I don’t lose my place.

#### Expected behavior
- If I disconnect briefly in the lobby, my slot is reserved for 30 seconds.
- The other player sees that I am temporarily disconnected.
- If I return within 30 seconds from the same browser/device, I automatically reclaim my same slot.
- If I do not return in time, my slot reopens.

### Scenario 2: Reconnect during active gameplay
**As a player**, I want the game to handle a disconnect predictably so the match outcome feels fair.

#### Expected behavior
- If a player disconnects during active gameplay, the match pauses briefly.
- The UI communicates that reconnect is being awaited.
- If the player returns within the allowed reconnect window, they automatically resume in their same slot.
- If they do not return in time, the remaining player wins.

### Scenario 3: Reconnect after game over / during rematch
**As a player**, I want reconnect behavior to still make sense after a round ends so rematch flow is not unnecessarily lost.

#### Expected behavior
- If a player disconnects in post-game/rematch state, their slot is reserved for 30 seconds.
- The remaining player sees that the other player can still return.
- If the disconnected player does not return in time, the slot reopens.

## Functional Requirements
1. The system must detect player disconnects.
2. The system must communicate disconnect state to the remaining player.
3. The system must reserve a disconnected player’s slot for 30 seconds.
4. The system must allow a reconnecting player from the same browser/device to automatically reclaim their same slot via local session token.
5. The server must remain authoritative over reconnect eligibility and slot reclaim.
6. During active gameplay, a disconnect must trigger a temporary pause state.
7. If the disconnected gameplay player reconnects within the timeout, gameplay must resume consistently.
8. If the disconnected gameplay player does not reconnect within the timeout, the remaining player must win.
9. In lobby state, if the disconnected player does not return within the timeout, the slot must reopen.
10. In post-game/rematch state, if the disconnected player does not return within the timeout, the slot must reopen.
11. The reconnect flow must work without requiring a user account system for MVP.

## Non-Functional Requirements
- Reconnect handling should reduce frustration from brief network interruptions.
- The rules should be predictable and easy for players to understand.
- The reconnect flow must not depend on full authentication for MVP.
- Pause/reconnect status should be visually clear in the UI.

## Edge Cases
- A player refreshes during countdown.
- A player disconnects and reconnects multiple times within the timeout window.
- A player reconnects just before timeout expiry.
- The remaining player leaves while waiting for the disconnected player.
- A local session token is missing or invalid after refresh.

## Acceptance Criteria
1. If a player disconnects in lobby state, their slot is reserved for 30 seconds.
2. If that player reconnects within 30 seconds from the same browser/device, they automatically reclaim their same slot.
3. If the player does not reconnect in time from lobby/rematch state, the slot reopens.
4. If a player disconnects during active gameplay, the match pauses and clearly shows reconnect-waiting state.
5. If the disconnected gameplay player reconnects within 30 seconds, the match resumes.
6. If the disconnected gameplay player does not reconnect within 30 seconds, the remaining player is declared the winner.
7. Reconnect identity works via same browser/device local session token.
8. The reconnect flow works across lobby, gameplay, and post-game/rematch states.
9. The experience is understandable to both the disconnected and remaining player.

## Open Notes for Implementation
- The UI should make timeout and reconnect status explicit.
- The pause state during gameplay should feel intentional, not like a broken match.
- Local token handling should be lightweight and scoped to MVP needs.
