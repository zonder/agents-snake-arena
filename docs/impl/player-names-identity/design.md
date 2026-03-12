# Architecture Design — Player Names / Identity

## Overview
This feature adds a lightweight, browser-scoped player nickname to the existing two-player multiplayer Snake flow. The goal is to capture a required player name before create/join, validate it with MVP rules, persist the last valid name locally for convenience, and propagate the chosen name through lobby, HUD, result/rematch, and reconnect/disconnect messaging.

The design intentionally preserves the current architecture:
- Socket.IO remains the transport.
- The server remains authoritative for room membership and gameplay state.
- No account system, global identity, or uniqueness checks are introduced.
- Reconnect still relies on the existing reconnect token/session model.

## Current Architecture Summary
The current app has:
- a static browser client in `public/`
- a Socket.IO server in `src/server/index.ts`
- room/session orchestration in `src/server/roomService.ts`
- shared event/payload contracts in `src/shared/contracts.ts`

Today, room membership is identified server-side by `playerId`, `socketId`, reconnect token, and slot index. The UI uses fixed labels (`Player 1`, `Player 2`) everywhere.

## Proposed Architecture
Add a **display-name layer** on top of the existing slot/session model.

### Identity model
Each occupied player slot will now carry two identity concepts:
1. **system identity** — existing `playerId`, reconnect token, slot index; authoritative and unchanged
2. **display identity** — new `name`, human-entered nickname used only for presentation

The server stores the canonical name per slot for the lifetime of that slot assignment. The browser stores the most recent valid name locally and submits it when creating or joining a room.

## Design Goals
- Require a name before the player can create or join.
- Keep validation lightweight and understandable.
- Reuse the existing reconnect flow without extra auth.
- Preserve duplicate-name support.
- Avoid changing the room lifecycle/state machine beyond what is necessary.
- Minimize payload churn by adding names to existing events rather than creating a separate profile subsystem.

## Validation Strategy
Validation should exist in two places:
- **client-side preflight validation** for fast feedback and disabled/guarded create/join actions
- **server-side canonical validation** for correctness and trust boundaries

### Validation rules
For MVP, a valid name must:
- be required after trimming outer whitespace
- be at most 12 characters
- allow letters, numbers, punctuation, and spaces
- reject emoji / pictographic symbols

### Recommended normalization
Use a shared normalization/validation helper in shared code so client and server agree.

Recommended normalization pipeline:
1. convert input to string
2. trim leading/trailing whitespace
3. collapse repeated internal whitespace to a single space *(recommended for consistency; if implementation wants to preserve internal spacing exactly, that is acceptable if both sides match)*
4. validate length <= 12 on the normalized string
5. reject strings that become empty after trim
6. reject strings containing emoji / pictographic characters

### Emoji handling
Because “emoji” is broader than ASCII, the implementation should use a Unicode-aware check rather than an ASCII-only allowlist, so names like `José` still work while emoji are rejected.

Recommended approach:
- reject code points matching Unicode emoji-style/pictographic properties
- do **not** restrict the name to only `[A-Za-z0-9 ]`

This best matches stakeholder intent: readable names, spaces allowed, emoji not allowed, but no unnecessary exclusion of normal international text.

## Data Model Changes

### Server: `PlayerSlot`
Extend `PlayerSlot` with a required name whenever the slot is occupied:
- `name: string | null`

Behavior:
- set on room create/join
- preserved through disconnect/reconnect because the slot is reserved, not recreated
- cleared when the player fully leaves and the slot is released

### Shared view models
Add `name` and fallback label metadata to client-facing payloads.

#### Lobby player view
Current lobby view exposes only `label` (`Player 1` / `Player 2`).
Add:
- `name: string | null`
- `displayName: string`

Where:
- `label` remains the slot label for structural/reference use
- `name` is raw user-chosen value or null for empty slot
- `displayName` is the exact string the UI should render (`name` if occupied, otherwise fallback slot label)

#### Game and result views
The gameplay state currently exposes snake slot/score/alive data but no player-facing names. Add a player identity block to game payloads so HUD/result/rematch UI does not need to infer names indirectly.

Recommended additions:
- `playerNames: { 0: string; 1: string }` or `players: [{ slotIndex, label, name, displayName }, ...]`

Preferred option: **add a reusable `PlayerIdentityView` and use explicit player arrays/records**, because it scales better across lobby/game/result events.

## Event Flow Changes

### 1. Entry flow
The entry screen gains a required name field above or alongside create/join controls.

Client flow:
1. on page load, read saved name from `localStorage`
2. prefill the field if the stored value is still valid
3. validate as the user types or on submit
4. prevent `room:create` / `room:join` emit until the name is valid

### 2. Create room
Current client event:
- `room:create`

Proposed payload:
- `room:create { name: string }`

Server flow:
1. validate/normalize name
2. allocate room + slot as today
3. store normalized name in slot 0
4. emit existing room/session/lobby events with enriched player identity payloads

### 3. Join room
Current client event:
- `room:join { roomCode }`

Proposed payload:
- `room:join { roomCode, name: string }`

Server flow:
1. validate room code as today
2. validate/normalize name
3. assign slot 1
4. store normalized name in slot
5. emit existing room/session/lobby events with names included

### 4. Reconnect
Reconnect event remains token-based and does **not** ask for the name again.

Reasoning:
- reconnect restores an existing reserved slot
- slot identity already includes the stored canonical name
- asking for a new name during reconnect would blur the difference between resume and rejoin

The browser-local remembered name remains a convenience for future fresh create/join actions, not for reconnect authorization.

### 5. Disconnect/reconnect messaging
Current room messages say `Player 1` / `Player 2` disconnected.

Update message composition to prefer player name:
- `Alex disconnected. Waiting 30s for reconnect.`
- if name missing unexpectedly, fall back to slot label

This applies to:
- lobby message banners
- in-game status copy
- rematch/reconnect status copy

## UI Architecture

### Entry screen
Add:
- text input for player name
- inline helper/error copy
- optional character counter (recommended but not required)

Behavior:
- create/join buttons remain visible
- both actions use the same current validated name field
- invalid input does not emit socket events
- room code behavior remains unchanged except it now depends on valid name too for join

### Lobby
Replace or augment fixed slot display with actual names.

Recommended card content:
- primary line: `displayName`
- secondary line: slot label (`Player 1`, `Player 2`) and self marker `(You)` as supporting metadata

This preserves orientation when duplicate names exist.

### HUD / gameplay panel
Current HUD shows `Player 1` and `Player 2` score cards. Replace visible primary labels with player names, while keeping slot color mapping and optional secondary slot text.

Recommended HUD format:
- primary: `Alex`
- secondary chip/small text: `Player 1`

This handles duplicate names and keeps player-color/slot orientation clear.

### Result / rematch
Result copy should reference names when possible:
- `Alex wins!`
- `Alex and Sam drew.`
- if duplicate names: use name plus slot/reference copy where needed, e.g. `Alex (Player 1) wins.`

Rematch panels should also use names in “waiting for other player” or “opponent wants a rematch” copy where helpful, but generic copy is acceptable if simpler.

### Reconnect/disconnect messaging
Reconnect banners and paused-game copy should use display names:
- `Sam disconnected. Waiting 27s for reconnect.`
- `Sam reconnected. Resuming in 3s.`

If both players picked the same name, fallback disambiguation should append slot label in user-facing copy only when needed.

## Local Persistence
Persist the last valid name in browser `localStorage` under a dedicated key, separate from reconnect session storage.

Recommended key:
- `snake:player-name`

Rules:
- save only normalized valid names
- do not save invalid drafts
- on load, prefill only if the saved name still passes current validation rules
- if invalid, discard/ignore it silently or clear it

This keeps the feature browser-scoped and intentionally low-stakes.

## Shared Utilities
Introduce shared name helpers in a shared module, e.g.:
- `normalizePlayerName(input)`
- `validatePlayerName(input)`
- `getDisplayName(name, fallbackLabel)`
- `formatPlayerReference(player)` or `getPreferredPlayerText(...)`

These utilities should be reused by:
- client entry form
- server room create/join handlers
- server message composition
- UI render helpers

## Error Handling
Extend the room error reason union with a player-name validation case.

Recommended reason:
- `INVALID_PLAYER_NAME`

Server should return friendly copy for:
- empty/whitespace-only names
- too-long names
- unsupported emoji characters

A single friendly message is acceptable for MVP, e.g.:
- `Enter a name up to 12 characters without emoji.`

If the UI wants more precision, the validation helper can expose structured failure reasons.

## Compatibility and Migration
This is a coordinated client/server contract change.

### Required coordinated updates
- client must send `name` for create/join
- server must accept/validate/store `name`
- shared payload types must include player names
- lobby/game/rematch rendering must switch from fixed labels to display names

Because both client and server live in the same repo and deploy together, no backward-compat transport shim is required.

## Implementation Order
1. Add shared player-name validation/normalization utilities and types.
2. Extend create/join event contracts to require `name`.
3. Extend `PlayerSlot` and room serialization to include names.
4. Update server lobby/game/rematch/reconnect messages to prefer names.
5. Update entry UI to capture, validate, and persist the name.
6. Update lobby/HUD/result/rematch rendering to show names.
7. Add tests for validation, room create/join serialization, reconnect persistence, and duplicate-name scenarios.

## Testing Strategy

### Unit tests
Add tests for:
- trimmed empty name rejected
- >12 chars rejected
- emoji rejected
- spaces allowed
- duplicate names allowed
- create/join store normalized name
- reconnect preserves same name on reserved slot
- disconnect/reconnect messages prefer player names

### Integration-ish service tests
Existing `roomService` tests are the right place to assert:
- `lobby:state` includes names for both slots
- `game:start`, `game:state`, and `game:ended` include player identity metadata
- rematch/reconnect payloads continue to work with names present

### Manual QA focus
- remembered name prefill
- invalid stored name handling
- duplicate names visible without breaking orientation
- room reconnect flow still resumes correctly

## Risks and Mitigations

### Risk: duplicate names create ambiguity
Mitigation:
- keep slot label/color metadata visible in cards and status copy
- only use slot disambiguation when needed

### Risk: emoji detection is imperfect
Mitigation:
- centralize validation in one helper
- bias toward stakeholder intent rather than building a complex moderation system
- add tests for representative emoji cases

### Risk: reconnect flow accidentally overwrites name
Mitigation:
- do not include `name` in session resume API
- keep name stored on slot record until slot is fully released

### Risk: UI copy becomes inconsistent across screens
Mitigation:
- introduce shared client helpers for display name selection and outcome copy
- add a single server helper for name-aware reconnect/disconnect messages

## Decisions
- Names are **required** for fresh create/join actions.
- Names are **not** part of reconnect authentication.
- The authoritative name is stored on the server slot record.
- The remembered name is a browser-local convenience only.
- Duplicate names remain allowed.
- Slot labels/colors remain visible as secondary orientation aids.
