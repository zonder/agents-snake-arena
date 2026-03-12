# QA Report — UI/UX polish pass

- Parent issue: #25
- PR: #28
- Branch: `feature/issue-25`
- Feature slug: `uiux-polish-pass`
- Dev URL: http://20.106.185.110:8081/
- QA date (UTC): 2026-03-12
- Verdict: **FAIL**

## Summary
I re-ran QA with actual rendered-browser verification using Playwright Chromium against the deployed dev environment. The rerun confirmed that the polished retro-arcade presentation, countdown treatment, scoreboard/player cards, rematch/result presentation, visual effects, and default-on sound behavior are all present in the browser.

However, the feature does **not** fully satisfy the layout-stability requirement. The gameplay board shifts downward significantly when the result/rematch banner appears, which violates the acceptance criterion that polishing must preserve the board-first layout and avoid viewport jumping.

Because acceptance criterion #8 fails, the overall QA verdict is **FAIL**.

## Test setup
- Browser: Playwright Chromium (headless)
- Environment: deployed dev URL
- Evidence committed under `docs/impl/uiux-polish-pass/qa-artifacts/`
  - `01-entry.png`
  - `02-lobby-host.png`
  - `03-lobby-guest.png`
  - `04-countdown.png`
  - `05-in-progress.png`
  - `06-game-over.png`
  - `07-rematch-prompt-opponent.png`
  - `08-rematch-accepted.png`
  - `summary.json`
  - `audio-summary.json`

## Executed flow
1. Opened two browser sessions on the deployed app.
2. Created a room in session 1 and joined it from session 2.
3. Verified lobby presentation and room-code flow.
4. Readied both players and verified countdown/gameplay rendering.
5. Let the round complete naturally to verify result/rematch presentation.
6. Triggered rematch from one player and accepted from the other to verify rematch CTA/waiting states and restart behavior.
7. Probed in-browser audio generation behavior while the UI flow ran.

## Evidence collected

### Rendered-browser UI evidence
The committed screenshots show:
- polished entry hero and create/join presentation (`01-entry.png`)
- polished lobby with room-code hero and improved player cards (`02-lobby-host.png`, `03-lobby-guest.png`)
- prominent countdown overlay (`04-countdown.png`)
- polished gameplay shell with side score/player panels (`05-in-progress.png`)
- polished result/rematch screen (`06-game-over.png`)
- inviting opponent-rematch prompt state (`07-rematch-prompt-opponent.png`)
- accepted-rematch restart state (`08-rematch-accepted.png`)

### Layout metrics evidence
From `qa-artifacts/summary.json` on the rendered app:
- During countdown:
  - `#board.top = 46`
  - `#gameStage.top = 33`
- During game-over/result state:
  - `#board.top = 281`
  - `#gameStage.top = 268`
- During opponent-rematch prompt state:
  - `#board.top = 337`
  - `#gameStage.top = 324`
- `scrollY` stayed `0`, so this is not a page scroll artifact; the rendered layout itself shifts the board down as the post-game UI appears.

This is a large visual displacement and is directly at odds with the board-first / no-layout-jump requirement.

### Audio evidence
From `qa-artifacts/audio-summary.json`:
- both browser sessions rendered `Sound: on` by default
- audio generation paths fired in-browser during the tested flow:
  - page 1: `oscillators = 12`, `gains = 12`, `contexts = 1`
  - page 2: `oscillators = 12`, `gains = 12`, `contexts = 1`

This supports that key sound events are wired and firing under browser execution, though this headless environment is still not suitable for human subjective loudness/tone review.

## Acceptance criteria status

| # | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| 1 | The game presents a clean retro arcade visual style across lobby, gameplay, result, and rematch screens. | **Pass** | Screenshots `01-entry.png`, `02-lobby-host.png`, `04-countdown.png`, `06-game-over.png`, `07-rematch-prompt-opponent.png` show a coherent neon/retro presentation across states. |
| 2 | The lobby/create/join flow feels visibly more polished than the current functional baseline. | **Pass** | `01-entry.png`, `02-lobby-host.png`, and `03-lobby-guest.png` show the upgraded hero card, CTA styling, room-code treatment, and polished lobby cards. |
| 3 | Countdown presentation is more prominent and more playful. | **Pass** | `04-countdown.png` shows the large overlay countdown treatment; `summary.json` captured countdown screen/theme state successfully. |
| 4 | Scoreboard/player panels are more polished and readable. | **Pass** | `05-in-progress.png` shows the side score/player cards and improved game shell presentation. |
| 5 | The game includes noticeable but tasteful visual juice such as glow, pulse, collision flash, and win-state feedback. | **Pass** | Countdown overlay and rematch highlighting are visible in screenshots; `summary.json` captured `boardFxLayer` entering `flash-draw` at round end, confirming round-end board flash behavior. |
| 6 | The rematch/result flow feels more inviting and polished. | **Pass** | `06-game-over.png`, `07-rematch-prompt-opponent.png`, and `08-rematch-accepted.png` show the polished post-game banner, opponent prompt state, and rematch restart messaging. |
| 7 | Basic sound effects are present and enabled by default. | **Pass (as feasible in headless QA)** | `Sound: on` is shown by default in both sessions; `audio-summary.json` confirms audio nodes were created during the live browser flow. |
| 8 | Polishing preserves the board-first gameplay layout and does not reintroduce viewport jumping. | **FAIL** | The board top moves from `46px` during countdown to `281px` at game over and to `337px` in the rematch prompt state (`summary.json`). The rendered board is being pushed down by post-game UI. |
| 9 | The overall experience feels smoother and more fun while preserving current gameplay behavior. | **Fail** | The polish is present and gameplay flow still works, but acceptance cannot pass overall while the board-first layout regresses during result/rematch transitions. |

## Defect

### Board-first layout regresses when result/rematch UI appears
**Severity:** Medium

**Reproduction**
1. Open the deployed app in two browsers.
2. Create/join a room and ready both players.
3. Wait for the round to end.
4. Observe the board position as the result/rematch banner appears.
5. Trigger a rematch prompt from one player and observe the board position again in the other player’s browser.

**Observed**
- The board is near the top of the gameplay shell during countdown.
- When post-game/rematch UI appears, the board is pushed far downward.
- The rematch prompt state pushes it even farther.

**Expected**
- The board should remain in a stable board-first position across countdown, active play, result, and rematch states.
- Additional result/rematch UI should not cause large gameplay-area displacement.

**Evidence**
- `docs/impl/uiux-polish-pass/qa-artifacts/04-countdown.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/06-game-over.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/07-rematch-prompt-opponent.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/summary.json`

## Notes
- Browser launch is no longer blocked; the previous environment issue is resolved.
- I did not modify app source code.
- The deployment build marker observed during QA was `Build: v0.1.0+e431101`.
