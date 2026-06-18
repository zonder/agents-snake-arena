# Co-op Dungeon Mode Roadmap

## Goal
Ship co-op mode incrementally: start with a simple, playable cooperative loop, then layer in puzzles, hazards, monsters, and richer procedural generation.

## Implementation Principles
- Keep versus mode intact.
- Add co-op mode as a separate execution path where needed.
- Preserve server-authoritative rules.
- Prefer validated procedural generation over large random freedom.
- Ship a fun v1 before adding deep content.

## Task Breakdown

### Phase 0 — Foundation / design alignment
**Goal:** define the mode cleanly before implementation spreads through server/client code.

#### Tasks
1. Add shared mode/model definitions
   - add `gameMode` / `roomMode` contracts
   - distinguish versus state vs co-op state in shared payloads
2. Define co-op room lifecycle
   - create/join/start flow for co-op rooms
   - success/failure/run-complete states
3. Define co-op collision rules
   - decide how snake-to-snake body collision behaves in co-op v1
   - document exact failure conditions
4. Add spec docs and implementation notes

#### Deliverable
A stable state model for co-op mode before full gameplay implementation.

---

### Phase 1 — Simple Co-op Escape MVP
**Goal:** ship the first playable co-op version.

#### Scope
- dedicated co-op mode
- random room from small prefab/template pool
- static walls
- both players spawn in the room
- one exit tile
- win condition: both players reach exit
- no monsters
- no advanced puzzles
- optional: one simple hazard tile type only if low-risk

#### Tasks
1. Co-op room creation and start flow
2. Server co-op state and tick support
3. Level template system
4. Random room selection / spawn placement
5. Exit tile state and room-complete logic
6. Client rendering for walls, exit, and co-op status
7. Unit tests for generation validity and room completion
8. Basic E2E happy-path test

#### Success bar
Two players can play a random escape room together and clear it.

---

### Phase 2 — Puzzle Layer v1
**Goal:** make co-op feel truly cooperative rather than merely parallel.

#### Scope
- pressure plates / switches
- doors/gates
- simple simultaneous activation rooms
- small puzzle room archetype pool

#### Tasks
1. Add interactable tile/entity model
2. Add switch/door server rules
3. Add puzzle-completion checks
4. Add room prefabs requiring two-player coordination
5. Add client visualization for trigger state
6. Add tests for solvable puzzle generation and door logic

#### Success bar
At least some rooms require both players to coordinate, not just walk separately.

---

### Phase 3 — Survival Hazards
**Goal:** add tension and action to the co-op loop.

#### Scope
- timed danger tiles
- moving traps or sweep hazards
- simple hazard timing patterns
- room failure from environmental danger

#### Tasks
1. Add hazard entity/state model
2. Resolve hazards on the server tick
3. Add readable telegraphing / warning states on client
4. Add hazard-aware room generation constraints
5. Add tests for hazard movement and failure resolution

#### Success bar
Co-op rooms become tense and survival-oriented, not just navigational puzzles.

---

### Phase 4 — Monsters / Patrol Enemies
**Goal:** turn the dungeon into a living threat space.

#### Scope
- simple patrol enemies first
- later chase enemies
- deterministic movement patterns
- enemy-player collision outcomes

#### Tasks
1. Add monster entity model
2. Add deterministic AI movement rules
3. Add enemy-aware generation constraints
4. Add rendering and readable monster telegraphs
5. Add tests for monster pathing and collision outcomes

#### Success bar
Players must adapt to active non-player threats while solving rooms.

---

### Phase 5 — Procedural Run Depth
**Goal:** improve replayability and progression.

#### Scope
- multi-room runs
- escalating difficulty
- weighted room pools
- themed archetypes / biomes
- modifier system

#### Tasks
1. Add run progression state
2. Add difficulty scaling rules
3. Add weighted generation buckets
4. Add reward/modifier pacing
5. Add regression tests for run transitions and solvability

#### Success bar
Each run feels fresh, structured, and replayable.

---

## Recommended First Delivery Order
If we want the shortest path to something fun and testable, implement in this exact order:

1. Phase 0 — state/model foundation
2. Phase 1 — simple co-op escape MVP
3. Phase 2 — puzzle layer
4. Phase 3 — survival hazards
5. Phase 4 — monsters
6. Phase 5 — deeper procedural runs

## Suggested Initial Tickets

### Ticket A — Co-op mode foundation
- add room mode selection
- add co-op lifecycle/state contracts
- keep versus mode untouched

### Ticket B — Random escape room MVP
- random room template selection
- wall rendering
- spawn + exit generation
- both-players-at-exit win rule

### Ticket C — Co-op puzzle primitives
- switches / pressure plates
- doors / gates
- room archetypes that require both players

### Ticket D — Hazard rooms
- timed danger tiles
- moving trap lane
- fail-state resolution

### Ticket E — Patrol monsters
- deterministic patrol entity
- collision and path logic
- monster-aware generation

### Ticket F — Multi-room run progression
- sequential rooms
- difficulty ramp
- run complete / run fail states

## Recommended v1 Definition
For the first implementation, keep v1 deliberately narrow:
- one new co-op mode
- one room objective: both players reach exit
- a small pool of random wall layouts
- no monsters
- no complex puzzle logic yet
- success/failure fully server-authoritative

That is the smallest version likely to feel like a real new mode rather than a prototype stub.
