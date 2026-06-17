import type { Direction, GridPoint } from '../shared/contracts.js';
import type { MatchState, SnakeState } from './gameLogic.js';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

interface BotDecision {
  direction: Direction;
}

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/**
 * Decide which direction the bot should move this tick.
 *
 * Strategy (medium difficulty — beatable but not trivial):
 *  1. Run BFS from the bot's head to the food.
 *  2. If a safe path exists, follow the first step of that path.
 *  3. If no path to food, pick the direction that maximises reachable
 *     open space (flood-fill heuristic) — survival mode.
 *  4. As a last resort, pick any direction that doesn't immediately kill.
 *
 * Difficulty tweaks:
 *  - easy:   30 % chance of random safe move instead of optimal
 *  - medium: always optimal (described above)
 *  - hard:   looks one step ahead for opponent head-to-head collisions
 */
export function decideBotMove(
  match: MatchState,
  botSlotIndex: 0 | 1,
  difficulty: BotDifficulty = 'medium',
  random: () => number = Math.random,
): BotDecision {
  const botSnake = match.snakes[botSlotIndex];
  if (!botSnake.alive) return { direction: botSnake.direction };

  const opponentSnake = match.snakes[botSlotIndex === 0 ? 1 : 0];
  const board = match.board;
  const food = match.food;

  // Build occupied set (all snake bodies except tail tips that will move)
  const occupied = buildOccupiedSet(match, botSlotIndex);

  const head = botSnake.body[0];
  const effectiveDir = botSnake.pendingDirection ?? botSnake.direction;

  // Collect safe directions (won't hit wall, self, or opponent)
  const safeMoves = DIRECTIONS.filter((dir) => {
    if (dir === OPPOSITE[effectiveDir]) return false;
    const next = movePoint(head, dir);
    return isSafe(next, board, occupied);
  });

  if (safeMoves.length === 0) {
    return { direction: botSnake.direction }; // doomed — keep going
  }

  // Easy mode: sometimes pick randomly
  if (difficulty === 'easy' && random() < 0.3) {
    return { direction: pickRandom(safeMoves, random) };
  }

  // Try BFS to food
  const pathToFood = bfs(head, food, board, occupied, effectiveDir);
  if (pathToFood.length > 0) {
    const bestDir = pathToFood[0];
    if (safeMoves.includes(bestDir)) {
      // Hard mode: check if opponent could head-to-head us next tick
      if (difficulty === 'hard') {
        const survived = checkHeadToHeadSafety(
          bestDir, head, opponentSnake, board, occupied,
        );
        if (!survived && safeMoves.length > 1) {
          return { direction: pickBestSurvivalMove(head, safeMoves, board, occupied, effectiveDir) };
        }
      }
      return { direction: bestDir };
    }
  }

  // No path to food — survival mode: pick direction with most open space
  return { direction: pickBestSurvivalMove(head, safeMoves, board, occupied, effectiveDir) };
}

// ─── BFS ────────────────────────────────────────────────────────────────────

function bfs(
  start: GridPoint,
  target: GridPoint,
  board: { width: number; height: number },
  occupied: Set<string>,
  currentDir: Direction,
): Direction[] {
  const key = (p: GridPoint) => `${p.x},${p.y}`;
  const visited = new Set<string>();
  visited.add(key(start));

  // Queue entries: [point, first direction taken]
  const queue: Array<{ point: GridPoint; firstDir: Direction }> = [];

  for (const dir of DIRECTIONS) {
    if (dir === OPPOSITE[currentDir]) continue;
    const next = movePoint(start, dir);
    if (!isInsideBoard(next, board) || occupied.has(key(next))) continue;
    if (next.x === target.x && next.y === target.y) return [dir];
    visited.add(key(next));
    queue.push({ point: next, firstDir: dir });
  }

  while (queue.length > 0) {
    const { point, firstDir } = queue.shift()!;
    for (const dir of DIRECTIONS) {
      const next = movePoint(point, dir);
      const k = key(next);
      if (visited.has(k)) continue;
      if (!isInsideBoard(next, board) || occupied.has(k)) continue;
      if (next.x === target.x && next.y === target.y) return [firstDir];
      visited.add(k);
      queue.push({ point: next, firstDir });
    }
  }

  return []; // no path
}

// ─── Flood-fill (survival) ──────────────────────────────────────────────────

function floodFillCount(
  start: GridPoint,
  board: { width: number; height: number },
  occupied: Set<string>,
  maxCells: number = 200,
): number {
  const key = (p: GridPoint) => `${p.x},${p.y}`;
  const visited = new Set<string>();
  visited.add(key(start));
  const queue: GridPoint[] = [start];
  let count = 0;

  while (queue.length > 0 && count < maxCells) {
    const point = queue.shift()!;
    count++;
    for (const dir of DIRECTIONS) {
      const next = movePoint(point, dir);
      const k = key(next);
      if (visited.has(k)) continue;
      if (!isInsideBoard(next, board) || occupied.has(k)) continue;
      visited.add(k);
      queue.push(next);
    }
  }

  return count;
}

function pickBestSurvivalMove(
  head: GridPoint,
  safeMoves: Direction[],
  board: { width: number; height: number },
  occupied: Set<string>,
  currentDir: Direction,
): Direction {
  let bestDir = safeMoves[0];
  let bestSpace = -1;

  for (const dir of safeMoves) {
    const next = movePoint(head, dir);
    const occ = new Set(occupied);
    occ.delete(`${head.x},${head.y}`); // head will move
    occ.add(`${next.x},${next.y}`);
    const space = floodFillCount(next, board, occ);
    if (space > bestSpace) {
      bestSpace = space;
      bestDir = dir;
    }
  }

  return bestDir;
}

// ─── Head-to-head safety (hard mode) ────────────────────────────────────────

function checkHeadToHeadSafety(
  myDir: Direction,
  myHead: GridPoint,
  opponentSnake: SnakeState,
  board: { width: number; height: number },
  _occupied: Set<string>,
): boolean {
  if (!opponentSnake.alive) return true;

  const myNext = movePoint(myHead, myDir);
  const oppHead = opponentSnake.body[0];
  const oppDir = opponentSnake.pendingDirection ?? opponentSnake.direction;

  // Check all possible opponent moves
  for (const oppNextDir of DIRECTIONS) {
    if (oppNextDir === OPPOSITE[oppDir]) continue;
    const oppNext = movePoint(oppHead, oppNextDir);
    if (!isInsideBoard(oppNext, board)) continue;
    if (oppNext.x === myNext.x && oppNext.y === myNext.y) {
      return false; // head-to-head collision possible
    }
  }

  return true;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildOccupiedSet(match: MatchState, botSlotIndex: 0 | 1): Set<string> {
  const occupied = new Set<string>();

  for (const snake of match.snakes) {
    if (!snake.alive) continue;
    // Add all body segments. The tail will move away unless eating,
    // but for safety we keep it occupied (conservative).
    for (const seg of snake.body) {
      occupied.add(`${seg.x},${seg.y}`);
    }
  }

  return occupied;
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

function isSafe(point: GridPoint, board: { width: number; height: number }, occupied: Set<string>): boolean {
  return isInsideBoard(point, board) && !occupied.has(`${point.x},${point.y}`);
}

function pickRandom<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}
