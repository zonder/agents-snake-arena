# Dev Notes: Room Lobby Auto-Start

## What shipped
- Scaffolded a minimal TypeScript + Socket.IO implementation for the approved room/lobby flow.
- Added shared lobby event/type contracts in `src/shared/contracts.ts`.
- Implemented an in-memory server-authoritative room service in `src/server/roomService.ts`.
- Added a runnable HTTP + Socket.IO server in `src/server/index.ts`.
- Added a lightweight browser UI in `public/` for create room, join by code, copy code, view 2-slot lobby state, toggle ready, and receive game-start handoff.
- Added Vitest coverage for room creation, join normalization, room-full rejection, auto-start, and disconnect readiness reset behavior.

## Key implementation decisions
- Used uppercase 4-letter room codes for the MVP implementation.
- Kept room state in memory only, matching the project knowledge docs and approved scope.
- Broadcast full authoritative `lobby:state` snapshots after every room mutation instead of partial client patches.
- Implemented immediate auto-start after both players are ready; no countdown was added.
- On disconnect/leave before start, the departed slot is cleared and the remaining player's ready state is reset to `false` to prevent stale auto-start conditions.

## Deviations from ideal architecture
- The repo had no existing application code, so I scaffolded the smallest runnable implementation needed for this feature instead of integrating into an existing React/Vite app.
- The client is a lightweight static browser UI rather than a full React/Vite frontend. This keeps scope tight while still delivering the approved player flow end-to-end.
- `game:start` currently hands off into a placeholder in the client because gameplay itself is explicitly out of scope for this issue.

## Validation performed
- `npm test`
- `npm run build`

## Known follow-up considerations
- If the project later standardizes on React/Vite, the current server-side room service and shared contracts can be reused while replacing the static client.
- Real leave events beyond socket disconnect are not yet exposed as a dedicated client action because the approved scope only required leave/disconnect handling before match start.

## Follow-up Adjustment: Hide lobby during non-lobby phases
- Updated the browser UI to use distinct screen containers for entry, lobby, and gameplay states instead of always rendering the lobby block.
- The client now shows the lobby only for `waiting-for-players` and `lobby` phases.
- When the server reports `starting` or `in-progress`, the gameplay screen replaces the lobby visually and keeps only essential room info (room code + phase badge) visible.
- Added a defensive fallback so any future non-lobby phase (for example a later game-over phase) will continue to hide the lobby screen by default.
