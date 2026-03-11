# Database

## MVP Decision
There is **no database** for the Multiplayer Snake MVP foundation.

## Storage Model
All application state is held **in memory on the backend server**.

This includes:
- room records
- join codes
- player membership
- ready state
- active match state
- food positions
- snake positions/body state
- scores
- winner/game-over state
- replay state

## Persistence Rules
- state is ephemeral
- server restart clears all rooms and active games
- no durable history is retained
- no analytics/event storage is required for MVP

## Why No Database
This product is explicitly a quick prototype.

Avoiding a database keeps MVP faster to build and simpler to operate because:
- there are no accounts
- there is no long-term player data
- rooms are temporary
- active state only matters while the server process is alive

## Data Modeling Guidance
Use simple in-memory data structures appropriate for a single-process realtime server, such as:
- maps keyed by room code
- room objects containing player and match state
- lightweight indexes from socket/player connection to room

Prefer clarity and correctness over abstraction.

## Out of Scope for MVP
Do not add:
- PostgreSQL
- MySQL
- MongoDB
- Redis
- Prisma/ORM-backed persistence
- migrations
- user profile storage
- match history tables
- leaderboards

## Future Evolution Path
If the product succeeds, likely future additions could include:
- Redis for shared ephemeral room state or pub/sub
- relational storage for user accounts and match history
- durable analytics/event collection
- reconnect/session recovery support

But none of that should shape the MVP unnecessarily today.