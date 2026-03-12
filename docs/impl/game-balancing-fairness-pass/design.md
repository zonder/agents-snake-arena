# Design: Game Balancing / Fairness Pass

## Overview
This pass tunes the existing realtime snake game so rounds feel fairer and better paced **without changing core rules**. The implementation should preserve the current 30x30 board, existing collision outcomes, current rematch architecture, and server-authoritative gameplay model. The changes are intentionally scoped to low-regression tuning in the already-established runtime:

- soften the speed ramp while keeping the opening speed close to today's feel
- make round-start snake placement and first food placement feel fairer
- make the 3-second countdown feel more dramatic without making it longer
- shorten result/rematch dead time so players get back into the next round faster
- preserve reconnect/mobile/rematch behavior already established by prior features

This is a **tuning-and-coordination** feature, not a gameplay rewrite.

## Goals
1. Improve perceived fairness in the first few seconds of each round.
2. Keep baseline control feel familiar for existing players.
3. Reduce "one lucky opening food" moments.
4. Preserve board readability while increasing countdown energy.
5. Tighten post-game pacing without making the result state confusing.
6. Minimize regression risk by reusing existing room/match/rematch plumbing.

## Non-goals
- No board size changes.
- No collision rule changes.
- No new gameplay entities, hazards, or modes.
- No client-authoritative balancing logic.
- No large refactor of the room lifecycle.

## Current baseline
Relevant current behavior in the branch:

- `src/server/gameLogic.ts`
  - deterministic snake spawns at fixed mirrored positions
  - fully random food selection from all empty cells
  - stepped speed schedule: `200 / 170 / 140 / 120 ms` at foods `0-2 / 3-5 / 6-8 / 9+`
- `src/server/roomService.ts`
  - authoritative `3 -> 2 -> 1 -> 0` countdown using timed events
  - rematch starts a fresh `MatchState` via `createInitialMatchState(roomCode)`
  - post-game state remains in-room and already supports rematch/reconnect
- `public/app.js`, `public/styles.css`, `public/index.html`
  - countdown overlay, board FX layer, rematch/result card + banner, and audio hooks already exist

That means this feature can be shipped as a **small set of server tuning helpers plus light UI timing/presentation adjustments**, rather than introducing new state machines.

## Architectural approach

### 1. Keep gameplay authority on the server
All fairness-sensitive behavior must remain server-authored:
- initial snake spawn variant selection
- initial/replacement food candidate filtering
- speed interval schedule
- countdown timing
- rematch/result pacing triggers

The client may present countdown/result pacing more dramatically, but it should not independently decide fairness outcomes.

### 2. Prefer constrained heuristics over heavy balancing systems
Use simple, explainable rules that can be tested:
- mirrored spawn presets instead of arbitrary spawn search
- minimum fairness constraints for food placement instead of complex simulation
- a revised stepped speed table instead of adaptive difficulty
- trimmed delays / faster CTA readiness rather than new post-game phases

### 3. Preserve existing data shapes where possible
This pass should avoid broad contract churn. Reuse the existing event family:
- `game:state`
- `game:countdown`
- `game:start`
- `game:ended`
- `game:rematch-state`

If additional metadata is needed for UI polish, keep it optional and additive.

## Design details

## A. Fairer round-start snake placement
Current snake spawns are already mirrored and deterministic, which is good for readability and testing. The fairness gap is not primarily snake-to-snake asymmetry; it is the interaction between those spawns and an unconstrained first food spawn.

### Decision
Keep the board size and mirrored two-snake start concept, but make spawn setup slightly more flexible:
- preserve symmetric starting positions
- preserve current opening directions (`right` for slot 0, `left` for slot 1)
- allow either:
  1. current horizontal mirrored preset as the default, or
  2. one of a **small fixed set of mirrored presets** if the implementation wants variety

Recommended preset set:
- horizontal center lane (current layout)
- one slightly above center
- one slightly below center

Constraints for every preset:
- same distance from center for both players
- same opening run-up distance to nearest wall
- no immediate overlap
- same starting body length and orientation pattern
- preserves current collision semantics

### Why this approach
- keeps fairness explainable
- avoids introducing complicated spawn search logic
- enables some round variety if desired without creating side bias
- remains easy to test with snapshot/unit tests

### Risk note
If implementation time is tight, it is acceptable to keep the **existing exact snake spawn positions unchanged** and focus the fairness work on food placement. That still satisfies the spec's fairness intent while minimizing regression risk.

## B. Fairer food placement
This is the most important gameplay change in the pass.

### Problem
Current `spawnFood(...)` picks uniformly from all empty cells. That can create obvious early-round advantage when the initial food appears substantially closer to one player than the other.

### Decision
Split food placement into two cases:
1. **initial round-start food spawn**
2. **mid-round replacement food spawn**

The first case gets stronger fairness rules than the second.

### Initial food fairness rule
For the very first food in a fresh round/rematch:
- generate candidate empty cells
- reject cells that are too close to either snake head
- reject cells where shortest-path Manhattan distance from head A vs head B differs by more than a small threshold
- reject cells that spawn directly on the dominant forward lane of one player while being materially farther from the other

Recommended thresholds:
- minimum Manhattan distance from each head: `>= 4`
- maximum head-distance delta between players: `<= 2`

If enough candidates remain:
- choose uniformly from the filtered set

Fallback order if the filtered set becomes too small:
1. relax the lane-bias rule
2. relax max delta from `2` to `3`
3. fall back to current all-empty-cell behavior as last resort

This ensures the algorithm never deadlocks and remains robust on crowded boards.

### Replacement food fairness rule
For non-initial food spawns during active play:
- continue selecting from empty cells
- add only a **light anti-spawn-camping filter**, not a strict equal-distance rule
- do not overcorrect so heavily that food feels artificially central or predictable

Recommended replacement rule:
- reject cells occupied by snakes, as today
- optionally reject cells adjacent to a living snake head when enough alternatives exist
- otherwise keep uniform randomness across remaining cells

### Why different rules for initial vs replacement food
Round-start fairness is highly visible and has the biggest perceived impact. Mid-round food should remain contested and dynamic; making it too symmetrical would reduce excitement and could feel scripted.

## C. Gentle speed-ramp tuning

### Problem
Current schedule jumps from `200ms` to `170ms` after only three foods, then to `140ms`, then `120ms`. The baseline is acceptable, but the escalation can feel too steep for a fairness/pacing pass.

### Decision
Keep the same server-owned stepped-schedule model, but make the ramp gentler while preserving the opening pace.

Recommended revised schedule:
- foods eaten `0-2`: `200ms`
- foods eaten `3-5`: `180ms`
- foods eaten `6-8`: `165ms`
- foods eaten `9+`: `150ms`

Properties:
- opening pace remains unchanged
- first acceleration is noticeably gentler
- upper-end speed still rises, but chaos is reduced
- schedule remains simple to document, test, and tune later

### Alternative acceptable schedule
If playtesting indicates the current late game needs a little more bite:
- `0-2: 200ms`
- `3-5: 180ms`
- `6-8: 160ms`
- `9+: 145ms`

### Guardrail
Do **not** change the trigger source for speed progression. It should still derive only from authoritative `foodsEaten`, so both players remain synchronized.

## D. Countdown feel improvements without longer duration
The spec requires a more dramatic countdown while keeping total duration unchanged.

### Decision
Reuse the existing 3-second countdown and overlay/audio architecture, but rebalance presentation timing:
- keep server countdown duration at exactly `3000ms`
- keep the visible steps `3`, `2`, `1`, `GO`
- intensify presentation through animation and styling, not extra waiting

Recommended client-side polish changes:
- stronger scale/glow on each countdown step
- slightly more pronounced board-frame accent while in `phase-countdown`
- keep per-step audio cues, with stronger contrast between `1` and `GO`
- ensure the countdown effect still fires exactly once per logical step

### Optional additive metadata
If the developer wants tighter animation sync, `game:countdown` already includes:
- `startsAt`
- `serverNow`

That should be preferred over inventing a new countdown timing contract.

### Regression rule
Countdown polish must not reintroduce board movement, duplicate FX, or reconnect/resume inconsistencies.

## E. Faster result/rematch pacing
This branch already supports same-room rematch flow. The tuning opportunity is pacing, not architecture.

### Decision
Shorten passive post-game dead time while preserving clarity.

Recommended changes:
- make rematch CTA feel immediately available on `game-over`
- reduce nonessential waiting between `game:ended` and a fresh rematch countdown
- when both players accept rematch, transition into the new countdown immediately using existing `requestRematch()` flow
- keep result copy readable for a short but sufficient window before players act

Practical guidance:
- do not add a forced cooldown before rematch acceptance
- avoid redundant intermediate status messages or animations that delay button readiness
- if any local visual linger exists after `game:ended`, cap it low enough that rematch still feels prompt

### Important constraint
Do not shorten pacing by skipping authoritative state broadcasts. The sequence should remain:
1. server finalizes round
2. clients receive result/final state
3. players may request rematch
4. server starts fresh countdown once both accepted

## F. Shared fairness helper layer
To keep code localized and regression risk down, add or refactor toward small helpers in `gameLogic.ts` rather than spreading balancing math through `roomService.ts`.

Recommended helper boundaries:

```ts
function getInitialSpawnPreset(random?: () => number): SpawnPreset
function createInitialSnakesFromPreset(preset: SpawnPreset): [SnakeState, SnakeState]
function spawnInitialFood(board, snakes, random?): GridPoint | null
function spawnReplacementFood(board, snakes, random?): GridPoint | null
function computeSpeedInterval(foodsEaten: number): number
```

Then keep one stable top-level initializer:

```ts
createInitialMatchState(roomCode, random?)
```

This preserves current call sites in `roomService.ts` and keeps rematch/reset behavior intact.

## Data model impact
No large model rewrite is needed.

### MatchState
Keep existing fields:
- `board`
- `snakes`
- `food`
- `foodsEaten`
- `tickIntervalMs`
- result/death metadata

Optional additive field if implementation wants test/debug visibility:

```ts
initialSpawnVariant?: 'horizontal-center' | 'horizontal-high' | 'horizontal-low';
```

This is not required for functionality.

## Event / lifecycle impact

### Unchanged lifecycle
- lobby ready-up
- countdown start/progression
- active tick loop
- game-over
- rematch acceptance
- fresh round creation
- reconnect reservation behavior

### Minimal event changes preferred
No new socket events are required for MVP.

If the developer finds it useful to expose pacing hints, keep them optional and non-authoritative, for example via extra fields on existing payloads rather than new events.

## Implementation plan
1. Refactor/create localized fairness helpers in `src/server/gameLogic.ts`.
2. Update `createInitialMatchState(...)` to use revised spawn + initial-food logic.
3. Update `advanceOneTick(...)` to use replacement-food helper without changing collision ordering.
4. Revise `computeSpeedInterval(...)` to the gentler schedule.
5. Apply small countdown/result/rematch presentation timing tweaks in `public/app.js` and `public/styles.css`.
6. Add/adjust tests for fairness heuristics and pacing regressions.

## Testing strategy

### Server unit tests
Add targeted tests for:
- board size remains `30x30`
- collision resolution remains unchanged
- initial snake spawn remains symmetric and valid
- initial food spawn respects fairness filters when candidate cells exist
- fallback behavior still returns a valid food cell
- replacement food spawn still never overlaps occupied cells
- revised speed schedule returns expected intervals
- rematch still recreates a fresh match state with the new initializer

### Room/service tests
Verify:
- countdown still emits `3 -> 2 -> 1 -> 0`
- rematch still starts immediately once both players accept
- reconnect paths are unaffected by the tuning pass

### Client regression checks
Verify:
- countdown FX still de-duplicate correctly
- board remains stable across countdown/result/rematch transitions
- rematch button becomes available promptly on `game-over`
- mobile layout remains board-first

## Risks and mitigations

### Risk 1: Food fairness feels scripted
**Mitigation:** apply strongest filtering only to the first food of a round; keep replacement food mostly random.

### Risk 2: Too-gentle speed makes rounds drag
**Mitigation:** preserve the exact starting speed and use a stepped schedule that still reaches a clearly faster late game.

### Risk 3: Countdown polish causes duplicate FX or layout jumps
**Mitigation:** reuse the existing de-duplicated overlay pipeline and avoid adding new DOM regions above the board.

### Risk 4: Fairness heuristics create hard-to-debug edge cases
**Mitigation:** use explicit threshold-based candidate filtering with deterministic fallback ordering.

### Risk 5: Rematch pacing tweaks regress reconnect/mobile behavior
**Mitigation:** do not change room phases or rematch contract semantics; adjust only timing/presentation around already-existing transitions.

## Guidance for the next agent
- Treat this as a **targeted tuning pass**, not a rewrite.
- Keep `roomService.ts` changes as small as possible.
- Concentrate gameplay fairness logic in `gameLogic.ts` helpers.
- Preserve board size, collision order, rematch semantics, and reconnect handling exactly as they are.
- If trade-offs appear, prioritize:
  1. fairness of the first food,
  2. keeping base speed familiar,
  3. avoiding regressions in rematch/mobile/reconnect flows.
