# Development Notes: Replay / Rematch Flow

## Implemented
- Added server-authoritative rematch state and `game:rematch-request` / `game:rematch-state` transport support.
- Kept `game-over` as the post-round phase and modeled rematch as a sub-state on the room.
- Removed automatic room closure after normal `game:ended`; rooms now stay open for same-room replay.
- Reused the existing countdown/start pipeline for rematches by creating a fresh `MatchState` before restarting.
- Cleared stale rematch acceptance and returned rooms to `waiting-for-players` when a post-game leave/disconnect happens.
- Allowed replacement players to rejoin the same room after a post-game leave and return through the normal lobby ready flow.
- Added browser UI for rematch acceptance and waiting/accepted messaging on the game-over screen.

- Follow-up review fixes: duplicate `game:rematch-request` accepts are now a no-op, and duplicated rematch payloads stay viewer-consistent across `lobby:state`, `game:state`, and `game:rematch-state`.

## Notes / Deviations
- `game:rematch-state` is emitted alongside updated `lobby:state` and `game:state` so the client can render a focused rematch panel without inferring post-game state from multiple payload shapes.
- After a disconnect during active play, the service still ends the match immediately, but it no longer force-closes the room afterward; the remaining player can keep the room code and wait for a replacement.


## Follow-up: stakeholder visibility fix
- Investigated the stakeholder report against both the feature branch and the current dev deployment (`v0.1.0+ec7474c`). The rematch feature was already shipped and wired correctly; the problem was discoverability.
- Root cause: the only rematch CTA lived in the narrow left sidebar beside the board, so after game over it was easy to miss while attention stayed centered on the result board/message.
- Added a prominent post-game rematch banner directly above the board with the same authoritative action wiring as the sidebar button.
- Updated button/status copy so the call to action is stronger (`Accept rematch now`, `Waiting for other player`, `Rematch starting…`) while keeping the underlying room/rematch state machine unchanged.
- Kept the original sidebar rematch card, but now visually highlight it during actionable post-game states so both desktop and mobile layouts make the replay affordance obvious.
