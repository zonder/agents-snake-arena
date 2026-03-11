# Dev Notes — Core Gameplay Loop

## What was implemented
- Added shared gameplay contracts for countdown, authoritative state snapshots, round result payloads, room close, and direction input.
- Introduced `src/server/gameLogic.ts` for deterministic match initialization, one-slot queued input handling, authoritative tick advancement, food spawning, collision resolution, speed progression, and disconnect outcomes.
- Extended `RoomService` to manage per-room countdown, active tick scheduling, end-of-round teardown, and gameplay event broadcasting while keeping room lifecycle ownership in the service.
- Updated the browser client from a lobby-only placeholder to a playable MVP UI with:
  - countdown display
  - 30x30 board rendering
  - score display
  - keyboard controls (arrow keys / WASD)
  - result messaging
  - forced reset after `room:closed`
  - a gameplay-focused layout that swaps the board into the main viewport during countdown/active play/result instead of leaving the full lobby stacked above it
- Added tests for both low-level game logic and the room-service countdown/disconnect lifecycle.

## Key implementation choices
- Countdown length: 3 seconds, emitted once immediately at `3` and then at `2`, `1`, `0`.
- Baseline speed schedule follows the architecture step table: 200ms, 170ms, 140ms, 120ms.
- Direction queuing uses a single pending slot per snake and validates against the effective upcoming direction (`pendingDirection ?? direction`).
- Round teardown occurs 3 seconds after `game-over` and always forces a fresh room flow.

## Notable behavior details
- Direction input is accepted during countdown so players can queue their opening move before the first active tick.
- Food is only committed for surviving consumers; if the round ends on the consuming tick, the terminal result wins over replacement food logic.
- Simultaneous same-cell head collisions and explicit cross-over head swaps both kill both snakes.
- Disconnect during `starting` or `in-progress` immediately resolves the round and then closes the room after the result window.
- During `starting`, `in-progress`, and `game-over`, the client hides the taller lobby section and now uses a board-first gameplay shell: the board sits centered in the top row, while round state, room code/copy, speed/countdown, and player score cards live in side columns (or wrap beneath the board on narrower screens) so the board stays reachable without unnecessary scrolling in the review viewport.
- Follow-up UX polish for stakeholder feedback: moved changing session/status text out of normal document flow by converting the top status bar into a fixed toast and replacing the under-board gameplay copy with a small overlay badge anchored inside the board frame. This keeps countdown/gameplay/game-over messaging visible without any message block above the board changing layout or making the board jump.

## Build/version marker
- Added a small visible `Build: ...` pill in the top-right of the main panel so reviewers can quickly confirm which deployment is live.
- The client requests `/build-info.json` with `cache: 'no-store'` and a timestamp query param to reduce stale browser-cache confusion during deployment checks.
- The server resolves build metadata at startup from the app version in `package.json` plus the current short git commit SHA, yielding a marker like `v0.1.0+abc1234`.
- The marker tooltip includes version, commit SHA, and startup timestamp for extra debugging context when validating deploy freshness.
- This change is presentation/debugging only and does not alter gameplay state or socket event behavior.

## Deviations / limitations
- `game:state.result` is only used as a lightweight terminal snapshot hint; the client relies on `game:ended.result.bySlot` for the player-specific win/lose/draw message.
- The browser UI is intentionally simple and snapshot-driven; it does not animate between ticks.
- No replay/rematch path was added, per spec; after room closure players must create or join a new room.

## Validation run
- `npm test`
- `npm run build`
