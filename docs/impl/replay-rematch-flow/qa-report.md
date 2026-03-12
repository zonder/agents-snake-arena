# QA Report: Replay / Rematch Flow

## Summary
- Parent issue: #13
- PR: #16
- Branch: `feature/issue-13`
- Feature slug: `replay-rematch-flow`
- Environment: dev (`http://20.106.185.110:8081/`)
- QA verdict: **PASS**
- QA date (UTC): 2026-03-12

## Test approach
1. Read the approved spec plus implementation artifacts in `docs/impl/replay-rematch-flow/`.
2. Ran targeted source-level regression coverage: `npm test -- src/server/__tests__/roomService.test.ts`.
3. Ran live two-client Socket.IO checks against the deployed dev URL to verify same-room rematch behavior and post-game leave behavior.
4. Inspected deployed `app.js` for the rematch CTA copy introduced by the follow-up visibility fix.

## Evidence summary
- Source-level regression suite passed: `9/9` tests in `src/server/__tests__/roomService.test.ts`.
- Live same-room rematch run used room code `IORJ`.
- Live post-game leave run used room code `NFYA`.
- Deployed client bundle contains the post-game CTA strings:
  - `Accept rematch now`
  - `Waiting for other player`
  - `Your opponent wants a rematch. Accept to restart in the same room.`
  - `Rematch starting…`

## Acceptance criteria matrix

| # | Acceptance criterion | Result | Evidence |
|---|---|---|---|
| 1 | After game over, both players can see and use a rematch option. | PASS | Live run `IORJ`: both clients received `game:ended` with `finalState.rematch.available=true`, `status=idle`, and `teardownAt=null`. Deployed `app.js` includes the visible CTA strings `Accept rematch now` and `Your opponent wants a rematch. Accept to restart in the same room.` |
| 2 | The round restarts only after both players accept rematch. | PASS | In `IORJ`, after player A requested rematch, both clients stayed in `phase=game-over` with `rematch.status=waiting`. Only after player B requested rematch did both clients transition to `phase=starting` for the rematch. |
| 3 | If only one player accepts, the UI clearly shows that it is waiting for the other player. | PASS | In `IORJ`, player A saw `requestedByYou=true`, `waitingForOtherPlayer=true`, `status=waiting`; player B saw the same authoritative room state with `requestedByYou=false`. The deployed client bundle contains `Waiting for other player` and opponent-prompt copy. |
| 4 | The rematch happens in the same room with the same room code. | PASS | In `IORJ`, the initial round, post-game state, and rematch countdown all kept `roomCode="IORJ"` for both clients. |
| 5 | Starting a rematch resets scores to 0. | PASS | In `IORJ`, rematch `game:state` at `phase=starting` showed `snakes[0].score=0` and `snakes[1].score=0`. |
| 6 | Starting a rematch resets snakes, food, speed, and other round state. | PASS | In `IORJ`, rematch `game:state` showed `tickNumber=0`, `foodsEaten=0`, `tickIntervalMs=200`, fresh food at `{x:24,y:27}`, and reset snake bodies to the documented starting positions (`[{7,15},{6,15},{5,15}]` and `[{22,15},{23,15},{24,15}]`). |
| 7 | Starting a rematch shows a fresh countdown before movement begins. | PASS | In `IORJ`, countdown history showed the initial round countdown and then a fresh rematch countdown; the rematch transition emitted `game:countdown` again with `secondsRemaining=3` and `phase=starting`. |
| 8 | Rematch does not require going back through the separate ready-state flow. | PASS | In `IORJ`, once both rematch requests were in, the room moved directly from `game-over` to `starting`. No additional `player:ready:set` actions were needed. |
| 9 | If one player leaves after game over, the room remains open. | PASS | In `NFYA`, after player A requested rematch and player B disconnected during post-game waiting, player A received `player:left`, `lobby:state.phase=waiting-for-players`, the same `roomCode="NFYA"`, and `roomClosedEvents=0`. |
| 10 | No special rematch timeout interrupts the waiting state. | PASS | In `IORJ`, after one rematch acceptance, the room remained in `phase=game-over` with `status=waiting` after an additional 4.5 seconds; no timeout-driven reset or room closure occurred. |

## Additional verification notes
- `game:ended.teardownAt` was `null` in the live `IORJ` run, matching the intended “do not force-close after normal game over” behavior.
- The post-game leave scenario in `NFYA` also cleared stale rematch state correctly: `rematch.available=false`, both `requestedBySlot` flags reset to `false`, and `eligiblePlayerCount=1`.
- The targeted Vitest coverage includes regression cases for:
  - one-player rematch waiting state
  - duplicate rematch requests being a no-op
  - viewer-consistent rematch payloads across event types
  - rematch reset semantics
  - post-game leave keeping the room open
  - replacement join returning to normal lobby flow

## Defects / blockers
- None found during QA.

## Commands / checks run
```bash
cd /home/rootagent/openclaw-startup-factory/openclaw/state/checkouts/qa/current
npm ci
npm test -- src/server/__tests__/roomService.test.ts
curl -fsSL http://20.106.185.110:8081/app.js | rg "Accept rematch now|Waiting for other player|Your opponent wants a rematch|Rematch starting"
node /tmp/qa13-live/live-rematch-check.mjs
node /tmp/qa13-live/live-postgame-leave-check.mjs
```

## Final verdict
**PASS** — the dev deployment satisfies the approved replay / rematch acceptance criteria for issue #13.
