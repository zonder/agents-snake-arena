# Disconnect / reconnect handling design

## Overview
This feature upgrades the current single-process Socket.IO room service from a **socket-bound occupancy model** to a **server-authoritative slot reservation model**. Today, a disconnect removes the player from the room immediately; during gameplay it ends the round right away, and outside gameplay it reopens the slot immediately. For issue #63, the room should instead preserve a disconnected player's identity and slot for **30 seconds** when the disconnect can be proven to come from the same browser/device.

The core design choice is:

- keep the server authoritative for slot ownership, timers, room lifecycle, and match outcomes
- add a lightweight **local reconnect token** per occupied slot
- treat disconnect as a **reservation state**, not immediate removal
- allow only a reconnecting client with the matching local token to reclaim that reserved slot
- reopen the slot only when the reservation expires or the room becomes irrelevant

This stays aligned with MVP constraints:

- no user accounts
- no cross-device identity guarantees
- single backend instance with in-memory room state
- Socket.IO remains the primary transport

## Goals
1. Preserve a player's slot for 30 seconds after disconnect in lobby, countdown, gameplay, and post-game/rematch states.
2. Allow automatic reclaim from the same browser/device using a local session token.
3. Pause countdown/gameplay when reconnect is pending, then resume cleanly if reclaim succeeds.
4. If reconnect times out during gameplay, award the remaining player the win.
5. If reconnect times out during lobby or post-game/rematch, reopen the slot instead of killing the room.
6. Keep the implementation server-authoritative without introducing full authentication.

## Non-goals
- account login or persistent identity across devices
- reconnect after backend restart
- reconnect across different browsers/devices
- long-lived session storage in a database
- spectator or observer support

## Current architecture constraints
Current `RoomService` state is keyed by room code and binds players directly to `socketId`. That creates three problems for reconnect support:

1. **Identity is transient**: the reconnecting browser gets a new socket id, so the server cannot tell whether it is the same player.
2. **Disconnect is destructive**: `leaveCurrentRoom()` clears `playerId`, `socketId`, and readiness immediately.
3. **Gameplay disconnect is terminal**: `starting` / `in-progress` disconnect currently resolves the round immediately.

The reconnect design should preserve the existing room/match structure but change the player-slot lifecycle.

## Proposed model

### 1. Separate player identity from connection identity
A player slot should no longer be defined by `socketId`. Instead, it should be defined by a stable in-room session identity:

- `playerId`: server-owned logical player identity inside the room
- `reconnectToken`: opaque secret minted by the server and stored only in the same browser/device
- `socketId`: current live transport binding, nullable while disconnected

That yields this rule:

- **slot ownership belongs to `playerId` + reconnect token**
- **socket binding is replaceable**

### 2. Add reservation state to player slots
Extend each slot to distinguish these states:

- `open`: no player owns the slot
- `occupied-connected`: player owns slot and has a live socket
- `occupied-reserved`: player owns slot, socket is gone, reconnect window is active

Recommended shape:

```ts
interface PlayerSlot {
  slotIndex: 0 | 1;
  playerId: string | null;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
  reconnectToken: string | null;
  disconnectedAt: number | null;
  reservationExpiresAt: number | null;
}
```

### 3. Add room-level reconnect runtime state
The room must know whether reconnect is pending and whether gameplay/countdown is paused because of it.

```ts
interface DisconnectWindow {
  slotIndex: 0 | 1;
  startedAt: number;
  expiresAt: number;
  reason: 'socket-disconnect';
  affectedPhase: 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress' | 'game-over';
}

interface PausedMatchState {
  pausedAt: number;
  pauseReason: 'player-disconnected';
  disconnectedSlotIndex: 0 | 1;
  resumeCountdownRemainingMs?: number;
  resumeTickDelayMs?: number;
}
```

Recommended `RoomRecord` additions:

- `disconnectWindow: DisconnectWindow | null`
- `pausedMatch: PausedMatchState | null`
- dedicated reconnect timeout timer handle in runtime

Only one disconnect window should be active at a time for MVP because the room supports only two players and any second disconnect while already waiting should collapse into ordinary room cleanup / round resolution rules.

## Local session token strategy

### Token lifecycle
On successful room create or successful room join, the server should mint a cryptographically random opaque token, for example 128+ bits base64url.

The token is:
- unique per slot occupancy
- scoped to one room slot ownership period
- rotated whenever a new player newly takes a slot
- cleared when the slot fully reopens

The browser stores the token in local storage under room-scoped keying, for example:

```ts
localStorage['snake:session:<roomCode>'] = JSON.stringify({
  roomCode,
  playerToken,
  slotIndex,
  playerLabel,
  lastKnownVersion,
});
```

### Why this is enough for MVP
This is not strong authentication. It is only a proof that the reconnecting browser still holds the locally issued secret from the earlier session. That is exactly the accepted scope: same browser/device reclaim only.

### Server-authoritative rule
The client presenting a token is only a *claim*. The server decides whether reclaim is valid by verifying all of:

1. room exists
2. slot is currently reserved, not open
3. reconnect window has not expired
4. presented token matches the slot's stored reconnect token
5. no other socket is already actively bound to that slot

If any check fails, the reclaim is denied and the browser falls back to ordinary create/join flow.

## Connection and reclaim flow

### Fresh create/join
1. Client connects normally.
2. Client emits `room:create` or `room:join`.
3. Server allocates slot and mints reconnect token.
4. Server returns normal room payload plus a new `session` payload containing token metadata.
5. Client stores token locally.

### Automatic reconnect after refresh / transient disconnect
1. Browser reconnects with a fresh socket.
2. Client checks local storage for last room session.
3. If found, client emits `session:resume` immediately after socket connect.
4. Server validates token against reserved slot.
5. On success, server rebinds the new socket to the existing slot and broadcasts updated state.
6. Client automatically returns to lobby/game/rematch context with no manual confirmation step.

### Failed resume
If resume fails because room is gone, slot reopened, or token mismatches:
- server emits `session:resume:failed`
- client clears local stored token for that room
- UI returns to ordinary entry/create/join state

## Disconnect handling rules by phase

### A. Waiting-for-players / lobby
When a player disconnects before gameplay is active:

1. do **not** clear `playerId` or `reconnectToken`
2. set `connected = false`, `socketId = null`
3. set `reservationExpiresAt = now + 30_000`
4. clear `ready` for the disconnected slot
5. clear ready for the remaining player if needed so restart requires explicit readiness after state changes
6. keep room open
7. broadcast updated lobby state showing slot as reserved/disconnected

If reconnect succeeds within 30 seconds:
- rebind socket
- restore slot ownership unchanged
- room returns to `lobby`
- players may ready again / continue where appropriate

If timeout expires:
- fully clear that slot
- room returns to ordinary `waiting-for-players`
- replacement player may join

### B. Countdown (`starting`)
A refresh during countdown should not immediately cost the round.

On disconnect during `starting`:
1. freeze countdown progression
2. record remaining time until next countdown step / active start
3. mark slot reserved for 30 seconds
4. broadcast reconnect-waiting state to both sides

If reconnect succeeds in time:
- rebind slot
- resume countdown from the same remaining time, not from a brand-new 3 seconds
- rebroadcast authoritative countdown state

If timeout expires:
- remaining connected player wins by disconnect
- room transitions through `game-over`
- because issue #63 says gameplay timeout loss applies during active gameplay, countdown should follow the same pre-round fairness rule and be treated as gameplay-adjacent start state

Implementation note: this is the one ambiguous point versus the spec wording. To keep behavior consistent and simpler for the dev agent, treat `starting` the same as active match handling: paused reconnect window, then win by forfeit on expiry.

### C. Active gameplay (`in-progress`)
On disconnect during active play:
1. stop the active tick timer
2. store pause metadata so resume can continue without corrupting cadence
3. mark disconnected slot reserved for 30 seconds
4. keep board/match state frozen exactly as last authoritative snapshot
5. broadcast pause + reconnect countdown state to both players

If reconnect succeeds in time:
- bind new socket to same slot
- send latest frozen game snapshot to both clients
- resume tick loop after a short server-controlled resume countdown (recommended: 3 seconds) or resume immediately if implementation wants to minimize scope

Recommendation: use a **short resume countdown** because it makes the pause feel intentional and fair. This countdown should be server-authored and visible to both players.

If timeout expires:
- disconnected player loses by `disconnect`
- remaining player wins
- room transitions to `game-over`
- room remains open afterward for rematch/replacement behavior already established by issue # replay/rematch work

### D. Post-game / rematch (`game-over`)
When a player disconnects while the room is showing result/rematch state:

1. keep their slot reserved for 30 seconds
2. clear any rematch acceptance tied to the now-disconnected player
3. keep room open for the remaining player
4. show reconnect-waiting / reserved-slot messaging

If reconnect succeeds in time:
- player returns to same slot
- rematch state remains reset (safer, simpler, avoids stale one-click rematch ambiguity)
- both players can request rematch again

If timeout expires:
- slot reopens
- room returns to `waiting-for-players`
- a replacement player may join using the same room code

This aligns reconnect timeout semantics with existing reopen behavior introduced in the replay/rematch feature.

## Pause / resume semantics

### Principle
The server freezes authoritative progression; the client never free-runs or predicts through the disconnect window.

### Countdown freeze
For `starting`, store:
- `countdown.secondsRemaining`
- exact milliseconds until the next step

Resume behavior:
- either continue exact remaining ms to next tick, then continue normal 1-second countdown cadence
- or normalize to a fresh short resume countdown owned by the server

Preferred implementation: **fresh resume countdown for both countdown and active gameplay**.

Why:
- easier to reason about than restoring fractional countdown timers
- clearer in UI
- avoids edge cases around reconnecting at `secondsRemaining = 0`

Recommended behavior:
- if reconnect resumes a paused `starting` state, restart a 3-second authoritative countdown from current board state
- no movement occurs until it completes

This slightly favors clarity over exact timer continuity and still satisfies the product requirement because the match was paused intentionally.

### Gameplay freeze
For `in-progress`, store the frozen match snapshot and stop the tick loop.

On successful reclaim:
- keep scores, positions, food, speed, queued directions exactly as frozen
- clear any queued directions from the disconnected player's prior socket if they were transport artifacts
- run a short 3-second resume countdown
- resume ticks only after countdown ends

This prevents immediate surprise collisions on re-entry.

## Lobby and rematch reopen behavior

### Reservation timeout expiry outside gameplay
When timeout expires in `waiting-for-players`, `lobby`, or `game-over`:
- fully clear the reserved slot
- keep room code alive
- keep remaining player in room
- reset readiness / rematch acceptance as needed
- broadcast updated open-slot state

### Remaining player leaves while waiting
If the remaining connected player also leaves during a disconnect window:
- room should be disposed
- no need to preserve a one-player reservation in an empty room

### Replacement player join rules
A replacement player can join only if:
- slot is open, not reserved
- room phase is not `starting` or `in-progress`
- or room is `game-over` with an open slot and no active disconnect reservation

A reserved slot is **not joinable** even if the socket is absent.

## State machine changes

### Slot state transitions
```text
open
  -> occupied-connected         (create/join)
occupied-connected
  -> occupied-reserved          (socket disconnect)
occupied-reserved
  -> occupied-connected         (session resume success)
occupied-reserved
  -> open                       (timeout expiry)
occupied-connected
  -> open                       (voluntary leave semantics if we keep leave destructive)
```

### Room behavior summary
- `waiting-for-players` / `lobby`: disconnect reserves slot, timeout reopens slot
- `starting`: disconnect pauses start, timeout awards win to remaining player
- `in-progress`: disconnect pauses game, timeout awards win to remaining player
- `game-over`: disconnect reserves slot, timeout reopens slot and keeps room reusable

## Server changes by subsystem

### 1. Room service
Refactor `RoomService` so slot clearing is no longer the first response to disconnect.

Introduce methods conceptually like:
- `reserveDisconnectedSlot(room, slotIndex, phase)`
- `resumeReservedSlot(socketId, roomCode, reconnectToken)`
- `expireDisconnectedSlot(roomCode, slotIndex)`
- `pauseCountdownForReconnect(room, slotIndex)`
- `pauseMatchForReconnect(room, slotIndex)`
- `resumePausedRound(room)`

Important: `leave` and `disconnect` should diverge.
- **disconnect** => reserve when eligible
- **explicit leave** => may still clear immediately if product wants that behavior

For MVP simplicity, browser tab close / refresh will appear as disconnect; explicit leave button does not currently exist, so most real exits will use reservation rules.

### 2. Runtime timers
Current runtime already has countdown/tick timers. Add:
- reconnect expiration timer
- optional resume countdown timer

When entering reconnect-waiting:
- cancel tick/countdown timers
- start reconnect expiration timer

When reconnect succeeds:
- cancel expiration timer
- start resume countdown timer or restore paused timer sequence

### 3. Socket-to-player mappings
Today mappings are:
- `socketToRoom`
- `socketToPlayer`

Add a room/player lookup path for resume validation, likely by scanning room slots or keeping:
- `playerIdToRoom`
- `token lookup` not required globally; room-scoped lookup is enough

### 4. Shared payload model
Current payloads do not expose reserved/disconnected or paused-reconnect metadata. Add a shared reconnect view duplicated into lobby/game payloads.

Recommended shape:

```ts
interface ReconnectStateView {
  active: boolean;
  status: 'none' | 'waiting-for-player' | 'resume-countdown';
  disconnectedSlotIndex: 0 | 1 | null;
  reservedUntil: number | null;
  secondsRemaining: number | null;
  canResumeAutomatically: boolean;
}
```

This should be included in:
- `LobbyStatePayload`
- `PublicGameStatePayload`
- `GameRematchStatePayload`
- optionally `GameEndedPayload.finalState` via the embedded game state

### 5. Client state/rendering
The client should remain largely server-driven.

Add a tiny local session manager that:
- stores reconnect token on successful room assignment
- attempts `session:resume` on socket reconnect if token exists
- clears token when server says room/session is no longer valid

UI changes should be purely derived from authoritative payloads:
- reserved player badge in lobby/rematch
- reconnect countdown message for both players
- paused gameplay overlay with “Waiting for Player X to reconnect”
- resume countdown once player returns

Do **not** let the client assume reconnect success merely because the socket transport reconnected.

## Edge case handling

### Multiple disconnects within the window
If the same slot disconnects repeatedly:
- overwrite `socketId = null`
- refresh `disconnectedAt`
- refresh `reservationExpiresAt = now + 30s`
- keep same reconnect token

This is acceptable and matches user expectation.

### Reconnect just before timeout
The resume path should check `now <= reservationExpiresAt` on the server. If valid, reclaim wins even if local UI timer visually appears almost expired.

### Missing local token after refresh
If browser lost storage or token is absent:
- automatic reclaim is impossible
- room stays reserved until timeout
- player must wait for reopen or create/join a new room

This is acceptable per scope.

### Stale token after slot has been reopened and reused
If a token belongs to an old occupancy generation:
- resume fails
- client clears stale token
- no slot hijack occurs because token must match current slot ownership and active reservation window

### Both players disconnect during gameplay pause
If second player disconnects while first is reserved:
- room no longer has a remaining connected player
- simplest MVP rule: dispose room
- no winner needs to be declared because no active claimant remains to observe result

### Server restart during reservation
All reconnect windows are lost because room state is in memory. Client resume will fail with room/session not found. This matches current architecture constraints and should be documented, not solved here.

## Recommended implementation order
1. Extend shared contracts with session resume payloads and reconnect view.
2. Refactor `PlayerSlot` and `RoomRecord` for reservation/token state.
3. Mint/store reconnect tokens on create/join.
4. Add `session:resume` command and success/failure handling.
5. Refactor disconnect path for lobby/game-over reservation semantics.
6. Add gameplay/countdown pause + timeout-forfeit flow.
7. Update client session storage and reconnect UX.
8. Add tests for reservation, resume, expiry, gameplay pause, and room reopen paths.

## Test scenarios the dev agent must cover
1. lobby disconnect reserves slot for 30 seconds
2. lobby reconnect with valid token reclaims same slot
3. lobby timeout reopens slot for replacement join
4. countdown disconnect pauses start and reconnect resumes cleanly
5. gameplay disconnect pauses match and broadcasts reconnect state
6. gameplay reconnect resumes same frozen board state
7. gameplay timeout awards connected player the win
8. game-over disconnect reserves slot, clears rematch acceptance, and timeout reopens slot
9. invalid or stale token cannot reclaim slot
10. reconnecting just before expiry still succeeds
11. repeated disconnect/reconnect cycles do not corrupt room version or duplicate timers

## Guidance for the next agent
Implement this as a **minimal, room-scoped identity layer** rather than a general auth system. Preserve existing room and match flow where possible. The critical correctness points are:

- slot ownership survives socket loss for 30 seconds
- only the server decides whether reclaim is allowed
- countdown/tick timers stop while waiting on reconnect
- timeout behavior differs by phase: gameplay/countdown => forfeit, lobby/game-over => reopen slot
- post-game/rematch stays reusable after timeout
- client UI is derived from authoritative reconnect state, not transport reconnect alone
