import { describe, expect, test } from 'vitest';
import { advanceOneTick, applyDisconnectResult, computeSpeedInterval, createInitialMatchState, queueDirectionInput, type MatchState } from '../gameLogic.js';

function buildMatch(overrides: Partial<MatchState>): MatchState {
  const base = createInitialMatchState('ROOM', () => 0);
  return {
    ...base,
    ...overrides,
    snakes: (overrides.snakes ?? base.snakes).map((snake) => ({ ...snake, body: snake.body.map((segment) => ({ ...segment })) })) as MatchState['snakes'],
    food: overrides.food ?? base.food,
  };
}

describe('gameLogic', () => {
  test('queues one upcoming direction and blocks reversal against pending direction', () => {
    const match = createInitialMatchState('ROOM');
    const snake = match.snakes[0];

    expect(queueDirectionInput(snake, 'up')).toBe(true);
    expect(snake.pendingDirection).toBe('up');
    expect(queueDirectionInput(snake, 'down')).toBe(false);
    expect(snake.pendingDirection).toBe('up');
  });

  test('does not move snakes before gameplay starts and advances deterministically once active', () => {
    const match = createInitialMatchState('ROOM', () => 0);
    match.status = 'active';

    const next = advanceOneTick(match, Date.now(), () => 0);
    expect(next.tickNumber).toBe(1);
    expect(next.snakes[0].body[0]).toEqual({ x: 8, y: 15 });
    expect(next.snakes[1].body[0]).toEqual({ x: 21, y: 15 });
  });

  test('grows the consuming snake, increments score, and updates speed globally', () => {
    const match = buildMatch({
      status: 'active',
      foodsEaten: 2,
      food: { x: 8, y: 15 },
    });

    const next = advanceOneTick(match, Date.now(), () => 0);
    expect(next.snakes[0].score).toBe(1);
    expect(next.snakes[0].body).toHaveLength(4);
    expect(next.foodsEaten).toBe(3);
    expect(next.tickIntervalMs).toBe(170);
  });

  test('kills both snakes on same-cell head-to-head collision', () => {
    const match = buildMatch({
      status: 'active',
      snakes: [
        { slotIndex: 0, direction: 'right', pendingDirection: null, body: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], alive: true, score: 0 },
        { slotIndex: 1, direction: 'left', pendingDirection: null, body: [{ x: 12, y: 10 }, { x: 13, y: 10 }, { x: 14, y: 10 }], alive: true, score: 0 },
      ],
      food: { x: 0, y: 0 },
    });

    const next = advanceOneTick(match, Date.now(), () => 0);
    expect(next.result).toBe('draw');
    expect(next.deathReasons).toEqual([
      { slotIndex: 0, reason: 'head-to-head' },
      { slotIndex: 1, reason: 'head-to-head' },
    ]);
  });

  test('kills both snakes on cross-over head swap', () => {
    const match = buildMatch({
      status: 'active',
      snakes: [
        { slotIndex: 0, direction: 'right', pendingDirection: null, body: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], alive: true, score: 0 },
        { slotIndex: 1, direction: 'left', pendingDirection: null, body: [{ x: 11, y: 10 }, { x: 12, y: 10 }, { x: 13, y: 10 }], alive: true, score: 0 },
      ],
      food: { x: 0, y: 0 },
    });

    const next = advanceOneTick(match, Date.now(), () => 0);
    expect(next.result).toBe('draw');
    expect(next.deathReasons).toEqual([
      { slotIndex: 0, reason: 'cross-over' },
      { slotIndex: 1, reason: 'cross-over' },
    ]);
  });

  test('disconnect result awards the other player the win', () => {
    const match = createInitialMatchState('ROOM');
    const ended = applyDisconnectResult(match, 1, Date.now());

    expect(ended.result).toBe('player-0-win');
    expect(ended.winnerSlotIndex).toBe(0);
    expect(ended.deathReasons).toEqual([{ slotIndex: 1, reason: 'disconnect' }]);
  });

  test('uses the bounded stepped speed schedule', () => {
    expect(computeSpeedInterval(0)).toBe(200);
    expect(computeSpeedInterval(3)).toBe(170);
    expect(computeSpeedInterval(6)).toBe(140);
    expect(computeSpeedInterval(9)).toBe(120);
    expect(computeSpeedInterval(99)).toBe(120);
  });
});
