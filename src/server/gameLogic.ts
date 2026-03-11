export type Direction = 'up' | 'down' | 'left' | 'right';
export type DeathReason = 'wall' | 'self' | 'head-to-head' | 'head-to-body' | 'cross-over' | 'disconnect';
export type MatchStatus = 'countdown' | 'active' | 'ended';
export type RoundResultKey = 'player-0-win' | 'player-1-win' | 'draw';

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

export interface MatchState {
  roomCode: string;
  board: { width: 30; height: 30 };
  tickNumber: number;
  status: MatchStatus;
  snakes: [SnakeState, SnakeState];
  food: GridPoint;
  foodsEaten: number;
  tickIntervalMs: number;
  startedAt: number | null;
  endedAt: number | null;
  result: RoundResultKey | null;
  deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  winnerSlotIndex: 0 | 1 | null;
}

const BOARD = { width: 30, height: 30 } as const;
const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function createInitialMatchState(roomCode: string, random: () => number = Math.random): MatchState {
  const snakes: [SnakeState, SnakeState] = [
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
    {
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

  const initialFood = spawnFood(BOARD, snakes, random);
  if (!initialFood) {
    throw new Error('Unable to spawn initial food on the board.');
  }

  return {
    roomCode,
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
  if (foodsEaten >= 9) return 120;
  if (foodsEaten >= 6) return 140;
  if (foodsEaten >= 3) return 170;
  return 200;
}

export function advanceOneTick(match: MatchState, now: number, random: () => number = Math.random): MatchState {
  const snakes = match.snakes.map((snake) => ({
    ...snake,
    body: snake.body.map((segment) => ({ ...segment })),
  })) as [SnakeState, SnakeState];

  for (const snake of snakes) {
    if (snake.pendingDirection) {
      snake.direction = snake.pendingDirection;
      snake.pendingDirection = null;
    }
  }

  const candidateHeads = snakes.map((snake) => movePoint(snake.body[0], snake.direction)) as [GridPoint, GridPoint];
  const consumers = candidateHeads.map((head) => samePoint(head, match.food)) as [boolean, boolean];

  const candidateBodies = snakes.map((snake, index) => {
    const nextBody = [candidateHeads[index], ...snake.body.map((segment) => ({ ...segment }))];
    if (!consumers[index]) {
      nextBody.pop();
    }
    return nextBody;
  }) as [GridPoint[], GridPoint[]];

  const deaths = new Map<0 | 1, DeathReason>();

  snakes.forEach((snake, index) => {
    const head = candidateHeads[index];
    if (!isInsideBoard(head, match.board)) {
      deaths.set(snake.slotIndex, 'wall');
      return;
    }

    const ownBody = candidateBodies[index].slice(1);
    if (ownBody.some((segment) => samePoint(segment, head))) {
      deaths.set(snake.slotIndex, 'self');
    }
  });

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

  let foodsEaten = match.foodsEaten;
  let food = { ...match.food };
  const deathReasons = Array.from(deaths.entries()).map(([slotIndex, reason]) => ({ slotIndex, reason }));

  for (const snake of snakes) {
    const consumed = consumers[snake.slotIndex] && !deaths.has(snake.slotIndex);
    snake.body = candidateBodies[snake.slotIndex];
    snake.alive = !deaths.has(snake.slotIndex);
    if (consumed) {
      snake.score += 1;
      foodsEaten += 1;
    }
  }

  let result: RoundResultKey | null = null;
  let winnerSlotIndex: 0 | 1 | null = null;
  const aliveSnakes = snakes.filter((snake) => snake.alive);
  if (aliveSnakes.length === 0) {
    result = 'draw';
  } else if (aliveSnakes.length === 1) {
    winnerSlotIndex = aliveSnakes[0].slotIndex;
    result = winnerSlotIndex === 0 ? 'player-0-win' : 'player-1-win';
  }

  if (!result && (consumers[0] || consumers[1])) {
    const spawned = spawnFood(match.board, snakes, random);
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
    tickIntervalMs: computeSpeedInterval(foodsEaten),
    endedAt: result ? now : null,
    result,
    winnerSlotIndex,
    deathReasons,
  };
}

export function applyDisconnectResult(match: MatchState, slotIndex: 0 | 1, now: number): MatchState {
  const snakes = match.snakes.map((snake) => ({ ...snake, body: snake.body.map((segment) => ({ ...segment })) })) as [SnakeState, SnakeState];
  snakes[slotIndex].alive = false;
  const otherIndex = slotIndex === 0 ? 1 : 0;
  const otherConnectedAlive = snakes[otherIndex].alive;
  const result = otherConnectedAlive ? (otherIndex === 0 ? 'player-0-win' : 'player-1-win') : 'draw';

  return {
    ...match,
    status: 'ended',
    snakes,
    endedAt: now,
    result,
    winnerSlotIndex: otherConnectedAlive ? otherIndex : null,
    deathReasons: [{ slotIndex, reason: 'disconnect' }],
  };
}

export function toOutcomeForSlot(match: MatchState, slotIndex: 0 | 1): 'win' | 'lose' | 'draw' {
  if (match.result === 'draw' || match.winnerSlotIndex === null) return 'draw';
  return match.winnerSlotIndex === slotIndex ? 'win' : 'lose';
}

export function spawnFood(
  board: { width: number; height: number },
  snakes: Array<Pick<SnakeState, 'body'>>,
  random: () => number = Math.random,
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
  return emptyCells[Math.floor(random() * emptyCells.length)] ?? null;
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
