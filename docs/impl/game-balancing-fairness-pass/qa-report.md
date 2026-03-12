# QA Report — Game balancing / fairness pass

- Parent issue: #83
- PR: #87
- Branch: `feature/issue-83`
- Feature slug: `game-balancing-fairness-pass`
- Dev URL tested: http://20.106.185.110:8081/
- QA verdict: **PASS**
- QA date (UTC): 2026-03-12
- Deployed build verified: `v0.1.0+172d9a2` from `/build-info.json`

## Test approach
I used a mix of:
1. **Live deployment checks** against the dev URL (`curl` + socket-level smoke tests against the running server)
2. **Branch artifact review** (`spec.md`, `design.md`, `dev-notes.md`, `review-cycle-1.md`, `deploy-log.md`)
3. **Local regression test run** on branch `feature/issue-83` (`npm ci && npm test`)

## Acceptance criteria verdicts

| # | Acceptance criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Board size remains unchanged | PASS | Live socket smoke test returned `board: { width: 30, height: 30 }`. Unit test `createInitialMatchState` also asserts `{ width: 30, height: 30 }`. |
| 2 | Starting speed feels broadly the same as current build | PASS | Live smoke test showed `startingTickIntervalMs: 200`. Code/test evidence confirms the opening interval remains `200ms`, matching the prior baseline while only later tiers changed. |
| 3 | Speed ramps up more gently as food is eaten | PASS | `computeSpeedInterval()` is now `200 / 180 / 165 / 150 ms` at `0-2 / 3-5 / 6-8 / 9+` foods. Verified in `src/server/gameLogic.ts` and `src/server/__tests__/gameLogic.test.ts`. This is gentler than the prior `200 / 170 / 140 / 120 ms` schedule documented in the design/review artifacts. |
| 4 | Round starts feel fairer in terms of snake spawn and food placement | PASS | Live smoke test initial food was at `{ x: 15, y: 26 }` with snake-head Manhattan distances `[19, 18]` (delta `1`). Unit tests also verify initial food minimum distance `>= 4` and player-distance delta `<= 2`. Snake starts remain mirrored at the existing positions. |
| 5 | Countdown feels more dramatic without taking longer | PASS | Live smoke observed countdown sequence `3, 2, 1, 0`. Deployed assets include stronger countdown overlay pulse/glow and distinct `GO` styling/audio hooks (`/app.js`, `/styles.css`). Server countdown contract remains unchanged in room-service tests. |
| 6 | Result/rematch flow feels faster while still remaining understandable | PASS | Live rematch smoke test: rematch waiting state became available ~`19ms` after round end, and a new countdown (`3`) began ~`22ms` after round end once both players accepted. Deployed copy explicitly guides the player into rematch without extra delay. |
| 7 | Collision rules remain unchanged | PASS | Live smoke forced player 0 into the wall; server ended the round with `deathReasons: [{ slotIndex: 0, reason: "wall" }]`, which matches existing rule behavior. Code review and diff inspection show collision ordering in `advanceOneTick()` was preserved aside from spawn helper/speed-table use. |
| 8 | Overall game feels fairer and better paced than the current baseline | PASS | The shipped combination matches the spec intent: unchanged opening pace, softer acceleration, fairer first-food placement, more dramatic countdown presentation, and near-immediate rematch readiness. Live smoke plus unit coverage found no regressions in countdown/rematch lifecycle. |

## Detailed evidence

### Live deployment verification
- `curl http://20.106.185.110:8081/build-info.json` returned:
  - commit `172d9a2`
  - display version `v0.1.0+172d9a2`
- Deployed `index.html` includes the expected countdown/rematch UI.
- Deployed `app.js` includes updated gameplay copy, rematch readiness copy, countdown overlay handling, and stronger `GO` treatment.
- Deployed `styles.css` includes countdown pulse/glow styling and result/rematch emphasis styling.

### Live socket smoke results

#### Smoke run A — board/fairness/countdown/collision
- Room code: `WGRP`
- Starting board: `30 x 30`
- Starting tick interval: `200ms`
- Initial food: `{ x: 15, y: 26 }`
- Initial head distances to food: player 1 `19`, player 2 `18` (delta `1`)
- Countdown observed: `3 -> 2 -> 1 -> 0`
- Forced collision case: player 0 driven into top wall
- Result payload:
  - winner slot: `1`
  - death reason: `wall`

#### Smoke run B — rematch pacing
- Room code: `YCFK`
- Time from `game:ended` to rematch waiting state after first acceptance: ~`19ms`
- Time from `game:ended` to fresh `game:countdown` after second acceptance: ~`22ms`
- Observed rematch countdown restarted at `3`

### Automated regression suite
Ran locally on the branch after `npm ci`:
- `npm test`
- Result: **19 tests passed / 19 tests passed**

Covered areas include:
- gentler speed schedule
- preserved mirrored opening snake positions
- fair initial food filtering
- replacement-food anti-head-adjacency behavior
- unchanged room/countdown/rematch lifecycle coverage

## Defects / blockers
### Feature defects
- **None found** in this QA pass.

### Non-feature/tooling note
- The standard prepared QA checkout initially contained the wrong repository contents even though GitHub issue/PR lookups targeted `zonder/agents-snake-arena`. I worked around this by creating a clean clone of the correct repo before writing this report. This did **not** block feature validation, but it is worth checking the checkout automation separately.

## Final QA verdict
**PASS** — issue #83 is acceptable to move forward from QA based on deployed-build verification, live smoke coverage, and passing regression tests.
