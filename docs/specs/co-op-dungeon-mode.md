# Feature Spec: Co-op Dungeon Mode

## Status
Draft for stakeholder approval

## Feature Summary
As two players, we want a cooperative survival / dungeon / puzzle mode with random levels so that playing together feels more strategic, varied, and replayable than pure versus matches.

## Scope
In scope for this feature family:
- a separate **co-op mode** alongside the existing versus mode
- exactly 2 players cooperating in the same room
- server-authoritative dungeon state and movement resolution
- random level generation from reusable room/puzzle/hazard building blocks
- level goals beyond simple score chasing
- environmental obstacles, hazards, and puzzle interactions
- multi-level runs where both players must survive and progress together
- a phased implementation path starting from a simple MVP and expanding over time

Out of scope for the initial versions:
- 3+ players
- persistent progression / unlock trees
- account-based save files
- matchmaking beyond room codes
- complex enemy combat systems with projectiles in v1
- user-created maps/editor
- advanced procedural narrative / quests

## Product Direction
The game will keep **Versus Mode** as the fast competitive mode.

This feature adds a second major mode:
- **Co-op Dungeon Mode** = two players versus the map, hazards, timing, and later monsters

The co-op mode should feel like:
- short runs
- random layouts
- shared problem solving
- high replay value
- easy-to-understand goals

## Stakeholder Decisions Captured
- Versus mode stays.
- A new cooperative mode should be added.
- Co-op mode should combine **survival + dungeon + puzzle** ideas.
- Levels should be **randomized each run**.
- We should start with a **simple version first** and grow it incrementally.
- The feature should be broken into multiple implementation tasks/phases rather than attempted as one large delivery.

## Core Design Goals
1. Make playing with another person feel meaningfully cooperative.
2. Create replayability through procedural/randomized levels.
3. Preserve the current server-authoritative architecture.
4. Avoid excessive complexity in the first version.
5. Add mechanics in layers: navigation -> puzzle coordination -> hazards -> monsters -> richer generation.

## High-Level Mode Concept
Two snakes enter a randomly generated dungeon room/level.

They must:
- navigate walls and obstacles
- survive hazards
- solve simple coordination puzzles
- unlock or reach the exit together

Failure conditions may include:
- one or both players dying to hazards/monsters
- failing a room-specific cooperative objective

Success conditions may include:
- both players reaching the exit
- all required keys/switches collected/activated
- surviving a short hazard section

## Assumptions
- The server remains the source of truth for room state, level state, hazards, and outcomes.
- Both players still control snakes via the same direction-input model.
- A co-op room still uses the existing room-code based multiplayer flow.
- The initial dungeon mode should prioritize readability over feature density.
- Random levels should be generated from constrained templates/tiles, not from fully unconstrained procedural simulation.

## User Scenarios

### Scenario 1: Start a co-op run together
**As two players**, we want to enter a cooperative run in the same room so we can tackle a shared challenge.

#### Expected behavior
- A room can be created specifically in co-op mode.
- Both players join and become teammates rather than opponents.
- The run starts after both are ready.

### Scenario 2: Solve a simple room together
**As players**, we want the room objective to require cooperation so that we actually need each other.

#### Expected behavior
- Some rooms require both players to participate.
- Example requirements may include: standing on two switches, escorting a payload area, or both reaching an exit.
- One player alone should not be able to trivially complete rooms designed for co-op.

### Scenario 3: Replay random layouts
**As players**, we want runs to feel different each time so the mode stays fresh.

#### Expected behavior
- Level layouts vary between runs.
- Hazard placement and puzzle combinations vary within controlled rules.
- Runs are recognizable and fair, not chaotic or unreadable.

### Scenario 4: Survive environmental danger
**As players**, we want to avoid hazards and later monsters so the mode feels tense and active.

#### Expected behavior
- The map may contain danger tiles, timed gates, moving hazards, or monsters in later phases.
- The server authoritatively resolves deaths and room failure.
- Hazards are visually clear.

### Scenario 5: Progress through a short run
**As players**, we want to clear several connected rooms or stages so the mode feels like an adventure rather than a single gimmick.

#### Expected behavior
- A run consists of one or more sequential rooms.
- Completing one room loads the next room state.
- Failure ends or resets the run according to implementation rules.

## Functional Requirements

### Mode selection and room flow
1. The system must support a dedicated co-op dungeon mode distinct from versus mode.
2. A room created for co-op mode must preserve that mode for both players.
3. Both players must be treated as teammates rather than win/loss opponents.
4. The run must start only when the required players are connected and ready.

### Dungeon state model
5. The system must represent dungeon-specific state under server authority.
6. Dungeon state must support level geometry, objectives, and hazard entities.
7. The server must broadcast canonical co-op state snapshots to both clients.
8. The client must remain a thin input/render layer over the authoritative co-op state.

### Procedural/random generation
9. Each run must generate randomized levels or rooms.
10. Random generation must follow fairness/readability constraints.
11. The system must ensure both players have valid spawn points.
12. The system must ensure the room objective is solvable under generation rules.
13. The system must ensure the exit/objective is reachable under generation constraints.
14. Generation should be built from controlled templates, prefabs, or tile rules rather than fully arbitrary layouts in early phases.

### Co-op objective rules
15. The mode must define a room objective beyond classic versus scoring.
16. Early versions may use a simple goal such as both players reaching the exit.
17. Later versions may add keys, switches, timed doors, and room-specific puzzle objectives.
18. A room should only complete when its defined success condition is satisfied.

### Hazard and survival rules
19. The system must support non-player hazards in co-op mode.
20. Early hazards may include static walls, spikes, timed blockers, or danger tiles.
21. Later phases may add monsters/patrol enemies.
22. Hazard behavior must be resolved by the server tick loop.
23. Hazard interactions must be visually understandable to players.

### Multi-room progression
24. A co-op run may contain multiple sequential rooms.
25. Completing a room must transition players to the next room state.
26. The system must preserve run progress within the current in-memory session.
27. A completed run must emit a clear success state.
28. A failed run must emit a clear failure state.

### Input and movement
29. Players must continue using direction-based snake controls.
30. Existing server-side movement validation principles must still apply.
31. The system must define whether snakes can collide with each other in co-op mode, and if so how.
32. The initial implementation should prefer simple and readable collision rules over highly nuanced exceptions.

### Puzzle interactions
33. The system must support interactable tiles or triggers in later phases.
34. Example interactions may include switches, doors, keys, pressure plates, and simultaneous activation zones.
35. Puzzle logic must remain server-authoritative.
36. Puzzle state must be included in shared game state payloads.

## Recommended MVP Strategy
The feature should not start with monsters, advanced AI, and deep procedural generation all at once.

Recommended rollout:

### Co-op v1: Simple Escape Rooms
- random room layout from a constrained set of templates/prefabs
- static walls
- one clear goal: **both players reach the exit**
- optional simple hazard tiles
- no monsters yet
- no complex keys/switches yet

### Co-op v2: Light Puzzle Rooms
Add:
- pressure plates / switches
- doors/gates
- simple two-player coordination requirements
- small pool of room archetypes mixed randomly

### Co-op v3: Survival Hazards
Add:
- moving traps
- timed danger zones
- chase pressure from the environment
- fail states with stronger tension

### Co-op v4: Monsters / Patrol Enemies
Add:
- simple AI patrol enemies
- later chase enemies
- monster-aware room generation rules

### Co-op v5: Rich Procedural Runs
Add:
- multi-room runs with escalating difficulty
- room pools by biome/theme
- weighted generation rules
- risk/reward pickups and advanced modifiers

## Design Constraints for Random Generation
Random generation must be **structured**, not arbitrary.

Recommended generation constraints:
- use room archetypes (corridor, arena, split-path, dual-switch room, hazard hall)
- use validated spawn/exit positions
- preserve path connectivity
- avoid impossible traps on spawn
- keep visual density readable
- cap simultaneous mechanics in early versions

## Initial Rule Recommendation
For the first version, use these rules:
- both snakes are on the same team
- static walls block movement
- player-vs-player body collision is either disabled or softened for readability in co-op v1
- success = both players reach the exit tile
- failure = a player dies to wall/hazard or room becomes unwinnable
- room transitions happen automatically after success

## Non-Functional Requirements
- Co-op mode must preserve server-authoritative correctness.
- The procedural generation must favor fairness and solvability over surprise.
- The mode must remain readable on the existing web client.
- Early versions must minimize new code paths that radically complicate the tick loop.
- The architecture should allow later addition of monsters and richer puzzle state without rewriting the entire room model.

## Edge Cases
- Random generation produces blocked or unsolvable rooms.
- One player reaches the exit while the other is still navigating.
- One player disconnects mid-room.
- Both players occupy or attempt to enter the same tight tile area.
- A puzzle trigger is activated and deactivated on the same tick.
- Hazard movement and player movement resolve simultaneously.
- Run progression must not leak stale room state into the next generated room.

## Acceptance Criteria
1. The game supports a dedicated co-op dungeon mode alongside versus mode.
2. Two players can enter the same co-op room and start a run together.
3. A run generates a randomized room or sequence of rooms.
4. The generated room objective is understandable and solvable.
5. Both players must cooperate to complete the room objective.
6. The server remains authoritative for room generation, hazards, progression, and outcomes.
7. Early versions remain simple enough to ship incrementally.
8. The implementation plan is split into phases rather than one large all-at-once change.

## Open Notes for Implementation
- Prefer a dedicated co-op room/match state model rather than overloading versus logic with too many special cases.
- Keep the first room archetypes small and easy to debug.
- Add content breadth only after the generation validity checks are reliable.
- The first shipped version should prove the co-op loop, not maximize mechanic count.
