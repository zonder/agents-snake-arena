# QA Report — Player Names / Identity

- Parent issue: #73
- PR: #76
- Branch: `feature/issue-73`
- Feature slug: `player-names-identity`
- Environment: dev (`https://dev.snakearena.website/`)
- QA date (UTC): 2026-03-12
- Verdict: **PASS**

## Test approach
Executed a headless browser QA pass against the deployed dev environment using two anonymous browser contexts to validate:
- required pre-join name entry
- validation rules (blank, spaces-only, emoji, over-12 chars, valid spaced 12-char name)
- local browser persistence / prefill
- duplicate-name allowance
- display of names in lobby, gameplay HUD, result/rematch UI, and disconnect messaging
- no auth/account requirement in the flow

## Acceptance criteria results

| # | Acceptance criterion | Result | Evidence |
|---|---|---|---|
| 1 | A player must enter a valid name before creating or joining a room. | PASS | Attempting `Create room` with an empty value or spaces-only value kept the user on the entry screen and surfaced name validation instead of entering a lobby. |
| 2 | Valid names may include spaces and must be 12 characters or fewer. | PASS | `Ada Lovelace` (12 chars including the space) successfully created a room. `ABCDEFGHIJKLM` (13 chars) was rejected with validation and did not enter the flow. |
| 3 | Emoji are rejected as invalid input. | PASS | `Alex😀` was rejected on submit and the session remained on the entry screen. |
| 4 | The browser remembers the last used valid name locally. | PASS | After creating a room with `Ada Lovelace`, local storage contained `snake:player-name = Ada Lovelace`. |
| 5 | The remembered name is prefilled when the player returns in the same browser. | PASS | Opening a fresh page in the same browser context prefilled the name input with `Ada Lovelace`. |
| 6 | Player names appear in the lobby. | PASS | In the created room, both lobby player cards rendered `Ada Lovelace`; the creator showed `Ada Lovelace (You)` and the second player showed `Ada Lovelace`. |
| 7 | Player names appear in the gameplay HUD. | PASS | After both players readied up, the HUD score cards rendered `Ada Lovelace · Player 1` and `Ada Lovelace · Player 2`. |
| 8 | Player names appear in result/rematch UI. | PASS | After the second player disconnected long enough for the round to resolve, the game-over UI still showed named player cards such as `Ada Lovelace · Player 1 Winner` and `Ada Lovelace · Player 2 Eliminated`; rematch UI also remained name-aware. |
| 9 | Player names appear in reconnect/disconnect messaging where relevant. | PASS | During the live match, disconnect messaging rendered the duplicate-safe name-aware copy `Ada Lovelace (Player 2) disconnected. Slot reserved for 30s.` in the gameplay status/message areas. |
| 10 | Duplicate names are allowed without blocking the flow. | PASS | A second anonymous browser joined the same room using the same name `Ada Lovelace`; both players entered the lobby and then the match without any uniqueness block. |

## Additional observations
- No account, sign-in, or authentication gate appeared anywhere in the tested create/join flow.
- Duplicate-name disambiguation worked in messaging by appending slot context (`Player 2`) when needed.
- The deployed build under test reported build marker `v0.1.0+a3a7a97` in the UI during QA.

## Defects / blockers
None found during this QA pass.
