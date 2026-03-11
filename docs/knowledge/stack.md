# Stack

## Product Type
- Web-only multiplayer game MVP

## Frontend
- **React**
- **Vite**
- **TypeScript**
- **HTML5 Canvas** for gameplay rendering

Frontend expectations:
- React handles app screens and UI state
- Canvas handles realtime game drawing
- TypeScript is used throughout for maintainability and shared typings where useful

## Backend
- **Node.js**
- **TypeScript**

Backend expectations:
- Node server hosts realtime game logic
- TypeScript is used for room/game state models, socket events, and server logic

## Realtime / Networking
- **WebSockets via Socket.IO**

Usage expectations:
- bi-directional realtime communication between browser clients and server
- room-scoped event broadcasting
- low-latency delivery for input and state updates

## Data Storage
- **No database for MVP**
- **In-memory state only**

Implications:
- rooms are ephemeral
- game state is ephemeral
- restart wipes all active state
- no persistence layer, ORM, or migrations needed for MVP foundation

## Authentication / Identity
- **Anonymous only**

Implications:
- no sign-up/login flows
- no user accounts
- players are identified only by connection/session context within a room

## Deployment Baseline
- Single frontend web deployment
- Single backend process maintaining in-memory room state

## Recommended Supporting Tooling
These are not mandated by the stakeholder, but should be considered default-friendly choices if needed:
- npm or pnpm workspace tooling
- ESLint
- Prettier
- Vitest for unit-level logic where practical

## Explicitly Out of Scope for MVP Stack
- relational or NoSQL database
- Redis
- OAuth/Auth providers
- native mobile apps
- microservices
- Kubernetes/distributed infrastructure
- advanced observability stack

Keep the stack lightweight and fast to ship.