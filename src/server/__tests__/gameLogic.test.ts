import { describe, expect, it } from 'vitest';
import {
  advanceOneTick,
  computeSpeedInterval,
  createInitialCoOpMatchState,
  createInitialMatchState,
  createRandomCoOpLayout,
  spawnFood,
  type GridPoint,
  type SnakeState,
  type PuzzleSwitch,
  type PuzzleDoor,
} from '../gameLogic.js';

describe('computeSpeedInterval', () => {
  it('uses the gentler speed schedule', () => {
    expect(computeSpeedInterval(0)).toBe(200);
    expect(computeSpeedInterval(2)).toBe(200);
    expect(computeSpeedInterval(3)).toBe(180);
    expect(computeSpeedInterval(5)).toBe(180);
    expect(computeSpeedInterval(6)).toBe(165);
    expect(computeSpeedInterval(8)).toBe(165);
    expect(computeSpeedInterval(9)).toBe(150);
    expect(computeSpeedInterval(20)).toBe(150);
  });
});

describe('createInitialMatchState', () => {
  it('keeps opening snake spawns mirrored at the existing baseline positions', () => {
    const match = createInitialMatchState('ROOM', () => 0.51);
    const [left, right] = match.snakes;

    expect(match.board).toEqual({ width: 30, height: 30 });
    expect(left.body[0].y).toBe(right.body[0].y);
    expect(left.body[0]).toEqual({ x: 7, y: 15 });
    expect(right.body[0]).toEqual({ x: 22, y: 15 });
    expect(left.direction).toBe('right');
    expect(right.direction).toBe('left');
  });

  it('spawns the initial food with a fair opening distance', () => {
    const match = createInitialMatchState('ROOM', () => 0);
    expect(match.food).not.toBeNull();
    const food = match.food!;
    const [leftHead, rightHead] = match.snakes.map((snake) => snake.body[0]);
    const dist0 = manhattan(food, leftHead);
    const dist1 = manhattan(food, rightHead);

    expect(dist0).toBeGreaterThanOrEqual(4);
    expect(dist1).toBeGreaterThanOrEqual(4);
    expect(Math.abs(dist0 - dist1)).toBeLessThanOrEqual(2);
  });
});

describe('createInitialCoOpMatchState', () => {
  it('generates a co-op room with a reachable exit for both spawn lanes', () => {
    const match = createInitialCoOpMatchState('ROOM', () => 0);
    expect(match.roomMode).toBe('co-op');
    expect(match.food).toBeNull();
    expect(match.coOp).not.toBeNull();

    const coOp = match.coOp!;
    const blocked = new Set(coOp.walls.map((wall) => `${wall.x},${wall.y}`));

    expect(pathExists(match.snakes[0].body[0], coOp.exit, blocked, match.board)).toBe(true);
    expect(pathExists(match.snakes[1].body[0], coOp.exit, blocked, match.board)).toBe(true);
  });

  it('keeps every layout on free cells and preserves a solvable route', () => {
    const layouts = [0, 0.25, 0.5, 0.75].map((seed) => createRandomCoOpLayout(() => seed));
    expect(new Set(layouts.map((layout) => layout.layoutId))).toEqual(
      new Set(['crossroads-open', 'double-corridor-open', 'split-pillars-open', 'dual-switch-gate']),
    );

    for (const layout of layouts) {
      const blocked = new Set(layout.walls.map((wall) => `${wall.x},${wall.y}`));

      expect(blocked.has(`${layout.exit.x},${layout.exit.y}`)).toBe(false);
      for (const snake of layout.snakes) {
        for (const segment of snake.body) {
          expect(blocked.has(`${segment.x},${segment.y}`)).toBe(false);
        }

        expect(pathExists(snake.body[0], layout.exit, blocked, { width: 30, height: 30 })).toBe(true);
        expect(canReachBoardEdge(snake.body[0], blocked, { width: 30, height: 30 })).toBe(true);
      }
    }
  });
});

describe('advanceOneTick co-op objective', () => {
  it('locks the first player at the exit and wins when the teammate arrives later', () => {
    const match = createInitialCoOpMatchState('ROOM', () => 0);
    const exit = match.coOp!.exit;

    match.snakes[0].body = [
      { x: exit.x - 1, y: exit.y },
      { x: exit.x - 2, y: exit.y },
      { x: exit.x - 3, y: exit.y },
    ];
    match.snakes[0].direction = 'right';
    match.snakes[0].pendingDirection = null;

    const afterFirstArrival = advanceOneTick(match, 1000);
    expect(afterFirstArrival.result).toBeNull();
    expect(afterFirstArrival.coOp?.playersAtExit[0]).toBe(true);
    expect(afterFirstArrival.snakes[0].body[0]).toEqual(exit);

    afterFirstArrival.snakes[1].body = [
      { x: exit.x, y: exit.y + 1 },
      { x: exit.x, y: exit.y + 2 },
      { x: exit.x, y: exit.y + 3 },
    ];
    afterFirstArrival.snakes[1].direction = 'up';
    afterFirstArrival.snakes[1].pendingDirection = null;

    const completed = advanceOneTick(afterFirstArrival, 1200);
    expect(completed.result).toBe('co-op-win');
    expect(completed.coOp?.playersAtExit[0]).toBe(true);
    expect(completed.coOp?.playersAtExit[1]).toBe(true);
    expect(completed.snakes[0].body[0]).toEqual(exit);
    expect(completed.snakes[1].body[0]).toEqual(exit);
  });
});

describe('co-op puzzle primitives', () => {
  it('generates dual-switch-gate layout with switches and doors', () => {
    // Seed 0.75 selects the dual-switch-gate layout (4th template)
    const layout = createRandomCoOpLayout(() => 0.75);
    expect(layout.layoutId).toBe('dual-switch-gate');
    expect(layout.switches).toBeDefined();
    expect(layout.switches!.length).toBe(2);
    expect(layout.doors).toBeDefined();
    expect(layout.doors!.length).toBe(1);
    expect(layout.doors![0].requiresSwitches).toEqual(['plate-left', 'plate-right']);
  });

  it('creates co-op match state with puzzle entities initialized', () => {
    const match = createInitialCoOpMatchState('PUZZLE', () => 0.75);
    expect(match.coOp).not.toBeNull();
    expect(match.coOp!.switches.length).toBe(2);
    expect(match.coOp!.doors.length).toBe(1);
    expect(match.coOp!.switches.every((sw) => !sw.active)).toBe(true);
    expect(match.coOp!.doors.every((door) => !door.open)).toBe(true);
  });

  it('activates hold switch when snake head steps on it', () => {
    const match = createInitialCoOpMatchState('PUZZLE', () => 0.75);
    const coOp = match.coOp!;
    const plateLeft = coOp.switches.find((sw) => sw.id === 'plate-left')!;

    // Move snake 0 to the left plate position
    match.snakes[0].body = [
      { ...plateLeft.position },
      { x: plateLeft.position.x - 1, y: plateLeft.position.y },
      { x: plateLeft.position.x - 2, y: plateLeft.position.y },
    ];
    match.snakes[0].direction = 'right';
    match.snakes[0].pendingDirection = null;

    const after = advanceOneTick(match, 1000);
    const updatedPlate = after.coOp!.switches.find((sw) => sw.id === 'plate-left')!;
    expect(updatedPlate.active).toBe(true);
  });

  it('toggle switch stays active after snake leaves the plate', () => {
    const match = createInitialCoOpMatchState('PUZZLE', () => 0.75);
    const coOp = match.coOp!;
    const plateLeft = coOp.switches.find((sw) => sw.id === 'plate-left')!;

    // Snake head is ON the plate
    match.snakes[0].body = [
      { ...plateLeft.position },
      { x: plateLeft.position.x - 1, y: plateLeft.position.y },
      { x: plateLeft.position.x - 2, y: plateLeft.position.y },
    ];
    match.snakes[0].direction = 'right';
    match.snakes[0].pendingDirection = null;

    // Tick 1: snake activates the toggle plate
    const tick1 = advanceOneTick(match, 1000);
    expect(tick1.coOp!.switches.find((sw) => sw.id === 'plate-left')!.active).toBe(true);

    // Tick 2: snake moves off the plate, toggle stays active
    tick1.snakes[0].pendingDirection = null;
    const tick2 = advanceOneTick(tick1, 1200);
    expect(tick2.coOp!.switches.find((sw) => sw.id === 'plate-left')!.active).toBe(true);
  });

  it('opens door when all required switches are simultaneously active', () => {
    const match = createInitialCoOpMatchState('PUZZLE', () => 0.75);
    const coOp = match.coOp!;
    const plateLeft = coOp.switches.find((sw) => sw.id === 'plate-left')!;
    const plateRight = coOp.switches.find((sw) => sw.id === 'plate-right')!;

    // Place snake 0 on left plate, snake 1 on right plate
    match.snakes[0].body = [
      { ...plateLeft.position },
      { x: plateLeft.position.x - 1, y: plateLeft.position.y },
      { x: plateLeft.position.x - 2, y: plateLeft.position.y },
    ];
    match.snakes[0].direction = 'right';
    match.snakes[0].pendingDirection = null;

    match.snakes[1].body = [
      { ...plateRight.position },
      { x: plateRight.position.x + 1, y: plateRight.position.y },
      { x: plateRight.position.x + 2, y: plateRight.position.y },
    ];
    match.snakes[1].direction = 'left';
    match.snakes[1].pendingDirection = null;

    const after = advanceOneTick(match, 1000);
    expect(after.coOp!.doors[0].open).toBe(true);
  });

  it('door blocks movement when closed', () => {
    const match = createInitialCoOpMatchState('PUZZLE', () => 0.75);
    const door = match.coOp!.doors[0];

    // Place snake 0 heading toward the closed door
    match.snakes[0].body = [
      { x: door.position.x, y: door.position.y + 1 },
      { x: door.position.x, y: door.position.y + 2 },
      { x: door.position.x, y: door.position.y + 3 },
    ];
    match.snakes[0].direction = 'up';
    match.snakes[0].pendingDirection = null;

    const after = advanceOneTick(match, 1000);
    // Snake should die from hitting the closed door (treated as wall)
    expect(after.snakes[0].alive).toBe(false);
  });

  it('door allows movement when open', () => {
    const match = createInitialCoOpMatchState('PUZZLE', () => 0.75);
    const coOp = match.coOp!;
    const door = coOp.doors[0];
    const plateLeft = coOp.switches.find((sw) => sw.id === 'plate-left')!;
    const plateRight = coOp.switches.find((sw) => sw.id === 'plate-right')!;

    // Position both snakes on their plates to open the door
    match.snakes[0].body = [
      { ...plateLeft.position },
      { x: plateLeft.position.x - 1, y: plateLeft.position.y },
      { x: plateLeft.position.x - 2, y: plateLeft.position.y },
    ];
    match.snakes[0].direction = 'right';
    match.snakes[0].pendingDirection = null;

    match.snakes[1].body = [
      { ...plateRight.position },
      { x: plateRight.position.x + 1, y: plateRight.position.y },
      { x: plateRight.position.x + 2, y: plateRight.position.y },
    ];
    match.snakes[1].direction = 'left';
    match.snakes[1].pendingDirection = null;

    // Tick: both plates activate, door opens, snakes survive
    const after = advanceOneTick(match, 1000);
    expect(after.coOp!.doors[0].open).toBe(true);
    expect(after.snakes[0].alive).toBe(true);
    expect(after.snakes[1].alive).toBe(true);
  });

  it('all 4 layouts validate without error', () => {
    const seeds = [0, 0.25, 0.5, 0.75];
    const layouts = seeds.map((seed) => createRandomCoOpLayout(() => seed));
    const ids = layouts.map((l) => l.layoutId);
    expect(ids).toContain('dual-switch-gate');
    // All should have passed validation (no throw)
    expect(layouts.length).toBe(4);
  });

  it('puzzle state is included in co-op payload', () => {
    const match = createInitialCoOpMatchState('PUZZLE', () => 0.75);
    expect(match.coOp!.switches.length).toBe(2);
    expect(match.coOp!.doors.length).toBe(1);
    expect(match.coOp!.switches[0]).toHaveProperty('id');
    expect(match.coOp!.switches[0]).toHaveProperty('position');
    expect(match.coOp!.switches[0]).toHaveProperty('activationType');
    expect(match.coOp!.switches[0]).toHaveProperty('active');
    expect(match.coOp!.doors[0]).toHaveProperty('id');
    expect(match.coOp!.doors[0]).toHaveProperty('position');
    expect(match.coOp!.doors[0]).toHaveProperty('open');
    expect(match.coOp!.doors[0]).toHaveProperty('requiresSwitches');
  });
});

describe('spawnFood', () => {
  it('avoids placing replacement food adjacent to either head when alternatives exist', () => {
    const snakes: SnakeState[] = [
      { slotIndex: 0, direction: 'right', pendingDirection: null, alive: true, score: 0, body: [{ x: 7, y: 15 }, { x: 6, y: 15 }, { x: 5, y: 15 }] },
      { slotIndex: 1, direction: 'left', pendingDirection: null, alive: true, score: 0, body: [{ x: 22, y: 15 }, { x: 23, y: 15 }, { x: 24, y: 15 }] },
    ];

    const board = { width: 30, height: 30 };
    const food = spawnFood(board, snakes, () => 0, { phase: 'replacement' });
    expect(food).not.toBeNull();

    const distances = snakes.map((snake) => manhattan(food!, snake.body[0]));
    expect(distances[0]).toBeGreaterThan(1);
    expect(distances[1]).toBeGreaterThan(1);
  });

  it('falls back to any remaining cell if fairness filters would otherwise exhaust options', () => {
    const board = { width: 5, height: 5 };
    const snakes: SnakeState[] = [
      { slotIndex: 0, direction: 'right', pendingDirection: null, alive: true, score: 0, body: [{ x: 1, y: 2 }, { x: 0, y: 2 }] },
      { slotIndex: 1, direction: 'left', pendingDirection: null, alive: true, score: 0, body: [{ x: 3, y: 2 }, { x: 4, y: 2 }] },
    ];

    const food = spawnFood(board, snakes, () => 0, { phase: 'initial' });
    expect(food).not.toBeNull();
    expect(snakes.flatMap((snake) => snake.body).some((segment) => segment.x === food!.x && segment.y === food!.y)).toBe(false);
  });
});

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pathExists(start: GridPoint, target: GridPoint, blocked: Set<string>, board: { width: number; height: number }) {
  const key = (point: GridPoint) => `${point.x},${point.y}`;
  const queue: GridPoint[] = [start];
  const visited = new Set([key(start)]);

  while (queue.length > 0) {
    const point = queue.shift()!;
    if (point.x === target.x && point.y === target.y) {
      return true;
    }

    for (const candidate of [
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 },
    ]) {
      if (candidate.x < 0 || candidate.x >= board.width || candidate.y < 0 || candidate.y >= board.height) continue;
      const candidateKey = key(candidate);
      if (blocked.has(candidateKey) || visited.has(candidateKey)) continue;
      visited.add(candidateKey);
      queue.push(candidate);
    }
  }

  return false;
}

function canReachBoardEdge(start: GridPoint, blocked: Set<string>, board: { width: number; height: number }) {
  const key = (point: GridPoint) => `${point.x},${point.y}`;
  const queue: GridPoint[] = [start];
  const visited = new Set([key(start)]);

  while (queue.length > 0) {
    const point = queue.shift()!;
    if (point.x === 0 || point.y === 0 || point.x === board.width - 1 || point.y === board.height - 1) {
      return true;
    }

    for (const candidate of [
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 },
    ]) {
      if (candidate.x < 0 || candidate.x >= board.width || candidate.y < 0 || candidate.y >= board.height) continue;
      const candidateKey = key(candidate);
      if (blocked.has(candidateKey) || visited.has(candidateKey)) continue;
      visited.add(candidateKey);
      queue.push(candidate);
    }
  }

  return false;
}

describe('solo mode', () => {
  it('creates a match with 1 alive snake and 1 dead snake', () => {
    const match = createInitialMatchState('TEST', Math.random, true);
    expect(match.soloMode).toBe(true);
    expect(match.snakes[0].alive).toBe(true);
    expect(match.snakes[1].alive).toBe(false);
    expect(match.snakes[0].body).toHaveLength(3);
    expect(match.snakes[1].body).toHaveLength(1);
    expect(match.snakes[1].body[0]).toEqual({ x: -1, y: -1 });
  });

  it('food spawns on the board (not at dead snake position)', () => {
    const match = createInitialMatchState('TEST', () => 0.5, true);
    expect(match.food).not.toBeNull();
    expect(match.food!.x).toBeGreaterThanOrEqual(0);
    expect(match.food!.x).toBeLessThan(30);
    expect(match.food!.y).toBeGreaterThanOrEqual(0);
    expect(match.food!.y).toBeLessThan(30);
  });
});
