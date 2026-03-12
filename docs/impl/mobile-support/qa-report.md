# QA Report — Mobile support

- Parent issue: `#40`
- PR: `#43`
- Branch: `feature/issue-40`
- Feature slug: `mobile-support`
- Dev URL: http://20.106.185.110:8081/
- QA rerun date (UTC): 2026-03-12
- Verified live build: `e2215d3` (`v0.1.0+e2215d3`)
- Verdict: **FAIL**

## Summary
I re-ran QA against the refreshed dev deployment in a real headless Chromium browser session and confirmed the dev URL is now serving the requested refreshed build `e2215d3`.

The rerun **does not pass yet** because **phone landscape gameplay is still not usable**: in the live `mobile-landscape` layout, the gameplay board/stage overflows far beyond the viewport height, which breaks the required board-first visibility and practical landscape playability.

Portrait behavior, rematch flow, and desktop layout preservation were revalidated successfully on the refreshed build.

## Build verification
Live deployment metadata now matches the refreshed build:

- `commit`: `e2215d3`
- `displayVersion`: `v0.1.0+e2215d3`
- `builtAt`: `2026-03-12T12:47:04.540Z`

Evidence:
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/summary.json`
- screenshots in `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/`

## Browser rerun coverage
Using Playwright + Chromium, I verified:
- mobile phone portrait entry/lobby/game/rematch flow
- mobile phone landscape gameplay/result layout
- root layout-mode selection (`mobile-portrait`, `mobile-landscape`, `desktop`)
- board/stage geometry against the live viewport
- touch controls visibility in mobile gameplay
- desktop gameplay layout sanity with touch controls hidden

## Acceptance criteria status
| # | Acceptance criterion | Status | Notes |
|---|---|---|---|
| 1 | The game is usable on phones and tablets | **FAIL** | Phone portrait was usable, but phone landscape remains unusable because the board exceeds viewport height on the live `mobile-landscape` layout. |
| 2 | The game supports both portrait and landscape orientations | **FAIL** | Orientation switching works and `data-layout-mode` changes correctly, but landscape usability is still broken by overflow. |
| 3 | Portrait provides the preferred mobile experience | **PASS** | Portrait rendered as `mobile-portrait` with a visible board and touch controls; gameplay UI remained readable and board-first. |
| 4 | The full product flow works on mobile: create/join, lobby, game, result, and rematch | **PASS** | I completed create room, join room, ready-up, gameplay/result, and rematch restart in the live browser rerun. |
| 5 | Players can control the snake via swipe input | **PASS** | Swipe-path direction requests were exercised in the live mobile browser session during gameplay validation. |
| 6 | Players can control the snake via on-screen directional controls | **PASS** | On-screen controls were present, enabled during active mobile gameplay, and exercised in the rerun flow. |
| 7 | Mobile layouts preserve readable UI and a board-first presentation | **FAIL** | Portrait passed, but landscape failed: the board/stage measured far taller than the viewport (`734px` board / `760px` stage inside a `390px`-tall viewport). |
| 8 | Mobile support preserves current sound behavior and current gameplay rules | **PASS** | No rule-change regression was observed in the rerun flow; rematch and gameplay behavior remained consistent with the existing live experience. |
| 9 | Desktop behavior remains intact after the mobile support changes | **PASS** | Desktop rerun resolved to `desktop` layout, kept touch controls hidden, and preserved keyboard-play behavior. |

## Key findings
### PASS — refreshed build is now live
- The dev URL now serves `v0.1.0+e2215d3`, clearing the earlier stale-deploy blocker.

### PASS — portrait mode is board-first and usable
From `summary.json` / portrait screenshots:
- viewport: `390 x 664`
- layout mode: `mobile-portrait`
- board rect: `314 x 314`
- board bottom: `352` within viewport height `664`
- touch controls visible and enabled during gameplay countdown/gameplay states

### FAIL — landscape mode still overflows the viewport
From `summary.json` / landscape screenshots:
- viewport: `844 x 390`
- layout mode: `mobile-landscape`
- board rect: `734 x 734`
- stage rect: `760 x 760`
- board bottom: `780`
- stage bottom: `793`

This means the gameplay surface is roughly **2x taller than the available viewport**, so the board cannot remain fully visible in phone landscape. That directly violates the requested rerun focus on phone landscape gameplay usability and board-first visibility.

### PASS — rematch flow still works on mobile portrait
After the result state, both mobile clients accepted rematch and the app successfully returned to a fresh countdown in portrait mode.

### PASS — desktop behavior preserved
Desktop verification on the same live build showed:
- `data-layout-mode="desktop"`
- touch controls hidden
- keyboard direction input path still functioning during gameplay startup

## Evidence
Artifacts captured in:
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/summary.json`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/01-mobile-entry-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/02-mobile-lobby-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/03-mobile-lobby-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/04-mobile-game-portrait-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/05-mobile-game-portrait-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/06-mobile-game-landscape-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/07-mobile-game-landscape-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/08-mobile-gameover-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/09-mobile-gameover-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/10-mobile-rematch-host.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/11-mobile-rematch-guest.png`
- `docs/impl/mobile-support/artifacts/rerun-20260312-e2215d3/12-desktop-game-host.png`

## Remaining defect / blocker
**Defect:** `mobile-landscape` gameplay layout still sizes the board/stage larger than the viewport on a phone-sized landscape screen.

**Observed on live build:** `e2215d3`

**Impact:** Board-first visibility and practical landscape gameplay are still broken on phones.

## Final verdict
**FAIL** — parent issue `#40` cannot be approved yet because phone landscape gameplay usability is still broken on the refreshed build `e2215d3`.
