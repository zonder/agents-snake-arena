# API / Runtime Contracts: Public README / Open-Source Repo Polish

## Why this file exists
This feature does not introduce new product APIs. Instead, this file captures the existing runtime contracts and code-level facts that the README may safely reference.

Use this as the implementation-side fact sheet for README content.

## Contract Type
Documentation support artifact only.

No socket events, HTTP endpoints, or payloads should be changed as part of this feature.

## Public Runtime Facts Safe To Mention In README

### Application shape
- The app is a browser-based multiplayer Snake game.
- The server starts from `src/server/index.ts`.
- Static client assets are served from `public/`.
- Socket.IO powers realtime client/server communication.

### Package scripts
From `package.json`:

| Script | Contract |
|---|---|
| `npm run dev` | Starts the TypeScript server with `tsx watch src/server/index.ts` for local development |
| `npm run start` | Runs the TypeScript server once with `tsx src/server/index.ts` |
| `npm run build` | Runs TypeScript compilation via `tsc -p tsconfig.json` |
| `npm test` | Runs unit tests with Vitest |
| `npm run test:e2e` | Runs Playwright end-to-end tests |

### Default runtime port
- Server listens on `process.env.PORT || 3000`.
- README may say local app runs on `http://localhost:3000` by default unless the user overrides `PORT`.

### Build metadata endpoint
Verified in `src/server/index.ts`:
- `GET /build-info.json`
- Returns JSON with version/build metadata.

README mention is optional. If included, keep it lightweight.

### Realtime contract summary
Verified in `src/shared/contracts.ts`:
- room creation/join flow
- lobby state updates
- ready-state updates
- gameplay start/countdown/state updates
- rematch flow
- session resume/reconnect flow

README should summarize these as user-visible capabilities, not dump raw event names unless there is a dedicated developer section.

## Public Limitations Safe To Mention In README
- Two-player room model
- In-memory state only
- No database/persistence
- Restart clears active rooms/matches
- Anonymous play model
- Single-process MVP deployment shape

## Claims To Avoid
Until code changes prove otherwise, do not claim:
- React frontend
- Vite-powered client runtime
- database-backed persistence
- auth/accounts
- distributed or horizontally scaled realtime infrastructure
- spectator mode or matchmaking

## Suggested Feature/Capability Wording
These are safe condensed phrasings for README authorship:
- “Create a room, share a code, and play a realtime 1v1 Snake match in the browser.”
- “The server is authoritative for gameplay state and broadcasts updates over Socket.IO.”
- “The project uses a lightweight static browser client plus a Node.js/TypeScript multiplayer server.”
- “Game and lobby state live in memory, so active rooms are lost on server restart.”

## Implementation Review Checklist
The README implementation is contract-safe if:
- every command appears in `package.json`;
- every architecture claim matches checked-in code;
- deployment caveats do not promise persistence;
- gameplay capability bullets map to visible UI or shared contracts;
- no section introduces new undocumented operational requirements.
