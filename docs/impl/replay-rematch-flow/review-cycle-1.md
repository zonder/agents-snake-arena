# Review Cycle 1

## Verdict
CHANGES_REQUESTED

## What I reviewed
- PR #16 against `docs/impl/replay-rematch-flow/spec.md`
- `docs/impl/replay-rematch-flow/design.md`
- `docs/impl/replay-rematch-flow/api-contracts.md`
- `docs/impl/replay-rematch-flow/dev-notes.md`
- Server/client implementation and automated coverage

## What looks good
- Rematch gating stays server-authoritative in `RoomService` and only transitions to a fresh round after both players accept.
- Rematch reuses the same room code and correctly creates a fresh `MatchState` with a new countdown.
- Post-game leave/disconnect clears stale rematch acceptance and keeps the room joinable for a replacement player.
- Coverage was added for the main replay/rematch scenarios, and the current test suite/build pass locally after installing dependencies.

## Required fixes

### 1. Make `game:rematch-request` idempotent once a player has already accepted
**Why it matters:**
The API contract explicitly says repeated requests from the same slot should be a no-op. Right now `requestRematch()` always sets the slot to `true`, increments `room.version`, and rebroadcasts state even when that player already accepted. That violates the contract and can create unnecessary state churn/version bumps if a client retries or a user double-clicks.

**Where:**
- `src/server/roomService.ts` → `requestRematch()`

**What to change:**
- If `room.rematch.requestedBySlot[player.slotIndex]` is already `true`, return without mutating room state or incrementing the version.
- Add a regression test proving duplicate requests from the same player do not advance version or emit a second state transition.

### 2. Make duplicated rematch payloads truly identical across `lobby:state`, `game:state`, and `game:rematch-state`
**Why it matters:**
The API contract says that if rematch data is duplicated across payloads, all copies must be identical for the same room version. The current implementation serializes viewer-specific rematch data in `lobby:state` / `game:rematch-state`, but `game:state` calls `buildRematchView(room)` without a viewer socket, so `requestedByYou` is always `false` there. That means the same room version can expose different rematch objects depending on which event the client reads.

This mismatch is especially relevant because the browser stores and renders rematch UI from multiple event types.

**Where:**
- `src/server/roomService.ts`
  - `serializeLobbyState()` uses `this.buildRematchView(room, viewerSocketId)`
  - `buildRematchStateEvents()` uses `this.buildRematchView(room, player.socketId)`
  - `serializeGameState()` uses `this.buildRematchView(room)`

**What to change:**
- Either make `game:state` viewer-specific too, or remove viewer-specific fields from the duplicated payload shape.
- At minimum, ensure `requestedByYou` is consistent anywhere the same `rematch` object is exposed for a given viewer/version.
- Add a test covering a one-player-accepted state and asserting the rematch object seen by the requesting player is consistent across the emitted event types.

## Validation performed
- `npm install`
- `npm test`
- `npm run build`
