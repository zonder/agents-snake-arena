# Deployment

## MVP Deployment Goal
Deploy a simple web-accessible prototype for fast testing and iteration.

## Expected Topology
The MVP should run as:
- a web frontend for the React/Vite client
- a single backend Node.js process for Socket.IO and in-memory room state

Because room and match state live in memory, the backend should be deployed as a **single authoritative instance** for MVP.

## Key Constraint
Do not horizontally scale the backend for MVP unless sticky routing and shared room state are intentionally introduced. Multi-instance deployment would break the in-memory single-source-of-truth model.

## Deployment Characteristics
- web only
- anonymous access
- ephemeral in-memory sessions
- no database provisioning required
- server restart clears active rooms/games

## Platform Guidance
The stakeholder has not locked a provider yet. Suitable MVP-friendly deployment options are platforms that can host:
- a static or frontend app build
- a long-running Node.js websocket-capable server

Examples of acceptable categories:
- single VM/VPS with reverse proxy
- container host
- PaaS that supports persistent websocket connections

## Operational Expectations
For MVP, deployment should prioritize:
- simplicity
- quick iteration
- easy restarts
- straightforward logs/debugging

## Environment / Runtime Needs
Likely runtime requirements:
- Node.js runtime for backend
- environment configuration for allowed client origin(s), if needed
- websocket-compatible hosting/network path

## Health and Runtime Considerations
Recommended baseline:
- simple health endpoint on backend
- clear startup logging
- frontend configured to connect to backend socket endpoint via environment variable/config

## Failure Behavior
Because state is in memory only:
- backend restart drops active rooms and matches
- disconnects should be expected and handled gracefully in UX
- no recovery of active sessions after restart is required for MVP

## Out of Scope for MVP Deployment
- autoscaling backend cluster
- zero-downtime room-state migration
- multi-region synchronization
- durable session recovery
- complex infrastructure orchestration

## Future Deployment Evolution
If the game grows beyond MVP, revisit:
- shared state store
- sticky sessions / load balancing
- durable persistence
- observability and metrics
- managed realtime infrastructure

For now, optimize for one reliable instance and fast shipping.