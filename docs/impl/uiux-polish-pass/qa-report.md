# QA Report — UI/UX polish pass

- Parent issue: #25
- QA subtask: #38
- PR: #28
- Branch: `feature/issue-25`
- Feature slug: `uiux-polish-pass`
- Dev URL: https://dev.snakearena.website/
- QA date (UTC): 2026-03-12
- Verdict: **PASS**

## Summary
I re-ran the requested browser-based QA against the refreshed dev deployment and confirmed the environment is now serving build `v0.1.0+e0a69e1`.

Using a headless Chromium flow with two browser clients, I exercised the feature through entry, lobby, countdown, in-progress, game-over, one-sided rematch prompt, and rematch countdown states in live room `IFDC`.

The key regression target is resolved: the board and board-stage geometry remained unchanged across the full state path that previously risked displacement. Measured host-client drift was `0px` for board and stage position across:
- countdown → in-progress
- in-progress → game-over
- game-over → rematch countdown
- initial countdown → rematch countdown

The broader UI/UX polish acceptance criteria also remained present on the refreshed build: the retro-arcade shell, prominent countdown overlay, polished score rails, rematch/result CTA treatment, and default-on sound toggle all appeared in the live app.

## What I verified
- Dev URL `/build-info.json` returned `v0.1.0+e0a69e1` built at `2026-03-12T09:55:18.199Z`.
- The live entry screen still shows the approved retro-arcade hero copy: `Clean boards. Neon tension. Quick rematches.`
- Lobby/create/join flow, room-code hero, and polished button styling render correctly on the refreshed build.
- Countdown state renders the emphasized overlay (`3`, `2`, etc.) and the in-game label `Countdown: ...` while keeping the board centered.
- In-progress gameplay preserves the board-first layout and polished side-rail score presentation.
- Game-over keeps the board visible and presents the post-game rematch banner without moving the board.
- One-player rematch acceptance shows the polished incoming prompt: `Your opponent wants a rematch. Accept to restart in the same room.`
- Both-player rematch acceptance returns to a fresh countdown while preserving board placement.
- Sound remains enabled by default (`Sound: on` visible in the live UI).

## Evidence committed
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/build-info.json`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/summary.json`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/01-entry.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/02-lobby-host.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/03-lobby-guest.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/04-countdown-host.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/04b-countdown-guest.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/05-in-progress-host.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/06-game-over-host.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/06b-game-over-guest.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/07-rematch-prompt-guest.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/08-rematch-countdown-host.png`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/08b-rematch-countdown-guest.png`

## Acceptance criteria status

| # | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clean retro arcade visual style across lobby, gameplay, result, and rematch screens | **PASS** | Live screenshots show the approved retro-arcade shell across entry/lobby/game/result/rematch states (`01`–`08b`), including the hero copy, neon-accented board shell, and coherent card/button styling. |
| 2 | Lobby/create/join flow feels visibly more polished than baseline | **PASS** | `01-entry.png`, `02-lobby-host.png`, and `03-lobby-guest.png` show the polished hero card, room-code hero, and upgraded CTA styling on the refreshed build. |
| 3 | Countdown presentation is more prominent and more playful | **PASS** | `04-countdown-host.png` / `04b-countdown-guest.png` plus `summary.json` show visible countdown overlay text (`3`, `2`) and `Countdown: ...` HUD messaging. |
| 4 | Scoreboard/player panels are more polished and readable | **PASS** | Countdown, in-progress, and result screenshots preserve the side-rail player cards and score chips with readable labels and consistent styling. |
| 5 | Noticeable but tasteful visual juice such as glow, pulse, collision flash, and win-state feedback | **PASS** | The live polished states include the countdown overlay emphasis, highlighted rematch/result cards, and phase/outcome presentation captured in the rerun screenshots. |
| 6 | Rematch/result flow feels more inviting and polished | **PASS** | `06-game-over-host.png`, `07-rematch-prompt-guest.png`, and `08-rematch-countdown-host.png` show the rematch-ready banner, incoming rematch prompt, and accepted rematch countdown transition. |
| 7 | Basic sound effects are present and enabled by default | **PASS** | The live UI loads with `Sound: on`, and the refreshed build still includes the synthesized countdown/rematch audio wiring already reviewed in implementation. |
| 8 | Board-first layout preserved and no viewport jumping | **PASS** | `summary.json` measured `0px` drift for board and stage position across countdown, in-progress, game-over, and rematch countdown states on the host client. |
| 9 | Overall experience feels smoother and more fun while preserving gameplay behavior | **PASS** | The live rerun completed end-to-end with room creation, join, ready-up, countdown, natural round completion, rematch prompt, and rematch restart on the refreshed build without regression. |

## Board stability regression result
The specific blocker from the previous rerun is resolved.

Measured host geometry from `docs/impl/uiux-polish-pass/qa-artifacts/rerun-3/summary.json`:
- `countdown_to_inProgress`: board `topDelta=0`, `leftDelta=0`; stage `topDelta=0`, `leftDelta=0`
- `inProgress_to_gameOver`: board `topDelta=0`, `leftDelta=0`; stage `topDelta=0`, `leftDelta=0`
- `gameOver_to_rematchCountdown`: board `topDelta=0`, `leftDelta=0`; stage `topDelta=0`, `leftDelta=0`
- `countdown_to_rematchCountdown`: board `topDelta=0`, `leftDelta=0`; stage `topDelta=0`, `leftDelta=0`

This confirms the post-game/rematch banner no longer displaces the board between the tested states.

## Remaining defects / blockers
None found during this rerun.
