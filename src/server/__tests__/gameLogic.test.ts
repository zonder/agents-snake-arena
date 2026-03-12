import { describe, expect, it } from 'vitest';
import { computeSpeedInterval, createInitialMatchState, spawnFood, type SnakeState } from '../gameLogic.js';

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
    const [leftHead, rightHead] = match.snakes.map((snake) => snake.body[0]);
    const dist0 = manhattan(match.food, leftHead);
    const dist1 = manhattan(match.food, rightHead);

    expect(dist0).toBeGreaterThanOrEqual(4);
    expect(dist1).toBeGreaterThanOrEqual(4);
    expect(Math.abs(dist0 - dist1)).toBeLessThanOrEqual(2);
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
