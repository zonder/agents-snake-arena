# QA Report: room-lobby-autostart

## Summary
- Parent issue: #3
- PR: #7
- Branch: `feature/issue-3`
- Dev URL tested: `http://20.106.185.110:8081/`
- QA verdict: **PASS**
- Test date: 2026-03-11 UTC

## Test approach
- Exercised the deployed app over its live Socket.IO endpoint using direct Engine.IO / Socket.IO polling requests against `http://20.106.185.110:8081/socket.io/`.
- Verified the deployed UI shell over HTTP for player-facing controls and lobby messaging.
- Read the approved spec and implementation artifacts in `docs/impl/room-lobby-autostart/`.
- Did **not** modify application source code.

## Acceptance criteria coverage

| AC | Result | Evidence |
|---|---|---|
| 1. Create room lands creator in lobby with visible 4–6 letter code | PASS | `room:create` returned `room:created` with code `GUFS` (4 uppercase letters) and `lobby:state` showed creator in slot 1 with phase `waiting-for-players`. |
| 2. Creator can copy room code from lobby UI | PASS | Deployed HTML contains `Copy` button (`copyRoomCodeButton`) and deployed `public/app.js` binds it to `navigator.clipboard.writeText(latestLobbyState.roomCode)`. |
| 3. Second player can join existing, joinable room | PASS | Second client joined `GUFS` successfully using lowercase input `gufs`; server normalized input and returned `room:joined`, then both clients received matching 2-player `lobby:state`. |
| 4. Room never allows more than 2 players | PASS | Third client attempting to join `GUFS` received `room:error` with reason `ROOM_FULL` and message `That room is already full.` |
| 5. Both players see a 2-slot lobby with accurate occupancy state | PASS | After second join, both clients received `players[0].isOccupied=true` and `players[1].isOccupied=true`, `occupiedCount=2`, `allPlayersPresent=true`. |
| 6. Both players see ready/unready state in real time | PASS | After player 1 set ready, both clients immediately received `lobby:state` version `3` showing player 1 ready and player 2 not ready. |
| 7. Each player can toggle only their own ready state | PASS | Player 1 toggling ready changed only player 1’s `isReady` flag in both clients’ authoritative lobby snapshots. No cross-player state mutation observed. |
| 8. Match does not start until 2 players are present and both are ready | PASS | With only one ready player, both clients remained in phase `lobby`, `allReady=false`, `canStart=false`, and no `game:start` event was emitted. |
| 9. Match auto-starts once both players are present and both are ready | PASS | When replacement player set ready, both clients received `lobby:state` with all ready, then phase `starting`, then `game:start` for room `GUFS`. |
| 10. If either player unreadies before match starts, auto-start is canceled | PASS | In fresh room `IEBT`, player 1 toggled ready to true and then back to false before player 2 became ready; both clients stayed in phase `lobby`, `allReady=false`, `canStart=false`, and no `game:start` event fired. |
| 11. If one player leaves before start, room stays open and lobby waits for second player | PASS | After player 2 disconnected from `GUFS` before start, player 1 received `player:left` and a new `lobby:state` with slot 2 open, `occupiedCount=1`, phase `waiting-for-players`; a replacement player then joined the same room successfully. |
| 12. Clear errors for invalid code, room full, already started, room no longer exists | PASS | Verified all four: `INVALID_ROOM_CODE` → `Enter a valid room code.`; `ROOM_FULL` → `That room is already full.`; `GAME_ALREADY_STARTED` → `That game has already started.`; `ROOM_NOT_FOUND` → `Room no longer exists.` |

## Additional observations
- On pre-start disconnect, the remaining player’s ready state reset to `false`, which correctly prevents stale ready conditions from causing an accidental start.
- Join code normalization accepts lowercase input and resolves to uppercase room codes, which is a good UX outcome for the stated edge case.
- Lobby messaging clearly communicates the auto-start rule: `Game starts automatically when both players are ready.`

## Notes / limitations
- This environment is headless, so the copy action was validated by deployed UI control presence plus shipped client-side clipboard handler, rather than by a literal browser click.
- Gameplay after `game:start` is intentionally a placeholder and was treated as out of scope per the approved spec.

## Final verdict
**PASS** — All acceptance criteria for issue #3 were satisfied in QA against the deployed dev environment.
