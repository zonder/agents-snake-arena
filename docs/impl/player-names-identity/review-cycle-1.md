# Review Cycle 1 — Player Names / Identity

## Verdict
CHANGES_REQUESTED

## Summary
The implementation is close and the core flow is solid: required name entry is enforced for fresh create/join, validation is shared across client/server, valid names are persisted locally, names flow through lobby/game/rematch payloads, duplicate names are allowed, and the current multiplayer flow still passes automated tests (`npm test`, `npm run build`).

One required spec/design gap remains in reconnect messaging during gameplay/rematch states.

## What I reviewed
- PR #76 against:
  - `docs/impl/player-names-identity/spec.md`
  - `docs/impl/player-names-identity/design.md`
  - `docs/impl/player-names-identity/api-contracts.md`
  - `docs/impl/player-names-identity/dev-notes.md`
- Targeted implementation files:
  - `public/app.js`
  - `public/index.html`
  - `src/server/index.ts`
  - `src/server/roomService.ts`
  - `src/shared/contracts.ts`
  - `src/shared/playerName.ts`
  - `src/server/__tests__/roomService.test.ts`

## Findings

### 1. Gameplay/rematch reconnect copy loses duplicate-name disambiguation
**Severity:** Required fix

**Why this matters**
The approved design explicitly requires duplicate names to remain allowed while reconnect/disconnect messaging stays clear by appending slot labels when needed. The server already does this correctly for lobby messaging via `formatPlayerReference(...)`, but the gameplay/rematch client path does not preserve that disambiguation.

**Current behavior**
- `src/server/roomService.ts` builds duplicate-aware lobby text in `getLobbyMessage()`.
- But `public/app.js` uses `describeReconnect(state)` for gameplay/rematch messaging.
- `describeReconnect(state)` only uses `reconnect.disconnectedPlayerName` or a raw `Player N` fallback.
- `ReconnectView` currently exposes `disconnectedPlayerName`, but not a duplicate-safe display string or the disconnected player's label.

**Impact**
If both players choose the same name (explicitly allowed by spec), gameplay/rematch reconnect banners can show ambiguous copy like:
- `Alex disconnected. Slot reserved for 30s.`
- `Alex reconnected. Resuming in 3s.`

That breaks the design requirement to disambiguate duplicate names in user-facing reconnect/disconnect messaging where needed.

**Suggested fix**
Use a single canonical, duplicate-safe reconnect reference across all screens. Any of these would work:
1. Extend `ReconnectView` with a preformatted server-authoritative field such as `disconnectedDisplayName` / `disconnectedPlayerText`, and render that in `describeReconnect()`.
2. Or include enough structured data (`disconnectedPlayerLabel`, maybe full `PlayerIdentityView`) for the client to disambiguate using current player identities.

Add/extend tests to cover a duplicate-name reconnect scenario in gameplay/rematch states, not just lobby serialization.

## Positives
- Fresh create/join correctly requires a valid name.
- Shared normalization/validation helper keeps client/server rules aligned.
- Validation matches the spec intent: trimmed required input, max 12 chars, spaces allowed, emoji rejected.
- Last valid name is stored locally and rehydrated safely.
- Lobby/game/rematch payloads carry names consistently.
- Duplicate names are permitted without blocking create/join.
- Automated checks passed locally:
  - `npm test`
  - `npm run build`

## Required fixes before approval
- [ ] Make reconnect/disconnect messaging in gameplay/rematch duplicate-safe when both players share the same name.
- [ ] Add automated coverage for duplicate-name reconnect messaging/disambiguation.
