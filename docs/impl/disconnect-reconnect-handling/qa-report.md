# QA report — Disconnect / reconnect handling

## Summary
- **Parent issue:** #63
- **PR:** #66
- **Branch:** `feature/issue-63`
- **Feature slug:** `disconnect-reconnect-handling`
- **Environment:** `https://dev.snakearena.website/`
- **QA verdict:** **PASS**
- **Test date (UTC):** 2026-03-12
- **Method:** Live end-to-end socket-level validation against the deployed dev environment using real multi-client reconnect flows.

## Artifacts reviewed
- Parent issue #63 spec
- `docs/impl/disconnect-reconnect-handling/spec.md`
- `docs/impl/disconnect-reconnect-handling/design.md`
- `docs/impl/disconnect-reconnect-handling/dev-notes.md`
- `docs/impl/disconnect-reconnect-handling/deploy-log.md`
- PR #66 changed files list

## Test scenarios executed
1. Lobby disconnect reserves slot and same-browser/device reconnect reclaims the same slot.
2. Lobby disconnect timeout reopens the reserved slot after 30 seconds.
3. Gameplay disconnect pauses the match, shows reconnect-waiting state, and resumes after reconnect.
4. Gameplay disconnect timeout awards the connected player the win.
5. Post-game/rematch disconnect reserves the slot, disables rematch while reserved, and reopens the slot after timeout.

## Acceptance criteria results

| AC | Requirement | Result | Evidence |
|---|---|---|---|
| 1 | If a player disconnects in lobby state, their slot is reserved for 30 seconds. | PASS | In room `OKTH`, disconnecting Player 2 caused lobby reconnect state to become active immediately with `secondsRemaining: 30` and `disconnectedSlotIndex: 1`. |
| 2 | If that player reconnects within 30 seconds from the same browser/device, they automatically reclaim their same slot. | PASS | In room `OKTH`, Player 2 resumed with the original reconnect token and received `session:resume:succeeded` with `slotIndex: 1`; lobby returned to two occupied players with no manual recovery step. |
| 3 | If the player does not reconnect in time from lobby/rematch state, the slot reopens. | PASS | In room `NMSJ`, the lobby returned to `phase: waiting-for-players` with Player 2 unoccupied after timeout. In room `IWIV`, post-game/rematch timeout also returned the room to `waiting-for-players` with Player 2 slot reopened. |
| 4 | If a player disconnects during active gameplay, the match pauses and clearly shows reconnect-waiting state. | PASS | In room `OZSC`, disconnecting Player 2 during active play produced `game:state` with `phase: in-progress`, `paused: true`, reconnect active, and reconnect status `waiting-for-player`. |
| 5 | If the disconnected gameplay player reconnects within 30 seconds, the match resumes. | PASS | In room `OZSC`, Player 2 resumed with the original reconnect token, a server-driven resume countdown was emitted, and the game returned to `paused: false` with reconnect inactive. |
| 6 | If the disconnected gameplay player does not reconnect within 30 seconds, the remaining player is declared the winner. | PASS | In room `SKIQ`, after Player 2 stayed disconnected past timeout, `game:ended` declared `winnerSlotIndex: 0` with death reason `{ slotIndex: 1, reason: 'disconnect' }`. |
| 7 | Reconnect identity works via same browser/device local session token. | PASS | Both lobby (`OKTH`) and gameplay (`OZSC`) recovery succeeded only by presenting the stored reconnect token and reclaimed the original slot automatically. |
| 8 | The reconnect flow works across lobby, gameplay, and post-game/rematch states. | PASS | Verified in lobby (`OKTH`, `NMSJ`), active gameplay (`OZSC`, `SKIQ`), and post-game/rematch (`IWIV`). |
| 9 | The experience is understandable to both the disconnected and remaining player. | PASS | Observed explicit reconnect state transitions and timer-driven behavior in lobby/game/rematch payloads: reserved slot messaging, reconnect-active states, paused gameplay, resume countdown, rematch unavailable while waiting, and timeout reopening / forfeit resolution. |

## Notes
- The gameplay resume path emitted a server-driven resume countdown and resumed correctly. The first observed countdown event in QA was `0`, which is consistent with joining the countdown stream after it started rather than a UX defect.
- QA was performed through live socket interactions against the deployed build rather than a browser UI session, but the emitted state and transitions matched the expected player-facing behavior described in the spec and deployment notes.
- No defects or blockers were found during the required acceptance-criteria coverage.

## Verdict
**PASS** — Issue #63 meets the approved disconnect / reconnect handling acceptance criteria in the current dev deployment.
