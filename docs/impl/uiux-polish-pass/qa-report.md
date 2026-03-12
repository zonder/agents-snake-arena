# QA Report — UI/UX polish pass

- Parent issue: #25
- PR: #28
- Branch: `feature/issue-25`
- Feature slug: `uiux-polish-pass`
- Dev URL: http://20.106.185.110:8081/
- QA date (UTC): 2026-03-12
- Verdict: **FAIL / BLOCKED**

## Summary
I attempted the requested QA rerun for the board-displacement fix on the deployed dev environment.

The blocker is now **deployment state**, not browser tooling: the dev URL is still serving build `e431101`, while PR #28 / branch `feature/issue-25` now points to fix commit `7273531` (`Fix post-game banner board displacement`). Because the requested fix is not yet live on the target dev environment, I cannot honestly verify whether the board now remains stable across countdown, in-progress, game-over, and rematch states.

As a result, this rerun is **FAIL / BLOCKED pending updated dev deploy**.

## What I verified
- QA checkout is synced to `feature/issue-25` head commit `7273531`.
- PR #28 head is `7273531`.
- The deployed dev environment at `http://20.106.185.110:8081/` reports build `v0.1.0+e431101` via `/build-info.json`.
- Therefore the dev deployment is behind the branch head and does **not** include the requested board-displacement fix.

## Evidence committed
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-2-build-info.json`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-2-pr-head.json`
- `docs/impl/uiux-polish-pass/qa-artifacts/rerun-2-blocker.md`

## Acceptance criteria status for this rerun

| # | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clean retro arcade visual style across lobby, gameplay, result, and rematch screens | **Not re-verified** | Blocked because dev is not on the requested post-fix build. Prior evidence exists in earlier QA artifacts, but this rerun was specifically for the fix validation. |
| 2 | Lobby/create/join flow feels visibly more polished than baseline | **Not re-verified** | Same blocker. |
| 3 | Countdown presentation is more prominent and more playful | **Not re-verified** | Same blocker. |
| 4 | Scoreboard/player panels are more polished and readable | **Not re-verified** | Same blocker. |
| 5 | Noticeable but tasteful visual juice such as glow, pulse, collision flash, and win-state feedback | **Not re-verified** | Same blocker. |
| 6 | Rematch/result flow feels more inviting and polished | **Not re-verified** | Same blocker. |
| 7 | Basic sound effects are present and enabled by default | **Not re-verified** | Same blocker. |
| 8 | Board-first layout preserved and no viewport jumping | **Blocked** | Cannot verify on the requested fixed build because dev is still serving `e431101`, not `7273531`. |
| 9 | Overall experience feels smoother and more fun while preserving gameplay behavior | **Not re-verified** | Same blocker. |

## Exact blocker
The dev deployment requested for QA rerun is stale:
- Expected fix commit on branch/PR head: `7273531`
- Actual deployed build marker at dev URL: `e431101`

Until the dev environment is redeployed with commit `7273531` (or later), browser-based QA against the provided URL cannot validate the fix.

## Recommendation
Redeploy `feature/issue-25` to the dev URL so `/build-info.json` reports commit `7273531` (or a newer descendant that includes the same fix), then re-run the browser QA flow using the existing QA harness/artifact approach.
