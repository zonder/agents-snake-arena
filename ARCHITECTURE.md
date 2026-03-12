# Architecture Map

> Concise bird's-eye view. Full details: [docs/knowledge/architecture.md](docs/knowledge/architecture.md)

## System

```
Browser (public/)          Socket.IO           Node.js Server
  Canvas rendering    <--- state broadcasts     gameLogic.ts (tick loop)
  Input capture       ---> direction inputs     roomService.ts (rooms)
                                                In-memory state only
```

## Data Flow

1. Client sends direction input -> server queues it
2. Server tick fires -> applies inputs, moves snakes, spawns food
3. Server resolves collisions -> determines winner/death
4. Server broadcasts game state -> all clients in room render it

## Module Boundaries

| Module | Responsibility | Depends on |
|--------|---------------|------------|
| `public/` | UI, canvas rendering, input capture | `shared/contracts` |
| `server/index.ts` | HTTP + Socket.IO setup, event routing | `roomService`, `gameLogic` |
| `server/roomService.ts` | Room CRUD, join codes, player state | `shared/contracts` |
| `server/gameLogic.ts` | Tick loop, movement, collision, scoring | `shared/contracts` |
| `shared/contracts.ts` | TypeScript types for events and state | nothing |

## Architectural Invariants

- Client NEVER determines game outcomes (server-authoritative)
- No client-side game simulation
- All room state is ephemeral (in-memory, lost on restart)
- Socket events are the only client-server interface
- Shared types are the contract between client and server
