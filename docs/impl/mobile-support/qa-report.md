# QA Report — Mobile support rerun

- Parent issue: #40
- PR: #43
- Branch: `feature/issue-40`
- Feature slug: `mobile-support`
- QA rerun date: 2026-03-12
- Verdict: **PASS**
- Final verified live build: `6d384f0` (`v0.1.0+6d384f0`)
- Requested landscape-fix code commit: `6d384f0`

## Summary
I re-ran browser QA against the refreshed dev deployment after the latest phone-landscape fix was deployed.

The dev environment was first verified via `/build-info.json`, which returned the expected refreshed build `6d384f0`. Real-browser verification on the live deployment now shows the prior phone-landscape overflow blocker is resolved.

Result: **phone portrait is usable, phone landscape is now board-first and fully within the viewport, layout-mode selection is correct, touch controls remain available, and desktop behavior remains intact.**

## Build verification
- `http://20.106.185.110:8081/build-info.json` returned `v0.1.0+6d384f0` built at `2026-03-12T15:26:26.964Z`.
- The browser rerun evidence was captured against that live build.
- Build verification artifact: `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/build-info-check.json`

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
| 1 | The game is usable on phones and tablets | **PASS** | Phone portrait and phone landscape were both playable on the live build, and the gameplay surface fit within the tested mobile viewports. |
| 2 | The game supports both portrait and landscape orientations | **PASS** | Portrait resolved to `mobile-portrait`; rotated phone landscape resolved to `mobile-landscape` and remained usable. |
| 3 | Portrait provides the preferred mobile experience | **PASS** | Portrait keeps the board fully visible with touch controls shown and remains the most spacious mobile layout. |
| 4 | The full product flow works on mobile: create/join, lobby, game, result, and rematch | **PASS** | The rerun covered room create/join, ready-up, gameplay, game-over, and rematch on the live build. |
| 5 | Players can control the snake via swipe input | **PASS** | `touch-input-check.json` captured `42["player:direction:set",{"direction":"up"}]` for the swipe-triggered mobile direction change. |
| 6 | Players can control the snake via on-screen directional controls | **PASS** | `touch-input-check.json` captured `42["player:direction:set",{"direction":"up"}]` for the on-screen Up button. |
| 7 | Mobile layouts preserve readable UI and a board-first presentation | **PASS** | Portrait and landscape both fit. In landscape, board bottom `284px` and stage bottom `297px` are within the `390px` viewport height. |
| 8 | Mobile support preserves current sound behavior and current gameplay rules | **PASS** | No gameplay-rule regression was observed during the live rerun; countdown/gameplay/rematch flow remained functional on the refreshed build. |
| 9 | Desktop behavior remains intact after the mobile support changes | **PASS** | Desktop rerun resolved to `desktop`, hid touch controls, and still emitted keyboard direction input. |

## Key findings

### PASS — correct layout mode selection works across tested modes
- Phone portrait resolved to `mobile-portrait`.
- Phone landscape resolved to `mobile-landscape`.
- Desktop resolved to `desktop`.

### PASS — phone portrait remains usable
From `summary.json`:
- portrait board bottom: `352px`
- portrait stage bottom: `363px`
- portrait viewport height: `664px`
- touch controls visible: yes

### PASS — phone landscape gameplay is now board-first and fits the viewport
From `summary.json` and landscape screenshots:
- layout mode: `mobile-landscape`
- landscape board bottom: `284px`
- landscape stage bottom: `297px`
- landscape viewport height: `390px`

The live phone-landscape gameplay surface now stays within the viewport with comfortable remaining space below the stage, resolving the prior overflow blocker.

### PASS — touch controls still dispatch input
From `touch-input-check.json` on live build `6d384f0`:
- on-screen Up button emitted `42["player:direction:set",{"direction":"up"}]`
- swipe-triggered request emitted `42["player:direction:set",{"direction":"up"}]`

### PASS — desktop behavior remains intact
From the desktop portion of `summary.json`:
- layout mode: `desktop`
- touch controls visible: `false`
- keyboard direction frame observed: yes

## Evidence committed
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/build-info-check.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/summary.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/touch-input-check.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/01-mobile-entry-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/02-mobile-lobby-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/03-mobile-lobby-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/04-mobile-game-portrait-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/05-mobile-game-portrait-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/06-mobile-game-landscape-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/07-mobile-game-landscape-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/08-mobile-gameover-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/09-mobile-gameover-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/10-mobile-rematch-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/11-mobile-rematch-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/12-desktop-game-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/mobile-rerun.mjs`
- `docs/impl/mobile-support/artifacts/rerun-20260312-6d384f0/touch-check.mjs`

## Remaining blockers
None. The previously reported phone-landscape viewport overflow blocker is no longer reproducible on the live build `6d384f0`.
