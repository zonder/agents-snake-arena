# QA Report — Mobile support rerun

- Parent issue: #40
- PR: #43
- Branch: `feature/issue-40`
- Feature slug: `mobile-support`
- QA rerun date: 2026-03-12
- Verdict: **FAIL**
- Final verified live build: `4109c81` (`v0.1.0+4109c81`)
- Requested landscape-fix code commit: `043c2c9`

## Summary
I re-ran browser QA against the refreshed dev deployment after the latest phone-landscape fix was deployed.

The live environment advanced during verification from `043c2c9` to `4109c81` (a deploy-log/docs commit on the same feature branch), so the final rerun evidence reflects the current live build `4109c81`, which still includes the requested fix commit `043c2c9`.

Result: **phone portrait remains usable, layout-mode selection is correct, on-screen buttons and swipe dispatch still work on mobile, and desktop behavior remains intact — but phone landscape gameplay is still not board-first and still extends below the viewport.**

## Build verification
- Initial deploy check observed `/build-info.json` at `043c2c9`.
- During the browser rerun, the live deployment refreshed again to `4109c81`.
- Final verified live build under test: `v0.1.0+4109c81`.
- Because `4109c81` is the current head/deploy record for `feature/issue-40`, the final QA evidence is valid for the latest deployed build.

## Scope covered in this rerun
- phone portrait gameplay usability
- phone landscape gameplay usability
- runtime layout-mode selection (`mobile-portrait`, `mobile-landscape`, `desktop`)
- board-first visibility and viewport fit
- mobile touch controls (on-screen button + swipe dispatch)
- desktop regression sanity

## Acceptance criteria
| # | Acceptance criterion | Result | Evidence |
|---|---|---|---|
| 1 | The game is usable on phones and tablets | **FAIL** | Portrait remains usable, but phone landscape gameplay still overflows below the viewport and is not practically board-first. |
| 2 | The game supports both portrait and landscape orientations | **FAIL** | Orientation/layout switching works, but landscape gameplay usability still fails because the stage extends beyond the viewport. |
| 3 | Portrait provides the preferred mobile experience | **PASS** | Portrait renders as `mobile-portrait` with the board fully visible and touch controls shown. |
| 4 | The full product flow works on mobile: create/join, lobby, game, result, and rematch | **PASS** | The rerun covered room create/join, ready-up, gameplay, game-over, and rematch on the live build. |
| 5 | Players can control the snake via swipe input | **PASS** | Synthetic touch-pointer swipe on the live mobile gameplay surface emitted `player:direction:set` on the websocket. See `touch-input-check.json`. |
| 6 | Players can control the snake via on-screen directional controls | **PASS** | Tapping the on-screen Up control emitted `player:direction:set` on the websocket. See `touch-input-check.json`. |
| 7 | Mobile layouts preserve readable UI and a board-first presentation | **FAIL** | Portrait passes, but landscape still fails: board bottom `449px` and stage bottom `462px` exceed the `390px` viewport height. |
| 8 | Mobile support preserves current sound behavior and current gameplay rules | **PASS** | No gameplay-rule regression was observed during the live rerun; countdown/gameplay/rematch flow remained functional on the refreshed build. |
| 9 | Desktop behavior remains intact after the mobile support changes | **PASS** | Desktop rerun resolved to `desktop`, hid touch controls, and still emitted keyboard direction input. |

## Key findings

### PASS — correct layout mode selection still works
- Phone portrait resolved to `mobile-portrait`.
- Phone landscape resolved to `mobile-landscape`.
- Desktop resolved to `desktop`.

### PASS — portrait remains usable
From `summary.json`:
- portrait board bottom: `352px`
- portrait viewport height: `664px`
- touch controls visible: yes

Portrait remains the better mobile experience and keeps the game board fully visible.

### FAIL — phone landscape gameplay still is not board-first
From `summary.json` and landscape screenshots:
- layout mode: `mobile-landscape`
- landscape board bottom: `449px`
- landscape stage bottom: `462px`
- landscape viewport height: `390px`

The live phone-landscape gameplay surface still extends below the viewport by roughly `59–72px`, so the board is not fully visible in the target landscape phone viewport.

### PASS — touch controls still dispatch input
From `touch-input-check.json` on live build `4109c81`:
- on-screen Up button emitted `42["player:direction:set",{"direction":"up"}]`
- synthetic touch-pointer swipe on `#gameStage` emitted `42["player:direction:set",{"direction":"up"}]`

### PASS — desktop behavior remains intact
From the desktop portion of `summary.json`:
- layout mode: `desktop`
- touch controls visible: `false`
- keyboard direction frame observed: yes

## Evidence committed
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/build-info-check.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/summary.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/touch-input-check.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/01-mobile-entry-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/02-mobile-lobby-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/03-mobile-lobby-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/04-mobile-game-portrait-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/05-mobile-game-portrait-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/06-mobile-game-landscape-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/07-mobile-game-landscape-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/08-mobile-gameover-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/09-mobile-gameover-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/10-mobile-rematch-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/11-mobile-rematch-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-043c2c9/12-desktop-game-host.png`

## Remaining blocker
**FAIL** — parent issue `#40` still has a blocking defect on the latest deployed build.

**Defect:** phone `mobile-landscape` gameplay still sizes/positions the board and game stage below the viewport after the post-game/rematch overflow fix.

**Observed on live build:** `4109c81`

**Impact:** board-first visibility and practical phone-landscape gameplay are still not fixed, so issue `#40` is not yet QA-passable.
