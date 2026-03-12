# API Contracts: Game Balancing / Fairness Pass

## Contract strategy
This feature should be implemented with **no required breaking socket API changes**. The fairness and pacing work primarily reuses existing authoritative payloads and adjusts server-side tuning plus client presentation behavior.

Preferred approach:
- keep all existing event names
- keep existing required fields intact
- only add optional metadata if the developer discovers a concrete UI need

## Existing events reused

### `game:state`
Current payload already carries the information needed for this pass:
- board dimensions
- snake positions/scores
- `foodsEaten`
- `tickIntervalMs`
- phase
- rematch snapshot

Contract expectations for this feature:
- `board.width` and `board.height` remain unchanged at `30`
- `tickIntervalMs` reflects the new gentler speed schedule
- initial and rematch rounds continue to publish valid authoritative starting state before movement
- no new collision result semantics are introduced

### `game:countdown`
Current payload already supports countdown polish:

```ts
interface GameCountdownPayload {
  roomCode: string;
  phase: 'starting';
  secondsRemaining: 3 | 2 | 1 | 0;
  startsAt: number;
  serverNow: number;
  version: number;
}
```

Contract expectations:
- total countdown duration remains the same as today
- visible values remain `3`, `2`, `1`, `0`
- countdown continues to be server-authored
- client may render more dramatic FX, but must not invent extra countdown steps

### `game:start`
No contract change required.

Expectation:
- emitted at active gameplay start as today
- `tickIntervalMs` should match the revised baseline speed

### `game:ended`
No contract change required.

Expectation:
- final state remains understandable and includes rematch/result context as today
- post-game pacing may feel faster, but the result event sequence remains authoritative and intact

### `game:rematch-state`
No contract change required.

Expectation:
- rematch remains available immediately on `game-over` when both players are eligible
- both-player acceptance still transitions directly into a fresh countdown
- faster pacing must not skip this state or make it inconsistent with `game:state`

## Server-side behavioral contracts

## 1. Board and collision invariants
These are explicit non-regression contracts for the developer:

- board size remains `30x30`
- snake length still starts at `3`
- opening directions remain valid and symmetric
- wall, self, head-to-body, head-to-head, and cross-over collision semantics stay unchanged
- rematch still creates a fresh round state

## 2. Speed schedule contract
`computeSpeedInterval(foodsEaten)` remains the single source of truth for round speed.

Recommended contract table:

| Foods eaten | Tick interval |
|---|---:|
| 0-2 | 200ms |
| 3-5 | 180ms |
| 6-8 | 165ms |
| 9+ | 150ms |

Rules:
- baseline speed stays broadly aligned with current feel
- progression remains monotonic (never slows back down mid-round)
- both players always observe the same authoritative interval for the room

## 3. Initial spawn fairness contract
The first round-state snapshot of any fresh round or rematch must satisfy:
- both snakes occupy valid non-overlapping cells
- both snakes are placed symmetrically/fairly relative to the board
- first food is on an unoccupied cell
- first food is selected using the fairness filter when possible

Recommended initial-food fairness constraints:
- minimum distance from each head: `>= 4`
- distance delta between players: `<= 2` when feasible
- deterministic fallback to looser constraints, then general empty-cell selection

This is an implementation contract, not a required wire-field addition.

## 4. Replacement food contract
For non-initial food spawns:
- food must always land on an unoccupied valid cell
- implementation may apply light anti-head-adjacency filtering when feasible
- replacement food must still feel meaningfully random

## Optional additive metadata
Only add these if the developer finds a concrete client/testing need.

### Option A: round-start fairness metadata

```ts
interface GameStatePayload {
  // existing fields...
  fairness?: {
    initialSpawnVariant?: 'horizontal-center' | 'horizontal-high' | 'horizontal-low';
    foodSpawnType?: 'initial' | 'replacement';
  };
}
```

Use cases:
- easier QA/debugging
- telemetry/playtest logging

This metadata should remain optional and non-authoritative for gameplay decisions.

### Option B: presentation pacing hints
Only if needed for UI polish:

```ts
interface GameEndedPayload {
  // existing fields...
  uiHints?: {
    rematchPromptReadyAt?: number;
  };
}
```

However, this is likely unnecessary because the client can already react immediately to `game-over` plus rematch availability.

## Client derivation rules

### Countdown UI
Client should derive countdown presentation from:
- `game:countdown.secondsRemaining`
- `game:state.countdownSecondsRemaining`
- existing `startsAt/serverNow` timing data

Rules:
- trigger dramatic visual/audio polish only on value transitions
- do not extend visible countdown beyond server timing
- preserve reduced-motion handling

### Result/rematch pacing UI
Client should derive faster pacing from existing authoritative state:
- `phase === 'game-over'`
- rematch view availability/status
- `game:ended`
- `game:rematch-state`

Rules:
- make CTA actionable as soon as rematch is available
- do not wait for client-only cooldowns
- do not assume room closure follows every result state

## Backward compatibility
This pass should remain backward-compatible with the current branch structure:
- older consumers of existing payload shapes continue to work
- no event renames
- no required field removals or type narrowing

## Test matrix for contracts

### Must-pass contract checks
1. `game:state.board` remains `30x30`.
2. `game:countdown` still emits `3 -> 2 -> 1 -> 0`.
3. `game:start.tickIntervalMs` matches the revised baseline.
4. Post-food `game:state.tickIntervalMs` reflects the gentler ramp.
5. `game:ended` still carries final state/result without collision-rule changes.
6. `game:rematch-state` remains consistent with `game:state.rematch`.
7. Rematch still starts a fresh countdown with a fresh initial food spawn.

## Implementation guidance for the developer
- Avoid API churn unless you hit a real UI gap.
- Prefer invisible server-side behavior changes over new payload fields.
- If you add metadata, make it optional and debug-oriented.
- Preserve contract consistency across duplicated rematch/state payloads for the same room version.
