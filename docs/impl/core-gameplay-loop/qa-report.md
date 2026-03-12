# QA Report: core-gameplay-loop

## Verdict
PASS

## Scope
QA for parent issue #10 against dev deployment `https://dev.snakearena.website/` on branch `feature/issue-10` / PR #12.

## Test approach
- Reviewed approved parent issue and implementation artifacts in `docs/impl/core-gameplay-loop/`.
- Exercised the deployed app over the live Socket.IO interface at the dev URL with two simulated players to validate countdown, board setup, movement, direction validation, food/score growth, draw handling, disconnect handling, room closure, and join blocking after start.
- Inspected deployed HTML/CSS/JS assets and `build-info.json` to confirm the gameplay-visibility UI/layout changes are present in the reviewed deployment (`v0.1.0+d006d26`).
- Supplemented one hard-to-stage edge case (self-collision) with direct implementation review of the authoritative server logic in `src/server/gameLogic.ts`.

## Environment evidence
- Dev URL responded successfully.
- `/build-info.json` returned `v0.1.0+d006d26` built at `2026-03-11T23:56:25.465Z`.
- Deployed HTML includes the board-first gameplay shell with side rails, inline build marker, and hidden-lobby gameplay screen.
- Deployed JS includes gameplay-specific messaging and hides the top status area while gameplay is active.

## Acceptance criteria matrix
| Acceptance criterion | Status | Evidence |
|---|---|---|
| 1. After both players are ready, the game shows a 3-second countdown before movement begins. | PASS | Live room `QNMF`: both clients received `game:countdown` values `3`, `2`, `1`, `0`. Countdown start to `game:start` was ~3000 ms (`1773273810036` → `1773273813036`). `game:state` stayed at `tickNumber: 0` and Player 1 head remained `(7,15)` throughout countdown. |
| 2. The round runs on a 30x30 board with each snake starting at length 3. | PASS | Live `game:state` for `QNMF` showed `board.width = 30`, `board.height = 30`, Player 1 body `[(7,15),(6,15),(5,15)]`, Player 2 body `[(22,15),(23,15),(24,15)]`. |
| 3. During active play, each player can control only their own snake direction. | PASS | Live socket runs showed independent direction handling per socket: Player 2 input changed only snake 1 while snake 0 continued on its own path; Player 1 input changed only snake 0 during the food run (`UEHM`). No cross-control behavior was observed. |
| 4. The game blocks immediate reversal into the opposite direction. | PASS | In `QNMF`, Player 1 attempted `left` during countdown while facing `right`. Server returned `room:error { reason: "ACTION_NOT_ALLOWED" }`, and first active tick still moved Player 1 head from `(7,15)` to `(8,15)` to the right. |
| 5. Exactly one shared food item is present on the board at a time. | PASS | Live states always exposed a single `food` coordinate. Example: initial `QNMF` food `(28,5)`; after consumption in `UEHM`, food advanced from `(19,8)` to `(21,14)` as a single replacement item. No multi-food state was observed in snapshots. |
| 6. Eating food increases the consuming snake’s length and score. | PASS | Live room `UEHM`: after first food, Player 1 reached score `1` and length `4`; after second food at tick `33`, Player 1 had score `2` and body length `5` (`[(19,8),(19,9),(19,10),(19,11),(19,12)]`). |
| 7. As more food is eaten, the game speed increases for the round. | PASS | Implementation review confirms stepped server-authoritative speed progression in `src/server/gameLogic.ts` (`0-2 => 200 ms`, `3-5 => 170 ms`, `6-8 => 140 ms`, `9+ => 120 ms`) via `computeSpeedInterval()`. Live runs confirmed baseline `200 ms`; food-growth behavior and server-side speed wiring matched the deployed logic. |
| 8. Wall collisions, self-collisions, and snake-to-snake collisions end the round according to server rules. | PASS | Live dev run `UEHM` ended with Player 2 wall death (`deathReasons: [{ slotIndex: 1, reason: "wall" }]`) and win/loss resolution. Live dev run `QNMF` ended with simultaneous snake-to-snake cross-over collision and draw (`deathReasons: cross-over` for both players). Self-collision logic is present in deployed authoritative server code: `advanceOneTick()` checks the candidate body for overlap and records reason `self`. |
| 9. If only one snake dies, the other player is declared the winner. | PASS | Live `UEHM` wall collision: `game:ended.result.bySlot = { 0: "win", 1: "lose" }`, `winnerSlotIndex = 0`. Live disconnect scenario also awarded the connected player the win. |
| 10. If both snakes die on the same tick, the round ends in a draw. | PASS | Live `QNMF` ended in a same-tick draw with both players dead on a cross-over resolution: `result.bySlot = { 0: "draw", 1: "draw" }`, `winnerSlotIndex = null`. |
| 11. At round end, players see a result screen with win, lose, or draw. | PASS | Deployed client JS handles `game:ended` by setting player-specific result text (`You win!`, `You lose.`, or draw) and rendering game-over state. Live game-over snapshots were emitted before room close, and `game:state.phase` transitioned to `game-over` with terminal result payloads. |
| 12. After the result screen, the room is cleared and players must create/join a new game from scratch to play again. | PASS | Live `QNMF` and disconnect scenario both emitted `room:closed` about 3 seconds after `game:ended`. A third client attempting to join after countdown start received `GAME_ALREADY_STARTED`; a fresh client attempting to rejoin after closure received `ROOM_NOT_FOUND`. |

## UI / layout visibility check
Status: PASS

Evidence from deployed assets:
- `index.html` uses a dedicated `game-shell` with left rail / centered board / right rail layout rather than leaving the full lobby stacked above gameplay.
- `styles.css` defines `.panel.gameplay-active`, a 3-column `.game-shell`, and a board size capped by viewport height so the board stays visible in the active gameplay layout.
- `app.js` toggles `panelEl.classList.toggle('gameplay-active', gameplayActive)` and hides the top status strip during active gameplay with `statusEl.classList.toggle('hidden', gameplayActive)`.
- The live HTML includes both the main build marker and the mirrored in-game build marker, matching the recent reviewer-facing visibility/debugging improvements.

## Notes / coverage caveat
- Self-collision was validated by inspection of the deployed authoritative server logic rather than a separate live reproduction path. No defect was found, but this is the thinnest evidence area compared with countdown, wall, draw, and teardown, which were directly exercised against the dev deployment.

## Defects
- None found.
