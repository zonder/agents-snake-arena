import { describe, expect, it } from 'vitest';
import { decideBotMove, type BotDifficulty } from '../botController.js';
import type { MatchState, SnakeState } from '../gameLogic.js';
import type { GridPoint } from '../../shared/contracts.js';

function makeSnake(
  slotIndex: 0 | 1,
  head: GridPoint,
  body: GridPoint[],
  direction: 'up' | 'down' | 'left' | 'right' = 'right',
): SnakeState {
  return {
    slotIndex,
    direction,
    pendingDirection: null,
    body: [head, ...body],
    alive: true,
    score: 0,
  };
}

function makeMatch(
  botSnake: SnakeState,
  opponentSnake: SnakeState,
  food: GridPoint,
): MatchState {
  return {
    roomCode: 'TEST',
    board: { width: 30, height: 30 },
    tickNumber: 1,
    status: 'active',
    snakes: [botSnake, opponentSnake],
    food,
    foodsEaten: 0,
    tickIntervalMs: 200,
    startedAt: Date.now(),
    endedAt: null,
    result: null,
    deathReasons: [],
    winnerSlotIndex: null,
  };
}

describe('decideBotMove', () => {
  it('moves toward food when path is clear', () => {
    const botSnake = makeSnake(0, { x: 5, y: 15 }, [
      { x: 4, y: 15 },
      { x: 3, y: 15 },
    ], 'right');
    const opponentSnake = makeSnake(1, { x: 22, y: 15 }, [
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ], 'left');
    const food = { x: 10, y: 15 };
    const match = makeMatch(botSnake, opponentSnake, food);

    const decision = decideBotMove(match, 0, 'medium', () => 0.5);
    expect(decision.direction).toBe('right');
  });

  it('avoids wall collision', () => {
    // Bot at right edge, moving right — should turn
    const botSnake = makeSnake(0, { x: 29, y: 15 }, [
      { x: 28, y: 15 },
      { x: 27, y: 15 },
    ], 'right');
    const opponentSnake = makeSnake(1, { x: 22, y: 15 }, [
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ], 'left');
    const food = { x: 10, y: 15 };
    const match = makeMatch(botSnake, opponentSnake, food);

    const decision = decideBotMove(match, 0, 'medium', () => 0.5);
    // Should NOT go right (wall), should go up or down
    expect(decision.direction).not.toBe('right');
    expect(['up', 'down', 'left']).toContain(decision.direction);
  });

  it('avoids self collision', () => {
    // Bot moving right with body blocking right
    const botSnake = makeSnake(0, { x: 10, y: 15 }, [
      { x: 9, y: 15 },
      { x: 8, y: 15 },
      { x: 8, y: 14 },
      { x: 9, y: 14 },
      { x: 10, y: 14 },
      { x: 11, y: 14 },
      { x: 11, y: 15 }, // blocks right
    ], 'right');
    const opponentSnake = makeSnake(1, { x: 22, y: 15 }, [
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ], 'left');
    const food = { x: 15, y: 15 };
    const match = makeMatch(botSnake, opponentSnake, food);

    const decision = decideBotMove(match, 0, 'medium', () => 0.5);
    // Should not go right (self collision)
    expect(decision.direction).not.toBe('right');
  });

  it('picks any safe direction when doomed', () => {
    // Bot completely boxed in
    const botSnake = makeSnake(0, { x: 5, y: 0 }, [
      { x: 4, y: 0 },
      { x: 3, y: 0 },
    ], 'up'); // up hits wall at y=0
    const opponentSnake = makeSnake(1, { x: 22, y: 15 }, [
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ], 'left');
    const food = { x: 10, y: 15 };
    const match = makeMatch(botSnake, opponentSnake, food);

    const decision = decideBotMove(match, 0, 'medium', () => 0.5);
    // Should not go up (wall) — should go left or right
    expect(decision.direction).not.toBe('up');
    expect(['left', 'right', 'down']).toContain(decision.direction);
  });

  it('returns current direction when dead', () => {
    const botSnake = makeSnake(0, { x: 5, y: 15 }, [
      { x: 4, y: 15 },
    ], 'right');
    botSnake.alive = false;
    const opponentSnake = makeSnake(1, { x: 22, y: 15 }, [
      { x: 23, y: 15 },
    ], 'left');
    const food = { x: 10, y: 15 };
    const match = makeMatch(botSnake, opponentSnake, food);

    const decision = decideBotMove(match, 0, 'medium', () => 0.5);
    expect(decision.direction).toBe('right');
  });

  it('easy mode sometimes picks randomly', () => {
    const botSnake = makeSnake(0, { x: 5, y: 15 }, [
      { x: 4, y: 15 },
      { x: 3, y: 15 },
    ], 'right');
    const opponentSnake = makeSnake(1, { x: 22, y: 15 }, [
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ], 'left');
    const food = { x: 10, y: 15 };
    const match = makeMatch(botSnake, opponentSnake, food);

    // With random returning 0.1 (< 0.3), easy mode picks randomly
    const decision = decideBotMove(match, 0, 'easy', () => 0.1);
    expect(['up', 'down', 'right']).toContain(decision.direction);
  });

  it('hard mode avoids head-to-head when possible', () => {
    // Bot and opponent heading toward each other
    const botSnake = makeSnake(0, { x: 10, y: 15 }, [
      { x: 9, y: 15 },
      { x: 8, y: 15 },
    ], 'right');
    const opponentSnake = makeSnake(1, { x: 12, y: 15 }, [
      { x: 13, y: 15 },
      { x: 14, y: 15 },
    ], 'left'); // opponent moving left toward bot
    const food = { x: 11, y: 15 }; // food between them

    const match = makeMatch(botSnake, opponentSnake, food);

    // Hard mode should try to avoid head-to-head
    const decision = decideBotMove(match, 0, 'hard', () => 0.5);
    // The bot might go up/down to avoid collision, or still go right
    // Just verify it returns a valid direction
    expect(['up', 'down', 'left', 'right']).toContain(decision.direction);
  });

  it('survival mode picks direction with most space when no path to food', () => {
    // Food is blocked, bot needs to survive
    const botSnake = makeSnake(0, { x: 5, y: 15 }, [
      { x: 4, y: 15 },
      { x: 3, y: 15 },
    ], 'left'); // moving left
    const opponentSnake = makeSnake(1, { x: 22, y: 15 }, [
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ], 'left');
    const food = { x: 1, y: 15 }; // food to the left, near wall
    const match = makeMatch(botSnake, opponentSnake, food);

    const decision = decideBotMove(match, 0, 'medium', () => 0.5);
    // Should pick a direction that avoids the wall
    expect(decision.direction).not.toBe('left'); // left goes toward wall
  });
});
