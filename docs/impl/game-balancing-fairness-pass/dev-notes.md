# Dev Notes: Game Balancing / Fairness Pass

## Implementation summary
- Kept the board at `30x30` and left collision resolution unchanged.
- Updated the authoritative speed schedule in `src/server/gameLogic.ts` to `200 / 180 / 165 / 150 ms` for food totals `0-2 / 3-5 / 6-8 / 9+`.
- Kept the existing mirrored opening snake spawn positions to avoid lifecycle/regression risk and focused the fairness pass on initial food placement.
- Split food spawning into two fairness modes:
  - **Initial round/rematch food** uses stronger filtering for minimum distance, player-distance delta, and forward-lane bias before falling back safely.
  - **Replacement food** keeps random behavior but avoids spawning immediately adjacent to a live head when alternatives exist.
- Reused the existing countdown/rematch event flow and limited client changes to presentation polish:
  - stronger countdown glow/pulse, including a more distinct `GO`
  - copy updates that make rematch readiness feel immediate at game end

## Deviations from architecture guidance
- No server changes were needed in `src/server/roomService.ts`; the existing rematch lifecycle already transitions immediately once both players accept.
- The original plan left room for small mirrored spawn variants, but implementation intentionally kept the current exact snake spawn positions after verification showed that this was the lowest-risk way to preserve the existing rematch/gameplay timing expectations while still meeting the fairness goal through initial food tuning.
- Because the branch already exposes rematch availability without extra delay, the “faster rematch” work was handled through immediate-result messaging/presentation rather than new timers or payload fields.

## Test coverage
- Added focused unit tests for:
  - revised speed schedule
  - preserved opening snake symmetry/positions
  - initial food fairness filtering
  - replacement food anti-head-adjacency filtering
