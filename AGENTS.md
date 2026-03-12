# Agent Guide

> Read this first. Follow links for deeper context.

## Quick Start

```bash
npm ci                    # install deps
npm test                  # unit tests (vitest)
npm run build             # typecheck (tsc)
npm run test:e2e          # E2E (playwright, needs E2E_BASE_URL)
npm run dev               # dev server on :3000
```
## Source Layout

```
src/server/index.ts          # entry, socket.io setup
src/server/gameLogic.ts      # tick loop, collision, scoring
src/server/roomService.ts    # rooms, join codes, players
src/server/__tests__/        # unit tests
src/shared/contracts.ts      # shared types (events, state)
src/shared/playerName.ts     # name generation
public/                      # static client (HTML, JS, CSS)
tests/e2e/                   # Playwright E2E tests
docs/knowledge/              # project knowledge docs
docs/specs/                  # feature specs
docs/impl/<slug>/            # per-feature artifacts
```

## Architecture (short)

Server-authoritative multiplayer Snake for 2 players/room.
Client sends inputs only. Server runs fixed-tick loop, resolves collisions, broadcasts state. Socket.IO transport. In-memory state (no DB).

Full: [docs/knowledge/architecture.md](docs/knowledge/architecture.md)
## Key Conventions

- Server is source of truth (clients never determine outcomes)
- TypeScript everywhere; shared types in `src/shared/contracts.ts`
- Thin client pattern (UI = view + input layer)
- Room state machine: waiting -> lobby -> in-progress -> ended
- Fixed tick loop (deterministic simulation)

Full: [docs/knowledge/patterns.md](docs/knowledge/patterns.md)

## Knowledge Docs

| Doc | Purpose | Update when |
|-----|---------|-------------|
| [architecture.md](docs/knowledge/architecture.md) | Components, data flow | New components |
| [stack.md](docs/knowledge/stack.md) | Tech stack, deps | New deps/tools |
| [patterns.md](docs/knowledge/patterns.md) | Code/UX patterns | New patterns |
| [api-conventions.md](docs/knowledge/api-conventions.md) | Socket events, formats | New events |
| [deployment.md](docs/knowledge/deployment.md) | Envs, deploy, ports | Infra changes |
| [database.md](docs/knowledge/database.md) | Storage decisions | If persistence added |
| [quality.md](docs/knowledge/quality.md) | Module health, debt | After each feature |

## Rules for Agents

1. **Read before writing** -- check knowledge docs before architectural decisions.
2. **Update after shipping** -- when your feature changes architecture, patterns, or API, update the relevant knowledge doc in the same PR.
3. **Keep it concise** -- knowledge docs are maps, not manuals. Under 200 lines each.
4. **Tests required** -- unit tests for logic, E2E for user-facing features.
5. **Shared types** go in `src/shared/contracts.ts`, not inline.
