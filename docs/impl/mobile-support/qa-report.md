# QA Report — Mobile support

- Parent issue: `#40`
- PR: `#43`
- Branch: `feature/issue-40`
- Feature slug: `mobile-support`
- Dev URL: http://20.106.185.110:8081/
- QA rerun date (UTC): 2026-03-12
- Verified live build: `e9b8c71` (`v0.1.0+e9b8c71`)
- Fix under test on branch: `2510a99`
- Verdict: **FAIL**

## Summary
I re-ran QA in a real headless Chromium browser session after confirming the dev URL had refreshed to the current `feature/issue-40` branch build `e9b8c71`, which includes the mobile-landscape fix commit `2510a99` plus the follow-up redeploy docs commit.

The rerun still **fails**. The requested build refresh happened, portrait mode remains usable, touch controls and desktop behavior remain intact, and `data-layout-mode` selection is correct — but **phone landscape gameplay is still not board-first and still overflows beyond the viewport height** on the live build.

## Build verification
Live deployment metadata at rerun time:

- `commit`: `e9b8c71`
- `displayVersion`: `v0.1.0+e9b8c71`
- `builtAt`: `2026-03-12T14:10:44.015Z`

Evidence:
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/build-info-check.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/summary.json`

## Browser rerun coverage
Using Playwright + Chromium, I verified:
- mobile phone portrait entry/lobby/game/rematch flow
- mobile phone landscape gameplay/result layout
- root layout-mode selection (`mobile-portrait`, `mobile-landscape`, `desktop`)
- board/stage geometry against the live viewport
- touch controls visibility and interactive direction queueing on mobile
- desktop layout sanity with touch controls hidden and keyboard input preserved

## Acceptance criteria status
| # | Acceptance criterion | Status | Notes |
|---|---|---|---|
| 1 | The game is usable on phones and tablets | **FAIL** | Phone portrait remained usable, but phone landscape gameplay still exceeds the viewport and is not practically usable board-first. |
| 2 | The game supports both portrait and landscape orientations | **FAIL** | Orientation switching works and layout mode changes correctly, but landscape gameplay usability still fails because the game stage extends below the viewport. |
| 3 | Portrait provides the preferred mobile experience | **PASS** | Portrait rendered as `mobile-portrait` with a visible board, enabled touch controls, and readable board-first gameplay UI. |
| 4 | The full product flow works on mobile: create/join, lobby, game, result, and rematch | **PASS** | I completed create room, join room, ready-up, gameplay/result, and rematch restart in the live browser rerun. |
| 5 | Players can control the snake via swipe input | **PASS** | A real swipe gesture on the mobile game stage queued `pendingDirection: "up"` in countdown state. See `touch-input-check.json`. |
| 6 | Players can control the snake via on-screen directional controls | **PASS** | Clicking the mobile touch-control up button queued `pendingDirection: "up"` in countdown state. See `touch-input-check.json`. |
| 7 | Mobile layouts preserve readable UI and a board-first presentation | **FAIL** | Portrait passed, but landscape failed: the board and stage still extend below the viewport on a phone-sized landscape screen. |
| 8 | Mobile support preserves current sound behavior and current gameplay rules | **PASS** | No gameplay-rule regression was observed during the rerun flow; countdown, result, and rematch behavior remained consistent. |
| 9 | Desktop behavior remains intact after the mobile support changes | **PASS** | Desktop rerun resolved to `desktop` layout, kept touch controls hidden, and preserved keyboard input handling. |

## Key findings
### PASS — refreshed build is live
The dev URL is now serving the refreshed branch build `e9b8c71`, so this rerun is a valid post-fix verification pass.

### PASS — portrait mode remains usable and board-first
From `summary.json` / portrait screenshots:
- viewport: `390 x 664`
- layout mode: `mobile-portrait`
- board rect: `314 x 314`
- board bottom: `352` within viewport height `664`
- touch controls visible and enabled in countdown/gameplay flow

### FAIL — phone landscape still overflows vertically
From `summary.json` / landscape screenshots:
- viewport: `844 x 390`
- layout mode: `mobile-landscape`
- board rect: `244 x 244`
- stage rect: `270 x 270`
- board bottom: `506`
- stage bottom: `519`

Even after the fix, the game surface still sits too low and extends well below the available `390px` viewport height in phone landscape. That means the gameplay view is still not board-first / fully visible on the target orientation.

### PASS — touch controls still work on mobile
From `touch-input-check.json`:
- touch-button interaction queued `pendingDirection: "up"`
- swipe interaction queued `pendingDirection: "up"`
- both checks were captured while the panel was in `countdown` / `mobile-portrait`

### PASS — desktop behavior preserved
Desktop verification on the same live build showed:
- `data-layout-mode="desktop"`
- touch controls hidden
- keyboard direction input path still functioning

## Evidence
Artifacts captured in:
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/build-info-check.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/summary.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/touch-input-check.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/01-mobile-entry-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/02-mobile-lobby-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/03-mobile-lobby-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/04-mobile-game-portrait-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/05-mobile-game-portrait-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/06-mobile-game-landscape-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/07-mobile-game-landscape-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/08-mobile-gameover-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/09-mobile-gameover-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/10-mobile-rematch-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/11-mobile-rematch-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-2510a99/12-desktop-game-host.png`

## Remaining defect / blocker
**Defect:** `mobile-landscape` gameplay layout still positions/sizes the game stage so it extends below the viewport on a phone-sized landscape screen.

**Observed on live build:** `e9b8c71`

**Impact:** Board-first visibility and practical phone-landscape gameplay are still broken, so issue `#40` cannot be approved.

## Final verdict
**FAIL** — parent issue `#40` still has a remaining blocker: phone landscape gameplay usability is not fixed on the refreshed live build.
