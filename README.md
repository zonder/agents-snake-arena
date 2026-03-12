# Agents Snake Arena

A realtime two-player Snake game for the browser where one player creates a room, shares a code, and both players jump straight into a server-authoritative match.

## Highlights

- Create a room, share a short code, and start a 1v1 match in the browser
- Ready-up lobby flow before each round begins
- Server-authoritative gameplay state broadcast over Socket.IO
- Rematch flow that keeps both players in the same room for another round
- Session resume / reconnect support during temporary disconnects
- Keyboard and touch controls in the current browser client
- Lightweight build/version marker exposed by the running server

## How it works

- A Node.js server serves the static browser client from `public/`
- Players connect to the server over Socket.IO for room, lobby, and match updates
- The server owns room state, readiness, countdowns, gameplay ticks, and results
- Shared TypeScript contracts define the client/server event payloads
- Active rooms and matches live entirely in memory

## Tech stack

### Server
- Node.js
- TypeScript
- Socket.IO

### Client
- Static assets served from `public/`
- Vanilla HTML, CSS, and JavaScript

### Testing
- Vitest for unit/integration-style test runs via `npm test`
- Playwright for end-to-end browser coverage via `npm run test:e2e`

### Runtime shape
- Single-process app
- Default local port: `3000` (override with `PORT`)
- No database or persistent storage

## Run locally

### Prerequisites
- Node.js 22+ recommended
- npm

### Install

```bash
npm install
```

### Start the app in development mode

```bash
npm run dev
```

This runs `tsx watch src/server/index.ts` and reloads the server when TypeScript files change.

Open:

```text
http://localhost:3000
```

### Start once without file watching

```bash
npm run start
```

### Build TypeScript

```bash
npm run build
```

## Testing

Run the automated test suite:

```bash
npm test
```

Run browser end-to-end tests:

```bash
npm run test:e2e
```

Playwright uses `http://localhost:3000` by default through `E2E_BASE_URL` in `playwright.config.ts`, so start the app first unless you point the tests at another environment.

## Deployment and runtime caveats

- Game rooms, reconnect reservations, and match state are stored in memory only
- Restarting the server clears active rooms and in-progress matches
- The current app is built around a single running server process
- Realtime play depends on Socket.IO connectivity, so the deployment environment must support long-lived websocket/polling connections
- There is no account system, matchmaking service, or persistence layer in the current implementation

## Project structure

```text
public/        Static browser client assets
src/server/    HTTP + Socket.IO server and room/game logic
src/shared/    Shared TypeScript contracts and validation helpers
tests/e2e/     Playwright end-to-end tests
docs/          Product specs, implementation artifacts, and project knowledge
```

## Contributing

This project is still lightweight, so the best starting points are:

- read the open issues and implementation docs in `docs/`
- keep README and docs aligned with the checked-in code
- prefer small, focused pull requests
- verify behavior with the relevant test command before opening a PR

## Current status

This repository reflects a working multiplayer Snake prototype/MVP. It is intentionally simple: a static browser client talking to a Node.js + TypeScript realtime server, with in-memory state and no persistence.
