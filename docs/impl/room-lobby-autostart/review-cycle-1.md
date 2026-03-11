# Review Cycle 1 — room-lobby-autostart

## Scope reviewed
- Parent issue #3
- PR #7 (`feature/issue-3`)
- `docs/impl/room-lobby-autostart/spec.md`
- `docs/impl/room-lobby-autostart/design.md`
- `docs/impl/room-lobby-autostart/api-contracts.md`
- `docs/impl/room-lobby-autostart/dev-notes.md`
- project knowledge docs (`docs/knowledge/stack.md`, `docs/knowledge/architecture.md`)

## Validation performed
- `npm ci`
- `npm test`
- `npm run build`

Result: all validation passed locally.

## Review focus verdict

### 1. Room-state transition correctness
Pass.

Observed behavior in `src/server/roomService.ts` matches the approved flow:
- room creation initializes a single-player lobby in `waiting-for-players`
- successful join normalizes the code, fills the open slot, and moves the room into `lobby`
- ready changes update only the caller's slot and rebroadcast full authoritative `lobby:state`
- leaving/disconnect before start clears the slot, resets stale readiness, and returns the room to `waiting-for-players`
- empty rooms are cleaned up from memory

This is aligned with the spec, design, and API contracts for the MVP scope.

### 2. Single-start behavior
Pass.

The implementation keeps start authority on the server and only transitions to `game:start` when both slots are occupied, connected, and ready. The PR also emits the transitional `lobby:state` with `phase: starting` before the `game:start` handoff, which matches the contract.

I did not find a path that would emit duplicate starts for the same room under this single-process in-memory MVP architecture.

### 3. Disconnect cleanup and readiness reset semantics
Pass.

The implementation follows the conservative anti-stale rule from the design:
- departed slot is cleared
- departed readiness is reset
- remaining player's readiness is reset to `false` when occupancy drops to one
- room returns to `waiting-for-players`
- a replacement player can join the same room code

This satisfies the explicit requirement to prevent stale ready conditions from accidentally starting a match after a player leaves.

### 4. Temporary static client acceptability for MVP
Acceptable for MVP, with noted follow-up risk.

The project knowledge docs prefer React + Vite + TypeScript on the frontend, and this PR instead ships a lightweight static browser client in `public/`. That is a stack deviation, but it is clearly documented in `dev-notes.md`, keeps the issue within scope, and still delivers the approved user flow end-to-end.

For this issue, I consider the static client acceptable because:
- the repo previously had no application scaffold
- the feature goal is validated behavior, not framework migration
- the server-side room service and shared contracts remain reusable if the UI is later moved into the preferred React/Vite structure

Recommended follow-up: track the frontend migration back to the documented stack as separate tech-debt work, not as a blocker on this PR.

## Findings
No blocking findings.

## Risks / follow-ups
- Non-blocking: frontend implementation currently deviates from the documented React + Vite expectation and should be normalized in a future task once gameplay/UI work expands.
- Non-blocking: test coverage is solid for the main room-service transitions, but future gameplay handoff work should add higher-level socket/integration tests once the game loop exists.

## Review verdict
Approved.

## Recommended next handoff
Proceed to DevOps / deployment verification for PR #7 once the PM updates the pipeline state for parent issue #3.
