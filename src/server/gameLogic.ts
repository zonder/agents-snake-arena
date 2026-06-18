export type Direction = 'up' | 'down' | 'left' | 'right';
export type DeathReason = 'wall' | 'self' | 'head-to-head' | 'head-to-body' | 'cross-over' | 'disconnect';
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

export interface CoOpLayoutTemplate {
  layoutId: string;
  walls: GridPoint[];
  exit: GridPoint;
  snakes: [Pick<SnakeState, 'slotIndex' | 'direction' | 'body'>, Pick<SnakeState, 'slotIndex' | 'direction' | 'body'>];
}

export interface CoOpObjectiveState {
  layoutId: string;
  objective: 'both-reach-exit';
  exit: GridPoint;
  walls: GridPoint[];
  playersAtExit: { 0: boolean; 1: boolean };
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
    },
  };
}

export function createRandomCoOpLayout(random: () => number = Math.random): CoOpLayoutTemplate {
  const selected = CO_OP_LAYOUT_TEMPLATES[Math.floor(random() * CO_OP_LAYOUT_TEMPLATES.length)] ?? CO_OP_LAYOUT_TEMPLATES[0];
  const layout = {
    layoutId: selected.layoutId,
    exit: { ...selected.exit },
    walls: selected.walls.map((wall) => ({ ...wall })),
    snakes: selected.snakes.map((snake) => ({
      slotIndex: snake.slotIndex,
      direction: snake.direction,
      body: snake.body.map((segment) => ({ ...segment })),
    })) as CoOpLayoutTemplate['snakes'],
  };

  validateCoOpLayout(layout, BOARD);
  return layout;
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
      }
    : null;
  const isCoOp = match.roomMode === 'co-op' && Boolean(coOp);
  const wallSet = coOp ? new Set(coOp.walls.map((wall) => `${wall.x},${wall.y}`)) : null;

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

    assert(pathExists(snake.body[0], layout.exit, wallSet, board), `snake ${snake.slotIndex} cannot reach exit`);
    assert(canReachOuterField(snake.body[0], wallSet, board), `snake ${snake.slotIndex} is trapped in a reduced inner room`);
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
