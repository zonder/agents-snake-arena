# Design: Replay / Rematch Flow

## Summary
This design extends the existing in-memory 2-player `RoomService` so a completed round can be replayed in the **same room** with the **same room code**.

The core rule is simple:
- after `game-over`, both currently connected players may independently accept a rematch
- the next round starts only when **both** players have accepted
- the room stays open if one player leaves after game over
- starting a rematch creates a **brand-new match state** and runs the normal countdown again
- the system does **not** return through the original pre-game ready flow

This feature should reuse the current server-authoritative room lifecycle and gameplay engine rather than introducing a second replay-specific subsystem.

## Existing baseline
Today the repo already has:
- a server-authoritative `RoomService`
- in-memory room records keyed by `roomCode`
- room phases: `waiting-for-players` / `lobby` / `starting` / `in-progress` / `game-over`
- gameplay countdown + tick runtime
- terminal `game-over` handling followed by forced `room:closed` teardown after ~3 seconds

That forced teardown is the main behavior that must change for this feature.

## Design goals
1. Keep rematch state entirely server-authoritative.
2. Preserve the same room code and player slot identities across rounds when both players stay.
3. Require explicit dual acceptance before replay.
4. Fully reset round state with no leakage from the previous match.
5. Preserve current waiting-room behavior when one player leaves after game over.
6. Minimize implementation churn by evolving `RoomService`, not replacing it.

## High-level approach

### 1. Keep completed rooms alive after `game-over`
Replace the current "always teardown after result window" behavior with a reusable post-game state:
- room remains in memory after `game-over`
- final result remains visible
- room can accept post-game actions
- room is only destroyed when both players are gone, or when the remaining lifecycle rules say it should be removed

### 2. Add rematch acceptance state to the room record
The room needs explicit, per-slot rematch tracking that is separate from pre-game ready state.

Recommended addition:

```ts
interface RematchState {
  requestedBySlot: {
    0: boolean;
    1: boolean;
  };
  eligiblePlayerCount: 0 | 1 | 2;
  status: 'unavailable' | 'idle' | 'waiting' | 'accepted';
}
```

Recommended `RoomRecord` extension:

```ts
interface RoomRecord {
  roomCode: string;
  phase: RoomPhase;
  version: number;
  players: [PlayerSlot, PlayerSlot];
  match: MatchState | null;
  countdown: CountdownState | null;
  teardownAt: number | null;
  rematch: RematchState;
}
```

Implementation note:
- `ready` continues to mean **pre-game lobby readiness only**
- `rematch.requestedBySlot` is a distinct post-game concept
- do not overload `ready` to mean both things

## State model

### Room phases
Keep the existing room phases and semantics:
- `waiting-for-players`
- `lobby`
- `starting`
- `in-progress`
- `game-over`

Do **not** add a separate `rematch-pending` room phase for MVP.

Why:
- `game-over` already represents the correct broad state
- rematch is a sub-state of `game-over`
- keeping one terminal room phase reduces branching in client and server code

Instead, represent rematch via a dedicated `rematch` object published in room/game payloads.

### Rematch sub-states within `game-over`
Inside `game-over`:
- `idle`: no connected player has accepted rematch yet
- `waiting`: exactly one connected player has accepted
- `accepted`: both connected players have accepted and restart is being committed
- `unavailable`: fewer than 2 connected/occupied players are currently eligible

Suggested derivation:
- both players present, none accepted -> `idle`
- both players present, one accepted -> `waiting`
- both players present, two accepted -> `accepted`
- otherwise -> `unavailable`

## Authoritative data rules

### Eligibility
Only the two players currently occupying the room's slots for that finished round are eligible to accept rematch.

A rematch action is valid only when:
- room exists
- room phase is `game-over`
- caller still occupies a live room slot
- both player slots are still occupied and connected when attempting to actually start the rematch

### Acceptance persistence
Acceptance should persist while the room composition remains unchanged.

Examples:
- player 1 accepts, player 2 has not yet accepted -> keep player 1's acceptance true
- player 2 later accepts -> start rematch
- player 1 accepts, then player 2 disconnects -> clear stale acceptance because room composition changed

### Reset-on-membership-change rule
Any leave/disconnect after `game-over` invalidates the pending rematch agreement.

On post-game leave/disconnect:
- clear the departed slot from the room as usual
- set both `requestedBySlot` values to `false`
- set `match` to `null` after preserving any client-visible final result long enough to be consumed, or preserve final result separately if needed for UI
- transition room back to `waiting-for-players`
- keep room code alive for the remaining player

This directly satisfies the requirement to clear stale rematch acceptance when room state changes.

## Lifecycle transitions

### A. Round ends normally
Current flow:
- gameplay loop determines result
- room enters `game-over`
- `game:ended` is emitted
- room is later torn down automatically

New flow:
1. gameplay loop determines result
2. room enters `game-over`
3. server clears any old rematch flags to `{0:false,1:false}`
4. server emits updated room/game payloads showing rematch is available
5. server does **not** schedule forced room teardown for `round-complete`

Result: both players stay in the same room and can request rematch.

### B. One player requests rematch first
1. client emits rematch request
2. server verifies caller belongs to the room and phase is `game-over`
3. server marks that player's rematch acceptance `true`
4. server recalculates rematch status = `waiting`
5. server broadcasts updated authoritative state to both players

Client outcome:
- requester sees "Waiting for other player"
- other player sees that opponent wants a rematch
- no countdown starts yet

### C. Second player accepts rematch
1. second client emits rematch request
2. server marks acceptance for that slot
3. server atomically verifies both slots are still occupied and connected
4. server creates a fresh `MatchState`
5. server clears post-game result/teardown metadata
6. server clears rematch acceptance back to false/false
7. room phase becomes `starting`
8. normal 3-second countdown starts
9. existing `game:countdown`, `game:start`, and `game:state` flow resumes

Important: this bypasses the original lobby ready-up path.

### D. One player leaves after game over
1. player disconnects or explicitly leaves while room phase is `game-over`
2. room removes that player from the slot
3. rematch acceptance is reset for both slots
4. remaining player receives `player:left` plus updated room/rematch state
5. room phase returns to `waiting-for-players`
6. room stays joinable via the same code

This aligns post-game leave handling with the earlier lobby rule: the room survives when one player leaves.

### E. Replacement player joins after post-game leave
If one player left after game over and the room returned to `waiting-for-players`, a replacement second player may join using the same room code.

Recommended behavior after replacement joins:
- replacement player joins into ordinary lobby flow
- both players must use the normal lobby ready flow for the next round
- they do **not** inherit rematch state from the previous opponent pairing

Rationale:
- rematch is for the same two players from the finished round
- a replacement player represents a new session pairing, not a continuation of the prior rematch offer

## Reset semantics for a new rematch round
When a rematch starts, treat it exactly like a fresh call to `createInitialMatchState(roomCode)`.

The next agent should ensure these are reset from scratch:
- both player scores = `0`
- both snakes reset to initial body positions
- snake directions reset to default starting directions
- queued input buffers cleared
- alive/dead state reset to alive
- food respawned from a fresh valid initial spawn
- foods eaten counter reset
- tick number reset to `0`
- speed / `tickIntervalMs` reset to default starting speed
- countdown restarts from `3`
- terminal result and death reason data from the prior round cleared
- any previous teardown timer canceled

Implementation rule:
- never mutate the previous `MatchState` back toward "fresh"
- construct a new `MatchState` object and replace the old one atomically

That minimizes state leakage bugs.

## Server design changes

### 1. `finishMatch(...)`
Update `finishMatch(...)` so it supports two different outcomes:

#### Round completed normally
For `round-complete`:
- enter `game-over`
- publish final game/result payloads
- initialize/reset rematch state
- **do not** schedule `room:closed`

#### Player disconnected during active play
For `player-disconnected` during `starting` or `in-progress`:
- preserve the current behavior that ends the round immediately
- after the disconnect mutation completes, room should remain open if one player remains
- do not force-close the room solely because gameplay ended by disconnect

Recommended simplification:
- separate `finishMatch(...)` from `scheduleRoomClosure(...)`
- only call closure when room truly needs destruction, not as an automatic post-game rule

### 2. `leaveCurrentRoom(...)`
Extend leave handling with explicit post-game behavior.

Current code already:
- clears departing slot
- deletes room when empty
- returns surviving player to `waiting-for-players` in lobby phases

New requirement for `game-over`:
- treat post-game leave like lobby leave, not like fatal room teardown
- clear rematch state
- clear stale ready state on remaining player if applicable
- set `match = null` once post-game state is no longer needed for the next flow
- set `phase = waiting-for-players`
- broadcast `player:left` and refreshed `lobby:state`

### 3. Add explicit rematch action handler
Introduce a dedicated `requestRematch(socketId)` room-service method.

Responsibilities:
- validate room and phase
- locate caller slot
- reject if caller already accepted and action is idempotent/no-op
- set caller's rematch acceptance
- broadcast rematch state update
- if both accepted, transition directly into `starting`

Optional extension for future flexibility:
- support `setRematch(socketId, accepted: boolean)` so a player can cancel before the second acceptance

For MVP, the spec only requires acceptance/request, not cancel.

### 4. Start path reuse
Refactor `afterLobbyMutation(room)` into a more generic start primitive so both flows can reuse it:
- lobby ready flow
- rematch accepted flow

Suggested split:

```ts
private startRound(room: RoomRecord, source: 'initial-start' | 'rematch'): ClientEvent[]
private canStartInitialRound(room: RoomRecord): boolean
private canStartRematch(room: RoomRecord): boolean
```

`startRound(...)` should:
- set phase to `starting`
- create fresh `MatchState`
- create fresh countdown state
- clear terminal result metadata
- emit countdown/game-state events
- schedule countdown runtime

## Client design implications

### Result screen behavior
After `game:ended`, the result screen should remain visible, but it must now show rematch controls instead of waiting for forced room closure.

UI states:
- neutral: "Play again?"
- local accepted: "Waiting for other player..."
- remote accepted only: "Other player wants a rematch"
- both accepted / starting: countdown resumes immediately

### Room continuity
Client should no longer assume `game-over` is always followed by `room:closed`.

Instead:
- stay bound to the same room code after result
- keep rendering authoritative updates
- transition back to lobby if a player leaves and server reports `waiting-for-players`

### Open room after leave
When server reports that one player left after game over:
- keep the remaining player in-room
- show same room code
- show waiting/open messaging consistent with the lobby
- clear any rematch CTA state derived from prior opponent acceptance

## Concurrency and correctness notes

### Nearly simultaneous rematch clicks
Because Node processes events serially within the same process, two rematch requests can be handled safely if the service:
- mutates room state synchronously
- re-checks both slot occupancies before starting
- transitions to `starting` exactly once

Guardrail:
- if room phase is no longer `game-over` by the time the second request is processed, reject or no-op it

### Duplicate acceptance / button spam
If a player clicks rematch more than once:
- repeated requests should be idempotent
- server should not increment version excessively unless state changed
- do not start multiple countdowns

### Disconnect during rematch waiting
If one player accepted and the other disconnects:
- clear both acceptance flags
- revert to `waiting-for-players`
- keep room open for replacement

### Disconnect during rematch countdown
If both accepted and countdown started, existing `starting` disconnect rules should apply:
- current round attempt terminates
- surviving player remains in reusable room
- room returns to open/waiting state rather than forced destruction

## Suggested implementation order
1. Extend shared contracts with rematch event and payload types.
2. Extend `RoomRecord` with rematch state.
3. Remove unconditional room teardown after normal `game-over`.
4. Implement post-game rematch request handler in `RoomService`.
5. Refactor round-start logic into a reusable `startRound(...)` helper.
6. Update leave/disconnect handling so `game-over` returns to an open room when one player remains.
7. Update client result-screen state and rematch CTA rendering.
8. Add tests for rematch acceptance, reset semantics, post-game leave, and replacement join behavior.

## Required tests
The next agent should add service/integration coverage for at least:
1. normal round end keeps room alive and exposes rematch state
2. one rematch acceptance produces waiting state only
3. second rematch acceptance starts fresh countdown in same room
4. rematch resets score, snakes, food, tick number, and speed
5. rematch does not require pre-game ready flow
6. one player leaves after game over and room remains open
7. rematch acceptance is cleared when a player leaves after game over
8. replacement player can join same room after post-game leave
9. duplicate rematch requests do not start duplicate countdowns
10. disconnect during rematch countdown resolves cleanly without corrupting room state

## Handoff guidance for fullstack dev
- Treat this as an evolution of `RoomService`, not a rewrite.
- Reuse the existing countdown + gameplay runtime; do not invent a separate rematch engine.
- Make `game-over` a reusable room state instead of a short-lived teardown-only state.
- Keep initial lobby ready-up and post-game rematch acceptance as distinct concepts in data and UI.
- Prefer introducing one authoritative rematch snapshot/event shape and derive UI strictly from server state.
