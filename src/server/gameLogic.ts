export type Direction = 'up' | 'down' | 'left' | 'right';
export type DeathReason = 'wall' | 'self' | 'head-to-head' | 'head-to-body' | 'cross-over' | 'disconnect' | 'hazard' | 'monster';
export type MatchStatus = 'countdown' | 'active' | 'ended';
export type RoundResultKey = 'player-0-win' | 'player-1-win' | 'draw' | 'co-op-win' | 'co-op-fail';
export type RoomMode = 'versus' | 'solo' | 'co-op';

export interface GridPoint {
  x: number;
  y: number;
}

export interface SnakeState {
  slotIndex: 0 | 1;
  direction: Direction;
  pendingDirection: Direction | null;
  body: GridPoint[];
  alive: boolean;
  score: number;
}

export type SwitchActivationType = 'hold' | 'toggle';

export interface PuzzleSwitch {
  id: string;
  position: GridPoint;
  activationType: SwitchActivationType;
  active: boolean;
}

export interface PuzzleDoor {
  id: string;
  position: GridPoint;
  open: boolean;
  requiresSwitches: string[];
}

/* --- Hazard definitions (templates) --- */

export interface HazardZoneDef {
  id: string;
  type: 'zone';
  position: GridPoint;
  warningTicks: number;
  activeTicks: number;
  cooldownTicks: number;
}

export interface HazardSweepDef {
  id: string;
  type: 'sweep';
  /** Ordered waypoints. Sweeper moves one step per tick, loops at end. */
  path: GridPoint[];
  /** Ticks the sweeper stays active at each waypoint. */
  activeTicks: number;
  /** Ticks of warning before each active burst. */
  warningTicks: number;
}

export type HazardDef = HazardZoneDef | HazardSweepDef;

/* --- Hazard runtime state --- */

export type HazardPhase = 'warning' | 'active' | 'cooldown';

export interface HazardZoneState {
  id: string;
  type: 'zone';
  position: GridPoint;
  phase: HazardPhase;
  ticksInPhase: number;
  warningTicks: number;
  activeTicks: number;
  cooldownTicks: number;
}

export interface HazardSweepState {
  id: string;
  type: 'sweep';
  /** Current position in the path array. */
  pathIndex: number;
  path: GridPoint[];
  phase: HazardPhase;
  ticksInPhase: number;
  warningTicks: number;
  activeTicks: number;
}

export type HazardState = HazardZoneState | HazardSweepState;

export function isHazardLethal(hazard: HazardState): boolean {
  return hazard.phase === 'active';
}

export function getHazardPosition(hazard: HazardState): GridPoint {
  if (hazard.type === 'zone') return hazard.position;
  return hazard.path[hazard.pathIndex];
}

/* --- Patrol monster definitions (templates) --- */

export interface PatrolMonsterDef {
  id: string;
  /** Ordered waypoints. Monster bounces back and forth along the path, one step per tick. */
  path: GridPoint[];
}

/* --- Patrol monster runtime state --- */

export interface PatrolMonsterState {
  id: string;
  path: GridPoint[];
  /** Current index into path array. */
  pathIndex: number;
  /** Current movement direction: 1 = forward (toward end), -1 = backward (toward start). */
  direction: 1 | -1;
}

export function getMonsterPosition(monster: PatrolMonsterState): GridPoint {
  return monster.path[monster.pathIndex];
}

/** Advance patrol monster by one tick. Mutates in-place. Bounces at path endpoints. */
export function advanceMonsterTick(monster: PatrolMonsterState): void {
  let next = monster.pathIndex + monster.direction;
  if (next >= monster.path.length) {
    monster.direction = -1;
    next = monster.pathIndex - 1;
  } else if (next < 0) {
    monster.direction = 1;
    next = monster.pathIndex + 1;
  }
  monster.pathIndex = next;
}

export interface CoOpLayoutTemplate {
  layoutId: string;
  walls: GridPoint[];
  exit: GridPoint;
  snakes: [Pick<SnakeState, 'slotIndex' | 'direction' | 'body'>, Pick<SnakeState, 'slotIndex' | 'direction' | 'body'>];
  switches?: PuzzleSwitch[];
  doors?: PuzzleDoor[];
  hazards?: HazardDef[];
  monsters?: PatrolMonsterDef[];
  /** Difficulty tier this layout belongs to. */
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CoOpObjectiveState {
  layoutId: string;
  objective: 'both-reach-exit';
  exit: GridPoint;
  walls: GridPoint[];
  playersAtExit: { 0: boolean; 1: boolean };
  switches: PuzzleSwitch[];
  doors: PuzzleDoor[];
  hazards: HazardState[];
  monsters: PatrolMonsterState[];
}

export interface MatchState {
  roomCode: string;
  roomMode: RoomMode;
  board: { width: 30; height: 30 };
  tickNumber: number;
  status: MatchStatus;
  snakes: [SnakeState, SnakeState];
  food: GridPoint | null;
  foodsEaten: number;
  tickIntervalMs: number;
  startedAt: number | null;
  endedAt: number | null;
  result: RoundResultKey | null;
  deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  winnerSlotIndex: 0 | 1 | null;
  soloMode: boolean;
  coOp: CoOpObjectiveState | null;
  run: RunProgressionState | null;
}

/** Tracks multi-room run progression within a co-op session. */
export interface RunProgressionState {
  /** 1-indexed room number the players are currently in. */
  currentRoom: number;
  /** Total number of rooms in this run. */
  totalRooms: number;
  /** Number of rooms successfully cleared so far. */
  roomsCleared: number;
  /** Current difficulty tier: 'easy' | 'medium' | 'hard'. */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Layout IDs already used in this run (to avoid repeats). */
  usedLayouts: string[];
}

const BOARD = { width: 30, height: 30 } as const;
const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const CO_OP_LAYOUT_TEMPLATES: readonly CoOpLayoutTemplate[] = [
  {
    layoutId: 'crossroads-open',
    difficulty: 'easy',
    walls: [
      ...verticalLine(9, 4, 10),
      ...verticalLine(9, 14, 21),
      ...verticalLine(20, 8, 15),
      ...horizontalLine(11, 12, 17),
      ...horizontalLine(13, 22, 24),
    ],
    exit: { x: 26, y: 25 },
    snakes: [
      { slotIndex: 0, direction: 'right', body: [{ x: 3, y: 6 }, { x: 2, y: 6 }, { x: 1, y: 6 }] },
      { slotIndex: 1, direction: 'down', body: [{ x: 24, y: 4 }, { x: 24, y: 3 }, { x: 24, y: 2 }] },
    ],
  },
  {
    layoutId: 'double-corridor-open',
    difficulty: 'easy',
    walls: [
      ...horizontalLine(6, 9, 12),
      ...horizontalLine(17, 9, 23),
      ...horizontalLine(6, 19, 12),
      ...horizontalLine(17, 19, 23),
      ...verticalLine(14, 5, 11),
      ...verticalLine(14, 17, 24),
      ...verticalLine(20, 11, 17),
    ],
    exit: { x: 27, y: 23 },
    snakes: [
      { slotIndex: 0, direction: 'right', body: [{ x: 2, y: 13 }, { x: 1, y: 13 }, { x: 0, y: 13 }] },
      { slotIndex: 1, direction: 'left', body: [{ x: 27, y: 13 }, { x: 28, y: 13 }, { x: 29, y: 13 }] },
    ],
  },
  {
    layoutId: 'split-pillars-open',
    difficulty: 'easy',
    walls: [
      ...rectangleOutline(8, 8, 4, 6),
      ...rectangleOutline(18, 8, 4, 6),
      ...rectangleOutline(8, 18, 4, 4),
      ...rectangleOutline(18, 18, 4, 4),
      ...horizontalLine(12, 15, 17),
    ],
    exit: { x: 14, y: 27 },
    snakes: [
      { slotIndex: 0, direction: 'right', body: [{ x: 3, y: 15 }, { x: 2, y: 15 }, { x: 1, y: 15 }] },
      { slotIndex: 1, direction: 'left', body: [{ x: 26, y: 15 }, { x: 27, y: 15 }, { x: 28, y: 15 }] },
    ],
  },
  {
    layoutId: 'dual-switch-gate',
    difficulty: 'medium',
    walls: [
      ...horizontalLine(0, 12, 14),
      ...horizontalLine(16, 12, 29),
      ...verticalLine(8, 2, 8),
      ...verticalLine(21, 2, 8),
    ],
    exit: { x: 15, y: 25 },
    snakes: [
      { slotIndex: 0, direction: 'right', body: [{ x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 }] },
      { slotIndex: 1, direction: 'left', body: [{ x: 26, y: 5 }, { x: 27, y: 5 }, { x: 28, y: 5 }] },
    ],
    switches: [
      { id: 'plate-left', position: { x: 4, y: 9 }, activationType: 'toggle', active: false },
      { id: 'plate-right', position: { x: 25, y: 9 }, activationType: 'toggle', active: false },
    ],
    doors: [
      { id: 'gate-center', position: { x: 15, y: 12 }, open: false, requiresSwitches: ['plate-left', 'plate-right'] },
    ],
  },
  {
    layoutId: 'hazard-crossroads',
    difficulty: 'medium',
    walls: [
      ...verticalLine(9, 4, 10),
      ...verticalLine(9, 14, 21),
      ...verticalLine(20, 8, 15),
      ...horizontalLine(11, 12, 17),
    ],
    exit: { x: 26, y: 25 },
    snakes: [
      { slotIndex: 0, direction: 'right', body: [{ x: 3, y: 6 }, { x: 2, y: 6 }, { x: 1, y: 6 }] },
      { slotIndex: 1, direction: 'down', body: [{ x: 24, y: 4 }, { x: 24, y: 3 }, { x: 24, y: 2 }] },
    ],
    hazards: [
      { id: 'zone-n', type: 'zone', position: { x: 14, y: 8 }, warningTicks: 3, activeTicks: 3, cooldownTicks: 3 },
      { id: 'zone-s', type: 'zone', position: { x: 14, y: 20 }, warningTicks: 3, activeTicks: 3, cooldownTicks: 3 },
      { id: 'zone-passage', type: 'zone', position: { x: 14, y: 15 }, warningTicks: 2, activeTicks: 2, cooldownTicks: 2 },
    ],
  },
  {
    layoutId: 'sweep-corridor',
    difficulty: 'hard',
    walls: [
      ...horizontalLine(0, 8, 10),
      ...horizontalLine(19, 8, 29),
      ...horizontalLine(0, 20, 10),
      ...horizontalLine(19, 20, 29),
      ...verticalLine(10, 8, 14),
      ...verticalLine(19, 8, 14),
    ],
    exit: { x: 14, y: 27 },
    snakes: [
      { slotIndex: 0, direction: 'right', body: [{ x: 3, y: 14 }, { x: 2, y: 14 }, { x: 1, y: 14 }] },
      { slotIndex: 1, direction: 'left', body: [{ x: 26, y: 14 }, { x: 27, y: 14 }, { x: 28, y: 14 }] },
    ],
    hazards: [
      { id: 'sweep-horiz', type: 'sweep', path: horizontalLine(11, 14, 18), warningTicks: 0, activeTicks: 1 },
      { id: 'zone-left', type: 'zone', position: { x: 5, y: 14 }, warningTicks: 3, activeTicks: 4, cooldownTicks: 3 },
      { id: 'zone-right', type: 'zone', position: { x: 24, y: 14 }, warningTicks: 3, activeTicks: 4, cooldownTicks: 3 },
    ],
  },
  {
    layoutId: 'patrol-gauntlet',
    difficulty: 'hard',
    walls: [
      ...horizontalLine(0, 6, 8),
      ...horizontalLine(21, 6, 29),
      ...horizontalLine(0, 22, 8),
      ...horizontalLine(21, 22, 29),
      ...verticalLine(8, 6, 10),
      ...verticalLine(21, 6, 10),
      ...verticalLine(8, 18, 22),
      ...verticalLine(21, 18, 22),
    ],
    exit: { x: 14, y: 27 },
    snakes: [
      { slotIndex: 0, direction: 'right', body: [{ x: 3, y: 14 }, { x: 2, y: 14 }, { x: 1, y: 14 }] },
      { slotIndex: 1, direction: 'left', body: [{ x: 26, y: 14 }, { x: 27, y: 14 }, { x: 28, y: 14 }] },
    ],
    monsters: [
      { id: 'patrol-n', path: horizontalLine(10, 10, 19) },
      { id: 'patrol-s', path: horizontalLine(10, 18, 19) },
    ],
  },
];

export function createInitialMatchState(roomCode: string, random: () => number = Math.random, soloMode: boolean = false): MatchState {
  const snakes = createInitialSnakes(random, soloMode);
  const activeSnakes = soloMode ? [snakes[0]] : snakes;
  const initialFood = spawnFood(BOARD, activeSnakes, random, { phase: 'initial' });
  if (!initialFood) {
    throw new Error('Unable to spawn initial food on the board.');
  }

  return {
    roomCode,
    roomMode: soloMode ? 'solo' : 'versus',
    board: BOARD,
    tickNumber: 0,
    status: 'countdown',
    snakes,
    food: initialFood,
    foodsEaten: 0,
    tickIntervalMs: computeSpeedInterval(0),
    startedAt: null,
    endedAt: null,
    result: null,
    deathReasons: [],
    winnerSlotIndex: null,
    soloMode,
    coOp: null,
    run: null,
  };
}

export function createInitialCoOpMatchState(roomCode: string, random: () => number = Math.random): MatchState {
  const layout = createRandomCoOpLayout(random);
  const snakes = layout.snakes.map((snake) => ({
    slotIndex: snake.slotIndex,
    direction: snake.direction,
    pendingDirection: null,
    body: snake.body.map((segment) => ({ ...segment })),
    alive: true,
    score: 0,
  })) as [SnakeState, SnakeState];

  return {
    roomCode,
    roomMode: 'co-op',
    board: BOARD,
    tickNumber: 0,
    status: 'countdown',
    snakes,
    food: null,
    foodsEaten: 0,
    tickIntervalMs: computeSpeedInterval(0),
    startedAt: null,
    endedAt: null,
    result: null,
    deathReasons: [],
    winnerSlotIndex: null,
    soloMode: false,
    coOp: {
      layoutId: layout.layoutId,
      objective: 'both-reach-exit',
      exit: { ...layout.exit },
      walls: layout.walls.map((wall) => ({ ...wall })),
      playersAtExit: { 0: false, 1: false },
      switches: (layout.switches ?? []).map((sw) => ({
        ...sw,
        position: { ...sw.position },
        active: false,
      })),
      doors: (layout.doors ?? []).map((door) => ({
        ...door,
        position: { ...door.position },
        open: false,
        requiresSwitches: [...door.requiresSwitches],
      })),
      hazards: (layout.hazards ?? []).map((h) => createHazardState(h)),
      monsters: (layout.monsters ?? []).map((m) => createMonsterState(m)),
    },
    run: null,
  };
}

/** Number of rooms in a standard co-op run. */
export const CO_OP_RUN_ROOM_COUNT = 5;

/**
 * Create a co-op match state with multi-room run progression enabled.
 * The first room uses an easy layout; difficulty ramps through the run.
 */
export function createInitialCoOpRunWithRooms(
  roomCode: string,
  random: () => number = Math.random,
  totalRooms: number = CO_OP_RUN_ROOM_COUNT,
): MatchState {
  const match = createInitialCoOpMatchState(roomCode, random);
  const run: RunProgressionState = {
    currentRoom: 1,
    totalRooms,
    roomsCleared: 0,
    difficulty: 'easy',
    usedLayouts: [match.coOp!.layoutId],
  };
  return { ...match, run };
}

/**
 * Compute the difficulty tier for a given room number in a run.
 * Rooms 1-2 = easy, room 3 = medium, rooms 4+ = hard.
 */
export function difficultyForRoom(roomNumber: number, _totalRooms: number): 'easy' | 'medium' | 'hard' {
  if (roomNumber <= 2) return 'easy';
  if (roomNumber === 3) return 'medium';
  return 'hard';
}

/**
 * Compute the numeric difficulty value (0..1) for display from run state.
 */
export function runDifficultyValue(run: RunProgressionState): number {
  if (run.totalRooms <= 1) return 0;
  return (run.currentRoom - 1) / (run.totalRooms - 1);
}

/**
 * Select a layout template from the appropriate difficulty bucket.
 * Avoids layouts already used in this run when possible.
 */
export function selectLayoutForDifficulty(
  difficulty: 'easy' | 'medium' | 'hard',
  random: () => number,
  usedLayouts: string[] = [],
): CoOpLayoutTemplate {
  const bucket = CO_OP_LAYOUT_TEMPLATES.filter((t) => t.difficulty === difficulty);
  // Prefer unused layouts
  const unused = bucket.filter((t) => !usedLayouts.includes(t.layoutId));
  const pool = unused.length > 0 ? unused : bucket;
  return pool[Math.floor(random() * pool.length)] ?? pool[0];
}

/**
 * Advance a co-op match to the next room in a run.
 * Resets all room-specific state (walls, switches, doors, hazards, monsters, snake positions)
 * while preserving run progression metadata. Returns null if the run is complete.
 *
 * The returned match has status='active' (no countdown) so the room starts immediately.
 */
export function advanceCoOpRoom(match: MatchState, random: () => number = Math.random): MatchState | null {
  if (!match.run || !match.coOp) return null;
  const { run } = match;
  const nextRoom = run.currentRoom + 1;
  if (nextRoom > run.totalRooms) return null; // run is complete

  const nextDifficulty = difficultyForRoom(nextRoom, run.totalRooms);
  const layout = selectLayoutForDifficulty(nextDifficulty, random, run.usedLayouts);

  // Build fresh snakes from the layout template
  const snakes = layout.snakes.map((snake) => ({
    slotIndex: snake.slotIndex,
    direction: snake.direction,
    pendingDirection: null,
    body: snake.body.map((segment) => ({ ...segment })),
    alive: true,
    score: 0,
  })) as [SnakeState, SnakeState];

  return {
    roomCode: match.roomCode,
    roomMode: 'co-op',
    board: BOARD,
    tickNumber: 0,
    status: 'active', // no countdown for room transitions — immediate start
    snakes,
    food: null,
    foodsEaten: 0,
    tickIntervalMs: computeSpeedInterval(0),
    startedAt: match.startedAt, // preserve original run start time
    endedAt: null,
    result: null,
    deathReasons: [],
    winnerSlotIndex: null,
    soloMode: false,
    coOp: {
      layoutId: layout.layoutId,
      objective: 'both-reach-exit',
      exit: { ...layout.exit },
      walls: layout.walls.map((wall) => ({ ...wall })),
      playersAtExit: { 0: false, 1: false },
      switches: (layout.switches ?? []).map((sw) => ({
        ...sw,
        position: { ...sw.position },
        active: false,
      })),
      doors: (layout.doors ?? []).map((door) => ({
        ...door,
        position: { ...door.position },
        open: false,
        requiresSwitches: [...door.requiresSwitches],
      })),
      hazards: (layout.hazards ?? []).map((h) => createHazardState(h)),
      monsters: (layout.monsters ?? []).map((m) => createMonsterState(m)),
    },
    run: {
      currentRoom: nextRoom,
      totalRooms: run.totalRooms,
      roomsCleared: run.roomsCleared + 1,
      difficulty: nextDifficulty,
      usedLayouts: [...run.usedLayouts, layout.layoutId],
    },
  };
}

export function createRandomCoOpLayout(random: () => number = Math.random): CoOpLayoutTemplate {
  const selected = CO_OP_LAYOUT_TEMPLATES[Math.floor(random() * CO_OP_LAYOUT_TEMPLATES.length)] ?? CO_OP_LAYOUT_TEMPLATES[0];
  const layout: CoOpLayoutTemplate = {
    layoutId: selected.layoutId,
    exit: { ...selected.exit },
    walls: selected.walls.map((wall) => ({ ...wall })),
    difficulty: selected.difficulty,
    snakes: selected.snakes.map((snake) => ({
      slotIndex: snake.slotIndex,
      direction: snake.direction,
      body: snake.body.map((segment) => ({ ...segment })),
    })) as CoOpLayoutTemplate['snakes'],
    switches: (selected.switches ?? []).map((sw) => ({
      ...sw,
      position: { ...sw.position },
      active: false,
    })),
    doors: (selected.doors ?? []).map((door) => ({
      ...door,
      position: { ...door.position },
      open: false,
      requiresSwitches: [...door.requiresSwitches],
    })),
    hazards: (selected.hazards ?? []).map((h) => {
      if (h.type === 'zone') {
        return { ...h, position: { ...h.position } };
      }
      return { ...h, path: h.path.map((p) => ({ ...p })) };
    }),
    monsters: (selected.monsters ?? []).map((m) => ({
      ...m,
      path: m.path.map((p) => ({ ...p })),
    })),
  };

  validateCoOpLayout(layout, BOARD);
  return layout;
}

function createHazardState(def: HazardDef): HazardState {
  if (def.type === 'zone') {
    return {
      id: def.id,
      type: 'zone',
      position: { ...def.position },
      phase: 'cooldown',
      ticksInPhase: 0,
      warningTicks: def.warningTicks,
      activeTicks: def.activeTicks,
      cooldownTicks: def.cooldownTicks,
    };
  }
  return {
    id: def.id,
    type: 'sweep',
    pathIndex: 0,
    path: def.path.map((p) => ({ ...p })),
    phase: 'cooldown',
    ticksInPhase: 0,
    warningTicks: def.warningTicks,
    activeTicks: def.activeTicks,
  };
}

function createMonsterState(def: PatrolMonsterDef): PatrolMonsterState {
  return {
    id: def.id,
    path: def.path.map((p) => ({ ...p })),
    pathIndex: 0,
    direction: 1,
  };
}

export function queueDirectionInput(snake: SnakeState, direction: Direction): boolean {
  const effectiveDirection = snake.pendingDirection ?? snake.direction;
  if (direction === effectiveDirection || OPPOSITE[effectiveDirection] === direction) {
    return false;
  }
  snake.pendingDirection = direction;
  return true;
}

export function computeSpeedInterval(foodsEaten: number): number {
  if (foodsEaten >= 9) return 150;
  if (foodsEaten >= 6) return 165;
  if (foodsEaten >= 3) return 180;
  return 200;
}

export function advanceOneTick(match: MatchState, now: number, random: () => number = Math.random): MatchState {
  const snakes = match.snakes.map((snake) => ({
    ...snake,
    body: snake.body.map((segment) => ({ ...segment })),
  })) as [SnakeState, SnakeState];
  const coOp = match.coOp
    ? {
        ...match.coOp,
        exit: { ...match.coOp.exit },
        walls: match.coOp.walls.map((wall) => ({ ...wall })),
        playersAtExit: { ...match.coOp.playersAtExit },
        switches: match.coOp.switches.map((sw) => ({
          ...sw,
          position: { ...sw.position },
        })),
        doors: match.coOp.doors.map((door) => ({
          ...door,
          position: { ...door.position },
          requiresSwitches: [...door.requiresSwitches],
        })),
        hazards: match.coOp.hazards.map((h) => cloneHazardState(h)),
        monsters: match.coOp.monsters.map((m) => cloneMonsterState(m)),
      }
    : null;
  const isCoOp = match.roomMode === 'co-op' && Boolean(coOp);
  const wallSet = coOp ? new Set(coOp.walls.map((wall) => `${wall.x},${wall.y}`)) : null;

  // --- Puzzle tick: update switch activation and door state ---
  if (isCoOp && coOp) {
    for (const sw of coOp.switches) {
      if (sw.activationType === 'hold') {
        sw.active = false;
      }
    }
    for (const snake of snakes) {
      if (!snake.alive) continue;
      const head = snake.body[0];
      for (const sw of coOp.switches) {
        if (samePoint(head, sw.position)) {
          sw.active = true;
        }
      }
    }
    for (const door of coOp.doors) {
      door.open = door.requiresSwitches.every((switchId) => {
        const sw = coOp.switches.find((s) => s.id === switchId);
        return sw?.active ?? false;
      });
    }
    for (const door of coOp.doors) {
      if (!door.open) {
        wallSet!.add(`${door.position.x},${door.position.y}`);
      }
    }
  }

  // --- Hazard tick: advance phase and sweeper position ---
  const lethalHazardPositions = new Set<string>();
  if (isCoOp && coOp) {
    for (const hazard of coOp.hazards) {
      advanceHazardTick(hazard);
      if (isHazardLethal(hazard)) {
        lethalHazardPositions.add(`${getHazardPosition(hazard).x},${getHazardPosition(hazard).y}`);
      }
    }
  }

  // --- Monster tick: advance patrol position ---
  const lethalMonsterPositions = new Set<string>();
  if (isCoOp && coOp) {
    for (const monster of coOp.monsters) {
      advanceMonsterTick(monster);
      const pos = getMonsterPosition(monster);
      lethalMonsterPositions.add(`${pos.x},${pos.y}`);
    }
  }

  for (const snake of snakes) {
    const lockedAtExit = isCoOp && coOp!.playersAtExit[snake.slotIndex];
    if (!lockedAtExit && snake.pendingDirection) {
      snake.direction = snake.pendingDirection;
    }
    snake.pendingDirection = null;
  }

  const candidateHeads = snakes.map((snake) => {
    if (!snake.alive) return { ...snake.body[0] };
    if (isCoOp && coOp!.playersAtExit[snake.slotIndex]) return { ...snake.body[0] };
    return movePoint(snake.body[0], snake.direction);
  }) as [GridPoint, GridPoint];

  const consumers = match.food
    ? candidateHeads.map((head) => samePoint(head, match.food!)) as [boolean, boolean]
    : ([false, false] as [boolean, boolean]);

  const candidateBodies = snakes.map((snake, index) => {
    if (isCoOp && coOp!.playersAtExit[snake.slotIndex]) {
      return snake.body.map((segment) => ({ ...segment }));
    }

    const nextBody = [candidateHeads[index], ...snake.body.map((segment) => ({ ...segment }))];
    if (!consumers[index]) {
      nextBody.pop();
    }
    return nextBody;
  }) as [GridPoint[], GridPoint[]];

  const deaths = new Map<0 | 1, DeathReason>();

  snakes.forEach((snake, index) => {
    if (!snake.alive) return;
    const head = candidateHeads[index];
    if (!isInsideBoard(head, match.board)) {
      deaths.set(snake.slotIndex, 'wall');
      return;
    }
    if (wallSet?.has(`${head.x},${head.y}`)) {
      deaths.set(snake.slotIndex, 'wall');
      return;
    }
    // Hazard collision check
    if (lethalHazardPositions.has(`${head.x},${head.y}`)) {
      deaths.set(snake.slotIndex, 'hazard');
      return;
    }
    // Monster collision check
    if (lethalMonsterPositions.has(`${head.x},${head.y}`)) {
      deaths.set(snake.slotIndex, 'monster');
      return;
    }

    const ownBody = candidateBodies[index].slice(1);
    if (ownBody.some((segment) => samePoint(segment, head))) {
      deaths.set(snake.slotIndex, 'self');
    }
  });

  if (!isCoOp) {
    const head0 = candidateHeads[0];
    const head1 = candidateHeads[1];
    if (samePoint(head0, head1)) {
      deaths.set(0, deaths.get(0) ?? 'head-to-head');
      deaths.set(1, deaths.get(1) ?? 'head-to-head');
    }

    if (samePoint(head0, match.snakes[1].body[0]) && samePoint(head1, match.snakes[0].body[0])) {
      deaths.set(0, deaths.get(0) ?? 'cross-over');
      deaths.set(1, deaths.get(1) ?? 'cross-over');
    }

    const body1 = candidateBodies[1].slice(1);
    const body0 = candidateBodies[0].slice(1);
    if (body1.some((segment) => samePoint(segment, head0))) {
      deaths.set(0, deaths.get(0) ?? 'head-to-body');
    }
    if (body0.some((segment) => samePoint(segment, head1))) {
      deaths.set(1, deaths.get(1) ?? 'head-to-body');
    }
  }

  let foodsEaten = match.foodsEaten;
  let food = match.food ? { ...match.food } : null;
  const deathReasons = Array.from(deaths.entries()).map(([slotIndex, reason]) => ({ slotIndex, reason }));

  for (const snake of snakes) {
    const consumed = Boolean(match.food) && consumers[snake.slotIndex] && !deaths.has(snake.slotIndex);
    snake.body = candidateBodies[snake.slotIndex];
    snake.alive = snake.alive && !deaths.has(snake.slotIndex);
    if (consumed) {
      snake.score += 1;
      foodsEaten += 1;
    }
  }

  if (isCoOp && coOp) {
    for (const snake of snakes) {
      if (!snake.alive || coOp.playersAtExit[snake.slotIndex]) continue;
      if (samePoint(snake.body[0], coOp.exit)) {
        coOp.playersAtExit[snake.slotIndex] = true;
      }
    }
  }

  let result: RoundResultKey | null = null;
  let winnerSlotIndex: 0 | 1 | null = null;
  const aliveSnakes = snakes.filter((snake) => snake.alive);

  if (isCoOp && coOp) {
    if (aliveSnakes.length < 2) {
      result = 'co-op-fail';
    } else if (coOp.playersAtExit[0] && coOp.playersAtExit[1]) {
      result = 'co-op-win';
    }
  } else if (aliveSnakes.length === 0) {
    result = 'draw';
  } else if (!match.soloMode && aliveSnakes.length === 1) {
    winnerSlotIndex = aliveSnakes[0].slotIndex;
    result = winnerSlotIndex === 0 ? 'player-0-win' : 'player-1-win';
  } else if (match.soloMode && !snakes[0].alive) {
    result = 'player-0-win';
    winnerSlotIndex = null;
  }

  if (!isCoOp && !result && match.food && (consumers[0] || consumers[1])) {
    const activeSnakes = snakes.filter((snake) => snake.alive);
    const spawned = spawnFood(match.board, activeSnakes, random, { phase: 'replacement' });
    if (spawned) {
      food = spawned;
    } else {
      const score0 = snakes[0].score;
      const score1 = snakes[1].score;
      if (score0 === score1) {
        result = 'draw';
      } else {
        winnerSlotIndex = score0 > score1 ? 0 : 1;
        result = winnerSlotIndex === 0 ? 'player-0-win' : 'player-1-win';
      }
    }
  }

  return {
    ...match,
    status: result ? 'ended' : 'active',
    tickNumber: match.tickNumber + 1,
    snakes,
    food,
    foodsEaten,
    tickIntervalMs: isCoOp ? computeSpeedInterval(0) : computeSpeedInterval(foodsEaten),
    endedAt: result ? now : null,
    result,
    winnerSlotIndex,
    deathReasons,
    soloMode: match.soloMode,
    coOp,
    run: match.run,
  };
}

/** Advance hazard phase/position by one tick. Mutates in-place. */
function advanceHazardTick(hazard: HazardState): void {
  hazard.ticksInPhase += 1;

  if (hazard.type === 'zone') {
    if (hazard.phase === 'cooldown' && hazard.ticksInPhase >= hazard.cooldownTicks) {
      hazard.phase = 'warning';
      hazard.ticksInPhase = 0;
    } else if (hazard.phase === 'warning' && hazard.ticksInPhase >= hazard.warningTicks) {
      hazard.phase = 'active';
      hazard.ticksInPhase = 0;
    } else if (hazard.phase === 'active' && hazard.ticksInPhase >= hazard.activeTicks) {
      hazard.phase = 'cooldown';
      hazard.ticksInPhase = 0;
    }
  } else {
    // Sweeper
    if (hazard.phase === 'cooldown') {
      // Move forward one step along the path
      hazard.pathIndex = (hazard.pathIndex + 1) % hazard.path.length;
      hazard.phase = hazard.warningTicks > 0 ? 'warning' : 'active';
      hazard.ticksInPhase = 0;
    } else if (hazard.phase === 'warning' && hazard.ticksInPhase >= hazard.warningTicks) {
      hazard.phase = 'active';
      hazard.ticksInPhase = 0;
    } else if (hazard.phase === 'active' && hazard.ticksInPhase >= hazard.activeTicks) {
      hazard.phase = 'cooldown';
      hazard.ticksInPhase = 0;
    }
  }
}

function cloneHazardState(hazard: HazardState): HazardState {
  if (hazard.type === 'zone') {
    return {
      ...hazard,
      position: { ...hazard.position },
    };
  }
  return {
    ...hazard,
    path: hazard.path.map((p) => ({ ...p })),
  };
}

function cloneMonsterState(monster: PatrolMonsterState): PatrolMonsterState {
  return {
    ...monster,
    path: monster.path.map((p) => ({ ...p })),
  };
}

export function applyDisconnectResult(match: MatchState, slotIndex: 0 | 1, now: number): MatchState {
  const snakes = match.snakes.map((snake) => ({ ...snake, body: snake.body.map((segment) => ({ ...segment })) })) as [SnakeState, SnakeState];
  const coOp = match.coOp
    ? {
        ...match.coOp,
        exit: { ...match.coOp.exit },
        walls: match.coOp.walls.map((wall) => ({ ...wall })),
        playersAtExit: { ...match.coOp.playersAtExit },
        switches: match.coOp.switches.map((sw) => ({
          ...sw,
          position: { ...sw.position },
        })),
        doors: match.coOp.doors.map((door) => ({
          ...door,
          position: { ...door.position },
          requiresSwitches: [...door.requiresSwitches],
        })),
        hazards: match.coOp.hazards.map((h) => cloneHazardState(h)),
        monsters: match.coOp.monsters.map((m) => cloneMonsterState(m)),
      }
    : null;
  snakes[slotIndex].alive = false;
  const otherIndex = slotIndex === 0 ? 1 : 0;
  const otherConnectedAlive = snakes[otherIndex].alive;
  const result = match.roomMode === 'co-op'
    ? 'co-op-fail'
    : otherConnectedAlive
      ? (otherIndex === 0 ? 'player-0-win' : 'player-1-win')
      : 'draw';

  return {
    ...match,
    status: 'ended',
    snakes,
    endedAt: now,
    result,
    winnerSlotIndex: match.roomMode === 'co-op' ? null : otherConnectedAlive ? otherIndex : null,
    deathReasons: [{ slotIndex, reason: 'disconnect' }],
    coOp,
    run: match.run,
  };
}

export function toOutcomeForSlot(match: MatchState, slotIndex: 0 | 1): 'win' | 'lose' | 'draw' {
  if (match.result === 'co-op-win') return 'win';
  if (match.result === 'co-op-fail') return 'lose';
  if (match.result === 'draw' || match.winnerSlotIndex === null) return 'draw';
  return match.winnerSlotIndex === slotIndex ? 'win' : 'lose';
}

export function spawnFood(
  board: { width: number; height: number },
  snakes: Array<Pick<SnakeState, 'body'>>,
  random: () => number = Math.random,
  options: { phase?: 'initial' | 'replacement' } = {},
): GridPoint | null {
  const occupied = new Set(snakes.flatMap((snake) => snake.body.map((segment) => `${segment.x},${segment.y}`)));
  const emptyCells: GridPoint[] = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (!emptyCells.length) return null;
  if (snakes.length < 2) return pickRandomCell(emptyCells, random);

  const heads = snakes.map((snake) => snake.body[0]);
  if (options.phase === 'initial') {
    const fairCell = pickInitialFairFoodCell(emptyCells, heads, random);
    if (fairCell) return fairCell;
  }

  const replacementCell = pickReplacementFoodCell(emptyCells, heads, random);
  return replacementCell ?? pickRandomCell(emptyCells, random);
}

function createInitialSnakes(_random: () => number, soloMode: boolean = false): [SnakeState, SnakeState] {
  return [
    {
      slotIndex: 0,
      direction: 'right',
      pendingDirection: null,
      body: [
        { x: 7, y: 15 },
        { x: 6, y: 15 },
        { x: 5, y: 15 },
      ],
      alive: true,
      score: 0,
    },
    soloMode
      ? {
          slotIndex: 1,
          direction: 'left',
          pendingDirection: null,
          body: [{ x: -1, y: -1 }],
          alive: false,
          score: 0,
        }
      : {
          slotIndex: 1,
          direction: 'left',
          pendingDirection: null,
          body: [
            { x: 22, y: 15 },
            { x: 23, y: 15 },
            { x: 24, y: 15 },
          ],
          alive: true,
          score: 0,
        },
  ];
}

function pickInitialFairFoodCell(cells: GridPoint[], heads: GridPoint[], random: () => number): GridPoint | null {
  const fairnessProfiles = [
    { enforceLaneBias: true, maxDelta: 2 },
    { enforceLaneBias: false, maxDelta: 2 },
    { enforceLaneBias: false, maxDelta: 3 },
  ] as const;

  for (const profile of fairnessProfiles) {
    const filtered = cells.filter((cell) => isInitialFoodCandidateFair(cell, heads, profile));
    if (filtered.length > 0) {
      return pickRandomCell(filtered, random);
    }
  }

  return null;
}

function isInitialFoodCandidateFair(
  cell: GridPoint,
  heads: GridPoint[],
  profile: { enforceLaneBias: boolean; maxDelta: number },
): boolean {
  const [head0, head1] = heads;
  const distance0 = manhattanDistance(cell, head0);
  const distance1 = manhattanDistance(cell, head1);

  if (distance0 < 4 || distance1 < 4) {
    return false;
  }

  if (Math.abs(distance0 - distance1) > profile.maxDelta) {
    return false;
  }

  if (!profile.enforceLaneBias) {
    return true;
  }

  const projected0 = movePoint(head0, 'right');
  const projected1 = movePoint(head1, 'left');
  const ahead0 = cell.x >= head0.x;
  const ahead1 = cell.x <= head1.x;
  const onForwardLane0 = ahead0 && cell.y === head0.y && manhattanDistance(cell, projected0) <= 4;
  const onForwardLane1 = ahead1 && cell.y === head1.y && manhattanDistance(cell, projected1) <= 4;

  if (onForwardLane0 && distance1 - distance0 >= 2) {
    return false;
  }
  if (onForwardLane1 && distance0 - distance1 >= 2) {
    return false;
  }

  return true;
}

function pickReplacementFoodCell(cells: GridPoint[], heads: GridPoint[], random: () => number): GridPoint | null {
  const filtered = cells.filter((cell) => heads.every((head) => manhattanDistance(cell, head) > 1));
  if (!filtered.length) return null;
  return pickRandomCell(filtered, random);
}

function pickRandomCell(cells: GridPoint[], random: () => number): GridPoint | null {
  return cells[Math.floor(random() * cells.length)] ?? null;
}

function rectangleOutline(x: number, y: number, width: number, height: number): GridPoint[] {
  const cells: GridPoint[] = [];
  for (let dx = 0; dx < width; dx += 1) {
    cells.push({ x: x + dx, y });
    cells.push({ x: x + dx, y: y + height - 1 });
  }
  for (let dy = 1; dy < height - 1; dy += 1) {
    cells.push({ x, y: y + dy });
    cells.push({ x: x + width - 1, y: y + dy });
  }
  return dedupePoints(cells);
}

function horizontalLine(xStart: number, y: number, xEnd: number): GridPoint[] {
  const cells: GridPoint[] = [];
  for (let x = xStart; x <= xEnd; x += 1) {
    cells.push({ x, y });
  }
  return cells;
}

function verticalLine(x: number, yStart: number, yEnd: number): GridPoint[] {
  const cells: GridPoint[] = [];
  for (let y = yStart; y <= yEnd; y += 1) {
    cells.push({ x, y });
  }
  return cells;
}

function dedupePoints(points: GridPoint[]): GridPoint[] {
  const unique = new Map<string, GridPoint>();
  for (const point of points) {
    unique.set(`${point.x},${point.y}`, point);
  }
  return [...unique.values()];
}

function validateCoOpLayout(layout: CoOpLayoutTemplate, board: { width: number; height: number }) {
  const wallSet = new Set(layout.walls.map((wall) => `${wall.x},${wall.y}`));
  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(`Invalid co-op layout '${layout.layoutId}': ${message}`);
  };

  for (const wall of layout.walls) {
    assert(isInsideBoard(wall, board), `wall out of bounds at (${wall.x},${wall.y})`);
  }

  assert(isInsideBoard(layout.exit, board), `exit out of bounds at (${layout.exit.x},${layout.exit.y})`);
  assert(!wallSet.has(`${layout.exit.x},${layout.exit.y}`), `exit overlaps a wall at (${layout.exit.x},${layout.exit.y})`);

  for (const snake of layout.snakes) {
    for (const segment of snake.body) {
      assert(isInsideBoard(segment, board), `snake ${snake.slotIndex} segment out of bounds at (${segment.x},${segment.y})`);
      assert(!wallSet.has(`${segment.x},${segment.y}`), `snake ${snake.slotIndex} overlaps wall at (${segment.x},${segment.y})`);
    }

    assert(canReachOuterField(snake.body[0], wallSet, board), `snake ${snake.slotIndex} is trapped in a reduced inner room`);
  }

  // Validate puzzle entities
  const switches = layout.switches ?? [];
  const doors = layout.doors ?? [];
  const switchIdSet = new Set(switches.map((sw) => sw.id));
  const occupiedSet = new Set([
    ...wallSet,
    `${layout.exit.x},${layout.exit.y}`,
    ...layout.snakes.flatMap((snake) => snake.body.map((seg) => `${seg.x},${seg.y}`)),
  ]);

  for (const sw of switches) {
    assert(isInsideBoard(sw.position, board), `switch '${sw.id}' out of bounds at (${sw.position.x},${sw.position.y})`);
    assert(!wallSet.has(`${sw.position.x},${sw.position.y}`), `switch '${sw.id}' overlaps wall at (${sw.position.x},${sw.position.y})`);
    assert(!occupiedSet.has(`${sw.position.x},${sw.position.y}`), `switch '${sw.id}' overlaps exit or snake spawn at (${sw.position.x},${sw.position.y})`);
  }

  for (const door of doors) {
    assert(isInsideBoard(door.position, board), `door '${door.id}' out of bounds at (${door.position.x},${door.position.y})`);
    assert(!wallSet.has(`${door.position.x},${door.position.y}`), `door '${door.id}' overlaps wall at (${door.position.x},${door.position.y})`);
    for (const switchId of door.requiresSwitches) {
      assert(switchIdSet.has(switchId), `door '${door.id}' references unknown switch '${switchId}'`);
    }
  }

  // Validate hazard entities
  const hazards = layout.hazards ?? [];
  for (const h of hazards) {
    if (h.type === 'zone') {
      assert(isInsideBoard(h.position, board), `hazard '${h.id}' out of bounds at (${h.position.x},${h.position.y})`);
      assert(!wallSet.has(`${h.position.x},${h.position.y}`), `hazard '${h.id}' overlaps wall at (${h.position.x},${h.position.y})`);
      assert(!occupiedSet.has(`${h.position.x},${h.position.y}`), `hazard '${h.id}' overlaps exit or snake spawn at (${h.position.x},${h.position.y})`);
      assert(h.warningTicks >= 0 && h.activeTicks >= 1 && h.cooldownTicks >= 0, `hazard '${h.id}' must have activeTicks >= 1`);
    } else {
      assert(h.path.length >= 2, `sweeper '${h.id}' must have at least 2 waypoints`);
      for (const waypoint of h.path) {
        assert(isInsideBoard(waypoint, board), `sweeper '${h.id}' waypoint out of bounds at (${waypoint.x},${waypoint.y})`);
        assert(!wallSet.has(`${waypoint.x},${waypoint.y}`), `sweeper '${h.id}' waypoint overlaps wall at (${waypoint.x},${waypoint.y})`);
      }
      assert(h.activeTicks >= 1, `sweeper '${h.id}' must have activeTicks >= 1`);
    }
  }

  // Validate patrol monster entities
  const monsters = layout.monsters ?? [];
  for (const m of monsters) {
    assert(m.path.length >= 2, `monster '${m.id}' must have at least 2 waypoints`);
    for (const waypoint of m.path) {
      assert(isInsideBoard(waypoint, board), `monster '${m.id}' waypoint out of bounds at (${waypoint.x},${waypoint.y})`);
      assert(!wallSet.has(`${waypoint.x},${waypoint.y}`), `monster '${m.id}' waypoint overlaps wall at (${waypoint.x},${waypoint.y})`);
      assert(!occupiedSet.has(`${waypoint.x},${waypoint.y}`), `monster '${m.id}' waypoint overlaps exit or snake spawn at (${waypoint.x},${waypoint.y})`);
    }
  }

  // Solvability: with all switches active (doors open) and no hazards considered blocking,
  // both snakes must reach exit
  if (doors.length > 0) {
    const openDoorPositions = new Set(doors.map((door) => `${door.position.x},${door.position.y}`));
    const relaxedBlocked = new Set([...wallSet].filter((key) => !openDoorPositions.has(key)));
    for (const snake of layout.snakes) {
      assert(
        pathExists(snake.body[0], layout.exit, relaxedBlocked, board),
        `snake ${snake.slotIndex} cannot reach exit even with all doors open`,
      );
    }
  } else {
    for (const snake of layout.snakes) {
      assert(pathExists(snake.body[0], layout.exit, wallSet, board), `snake ${snake.slotIndex} cannot reach exit`);
    }
  }
}

function pathExists(start: GridPoint, target: GridPoint, blocked: Set<string>, board: { width: number; height: number }): boolean {
  const queue: GridPoint[] = [start];
  const visited = new Set([`${start.x},${start.y}`]);

  while (queue.length > 0) {
    const point = queue.shift()!;
    if (samePoint(point, target)) return true;

    for (const candidate of neighbors(point)) {
      if (!isInsideBoard(candidate, board)) continue;
      const key = `${candidate.x},${candidate.y}`;
      if (blocked.has(key) || visited.has(key)) continue;
      visited.add(key);
      queue.push(candidate);
    }
  }

  return false;
}

function canReachOuterField(start: GridPoint, blocked: Set<string>, board: { width: number; height: number }): boolean {
  const queue: GridPoint[] = [start];
  const visited = new Set([`${start.x},${start.y}`]);

  while (queue.length > 0) {
    const point = queue.shift()!;
    if (point.x === 0 || point.y === 0 || point.x === board.width - 1 || point.y === board.height - 1) {
      return true;
    }

    for (const candidate of neighbors(point)) {
      if (!isInsideBoard(candidate, board)) continue;
      const key = `${candidate.x},${candidate.y}`;
      if (blocked.has(key) || visited.has(key)) continue;
      visited.add(key);
      queue.push(candidate);
    }
  }

  return false;
}

function neighbors(point: GridPoint): GridPoint[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ];
}

function manhattanDistance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function movePoint(point: GridPoint, direction: Direction): GridPoint {
  switch (direction) {
    case 'up': return { x: point.x, y: point.y - 1 };
    case 'down': return { x: point.x, y: point.y + 1 };
    case 'left': return { x: point.x - 1, y: point.y };
    case 'right': return { x: point.x + 1, y: point.y };
  }
}

function isInsideBoard(point: GridPoint, board: { width: number; height: number }): boolean {
  return point.x >= 0 && point.x < board.width && point.y >= 0 && point.y < board.height;
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}
