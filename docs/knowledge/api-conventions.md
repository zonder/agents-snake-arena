# API Conventions

## API Style
This MVP primarily uses **Socket.IO event-based communication** for gameplay and lobby state.

Any non-realtime HTTP endpoints should be kept minimal and used only where clearly helpful (for example, health checks or serving app metadata). Core gameplay interactions belong on the socket layer.

## Realtime Authority Rules
The server is authoritative.

Clients may send:
- create room requests
- join room requests
- ready/unready actions
- direction input
- replay requests

Server emits authoritative responses and updates for:
- room creation result
- join acceptance/rejection
- lobby state
- game start
- game state snapshots/updates
- score updates
- collision/death outcomes
- winner/game-over state
- replay/reset state
- room/player disconnect events

## Event Design Principles
- Use clear, domain-named events
- Keep payloads small but explicit
- Prefer one authoritative state payload over many ambiguous partial payloads when possible
- Include enough metadata for client rendering without client-side inference of rules
- Validate all incoming payloads on the server

## Suggested Event Groups

### Room / Lobby Events
Examples:
- `room:create`
- `room:created`
- `room:join`
- `room:joined`
- `room:error`
- `lobby:state`
- `player:ready`
- `player:unready`

### Game Events
Examples:
- `game:start`
- `input:direction`
- `game:state`
- `game:score`
- `game:over`
- `game:error`

### Replay / Session Events
Examples:
- `game:replay-request`
- `game:replay-state`
- `room:closed`
- `player:left`
- `player:disconnected`

Final event naming may evolve, but must remain consistent and documented.

## Payload Conventions
Use typed payloads with explicit fields.

Recommended conventions:
- `roomCode` for joinable room identifier
- `playerId` for anonymous per-session player identifier
- `ready` as boolean state
- `direction` as an enum/string union such as `up | down | left | right`
- `phase` for room/match state
- `reason` for rejection or terminal event causes

Avoid overly clever compact payloads that trade away readability.

## Validation Rules
Server must validate at least:
- room exists
- room is joinable
- room is not already full
- player action is valid for current room/match phase
- direction changes do not violate movement rules, if such restrictions are implemented
- replay/start actions occur only in allowed states

Reject invalid actions with explicit error events/messages.

## State Broadcasting
Broadcast room-scoped authoritative updates whenever meaningful state changes occur, especially:
- player joined/left
- ready state changed
- match started
- tick/game state advanced
- score changed
- game ended
- replay state changed

## Versioning / Stability
For MVP, keep contracts simple and avoid premature versioning layers. However:
- centralize event names
- centralize shared payload types
- document event contracts in implementation/design docs when features are specified

## Error Handling
Errors should be explicit and user-safe.

Use understandable reasons such as:
- invalid room code
- room full
- game already started
- action not allowed in current state
- invalid direction input

Do not expose internal server details to clients.

## HTTP Conventions (If Any Are Added)
If lightweight HTTP endpoints are added, default to:
- JSON request/response
- `/api/...` namespace
- standard status codes
- health endpoint for deployment/runtime checks

But avoid moving gameplay semantics into HTTP when sockets are the better fit.

## Security / Trust Model
Because auth is anonymous and clients are untrusted:
- never trust client-sent game state
- treat every client event as untrusted input
- validate payload shape and allowed action timing server-side