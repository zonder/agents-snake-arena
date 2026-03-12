import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RoomService } from '../roomService.js';

function payloads(result: { events: Array<{ type: string; payload: unknown }> }, type: string) {
  return result.events.filter((event) => event.type === type).map((event) => event.payload as any);
}

function startGame(service: RoomService, roomCode: string) {
  service.joinRoom('socket-b', roomCode);
  service.setReady('socket-a', true);
  service.setReady('socket-b', true);
  vi.advanceTimersByTime(3000);
}

function finishGame(service: RoomService) {
  for (let step = 0; step < 25; step += 1) {
    const result = service.setDirection('socket-a', 'up');
    if (payloads(result, 'room:error').length === 0) break;
    vi.advanceTimersByTime(200);
  }
  vi.advanceTimersByTime(3200);
}

describe('RoomService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T22:00:00Z'));
  });

  test('creates a room and sends an authoritative one-player lobby state', () => {
    const service = new RoomService();
    const result = service.createRoom('socket-a');

    const created = payloads(result, 'room:created')[0];
    const lobbyState = payloads(result, 'lobby:state')[0];

    expect(created.roomCode).toMatch(/^[A-Z]{4}$/);
    expect(lobbyState.occupiedCount).toBe(1);
    expect(lobbyState.phase).toBe('waiting-for-players');
    expect(lobbyState.players[0].isOccupied).toBe(true);
    expect(lobbyState.players[1].isOccupied).toBe(false);
  });

  test('starts with a real countdown before emitting game start', () => {
    const emitted: Array<{ type: string; payload: any }> = [];
    const service = new RoomService();
    service.setEventSink((events) => emitted.push(...events));

    const created = service.createRoom('socket-a');
    const roomCode = payloads(created, 'room:created')[0].roomCode;

    service.joinRoom('socket-b', roomCode.toLowerCase());
    expect(payloads(service.setReady('socket-a', true), 'game:start')).toHaveLength(0);

    const readyResult = service.setReady('socket-b', true);
    expect(payloads(readyResult, 'game:start')).toHaveLength(0);
    expect(payloads(readyResult, 'game:countdown')).toHaveLength(2);
    expect(payloads(readyResult, 'game:state')[0].countdownSecondsRemaining).toBe(3);

    vi.advanceTimersByTime(1000);
    expect(emitted.filter((event) => event.type === 'game:countdown')).toHaveLength(2);
    expect(emitted.filter((event) => event.type === 'game:countdown')[0].payload.secondsRemaining).toBe(2);

    vi.advanceTimersByTime(1000);
    expect(emitted.filter((event) => event.type === 'game:countdown')).toHaveLength(4);
    expect(emitted.filter((event) => event.type === 'game:countdown')[2].payload.secondsRemaining).toBe(1);

    vi.advanceTimersByTime(1000);
    const gameStarts = emitted.filter((event) => event.type === 'game:start');
    expect(gameStarts).toHaveLength(2);
    expect(gameStarts[0].payload.phase).toBe('in-progress');
  });

  test('one-player rematch waiting state is authoritative', () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    startGame(service, roomCode);
    finishGame(service);

    const rematchResult = service.requestRematch('socket-a');
    const rematchState = payloads(rematchResult, 'game:rematch-state')[0];

    expect(rematchState.phase).toBe('game-over');
    expect(rematchState.rematch.status).toBe('waiting');
    expect(rematchState.rematch.requestedBySlot[0]).toBe(true);
    expect(rematchState.rematch.requestedBySlot[1]).toBe(false);
    expect(rematchState.rematch.waitingForOtherPlayer).toBe(true);
  });

  test('both-player acceptance starts a fresh countdown in the same room with a reset match state', () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    startGame(service, roomCode);
    finishGame(service);

    const firstAccept = service.requestRematch('socket-a');
    const finalStateBefore = payloads(firstAccept, 'game:state').at(-1);
    finalStateBefore.snakes[0].score = 9;

    const secondAccept = service.requestRematch('socket-b');
    const countdown = payloads(secondAccept, 'game:countdown');
    const gameState = payloads(secondAccept, 'game:state').at(-1);

    expect(countdown).toHaveLength(2);
    expect(countdown[0].roomCode).toBe(roomCode);
    expect(gameState.phase).toBe('starting');
    expect(gameState.tickNumber).toBe(0);
    expect(gameState.tickIntervalMs).toBe(200);
    expect(gameState.foodsEaten).toBe(0);
    expect(gameState.snakes[0].score).toBe(0);
    expect(gameState.snakes[1].score).toBe(0);
    expect(gameState.snakes[0].body).toEqual([
      { x: 7, y: 15 },
      { x: 6, y: 15 },
      { x: 5, y: 15 },
    ]);
    expect(gameState.snakes[1].body).toEqual([
      { x: 22, y: 15 },
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ]);
    expect(gameState.food).not.toBeNull();
  });

  test('post-game leave keeps the room open and clears stale rematch state', () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    startGame(service, roomCode);
    finishGame(service);
    service.requestRematch('socket-a');

    const leaveResult = service.disconnect('socket-b');
    const left = payloads(leaveResult, 'player:left')[0];
    const lobby = payloads(leaveResult, 'lobby:state')[0];
    const rematch = payloads(leaveResult, 'game:rematch-state')[0];

    expect(left.reason).toBe('disconnected');
    expect(lobby.phase).toBe('waiting-for-players');
    expect(lobby.roomCode).toBe(roomCode);
    expect(rematch.rematch.available).toBe(false);
    expect(rematch.rematch.requestedBySlot[0]).toBe(false);
    expect(rematch.rematch.requestedBySlot[1]).toBe(false);
  });

  test('replacement join after post-game leave returns room to normal lobby flow', () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    startGame(service, roomCode);
    finishGame(service);
    service.disconnect('socket-b');

    const joinResult = service.joinRoom('socket-c', roomCode);
    const lobby = payloads(joinResult, 'lobby:state').at(-1);

    expect(lobby.phase).toBe('lobby');
    expect(lobby.roomCode).toBe(roomCode);
    expect(lobby.rematch.available).toBe(false);
    expect(lobby.players[1].isOccupied).toBe(true);
    expect(lobby.canStart).toBe(false);
  });

  test('disconnect during gameplay ends the round but does not close the room', () => {
    const emitted: Array<{ type: string; payload: any }> = [];
    const service = new RoomService();
    service.setEventSink((events) => emitted.push(...events));

    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    service.joinRoom('socket-b', roomCode);
    service.setReady('socket-a', true);
    service.setReady('socket-b', true);
    vi.advanceTimersByTime(3000);

    const disconnectResult = service.disconnect('socket-b');
    const ended = payloads(disconnectResult, 'game:ended');
    expect(ended).toHaveLength(1);
    expect(ended[0].result.winnerSlotIndex).toBe(0);
    expect(ended[0].result.bySlot[0]).toBe('win');
    expect(ended[0].result.bySlot[1]).toBe('lose');

    vi.advanceTimersByTime(3000);
    const roomClosed = emitted.filter((event) => event.type === 'room:closed');
    expect(roomClosed).toHaveLength(0);
  });
});
