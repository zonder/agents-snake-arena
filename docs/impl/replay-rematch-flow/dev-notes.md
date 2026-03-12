# Development Notes: Replay / Rematch Flow

## Implemented
- Added server-authoritative rematch state and `game:rematch-request` / `game:rematch-state` transport support.
- Kept `game-over` as the post-round phase and modeled rematch as a sub-state on the room.
- Removed automatic room closure after normal `game:ended`; rooms now stay open for same-room replay.
- Reused the existing countdown/start pipeline for rematches by creating a fresh `MatchState` before restarting.
- Cleared stale rematch acceptance and returned rooms to `waiting-for-players` when a post-game leave/disconnect happens.
- Allowed replacement players to rejoin the same room after a post-game leave and return through the normal lobby ready flow.
- Added browser UI for rematch acceptance and waiting/accepted messaging on the game-over screen.

## Notes / Deviations
- `game:rematch-state` is emitted alongside updated `lobby:state` and `game:state` so the client can render a focused rematch panel without inferring post-game state from multiple payload shapes.
- After a disconnect during active play, the service still ends the match immediately, but it no longer force-closes the room afterward; the remaining player can keep the room code and wait for a replacement.
